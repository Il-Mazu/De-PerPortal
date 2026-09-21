'use strict';
// Trap saves use the normal Skylander redundant, encrypted data areas.
// Unknown or damaged save areas are never rewritten.
const crypto=require('node:crypto');

// The key derivation constant is 53 bytes, including its final space.
const copyright=Buffer.from(' Copyright (C) 2010 Activision. All Rights Reserved. ');
const trailers=new Set([3,7,11,15,19,23,27,31,35,39,43,47,51,55,59,63]);
function crc16(data,crc=0xffff) { for(const byte of data) { crc^=byte<<8; for(let i=0;i<8;i++) crc=(crc&0x8000)?((crc<<1)^0x1021)&0xffff:(crc<<1)&0xffff; } return crc; }
function key(bytes,block) { return crypto.createHash('md5').update(bytes.subarray(0,32)).update(Buffer.from([block])).update(copyright).digest(); }
function decrypt(bytes) {
  const out=Buffer.from(bytes);
  for(let block=8;block<64;block++) if(!trailers.has(block)) {
    const decipher=crypto.createDecipheriv('aes-128-ecb',key(out,block),null); decipher.setAutoPadding(false);
    Buffer.concat([decipher.update(out.subarray(block*16,block*16+16)),decipher.final()]).copy(out,block*16);
  }
  return out;
}
function areaValid(data,block) {
  const at=block*16, header=Buffer.from(data.subarray(at,at+16));
  const stored={one:header.readUInt16LE(14),two:header.readUInt16LE(12),three:header.readUInt16LE(10)};
  header.writeUInt16LE(5,14);
  const blocks=from=>Buffer.concat([...Array(4)].map((_,i)=>block+from+i).filter(b=>!trailers.has(b)).map(b=>data.subarray(b*16,b*16+16)));
  const first=blocks(1);
  // The active record lives in the first checksum-protected data group.  The
  // later group contains the game-owned history/timer records whose layout
  // varies between releases, so it is intentionally not interpreted here.
  return stored.one===crc16(header) && stored.two===crc16(first);
}
function newer(a,b) { return a===0&&b===255 ? true : b===0&&a===255 ? false : a>b; }
// The active trap record is the first little-endian word in the active save's
// mutable record.  0 is the game's empty sentinel.  Keep this tiny parser
// separate so fixtures and future record revisions can be checked safely.
function decodeRecord(data,block) {
  const id=data.readUInt16LE((block+1)*16);
  if(id===0) return {state:'empty'};
  if(id===0xffff) return {state:'unknown'};
  return {state:'captured',recordId:id};
}
function decode(bytes) {
  try {
    if(!Buffer.isBuffer(bytes) || bytes.length!==1024) return {state:'unknown'};
    const data=decrypt(bytes), valid=[8,36].filter(block=>areaValid(data,block));
    if(!valid.length) return {state:'unknown'};
    const block=valid.length===1?valid[0]:newer(data[8*16+9],data[36*16+9])?8:36;
    return decodeRecord(data,block);
  } catch { return {state:'unknown'}; }
}
function clear(bytes) {
  if(decode(bytes).state==='unknown') throw Error('Unrecognized trap save; original left untouched.');
  const data=decrypt(bytes),out=Buffer.from(bytes);
  const valid=[8,36].filter(block=>areaValid(data,block));
  if(!valid.length) throw Error('Unrecognized trap save; original left untouched.');
  for(const block of [8,36]) {
    // Villains occupy one data block per sector, six entries per copy.
    // Keep the surrounding game-owned blocks intact: Trap Team also stores
    // structure and timer state there, and zeroing those blocks corrupts toys.
    if(!valid.includes(block)) data.copy(data,block*16,valid[0]*16,valid[0]*16+16);
    const changed=[block];
    for(let i=0;i<6;i++) {
      const record=block+1+i*4;
      data.fill(0,record*16,record*16+16);
      changed.push(record);
    }
    const group=Buffer.concat([block+1,block+2,block+4].map(b=>data.subarray(b*16,b*16+16)));
    data.writeUInt16LE(crc16(group),block*16+12);
    data.writeUInt16LE(5,block*16+14);
    data.writeUInt16LE(crc16(data.subarray(block*16,block*16+16)),block*16+14);
    for(const b of changed) {
      const cipher=crypto.createCipheriv('aes-128-ecb',key(bytes,b),null);cipher.setAutoPadding(false);
      Buffer.concat([cipher.update(data.subarray(b*16,b*16+16)),cipher.final()]).copy(out,b*16);
    }
  }
  return out;
}
module.exports={crc16,decrypt,areaValid,decodeRecord,decode,clear};
