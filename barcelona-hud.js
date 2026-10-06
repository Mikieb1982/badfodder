/* Barcelona HUD cohesion: keep transient notices below the variable-height objective panel. */
(function(root){
'use strict';
function install(){
 const canvas=document.getElementById('game'),viewport=canvas&&canvas.parentElement,panel=document.querySelector('.hud-mission'),notice=document.getElementById('hudNotice');
 if(!viewport||!panel||!notice)return false;
 let queued=false;
 const sync=()=>{
  queued=false;
  const p=panel.getBoundingClientRect(),v=viewport.getBoundingClientRect();
  // Base notice animation starts 6px above its CSS top. Keep a full visible gap in both states.
  const top=Math.ceil(p.bottom-v.top+12)+'px';
  viewport.style.setProperty('--barcelona-notice-top',top);
  notice.style.top=top;
 };
 const requestSync=()=>{
  if(queued)return;
  queued=true;
  if(typeof queueMicrotask==='function')queueMicrotask(sync);else Promise.resolve().then(sync);
 };
 const mutation=new MutationObserver(requestSync);
 mutation.observe(panel,{subtree:true,childList:true,characterData:true,attributes:true});
 if(typeof ResizeObserver==='function')new ResizeObserver(sync).observe(panel);
 sync();
 return true;
}
if(!install()){
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
 else requestAnimationFrame(install);
}
})(typeof window!=='undefined'?window:globalThis);
