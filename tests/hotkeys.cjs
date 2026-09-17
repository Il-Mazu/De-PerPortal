const {spawn,execFile}=require('node:child_process');
const {promisify}=require('node:util');
const assert=require('node:assert/strict');
const exec=promisify(execFile);
(async()=>{
 const env={...process.env,WINEDEBUG:'-all'};
 const watcher=spawn('wine',['out/De-PerPortal-Probe.exe','watch'],{env});
 const events=[];let pending='';
 watcher.stdout.on('data',data=>{pending+=data;const lines=pending.split('\n');pending=lines.pop();for(const line of lines){const event=JSON.parse(line);if(event.type==='hotkey')events.push(event);}});
 try {
  await new Promise(r=>setTimeout(r,1500));
  console.log((await exec('wine',['out/hotkey-driver.exe'],{env,timeout:15000})).stdout);
  await new Promise(r=>setTimeout(r,500));
  assert.deepEqual(events,[{type:'hotkey',player:0,key:'1'},{type:'hotkey',player:1,key:'0'},{type:'hotkey',player:0,key:'T'},{type:'hotkey',player:1,key:'T'},...['Q','W','E','R','Y','U','I'].map(key=>({type:'hotkey',player:0,key})),{type:'hotkey',player:1,key:'O'}]);
  console.log('PASS: element, default, Thumpback, and all Swap Force perk hotkeys; no event outside Cemu. No game launched.');
 }finally{watcher.kill();}
})().catch(e=>{console.error(e);process.exitCode=1;});
