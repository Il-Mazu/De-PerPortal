'use strict';
// Discord Rich Presence over Discord's local IPC pipe: an 8-byte header
// (opcode, length, little-endian) followed by JSON.  No dependency needed.
const net=require('node:net');
const path=require('node:path');
// The application registered at discord.com/developers for Dè PerPortal.
// Its "logo" art asset is the large image.  Empty disables the feature.
const clientId=process.env.DE_PERPORTAL_DISCORD_ID || '';

function frame(op,data) {
  const body=Buffer.from(JSON.stringify(data)),head=Buffer.alloc(8);
  head.writeInt32LE(op,0);head.writeInt32LE(body.length,4);
  return Buffer.concat([head,body]);
}
function pipe(i) {
  if(process.platform==='win32') return `\\\\?\\pipe\\discord-ipc-${i}`;
  return path.join(process.env.XDG_RUNTIME_DIR || process.env.TMPDIR || '/tmp',`discord-ipc-${i}`);
}
// What the presence says: the game and the figures on the portal.
function activity(state,since) {
  if(!state.detected) return null;
  const f=key=>state.figures.find(x=>x.key===key);
  const names=state.active.filter(Boolean).map(c=>{
    const top=f(c.top),level=top?.save?.state==='ok'?` (Lv ${top.save.maxed?'10+':top.save.level})`:'';
    return `${[top,f(c.bottom)].filter(Boolean).map(x=>x.info?.name?.replace(/ \((Top|Bottom)\)$/,'') || 'Unknown').join(' / ')}${level}`;
  });
  return {details:`Playing Skylanders ${state.games[state.game-1]}`,state:names.length?names.join(' & '):'Choosing a Skylander',
    timestamps:{start:since},assets:{large_image:'logo',large_text:'Dè PerPortal'}};
}
function createPresence() {
  let on=false,socket=null,ready=false,last='',since=0,retry=0;
  function connect(i=0) {
    if(!on || socket || !clientId || Date.now()<retry) return;
    const s=net.createConnection(pipe(i));socket=s;
    s.on('connect',()=>s.write(frame(0,{v:1,client_id:clientId})));
    // The first reply is READY; after that the pipe is ours.
    s.on('data',()=>{if(!ready){ready=true;last='';send(current);}});
    s.on('error',()=>{});
    s.on('close',()=>{
      if(socket!==s) return;
      socket=null;const wasReady=ready;ready=false;
      // Discord uses the first free pipe of ten; otherwise try again later.
      if(!wasReady && i<9 && on) connect(i+1); else retry=Date.now()+30000;
    });
  }
  let current=null;
  function send(value) {
    if(!ready) return;
    const text=JSON.stringify(value);
    if(text===last) return;
    last=text;
    socket.write(frame(1,{cmd:'SET_ACTIVITY',args:{pid:process.pid,activity:value},nonce:String(Date.now())}));
  }
  return {
    enable(value) {
      if(value===on) return;
      on=value;retry=0;
      if(!on && socket) {socket.destroy();socket=null;ready=false;}
    },
    update(state) {
      if(!state.detected) since=0; else since||=Date.now();
      current=activity(state,since);
      if(!on) return;
      connect();send(current);
    }
  };
}
module.exports={createPresence,activity,frame,available:()=>!!clientId};
