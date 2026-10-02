'use strict';
const assert=require('node:assert/strict');
const Navigation=require('../navigation.js');
const RouteValidation=require('../mission-route-validation.js');
const Cable=require('../cable-street-runtime.js');
const Historical=require('../historical-missions.js');
const fixture=require('./fixtures/cable-street-navigation-fixture.cjs');

let nav;
function updateFacing(ent,dx,dy){
  if(Math.abs(dx)>.001||Math.abs(dy)>.001)ent.dir=Math.atan2(dy,dx);
}
function moveEntity(ent,dx,dy,r=6){
  const nx=Math.max(r,Math.min(fixture.worldWidth-r,ent.x+dx));
  if(!nav.obstacleAt(nx,ent.y,r))ent.x=nx;
  const ny=Math.max(r,Math.min(fixture.worldHeight-r,ent.y+dy));
  if(!nav.obstacleAt(ent.x,ny,r))ent.y=ny;
}
nav=Navigation.create({
  worldWidth:fixture.worldWidth,
  worldHeight:fixture.worldHeight,
  buildings:fixture.buildings,
  mapKey:'cable-street-fixture',
  moveEntity,
  updateFacing
});

const p=fixture.points;
const openRoute=nav.findPath(p.defenderStart.x,p.defenderStart.y,p.farSide.x,p.farSide.y);
assert(openRoute.length,'Synthetic street should be traversable before a barricade is registered');
assert(nav.routeClear(p.defenderStart.x,p.defenderStart.y,p.farSide.x,p.farSide.y,nav.NAV_RADIUS));

const actor={
  x:p.defenderStart.x,y:p.defenderStart.y,alive:true,
  path:null,pathIndex:0,target:null,navDestination:null,pathVersion:0
};
assert(nav.assignPath(actor,p.farSide.x,p.farSide.y),'Actor could not acquire the original open-street route');
const routeVersion=actor.pathVersion;
const versionBefore=nav.navigationVersion;

assert.equal(nav.registerDynamicObstacle(fixture.barricade),'fixture-barricade-B');
assert(nav.navigationVersion>versionBefore,'Registering a live barricade did not advance the navigation version');
assert.equal(nav.metrics().dynamicObstacles,1);
assert(nav.obstacleAt(180,90,2),'Live barricade is not part of movement collision');
assert(!nav.routeClear(p.defenderStart.x,p.defenderStart.y,p.farSide.x,p.farSide.y,nav.NAV_RADIUS),'Live barricade does not close the route');
assert.equal(nav.findPath(p.defenderStart.x,p.defenderStart.y,p.farSide.x,p.farSide.y).length,0,'Pathfinder can still cross a live full-width barricade');
assert(actor.pathVersion===routeVersion,'Existing actor path version should stay stale until the actor updates');

const activeReport=RouteValidation.validateRouteRequirements(nav,[
  {id:'defender-retreat',phase:'regroup',side:'defender',from:p.defenderStart,to:p.defenderRetreat,expect:'reachable'},
  {id:'support-access',phase:'hold-approach',side:'support',from:p.defenderStart,to:p.supportAccess,expect:'reachable'},
  {id:'police-approach',phase:'hold-approach',side:'police',from:p.policeStart,to:p.policeApproach,expect:'reachable'},
  {id:'barrier-separation',phase:'hold-approach',side:'separation',from:p.policeStart,to:p.defenderStart,expect:'blocked'}
]);
assert(activeReport.ok,'Valid phase-aware separated routes were rejected: '+JSON.stringify(activeReport.failed));

const invalidReport=RouteValidation.validateRouteRequirements(nav,[
  {id:'incorrect-through-route',phase:'hold-approach',side:'police',from:p.policeStart,to:p.defenderStart,expect:'reachable'}
]);
assert(!invalidReport.ok,'Validator incorrectly requires police to cross the defended barricade');
assert.throws(
  ()=>RouteValidation.assertRouteRequirements(nav,[
    {id:'incorrect-through-route',from:p.policeStart,to:p.defenderStart,expect:'reachable'}
  ]),
  /Mission route validation failed/
);

// The actor held a valid route before the barricade closed. On the next update it
// must reject that stale route instead of walking through the new obstacle.
const beforeBlockedUpdate={x:actor.x,y:actor.y};
assert.equal(nav.followPath(actor,90,1/30),false);
assert.equal(actor.x,beforeBlockedUpdate.x);
assert.equal(actor.y,beforeBlockedUpdate.y);
assert(actor.navDestination,'Blocked stale route lost the actor destination needed for later recovery');
assert.equal(actor.pathVersion,nav.navigationVersion,'Stale actor path was not refreshed to the new navigation version');
assert(Array.isArray(actor.path)&&actor.path.length===0,'Actor should wait with an empty current path while the street is closed');

const closedVersion=nav.navigationVersion;
assert(nav.updateDynamicObstacle('fixture-barricade-B',{solid:false}),'Barricade breach update failed');
assert(nav.navigationVersion>closedVersion,'Breaching a barricade did not invalidate navigation caches');
assert(!nav.obstacleAt(180,90,2),'Breached barricade still blocks movement');
assert(nav.findPath(p.defenderStart.x,p.defenderStart.y,p.farSide.x,p.farSide.y).length,'Breached barricade did not reopen the route');

