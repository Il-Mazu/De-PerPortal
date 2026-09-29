'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
const os=require('node:os');
const {Journal,keep}=require('../app/journal.cjs');
const {Manager}=require('../app/manager.cjs');

const temp=()=>fs.mkdtemp(path.join(os.tmpdir(),'perportal-'));
function dump(id,uid,fill=0) {
  const bytes=Buffer.alloc(1024,fill);bytes.fill(0,0,64);bytes.writeUInt32LE(uid);bytes.writeUInt16LE(id,16);
  return bytes;
}

test('backups skip identical bytes, keep the newest ten, and restore is undoable',async()=>{
  const root=await temp();
  try {
    const journal=new Journal(root),file=path.join(root,'spyro.sky');
    await fs.writeFile(file,dump(16,1,1));
    const first=await journal.backup('NFC/spyro.sky',file);
    assert.equal(await journal.backup('NFC/spyro.sky',file),first,'unchanged dumps are not copied again');
    for(let i=2;i<14;i++) {await fs.writeFile(file,dump(16,1,i));await journal.backup('NFC/spyro.sky',file);}
    const names=await journal.list('NFC/spyro.sky');
    assert.equal(names.length,keep);
    assert.deepEqual(await fs.readFile(path.join(journal.folder('NFC/spyro.sky'),names[0])),dump(16,1,13));
    // Restoring the oldest kept copy backs up the current file first.
    await fs.writeFile(file,dump(16,1,99));
    await journal.restore('NFC/spyro.sky',file,names.at(-1));
    assert.deepEqual(await fs.readFile(file),dump(16,1,4));
    const after=await journal.list('NFC/spyro.sky');
    assert.deepEqual(await fs.readFile(path.join(journal.folder('NFC/spyro.sky'),after[0])),dump(16,1,99));
    await assert.rejects(journal.restore('NFC/spyro.sky',file,'../../settings.json'),/no longer exists/);
  } finally {await fs.rm(root,{recursive:true,force:true});}
});

test('history survives a restart and recent lists each figure once',async()=>{
  const root=await temp();
  try {
    const journal=new Journal(root);
    for(const [key,at] of [['a',1],['b',2],['a',3]]) await journal.record({key,game:1,player:0,at});
    const again=new Journal(root);await again.load();
    assert.deepEqual(again.recent().map(h=>h.key),['a','b']);
    assert.deepEqual(again.lastPlayed(),{a:3,b:2});
  } finally {await fs.rm(root,{recursive:true,force:true});}
});

test('loading backs the dump up, logs it, and random never picks a fallen Skylander',async()=>{
  const root=await temp();
  try {
    await fs.mkdir(path.join(root,'NFC'));
    await fs.writeFile(path.join(root,'NFC/spyro.sky'),dump(16,1));
    await fs.writeFile(path.join(root,'NFC/gill.sky'),dump(14,2));
    const calls=[];
    const manager=new Manager(root,async args=>{calls.push(args);return '';});
    await manager.init();manager.config.game=1;
    manager.session={pid:1,supported:true,game:1,focused:true};
    await manager.setChallenge({nuzlocke:true,key:'spyro.sky',fallen:true});
    for(let i=0;i<5;i++) assert.equal((await manager.random(0)).top,'gill.sky');
    await assert.rejects(manager.action({player:1,target:'direct',choice:{top:'spyro.sky',bottom:null}}),/has fallen/);
    assert.equal((await manager.backups('gill.sky')).length,1);
    assert.equal(manager.journal.history.at(-1).key,'gill.sky');
    await manager.setChallenge({reset:true});
    await manager.action({player:1,target:'direct',choice:{top:'spyro.sky',bottom:null}});
    // A figure on the portal cannot be restored underneath Cemu.
    const [backup]=await manager.backups('spyro.sky');
    await assert.rejects(manager.restoreBackup({key:'spyro.sky',name:backup.name}),/off the portal/);
  } finally {await fs.rm(root,{recursive:true,force:true});}
});

test('an imported profile keeps figures in this library and reports the rest',async()=>{
  const root=await temp();
  try {
    await fs.mkdir(path.join(root,'NFC'));
    await fs.writeFile(path.join(root,'NFC/spyro.sky'),dump(16,1));
    const manager=new Manager(root,async()=>'');
    await manager.init();manager.config.game=1;
    const exported=manager.exportProfile();
    exported.profile.players[0].favorites=[{top:'spyro.sky',bottom:null},{top:'missing.sky',bottom:null},null];
    exported.profile.players[0].elements.Magic={top:'spyro.sky',bottom:null};
    exported.profile.players[0].elements.Fire={top:'spyro.sky',bottom:null};
    assert.equal(await manager.importProfile(exported),2,'a missing file and a wrong-element slot');
    assert.deepEqual(manager.profile.players[0].favorites,[{top:'spyro.sky',bottom:null},null,null]);
    assert.equal(manager.profile.players[0].elements.Fire,null);
    await assert.rejects(manager.importProfile({...exported,game:3}),/not a Dè PerPortal profile/);
  } finally {await fs.rm(root,{recursive:true,force:true});}
});

