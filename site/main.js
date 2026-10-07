'use strict';
const $ = id => document.getElementById(id);
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

// Element order and keys follow the app: 1-9 then minus.
const ELEMENTS = [
  ['Magic', '#b76cf2', ['Spyro', 'Wrecking Ball', 'Voodood', 'Double Trouble', 'Pop Fizz']],
  ['Water', '#3fa9f5', ['Gill Grunt', 'Slam Bam', 'Zap', 'Wham-Shell', 'Thumpback']],
  ['Tech', '#f5a524', ['Trigger Happy', 'Drobot', 'Drill Sergeant', 'Boomer', 'Sprocket']],
  ['Fire', '#ff6a3d', ['Eruptor', 'Ignitor', 'Flameslinger', 'Sunburn', 'Hot Dog']],
  ['Earth', '#b88346', ['Bash', 'Terrafin', 'Prism Break', 'Dino-Rang', 'Crusher']],
  ['Life', '#68d445', ['Stealth Elf', 'Stump Smash', 'Camo', 'Zook', 'Tree Rex']],
  ['Air', '#8fdcff', ['Whirlwind', 'Sonic Boom', 'Warnado', 'Lightning Rod', 'Jet-Vac']],
  ['Undead', '#a59ac8', ['Chop Chop', 'Cynder', 'Hex', 'Ghost Roaster', 'Fright Rider']],
  ['Light', '#ffe36b', ['Knight Light', 'Spotlight', 'Blaster-Tron']],
  ['Dark', '#7b62d6', ['Knight Mare', 'Blackout', 'Nightfall']],
];
const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '-'];
const color = el => ELEMENTS.find(e => e[0] === el)[1];
const el = (tag, cls, attrs = {}) => Object.assign(document.createElement(tag), cls ? { className: cls } : {}, attrs);
// Each element's lead Skylander has a full render; everyone else shows the app's character card.
const RENDERS = ['Spyro', 'Gill Grunt', 'Trigger Happy', 'Eruptor', 'Bash', 'Stealth Elf', 'Whirlwind', 'Chop Chop', 'Knight Light', 'Knight Mare', 'Thumpback'];
const slug = name => name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
const card = name => `assets/cards/${slug(name)}.webp`;
const art = name => RENDERS.includes(name) ? `assets/renders/${slug(name)}.webp` : card(name);
const sigil = (e, cls) => { const i = el('i', cls); i.dataset.el = e; i.setAttribute('aria-hidden', 'true'); return i; };

/* ---------- The portal ---------- */
const players = [{ el: 'Magic', name: 'Spyro', home: ['Magic', 'Spyro'] }, { el: 'Fire', name: 'Eruptor', home: ['Magic', 'Double Trouble'] }];
let active = 0;
const figs = [$('fig1'), $('fig2')];
const dial = $('dial');
const coins = ELEMENTS.map(([name], n) => {
  const li = el('li');
  li.style.setProperty('--a', `${-81 + n * 18}deg`);
  li.style.setProperty('--n', n);
  const b = el('button', 'coin', { type: 'button', title: `${name} (${KEYS[n]})` });
  b.dataset.el = name;
  b.setAttribute('aria-label', `Load a ${name} Skylander`);
  b.append(sigil(name));
  b.onclick = () => load(active, name);
  li.append(b); dial.append(li);
  return b;
});

let toastTimer;
function toast(text, c) {
  const t = $('toast');
  t.textContent = text;
  t.style.setProperty('--tc', c || '#25318a');
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
}

function paint() {
  const root = document.documentElement.style;
  root.setProperty('--p1', color(players[0].el));
  root.setProperty('--p2', color(players[1].el));
  players.forEach((p, i) => {
    figs[i].dataset.el = p.el;
    figs[i].setAttribute('aria-label', `Player ${i + 1}: ${p.name}`);
    const img = figs[i].querySelector('img');
    if (!img.src.endsWith(art(p.name))) img.src = art(p.name);
    figs[i].classList.toggle('is-card', !RENDERS.includes(p.name));
  });
  coins.forEach(c => c.classList.toggle('on', c.dataset.el === players[active].el));
}

