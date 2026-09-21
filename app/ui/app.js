'use strict';
const api=window.dePerPortal;
let state,player=0,picking=null,pendingTop=null,pickerSaving=false,toastTimer,artBannerDismissed=false;
const $=id=>document.getElementById(id);
const colors={Magic:'#bd9ded',Water:'#71c3e4',Tech:'#eac46b',Fire:'#f58d68',Earth:'#bd9671',Life:'#9bd47c',Air:'#b7d7e4',Undead:'#baabde',Light:'#eee4a2',Dark:'#a69aca'};
const portals={1:['portal.png','Original stone portal'],2:['portal.png','Giants · stone portal'],3:['portals/swap-force.png','Swap Force · arched portal'],4:['portals/trap-team.png','Trap Team · Traptanium portal'],5:['portals/superchargers.png','SuperChargers · engine portal'],6:['portals/swap-force.png','Imaginators · arched portal']};
const icons={Magic:'✦',Water:'◈',Tech:'⚙',Fire:'♨',Earth:'◆',Life:'❧',Air:'≋',Undead:'☽',Light:'☀',Dark:'◐'};
const e=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const figure=key=>state.figures.find(f=>f.key===key);
const name=f=>f?.info?.name?.replace(/ \((Top|Bottom)\)$/,'') || (f?'Unknown figure':'Choose a Skylander');
function portrait(f,empty='+') { return f?.art?`<img src="${e(f.art)}" alt="${e(name(f))}" loading="lazy">`:`<span class="placeholder">${f?icons[f.info?.element] || '◈':empty}</span>`; }
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
  document.body.classList.toggle('busy',state.busy);
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
  $('thumpling').disabled=state.busy || !state.figures.some(f=>f.id===541 && f.info?.game<4 && compatible(f));
  for(let p=0;p<2;p++) {
    const defaults=state.profile.players[p],current=state.active[p],f=chosen(current),favorite=defaults.favorite,ff=chosen(favorite);
    const tone=colors[f?.info?.element] || '#829798';
    document.body.style.setProperty(`--player-${p}`,tone);
    $(`player-${p}`).style.setProperty('--player-color',tone);
    $(`player-${p}`).dataset.element=f?.info?.element || '';
    document.querySelector(p?'.aura-two':'.aura-one').classList.toggle('is-active',!!f);
    $(`player-${p}`).innerHTML=`<div class="player-label"><b>0${p+1}</b> PLAYER ${p+1}</div><button class="active-card" title="Choose Player ${p+1}’s active Skylander"><div class="portrait">${art(current)}</div><span class="active-name">${e(f?name(f):'Choose Skylander')}</span><span class="figure-meta">${e(f?`${f.info?.element||''} · ${current?.bottom?'Swap combination':f.info?.kind||'Skylander'}`:'Click to load a figure')}</span></button>${f?'<button class="remove">Remove from portal</button>':''}`;
    $(`player-${p}`).querySelector('.active-card').onclick=()=>openPicker({player:p,target:'direct'});
    const observed=state.observed?.[p*2];
    if(!f && observed && observed!=='None') {
      $(`player-${p}`).querySelector('.active-name').textContent=observed;
      $(`player-${p}`).querySelector('.figure-meta').textContent='Loaded through Cemu';
      const remove=document.createElement('button');remove.className='remove';remove.textContent='Remove from portal';$(`player-${p}`).append(remove);
    }
    $(`player-${p}`).querySelector('.remove')?.addEventListener('click',()=>perform(()=>api.action({player:p,target:'remove'})));
    $(`favorite-${p}`).innerHTML=`<span class="label">PLAYER ${p+1} DEFAULT</span><button class="edit" aria-label="Change Player ${p+1} default">Edit</button><button class="load-favorite" title="Return to Player ${p+1} default"><div class="portrait">${portrait(ff)}</div><span class="name">${e(ff?name(ff):'Choose default')}</span><div class="shortcut"><kbd>ALT</kbd> ${p?'+ <kbd>SHIFT</kbd> ':''}+ <kbd>0</kbd></div></button>`;
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
  const side=chosen(state.sidekick);
  $('sidekick').innerHTML=`<button title="Choose a sidekick"><div class="portrait">${portrait(side,'+')}</div><span class="name">${e(side?name(side):'Add sidekick')}</span></button><span class="label">SIDEKICK</span>`;
  $('sidekick').querySelector('button').onclick=()=>openPicker({target:'sidekick'});
  if(side || (state.observed?.[4] && state.observed[4]!=='None')) {
    if(!side)$('sidekick').querySelector('.name').textContent=state.observed[4];
    const remove=document.createElement('button');remove.className='remove';remove.textContent='Remove';remove.onclick=()=>perform(()=>api.action({target:'remove-sidekick'}));$('sidekick').append(remove);
  }
  for(let p=0;p<2;p++) $(`tab-${p}`).classList.toggle('selected',p===player);
  $('elements').innerHTML=state.elements.map((element,i)=>{
    const c=state.profile.players[player].elements[element],f=chosen(c);
    return `<div class="element-card" data-element="${element}"><button class="element-load" title="${f?`Load ${e(name(f))}`:`Choose ${element} figure`}"><span class="element-label">${element}</span><div class="portrait">${portrait(f,icons[element])}</div><span class="name">${e(f?name(f):'Not assigned')}</span></button><span class="slot-key">${i===9?'−':i+1}</span><button class="edit" aria-label="Change ${element} Skylander">Edit</button></div>`;
  }).join('');
  for(const card of $('elements').children) {
    const el=card.dataset.element; card.style.setProperty('--color',colors[el]);
    card.querySelector('.edit').onclick=()=>openPicker({player,target:el});
    card.querySelector('.element-load').onclick=()=>state.profile.players[player].elements[el]?perform(()=>api.action({player,target:el})):openPicker({player,target:el});
  }
  const showPerks=state.game===3;
  $('perks-section').hidden=!showPerks;
  if(showPerks) {
    $('perks-player').textContent=`PLAYER ${player+1}`;
    $('perks').innerHTML=state.perks.map(perk=>{
      const bottom=state.figures.find(f=>f.id===perk.id && f.half==='bottom' && f.variant===8192) || state.figures.find(f=>f.id===perk.id && f.half==='bottom');
      return `<div class="perk-card"><button class="perk-load" data-key="${perk.key}" title="Load ${e(perk.name)} base for Player ${player+1}"><span class="element-label">${e(perk.name)}</span><div class="portrait">${bottom?halfPortrait(bottom):'<span class="placeholder">◈</span>'}</div><span class="name">${e(bottom?name(bottom):'Base not found')}</span></button><span class="slot-key">${perk.key}</span></div>`;
    }).join('');
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
function accessoryIcon(slot) {
  const paths={item:'M4 9h16v11H4z M3 5h18v4H3z M12 5v15 M9 5C4 5 7 0 12 5C17 0 20 5 15 5',trap:'M8 3h8l4 7-8 11-8-11z M8 3l-1 7 5 11 5-11-1-7 M4 10h16',vehicle:'M5 8l2-4h10l2 4 M3 8h18v9H3z M5 17v3 M19 17v3 M6 12h2 M16 12h2',trophy:'M7 3h10v6a5 5 0 0 1-10 0z M7 5H3v3a4 4 0 0 0 4 4 M17 5h4v3a4 4 0 0 1-4 4 M12 14v5 M8 21h8 M9 19h6'};
  return `<svg class="accessory-symbol" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true"><path d="${paths[slot]}"></path></svg>`;
}
function renderAccessories() {
  const slots=state.accessorySlots.filter(s=>state.game>=s.from || state.accessories[s.key] || (state.observed?.[s.row-1] && state.observed[s.row-1]!=='None'));
  $('accessories').innerHTML=slots.map(slot=>{
    const f=chosen(state.accessories[slot.key]),observed=state.observed?.[slot.row-1];
    const occupied=!!f || (!!observed && observed!=='None');
    const count=state.figures.filter(f=>f.accessory?.slot===slot.key).length;
    return `<article class="accessory-card ${occupied?'occupied':''}" data-slot="${slot.key}"><div class="accessory-art">${f?.art?portrait(f):accessoryIcon(slot.key)}</div><div class="accessory-content"><span class="label">${e(slot.key==='vehicle' && state.game===5?'Shared vehicle':slot.label)}</span><h3>${e(f?name(f):occupied?observed:'Nothing placed')}</h3><div class="accessory-actions"><button class="choose-accessory" ${state.busy?'disabled':''}>${occupied?'Change':'Choose'}${!occupied?` · ${count}`:''}</button>${occupied?`<button class="remove-accessory" ${state.busy?'disabled':''}>Remove</button>`:''}</div></div></article>`;
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
function elementalDoorFigure(f,element) { return f.info?.element===element && (state.game===4 ? f.info.kind==='TrapMaster' && f.half==='whole' : core(f)); }
function available() {
  const query=$('search').value.trim().toLowerCase();
  if(picking.target==='accessory')return state.figures.filter(f=>f.accessory?.slot===picking.slot && (!query || `${f.info.name} ${f.accessory.type} ${f.info.element} ${f.key}`.toLowerCase().includes(query)));
  if(pendingTop) return state.figures.filter(f=>compatible(f) && f.half==='bottom' && (!query || `${f.info.name} ${f.key}`.toLowerCase().includes(query))).sort((a,b)=>Number(b.id===pendingTop.id-1000 && b.variant===pendingTop.variant)-Number(a.id===pendingTop.id-1000 && a.variant===pendingTop.variant));
  return state.figures.filter(f=>compatible(f) && f.half!=='bottom' && (!query || `${f.info.name} ${f.id} ${f.key}`.toLowerCase().includes(query)) && (picking.target==='sidekick' ? f.info.kind==='Mini' && f.info.game<4 : ['Skylander','Giant','Swapper','TrapMaster','Mini','Sensei','Crystal'].includes(f.info.kind) && !(f.info.kind==='Mini' && f.info.game<4)) && (!state.elements.includes(picking.target) || elementalDoorFigure(f,picking.target)));
}
function openPicker(options) {
  if(options.target==='favorite') options={...options,preset:options.preset ?? state.profile.players[options.player].activeFavorite};
  picking=options;
  pendingTop=null;
  $('picker-title').textContent=options.target==='sidekick'?'Choose your sidekick':options.target==='direct'?`Player ${options.player+1} · choose a Skylander`:options.target==='favorite'?`Player ${options.player+1} · default preset ${options.preset+1}`:`Player ${options.player+1} · ${options.target}`;
  const accessory=options.target==='accessory';
  if(accessory)$('picker-title').textContent=state.accessorySlots.find(s=>s.key===options.slot).label;
  $('search').placeholder=accessory?'Search items, elements or vehicle types':'Search Skylanders';
  $('search').value='';
  $('half-controls').hidden=true;
  renderPicker();$('picker').showModal();$('search').focus();
}
function renderPicker() {
  const options=available();$('picker-empty').hidden=!!options.length;
  $('picker-empty').textContent=picking.target==='accessory'?'No matching accessories in your NFC library for this game. Add your own dumps and rescan in Settings.':'No compatible figures found in your NFC folder.';
  $('picker-results').classList.toggle('accessory-picker',picking.target==='accessory');
  $('picker-results').innerHTML=options.map(f=>`<button class="picker-item" data-key="${e(f.key)}"${picking.target==='accessory'?` title="${e(f.accessory.effect)}"`: ''}><div class="portrait">${f.half==='whole'?portrait(f):halfPortrait(f)}</div><span>${e(f.info.name)}</span><small>${e(f.info.element)} · ${pendingTop && f.id===pendingTop.id-1000 && f.variant===pendingTop.variant?'Matching bottom':e(f.info.kind)}</small>${picking.target==='accessory'?`<small class="accessory-type">${e(f.accessory.type)}</small>`:''}<small class="filename" title="${e(f.key)}">${e(f.key.split('/').pop())}</small></button>`).join('');
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
    const data={...picking,choice:{top:pendingTop?.key || f.key,bottom:pendingTop?f.key:null}};
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
$('thumpling').onclick=()=>perform(()=>api.action({target:'thumpling'}));
for(let p=0;p<2;p++) $(`tab-${p}`).onclick=()=>{player=p;render();};
api.onState(next=>{state=next;render();});
api.state().then(next=>{state=next;render();}).catch(error=>toast(error.message));
