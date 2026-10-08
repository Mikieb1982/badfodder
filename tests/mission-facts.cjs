'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const Facts=require('../mission-facts'),Objectives=require('../mission-objectives'),Protocol=require('../multiplayer-protocol');
const defaults={status:'SAFE',count:0,nested:{people:['one']}};
const facts=Facts.create(defaults);
assert.deepEqual(facts.snapshot(),defaults);
defaults.nested.people.push('two');assert.deepEqual(facts.get('nested'),{people:['one']});
const written={count:3};assert(facts.set('other',written));written.count=9;assert.equal(facts.get('other').count,3);assert.equal(facts.get('status'),'SAFE');
const read=facts.get('other');read.count=99;assert.equal(facts.get('other').count,3);
assert(facts.increment('count',2));assert(facts.increment('count',-1));assert.equal(facts.get('count'),1);
for(const amount of [NaN,Infinity,'2',null,{},Symbol('bad')])assert.equal(facts.increment('count',amount),false);
assert.equal(facts.increment('missing',1),false);assert.equal(facts.increment('status',1),false);
facts.set('large',Number.MAX_VALUE);assert.equal(facts.increment('large',Number.MAX_VALUE),false);
assert.equal(facts.get('count'),1);
assert(facts.transition('status','SAFE','WOUNDED'));assert.equal(facts.transition('status','SAFE','DEAD'),false);
assert.equal(facts.get('status'),'WOUNDED');
const saved=JSON.parse(JSON.stringify(facts.snapshot()));facts.set('status','DEAD');assert(facts.restore(saved));assert.deepEqual(facts.snapshot(),saved);
saved.other.count=99;assert.equal(facts.get('other').count,3);
const circular={};circular.self=circular;
const before=facts.snapshot();
for(const bad of [null,undefined,[],3,{bad:NaN},{bad:()=>{}},{bad:new Map()},{bad:1n},{bad:Array(1)},circular]){
 assert.equal(facts.restore(bad),false);assert.deepEqual(facts.snapshot(),before);
}
assert.equal(facts.set('bad',undefined),false);assert.equal(facts.set('bad',circular),false);
facts.set('__proto__',{polluted:true});assert.equal({}.polluted,undefined);assert.deepEqual(facts.get('__proto__'),{polluted:true});

const mission={factDefaults:{event:false,count:0},objectives:[{id:'event',type:'SEARCH'}]};
const runtime=Objectives.create(mission);
assert(!runtime.update(.1).complete);runtime.facts.set('event',true);assert(runtime.update(.1).complete);
runtime.facts.increment('count',2);
const checkpoint=JSON.parse(JSON.stringify(runtime.snapshot()));
runtime.facts.set('count',9);runtime.restore(checkpoint);assert.equal(runtime.facts.get('count'),2);
assert.deepEqual(runtime.snapshot(),checkpoint);
runtime.manager.setObjectives(mission.objectives);assert.deepEqual(runtime.facts.snapshot(),mission.factDefaults);
const another=Objectives.create(mission);runtime.facts.set('count',7);assert.equal(another.facts.get('count'),0);
const legacy={...checkpoint};delete legacy.facts;runtime.restore(legacy);assert.deepEqual(runtime.facts.snapshot(),mission.factDefaults);
runtime.restore({...checkpoint,facts:circular});assert.deepEqual(runtime.facts.snapshot(),mission.factDefaults);
const signals=Objectives.create(mission);signals.signal('event');signals.facts.set('event',null);assert(signals.update(.1).complete);
const context=Objectives.create(mission);assert(context.update(.1,{facts:{event:true}}).complete);

// The existing co-op serializer carries the same objective snapshot without a new format.
const actor={x:0,y:0,hp:8,maxHp:8,alive:true,dir:0,state:'idle'};
const packet=Protocol.snapshot({squad:Array(4).fill(actor),enemies:[],civilians:[],pickups:[],bullets:[],thrown:[],effects:[],missionStage:0,phaseHoldTime:0,squadGrenades:5,finished:false,win:false,checkpoint:null,
 stats:Array.from({length:4},(_,index)=>({index,name:'Local',kills:0,assists:0,alive:true})),objectives:checkpoint},1);
const received=Protocol.readSnapshot(JSON.parse(Protocol.encode(packet)));assert(received);
assert.deepEqual(Objectives.create(mission).restore(received.objectives).facts.snapshot(),checkpoint.facts);

// Every playable mission goes through this same runtime; new runs cannot inherit facts.
const scope={window:{BadFodderHistoricalMissions:require('../historical-missions')},localStorage:{getItem:()=>null,setItem(){}}};
vm.runInNewContext(fs.readFileSync(require.resolve('../campaign.js'),'utf8'),scope);
// VM fixtures cross a realm boundary; serialized campaign data matches runtime data.
scope.window.BadFodderCampaign.missions=JSON.parse(JSON.stringify(scope.window.BadFodderCampaign.missions));
const missions=scope.window.BadFodderCampaign.missions.filter(m=>m.playable);
assert.equal(missions.length,4);
for(const m of missions){
 const first=Objectives.create(m);first.facts.set('fixture','changed');
 const next=Objectives.create(m);assert.deepEqual(next.facts.snapshot(),m.factDefaults||{});
 first.manager.setObjectives(Objectives.definitions(m));assert.deepEqual(first.facts.snapshot(),m.factDefaults||{});
}
// Verify the real menu/restart controller preserves a resumable run, then replaces it on retry.
let current=Objectives.create(mission);current.facts.set('count',5);
const env={started:true,finished:false,runtimeSafeStop:false,squad:[{alive:true}],commands:{mode:'local'},
 lifecycle:{transition(){}},menu:{show(){},close(){}},releaseAllFireInputs(){},releaseInterruptedInput(){},syncTouchControlState(){},
 root:{focus(){}},diagnostics:{start(){}},activeMission:()=>mission,refreshCursorWorld(){},pauseBtn:{},
 resetGame(){current=Objectives.create(mission)}};
const controllerScope={window:{},performance:{now:()=>0}};
vm.runInNewContext(fs.readFileSync(require.resolve('../mission-controller.js'),'utf8'),controllerScope);
const controller=controllerScope.window.BadFodderMissionController.create(env);
controller.showTitle();controller.resumeMission();assert.equal(current.facts.get('count'),5);
controller.beginMission();assert.equal(current.facts.get('count'),0);
const html=fs.readFileSync(require.resolve('../index.html'),'utf8');
assert(html.indexOf('<script src="mission-facts.js">')<html.indexOf('<script src="mission-objectives.js">'));
assert(html.includes('missionObjectivesRuntime=window.BadFodderObjectives.create(mission)'));
const browser={window:{}};
for(const file of ['mission-rules.js','mission-facts.js','mission-objectives.js'])vm.runInNewContext(fs.readFileSync(require.resolve('../'+file),'utf8'),browser);
vm.runInNewContext("const r=window.BadFodderObjectives.create({factDefaults:{event:false},objectives:[{id:'event',type:'SEARCH'}]});r.facts.set('event',true);if(!r.update(.1).complete)throw new Error('Browser fact integration failed');",browser);
console.log('PASS: mission facts API, validation, objective evaluation, snapshots/co-op, four-mission isolation and menu/retry lifecycle.');
