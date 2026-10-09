'use strict';
// Diagnoses, fixes, resets and creates figure dumps.  Layouts follow Dolphin's
// SkylanderCrypto.cpp and SkylanderFigure.cpp; the trap checksums were checked
// against a real Trap Team trap (tests/fixtures/life-trap.hex).  Every dump we
// produce is diagnosed again before it is returned: one that doesn't pass every
// check throws instead, so the caller never writes it.
const crypto=require('node:crypto');
const {crc16,key,trailers,decrypt,newer}=require('./traps.cjs');

const areas=[8,36];
// An area spans 28 blocks; every fourth one is a sector trailer.
const areaBlocks=[...Array(28).keys()].filter(i=>(i&3)!==3);
const block=(bytes,b)=>bytes.subarray(b*16,b*16+16);
const zero=buf=>buf.every(x=>x===0);
// Sector 0 has its own access bits; every other sector shares one set.
const access=sector=>Buffer.from(sector===0?[0x0f,0x0f,0x0f,0x69]:[0x7f,0x0f,0x08,0x69]);
function crc48(data) {
  let crc=2n*2n*3n*1103n*12868356821n;
  for(const byte of data) { crc^=BigInt(byte)<<40n; for(let i=0;i<8;i++) crc=crc&(1n<<47n)?(crc<<1n)^0x42f0e1eba9ea3693n:crc<<1n; }
  return crc&0xffffffffffffn;
}
// Key A as stored in the sector trailer (Dolphin's CalculateKeyA and PopulateKeys).
function keyA(uid,sector) {
  const out=Buffer.alloc(8);
  if(sector===0) { out.writeBigUInt64BE(73n*2017n*560381651n); return out.subarray(2); }
  out.writeBigUInt64LE(crc48([...uid,sector])); return out.subarray(0,6);
}
// The third checksum covers the 17 data blocks from the area's fifth block.
// Giants and later characters protect blocks 9+ separately, so theirs covers
// blocks 5, 6 and 8 padded with zeros instead.  Either form is accepted.
function sums(data,at) {
  const pick=list=>Buffer.concat(list.map(i=>block(data,at+i)));
  const head=Buffer.from(block(data,at));head.writeUInt16LE(5,14);
  const short=Buffer.alloc(0x110);pick([5,6,8]).copy(short);
  return {header:crc16(head),data:crc16(pick([1,2,4])),extended:[crc16(pick(areaBlocks.filter(i=>i>=5))),crc16(short)]};
}
// Only layouts we have checked are held to the third checksum; vehicles,
// Imaginators and magic items keep records we have not verified.
const extendedKnown=info=>['Trap','Trophy'].includes(info?.kind) || (['Skylander','Giant','Swapper','TrapMaster','Mini'].includes(info?.kind) && info.game<=5);
function area(data,at,extended) {
  if(areaBlocks.every(i=>zero(block(data,at+i)))) return {state:'blank'};
  const s=sums(data,at),head=block(data,at);
  if(head.readUInt16LE(14)!==s.header) return {state:'bad',problem:'its header checksum fails'};
  if(head.readUInt16LE(12)!==s.data) return {state:'bad',problem:'its data checksum fails'};
  if(extended && !s.extended.includes(head.readUInt16LE(10))) return {state:'bad',problem:'its extended checksum fails'};
  return {state:'ok',sequence:head[9]};
}
// Apart from its counter and checksums, the header block holds XP and gold.
const sameArea=data=>areaBlocks.every(i=>i===0?block(data,8).subarray(0,9).equals(block(data,36).subarray(0,9)):block(data,8+i).equals(block(data,36+i)));

function inspect(bytes,info) {
  if(!Buffer.isBuffer(bytes) || bytes.length!==1024) throw Error('A figure dump is exactly 1024 bytes.');
  const problems=[],uid=bytes.subarray(0,4),data=decrypt(bytes);
  const say=(code,text)=>problems.push({code,text});
  if((uid[0]^uid[1]^uid[2]^uid[3])!==bytes[4]) say('uid','The UID check byte doesn’t match the UID.');
  const headerBad=crc16(bytes.subarray(0,30))!==bytes.readUInt16LE(30);
  if(headerBad) say('header','The ID and variant block fails its checksum.');
  const badAccess=[],badKeys=[];
  for(let s=0;s<16;s++) {
    // Some dump tools leave trailers out entirely; Cemu never reads them.
    const trailer=block(bytes,s*4+3);
    if(zero(trailer)) continue;
    if(!trailer.subarray(6,10).equals(access(s))) badAccess.push(s);
    // Most dumps store key A as zeros; only a key that is there must match.
    if(!zero(trailer.subarray(0,6)) && !trailer.subarray(0,6).equals(keyA(uid,s))) badKeys.push(s);
  }
  const sectors=list=>`sector${list.length>1?'s':''} ${list.join(', ')}`;
  if(badAccess.length) say('access',`Access bits are wrong in ${sectors(badAccess)}.`);
  if(badKeys.length) say('keys',`Keys don’t match the UID in ${sectors(badKeys)}.`);
  const status=areas.map(at=>area(data,at,extendedKnown(info)));
  status.forEach((a,i)=>a.state==='bad' && say('area',`Save area ${i+1}: ${a.problem}.`));
  const valid=status.filter(a=>a.state==='ok'),lost=!valid.length && status.some(a=>a.state==='bad');
  if(lost) say('areas',problems.some(p=>['uid','header'].includes(p.code))?'Neither save area decodes, probably because the UID or ID block was changed after the game saved.':'Neither save area passes its checksums, so there is no save to keep.');
  if(valid.length===2 && status[0].sequence===status[1].sequence && !sameArea(data)) say('counter','Both save areas claim to be the newest.');
  // Fixing the ID block would only bless a figure we can't name.
  const fixable=problems.length>0 && !lost && !(headerBad && !info);
  return {problems,fixable,status,data};
}
function diagnose(bytes,info) {
  const {problems,fixable,status}=inspect(bytes,info);
  return {ok:!problems.length,problems,fixable,areas:status.map(a=>a.state)};
}

