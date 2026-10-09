/* Lightweight playable-character wound, downed, stabilise and carry states. */
(function(root,factory){
 const api=factory(root||{});
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.BadFodderHealth=api;
})(typeof window!=='undefined'?window:globalThis,function(root){
 'use strict';
 const STATES=Object.freeze(['FIT','WOUNDED','BADLY_WOUNDED','DOWN','DEAD']);
 const DOWN_SECONDS=12,CARRY_SPEED=.58,AID_RANGE=58;
 let runtimeGetSquad=null,runtimeGetSelected=null,runtimeDispatchAid=null,runtimeIsActive=()=>true,originalDamage=null,originalMove=null,patchedDamage=false,patchedMove=false,simulationClock=null;
 let runtimeSupportAction=null;
 const now=()=>simulationClock!==null?simulationClock:typeof performance!=='undefined'&&performance.now?performance.now()/1000:Date.now()/1000;

 function squad(){try{return runtimeGetSquad?.()||[]}catch(_){return[]}}
 function stateFor(unit){
  if(!unit||unit.alive===false||unit.healthState==='DEAD')return'DEAD';
  if(unit.downed||unit.healthState==='DOWN')return'DOWN';
  const max=Math.max(1,Number(unit.maxHp)||Number(unit.hp)||1),hp=Math.max(0,Number(unit.hp)||0),ratio=hp/max;
  if(ratio<=.34)return'BADLY_WOUNDED';
  if(ratio<=.67)return'WOUNDED';
  return'FIT';
 }
 function sync(unit){if(unit)unit.healthState=stateFor(unit);return unit?.healthState}
 function isSquad(unit){return squad().includes(unit)}
 function feedback(target,amount,hitX,hitY){
  if(!target||!(Number(amount)>0))return;
  const team=isSquad(target)?'squad':'enemy';
  try{root.BadFodderSfx?.impact?.(team==='squad'?'body':'target')}catch(_){}
  try{root.BadFodderExperience?.hit?.({team,x:hitX,y:hitY,amount})}catch(_){}
  target.hitTimer=Math.max(Number(target.hitTimer)||0,.14);target.flash=Math.max(Number(target.flash)||0,.11);
 }
 function freezeDowned(unit){
  if(!unit)return;
  unit.path=null;unit.pendingPath=null;unit.pathIndex=0;unit.target=null;unit.isFormationLeader=false;unit.followRepath=0;
  unit.state='hurt';unit.fireTimer=Math.max(Number(unit.fireTimer)||0,.4);
 }
 function down(unit,seconds=DOWN_SECONDS){
  if(!unit||unit.alive===false)return false;
  if(unit.carryingUnit)dropCarry(unit);if(unit.carriedBy)dropCarry(unit.carriedBy);
  unit.manualGarrison=false;unit.checkpointCover=false;unit.checkpointGarrison=null;
  unit.hp=0;unit.alive=true;unit.downed=true;unit.stabilised=false;unit.healthState='DOWN';unit.downUntil=now()+Math.max(1,seconds);
  unit.damageGrace=.8;
  unit.carryingUnit=null;unit.carriedBy=null;freezeDowned(unit);return true;
 }
 function stabilise(unit,helper=null){
  if(!unit?.downed||unit.alive===false)return false;
  unit.stabilised=true;unit.downUntil=null;unit.healthState='DOWN';freezeDowned(unit);
  if(helper)helper.aidTimer=Math.max(Number(helper.aidTimer)||0,.8);
  if(helper)runtimeSupportAction?.({phase:'begin',actor:helper,action:'stabilise',target:unit,duration:.8});
  return true;
 }
 function recover(unit,amount=2){
  if(!unit?.alive||!Number.isFinite(unit.maxHp)||unit.maxHp<=0||!Number.isFinite(amount)||amount<=0||unit.downed&&!unit.stabilised||!unit.downed&&unit.hp>=unit.maxHp)return false;
  if(unit.carriedBy)dropCarry(unit.carriedBy);
  if(unit.downed){unit.downed=false;unit.stabilised=false;unit.downUntil=null;unit.healthState=null;unit.state='idle'}
  unit.hp=Math.min(unit.maxHp,Math.max(0,unit.hp||0)+amount);sync(unit);return true;
 }
 function beginCarry(unit,helper){
  if(!unit?.downed||unit.alive===false||!helper?.alive||helper.downed||helper.carryingUnit)return false;
  if(Math.hypot((unit.x||0)-(helper.x||0),(unit.y||0)-(helper.y||0))>AID_RANGE)return false;
  if(!unit.stabilised)stabilise(unit,helper);
  unit.carriedBy=helper;helper.carryingUnit=unit;helper.carrySlow=CARRY_SPEED;freezeDowned(unit);
  runtimeSupportAction?.({phase:'begin',actor:helper,action:'carry',target:unit});return true;
 }
 function dropCarry(helper){
  const unit=helper?.carryingUnit;if(!unit)return false;
  unit.carriedBy=null;helper.carryingUnit=null;helper.carrySlow=1;
  runtimeSupportAction?.({phase:'end',actor:helper,action:'carry',target:unit});return true;
 }
 function selectedHelper(){
  try{return(runtimeGetSelected?.()||root.selectedUnits?.()||[]).find(unit=>unit?.alive&&!unit.downed)||null}catch(_){return null}
 }
 function nearestDowned(helper){
  if(!helper)return null;let best=null,dist=AID_RANGE;
  for(const unit of squad())if(unit?.downed&&unit.alive!==false&&unit!==helper&&!unit.carriedBy){const d=Math.hypot((unit.x||0)-helper.x,(unit.y||0)-helper.y);if(d<=dist){dist=d;best=unit}}
  return best;
 }
 function contextualAction(){
  if(!runtimeIsActive())return false;
  const helper=selectedHelper();if(!helper)return false;
  if(runtimeDispatchAid?.())return true;
  if(helper.carryingUnit)return dropCarry(helper);
  const target=nearestDowned(helper);if(!target)return false;
  return target.stabilised?beginCarry(target,helper):stabilise(target,helper);
 }
 function contextualLabel(){
  if(!runtimeIsActive())return'';
  if(root.document?.getElementById('menuScreen')&&!root.document.getElementById('menuScreen').hidden)return'';
  const helper=selectedHelper();if(!helper)return'';
  if(helper.carryingUnit)return'DROP';
  const target=nearestDowned(helper);if(!target)return'';
  return target.stabilised?'CARRY':'STABILISE';
 }
 function finalise(unit){
  if(!unit||unit.alive===false)return false;
  if(originalDamage){unit._healthFinalising=true;try{originalDamage(unit,Math.max(1,(Number(unit.hp)||0)+1),unit.x||0,unit.y||0,null)}finally{unit._healthFinalising=false}}
  else{unit.alive=false;unit.state='dead';unit.deadTimer=0}
  unit.downed=false;unit.stabilised=false;unit.healthState='DEAD';unit.downUntil=null;
  if(unit.carriedBy)dropCarry(unit.carriedBy);if(unit.carryingUnit)dropCarry(unit);return true;
 }
 function tick(){
  const t=now();
  for(const unit of squad()){
   if(!unit)continue;
   if(unit.downed){
    freezeDowned(unit);
    if(unit.carriedBy){unit.x=unit.carriedBy.x-10;unit.y=unit.carriedBy.y+9;unit.dir=unit.carriedBy.dir||unit.dir;unit.insideBuilding=unit.carriedBy.insideBuilding||null}
    if(!unit.stabilised&&Number.isFinite(unit.downUntil)&&t>=unit.downUntil)finalise(unit);
   }else sync(unit);
   if(unit.carryingUnit){unit.fireTimer=Math.max(Number(unit.fireTimer)||0,.34);if(unit.alive===false||unit.downed)dropCarry(unit)}
  }
  syncAidButton();
 }
 function patchDamage(){
  if(patchedDamage||typeof root.applyDamage!=='function')return false;
  originalDamage=root.applyDamage;
  root.applyDamage=handleDamage;
  patchedDamage=true;return true;
 }
 function handleDamage(target,amount,hitX,hitY,source=null){
   if(!target||target?._healthFinalising)return originalDamage(target,amount,hitX,hitY,source);
   if(isSquad(target)&&(target.damageGrace||0)>0)return;
   feedback(target,amount,hitX,hitY);
   if(!isSquad(target))return originalDamage(target,amount,hitX,hitY,source);
   if(target.downed){const result=originalDamage(target,Math.max(1,amount),hitX,hitY,source);target.downed=false;target.healthState=target.alive===false?'DEAD':stateFor(target);if(target.carriedBy)dropCarry(target.carriedBy);if(target.carryingUnit)dropCarry(target);return result}
   const hp=Number(target.hp)||0,next=hp-(Number(amount)||0);
   if(next<=0&&target.alive!==false){
    const safe=Math.max(0,hp-1),result=originalDamage(target,safe,hitX,hitY,source);
    down(target);return result;
   }
   const result=originalDamage(target,amount,hitX,hitY,source);sync(target);return result;
 }
 function bindRuntime({getSquad,getSelected,damage,dispatchAid,isActive=()=>true,onSupportAction=null}={}){
  runtimeSupportAction?.({phase:'reset'});runtimeSupportAction=onSupportAction;
  runtimeIsActive=isActive;runtimeGetSquad=getSquad;runtimeGetSelected=getSelected;runtimeDispatchAid=dispatchAid;originalDamage=damage;simulationClock=0;
 }
 function fixedUpdate(dt){if(simulationClock===null)return;if(!Number.isFinite(dt)||dt<0)return;simulationClock+=dt;tick()}
 function remaining(unit){return Math.max(0,(unit?.downUntil||now())-now())}
 function movementScale(unit){
  if(!unit||unit.alive===false||unit.downed)return 0;
  const wound=stateFor(unit);
  return(unit.carryingUnit?CARRY_SPEED:1)*(wound==='BADLY_WOUNDED'?.78:wound==='WOUNDED'?.92:1);
 }
 function snapshot(){
  const units=squad();return units.map(u=>[stateFor(u),!!u.downed,!!u.stabilised,
   u.downed&&!u.stabilised?Math.max(0,(u.downUntil||now())-now()):null,
   u.carriedBy?units.indexOf(u.carriedBy):null,u.carryingUnit?units.indexOf(u.carryingUnit):null]);
 }
 function receive(rows){
  runtimeSupportAction?.({phase:'reset'});
  const units=squad();rows.forEach((r,i)=>{const u=units[i];if(!u)return;u.healthState=r[0];u.downed=r[1];u.stabilised=r[2];u.downUntil=r[3]===null?null:now()+r[3];u.carriedBy=r[4]===null?null:units[r[4]];u.carryingUnit=r[5]===null?null:units[r[5]]});syncAidButton();
 }
 function patchMovement(){
  if(patchedMove||typeof root.moveEntity!=='function')return false;
  originalMove=root.moveEntity;
  root.moveEntity=function(entity,dx,dy,r){const scale=entity?.carryingUnit?CARRY_SPEED:1;return originalMove(entity,dx*scale,dy*scale,r)};
  patchedMove=true;return true;
 }
 function patchAdaptive(adaptive=root.BadFodderAdaptive){
  if(!adaptive||adaptive.__characterHealthPatched||typeof adaptive.createCommander!=='function')return false;
  const create=adaptive.createCommander;
  adaptive.createCommander=function(options={}){runtimeGetSquad=options.getSquad||runtimeGetSquad;const commander=create.call(this,options),maintain=commander.maintain?.bind(commander);commander.maintain=function(time){const result=maintain?maintain(time):undefined;if(simulationClock===null)tick();return result};return commander};
  adaptive.__characterHealthPatched=true;return true;
 }
 function chainProperty(name,patch){
  const d=Object.getOwnPropertyDescriptor(root,name);if(d&&!d.configurable){patch(root[name]);return}
  if(d&&(d.get||d.set)){const g=d.get,s=d.set;Object.defineProperty(root,name,{configurable:true,enumerable:d.enumerable!==false,get(){return g?g.call(root):undefined},set(v){s?.call(root,v);patch(g?g.call(root):v)}});patch(g?g.call(root):undefined);return}
  let value=d&&'value'in d?d.value:root[name];Object.defineProperty(root,name,{configurable:true,enumerable:true,get(){return value},set(v){value=v;patch(v)}});patch(value);
 }
 function aidButton(){
  if(!root.document)return null;let button=root.document.getElementById('touchAid');if(button)return button;
  const actions=root.document.querySelector('.touch-actions');if(!actions)return null;
  button=root.document.createElement('button');button.id='touchAid';button.type='button';button.className='touch-action touch-gameplay';button.hidden=true;button.setAttribute('aria-label','Contextual casualty action');button.addEventListener('pointerdown',event=>{event.preventDefault();event.stopPropagation();contextualAction();syncAidButton()});actions.appendChild(button);return button;
 }
 function syncAidButton(){const button=aidButton();if(!button)return;const label=contextualLabel();button.hidden=!label;if(label)button.textContent=label}
 function keyboard(event){
  if(event.repeat||String(event.key||'').toLowerCase()!=='e')return;
  const tag=event.target?.tagName?.toLowerCase();if(tag==='input'||tag==='textarea'||tag==='select'||event.target?.isContentEditable)return;
  if(contextualLabel()){event.preventDefault();event.stopImmediatePropagation?.();contextualAction();syncAidButton()}
 }
 function install(){patchDamage();patchMovement();aidButton();root.addEventListener?.('keydown',keyboard,true);setInterval(()=>{if(simulationClock===null)tick()},120)}
 chainProperty('BadFodderAdaptive',patchAdaptive);
 if(root.document){if(root.document.readyState==='loading')root.document.addEventListener('DOMContentLoaded',install,{once:true});else install()}
 return{STATES,DOWN_SECONDS,CARRY_SPEED,AID_RANGE,stateFor,sync,down,stabilise,recover,beginCarry,dropCarry,contextualAction,contextualLabel,finalise,tick,patchDamage,patchMovement,patchAdaptive,bindRuntime,handleDamage,fixedUpdate,movementScale,snapshot,receive,remaining};
});