function load(p, element, name) {
  const pool = ELEMENTS.find(e => e[0] === element)[2];
  // Like the app's element shortcut: the next Skylander of that element.
  if (!name) name = players[p].el === element ? pool[(pool.indexOf(players[p].name) + 1) % pool.length] : pool[0];
  players[p].el = element; players[p].name = name;
  const c = color(element);
  $('portal').parentElement.style.setProperty('--ring', c);
  paint();
  toast(`Player ${p + 1}: ${name}`, c);
  if (reduced) return;
  figs[p].animate([{ translate: '0 -90%', opacity: 0 }, { translate: '0 4%', opacity: 1, offset: .7 }, { translate: '0 0' }], { duration: 560, easing: 'cubic-bezier(.3,1.4,.5,1)' });
  const f = $('flash');
  f.style.setProperty('--fc', c);
  f.style.left = p ? '67%' : '33%';
  f.animate([{ opacity: .9, transform: 'translate(-50%,-50%) scale(.2)' }, { opacity: 0, transform: 'translate(-50%,-50%) scale(1.5)' }], { duration: 650, delay: 260, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'backwards' });
}

function setPlayer(p) {
  active = p;
  document.querySelectorAll('.pl').forEach(b => { const on = +b.dataset.p === p; b.classList.toggle('on', on); b.setAttribute('aria-selected', on); });
  paint();
}
document.querySelectorAll('.pl').forEach(b => b.onclick = () => setPlayer(+b.dataset.p));
paint();
$('portal').parentElement.style.setProperty('--ring', color(players[0].el));

// The plastic window catches the light as the pointer moves.
const win = $('window');
let sheenFrame;
win.addEventListener('pointermove', e => {
  if (sheenFrame) return;
  sheenFrame = requestAnimationFrame(() => {
    sheenFrame = 0;
    const r = win.getBoundingClientRect();
    win.style.setProperty('--mx', `${((e.clientX - r.left) / r.width - .5) * 40}%`);
  });
});

