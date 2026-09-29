'use strict';
const {BrowserWindow,ipcMain,screen}=require('electron');
const path=require('node:path');
const {trapKeys}=require('./manager.cjs');
const model=require('./model.cjs');
const elementKeys=['1','2','3','4','5','6','7','8','9','-'];
const size=440;

// Tabs cycled with L1/R1: one ring per player, plus the game's own shortcuts.
// Every item carries the hotkey it stands for, so a pick behaves exactly like
// the keyboard shortcut.
function tabs(manager) {
  const s=manager.state(),figure=key=>s.figures.find(f=>f.key===key);
  const name=c=>c?.top?[c.top,c.bottom].filter(Boolean).map(k=>figure(k)?.info?.name?.replace(/ \((Top|Bottom)\)$/,'') || 'Unknown figure').join(' / '):'Not assigned';
  const elements=s.elements.filter(e=>s.game>=4 || !['Light','Dark'].includes(e));
  // The centre of each player ring returns to that player's default, like Alt+0.
  const list=[0,1].map(p=>({title:`Player ${p+1}`,home:{label:'Default',detail:name(s.profile.players[p].favorite),assigned:!!s.profile.players[p].favorite,hotkey:{player:p,key:'0'}},items:elements.map(el=>({label:el,detail:name(s.profile.players[p].elements[el]),el,hotkey:{player:p,key:elementKeys[s.elements.indexOf(el)]}}))}));
  if(s.game===3) list.push({title:'Perks',twoPlayer:true,items:s.perks.map((perk,i)=>({label:perk.name,detail:'Movement base',badge:i,hotkey:{key:perk.key}}))});
  if(s.game===4) {
    const villains=manager.figures.filter(f=>f.info?.kind==='Trap' && manager.trapName(f)).sort((a,b)=>manager.trapName(a).localeCompare(manager.trapName(b)));
    list.push({title:'Traps',items:[
      ...villains.map(f=>({label:manager.trapName(f),detail:`${f.info.element} villain`,el:f.info.element,villain:f.key,hotkey:{player:0,key:'LockTrap'}})),
      ...elements.map(el=>({label:el,detail:'Next unassigned trap',el,trap:true,hotkey:{player:0,key:trapKeys[s.elements.indexOf(el)]}}))
    ]});
  }
  if(s.game===5) list.push({title:'Vehicles',items:Object.entries(s.vehicleKeys).map(([key,type])=>({label:type,detail:name({top:s.vehicleShortcuts[type].key}),vehicle:type,hotkey:{player:0,key}}))});
  // Random first, then the figures played most recently in this game.
  const library=key=>manager.figures.find(f=>f.key===key);
  const recent=(s.recent||[]).filter(h=>h.game===s.game && h.player!==null && model.playable(library(h.key),s.game)).map(h=>model.choice(library(h.key),manager.figures)).filter(Boolean);
  list.push({title:'Recent',twoPlayer:true,items:[{label:'Random',detail:'Any Skylander in your library',glyph:'?',hotkey:{key:'D'}},
    ...recent.map(c=>({label:name(c),detail:library(c.top).info.element,el:library(c.top).info.element,choice:c}))]});
  return list;
}

function createRadial(manager,mainWindow,freeze,raise) {
  let open=false,release=null;
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
    open=true;release=freeze?.();send();window.showInactive();
  }
  // Resolves once Cemu is running again, so portal swaps can reach it.
  function hide() {
    const resumed=release?.();release=null;
    if(open) {open=false;window.hide();window.webContents.send('radial-state',{open:false});}
    return resumed;
  }
  function toggleGui() {
    hide();
    if(mainWindow.isFocused() && !mainWindow.isMinimized()) {mainWindow.minimize();return;}
    // Windows refuses focus to background apps, and fullscreen Cemu covers any
    // window that is not in front. Stay topmost until the GUI is left, and let
    // the helper hand it real focus so the controller can drive it.
    if(mainWindow.isMinimized())mainWindow.restore();
    mainWindow.show();mainWindow.setAlwaysOnTop(true);mainWindow.focus();raise?.();
  }
  async function pick({tab,index,alt,home}) {
    const t=tabs(manager)[tab],item=home?t?.home:t?.items?.[index];
    if(!item)return;
    await hide();
    if(item.villain)manager.selectedTrap=item.villain;
    if(item.choice) {
      try { await manager.action({player:alt?1:0,target:'direct',choice:item.choice}); }
      catch(e) { manager.message=e.message;manager.publish();manager.emit('notification',e.message); }
      return;
    }
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
  const notOnTop=()=>mainWindow.setAlwaysOnTop(false);
  mainWindow.on('blur',notOnTop);mainWindow.on('minimize',notOnTop);
  window.loadFile(path.join(__dirname,'ui/radial.html'));
  window.on('closed',()=>{release?.();manager.off('state',send);for(const channel in handlers)ipcMain.removeHandler(channel);});
  return {destroy(){if(!window.isDestroyed())window.destroy();}};
}
module.exports={createRadial,tabs};