// UID check byte, ID block checksum, access bits and, where present, keys.
function sealHeader(plain) {
  plain[4]=plain[0]^plain[1]^plain[2]^plain[3];
  plain.writeUInt16LE(crc16(plain.subarray(0,30)),30);
  for(let s=0;s<16;s++) {
    const at=(s*4+3)*16;access(s).copy(plain,at+6);
    if(!zero(plain.subarray(at,at+6))) keyA(plain.subarray(0,4),s).copy(plain,at);
  }
}
// The game encrypts every block of an area once it has written it, zeros
// included; an area it never wrote stays as plain zeros, like a new toy.
function encrypt(plain) {
  const out=Buffer.from(plain);
  for(const at of areas) {
    if(areaBlocks.every(i=>zero(block(plain,at+i)))) continue;
    for(const i of areaBlocks) {
      const cipher=crypto.createCipheriv('aes-128-ecb',key(plain,at+i),null);cipher.setAutoPadding(false);
      Buffer.concat([cipher.update(block(plain,at+i)),cipher.final()]).copy(out,(at+i)*16);
    }
  }
  return out;
}
function verified(out,info,what) {
  const after=diagnose(out,info);
  if(!after.ok) throw Error(`The ${what} dump would fail a check (${after.problems[0].text}), so nothing was written.`);
  return out;
}

// Keeps the newest save area that passes every checksum and rebuilds the
// other one from it, then reseals the header.  The saved progress is kept.
function repair(bytes,info) {
  const {problems,fixable,status,data}=inspect(bytes,info);
  if(!problems.length) throw Error('Nothing to fix: this dump passes every check.');
  if(!fixable) throw Error(problems.at(-1).text);
  const plain=Buffer.from(data);sealHeader(plain);
  let keep=null,stale=null;
  if(status.every(a=>a.state==='ok')) { if(problems.some(p=>p.code==='counter')) keep=newer(status[0].sequence,status[1].sequence)?8:36; }
  else if(status.some(a=>a.state==='bad')) keep=areas[status.findIndex(a=>a.state==='ok')];
  if(keep!==null) {
    stale=keep===8?36:8;
    for(const i of areaBlocks) block(plain,keep+i).copy(plain,(stale+i)*16);
    // One step older than the kept area, so the game still reads the kept one.
    plain[stale*16+9]=(plain[keep*16+9]+255)&255;
    const head=Buffer.from(block(plain,stale));head.writeUInt16LE(5,14);
    plain.writeUInt16LE(crc16(head),stale*16+14);
  }
  const out=verified(encrypt(plain),info,'fixed'),after=decrypt(out);
  // Every good area we didn't mean to replace must decode to the same save.
  for(const [n,at] of areas.entries()) if(status[n].state==='ok' && at!==stale && !areaBlocks.every(i=>block(after,at+i).equals(block(data,at+i)))) throw Error('The fixed dump would lose progress, so nothing was written.');
  return out;
}
// Back to a toy fresh from the box: same UID, ID and variant, both save areas empty.
function reset(bytes,info) {
  if(!Buffer.isBuffer(bytes) || bytes.length!==1024) throw Error('A figure dump is exactly 1024 bytes.');
  if(crc16(bytes.subarray(0,30))!==bytes.readUInt16LE(30) && !info) throw Error('The ID and variant block fails its checksum and the figure is unknown, so it can’t be reset.');
  const plain=Buffer.from(bytes);
  for(const at of areas) for(const i of areaBlocks) plain.fill(0,(at+i)*16,(at+i+1)*16);
  sealHeader(plain);
  return verified(plain,info,'reset');
}
// A new toy with a random UID, like Dolphin's "Create" in its portal window.
function create(info,uid=crypto.randomBytes(4)) {
  if(!Number.isInteger(info?.id) || !Number.isInteger(info?.variant)) throw Error('Choose a figure from the catalog.');
  const plain=Buffer.alloc(1024);
  uid.copy(plain);plain[5]=0x81;plain[6]=0x01;plain[7]=0x0f;
  plain.writeUInt16LE(info.id,0x10);plain.writeUInt16LE(info.variant,0x1c);
  for(let s=0;s<16;s++) keyA(uid,s).copy(plain,(s*4+3)*16);
  sealHeader(plain);
  return verified(plain,info,'new');
}
module.exports={diagnose,repair,reset,create,keyA,encrypt};
