'use strict';
const assert=require('node:assert/strict');
const Navigation=require('../navigation.js');
const Cable=require('../cable-street-runtime.js');
const Interactions=require('../cable-street-interactions.js');
const Historical=require('../historical-missions.js');
const fixture=require('./fixtures/cable-street-interaction-fixture.cjs');

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
  mapKey:'cable-interaction-fixture',
  moveEntity,
  updateFacing
});

const mitigationFixture=Cable.createBarricade({id:'mitigation',maxIntegrity:100,integrity:100,workPositions:3});
assert.equal(Interactions.pressureDamageMultiplier(mitigationFixture),1);
Cable.reserveWorkPosition(mitigationFixture,'worker-a');
assert(Math.abs(Interactions.pressureDamageMultiplier(mitigationFixture)-.72)<1e-9);
Cable.reserveWorkPosition(mitigationFixture,'worker-b');
assert(Math.abs(Interactions.pressureDamageMultiplier(mitigationFixture)-.44)<1e-9);
Cable.reserveWorkPosition(mitigationFixture,'worker-c');
assert(Math.abs(Interactions.pressureDamageMultiplier(mitigationFixture)-.3)<1e-9,'Hold mitigation must respect the maximum cap');

const mission={...Historical.get('cable-street-1936'),continuousHold:false};
const controller=Cable.createController({mission});
controller.attachNavigation(nav);
const interactions=Interactions.create({
  controller,
  runtime:Cable,
  mission,
  options:{scale:1,pressureControlled:true}
});

interactions.initialize({
  actors:[{id:'player-0',name:'Volunteer',x:138,y:90,active:true}],
  mapData:fixture.mapData
});

const barricade=controller.state.barricades.get('B');
const timber=controller.state.materials.get('timber-1');
const crates=controller.state.materials.get('crates-1');
const resident=controller.state.civilians.get('resident-1');
const police=controller.state.formations.get('police-1');
const actor=controller.state.actors.get('player-0');

assert(barricade&&timber&&crates&&resident&&police&&actor);
assert(nav.obstacleAt(180,90,2),'Interaction initialization did not register the live barricade');
assert.equal(interactions.hint('player-0'),'CARRY TIMBER');

// CARRY: assign by clicking the material, then complete once the actor is within range.
let job=interactions.assignAt('player-0',timber.x,timber.y);
assert(job&&job.action==='carry');
assert.equal(timber.reservedBy,'player-0');
assert(interactions.fixedUpdate(.05));
assert.equal(actor.carrying,'timber-1');
assert.equal(timber.carriedBy,'player-0');
assert.equal(controller.state.jobs.size,0);

// World-space carrying: the material follows the actor rather than remaining at pickup position.
interactions.syncActors([{id:'player-0',name:'Volunteer',x:150,y:90,active:true}]);
interactions.fixedUpdate(.05);
assert.equal(timber.x,158);
assert.equal(timber.y,82);
assert.equal(interactions.hint('player-0'),'REINFORCE MAIN DEFENCE');

// REINFORCE: a carried object is consumed into the barricade after the timed job.
const beforeReinforce=barricade.integrity;
job=interactions.assignAt('player-0',180,90);
assert(job&&job.action==='reinforce');
interactions.fixedUpdate(.3);
assert.equal(job.status,'working');
interactions.fixedUpdate(.4);
assert.equal(barricade.integrity,beforeReinforce+15);
assert.equal(timber.consumed,true);
assert.equal(actor.carrying,null);
assert(controller.state.events.some(e=>e.type==='barricade-reinforced'&&e.amount===15));

