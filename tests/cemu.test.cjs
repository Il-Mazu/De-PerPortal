const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const os=require('node:os');
const path=require('node:path');
const {createHash}=require('node:crypto');
const AdmZip=require('adm-zip');
const {installCemu}=require('../app/cemu.cjs');
const sha=b=>createHash('sha256').update(b).digest('hex');
test('Cemu install checks the ZIP, keeps existing files, skips NFC and stays inside the folder',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'de-perportal-cemu-'));
 try {
  const zip=new AdmZip();
  zip.addFile('Cemu-Skylanders-Emulated-Portal.exe',Buffer.from('exe'));
  zip.addFile('settings.xml',Buffer.from('new'));
  zip.addFile('graphicPacks/pack/rules.txt',Buffer.from('rules'));
  zip.addFile('NFC/1) Spyro/Spyro.sky',Buffer.from('dump'));
  const bytes=zip.toBuffer();
  await fs.writeFile(path.join(root,'settings.xml'),'mine');
  await assert.rejects(installCemu(root,bytes,'0'.repeat(64)),/checksum/);
  assert.deepEqual(await fs.readdir(root),['settings.xml']);
  assert.deepEqual(await installCemu(root,bytes,sha(bytes)),{added:2,kept:1});
  assert.equal(await fs.readFile(path.join(root,'settings.xml'),'utf8'),'mine');
  assert.equal(await fs.readFile(path.join(root,'graphicPacks/pack/rules.txt'),'utf8'),'rules');
  await assert.rejects(fs.access(path.join(root,'NFC')));
  const evil=new AdmZip();evil.addFile('../escaped.txt',Buffer.from('x'));
  await installCemu(root,evil.toBuffer(),sha(evil.toBuffer()));
  assert.equal(await fs.readFile(path.join(root,'escaped.txt'),'utf8'),'x');
  await assert.rejects(fs.access(path.join(root,'..','escaped.txt')));
 } finally {await fs.rm(root,{recursive:true,force:true});}
});
