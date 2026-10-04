/* Incremental lifecycle boundary. Flags are applied only through the injected adapter. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.BadFodderLifecycle=api;})(typeof window!=='undefined'?window:globalThis,()=>{
 'use strict';
 const states=Object.freeze(['BOOT','TITLE','MISSION_SELECT','BRIEFING','LOADING','PLAYING','PAUSED','RESULT','RECOVERY']);
 function create({read,apply,onChange=()=>{}}){
  let state='BOOT',revision=0;
  function transition(next){
   if(!states.includes(next))throw new Error('Unknown lifecycle state: '+next);
   const old=read();if(next==='PLAYING'&&(!old.started||old.finished||old.runtimeSafeStop))return false;
   state=next;revision++;
   apply({menuOpen:next!=='PLAYING',paused:next!=='PLAYING',...(next==='RECOVERY'?{runtimeSafeStop:true}:{})});
   onChange({state,revision});return true;
  }
  return {transition,get state(){return state},get revision(){return revision}};
 }
 return {states,create};
});