test('the OBS overlay only listens on this computer and streams the portal',async()=>{
  const {EventEmitter}=require('node:events');
  const {createObs,port}=require('../app/obs.cjs');
  const manager=Object.assign(new EventEmitter(),{figures:[],publish(){},
    state:()=>({game:1,games:['Spyro’s Adventure'],active:[{top:'s.sky',bottom:null},null],figures:[{key:'s.sky',info:{name:'Spyro',element:'Magic'},save:{state:'ok',level:7,maxed:false}}]})});
  const obs=createObs(manager);obs.enable(true);
  try {
    await new Promise(resolve=>setTimeout(resolve,100));
    assert.equal(obs.address().address,'127.0.0.1');
    const res=await fetch(`http://127.0.0.1:${port}/events`),reader=res.body.getReader();
    const text=new TextDecoder().decode((await reader.read()).value);
    assert.deepEqual(JSON.parse(text.replace(/^data: /,'')).players,[{player:1,name:'Spyro',element:'Magic',level:'7',art:null},null]);
    reader.cancel();
    assert.equal((await fetch(`http://127.0.0.1:${port}/art/..%2F..%2Fsettings.json`)).status,404);
  } finally {obs.enable(false);}
});

test('swapping out a figure whose dump never changed warns about lost progress',async()=>{
  const root=await temp();
  try {
    await fs.mkdir(path.join(root,'NFC'));
    await fs.writeFile(path.join(root,'NFC/spyro.sky'),dump(16,1));
    const manager=new Manager(root,async()=>'');await manager.init();
    const notes=[];manager.on('notification',n=>notes.push(n));
    const mtime=(await fs.stat(path.join(root,'NFC/spyro.sky'))).mtimeMs;
    manager.loaded.set('spyro.sky',{mtime,at:Date.now()-5*60*1000});
    await manager.warnUnsaved(['spyro.sky']);
    assert.match(notes[0],/Spyro had not saved/);
    // A dump the game wrote to is fine, and a short stay is fine too.
    manager.loaded.set('spyro.sky',{mtime:mtime-1,at:Date.now()-5*60*1000});
    manager.loaded.set('other',{mtime,at:Date.now()});
    await manager.warnUnsaved(['spyro.sky','other']);
    assert.equal(notes.length,1);
  } finally {await fs.rm(root,{recursive:true,force:true});}
});

test('Discord status names the game and the figures with their level',()=>{
  const {activity,frame}=require('../app/discord.cjs');
  const state={detected:true,game:1,games:['Spyro’s Adventure'],active:[{top:'s',bottom:null},null],figures:[{key:'s',info:{name:'Spyro'},save:{state:'ok',level:7,maxed:false}}]};
  assert.deepEqual(activity(state,5),{details:'Playing Skylanders Spyro’s Adventure',state:'Spyro (Lv 7)',timestamps:{start:5},assets:{large_image:'logo',large_text:'Dè PerPortal'}});
  assert.equal(activity({...state,detected:false},5),null);
  const packet=frame(1,{a:1});
  assert.deepEqual([packet.readInt32LE(0),packet.readInt32LE(4),packet.subarray(8).toString()],[1,7,'{"a":1}']);
});

test('setup flags duplicates and figures newer than their folder’s game',async()=>{
  const root=await temp();
  try {
    for(const dir of ['NFC/Giants','NFC/Swap Force']) await fs.mkdir(path.join(root,dir),{recursive:true});
    await fs.writeFile(path.join(root,'NFC/Giants/spyro.sky'),dump(16,1));      // Spyro's Adventure figure: fine in Giants
    await fs.writeFile(path.join(root,'NFC/Swap Force/spyro.sky'),dump(16,1));  // the same figure twice
    const blast=dump(1004,3);blast.writeUInt16LE(8192,0x1c);
    await fs.writeFile(path.join(root,'NFC/Giants/blast.sky'),blast);           // Blast Zone (Swap Force) in Giants
    const manager=new Manager(root,async()=>'');await manager.init();
    const d=await manager.diagnostics();
    assert.deepEqual(d.duplicates,[['Giants/spyro.sky','Swap Force/spyro.sky']]);
    assert.deepEqual(d.misplaced,['Giants/blast.sky']);
    assert.equal(d.nfc,true);assert.equal(d.cemu,false);
  } finally {await fs.rm(root,{recursive:true,force:true});}
});
