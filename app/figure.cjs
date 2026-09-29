'use strict';
// Reads a Skylander's own save: gold, XP, hero points, nickname.  Offsets
// follow SkyReader and Dolphin's SkylanderFigure.cpp.  Advisory only, like
// trap decoding: nothing here ever writes a dump.
const {decrypt,areaValid,newer}=require('./traps.cjs');

// Cumulative XP for levels 1-10 (level 10 = 33,000).  Giants and later keep
// levels 11-20 in fields we have not verified, so 33,000 reads as "10+".
const levels=[0,1000,2200,3800,6000,9000,13000,18200,24600,33000];
// Imaginators figures and non-characters keep a different record layout.
const kinds=new Set(['Skylander','Giant','Swapper','TrapMaster','Mini']);

// Every fourth block is a sector trailer holding keys, never save data.
function blank(bytes,block) { for(let b=block;b<block+7;b++) if(b%4!==3 && !bytes.subarray(b*16,b*16+16).every(x=>x===0)) return false; return true; }
function read(bytes,kind) {
  try {
    if(!kinds.has(kind) || !Buffer.isBuffer(bytes) || bytes.length!==1024) return null;
    if(blank(bytes,8) && blank(bytes,36)) return {state:'new'};
    const data=decrypt(bytes), valid=[8,36].filter(block=>areaValid(data,block));
    if(!valid.length) return {state:'damaged'};
    const block=valid.length===1?valid[0]:newer(data[8*16+9],data[36*16+9])?8:36, at=block*16;
    const xp=data.readUIntLE(at,3), level=levels.findLastIndex(n=>xp>=n)+1;
    // The nickname is split over the area's third and fifth blocks.
    const nickname=Buffer.concat([data.subarray(at+0x20,at+0x30),data.subarray(at+0x40,at+0x50)]).toString('utf16le').replace(/\0.*$/s,'').trim();
    return {state:'ok',xp,level,maxed:xp>=levels.at(-1),gold:data.readUInt16LE(at+3),heroPoints:data.readUInt16LE(at+0x5*16+0xa),nickname};
  } catch { return {state:'damaged'}; }
}
module.exports={read,levels};