// DROP: pick up a second object, move away from all other contexts and use nearest ACTION.
interactions.syncActors([{id:'player-0',name:'Volunteer',x:132,y:90,active:true}]);
job=interactions.assignAt('player-0',crates.x,crates.y);
assert(job&&job.action==='carry');
interactions.fixedUpdate(.05);
assert.equal(actor.carrying,'crates-1');
interactions.syncActors([{id:'player-0',name:'Volunteer',x:60,y:90,active:true}]);
interactions.fixedUpdate(.05);
assert.equal(interactions.hint('player-0'),'DROP CRATES');
job=interactions.assignNearest('player-0');
assert(job&&job.action==='drop');
interactions.fixedUpdate(.01);
assert.equal(actor.carrying,null);
assert.equal(crates.carriedBy,null);
assert.equal(crates.reservedBy,null);
assert.equal(crates.x,60);
assert.equal(crates.y,90);

// ASSIST/RESCUE: assistance takes time, then the resident exits after a short safe delay.
interactions.syncActors([{id:'player-0',name:'Volunteer',x:112,y:90,active:true}]);
assert.equal(interactions.hint('player-0'),'ASSIST RESIDENT');
job=interactions.assignAt('player-0',resident.x,resident.y);
assert(job&&job.action==='assist');
interactions.fixedUpdate(.55);
assert.equal(resident.status,'waiting');
interactions.fixedUpdate(.65);
assert.equal(resident.status,'assisted');
assert(controller.state.events.some(e=>e.type==='civilian-assisted'&&e.civilianId==='resident-1'));
interactions.fixedUpdate(.35);
assert.equal(resident.status,'exited');
assert(controller.state.events.some(e=>e.type==='civilian-exited'&&e.civilianId==='resident-1'));

// HOLD: no material in hand, close to an intact barricade.
interactions.syncActors([{id:'player-0',name:'Volunteer',x:160,y:90,active:true}]);
assert.equal(interactions.hint('player-0'),'HOLD MAIN DEFENCE');
job=interactions.assignAt('player-0',180,90);
assert(job&&job.action==='hold');
interactions.fixedUpdate(1);
assert.equal(job.status,'working');
assert(barricade.occupiedWorkPositions.includes('player-0'));
interactions.fixedUpdate(1.1);
assert.equal(controller.state.jobs.size,0);
assert(!barricade.occupiedWorkPositions.includes('player-0'));
assert(controller.state.events.some(e=>e.type==='barricade-held'&&e.barricadeId==='B'));

// POLICE FORMATION: approach -> halt -> dismantle -> regroup -> withdraw.
// Speed it up only inside the synthetic test after the player interaction cycle.
police.x=230;police.y=90;police.targetX=212;police.targetY=90;
police.speed=80;police.haltSeconds=.15;police.regroupSeconds=.15;police.damageRate=30;
police.state='approach';police.stateTime=0;
const gatedX=police.x;
interactions.fixedUpdate(.5);
assert.equal(police.x,gatedX,'Police pressure advanced before the historical director started it');
assert.equal(police.state,'approach');
controller.state.pressureStarted=true;
let guard=0;
while(!barricade.breached&&guard<120){
  interactions.fixedUpdate(.1);
  guard++;
}
assert(guard<120,'Police never threatened a breakthrough');
interactions.fixedUpdate(.1);assert(police.breakthrough,'Police do not push into the opened route');
assert.equal(barricade.breached,true);
assert(!nav.obstacleAt(180,90,2),'Breached barricade still blocks the synthetic street');
assert(controller.state.events.some(e=>e.type==='police-state'&&e.state==='halt'));
assert(controller.state.events.some(e=>e.type==='police-state'&&e.state==='dismantle'));
controller.reinforceBarricadeById('B',12);interactions.fixedUpdate(.1);
assert(!police.breakthrough,'Rebuild did not repel the breakthrough');
interactions.fixedUpdate(.2);
assert(controller.state.events.some(e=>e.type==='police-state'&&e.state==='regroup'));
assert(controller.state.events.some(e=>e.type==='police-state'&&e.state==='withdraw'));

const withdrawX=police.x;
interactions.fixedUpdate(.5);
assert(police.x>withdrawX,'Withdraw state did not move the formation toward its withdrawal point');

