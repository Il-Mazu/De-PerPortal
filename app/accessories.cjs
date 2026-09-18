'use strict';
// Console/Wii U behavior. Research and exceptions: docs/FIGURE-SUPPORT.md.
const slots=[
  {key:'item',row:6,label:'Magic items & adventures',from:1,hint:'Bring a magic item or adventure piece onto the portal.'},
  {key:'trap',row:7,label:'Traps',from:4,hint:'Choose an elemental trap from your library.'},
  {key:'vehicle',row:8,label:'Vehicles',from:5,hint:'Choose a land, sea or sky vehicle.'},
  {key:'trophy',row:9,label:'Racing trophies',from:5,hint:'Choose a racing trophy from your library.'}
];
const adventures=new Set([300,301,302,303,305,306,307,308,310,311,3300,3301]);
const battles=new Set([208,209,304,3302,3303]);
const effects={200:'Rains anvils on enemies.',201:'Reveals buried treasure.',202:'Restores health.',203:'Summons swords that attack nearby enemies.',204:'Slows surrounding enemies.',205:'Boosts defense.',206:'Boosts movement speed.',207:'Summons Sparx to fight alongside you.',230:'Strikes and stuns enemies.',231:'Adds gold from defeated enemies.',232:'Bombards enemies with rockets.',233:'Strikes enemies with lightning.',3200:'Adds hammer blows to your attacks.',3201:'Rewards diamonds for defeated enemies.',3202:'Provides a healing sheep disguise.',3203:'Distracts enemies with dancing.'};
const sea=new Set([3222,3231,3237,3238,3239]);
const sky=new Set([3220,3228,3232,3233,3236,3241]);
function category(f) {
  if(f?.info?.kind==='Item') return 'item';
  return {Trap:'trap',Vehicle:'vehicle',Trophy:'trophy'}[f?.info?.kind] || null;
}
function available(f,game,slot=category(f)) {
  return !!slot && category(f)===slot && Number.isInteger(game) && game>=1 && game<=6 && f.info.game<=game;
}
function describe(f,game) {
  if(!available(f,game))return null;
  const slot=category(f),id=f.id;
  let type,effect;
  if(slot==='vehicle') {
    type=`${sea.has(id)?'Sea':sky.has(id)?'Sky':'Land'} vehicle`;
    effect=game===5?'Shared by both players in story co-op: one drives, one attacks. Also usable in races.':'Use in Racing mode; vehicles do not enter the story campaign.';
  } else if(slot==='trap') {
    type='Traptanium trap';
    effect=game===4?'Capture matching-element villains and play as the villain saved in this trap.':game===5?'Adds elemental vehicle attacks. A stored villain also unlocks its Skystones Overdrive card.':'Supports elemental attacks in Racing mode; does not summon playable villains in the campaign.';
  } else if(slot==='trophy') {
    type='Racing trophy';
    effect=game===5?(id===3503?'Unlocks Kaos and his Doom Jet for racing.':'Unlocks additional races and villain racing content.'):'Unlocks villain racing content. Standard race tracks are already available.';
  } else {
    type=adventures.has(id)?'Adventure piece':battles.has(id)?'Battle piece':f.info.game===6?'Imaginite chest':'Magic item';
    if(f.info.game===6) effect=adventures.has(id)?'Unlocks the corresponding adventure in Imaginators.':'Unlocks Imaginator creation parts; rewards depend on the chest and saved progress.';
    else if(game===6)effect='Grants a gold reward instead of its original adventure or combat power. Rewards are limited by game progress.';
    else if(game===5)effect='Unlocks a Legendary Treasure at the Academy instead of its original level or combat power.';
    else if(adventures.has(id))effect=(f.info.game===game || (f.info.game===1 && game===2))?'Unlocks its adventure level.':'Acts as a magic attack; its original adventure level is not available in this game.';
    else if(battles.has(id))effect=(f.info.game===game || (id===304 && game===2))?'Unlocks bonus battle arenas; battle pieces can also provide an attack.':'Provides its magic-item effect; original battle arenas are not unlocked.';
    else if(id===3204)effect='Unlocks the promotional UFO Hat; availability and stats depend on the game.';
    else effect=`${effects[id] || 'Activates its magic-item effect.'} The game controls duration and remaining uses.`;
  }
  return {slot,type,effect};
}
module.exports={slots,category,available,describe};