// The next normal followPath call must notice the new version and continue toward
// the original destination without a new player command.
let steps=0;
while(actor.navDestination&&steps<400){
  nav.followPath(actor,90,1/30);
  steps++;
}
assert(steps<400,'Actor never resumed its old destination after the barricade opened');
assert(Math.hypot(actor.x-p.farSide.x,actor.y-p.farSide.y)<3,'Actor did not reach the original far-side destination after breach');
assert.equal(actor.navDestination,null,'Completed resumed route retained a stale destination');

const reopenVersion=nav.navigationVersion;
assert(nav.updateDynamicObstacle('fixture-barricade-B',{solid:true}));
assert(nav.navigationVersion>reopenVersion);
assert(!nav.routeClear(p.defenderStart.x,p.defenderStart.y,p.farSide.x,p.farSide.y,nav.NAV_RADIUS));

const snapshot=nav.getDynamicObstacle('fixture-barricade-B');
assert(snapshot&&snapshot.solid);
snapshot.points[0][0]=999;
assert.notEqual(nav.getDynamicObstacle('fixture-barricade-B').points[0][0],999,'Dynamic obstacle snapshots expose mutable live geometry');

assert.throws(()=>nav.registerDynamicObstacle(fixture.barricade),/already registered/);
assert.throws(
  ()=>nav.registerDynamicObstacle({id:'bad-shape',points:[[1,1],[2,2]]}),
  /at least three polygon points/
);

assert(nav.removeDynamicObstacle('fixture-barricade-B'));
assert.equal(nav.metrics().dynamicObstacles,0);
assert(nav.routeClear(p.defenderStart.x,p.defenderStart.y,p.farSide.x,p.farSide.y,nav.NAV_RADIUS),'Removing the barricade did not reopen the street');
assert.equal(nav.removeDynamicObstacle('fixture-barricade-B'),false);

const metrics=nav.metrics();
assert(metrics.dynamicInvalidations>=4,'Expected dynamic obstacle changes were not recorded');
assert(metrics.navigationVersion===nav.navigationVersion);
assert(metrics.blockedCache>=0&&metrics.edgeCache>=0);

function makeControllerNav(){
  let q;
  const update=(ent,dx,dy)=>{if(Math.abs(dx)>.001||Math.abs(dy)>.001)ent.dir=Math.atan2(dy,dx)};
  const move=(ent,dx,dy,r=6)=>{
    const nx=Math.max(r,Math.min(fixture.worldWidth-r,ent.x+dx));
    if(!q.obstacleAt(nx,ent.y,r))ent.x=nx;
    const ny=Math.max(r,Math.min(fixture.worldHeight-r,ent.y+dy));
    if(!q.obstacleAt(ent.x,ny,r))ent.y=ny;
  };
  q=Navigation.create({
    worldWidth:fixture.worldWidth,
    worldHeight:fixture.worldHeight,
    buildings:fixture.buildings,
    mapKey:'cable-controller-fixture',
    moveEntity:move,
    updateFacing:update
  });
  return q;
}

const controllerNav=makeControllerNav();
const cableMission=Historical.get('cable-street-1936');
const controller=Cable.createController({mission:cableMission});
const controlledBarricade=Cable.createBarricade({
  id:'B',maxIntegrity:30,integrity:10,constructionTier:1,workPositions:1
});
controller.initialize({actors:[{id:'player-0'}],barricades:[controlledBarricade]});
assert(controller.attachNavigation(controllerNav));
assert.equal(
  controller.registerBarricadeGeometry('B',{points:fixture.barricade.points}),
  'cable-barricade:B'
);
assert(controllerNav.obstacleAt(180,90,2),'Controller-registered barricade does not block navigation');
const navVersionBeforeDamage=controllerNav.navigationVersion;
assert.equal(controller.damageBarricadeById('B',5),5);
assert.equal(controlledBarricade.breached,false);
assert.equal(controllerNav.navigationVersion,navVersionBeforeDamage,'Non-breaching damage should not invalidate navigation');
assert.equal(controller.damageBarricadeById('B',5),5);
assert.equal(controlledBarricade.breached,true);
assert(controllerNav.navigationVersion>navVersionBeforeDamage,'Breach did not invalidate navigation');
assert(!controllerNav.obstacleAt(180,90,2),'Breached controller barricade still blocks navigation');
const breachEvent=controller.state.events.at(-1);
assert.deepEqual(breachEvent,{type:'barricade-breach-change',barricadeId:'B',breached:true});

const versionBeforeRebuild=controllerNav.navigationVersion;
assert.equal(controller.reinforceBarricadeById('B',6,{tierIncrease:1}),6);
assert.equal(controlledBarricade.breached,false);
assert(controllerNav.navigationVersion>versionBeforeRebuild,'Rebuilding after breach did not invalidate navigation');
assert(controllerNav.obstacleAt(180,90,2),'Rebuilt controller barricade did not restore collision');
assert.equal(controller.state.events.at(-1).breached,false);

assert(controller.dispose());
assert.equal(controllerNav.getDynamicObstacle('cable-barricade:B'),null,'Controller disposal left a dynamic barricade registered');

console.log('PASS: dynamic barricades close/reopen movement and invalidate path cells, edges and connected components.');
console.log('PASS: stale actor routes re-plan automatically and resume the original destination after a breach.');
console.log('PASS: phase-aware route validation accepts separated police/defender regions while enforcing required retreat and support routes.');
console.log('PASS: Cable Street controller breach/rebuild transitions toggle the same registered navigation obstacle and clean it up on disposal.');
