/* First Barcelona slice: equipment, contextual materials and a finite street defence.
   Objectives, combat, navigation, casualty rescue and the Director remain shared. */
(function(root,factory){const api=factory(typeof module==='object'&&module.exports?require('./barricade-rules'):root.BadFodderBarricades);if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.BadFodderBarcelona=api;})(typeof window!=='undefined'?window:globalThis,function(B){
'use strict';
const hostile=e=>e.alive&&!e.surrendered&&!e.missionDormant;
function create({map,objectives,getSquad,getEnemies,navigation,spawn,scale=1,spawnAllowed=()=>true,status=()=>{},sound=()=>{},setGrenades=()=>{}}){
 const point=p=>({x:p.x*scale,y:p.y*scale}),barrier={...B.createBarricade({id:'barcelona-barricade',maxIntegrity:90,integrity:0}),...point(map.barricade)};
 const materialPoints=map.barricade.materials.map(p=>({...point(p),supplies:6}));
 let carry=null,armed=false,builds=0,wave=0,timer=0,secure=0,breachTime=0,recovery=0,clock=0,cooldown=0,previous=null,critical=false,openingShots=0;
 const allies=[];
 function geometry(){
  const exists=navigation.getDynamicObstacle(barrier.id);
  if(barrier.integrity>0&&!exists)navigation.registerDynamicObstacle({id:barrier.id,kind:'barricade',lowCover:true,points:map.barricade.points.map(p=>p.map(v=>v*scale))});
  if(barrier.integrity<=0&&exists)navigation.removeDynamicObstacle(barrier.id);
 }
 const near=(a,b,r)=>Math.hypot(a.x-b.x,a.y-b.y)<=r*scale;
 const active=()=>objectives.manager.current();
 function hint(unit){
  if(!unit?.alive||unit.downed)return'';
  const id=active()?.id,contact=point(map.zones.contact);
  if((id==='acquire-weapons'||armed&&getSquad().some(s=>s.alive&&(s.ammo||0)<8))&&near(unit,contact,50))return armed?'RESUPPLY':'TAKE RIFLES';
  if(['build-barricade','hold-barricade'].includes(id)){
   if(near(unit,barrier,68)&&carry===getSquad().indexOf(unit)&&barrier.integrity<barrier.maxIntegrity)return'REINFORCE';
   if(near(unit,barrier,68)&&carry!==null)return'MATERIALS WITH '+getSquad()[carry]?.name;
   if(carry===getSquad().indexOf(unit))return'DROP MATERIAL';
   if(carry===null&&materialPoints.some(p=>p.supplies>0&&near(unit,p,45)))return'TAKE MATERIAL';
  }
  return'';
 }
 function interact(unit){
  const action=hint(unit);if(!action||cooldown>0)return false;const index=getSquad().indexOf(unit);
  if(action==='TAKE RIFLES'||action==='RESUPPLY'){
   getSquad().filter(s=>s.alive).forEach(s=>{s.weapon='mauser';s.ammo=Math.max(s.ammo||0,60);s.equipmentManaged=true});
   armed=true;setGrenades(2);objectives.signal('acquire-weapons');status('Neighbour: Rifles are here. Help us hold the Rambla approach.');cooldown=.8;return true;
  }
  if(action==='TAKE MATERIAL'){const p=materialPoints.find(p=>p.supplies>0&&near(unit,p,45));p.supplies--;carry=index;cooldown=.35;status('Carry the timber and sacks to the barricade.');return true}
  if(action==='DROP MATERIAL'){carry=null;const p=materialPoints.find(p=>near(unit,p,45))||materialPoints[0];p.supplies++;return true}
  if(action==='REINFORCE'){B.reinforceBarricade(barrier,30,{tierIncrease:1});carry=null;builds++;geometry();cooldown=.35;sound('build');status('Barricade reinforced. Use the side passages and garrison to cover both approaches.');return true}
  return false;
 }
 function damage(amount){const before=barrier.breached;B.damageBarricade(barrier,amount);geometry();if(!before&&barrier.breached){status('BARRICADE BREACHED. Repair it or hold the street behind it.');recovery=8}return barrier.integrity}
 function hit(x,y,amount=2){const obstacle=navigation.getDynamicObstacle(barrier.id);if(obstacle&&x>=obstacle.minX-4&&x<=obstacle.maxX+4&&y>=obstacle.minY-4&&y<=obstacle.maxY+4){damage(amount);return true}return false}
 function update(dt){
  clock+=dt;cooldown=Math.max(0,cooldown-dt);recovery=Math.max(0,recovery-dt);
  const id=active()?.id,living=getSquad().filter(s=>s.alive&&!s.downed);
  if(carry!==null&&(!getSquad()[carry]?.alive||getSquad()[carry]?.downed)){materialPoints[0].supplies++;carry=null}
  if(id!==previous){timer=0;secure=0;previous=id;status(active()?.text||active()?.title||'');if(id==='patrol'){getEnemies().forEach(e=>{e.missionDormant=false});sound('distant');status('Joan: Army troops at the square. Keep to cover.')}}
  if(id==='opening'&&openingShots<2&&clock>=(openingShots+1)*12){openingShots++;sound('distant');status(openingShots===1?'Joan: Shots from the square. Stay close to the others.':'Isabel: Troops are moving down from Catalunya. Find cover.')}
  if(id==='opening'&&clock>=30&&living.some(s=>near(s,point(map.zones.junction),map.zones.junction.r)))objectives.signal('opening');
  if(id==='acquire-weapons'&&getEnemies().filter(hostile).length===0)recovery=Math.max(recovery,2);
  if(id==='build-barricade'&&builds>=2&&barrier.integrity>=60)objectives.signal('build-barricade');
  if(id!=='hold-barricade')return;
  timer+=dt;
  for(const e of getEnemies()){const order=e.commandOrder;if(hostile(e)&&order?.type==='RETREAT'&&near(e,order.point,25)&&!near(e,barrier,180)){e.missionWithdrawn=true;e.missionDormant=true;e.commandOrder=null;e.path=null}}
  const enemies=getEnemies().filter(hostile),down=getSquad().some(s=>s.alive&&s.downed&&!s.stabilised);
  const damaged=getSquad().some(s=>s.alive&&(s.hitTimer||0)>0);
  if(down||damaged)recovery=Math.max(recovery,6);
  const group=map.assaultGroups[wave];
  if(group&&timer>=group.delay&&recovery<=0&&enemies.length<=4){
   // Defer arrivals while an approach is visible or a player is camping there.
   const clear=group.positions.every(p=>{const at={x:p[0]*scale,y:p[1]*scale};return spawnAllowed(at)&&!living.some(s=>near(s,at,135))});
   if(clear){spawn(group,wave);wave++;timer=0;status(group.label+'. Cover the street and the side passages.');sound('distant')}
  }
  const remaining=getEnemies().filter(hostile);
  const dismantlers=remaining.filter(e=>near(e,barrier,35));if(dismantlers.length)damage(Math.min(3,dismantlers.length)*dt*2);
  const fallback=point(map.zones.fallback),r=map.zones.fallback.r;
  const lost=barrier.breached&&remaining.some(e=>near(e,fallback,r))&&!living.some(s=>near(s,fallback,r+30));
  breachTime=lost?breachTime+dt:Math.max(0,breachTime-dt*2);
  if(breachTime>=20){critical=true;objectives.signal('hold-barricade',{failed:true,text:'The escape route behind the barricade was lost.'});return}
  const holding=living.some(s=>near(s,barrier,150));
  secure=wave===map.assaultGroups.length&&remaining.length===0&&holding?secure+dt:0;
  if(secure>=6)objectives.signal('hold-barricade');
 }
 function directorContext(){const squad=getSquad(),playerStrength=squad.reduce((n,s)=>n+(s.alive?Math.max(0,s.hp)/s.maxHp:0),0)/Math.max(1,squad.length),friendlyStrength=allies.reduce((n,u)=>n+(u.alive?Math.max(0,u.hp)/u.maxHp:0),0)/Math.max(1,allies.length);return{strength:.85*playerStrength+.15*friendlyStrength,ammo:Math.min(1,getSquad().reduce((n,s)=>n+(s.alive?(s.ammo||0):0),0)/48),barricadeRatio:barrier.integrity/barrier.maxIntegrity,breach:barrier.breached&&active()?.id==='hold-barricade',friendlyStrength,climax:active()?.id==='hold-barricade'&&wave>=2}}
 function canDirect(action){
  if(active()?.id==='opening')return ['DO_NOTHING','HOLD','PATROL'].includes(action);
  if(recovery>0||getSquad().some(s=>s.alive&&s.downed&&!s.stabilised))return ['DO_NOTHING','HOLD','REGROUP','RETREAT','OPTIONAL_RESCUE','SUPPLY_OPPORTUNITY'].includes(action);
  if(['acquire-weapons','reach-barricade','build-barricade'].includes(active()?.id))return ['DO_NOTHING','PATROL','HOLD','REGROUP','OPTIONAL_RESCUE','SUPPLY_OPPORTUNITY'].includes(action);
  return true;
 }
 function summary(){return{barrier:Math.round(barrier.integrity),breached:barrier.breached,waves:wave,critical,allies:allies.filter(u=>u.alive).length,alliesLost:allies.filter(u=>!u.alive).length,characters:getSquad().map(s=>({name:s.name,alive:s.alive,health:s.healthState||'FIT'}))}}
 function dispose(){navigation.removeDynamicObstacle(barrier.id)}
 getSquad().forEach((s,i)=>{s.weapon=i===0?'pistol':null;s.ammo=i===0?18:0;s.equipmentManaged=true});
 getEnemies().forEach(e=>{e.missionDormant=true});setGrenades(0);
 return{barrier,materialPoints,allies,hint,interact,update,damage,hit,directorContext,canDirect,summary,dispose,get carrying(){return carry},get armed(){return armed},get stage(){return{wave,clock,recovery,breachTime}}};
}
return{create};
});
