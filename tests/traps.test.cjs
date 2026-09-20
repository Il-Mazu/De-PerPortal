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
