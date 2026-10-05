'use strict';
const assert=require('node:assert/strict'),B=require('../building-runtime'),P=require('../multiplayer-protocol');
const units=Array.from({length:4},()=>({x:0,y:0,hp:8,maxHp:8,alive:true,dir:0,state:'idle'})),events=[];
let reachable=true,allowSabotage=false;
const runtime=B.create({sites:[{id:'shelter',door:{x:0,y:0},center:{x:70,y:0},cache:true,resident:'resident',target:'radio',actions:B.ACTIONS}],getSquad:()=>units,canReach:()=>reachable,
 release:u=>u.manualGarrison=false,onAction:(action)=>{events.push(action);return action!=='SABOTAGE'||allowSabotage}});
const u=units[0];reachable=false;assert.equal(runtime.nearest(u),null);assert(!runtime.perform(u,'ENTER',runtime.sites[0]));reachable=true;
u.path=[{x:50,y:50}];assert(runtime.perform(u));assert.equal(u.insideBuilding,'shelter');assert.equal(u.x,70);assert.equal(u.path,null);assert(runtime.occupied(runtime.sites[0]));
assert.equal(runtime.nextAction(u),'SEARCH');assert(!runtime.perform(u,'COLLECT'));assert(runtime.perform(u));assert.equal(runtime.nextAction(u),'COLLECT');assert(runtime.perform(u));assert(!runtime.perform(u,'COLLECT'),'Supplies cannot be duplicated');
assert.equal(runtime.nextAction(u),'RESCUE');assert(runtime.perform(u));assert.equal(runtime.nextAction(u),'SABOTAGE');assert(!runtime.perform(u));assert(!runtime.sites[0].sabotaged);allowSabotage=true;assert(runtime.perform(u));assert.equal(runtime.nextAction(u),'EXIT');
const saved=runtime.snapshot();const copy=B.create({sites:runtime.sites,getSquad:()=>units});copy.receive(saved);assert.deepEqual(copy.snapshot(),saved);
assert(runtime.perform(u,'GARRISON'));assert.equal(u.insideBuilding,null);assert.equal(u.x,0);assert(u.manualGarrison);assert(!runtime.occupied(runtime.sites[0]));
assert(runtime.perform(u,'ENTER'));assert(!u.manualGarrison);assert(runtime.perform(u,'DEFEND'));assert(u.manualGarrison);
assert(runtime.perform(u,'ENTER'));assert(runtime.perform(u,'INTERACT'));assert(runtime.exit(u));
u.downed=true;assert(!runtime.perform(u,'ENTER'));u.downed=false;
assert.throws(()=>B.create({sites:[runtime.sites[0],runtime.sites[0]]}),/Duplicate/);
const packet=P.snapshot({squad:units,enemies:[],civilians:[],pickups:[],bullets:[],thrown:[],effects:[],missionStage:0,phaseHoldTime:0,squadGrenades:5,finished:false,win:false,checkpoint:null,stats:units.map((u,index)=>({index,name:'Local',kills:0,alive:true})),buildingState:runtime.snapshot()},1);
assert.deepEqual(P.readSnapshot(packet).buildingState,runtime.snapshot());assert(!P.readSnapshot({...packet,buildingState:{...packet.buildingState,units:['unknown',null,null,null]}}));
console.log('PASS: reachable entrances, in-world occupancy, search/collect/rescue/sabotage chains, contextual exit, defensive holds and validated co-op building state.');
