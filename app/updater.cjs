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
// Single-quoted PowerShell literal.
const ps=s=>`'${String(s).replace(/'/g,"''")}'`;

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
    const staging=path.join(root,'de-perportal-data','update');
    await fs.rm(staging,{recursive:true,force:true});
    new (require('adm-zip'))(file).extractAllTo(staging,true);
    await fs.rm(file,{force:true});
    const exe=path.basename(process.execPath);
    await fs.access(path.join(staging,exe)).catch(()=>{throw Error('The new package has an unexpected layout.');});
    // A running exe cannot overwrite itself: PowerShell waits for this app to
    // exit, copies the new files over it and starts it again. NFC and
    // de-perportal-data are not part of the package, so they stay as they are.
    // ponytail: a copy that fails halfway leaves mixed versions; re-download the ZIP if that happens.
    const script=[
      `Wait-Process -Id ${process.pid} -ErrorAction SilentlyContinue`,
      `robocopy ${ps(staging)} ${ps(root)} /E /R:20 /W:1 /NFL /NDL /NJH /NJS | Out-Null`,
      `if($LASTEXITCODE -lt 8){Remove-Item -LiteralPath ${ps(staging)} -Recurse -Force}`,
      `Start-Process -FilePath ${ps(path.join(root,exe))}`
    ].join('\n');
    spawn('powershell.exe',['-NoProfile','-ExecutionPolicy','Bypass','-WindowStyle','Hidden','-EncodedCommand',Buffer.from(script,'utf16le').toString('base64')],
      {detached:true,stdio:'ignore',windowsHide:true}).unref();
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
module.exports={splash,run,newer,checksum};
