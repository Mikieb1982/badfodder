/* Director opportunities reuse real residents, supplies and optional objective rules. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.BadFodderOpportunities=api;})(typeof window!=='undefined'?window:globalThis,function(){
 'use strict';
 function create({getCivilians=()=>[],getPickups=()=>[],getSquad=()=>[],getObjectives,scale=1,status=()=>{}}={}){
  const tracked=new Map();let timer=0;
  const near=(actor,radius)=>getSquad().some(s=>s.alive&&!s.downed&&Math.hypot(s.x-actor.x,s.y-actor.y)<radius*scale);
  function candidate(action){
   const list=action==='OPTIONAL_RESCUE'?getCivilians():getPickups();
   return list.find((a,i)=>action==='OPTIONAL_RESCUE'?a.civilianState==='DOWN'&&near(a,250)&&!getObjectives().manager.get('director-rescue-'+i):a.active&&a.type==='grenade'&&near(a,300)&&!getObjectives().manager.get('director-cache-'+i));
  }
  function valid(action){return ['OPTIONAL_RESCUE','SUPPLY_OPPORTUNITY'].includes(action)&&!!candidate(action);}
  function execute(action){
   const actor=candidate(action);if(!actor)return false;
   const rescue=action==='OPTIONAL_RESCUE',index=(rescue?getCivilians():getPickups()).indexOf(actor),id=(rescue?'director-rescue-':'director-cache-')+index;
   getObjectives().manager.add({id,type:rescue?'RESCUE':'INTERACT',optional:true,priority:-10,title:rescue?'Help a wounded resident':'Supplies nearby',text:rescue?'Reach the resident and use HELP.':'Collect the nearby grenades.',marker:{x:actor.x,y:actor.y,r:25*scale}},{activate:true});
   tracked.set(id,{actor,rescue});status(rescue?'A wounded resident needs help nearby.':'A supply cache is nearby.');return true;
  }
  function fixedUpdate(dt){timer-=dt;if(timer>0)return;timer=.5;for(const [id,{actor,rescue}]of tracked){
   const objective=getObjectives().manager.get(id);if(!objective||objective.status!=='ACTIVE'){tracked.delete(id);continue;}
   if(rescue&&actor.civilianState==='DEAD'){getObjectives().manager.fail(id);tracked.delete(id)}
   else if(rescue?actor.civilianState!=='DOWN':!actor.active){getObjectives().signal(id);tracked.delete(id)}
  }}
  function context(){
   const civilians=getCivilians(),exposed=civilians.filter(c=>c.alive&&c.civilianState!=='EVACUATED'),squad=getSquad();
   const objectives=getObjectives().manager.all().filter(o=>!o.optional);
   return{civilianDanger:exposed.filter(c=>['FRIGHTENED','FLEEING','DOWN','WOUNDED'].includes(c.civilianState)).length/Math.max(1,exposed.length),civilianDown:exposed.filter(c=>c.civilianState==='DOWN').length,
    civilianLosses:civilians.filter(c=>c.civilianState==='DEAD').length,civiliansRescued:civilians.filter(c=>c.civilianState==='EVACUATED').length,
    squadSize:squad.filter(s=>s.alive&&!s.downed).length,downed:squad.filter(s=>s.downed).length,suppression:squad.reduce((n,s)=>n+(s.suppression||0),0)/Math.max(1,squad.length),
    garrisonPositions:squad.filter(s=>s.alive&&!s.downed&&(s.manualGarrison||s.checkpointCover)).map(s=>({x:s.x,y:s.y})),objectiveProgress:objectives.filter(o=>o.status==='COMPLETED').length/Math.max(1,objectives.length),ammo:1};
  }
  return{valid,execute,fixedUpdate,context};
 }
 return{create};
});
