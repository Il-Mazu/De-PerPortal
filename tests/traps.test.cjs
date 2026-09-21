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
test('clear removes all villain history from both real encrypted saves and preserves NFC trailers',()=>{
  const original=fixture(),clean=traps.clear(original),data=traps.decrypt(clean);
  assert.deepEqual(traps.decode(original),{state:'captured',recordId:1});
  assert.deepEqual(traps.decode(clean),{state:'empty'});
  for(const block of [8,36]) {
    assert.equal(traps.areaValid(data,block),true);
    assert.equal(data.readUInt16LE(block*16),0);
    assert.deepEqual(traps.decodeRecord(data,block),{state:'empty'});
    for(let b=block+1;b<block+28;b++) {
      if(b%4===3) assert.deepEqual(clean.subarray(b*16,b*16+16),original.subarray(b*16,b*16+16));
      else assert.ok(data.subarray(b*16,b*16+16).every(byte=>byte===0),`block ${b} still has saved trap data`);
    }
  }
  assert.deepEqual(clean.subarray(0,8*16),original.subarray(0,8*16));
  assert.deepEqual(traps.clear(clean),clean);
  assert.throws(()=>traps.clear(Buffer.alloc(1024)),/Unrecognized/);
  const broken=fixture();broken[36*16]^=1;
  const repaired=traps.clear(broken),repairedData=traps.decrypt(repaired);
  assert.deepEqual(traps.decode(repaired),{state:'empty'});
  assert.ok(traps.areaValid(repairedData,8)&&traps.areaValid(repairedData,36));
});

test('bulk clear unloads trap, backs up originals, removes names, rescans and skips unknown saves',async()=>{
  const fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os');
  const {Manager}=require('../app/manager.cjs');
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'clear-traps-')),calls=[];
  try {
    await fs.mkdir(path.join(root,'NFC'));
    const original=fixture();await fs.writeFile(path.join(root,'NFC/life.sky'),original);
    const unknown=Buffer.from(original);unknown.fill(0,128);await fs.writeFile(path.join(root,'NFC/unknown.sky'),unknown);
    const manager=new Manager(root,async args=>calls.push(args));await manager.init();
    await manager.select({target:'trap-name',choice:{top:'life.sky'},name:'Chompy Mage'});
    manager.updateSession({pid:1,supported:true,title:'Skylanders Trap Team'});
    await manager.clearTraps();
    assert.deepEqual(calls,[['clear','7']]);
    assert.equal(manager.figures.find(f=>f.key==='life.sky').trap.state,'empty');
    assert.equal(manager.state().figures.find(f=>f.key==='life.sky').trapLabel,null);
    assert.deepEqual(await fs.readFile(path.join(root,'NFC/unknown.sky')),unknown);
    const base=path.join(root,'de-perportal-data/trap-backups'),[dir]=await fs.readdir(base);
    assert.deepEqual(await fs.readFile(path.join(base,dir,'life.sky')),original);
    assert.match(manager.message,/Cleared 1 traps/);assert.match(manager.message,/Skipped 1/);
    assert.equal(manager.busy,false);
  } finally {await fs.rm(root,{recursive:true,force:true});}
});

test('element shortcuts prefer empty traps and named cycling excludes stale labels',async()=>{
  const {Manager}=require('../app/manager.cjs');
  const m=new Manager('/unused',async()=>{});m.session={game:4,pid:1,supported:true};
  const f=(key,state,recordId)=>({key,uid:key,id:1,variant:1,info:{kind:'Trap',element:'Water',name:'Water trap'},trap:{state,recordId}});
  m.figures=[f('a','captured',20),f('b','empty'),f('c','captured',23)];
  m.config.trapLabels={};
  for(const figure of m.figures)m.config.trapLabels[JSON.stringify([figure.key,figure.uid,1,1])]={name:figure.key,recordId:20};
  const actions=[];m.action=async a=>actions.push(a);
  await m.hotkey({player:0,key:'W'});assert.equal(actions[0].choice.top,'b');
  await m.hotkey({player:0,key:'Down'});assert.equal(m.selectedTrap,'a');
  await m.hotkey({player:0,key:'Down'});assert.equal(m.selectedTrap,'a');
  await m.hotkey({player:1,key:'W'});assert.equal(actions.length,1);
});
