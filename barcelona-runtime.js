/* Barcelona: equipment, two finite defensive routes and civilian extraction.
   Objectives, combat, navigation, casualty rescue and the Director remain shared. */
(function(root,factory){const api=factory(typeof module==='object'&&module.exports?require('./barricade-rules'):root.BadFodderBarricades);if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.BadFodderBarcelona=api;})(typeof window!=='undefined'?window:globalThis,function(B){
'use strict';
const hostile=e=>e.alive&&!e.surrendered&&!e.missionDormant;
function create({map,objectives,getSquad,getEnemies,navigation,spawn,scale=1,spawnAllowed=()=>true,status=()=>{},sound=()=>{},setGrenades=()=>{},getResidents=()=>[],spawnResidents=()=>{},reposition=()=>{},random=Math.random}){
 const point=p=>({x:p.x*scale,y:p.y*scale}),barrier={...B.createBarricade({id:'barcelona-barricade',maxIntegrity:90,integrity:0}),...point(map.barricade)};
 const materialPoints=map.barricade.materials.map(p=>({...point(p),supplies:6}));
 let carry=null,armed=false,builds=0,wave=0,timer=0,secure=0,breachTime=0,recovery=0,clock=0,cooldown=0,previous=null,critical=false,openingShots=0;
 const allies=[];
 let nextArrival=0,lastMajorPush=-Infinity,lastAlive=getSquad().filter(s=>s.alive).length,ammoFeedback='READY';
 const delay=group=>(group?.delay||0)+Math.floor(random()*3);
 let eastWave=0,rescueAttack=false,rearguard=false,residentsFound=false,supplyLoads=1,firstRouteHeld=false,secondRouteHeld=false;
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
  if((id==='acquire-weapons'||armed&&supplyLoads>0&&getSquad().some(s=>s.alive&&(s.ammo||0)<45))&&near(unit,contact,50))return armed?'RESUPPLY':'TAKE RIFLES';
  if(['build-barricade','hold-barricade','recovery','reach-civilians','escort-civilians','second-route','hold-east'].includes(id)){
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
   getSquad().filter(s=>s.alive).forEach(s=>{s.weapon='mauser';s.ammo=armed?Math.min(90,(s.ammo||0)+45):Math.max(s.ammo||0,60);s.equipmentManaged=true});
   if(armed){supplyLoads--;status('Printer: These are the last spare cartridges. Make them count.')}else{armed=true;setGrenades(2);objectives.signal('acquire-weapons');status('Neighbour: Rifles are here. Help us hold the Rambla approach.')}cooldown=.8;return true;
  }
  if(action==='TAKE MATERIAL'){const p=materialPoints.find(p=>p.supplies>0&&near(unit,p,45));p.supplies--;carry=index;cooldown=.35;status('Carry the timber and sacks to the barricade.');return true}
  if(action==='DROP MATERIAL'){carry=null;const p=materialPoints.find(p=>near(unit,p,45))||materialPoints[0];p.supplies++;return true}
  if(action==='REINFORCE'){B.reinforceBarricade(barrier,30,{tierIncrease:1});carry=null;builds++;geometry();cooldown=.35;sound('build');status('Barricade reinforced. Use the side passages and garrison to cover both approaches.');return true}
  return false;
 }
 function damage(amount){const before=barrier.breached;B.damageBarricade(barrier,amount);geometry();if(!before&&barrier.breached){status('BARRICADE BREACHED. Repair it or hold the street behind it.');recovery=8}return barrier.integrity}
 function hit(x,y,amount=2){const obstacle=navigation.getDynamicObstacle(barrier.id);if(obstacle&&x>=obstacle.minX-4&&x<=obstacle.maxX+4&&y>=obstacle.minY-4&&y<=obstacle.maxY+4){damage(amount);return true}return false}
 function enter(id){
  timer=0;secure=0;previous=id;status(active()?.text||active()?.title||'');
  if(id==='hold-barricade')nextArrival=delay(map.assaultGroups[wave]);
  if(id==='hold-east')nextArrival=delay(map.easternGroups[eastWave]);
  if(id==='patrol'){getEnemies().forEach(e=>{e.missionDormant=false});sound('distant');status('Joan: Army troops at the square. Keep to cover.')}
  if(id==='recovery'){firstRouteHeld=true;recovery=16;status('The first column has pulled back. Help the wounded. '+(supplyLoads?'Spare cartridges remain at the printer.':'The reserve is spent; conserve cartridges.'))}
  if(id==='reach-civilians'&&!residentsFound){spawnResidents();residentsFound=true;objectives.manager.activate('evacuate-residents');status('Isabel: Families are trapped beside Santa Anna. Get them to the western shelter.')}
  if(id==='second-route'){recovery=Math.max(recovery,8);reposition(map.resistance.eastern);status('SECOND COLUMN APPROACHING from Portal de l’Àngel. Cover the eastern crossing.')}
  if(id==='counterattack'){secondRouteHeld=true;recovery=6;reposition(map.resistance.advance);status('THEY ARE FALLING BACK. Secure the Portal junction with the resistance.')}
 }
 function arrivals(group,index,living){
  if(active()?.id==='recovery'||recovery>0||getEnemies().filter(hostile).length+group.positions.length>(active()?.id==='hold-barricade'?4:6))return false;
  const positions=[group.positions,group.alternatePositions].filter(Boolean).find(points=>points.every(p=>{const at={x:p[0]*scale,y:p[1]*scale};return spawnAllowed(at)&&!living.some(s=>near(s,at,135))}));
  if(!positions)return false;
  spawn({...group,positions,target:group.target||'barricade'},index);status(group.label+'. Keep to cover.');sound('distant');return true;
 }
 function update(dt){
  clock+=dt;cooldown=Math.max(0,cooldown-dt);recovery=Math.max(0,recovery-dt);
  const id=active()?.id,living=getSquad().filter(s=>s.alive&&!s.downed);
  if(carry!==null&&(!getSquad()[carry]?.alive||getSquad()[carry]?.downed)){materialPoints[0].supplies++;carry=null}
  if(id!==previous)enter(id);
  const alive=getSquad().filter(s=>s.alive).length;if(alive<lastAlive)recovery=Math.max(recovery,10);lastAlive=alive;
  if(armed){const level=ammoStatus().level;if(level!==ammoFeedback&&['LOW','CRITICAL','EMPTY'].includes(level))status(level+' AMMUNITION. '+(supplyLoads?'One reserve remains at the printer.':'Choose shots carefully; the reserve is spent.'));ammoFeedback=level;}
  if(!id)return;
  timer+=dt;
  if(id==='opening'&&openingShots<2&&clock>=(openingShots+1)*12){openingShots++;sound('distant');status(openingShots===1?'Joan: Shots from the square. Stay close to the others.':'Isabel: Troops are moving down from Catalunya. Find cover.')}
  if(id==='opening'&&clock>=30&&living.some(s=>near(s,point(map.zones.junction),map.zones.junction.r)))objectives.signal('opening');
  if(id==='acquire-weapons'&&getEnemies().filter(hostile).length===0)recovery=Math.max(recovery,2);
  if(id==='build-barricade'&&builds>=2&&barrier.integrity>=60)objectives.signal('build-barricade');
  // A completed withdrawal is a valid outcome, not a hidden kill requirement.
  for(const e of getEnemies()){const order=e.commandOrder;if(hostile(e)&&order?.type==='RETREAT'&&near(e,order.point,25)&&!near(e,point(map.zones[id==='hold-east'?'eastern':'barricade']),180)){e.missionWithdrawn=true;e.missionDormant=true;e.commandOrder=null;e.path=null}}
  if(getSquad().some(s=>s.alive&&(s.downed&&!s.stabilised||(s.hitTimer||0)>0)))recovery=Math.max(recovery,6);
  if(id==='recovery'){if(timer>=16&&recovery<=0)objectives.signal(id);return}
  if(id==='escort-civilians'){
   if(!rescueAttack&&timer>=map.rescuePressure.delay&&arrivals(map.rescuePressure,'rescue',living))rescueAttack=true;
   const residents=getResidents();
   if(residentsFound&&residents.length&&residents.every(c=>!c.alive||c.civilianState==='EVACUATED')){
    objectives.signal(id);if(residents.every(c=>c.civilianState==='EVACUATED'))objectives.signal('evacuate-residents');
    else if(objectives.manager.get('evacuate-residents')?.status==='ACTIVE')objectives.manager.fail('evacuate-residents',{text:'Not every resident reached shelter.'});
   }
   return;
  }
  if(id==='counterattack'){
   if(!rearguard&&(arrivals(map.rearguard,'rearguard',living)||timer>=25))rearguard=true;
   const z=point(map.zones.advance),nearby=getEnemies().filter(hostile).some(e=>e.commandOrder?.type!=='RETREAT'&&(near(e,z,map.zones.advance.r+20)||near(e,z,140)&&!navigation.lineBlocked(e.x,e.y,z.x,z.y)));
   secure=rearguard&&!nearby&&living.some(s=>near(s,z,map.zones.advance.r))?secure+dt:0;
   if(secure>=6){status('THE POSITION IS SECURE. Across Barcelona, fighting continues.');objectives.signal(id)}
   return;
  }
  if(!['hold-barricade','hold-east'].includes(id))return;
  const east=id==='hold-east',groups=east?map.easternGroups:map.assaultGroups,index=east?eastWave:wave,group=groups[index];
  if(group&&timer>=nextArrival&&arrivals(group,east?'east-'+eastWave:wave,living)){if(east)eastWave++;else wave++;timer=0;nextArrival=delay(groups[east?eastWave:wave])}
  const remaining=getEnemies().filter(hostile);
  const dismantlers=remaining.filter(e=>near(e,barrier,35));if(dismantlers.length)damage(Math.min(3,dismantlers.length)*dt*2);
  const fallback=point(map.zones.fallback),r=map.zones.fallback.r;
  const lost=barrier.breached&&remaining.some(e=>near(e,fallback,r))&&!living.some(s=>near(s,fallback,r+30));
  breachTime=lost?breachTime+dt:Math.max(0,breachTime-dt*2);
  if(breachTime>=20){critical=true;objectives.signal(id,{failed:true,text:'The escape route behind the barricade was lost.'});return}
  const holding=living.some(s=>near(s,east?point(map.zones.eastern):barrier,150));
  secure=(east?eastWave:wave)===groups.length&&remaining.length===0&&holding?secure+dt:0;
  if(secure>=6)objectives.signal(id);
 }
 function directorContext(){const squad=getSquad(),playerStrength=squad.reduce((n,s)=>n+(s.alive?Math.max(0,s.hp)/s.maxHp:0),0)/Math.max(1,squad.length),friendlyStrength=allies.reduce((n,u)=>n+(u.alive?Math.max(0,u.hp)/u.maxHp:0),0)/Math.max(1,allies.length);return{strength:.85*playerStrength+.15*friendlyStrength,ammo:Math.min(1,getSquad().reduce((n,s)=>n+(s.alive&&!s.downed?(s.ammo||0):0),0)/Math.max(1,getSquad().filter(s=>s.alive&&!s.downed).length*45)),barricadeRatio:barrier.integrity/barrier.maxIntegrity,breach:barrier.breached&&['hold-barricade','hold-east'].includes(active()?.id),friendlyStrength,civilianDanger:getResidents().filter(c=>c.alive&&c.civilianState!=='EVACUATED').length/6,objectiveProgress:secondRouteHeld?1:firstRouteHeld ? .5 : 0,climax:active()?.id==='hold-east'&&eastWave>=1}}
 function ammoStatus(units=getSquad()){
  const available=units.filter(s=>s.alive&&!s.downed&&s.weapon),total=getSquad().reduce((n,s)=>n+(s.alive?(s.ammo||0):0),0);
  const level=!available.length?'UNARMED':available.every(s=>(s.ammo||0)===0)?'EMPTY':available.some(s=>(s.ammo||0)<(s.weapon==='pistol'?4:8))?'CRITICAL':available.some(s=>(s.ammo||0)<(s.weapon==='pistol'?8:18))?'LOW':'READY';
  return{total,level};
 }
 function onDirectorDecision(action){if(action==='MAJOR_PUSH')lastMajorPush=clock}
 function canDirect(action){
  if(action==='MAJOR_PUSH'&&(active()?.id!=='hold-east'||clock-lastMajorPush<32||getSquad().some(s=>s.alive&&s.carryingUnit)||directorContext().strength<.65||directorContext().ammo<.25))return false;
  if(active()?.id==='opening')return ['DO_NOTHING','HOLD','PATROL'].includes(action);
  if(active()?.id==='recovery'||recovery>0||getSquad().some(s=>s.alive&&s.downed&&!s.stabilised))return ['DO_NOTHING','HOLD','REGROUP','RETREAT','OPTIONAL_RESCUE','SUPPLY_OPPORTUNITY'].includes(action);
  if(['acquire-weapons','reach-barricade','build-barricade','reach-civilians','escort-civilians','second-route'].includes(active()?.id))return ['DO_NOTHING','PATROL','HOLD','REGROUP','OPTIONAL_RESCUE','SUPPLY_OPPORTUNITY'].includes(action);
  return true;
 }
 function summary(){return{barrier:Math.round(barrier.integrity),breached:barrier.breached,waves:wave+eastWave,completed:objectives.manager.missionState().complete,optionalRescue:objectives.manager.get('evacuate-residents')?.status||'PENDING',firstRouteHeld,secondRouteHeld,civiliansFound:getResidents().length,civiliansRescued:getResidents().filter(c=>c.civilianState==='EVACUATED').length,civiliansLost:getResidents().filter(c=>!c.alive).length,supplyLoads,critical,allies:allies.filter(u=>u.alive).length,alliesLost:allies.filter(u=>!u.alive).length,characters:getSquad().map(s=>({name:s.name,alive:s.alive,health:s.healthState||'FIT'}))}}
 function dispose(){navigation.removeDynamicObstacle(barrier.id)}
 getSquad().forEach((s,i)=>{s.weapon=i===0?'pistol':null;s.ammo=i===0?18:0;s.equipmentManaged=true});
 getEnemies().forEach(e=>{e.missionDormant=true});setGrenades(0);
 return{barrier,materialPoints,allies,ammoStatus,onDirectorDecision,hint,interact,update,damage,hit,directorContext,canDirect,summary,dispose,get carrying(){return carry},get armed(){return armed},get stage(){return{wave,eastWave,clock,recovery,breachTime,rescueAttack,rearguard,nextArrival}}};
}
return{create};
});
