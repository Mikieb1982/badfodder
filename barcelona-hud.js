/* Barcelona HUD cohesion: keep transient notices below the variable-height objective panel. */
(function(root){
'use strict';
function install(){
 const canvas=document.getElementById('game'),viewport=canvas&&canvas.parentElement,panel=document.querySelector('.hud-mission');
 if(!viewport||!panel)return false;
 let queued=false;
 const sync=()=>{
  queued=false;
  const p=panel.getBoundingClientRect(),v=viewport.getBoundingClientRect();
  viewport.style.setProperty('--barcelona-notice-top',Math.ceil(p.bottom-v.top+6)+'px');
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
