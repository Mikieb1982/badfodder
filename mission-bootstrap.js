/* Explicit mission/map bootstrap rules.
   Browser: window.BadFodderMissionBootstrap
   Node: require('./mission-bootstrap.js') */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.BadFodderMissionBootstrap=api;
})(typeof window!=='undefined'?window:globalThis,function(){
  'use strict';

  const DEFAULT_ACTION_PROFILE=Object.freeze({
    firearms:true,
    grenades:true,
    contextualActions:[]
  });

  function createMapRegistry(entries){
    const registry=new Map();
    for(const [key,value] of Object.entries(entries||{})){
      if(!key||!value)continue;
      registry.set(key,value);
    }
    return registry;
  }

  function resolveMap(mission,registry){
    if(!mission)throw new Error('Cannot resolve a map without a mission definition.');
    if(!mission.map)throw new Error('Mission "'+(mission.title||mission.id||'unknown')+'" does not define a map key.');
    if(!(registry instanceof Map))throw new Error('Mission map registry is unavailable.');
    const map=registry.get(mission.map);
    if(!map)throw new Error('Unknown mission map "'+mission.map+'" for '+(mission.title||mission.id||'mission')+'.');
    return map;
  }

  function actionProfile(mission){
    const profile=mission&&mission.actionProfile||{};
    return{
      firearms:profile.firearms!==false,
      grenades:profile.grenades!==false,
      contextualActions:Array.isArray(profile.contextualActions)?[...profile.contextualActions]:[]
    };
  }

  function allows(profile,action){
    if(action==='firearms'||action==='grenades')return profile&&profile[action]!==false;
    return !!(profile&&Array.isArray(profile.contextualActions)&&profile.contextualActions.includes(action));
  }

  return{DEFAULT_ACTION_PROFILE,createMapRegistry,resolveMap,actionProfile,allows};
});
