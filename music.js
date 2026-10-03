/* Ambient music follows Sagenhaft's looping, volume and fade behaviour. */
(function(){
'use strict';
const HOME_SOURCE='assets/audio/bad_fodder.mp3';
const MISSION_SOURCE='assets/audio/mission.mp3';
const CABLE_STREET_SOURCE='assets/audio/cable_street.mp3';
const LAUNCH_KEY='badfodder.launch.v1';
const AUTO_KEY='badfodder.launch.autostart.v1';

function readLaunch(){
  try{return JSON.parse(sessionStorage.getItem(LAUNCH_KEY)||'null')}catch(e){return null}
}
function autoStartPending(){
  try{return sessionStorage.getItem(AUTO_KEY)==='1'}catch(e){return false}
}
function sourceForBoot(){
  if(!autoStartPending())return HOME_SOURCE;
  const launch=readLaunch();
  if(launch&&launch.mode==='historical'&&launch.id==='cable-street-1936')return CABLE_STREET_SOURCE;
  return MISSION_SOURCE;
}
function sourceForMission(mission){
  if(mission&&mission.id==='cable-street-1936')return CABLE_STREET_SOURCE;
  return MISSION_SOURCE;
}

let source=sourceForBoot();
const KEY='badfodder.music.v1';
const VOLUME_KEY='badfodder.music.volume.v1';
const DEFAULT_VOLUME=.22;
let enabled=true;
let volume=DEFAULT_VOLUME;
try{
  const saved=localStorage.getItem(KEY);
  if(saved!==null)enabled=saved!=='0';
  const savedVolume=localStorage.getItem(VOLUME_KEY);
  if(savedVolume!==null&&Number.isFinite(Number(savedVolume)))volume=Math.max(0,Math.min(1,Number(savedVolume)));
}catch(e){}
const audio=document.createElement('audio');
audio.src=source;
audio.loop=true;
audio.preload='auto';
audio.volume=0;
audio.setAttribute('playsinline','');
audio.setAttribute('aria-hidden','true');
document.body.appendChild(audio);
const button=document.getElementById('menuMusic');
const volumeInput=document.getElementById('menuMusicVolume');
const volumeValue=document.getElementById('menuMusicVolumeValue');
let started=false,loadError=false,pending=false,raf=0,generation=0;
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
    const progress=Math.min(1,(now-from)/duration);
    audio.volume=initial+(target-initial)*progress;
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
    if(enabled){audio.muted=false;fadeTo(volume,1200)}
    else{audio.muted=true;cancelAnimationFrame(raf);audio.volume=0}
    render();
  }catch(e){
    // Autoplay blocking can be retried by the next user gesture.
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
  try{localStorage.setItem(KEY,enabled?'1':'0')}catch(e){}
  if(enabled){
    if(started&&!audio.paused&&!loadError){audio.muted=false;fadeTo(volume,500)}
    else start();
  }else fadeTo(0,350);
  render();
}
function setVolume(value){
  const next=Math.max(0,Math.min(1,Number(value)));
  if(!Number.isFinite(next))return;
  volume=next;
  try{localStorage.setItem(VOLUME_KEY,String(volume))}catch(e){}
  if(enabled&&started&&!audio.paused&&!loadError){
    audio.muted=false;
    fadeTo(volume,120);
  }
  render();
}
function toggle(){setEnabled(loadError?true:!enabled)}
function arm(event){
  // Let the toggle handle its own gesture without starting an unwanted fade.
  if(event.target===button)return;
  start();
}
addEventListener('pointerdown',arm,{passive:true});
addEventListener('keydown',arm);
button.addEventListener('click',toggle);
if(volumeInput){
  volumeInput.value=String(Math.round(volume*100));
  volumeInput.addEventListener('input',e=>setVolume(Number(e.target.value)/100));
  volumeInput.addEventListener('change',e=>setVolume(Number(e.target.value)/100));
}
document.addEventListener('visibilitychange',()=>{
  if(document.hidden){if(started||pending)audio.pause();return}
  if(enabled&&started)start();
});
audio.addEventListener('error',()=>{loadError=true;started=false;render()});
audio.addEventListener('canplay',render);
window.BadFodderMusic={
  toggle,setEnabled,setVolume,start,switchSource,playHome,playMission,audio,
  get volume(){return volume},
  get source(){return source}
};
render();

// Mission selection reloads the document. Attempt the mission track immediately;
// if the browser blocks autoplay, the next pointer/key gesture retries it.
if(autoStartPending())start();
})();
