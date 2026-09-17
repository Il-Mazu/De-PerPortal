const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const os=require('node:os');
const path=require('node:path');
const m=require('../app/model.cjs');
const {Manager}=require('../app/manager.cjs');
function bytes(id,variant=0,uid=id+1) {const b=Buffer.alloc(1024);b.writeUInt32LE(uid);b.writeUInt16LE(id,16);b.writeUInt16LE(variant,28);return b;}
function figure(id,variant=0) {return {...m.identify(bytes(id,variant)),key:`${id}-${variant}`,path:`/${id}-${variant}.sky`};}
test('metadata survives misleading filenames; erased and truncated dumps are rejected',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'skyportal-model-'));
 try{await fs.writeFile(path.join(dir,'definitely-not-spyro.sky'),bytes(16));const s=await m.scan(dir);assert.equal(s.figures[0].info.name,'Spyro');}finally{await fs.rm(dir,{recursive:true,force:true});}
 assert.throws(()=>m.identify(Buffer.alloc(1024)));assert.throws(()=>m.identify(Buffer.alloc(5)));
});
test('ordinary defaults exclude gimmicks and duplicate UIDs',()=>{
 const figures=[figure(16),figure(18),figure(12),figure(14),figure(107,4614),figure(1000,8192),figure(2000,8192),figure(9,4614)];
 const p=m.newProfile(figures,3);
 assert.equal(p.players[0].elements.Magic.top,'16-0');assert.equal(p.players[1].elements.Magic.top,'18-0');
 assert.equal(p.players[0].elements.Water.top,'12-0');assert.equal(p.players[1].elements.Water.top,'14-0');
 assert.equal(p.players[0].elements.Fire,null);
 assert.equal(m.core(figure(107,4614)),false);assert.equal(m.core(figure(9,4614)),false);
});
test('known regional IDs, game names, and unknown titles',()=>{
 assert.equal(m.detectGame('Cemu - [TitleId: 00050000-10139200]'),3);
 assert.equal(m.detectGame('Cemu - Skylanders Giants [EU]'),2);
 assert.equal(m.detectGame('Cemu 2.0 experimental'),0);
 assert.equal(m.detectGame('Cemu - Mario Kart 8'),0);
});
test('Swap Force selections require actual matching halves; mixed bottoms are valid',()=>{
 const f=[figure(2000,8192),figure(1000,8192),figure(1001,8192)];
 assert.deepEqual(m.choice(f[0],f),{top:'2000-8192',bottom:'1000-8192'});
 assert.equal(m.choice(f[0],[]),null);
 assert.equal(m.resolveChoice({top:f[0].key,bottom:f[2].key},f,3).length,2);
 assert.throws(()=>m.resolveChoice({top:f[0].key,bottom:null},f,3));
 assert.throws(()=>m.resolveChoice({top:f[0].key,bottom:f[1].key},f,2));
});
async function setup(control) {
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'skyportal-manager-'));await fs.mkdir(path.join(root,'NFC'));
 for(const [id,v] of [[16,0],[18,0],[107,4614],[2000,8192],[1000,8192],[505,0],[541,4096],[541,12288]])await fs.writeFile(path.join(root,'NFC',`${id}-${v}.sky`),bytes(id,v));
 const manager=new Manager(root,control);await manager.init();manager.updateSession({pid:100,supported:true,focused:true,title:'Cemu Skylanders Swap Force'});
 return {root,manager};
}
test('player and sidekick rows, Thumpback, duplicate prevention, persisted presets',async()=>{
 const calls=[];const {root,manager}=await setup(async a=>calls.push(a));
 try {
  await manager.action({player:1,target:'direct',choice:{top:'2000-8192.sky',bottom:'1000-8192.sky'}});
  assert.deepEqual(calls.map(c=>c.slice(0,2)),[['clear','4'],['load','3'],['load','4']]);
  calls.length=0;await manager.action({target:'thumpback'});assert.equal(manager.active[0].top,'107-4614.sky');
  assert.deepEqual(calls.map(c=>c.slice(0,2)),[['clear','2'],['load','1']]);
  await assert.rejects(manager.action({player:1,target:'direct',choice:{top:'107-4614.sky',bottom:null}}),/already on the portal/);
  await manager.action({target:'sidekick',choice:{top:'505-0.sky'}});assert.equal(calls.at(-1)[1],'5');
  await manager.select({player:0,target:'favorite',choice:{top:'16-0.sky',bottom:null}});
  const other=new Manager(root,async()=>{});await other.init();other.updateSession({pid:1,supported:true,title:'Skylanders Swap Force'});assert.equal(other.profile.players[0].favorite.top,'16-0.sky');
 } finally {await fs.rm(root,{recursive:true,force:true});}
});
test('partial pair failure is visible, changed incoming dump prevents any swap',async()=>{
 let count=0;const {root,manager}=await setup(async()=>{if(++count===3)throw Error('Cemu refused bottom');});
 try {
  await assert.rejects(manager.action({player:0,target:'direct',choice:{top:'2000-8192.sky',bottom:'1000-8192.sky'}}),/refused bottom/);
  assert.deepEqual(manager.active[0],{top:'2000-8192.sky',bottom:null});assert.equal(manager.busy,false);
  count=0;await fs.writeFile(path.join(root,'NFC','16-0.sky'),bytes(18));
  await assert.rejects(manager.action({target:'direct',choice:{top:'16-0.sky',bottom:null}}),/changed since scanning/);assert.equal(count,0);
 }finally{await fs.rm(root,{recursive:true,force:true});}
});
test('Alt T loads Thumpback; Alt Shift T loads the sidekick edition without changing either player',async()=>{
 const calls=[];const {root,manager}=await setup(async a=>calls.push(a));
 try {
  await manager.hotkey({player:0,key:'T'});
  assert.equal(manager.active[0].top,'107-4614.sky');
  const active=structuredClone(manager.active);calls.length=0;
  await manager.hotkey({player:1,key:'T'});
  assert.deepEqual(calls.map(c=>c.slice(0,2)),[['load','5']]);
  assert.equal(manager.sidekick.top,'541-4096.sky');
  assert.deepEqual(manager.active,active);
  manager.figures=manager.figures.filter(f=>f.variant!==4096);calls.length=0;
  await manager.hotkey({player:1,key:'T'});
  assert.match(manager.message,/sidekick figure is missing/);
  assert.equal(calls.length,0);
  manager.updateSession({pid:100,supported:true,title:'Cemu'});
  await manager.hotkey({player:0,key:'T'});assert.equal(calls.length,0);
 } finally {await fs.rm(root,{recursive:true,force:true});}
});
