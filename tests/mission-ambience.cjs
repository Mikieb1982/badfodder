'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('mission-ambience.js','utf8');
function setup(opus=true){
 const events={},ae={},stored=new Map();let plays=0,wait=null;
 const audio={paused:true,volume:0,src:'',canPlayType:()=>opus?'probably':'',setAttribute(){},load(){},addEventListener:(k,f)=>ae[k]=f,pause(){this.paused=true},play(){plays++;this.paused=false;return wait||Promise.resolve()}};
 const document={hidden:false,createElement:()=>audio,getElementById:()=>null,body:{appendChild(){}},addEventListener:(k,f)=>events[k]=f};
 const window={BadFodderSfx:{enabled:true}};
 vm.runInNewContext(source,{window,document,localStorage:{getItem:k=>stored.get(k)??null,setItem:(k,v)=>stored.set(k,v)},addEventListener:(k,f)=>events[k]=f});
 return {window,document,audio,ae,events,stored,api:window.BadFodderAmbience,get plays(){return plays},defer(p){wait=p}};
}
(async()=>{
 const t=setup();t.api.setState('PLAYING','bad-belzig');assert.equal(t.plays,0,'Autoplay waits for gesture');
 t.events.pointerdown();await Promise.resolve();assert(!t.audio.paused);assert(t.audio.src.endsWith('bad-belzig.webm'));
 t.api.setState('PAUSED','bad-belzig');assert(t.audio.paused);
 for(const key of ['wigan','cable-street','barcelona']){t.api.setState('PLAYING',key);await Promise.resolve();assert(t.audio.src.endsWith(key+'.webm'));assert(!t.audio.paused)}
 t.window.BadFodderSfx.enabled=false;t.api.sync();assert(t.audio.paused,'SFX mute stops ambience');
 t.window.BadFodderSfx.enabled=true;t.api.sync();await Promise.resolve();assert(!t.audio.paused);
 t.document.hidden=true;t.events.visibilitychange();assert(t.audio.paused);t.document.hidden=false;t.events.visibilitychange();await Promise.resolve();assert(!t.audio.paused);
 t.ae.error();await Promise.resolve();assert(t.audio.src.endsWith('barcelona.mp3'),'Unsupported codec falls back');
 t.api.setVolume(0);assert(t.audio.paused);assert.equal(t.stored.get('badfodder.ambience.volume.v1'),'0');
 t.api.setVolume(.2);await Promise.resolve();assert.equal(t.audio.volume,.2);
 t.api.setState('TITLE','barcelona');assert(t.audio.paused);
 const fallback=setup(false);fallback.api.setState('PLAYING','wigan');assert(fallback.audio.src.endsWith('.mp3'));
 let release;const pending=setup();pending.defer(new Promise(r=>release=r));pending.api.setState('PLAYING','wigan');pending.events.pointerdown();pending.api.setState('RESULT','wigan');release();await Promise.resolve();assert(pending.audio.paused,'Late play promise cannot resume result screen');
 console.log('PASS: all four beds, gesture unlock, lifecycle pause, SFX mute, visibility, volume persistence and codec fallback.');
})().catch(e=>{console.error(e);process.exitCode=1});
