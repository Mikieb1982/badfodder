const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync(require('node:path').join(__dirname,'../music.js'),'utf8');
function setup(saved){
  const listeners={},audioListeners={},buttonListeners={},storage=new Map();
  if(saved!==undefined)storage.set('badfodder.music.v1',saved);
  let time=0,next=0,blocked=false,plays=0,appended=0;
  const frames=new Map(),button={setAttribute(key,value){this[key]=value},addEventListener(key,fn){buttonListeners[key]=fn}};
  const audio={volume:1,paused:true,muted:false,setAttribute(){},addEventListener(key,fn){audioListeners[key]=fn},pause(){this.paused=true},load(){},async play(){plays++;if(blocked)throw Error('Autoplay blocked');this.paused=false}};
  const document={hidden:false,createElement(){return audio},getElementById(){return button},body:{appendChild(){appended++}},addEventListener(key,fn){listeners[key]=fn}};
  const window={};
  vm.runInNewContext(source,{window,document,localStorage:{getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,value)},performance:{now:()=>time},requestAnimationFrame:fn=>{frames.set(++next,fn);return next},cancelAnimationFrame:id=>frames.delete(id),addEventListener:(key,fn)=>{listeners[key]=fn}});
  return {audio,button,document,storage,api:window.BadFodderMusic,get plays(){return plays},get appended(){return appended},block(value){blocked=value},event(key,target={}){listeners[key]({target})},error(){audioListeners.error()},click(){buttonListeners.click()},step(ms){time+=ms;const callbacks=[...frames.values()];frames.clear();callbacks.forEach(fn=>fn(time))}};
}
const settle=()=>new Promise(resolve=>setImmediate(resolve));
(async()=>{
  const t=setup();assert.equal(t.appended,1);assert(t.audio.loop);assert.equal(t.audio.volume,0);assert.equal(t.plays,0);
  t.block(true);t.event('pointerdown');await settle();assert.equal(t.button.textContent,'MUSIC: ON');assert(t.audio.paused);
  t.block(false);t.event('keydown');await settle();t.step(600);assert.equal(t.audio.volume,.11);t.step(600);assert.equal(t.audio.volume,.22);
  const plays=t.plays;t.event('pointerdown');await settle();assert.equal(t.plays,plays,'Gestures must not restart a playing track');
  t.click();t.step(350);assert.equal(t.audio.volume,0);assert(t.audio.muted);assert.equal(t.storage.get('badfodder.music.v1'),'0');
  const off=setup(t.storage.get('badfodder.music.v1'));off.event('pointerdown');await settle();assert.equal(off.plays,0);assert.equal(off.button.textContent,'MUSIC: OFF');
  t.click();t.step(500);assert.equal(t.audio.volume,.22);assert(!t.audio.muted);
  t.document.hidden=true;t.event('visibilitychange');assert(t.audio.paused);
  t.document.hidden=false;t.event('visibilitychange');await settle();assert(!t.audio.paused);
  t.error();assert.equal(t.button.textContent,'MUSIC: RETRY');t.click();await settle();assert(t.audio.src.startsWith('assets/audio/bad_fodder.mp3?v='));assert.equal(t.button.textContent,'MUSIC: ON');
  const race=setup();race.event('pointerdown');race.api.setEnabled(false);await settle();race.step(1200);assert(race.audio.muted);assert.equal(race.audio.volume,0,'An in-flight play must respect mute');
  console.log('PASS: music gesture unlock/retry, fades, saved mute, visibility pause/resume, one audio element and pending-play mute.');
})().catch(error=>{console.error(error);process.exitCode=1});
