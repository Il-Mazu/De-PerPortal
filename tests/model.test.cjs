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
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'de-perportal-model-'));
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
test('Trap Team elemental doors require matching Trap Masters',async()=>{
 const regular=figure(16), trapMaster=figure(466,12288);
 assert.deepEqual(m.candidates([regular,trapMaster],4,'Magic').map(f=>f.key),[trapMaster.key]);
 assert.equal(m.elementalDoorFigure(regular,4,'Magic'),false);
 assert.equal(m.elementalDoorFigure(trapMaster,4,'Magic'),true);

 const {root,manager}=await setup(async()=>{});
 try {
  manager.figures=[regular,trapMaster];
  manager.updateSession({pid:100,supported:true,focused:true,title:'Cemu Skylanders Trap Team'});
  await assert.rejects(manager.select({player:0,target:'Magic',choice:{top:regular.key,bottom:null}}),/Trap Masters/);
  await manager.select({player:0,target:'Magic',choice:{top:trapMaster.key,bottom:null}});
  assert.equal(manager.profile.players[0].elements.Magic.top,trapMaster.key);
 } finally {await fs.rm(root,{recursive:true,force:true});}
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
test('Swap Force perk bases resolve their fixed bottoms and prefer standard matching pairs',()=>{
 const figures=[];
 for(const perk of m.perks) {
  figures.push(figure(perk.id,8192),figure(perk.id+1000,8192));
 }
 figures.push(figure(1003,8214),figure(2003,8214));
 for(const perk of m.perks) {
  const pair=m.perkChoice(figures,perk.key);
  assert.equal(pair.perk.name,perk.name);assert.equal(pair.bottom.id,perk.id);assert.equal(pair.top.id,perk.id+1000);
 }
 assert.equal(m.perkChoice(figures,'W').bottom.variant,8192);
 const nonStandard=figures.filter(f=>!(f.id===1003 || f.id===2003) || f.variant===8214);
 assert.equal(m.perkChoice(nonStandard,'W').bottom.variant,8214);
 assert.equal(m.perkChoice(figures,'Z'),null);
});
async function setup(control) {
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'de-perportal-manager-'));await fs.mkdir(path.join(root,'NFC'));
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
test('Swap Force perk bases load a pair or replace only an active Swap Force bottom',async()=>{
 const calls=[];const {root,manager}=await setup(async a=>calls.push(a));
 try {
  await manager.action({player:0,target:'perk-Q'});
  assert.deepEqual(calls.map(c=>c.slice(0,2)),[['clear','2'],['load','1'],['load','2']]);
  assert.deepEqual(manager.active[0],{top:'2000-8192.sky',bottom:'1000-8192.sky'});
  calls.length=0;
  await manager.action({player:0,target:'perk-Q'});
  assert.deepEqual(calls.map(c=>c.slice(0,2)),[['clear','2'],['load','2']]);
  await manager.action({player:0,target:'remove'});
  calls.length=0;await manager.hotkey({player:1,key:'Q'});
  assert.deepEqual(calls.map(c=>c.slice(0,2)),[['clear','4'],['load','3'],['load','4']]);
  manager.updateSession({pid:100,supported:true,title:'Cemu Skylanders Giants'});calls.length=0;
  await manager.hotkey({player:0,key:'Q'});assert.equal(calls.length,0);
 } finally {await fs.rm(root,{recursive:true,force:true});}
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
test('three defaults migrate, persist per player and game, and hotkeys load the active pair',async()=>{
 const calls=[];const {root,manager}=await setup(async a=>calls.push(a));
 try {
  const legacy={favorite:{top:'16-0.sky',bottom:null},elements:{}};
  manager.config.profiles[3].players[0]=legacy;
  assert.deepEqual(manager.profile.players[0].favorites,[legacy.favorite,null,null]);
  const pair={top:'2000-8192.sky',bottom:'1000-8192.sky'};
  await manager.select({player:0,target:'favorite',preset:1,choice:pair});
  await manager.select({player:0,target:'favorite',preset:2,choice:{top:'107-4614.sky',bottom:null}});
  await manager.select({player:0,target:'active-favorite',preset:1});
  assert.equal(calls.length,0);
  assert.equal(manager.profile.players[1].activeFavorite,0);
  await manager.hotkey({player:0,key:'0'});
  assert.deepEqual(manager.active[0],pair);
  await manager.select({player:1,target:'favorite',preset:2,choice:{top:'18-0.sky',bottom:null}});
  await manager.hotkey({player:1,key:'0'});
  assert.equal(manager.active[1].top,'18-0.sky');
  await assert.rejects(manager.select({player:1,target:'active-favorite',preset:1}),/Assign/);
  await assert.rejects(manager.select({player:0,target:'active-favorite',preset:3}),/preset/);
  manager.busy=true;
  await assert.rejects(manager.select({player:0,target:'active-favorite',preset:0}),/Wait/);
  manager.busy=false;
  const other=new Manager(root,async()=>{});await other.init();
  other.updateSession({pid:1,supported:true,title:'Skylanders Swap Force'});
  assert.deepEqual(other.profile.players[0].favorite,pair);
  assert.equal(other.profile.players[0].favorites[0].top,'16-0.sky');
  assert.equal(other.profile.players[0].favorites[2].top,'107-4614.sky');
  assert.equal(other.profile.players[1].activeFavorite,2);
  other.updateSession({pid:1,supported:true,title:'Skylanders Giants'});
  assert.equal(other.profile.players[0].activeFavorite,0);
  other.updateSession({pid:1,supported:true,title:'Skylanders Swap Force'});
  assert.equal(other.profile.players[0].activeFavorite,1);
 }finally{await fs.rm(root,{recursive:true,force:true});}
});

test('renamed portable data preserves legacy settings and artwork without overwriting new settings',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'de-perportal-migration-'));
 try {
  const legacy=path.join(root,'skyportal-data');const current=path.join(root,'de-perportal-data');
  await fs.mkdir(path.join(root,'NFC'));await fs.mkdir(path.join(legacy,'art'),{recursive:true});
  await fs.writeFile(path.join(legacy,'settings.json'),JSON.stringify({game:3,profiles:{},artRoot:null}));
  await fs.writeFile(path.join(legacy,'art','sample.txt'),'preserved artwork');
  const manager=new Manager(root,async()=>{});await manager.init();assert.equal(manager.config.game,3);
  assert.equal(await fs.readFile(path.join(current,'art','sample.txt'),'utf8'),'preserved artwork');
  assert.equal(JSON.parse(await fs.readFile(path.join(legacy,'settings.json'))).game,3);
  manager.config.game=2;await manager.save();
  const next=new Manager(root,async()=>{});await next.init();assert.equal(next.config.game,2);
 } finally {await fs.rm(root,{recursive:true,force:true});}
});


