const {_electron:electron}=require('playwright');
const fs=require('node:fs/promises');
const path=require('node:path');
const assert=require('node:assert/strict');
const {installArt}=require('../app/artwork.cjs');

(async()=>{
 const root=await fs.mkdtemp(path.resolve('out/ui-'));
 await fs.mkdir(path.join(root,'NFC'));
 const entries=[[16,0],[18,0],[12,0],[14,0],[9,0],[8,0],[19,0],[20,0],[4,0],[5,0],[24,0],[25,0],[0,0],[1,0],[29,0],[30,0],[107,4614],[2000,8192],[1000,8192],[505,0],[1001,8192],[541,4096],[200,0],[300,0],[211,12289],[3224,16384],[3222,16384],[3503,16384],[310,20480],[311,20480],[235,20481],[685,21007]];
 for(const [id,variant] of entries){const b=Buffer.alloc(1024);b.writeUInt32LE(id+1);b.writeUInt16LE(id,16);b.writeUInt16LE(variant,28);await fs.writeFile(path.join(root,'NFC',`${id}-${variant}.sky`),b);}
 try {await installArt(root,await fs.readFile('out/artwork-pack.zip'));}catch(e){if(e.code!=='ENOENT')throw e;}
 const instance=await electron.launch({args:[path.resolve('.'),'--no-sandbox',...(process.platform==='linux'?['--ozone-platform=x11']:[]),`--user-data-dir=${path.join(root,'electron-data')}`],env:{...process.env,DE_PERPORTAL_HOME:root}});
 try {
  // The overlay and quick swap windows can load first; wait for the main one.
  let page;while(!(page=instance.windows().find(w=>w.url().endsWith('/index.html'))))await new Promise(r=>setTimeout(r,100));
  await page.emulateMedia({reducedMotion:'reduce'}); // floating figures never become "stable" for clicks
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const selectGame=async value=>{await page.selectOption('#game',value);await page.waitForFunction(game=>document.body.dataset.game===game,value);};
  await page.locator('#library-count').filter({hasText:'32 figures'}).waitFor();
  await selectGame('3');
  assert.equal(await page.locator('#perks-section').isVisible(),true);
  assert.equal(await page.locator('#perks .perk-card').count(),8);
  assert.match(await page.locator('#perks .perk-card').first().textContent(),/Rocket/);
  await page.locator('#overlay').click();
  const overlay=instance.windows().find(p=>p.url().endsWith('/overlay.html'));
  assert.ok(overlay);overlay.on('pageerror',e=>errors.push(e.message));
  await overlay.waitForFunction(()=>document.querySelectorAll('#elements .entry').length===8);
  assert.equal(await overlay.locator('#elements .entry').count(),8);
  assert.equal(await overlay.locator('.hint, #perks, #traps').count(),8);
  assert.equal(await overlay.locator('.hint').first().textContent(),'1');
  await overlay.waitForFunction(()=>[...document.images].every(img=>img.complete && img.naturalWidth>0));
  const overlayFlags=()=>instance.evaluate(({BrowserWindow})=>{
    const w=BrowserWindow.getAllWindows().find(w=>w.webContents.getURL().endsWith('/overlay.html'));
    return {visible:w.isVisible(),focusable:w.isFocusable(),top:w.isAlwaysOnTop()};
  });
  assert.deepEqual(await overlayFlags(),{visible:true,focusable:false,top:true});
  assert.equal(await overlay.locator('main').evaluate(el=>getComputedStyle(el).getPropertyValue('-webkit-app-region')),'drag');
  assert.equal(await overlay.locator('#close').evaluate(el=>getComputedStyle(el).getPropertyValue('-webkit-app-region')),'no-drag');
  const movedPosition=await instance.evaluate(({BrowserWindow,screen})=>{
    const w=BrowserWindow.getAllWindows().find(w=>w.webContents.getURL().endsWith('/overlay.html'));
    const area=screen.getDisplayMatching(w.getBounds()).workArea;
    w.setPosition(area.x+30,area.y+30);return w.getPosition();
  });
  await selectGame('2');
  assert.deepEqual(await instance.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows().find(w=>w.webContents.getURL().endsWith('/overlay.html')).getPosition()),movedPosition);
  await selectGame('3');
  await overlay.screenshot({path:'out/de-perportal-overlay.png'});
  await overlay.locator('#close').click();
  assert.equal((await overlayFlags()).visible,false);
  await page.locator('#overlay').click();
  assert.equal((await overlayFlags()).visible,true);
  await selectGame('4');
  await overlay.waitForFunction(()=>document.querySelectorAll('#elements .entry').length===10);
  assert.equal(await overlay.locator('.hint').first().textContent(),'1/Q');
  assert.equal(await overlay.locator('main').textContent().then(t=>t.includes('Alt')),false);
  assert.deepEqual(await instance.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows().find(w=>w.webContents.getURL().endsWith('/overlay.html')).getPosition()),movedPosition);
  await selectGame('5');
  await overlay.waitForFunction(()=>document.querySelectorAll('#elements .entry').length===10);
  assert.equal(await overlay.locator('#perks').count(),0);
  assert.equal(await overlay.locator('#traps').count(),0);
  await selectGame('3');
  await overlay.locator('#close').click();
  await page.locator('#favorite-0 .edit').click();
  await page.locator('#search').fill('Boom Jet');
  await page.locator('.picker-item').first().click();
  assert.equal(await page.locator('#picker').evaluate(el=>el.open),true);
  assert.equal(await page.locator('#bottom-select').count(),0);
  assert.equal(await page.locator('.picker-item').count(),2);
  await page.locator('.picker-item').filter({hasText:'Matching bottom'}).click();
  await page.waitForFunction(()=>!document.getElementById('picker').open);
  const saved=JSON.parse(await fs.readFile(path.join(root,'de-perportal-data/settings.json')));
  assert.deepEqual(saved.profiles[3].players[0].favorite,{top:'2000-8192.sky',bottom:'1000-8192.sky'});
  await page.locator('#favorite-0 .edit').click();
  await page.locator('#search').fill('Boom Jet');
  await page.locator('.picker-item').first().click();
  await page.locator('#change-top').click();
  assert.equal(await page.locator('#half-controls').isVisible(),false);
  await page.locator('#search').fill('Boom Jet');
  await page.locator('.picker-item').first().click();
  await page.locator('.picker-item[data-key="1001-8192.sky"]').click();
  await page.waitForFunction(()=>!document.getElementById('picker').open);
  const mixed=JSON.parse(await fs.readFile(path.join(root,'de-perportal-data/settings.json')));
  assert.deepEqual(mixed.profiles[3].players[0].favorite,{top:'2000-8192.sky',bottom:'1001-8192.sky'});
  assert.match(await page.locator('#favorite-0 .name').textContent(),/Boom Jet \/ Free Ranger/);
  const halves=await page.locator('#favorite-0 .half-art').evaluateAll(els=>els.map(el=>{const r=el.getBoundingClientRect();return {x:r.x,y:r.y,bottom:r.bottom};}));
  assert.equal(halves[0].x,halves[1].x);assert.ok(halves[0].bottom<=halves[1].y+1);
  await page.locator('#favorite-0 .default-presets button').nth(1).click();
  assert.match(await page.locator('#picker-title').textContent(),/default preset 2/);
  await page.locator('#search').fill('Spyro');
  // The last click left the pointer on this tile's edge, where the hover lift makes it jitter.
  await page.mouse.move(0,0);
  await page.locator('.picker-item[data-key="16-0.sky"]').click();
  await page.waitForFunction(()=>!document.getElementById('picker').open);
  assert.equal(await page.locator('#favorite-0 .name').textContent(),'Spyro');
  assert.equal(await page.locator('#favorite-0 .default-presets button').nth(1).getAttribute('aria-pressed'),'true');
  assert.equal(await page.locator('#favorite-1 .default-presets button').first().getAttribute('aria-pressed'),'true');
  await page.reload();
  await page.locator('#favorite-0 .name').filter({hasText:'Spyro'}).waitFor();
  await page.locator('#favorite-0 .default-presets button').first().click();
  await page.locator('#favorite-0 .name').filter({hasText:'Boom Jet / Free Ranger'}).waitFor();
  assert.equal(await page.locator('.portal').getAttribute('src'),'portals/swap-force.png');
  await page.locator('#tab-1').click();
  await page.getByRole('button',{name:'Change Water Skylander',exact:true}).click();
  assert.equal(await page.locator('.picker-item').count(),2); // no Giant Thumpback in ordinary Water choices
  await page.locator('#picker-close').click();
  await page.locator('#settings').click();await page.locator('#settings-close').click();
  // Collection: this game's catalog against the library, with the poster on top.
  await page.locator('#collection').click();
  await page.locator('#vault .vault-item').first().waitFor();
  const owned=await page.locator('#vault .vault-item:not(.missing)').count();
  assert.ok(owned>0 && await page.locator('#vault .vault-item.missing').count()>0);
  assert.match(await page.locator('#hub-count').textContent(),new RegExp(`^${owned} of \\d+ in your library$`));
  await page.selectOption('#vault-show','missing');
  assert.equal(await page.locator('#vault .vault-item:not(.missing)').count(),0);
  await page.selectOption('#vault-show','owned');
  await page.locator('#vault .vault-item').first().click();
  await page.locator('#vault-detail .backups').getByText(/None yet/).waitFor();
  await page.locator('#posters').click();
  await page.waitForFunction(()=>document.getElementById('poster-img').naturalWidth>0);
  assert.match(await page.locator('#poster-title').textContent(),/Skylander list/);
  await page.locator('#poster-close').click();
  assert.equal(await page.locator('#hub').evaluate(el=>el.open),true,'closing the poster keeps Collection open');
  await page.getByRole('tab',{name:'Setup'}).click();
  await page.locator('#checks .check-row').first().waitFor();
  assert.equal(await page.locator('#checks [data-status=bad]').filter({hasText:'Cemu next to'}).count(),1,'no Cemu in the fixture folder');
  await page.locator('#hub-close').click();
  await page.locator('#tab-0').click();
  await selectGame('2');
  assert.equal(await page.locator('#perks-section').isVisible(),false);
  await selectGame('3');
  await page.screenshot({path:'out/de-perportal-ui.png',fullPage:true});
  // Per-game artwork and accessory filtering use the actual renderer and model state.
  for(const [game,src,slots] of [['1','portal.png',1],['2','portal.png',1],['3','portals/swap-force.png',1],['4','portals/trap-team.png',2],['5','portals/superchargers.png',3],['6','portals/swap-force.png',4]]) {
    await selectGame(game);
    assert.equal(await page.locator('.portal').getAttribute('src'),src);
    assert.equal(await page.locator('.accessory-card').count(),slots);
    await page.waitForFunction(()=>document.querySelector('.portal').complete && document.querySelector('.portal').naturalWidth>0);
  }
  await page.locator('[data-slot="item"] .choose-accessory').click();
  assert.equal(await page.locator('.picker-item').count(),5);
  await page.locator('#search').fill('Enchanted');assert.equal(await page.locator('.picker-item').count(),1);
  assert.match(await page.locator('.picker-item').getAttribute('title'),/corresponding adventure/);
  await page.locator('#picker-close').click();
  await page.locator('#player-0 .active-card').click();await page.locator('#search').fill('Fire Reactor');
  assert.equal(await page.locator('.picker-item').count(),1);await page.locator('#picker-close').click();
  await selectGame('5');
  // SuperChargers vehicles live in Vehicle shortcuts; each picker lists only its type.
  await page.locator('#vehicles [data-type="Sea"] .edit').click();
  assert.equal(await page.locator('.picker-item[data-key="3222-16384.sky"]').count(),1);
  assert.equal(await page.locator('.picker-item').count(),1);
  await page.locator('#picker-close').click();
  // Save a manual trap name through real IPC, then reload the renderer.
  await selectGame('4');
  assert.equal(await page.locator('.name-trap').isVisible(),false);
  await page.locator('.other-traps summary').click();
  await page.locator('.name-trap').click();
  await page.locator('#trap-name').fill('My Gulper <test>');
  await page.locator('#trap-name-save').click();
  await page.locator('#villain-roster').getByText(/Named captures are ready/).waitFor();
  assert.equal(await page.locator('#villain-roster .villain-entry').count(),0);
  await page.reload();
  await page.locator('#villain-roster').getByText(/Named captures are ready/).waitFor();
  assert.equal(await page.locator('#villain-roster .villain-entry').count(),0);
  assert.ok(Object.values(JSON.parse(await fs.readFile(path.join(root,'de-perportal-data/settings.json'))).trapLabels).some(label=>label.name==='My Gulper <test>'));
  await selectGame('6');
  assert.equal(await page.locator('#trapped-villains').isVisible(),false);
  // Mock only native actions for GUI interaction checks; manager behavior is tested separately.
  if(process.env.DE_PERPORTAL_INTEGRATION!=='1') {
    const fixture=await page.evaluate(()=>window.dePerPortal.state());
    fixture.active=[{top:'16-0.sky',bottom:null},{top:'9-0.sky',bottom:null}];
    fixture.game=5;fixture.session={pid:1,supported:true,game:5,focused:false};
    await instance.evaluate(({ipcMain,BrowserWindow},fixture)=>{
      globalThis.uiActions=[];globalThis.uiFixture=fixture;
      const main=BrowserWindow.getAllWindows().find(w=>w.webContents.getURL().endsWith('/index.html'));
      ipcMain.removeHandler('action');ipcMain.handle('action',(_event,data)=>{
        globalThis.uiActions.push(data);
        if(data.target==='accessory')fixture.accessories[data.slot]=data.choice;
        else if(data.target==='remove-accessory')delete fixture.accessories[data.slot];
        main.webContents.send('state',fixture);
      });
      ipcMain.removeHandler('random');ipcMain.handle('random',(_event,player)=>{globalThis.uiActions.push({target:'random',player});});
      main.webContents.send('state',fixture);
    },fixture);
    await page.locator('#player-0 .active-name').filter({hasText:'Spyro'}).waitFor();
    assert.equal(await page.locator('#player-0').getAttribute('data-element'),'Magic');
    assert.equal(await page.locator('#player-1').getAttribute('data-element'),'Fire');
    assert.equal(await page.locator('.element-aura.is-active').count(),2);
    await page.locator('#vehicles [data-type="Land"] .element-load').click();
    await page.locator('#remove-vehicle').filter({hasText:'Remove Hot Streak'}).waitFor();
    assert.equal(await page.locator('#player-0 .active-name').textContent(),'Spyro');
    await page.locator('[data-slot="trap"] .choose-accessory').click();await page.locator('.picker-item').click();
    await page.locator('[data-slot="trap"] h3').filter({hasText:'Water Tiki'}).waitFor();
    await page.screenshot({path:'out/de-perportal-elements-and-items.png',fullPage:true});
    await page.locator('#remove-vehicle').click();
    await page.locator('#remove-vehicle').waitFor({state:'hidden'});
    assert.deepEqual(await instance.evaluate(()=>globalThis.uiActions.map(a=>[a.target,a.slot])),[['accessory','vehicle'],['accessory','trap'],['remove-accessory','vehicle']]);
    assert.equal(await instance.evaluate(()=>globalThis.uiActions[0].choice.top),'3224-16384.sky');
    await page.emulateMedia({reducedMotion:'reduce'});
    assert.equal(await page.locator('.aura-one').evaluate(el=>getComputedStyle(el).animationName),'none');
    await page.setViewportSize({width:720,height:900});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    await page.screenshot({path:'out/de-perportal-compact.png',fullPage:true});
    // Themes: Dè FishBet spins a random Skylander, and the choice survives a reload.
    await page.setViewportSize({width:1280,height:900});
    // Match the game (second slide) follows the current game.
    await page.locator('#theme').click();await page.locator('#theme-next').click();await page.locator('#theme-apply').click();
    assert.equal(await page.locator('body').getAttribute('data-theme'),'superchargers');
    assert.equal(await page.locator('body').evaluate(b=>b.classList.contains('skin')),true);
    assert.equal(await page.locator('.topbar').evaluate(el=>getComputedStyle(el,'::after').backgroundImage.startsWith('conic-gradient')),true);
    // The carousel opens on the theme in use; Dè FishBet is the last slide.
    await page.locator('#theme').click();await page.locator('#theme-prev').click();await page.locator('#theme-prev').click();await page.locator('#theme-apply').click();
    assert.equal(await page.locator('body').getAttribute('data-theme'),'fishbet');
    assert.equal(await page.locator('body').evaluate(b=>b.classList.contains('skin')),false);
    await page.locator('#spin-1').click();
    while(!(await instance.evaluate(()=>globalThis.uiActions.at(-1).target==='random')))await new Promise(r=>setTimeout(r,50));
    assert.equal(await instance.evaluate(()=>globalThis.uiActions.at(-1).player),1);
    await page.screenshot({path:'out/de-perportal-fishbet.png',fullPage:true});
    await page.setViewportSize({width:720,height:900});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    await page.reload();
    assert.equal(await page.locator('body').getAttribute('data-theme'),'fishbet');
    await page.evaluate(()=>localStorage.removeItem('theme'));await page.reload();
    assert.equal(await page.locator('body').getAttribute('data-theme'),'default');
    // Collection in every theme, with played saves, a history and a gate level.
    await page.setViewportSize({width:1280,height:900});
    const played=await page.evaluate(()=>window.dePerPortal.state());
    played.game=3;played.session={pid:1,supported:true,game:3,focused:false};played.active=[{top:'16-0.sky',bottom:null},null];
    played.gates=require('../resources/gates.json')['3'];played.gateLevel=1;played.challenge={nuzlocke:true,fallen:['9-0.sky']};
    // Own every other Swap Force figure so the shelf mixes lit and empty slots.
    for(const [i,c] of require('../resources/catalog.json').filter(c=>c.game===3).entries()) if(i%2===0 && !played.figures.some(f=>f.id===c.id && f.variant===c.variant))
      played.figures.push({key:`sf/${c.id}-${c.variant}.sky`,id:c.id,variant:c.variant,uid:`f${i}`,half:c.id>=1000 && c.id<=1015?'bottom':c.id>=2000 && c.id<=2015?'top':'whole',info:c,art:null,accessory:null});
    played.figures.forEach((f,i)=>{if(f.info && ['Skylander','Giant','Swapper'].includes(f.info.kind))f.save=i%5===4?{state:'damaged'}:{state:'ok',xp:i*3100,level:Math.min(10,1+i%10),maxed:i%4===0,gold:i*137,heroPoints:i*3,nickname:''};});
    played.history=played.figures.slice(0,6).map((f,i)=>({key:f.key,name:f.info?.name,game:3,player:i%2,at:Date.now()-i*900000}));
    await instance.evaluate(({BrowserWindow},fixture)=>BrowserWindow.getAllWindows().find(w=>w.webContents.getURL().endsWith('/index.html')).webContents.send('state',fixture),played);
    await page.locator('.element-card.gate').first().waitFor();
    assert.equal(await page.locator('#gates').isVisible(),true);
    await page.locator('#collection').click();
    await page.locator('#vault .vault-item').first().waitFor();
    await page.locator('#vault .vault-item:not(.missing)').first().click();
    await fs.mkdir('out/themes',{recursive:true});
    for(const theme of ['default','spyros-adventure','giants','swap-force','trap-team','superchargers','imaginators','thumpback','singularity','mcdonald','doomscroll','fishbet']) {
      await page.evaluate(id=>setTheme(id),theme);
      for(const tab of ['Figures','Progress','History','Setup']) {
        await page.getByRole('tab',{name:tab}).click();
        if(tab==='Setup') await page.locator('#checks .check-row').first().waitFor();
        await page.locator('#hub').screenshot({path:`out/themes/${theme}-${tab.toLowerCase()}.png`});
      }
      await page.getByRole('tab',{name:'Figures'}).click();
    }
    await page.setViewportSize({width:720,height:900});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    await page.locator('#hub').screenshot({path:'out/themes/compact-figures.png'});
    await page.evaluate(()=>setTheme('default'));
    await page.locator('#hub-close').click();
    await page.setViewportSize({width:1280,height:900});
    await page.screenshot({path:'out/de-perportal-stats.png',fullPage:true});
  }
  if(process.env.DE_PERPORTAL_INTEGRATION!=='1') {
    const bytes=Buffer.from((await fs.readFile(path.join(__dirname,'fixtures/life-trap.hex'),'utf8')).trim(),'hex');
    await fs.writeFile(path.join(root,'NFC/captured-life.sky'),bytes);
    await selectGame('4');
    await page.locator('#settings').click();
    await page.locator('#rescan').click();
    await page.locator('#library-count').filter({hasText:'33 figures'}).waitFor();
    await page.locator('#reset-trap-detections').click();
    await page.waitForFunction(()=>document.body.textContent.includes('Trap detections and names reset in PerPortal.'));
    assert.deepEqual(await fs.readFile(path.join(root,'NFC/captured-life.sky')),bytes);
    assert.match(await page.locator('#villain-roster').textContent(),/Ignored until contents change/);
    await page.locator('#settings-close').click();
  }
  assert.deepEqual(errors,[]);
  // Integration is opt-in and requires a Cemu session with empty portal rows.
  if(process.env.DE_PERPORTAL_INTEGRATION==='1'){
    await selectGame('3');
    await page.waitForFunction(()=>document.getElementById('connection').textContent==='Cemu connected');
    await page.locator('#thumpback').click();
    await page.waitForFunction(()=>document.querySelector('#player-0 .active-name').textContent==='Thumpback');
    await page.locator('#favorite-0 .load-favorite').click();
    await page.waitForFunction(()=>document.querySelector('#player-0 .active-name').textContent==='Boom Jet / Free Ranger');
    await page.locator('#favorite-1 .load-favorite').click();
    await page.waitForFunction(()=>document.querySelector('#player-1 .active-name').textContent==='Double Trouble');
    await page.locator('#sidekick button').click();await page.locator('.picker-item').first().click();
    await page.waitForFunction(()=>document.querySelector('#sidekick .name').textContent.includes('Terrabite'));
    await page.locator('#thumpling').click();
    await page.waitForFunction(()=>document.querySelector('#sidekick .name').textContent==='Thumpling (Sidekick)');
    assert.equal(await page.locator('#player-0 .active-name').textContent(),'Boom Jet / Free Ranger');
    assert.equal(await page.locator('#player-1 .active-name').textContent(),'Double Trouble');
    await page.screenshot({path:'out/de-perportal-connected.png',fullPage:true});
    await page.locator('#player-0 .remove').click();await page.waitForFunction(()=>!document.querySelector('#player-0 .remove'));
    await page.locator('#player-1 .remove').click();await page.waitForFunction(()=>!document.querySelector('#player-1 .remove'));
    await page.locator('#sidekick .remove').click();await page.waitForFunction(()=>!document.querySelector('#sidekick .remove'));
  }
  console.log(`UI PASS. Fixture: ${root}`);
 }finally{await instance.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