/* ---------- Keys: 1-9 and minus load an element, Shift for Player 2, 0 the default, T for Thumpback ---------- */
document.addEventListener('keydown', e => {
  if (e.ctrlKey || e.metaKey || e.repeat || /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
  const code = e.code;
  const n = code === 'Minus' ? 9 : /^Digit[1-9]$/.test(code) ? +code[5] - 1 : -1;
  const p = e.shiftKey ? 1 : 0;
  if (n >= 0) { e.preventDefault(); load(p, ELEMENTS[n][0]); }
  else if (code === 'Digit0') { e.preventDefault(); load(p, ...players[p].home); }
  else if (code === 'KeyT' && !e.altKey) {
    if (e.shiftKey) toast('Thumpling needs the Giants sidekick dump', color('Water'));
    else whale();
  } else if (code === 'Space' && document.activeElement === document.body && inView(holdSection)) { e.preventDefault(); holdStart(); }
});
document.addEventListener('keyup', e => { if (e.code === 'Space') holdEnd(); });

/* ---------- Hold L3 + R3 (or the button, or the space bar) ---------- */
const holdSection = $('controller');
const holdBtn = $('holdbtn');
const timeline = $('timeline');
const steps = [...timeline.children];
let holdStartAt = 0, holdFrame = 0;
function holdStart() {
  if (holdStartAt) return;
  holdStartAt = performance.now();
  holdBtn.classList.add('down');
  const tick = now => {
    const s = (now - holdStartAt) / 1000;
    const prog = Math.min(s / 5, 1);
    holdBtn.style.setProperty('--hold', prog);
    timeline.style.setProperty('--prog', prog);
    steps.forEach(li => li.classList.toggle('lit', s >= +li.dataset.t));
    holdBtn.querySelector('.holdbtn-label').textContent = s < 2 ? 'Keep holding' : s < 5 ? 'Dial open' : 'Full window';
    holdFrame = requestAnimationFrame(tick);
  };
  holdFrame = requestAnimationFrame(tick);
}
function holdEnd() {
  if (!holdStartAt) return;
  holdStartAt = 0;
  cancelAnimationFrame(holdFrame);
  holdBtn.classList.remove('down');
  holdBtn.querySelector('.holdbtn-label').textContent = 'Press and hold';
  holdBtn.style.setProperty('--hold', 0);
  timeline.style.setProperty('--prog', 0);
  steps.forEach(li => li.classList.remove('lit'));
}
holdBtn.addEventListener('pointerdown', e => { holdBtn.setPointerCapture(e.pointerId); holdStart(); });
['pointerup', 'pointercancel', 'lostpointercapture'].forEach(t => holdBtn.addEventListener(t, holdEnd));
holdBtn.addEventListener('keydown', e => { if (e.code === 'Enter' || e.code === 'Space') { e.preventDefault(); e.stopPropagation(); holdStart(); } });
holdBtn.addEventListener('keyup', e => { if (e.code === 'Enter' || e.code === 'Space') holdEnd(); });
holdBtn.addEventListener('contextmenu', e => e.preventDefault());

const inView = node => { const r = node.getBoundingClientRect(); return r.top < innerHeight * .6 && r.bottom > innerHeight * .4; };

/* ---------- Real controllers, through the Gamepad API ---------- */
// Standard mapping: 0 A, 1 B, 4 LB, 5 RB, 10 L3, 11 R3.
let padFrame = 0, padHeld = 0, dialOpen = false, hot = -1, prev = [];
const hold = $('hold');
function pollPads(now) {
  const pad = [...navigator.getGamepads()].find(Boolean);
  if (!pad) { padFrame = 0; return; }
  const down = pad.buttons.map(b => b.pressed);
  const pressed = i => down[i] && !prev[i];
  const sticks = down[10] && down[11];
  const heroVisible = inView($('top'));

  if (sticks) {
    padHeld ||= now;
    const s = (now - padHeld) / 1000;
    if (heroVisible) {
      hold.classList.toggle('show', !dialOpen);
      hold.style.setProperty('--hold', Math.min(s / 2, 1));
      if (s >= 2 && !dialOpen) { dialOpen = true; hold.classList.remove('show'); toast('Dial open: point a stick, press A'); }
    } else if (inView(holdSection)) holdStart();
  } else if (padHeld) {
    padHeld = 0; hold.classList.remove('show'); holdEnd();
  }

  if (dialOpen) {
    const [x, y] = Math.hypot(pad.axes[0], pad.axes[1]) > Math.hypot(pad.axes[2] || 0, pad.axes[3] || 0) ? [pad.axes[0], pad.axes[1]] : [pad.axes[2] || 0, pad.axes[3] || 0];
    if (Math.hypot(x, y) > .5) {
      const deg = Math.atan2(x, -y) * 180 / Math.PI; // 0 = up
      hot = Math.max(0, Math.min(9, Math.round((deg + 81) / 18)));
      coins.forEach((c, i) => c.classList.toggle('hot', i === hot));
    }
    if (pressed(0) && hot >= 0) load(active, ELEMENTS[hot][0]);
    if (pressed(4)) setPlayer(0);
    if (pressed(5)) setPlayer(1);
    if (pressed(1)) { dialOpen = false; hot = -1; coins.forEach(c => c.classList.remove('hot')); toast('Back to the game'); }
  }
  prev = down;
  padFrame = requestAnimationFrame(pollPads);
}
addEventListener('gamepadconnected', e => {
  toast(`Controller connected. Hold L3 + R3`);
  if (!padFrame) padFrame = requestAnimationFrame(pollPads);
});

/* ---------- Back of the box: element strip and the barcode from the Cemu hash ---------- */
const strip = document.querySelector('.el-strip');
ELEMENTS.forEach(([name]) => { const li = el('li'); li.dataset.el = name; li.title = name; li.append(sigil(name, 'strip-i')); strip.append(li); });
const bars = document.querySelector('.bars');
[...bars.dataset.hash].forEach((h, i) => {
  const v = parseInt(h, 16);
  const b = el('i'); b.style.setProperty('--w', `${1 + (v & 3)}px`);
  b.style.marginRight = `${(v >> 2) & 1 ? 2 : 0}px`;
  if (i % 2) b.style.background = 'transparent';
  bars.append(b);
});

/* ---------- Backups: newest slides in, the eleventh falls off ---------- */
const stack = $('stack');
const level = [7, 7, 6, 6, 5, 5, 4, 3, 3, 2];
let saveCount = 0;
function saveCard(i) {
  const d = new Date(Date.now() - i * 41 * 60000);
  const c = el('div', 'save');
  c.innerHTML = `<div class="art"><img src="${card('Gill Grunt')}" alt=""></div><div class="meta"><b>Gill Grunt</b><span>Level ${level[Math.min(i, 9)]}</span><span>${d.toLocaleDateString('en', { weekday: 'short' })} ${d.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' })}</span></div>`;
  return c;
}
for (let i = 9; i >= 0; i--) stack.append(saveCard(i));
const layout = () => [...stack.querySelectorAll('.save:not(.gone)')].reverse().forEach((c, k) => c.style.setProperty('--k', k));
layout();
function pushSave() {
  const cards = stack.querySelectorAll('.save:not(.gone)');
  const oldest = cards[0];
  oldest.classList.add('gone');
  setTimeout(() => oldest.remove(), 800);
  const fresh = saveCard(0);
  fresh.querySelector('.meta span').textContent = `Level ${7 + (++saveCount > 2 ? 1 : 0)}`;
  fresh.classList.add('new');
  stack.append(fresh);
  layout();
}
let saveTimer;
if (!reduced) new IntersectionObserver(([e]) => {
  clearInterval(saveTimer);
  if (e.isIntersecting) saveTimer = setInterval(pushSave, 2400);
}, { threshold: .4 }).observe(stack);

/* ---------- Collection (sample library) ---------- */
const grid = $('colgrid');
let seed = 7;
const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
let delay = 0;
ELEMENTS.forEach(([name, , pool], col) => {
  const owned = pool.map((_, r) => r === 0 || rnd() > .38);
  const head = el('div', 'col-head');
  head.style.gridColumn = col + 1; head.style.gridRow = 1;
  head.dataset.el = name;
  head.innerHTML = `<span class="coinish"><i data-el="${name}" class="strip-i" aria-hidden="true"></i></span><small>${owned.filter(Boolean).length}/${pool.length}</small>`;
  head.title = name;
  grid.append(head);
  pool.forEach((fig, r) => {
    const s = el('button', 'slot' + (owned[r] ? ' own' : ''), { type: 'button' });
    s.style.gridColumn = col + 1; s.style.gridRow = r + 2;
    s.dataset.el = name;
    s.style.setProperty('--dl', `${(col + r) * 40}ms`);
    s.append(sigil(name, 'strip-i'));
    if (owned[r]) {
      s.style.setProperty('--card', `url(${card(fig)})`);
      const lv = 3 + Math.floor(rnd() * 9);
      const info = { name: fig, level: lv >= 10 ? '10+' : lv, gold: Math.floor(rnd() * 60000).toLocaleString('en'), hp: Math.floor(rnd() * 20) };
      s.setAttribute('aria-label', `${fig}, level ${info.level}`);
      const show = () => {
        grid.querySelector('.sel')?.classList.remove('sel'); s.classList.add('sel');
        Object.entries(info).forEach(([k, v]) => $('figcard').querySelector(`[data-k=${k}]`).textContent = v);
        $('figart').src = card(fig); $('figart').alt = fig;
      };
      s.onmouseenter = s.onfocus = s.onclick = show;
    } else { s.setAttribute('aria-label', `${fig}, missing`); s.disabled = true; }
    grid.append(s);
  });
});
new IntersectionObserver(([e], o) => { if (e.isIntersecting) { grid.classList.add('lit'); o.disconnect(); } }, { threshold: .35 }).observe(grid);

/* ---------- Games ---------- */
const GAMES = [
  ["Spyro's Adventure", 'portal.webp', 'Where it started. The original stone portal, a shortcut for every element and the elemental gate helper (beta): choose your level and Alt + G loads the next element it has a gate for.'],
  ['Giants', 'portal.webp', 'Giants share the stone portal. Add Thumpling as Player 1’s sidekick with Alt + Shift + T, using the Giants sidekick dump.'],
  ['Swap Force', 'portals/swap-force.webp', 'Pick a top, then a bottom; mixed pairs work. Eight perk bases, from Rocket to Climber, sit on Alt + Q to O.'],
  ['Trap Team', 'portals/trap-team.webp', 'Traps go in the shared slot. Alt + Up and Down preview your captured villains, Alt + Space locks one in. Trap dumps are never edited.'],
  ['SuperChargers', 'portals/superchargers.webp', 'One vehicle, shared by both players. Alt + Q, W and E load your Sky, Land and Sea vehicles.'],
  ['Imaginators', 'portals/swap-force.webp', 'Creation Crystals are playable figures here. Pick one like any Skylander, or save it as a player’s default.'],
];
const tabs = $('gametabs');
const gameStage = document.querySelector('.game-stage');
GAMES.forEach(([name], i) => {
  const b = el('button', 'gtab', { type: 'button', textContent: name, role: 'tab', id: `gt${i}` });
  b.setAttribute('aria-controls', 'gpanel');
  b.onclick = () => showGame(i);
  b.onkeydown = e => { const d = { ArrowRight: 1, ArrowLeft: -1 }[e.key]; if (d) { const n = (i + d + 6) % 6; showGame(n); tabs.children[n].focus(); } };
  tabs.append(b);
});
function showGame(i, instant) {
  [...tabs.children].forEach((b, n) => { b.setAttribute('aria-selected', n === i); b.tabIndex = n === i ? 0 : -1; });
  $('gpanel').setAttribute('aria-labelledby', `gt${i}`);
  const apply = () => {
    const [name, portal, text] = GAMES[i];
    $('gposter').src = `assets/posters/${i + 1}.webp`;
    $('gposter').alt = `Activision's ${name} character poster`;
    $('gportal').src = `assets/${portal}`;
    $('gportal').alt = `The ${name} portal`;
    $('gname').textContent = name;
    $('gtext').textContent = text;
    gameStage.classList.remove('swapping');
  };
  if (instant || reduced) return apply();
  gameStage.classList.add('swapping');
  setTimeout(apply, 260);
}
showGame(0, true);
GAMES.forEach((_, i) => { new Image().src = `assets/posters/${i + 1}.webp`; });

/* ---------- Themes ---------- */
const THEMES = [
  ['default', 'Dè Dusk over Skylands', 'The original look: painted sky, lapis panels and gold rims.'],
  ['game', 'Match the game', 'Picks the look of whichever game you choose.'],
  ['spyros-adventure', 'Dè Book of Eon', 'Spyro’s Adventure. Parchment pages from Eon’s book under the Core of Light.'],
  ['giants', 'Dè Arkeyan Forge', 'Giants. Riveted iron, molten seams and giant-sized Skylanders.'],
  ['swap-force', 'Dè Woodburrow', 'Swap Force. Carved wood in daylight, every panel split into a top and a bottom.'],
  ['trap-team', 'Dè Cloudcracker Prison', 'Trap Team. Prison stone with Traptanium crystal cut into every slot.'],
  ['superchargers', 'Dè Rift Garage', 'SuperChargers. Tread plate, racing stripes and everything leaning into the turn.'],
  ['imaginators', 'Dè Mind Magic', 'Imaginators. Holographic Imaginite and a creator’s marker scribbles.'],
  ['thumpback', 'Dè perThumpback', 'The Phantom Tide’s deck, rope and fishing nets, and Thumpback’s ship’s log. Hail to the Whale!'],
  ['singularity', 'Dè Cell to Singularity', 'Glowing Tree of Life nodes over a sleeping Earth, and entropy that never stops growing.'],
  ['mcdonald', 'Dè PerMCdonald', 'A fast-food order kiosk with numbered combos and a Now serving board. The ice cream machine is broken.'],
  ['doomscroll', 'Dè perDoomScroll', 'Your portal as a vertical feed, with a screen time counter that only goes up. Just one more reel.'],
  ['fishbet', 'Dè FishBet', 'A deep-sea betting parody. Free spins included, money not.'],
];
const reel = $('reel');
const cards = THEMES.map(([file, name], i) => {
  const f = el('figure', 'tcard');
  f.innerHTML = `<img src="assets/themes/${file}.webp" alt="Dè PerPortal in the ${name} theme" width="960" height="600" loading="lazy"><figcaption>${name}</figcaption>`;
  f.dataset.i = i;
  reel.append(f);
  return f;
});
let current = -1, reelFrame = 0;
// The card nearest the middle of the reel is the one being shown.
function pickTheme() {
  reelFrame = 0;
  const mid = reel.scrollLeft + reel.clientWidth / 2;
  let best = 0;
  cards.forEach((c, i) => { if (Math.abs(c.offsetLeft + c.offsetWidth / 2 - mid) < Math.abs(cards[best].offsetLeft + cards[best].offsetWidth / 2 - mid)) best = i; });
  if (best === current) return;
  current = best;
  cards.forEach((c, i) => c.classList.toggle('on', i === best));
  $('reelabout').textContent = THEMES[best][2];
}
reel.addEventListener('scroll', () => { reelFrame ||= requestAnimationFrame(pickTheme); }, { passive: true });
pickTheme();
const goTheme = d => cards[(current + d + cards.length) % cards.length].scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'nearest', inline: 'center' });
$('prev').onclick = () => goTheme(-1);
$('next').onclick = () => goTheme(1);
reel.addEventListener('keydown', e => { const d = { ArrowRight: 1, ArrowLeft: -1 }[e.key]; if (d) { e.preventDefault(); goTheme(d); } });

