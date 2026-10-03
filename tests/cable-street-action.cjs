'use strict';
const assert=require('node:assert/strict');
const Historical=require('../historical-missions.js'),Cable=require('../cable-street-runtime.js');
const Interactions=require('../cable-street-interactions.js'),Director=require('../cable-street-director.js');
const mission=Historical.get('cable-street-1936');
function fixture(){
 const controller=Cable.createController({mission});
 const map={historicalObjects:{barricades:[{id:'B',x:100,y:100,maxIntegrity:100,integrity:52,workPositions:4,workPoints:[{x:115,y:100}],interactionRadius:50}],materials:[{id:'one',type:'timber',x:130,y:100,interactionRadius:30},{id:'two',type:'timber',x:135,y:100,interactionRadius:30}],civilians:[{id:'resident',x:120,y:120}],formations:[{id:'police-1',x:140,y:100,targetX:130,targetY:100,withdrawX:240,withdrawY:100,width:24,objective:'B',speed:30,stopDistance:4,damageRate:7}]}};
 const layer=Interactions.create({controller,runtime:Cable,mission,options:{pressureControlled:true}});
 layer.initialize({mapData:map,actors:[{id:'player-0',x:120,y:100,active:true},{id:'player-1',x:120,y:102,active:true}]});
 const director=Director.create({controller,mission});
 function step(seconds){for(let t=0;t<seconds;t+=.05){layer.fixedUpdate(.05);director.fixedUpdate(.05)}}
 return {controller,layer,director,step};
}
const f=fixture();
assert.equal(f.director.snapshot().buildSecondsLeft,18);
f.step(17);assert.equal(f.director.snapshot().phaseId,'gathering');
f.step(1.1);assert.equal(f.director.snapshot().phaseId,'hold-approach');assert(f.director.snapshot().buildMissed);assert(f.controller.state.pressureStarted,'Idle player must face police pressure');
const fast=fixture();
for(const id of ['one','two']){
 fast.layer.assignJob('player-0',{action:'carry',targetType:'material',targetId:id});fast.step(.1);
 fast.layer.assignJob('player-0',{action:'reinforce',targetType:'barricade',targetId:'B'});fast.step(.8);
}
assert.equal(fast.director.snapshot().phaseId,'hold-approach');assert(!fast.director.snapshot().buildMissed);
const officer=fast.controller.state.formations.get('police-1');officer.state='dismantle';officer.x=140;
const actor=fast.controller.state.actors.get('player-0');actor.stamina=100;
assert(fast.layer.streetAttack(actor.id,{kind:'shove'}));assert(officer.resistance>=20);assert(actor.stamina<100);assert(!fast.layer.streetAttack(actor.id,{kind:'shove'}),'Cooldown prevents input spam');
fast.step(.6);officer.state='dismantle';officer.resistance=0;actor.stamina=100;
assert(fast.layer.streetAttack(actor.id,{kind:'throw'}));assert.equal(officer.resistance,0,'Debris must land before resistance is applied');fast.step(.3);assert(officer.resistance>=24,'Landed debris has no gameplay effect');
actor.stamina=0;assert(!fast.layer.streetAttack(actor.id,{kind:'shove'}));fast.layer.cancelJob(actor.id);fast.step(1);assert(actor.stamina>10,'Rest must restore stamina');
// A parked fighter tires. Taking another volunteer into action remains possible.
actor.stamina=8;officer.state='dismantle';officer.resistance=0;
fast.layer.assignJob(actor.id,{action:'hold',targetType:'barricade',targetId:'B'});fast.step(.6);assert(actor.stamina<5);
assert(fast.layer.streetAttack('player-1',{kind:'shove'}),'Rested volunteer cannot rotate into the fight');
const rescue=fixture();const b=rescue.controller.state.barricades.get('B');assert(rescue.layer.assignJob('player-0',{action:'assist',targetType:'civilian',targetId:'resident'}));rescue.step(2.2);assert.equal(rescue.controller.state.civilians.get('resident').status,'exited');assert.equal(b.integrity,60,'Optional rescue must repair defence');
const pressure=fixture();pressure.director.enterPhase(3);pressure.step(6.1);assert(pressure.layer.renderState().conflict.charges.some(c=>c.warning>0),'Mounted charge must warn before moving');
assert.equal(mission.phases[3].proposedHoldSeconds,90);assert.equal(mission.actionProfile.firearms,false);assert.equal(mission.actionProfile.grenades,false);
console.log('PASS: build deadline/early start, impact-time debris, shove cooldown, fatigue/rotation, rescue repairs and mounted-charge warning.');
