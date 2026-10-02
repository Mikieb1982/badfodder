'use strict';

const assert=require('node:assert/strict');
const Historical=require('../historical-missions.js');
const Cable=require('../cable-street-runtime.js');
const Crowd=require('../cable-street-crowd.js');

const mission=Historical.get('cable-street-1936');

function makeController(){
  const controller=Cable.createController({mission});
  const barricade=Cable.createBarricade({id:'B',maxIntegrity:30,integrity:20,workPositions:2});
  Object.assign(barricade,{x:200,y:100,interactionRadius:40,points:[[190,90],[210,90],[210,110],[190,110]]});
  const formation=Cable.createPoliceFormation({id:'police-1',width:30,objective:'B',state:'approach'});
  Object.assign(formation,{x:80,y:100,targetX:170,targetY:100,withdrawX:45,withdrawY:100,stopDistance:8});
  controller.initialize({actors:[{id:'player-0',x:180,y:100,active:true}],barricades:[barricade],formations:[formation]});
  return controller;
}

const aController=makeController();
const crowd=Crowd.create({
  mission,
  controller:aController,
  worldWidth:400,
  worldHeight:220,
  seed:'fixture-seed',
  blocked:()=>false
});

assert.equal(crowd.people.length,32);
assert.equal(crowd.people.filter(p=>p.role==='resident').length,24);
assert.equal(crowd.people.filter(p=>p.role==='helper').length,8);
assert.deepEqual(crowd.anchor(),{x:200,y:100});
assert(crowd.people.every(p=>p.x>=18&&p.x<=382&&p.y>=18&&p.y<=202));

const bController=makeController();
const crowd2=Crowd.create({
  mission,
  controller:bController,
  worldWidth:400,
  worldHeight:220,
  seed:'fixture-seed',
  blocked:()=>false
});
assert.deepEqual(
  crowd.people.map(p=>[p.id,+p.x.toFixed(4),+p.y.toFixed(4)]),
  crowd2.people.map(p=>[p.id,+p.x.toFixed(4),+p.y.toFixed(4)]),
  'Same mission seed should produce stable crowd placement'
);

const before=crowd.renderState();
assert(crowd.fixedUpdate(.5));
const after=crowd.renderState();
assert(after.some((p,i)=>Math.hypot(p.x-before[i].x,p.y-before[i].y)>.01),'Crowd did not react to live pressure');
assert.deepEqual(before.map(p=>p.id),after.map(p=>p.id),'Crowd update changed stable IDs');
assert(after.every(p=>typeof p.animState==='string'),'Crowd render state is missing animation states');
assert(after.every(p=>Number.isFinite(p.animPhase)),'Crowd render state is missing animation phase data');

const supportBarricade=aController.state.barricades.get('B');
const supportFormation=aController.state.formations.get('police-1');
aController.state.confidence=.85;
supportFormation.state='dismantle';
crowd.fixedUpdate(.1);
const helperOwners=supportBarricade.occupiedWorkPositions.filter(owner=>typeof owner==='string'&&owner.startsWith('ambient-helper-'));
assert.equal(helperOwners.length,1,'Helpers should use support capacity while keeping one player work position open');
assert(supportBarricade.occupiedWorkPositions.includes(null),'Ambient helpers blocked every player work position');

supportFormation.state='withdraw';
crowd.fixedUpdate(.1);
assert(!supportBarricade.occupiedWorkPositions.some(owner=>typeof owner==='string'&&owner.startsWith('ambient-helper-')),'Helpers did not release work positions after pressure ended');

aController.state.confidence=.1;
for(let i=0;i<10;i++)crowd.fixedUpdate(.1);
const lowConfidence=crowd.renderState();
assert(lowConfidence.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)));
assert(lowConfidence.every(p=>p.x>=18&&p.x<=382&&p.y>=18&&p.y<=202));

const blockedCrowd=Crowd.create({
  mission,
  controller:makeController(),
  worldWidth:400,
  worldHeight:220,
  seed:'blocked-fixture',
  blocked:(x,y)=>x<180
});
assert(blockedCrowd.people.every(p=>p.x>=180||Math.abs(p.x-200)<1e-6),'Crowd spawned into blocked test space');

console.log('PASS: Cable Street crowd creates the configured 24 reactive residents and 8 close-support helpers from barricade geometry.');
console.log('PASS: crowd placement is deterministic, stays inside runtime bounds and reacts to police pressure/confidence without hardcoded map coordinates.');
console.log('PASS: high-confidence helpers temporarily occupy limited barricade support slots during dismantling pressure while preserving a player work position.');
