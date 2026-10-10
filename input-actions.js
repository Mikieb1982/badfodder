/* Semantic gameplay action bus shared by controller, touch and keyboard adapters. */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.BadFodderInputActions=api;
})(typeof window!=='undefined'?window:globalThis,function(){
 'use strict';
 const ACTIONS=Object.freeze({
  MOVE_VECTOR:'MOVE_VECTOR',AIM_VECTOR:'AIM_VECTOR',PRIMARY_ACTION:'PRIMARY_ACTION',SECONDARY_ACTION:'SECONDARY_ACTION',
  INTERACT:'INTERACT',GARRISON:'GARRISON',FOLLOW:'FOLLOW',HOLD:'HOLD',REGROUP:'REGROUP',MAP:'MAP',PAUSE:'PAUSE',
  SELECT_NEXT:'SELECT_NEXT',SELECT_PREVIOUS:'SELECT_PREVIOUS',SELECT_INDEX:'SELECT_INDEX',SELECT_ALL:'SELECT_ALL'
 });
 const allowed=new Set(Object.values(ACTIONS)),handlers=new Map();
 let fallback=null;
 function valid(action){return allowed.has(action)}
 function register(action,handler){
  if(!valid(action))throw new Error('Unknown input action: '+action);
  if(typeof handler!=='function')throw new TypeError('Input action handler must be a function');
  let set=handlers.get(action);if(!set){set=new Set();handlers.set(action,set)}set.add(handler);
  return()=>{set.delete(handler);if(!set.size)handlers.delete(action)};
 }
 function dispatch(action,phase='press',detail={}){
  if(!valid(action))return false;
  const event=Object.freeze({action,phase,source:detail.source||'unknown',value:detail.value,index:detail.index,multi:!!detail.multi,raw:detail.raw||null});
  let handled=false;
  for(const handler of handlers.get(action)||[]){try{if(handler(event)===true)handled=true}catch(error){console.error?.('Input action handler failed',action,error)}}
  if(!handled&&fallback)try{handled=fallback(event)===true}catch(error){console.error?.('Input action fallback failed',action,error)}
  return handled;
 }
 function setFallback(adapter){fallback=typeof adapter==='function'?adapter:null;return fallback}
 function clear(){handlers.clear();fallback=null}
 function registered(action){return [...(handlers.get(action)||[])]}
 return Object.freeze({ACTIONS,register,dispatch,setFallback,clear,registered,valid});
});
