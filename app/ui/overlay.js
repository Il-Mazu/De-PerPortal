'use strict';
// Pixel coordinates in the original manual artwork; only the symbols are shown.
const elements={Air:[141,412],Life:[256,412],Undead:[373,412],Earth:[487,412],Fire:[603,412],Water:[139,558],Magic:[255,558],Tech:[371,558],Dark:[486,558],Light:[601,558]};
const perkCenters={Y:53,E:213,U:374,I:534,Q:696,R:860,O:1022,W:1182};
function entry(label,key,file,x,y,scale,width,height){
  const cell=document.createElement('div');cell.className='entry';cell.title=`${label} · Alt+${key} · Player 2: Alt+Shift+${key}`;
  const icon=document.createElement('span');icon.className='icon';
  const img=document.createElement('img');img.src=`icons/${file}.png`;img.alt=label;
  Object.assign(img.style,{width:`${width*scale}px`,height:`${height*scale}px`,left:`${14-x*scale}px`,top:`${14-y*scale}px`});
  icon.append(img);const k=document.createElement('span');k.className='key';k.textContent=key;cell.append(icon,k);return cell;
}
window.overlay.onState(state=>{
  document.querySelector('main').hidden=!state.reminders;
  const notice=document.getElementById('notification');notice.hidden=!state.notification;notice.textContent=state.notification || '';
  document.getElementById('elements').replaceChildren(...state.elements.filter(e=>state.game>=4 || !['Light','Dark'].includes(e)).map(e=>{
    const i=state.elements.indexOf(e);return entry(e,i===9?'-':String(i+1),'elements',...elements[e],.28,805,1000);
  }));
  const perks=document.getElementById('perks');perks.hidden=state.game!==3;
  perks.replaceChildren(...(state.game===3?state.perks.map(p=>entry(p.name,p.key,'perks',perkCenters[p.key],72,.27,1239,144)):[]));
});
document.getElementById('close').onclick=()=>window.overlay.close();
window.overlay.ready();
