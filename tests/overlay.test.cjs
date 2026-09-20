const {test}=require('node:test');
const assert=require('node:assert/strict');
const {EventEmitter}=require('node:events');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

test('native drags survive figure updates, Cemu focus loss, notifications and display changes',()=>{
 let window,timeout,scheduled=0,lastPayload,displays=[{x:0,y:0,width:1920,height:1080},{x:1920,y:0,width:1280,height:1024}];
 class BrowserWindow extends EventEmitter {
  constructor(options){super();window=this;this.bounds={x:0,y:0,width:options.width,height:options.height};this.visible=false;this.webContents=new EventEmitter();this.webContents.mainFrame={};this.webContents.setWindowOpenHandler=()=>{};this.webContents.send=(_channel,payload)=>{lastPayload=payload;};}
  setAlwaysOnTop(){} isDestroyed(){return false;} getBounds(){return {...this.bounds};} getPosition(){return [this.bounds.x,this.bounds.y];}
  setBounds(b){this.placements=(this.placements||0)+1;this.bounds={...b};this.emit('move');} hide(){this.visible=false;} isVisible(){return this.visible;} showInactive(){this.visible=true;} loadFile(){} destroy(){this.emit('closed');}
 }
 const handlers={};const ipcMain={handle:(key,fn)=>handlers[key]=fn,removeHandler:key=>delete handlers[key]};
 const screen=new EventEmitter();screen.getDisplayMatching=b=>({workArea:displays.find(d=>b.x>=d.x && b.x<d.x+d.width)||displays[0]});screen.screenToDipRect=(_,b)=>b;
 const manager=new EventEmitter();let state={game:3,session:{supported:true,game:3,focused:true,bounds:displays[0]},elements:[],perks:[]};manager.state=()=>state;
 const context={require:name=>name==='electron'?{BrowserWindow,ipcMain,screen}:require(name),module:{exports:{}},__dirname:path.resolve('app'),process:{platform:'win32'},setTimeout:fn=>{timeout=fn;scheduled++;return 1;},clearTimeout:()=>{}};
 vm.runInNewContext(fs.readFileSync('app/overlay.cjs','utf8'),context);
 const overlay=context.module.exports.createOverlay(manager,{getBounds:()=>displays[0]});
 handlers['overlay-ready']({sender:window.webContents,senderFrame:window.webContents.mainFrame});
 assert.equal(window.visible,true);
 // Reproduce native drag without `moved`; old implementation reset on publish.
 window.bounds.x=2300;window.bounds.y=200;
 manager.emit('state',state);assert.deepEqual(window.getPosition(),[2300,200]);
 const placements=window.placements;
 manager.emit('state',{...state,active:[{top:'another.sky'},null]});
 assert.equal(window.placements,placements,'figure changes must not reposition the window');
 state={...state,session:{...state.session,focused:false}};manager.emit('state',state);assert.equal(window.visible,false);
 // A native move may arrive after focus loss hid the overlay.
 window.emit('will-move',{}, {x:2350,y:240});window.bounds.x=2350;window.bounds.y=240;
 window.emit('move');
 state={...state,game:4,session:{...state.session,game:4,focused:true}};manager.emit('state',state);
 assert.deepEqual(window.getPosition(),[2350,240]);assert.equal(window.bounds.height,Math.ceil(94*.7));
 window.bounds.x=2300;window.bounds.y=200;window.emit('moved');
 state={...state,game:2,session:{...state.session,game:2,focused:true}};manager.emit('state',state);assert.deepEqual(window.getPosition(),[2300,200]);
 manager.emit('notification','Player 1 · Preset 2');assert.deepEqual(window.getPosition(),[2300,200]);
 timeout();assert.deepEqual(window.getPosition(),[2300,200]);
 handlers['overlay-close']({sender:window.webContents,senderFrame:window.webContents.mainFrame});
 state={...state,session:{...state.session,focused:false}};manager.emit('state',state);
 const before=scheduled;
 manager.emit('notification','Trap 2/4: Gulper · Water');
 assert.equal(scheduled,before,'notification must not expire behind the swap dialog');assert.equal(window.visible,false);
 state={...state,session:{...state.session,focused:true}};manager.emit('state',state);
 assert.equal(window.visible,true);assert.equal(lastPayload.reminders,false);
 assert.equal(lastPayload.notification,'Trap 2/4: Gulper · Water');assert.equal(scheduled,before+1);
 manager.emit('state',state);assert.equal(scheduled,before+1,'normal state updates must not restart the timer');
 timeout();assert.equal(window.visible,false);
 handlers['overlay-close']({sender:window.webContents,senderFrame:window.webContents.mainFrame});overlay.show();assert.deepEqual(window.getPosition(),[2300,200]);
 displays=[displays[0]];screen.emit('display-removed');assert.ok(window.bounds.x+window.bounds.width<=1920);assert.ok(window.bounds.y>=0);
 overlay.destroy();assert.equal(manager.listenerCount('state'),0);assert.equal(screen.listenerCount('display-removed'),0);
});
