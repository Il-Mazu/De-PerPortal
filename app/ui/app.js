'use strict';
const api=window.skyportal;
let state,player=0,picking=null,pendingTop=null,pickerSaving=false,toastTimer,artBannerDismissed=false;
const $=id=>document.getElementById(id);
const colors={Magic:'#bd9ded',Water:'#71c3e4',Tech:'#eac46b',Fire:'#f58d68',Earth:'#bd9671',Life:'#9bd47c',Air:'#b7d7e4',Undead:'#baabde',Light:'#eee4a2',Dark:'#a69aca'};
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
  $('connection').textContent=connected?'Cemu connected':state.session.pid?'Unsupported Cemu':'Waiting for Cemu';
  $('connection').parentElement.classList.toggle('connected',connected);
  $('game').innerHTML=state.games.map((g,i)=>`<option value="${i+1}">${e(g)}</option>`).join('');
  $('game').value=state.game;$('game').disabled=state.detected || state.busy;
  $('auto-label').textContent=state.detected?'Detected':'Manual profile';
  $('launch').disabled=!!state.session.pid;
  const thump=state.figures.find(f=>f.id===107);
  $('thump-art').innerHTML=thump?.art?portrait(thump):'⚓';
  $('thumpback').disabled=state.busy || !thump || state.game<2;
  $('thumpback').title=state.game<2?'Available in Giants and later':'Load Thumpback for Player 1 · Alt+T';
  $('thumpling').disabled=state.busy || !state.figures.some(f=>f.id===541 && f.info?.game<4 && compatible(f));
  for(let p=0;p<2;p++) {
    const current=state.active[p],f=chosen(current),favorite=state.profile.players[p].favorite,ff=chosen(favorite);
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
  $('portal-count').textContent=`${state.active.filter(Boolean).length} / 2 PLAYERS ACTIVE`;
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
  $('status').textContent=state.message;
  $('library-count').textContent=`${state.figures.length} figures in your library`;
  $('root-path').textContent=state.root;
  $('warnings').textContent=state.warnings.length?state.warnings.join('\n'):'All figure headers recognized.';
  // Show art download banner on first run when no art is available
  if(!artBannerDismissed) $('art-banner').hidden=state.hasArt;
  for(const edit of document.querySelectorAll('.edit'))edit.textContent='Edit';
  orientHalves();
}
function compatible(f) { return f.info && f.info.game<=state.game; }
function core(f) { return f.info?.kind==='Skylander' && !/lightcore|elite/i.test(f.info.name) && (f.variant & 0x600)!==0x200; }
function available() {
  const query=$('search').value.trim().toLowerCase();
  if(pendingTop) return state.figures.filter(f=>compatible(f) && f.half==='bottom' && (!query || `${f.info.name} ${f.key}`.toLowerCase().includes(query))).sort((a,b)=>Number(b.id===pendingTop.id-1000 && b.variant===pendingTop.variant)-Number(a.id===pendingTop.id-1000 && a.variant===pendingTop.variant));
  return state.figures.filter(f=>compatible(f) && f.half!=='bottom' && (!query || `${f.info.name} ${f.id} ${f.key}`.toLowerCase().includes(query)) && (picking.target==='sidekick' ? f.info.kind==='Mini' && f.info.game<4 : ['Skylander','Giant','Swapper','TrapMaster','Mini','Sensei'].includes(f.info.kind) && !(f.info.kind==='Mini' && f.info.game<4)) && (!state.elements.includes(picking.target) || (core(f) && f.info.element===picking.target)));
}
function openPicker(options) {
  picking=options;
  pendingTop=null;
  $('picker-title').textContent=options.target==='sidekick'?'Choose your sidekick':options.target==='direct'?`Player ${options.player+1} · choose a Skylander`:options.target==='favorite'?`Player ${options.player+1} · default Skylander`:`Player ${options.player+1} · ${options.target}`;
  $('search').value='';
  $('half-controls').hidden=true;
  renderPicker();$('picker').showModal();$('search').focus();
}
function renderPicker() {
  const options=available();$('picker-empty').hidden=!!options.length;
  $('picker-results').innerHTML=options.map(f=>`<button class="picker-item" data-key="${e(f.key)}"><div class="portrait">${f.half==='whole'?portrait(f):halfPortrait(f)}</div><span>${e(f.info.name)}</span><small>${e(f.info.element)} · ${pendingTop && f.id===pendingTop.id-1000 && f.variant===pendingTop.variant?'Matching bottom':e(f.info.kind)}</small><small class="filename" title="${e(f.key)}">${e(f.key.split('/').pop())}</small></button>`).join('');
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
      if(data.target==='direct') await api.action(data);
      else {await api.select(data);if(data.target==='sidekick') await api.action(data);}
      $('picker').close();
    } finally {pickerSaving=false;$('picker-results').inert=false;}
  });
}
$('change-top').onclick=()=>{pendingTop=null;$('half-controls').hidden=true;$('search').value='';renderPicker();$('search').focus();};
$('picker-close').onclick=()=>$('picker').close();
$('search').oninput=renderPicker;
$('settings').onclick=()=>$('settings-dialog').showModal();
$('settings-close').onclick=()=>$('settings-dialog').close();
$('game').onchange=()=>perform(()=>api.game(Number($('game').value)));
$('launch').onclick=()=>perform(()=>api.launch());
$('enable').onclick=()=>perform(async()=>{await api.enable();toast('Cemu portal emulation enabled.');});
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
