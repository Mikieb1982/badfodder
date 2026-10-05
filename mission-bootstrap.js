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
  const UNIVERSAL_OBJECTIVE_TYPES=new Set([
    'REACH','CLEAR','HOLD','CAPTURE','FIND','SEARCH','RESCUE','ESCORT','EVACUATE',
    'GARRISON','INTERACT','SABOTAGE','DESTROY','DEFEND','ESCAPE','SURVIVE','OPTIONAL'
  ]);
  const LEGACY_OBJECTIVE_TYPES=new Set([
    'reach','secure-zone','eliminate-and-reach','eliminate','destroy','rescue','protect',
    'clear','hold','capture','find','search','escort','evacuate','garrison','interact',
    'sabotage','defend','escape','survive','optional'
  ]);

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

  function objectivesForMission(mission){
    if(Array.isArray(mission?.objectives)&&mission.objectives.length)return mission.objectives;
    return Array.isArray(mission?.phases)?mission.phases:[];
  }

  function validObjectiveType(type){
    if(typeof type!=='string'||!type)return false;
    return UNIVERSAL_OBJECTIVE_TYPES.has(type.toUpperCase())||LEGACY_OBJECTIVE_TYPES.has(type.toLowerCase());
  }

  function validateObjectiveGraph(objectives){
    const ids=new Set();
    for(const objective of objectives){
      if(objective.id==null)continue;
      if(typeof objective.id!=='string'||!objective.id.trim())throw new Error('Invalid mission objective id');
      if(ids.has(objective.id))throw new Error('Duplicate mission objective id: '+objective.id);
      ids.add(objective.id);
    }
    const refs=value=>value==null?[]:(Array.isArray(value)?value:[value]);
    for(const objective of objectives){
      for(const ref of [...refs(objective.requires),...refs(objective.next)]){
        if(typeof ref!=='string'||!ref.trim())throw new Error('Invalid mission objective reference');
        if(ids.size&&!ids.has(ref))throw new Error('Unknown mission objective reference: '+ref);
      }
    }
  }

  function validateConfiguration(mission,map){
    if(!Number.isFinite(map.width)||!Number.isFinite(map.height)||map.width<=0||map.height<=0)throw new Error('Invalid mission map dimensions');
    if(!Number.isInteger(mission.squadSize)||mission.squadSize<1||mission.squadSize>8)throw new Error('Invalid mission squad size');
    if(typeof mission.title!=='string'||!mission.title)throw new Error('Missing mission title');
    const objectives=objectivesForMission(mission);
    if(!objectives.length)throw new Error('Missing mission objectives');
    const zones=map.zones||(map.key==='bad-belzig'?{post:map.pois?.postcolumn,castle:map.pois?.castle,market:map.pois?.market}:{});
    for(const objective of objectives){
      const cableLegacy=map.key==='cable-street'&&!mission.objectives&&typeof objective.id==='string'&&Array.isArray(objective.tasks);
      if((cableLegacy?typeof objective.id!=='string'||!Array.isArray(objective.tasks):!validObjectiveType(objective.type))||typeof objective.title!=='string')throw new Error('Invalid mission objective');
      if(objective.zone&&!zones[objective.zone])throw new Error('Unknown mission objective zone: '+objective.zone);
      if(objective.checkpoint&&(!['rush','pincer','siege'].includes(objective.checkpoint.style)||!Number.isInteger(objective.checkpoint.count)||objective.checkpoint.count<1))throw new Error('Invalid checkpoint configuration');
      if(objective.defenderGroup&&!Array.isArray(map.defenderGroups?.[objective.defenderGroup]))throw new Error('Unknown defender group');
      if(objective.priority!=null&&!Number.isFinite(objective.priority))throw new Error('Invalid mission objective priority');
      if(objective.marker!=null&&(typeof objective.marker!=='object'||Array.isArray(objective.marker)))throw new Error('Invalid mission objective marker');
      if(objective.director!=null&&(typeof objective.director!=='object'||Array.isArray(objective.director)))throw new Error('Invalid mission objective director configuration');
    }
    validateObjectiveGraph(objectives);
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

  return{validateConfiguration,objectivesForMission,validObjectiveType,DEFAULT_ACTION_PROFILE,createMapRegistry,resolveMap,actionProfile,allows};
});