test('arrow hotkeys cycle assigned defaults independently, wrap, persist, and notify without loading',async()=>{
 const calls=[];const {root,manager}=await setup(async a=>calls.push(a));
 try {
  const notices=[];manager.on('notification',text=>notices.push(text));
  await manager.select({player:0,target:'favorite',preset:2,choice:{top:'16-0.sky',bottom:null}});
  await manager.hotkey({player:0,key:'Right'});
  assert.equal(manager.profile.players[0].activeFavorite,0);
  await manager.hotkey({player:0,key:'Left'});
  assert.equal(manager.profile.players[0].activeFavorite,2);
  assert.match(notices.at(-1),/Player 1 · Preset 3: Spyro/);
  assert.equal(manager.profile.players[1].activeFavorite,0);
  await manager.select({player:1,target:'favorite',preset:1,choice:{top:'18-0.sky',bottom:null}});
  await manager.hotkey({player:1,key:'Left'});
  assert.equal(manager.profile.players[1].activeFavorite,0);
  await manager.hotkey({player:1,key:'Left'});
  assert.equal(manager.profile.players[1].activeFavorite,1);
  assert.match(notices.at(-1),/Player 2 · Preset 2/);
  assert.equal(calls.length,0);
  manager.busy=true;await manager.hotkey({player:0,key:'Right'});
  assert.equal(manager.profile.players[0].activeFavorite,2);manager.busy=false;
  const saved=JSON.parse(await fs.readFile(path.join(root,'de-perportal-data/settings.json')));
  assert.equal(saved.profiles[3].players[0].activeFavorite,2);
  manager.session.game=0;await manager.hotkey({player:0,key:'Right'});
  assert.equal(manager.config.profiles[3].players[0].activeFavorite,2);
 }finally{await fs.rm(root,{recursive:true,force:true});}
});