// A pressure wave can also be repelled without requiring a breach.
controller.reinforceBarricadeById('B',12);
assert.equal(barricade.breached,false);
police.state='dismantle';police.stateTime=0;police.damageRate=1;police.dismantleSeconds=.2;
const intactBefore=barricade.integrity;
interactions.fixedUpdate(.1);
assert.equal(police.state,'dismantle');
interactions.fixedUpdate(.11);
assert.equal(police.state,'regroup','Intact defence did not repel a bounded pressure wave');
assert.equal(barricade.breached,false);
assert(barricade.integrity<intactBefore&&barricade.integrity>0);
assert(controller.state.events.some(e=>e.type==='police-state'&&e.state==='regroup'&&e.reason==='repelled'));

// Render state exposes visible world objects but omits consumed materials.
const view=interactions.renderState();
assert.equal(view.barricades.length,1);
assert.equal(view.formations.length,1);
assert(view.civilians.some(p=>p.id==='resident-1'&&p.status==='exited'));
assert(!view.materials.some(m=>m.id==='timber-1'),'Consumed material remains in render state');
assert(view.materials.some(m=>m.id==='crates-1'&&!m.carriedBy),'Dropped material is missing from render state');
assert(view.conflict&&Array.isArray(view.conflict.projectiles)&&Array.isArray(view.conflict.charges),'Conflict render state is missing');

// ACTIVE FIGHTBACK: holding the barricade during police dismantling generates
// repeated improvised attacks and can force the formation into regroup.
const fightController=Cable.createController({mission});
fightController.attachNavigation(Navigation.create({
  worldWidth:fixture.worldWidth,worldHeight:fixture.worldHeight,
  buildings:fixture.buildings,mapKey:'cable-fightback-fixture',moveEntity,updateFacing
}));
const fight=Interactions.create({
  controller:fightController,runtime:Cable,mission,
  options:{scale:1,pressureControlled:true,fightPulseSeconds:.05,fightResistancePerPulse:55,crowdResistancePerPulse:0,repelResistance:100,mountedChargeFirstDelay:999}
});
fight.initialize({actors:[{id:'player-0',name:'Volunteer',x:160,y:90,active:true}],mapData:fixture.mapData});
const fightBarricade=fightController.state.barricades.get('B');
const fightPolice=fightController.state.formations.get('police-1');
fightController.state.pressureStarted=true;
fightPolice.state='dismantle';fightPolice.x=210;fightPolice.y=90;fightPolice.damageRate=.1;fightPolice.dismantleSeconds=99;
assert.equal(fight.hint('player-0'),'FIGHT BACK');
const fightJob=fight.assignAt('player-0',180,90);
assert(fightJob&&fightJob.action==='hold');
fight.fixedUpdate(.11);
assert.equal(fightPolice.state,'regroup','Player fightback did not repel the police line');
assert(fightController.state.events.some(e=>e.type==='street-resistance'&&e.source==='player-0'));
assert(fightController.state.events.some(e=>e.type==='crowd-fightback'&&e.formationId==='police-1'));
const fightView=fight.renderState();
assert(fightView.conflict.impacts.length>0||fightView.conflict.projectiles.length>0,'Fightback produced no visible street-conflict effect');
assert.equal(fightBarricade.breached,false);

// Contextual permissions remain historical: no firearms or grenades are enabled.
assert.deepEqual(mission.actionProfile.contextualActions,['reinforce','carry','assist','hold','drop']);
assert.equal(mission.actionProfile.firearms,false);
assert.equal(mission.actionProfile.grenades,false);

console.log('PASS: synthetic Cable Street slice completes carry, reinforce, drop, assist/rescue and hold jobs.');
console.log('PASS: active workers reduce police dismantling damage and active fightback can physically repel a police push.');
console.log('PASS: conflict render state exposes improvised missiles, impacts and mounted-charge state without enabling firearms.');
