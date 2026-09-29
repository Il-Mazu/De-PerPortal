'use strict';
const api=window.dePerPortal;
let state,player=0,shown=[null,null],picking=null,pendingTop=null,pickerSaving=false,toastTimer,artBannerDismissed=false;
const $=id=>document.getElementById(id);
const colors={Magic:'#b76cf2',Water:'#3fa9f5',Tech:'#f5a524',Fire:'#ff6a3d',Earth:'#b88346',Life:'#68d445',Air:'#8fdcff',Undead:'#a59ac8',Light:'#ffe36b',Dark:'#7b62d6'};
const portals={1:['portal.png','Original stone portal'],2:['portal.png','Giants · stone portal'],3:['portals/swap-force.png','Swap Force · arched portal'],4:['portals/trap-team.png','Trap Team · Traptanium portal'],5:['portals/superchargers.png','SuperChargers · engine portal'],6:['portals/swap-force.png','Imaginators · arched portal']};
const e=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// Official element symbol, tinted by CSS (see .sigil and icons/sigils.png).
const sigil=el=>colors[el]?`<i class="sigil" data-el="${el}"></i>`:'◈';
const figure=key=>state.figures.find(f=>f.key===key);
const name=f=>f?.info?.name?.replace(/ \((Top|Bottom)\)$/,'') || (f?'Unknown figure':'Choose a Skylander');
function portrait(f,empty='+') { return f?.art?`<img src="${e(f.art)}" alt="${e(name(f))}" loading="lazy">`:`<span class="placeholder">${f?sigil(f.info?.element):empty}</span>`; }
function replay(el,cls) {
  el.classList.remove(cls);void el.offsetWidth;el.classList.add(cls);
  el.addEventListener('animationend',function done(event){if(event.target!==el && !event.target.matches('.portal-light'))return;el.classList.remove(cls);el.removeEventListener('animationend',done);});
}
function chosen(c) { return c?figure(c.top):null; }
function halfPortrait(f) { return `<div class="half-art">${portrait(f)}</div>`; }
function orientHalves() {
  for(const img of document.querySelectorAll('.half-art img')) {
    const orient=()=>img.classList.toggle('sideways',img.naturalWidth/img.naturalHeight<0.8);
    if(img.complete) orient(); else img.onload=orient;
  }
}
function art(c) { return c?.bottom?`<div class="pair">${halfPortrait(figure(c.top))}${halfPortrait(figure(c.bottom))}</div>`:portrait(chosen(c)); }
function choiceName(c) { return c?.bottom?`${name(figure(c.top))} / ${name(figure(c.bottom))}`:name(chosen(c)); }
function toast(message) { $('toast').textContent=String(message).replace(/^Error invoking remote method '[^']+': Error: /,'');$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,7000); }
async function perform(fn) { try { await fn(); } catch(error) {toast(error.message);} }
function render() {
  if(!state)return;
  const keep=focusPath(document.activeElement);
  draw();
  // Sections are rebuilt on every update; put controller focus back.
  if(keep && document.activeElement===document.body) {
    const host=$(keep[0]),el=keep[1]<0?host:host?.querySelectorAll('button,select,input,summary')[keep[1]];
    el?.focus({preventScroll:true});
  }
}
function focusPath(el) {
  if(el?.id) return [el.id,-1];
  const host=el?.closest?.('[id]');
  return host && host!==document.body?[host.id,[...host.querySelectorAll('button,select,input,summary')].indexOf(el)]:null;
}
function draw() {
  document.body.classList.toggle('busy',state.busy);
  applyTheme();
  const connected=state.session.supported;
  const portal=portals[state.game];
  const portalImage=document.querySelector('.portal');
  if(portalImage.getAttribute('src')!==portal[0])portalImage.src=portal[0];
  portalImage.alt=portal[1];
  document.body.dataset.game=state.game;
  $('connection').textContent=connected?'Cemu connected':state.session.pid?'Unsupported Cemu':'Waiting for Cemu';
  $('connection').parentElement.classList.toggle('connected',connected);
  $('game').innerHTML=state.games.map((g,i)=>`<option value="${i+1}">${e(g)}</option>`).join('');
  $('game').value=state.game;$('game').disabled=state.detected || state.busy;
  $('auto-label').textContent=state.detected?'Detected':'Manual profile';
  $('reset-trap-detections').disabled=state.busy || !state.figures.some(f=>f.info?.kind==='Trap');
  $('restore-trap-backup').disabled=state.busy;
  $('launch').disabled=!!state.session.pid;
  const thump=state.figures.find(f=>f.id===107);
  $('thump-art').innerHTML=thump?.art?portrait(thump):'⚓';
  $('thumpback').disabled=state.busy || !thump || state.game<2;
  $('thumpback').title=state.game<2?'Available in Giants and later':'Load Thumpback for Player 1 · Alt+T';
  for(let p=0;p<2;p++) $(`spin-${p}`).disabled=state.busy || spinning[p];
  if(document.body.dataset.theme==='fishbet' && !$('fb-wins').childElementCount) fillWins();
  $('thumpling').disabled=state.busy || !state.figures.some(f=>f.id===541 && f.info?.game<4 && compatible(f));
  // Dè perThumpback's banner mirrors the two Thumpback buttons.
  $('ptb-art').innerHTML=thump?.art?portrait(thump):anchor;
  $('ptb-load').disabled=$('thumpback').disabled;$('ptb-mini').disabled=$('thumpling').disabled;
  for(let p=0;p<2;p++) {
    const defaults=state.profile.players[p],current=state.active[p],f=chosen(current),favorite=defaults.favorite,ff=chosen(favorite);
    const tone=colors[f?.info?.element] || '#8d97c9';
    // Replay the materialize effect only when a different figure lands.
    const key=current?`${current.top}|${current.bottom}`:null;
    if(key && key!==shown[p]) {ideas++;if(currentTheme()==='mcdonald' && Math.random()<.34)toast(pick(upsells));replay($(`player-${p}`),'arrive');replay(document.querySelector('.stage'),'flash');}
    shown[p]=key;
    document.body.style.setProperty(`--player-${p}`,tone);
    $(`player-${p}`).style.setProperty('--player-color',tone);
    $(`player-${p}`).dataset.element=f?.info?.element || '';
    document.querySelector(p?'.aura-two':'.aura-one').classList.toggle('is-active',!!f);
    $(`player-${p}`).innerHTML=`<div class="player-label">Player ${p+1}</div><button class="active-card" title="Choose Player ${p+1}’s active Skylander"><div class="portrait">${art(current)}</div><span class="active-name">${e(f?name(f):'Choose Skylander')}</span><span class="figure-meta">${e(f?`${f.info?.element||''} · ${current?.bottom?'Swap combination':f.info?.kind||'Skylander'}`:'Click to load a figure')}</span></button>${f?'<button class="remove">Remove from portal</button>':''}`;
    $(`player-${p}`).insertAdjacentHTML('beforeend',reel(f,p));
    $(`player-${p}`).querySelector('.active-card').onclick=()=>openPicker({player:p,target:'direct'});
    const observed=state.observed?.[p*2];
    if(!f && observed && observed!=='None') {
      $(`player-${p}`).querySelector('.active-name').textContent=observed;
      $(`player-${p}`).querySelector('.figure-meta').textContent='Loaded through Cemu';
      const remove=document.createElement('button');remove.className='remove';remove.textContent='Remove from portal';$(`player-${p}`).append(remove);
    }
    $(`player-${p}`).querySelector('.remove')?.addEventListener('click',()=>perform(()=>api.action({player:p,target:'remove'})));
    $(`favorite-${p}`).innerHTML=`<span class="label">Player ${p+1} default</span><button class="edit" aria-label="Change Player ${p+1} default">Edit</button><button class="load-favorite" title="Return to Player ${p+1} default"><div class="portrait">${portrait(ff)}</div><span class="name">${e(ff?name(ff):'Choose default')}</span><div class="shortcut"><kbd>Alt</kbd> ${p?'+ <kbd>Shift</kbd> ':''}+ <kbd>0</kbd></div></button>`;
    const presets=document.createElement('div');
    presets.className='default-presets';presets.setAttribute('role','group');presets.setAttribute('aria-label',`Player ${p+1} default presets`);
    presets.innerHTML=defaults.favorites.map((choice,i)=>`<button aria-label="Player ${p+1} default preset ${i+1}${choice?'':', empty'}" aria-pressed="${i===defaults.activeFavorite}" title="${choice?e(choiceName(choice)):'Choose default'}" ${state.busy?'disabled':''}>${i+1}${choice?'':' +'}</button>`).join('');
    [...presets.children].forEach((button,i)=>button.onclick=()=>defaults.favorites[i]?perform(()=>api.select({player:p,target:'active-favorite',preset:i})):openPicker({player:p,target:'favorite',preset:i}));
    $(`favorite-${p}`).append(presets);
    if(f)$(`player-${p}`).querySelector('.active-name').textContent=choiceName(current);
    $(`favorite-${p}`).querySelector('.portrait').innerHTML=art(favorite);
    $(`favorite-${p}`).querySelector('.name').textContent=ff?choiceName(favorite):'Choose default';
    $(`favorite-${p}`).querySelector('.edit').onclick=()=>openPicker({player:p,target:'favorite'});
    $(`favorite-${p}`).querySelector('.load-favorite').onclick=()=>favorite?perform(()=>api.action({player:p,target:'favorite'})):openPicker({player:p,target:'favorite'});
  }
  // Dè PerMCdonald: order numbers are the figure IDs on the portal.
  for(let p=0;p<2;p++) $(`mcd-p${p}`).textContent=chosen(state.active[p])?.id ?? '—';
  const side=chosen(state.sidekick);
  $('sidekick').innerHTML=`<button title="Choose a sidekick"><div class="portrait">${portrait(side,'+')}</div><span class="name">${e(side?name(side):'Add sidekick')}</span></button><span class="label">Sidekick</span>`;
  $('sidekick').querySelector('button').onclick=()=>openPicker({target:'sidekick'});
  if(side || (state.observed?.[4] && state.observed[4]!=='None')) {
    if(!side)$('sidekick').querySelector('.name').textContent=state.observed[4];
    const remove=document.createElement('button');remove.className='remove';remove.textContent='Remove';remove.onclick=()=>perform(()=>api.action({target:'remove-sidekick'}));$('sidekick').append(remove);
  }
  for(let p=0;p<2;p++) $(`tab-${p}`).classList.toggle('selected',p===player);
  $('elements').innerHTML=state.elements.map((element,i)=>{
    const c=state.profile.players[player].elements[element],f=chosen(c);
    return `<div class="element-card" data-element="${element}" data-el="${element}"><button class="element-load" title="${f?`Load ${e(name(f))}`:`Choose ${element} figure`}"><span class="element-label">${sigil(element)}${element}</span><div class="portrait">${portrait(f,sigil(element))}</div><span class="name">${e(f?name(f):'Not assigned')}</span></button><span class="dsc dsc-views">▶ ${views(f)}</span><span class="slot-key">${i===9?'−':i+1}</span><button class="edit" aria-label="Change ${element} Skylander">Edit</button></div>`;
  }).join('');
  for(const card of $('elements').children) {
    const el=card.dataset.element; card.style.setProperty('--color',colors[el]);
    card.querySelector('.edit').onclick=()=>openPicker({player,target:el});
    card.querySelector('.element-load').onclick=()=>state.profile.players[player].elements[el]?perform(()=>api.action({player,target:el})):openPicker({player,target:el});
  }
  $('vehicles-section').hidden=state.game!==5;
  if(state.game===5) {
    // The story vehicle slot is shared, so one button clears Sky, Land or Sea.
    const onPortal=chosen(state.accessories.vehicle),observed=state.observed?.[7];
    $('remove-vehicle').hidden=!onPortal && (!observed || observed==='None');
    $('remove-vehicle').textContent=`Remove ${onPortal?name(onPortal):observed || 'vehicle'}`;
    $('remove-vehicle').disabled=state.busy;
    $('vehicles').innerHTML=Object.entries(state.vehicleKeys).map(([key,type])=>{
      const shortcut=state.vehicleShortcuts[type],f=figure(shortcut.key);
      return `<div class="element-card" data-type="${type}"><button class="element-load" title="${f?`Load ${e(name(f))}`:`Choose a ${type} vehicle`}"><span class="element-label">${type}</span><div class="portrait">${portrait(f,accessoryIcon(type))}</div><span class="name">${e(f?name(f):'No vehicle')}</span></button><span class="slot-key">${key}${f && !shortcut.assigned?' · first found':''}</span><button class="edit" aria-label="Change ${type} vehicle">Edit</button></div>`;
    }).join('');
    for(const card of $('vehicles').children) {
      const type=card.dataset.type,key=state.vehicleShortcuts[type].key;
      card.style.setProperty('--color','#a4c6ca');
      card.querySelector('.edit').onclick=()=>openPicker({target:'vehicle-shortcut',type});
      card.querySelector('.element-load').onclick=()=>key?perform(()=>api.action({target:'accessory',slot:'vehicle',choice:{top:key,bottom:null}})):openPicker({target:'vehicle-shortcut',type});
    }
  }
  const showPerks=state.game===3;
  $('perks-section').hidden=!showPerks;
  if(showPerks) {
    $('perks-player').textContent=`Player ${player+1}`;
    $('perks').innerHTML=state.perks.map(perk=>{
      const bottom=state.figures.find(f=>f.id===perk.id && f.half==='bottom' && f.variant===8192) || state.figures.find(f=>f.id===perk.id && f.half==='bottom');
      return `<div class="perk-card"><button class="perk-load" data-key="${perk.key}" title="Load ${e(perk.name)} base for Player ${player+1}"><span class="element-label"><i class="badge"></i>${e(perk.name)}</span><div class="portrait">${bottom?halfPortrait(bottom):'<span class="placeholder"><i class="badge"></i></span>'}</div><span class="name">${e(bottom?name(bottom):'Base not found')}</span></button><span class="slot-key">${perk.key}</span></div>`;
    }).join('');
    [...$('perks').children].forEach((card,i)=>card.style.setProperty('--i',i));
    for(const card of $('perks').children) card.querySelector('.perk-load').onclick=()=>perform(()=>api.action({player,target:`perk-${card.querySelector('.perk-load').dataset.key}`}));
  }
  renderAccessories();
  if(picking && $('picker').open && !pickerSaving)renderPicker();
  $('status').textContent=state.message;
  $('library-count').textContent=`${state.figures.length} figures in your library`;
  $('root-path').textContent=state.root;
  $('warnings').textContent=state.warnings.length?state.warnings.join('\n'):'All figure headers recognized.';
  // Show art download banner on first run when no art is available
  if(!artBannerDismissed) $('art-banner').hidden=state.hasArt;
  for(const edit of document.querySelectorAll('.edit'))edit.textContent='Edit';
  orientHalves();
}
// Dè perDoomScroll: each player is a reel. Every number here is made up,
// seeded from the figure so it stays the same between redraws.
const seeded=f=>f?((f.id+1)*7919+f.variant*31)%9973+37:0;
const compact=n=>n>=1e6?`${(n/1e6).toFixed(1)}M`:n>=1e3?`${(n/1e3).toFixed(1)}K`:String(n);
const views=f=>f?compact(seeded(f)*431):'0';
const liked=new Set();
function reel(f,p) {
  if(!f)return '';
  const n=seeded(f),tag=(f.info?.element || 'portal').toLowerCase();
  return `<div class="dsc dsc-rail" aria-hidden="true"><span class="dsc-like${liked.has(f.key)?' liked':''}" data-key="${e(f.key)}">♥<small>${compact(n*97)}</small></span><span>💬<small>${compact(n*3)}</small></span><span>🔖<small>${compact(n*11)}</small></span><span>↪<small>${compact(n*5)}</small></span></div>`
    +`<p class="dsc dsc-caption" aria-hidden="true"><b>@player${p+1}</b> ${e(name(f))} just dropped on the portal <span>#${e(tag)} #skylanders #fyp</span></p>`
    +`<p class="dsc dsc-sound" aria-hidden="true"><i></i>♫ original sound · ${['Kaos','Glumshanks','Master Eon','Hugo','Flynn'][n%5]}</p>`;
}
document.addEventListener('click',event=>{
  const like=event.target.closest('.dsc-like');
  if(!like)return;
  liked.has(like.dataset.key)?liked.delete(like.dataset.key):liked.add(like.dataset.key);
  like.classList.toggle('liked');
});
// Screen time only goes up; now and then the app suggests a break it will not let you take.
let scrolled=0;
setInterval(()=>{if(currentTheme()==='doomscroll' && document.hasFocus())$('dsc-time').textContent=`Screen time today: ${++scrolled} min`;},60000);
function nag() {
  if(currentTheme()!=='doomscroll' || !document.hasFocus() || document.querySelector('dialog[open]'))return;
  $('dsc-break-text').textContent=`You’ve been scrolling for ${scrolled} minutes. The next reel is already loading.`;
  $('dsc-break').hidden=false;
}
setInterval(nag,360000);
$('dsc-keep').onclick=()=>$('dsc-break').hidden=true;
$('dsc-rest').onclick=()=>{$('dsc-break').hidden=true;toast('Just one more reel.');};
addEventListener('keydown',event=>{if(event.key==='Escape')$('dsc-break').hidden=true;});
const upsells=['Would you like fries with that?','Make it a Giant for 50 cents more?','Add a Thumpling to your Happy Meal?','Your order is ready. It was always ready.'];
const anchor='<svg class="ptb-anchor" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="4.5" r="2"/><path d="M12 6.5V21 M8 10h8 M4 14c0 4 3.5 7 8 7s8-3 8-7 M2.5 15.5 4 14l1.5 1.5 M18.5 15.5 20 14l1.5 1.5"/></svg>';
// Thumpback's stats in Skylanders: Giants.
$('ptb-stats').innerHTML=[['Strength',150],['Defense',150],['Agility',60],['Luck',40],['Speed',20],['Health',460]].map(([label,value])=>`<dt>${label}</dt><dd><i data-v="${value}"></i><b>${value}</b></dd>`).join('');
for(const bar of $('ptb-stats').querySelectorAll('i'))bar.style.setProperty('--v',Math.min(1,bar.dataset.v/150));
$('ptb-load').onclick=()=>$('thumpback').click();$('ptb-mini').onclick=()=>$('thumpling').click();
function accessoryIcon(slot) {
  const paths={item:'M4 9h16v11H4z M3 5h18v4H3z M12 5v15 M9 5C4 5 7 0 12 5C17 0 20 5 15 5',trap:'M8 3h8l4 7-8 11-8-11z M8 3l-1 7 5 11 5-11-1-7 M4 10h16',vehicle:'M5 8l2-4h10l2 4 M3 8h18v9H3z M5 17v3 M19 17v3 M6 12h2 M16 12h2',trophy:'M7 3h10v6a5 5 0 0 1-10 0z M7 5H3v3a4 4 0 0 0 4 4 M17 5h4v3a4 4 0 0 1-4 4 M12 14v5 M8 21h8 M9 19h6',
    Sky:'M12 3v18 M3 13l9-4 9 4 M8 20l4-2 4 2',Land:'M5 8l2-4h10l2 4 M3 8h18v9H3z M5 17v3 M19 17v3 M6 12h2 M16 12h2',Sea:'M3 13h18l-3 5H6z M12 3v10 M12 4l6 7h-6 M2 21c2-1 3-1 5 0s3 1 5 0 3-1 5 0 3 1 5 0'};
  return `<svg class="accessory-symbol" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true"><path d="${paths[slot]}"></path></svg>`;
}
function renderAccessories() {
  // SuperChargers vehicles live in the Vehicle shortcuts section.
  const slots=state.accessorySlots.filter(s=>!(s.key==='vehicle' && state.game===5)).filter(s=>state.game>=s.from || state.accessories[s.key] || (state.observed?.[s.row-1] && state.observed[s.row-1]!=='None'));
  $('accessories').innerHTML=slots.map(slot=>{
    const f=chosen(state.accessories[slot.key]),observed=state.observed?.[slot.row-1];
    const occupied=!!f || (!!observed && observed!=='None');
    const count=state.figures.filter(f=>f.accessory?.slot===slot.key).length;
    return `<article class="accessory-card ${occupied?'occupied':''}" data-slot="${slot.key}"><div class="accessory-art">${f?.art?portrait(f):accessoryIcon(slot.key)}</div><div class="accessory-content"><span class="label">${e(slot.label)}</span><h3>${e(f?name(f):occupied?observed:'Nothing placed')}</h3><div class="accessory-actions"><button class="choose-accessory" ${state.busy?'disabled':''}>${occupied?'Change':'Choose'}${!occupied?` · ${count}`:''}</button>${occupied?`<button class="remove-accessory" ${state.busy?'disabled':''}>Remove</button>`:''}</div></div></article>`;
  }).join('');
  for(const card of $('accessories').children) {
    card.querySelector('.choose-accessory').onclick=()=>openPicker({target:'accessory',slot:card.dataset.slot});
    card.querySelector('.remove-accessory')?.addEventListener('click',()=>perform(()=>api.action({target:'remove-accessory',slot:card.dataset.slot})));
  }
  const roster=$('trapped-villains'),traps=state.figures.filter(f=>f.info?.kind==='Trap').sort((a,b)=>a.info.element.localeCompare(b.info.element)||a.info.name.localeCompare(b.info.name)||a.key.localeCompare(b.key));
  roster.hidden=state.game!==4;
  if(state.game===4) {
    const otherOpen=$('villain-roster').querySelector('details')?.open || false;
    const hasVillain=f=>f.trap?.state!=='empty' && (f.trap?.state==='captured' || f.trapLabel);
    const namedForShortcuts=f=>{
      const saved=f.trapLabel,status=f.trap||{state:'unknown'};
      return !!saved?.name && status.state!=='empty' && (status.state!=='captured' || saved.recordId===null || saved.recordId===status.recordId);
    };
    const card=f=>{
      const status=f.trap||{state:'unknown'},saved=f.trapLabel;
      const changed=saved && status.state==='captured' && saved.recordId!==null && saved.recordId!==status.recordId;
      const label=status.appReset?'Ignored until contents change':status.state==='empty'?'Empty':changed?'Villain changed':saved?.name || (status.state==='captured'?'Villain detected':'Contents unknown');
      const detail=status.appReset?'Existing contents ignored by PerPortal; dump unchanged':status.state==='empty'?'Empty trap':status.state==='captured'?'Villain detected':'Contents unverified';
      const naming=status.state==='empty'?'':`<button class="name-trap" ${state.busy?'disabled':''}>${saved?'Edit name':status.state==='captured'?'Name villain':'Add name manually'}</button>`;
      return `<article class="villain-entry" data-key="${e(f.key)}"><button class="villain-card" ${state.busy?'disabled':''}><span>${e(label)}</span><small>${e(f.info.name)} · ${e(f.info.element)}</small><small>${e(detail)}${saved?' · Manual name':''}</small><small>${e(f.key)}</small></button>${naming}${changed?'<small>Update the saved name after changing villains.</small>':''}</article>`;
    };
    const detected=traps.filter(f=>hasVillain(f)&&!namedForShortcuts(f));
    const other=traps.filter(f=>!hasVillain(f)&&!namedForShortcuts(f));
    $('villain-roster').innerHTML=(detected.map(card).join('') || '<p class="roster-empty">No unnamed captured villains. Named captures are ready with Alt+↑ / Alt+↓.</p>')+(other.length?`<details class="other-traps" ${otherOpen?'open':''}><summary>Other traps (${other.length}) · empty, ignored, or unverified</summary><p>Ignored traps keep their original dump bytes. If an unverified trap contains a villain you know, you can add its name manually.</p><div class="villain-roster">${other.map(card).join('')}</div></details>`:'');
    for(const card of $('villain-roster').querySelectorAll('.villain-entry')) {
      card.querySelector('.villain-card').onclick=()=>perform(()=>api.action({target:'accessory',slot:'trap',choice:{top:card.dataset.key,bottom:null}}));
      const nameButton=card.querySelector('.name-trap');
      if(nameButton)nameButton.onclick=()=>{
        const f=figure(card.dataset.key),dialog=$('trap-name-dialog');
        dialog.dataset.key=f.key;
        $('trap-name-file').textContent=`${f.info.name} · ${f.key}`;
        $('trap-name').value=f.trapLabel?.name || '';
        dialog.showModal(); $('trap-name').focus();
      };
    }
  }
}
function compatible(f) { return f.info && f.info.game<=state.game; }
function core(f) { return f.info?.kind==='Skylander' && !/lightcore|elite/i.test(f.info.name) && (f.variant & 0x600)!==0x200; }
// Figures that can stand on a player's slot.
function playable(f) { return ['Skylander','Giant','Swapper','TrapMaster','Mini','Sensei','Crystal'].includes(f.info.kind) && !(f.info.kind==='Mini' && f.info.game<4); }
function elementalDoorFigure(f,element) { return f.info?.element===element && (state.game===4 ? f.info.kind==='TrapMaster' && f.half==='whole' : core(f)); }
function available() {
  const query=$('search').value.trim().toLowerCase();
  if(picking.target==='vehicle-shortcut')return state.figures.filter(f=>f.accessory?.type===`${picking.type} vehicle` && (!query || `${f.info.name} ${f.key}`.toLowerCase().includes(query)));
  if(picking.target==='accessory')return state.figures.filter(f=>f.accessory?.slot===picking.slot && (!query || `${f.info.name} ${f.accessory.type} ${f.info.element} ${f.key}`.toLowerCase().includes(query)));
  if(pendingTop) return state.figures.filter(f=>compatible(f) && f.half==='bottom' && (!query || `${f.info.name} ${f.key}`.toLowerCase().includes(query))).sort((a,b)=>Number(b.id===pendingTop.id-1000 && b.variant===pendingTop.variant)-Number(a.id===pendingTop.id-1000 && a.variant===pendingTop.variant));
  return state.figures.filter(f=>compatible(f) && f.half!=='bottom' && (!query || `${f.info.name} ${f.id} ${f.key}`.toLowerCase().includes(query)) && (picking.target==='sidekick' ? f.info.kind==='Mini' && f.info.game<4 : playable(f)) && (!state.elements.includes(picking.target) || elementalDoorFigure(f,picking.target)));
}
function openPicker(options) {
  if(options.target==='favorite') options={...options,preset:options.preset ?? state.profile.players[options.player].activeFavorite};
  picking=options;
  pendingTop=null;
  $('picker-title').textContent=options.target==='sidekick'?'Choose your sidekick':options.target==='direct'?`Player ${options.player+1} · choose a Skylander`:options.target==='favorite'?`Player ${options.player+1} · default preset ${options.preset+1}`:`Player ${options.player+1} · ${options.target}`;
  const accessory=options.target==='accessory' || options.target==='vehicle-shortcut';
  if(options.target==='accessory')$('picker-title').textContent=state.accessorySlots.find(s=>s.key===options.slot).label;
  if(options.target==='vehicle-shortcut')$('picker-title').textContent=`${options.type} vehicle shortcut`;
  $('search').placeholder=accessory?'Search items, elements or vehicle types':'Search Skylanders';
  $('search').value='';
  $('half-controls').hidden=true;
  renderPicker();$('picker').showModal();$('search').focus();
}
function renderPicker() {
  const options=available(),accessoryPicker=picking.target==='accessory' || picking.target==='vehicle-shortcut';$('picker-empty').hidden=!!options.length;
  $('picker-empty').textContent=accessoryPicker?'No matching accessories in your NFC library for this game. Add your own dumps and rescan in Settings.':'No compatible figures found in your NFC folder.';
  $('picker-results').classList.toggle('accessory-picker',accessoryPicker);
  $('picker-results').innerHTML=options.map(f=>`<button class="picker-item" data-key="${e(f.key)}" data-el="${e(f.info.element)}"${accessoryPicker?` title="${e(f.accessory.effect)}"`: ''}><div class="portrait">${f.half==='whole'?portrait(f):halfPortrait(f)}</div><span>${e(f.info.name)}</span><small>${e(f.info.element)} · ${pendingTop && f.id===pendingTop.id-1000 && f.variant===pendingTop.variant?'Matching bottom':e(f.info.kind)}</small>${accessoryPicker?`<small class="accessory-type">${e(f.accessory.type)}</small>`:''}<small class="filename" title="${e(f.key)}">${e(f.key.split('/').pop())}</small></button>`).join('');
  orientHalves();
  for(const button of $('picker-results').children) button.onclick=()=>perform(async()=>{
    if(pickerSaving)return;
    const f=figure(button.dataset.key);
    if(!pendingTop && f.half==='top') {
      pendingTop=f;
      $('half-controls').hidden=false;
      $('half-summary').textContent=`${name(f)} top selected. Choose a bottom to complete the figure.`;
      $('search').value='';
      renderPicker();$('search').focus();return;
    }
    const data={...picking,choice:{top:pendingTop?.key || f.key,bottom:pendingTop?f.key:null,...(picking.type?{type:picking.type}:{})}};
    pickerSaving=true;$('picker-results').inert=true;
    try {
      if(data.target==='direct' || data.target==='accessory') await api.action(data);
      else {await api.select(data);if(data.target==='sidekick') await api.action(data);}
      $('picker').close();
    } finally {pickerSaving=false;$('picker-results').inert=false;}
  });
}
$('change-top').onclick=()=>{pendingTop=null;$('half-controls').hidden=true;$('search').value='';renderPicker();$('search').focus();};
$('picker-close').onclick=()=>$('picker').close();
$('trap-name-cancel').onclick=()=>$('trap-name-dialog').close();
$('trap-name-form').onsubmit=event=>{
  event.preventDefault();
  perform(async()=>{
    const button=$('trap-name-save'); button.disabled=true;
    try {
      await api.select({target:'trap-name',choice:{top:$('trap-name-dialog').dataset.key},name:$('trap-name').value});
      $('trap-name-dialog').close();
    } finally {button.disabled=false;}
  });
};
$('search').oninput=renderPicker;
$('settings').onclick=()=>$('settings-dialog').showModal();
// Activision's character poster for the current game, in posters/<game>.jpg.
function openPoster() {
  $('poster-title').textContent=`Skylander list · ${state.games[state.game-1]}`;
  $('poster-view').classList.remove('zoomed');$('poster-zoom').hidden=false;$('poster-missing').hidden=true;
  $('poster-img').alt=`${state.games[state.game-1]} Skylander poster`;
  $('poster-img').src=`posters/${state.game}.jpg`;
  $('poster-dialog').showModal();$('poster-zoom').focus();
}
$('poster-img').onerror=()=>{$('poster-zoom').hidden=true;$('poster-missing').hidden=false;};
function zoomPoster(x=.5,y=.5) {
  const view=$('poster-view'),zoomed=view.classList.toggle('zoomed');
  $('poster-zoom').setAttribute('aria-label',zoomed?'Zoom out':'Zoom in');
  // Keep the clicked spot under the pointer.
  if(zoomed) {view.scrollLeft=x*view.scrollWidth-view.clientWidth/2;view.scrollTop=y*view.scrollHeight-view.clientHeight/2;}
}
let drag=null;
$('poster-view').onpointerdown=event=>{if($('poster-view').classList.contains('zoomed'))drag={x:event.clientX,y:event.clientY,moved:false};};
$('poster-view').onpointermove=event=>{
  if(!drag || !event.buttons)return;
  const dx=event.clientX-drag.x,dy=event.clientY-drag.y;
  if(Math.abs(dx)+Math.abs(dy)>4)drag.moved=true;
  $('poster-view').scrollBy(-dx,-dy);drag.x=event.clientX;drag.y=event.clientY;
};
$('poster-zoom').onclick=event=>{
  if(drag?.moved){drag=null;return;}
  drag=null;
  // Map the click onto the letterboxed picture. Keyboard and controller
  // clicks have no pointer position; zoom on the centre.
  const img=$('poster-img'),r=img.getBoundingClientRect(),scale=Math.min(r.width/img.naturalWidth,r.height/img.naturalHeight);
  const w=img.naturalWidth*scale,h=img.naturalHeight*scale,x=(event.clientX-r.left-(r.width-w)/2)/w,y=(event.clientY-r.top-(r.height-h)/2)/h;
  event.detail && !$('poster-view').classList.contains('zoomed')?zoomPoster(Math.min(1,Math.max(0,x)),Math.min(1,Math.max(0,y))):zoomPoster();
};
$('posters').onclick=openPoster;
$('poster-close').onclick=()=>$('poster-dialog').close();
$('to-game').onclick=()=>perform(()=>api.toGame());
$('overlay').onclick=()=>perform(()=>api.overlay());
$('settings-close').onclick=()=>$('settings-dialog').close();
$('game').onchange=()=>perform(()=>api.game(Number($('game').value)));
$('launch').onclick=()=>perform(()=>api.launch());
$('enable').onclick=()=>perform(async()=>{await api.enable();toast('Cemu portal emulation enabled.');});
$('reset-trap-detections').onclick=()=>perform(()=>api.resetTrapDetections());
$('restore-trap-backup').onclick=()=>perform(()=>api.restoreTrapBackup());
$('rescan').onclick=()=>perform(()=>api.rescan());
$('art-folder').onclick=()=>perform(()=>api.artFolder());
$('download-art').onclick=()=>perform(async()=>{const b=$('download-art');b.disabled=true;b.textContent='Downloading…';try{await api.artwork();}finally{b.disabled=false;b.textContent='Download character art · 50 MB';}});
$('art-banner-btn').onclick=()=>perform(async()=>{$('art-banner-btn').disabled=true;$('art-banner-btn').textContent='Downloading…';try{await api.artwork();$('art-banner').hidden=true;}catch(err){$('art-banner-btn').disabled=false;$('art-banner-btn').textContent='Download art · ~50 MB';throw err;}});
$('art-banner-dismiss').onclick=()=>{artBannerDismissed=true;$('art-banner').hidden=true;};
$('thumpback').onclick=()=>perform(()=>api.action({player:0,target:'thumpback'}));
$('remove-vehicle').onclick=()=>perform(()=>api.action({target:'remove-accessory',slot:'vehicle'}));
$('thumpling').onclick=()=>perform(()=>api.action({target:'thumpling'}));
for(let p=0;p<2;p++) $(`tab-${p}`).onclick=()=>{player=p;render();};
// Controller: stick/d-pad moves focus to the nearest control in that
// direction, A activates, B closes a dialog, L1/R1 switch player tabs and
// View/Create returns to Cemu.
const readPad=Pad.reader({stickAsDpad:true});
function focusables() {
  const scope=document.querySelector('dialog[open]') || document;
  return [...scope.querySelectorAll('button,select,input,summary')].filter(el=>!el.disabled && !el.closest('[inert]') && el.getClientRects().length);
}
function moveFocus(direction) {
  const list=focusables(),current=document.activeElement;
  if(!list.includes(current)) {list[0]?.focus();return;}
  const center=el=>{const r=el.getBoundingClientRect();return [r.x+r.width/2,r.y+r.height/2];};
  const [ax,ay]=center(current),[dx,dy]={UP:[0,-1],DOWN:[0,1],LEFT:[-1,0],RIGHT:[1,0]}[direction];
  let best=null,score=Infinity;
  for(const el of list) {
    if(el===current)continue;
    const [x,y]=center(el),along=(x-ax)*dx+(y-ay)*dy,across=Math.abs((x-ax)*dy-(y-ay)*dx);
    if(along>1 && along+across*2<score) {score=along+across*2;best=el;}
  }
  if(best) {best.focus();best.scrollIntoView({block:'nearest',inline:'nearest'});}
}
function activate(el) {
  if(el instanceof HTMLSelectElement) {el.selectedIndex=(el.selectedIndex+1)%el.options.length;el.dispatchEvent(new Event('change'));}
  else if(el instanceof HTMLInputElement) el.focus();
  else el?.click();
}
setInterval(()=>{
  const input=readPad(navigator.getGamepads(),performance.now());
  if(!document.hasFocus() || !input.pressed.size)return;
  document.body.classList.add('pad');
  $('to-game-key').textContent=Pad.labels[input.family].B;
  const pressed=input.pressed,dialog=document.querySelector('dialog[open]');
  // A zoomed poster pans with the stick instead of moving focus.
  const panning=dialog?.id==='poster-dialog' && $('poster-view').classList.contains('zoomed');
  for(const direction of ['UP','DOWN','LEFT','RIGHT']) if(pressed.has(direction)) {
    if(panning) $('poster-view').scrollBy(...{UP:[0,-160],DOWN:[0,160],LEFT:[-160,0],RIGHT:[160,0]}[direction]);
    else moveFocus(direction);
  }
  if(pressed.has('A')) activate(focusables().includes(document.activeElement)?document.activeElement:null);
  // B backs out: first out of a dialog, then out of the GUI to the game.
  if(pressed.has('B')) dialog?dialog.close():perform(()=>api.toGame());
  if(!dialog && (pressed.has('L1') || pressed.has('R1'))) $(`tab-${pressed.has('R1')?1:0}`).click();
  if(pressed.has('VIEW')) perform(()=>api.toGame());
},33);
addEventListener('mousemove',()=>document.body.classList.remove('pad'));
// Themes. The choice is remembered in this computer's browser storage.
const themes=[
  {id:'default',name:'Dè Dusk over Skylands',about:'The original look: painted sky, lapis panels and gold rims.'},
  {id:'game',name:'Match the game',about:'Changes with the game you pick: each Skylanders game gets its own look.'},
  {id:'spyros-adventure',name:'Dè Book of Eon',about:'Spyro’s Adventure. Parchment pages from Eon’s book under the Core of Light.'},
  {id:'giants',name:'Dè Arkeyan Forge',about:'Giants. Riveted iron, molten seams and giant-sized Skylanders.'},
  {id:'swap-force',name:'Dè Woodburrow',about:'Swap Force. Carved wood in daylight, every panel split into a top and a bottom.'},
  {id:'trap-team',name:'Dè Cloudcracker Prison',about:'Trap Team. Prison stone with Traptanium crystal cut into every slot.'},
  {id:'superchargers',name:'Dè Rift Garage',about:'SuperChargers. Tread plate, racing stripes and everything leaning into the turn.'},
  {id:'imaginators',name:'Dè Mind Magic',about:'Imaginators. Holographic Imaginite and a creator’s marker scribbles.'},
  {id:'thumpback',name:'Dè perThumpback',about:'Everything Thumpback: the Phantom Tide’s deck, rope and fishing nets, whale-blue waves and his ship’s log. Hail to the Whale!'},
  {id:'singularity',name:'Dè Cell to Singularity',about:'From a single cell to the stars: glowing Tree of Life nodes over a sleeping Earth, and entropy that never stops growing.'},
  {id:'mcdonald',name:'Dè PerMCdonald',about:'A fast-food order kiosk: red and yellow, numbered combos for your element shortcuts, and a Now serving board. The ice cream machine is broken.'},
  {id:'doomscroll',name:'Dè perDoomScroll',about:'Your portal as a vertical feed: Skylanders as reels with likes and comments, For You tabs, and a screen time counter that only goes up.'},
  {id:'fishbet',name:'Dè FishBet',about:'A deep-sea betting parody. Free spins included, money not.'}];
// Game numbers 1–6 in the order of the six game themes above.
const gameThemes=themes.slice(2,8).map(t=>t.id);
let themeIndex=0,themeChoice='default';
function currentTheme() { return document.body.dataset.theme; }
function applyTheme() {
  document.body.dataset.theme=themeChoice==='game'?gameThemes[(state?.game || 1)-1]:themeChoice;
  // Shared rules in themes/games.css paint every theme except the default and FishBet.
  document.body.classList.toggle('skin',!['default','fishbet'].includes(document.body.dataset.theme));
}
function setTheme(id) {
  themeChoice=id;applyTheme();
  try {localStorage.setItem('theme',id);} catch {}
  if(id==='fishbet' && state) {fillWins();setTimeout(offer,1500);}
}
try {const saved=localStorage.getItem('theme');if(themes.some(t=>t.id===saved))themeChoice=saved;} catch {}
applyTheme();
$('theme-track').innerHTML=themes.map(t=>`<figure class="theme-slide"><img src="themes/${t.id}.jpg" alt="${e(t.name)} preview"><figcaption><strong>${e(t.name)}</strong><span>${e(t.about)}</span></figcaption></figure>`).join('');
$('theme-dots').innerHTML=themes.map(()=>'<i></i>').join('');
function showTheme(i) {
  themeIndex=(i+themes.length)%themes.length;
  $('theme-track').style.translate=`${-100*themeIndex}% 0`;
  [...$('theme-dots').children].forEach((dot,j)=>dot.classList.toggle('on',j===themeIndex));
  const inUse=themes[themeIndex].id===themeChoice;
  $('theme-apply').disabled=inUse;$('theme-apply').textContent=inUse?'In use':'Use this theme';
}
$('theme').onclick=()=>{showTheme(themes.findIndex(t=>t.id===themeChoice));$('theme-dialog').showModal();$('theme-next').focus();};
$('theme-prev').onclick=()=>showTheme(themeIndex-1);
$('theme-next').onclick=()=>showTheme(themeIndex+1);
$('theme-dialog').onkeydown=event=>{if(event.key==='ArrowLeft')showTheme(themeIndex-1);if(event.key==='ArrowRight')showTheme(themeIndex+1);};
$('theme-close').onclick=()=>$('theme-dialog').close();
$('theme-apply').onclick=()=>{setTheme(themes[themeIndex].id);$('theme-dialog').close();toast(`Theme: ${themes[themeIndex].name}`);};
// Dè FishBet: betting-site dressing that does nothing, plus one real button
// that loads a random Skylander.
const pick=list=>list[Math.floor(Math.random()*list.length)];
const promos=[['Portal welcome bonus','100% up to 500 gems + 200 free spins','Gems are imaginary. So are the spins.'],['Weekly jackpot','Win Kaos’s entire fortune','Kaos has no fortune.'],['Element cashback','10% back on every lost Skylander','Skylanders cannot be lost. Check under the couch.'],['Double or nothing','Bet your Thumpback, win two Thumpbacks','There is only one Thumpback.']];
let promo=0;
function showPromo(i) {
  promo=(i+promos.length)%promos.length;
  [$('fb-chip').textContent,$('fb-headline').textContent,$('fb-fine').textContent]=promos[promo];
  $('fb-dots').innerHTML=promos.map((_,j)=>`<i class="${j===promo?'on':''}"></i>`).join('');
}
showPromo(0);
$('fb-prev').onclick=()=>showPromo(promo-1);$('fb-next').onclick=()=>showPromo(promo+1);
setInterval(()=>{if(currentTheme()==='fishbet' && !matchMedia('(prefers-reduced-motion: reduce)').matches)showPromo(promo+1);},8000);
function fillWins() {
  const names=[...new Set(state.figures.filter(f=>f.info && playable(f)).map(name))];
  const wins=Array.from({length:14},()=>`<span><b>${pick(['Kaos','Glumshanks','Hugo','Flynn','Cali','Eon','Tessa','Buzz','Persephone','Mags'])}</b> won <em>${pick([2,5,10,25,50,100,250,1000])}×</em> on ${e(names.length?pick(names):'Spyro')}</span>`).join('');
  $('fb-wins').innerHTML=wins+wins; // twice, so the marquee loops without a gap
}
const spinning=[false,false];
function spin(p) {
  const bottoms=state.figures.filter(f=>compatible(f) && f.half==='bottom');
  const pool=state.figures.filter(f=>compatible(f) && playable(f) && (f.half==='whole' || (f.half==='top' && bottoms.length)));
  if(!pool.length) {toast('No compatible Skylanders in your NFC folder to spin.');return;}
  const top=pick(pool),bottom=top.half==='top'?pick(bottoms):null,button=$(`spin-${p}`),label=button.textContent;
  spinning[p]=true;button.disabled=true;button.classList.add('reeling');
  const reel=setInterval(()=>button.textContent=name(pick(pool)),70);
  setTimeout(()=>{
    clearInterval(reel);spinning[p]=false;button.classList.remove('reeling');button.textContent=label;button.disabled=state.busy;
    perform(()=>api.action({player:p,target:'direct',choice:{top:top.key,bottom:bottom?.key ?? null}}));
  },matchMedia('(prefers-reduced-motion: reduce)').matches?0:1200);
}
for(let p=0;p<2;p++) $(`spin-${p}`).onclick=()=>spin(p);
const offers=[
  ['🎁','Welcome bonus unlocked!','Deposit 0 gems and we will match it. 100%. Every single one.','Claim bonus','Bonus credited: 0 gems. Wagering requirement: 9,999×.'],
  ['🔥','You’re on a hot streak!','The portal is glowing. Statistically that means nothing, but it looks great.','Keep it going','Streak extended. It was already infinite.'],
  ['💸','Cash out now','Balance: 0.00 gems. Minimum withdrawal: 1,000,000 gems.','Withdraw','Withdrawal pending. Estimated arrival: the next Skylanders game.'],
  ['👑','VIP invitation','Kaos has personally selected you for the Platinum Doom Club.','Accept invitation','Welcome to the club. There are no benefits.'],
  ['⏰','200 free spins expire soon','Use them before they expire, which is never, because they do not exist.','Use free spins','0 free spins used. 200 remaining. Forever.']];
let offerDone='';
function offer() {
  if(currentTheme()!=='fishbet' || document.querySelector('dialog[open]'))return;
  let text;[$('fb-popup-icon').textContent,$('fb-popup-title').textContent,text,$('fb-popup-cta').textContent,offerDone]=pick(offers);
  $('fb-popup-text').textContent=text;$('fb-popup').hidden=false;
}
$('fb-popup-close').onclick=()=>$('fb-popup').hidden=true;
$('fb-popup-cta').onclick=()=>{$('fb-popup').hidden=true;toast(offerDone);};
addEventListener('keydown',event=>{if(event.key==='Escape')$('fb-popup').hidden=true;});
document.addEventListener('click',event=>{if(event.target.closest('[data-fake]'))offer();});
// An offer now and then, only while the window is in front.
setInterval(()=>{if(document.hasFocus() && $('fb-popup').hidden)offer();},240000);
setTimeout(()=>{if(document.hasFocus())offer();},20000);
// Dè Cell to Singularity: idle-game counters that only go up. Entropy grows
// every second, each figure landing on the portal is a new idea, and past a
// decillion the simulation reaches the singularity and starts over.
let entropy=0,ideas=0;
try {[entropy,ideas]=JSON.parse(localStorage.getItem('singularity')) || [0,0];} catch {}
const scale=['','Thousand','Million','Billion','Trillion','Quadrillion','Quintillion','Sextillion','Septillion','Octillion','Nonillion','Decillion'];
function huge(n) {
  const k=Math.min(scale.length-1,Math.floor(Math.log10(Math.max(n,1))/3));
  return k?`${(n/1000**k).toFixed(2)} ${scale[k]}`:String(Math.floor(n));
}
setInterval(()=>{
  if(currentTheme()!=='singularity')return;
  entropy=entropy*1.02+1+ideas*3;
  if(entropy>=1e36) {entropy=0;toast('Singularity reached. The simulation starts over from a single cell.');}
  $('cts-entropy').textContent=huge(entropy);$('cts-ideas').textContent=huge(ideas);
  try {localStorage.setItem('singularity',JSON.stringify([entropy,ideas]));} catch {}
},1000);
api.onState(next=>{state=next;render();});
api.state().then(next=>{state=next;render();}).catch(error=>toast(error.message));
