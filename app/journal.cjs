'use strict';
// Per-figure backups taken before every load, and a log of what was played.
// Both live in de-perportal-data, never in the NFC folder.
const fs=require('node:fs/promises');
const path=require('node:path');
const keep=10;

class Journal {
  constructor(root) { this.dir=path.join(root,'de-perportal-data'); this.history=[]; }
  folder(key) { return path.join(this.dir,'backups',encodeURIComponent(key)); }
  async list(key) {
    const names=await fs.readdir(this.folder(key)).catch(e=>e.code==='ENOENT'?[]:Promise.reject(e));
    return names.filter(n=>/^\d+\.sky$/.test(n)).sort((a,b)=>parseInt(b)-parseInt(a));
  }
  // Copies the dump unless the newest backup already has the same bytes.
  async backup(key,file) {
    const bytes=await fs.readFile(file),names=await this.list(key),folder=this.folder(key);
    if(names[0] && (await fs.readFile(path.join(folder,names[0]))).equals(bytes)) return names[0];
    const name=`${Math.max(Date.now(),(parseInt(names[0])||0)+1)}.sky`;
    await fs.mkdir(folder,{recursive:true});
    await fs.writeFile(path.join(folder,name),bytes,{flag:'wx'});
    for(const old of names.slice(keep-1)) await fs.rm(path.join(folder,old),{force:true});
    return name;
  }
  // Puts a backup back, first backing up the current file so it can be undone.
  async restore(key,file,name) {
    if(!/^\d+\.sky$/.test(name) || !(await this.list(key)).includes(name)) throw Error('That backup no longer exists.');
    const bytes=await fs.readFile(path.join(this.folder(key),name));
    await this.backup(key,file);
    const temp=`${file}.restore-${Date.now()}`;
    await fs.writeFile(temp,bytes);await fs.rename(temp,file);
  }
  async load() {
    const text=await fs.readFile(path.join(this.dir,'history.jsonl'),'utf8').catch(e=>e.code==='ENOENT'?'':Promise.reject(e));
    this.history=text.split('\n').slice(-500).flatMap(line=>{try{return [JSON.parse(line)];}catch{return [];}});
  }
  async record(entry) {
    this.history.push(entry);
    if(this.history.length>500) this.history.splice(0,this.history.length-500);
    await fs.mkdir(this.dir,{recursive:true});
    // ponytail: the log only grows on disk; load() reads the last 500 lines. Trim the file if it ever matters.
    await fs.appendFile(path.join(this.dir,'history.jsonl'),JSON.stringify(entry)+'\n');
  }
  recent(limit=8) {
    const seen=new Set(),out=[];
    for(let i=this.history.length-1;i>=0 && out.length<limit;i--) if(!seen.has(this.history[i].key)) { seen.add(this.history[i].key);out.push(this.history[i]); }
    return out;
  }
  lastPlayed() { const map={};for(const h of this.history) map[h.key]=h.at;return map; }
}
module.exports={Journal,keep};
