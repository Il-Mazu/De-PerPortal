'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os');
const {crc16,decrypt,decode}=require('../app/traps.cjs');
const dump=require('../app/dump.cjs');
const figure=require('../app/figure.cjs');
const model=require('../app/model.cjs');
const catalog=require('../resources/catalog.json');
const find=(game,kind,test=()=>true)=>catalog.find(c=>c.game===game && c.kind===kind && test(c));

// At least one figure per game, plus traps, vehicles, trophies and both Swap Force halves.
const figures=[
  find(1,'Skylander'),find(2,'Giant'),find(3,'Swapper',c=>c.id>=2000),find(3,'Swapper',c=>c.id<2000),
  find(4,'TrapMaster'),find(4,'Trap'),find(5,'Skylander'),find(5,'Vehicle'),find(5,'Trophy'),find(6,'Sensei'),find(6,'Crystal')
];
const uid=n=>Buffer.from([0x10,0x20,0x30,n]);
// Writes a save into area `at` of a created dump the way the game does.
// Spyro's Adventure checksums blocks 5-26; later characters only 5, 6 and 8.
function played(info,{at=8,xp=6500,gold=1234,sequence=1,n=1}={}) {
  const plain=decrypt(dump.create(info,uid(n))),pick=list=>Buffer.concat(list.map(i=>plain.subarray((at+i)*16,(at+i+1)*16)));
  plain.writeUIntLE(xp,at*16,3);plain.writeUInt16LE(gold,at*16+3);plain[at*16+9]=sequence;
  plain[(at+5)*16]=0x14;plain[(at+25)*16]=0xc4;
  const extended=Buffer.alloc(0x110);(info.game===1 || info.kind==='Trap'?pick([5,6,8,9,10,12,13,14,16,17,18,20,21,22,24,25,26]):pick([5,6,8])).copy(extended);
  plain.writeUInt16LE(crc16(extended),at*16+10);plain.writeUInt16LE(crc16(pick([1,2,4])),at*16+12);
  plain.writeUInt16LE(5,at*16+14);plain.writeUInt16LE(crc16(plain.subarray(at*16,at*16+16)),at*16+14);
  return dump.encrypt(plain);
}
const save=(bytes,at)=>decrypt(bytes).subarray(at*16,(at+28)*16);
const trap=()=>Buffer.from(require('node:fs').readFileSync(path.join(__dirname,'fixtures/life-trap.hex'),'utf8').trim(),'hex');

test('new dumps carry the ID, variant, checksums, access bits and keys of a fresh toy',()=>{
  for(const info of figures) {
    const bytes=dump.create(info,uid(7)),seen=model.identify(bytes);
    assert.deepEqual([seen.id,seen.variant,seen.info.name],[info.id,info.variant,info.name]);
    assert.deepEqual(dump.diagnose(bytes,info),{ok:true,problems:[],fixable:false,areas:['blank','blank']});
    assert.equal(bytes[4],0x10^0x20^0x30^7);
    assert.equal(bytes.readUInt16LE(30),crc16(bytes.subarray(0,30)));
    assert.equal(bytes.subarray(48,64).toString('hex'),'4b0b20107ccb0f0f0f69000000000000');
    assert.equal(bytes.subarray(112,122).subarray(6).toString('hex'),'7f0f0869');
    if(figure.read(bytes,info.kind)) assert.deepEqual(figure.read(bytes,info.kind),{state:'new'});
  }
  assert.equal(model.identify(dump.create(figures[2])).half,'top');
  assert.equal(model.identify(dump.create(figures[3])).half,'bottom');
  assert.deepEqual(decode(dump.create(figures[5])),{state:'empty'});
  assert.notEqual(dump.create(figures[0]).toString('hex'),dump.create(figures[0]).toString('hex'),'each new toy gets its own UID');
  assert.throws(()=>dump.create({id:'x'}),/catalog/);
});

