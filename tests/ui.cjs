const {_electron:electron}=require('playwright');
const fs=require('node:fs/promises');
const path=require('node:path');
const assert=require('node:assert/strict');
const {installArt}=require('../app/artwork.cjs');

(async()=>{
 const root=await fs.mkdtemp(path.resolve('out/ui-'));
 await fs.mkdir(path.join(root,'NFC'));
 const entries=[[16,0],[18,0],[12,0],[14,0],[9,0],[8,0],[19,0],[20,0],[4,0],[5,0],[24,0],[25,0],[0,0],[1,0],[29,0],[30,0],[107,4614],[2000,8192],[1000,8192],[505,0],[1001,8192],[541,4096]];
 for(const [id,variant] of entries){const b=Buffer.alloc(1024);b.writeUInt32LE(id+1);b.writeUInt16LE(id,16);b.writeUInt16LE(variant,28);await fs.writeFile(path.join(root,'NFC',`${id}-${variant}.sky`),b);}
 try {await installArt(root,await fs.readFile('out/artwork-pack.zip'));}catch(e){if(e.code!=='ENOENT')throw e;}
 const instance=await electron.launch({args:[path.resolve('.'),'--no-sandbox',`--user-data-dir=${path.join(root,'electron-data')}`],env:{...process.env,DE_PERPORTAL_HOME:root}});
 try {
  const page=await instance.firstWindow();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.locator('#library-count').filter({hasText:'22 figures'}).waitFor();
  await page.selectOption('#game','3');
  assert.equal(await page.locator('#perks-section').isVisible(),true);
  assert.equal(await page.locator('#perks .perk-card').count(),8);
  assert.match(await page.locator('#perks .perk-card').first().textContent(),/Rocket/);
  await page.locator('#overlay').click();
  const overlay=instance.windows().find(p=>p.url().endsWith('/overlay.html'));
  assert.ok(overlay);overlay.on('pageerror',e=>errors.push(e.message));
  await overlay.waitForFunction(()=>document.querySelectorAll('#perks .entry').length===8);
  assert.equal(await overlay.locator('#elements .entry').count(),8);
  assert.deepEqual(await overlay.locator('#perks .key').allTextContents(),['Q','W','E','R','Y','U','I','O']);
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
    w.setPosition(area.x+30,area.y+30);w.emit('moved');return w.getPosition();
  });
  await page.selectOption('#game','2');
  assert.deepEqual(await instance.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows().find(w=>w.webContents.getURL().endsWith('/overlay.html')).getPosition()),movedPosition);
  await page.selectOption('#game','3');
  await overlay.screenshot({path:'out/de-perportal-overlay.png'});
  await overlay.locator('#close').click();
  assert.equal((await overlayFlags()).visible,false);
  await page.locator('#overlay').click();
  assert.equal((await overlayFlags()).visible,true);
  await page.selectOption('#game','5');
  await overlay.waitForFunction(()=>document.querySelectorAll('#elements .entry').length===10);
  assert.equal(await overlay.locator('#perks').isVisible(),false);
  await page.selectOption('#game','3');
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
  assert.equal(await page.locator('.portal').getAttribute('src'),'portal.png');
  await page.locator('#tab-1').click();
  await page.getByRole('button',{name:'Change Water Skylander',exact:true}).click();
  assert.equal(await page.locator('.picker-item').count(),2); // no Giant Thumpback in ordinary Water choices
  await page.locator('#picker-close').click();
  await page.locator('#settings').click();await page.locator('#settings-close').click();
  await page.locator('#tab-0').click();
  await page.selectOption('#game','2');
  assert.equal(await page.locator('#perks-section').isVisible(),false);
  await page.selectOption('#game','3');
  await page.screenshot({path:'out/de-perportal-ui.png',fullPage:true});
  assert.deepEqual(errors,[]);
  // Integration is opt-in and requires a Cemu session with empty portal rows.
  if(process.env.DE_PERPORTAL_INTEGRATION==='1'){
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
