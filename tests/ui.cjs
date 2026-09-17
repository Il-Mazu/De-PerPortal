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
 const instance=await electron.launch({args:[path.resolve('.'),'--no-sandbox'],env:{...process.env,SKYPORTAL_HOME:root}});
 try {
  const page=await instance.firstWindow();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.locator('#library-count').filter({hasText:'22 figures'}).waitFor();
  await page.selectOption('#game','3');
  await page.locator('#favorite-0 .edit').click();
  await page.locator('#search').fill('Boom Jet');
  await page.locator('.picker-item').first().click();
  assert.equal(await page.locator('#picker').evaluate(el=>el.open),true);
  assert.equal(await page.locator('#bottom-select').count(),0);
  assert.equal(await page.locator('.picker-item').count(),2);
  await page.locator('.picker-item').filter({hasText:'Matching bottom'}).click();
  await page.waitForFunction(()=>!document.getElementById('picker').open);
  const saved=JSON.parse(await fs.readFile(path.join(root,'skyportal-data/settings.json')));
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
  const mixed=JSON.parse(await fs.readFile(path.join(root,'skyportal-data/settings.json')));
  assert.deepEqual(mixed.profiles[3].players[0].favorite,{top:'2000-8192.sky',bottom:'1001-8192.sky'});
  assert.match(await page.locator('#favorite-0 .name').textContent(),/Boom Jet \/ Free Ranger/);
  const halves=await page.locator('#favorite-0 .half-art').evaluateAll(els=>els.map(el=>{const r=el.getBoundingClientRect();return {x:r.x,y:r.y,bottom:r.bottom};}));
  assert.equal(halves[0].x,halves[1].x);assert.ok(halves[0].bottom<=halves[1].y+1);
  assert.equal(await page.locator('.portal').getAttribute('src'),'portal.png');
  await page.locator('#tab-1').click();
  await page.getByRole('button',{name:'Change Water Skylander',exact:true}).click();
  assert.equal(await page.locator('.picker-item').count(),2); // no Giant Thumpback in ordinary Water choices
  await page.locator('#picker-close').click();
  await page.locator('#settings').click();await page.locator('#settings-close').click();
  await page.locator('#tab-0').click();
  await page.screenshot({path:'out/skyportal-ui.png',fullPage:true});
  assert.deepEqual(errors,[]);
  // Integration is opt-in and requires a Cemu session with empty portal rows.
  if(process.env.SKYPORTAL_INTEGRATION==='1'){
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
    await page.screenshot({path:'out/skyportal-connected.png',fullPage:true});
    await page.locator('#player-0 .remove').click();await page.waitForFunction(()=>!document.querySelector('#player-0 .remove'));
    await page.locator('#player-1 .remove').click();await page.waitForFunction(()=>!document.querySelector('#player-1 .remove'));
    await page.locator('#sidekick .remove').click();await page.waitForFunction(()=>!document.querySelector('#sidekick .remove'));
  }
  console.log(`UI PASS. Fixture: ${root}`);
 }finally{await instance.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
