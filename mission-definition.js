/* Small shared mission definition normalizer. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.BadFodderMissionDefinition=api;
})(typeof window!=='undefined'?window:globalThis,function(){
  'use strict';
  const copy=value=>Array.isArray(value)?[...value]:value&&typeof value==='object'?{...value}:value;
  function create(input={}){
    if(!input||typeof input!=='object')throw new Error('Mission definition must be an object.');
    const key=String(input.key||'').trim();
    if(!key)throw new Error('Mission definition requires a key.');
    const id=String(input.id||key).trim();
    const aliases=[...new Set([key,id,...(Array.isArray(input.aliases)?input.aliases:[])].filter(Boolean).map(String))];
    const map=typeof input.map==='string'?{key:input.map}:copy(input.map||{key});
    if(!map.key)map.key=key;
    return Object.freeze({
      key,id,aliases,
      metadata:copy(input.metadata||{}),
      classification:input.classification||null,
      modules:Object.freeze([...(input.modules||[])]),
      map:Object.freeze(map),
      runtime:Object.freeze(copy(input.runtime||{})),
      objectives:copy(input.objectives||{source:'mission'}),
      characters:copy(input.characters||{}),
      features:copy(input.features||{}),
      setup:input.setup||null,
      cleanup:input.cleanup||null,
      art:copy(input.art||{}),
      selection:copy(input.selection||{})
    });
  }
  return{create};
});
