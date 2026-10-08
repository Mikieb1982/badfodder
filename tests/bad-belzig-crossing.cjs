'use strict';
const assert=require('node:assert/strict'),{fresh,map,mission,missions}=require('./bad-belzig-opening.cjs');
const Objectives=require('../mission-objectives'),Adaptive=require('../adaptive-director'),Fortification=require('../checkpoint-fortification'),WaveConfig=require('../checkpoint-wave-config');
Fortification.patchAdaptive(Adaptive);WaveConfig.apply({missions:[mission]});
const zone={x:map.pois.postcolumn.x*2,y:map.pois.postcolumn.y*2,r:92};
function approach(f){Object.assign(f.squad[2],{x:map.opening.contact.x*2,y:map.opening.contact.y*2});f.runtime.update();Object.assign(f.squad[2],zone);f.runtime.update();assert.equal(f.objectives.manager.current().id,'phase-0')}
function clear(f){f.enemies.filter(e=>e.objectiveGroup==='post').forEach(e=>e.alive=false)}
function step(f,dt){f.runtime.update(dt);f.civilians.update(dt);f.objectives.update(dt,{living:f.squad,enemies:f.enemies,zones:{post:zone},scale:2})}
function begin(){const f=fresh();approach(f);step(f,.1);assert.equal(f.objectives.facts.get('post_crossing').started,false,'Patrol must be cleared first');clear(f);step(f,.1);assert(f.objectives.facts.get('post_crossing').started);assert(f.group.every(c=>c.leaderIndex===2));return f}
function restore(f){const copy=fresh();copy.objectives.restore(JSON.parse(JSON.stringify(f.objectives.snapshot())));copy.residents.forEach((c,i)=>Object.assign(c,f.residents[i]));copy.civilians.receive(f.civilians.snapshot());copy.runtime.sync();return copy}
const f=fresh();approach(f);clear(f);
const commander=Adaptive.createCommander({getEnemies:()=>f.enemies,getSquad:()=>f.squad,getPhase:()=>({...f.objectives.manager.current(),index:f.objectives.phase()}),getZones:()=>({post:zone}),roads:map.roads.map(r=>({...r,points:r.points.map(p=>p.map(v=>v*2))})),scale:2,navigation:f.nav,blocked:f.nav.obstacleAt,queuePath:f.nav.assignPath});
commander.maintain(.1);assert.equal(f.enemies.filter(e=>e.alive&&e.checkpointWave).length,8,'Reuse existing finite Post pressure');step(f,.1);
assert(f.squad[2].checkpointFortified,'Existing prepared cover remains available');
assert(f.group.every(c=>c.civilianState==='FOLLOWING'||c.civilianState==='WOUNDED'));
for(const c of f.group){const guide=f.runtime.civilianGuide(c,f.squad[2]);assert(guide);assert(!f.nav.obstacleAt(guide.x,guide.y,6));assert(f.nav.findPath(c.x,c.y,guide.x,guide.y).length)}
const touched=new Set();let extraSeen=false;
for(let i=1;i<=1800&&f.objectives.facts.get('post_route_status')==='PENDING';i++){
 const t=i/30;
 // Defeat the finite counterattack through the same checkpoint controller.
 if(t>3)f.enemies.filter(e=>e.checkpointWave&&!e.checkpointExtra).forEach(e=>e.alive=false);
 if(t>10)f.enemies.filter(e=>e.checkpointExtra).forEach(e=>e.alive=false);
 commander.maintain(t);extraSeen||=f.enemies.some(e=>e.checkpointExtra);step(f,1/30);
 for(const [j,c]of f.group.entries()){if(Math.hypot(c.x-zone.x,c.y-zone.y)<144)touched.add(j);assert(!f.nav.obstacleAt(c.x,c.y,6))}
}
assert(extraSeen,'Existing bounded follow-up wave remains playable');assert.equal(f.enemies.filter(e=>e.checkpointWave).length,22);
assert.equal(f.objectives.facts.get('post_route_status'),'HELD');assert(touched.size>=2,'Civilians really traverse the Post corridor');
assert(f.group.filter(c=>c.civilianState==='EVACUATED').length>=2,'No individual civilian orders are required');assert.equal(f.objectives.manager.current().id,'phase-1');assert(!f.objectives.manager.missionState().failed);
f.enemies.push({x:zone.x,y:zone.y,alive:true,objectiveGroup:'post'});step(f,20);assert.equal(f.objectives.facts.get('post_route_status'),'HELD','Resolved outcome cannot flip');
const held=restore(f);step(held,1);assert.equal(held.objectives.facts.get('post_route_status'),'HELD');assert.equal(held.messages.length,0);assert.equal(held.residents.length,20);
// Brief recapture has a warned recovery window, and clearing it resets the clock.
const lost=begin(),hostile={x:zone.x,y:zone.y,alive:true,checkpointWave:true,objectiveGroup:'post'};lost.enemies.push(hostile);step(lost,2);
assert.equal(lost.objectives.facts.get('post_route_status'),'PENDING');assert(lost.messages.some(t=>t.includes('Recover the Post')));assert(lost.objectives.manager.current().text.includes('6s'));
const interrupted=restore(lost);assert.equal(interrupted.objectives.facts.get('post_crossing').unsafe,2);step(interrupted,6);assert.equal(interrupted.objectives.facts.get('post_route_status'),'LOST','Restore preserves the active recovery window');
hostile.alive=false;step(lost,.1);assert.equal(lost.objectives.facts.get('post_crossing').unsafe,0);hostile.alive=true;
for(let i=0;i<9;i++)step(lost,1);
assert.equal(lost.objectives.facts.get('post_route_status'),'LOST');assert.equal(lost.objectives.manager.current().id,'phase-1');assert(!lost.objectives.manager.missionState().failed);assert(lost.group.every(c=>c.leaderIndex===null));
assert(lost.messages.some(t=>t.includes('direct route is lost')));
const savedLoss=restore(lost);step(savedLoss,1);assert.equal(savedLoss.objectives.facts.get('post_route_status'),'LOST');assert.equal(savedLoss.messages.length,0);assert.equal(savedLoss.residents.length,20);
// Wounded/delayed residents do not need simultaneous arrival or get credited at the southern rally.
const delayed=begin();delayed.group[0].hp=1;Object.assign(delayed.group[0],{x:delayed.squad[0].x,y:delayed.squad[0].y});delayed.civilians.update(.1);assert.notEqual(delayed.group[0].civilianState,'EVACUATED');
for(const c of delayed.group.slice(1,3))c.civilianState='EVACUATED';step(delayed,3);assert.equal(delayed.objectives.facts.get('post_route_status'),'HELD');
const abandoned=begin();abandoned.enemies.push({x:zone.x+400,y:zone.y,alive:true,checkpointWave:true,objectiveGroup:'post'});for(const s of abandoned.squad)s.y=3000;step(abandoned,1);assert.equal(abandoned.objectives.facts.get('post_crossing').unsafe,1);assert.equal(abandoned.objectives.facts.get('post_route_status'),'PENDING','Abandonment while pressure remains also gets a recovery window');
const retry=fresh();assert.equal(retry.objectives.facts.get('post_route_status'),'PENDING');assert.deepEqual(retry.objectives.facts.get('post_crossing'),{started:false,hold:0,unsafe:0});assert.equal(retry.residents.length,20);
for(const m of missions.filter(m=>m.id!=='bad-belzig'))assert.equal(Objectives.create(m).facts.get('post_route_status'),undefined);
console.log('PASS: real Post crossing/navigation, finite checkpoint counterattack, HELD/LOST, recovery warnings, progression, civilian guides, snapshots/restart and mission isolation.');
