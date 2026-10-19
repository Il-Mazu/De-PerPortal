'use strict';
const fs=require('node:fs/promises');
const path=require('node:path');
const {createHash}=require('node:crypto');
const AdmZip=require('adm-zip');
// The supported build; its executable is hash-checked by the portal controller (see README).
const url='https://github.com/skylandersNFC/Cemu-Skylanders-Emulated-Portal/releases/download/Cemu-Skylanders-Emulated-Portal/Cemu-Skylanders-Emulated-Portal.zip';
const digest='d2857d210982535f2d5007bf2723213d1393495cd977cff605ed923d432e2dbe';
// Unpacks beside Dè PerPortal.  Existing files are kept, and the ZIP's bundled NFC folder is skipped so the user's library is never touched.
async function installCemu(root,bytes,expected=digest) {
  if(createHash('sha256').update(bytes).digest('hex')!==expected) throw Error('Cemu download checksum did not match. Nothing was installed.');
  const base=path.resolve(root);let added=0,kept=0;
  for(const entry of new AdmZip(bytes).getEntries()) {
    const parts=entry.entryName.replaceAll('\\','/').split('/').filter(Boolean);
    if(!parts.length || parts[0].toLowerCase()==='nfc') continue;
    const dest=path.resolve(base,...parts);
    if(!dest.startsWith(base+path.sep)) throw Error('Cemu download contained an unsafe path. Nothing more was installed.');
    if(entry.isDirectory) { await fs.mkdir(dest,{recursive:true});continue; }
    if(entry.header.size>200*1024*1024) throw Error('Cemu download contained an oversized file.');
    await fs.mkdir(path.dirname(dest),{recursive:true});
    try { await fs.writeFile(dest,entry.getData(),{flag:'wx'});added++; } catch(e) { if(e.code!=='EEXIST') throw e;kept++; }
  }
  return {added,kept};
}
let downloading=false;
async function downloadCemu(root) {
  if(downloading) throw Error('The Cemu download is already running.');
  downloading=true;
  try {
    const response=await fetch(url,{signal:AbortSignal.timeout(300000)});
    if(!response.ok) throw Error(`GitHub returned ${response.status}. Try again later.`);
    const chunks=[];let total=0;
    for await(const part of response.body) {total+=part.length;if(total>120*1024*1024) throw Error('Cemu download exceeded its size limit.');chunks.push(part);}
    return installCemu(root,Buffer.concat(chunks));
  } finally {downloading=false;}
}
module.exports={downloadCemu,installCemu,url,digest};
