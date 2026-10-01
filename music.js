/* Ambient music follows Sagenhaft's looping, volume and fade behaviour. */
(function(){
'use strict';
const SOURCE='assets/audio/bad_fodder.mp3';
const KEY='badfodder.music.v1';
const VOLUME=.22;
let enabled=true;
try{const saved=localStorage.getItem(KEY);if(saved!==null)enabled=saved!=='0'}catch(e){}
const audio=document.createElement('audio');
audio.src=SOURCE;
audio.loop=true;
audio.preload='auto';
audio.volume=0;
audio.setAttribute('playsinline','');
audio.setAttribute('aria-hidden','true');
document.body.appendChild(audio);
const button=document.getElementById('menuMusic');
let started=false,loadError=false,pending=false,raf=0;
function render(){
  button.textContent=loadError?'MUSIC: RETRY':enabled?'MUSIC: ON':'MUSIC: OFF';
  button.setAttribute('aria-pressed',String(enabled&&!loadError));
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
    audio.pause();audio.src=SOURCE+'?v='+Date.now();audio.load();
    loadError=false;started=false;render();
  }
  if(started&&!audio.paused)return;
  pending=true;
  try{
    await audio.play();
    started=true;
    if(document.hidden){audio.pause();return}
    if(enabled){audio.muted=false;fadeTo(VOLUME,1200)}
    else{audio.muted=true;cancelAnimationFrame(raf);audio.volume=0}
    render();
  }catch(e){
    // Autoplay blocking can be retried by the next user gesture.
    render();
  }finally{pending=false}
}
function setEnabled(on){
  enabled=!!on;
  try{localStorage.setItem(KEY,enabled?'1':'0')}catch(e){}
  if(enabled){
    if(started&&!audio.paused&&!loadError){audio.muted=false;fadeTo(VOLUME,500)}
    else start();
  }else fadeTo(0,350);
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
document.addEventListener('visibilitychange',()=>{
  if(document.hidden){if(started||pending)audio.pause();return}
  if(enabled&&started)start();
});
audio.addEventListener('error',()=>{loadError=true;started=false;render()});
audio.addEventListener('canplay',render);
window.BadFodderMusic={toggle,setEnabled,start,audio};
render();
})();
