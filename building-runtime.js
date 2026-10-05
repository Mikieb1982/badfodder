/* Opt-in building sites reuse map footprints, navigation and in-world actors. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.BadFodderBuildingRuntime=api;})(typeof window!=='undefined'?window:globalThis,function(){
 'use strict';
 const ACTIONS=Object.freeze(['ENTER','EXIT','SEARCH','GARRISON','DEFEND','RESCUE','COLLECT','INTERACT','SABOTAGE']);
 function create({sites=[],getSquad=()=>[],release=()=>{},canReach=()=>true,onAction=()=>true,range=80}={}){
  const byId=new Map(sites.map(s=>[s.id,{...s,searched:false,collected:false,sabotaged:false,rescued:false}]));
  if(byId.size!==sites.length)throw new Error('Duplicate building site');
  for(const s of byId.values())if(!s.id||!Number.isFinite(s.center?.x)||!Number.isFinite(s.center?.y)||!Number.isFinite(s.door?.x)||!Number.isFinite(s.door?.y)||!s.actions?.every(a=>ACTIONS.includes(a)))throw new Error('Invalid building site');
  const stop=u=>{u.path=null;u.pendingPath=null;u.target=null;u.navDestination=null;u.pathIndex=0;u.isFormationLeader=false;u.state='idle'};
  function current(unit){return byId.get(unit?.insideBuilding)||null}
  function nearest(unit){
   if(!unit?.alive||unit.downed)return null;
   if(current(unit))return current(unit);
   let best=null,d=range;
   for(const s of byId.values()){const distance=Math.hypot(unit.x-s.door.x,unit.y-s.door.y);if(distance<=d&&canReach(unit,s.door)){best=s;d=distance}}
   return best;
  }
  function exit(unit){
   const s=current(unit);if(!s)return false;
   release(unit);unit.insideBuilding=null;unit.x=s.door.x;unit.y=s.door.y;stop(unit);return true;
  }
  function nextAction(unit,s=nearest(unit)){
   if(!s)return'';
   if(!current(unit))return'ENTER';
   if(!s.searched&&s.actions.includes('SEARCH'))return'SEARCH';
   if(s.cache&&!s.collected&&s.actions.includes('COLLECT'))return'COLLECT';
   if(s.resident&&!s.rescued&&s.actions.includes('RESCUE'))return'RESCUE';
   if(s.target&&!s.sabotaged&&s.actions.includes('SABOTAGE'))return'SABOTAGE';
   return'EXIT';
  }
  function perform(unit,action=nextAction(unit),site=nearest(unit)){
   if(!unit?.alive||unit.downed||!site||!ACTIONS.includes(action)||!site.actions.includes(action))return false;
   if(action==='EXIT')return exit(unit);
   if(action==='ENTER'){
    if(current(unit)||Math.hypot(unit.x-site.door.x,unit.y-site.door.y)>range||!canReach(unit,site.door))return false;
    release(unit);unit.insideBuilding=site.id;unit.x=site.center.x;unit.y=site.center.y;stop(unit);onAction(action,site,unit);return true;
   }
   if(current(unit)!==site)return false;
   if(['GARRISON','DEFEND'].includes(action)){exit(unit);unit.manualGarrison=true;unit.garrisonAnchorX=unit.x;unit.garrisonAnchorY=unit.y;return onAction(action,site,unit)!==false}
   const flag={SEARCH:'searched',COLLECT:'collected',RESCUE:'rescued',SABOTAGE:'sabotaged'}[action];
   if(flag&&site[flag])return false;
   if(action==='COLLECT'&&(!site.cache||!site.searched)||action==='RESCUE'&&!site.resident||action==='SABOTAGE'&&!site.target)return false;
   if(onAction(action,site,unit)===false)return false;
   if(flag)site[flag]=true;
   return true;
  }
  function occupied(site){return getSquad().some(u=>u.alive&&u.insideBuilding===site.id)}
  function snapshot(){return{units:getSquad().map(u=>u.insideBuilding||null),sites:[...byId.values()].map(s=>[s.id,s.searched,s.collected,s.rescued,s.sabotaged])}}
  function receive(saved){saved.units.forEach((id,i)=>{const u=getSquad()[i];if(u)u.insideBuilding=byId.has(id)?id:null});for(const [id,...flags] of saved.sites){const s=byId.get(id);if(s)[s.searched,s.collected,s.rescued,s.sabotaged]=flags}}
  return{sites:[...byId.values()],nearest,current,exit,nextAction,perform,occupied,snapshot,receive};
 }
 return{ACTIONS,create};
});
