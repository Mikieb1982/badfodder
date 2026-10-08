'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {fresh,map,mission,missions}=require('./bad-belzig-opening.cjs'),Objectives=require('../mission-objectives'),Adaptive=require('../adaptive-director'),Fortification=require('../checkpoint-fortification'),Waves=require('../checkpoint-wave-config');
Fortification.patchAdaptive(Adaptive);Waves.apply({missions:[mission]});
const zone={x:map.pois.castle.x*2,y:map.pois.castle.y*2,r:164};
function burg(result){const f=fresh();f.runtime.sync({legacy:true});f.objectives.facts.set('post_route_status',result);f.objectives.manager.complete('phase-0');f.runtime.sync();return f}
function secure(f){f.enemies.forEach(e=>e.alive=false);Object.assign(f.squad[1],zone);f.objectives.update(3,{living:f.squad,enemies:f.enemies,zones:{castle:zone},scale:2});assert.equal(f.objectives.manager.current().id,'burg-command')}
const html=fs.readFileSync(require.resolve('../index.html'),'utf8');
function body(name){const start=html.indexOf('  function '+name+'('),brace=html.indexOf('{',start);let end=brace+1,depth=1;for(;depth;end++){if(html[end]==='{')depth++;if(html[end]==='}')depth--}return html.slice(start,end)}
for(const result of ['HELD','LOST']){
 const f=burg(result),before=f.objectives.facts.snapshot();
 assert.equal(f.objectives.manager.current().id,'phase-1');assert.equal(f.objectives.manager.current().title,'DISRUPT THE BURG POSITION');assert(f.objectives.manager.current().brief.includes('coordinating'));
 assert(!f.runtime.burgHint(f.squad[1]));assert(!f.runtime.interactBurg(f.squad[1]),'Discovery cannot bypass the fight');
 const point=f.runtime.commandPoint,route=f.nav.findPath(f.squad[1].x,f.squad[1].y,point.x,point.y);assert(route.length,'Existing Burg approach remains navigable');
 f.nav.assignPath(f.squad[1],point.x,point.y);for(let i=0;i<7000&&f.squad[1].path;i++)f.nav.followPath(f.squad[1],185,1/30);assert(Math.hypot(f.squad[1].x-point.x,f.squad[1].y-point.y)<=point.r,'Command point can actually be approached');
 secure(f);assert(f.runtime.burgHint(f.squad[1]));
 const ready=f.objectives.snapshot(),copy=burg(result);copy.objectives.restore(JSON.parse(JSON.stringify(ready)));copy.runtime.sync();assert.equal(copy.objectives.manager.current().id,'burg-command');assert.equal(copy.messages.length,0);
 f.squad[1].downed=true;assert(!f.runtime.interactBurg(f.squad[1]));f.squad[1].downed=false;f.squad[1].hp=1;
 f.squad[0].downed=true;f.squad[2].alive=false;
 let triggers=0;f.objectives.manager.onChange(e=>{if(e.action==='activate'&&e.objective.id==='act-three')triggers++});
 // Real E / ACTION integration chooses the eligible selected member at the command point.
 const env={badBelzigRuntime:f.runtime,barcelonaRuntime:null,buildingRuntime:null,civilianRuntime:f.civilians,coordinationSupport:null,started:true,menuOpen:false,paused:false,finished:false,mapOpen:false,coopCommand:()=>false,selectedUnits:()=>[f.squad[3],f.squad[1]],updateHud(){},setStatus(){}};
 vm.createContext(env);vm.runInContext(body('contextAction')+body('performCivilianAction'),env);
 assert.equal(env.contextAction(f.squad[1]).label,'SEARCH ORDERS');assert(env.performCivilianAction());
 assert.equal(triggers,1);assert(!f.runtime.interactBurg(f.squad[1]));assert.equal(triggers,1);
 assert.equal(f.objectives.manager.get('burg-command').status,'COMPLETED');assert.equal(f.objectives.manager.current().id,'act-three');assert.equal(f.objectives.phase(),2);
 const text=f.objectives.manager.current().text;assert(text.includes('St. Marien is threatened'));
 assert(result==='HELD'?text.includes('preserved Post route'):text.includes('direct route is already lost'));
 assert.equal(f.objectives.manager.get('phase-2').status,'PENDING','Later finale cannot activate before the crisis is implemented');
 assert.deepEqual(f.objectives.facts.snapshot(),before,'Burg adds no consequences or premature refuge outcomes');assert(!f.objectives.manager.missionState().failed);
 const restored=fresh();restored.objectives.restore(JSON.parse(JSON.stringify(f.objectives.snapshot())));restored.runtime.sync();restored.runtime.update(10);
 assert.equal(restored.objectives.manager.current().id,'act-three');assert.equal(restored.messages.length,0);assert(!restored.runtime.interactBurg(restored.squad[1]));assert.equal(restored.objectives.facts.get('post_route_status'),result);
}
// Every eligible identity can inspect; none is a mandatory named survivor.
for(let i=0;i<4;i++){const f=burg('LOST');secure(f);Object.assign(f.squad[i],zone);assert(f.runtime.interactBurg(f.squad[i]));assert.equal(f.objectives.facts.get('post_route_status'),'LOST')}
// Exercise the unchanged Burg checkpoint battle with its real finite waves and hold.
const battle=burg('HELD');Object.assign(battle.squad[0],zone);
const commander=Adaptive.createCommander({getEnemies:()=>battle.enemies,getSquad:()=>battle.squad,getPhase:()=>({...battle.objectives.manager.current(),index:battle.objectives.phase()??1}),getZones:()=>({castle:zone}),roads:map.roads.map(r=>({...r,points:r.points.map(p=>p.map(v=>v*2))})),scale:2,navigation:battle.nav,blocked:battle.nav.obstacleAt,queuePath:battle.nav.assignPath});
commander.maintain(0);assert(!commander.checkpointState().started);
battle.enemies.filter(e=>e.objectiveGroup==='castle').forEach(e=>e.alive=false);
for(let i=1;i<130&&battle.objectives.manager.current().id==='phase-1';i++){
 commander.maintain(i/10);
 if(i>10)battle.enemies.filter(e=>e.checkpointWave).forEach(e=>e.alive=false);
 battle.objectives.update(.1,{living:battle.squad,enemies:battle.enemies,zones:{castle:zone},scale:2});
}
assert.equal(battle.enemies.filter(e=>e.checkpointWave).length,42,'Existing Burg counterattack waves are preserved');assert.equal(battle.objectives.manager.current().id,'burg-command');assert(battle.squad[0].checkpointFortified);
const legacy=burg('LOST');legacy.runtime.sync({legacy:true,phase:2});legacy.objectives.syncPhase(2);assert.equal(legacy.objectives.manager.current().id,'phase-2');assert.equal(legacy.objectives.facts.get('post_route_status'),'LOST');assert.equal(legacy.messages.length,0);
const retry=fresh();assert.equal(retry.objectives.manager.get('burg-command').status,'PENDING');assert.equal(retry.objectives.manager.get('act-three').status,'PENDING');assert.equal(retry.objectives.facts.get('post_route_status'),'PENDING');
for(const m of missions.filter(m=>m.id!=='bad-belzig')){const r=Objectives.create(m);assert.equal(r.manager.get('burg-command'),null);assert.equal(r.manager.get('act-three'),null)}
console.log('PASS: HELD/LOST Burg framing, existing combat waves, command interaction, all eligible characters, single Act III trigger, route-aware setup, snapshots/reset and mission isolation.');
