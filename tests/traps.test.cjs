'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const traps=require('../app/traps.cjs');

test('trap records resolve captured, empty, and unsupported villains without mutation',()=>{
  const data=Buffer.alloc(1024);
  data.writeUInt16LE(20,9*16); // Observed Life-trap Sheep Creep record.
  assert.deepEqual(traps.decodeRecord(data,8),{state:'captured',recordId:20});
  data.writeUInt16LE(42,9*16);
  assert.deepEqual(traps.decodeRecord(data,8),{state:'captured',recordId:42});
  data.writeUInt16LE(0,9*16);
  assert.deepEqual(traps.decodeRecord(data,8),{state:'empty'});
  data.writeUInt16LE(0xffff,9*16);
  assert.deepEqual(traps.decodeRecord(data,8),{state:'unknown'});
  assert.deepEqual(traps.decode(Buffer.alloc(1024)),{state:'unknown'});
});

test('manual names persist per file, clear, and leave dumps unchanged',async()=>{
  const fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os');
  const {Manager}=require('../app/manager.cjs');
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'trap-names-'));
  try {
    await fs.mkdir(path.join(root,'NFC'));
    const bytes=Buffer.alloc(1024);bytes.writeUInt32LE(1234);bytes.writeUInt16LE(211,16);bytes.writeUInt16LE(12289,28);
    for(const name of ['a.sky','b.sky']) await fs.writeFile(path.join(root,'NFC',name),bytes);
    let manager=new Manager(root,async()=>{});await manager.init();
    await manager.select({target:'trap-name',choice:{top:'a.sky'},name:'  My villain  '});
    manager=new Manager(root,async()=>{});await manager.init();
    assert.equal(manager.state().figures[0].trapLabel.name,'My villain');
    assert.equal(manager.state().figures[1].trapLabel,null);
    assert.deepEqual(await fs.readFile(path.join(root,'NFC/a.sky')),bytes);
    await assert.rejects(manager.select({target:'trap-name',choice:{top:'a.sky'},name:'x'.repeat(81)}));
    await manager.select({target:'trap-name',choice:{top:'a.sky'},name:''});
    assert.equal(manager.state().figures[0].trapLabel,null);
  } finally {await fs.rm(root,{recursive:true,force:true});}
});

// Captured Life trap from https://nfc.toys/data-traps.html (Chompy Mage).
const fixture=()=>Buffer.from(require('node:fs').readFileSync(require('node:path').join(__dirname,'fixtures/life-trap.hex'),'utf8').trim(),'hex');
test('resetting trap detections ignores existing contents, clears labels, persists, and leaves dumps unchanged',async()=>{
  const fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os');
  const {Manager}=require('../app/manager.cjs');
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'reset-traps-'));
  try {
    await fs.mkdir(path.join(root,'NFC'));
    const original=fixture();await fs.writeFile(path.join(root,'NFC/life.sky'),original);
    const unknown=Buffer.from(original);unknown.fill(0,128);await fs.writeFile(path.join(root,'NFC/unknown.sky'),unknown);
    let manager=new Manager(root,async()=>{});await manager.init();
    await manager.select({target:'trap-name',choice:{top:'life.sky'},name:'Chompy Mage'});
    await manager.resetTrapDetections();
    assert.deepEqual(await fs.readFile(path.join(root,'NFC/life.sky')),original);
    assert.deepEqual(await fs.readFile(path.join(root,'NFC/unknown.sky')),unknown);
    assert.equal(manager.state().figures.find(f=>f.key==='life.sky').trap.state,'empty');
    assert.equal(manager.state().figures.find(f=>f.key==='life.sky').trap.appReset,true);
    assert.equal(manager.state().figures.find(f=>f.key==='life.sky').trapLabel,null);
    manager=new Manager(root,async()=>{});await manager.init();
    assert.equal(manager.state().figures.find(f=>f.key==='life.sky').trap.appReset,true);
    assert.equal(manager.busy,false);
  } finally {await fs.rm(root,{recursive:true,force:true});}
});

test('latest trap backup restores originals even when Cemu is detected',async()=>{
  const fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os');
  const {Manager}=require('../app/manager.cjs');
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'restore-traps-'));
  try {
    const original=fixture(),damaged=Buffer.from(original);damaged.fill(0,128,576);
    await fs.mkdir(path.join(root,'NFC'),{recursive:true});
    await fs.mkdir(path.join(root,'de-perportal-data/trap-backups/1720000000000'),{recursive:true});
    await fs.writeFile(path.join(root,'NFC/life.sky'),damaged);
    await fs.writeFile(path.join(root,'de-perportal-data/trap-backups/1720000000000/life.sky'),original);
    const manager=new Manager(root,async()=>{});await manager.init();
    manager.updateSession({pid:123,supported:true,title:'Skylanders Trap Team'});
    await manager.restoreLatestTrapBackup();
    assert.deepEqual(await fs.readFile(path.join(root,'NFC/life.sky')),original);
    assert.match(manager.message,/Restart Cemu/);
  } finally {await fs.rm(root,{recursive:true,force:true});}
});

test('element shortcuts prefer empty traps and named cycling excludes stale labels',async()=>{
  const {Manager}=require('../app/manager.cjs');
  const m=new Manager('/unused',async()=>{});m.session={game:4,pid:1,supported:true};
  const f=(key,state,recordId)=>({key,uid:key,id:1,variant:1,info:{kind:'Trap',element:'Water',name:'Water trap'},trap:{state,recordId}});
  const named=f('a','captured',20),empty=f('b','empty'),backup=f('c','captured',23);
  m.figures=[named,empty,backup];
  m.config.trapLabels={
    [JSON.stringify([named.key,named.uid,1,1])]:{name:named.key,recordId:20},
    [JSON.stringify([backup.key,backup.uid,1,1])]:{name:backup.key,recordId:20}
  };
  const actions=[],notices=[];m.on('notification',message=>notices.push(message));m.action=async a=>actions.push(a);
  await m.hotkey({player:0,key:'W'});assert.equal(actions[0].choice.top,'b');
  m.figures=[named,backup];
  await m.hotkey({player:0,key:'W'});assert.equal(actions[1].choice.top,'c');
  m.figures=[named];
  await m.hotkey({player:0,key:'W'});assert.equal(actions.length,2);assert.match(notices.at(-1),/No unassigned Water trap/);
  await m.hotkey({player:0,key:'Down'});assert.equal(m.selectedTrap,'a');
  await m.hotkey({player:0,key:'Down'});assert.equal(m.selectedTrap,'a');
  await m.hotkey({player:1,key:'W'});assert.equal(actions.length,2);
});
