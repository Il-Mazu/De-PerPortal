'use strict';
// Startup self-update from GitHub Releases, shown on the splash screen.
const {app,BrowserWindow,net}=require('electron');
const fs=require('node:fs/promises');
const path=require('node:path');
const os=require('node:os');
const crypto=require('node:crypto');
const {spawn}=require('node:child_process');
const repo='Il-Mazu/De-PerPortal';

function newer(tag,current) {
  const a=String(tag).replace(/^v/,'').split('.').map(Number),b=String(current).split('.').map(Number);
  for(let i=0;i<3;i++) if((a[i]||0)!==(b[i]||0)) return (a[i]||0)>(b[i]||0);
  return false;
}
// SHA256SUMS.txt lines: "<hash>  <file name>".
function checksum(sums,name) {
  for(const line of sums.split(/\r?\n/)) {
    const [hash,...file]=line.trim().split(/\s+/);
    if(file.join(' ')===name && /^[0-9a-f]{64}$/i.test(hash)) return hash.toLowerCase();
  }
  return null;
}

function splash() {
  const window=new BrowserWindow({width:640,height:440,frame:false,resizable:false,show:false,center:true,backgroundColor:'#0c1238',
    title:'Dè PerPortal',icon:path.join(__dirname,'ui/icon.png'),
    webPreferences:{preload:path.join(__dirname,'splash-preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true}});
  window.webContents.setWindowOpenHandler(()=>({action:'deny'}));
  window.webContents.on('will-navigate',event=>event.preventDefault());
  window.once('ready-to-show',()=>window.show());
  window.loadFile(path.join(__dirname,'ui/splash.html'),{query:{version:app.getVersion()}});
  return window;
}

async function fetchOk(url,options) {
  const response=await net.fetch(url,{headers:{'User-Agent':'De-PerPortal'},...options});
  if(!response.ok) throw Error(`GitHub answered ${response.status}.`);
  return response;
}
async function download(url,file,progress) {
  const response=await fetchOk(url),total=Number(response.headers.get('content-length')) || 0;
  const hash=crypto.createHash('sha256'),out=await fs.open(file,'w');
  let received=0;
  try {
    for await(const chunk of response.body) {
      hash.update(chunk);await out.write(chunk);received+=chunk.length;
      if(total)progress(received/total);
    }
  } finally {await out.close();}
  return hash.digest('hex');
}

// Returns true when an update is being installed and the app is quitting.
async function run(root,window) {
  const status=(text,progress=null)=>{if(!window.isDestroyed())window.webContents.send('splash',{text,progress});};
  const shown=new Promise(resolve=>setTimeout(resolve,1200));
  // Only the packaged Windows app replaces itself; development builds just start.
  if(!app.isPackaged || process.platform!=='win32' || process.env.DE_PERPORTAL_NO_UPDATE) {status('Starting…');await shown;return false;}
  const staging=path.join(root,'de-perportal-data','update');
  // Leftover from the last install; the installer may still be exiting, so best effort.
  await require('original-fs').promises.rm(staging,{recursive:true,force:true}).catch(()=>{});
  try {
    status('Checking for updates…');
    const timeout=new Promise((_,reject)=>setTimeout(()=>reject(Error('GitHub did not answer.')),6000));
    const release=await Promise.race([fetchOk(`https://api.github.com/repos/${repo}/releases/latest`,{headers:{'User-Agent':'De-PerPortal',Accept:'application/vnd.github+json'}}).then(r=>r.json()),timeout]);
    if(!newer(release.tag_name,app.getVersion())) {status('You have the latest version.');await shown;return false;}
    const zip=release.assets.find(a=>/windows-x64\.zip$/.test(a.name)),sums=release.assets.find(a=>a.name==='SHA256SUMS.txt');
    if(!zip || !sums) throw Error('The new release has no Windows package.');
    const expected=checksum(await (await fetchOk(sums.browser_download_url)).text(),zip.name);
    if(!expected) throw Error('The new release has no checksum.');
    const version=release.tag_name.replace(/^v/,'');
    const file=path.join(os.tmpdir(),zip.name);
    status(`Downloading version ${version}…`,0);
    const actual=await download(zip.browser_download_url,file,p=>status(`Downloading version ${version}… ${Math.round(p*100)}%`,p));
    if(actual!==expected) throw Error('The download was damaged. Try again later.');
    status(`Installing version ${version}…`,1);
    // Electron's fs treats app.asar as a folder, so writing the new one fails;
    // original-fs is plain Node fs.
    const rawFs=require('original-fs');
    await rawFs.promises.rm(staging,{recursive:true,force:true});
    new (require('adm-zip'))(file,{fs:rawFs}).extractAllTo(staging,true);
    await fs.rm(file,{force:true});
    const exe=path.basename(process.execPath);
    await fs.access(path.join(staging,exe)).catch(()=>{throw Error('The new package has an unexpected layout.');});
    // A running exe cannot overwrite itself, so the new version installs
    // itself: it waits for this app to exit, copies its files over it and
    // starts it (see finish). No script host, which antivirus flags.
    spawn(path.join(staging,exe),['--finish-update',String(process.pid),root],{detached:true,stdio:'ignore'}).unref();
    status(`Restarting with version ${version}…`,1);
    setTimeout(()=>app.quit(),600);
    return true;
  } catch(e) {
    // Never block the app on an update problem.
    status(`Update skipped: ${e.message}`);
    await new Promise(resolve=>setTimeout(resolve,2000));
    return false;
  }
}
// Copies the staged package over the install once the old app (pid) is gone.
// NFC and de-perportal-data are not in the package, so they stay as they are.
// ponytail: a copy that fails halfway leaves mixed versions; re-download the ZIP if that happens.
async function install(staging,root,pid,rawFs=require('original-fs')) {
  const alive=()=>{try{process.kill(pid,0);return true;}catch{return false;}};
  for(let i=0;i<60 && alive();i++) await new Promise(r=>setTimeout(r,500));
  // The old app's helper processes can hold files for a moment after it exits.
  for(let i=1;;i++) {
    try {await rawFs.promises.cp(staging,root,{recursive:true,force:true});return;}
    catch(e) {if(i>=20) throw e;await new Promise(r=>setTimeout(r,1000));}
  }
}
// In the new version started from the staging folder with
// --finish-update <pid> <root>: install, log the outcome, start the app.
function finish() {
  const i=process.argv.indexOf('--finish-update');
  if(i<0) return false;
  const pid=Number(process.argv[i+1]),root=process.argv[i+2],staging=path.dirname(process.execPath);
  const log=text=>fs.appendFile(path.join(root,'de-perportal-data','update.log'),`${new Date().toISOString()} ${text}\r\n`).catch(()=>{});
  install(staging,root,pid)
    .then(()=>log(`Installed ${app.getVersion()}.`),e=>log(`Install of ${app.getVersion()} failed: ${e.message}`))
    .then(()=>{spawn(path.join(root,path.basename(process.execPath)),[],{detached:true,stdio:'ignore'}).unref();app.exit(0);});
  return true;
}
module.exports={splash,run,finish,install,newer,checksum};
