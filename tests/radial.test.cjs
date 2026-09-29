const {test}=require('node:test');
const assert=require('node:assert/strict');
const Pad=require('../app/ui/pad.js');
const {tabs}=require('../app/radial.cjs');
const model=require('../app/model.cjs');

function fakeManager(game,extra={}) {
  const figures=[{key:'spyro.sky',info:{name:'Spyro',kind:'Skylander',element:'Magic'}},{key:'jet.sky',info:{name:'Jet-Vac',kind:'Vehicle'}}];
  const players=[0,1].map(p=>({elements:{Magic:p?null:{top:'spyro.sky',bottom:null}},favorite:p?null:extra.favorite}));
  return {figures:extra.figures||[],trapName:extra.trapName||(()=>null),
    state:()=>({game,figures,recent:extra.recent||[],elements:model.elements,perks:model.perks,profile:{players},vehicleKeys:{Q:'Sky',W:'Land',E:'Sea'},vehicleShortcuts:{Sky:{key:'jet.sky'},Land:{key:null},Sea:{key:null}}})};
}

test('radial tabs follow each game and map to the keyboard shortcuts',()=>{
  const giants=tabs(fakeManager(2));
  assert.deepEqual(giants.map(t=>t.title),['Player 1','Player 2','Recent']);
  assert.equal(giants[0].items.length,8,'Light and Dark arrive with Trap Team');
  assert.deepEqual(giants[0].items[0],{label:'Magic',detail:'Spyro',el:'Magic',hotkey:{player:0,key:'1'}});
  assert.equal(giants[1].items[0].detail,'Not assigned');
  assert.deepEqual(tabs(fakeManager(2,{favorite:{top:'spyro.sky',bottom:null}}))[0].home,{label:'Default',detail:'Spyro',assigned:true,hotkey:{player:0,key:'0'}});
  assert.equal(giants[1].home.detail,'Not assigned');
  assert.equal(tabs(fakeManager(3))[2].home,undefined,'only player rings have a default');
  assert.deepEqual(tabs(fakeManager(3))[2].items[0].hotkey,{key:'Q'});
  assert.equal(tabs(fakeManager(3))[2].twoPlayer,true);
  const trap={key:'t.sky',info:{kind:'Trap',element:'Fire'}};
  const traps=tabs(fakeManager(4,{figures:[trap],trapName:f=>f===trap?'Chompy Mage':null}))[2].items;
  assert.equal(traps.length,11);
  assert.deepEqual(traps[0],{label:'Chompy Mage',detail:'Fire villain',el:'Fire',villain:'t.sky',hotkey:{player:0,key:'LockTrap'}});
  assert.deepEqual(traps[10].hotkey,{player:0,key:'L'});
  const vehicles=tabs(fakeManager(5))[2].items;
  assert.deepEqual(vehicles.map(v=>[v.label,v.detail,v.hotkey.key]),[['Sky','Jet-Vac','Q'],['Land','Not assigned','W'],['Sea','Not assigned','E']]);
  assert.equal(tabs(fakeManager(6)).length,3);
  // Recent: a random pick first, then what was played in this game, loaded directly.
  const spyro={key:'spyro.sky',id:16,variant:0,half:'whole',info:{name:'Spyro',kind:'Skylander',element:'Magic',game:1}};
  const recent=tabs(fakeManager(2,{figures:[spyro],recent:[{key:'spyro.sky',game:2,player:0},{key:'spyro.sky',game:1,player:0},{key:'gone.sky',game:2,player:1}]})).at(-1);
  assert.equal(recent.twoPlayer,true);
  assert.deepEqual(recent.items.map(i=>[i.label,i.hotkey || i.choice]),[['Random',{key:'D'}],['Spyro',{top:'spyro.sky',bottom:null}]]);
});

test('pad reader reports new presses, the stick combo and the controller family',()=>{
  const pad=(pressed,axes=[0,0,0,0],id='Xbox 360 Controller (XInput STANDARD GAMEPAD)')=>({index:0,id,mapping:'standard',axes,buttons:Array.from({length:17},(_,i)=>({pressed:pressed.includes(i)}))});
  const read=Pad.reader({stickAsDpad:true});
  assert.deepEqual([...read([pad([0])],0).pressed],['A']);
  assert.equal(read([pad([0])],10).pressed.size,0,'held buttons do not repeat');
  const combo=read([pad([10,11],undefined,'DualSense Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 0ce6)')],20);
  assert.equal(combo.combo,true);assert.equal(combo.family,'ps');
  const parsec={index:1,id:'Xbox One Controller',mapping:'',axes:[0,0,0,0],buttons:Array.from({length:12},(_,i)=>({pressed:i===8 || i===9}))};
  assert.equal(Pad.reader()([parsec],25).combo,true,'unmapped pads click the sticks on 8 and 9');
  assert.ok(read([pad([],[0,1,0,0])],30).pressed.has('DOWN'));
  assert.equal(read([pad([],[0,1,0,0])],100).pressed.size,0);
  assert.ok(read([pad([],[0,1,0,0])],500).pressed.has('DOWN'),'stick repeats while held');
  // The dial waits for idle before acting, so frozen Cemu never sees the press.
  assert.equal(read([pad([0])],600).idle,false);
  assert.equal(read([pad([],[.2,0,0,.8])],610).idle,false,'a pushed stick is not idle');
  assert.equal(read([pad([],[.1,.1,0,0])],620).idle,true);
  assert.equal(Pad.sector([0,-1],10),0);assert.equal(Pad.sector([1,0],10),3);
  assert.equal(Pad.sector([0,1],10),5);assert.equal(Pad.sector([-.1,-1],10),0);
});
