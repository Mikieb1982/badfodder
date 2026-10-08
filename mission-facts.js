/* Mission-local consequence data. Mission runtimes own all rules and meaning. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.BadFodderMissionFacts=api;})(typeof window!=='undefined'?window:globalThis,function(){
  'use strict';
  // Clone only JSON data; reject unsupported values instead of silently changing them.
  function clone(value,seen=new Set()){
    if(value===null||typeof value==='string'||typeof value==='boolean')return value;
    if(typeof value==='number'&&Number.isFinite(value))return value;
    if(!value||typeof value!=='object'||seen.has(value))throw new Error('Invalid mission fact');
    const proto=Object.getPrototypeOf(value);
    if(!Array.isArray(value)&&proto!==Object.prototype&&proto!==null)throw new Error('Invalid mission fact');
    seen.add(value);
    const result=Array.isArray(value)?Array.from(value,v=>clone(v,seen)):Object.fromEntries(Object.keys(value).map(k=>[k,clone(value[k],seen)]));
    seen.delete(value);return result;
  }
  function record(value){if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('Invalid mission facts');return clone(value)}
  function create(defaults={}){
    const initial=record(defaults);let state=clone(initial);
    function get(key){return Object.hasOwn(state,key)?clone(state[key]):undefined}
    function set(key,value){
      if(typeof key!=='string'||!key.length)return false;
      try{const copy=clone(value);Object.defineProperty(state,key,{value:copy,enumerable:true,writable:true,configurable:true});return true}catch{return false}
    }
    function increment(key,amount=1){
      const current=get(key);
      if(typeof current!=='number'||!Number.isFinite(amount))return false;
      const next=current+amount;return Number.isFinite(next)&&set(key,next);
    }
    function transition(key,expected,next){return Object.is(get(key),expected)&&set(key,next)}
    function snapshot(){return clone(state)}
    // Invalid restores are atomic no-ops. Missing legacy snapshots use defaults.
    function restore(saved){try{const next=record(saved);state=next;return true}catch{return false}}
    function reset(){state=clone(initial)}
    return{get,set,increment,transition,snapshot,restore,reset};
  }
  return{create};
});
