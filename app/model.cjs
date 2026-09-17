'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const catalog = require('../resources/catalog.json');
const elements = ['Magic','Water','Tech','Fire','Earth','Life','Air','Undead','Light','Dark'];
const games = ["Spyro’s Adventure",'Giants','Swap Force','Trap Team','SuperChargers','Imaginators'];
const index = new Map(catalog.map(f => [`${f.id}:${f.variant}`, f]));

function identify(bytes) {
  if (bytes.length !== 1024 || bytes.every(b => b === 0) || bytes.every(b => b === 255)) throw Error('Invalid 1024-byte figure dump');
  const id = bytes.readUInt16LE(0x10), variant = bytes.readUInt16LE(0x1c);
  const info = index.get(`${id}:${variant}`);
  return { id, variant, uid: bytes.subarray(0,4).toString('hex'), info: info || null,
    half: id >= 1000 && id <= 1015 ? 'bottom' : id >= 2000 && id <= 2015 ? 'top' : 'whole' };
}
async function scan(root, artRoot) {
  const figures=[], warnings=[], images=[];
  async function walk(dir, dumps) {
    let entries;
    try { entries=await fs.readdir(dir,{withFileTypes:true}); } catch(e) { warnings.push(`Cannot read ${dir}: ${e.code}`); return; }
    for (const entry of entries.sort((a,b)=>a.name.localeCompare(b.name))) {
      const file=path.join(dir,entry.name);
      if (entry.isSymbolicLink()) continue;
      if (entry.isDirectory()) { await walk(file,dumps); continue; }
      if (!entry.isFile()) continue;
      if (/\.(png|jpe?g|webp)$/i.test(file)) images.push(file);
      if (dumps && /\.(sky|bin|dump|dmp)$/i.test(file)) {
        try {
          if ((await fs.stat(file)).size!==1024) throw Error('Not a 1024-byte dump');
          const figure=identify(await fs.readFile(file));
          figures.push({...figure,path:file,key:path.relative(root,file).split(path.sep).join('/')});
          if(!figure.info) warnings.push(`Unknown figure ${figure.id}:${figure.variant} in ${entry.name}`);
        } catch(e) { warnings.push(`${entry.name}: ${e.message}`); }
      }
    }
  }
  await walk(root,true);
  if(artRoot && path.resolve(artRoot)!==path.resolve(root)) await walk(artRoot,false);
  const normalize=s=>s.toLowerCase().replace(/[^a-z0-9]/g,'');
  const byName=new Map(images.map(p=>[normalize(path.basename(p,path.extname(p))),p]));
  for(const f of figures) {
    const stem=normalize(path.basename(f.path,path.extname(f.path)));
    const name=normalize(f.info?.name || '');
    const hex=f.id.toString(16).padStart(6,'0'), variant=f.variant.toString(16).padStart(4,'0');
    f.art=byName.get(normalize(`${hex}_${variant}`)) || byName.get(normalize(`${f.id}-${f.variant}`)) || byName.get(name) || byName.get(stem) || byName.get(hex) || null;
  }
  return {figures,warnings,images:images.length};
}
function detectGame(title) {
  const t=title.toLowerCase().replace(/[’']/g,'');
  const names=['spyros adventure','giants','swap force','trap team','superchargers','imaginators'];
  for(let i=0;i<names.length;i++) if(t.includes(names[i])) return i+1;
  // Regional Wii U title IDs; also handles the Japanese Spyro title.
  const ids={ '10142d00':1,'1010d700':2,'10116000':2,'10139200':3,'10140400':3,'1017c600':4,'10181f00':4,'101bfc00':5,'101b8500':5,'101f4d00':6,'101fb100':6 };
  const match=t.match(/titleid:\s*00050000[- ]?([0-9a-f]{8})/);
  return match ? ids[match[1]] || 0 : 0;
}
function compatible(f,game) { return !!f?.info && f.info.game<=game; }
function core(f) {
  // LightCore/Elite variants are omitted from automatic ordinary teams too.
  return f?.info?.kind==='Skylander' && f.half==='whole' && !/lightcore|elite/i.test(f.info.name) && (f.variant & 0x600)!==0x200;
}
function playable(f,game) { return compatible(f,game) && ['Skylander','Giant','Swapper','TrapMaster','Mini','Sensei'].includes(f.info.kind) && !(f.info.kind==='Mini' && f.info.game<4); }
function candidates(figures,game,element=null,kind='player') {
  return figures.filter(f=>compatible(f,game) && (kind==='sidekick' ? f.info.kind==='Mini' && f.info.game<4 : playable(f,game)) && (!element || (f.info.element===element && core(f))));
}
function choice(f,figures) {
  if(!f) return null;
  if(f.half==='whole') return {top:f.key,bottom:null};
  const otherId=f.half==='top'?f.id-1000:f.id+1000;
  const other=figures.find(x=>x.id===otherId && x.variant===f.variant);
  if(!other) return null;
  return f.half==='top'?{top:f.key,bottom:other.key}:{top:other.key,bottom:f.key};
}
function newProfile(figures,game) {
  const used=new Set();
  function pick(options) {
    const selected=options.find(f=>!used.has(f.uid));
    if(selected) used.add(selected.uid);
    return choice(selected,figures);
  }
  const sorted=[...figures].sort((a,b)=>(a.variant!==0)-(b.variant!==0) || a.id-b.id || a.variant-b.variant || a.key.localeCompare(b.key));
  const players=[0,1].map(()=>({favorite:null,elements:{}}));
  for(const element of elements) for(const p of players) p.elements[element]=pick(candidates(sorted,game,element));
  for(const p of players) p.favorite=p.elements.Magic || Object.values(p.elements).find(Boolean) || null;
  return {players,sidekick:null};
}
function resolveChoice(selected,figures,game) {
  if(!selected) throw Error('Choose a Skylander first.');
  const top=figures.find(f=>f.key===selected.top), bottom=figures.find(f=>f.key===selected.bottom);
  if(!playable(top,game) || top.half==='bottom') throw Error('This figure is unavailable in the selected game.');
  if(top.half==='top' && (!playable(bottom,game) || bottom.half!=='bottom')) throw Error('Choose both a top and bottom.');
  if(top.half==='whole' && selected.bottom) throw Error('A whole figure cannot have a bottom half.');
  return top.half==='top'?[top,bottom]:[top];
}
module.exports={elements,games,identify,scan,detectGame,compatible,core,playable,candidates,choice,newProfile,resolveChoice};
