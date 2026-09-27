'use strict';
// Simple line glyphs; no official vehicle-type symbols are bundled.
const vehicles=[['Sky','Q','M12 3v18 M3 13l9-4 9 4 M8 20l4-2 4 2'],['Land','W','M5 8l2-4h10l2 4 M3 8h18v9H3z M5 17v3 M19 17v3 M6 12h2 M16 12h2'],['Sea','E','M3 13h18l-3 5H6z M12 3v10 M12 4l6 7h-6 M2 21c2-1 3-1 5 0s3 1 5 0 3-1 5 0 3 1 5 0']];
function vehicle(type,key,d,active){
  const cell=document.createElement('div');cell.className=`entry vehicle${active?' active':''}`;cell.title=`${type} vehicle · Alt+${key}${active?' · on the portal':''}`;
  const icon=document.createElement('span');icon.className='icon glyph';
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('aria-label',`${type} vehicle`);
  const path=document.createElementNS('http://www.w3.org/2000/svg','path');path.setAttribute('d',d);svg.append(path);icon.append(svg);cell.append(icon);
  const shortcut=document.createElement('span');shortcut.className='hint';shortcut.textContent=key;shortcut.setAttribute('aria-label',`Alt+${key}`);cell.append(shortcut);
  return cell;
}
const keys={Magic:['1','Q'],Water:['2','W'],Tech:['3','E'],Fire:['4','R'],Earth:['5','Y'],Life:['6','U'],Air:['7','I'],Undead:['8','O'],Light:['9','P'],Dark:['−','L']};
function entry(label,hint){
  const cell=document.createElement('div');cell.className='entry';cell.title=`${label} · Alt+${hint.replace('/',' / Alt+')}`;
  const icon=document.createElement('i');icon.className='icon sigil';icon.dataset.el=label;icon.setAttribute('role','img');icon.setAttribute('aria-label',label);cell.append(icon);
  const shortcut=document.createElement('span');shortcut.className='hint';shortcut.textContent=hint;shortcut.setAttribute('aria-label',`Alt+${hint.replace('/',' or Alt+')}`);cell.append(shortcut);
  return cell;
}
window.overlay.onState(state=>{
  document.querySelector('main').hidden=!state.reminders;
  const notice=document.getElementById('notification');notice.hidden=!state.notification;notice.textContent=state.notification || '';
  document.getElementById('elements').replaceChildren(...state.elements.filter(e=>state.game>=4 || !['Light','Dark'].includes(e)).map(e=>{
    const [number,letter]=keys[e],hint=state.game===4?`${number}/${letter}`:number;
    return entry(e,hint);
  }));
  const list=document.getElementById('vehicles');list.hidden=state.game!==5;
  list.replaceChildren(...(state.game===5?vehicles.map(([type,key,d])=>vehicle(type,key,d,state.vehicle===type)):[]));
});
document.getElementById('close').onclick=()=>window.overlay.close();
window.overlay.ready();
