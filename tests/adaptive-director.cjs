'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const Adaptive=require('../adaptive-director.js'),Navigation=require('../navigation.js');
const Cable=require('../cable-street-runtime.js'),Historical=require('../historical-missions.js');
const Interactions=require('../cable-street-interactions.js'),Director=require('../cable-street-director.js'),Crowd=require('../cable-street-crowd.js');
const load=(files,name)=>new Function(files.map(f=>fs.readFileSync(f,'utf8')).join('\n')+';return '+name)();
const seeded=seed=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
function basic(overrides={}){
 const executed=[];let released=0;
 const adapter={sample:()=>({position:{x:100,y:100},scale:1,strength:1,enemies:12,pressure:.2,phase:0,progress:0,route:'main',objectiveFocus:.5}),
 valid:()=>true,execute:(a,s,t)=>{executed.push({a,t});return true},release:()=>released++,...overrides};
 const d=Adaptive.create({mission:'bad-belzig',adapter,random:seeded(2),debug:true});
 return{d,adapter,executed,get released(){return released}};
}
const b=basic();
for(let i=0;i<40000;i++)b.d.update(.25);
assert(b.executed.length>100&&b.executed.length<1500,'Strategic evaluation should remain infrequent');
for(let i=1;i<b.executed.length;i++)assert(b.executed[i].t-b.executed[i-1].t>=5);
for(const action of Adaptive.MILITARY){const times=b.executed.filter(e=>e.a===action).map(e=>e.t);for(let i=1;i<times.length;i++)assert(times[i]-times[i-1]>= (action==='DO_NOTHING'?5:18))}
assert(b.d.state.tension>=0&&b.d.state.tension<=100);assert(b.d.state.history.length<=6);assert(b.d.state.log.length<=32);
assert.equal(b.d.state.situation,'repeating');
for(const k of ['aggression','caution','mobility','grenadeUse','retreatFrequency','casualtyRate','objectiveFocus'])assert(b.d.memory[k]>=0&&b.d.memory[k]<=1);
assert(b.d.memory.routes.length<=8&&b.d.memory.routes.every(r=>r.weight<=12));
const choices=[{action:'PRESSURE',valid:true,score:100},{action:'FLANK_LEFT',valid:true,score:100},{action:'INVALID',valid:false,score:10000}];
const r=seeded(1),distribution=Array.from({length:1000},()=>Adaptive.choose(choices,['PRESSURE','PRESSURE'],r).action);
assert(distribution.filter(a=>a==='FLANK_LEFT').length>850,'Repeated frontal pressure needs a strong utility penalty');
assert(distribution.includes('PRESSURE'),'Repetition must be possible when tactically justified');assert(!distribution.includes('INVALID'));
assert.equal(Adaptive.choose([],[],r),null);
const bounded=Adaptive.profile({aggression:100,routes:Array.from({length:100},()=>({key:'x'.repeat(500),weight:1000}))});
assert.equal(bounded.aggression,1);assert.equal(bounded.routes.length,8);assert(bounded.routes.every(r=>r.key.length<=48&&r.weight===12));
assert.equal(Adaptive.loadProfile({getItem:()=>{throw Error('blocked')}}).routes.length,0);
let routeIndex=0;const varied=basic({sample:()=>({position:{x:routeIndex*100,y:0},scale:1,strength:1,enemies:2,phase:0,progress:0,route:String(routeIndex++)})});
for(let i=0;i<200;i++)varied.d.update(.25);assert.equal(varied.d.memory.routes.length,8);
const struggling=basic({sample:()=>({position:{x:0,y:0},strength:.2,enemies:8,pressure:1,phase:0,progress:0})});struggling.d.update(.1);
assert.equal(struggling.d.state.situation,'struggling');
const weights=struggling.d.scores({struggling:true,excessive:true});
assert.equal(weights.find(c=>c.action==='MAJOR_PUSH').score,0);assert(weights.find(c=>c.action==='REGROUP').score>0);
for(const hook of ['sample','valid','execute','maintain']){
 const f=basic({[hook]:()=>{throw Error('injected '+hook)}});for(let i=0;i<50;i++)assert.doesNotThrow(()=>f.d.update(.25));
 assert(f.d.state.disabled,hook+' failure was not isolated');assert.equal(f.released,1);
}
const html=fs.readFileSync('index.html','utf8');
const safe=html.slice(html.indexOf('  function runAdaptive('),html.indexOf('  function initializeAdaptiveDirector('));
const simulate=html.slice(html.indexOf('  function simulateStep('),html.indexOf('  function handleRuntimeFault('));
let simulationSteps=0;const scope={tacticsRuntime:null,commands:{mode:'local'},window:{BadFodderHealth:require('../character-health')},menuOpen:false,paused:false,mapOpen:false,adaptiveDirector:basic({sample:()=>{throw Error('Director fault')}}).d,
 applyTouchMovement:()=>simulationSteps++,keyboardFireHeld:false,actionAllowed:()=>false,squad:[],
 missionController:null,missionInteractionLayer:null,missionDirector:null,missionCrowd:null,
 processEnemyPathQueue:()=>{},updateSquad:()=>{},updateEnemies:()=>{},updateCivilians:()=>{},updateProjectiles:()=>{},updateCamera:()=>{},checkFailure:()=>{},updateMissionProgress:()=>{},updateHud:()=>{},
 art:{animate:()=>{}},enemies:[],civilians:[]};
