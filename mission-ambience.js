/* Local CC0 mission beds. Independent of music, governed by SFX mute and lifecycle. */
(function(){
'use strict';
function loadSupport(name,attribute,ready){
 if(ready?.()||!document.head||document.querySelector?.('script['+attribute+']'))return;
 const script=document.createElement('script');script.setAttribute(attribute,'1');script.src=window.BadFodderAssetUrl?.(name)||name;document.head.appendChild(script);
}
loadSupport('experience-polish.js','data-experience-polish',()=>window.BadFodderExperience);
loadSupport('professional-feel.js','data-professional-feel',()=>window.BadFodderProfessionalFeel);
const TRACKS={
 'bad-belzig':['assets/audio/ambience/bad-belzig.webm','assets/audio/ambience/bad-belzig.mp3'],
 wigan:['assets/audio/ambience/wigan.webm','assets/audio/ambience/wigan.mp3'],
 'cable-street':['assets/audio/ambience/cable-street.webm','assets/audio/ambience/cable-street.mp3'],
 barcelona:['assets/audio/ambience/barcelona.webm','assets/audio/ambience/barcelona.mp3']
};
const audio=document.createElement('audio');audio.loop=true;audio.preload='none';audio.volume=0;audio.setAttribute('playsinline','');audio.setAttribute('aria-hidden','true');document.body.appendChild(audio);
const modern=!!audio.canPlayType('audio/webm; codecs="opus"').replace(/no/i,''),input=document.getElementById('menuAmbienceVolume'),output=document.getElementById('menuAmbienceVolumeValue'),KEY='badfodder.ambience.volume.v1';
let volume=.28,state='BOOT',mission='',generation=0,failed=false,unlocked=false,raf=0;
try{const saved=(window.BadFodderStorage?.local||localStorage).getItem(KEY);if(saved!==null&&Number.isFinite(Number(saved)))volume=Math.max(0,Math.min(1,Number(saved)))}catch(_){}
function render(){if(input)input.value=String(Math.round(volume*100));if(output)output.textContent=Math.round(volume*100)+'%'}
function allowed(){return state==='PLAYING'&&!document.hidden&&window.BadFodderSfx?.enabled!==false&&volume>0&&!failed}
function canAnimateFade(){return typeof requestAnimationFrame==='function'&&typeof performance!=='undefined'}
function stopFade(){if(typeof cancelAnimationFrame==='function'&&raf)cancelAnimationFrame(raf);raf=0}
function fadeTo(target,duration,{pause=false}={}){target=Math.max(0,Math.min(1,Number(target)||0));stopFade();if(!canAnimateFade()||duration<=0){audio.volume=target;if(pause&&target===0)audio.pause();return}const initial=audio.volume,from=performance.now();const tick=now=>{const progress=Math.max(0,Math.min(1,(now-from)/duration)),eased=progress*progress*(3-2*progress);audio.volume=Math.max(0,Math.min(1,initial+(target-initial)*eased));if(progress<1)raf=requestAnimationFrame(tick);else{raf=0;if(pause&&target===0)audio.pause()}};raf=requestAnimationFrame(tick)}
function mixMusic(active){window.BadFodderMusic?.setMixScale?.(active?.82:1,active?900:600)}
async function sync(){const canPlay=allowed();mixMusic(canPlay);if(!canPlay){generation++;if(document.hidden||window.BadFodderSfx?.enabled===false||volume<=0){stopFade();audio.pause();audio.volume=0}else if(!audio.paused)fadeTo(0,450,{pause:true});else audio.volume=0;return}if(!unlocked||!mission)return;if(!audio.paused){fadeTo(volume,300);return}audio.volume=0;const attempt=++generation;try{const pendingPlay=audio.play();if(!canAnimateFade())audio.volume=volume;await pendingPlay;if(attempt!==generation)return;if(!allowed()){audio.pause();audio.volume=0;return}fadeTo(volume,900)}catch(_){}}
function setState(next,key){const track=TRACKS[key];if(track&&mission!==key){generation++;stopFade();audio.pause();audio.volume=0;mission=key;failed=false;audio.src=track[modern?0:1];audio.load()}state=next;window.BadFodderExperience?.setState?.(next,key||mission);sync()}
function setVolume(value){const next=Number(value);if(!Number.isFinite(next))return;volume=Math.max(0,Math.min(1,next));try{(window.BadFodderStorage?.local||localStorage).setItem(KEY,String(volume))}catch(_){}render();sync()}
function arm(){const first=!unlocked;unlocked=true;sync();if(first&&state==='PLAYING')window.BadFodderSfx?.environment?.(mission,'enter')}
addEventListener('pointerdown',arm,{passive:true});addEventListener('touchstart',arm,{passive:true});addEventListener('keydown',arm);document.addEventListener('visibilitychange',sync);addEventListener('pagehide',()=>{generation++;stopFade();audio.pause();audio.volume=0;mixMusic(false)});addEventListener('pageshow',sync);
audio.addEventListener('error',()=>{const track=TRACKS[mission];if(track&&audio.src.split('?')[0].endsWith('.webm')){generation++;stopFade();audio.pause();audio.volume=0;audio.src=track[1];audio.load();sync()}else{failed=true;stopFade();audio.pause();audio.volume=0;mixMusic(false)}});
if(input)input.addEventListener('input',event=>setVolume(Number(event.target.value)/100));window.BadFodderAmbience={setState,setVolume,sync,audio,get volume(){return volume}};render();
})();
