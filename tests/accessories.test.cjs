const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const os=require('node:os');
const path=require('node:path');
const model=require('../app/model.cjs');
const accessories=require('../app/accessories.cjs');
const {Manager}=require('../app/manager.cjs');
function dump(id,variant=0,uid=id+1){const b=Buffer.alloc(1024);b.writeUInt32LE(uid);b.writeUInt16LE(id,16);b.writeUInt16LE(variant,28);return b;}
function figure(id,variant=0){return {...model.identify(dump(id,variant)),key:`${id}-${variant}.sky`};}
test('Trap Team arrow shortcuts cycle exact files, wrap, respect locks and game, and validate dumps',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'trap-hotkeys-')),calls=[];
 try {
  await fs.mkdir(path.join(root,'NFC'));
  for(const [key,uid] of [['b.sky',100],['a.sky',101]])await fs.writeFile(path.join(root,'NFC',key),dump(211,12289,uid));
  const manager=new Manager(root,async args=>calls.push(args));await manager.init();
  manager.updateSession({pid:1,supported:true,focused:true,title:'Skylanders Trap Team'});
  const press=key=>manager.hotkey({player:0,key});
  await press('Down');assert.equal(manager.accessories.trap.top,'a.sky');
  await press('Down');assert.equal(manager.accessories.trap.top,'b.sky');
  await press('Down');assert.equal(manager.accessories.trap.top,'a.sky');
  await press('Up');assert.equal(manager.accessories.trap.top,'b.sky');
  assert.ok(calls.every(args=>args[0]==='load' && args[1]==='7'));
  const count=calls.length;manager.busy=true;await press('Up');manager.busy=false;
  await manager.hotkey({player:1,key:'Down'});assert.equal(calls.length,count);
  for(const game of ['SuperChargers','Imaginators']) {
   manager.updateSession({pid:1,supported:true,title:`Skylanders ${game}`});await press('Down');
  }
  assert.equal(calls.length,count);
  manager.updateSession({pid:1,supported:true,title:'Skylanders Trap Team'});
  await fs.writeFile(path.join(root,'NFC/a.sky'),dump(211,12289,999));
  await press('Down');assert.equal(calls.length,count);assert.match(manager.message,/changed since scanning/);
 } finally {await fs.rm(root,{recursive:true,force:true});}
});
test('accessory compatibility and game-specific roles across all six console games',()=>{
 const item=figure(200),adventure=figure(300),trap=figure(211,12289),vehicle=figure(3224,16384),trophy=figure(3503,16384);
 assert.deepEqual([1,2,3,4,5,6].map(g=>accessories.available(item,g)),[true,true,true,true,true,true]);
 assert.deepEqual([1,2,3,4,5,6].map(g=>accessories.available(trap,g)),[false,false,false,true,true,true]);
 assert.deepEqual([1,2,3,4,5,6].map(g=>accessories.available(vehicle,g)),[false,false,false,false,true,true]);
 assert.match(accessories.describe(adventure,2).effect,/Unlocks its adventure/);
 assert.match(accessories.describe(adventure,3).effect,/original adventure level is not available/);
 assert.match(accessories.describe(item,5).effect,/Legendary Treasure/);
 assert.match(accessories.describe(item,6).effect,/gold reward/);
 assert.match(accessories.describe(trap,4).effect,/Capture/);
 assert.match(accessories.describe(trap,5).effect,/Skystones/);
 assert.match(accessories.describe(vehicle,6).effect,/Racing/);
 assert.match(accessories.describe(trophy,6).effect,/already available/);
 assert.equal(accessories.describe(figure(3222,16384),5).type,'Sea vehicle');
 assert.equal(accessories.describe(figure(3220,16384),5).type,'Sky vehicle');
 assert.equal(accessories.describe(vehicle,5).type,'Land vehicle');
 assert.equal(accessories.available(vehicle,5,'item'),false);
 assert.equal(accessories.describe(figure(16),6),null);
 assert.equal(accessories.describe(figure(310,20480),6).type,'Adventure piece');
 assert.equal(accessories.describe(figure(311,20480),6).type,'Adventure piece');
 for(const variant of [20481,20482,20483,20503,20505]) assert.equal(accessories.describe(figure(235,variant),6).type,'Imaginite chest');
 const crystal=figure(685,21007);
 assert.equal(model.playable(crystal,5),false);assert.equal(model.playable(crystal,6),true);
 assert.equal(accessories.describe(crystal,6),null);
});
test('accessories coexist with players, validate before writes, survive player swaps and reconcile external changes',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'perportal-items-'));
 const calls=[];const manager=new Manager(root,async args=>{calls.push(args);return `Row ${args[1]}: None -> ${args[0]==='clear'?'None':path.basename(args[2])}`;});
 try {
  await fs.mkdir(path.join(root,'NFC'));
  for(const [id,v] of [[16,0],[18,0],[200,0],[211,12289],[3224,16384],[3503,16384]])await fs.writeFile(path.join(root,'NFC',`${id}-${v}.sky`),dump(id,v));
  await manager.init();manager.session={pid:1,supported:true,game:5,focused:true};
  const choose=key=>({top:key,bottom:null});
  await manager.action({target:'direct',player:0,choice:choose('16-0.sky')});
  await manager.action({target:'direct',player:1,choice:choose('18-0.sky')});
  for(const [slot,key,row] of [['item','200-0.sky',6],['trap','211-12289.sky',7],['vehicle','3224-16384.sky',8],['trophy','3503-16384.sky',9]]) {
   calls.length=0;await manager.action({target:'accessory',slot,choice:choose(key)});
   assert.deepEqual(calls,[['load',String(row),path.join(root,'NFC',key)]]);
  }
  assert.equal(manager.active[0].top,'16-0.sky');assert.equal(manager.active[1].top,'18-0.sky');
  await manager.action({target:'remove',player:0});assert.equal(manager.accessories.vehicle.top,'3224-16384.sky');
  calls.length=0;
  await assert.rejects(manager.action({target:'accessory',slot:'item',choice:choose('3224-16384.sky')}),/unavailable/);
  await assert.rejects(manager.action({target:'direct',choice:choose('200-0.sky')}),/unavailable/);
  manager.session.game=3;
  await assert.rejects(manager.action({target:'accessory',slot:'trap',choice:choose('211-12289.sky')}),/unavailable/);
  assert.equal(calls.length,0);
  // Removal remains available after a game change.
  await manager.action({target:'remove-accessory',slot:'trap'});assert.equal(manager.accessories.trap,undefined);
  manager.session.game=5;calls.length=0;
  await fs.writeFile(path.join(root,'NFC','200-0.sky'),dump(200,0,999));
  await assert.rejects(manager.action({target:'accessory',slot:'item',choice:choose('200-0.sky')}),/changed since scanning/);
  assert.equal(calls.length,0);
  manager.updateSession({pid:1,supported:true,focused:true,title:'Skylanders SuperChargers',rows:['None','None','18-0.sky','None','None','200-0.sky','None','Other vehicle','3503-16384.sky']});
  assert.equal(manager.accessories.vehicle,undefined);assert.equal(manager.accessories.trophy.top,'3503-16384.sky');
  manager.updateSession({pid:2,supported:true,title:'Skylanders SuperChargers',rows:[]});assert.deepEqual(manager.accessories,{});
 } finally {await fs.rm(root,{recursive:true,force:true});}
});
test('failed accessory loads preserve tracked state and release busy status',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'perportal-items-failure-'));
 try {
  await fs.mkdir(path.join(root,'NFC'));await fs.writeFile(path.join(root,'NFC','item.sky'),dump(200));
  const manager=new Manager(root,async()=>{throw Error('Native load failed');});await manager.init();manager.session={pid:1,supported:true,game:2};
  await assert.rejects(manager.action({target:'accessory',slot:'item',choice:{top:'item.sky'}}),/Native load failed/);
  assert.deepEqual(manager.accessories,{});assert.equal(manager.busy,false);assert.match(manager.message,/Check Cemu/);
 }
 finally {await fs.rm(root,{recursive:true,force:true});}
});
test('accessory validation is serialized and duplicate UIDs cannot occupy another slot',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'perportal-items-lock-'));let calls=0;
 try {
  await fs.mkdir(path.join(root,'NFC'));await fs.writeFile(path.join(root,'NFC','item.sky'),dump(200,0,17));await fs.writeFile(path.join(root,'NFC','spyro.sky'),dump(16,0,17));
  const manager=new Manager(root,async()=>{calls++;});await manager.init();manager.session={pid:1,supported:true,game:2};
  manager.active[0]={top:'spyro.sky',bottom:null};
  const request=manager.action({target:'accessory',slot:'item',choice:{top:'item.sky'}});
  await assert.rejects(manager.action({target:'remove',player:1}),/already in progress/);
  await assert.rejects(request,/already on the portal/);assert.equal(calls,0);assert.equal(manager.busy,false);
  manager.active=[null,null];
  const changing=manager.action({target:'accessory',slot:'item',choice:{top:'item.sky'}});
  manager.session={pid:2,supported:true,game:2};
  await assert.rejects(changing,/Cemu or the game changed/);assert.equal(calls,0);
 }finally{await fs.rm(root,{recursive:true,force:true});}
});
