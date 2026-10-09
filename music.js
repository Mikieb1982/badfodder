/* Ambient music follows Sagenhaft's looping, volume and fade behaviour. */
(function(){
'use strict';
const TRACKS={
  home:['assets/audio/bad_fodder.webm','assets/audio/bad_fodder.mp3'],
  mission:['assets/audio/mission.webm','assets/audio/mission.mp3'],
  cable:['assets/audio/cable_street.webm','assets/audio/cable_street.mp3'],
  barcelona:['assets/audio/barcelonamission.webm','assets/audio/barcelonamission.mp3']
};
function canPlayOpus(){
  try{
    const probe=document.createElement('audio');
    return !!probe.canPlayType&&probe.canPlayType('audio/webm; codecs="opus"').replace(/no/i,'')!=='';
  }catch(e){return false}
}
const PREFER_OPUS=canPlayOpus();
function preferred(track){return track[PREFER_OPUS?0:1]}
function mp3Fallback(path){for(const track of Object.values(TRACKS))if(track[0]===path)return track[1];return null}
const HOME_SOURCE=preferred(TRACKS.home);
const MISSION_SOURCE=preferred(TRACKS.mission);
const CABLE_STREET_SOURCE=preferred(TRACKS.cable);
const BARCELONA_SOURCE=preferred(TRACKS.barcelona);
const LAUNCH_KEY='badfodder.launch.v1';
const AUTO_KEY='badfodder.launch.autostart.v1';

function readLaunch(){
  try{return JSON.parse((typeof BadFodderStorage!=='undefined'?BadFodderStorage.session:sessionStorage).getItem(LAUNCH_KEY)||'null')}catch(e){return null}
}
function autoStartPending(){
  try{return (typeof BadFodderStorage!=='undefined'?BadFodderStorage.session:sessionStorage).getItem(AUTO_KEY)==='1'}catch(e){return false}
}
function sourceForBoot(){
  if(!autoStartPending())return HOME_SOURCE;
  const launch=readLaunch();
  if(launch&&launch.mode==='historical'&&launch.id==='cable-street-1936')return CABLE_STREET_SOURCE;
  if(launch&&(launch.id==='barcelona-1936'||launch.map==='barcelona'))return BARCELONA_SOURCE;
  return MISSION_SOURCE;
}
function sourceForMission(mission){
  const key=mission&&(mission.map||mission.key||mission.id)||'';
  if(mission&&(mission.id==='cable-street-1936'||key==='cable-street'))return CABLE_STREET_SOURCE;
  if(mission&&(mission.id==='barcelona-1936'||key==='barcelona'))return BARCELONA_SOURCE;
  return MISSION_SOURCE;
}

let source=sourceForBoot();
const KEY='badfodder.music.v1';
const VOLUME_KEY='badfodder.music.volume.v1';
const MIX_VERSION_KEY='badfodder.music.mix.v2';
const DEFAULT_VOLUME=.04;
let enabled=true;
let volume=DEFAULT_VOLUME;
let mixScale=1;
try{
  const store=typeof BadFodderStorage!=='undefined'?BadFodderStorage.local:localStorage;
  const saved=store.getItem(KEY);
  if(saved!==null)enabled=saved!=='0';
  const savedVolume=store.getItem(VOLUME_KEY);
  const parsed=savedVolume!==null?Number(savedVolume):NaN;
  if(store.getItem(MIX_VERSION_KEY)==='1'){
    if(Number.isFinite(parsed))volume=Math.max(0,Math.min(1,parsed));
  }else{
    // One-time rebalance: preserve quieter choices, but bring legacy louder mixes down to 4%.
    if(Number.isFinite(parsed))volume=Math.max(0,Math.min(DEFAULT_VOLUME,parsed));
    store.setItem(VOLUME_KEY,String(volume));
    store.setItem(MIX_VERSION_KEY,'1');
  }
}catch(e){}
const audio=document.createElement('audio');
audio.src=source;
audio.loop=true;
audio.preload='auto';
audio.volume=0;
audio.setAttribute('playsinline','');
audio.setAttribute('webkit-playsinline','');
audio.setAttribute('aria-hidden','true');
document.body.appendChild(audio);
const button=document.getElementById('menuMusic');
const volumeInput=document.getElementById('menuMusicVolume');
const volumeValue=document.getElementById('menuMusicVolumeValue');
let started=false,loadError=false,pending=false,raf=0,generation=0;
const effectiveVolume=()=>Math.max(0,Math.min(1,volume*mixScale));
function render(){
  button.textContent=loadError?'MUSIC: RETRY':enabled?'MUSIC: ON':'MUSIC: OFF';
  button.setAttribute('aria-pressed',String(enabled&&!loadError));
  if(volumeInput){
    const percent=Math.round(volume*100);
    if(document.activeElement!==volumeInput)volumeInput.value=String(percent);
    volumeValue.textContent=percent+'%';
  }
}
function fadeTo(target,duration){
  cancelAnimationFrame(raf);
  const initial=audio.volume,from=performance.now();
  const tick=now=>{
    const progress=Math.max(0,Math.min(1,(now-from)/duration));
    const eased=progress*progress*(3-2*progress);
    audio.volume=Math.max(0,Math.min(1,initial+(target-initial)*eased));
    if(progress<1)raf=requestAnimationFrame(tick);
    else if(!enabled)audio.muted=true;
  };
  raf=requestAnimationFrame(tick);
}
async function start(){
  if(!enabled||document.hidden||pending)return;
  if(loadError){
    audio.pause();audio.src=source+'?v='+Date.now();audio.load();
    loadError=false;started=false;render();
  }
  if(started&&!audio.paused)return;
  pending=true;
  const attempt=generation;
  try{
    await audio.play();
    if(attempt!==generation){audio.pause();return}
    started=true;
    if(document.hidden){audio.pause();return}
    if(enabled){audio.muted=false;fadeTo(effectiveVolume(),1200)}
    else{audio.muted=true;cancelAnimationFrame(raf);audio.volume=0}
    render();
  }catch(e){
    // Safari and other browsers may block autoplay until a direct user gesture.
    render();
  }finally{pending=false}
}
function switchSource(next,{autoplay=true}={}){
  if(!next)return;
  if(source===next){if(autoplay)start();return}
  generation++;
  cancelAnimationFrame(raf);
  audio.pause();
  audio.volume=0;
  source=next;
  audio.src=source;
  audio.load();
  started=false;loadError=false;pending=false;
  render();
  if(autoplay)start();
}
function playHome(){switchSource(HOME_SOURCE)}
function playMission(mission){switchSource(sourceForMission(mission))}
function setEnabled(on){
  enabled=!!on;
  try{(typeof BadFodderStorage!=='undefined'?BadFodderStorage.local:localStorage).setItem(KEY,enabled?'1':'0')}catch(e){}
  if(enabled){
    if(started&&!audio.paused&&!loadError){audio.muted=false;fadeTo(effectiveVolume(),500)}
    else start();
  }else fadeTo(0,350);
  render();
}
function setVolume(value){
  const next=Math.max(0,Math.min(1,Number(value)));
  if(!Number.isFinite(next))return;
  volume=next;
  try{
    const store=typeof BadFodderStorage!=='undefined'?BadFodderStorage.local:localStorage;
    store.setItem(VOLUME_KEY,String(volume));
    store.setItem(MIX_VERSION_KEY,'1');
  }catch(e){}
  if(enabled&&started&&!audio.paused&&!loadError){
    audio.muted=false;
    fadeTo(effectiveVolume(),120);
  }
  render();
}
function setMixScale(value,duration=700){
  const next=Math.max(0,Math.min(1,Number(value)));
  if(!Number.isFinite(next)||Math.abs(next-mixScale)<.001)return;
  mixScale=next;
  if(enabled&&started&&!audio.paused&&!loadError){audio.muted=false;fadeTo(effectiveVolume(),Math.max(0,Number(duration)||0))}
}
function toggle(){setEnabled(loadError?true:!enabled)}
function arm(event){
  // Let the toggle handle its own gesture without starting an unwanted fade.
  if(event.target===button)return;
  start();
}
function pauseForBackground(){
  cancelAnimationFrame(raf);
  if(started||pending)audio.pause();
}
addEventListener('pointerdown',arm,{passive:true});
// iOS Safari has historically been stricter about media unlock; keep a touch fallback.
addEventListener('touchstart',arm,{passive:true});
addEventListener('keydown',arm);
button.addEventListener('click',toggle);
if(volumeInput){
  volumeInput.value=String(Math.round(volume*100));
  volumeInput.addEventListener('input',e=>setVolume(Number(e.target.value)/100));
  volumeInput.addEventListener('change',e=>setVolume(Number(e.target.value)/100));
}
document.addEventListener('visibilitychange',()=>{
  if(document.hidden){pauseForBackground();return}
  if(enabled&&started)start();
});
// Safari can restore pages from the back-forward cache without a normal reload.
addEventListener('pagehide',pauseForBackground);
addEventListener('pageshow',()=>{if(enabled&&started)start()});
audio.addEventListener('error',()=>{
  const fallback=mp3Fallback(source);
  if(fallback&&fallback!==source){switchSource(fallback,{autoplay:enabled&&!document.hidden});return}
  loadError=true;started=false;render();
});
audio.addEventListener('canplay',render);
window.BadFodderMusic={
  toggle,setEnabled,setVolume,setMixScale,start,switchSource,playHome,playMission,audio,
  get volume(){return volume},
  get mixScale(){return mixScale},
  get source(){return source}
};
render();

// Mission selection reloads the document. Attempt the mission track immediately;
// if the browser blocks autoplay, the next pointer/touch/key gesture retries it.
if(autoStartPending())start();
})();