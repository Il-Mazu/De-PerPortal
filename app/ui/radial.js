'use strict';
const colors={Magic:'#b76cf2',Water:'#3fa9f5',Tech:'#f5a524',Fire:'#ff6a3d',Earth:'#b88346',Life:'#68d445',Air:'#8fdcff',Undead:'#a59ac8',Light:'#ffe36b',Dark:'#7b62d6'};
const vehicles={Sky:'M12 3v18 M3 13l9-4 9 4 M8 20l4-2 4 2',Land:'M5 8l2-4h10l2 4 M3 8h18v9H3z M5 17v3 M19 17v3 M6 12h2 M16 12h2',Sea:'M3 13h18l-3 5H6z M12 3v10 M12 4l6 7h-6 M2 21c2-1 3-1 5 0s3 1 5 0 3-1 5 0 3 1 5 0'};
const $=id=>document.getElementById(id);
const read=Pad.reader();
let state={open:false},tab=0,index=0,holdStart=null,stage=0,family='xbox',pending=null;

function coin(item,i,count) {
  const el=document.createElement('div');
  el.className=`coin${i===index?' selected':''}${item.trap?' trap':''}`;
  el.style.setProperty('--a',`${i/count}turn`);
  if(item.el) {
    el.dataset.el=item.el;
    const sigil=document.createElement('i');sigil.className='sigil';el.append(sigil);
    if(item.villain) {const initial=document.createElement('span');initial.className='initial';initial.textContent=item.label[0];el.append(initial);}
  } else if(item.badge!==undefined) {
    const badge=document.createElement('i');badge.className='badge';badge.style.setProperty('--i',item.badge);el.append(badge);
  } else if(item.vehicle) {
    const svg=document.createElementNS('http://www.w3.org/2000/svg','svg'),path=document.createElementNS('http://www.w3.org/2000/svg','path');
    svg.setAttribute('viewBox','0 0 24 24');path.setAttribute('d',vehicles[item.vehicle]);svg.append(path);el.append(svg);
  }
  return el;
}
function hint(button,text) {
  const span=document.createElement('span'),key=document.createElement('span');
  key.className='hint';key.textContent=Pad.labels[family][button];span.append(key,text);
  return span;
}
function render() {
  $('dial').hidden=!state.open;
  if(!state.open)return;
  tab=Math.min(tab,state.tabs.length-1);
  const t=state.tabs[tab],items=t.items;
  index=Math.min(index,items.length-1);
  const item=items[index];
  $('ring').replaceChildren(...items.map((it,i)=>coin(it,i,items.length)));
  $('dial').style.setProperty('--glow',colors[item.el] || 'var(--gilt)');
  $('l1').textContent=Pad.labels[family].L1;$('r1').textContent=Pad.labels[family].R1;
  $('tab-title').textContent=t.title;
  $('dots').replaceChildren(...state.tabs.map((_,i)=>{const dot=document.createElement('i');if(i===tab)dot.className='on';return dot;}));
  $('label').textContent=item.label;
  $('detail').textContent=item.detail;
  $('hints').replaceChildren(...(t.twoPlayer?[hint('A','Player 1'),hint('X','Player 2')]:[hint('A','Load')]),hint('B','Close'));
}
function setHold(value) {
  $('dial').style.setProperty('--hold',value);
  $('dial').classList.toggle('holding',value>0);
}
function poll() {
  const now=performance.now(),input=read(navigator.getGamepads(),now);
  if(input.family!==family) {family=input.family;render();}
  // L3+R3: 2 s opens the dial, 5 s brings up (or hides) the full GUI.
  if(input.combo) {
    holdStart??=now;
    const held=now-holdStart;
    if(stage<1 && held>=2000) {stage=1;tab=0;index=0;window.radial.hold(2);}
    if(stage<2 && held>=5000) {stage=2;window.radial.hold(5);}
    setHold(stage===1?Math.min(1,(held-2000)/3000):0);
    return;
  }
  if(holdStart!==null) {holdStart=null;stage=0;setHold(0);}
  if(!state.open) {pending=null;return;}
  // Cemu is frozen while the dial is open. Act only once every button and
  // stick is released, so the game never sees the confirming press.
  if(pending) {if(input.idle){pending();pending=null;}return;}
  const t=state.tabs[tab],count=t.items.length,pressed=input.pressed;
  let next=index;
  if(input.stick) next=Pad.sector(input.stick,count);
  if(pressed.has('RIGHT') || pressed.has('DOWN')) next=(index+1)%count;
  if(pressed.has('LEFT') || pressed.has('UP')) next=(index-1+count)%count;
  if(pressed.has('R1') || pressed.has('L1')) {tab=(tab+(pressed.has('R1')?1:-1)+state.tabs.length)%state.tabs.length;next=0;}
  if(next!==index || pressed.has('R1') || pressed.has('L1')) {index=next;render();}
  const choice={tab,index};
  if(pressed.has('A')) pending=()=>window.radial.pick({...choice,alt:false});
  else if(pressed.has('X') && t.twoPlayer) pending=()=>window.radial.pick({...choice,alt:true});
  else if(pressed.has('B')) pending=()=>window.radial.close();
}
window.radial.onState(next=>{state=next;render();});
setInterval(poll,33);
