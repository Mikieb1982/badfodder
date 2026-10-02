'use strict';
const assert=require('node:assert/strict'),path=require('node:path');
const Historical=require('../historical-missions.js'),Cable=require('../cable-street-runtime.js');
const Interactions=require('../cable-street-interactions.js'),Director=require('../cable-street-director.js');
const Verify=require('../tools/cable-street/verify-release.cjs');
const {map,report}=Verify.verifyDirectory(path.join(__dirname,'../authoring/cable-street'));
assert(report.ready,JSON.stringify(report.problems));
const mission=Historical.get('cable-street-1936');
const scale=2;
const scaledMap={...map,width:map.width*scale,height:map.height*scale,
  buildings:map.buildings.map(b=>({...b,points:b.points.map(p=>p.map(v=>v*scale))}))};
const nav=Verify.createNavigation(scaledMap),controller=Cable.createController({mission});
controller.attachNavigation(nav);
const interactions=Interactions.create({controller,runtime:Cable,mission,options:{scale,pressureControlled:true,navigation:nav}});
interactions.initialize({mapData:map,actors:map.spawns.squad.map((p,i)=>({id:'player-'+i,x:p[0]*scale,y:p[1]*scale,active:true}))});
const regroup={x:map.regroupPoint.x*scale,y:map.regroupPoint.y*scale};
const director=Director.create({controller,mission,options:{regroupPoint:regroup,regroupRadius:48}});
let lead=controller.state.actors.get('player-0'),b=controller.state.barricades.get('B');
const f=controller.state.formations.get('police-1');
assert.equal(b.interactionRadius,map.historicalObjects.barricades[0].interactionRadius*scale);
assert.equal(f.width,map.historicalObjects.formations[0].width*scale);
function tick(seconds){for(let t=0;t<seconds;t+=.05){nav.followPath(lead,175,.05);interactions.fixedUpdate(.05);director.fixedUpdate(.05)}}
function moveTo(p){
  interactions.cancelJob(lead.id);
  assert(nav.assignPath(lead,p.x,p.y),'No production route to '+JSON.stringify(p));
  for(let t=0;t<15&&lead.navDestination;t+=.05)tick(.05);
  assert(Math.hypot(lead.x-p.x,lead.y-p.y)<10,'Actor did not reach action position');
}
function action(type,id,act){
  assert(interactions.assignJob(lead.id,{action:act,targetType:type,targetId:id}),act+' unavailable');tick(1.3);
}
const material=controller.state.materials.values().next().value;
moveTo(material);action('material',material.id,'carry');
moveTo(b.workPoints[0]);action('barricade','B','reinforce');
const resident=controller.state.civilians.values().next().value;
moveTo(resident);action('civilian',resident.id,'assist');
for(let t=0;t<90&&resident.status!=='exited';t+=.05)tick(.05);
assert.equal(resident.status,'exited');
assert(Math.hypot(resident.x-resident.exitX,resident.y-resident.exitY)<16,'Rescue disappeared before reaching exit');
assert.equal(director.snapshot().phaseId,'gathering','Pressure started without deliberate HOLD');
moveTo(b.workPoints[0]);action('barricade','B','hold');tick(2);
assert.equal(director.snapshot().phaseId,'hold-approach');
// Moving off a reserved HOLD slot must remove its damage mitigation.
const away={x:lead.x+130,y:lead.y};
lead.x=away.x;interactions.fixedUpdate(.05);
assert(!b.occupiedWorkPositions.includes(lead.id),'Departed holder still occupies slot');
moveTo(b.workPoints[0]);action('barricade','B','hold');
for(let t=0;t<90&&director.snapshot().phaseId==='hold-approach';t+=.05)tick(.05);
assert.equal(director.snapshot().phaseId,'regroup');
moveTo(regroup);tick(9);
assert.equal(director.snapshot().phaseId,'they-shall-not-pass');
// Complete the real 240-second hold using production material stock and pressure timings.
moveTo(b.workPoints[0]);action('barricade','B','hold');
for(let t=0;t<400&&!director.snapshot().completed&&!director.snapshot().failed;t++){
  if(b.integrity<55){
    const load=lead.carrying?controller.state.materials.get(lead.carrying):[...controller.state.materials.values()].find(m=>!m.consumed&&!m.carriedBy);
    if(load){if(!lead.carrying){moveTo(load);action('material',load.id,'carry');}moveTo(b.workPoints[0]);action('barricade','B','reinforce');action('barricade','B','hold')}
  }
  tick(1);
}
assert.equal(director.snapshot().completed,true,JSON.stringify(director.snapshot()));
assert.equal(director.snapshot().finalHoldSeconds,240);
// Restart restores production objects without duplicating navigation barriers.
interactions.initialize({mapData:map,actors:map.spawns.squad.map((p,i)=>({id:'player-'+i,x:p[0]*scale,y:p[1]*scale,active:true}))});
lead=controller.state.actors.get('player-0');b=controller.state.barricades.get('B');
assert.equal(nav.listDynamicObstacles().length,1);
// Delivery through the real interaction must restore a breached navigation barrier.
controller.damageBarricadeById('B',1000);
assert.equal(nav.getDynamicObstacle('cable-barricade:B').solid,false);
const recovery=lead.carrying?controller.state.materials.get(lead.carrying):[...controller.state.materials.values()].find(m=>!m.consumed&&!m.carriedBy);
assert(recovery,'Restart failed to restore materials');
if(!lead.carrying){moveTo(recovery);action('material',recovery.id,'carry');}moveTo(b.workPoints[0]);action('barricade','B','reinforce');
assert.equal(b.breached,false);assert.equal(nav.getDynamicObstacle('cable-barricade:B').solid,true);
// Persistent breach must end in a retryable local failure rather than stall forever.
const failureDirector=Director.create({controller,mission});failureDirector.enterPhase(3);
controller.damageBarricadeById('B',1000);failureDirector.fixedUpdate(31);
assert.equal(failureDirector.snapshot().failed,true);
controller.dispose();assert.equal(nav.listDynamicObstacles().length,0);
console.log('PASS: production Cable Street slice navigates, carries, reinforces, evacuates, regroups and completes all 240 seconds at browser scale 2.');
console.log('PASS: departed HOLD releases support, material rebuild restores collision, persistent breach fails locally and disposal removes barriers.');
