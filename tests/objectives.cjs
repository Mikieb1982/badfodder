'use strict';
const assert=require('node:assert/strict');
const MissionRules=require('../mission-rules.js');
const required=['REACH','CLEAR','HOLD','CAPTURE','FIND','SEARCH','RESCUE','ESCORT','EVACUATE','GARRISON','INTERACT','SABOTAGE','DESTROY','DEFEND','ESCAPE','SURVIVE','OPTIONAL'];
for(const type of required)assert(MissionRules.OBJECTIVE_TYPES.includes(type));
assert.equal(MissionRules.normalizeType('secure-zone'),'CAPTURE');
assert.equal(MissionRules.normalizeType('protect'),'DEFEND');
assert.throws(()=>MissionRules.normalizeType('collect-500-coins'),/Unsupported/);

const manager=MissionRules.createObjectiveManager([
  {id:'find-marcel',type:'FIND',title:'Find Marcel',text:'Search the café.',hidden:false,director:{mode:'SEARCH'}},
  {id:'rescue-marcel',type:'RESCUE',title:'Rescue Marcel',requires:'find-marcel',hidden:true,next:'escape'},
  {id:'escape',type:'ESCAPE',title:'Escape',requires:'rescue-marcel',marker:{kind:'zone',id:'station'}}
]);
assert.equal(manager.current().id,'find-marcel');
assert.equal(manager.visible().length,2);
manager.updateText('find-marcel','Search the workshop instead.');
assert.equal(manager.current().text,'Search the workshop instead.');
manager.complete('find-marcel');
assert.equal(manager.current().id,'rescue-marcel');
assert.equal(manager.get('rescue-marcel').discovered,true);
manager.complete('rescue-marcel');
assert.equal(manager.current().id,'escape');
assert.equal(manager.directorContext().objective.type,'ESCAPE');

manager.add({id:'free-prisoners',type:'RESCUE',title:'Free other prisoners',optional:true,priority:50},{beforeId:'escape',activate:true});
assert.equal(manager.current().id,'free-prisoners');
manager.fail('free-prisoners');
assert.equal(manager.missionState().failed,false);
manager.reprioritize('escape',80);
assert.equal(manager.current().id,'escape');
manager.replace('escape',{type:'ESCAPE',title:'Get to the station',text:'Get everyone to Wallgate.',marker:{kind:'zone',id:'wallgate'}});
assert.equal(manager.get('escape').status,'ACTIVE');
assert.equal(manager.get('escape').title,'Get to the station');
manager.complete('escape');
assert.equal(manager.missionState().complete,true);

const snapshot=manager.snapshot();
const restored=MissionRules.createObjectiveManager([],{autoActivate:false}).restore(snapshot);
assert.equal(restored.get('escape').status,'COMPLETED');
assert.equal(restored.get('free-prisoners').status,'FAILED');
assert.equal(restored.missionState().complete,true);

const critical=MissionRules.createObjectiveManager([{id:'hold',type:'HOLD',title:'Hold'}]);
critical.fail('hold');
assert.equal(critical.missionState().failed,true);
assert.throws(()=>critical.skip('hold'),/Only optional/);

const phase={type:'secure-zone',zone:'post',defenderGroup:'post',brief:'Secure post',hold:1};
const zones={post:{x:10,y:10,r:5}};
const enemies=[{x:10,y:10,alive:true,objectiveGroup:'post'}];
let result=MissionRules.evaluatePhase({phase,living:[{x:10,y:10}],enemies,zones});
assert.equal(result.ready,false);
enemies[0].alive=false;
result=MissionRules.evaluatePhase({phase,living:[{x:10,y:10}],enemies,zones});
assert.equal(result.ready,true);
let progress=MissionRules.advanceHold(phase,result,0,.5);assert.equal(progress.complete,false);
progress=MissionRules.advanceHold(phase,result,progress.holdTime,.5);assert.equal(progress.complete,true);
console.log('PASS: universal objective types, chaining, discovery, dynamic changes, optional failure, persistence and legacy phase rules.');