test('a real trap passes every check and survives decode, write and decode unchanged',()=>{
  const bytes=trap(),info=model.identify(bytes).info;
  assert.equal(dump.diagnose(bytes,info).ok,true);
  assert.deepEqual(dump.encrypt(decrypt(bytes)),bytes);
  // Breaking its older area loses nothing: Fix rebuilds it from the newer one.
  const broken=Buffer.from(bytes);broken[36*16+3]^=1;
  assert.deepEqual(dump.diagnose(broken,info).problems.map(p=>p.code),['area']);
  const fixed=dump.repair(broken,info);
  assert.equal(dump.diagnose(fixed,info).ok,true);
  assert.deepEqual(decode(fixed),decode(bytes));
  assert.deepEqual(save(fixed,8),save(bytes,8));
  // Reset leaves an empty trap the roster can use again.
  const fresh=dump.reset(bytes,info);
  assert.deepEqual(decode(fresh),{state:'empty'});
  assert.deepEqual(fresh.subarray(0,32),bytes.subarray(0,32));
  assert.deepEqual(dump.diagnose(fresh,info).areas,['blank','blank']);
});

test('known-good saves pass, and every played figure keeps its progress through Fix',()=>{
  for(const info of figures.filter(f=>f.kind!=='Trap')) {
    const good=played(info);
    assert.equal(dump.diagnose(good,info).ok,true,info.name);
    // The newer area 2 is broken mid-write: Fix keeps area 1, and makes it the newest.
    const both=played(info,{at:36,sequence:2,n:1}),mixed=Buffer.from(good);both.copy(mixed,36*16,36*16,64*16);
    mixed[36*16+20]^=0xff;
    const report=dump.diagnose(mixed,info);
    assert.equal(report.fixable,true,info.name);assert.deepEqual(report.areas,['ok','bad']);
    const fixed=dump.repair(mixed,info);
    assert.equal(dump.diagnose(fixed,info).ok,true,info.name);
    assert.deepEqual(save(fixed,8),save(good,8));
    assert.equal(decrypt(fixed)[36*16+9],0,'the rebuilt area is one step older');
    if(figure.read(fixed,info.kind)) assert.equal(figure.read(fixed,info.kind).gold,1234);
  }
});

test('Diagnose names each reason a toy is broken',()=>{
  const info=figures[1],good=played(info),codes=bytes=>dump.diagnose(bytes,info).problems.map(p=>p.code);
  const header=Buffer.from(good);header[31]^=1;assert.deepEqual(codes(header),['header','area','areas']);
  const bcc=Buffer.from(good);bcc[4]^=1;assert.deepEqual(codes(bcc),['uid','header','area','areas']);
  const bits=Buffer.from(good);bits[7*16+6]=0xff;assert.deepEqual(codes(bits),['access']);
  const keys=Buffer.from(good);keys[7*16]^=1;assert.deepEqual(codes(keys),['keys']);
  const data=Buffer.from(good);data[8*16+0x10]^=1;assert.deepEqual(codes(data),['area','areas']);
  assert.match(dump.diagnose(data,info).problems[0].text,/Save area 1: /);
  const extended=decrypt(good);extended[(8+5)*16+1]^=1;
  assert.match(dump.diagnose(dump.encrypt(extended),info).problems[0].text,/extended checksum/);
  // Both areas claim to be newest: the second wins, as in the game.
  const twin=Buffer.from(played(info,{gold:5})),other=played(info,{at:36,gold:9});other.copy(twin,36*16,36*16,64*16);
  assert.deepEqual(codes(twin),['counter']);
  assert.equal(figure.read(dump.repair(twin,info),info.kind).gold,9);
});

test('Fix repairs the ID block and trailers but never writes a save it cannot decode',()=>{
  const info=figures[0],good=played(info);
  // A damaged access byte and key in an otherwise good dump.
  const trailer=Buffer.from(good);trailer[11*16+6]=0;trailer[11*16]^=1;
  assert.equal(dump.diagnose(dump.repair(trailer,info),info).ok,true);
  assert.deepEqual(save(dump.repair(trailer,info),8),save(good,8));
  // Changing the ID block after a save scrambles both areas: nothing is fixable.
  const lost=Buffer.from(good);lost[31]^=1;
  assert.equal(dump.diagnose(lost,info).fixable,false);
  assert.throws(()=>dump.repair(lost,info),/UID or ID block/);
  const both=Buffer.from(good);both[8*16+3]^=1;
  assert.throws(()=>dump.repair(both,info),/no save to keep/);
  assert.throws(()=>dump.repair(good,info),/Nothing to fix/);
  // An unknown figure's bad ID block is never resealed.
  const unknown=dump.create({id:999,variant:1},uid(3));unknown[31]^=1;
  assert.equal(dump.diagnose(unknown,null).fixable,false);
  assert.throws(()=>dump.reset(unknown,null),/unknown/);
});

