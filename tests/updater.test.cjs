const {test}=require('node:test');
const assert=require('node:assert/strict');
const {newer,checksum,install}=require('../app/updater.cjs');

test('updates only to a strictly newer release with a matching checksum',()=>{
  assert.equal(newer('v1.1.0','1.0.0'),true);
  assert.equal(newer('v1.0.0','1.0.0'),false);
  assert.equal(newer('v0.9.9','1.0.0'),false);
  assert.equal(newer('v1.10.0','1.9.0'),true,'numeric, not alphabetical');
  assert.equal(newer('v2.0','1.9.9'),true);
  const sums=`${'a'.repeat(64)}  De-PerPortal-1.1.0-windows-x64.zip\r\n${'b'.repeat(64)}  other.zip\n`;
  assert.equal(checksum(sums,'De-PerPortal-1.1.0-windows-x64.zip'),'a'.repeat(64));
  assert.equal(checksum(sums,'missing.zip'),null);
  assert.equal(checksum('nothex  De-PerPortal-1.1.0-windows-x64.zip','De-PerPortal-1.1.0-windows-x64.zip'),null);
});

test('install waits for the old app, then copies the package over the install',async()=>{
  const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),{spawn}=require('node:child_process');
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'update-')),staging=path.join(dir,'staging'),root=path.join(dir,'root');
  fs.mkdirSync(path.join(staging,'resources'),{recursive:true});fs.mkdirSync(path.join(root,'de-perportal-data'),{recursive:true});
  fs.writeFileSync(path.join(staging,'resources','app.asar'),'new');
  fs.writeFileSync(path.join(root,'de-perportal-data','settings.json'),'mine');
  const old=spawn(process.execPath,['-e','setTimeout(()=>{},700)']),start=Date.now();
  await install(staging,root,old.pid,fs);
  assert.ok(Date.now()-start>=500,'waited for the old app to exit');
  assert.equal(fs.readFileSync(path.join(root,'resources','app.asar'),'utf8'),'new');
  assert.equal(fs.readFileSync(path.join(root,'de-perportal-data','settings.json'),'utf8'),'mine');
  fs.rmSync(dir,{recursive:true,force:true});
});
