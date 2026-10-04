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

  function validateConfiguration(mission,map){
    if(!Number.isFinite(map.width)||!Number.isFinite(map.height)||map.width<=0||map.height<=0)throw new Error('Invalid mission map dimensions');
    if(!Number.isInteger(mission.squadSize)||mission.squadSize<1||mission.squadSize>8)throw new Error('Invalid mission squad size');
    if(typeof mission.title!=='string'||!mission.title)throw new Error('Missing mission title');
    if(!Array.isArray(mission.phases)||!mission.phases.length)throw new Error('Missing mission objectives');
    const zones=map.zones||(map.key==='bad-belzig'?{post:map.pois?.postcolumn,castle:map.pois?.castle,market:map.pois?.market}:{});
    for(const phase of mission.phases){
      if((map.key==='cable-street'?typeof phase.id!=='string'||!Array.isArray(phase.tasks):typeof phase.type!=='string'||!phase.type)||typeof phase.title!=='string')throw new Error('Invalid mission objective');
      if(phase.zone&&!zones[phase.zone])throw new Error('Unknown mission objective zone: '+phase.zone);
      if(phase.checkpoint&&(!['rush','pincer','siege'].includes(phase.checkpoint.style)||!Number.isInteger(phase.checkpoint.count)||phase.checkpoint.count<1))throw new Error('Invalid checkpoint configuration');
      if(phase.defenderGroup&&!Array.isArray(map.defenderGroups?.[phase.defenderGroup]))throw new Error('Unknown defender group');
    }
    for(const [kind,positions] of Object.entries(map.spawns||{})){
      if(!Array.isArray(positions)||positions.some(p=>kind==='pickups'?(!p||!Number.isFinite(p.x)||!Number.isFinite(p.y)||!['med','grenade'].includes(p.type)):(!Array.isArray(p)||p.length!==2||!p.every(Number.isFinite))))throw new Error('Invalid '+kind+' spawn configuration');
    }
    return true;
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

  return{validateConfiguration,DEFAULT_ACTION_PROFILE,createMapRegistry,resolveMap,actionProfile,allows};
});