vm.createContext(scope);vm.runInContext(safe+simulate,scope);
for(let i=0;i<600;i++)vm.runInContext('simulateStep(1/60)',scope);
assert.equal(simulationSteps,600,'Actual simulation must continue after a Director exception');
assert(scope.adaptiveDirector.state.disabled);
scope.adaptiveDirector.update=()=>{throw Error('update itself failed')};scope.adaptiveDirector.state.disabled=false;
assert.doesNotThrow(()=>vm.runInContext('simulateStep(1/60)',scope));assert.equal(simulationSteps,601);
assert(!fs.readFileSync('adaptive-director.js','utf8').match(/fetch\(|XMLHttpRequest|WebSocket/));

function military(map){
 const buildings=map.buildings.map(b=>{const points=b.points.map(p=>p.map(v=>v*2)),xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);return{...b,points,minX:Math.min(...xs),maxX:Math.max(...xs),minY:Math.min(...ys),maxY:Math.max(...ys)}});
 const nav=Navigation.create({worldWidth:map.width*2,worldHeight:map.height*2,buildings,mapKey:map.key,
   moveEntity:(e,dx,dy)=>{e.x+=dx;e.y+=dy},updateFacing:(e,dx,dy)=>e.dir=Math.atan2(dy,dx)});
 const zones=map.zones?Object.fromEntries(Object.entries(map.zones).map(([k,z])=>[k,{x:z.x*2,y:z.y*2}])):
 Object.fromEntries([['post','postcolumn'],['castle','castle'],['market','market']].map(([k,p])=>[k,{x:map.pois[p].x*2,y:map.pois[p].y*2}]));
 const enemies=map.spawns.enemies.map(([x,y],i)=>({x:x*2,y:y*2,homeX:x*2,homeY:y*2,alive:true,hp:3,maxHp:3,groupId:map.key==='wigan'?Object.values(zones).reduce((best,z,j)=>Math.hypot(x*2-z.x,y*2-z.y)<best.d?{i:j,d:Math.hypot(x*2-z.x,y*2-z.y)}:best,{i:0,d:Infinity}).i:Math.floor(i/3)}));
 const squad=map.spawns.squad.map(([x,y])=>({x:x*2,y:y*2,alive:true,hp:8,maxHp:8}));
 const queue=[];
 const commander=Adaptive.createCommander({getEnemies:()=>enemies,getSquad:()=>squad,getZones:()=>zones,getPhase:()=>({zone:map.key==='wigan'?'tudor':'post',index:0}),
 roads:map.roads.map(r=>({...r,points:r.points.map(p=>p.map(v=>v*2))})),scale:2,navigation:nav,blocked:nav.obstacleAt,queuePath:(e,x,y)=>{queue.push({e,x,y});e.pathQueued=true}});
 commander.maintain(10);assert.equal(commander.knowledge(),null);assert(!commander.valid('PRESSURE'),'Hidden player must not be attacked by magical knowledge');
 const target={x:enemies[0].x,y:enemies[0].y};enemies[0].lastSeen=target;enemies[0].observedAt=10;
 const snapshot=commander.sample(10);assert.equal(commander.knowledge(),target);
 const count=enemies.length;let flanks=0;
 for(const action of ['PROBE','PRESSURE','FLANK_LEFT','FLANK_RIGHT','REINFORCE','DEFEND_OBJECTIVE','REGROUP','RETREAT','PATROL']){
   commander.release();queue.length=0;
   if(!commander.valid(action,snapshot,10))continue;
   if(!commander.execute(action,snapshot,10))continue;
   assert(queue.length>0,action+' did not use existing path queue on '+map.key);
   if(action.startsWith('FLANK'))flanks++;
   for(const q of queue){assert(!nav.obstacleAt(q.x,q.y,14));assert(nav.findPath(q.e.x,q.e.y,q.x,q.y),map.key+' '+action+' ordered an unreachable street')}
 }
 assert(flanks>0,map.key+' has no playable flank');assert.equal(enemies.length,count);assert(enemies.every(e=>e.hp===3&&e.maxHp===3));
 commander.execute('REGROUP',snapshot,10);const e=enemies.find(e=>e.commandOrder);
 assert.equal(commander.control(e,.1,()=>true).canFire,false,'Withdrawal must reduce simultaneous pressure');
 // Execute the real browser enemy loop against production navigation and live orders.
 const updateEnemies=html.slice(html.indexOf('  function updateEnemies('),html.indexOf('  function updateCivilians('));
 const unitScope={enemies:enemies.filter(e=>e.commandOrder),squad,adaptiveDirector:{state:{time:10}},enemyCommander:commander,
   S:n=>n*2,noise:[],lineBlocked:()=>false,prepareEnemyReaction:()=>{},alertNearbyEnemies:()=>{},
   nearestLivingSquad:enemy=>({unit:{...target,x:target.x+12},d:50}),
   runAdaptive:fn=>fn(),followPath:(e,speed,dt)=>nav.followPath(e,speed,dt),
   queueEnemyPath:(e,x,y)=>nav.assignPath(e,x,y),
   chooseRetreatPoint:()=>{throw Error('Local AI overwrote Commander retreat')},chooseEnemyTacticalPoint:()=>{throw Error('Local AI overwrote Commander route')},
   updateFacing:()=>{},moveEntity:()=>{},unit:()=>.5,fireBullet:()=>{throw Error('Withdrawing group fired instead of regrouping')}};
 for(const e of unitScope.enemies){e.pathQueued=false;e.cooldown=0;e.burstCount=0;e.burstLimit=3;e.repath=0;nav.assignPath(e,e.commandOrder.point.x,e.commandOrder.point.y)}
 const positions=unitScope.enemies.map(e=>({x:e.x,y:e.y}));
 vm.createContext(unitScope);vm.runInContext(updateEnemies,unitScope);for(let i=0;i<60;i++)vm.runInContext('updateEnemies(1/60)',unitScope);
 assert(unitScope.enemies.some((e,i)=>Math.hypot(e.x-positions[i].x,e.y-positions[i].y)>1),map.key+' real enemy loop did not execute withdrawal');
 commander.maintain(23);assert(enemies.every(e=>!e.commandOrder),'Orders must expire');
 commander.maintain(35);assert.equal(commander.knowledge(),null,'Observation must expire');
 const d=Adaptive.create({mission:map.key,adapter:commander,random:seeded(4),debug:true});for(let i=0;i<100;i++)d.update(.25);
 assert(!d.state.disabled);assert(d.state.decisions>0);
}
military(load(['town-map.js','bad-belzig-data.js'],'TOWN_MAP'));
military(load(['wigan-map.js'],'WIGAN_MAP'));

