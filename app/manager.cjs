'use strict';
const fs=require('node:fs/promises');
const path=require('node:path');
const {EventEmitter}=require('node:events');
const model=require('./model.cjs');

class Manager extends EventEmitter {
  constructor(root,control) {
    super(); this.root=root; this.control=control;
    this.config={game:2,profiles:{},artRoot:null}; this.figures=[]; this.warnings=[];
    this.session={pid:0,supported:false,game:0,focused:false};
    this.active=[null,null]; this.sidekick=null; this.observed=[]; this.labels={}; this.busy=false; this.message='Start Cemu to connect your portal.';
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
    await this.rescan();
  }
  async rescan() {
    if(this.busy) throw Error('Wait for the current swap.');
    const result=await model.scan(path.join(this.root,'NFC'),this.config.artRoot || path.join(this.root,'de-perportal-data/art'));
    this.figures=result.figures; this.warnings=result.warnings;
    this.profile;
    this.publish();
  }
  state() {
    const hasArt=this.figures.some(f=>f.art);
    return {game:this.game,detected:!!this.session.game,session:this.session,profile:this.profile,
      active:this.active,sidekick:this.sidekick,observed:this.observed,busy:this.busy,message:this.message,warnings:this.warnings,
      hasArt,
      figures:this.figures.map(({path:_,uid:__,art,...f})=>({...f,art:art?`art://figure/${encodeURIComponent(f.key)}`:null})),
      root:this.root,elements:model.elements,perks:model.perks,games:model.games};
  }
  publish() { this.emit('state',this.state()); }
  updateSession(s) {
    const next={pid:s.pid,supported:s.supported,focused:s.focused,game:model.detectGame(s.title||''),bounds:s.bounds||null};
    if(next.pid!==this.session.pid) { this.active=[null,null]; this.sidekick=null; this.labels={}; }
    const changed=JSON.stringify(next)!==JSON.stringify(this.session);
    const rowsChanged=JSON.stringify(s.rows||[])!==JSON.stringify(this.observed);
    this.observed=s.rows||[];
    if(!this.busy) {
      for(let p=0;p<2;p++) if(this.observed[p*2]==='None' || (this.labels[p*2+1] && this.observed[p*2] && this.labels[p*2+1]!==this.observed[p*2])) this.active[p]=null;
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
  async select({player,target,choice,preset}) {
    if(this.busy) throw Error('Wait for the current swap.');
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
      if(selected.length!==1 || !model.core(selected[0]) || selected[0].info.element!==target) throw Error('Element slots use ordinary Skylanders of the matching element.');
      this.profile.players[player].elements[target]=choice;
    }
    await this.save(); this.publish();
  }
  async setGame(game) {
    if(this.busy) throw Error('Wait for the current swap.');
    if(this.session.game) throw Error('The running game selects its own profile.');
    if(!Number.isInteger(game)||game<1||game>6) throw Error('Invalid game.');
    this.config.game=game; this.profile; await this.save(); this.publish();
  }
  async action({player=0,target='favorite',choice=null}) {
    if(this.busy) throw Error('A portal swap is already in progress.');
    if(!this.session.pid || !this.session.supported) throw Error('Start the recommended Cemu build first.');
    if(![0,1].includes(player)) throw Error('Invalid player.');
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
    const others=[...this.active.flatMap((c,p)=>p===player && target!=='sidekick'?[]:c?[c.top,c.bottom].filter(Boolean):[]),...(target!=='sidekick' && this.sidekick?[this.sidekick.top]:[])];
    const otherFigures=others.map(k=>this.figures.find(f=>f.key===k)).filter(Boolean);
    for(const f of files) {
      const now=model.identify(await fs.readFile(f.path));
      if(now.id!==f.id || now.variant!==f.variant || now.uid!==f.uid) throw Error('A figure changed since scanning. Rescan your NFC folder.');
      if(otherFigures.some(x=>x.key===f.key || x.uid===f.uid)) throw Error('That figure is already on the portal. Choose a different figure for each player.');
    }
    const game=this.game, pid=this.session.pid;
    this.busy=true; this.message='Swapping on the portal…'; this.publish();
    try {
      const run=async(args)=>{
        if(this.session.pid!==pid || this.game!==game) throw Error('Cemu or the game changed during the swap.');
        const output=await this.control(args);
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
      this.message=target==='remove-sidekick'?'Sidekick removed.':target==='remove'?`Player ${player+1} removed.`:replaceBottom?`${perkBase.perk.name} base is on Player ${player+1}.`:`${files[0].info.name} is on the portal.`;
    } catch(e) { this.message=`Swap stopped: ${e.message} Check Cemu before retrying.`; throw e; }
    finally { this.busy=false; this.publish(); }
  }
  async hotkey({player,key}) {
    if(!this.session.game) return;
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
    const target=key==='T'?(player===1?'thumpling':'thumpback'):key==='0'?'favorite':model.elements[['1','2','3','4','5','6','7','8','9','-'].indexOf(key)] || (this.game===3 && model.perks.some(p=>p.key===key)?`perk-${key}`:null);
    if(!target) return;
    try { await this.action({player,target}); } catch(e) { this.message=e.message; this.publish(); }
  }
}
module.exports={Manager};