/* ---------- Copy the Cemu hash ---------- */
$('copy').onclick = async () => {
  const b = $('copy');
  try {
    await navigator.clipboard.writeText($('hash').textContent);
    b.classList.add('done'); b.lastChild.textContent = 'Copied';
  } catch { getSelection().selectAllChildren($('hash')); b.lastChild.textContent = 'Press Ctrl + C'; }
  setTimeout(() => { b.classList.remove('done'); b.lastChild.textContent = 'Copy'; }, 2200);
};

/* ---------- Point Download at the latest release's ZIP ---------- */
fetch('https://api.github.com/repos/Il-Mazu/De-PerPortal/releases/latest')
  .then(r => r.ok ? r.json() : Promise.reject(r.status))
  .then(rel => {
    const zip = rel.assets.find(a => a.name.endsWith('.zip'));
    if (zip) document.querySelectorAll('[data-download]').forEach(a => a.href = zip.browser_download_url);
    const mb = zip ? `, ${Math.round(zip.size / 1048576)} MB` : '';
    document.querySelectorAll('[data-version]').forEach(p => p.textContent = `Version ${rel.tag_name.replace(/^v/, '')} for Windows x64${mb}. Free and open source.`);
  })
  .catch(() => {}); // The links already point at the releases page.

/* ---------- The crew, standing on top of the back panel ---------- */
const crew = $('crew');
RENDERS.slice(0, 10).forEach((name, i) => {
  const img = el('img', '', { src: art(name), alt: '', loading: 'lazy', title: name });
  img.style.setProperty('--n', i);
  img.dataset.el = ELEMENTS[i][0];
  crew.append(img);
});

/* ---------- T: a splash, and Thumpback ---------- */
const egg = $('egg');
let eggBusy = false;
new Image().src = 'assets/renders/thumpback-big.webp';
function whale() {
  load(0, 'Water', 'Thumpback');
  if (eggBusy) return;
  eggBusy = true;
  const splash = $('eggsplash');
  splash.replaceChildren();
  // Droplets thrown up in a fan, plus two rings on the water.
  for (let i = 0; i < 40; i++) {
    const a = (-150 + Math.random() * 120) * Math.PI / 180, d = 160 + Math.random() * 300;
    const drop = el('i', 'drop');
    drop.style.cssText = `--dx:${Math.cos(a) * d}px;--dy:${Math.sin(a) * d}px;--s:${.5 + Math.random()};animation-delay:${Math.random() * 120}ms`;
    splash.append(drop);
  }
  splash.append(el('b', 'ring'), el('b', 'ring r2'));
  egg.classList.remove('go'); void egg.offsetWidth; egg.classList.add('go');
  setTimeout(() => { egg.classList.remove('go'); eggBusy = false; }, reduced ? 1600 : 2900);
}
$('whalebtn').onclick = whale;
egg.onclick = () => { egg.classList.remove('go'); eggBusy = false; };