const map=load(['cable-street-map.js'],'CABLE_STREET_MAP'),mission=Historical.get('cable-street-1936');
const controller=Cable.createController({mission}),nav=require('../tools/cable-street/verify-release.cjs').createNavigation(map);
controller.attachNavigation(nav);
const layer=Interactions.create({controller,runtime:Cable,mission,options:{pressureControlled:true,navigation:nav}});
layer.initialize({mapData:map,actors:map.spawns.squad.map(([x,y],i)=>({id:'player-'+i,x,y,active:true}))});
const director=Director.create({controller,mission}),crowd=Crowd.create({controller,mission,worldWidth:map.width,worldHeight:map.height,navigation:nav,blocked:nav.obstacleAt});
const adapter=Adaptive.createCableAdapter({controller,director,interactions:layer,crowd});
const cable=Adaptive.create({mission:'cable-street',adapter,random:seeded(12),debug:true});
assert(!adapter.valid('PRESSURE_SIDE',adapter.sample()));assert.equal(map.spawns.enemies.length,0);
director.enterPhase(3);const snapshot=adapter.sample();
assert(adapter.valid('SWITCH_PRESSURE',snapshot));assert(adapter.execute('SWITCH_PRESSURE',snapshot,1));
assert.equal([...controller.state.formations.values()].find(f=>f.objective!=='S').state,'regroup');
assert.equal(controller.state.formations.get('police-side').state,'approach');
assert(adapter.execute('RECOVERY_WINDOW',snapshot,2));
assert([...controller.state.formations.values()].every(f=>['regroup','withdraw'].includes(f.state)));
for(let i=0;i<140;i++){layer.fixedUpdate(.05);director.fixedUpdate(.05)}
assert([...controller.state.formations.values()].every(f=>f.state==='withdraw'),'Repeated pressure restarted during recovery');
const consumed=[...controller.state.materials.values()][0];consumed.consumed=true;consumed.remainingValue=0;
assert(adapter.execute('MATERIAL_OPPORTUNITY',snapshot,10));assert(!consumed.consumed&&consumed.remainingValue>0);assert.equal(consumed.x,consumed.originX);
const people=crowd.people.length;assert(adapter.execute('CROWD_EVENT',snapshot,10));assert(crowd.people.some(p=>p.activityTarget?.id.startsWith('adaptive-rally')));assert.equal(crowd.people.length,people);
for(let i=0;i<200;i++){cable.update(.05);layer.fixedUpdate(.05);director.fixedUpdate(.05);crowd.fixedUpdate(.05)}
assert(!cable.state.disabled);assert(cable.state.decisions>0);assert(cable.state.history.every(a=>Adaptive.CABLE.includes(a)));
assert.equal(map.spawns.enemies.length,0);assert.equal(controller.state.formations.size,2);
const hpBefore=[...controller.state.formations.values()].map(f=>f.damageRate);
adapter.execute('PRESSURE_SIDE',adapter.sample(),20);
assert.deepEqual([...controller.state.formations.values()].map(f=>f.damageRate),hpBefore,'Adaptive tactics must not increase police damage');
adapter.release();assert([...controller.state.formations.values()].every(f=>!f.adaptiveRepeatAfter));
console.log('PASS: bounded utility decisions, cooldowns, repetition, tension/profile, real Belzig/Wigan routes/orders, historical adaptive pressure/events, and Director faults cannot stop the actual simulation.');
