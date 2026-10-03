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
function tick(seconds){for(let t=0;t<seconds;t+=.05){for(const a of controller.state.actors.values())nav.followPath(a,240,.05);interactions.fixedUpdate(.05);if(director.state.phaseIndex===3)for(const a of controller.state.actors.values())if(!a.carrying)interactions.streetAttack(a.id,{kind:'throw'});director.fixedUpdate(.05)}}
function moveTo(p){
  interactions.cancelJob(lead.id);
  assert(nav.assignPath(lead,p.x,p.y),'No production route to '+JSON.stringify(p));
  for(let t=0;t<15&&lead.navDestination;t+=.05)tick(.05);
  assert(Math.hypot(lead.x-p.x,lead.y-p.y)<10,'Actor did not reach action position');
}
function action(type,id,act){
  assert(interactions.assignJob(lead.id,{action:act,targetType:type,targetId:id}),act+' unavailable');tick(1.3);
}
// Two delivered loads immediately start pressure; evacuation is now an optional reward.
for(let i=0;i<2;i++){
  const material=[...controller.state.materials.values()].find(m=>!m.consumed&&!m.carriedBy);
  moveTo(material);action('material',material.id,'carry');
  moveTo(b.workPoints[0]);action('barricade','B','reinforce');
}
assert.equal(director.snapshot().phaseId,'hold-approach');
assert(!director.snapshot().buildMissed,'Construction should start action before the deadline');
action('barricade','B','hold');
// Moving off a reserved HOLD slot must remove its damage mitigation.
const away={x:lead.x+130,y:lead.y};
lead.x=away.x;interactions.fixedUpdate(.05);
assert(!b.occupiedWorkPositions.includes(lead.id),'Departed holder still occupies slot');
moveTo(b.workPoints[0]);action('barricade','B','hold');
for(let t=0;t<90&&director.snapshot().phaseId==='hold-approach';t+=.05){
  for(const a of controller.state.actors.values())interactions.streetAttack(a.id,{kind:'throw'});
  tick(.05);
}
assert.equal(director.snapshot().phaseId,'regroup');
if(b.integrity<30){const load=[...controller.state.materials.values()].find(m=>!m.consumed&&!m.carriedBy);moveTo(load);action('material',load.id,'carry');moveTo(b.workPoints[0]);action('barricade','B','reinforce')}
moveTo(regroup);tick(4);
assert.equal(director.snapshot().phaseId,'they-shall-not-pass');
// Complete the faster 90-second defence with live pressure, active attacks and repairs.
const defences=[...controller.state.barricades.values()];
const actors=[...controller.state.actors.values()];
for(let i=0;i<actors.length;i++){
 const defence=defences[Math.floor(i/2)%defences.length],p=defence.workPoints[i%2];
 interactions.cancelJob(actors[i].id);assert(nav.assignPath(actors[i],p.x,p.y));
}
tick(6);
for(let i=0;i<actors.length;i++){const defence=defences[Math.floor(i/2)%defences.length],p=defence.workPoints[i%2];assert(Math.hypot(actors[i].x-p.x,actors[i].y-p.y)<12,'Volunteer cannot reach the second pressure point')}
for(let t=0;t<180&&!director.snapshot().completed&&!director.snapshot().failed;t++){
  const weak=defences.slice().sort((a,b)=>a.integrity-b.integrity)[0];
  if(weak.integrity<55){
    lead=actors[weak.id==='S'?2:0];
    const load=lead.carrying?controller.state.materials.get(lead.carrying):[...controller.state.materials.values()].filter(m=>!m.consumed&&!m.carriedBy&&!m.reservedBy).sort((a,b)=>Math.hypot(a.x-lead.x,a.y-lead.y)-Math.hypot(b.x-lead.x,b.y-lead.y))[0];
    if(load){if(!lead.carrying){moveTo(load);action('material',load.id,'carry')}moveTo(weak.workPoints[0]);action('barricade',weak.id,'reinforce')}
  }
  for(let attack=0;attack<3;attack++){for(const a of controller.state.actors.values())interactions.streetAttack(a.id,{kind:'throw'});tick(.35)}
}
assert.equal(director.snapshot().completed,true,JSON.stringify(director.snapshot()));
assert.equal(director.snapshot().finalHoldSeconds,90);
// Restart restores production objects without duplicating navigation barriers.
interactions.initialize({mapData:map,actors:map.spawns.squad.map((p,i)=>({id:'player-'+i,x:p[0]*scale,y:p[1]*scale,active:true}))});
lead=controller.state.actors.get('player-0');b=controller.state.barricades.get('B');
assert.equal(nav.listDynamicObstacles().length,map.historicalObjects.barricades.length);
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
console.log('PASS: production diagonal Cable Street navigates both defence points, carries, reinforces, fights, regroups and completes all 90 seconds at browser scale 2.');
console.log('PASS: departed HOLD releases support, material rebuild restores collision, persistent breach fails locally and disposal removes barriers.');
