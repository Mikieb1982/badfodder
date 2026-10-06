/* Morale, suppression pinning and bounding-overwatch extension. */
(function(root,factory){
  const api=factory(root||{});
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.BadFodderCombatTacticsExtension=api;
})(typeof window!=='undefined'?window:globalThis,function(root){
  'use strict';
  const clamp=(n,a=0,b=100)=>Math.max(a,Math.min(b,Number(n)||0));
  const groupMorale=new Map(),commanderAlive=new WeakMap(),pairStates=new Map();
  let runtimeSquad=()=>[],runtimeEnemies=()=>[],worldBounds=null,panicEpoch=0,tacticalClock=0;
  const frameUnits=[];
  const active=u=>u&&u.alive!==false&&!u.surrendered&&!u.downed&&!u.insideBuilding;
  const keyFor=u=>String(u?.groupId??u?.team??u?.side??u?._tacticalSide??'squad');
  function suppressionOf(u){if(!u)return 0;if(Number.isFinite(u.tacticalSuppression))return clamp(u.tacticalSuppression);return clamp((Number(u.suppression)||0)*100)}
  function setSuppression(u,value){const v=clamp(value);u.tacticalSuppression=v;u.suppression=v/100;return v}
  function applyNearMissSuppression(unit,projectile){if(!unit||unit.alive===false)return 0;return setSuppression(unit,suppressionOf(unit)+8)}
  function applyDirectHitSuppression(unit){if(!unit||unit.alive===false)return 0;return setSuppression(unit,suppressionOf(unit)+25)}
  function getUnitTacticalModifiers(unit){
    const s=suppressionOf(unit),pinned=s>80,suppressed=s>40,panicked=unit?.tacticalState==='PANIC'||unit?.tacticalState==='SURRENDERED';
    let speed=pinned?.25:suppressed?.60:1,accuracy=suppressed?1/1.5:1;
    if(unit?.boundingRole==='OVERWATCH')speed=0;if(unit?.boundingRole==='BOUNDING')speed*=1.15;if(unit?.tacticalState==='SURRENDERED')speed=0;
    return{speedMultiplier:speed,accuracyMultiplier:accuracy,isPinned:pinned,isPanicked:panicked};
  }
  function noCover(u){return !(u?.coverMask||u?.insideBuilding||u?.checkpointGarrison||u?.manualGarrison)}
  function findFleeTarget(u,coverPolygons=[]){
    let best=null,bestD=Infinity;
    for(const c of coverPolygons||[]){if(!c||!(c.garrison||c.isGarrison||c.building||c.entry))continue;const x=Number(c.x??c.cx??c.entry?.x),y=Number(c.y??c.cy??c.entry?.y);if(!Number.isFinite(x)||!Number.isFinite(y))continue;const d=Math.hypot((u.x||0)-x,(u.y||0)-y);if(d<bestD){bestD=d;best={x,y}}}
    if(best)return best;
    const b=worldBounds||u?.mapBounds;if(b){const candidates=[{x:b.minX??0,y:u.y},{x:b.maxX??b.width??u.x,y:u.y},{x:u.x,y:b.minY??0},{x:u.x,y:b.maxY??b.height??u.y}];for(const c of candidates){const d=Math.hypot(u.x-c.x,u.y-c.y);if(d<bestD){bestD=d;best=c}}return best}
    const angle=((Number(u.id)||String(u.name||'').length)*2.3999632297)%(Math.PI*2);return{x:(u.x||0)+Math.cos(angle)*260,y:(u.y||0)+Math.sin(angle)*260};
  }
  function panicRoll(u,morale,coverPolygons){
    if(!active(u)||!noCover(u)||morale>=25||u._panicEpoch===panicEpoch)return;
    u._panicEpoch=panicEpoch;
    let h=2166136261,s=String(u.id??u.name??Math.random());for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}
    if((h>>>0)%2===0){u.tacticalState='PANIC';u.panicked=true;u.sprint=false;u.tacticalFleeTarget=findFleeTarget(u,coverPolygons);u.target={...u.tacticalFleeTarget};u.commandOrder=null}
    else{u.tacticalState='SURRENDERED';u.surrendered=true;u.nonHostile=true;u.interactable=true;u.sprint=false;u.path=null;u.pendingPath=null;u.target=null;u.commandOrder=null;u.fireTimer=1e6;u.state='surrendered'}
  }
  function updateMorale(units,coverPolygons){
    const groups=new Map();for(const u of units){const k=keyFor(u);if(!groups.has(k))groups.set(k,[]);groups.get(k).push(u);if(!groupMorale.has(k))groupMorale.set(k,100)}
    for(const [k,list] of groups){let morale=groupMorale.get(k)??100;for(const u of list){if(u.combatRole!=='COMMANDER'&&u.role!=='COMMANDER'&&u.rank!=='COMMANDER')continue;const before=commanderAlive.get(u);const now=u.alive!==false;if(before===true&&!now)morale=clamp(morale-40);commanderAlive.set(u,now)}groupMorale.set(k,morale);for(const u of list)panicRoll(u,morale,coverPolygons)}
  }
  function pairKey(a,b){const x=String(a.id??a.name??0),y=String(b.id??b.name??1);return x<y?x+'|'+y:y+'|'+x}
  function objectiveOf(u){return u?.tacticalAdvanceTarget||u?.commandOrder?.point||u?.objectiveTarget||null}
  function updateBounding(units,dt){
    const groups=new Map();for(const u of units){if(!active(u)||u.tacticalState==='PANIC')continue;const target=objectiveOf(u);if(!target)continue;const k=keyFor(u);if(!groups.has(k))groups.set(k,[]);groups.get(k).push(u)}
    for(const list of groups.values())for(let i=0;i+1<list.length;i+=2){
      const a=list[i],b=list[i+1],target=objectiveOf(a)||objectiveOf(b);if(!target)continue;const key=pairKey(a,b);let state=pairStates.get(key);if(!state){state={mover:b,holder:a,startX:b.x,startY:b.y,leg:0};pairStates.set(key,state)}
      if(!active(state.mover)||!active(state.holder)){pairStates.delete(key);continue}
      const moved=Math.hypot((state.mover.x||0)-state.startX,(state.mover.y||0)-state.startY),nearTarget=Math.hypot((state.mover.x||0)-target.x,(state.mover.y||0)-target.y)<42;
      state.holder.boundingRole='OVERWATCH';state.holder.overwatchTarget=target;state.holder.state=state.holder.state==='run'?'idle':state.holder.state;
      state.mover.boundingRole='BOUNDING';state.mover.sprint=suppressionOf(state.mover)<=80;state.mover.boundingTarget=target;
      if(moved>=120||nearTarget){const oldMover=state.mover;state.mover=state.holder;state.holder=oldMover;state.startX=state.mover.x;state.startY=state.mover.y;state.leg++;state.mover.boundingRole='BOUNDING';state.holder.boundingRole='OVERWATCH'}
    }
  }
  function updateTacticalState(units=[],hostiles=[],coverPolygons=[],dt=0){
    const decay=Math.max(0,Number(dt)||0)*12;for(const u of units){if(!u)continue;if(active(u))setSuppression(u,suppressionOf(u)-decay);else if(u.alive===false)setSuppression(u,0);const s=suppressionOf(u);if(s>80){u.lowCrawl=true;u.sprint=false;if(u.state==='run')u.state='crawl'}else if(s<=70)u.lowCrawl=false}
    tacticalClock-=Math.max(0,Number(dt)||0);if(tacticalClock<=0){tacticalClock=.25;updateMorale(units,coverPolygons);updateBounding(units,.25)}return units;
  }
  function notifyGrenadeDetonation(x,y,units){
    let list=units;if(!list){frameUnits.length=0;const a=runtimeSquad(),b=runtimeEnemies();for(let i=0;i<a.length;i++)frameUnits.push(a[i]);for(let i=0;i<b.length;i++)frameUnits.push(b[i]);list=frameUnits}const hitGroups=new Set();for(const u of list){if(!active(u)||Math.hypot((u.x||0)-x,(u.y||0)-y)>96)continue;const k=keyFor(u);if(hitGroups.has(k))continue;hitGroups.add(k);groupMorale.set(k,clamp((groupMorale.get(k)??100)-20))}panicEpoch++;
  }
  function patchExplosion(fn){if(typeof fn!=='function'||fn.__combatTacticsExtensionPatched)return fn;const wrapped=function(x,y){const result=fn.apply(this,arguments);notifyGrenadeDetonation(Number(x)||0,Number(y)||0);return result};wrapped.__combatTacticsExtensionPatched=true;return wrapped}
  function patchHealth(health){if(!health||health.__combatTacticsExtensionPatched||typeof health.handleDamage!=='function')return false;const original=health.handleDamage;health.handleDamage=function(target){applyDirectHitSuppression(target);return original.apply(this,arguments)};health.__combatTacticsExtensionPatched=true;return true}
  function patchBase(base){
    if(!base||base.__combatTacticsExtensionPatched)return false;
    const oldMove=base.movementScale,oldSpread=base.spreadScale;function legacyNeutral(fn,u){const saved=u?.suppression;if(u)u.suppression=0;try{return fn(u)}finally{if(u)u.suppression=saved}}if(typeof oldMove==='function')base.movementScale=function(u){return legacyNeutral(oldMove,u)*getUnitTacticalModifiers(u).speedMultiplier};if(typeof oldSpread==='function')base.spreadScale=function(u){const m=getUnitTacticalModifiers(u);return legacyNeutral(oldSpread,u)/Math.max(.01,m.accuracyMultiplier)};
    if(typeof base.create==='function'){
      const originalCreate=base.create;base.create=function(options={}){runtimeSquad=options.getSquad||runtimeSquad;runtimeEnemies=options.getEnemies||runtimeEnemies;worldBounds=options.worldBounds||worldBounds;const instance=originalCreate.call(this,options),fixed=instance.fixedUpdate?.bind(instance),near=instance.nearShot?.bind(instance);instance.fixedUpdate=function(dt){fixed?.(dt);frameUnits.length=0;const a=runtimeSquad(),b=runtimeEnemies();for(let i=0;i<a.length;i++){a[i]._tacticalSide='squad';frameUnits.push(a[i])}for(let i=0;i<b.length;i++){b[i]._tacticalSide='enemy';frameUnits.push(b[i])}updateTacticalState(frameUnits,b,options.coverPolygons||[],dt)};instance.nearShot=function(owner,ax,ay,bx,by,seen){const targets=owner==='squad'?runtimeEnemies():runtimeSquad();for(const u of targets)if(active(u)&&!Number.isFinite(u.tacticalSuppression))setSuppression(u,suppressionOf(u));const result=near?.(owner,ax,ay,bx,by,seen);const dx=bx-ax,dy=by-ay,l=dx*dx+dy*dy;if(l>.0001){for(const u of targets){if(!active(u))continue;const t=Math.max(0,Math.min(1,((u.x-ax)*dx+(u.y-ay)*dy)/l)),d=Math.hypot(u.x-ax-t*dx,u.y-ay-t*dy);if(d<22*(options.scale||1))applyNearMissSuppression(u,{owner,ax,ay,bx,by})}}return result};return instance};
    }
    base.__combatTacticsExtensionPatched=true;return true;
  }
  function patchedValue(value,patch){const next=patch(value);return typeof value==='function'&&typeof next==='function'?next:value}function chainProperty(name,patch){const d=Object.getOwnPropertyDescriptor(root,name);if(d&&!d.configurable){if(d.writable&&typeof root[name]==='function')root[name]=patchedValue(root[name],patch);else patch(root[name]);return}if(d&&(d.get||d.set)){const g=d.get,s=d.set;Object.defineProperty(root,name,{configurable:true,enumerable:d.enumerable!==false,get(){return g?g.call(root):undefined},set(v){const next=patchedValue(v,patch);s?.call(root,next)}});const current=g?g.call(root):undefined;if(typeof current==='function'&&s)s.call(root,patchedValue(current,patch));else patch(current);return}let value=d&&'value'in d?d.value:root[name];Object.defineProperty(root,name,{configurable:true,enumerable:true,get(){return value},set(v){value=patchedValue(v,patch)}});value=patchedValue(value,patch)}
  chainProperty('BadFodderCombatTactics',patchBase);chainProperty('BadFodderHealth',patchHealth);chainProperty('explode',patchExplosion);if(root.document)root.document.addEventListener('DOMContentLoaded',()=>{patchBase(root.BadFodderCombatTactics);patchHealth(root.BadFodderHealth);if(typeof root.explode==='function')root.explode=patchExplosion(root.explode)},{once:true});
  return{applyNearMissSuppression,updateTacticalState,getUnitTacticalModifiers,notifyGrenadeDetonation,applyDirectHitSuppression,patchBase};
});