test('Reset turns a played or broken figure back into a fresh toy with the same identity',()=>{
  for(const info of figures.filter(f=>f.kind!=='Trap')) {
    const good=played(info),broken=Buffer.from(good);broken[8*16+3]^=1;
    for(const bytes of [good,broken]) {
      const fresh=dump.reset(bytes,info);
      assert.deepEqual(dump.diagnose(fresh,info),{ok:true,problems:[],fixable:false,areas:['blank','blank']});
      assert.deepEqual(fresh.subarray(0,32),good.subarray(0,32));
      assert.deepEqual(fresh,dump.create(info,uid(1)),'identical to a new toy with that UID');
      if(figure.read(fresh,info.kind)) assert.deepEqual(figure.read(fresh,info.kind),{state:'new'});
    }
  }
});

test('the library flags, fixes, resets and creates dumps, backing up first',async()=>{
  const {Manager}=require('../app/manager.cjs');
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'dump-'));
  try {
    await fs.mkdir(path.join(root,'NFC'));
    const info=figures[1],good=played(info),broken=Buffer.from(good);
    played(info,{at:36,sequence:2}).copy(broken,36*16,36*16,64*16);broken[36*16+20]^=0xff;
    await fs.writeFile(path.join(root,'NFC/giant.sky'),broken);
    const lifeTrap=trap();await fs.writeFile(path.join(root,'NFC/life.sky'),lifeTrap);
    const manager=new Manager(root,async()=>{});await manager.init();
    const giant=()=>manager.state().figures.find(f=>f.key==='giant.sky');
    assert.equal(giant().dump.fixable,true);
    assert.deepEqual((await manager.diagnostics()).damaged,['giant.sky']);
    manager.active[0]={top:'giant.sky',bottom:null};
    await assert.rejects(manager.repairFigure('giant.sky'),/off the portal/);
    manager.active[0]=null;
    await manager.repairFigure('giant.sky');
    assert.equal(giant().dump.ok,true);assert.equal(giant().save.gold,1234);
    assert.deepEqual((await manager.diagnostics()).damaged,[]);
    const [backup]=await manager.backups('giant.sky');
    assert.deepEqual(await fs.readFile(path.join(root,'de-perportal-data/backups/giant.sky',backup.name)),broken);
    await manager.resetFigure('giant.sky');
    assert.deepEqual(giant().save,{state:'new'});
    assert.equal((await manager.backups('giant.sky')).length,2);
    // A reset trap drops the name it had and reads as empty.
    await manager.select({target:'trap-name',choice:{top:'life.sky'},name:'Chompy Mage'});
    await manager.resetFigure('life.sky');
    const life=manager.state().figures.find(f=>f.key==='life.sky');
    assert.equal(life.trap.state,'empty');assert.equal(life.trapLabel,null);
    const key=await manager.createDump({id:info.id,variant:info.variant});
    assert.equal(key,`Created/${info.name}.sky`);
    assert.equal(await manager.createDump({id:info.id,variant:info.variant}),`Created/${info.name} 2.sky`);
    const created=manager.state().figures.filter(f=>f.key.startsWith('Created/'));
    assert.equal(created.length,2);assert.ok(created.every(f=>f.dump.ok && f.save.state==='new'));
    assert.notEqual(manager.figures.find(f=>f.key===key).uid,manager.figures.find(f=>f.key==='giant.sky').uid);
    await assert.rejects(manager.createDump({id:9999,variant:9}),/catalog/);
    assert.equal(manager.busy,false);
  } finally {await fs.rm(root,{recursive:true,force:true});}
});
