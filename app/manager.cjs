'use strict';
const fs=require('node:fs/promises');
const path=require('node:path');
const {EventEmitter}=require('node:events');
const model=require('./model.cjs');
const accessories=require('./accessories.cjs');
const trapData=require('./traps.cjs');
const dump=require('./dump.cjs');
const catalog=require('../resources/catalog.json');
const {Journal}=require('./journal.cjs');
const discord=require('./discord.cjs');
const obs=require('./obs.cjs');
const gates=require('../resources/gates.json');
const unsavedAfter=3*60*1000;
const trapKeys=['Q','W','E','R','Y','U','I','O','P','L'];
const trapSignature=trap=>`${trap?.state||'unknown'}:${trap?.state==='captured'?trap.recordId:''}`;
const trapIdentity=f=>JSON.stringify([f.key,f.uid,f.id,f.variant]);

class Manager extends EventEmitter {
  constructor(root,control) {
    super(); this.root=root; this.control=control;
    this.config={game:2,profiles:{},artRoot:null}; this.figures=[]; this.warnings=[];
    this.session={pid:0,supported:false,game:0,focused:false};
    this.active=[null,null]; this.sidekick=null; this.accessories={}; this.observed=[]; this.labels={}; this.busy=false; this.message='Start Cemu to connect your portal.';
    this.journal=new Journal(root); this.loaded=new Map();
  }
  get game() { return this.session.game || this.config.game; }
  get profile() {
    const profile=this.config.profiles[this.game] ||= model.newProfile(this.figures,this.game);
    for(const player of profile.players) model.normalizeDefaults(player);
    return profile;
  }
  async init() {
    // Copy the previous release's portable data once; keep the original as a backup.
    const dataDir=path.join(this.root,'de-perportal-data');
    const legacyDir=path.join(this.root,'skyportal-data');
    try {
      await fs.access(dataDir);
    } catch(e) {
      if(e.code!=='ENOENT') throw e;
      try { await fs.cp(legacyDir,dataDir,{recursive:true,errorOnExist:true,force:false}); }
      catch(copyError) { if(copyError.code!=='ENOENT') throw copyError; }
    }
    try { const c=JSON.parse(await fs.readFile(path.join(this.root,'de-perportal-data/settings.json'),'utf8'));
      if(c && Number.isInteger(c.game) && c.game>=1 && c.game<=6 && c.profiles && typeof c.profiles==='object') this.config=c;
    } catch(e) { if(e.code!=='ENOENT') this.message='Could not read saved settings; using defaults.'; }
    this.selectedTrap=this.config.trapSelections?.[this.game] ?? null;
    await this.journal.load().catch(()=>{});
    await this.rescan();
  }
  async rescan() {
    if(this.busy) throw Error('Wait for the current swap.');
    const result=await model.scan(path.join(this.root,'NFC'),this.config.artRoot || path.join(this.root,'de-perportal-data/art'));
    this.figures=result.figures; this.warnings=result.warnings;
    let trapMetadataChanged=false;
    if(!this.config.trapResets || typeof this.config.trapResets!=='object' || Array.isArray(this.config.trapResets)) this.config.trapResets={};
    const resets=this.config.trapResets;
    for(const f of this.figures.filter(f=>f.info?.kind==='Trap')) {
      const identity=trapIdentity(f),baseline=resets[identity];
      if(baseline!==undefined) {
        if(baseline===trapSignature(f.trap)) f.trap={state:'empty',appReset:true};
        else {
          delete resets[identity];trapMetadataChanged=true;
        }
      }
      const labels=this.config.trapLabels||{},label=labels[identity];
      if(label && label.recordId!==null && (f.trap?.state!=='captured' || label.recordId!==f.trap.recordId)) { delete labels[identity];trapMetadataChanged=true; }
    }
    if(trapMetadataChanged) await this.save();
    if(model.repairTrapTeamElements(this.config.profiles[4],this.figures)) await this.save();
    this.profile;
    this.publish();
  }
  requestRescan() {
    // Games write a trap in a small burst.  Coalesce those events and never
    // scan halfway through our own portal operation.
    clearTimeout(this.rescanTimer);
    this.rescanTimer=setTimeout(async()=>{
      if(this.busy) { this.rescanPending=true; return; }
      try { await this.rescan(); } catch {};
    },650);
  }
  async flushDeferredRescan() {
    if(!this.rescanPending) return;
    this.rescanPending=false;
    try { await this.rescan(); } catch {}
  }
  state() {
    const hasArt=this.figures.some(f=>f.art);
    return {game:this.game,detected:!!this.session.game,session:this.session,profile:this.profile,
      active:this.active,sidekick:this.sidekick,accessories:this.accessories,accessorySlots:accessories.slots,observed:this.observed,busy:this.busy,message:this.message,warnings:this.warnings,
      hasArt,vehicleShortcuts:this.vehicleShortcuts(),vehicleKeys:accessories.vehicleKeys,
      figures:this.figures.map(({path:_,uid,art,...f})=>({...f,...(f.info?.kind==='Trap'?{trapLabel:this.config.trapLabels?.[JSON.stringify([f.key,uid,f.id,f.variant])] || null}:{}),accessory:accessories.describe(f,this.game),art:art?`art://figure/${encodeURIComponent(f.key)}`:null})),
      root:this.root,elements:model.elements,perks:model.perks,games:model.games,
      recent:this.journal.recent(8),history:this.journal.history.slice(-60).reverse(),lastPlayed:this.journal.lastPlayed(),
      challenge:{nuzlocke:!!this.config.nuzlocke,fallen:this.fallen()},gates:this.gates,gateLevel:this.config.gateLevels?.[this.game] ?? null,
      stream:{discord:!!this.config.discord,obs:!!this.config.obs,discordAvailable:discord.available(),obsUrl:`http://127.0.0.1:${obs.port}/`}};
  }
  vehicleShortcuts() {
    // An assigned vehicle wins; otherwise the first of that type by name.
    const saved=this.config.profiles[5]?.vehicles || {};
    return Object.fromEntries(Object.values(accessories.vehicleKeys).map(type=>{
      const fleet=this.figures.filter(f=>accessories.available(f,5,'vehicle') && accessories.vehicleType(f)===type).sort((a,b)=>a.info.name.localeCompare(b.info.name)||a.key.localeCompare(b.key));
      const assigned=fleet.find(f=>f.key===saved[type]?.top);
      return [type,{key:(assigned || fleet[0])?.key || null,assigned:!!assigned}];
    }));
  }
  publish() { this.emit('state',this.state()); }
  updateSession(s) {
    const next={pid:s.pid,supported:s.supported,focused:s.focused,game:model.detectGame(s.title||''),bounds:s.bounds||null};
    if(next.pid!==this.session.pid) { this.active=[null,null]; this.sidekick=null; this.accessories={}; this.labels={}; this.selectedTrap=this.config.trapSelections?.[next.game || this.config.game] ?? null; }
    const changed=JSON.stringify(next)!==JSON.stringify(this.session);
    const rowsChanged=JSON.stringify(s.rows||[])!==JSON.stringify(this.observed);
    this.observed=s.rows||[];
    if(!this.busy) {
      for(let p=0;p<2;p++) if(this.observed[p*2]==='None' || (this.labels[p*2+1] && this.observed[p*2] && this.labels[p*2+1]!==this.observed[p*2])) this.active[p]=null;
      for(const slot of accessories.slots) {
        const observed=this.observed[slot.row-1];
        if(observed==='None' || (this.labels[slot.row] && observed && this.labels[slot.row]!==observed)) delete this.accessories[slot.key];
      }
      if(this.observed[4]==='None' || (this.labels[5] && this.observed[4] && this.labels[5]!==this.observed[4]))this.sidekick=null;
    }
    this.session=next;
    if(changed) { this.message=!next.pid?'Start Cemu to connect your portal.':!next.supported?'Use the recommended Cemu Skylanders build.':next.game?'Portal connected. Your game profile is ready.':'Cemu connected. Choose a profile while you prepare.'; this.publish(); }
    else if(rowsChanged && !this.busy) this.publish();
  }
  async save() {
    const dir=path.join(this.root,'de-perportal-data'); await fs.mkdir(dir,{recursive:true});
    await fs.writeFile(path.join(dir,'settings.json.tmp'),JSON.stringify(this.config,null,2));
    await fs.rename(path.join(dir,'settings.json.tmp'),path.join(dir,'settings.json'));
  }
  trapName(f) {
    const saved=this.config.trapLabels?.[JSON.stringify([f.key,f.uid,f.id,f.variant])];
    return saved && f.trap?.state!=='empty' && (f.trap?.state!=='captured' || saved.recordId===null || saved.recordId===f.trap.recordId)?saved.name:null;
  }
  async resetTrapDetections() {
    if(this.busy) throw Error('Wait for the current operation.');
    this.busy=true;this.publish();
    try {
      const resets=this.config.trapResets={};
      this.config.trapLabels={};this.config.trapSelections={};this.selectedTrap=null;
      for(const f of this.figures.filter(f=>f.info?.kind==='Trap')) {
        try {
          const bytes=await fs.readFile(f.path),current=model.identify(bytes);
          if(current.uid!==f.uid || current.id!==f.id || current.variant!==f.variant) continue;
          resets[trapIdentity(f)]=trapSignature(trapData.decode(bytes));
        } catch {}
      }
      await this.save();this.message='Trap detections and names reset in PerPortal. NFC dumps were not changed.';
    } finally {this.busy=false;await this.rescan();}
  }
  async restoreLatestTrapBackup() {
    if(this.busy) throw Error('Wait for the current operation.');
    const backupRoot=path.join(this.root,'de-perportal-data','trap-backups');
    const folders=(await fs.readdir(backupRoot,{withFileTypes:true}).catch(e=>e.code==='ENOENT'?[]:Promise.reject(e)))
      .filter(entry=>entry.isDirectory() && /^\d+$/.test(entry.name)).map(entry=>entry.name).sort((a,b)=>Number(b)-Number(a));
    if(!folders.length) throw Error('No trap backup was found.');
    this.busy=true;this.publish();
    let restored=0;
    const before=path.join(backupRoot,`before-restore-${Date.now()}`),nfcRoot=path.resolve(this.root,'NFC');
    try {
      const sourceRoot=path.join(backupRoot,folders[0]);
      const walk=async(dir='')=>{
        for(const entry of await fs.readdir(path.join(sourceRoot,dir),{withFileTypes:true})) {
          const rel=path.join(dir,entry.name);
          if(entry.isDirectory()) {await walk(rel);continue;}
          if(!entry.isFile()) continue;
          const bytes=await fs.readFile(path.join(sourceRoot,rel));
          let figure;try {figure=model.identify(bytes);} catch {continue;}
          if(figure.info?.kind!=='Trap') continue;
          const destination=path.resolve(nfcRoot,...rel.split(path.sep));
          const relative=path.relative(nfcRoot,destination);
          if(relative==='..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) throw Error('Invalid trap backup path.');
          try {
            const current=await fs.readFile(destination),saved=path.join(before,relative);
            await fs.mkdir(path.dirname(saved),{recursive:true});await fs.writeFile(saved,current,{flag:'wx'});
          } catch(e) {if(e.code!=='ENOENT') throw e;}
          await fs.mkdir(path.dirname(destination),{recursive:true});
          const temp=`${destination}.restore-${Date.now()}`;
          await fs.writeFile(temp,bytes);await fs.rename(temp,destination);restored++;
        }
      };
      await walk();
      if(!restored) throw Error('The latest trap backup contains no valid trap dumps.');
      this.message=`Restored ${restored} trap dumps from ${folders[0]}. Restart Cemu before using them. Current files backed up in ${before}.`;
    } finally {this.busy=false;await this.rescan();}
  }
  async select({player,target,choice,preset,name}) {
    if(this.busy) throw Error('Wait for the current swap.');
    if(target==='trap-name') {
      const f=this.figures.find(f=>f.key===choice?.top);
      if(f?.info?.kind!=='Trap') throw Error('Choose a trap from your library.');
      if(typeof name!=='string' || name.length>80) throw Error('Use a name of at most 80 characters.');
      const key=JSON.stringify([f.key,f.uid,f.id,f.variant]);
      const labels=this.config.trapLabels ||= {};
      if(name.trim()) labels[key]={name:name.trim(),recordId:f.trap?.recordId ?? null};
      else delete labels[key];
      await this.save(); this.publish(); return;
    }
    if(target==='vehicle-shortcut') {
      if(this.game!==5) throw Error('Vehicle shortcuts are available only in SuperChargers.');
      const type=Object.values(accessories.vehicleKeys).find(t=>t===choice?.type);
      const f=this.figures.find(f=>f.key===choice?.top);
      if(!type || !accessories.available(f,this.game,'vehicle') || accessories.vehicleType(f)!==type) throw Error('Choose a vehicle of the matching type.');
      (this.profile.vehicles ||= {})[type]={top:f.key,bottom:null};
      await this.save(); this.publish(); return;
    }
    if(target==='active-favorite' || target==='favorite') {
      if(![0,1].includes(player)) throw Error('Invalid player.');
      const defaults=this.profile.players[player];
      preset=preset ?? defaults.activeFavorite;
      if(!Number.isInteger(preset) || preset<0 || preset>2) throw Error('Choose default preset 1, 2, or 3.');
      if(target==='active-favorite') {
        if(!defaults.favorites[preset]) throw Error('Assign this default preset first.');
      } else {
        model.resolveChoice(choice,this.figures,this.game);
        defaults.favorites[preset]=choice;
      }
      defaults.activeFavorite=preset;
      model.normalizeDefaults(defaults);
      await this.save(); this.publish(); return;
    }
    if(target==='sidekick') {
      if(choice && !model.candidates(this.figures,this.game,null,'sidekick').some(f=>f.key===choice.top)) throw Error('Choose an available sidekick.');
      this.profile.sidekick=choice;
    } else {
      if(![0,1].includes(player) || !model.elements.includes(target)) throw Error('Invalid selection.');
      const selected=model.resolveChoice(choice,this.figures,this.game);
      if(selected.length!==1 || !model.elementalDoorFigure(selected[0],this.game,target)) throw Error(this.game===4 ? 'Trap Team element slots use Trap Masters of the matching element.' : 'Element slots use ordinary Skylanders of the matching element.');
      this.profile.players[player].elements[target]=choice;
    }
    await this.save(); this.publish();
  }
  async setGame(game) {
    if(this.busy) throw Error('Wait for the current swap.');
    if(this.session.game) throw Error('The running game selects its own profile.');
    if(!Number.isInteger(game)||game<1||game>6) throw Error('Invalid game.');
    this.config.game=game; this.selectedTrap=this.config.trapSelections?.[game] ?? null; this.profile; await this.save(); this.publish();
  }
  async action(data) {
    if(this.busy) throw Error('A portal swap is already in progress.');
    // Hold the lock during async file validation as well as native writes.
    this.busy=true;
    try { return await this.performAction(data); }
    finally { this.busy=false; this.publish(); await this.flushDeferredRescan(); }
  }
  async performAction({player=0,target='favorite',choice=null,slot=null}) {
    const game=this.game,pid=this.session.pid;
    if(!this.session.pid || !this.session.supported) throw Error('Start the recommended Cemu build first.');
    if(![0,1].includes(player)) throw Error('Invalid player.');
    if(target==='accessory' || target==='remove-accessory') return this.accessoryAction({target,choice,slot});
    let selected, perkBase=null, replaceBottom=false;
    if(target==='thumpback') {
      player=0;
      selected=model.choice(this.figures.find(f=>f.id===107 && model.playable(f,this.game)),this.figures);
      if(!selected) throw Error('Thumpback is missing or unavailable in this game (Giants and later).');
    } else if(target==='thumpling') {
      selected=model.choice(model.candidates(this.figures,this.game,null,'sidekick').find(f=>f.id===541),this.figures);
      if(!selected) throw Error('Thumpling’s sidekick figure is missing or unavailable in this game (Giants and later).');
      target='sidekick';
    } else if(target==='sidekick') selected=choice || this.profile.sidekick;
    else if(target==='remove' || target==='remove-sidekick') selected=null;
    else if(target==='direct') selected=choice;
    else if(target==='favorite') selected=this.profile.players[player].favorite;
    else if(model.elements.includes(target)) selected=this.profile.players[player].elements[target];
    else if(target.startsWith('perk-')) {
      if(this.game!==3) throw Error('Swap Force perk bases are available only in Swap Force.');
      perkBase=model.perkChoice(this.figures,target.slice(5));
      if(!perkBase) throw Error('This perk base needs matching top and bottom dumps in your NFC library.');
      const activeTop=this.figures.find(f=>f.key===this.active[player]?.top);
      replaceBottom=activeTop?.half==='top';
      selected={top:perkBase.top.key,bottom:perkBase.bottom.key};
    }
    else throw Error('Unknown portal action.');
    let files=[];
    if(target==='sidekick') {
      const f=model.candidates(this.figures,this.game,null,'sidekick').find(f=>f.key===selected?.top);
      if(!f) throw Error('Choose an available sidekick.'); files=[f];
    } else if(target!=='remove' && target!=='remove-sidekick') files=model.resolveChoice(selected,this.figures,this.game);
    if(replaceBottom) files=[perkBase.bottom];
    // Reject duplicates and changed dumps before touching any Cemu row.
    const others=[...Object.values(this.accessories).map(c=>c.top),...this.active.flatMap((c,p)=>p===player && target!=='sidekick'?[]:c?[c.top,c.bottom].filter(Boolean):[]),...(target!=='sidekick' && this.sidekick?[this.sidekick.top]:[])];
    const otherFigures=others.map(k=>this.figures.find(f=>f.key===k)).filter(Boolean);
    for(const f of files) {
      if(this.config.nuzlocke && this.fallen().includes(f.key)) throw Error(`${f.info.name} has fallen. Revive it in Collection to use it again.`);
      const now=model.identify(await fs.readFile(f.path));
      if(now.id!==f.id || now.variant!==f.variant || now.uid!==f.uid) throw Error('A figure changed since scanning. Rescan your NFC folder.');
      if(otherFigures.some(x=>x.key===f.key || x.uid===f.uid)) throw Error('That figure is already on the portal. Choose a different figure for each player.');
    }
    const outgoing=(target==='sidekick' || target==='remove-sidekick'?[this.sidekick]:[this.active[player]]).flatMap(c=>c?[c.top,c.bottom].filter(Boolean):[]);
    this.busy=true; this.message='Swapping on the portal…'; this.publish();
    try {
      const run=async(args)=>{
        if(this.session.pid!==pid || this.game!==game) throw Error('Cemu or the game changed during the swap.');
        if(args[0]==='load') await this.beforeLoad(args[2],player);
        const output=await this.control(args);
        if(this.session.pid!==pid || this.game!==game) throw Error('Cemu or the game changed during the swap.');
        const label=typeof output==='string' && output.match(/Row (\d+): .* -> (.*)/);
        if(label)this.labels[Number(label[1])]=label[2].trim();
        return output;
      };
      if(target==='remove-sidekick') {
        await run(['clear','5']);this.sidekick=null;
      } else if(target==='sidekick') {
        await run(['load','5',files[0].path]); this.sidekick={top:files[0].key,bottom:null};
      } else {
        const first=player*2+1;
        // Reserve two rows per player in every game; row 5 is a separate sidekick.
        await run(['clear',String(first+1)]);
        if(this.active[player]) this.active[player]={top:this.active[player].top,bottom:null};
        if(replaceBottom) {
          await run(['load',String(first+1),files[0].path]);
          this.active[player]={top:this.active[player].top,bottom:files[0].key};
        } else if(files.length) {
          await run(['load',String(first),files[0].path]);
          this.active[player]={top:files[0].key,bottom:null};
          if(files[1]) { await run(['load',String(first+1),files[1].path]); this.active[player].bottom=files[1].key; }
        } else { await run(['clear',String(first)]); this.active[player]=null; }
      }
      this.warnUnsaved(outgoing.filter(k=>![this.sidekick,...this.active].some(c=>c && (c.top===k || c.bottom===k))));
      this.message=target==='remove-sidekick'?'Sidekick removed.':target==='remove'?`Player ${player+1} removed.`:replaceBottom?`${perkBase.perk.name} base is on Player ${player+1}.`:`${files[0].info.name} is on the portal.`;
    } catch(e) { this.message=`Swap stopped: ${e.message} Check Cemu before retrying.`; throw e; }
  }
  async accessoryAction({target,choice,slot}) {
    const game=this.game,pid=this.session.pid;
    const definition=accessories.slots.find(s=>s.key===slot);
    if(!definition) throw Error('Choose a valid accessory slot.');
    const removing=target==='remove-accessory';
    const f=this.figures.find(f=>f.key===choice?.top);
    if(!removing) {
      if(choice?.bottom || !accessories.available(f,this.game,slot)) throw Error('This accessory is unavailable in the selected game or slot.');
      const now=model.identify(await fs.readFile(f.path));
      if(now.id!==f.id || now.variant!==f.variant || now.uid!==f.uid) throw Error('A figure changed since scanning. Rescan your NFC folder.');
      const keys=[...this.active.flatMap(c=>c?[c.top,c.bottom]:[]),this.sidekick?.top,
        ...Object.entries(this.accessories).filter(([key])=>key!==slot).map(([,c])=>c.top)];
      if(this.figures.some(other=>keys.includes(other.key) && (other.key===f.key || other.uid===f.uid))) throw Error('That figure is already on the portal. Choose a different figure.');
    }
    const row=String(definition.row),outgoing=this.accessories[slot]?.top;
    this.busy=true;this.message=removing?'Removing accessory…':'Activating accessory…';this.publish();
    try {
      if(this.session.pid!==pid || this.game!==game) throw Error('Cemu or the game changed during the swap.');
      // Always clear the row first so that replacing an existing accessory works
      // correctly, matching the behaviour of the player-figure swap logic.
      await this.control(['clear',row]);
      delete this.accessories[slot];
      if(this.session.pid!==pid || this.game!==game) throw Error('Cemu or the game changed during the swap.');
      if(!removing) {
        await this.beforeLoad(f.path,null);
        const output=await this.control(['load',row,f.path]);
        const label=typeof output==='string' && output.match(/Row (\d+): .* -> (.*)/);
        if(label)this.labels[Number(label[1])]=label[2].trim();
        if(this.session.pid!==pid || this.game!==game) throw Error('Cemu or the game changed during the swap.');
        this.accessories[slot]={top:f.key,bottom:null};
      }
      if(outgoing && outgoing!==f?.key) this.warnUnsaved([outgoing]);
      this.message=removing?'Accessory removed.':`${f.info.name} is on the portal.`;
    } catch(e) { this.message=`Accessory swap stopped: ${e.message} Check Cemu before retrying.`;throw e; }
  }
  get gates() { return gates[this.game]||[]; }
  fallen() { return this.config.fallen?.[this.game] || []; }
  async beforeLoad(file,player) {
    const f=this.figures.find(f=>f.path===file);
    if(!f) return;
    // A failed backup must not stop play, but it must be visible.
    try { await this.journal.backup(f.key,f.path); } catch(e) { this.emit('notification',`Backup of ${f.info?.name||f.key} failed: ${e.message}`); }
    try { this.loaded.set(f.key,{mtime:(await fs.stat(f.path)).mtimeMs,at:Date.now()}); } catch {}
    this.journal.record({key:f.key,name:f.info?.name||f.key,game:this.game,player,at:Date.now()}).catch(()=>{});
  }
  // Cemu writes progress when the game decides to save (Cemu issue #1322).
  // A figure whose dump never changed while it was on the portal may lose progress.
  async warnUnsaved(keys) {
    for(const key of keys) {
      const loaded=this.loaded.get(key),f=this.figures.find(f=>f.key===key);
      this.loaded.delete(key);
      if(!loaded || !f || Date.now()-loaded.at<unsavedAfter) continue;
      try {
        if((await fs.stat(f.path)).mtimeMs!==loaded.mtime) continue;
        const text=`${f.info?.name||key} had not saved since it was loaded. Recent progress may be lost; its backup is in Collection › History.`;
        this.message=text;this.publish();this.emit('notification',text);
      } catch {}
    }
  }
  async backups(key) {
    if(!this.figures.some(f=>f.key===key)) throw Error('That figure is not in your library.');
    return (await this.journal.list(key)).map(name=>({name,at:parseInt(name)}));
  }
  async restoreBackup({key,name}) {
    if(this.busy) throw Error('Wait for the current operation.');
    const f=this.figures.find(f=>f.key===key);
    if(!f) throw Error('That figure is not in your library.');
    if(this.onPortal(key)) throw Error(`Take ${f.info?.name||key} off the portal before restoring it.`);
    this.busy=true;this.publish();
    try { await this.journal.restore(key,f.path,name);this.message=`${f.info?.name||key} restored from ${new Date(parseInt(name)).toLocaleString()}. The file it replaced is kept as a backup.`; }
    finally { this.busy=false;await this.rescan(); }
  }
  onPortal(key) { return [this.sidekick,...this.active,...Object.values(this.accessories)].some(c=>c && (c.top===key || c.bottom===key)); }
  // Fix and Reset rewrite a dump in place: back it up, write a checked copy
  // beside it and swap it in, like restoring a backup.
  async rewrite(key,change,done) {
    if(this.busy) throw Error('Wait for the current operation.');
    const f=this.figures.find(f=>f.key===key);
    if(!f) throw Error('That figure is not in your library.');
    if(this.onPortal(key)) throw Error(`Take ${f.info?.name||key} off the portal first.`);
    this.busy=true;this.publish();
    try {
      const bytes=await fs.readFile(f.path),now=model.identify(bytes);
      if(now.id!==f.id || now.variant!==f.variant || now.uid!==f.uid) throw Error('A figure changed since scanning. Rescan your NFC folder.');
      const out=change(bytes,f.info);
      await this.journal.backup(f.key,f.path);
      const temp=`${f.path}.${Date.now()}.tmp`;
      await fs.writeFile(temp,out);await fs.rename(temp,f.path);
      if(f.info?.kind==='Trap') {
        // Names and ignored detections described the old contents.
        const identity=trapIdentity(f);
        delete this.config.trapLabels?.[identity];delete this.config.trapResets?.[identity];await this.save();
      }
      this.message=done(f.info?.name||key);
    } finally { this.busy=false;await this.rescan(); }
  }
  repairFigure(key) { return this.rewrite(key,dump.repair,name=>`${name} fixed. The file it replaced is kept as a backup.`); }
  resetFigure(key) { return this.rewrite(key,dump.reset,name=>`${name} is a fresh toy again. The file it replaced is kept as a backup.`); }
  // New dumps go to NFC/Created, named after the figure, never over a file.
  async createDump({id,variant}={}) {
    if(this.busy) throw Error('Wait for the current operation.');
    const info=catalog.find(c=>c.id===id && c.variant===variant);
    if(!info) throw Error('Choose a figure from the catalog.');
    const taken=new Set(this.figures.map(f=>f.uid));
    let uid;do uid=require('node:crypto').randomBytes(4); while(taken.has(uid.toString('hex')));
    const bytes=dump.create(info,uid),dir=path.join(this.root,'NFC','Created');
    const stem=info.name.replace(/[<>:"/\\|?*\x00-\x1f]/g,'').trim() || `${id}-${variant}`;
    await fs.mkdir(dir,{recursive:true});
    for(let n=1;;n++) {
      const file=path.join(dir,`${stem}${n>1?` ${n}`:''}.sky`);
      try { await fs.writeFile(file,bytes,{flag:'wx'}); } catch(e) { if(e.code==='EEXIST') continue; throw e; }
      this.message=`A new ${info.name} is in your NFC folder.`;
      await this.rescan();
      return path.relative(path.join(this.root,'NFC'),file).split(path.sep).join('/');
    }
  }
  async random(player) {
    if(![0,1].includes(player)) throw Error('Invalid player.');
    const fallen=this.config.nuzlocke?this.fallen():[];
    const taken=[this.sidekick,...this.active.filter((_,p)=>p!==player),...Object.values(this.accessories)].flatMap(c=>c?[c.top,c.bottom]:[]);
    const takenUids=new Set(this.figures.filter(f=>taken.includes(f.key)).map(f=>f.uid));
    const pool=model.candidates(this.figures,this.game).filter(f=>f.half!=='bottom' && !fallen.includes(f.key) && !takenUids.has(f.uid))
      .map(f=>model.choice(f,this.figures)).filter(c=>c && !(c.bottom && fallen.includes(c.bottom)));
    if(!pool.length) throw Error('No Skylander is free for a random pick.');
    const choice=pool[Math.floor(Math.random()*pool.length)];
    await this.action({player,target:'direct',choice});
    this.emit('notification',`Random · Player ${player+1}: ${this.figures.find(f=>f.key===choice.top).info.name}`);
    return choice;
  }
  async setChallenge({nuzlocke,fallen,key,reset}={}) {
    if(typeof nuzlocke==='boolean') this.config.nuzlocke=nuzlocke;
    const list=new Set(this.fallen());
    if(reset) list.clear();
    if(key) {
      if(!this.figures.some(f=>f.key===key)) throw Error('That figure is not in your library.');
      if(fallen) list.add(key); else list.delete(key);
    }
    (this.config.fallen ||= {})[this.game]=[...list];
    await this.save();this.publish();
  }
  async setGateLevel(index) {
    if(index!==null && !(Number.isInteger(index) && this.gates[index])) throw Error('Choose a level from the list.');
    (this.config.gateLevels ||= {})[this.game]=index;
    await this.save();this.publish();
  }
  async setStream(options) {
    for(const k of ['discord','obs']) if(typeof options?.[k]==='boolean') this.config[k]=options[k];
    await this.save();this.publish();
  }
  exportProfile() { return {app:'Dè PerPortal',version:1,game:this.game,profile:this.profile}; }
  // Figures missing from this library become unassigned slots.
  async importProfile(data) {
    if(this.busy) throw Error('Wait for the current operation.');
    if(data?.app!=='Dè PerPortal' || data.game!==this.game || !Array.isArray(data.profile?.players) || data.profile.players.length!==2) throw Error(`This file is not a Dè PerPortal profile for ${model.games[this.game-1]}.`);
    let missing=0;
    const check=(c,valid=()=>true)=>{
      if(!c) return null;
      try { const files=model.resolveChoice(c,this.figures,this.game);if(valid(files)) return {top:c.top,bottom:c.bottom||null}; } catch {}
      missing++;return null;
    };
    const players=data.profile.players.map(p=>{
      const out={favorites:Array.from({length:3},(_,i)=>check(p.favorites?.[i] ?? (i===0?p.favorite:null))),activeFavorite:p.activeFavorite,elements:{}};
      for(const el of model.elements) out.elements[el]=check(p.elements?.[el],files=>files.length===1 && model.elementalDoorFigure(files[0],this.game,el));
      model.normalizeDefaults(out);return out;
    });
    let sidekick=null;
    if(data.profile.sidekick) {
      if(model.candidates(this.figures,this.game,null,'sidekick').some(f=>f.key===data.profile.sidekick.top)) sidekick={top:data.profile.sidekick.top,bottom:null};
      else missing++;
    }
    const vehicles={};
    if(this.game===5) for(const type of Object.values(accessories.vehicleKeys)) {
      const c=data.profile.vehicles?.[type],f=this.figures.find(f=>f.key===c?.top);
      if(c && !c.bottom && accessories.available(f,5,'vehicle') && accessories.vehicleType(f)===type)
        vehicles[type]={top:f.key,bottom:null};
      else {vehicles[type]=null;if(c) missing++;}
    }
    this.config.profiles[this.game]={...this.profile,players,sidekick,...(this.game===5?{vehicles}:{})};
    await this.save();this.message=missing?`Profile imported. ${missing} figure${missing===1?' is':'s are'} not in your library and left unassigned.`:'Profile imported.';this.publish();
    return missing;
  }
  async diagnostics() {
    const exists=p=>fs.access(p).then(()=>true,()=>false);
    const cemu=(await Promise.all(['Cemu-Skylanders-Emulated-Portal.exe','Cemu.exe'].map(n=>exists(path.join(this.root,n))))).some(Boolean);
    const groups=new Map();
    for(const f of this.figures) { const id=`${f.uid}:${f.id}:${f.variant}`;groups.set(id,[...(groups.get(id)||[]),f.key]); }
    // A figure newer than the game its top folder is named after can't be used in that game.
    // Older figures in a newer game's folder are fine: later games accept them.
    const folders=[/spyro/,/giants/,/swap/,/trap/,/super/,/imaginators/];
    const misplaced=this.figures.filter(f=>{
      const parts=f.key.toLowerCase().split('/'),g=parts.length>1?folders.findIndex(r=>r.test(parts[0])):-1;
      return f.info && g>=0 && f.info.game>g+1;
    }).map(f=>f.key);
    return {cemu,running:!!this.session.pid,supported:!!this.session.supported,game:this.session.game,nfc:await exists(path.join(this.root,'NFC')),
      counts:model.games.map((_,i)=>this.figures.filter(f=>f.info?.game===i+1).length),total:this.figures.length,unknown:this.figures.filter(f=>!f.info).length,
      art:this.figures.some(f=>f.art),damaged:this.figures.filter(f=>f.save?.state==='damaged' || f.dump?.ok===false).map(f=>f.key),
      duplicates:[...groups.values()].filter(g=>g.length>1),misplaced,warnings:this.warnings};
  }
  figurePath(key) { const f=this.figures.find(f=>f.key===key);if(!f) throw Error('That figure is not in your library.');return f.path; }
  async hotkey({player,key}) {
    if(!this.session.game) return;
    if(this.game===4 && player===0 && !this.busy && (key==='Up' || key==='Down' || key==='LockTrap' || trapKeys.includes(key))) {
      const roster=this.figures.filter(f=>f.info?.kind==='Trap' && this.trapName(f)).sort((a,b)=>this.trapName(a).localeCompare(this.trapName(b))||a.key.localeCompare(b.key));
      try {
        if(key==='Up' || key==='Down') {
          if(!roster.length) {this.emit('notification','Capture a villain and name it in the GUI first.');return;}
          const index=roster.findIndex(f=>f.key===this.selectedTrap);
          const next=index<0?(key==='Down'?0:roster.length-1):(index+(key==='Down'?1:-1)+roster.length)%roster.length;
          const f=roster[next];this.selectedTrap=f.key;
          this.config.trapSelections??={};this.config.trapSelections[this.game]=f.key;
          this.save().catch(()=>{});
          this.emit('notification',`${this.trapName(f)} · ${f.info.element} · Alt+Space to lock in`);
          return;
        }
        let f;
        if(key==='LockTrap') {
          f=roster.find(f=>f.key===this.selectedTrap);
          if(!f) throw Error('Select a named villain with Alt+↑ / Alt+↓ first.');
          // Re-read before loading so a changed capture cannot reuse a stale name.
          const current=trapData.decode(await fs.readFile(f.path));
          if(current.state!==f.trap?.state || current.recordId!==f.trap?.recordId) throw Error('Trap contents changed. Rescan and name the current villain.');
        } else {
          const element=model.elements[trapKeys.indexOf(key)];
          f=this.figures.filter(f=>f.info?.kind==='Trap' && f.info.element===element && !this.trapName(f)).sort((a,b)=>(a.trap?.state==='empty'?0:1)-(b.trap?.state==='empty'?0:1)||a.key.localeCompare(b.key))[0];
          if(!f) throw Error(`No unassigned ${element} trap is available. Named traps stay in the Alt+Up/Down carousel.`);
        }
        await this.action({target:'accessory',slot:'trap',choice:{top:f.key,bottom:null}});
        this.emit('notification',`${key==='LockTrap'?'Locked in: ':''}${this.trapName(f)||f.info.name} · ${f.info.element}`);
      } catch(e) {this.message=e.message;this.publish();this.emit('notification',e.message);}
      return;
    }
    if(this.game===5 && accessories.vehicleKeys[key]) {
      // The story vehicle is shared, so both players' shortcuts use the same slot.
      if(this.busy) return;
      const type=accessories.vehicleKeys[key],f=this.figures.find(f=>f.key===this.vehicleShortcuts()[type].key);
      try {
        if(!f) throw Error(`No ${type} vehicle in your NFC library.`);
        await this.action({target:'accessory',slot:'vehicle',choice:{top:f.key,bottom:null}});
        this.emit('notification',`${type} vehicle: ${f.info.name}`);
      } catch(e) {this.message=e.message;this.publish();this.emit('notification',e.message);}
      return;
    }
    if(key==='Left' || key==='Right') {
      if(![0,1].includes(player) || this.busy || this.switchingPreset) return;
      this.switchingPreset=true;
      try {
        const defaults=this.profile.players[player],direction=key==='Right'?1:-1;
        for(let step=1;step<=3;step++) {
          const preset=(defaults.activeFavorite+direction*step+3)%3;
          if(!defaults.favorites[preset]) continue;
          try {
            await this.select({player,target:'active-favorite',preset});
            const names=model.resolveChoice(defaults.favorites[preset],this.figures,this.game).map(f=>f.info.name);
            this.emit('notification',`Player ${player+1} · Preset ${preset+1}: ${names.join(' / ')}`);
          } catch(e) { this.message=e.message; this.publish();this.emit('notification',e.message); }
          return;
        }
        this.emit('notification',`Player ${player+1}: assign a default preset first.`);
      } finally { this.switchingPreset=false; }
      return;
    }
    if(key==='D' || key==='G') {
      if(this.busy) return;
      try {
        if(key==='D') await this.random(player);
        else {
          const level=this.gates[this.config.gateLevels?.[this.game]];
          if(!level) throw Error('Choose the level you are playing under Element shortcuts first.');
          const onPortal=new Set(this.active.flatMap(c=>c?[c.top]:[]).map(k=>this.figures.find(f=>f.key===k)?.info?.element));
          const element=level.elements.find(e=>!onPortal.has(e));
          if(!element) { this.emit('notification',`${level.level}: every element it needs is on the portal.`);return; }
          await this.action({player,target:element});
          this.emit('notification',`${level.level} · ${element} gate`);
        }
      } catch(e) { this.message=e.message;this.publish();this.emit('notification',e.message); }
      return;
    }
    const target=key==='T'?(player===1?'thumpling':'thumpback'):key==='0'?'favorite':model.elements[['1','2','3','4','5','6','7','8','9','-'].indexOf(key)] || (this.game===3 && model.perks.some(p=>p.key===key)?`perk-${key}`:null);
    if(!target) return;
    try { await this.action({player,target}); } catch(e) { this.message=e.message; this.publish(); }
  }
}
module.exports={Manager,trapKeys};
