'use strict';
const {BrowserWindow,ipcMain,screen}=require('electron');
const path=require('node:path');
const {trapKeys}=require('./manager.cjs');
const elementKeys=['1','2','3','4','5','6','7','8','9','-'];
const size=440;

// Tabs cycled with L1/R1: one ring per player, plus the game's own shortcuts.
// Every item carries the hotkey it stands for, so a pick behaves exactly like
// the keyboard shortcut.
function tabs(manager) {
  const s=manager.state(),figure=key=>s.figures.find(f=>f.key===key);
  const name=c=>c?.top?[c.top,c.bottom].filter(Boolean).map(k=>figure(k)?.info?.name?.replace(/ \((Top|Bottom)\)$/,'') || 'Unknown figure').join(' / '):'Not assigned';
  const elements=s.elements.filter(e=>s.game>=4 || !['Light','Dark'].includes(e));
  const list=[0,1].map(p=>({title:`Player ${p+1}`,items:elements.map(el=>({label:el,detail:name(s.profile.players[p].elements[el]),el,hotkey:{player:p,key:elementKeys[s.elements.indexOf(el)]}}))}));
  if(s.game===3) list.push({title:'Perks',twoPlayer:true,items:s.perks.map((perk,i)=>({label:perk.name,detail:'Movement base',badge:i,hotkey:{key:perk.key}}))});
  if(s.game===4) {
    const villains=manager.figures.filter(f=>f.info?.kind==='Trap' && manager.trapName(f)).sort((a,b)=>manager.trapName(a).localeCompare(manager.trapName(b)));
    list.push({title:'Traps',items:[
      ...villains.map(f=>({label:manager.trapName(f),detail:`${f.info.element} villain`,el:f.info.element,villain:f.key,hotkey:{player:0,key:'LockTrap'}})),
      ...elements.map(el=>({label:el,detail:'Next unassigned trap',el,trap:true,hotkey:{player:0,key:trapKeys[s.elements.indexOf(el)]}}))
    ]});
  }
  if(s.game===5) list.push({title:'Vehicles',items:Object.entries(s.vehicleKeys).map(([key,type])=>({label:type,detail:name({top:s.vehicleShortcuts[type].key}),vehicle:type,hotkey:{player:0,key}}))});
  return list;
}

function createRadial(manager,mainWindow) {
  let open=false;
  const window=new BrowserWindow({width:size,height:size,show:false,frame:false,transparent:true,resizable:false,movable:false,focusable:false,
    skipTaskbar:true,alwaysOnTop:true,hasShadow:false,
    // Stays loaded while hidden so it can watch for the L3+R3 hold.
    webPreferences:{preload:path.join(__dirname,'radial-preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true,backgroundThrottling:false}});
  window.setAlwaysOnTop(true,'screen-saver');
  window.setIgnoreMouseEvents(true);
  window.webContents.setWindowOpenHandler(()=>({action:'deny'}));
  window.webContents.on('will-navigate',event=>event.preventDefault());
  const send=()=>{if(open && !window.isDestroyed())window.webContents.send('radial-state',{open:true,game:manager.game,tabs:tabs(manager)});};
  function show() {
    if(open || !manager.session.game || mainWindow.isFocused())return;
    const bounds=manager.session.bounds;
    let reference=mainWindow.getBounds();
    if(bounds?.width>0 && bounds?.height>0) reference=process.platform==='win32'?screen.screenToDipRect(null,bounds):bounds;
    const area=screen.getDisplayMatching(reference).workArea;
    const cx=Math.max(area.x,Math.min(reference.x+reference.width/2,area.x+area.width)),cy=Math.max(area.y,Math.min(reference.y+reference.height/2,area.y+area.height));
    window.setBounds({x:Math.round(cx-size/2),y:Math.round(cy-size/2),width:size,height:size});
    open=true;send();window.showInactive();
  }
  function hide() {
    if(!open)return;
    open=false;window.hide();window.webContents.send('radial-state',{open:false});
  }
  function toggleGui() {
    hide();
    if(mainWindow.isFocused() && !mainWindow.isMinimized()) {mainWindow.minimize();return;}
    // Windows refuses focus to background apps; briefly going topmost lets the
    // GUI come forward over Cemu.
    if(mainWindow.isMinimized())mainWindow.restore();
    mainWindow.show();mainWindow.setAlwaysOnTop(true);mainWindow.focus();mainWindow.setAlwaysOnTop(false);
  }
  async function pick({tab,index,alt}) {
    const t=tabs(manager)[tab],item=t?.items?.[index];
    if(!item)return;
    hide();
    if(item.villain)manager.selectedTrap=item.villain;
    await manager.hotkey({...item.hotkey,...(t.twoPlayer?{player:alt?1:0}:{})});
  }
  function verify(event){if(event.sender!==window.webContents || event.senderFrame!==window.webContents.mainFrame)throw Error('Invalid radial request.');}
  const handlers={
    'radial-hold':seconds=>seconds>=5?toggleGui():show(),
    'radial-pick':data=>pick(data || {}),
    'radial-close':hide
  };
  for(const [channel,handler] of Object.entries(handlers)) ipcMain.handle(channel,(event,arg)=>{verify(event);return handler(arg);});
  manager.on('state',send);
  mainWindow.on('focus',hide);
  window.loadFile(path.join(__dirname,'ui/radial.html'));
  window.on('closed',()=>{manager.off('state',send);for(const channel in handlers)ipcMain.removeHandler(channel);});
  return {destroy(){if(!window.isDestroyed())window.destroy();}};
}
module.exports={createRadial,tabs};
