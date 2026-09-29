'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const {crc16}=require('../app/traps.cjs');
const figure=require('../app/figure.cjs');

// Builds an encrypted dump whose area at `block` holds the given save.
function played({block=8,xp=0,gold=0,heroPoints=0,nickname='',sequence=1}={}) {
  const plain=Buffer.alloc(1024);plain.writeUInt32LE(0x12345678);plain.writeUInt16LE(14,16);
  const at=block*16;
  plain.writeUIntLE(xp,at,3);plain.writeUInt16LE(gold,at+3);plain[at+9]=sequence;
  plain.writeUInt16LE(heroPoints,at+5*16+0xa);
  const name=Buffer.from(nickname.padEnd(16,'\0'),'utf16le');
  name.copy(plain,at+0x20,0,16);name.copy(plain,at+0x40,16,32);
  const group=Buffer.concat([1,2,4].map(i=>plain.subarray(at+i*16,at+i*16+16)));
  plain.writeUInt16LE(crc16(group),at+12);
  plain.writeUInt16LE(5,at+14);plain.writeUInt16LE(crc16(plain.subarray(at,at+16)),at+14);
  const out=Buffer.from(plain),copyright=Buffer.from(' Copyright (C) 2010 Activision. All Rights Reserved. ');
  for(let b=8;b<64;b++) if(b%4!==3 && !plain.subarray(b*16,b*16+16).every(x=>x===0)) {
    const key=crypto.createHash('md5').update(plain.subarray(0,32)).update(Buffer.from([b])).update(copyright).digest();
    const c=crypto.createCipheriv('aes-128-ecb',key,null);c.setAutoPadding(false);
    Buffer.concat([c.update(plain.subarray(b*16,b*16+16)),c.final()]).copy(out,b*16);
  }
  return out;
}

test('a played figure reports level, gold, hero points and nickname',()=>{
  const save=figure.read(played({xp:6500,gold:1234,heroPoints:7,nickname:'Sparky'}),'Skylander');
  assert.deepEqual(save,{state:'ok',xp:6500,level:5,maxed:false,gold:1234,heroPoints:7,nickname:'Sparky'});
  assert.equal(figure.read(played({block:36,xp:40000}),'Giant').level,10);
  assert.equal(figure.read(played({xp:33000}),'Skylander').maxed,true);
});

test('unplayed, damaged and unsupported dumps are told apart',()=>{
  const fresh=Buffer.alloc(1024);fresh.writeUInt16LE(14,16);
  for(let b=3;b<64;b+=4) fresh.fill(0xff,b*16,b*16+16); // Sector trailers are never blank.
  assert.deepEqual(figure.read(fresh,'Skylander'),{state:'new'});
  const broken=played({xp:100});broken[8*16+5]^=0xff;
  assert.deepEqual(figure.read(broken,'Skylander'),{state:'damaged'});
  assert.equal(figure.read(played(),'Crystal'),null);
  assert.equal(figure.read(Buffer.alloc(10),'Skylander'),null);
});
