'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const Runtime=require('../mission-objectives'),Rules=require('../mission-rules'),Protocol=require('../multiplayer-protocol');
const scope={window:{},localStorage:{getItem:()=>null,setItem(){}}};
vm.runInNewContext(fs.readFileSync(require.resolve('../campaign.js'),'utf8'),scope);
const source=fs.readFileSync(require.resolve('../index.html'),'utf8');
const update=source.slice(source.indexOf('  function updateMissionProgress(dt){'),source.indexOf('  let nextHudUpdate='));
for(const mission of scope.window.BadFodderCampaign.missions.filter(m=>m.playable)){
 const runtime=Runtime.create(mission),zones=Object.fromEntries(mission.phases.map((p,i)=>[p.zone,{x:i*1000,y:0,r:50}]));
 const squad=[{x:0,y:0,alive:true}],enemies=mission.phases.map((p,i)=>({x:i*1000,y:0,alive:true,objectiveGroup:p.defenderGroup}));
 let completed=false;
 const game={finished:false,win:false,missionObjectivesRuntime:runtime,squad,enemies,zones,S:x=>x,phaseHoldTime:0,missionStage:0,
  completeCurrentMission(){completed=true},announceNextPhase(){},updateHud(){},setStatus(){},showMissionResult(){},hudStage:{},wiganRouteCache:{}};
 vm.createContext(game);vm.runInContext(update,game);
 for(let i=0;i<mission.phases.length;i++){
  squad[0].x=i*1000;game.updateMissionProgress(.1);assert.equal(runtime.phase(),i,'Live defender blocks progression');
  enemies[i].alive=false;game.updateMissionProgress(.5);assert.equal(runtime.holdTime(),.5);
  const saved=runtime.snapshot();runtime.restore(saved);assert.equal(runtime.holdTime(),.5,'Partial hold survives restore');
  assert.equal(runtime.manager.current().legacyType,mission.phases[i].type,'Legacy rules survive restore');
  game.updateMissionProgress(mission.phases[i].hold);assert.equal(game.phaseHoldTime,0);
  if(i<mission.phases.length-1)assert.equal(game.missionStage,i+1);
 }
 assert(completed);assert(runtime.manager.missionState().complete);
}
const historical=require('../historical-missions').missions[0],street=Runtime.create(historical);
for(let i=1;i<historical.phases.length;i++){street.syncPhase(i);assert.equal(street.phase(),i);assert.equal(street.manager.all().filter(o=>o.status==='COMPLETED').length,i)}
street.syncPhase(3,{completed:true});assert(street.manager.missionState().complete);
const lost=Runtime.create(historical);lost.syncPhase(1,{failed:true});assert(lost.manager.missionState().failed);

const chain=Runtime.create({objectives:[
 {id:'clue',type:'SEARCH',hidden:true,next:'person'},
 {id:'person',type:'RESCUE',hidden:true,requires:'clue',next:'exit'},
 {id:'exit',type:'ESCAPE',requires:'person',marker:{kind:'zone',id:'safe'}}
]});
assert.equal(chain.manager.current().discovered,true);assert.equal(chain.marker(chain.manager.get('person')),null);
assert.equal(chain.signal('person'),false,'Cannot rescue before discovery/activation');
chain.signal('clue');chain.update(.1);assert.equal(chain.manager.current().id,'person');
chain.signal('person');chain.update(.1);assert.equal(chain.manager.current().id,'exit');
chain.manager.add({id:'prisoners',type:'RESCUE',optional:true,priority:20},{activate:true});
chain.signal('prisoners',{failed:true});chain.update(.1);assert(!chain.manager.missionState().failed);
chain.update(.1,{living:[{x:5,y:5}],zones:{safe:{x:5,y:5,r:10}}});assert(chain.manager.missionState().complete);
for(const type of ['FIND','SEARCH','RESCUE','ESCORT','EVACUATE','INTERACT','SABOTAGE','DESTROY','OPTIONAL']){
 const r=Runtime.create({objectives:[{id:'event',type}]});assert(!r.update(.1).complete);r.signal('event');assert.equal(r.manager.get('event').status,'ACTIVE');r.update(.1);assert.equal(r.manager.get('event').status,'COMPLETED');
}
const hold=Runtime.create({objectives:[{id:'hold',type:'HOLD',hold:2,marker:{kind:'zone',id:'safe'}}]});
const context={living:[{x:0,y:0}],enemies:[],zones:{safe:{x:0,y:0,r:10}}};
hold.update(1,context);hold.update(.1,{...context,enemies:[{x:0,y:0,alive:true}]});assert.equal(hold.holdTime(),0);
const before=hold.snapshot();assert.throws(()=>hold.restore({...before,holds:[['hold',9]]}),/Invalid/);assert.deepEqual(hold.snapshot(),before);
assert.throws(()=>Rules.createObjectiveManager([{id:'a',type:'FIND',requires:'b'},{id:'b',type:'FIND',requires:'a'}]),/Cyclic/);
assert.throws(()=>hold.manager.add({id:'invalid',type:'FIND',next:'missing'}),/Unknown/);assert.equal(hold.manager.get('invalid'),null);
assert.throws(()=>hold.manager.replace('hold',{requires:'missing'}),/Unknown/);assert.equal(hold.manager.current().id,'hold');
hold.manager.fail('hold');hold.manager.complete('hold');assert(hold.manager.missionState().failed,'Completion cannot revive failure');
assert.deepEqual(hold.snapshot().holds,[],'Terminal objectives must not leave unrestorable timers');
const removed=Runtime.create({objectives:[{id:'old',type:'FIND'},{id:'new',type:'FIND',requires:'old'}]});
removed.manager.remove('old');assert.equal(removed.manager.current().id,'new');
const actor={x:0,y:0,hp:8,maxHp:8,alive:true,dir:0,state:'idle'};
const state={squad:Array(4).fill(actor),enemies:[],civilians:[],pickups:[],bullets:[],thrown:[],effects:[],missionStage:2,phaseHoldTime:0,squadGrenades:5,finished:true,win:true,checkpoint:null,
 stats:Array.from({length:4},(_,index)=>({index,name:'Local',kills:0,assists:0,alive:true})),objectives:chain.snapshot()};
const packet=Protocol.snapshot(state,1),received=Protocol.readSnapshot(packet);assert(received);assert.deepEqual(received.objectives,state.objectives);
const client=Runtime.create({objectives:chain.manager.all()}).restore(received.objectives);assert(client.manager.missionState().complete);
assert.equal(Protocol.readSnapshot({...packet,objectives:{...state.objectives,holds:[['missing',1]]}}),null);
assert(Protocol.bytes(Protocol.encode(packet))<Protocol.SNAPSHOT_BYTES);
assert(source.includes('missionObjectivesRuntime.syncPhase(historicalProgress.phaseIndex,historicalProgress)'));
console.log('PASS: live Belzig/Wigan progression, Cable Street synchronisation, event objectives, hidden markers, interrupted holds, validated restore, dynamic graph safety and co-op objectives.');
