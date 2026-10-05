const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync(require('node:path').join(__dirname,'../music.js'),'utf8');
function setup(saved,savedVolume,session={}){
  const listeners={},audioListeners={},buttonListeners={},storage=new Map(),sessionData=new Map(Object.entries(session));
  if(saved!==undefined)storage.set('badfodder.music.v1',saved);
  if(savedVolume!==undefined)storage.set('badfodder.music.volume.v1',savedVolume);
  let time=0,next=0,blocked=false,plays=0,appended=0,loads=0;
  const frames=new Map(),button={setAttribute(key,value){this[key]=value},addEventListener(key,fn){buttonListeners[key]=fn}};
  const audio={volume:1,paused:true,muted:false,src:'',setAttribute(){},addEventListener(key,fn){audioListeners[key]=fn},pause(){this.paused=true},load(){loads++},async play(){plays++;if(blocked)throw Error('Autoplay blocked');this.paused=false}};
  let mediaVolume=audio.volume;Object.defineProperty(audio,'volume',{get:()=>mediaVolume,set:value=>{assert(value>=0&&value<=1,'HTMLMediaElement volume out of range');mediaVolume=value}});
  const document={hidden:false,createElement(){return audio},getElementById(id){return id==='menuMusic'?button:null},body:{appendChild(){appended++}},addEventListener(key,fn){listeners[key]=fn}};
  const window={};
  const sessionStorage={getItem:key=>sessionData.get(key)??null,setItem:(key,value)=>sessionData.set(key,value),removeItem:key=>sessionData.delete(key)};
  vm.runInNewContext(source,{window,document,sessionStorage,localStorage:{getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,value)},performance:{now:()=>time},requestAnimationFrame:fn=>{frames.set(++next,fn);return next},cancelAnimationFrame:id=>frames.delete(id),addEventListener:(key,fn)=>{listeners[key]=fn},Date});
  return {audio,button,document,storage,sessionData,api:window.BadFodderMusic,get plays(){return plays},get loads(){return loads},get appended(){return appended},block(value){blocked=value},event(key,target={}){listeners[key]({target})},error(){audioListeners.error()},click(){buttonListeners.click()},step(ms){time+=ms;const callbacks=[...frames.values()];frames.clear();callbacks.forEach(fn=>fn(time))}};
}
const settle=()=>new Promise(resolve=>setImmediate(resolve));
(async()=>{
  const skew=setup();skew.event('pointerdown');await settle();skew.step(-.01);assert.equal(skew.audio.volume,0,'Older frame timestamp creates negative volume');skew.step(1200.01);assert.equal(skew.audio.volume,.04);
  const t=setup();assert.equal(t.appended,1);assert(t.audio.loop);assert.equal(t.audio.volume,0);assert.equal(t.plays,0);
  assert.equal(t.api.source,'assets/audio/bad_fodder.mp3','Normal homepage load keeps the title music');
  assert.equal(t.api.volume,.04,'No saved slider setting uses the quieter four percent default');
  assert.equal(t.storage.get('badfodder.music.mix.v2'),'1','New quieter mix migration is recorded');
  assert.equal(setup(undefined,'0').api.volume,0,'A saved zero volume stays zero');
  assert.equal(setup(undefined,'.22').api.volume,.04,'Legacy louder music is migrated down to four percent');

  const mission=setup(undefined,undefined,{'badfodder.launch.autostart.v1':'1'});
  await settle();
  assert.equal(mission.api.source,'assets/audio/mission.mp3','Campaign/standalone launch uses mission.mp3');
  assert.equal(mission.plays,1,'Mission launch attempts to start music immediately after reload');

  const cable=setup(undefined,undefined,{
    'badfodder.launch.autostart.v1':'1',
    'badfodder.launch.v1':JSON.stringify({mode:'historical',id:'cable-street-1936'})
  });
  await settle();
  assert.equal(cable.api.source,'assets/audio/cable_street.mp3','Cable Street keeps its dedicated music');

  t.block(true);t.event('pointerdown');await settle();assert.equal(t.button.textContent,'MUSIC: ON');assert(t.audio.paused);
  t.block(false);t.event('keydown');await settle();t.step(600);assert.equal(t.audio.volume,.02);t.step(600);assert.equal(t.audio.volume,.04);
  const plays=t.plays;t.event('pointerdown');await settle();assert.equal(t.plays,plays,'Gestures must not restart a playing track');
  t.click();t.step(350);assert.equal(t.audio.volume,0);assert(t.audio.muted);assert.equal(t.storage.get('badfodder.music.v1'),'0');
  const off=setup(t.storage.get('badfodder.music.v1'));off.event('pointerdown');await settle();assert.equal(off.plays,0);assert.equal(off.button.textContent,'MUSIC: OFF');
  t.click();t.step(500);assert.equal(t.audio.volume,.04);assert(!t.audio.muted);
  t.document.hidden=true;t.event('visibilitychange');assert(t.audio.paused);
  t.document.hidden=false;t.event('visibilitychange');await settle();assert(!t.audio.paused);
  t.error();assert.equal(t.button.textContent,'MUSIC: RETRY');t.click();await settle();assert(t.audio.src.startsWith('assets/audio/bad_fodder.mp3?v='));assert.equal(t.button.textContent,'MUSIC: ON');

  const switcher=setup();
  switcher.api.playMission({id:'bad-belzig'});await settle();
  assert.equal(switcher.api.source,'assets/audio/mission.mp3');assert.equal(switcher.audio.src,'assets/audio/mission.mp3');
  switcher.api.playHome();await settle();
  assert.equal(switcher.api.source,'assets/audio/bad_fodder.mp3');

  const race=setup();race.event('pointerdown');race.api.setEnabled(false);await settle();race.step(1200);assert(race.audio.muted);assert.equal(race.audio.volume,0,'An in-flight play must respect mute');
  console.log('PASS: quiet title/mission/Cable Street mix, routing, mission autostart, runtime switching, gesture unlock/retry, fades, saved mute and visibility handling.');
})().catch(error=>{console.error(error);process.exitCode=1});
