'use strict';
const fs=require('node:fs/promises');
const path=require('node:path');
const {createHash}=require('node:crypto');
const AdmZip=require('adm-zip');
const url='https://github.com/joaohypo/emulanders/releases/download/0.9.1/emulanders_assets_pack.zip';
const digest='82b7e097bab78c0fc5b3db0027874382db2d50f4abd9dac2769e67f69ce1331e';
async function installArt(root,bytes) {
  if(createHash('sha256').update(bytes).digest('hex')!==digest) throw Error('Artwork download checksum did not match. No images installed.');
  const dir=path.join(root,'de-perportal-data/art');await fs.mkdir(dir,{recursive:true});
  const archive=new AdmZip(bytes);let count=0;
  for(const entry of archive.getEntries()) {
    const name=entry.entryName.replaceAll('\\','/').split('/').pop();
    if(!/^[0-9A-Fa-f]{6}(?:_[0-9A-Fa-f]{4})?\.png$/.test(name) || entry.header.size>4*1024*1024) continue;
    const data=entry.getData();
    if(data.subarray(0,8).toString('hex')!=='89504e470d0a1a0a') throw Error('Invalid PNG in artwork pack.');
    await fs.writeFile(path.join(dir,name),data);count++;
  }
  await fs.writeFile(path.join(dir,'source.json'),JSON.stringify({source:url,sha256:digest,count,notice:'Community-hosted Skylanders artwork. Character artwork belongs to its respective rights holders; not covered by the manager’s source-code license.'},null,2));
  return count;
}
let downloading=false;
async function downloadArt(root) {
  if(downloading) throw Error('Artwork download is already running.');
  downloading=true;
  try {
    const response=await fetch(url,{signal:AbortSignal.timeout(180000)});
    if(!response.ok) throw Error(`Artwork server returned ${response.status}. Try again later.`);
    const chunks=[];let total=0;
    for await(const part of response.body) {total+=part.length;if(total>60*1024*1024) throw Error('Artwork pack exceeded download limit.');chunks.push(part);}
    return installArt(root,Buffer.concat(chunks));
  } finally {downloading=false;}
}
module.exports={downloadArt,installArt,url,digest};
