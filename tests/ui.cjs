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
  const page=await instance.firstWindow();const errors=[];page.on('pageerror',e=>errors.push(e.message));
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
  assert.equal(await overlay.locator('.key, #perks, #traps').count(),0);
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
  await page.locator('#tab-0').click();
  await selectGame('2');
  assert.equal(await page.locator('#perks-section').isVisible(),false);
  await selectGame('3');
  await page.screenshot({path:'out/de-perportal-ui.png',fullPage:true});
  // Per-game artwork and accessory filtering use the actual renderer and model state.
  for(const [game,src,slots] of [['1','portal.png',1],['2','portal.png',1],['3','portals/swap-force.png',1],['4','portals/trap-team.png',2],['5','portals/superchargers.png',4],['6','portals/swap-force.png',4]]) {
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
  await page.locator('[data-slot="vehicle"] .choose-accessory').click();
  assert.equal(await page.locator('.picker-item').count(),2);
  await page.locator('#search').fill('sea');assert.equal(await page.locator('.picker-item').count(),1);
  await page.locator('#picker-close').click();
  // Save a manual trap name through real IPC, then reload the renderer.
  await selectGame('4');
  assert.equal(await page.locator('.name-trap').isVisible(),false);
  await page.locator('.other-traps summary').click();
  await page.locator('.name-trap').click();
  await page.locator('#trap-name').fill('My Gulper <test>');
  await page.locator('#trap-name-save').click();
  await page.locator('.villain-card span').filter({hasText:'My Gulper <test>'}).waitFor();
  await page.reload();
  await page.locator('.villain-card span').filter({hasText:'My Gulper <test>'}).waitFor();
  assert.match(await page.locator('.villain-card').textContent(),/Contents unverified/);
  await page.locator('.name-trap').click();
  await page.locator('#trap-name').fill('');
  await page.locator('#trap-name-save').click();
  await page.locator('.other-traps summary').click();
  await page.locator('.villain-card span').filter({hasText:'Contents unknown'}).waitFor();
  await selectGame('6');
  assert.equal(await page.locator('#trapped-villains').isVisible(),false);
  // Mock only native actions for GUI interaction checks; manager behavior is tested separately.
  if(process.env.DE_PERPORTAL_INTEGRATION!=='1') {
    const fixture=await page.evaluate(()=>window.dePerPortal.state());
    fixture.active=[{top:'16-0.sky',bottom:null},{top:'9-0.sky',bottom:null}];
    fixture.session={pid:1,supported:true,game:5,focused:false};
    await instance.evaluate(({ipcMain,BrowserWindow},fixture)=>{
      globalThis.uiActions=[];globalThis.uiFixture=fixture;
      const main=BrowserWindow.getAllWindows().find(w=>w.webContents.getURL().endsWith('/index.html'));
      ipcMain.removeHandler('action');ipcMain.handle('action',(_event,data)=>{
        globalThis.uiActions.push(data);
        if(data.target==='accessory')fixture.accessories[data.slot]=data.choice;
        else if(data.target==='remove-accessory')delete fixture.accessories[data.slot];
        main.webContents.send('state',fixture);
      });
      main.webContents.send('state',fixture);
    },fixture);
    await page.locator('#player-0 .active-name').filter({hasText:'Spyro'}).waitFor();
    assert.equal(await page.locator('#player-0').getAttribute('data-element'),'Magic');
    assert.equal(await page.locator('#player-1').getAttribute('data-element'),'Fire');
    assert.equal(await page.locator('.element-aura.is-active').count(),2);
    await page.locator('[data-slot="vehicle"] .choose-accessory').click();
    await page.locator('.picker-item[data-key="3224-16384.sky"]').click();
    await page.locator('[data-slot="vehicle"] h3').filter({hasText:'Hot Streak'}).waitFor();
    assert.equal(await page.locator('#player-0 .active-name').textContent(),'Spyro');
    await page.locator('[data-slot="trap"] .choose-accessory').click();await page.locator('.picker-item').click();
    await page.locator('[data-slot="trap"] h3').filter({hasText:'Water Tiki'}).waitFor();
    await page.screenshot({path:'out/de-perportal-elements-and-items.png',fullPage:true});
    await page.locator('[data-slot="vehicle"] .remove-accessory').click();
    await page.locator('[data-slot="vehicle"] h3').filter({hasText:'Nothing placed'}).waitFor();
    assert.deepEqual(await instance.evaluate(()=>globalThis.uiActions.map(a=>[a.target,a.slot])),[['accessory','vehicle'],['accessory','trap'],['remove-accessory','vehicle']]);
    await page.emulateMedia({reducedMotion:'reduce'});
    assert.equal(await page.locator('.aura-one').evaluate(el=>getComputedStyle(el).animationName),'none');
    await page.setViewportSize({width:720,height:900});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    await page.screenshot({path:'out/de-perportal-compact.png',fullPage:true});
  }
  if(process.env.DE_PERPORTAL_INTEGRATION!=='1') {
    const bytes=Buffer.from((await fs.readFile(path.join(__dirname,'fixtures/life-trap.hex'),'utf8')).trim(),'hex');
    await fs.writeFile(path.join(root,'NFC/captured-life.sky'),bytes);
    await page.locator('#settings').click();
    await page.locator('#rescan').click();
    await page.locator('#library-count').filter({hasText:'33 figures'}).waitFor();
    await page.locator('#clear-traps').click();
    await page.waitForFunction(()=>document.body.textContent.includes('Cleared 1 traps.'));
    assert.equal(require('../app/traps.cjs').decode(await fs.readFile(path.join(root,'NFC/captured-life.sky'))).state,'empty');
    const backupRoot=path.join(root,'de-perportal-data/trap-backups');
    const [backup]=await fs.readdir(backupRoot);
    assert.deepEqual(await fs.readFile(path.join(backupRoot,backup,'captured-life.sky')),bytes);
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
