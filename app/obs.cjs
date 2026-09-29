'use strict';
// A browser source for OBS: a transparent page on this computer only that
// shows the figures on the portal, updated live over server-sent events.
const http=require('node:http');
const fs=require('node:fs/promises');
const path=require('node:path');
const port=47831;
const types={'.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp'};

function payload(state) {
  const f=key=>state.figures.find(x=>x.key===key);
  return {game:state.games[state.game-1],players:state.active.map((c,p)=>{
    if(!c) return null;
    const top=f(c.top),bottom=f(c.bottom);
    return {player:p+1,name:[top,bottom].filter(Boolean).map(x=>x.info?.name?.replace(/ \((Top|Bottom)\)$/,'') || 'Unknown').join(' / '),
      element:top?.info?.element || null,level:top?.save?.state==='ok'?(top.save.maxed?'10+':String(top.save.level)):null,
      art:top?.art?`/art/${encodeURIComponent(top.key)}`:null};
  })};
}
function createObs(manager) {
  let server=null,last='';
  const clients=new Set();
  function broadcast() {
    const text=JSON.stringify(payload(manager.state()));
    if(text===last) return;
    last=text;
    for(const res of clients) res.write(`data: ${text}\n\n`);
  }
  async function handle(req,res) {
    const url=new URL(req.url,`http://127.0.0.1:${port}`);
    if(url.pathname==='/') {
      res.writeHead(200,{'content-type':'text/html; charset=utf-8'});
      res.end(await fs.readFile(path.join(__dirname,'ui/obs.html')));
    } else if(url.pathname==='/events') {
      res.writeHead(200,{'content-type':'text/event-stream','cache-control':'no-store'});
      res.write(`data: ${JSON.stringify(payload(manager.state()))}\n\n`);
      clients.add(res);req.on('close',()=>clients.delete(res));
    } else if(url.pathname.startsWith('/art/')) {
      // Only artwork the library already matched to a figure, never an arbitrary path.
      const figure=manager.figures.find(f=>f.key===decodeURIComponent(url.pathname.slice(5)));
      if(!figure?.art) {res.writeHead(404);res.end();return;}
      res.writeHead(200,{'content-type':types[path.extname(figure.art).toLowerCase()] || 'application/octet-stream'});
      res.end(await fs.readFile(figure.art));
    } else {res.writeHead(404);res.end();}
  }
  manager.on('state',()=>{if(server) broadcast();});
  return {
    enable(on) {
      if(on && !server) {
        server=http.createServer((req,res)=>handle(req,res).catch(()=>{if(!res.headersSent)res.writeHead(500);res.end();}));
        server.on('error',e=>{server=null;manager.message=`OBS overlay could not start: ${e.code==='EADDRINUSE'?`port ${port} is in use`:e.message}.`;manager.publish();});
        server.listen(port,'127.0.0.1');
      } else if(!on && server) {
        for(const res of clients) res.end();
        clients.clear();server.close();server=null;last='';
      }
    },
    address:()=>server?.address() || null
  };
}
module.exports={createObs,payload,port};
