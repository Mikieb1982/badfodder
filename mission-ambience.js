/* Local CC0 mission beds. Independent of music, governed by SFX mute and lifecycle. */
(function(){
'use strict';
const TRACKS={
 'bad-belzig':['assets/audio/ambience/bad-belzig.webm','assets/audio/ambience/bad-belzig.mp3'],
 wigan:['assets/audio/ambience/wigan.webm','assets/audio/ambience/wigan.mp3'],
 'cable-street':['assets/audio/ambience/cable-street.webm','assets/audio/ambience/cable-street.mp3'],
 barcelona:['assets/audio/ambience/barcelona.webm','assets/audio/ambience/barcelona.mp3']
};
const audio=document.createElement('audio');
audio.loop=true;audio.preload='none';audio.volume=0;
audio.setAttribute('playsinline','');audio.setAttribute('aria-hidden','true');
document.body.appendChild(audio);
const modern=!!audio.canPlayType('audio/webm; codecs="opus"').replace(/no/i,'');
const input=document.getElementById('menuAmbienceVolume'),output=document.getElementById('menuAmbienceVolumeValue');
const KEY='badfodder.ambience.volume.v1';
let volume=.28,state='BOOT',mission='',generation=0,failed=false,unlocked=false;
try{
 const saved=(window.BadFodderStorage?.local||localStorage).getItem(KEY);
 if(saved!==null&&Number.isFinite(Number(saved)))volume=Math.max(0,Math.min(1,Number(saved)));
}catch(_){}
function render(){if(input)input.value=String(Math.round(volume*100));if(output)output.textContent=Math.round(volume*100)+'%'}
function allowed(){return state==='PLAYING'&&!document.hidden&&window.BadFodderSfx?.enabled!==false&&volume>0&&!failed}
async function sync(){
 if(!allowed()){generation++;audio.pause();audio.volume=0;return}
 if(!unlocked||!mission)return;
 audio.volume=volume;
 if(!audio.paused)return;
 const attempt=++generation;
 try{await audio.play();if(attempt!==generation&&!allowed())audio.pause()}catch(_){/* Retry on next gesture. */}
}
function setState(next,key){
 const track=TRACKS[key];
 if(track&&mission!==key){
  generation++;audio.pause();mission=key;failed=false;
  audio.src=track[modern?0:1];audio.load();
 }
 state=next;sync();
}
function setVolume(value){
 const next=Number(value);if(!Number.isFinite(next))return;
 volume=Math.max(0,Math.min(1,next));
 try{(window.BadFodderStorage?.local||localStorage).setItem(KEY,String(volume))}catch(_){}
 render();sync();
}
function arm(){unlocked=true;sync()}
addEventListener('pointerdown',arm,{passive:true});addEventListener('touchstart',arm,{passive:true});addEventListener('keydown',arm);
document.addEventListener('visibilitychange',sync);
addEventListener('pagehide',()=>{generation++;audio.pause()});addEventListener('pageshow',sync);
audio.addEventListener('error',()=>{
 const track=TRACKS[mission];
 if(track&&audio.src.split('?')[0].endsWith('.webm')){generation++;audio.pause();audio.src=track[1];audio.load();sync()}
 else{failed=true;audio.pause()}
});
if(input)input.addEventListener('input',event=>setVolume(Number(event.target.value)/100));
window.BadFodderAmbience={setState,setVolume,sync,audio,get volume(){return volume}};
render();
})();
