'use strict';
const {BrowserWindow,ipcMain,screen}=require('electron');
const path=require('node:path');
const scale=0.7;

function createOverlay(manager,mainWindow) {
  let dismissed=false,preview=false,ready=false,lastState=manager.state(),position=null,notification=null,timer,placing=false,lastPlaced=null;
  const window=new BrowserWindow({width:Math.ceil(480*scale),height:Math.ceil(62*scale),show:false,frame:false,transparent:true,
    resizable:false,movable:true,focusable:false,skipTaskbar:true,alwaysOnTop:true,hasShadow:false,
    webPreferences:{preload:path.join(__dirname,'overlay-preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true,zoomFactor:scale}});
  window.setAlwaysOnTop(true,'screen-saver');
  window.webContents.setWindowOpenHandler(()=>({action:'deny'}));
  window.webContents.on('will-navigate',event=>event.preventDefault());
  function update(state=lastState) {
    lastState=state;
    if(window.isDestroyed() || !ready)return;
    if(state.session.focused)preview=false;
    // Read the actual window position before state-driven sizing: native drags
    // do not reliably emit `moved` on every platform.
    rememberPosition();
    const reminders=!dismissed && (preview || (state.session.supported && state.session.game && state.session.focused));
    const show=reminders || (notification && state.session.supported && state.session.game && state.session.focused);
    if(!show){clearTimeout(timer);timer=null;window.hide();return;}
    let reference=mainWindow.getBounds();
    const bounds=state.session.bounds;
    if(bounds && bounds.width>0 && bounds.height>0) reference=process.platform==='win32'?screen.screenToDipRect(null,bounds):bounds;
    const area=screen.getDisplayMatching(position?{x:position[0],y:position[1],width:window.getBounds().width,height:window.getBounds().height}:reference).workArea;
    const width=Math.min(Math.ceil(480*scale),area.width),height=Math.ceil(((reminders?([3,4].includes(state.game)?94:62):0)+(notification?54:0))*scale);
    const x=position?.[0] ?? Math.round(area.x+(area.width-width)/2);
    const y=position?.[1] ?? area.y+area.height-height-12;
    const nextBounds={x:Math.max(area.x,Math.min(x,area.x+area.width-width)),y:Math.max(area.y,Math.min(y,area.y+area.height-height)),width,height};
    const currentBounds=window.getBounds();
    if(Object.keys(nextBounds).some(key=>nextBounds[key]!==currentBounds[key])) {
      placing=true;
      try {
        window.setBounds(nextBounds);
        // Window managers can adjust the requested coordinates. Compare
        // subsequent drags against the actual placement, not the request.
        lastPlaced=window.getPosition();
      } finally {placing=false;}
    }
    window.webContents.send('overlay-state',{game:state.game,elements:state.elements,perks:state.perks,reminders,notification});
    if(!window.isVisible())window.showInactive();
    // Swaps briefly focus Cemu's portal/file dialogs. Only count down while
    // the notification is visible over the focused game; resume after a hide.
    if(notification && state.session.focused && !timer) {
      timer=setTimeout(()=>{timer=null;notification=null;update(manager.state());},4500);
    }
  }
  function verify(event){if(event.sender!==window.webContents || event.senderFrame!==window.webContents.mainFrame)throw Error('Invalid overlay request.');}
  ipcMain.handle('overlay-ready',event=>{verify(event);ready=true;update();});
  ipcMain.handle('overlay-close',event=>{verify(event);dismissed=true;preview=false;update();});
  function rememberPosition() {
    if(placing)return;
    const actual=window.getPosition();
    // Programmatic clamping must not replace the user's preferred position.
    if(lastPlaced && (actual[0]!==lastPlaced[0] || actual[1]!==lastPlaced[1]))position=actual;
  }
  window.on('move',rememberPosition);
  window.on('moved',rememberPosition);
  // On Windows native dragging can finish as the overlay loses focus/hides.
  // Capture the proposed bounds directly, before a state update can resize it.
  window.on('will-move',(_event,bounds)=>{if(!placing)position=[bounds.x,bounds.y];});
  const notify=message=>{
    notification=message;clearTimeout(timer);timer=null;update(manager.state());
  };
  manager.on('notification',notify);
  manager.on('state',update);
  const reposition=()=>update();
  screen.on('display-metrics-changed',reposition);
  screen.on('display-removed',reposition);
  window.loadFile(path.join(__dirname,'ui/overlay.html'));
  window.on('closed',()=>{
    clearTimeout(timer);manager.off('notification',notify);
    manager.off('state',update);screen.off('display-metrics-changed',reposition);screen.off('display-removed',reposition);
    ipcMain.removeHandler('overlay-ready');ipcMain.removeHandler('overlay-close');
  });
  return {show(){dismissed=false;preview=true;update(manager.state());},destroy(){if(!window.isDestroyed())window.destroy();}};
}
module.exports={createOverlay};
