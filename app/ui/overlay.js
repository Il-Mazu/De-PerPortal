'use strict';
// Pixel coordinates in the original manual artwork; only the symbols are shown.
const elements={Air:[141,412],Life:[256,412],Undead:[373,412],Earth:[487,412],Fire:[603,412],Water:[139,558],Magic:[255,558],Tech:[371,558],Dark:[486,558],Light:[601,558]};
const keys={Magic:['1','Q'],Water:['2','W'],Tech:['3','E'],Fire:['4','R'],Earth:['5','Y'],Life:['6','U'],Air:['7','I'],Undead:['8','O'],Light:['9','P'],Dark:['−','L']};
function entry(label,file,x,y,scale,width,height,hint){
  const cell=document.createElement('div');cell.className='entry';cell.title=`${label} · Alt+${hint.replace('/',' / Alt+')}`;
  const icon=document.createElement('span');icon.className='icon';
  const img=document.createElement('img');img.src=`icons/${file}.png`;img.alt=label;
  Object.assign(img.style,{width:`${width*scale}px`,height:`${height*scale}px`,left:`${14-x*scale}px`,top:`${14-y*scale}px`});
  icon.append(img);cell.append(icon);
  const shortcut=document.createElement('span');shortcut.className='hint';shortcut.textContent=hint;shortcut.setAttribute('aria-label',`Alt+${hint.replace('/',' or Alt+')}`);cell.append(shortcut);
  return cell;
}
window.overlay.onState(state=>{
  document.querySelector('main').hidden=!state.reminders;
  const notice=document.getElementById('notification');notice.hidden=!state.notification;notice.textContent=state.notification || '';
  document.getElementById('elements').replaceChildren(...state.elements.filter(e=>state.game>=4 || !['Light','Dark'].includes(e)).map(e=>{
    const [number,letter]=keys[e],hint=state.game===4?`${number}/${letter}`:number;
    return entry(e,'elements',...elements[e],.28,805,1000,hint);
  }));

});
document.getElementById('close').onclick=()=>window.overlay.close();
window.overlay.ready();
