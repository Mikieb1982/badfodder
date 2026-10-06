/* Behavioural roles complement the existing local Commander and pathfinding. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.BadFodderEnemyBehaviour=api;})(typeof window!=='undefined'?window:globalThis,function(){
 'use strict';
 const ROLES=['PATROL','RIFLEMAN','AGGRESSOR','SUPPRESSOR','FLANKER','COMMANDER'];
 const hostile=e=>e.alive&&!e.surrendered;
 function modifiers(e){return{speed:e.combatRole==='AGGRESSOR'?1.2:e.combatRole==='COMMANDER'?.9:1,spread:e.combatRole==='RIFLEMAN'?.85:e.combatRole==='SUPPRESSOR'?1.15:1,burst:e.combatRole==='SUPPRESSOR'?4:2,pause:e.combatRole==='SUPPRESSOR'?.65:e.combatRole==='AGGRESSOR'?.8:1,reaction:e.coordinated?.85:1};}
 function tacticalTarget(e,target,objective,zone){
  if(!zone)return target;
  const type=objective?.type;
  if(['ESCAPE','EVACUATE','ESCORT'].includes(type))return{x:(zone.x+target.x)/2,y:(zone.y+target.y)/2};
  if(['RESCUE','SEARCH','SABOTAGE'].includes(type)&&Math.hypot(e.x-zone.x,e.y-zone.y)<zone.r*2)return zone;
  return target;
 }
 function create({getEnemies=()=>[],getSquad=()=>[],scale=1,canSee=()=>true,onSurrender=()=>{},autoCommanders=true}={}){
  let timer=0;
  function assign(){const groups=new Map();getEnemies().forEach((e,i)=>{if(!e.combatRole)e.combatRole=ROLES[i%5];if(!groups.has(e.groupId))groups.set(e.groupId,[]);groups.get(e.groupId).push(e)});for(const group of groups.values())if(autoCommanders&&group.length>=3&&!group.some(e=>e.combatRole==='COMMANDER'))group[0].combatRole='COMMANDER';}
  assign();
  function fixedUpdate(dt){
   timer-=dt;if(timer>0)return;const elapsed=.5;timer=.5;assign();
   const enemies=getEnemies().filter(hostile),living=getSquad().filter(s=>s.alive&&!s.downed);
   const groups=new Map();for(const e of enemies){if(!groups.has(e.groupId))groups.set(e.groupId,[]);groups.get(e.groupId).push(e)}
   for(const e of enemies){
    const friends=groups.get(e.groupId)||[];
    e.coordinated=friends.some(other=>other!==e&&other.combatRole==='COMMANDER'&&Math.hypot(e.x-other.x,e.y-other.y)<120*scale);
    const nearby=living.filter(s=>Math.hypot(e.x-s.x,e.y-s.y)<90*scale&&canSee(e,s));
    const isolated=friends.filter(other=>other!==e&&Math.hypot(e.x-other.x,e.y-other.y)<120*scale).length<=1;
    const overwhelmed=e.hp<=1&&(e.suppression||0)>=.7&&nearby.length>=3&&isolated&&!e.coordinated;
    e.surrenderPressure=overwhelmed?(e.surrenderPressure||0)+elapsed:0;
    if(e.surrenderPressure<2)continue;
    e.surrendered=true;e.state='idle';e.path=null;e.pendingPath=null;e.pathQueued=false;e.target=null;e.commandOrder=null;e.fireTimer=0;e.alert=false;e.cooldown=1e6;onSurrender(e);
   }
  }
  function snapshot(){return getEnemies().map(e=>[e.combatRole||'RIFLEMAN',!!e.surrendered]);}
  function receive(rows){rows.forEach((r,i)=>{const e=getEnemies()[i];if(e){e.combatRole=r[0];e.surrendered=r[1]}});}
  return{fixedUpdate,snapshot,receive};
 }
 return{ROLES,hostile,modifiers,tacticalTarget,create};
});
