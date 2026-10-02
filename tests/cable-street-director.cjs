'use strict';

const assert=require('node:assert/strict');
const Historical=require('../historical-missions.js');
const Cable=require('../cable-street-runtime.js');
const Director=require('../cable-street-director.js');

const mission=Historical.get('cable-street-1936');
const controller=Cable.createController({mission});
const barricade=Cable.createBarricade({
  id:'B',maxIntegrity:30,integrity:20,constructionTier:1,workPositions:2
});
Object.assign(barricade,{
  x:180,y:90,interactionRadius:42,
  points:[[174,72],[186,72],[186,108],[174,108]]
});
const formation=Cable.createPoliceFormation({
  id:'police-1',width:30,objective:'B',state:'approach'
});
Object.assign(formation,{
  x:300,y:90,targetX:210,targetY:90,
  withdrawX:330,withdrawY:90,
  stopDistance:8,stateTime:0
});
controller.initialize({
  actors:[{id:'player-0',x:155,y:90,active:true}],
  barricades:[barricade],
  formations:[formation]
});

const director=Director.create({
  controller,mission,
  options:{
    mainBarricadeId:'B',
    regroupStableSeconds:.2,
    finalHoldSeconds:.5,
    repeatPressureDelay:.1
  }
});

let snap=director.snapshot();
assert.equal(snap.phaseId,'gathering');
assert.equal(snap.completed,false);
assert.equal(snap.barricadeIntegrity,20);
assert.equal(snap.barricadeMaxIntegrity,30);
assert(Math.abs(snap.barricadeRatio-(2/3))<1e-9);
assert.equal(typeof snap.instruction,'string');
assert(snap.instruction.length>10,'Cable Street snapshot must explain the next player action');
assert(snap.guidance&&Number.isFinite(snap.guidance.x)&&Number.isFinite(snap.guidance.y),'Cable Street snapshot must expose an in-world guidance target');


// Gathering does not advance just because the player reaches the defence.
director.fixedUpdate(.01);
assert.equal(director.snapshot().phaseId,'gathering');

// Material delivery + rescue make the gathering ready, but the player must
// deliberately take position with a HOLD action after those jobs are done.
controller.state.events.push({type:'barricade-reinforced',barricadeId:'B',amount:8});
controller.state.events.push({type:'civilian-exited',civilianId:'resident-1'});
director.fixedUpdate(.01);
snap=director.snapshot();
assert.equal(snap.materialDeliveries,1);
assert.equal(snap.rescues,1);
assert.equal(snap.phaseId,'gathering');
assert.match(snap.status,/HOLD/i);

controller.state.events.push({type:'barricade-held',barricadeId:'B',actorId:'player-0'});
director.fixedUpdate(.01);
assert.equal(director.snapshot().phaseId,'hold-approach');
assert.equal(controller.state.pressureStarted,true);
assert.equal(formation.state,'approach');

// One completed pressure cycle moves the mission into regroup.
formation.state='regroup';
controller.state.events.push({type:'police-state',formationId:'police-1',state:'regroup'});
director.fixedUpdate(.01);
assert.equal(director.snapshot().phaseId,'regroup');

// Regroup only progresses while the barricade is intact and police are withdrawing.
formation.state='withdraw';
director.fixedUpdate(.1);
assert.equal(director.snapshot().phaseId,'regroup');
director.fixedUpdate(.1);
assert.equal(director.snapshot().phaseId,'they-shall-not-pass');
assert.equal(formation.state,'approach','Final phase should launch renewed pressure');

// A breach pauses the final hold timer rather than awarding progress.
barricade.integrity=0;
barricade.breached=true;
director.fixedUpdate(.2);
assert.equal(director.snapshot().finalHoldSeconds,0);

// Rebuilding resumes the timer.
barricade.integrity=10;
barricade.breached=false;
director.fixedUpdate(.25);
assert.equal(director.snapshot().completed,false);

// Withdrawn formations recycle into another pressure wave after the cooldown.
formation.state='withdraw';
formation.x=formation.withdrawX;
formation.y=formation.withdrawY;
director.fixedUpdate(.05);
assert.equal(formation.state,'withdraw');
director.fixedUpdate(.05);
assert.equal(formation.state,'approach');
assert(controller.state.events.some(e=>e.type==='pressure-wave-repeat'&&e.formationId==='police-1'));

director.fixedUpdate(.25);
snap=director.snapshot();
assert.equal(snap.completed,true);
assert.equal(snap.finalHoldSeconds,.5);
assert(controller.state.events.some(e=>e.type==='mission-complete'&&e.missionId==='cable-street-1936'));
assert(snap.confidence>0&&snap.confidence<=1);

console.log('PASS: Cable Street director advances gathering, first pressure, regroup and final hold without military phase rules.');
console.log('PASS: gathering requires deliberate HOLD after material/rescue tasks, regroup requires a stable intact defence and the final timer pauses on breach.');
console.log('PASS: final pressure formations recycle after withdrawal and mission completion is emitted only after the configured hold duration.');
