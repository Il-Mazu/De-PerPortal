'use strict';
const {BrowserWindow,ipcMain,screen}=require('electron');
const path=require('node:path');
const scale=0.7;

function createOverlay(manager,mainWindow) {
  let dismissed=false,preview=false,ready=false,lastState=manager.state();
  const window=new BrowserWindow({width:Math.ceil(480*scale),height:Math.ceil(62*scale),show:false,frame:false,transparent:true,
    resizable:false,movable:false,focusable:false,skipTaskbar:true,alwaysOnTop:true,hasShadow:false,
    webPreferences:{preload:path.join(__dirname,'overlay-preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true,zoomFactor:scale}});
  window.setAlwaysOnTop(true,'screen-saver');
  window.webContents.setWindowOpenHandler(()=>({action:'deny'}));
  window.webContents.on('will-navigate',event=>event.preventDefault());
  function update(state=lastState) {
    lastState=state;
    if(window.isDestroyed() || !ready)return;
    if(state.session.focused)preview=false;
    const show=!dismissed && (preview || (state.session.supported && state.session.game && state.session.focused));
    if(!show){window.hide();return;}
    let reference=mainWindow.getBounds();
    const bounds=state.session.bounds;
    if(bounds && bounds.width>0 && bounds.height>0) reference=process.platform==='win32'?screen.screenToDipRect(null,bounds):bounds;
    const area=screen.getDisplayMatching(reference).workArea;
    const width=Math.min(Math.ceil(480*scale),area.width),height=Math.ceil((state.game===3?94:62)*scale);
    window.setBounds({x:Math.round(area.x+(area.width-width)/2),y:area.y+area.height-height-12,width,height});
    window.webContents.send('overlay-state',{game:state.game,elements:state.elements,perks:state.perks});
    if(!window.isVisible())window.showInactive();
  }
  function verify(event){if(event.sender!==window.webContents || event.senderFrame!==window.webContents.mainFrame)throw Error('Invalid overlay request.');}
  ipcMain.handle('overlay-ready',event=>{verify(event);ready=true;update();});
  ipcMain.handle('overlay-close',event=>{verify(event);dismissed=true;preview=false;window.hide();});
  manager.on('state',update);
  const reposition=()=>update();
  screen.on('display-metrics-changed',reposition);
  screen.on('display-removed',reposition);
  window.loadFile(path.join(__dirname,'ui/overlay.html'));
  window.on('closed',()=>{
    manager.off('state',update);screen.off('display-metrics-changed',reposition);screen.off('display-removed',reposition);
    ipcMain.removeHandler('overlay-ready');ipcMain.removeHandler('overlay-close');
  });
  return {show(){dismissed=false;preview=true;update(manager.state());},destroy(){if(!window.isDestroyed())window.destroy();}};
}
module.exports={createOverlay};
