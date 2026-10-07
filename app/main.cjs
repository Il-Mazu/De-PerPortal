'use strict';
const {app,BrowserWindow,ipcMain,protocol,net,dialog,shell}=require('electron');
const fs=require('node:fs/promises');
const fsWatch=require('node:fs');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const {spawn,execFile}=require('node:child_process');
const {promisify}=require('node:util');
const {Manager}=require('./manager.cjs');
const exec=promisify(execFile);
const root=process.env.DE_PERPORTAL_HOME || (app.isPackaged?path.dirname(process.execPath):path.resolve(__dirname,'..'));
const helper=app.isPackaged?path.join(process.resourcesPath,'portal-control.exe'):path.join(__dirname,'../out/De-PerPortal-Probe.exe');
const native=(args,options={})=>process.platform==='win32'?{file:helper,args,options}:{file:'wine',args:[helper,...args],options};
let manager,win,watcher,libraryWatcher,overlay,radial;
async function watchLibrary(root,onChange) {
  const watchers=[];
  const seen=new Set();
  async function add(dir) {
    if(seen.has(dir)) return; seen.add(dir);
    try {
      watchers.push(fsWatch.watch(dir,async(_event,name)=>{
        onChange();
        if(name) { try { if((await fs.stat(path.join(dir,name))).isDirectory()) await add(path.join(dir,name)); } catch {} }
      }));
      for(const entry of await fs.readdir(dir,{withFileTypes:true})) if(entry.isDirectory()&&!entry.isSymbolicLink()) await add(path.join(dir,entry.name));
    } catch {}
  }
  await add(root);
  return {close:()=>watchers.forEach(w=>w.close())};
}
// Chromium can read Xbox pads through Windows.Gaming.Input, which only reports
// to the focused app. XInput and raw HID keep working while Cemu has focus.
app.commandLine.appendSwitch('disable-features','EnableWindowsGamingInputDataFetcher');
protocol.registerSchemesAsPrivileged([{scheme:'art',privileges:{standard:true,secure:true,supportFetchAPI:true}}]);
// A freshly downloaded version installing itself: nothing else may start.
if(require('./updater.cjs').finish()) {}
else if(!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance',()=>{if(win){win.restore();win.focus();}});
  app.whenReady().then(async()=>{
    // Update before anything else starts, so no app file is in use.
    const updater=require('./updater.cjs'),splash=updater.splash();
    if(await updater.run(root,splash)) return;
    manager=new Manager(root,async args=>{
      if(process.platform!=='win32' && args[0]==='load') args=[...args.slice(0,2),(await exec('winepath',['-w',args[2]])).stdout.trim()];
      const command=native(args);
      try { const r=await exec(command.file,command.args,{windowsHide:true,timeout:25000,maxBuffer:1024*1024,env:{...process.env,DE_PERPORTAL_BACKGROUND:'1',WINEDEBUG:'-all'}}); return r.stdout; }
      catch(e) { throw Error((e.stderr||e.message).trim().split('\n').slice(-1)[0]); }
    });
    await manager.init();
    // fs.watch is intentionally only a convenience: the Settings rescan is
    // still available on filesystems that do not report directory changes.
    try { libraryWatcher=await watchLibrary(path.join(root,'NFC'),()=>manager.requestRescan()); } catch {}
    protocol.handle('art',async request=>{
      const key=decodeURIComponent(new URL(request.url).pathname.slice(1));
      const figure=manager.figures.find(f=>f.key===key);
      if(!figure?.art) return new Response('',{status:404});
      return net.fetch(pathToFileURL(figure.art).toString());
    });
    win=new BrowserWindow({width:1280,height:900,minWidth:980,minHeight:760,backgroundColor:'#0b1016',title:'Dè PerPortal',autoHideMenuBar:true,show:false,icon:path.join(__dirname,'ui/icon.png'),
      webPreferences:{preload:path.join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true}});
    win.webContents.setWindowOpenHandler(()=>({action:'deny'}));
    win.webContents.on('will-navigate',event=>event.preventDefault());
    win.webContents.session.setPermissionRequestHandler((_,__,callback)=>callback(false));
    overlay=require('./overlay.cjs').createOverlay(manager,win);
    // Freezes Cemu while the quick swap dial is open. Detached so the helper
    // outlives a crashed app and resumes Cemu when its stdin closes.
    const freeze=()=>{
      const command=native(['freeze']);
      const child=spawn(command.file,command.args,{windowsHide:true,detached:true,env:{...process.env,WINEDEBUG:'-all'},stdio:['pipe','ignore','ignore']});
      const done=new Promise(resolve=>{child.on('exit',resolve);child.on('error',resolve);});
      child.stdin.on('error',()=>{});
      return ()=>{child.stdin.end();return done;};
    };
    // Hands the GUI real focus over fullscreen Cemu (Windows only).
    const raise=()=>new Promise(resolve=>{
      const command=native(['focus',String(win.getNativeWindowHandle().readBigUInt64LE())]);
      execFile(command.file,command.args,{windowsHide:true,timeout:5000},()=>resolve());
    });
    radial=require('./radial.cjs').createRadial(manager,win,freeze,process.platform==='win32'?raise:null);
    win.on('closed',()=>{overlay.destroy();radial.destroy();});
    manager.on('state',state=>{if(!win.isDestroyed()) win.webContents.send('state',state);});
    // Discord Rich Presence and the OBS browser source are off until enabled in Settings.
    const presence=require('./discord.cjs').createPresence(),obs=require('./obs.cjs').createObs(manager);
    const stream=()=>{presence.enable(!!manager.config.discord);presence.update(manager.state());obs.enable(!!manager.config.obs);};
    manager.on('state',stream);stream();
    app.on('before-quit',()=>{presence.enable(false);obs.enable(false);});
    for(const [channel,handler] of Object.entries({
      state:()=>manager.state(), action:data=>manager.action(data),select:data=>manager.select(data),game:g=>manager.setGame(g),rescan:()=>manager.rescan(),'reset-trap-detections':()=>manager.resetTrapDetections(),'restore-trap-backup':()=>manager.restoreLatestTrapBackup(),
      'overlay-show':()=>overlay.show(),
      'to-game':()=>win.minimize(),
      enable:()=>manager.control(['enable']),
      launch:async()=>{
        if(manager.session.pid) throw Error('Cemu is already running.');
        const names=['Cemu-Skylanders-Emulated-Portal.exe','Cemu.exe'];
        let exe;for(const name of names) { try { await fs.access(path.join(root,name));exe=path.join(root,name);break; } catch{} }
        if(!exe) throw Error('Place Dè PerPortal.exe and its release files beside your Cemu executable.');
        const child=spawn(process.platform==='win32'?exe:'wine',process.platform==='win32'?[]:[exe],{cwd:root,detached:true,stdio:'ignore'});
        child.on('error',e=>{manager.message=e.message;manager.publish();}); child.unref();
      },
      'art-folder':async()=>{const r=await dialog.showOpenDialog(win,{properties:['openDirectory'],title:'Choose character artwork folder'});if(!r.canceled){manager.config.artRoot=r.filePaths[0];await manager.save();await manager.rescan();}},
      artwork:async()=>{const {downloadArt}=require('./artwork.cjs');manager.message='Downloading character artwork…';manager.publish();await downloadArt(root);manager.config.artRoot=null;await manager.save();await manager.rescan();manager.message='Character artwork is ready.';manager.publish();},
      catalog:()=>require('../resources/catalog.json'),
      diagnostics:()=>manager.diagnostics(),
      backups:key=>manager.backups(key),
      'restore-backup':data=>manager.restoreBackup(data || {}),
      random:player=>manager.random(player),
      challenge:data=>manager.setChallenge(data || {}),
      'gate-level':index=>manager.setGateLevel(index),
      stream:data=>manager.setStream(data),
      'show-figure':key=>shell.showItemInFolder(manager.figurePath(key)),
      'open-issues':()=>shell.openExternal('https://github.com/Il-Mazu/De-PerPortal/issues'),
      notes:async()=>({version:app.getVersion(),sections:require('./notes.cjs').render(await fs.readFile(path.join(__dirname,'../RELEASE_NOTES.md'),'utf8'))}),
      'open-site':()=>shell.openExternal(require('./notes.cjs').SITE),
      'export-profile':async()=>{
        const game=manager.state().games[manager.game-1];
        const r=await dialog.showSaveDialog(win,{title:'Export profile',defaultPath:`${game} profile.json`,filters:[{name:'Dè PerPortal profile',extensions:['json']}]});
        if(r.canceled) return false;
        await fs.writeFile(r.filePath,JSON.stringify(manager.exportProfile(),null,2));return true;
      },
      'import-profile':async()=>{
        const r=await dialog.showOpenDialog(win,{title:'Import profile',properties:['openFile'],filters:[{name:'Dè PerPortal profile',extensions:['json']}]});
        if(r.canceled) return null;
        const text=await fs.readFile(r.filePaths[0],'utf8');
        let data;try {data=JSON.parse(text);} catch {throw Error('This file is not a Dè PerPortal profile.');}
        return manager.importProfile(data);
      }
    })) ipcMain.handle(channel,async(event,arg)=>{
      if(event.sender!==win.webContents || event.senderFrame!==win.webContents.mainFrame) throw Error('Invalid request.');
      return handler(arg);
    });
    await win.loadFile(path.join(__dirname,'ui/index.html'));
    win.show();splash.destroy();
    const command=native(['watch']);
    watcher=spawn(command.file,command.args,{windowsHide:true,env:{...process.env,WINEDEBUG:'-all'},stdio:['ignore','pipe','pipe']});
    let pending='';
    watcher.stdout.on('data',data=>{pending+=data.toString();const lines=pending.split('\n');pending=lines.pop();for(const line of lines){try{const event=JSON.parse(line);if(event.type==='session')manager.updateSession(event);if(event.type==='hotkey')manager.hotkey(event);}catch{}}});
    watcher.on('error',e=>{manager.message=`Portal connection unavailable: ${e.message}`;manager.publish();});
    watcher.on('exit',()=>{manager.session={pid:0,supported:false,game:0,focused:false};manager.message='Portal monitor stopped. Restart Dè PerPortal to reconnect.';manager.publish();});
  }).catch(e=>{dialog.showErrorBox('Dè PerPortal could not start',e.message);app.quit();});
  app.on('window-all-closed',()=>app.quit());
  app.on('before-quit',()=>{watcher?.kill();libraryWatcher?.close();});
}
