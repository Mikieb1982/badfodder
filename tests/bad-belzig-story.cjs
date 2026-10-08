'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {fresh,map,mission,missions}=require('./bad-belzig-opening.cjs');
const Story=require('../bad-belzig-story'),Civilians=require('../civilian-runtime'),Health=require('../character-health'),Groups=require('../group-movement'),Objectives=require('../mission-objectives');
const Adaptive=require('../adaptive-director'),Fortification=require('../checkpoint-fortification'),Waves=require('../checkpoint-wave-config');Fortification.patchAdaptive(Adaptive);Waves.apply({missions:[mission]});
const clone=x=>JSON.parse(JSON.stringify(x)),point=p=>({x:p.x*2,y:p.y*2});
function fixture(){
 const f=fresh();f.selected=f.squad;f.supplies=[];f.saved=[];f.enemies.forEach(e=>Object.assign(e,{hp:3,maxHp:3}));
 f.squad.forEach((u,i)=>Object.assign(u,{name:['Karl','Otto','Lotte','Greta'][i],hp:8,maxHp:8,state:'idle',dir:0}));
 Health.bindRuntime({getSquad:()=>f.squad,getSelected:()=>f.selected,damage:(u,n)=>{u.hp-=n;if(u.hp<=0)u.alive=false}});
 const opening=f.runtime;
 f.civilians=Civilians.create({getCivilians:()=>f.residents,getSquad:()=>f.squad,getEnemies:()=>f.enemies,scale:2,getGuide:(c,l)=>f.runtime.civilianGuide(c,l)||l,zones:f.civilians.zones,path:f.nav.assignPath,follow:f.nav.followPath,canOccupy:(x,y)=>!f.nav.obstacleAt(x,y,6)});
 f.runtime=Story.create({opening,map,objectives:f.objectives,civilians:{getResidents:()=>f.residents,zones:f.civilians.zones},getSquad:()=>f.squad,getEnemies:()=>f.enemies,getSelected:()=>f.selected,navigation:f.nav,health:Health,groupMovement:Groups.create({navigation:f.nav}),scale:2,status:t=>f.messages.push(t),supply:p=>f.supplies.push(p),persist:s=>f.saved.push(clone(s))});
 f.refuge=map.story.refugeIndexes.map(i=>f.residents[i]);f.frieda=f.residents[map.story.friedaIndex];
 return f;
}
function crisis(result='HELD'){
 const f=fixture();f.runtime.sync({legacy:true});f.objectives.facts.set('post_route_status',result);f.objectives.manager.complete('phase-0');
 f.enemies.slice(0,20).forEach(e=>e.alive=false);
 Object.assign(f.squad[0],point(map.pois.castle));f.objectives.update(3,{living:f.squad,enemies:f.enemies,zones:{castle:{...point(map.pois.castle),r:164}},scale:2});
 assert.equal(f.objectives.manager.current().id,'burg-command');assert(f.runtime.interactBurg(f.squad[0]));f.runtime.update(0);
 assert.equal(f.objectives.manager.get('burg-command').status,'COMPLETED');return f;
}
function action(f,place,index=0){const u=f.squad[index];Object.assign(u,point(place));assert(f.runtime.interactStory(u));return u}
function clearRefuge(f){map.story.refugeEnemies.forEach(i=>f.enemies[i].alive=false);action(f,map.story.refuge);assert.equal(f.objectives.facts.get('refuge_status'),'SAFE')}
function clearRoute(f){action(f,map.pois.postcolumn);map.story.routeEnemies.forEach(i=>f.enemies[i].alive=false);f.runtime.update(3);assert.equal(f.objectives.manager.get('crisis-route').status,'COMPLETED')}
function walk(f,complete,limit=16000){for(let i=0;i<limit&&!complete();i++){f.civilians.update(.1);f.runtime.update(.1)}assert(complete(),'Native civilian navigation must finish the authored route')}
function restore(f){const g=fixture();g.objectives.restore(clone(f.objectives.snapshot()));f.residents.forEach((c,i)=>Object.assign(g.residents[i],{x:c.x,y:c.y,hp:c.hp,alive:c.alive}));g.civilians.receive(clone(f.civilians.snapshot()));g.runtime.sync();return g}
if(require.main===module){
const start=fixture();assert.equal(start.objectives.facts.get('refuge_status'),'SAFE');assert.equal(start.objectives.facts.get('frieda_status'),'SAFE');
assert.equal(start.residents.filter(c=>c.name==='Frieda Lehmann').length,1);assert.equal(start.frieda.fictional,true);assert.equal(start.frieda.civilianRole,'first-aid volunteer');assert(!start.frieda.weapon);assert(start.refuge.every(c=>c.civilianState==='HIDING'));
assert(start.enemies.every(e=>e.missionDormant));
assert(!start.nav.routeClear(1494,2442,1494,2406,6),'Thin Post scenery must not produce an unusable route');
for(const p of [...map.story.refugeRoute,...map.story.fallback,...map.story.burgSide,...map.story.courtyard]){assert(!start.nav.obstacleAt(p[0]*2,p[1]*2,6));assert(start.nav.findPath(start.squad[0].x,start.squad[0].y,p[0]*2,p[1]*2).length)}
// St. Marien receives civilians through the existing evacuation state, before the crisis.
Object.assign(start.squad[1],point(map.story.refuge));start.frieda.leaderIndex=1;start.civilians.update(.1);assert.equal(start.frieda.civilianState,'EVACUATED');
assert.equal(fixture().residents.length,20);assert.equal(fixture().frieda.civilianState,'HIDING');
// Crossed residents continue to St. Marien automatically rather than stopping at the Post exit.
const incoming=fixture();incoming.runtime.sync({legacy:true});incoming.objectives.facts.set('post_route_status','HELD');incoming.objectives.manager.complete('phase-0');incoming.enemies.forEach(e=>e.alive=false);incoming.group.forEach(c=>{Object.assign(c,point(map.crossing.onward));c.civilianState='EVACUATED'});incoming.runtime.update(0);walk(incoming,()=>incoming.group.every(c=>c.civilianState==='EVACUATED'));assert(incoming.group.every(c=>Math.hypot(c.x-map.story.refuge.x*2,c.y-map.story.refuge.y*2)<=map.story.refuge.r*2));
// Both objectives activate once. Mere elapsed time warns and releases finite patrols, never wounds Frieda by script.
const timer=crisis();let activations=0;timer.objectives.manager.onChange(e=>{if(e.action==='activate'&&e.objective.id==='crisis-refuge')activations++});
timer.runtime.update(119);assert(!timer.objectives.facts.get('belzig_story').refugeArmed);timer.runtime.update(1);
assert(timer.messages.some(t=>t.includes('60 seconds')));assert(timer.runtime.instruction().includes('60s'));
timer.runtime.update(59);assert(!timer.objectives.facts.get('belzig_story').refugeArmed);timer.runtime.update(1);assert(timer.objectives.facts.get('belzig_story').refugeArmed);assert.equal(timer.objectives.facts.get('frieda_status'),'SAFE');assert.equal(activations,0);assert(timer.enemies[20].belzigThreatTarget);assert.equal(timer.enemies.length,24);
// Existing civilian damage/rescue decides Frieda's condition.
const wounded=crisis();wounded.civilians.damage(wounded.frieda,1);wounded.runtime.update(0);assert.equal(wounded.objectives.facts.get('frieda_status'),'WOUNDED');wounded.civilians.damage(wounded.frieda,3);wounded.civilians.update(19);wounded.runtime.update(0);assert.equal(wounded.objectives.facts.get('frieda_status'),'LOST');
// Either movement priority works in single player; no split or menu choice is needed.
for(const first of ['refuge','route']){
 const f=crisis();assert.equal(f.objectives.facts.get('refuge_status'),'THREATENED');assert.equal(f.objectives.manager.get('crisis-route').status,'ACTIVE');
 if(first==='refuge'){clearRefuge(f);clearRoute(f)}else{clearRoute(f);clearRefuge(f)}
 assert.equal(f.objectives.manager.get('act-three').status,'COMPLETED');assert.equal(f.objectives.manager.current().id,'reissiger-regroup');assert.equal(f.objectives.facts.get('post_route_status'),'HELD');assert(!f.objectives.manager.missionState().failed);
 const g=restore(f);assert.equal(g.objectives.facts.get('refuge_status'),'SAFE');assert.equal(g.objectives.manager.get('burg-command').status,'COMPLETED');assert.equal(g.messages.length,0);assert.equal(g.residents.filter(c=>c.name==='Frieda Lehmann').length,1);
}
// Explicit aid stabilises/recoveries through character-health, once per authored phase.
const aid=crisis();aid.squad.forEach(u=>Object.assign(u,point(map.story.refuge)));aid.squad[0].hp=4;Health.down(aid.squad[1]);Health.down(aid.squad[2]);Health.stabilise(aid.squad[2]);
clearRefuge(aid);assert.equal(aid.squad[0].hp,6);assert(aid.squad[1].stabilised&&aid.squad[1].downed);assert.equal(aid.squad[2].hp,2);assert(!aid.squad[2].downed);assert.equal(Health.stateFor(aid.squad[2]),'BADLY_WOUNDED');
aid.runtime.update(10);assert.equal(aid.squad[0].hp,6,'No passive regeneration');assert(!Health.recover(aid.squad[0],NaN));assert(!Health.recover({alive:true,maxHp:NaN},2));
// Brief recapture has a visible recovery window; sustained hostile control costs the route without failure.
const recapture=crisis();action(recapture,map.pois.postcolumn);Object.assign(recapture.enemies[22],point(map.pois.postcolumn));recapture.runtime.update(2);assert.equal(recapture.objectives.facts.get('post_route_status'),'HELD');assert(recapture.runtime.instruction().includes('10s'));recapture.enemies[22].alive=false;recapture.runtime.update(.1);assert.equal(recapture.objectives.facts.get('belzig_story').postUnsafe,0);
Object.assign(recapture.enemies[23],point(map.pois.postcolumn));recapture.runtime.update(11);assert.equal(recapture.objectives.facts.get('post_route_status'),'HELD');recapture.runtime.update(1);assert.equal(recapture.objectives.facts.get('post_route_status'),'LOST');assert(!recapture.objectives.manager.missionState().failed);
// LOST sends the whole southern group through existing geometry, with individual waypoint progress.
const fallback=crisis('LOST');clearRefuge(fallback);action(fallback,map.pois.postcolumn);map.story.routeEnemies.forEach(i=>fallback.enemies[i].alive=false);
assert(fallback.group.every(c=>c.leaderIndex===0));assert.equal(fallback.runtime.civilianGuide(fallback.group[0],fallback.squad[0]).x,map.story.fallback[0][0]*2);
walk(fallback,()=>fallback.objectives.manager.get('crisis-route').status==='COMPLETED');assert.equal(fallback.objectives.facts.get('post_route_status'),'LOST');assert.equal(fallback.objectives.manager.current().id,'reissiger-regroup');
const restoredFallback=restore(fallback);restoredFallback.runtime.update(.1);assert.equal(restoredFallback.messages.length,0);assert.equal(restoredFallback.objectives.facts.get('post_route_status'),'LOST');
// Refuge evacuation uses native movement; actual lost/downed civilians produce a costly outcome, never a mission failure.
for(const loss of [false,true]){
 const f=crisis();if(loss){f.civilians.damage(f.refuge[3],4);f.civilians.damage(f.refuge[3],1)}action(f,map.story.refuge);f.enemies.forEach(e=>e.alive=false);
 walk(f,()=>f.objectives.manager.get('crisis-refuge').status==='COMPLETED');assert.equal(f.objectives.facts.get('refuge_status'),loss?'EVACUATED_WITH_LOSSES':'EVACUATED');assert(!f.objectives.manager.missionState().failed);
}
// Regroup respects selected/local members; wounded/carrying states remain valid. Lotte/Greta are optional.
const final=crisis();clearRefuge(final);clearRoute(final);final.selected=[final.squad[0],final.squad[1]];
const other=clone(final.squad[3]);action(final,map.story.regroup);assert(final.squad[0].navDestination);assert(final.squad[1].navDestination);assert.deepEqual(final.squad[3],other,'Regroup must not pull the unselected player');
assert(final.runtime.quiet);const hp=final.enemies.map(e=>e.hp);action(final,map.story.regroup);assert.equal(final.objectives.manager.current().id,'phase-2');assert(!final.runtime.quiet);assert.deepEqual(final.enemies.map(e=>e.hp),hp);
assert.deepEqual(final.objectives.facts.get('belzig_story').routes,['courtyard','direct','burg-side']);assert.equal(final.supplies.length,1);assert.equal(final.supplies[0].type,'med');assert.equal(final.objectives.facts.get('belzig_story').support,2);
const plan=restore(final);assert.equal(plan.supplies.length,0);assert.equal(plan.residents.filter(c=>c.belzigVolunteer).length,2);assert(!plan.runtime.interactStory(plan.squad[0]));
// The final authored fight retains all 70 finite counterattack enemies and prepared cover.
const market={...point(map.pois.market),r:172};Object.assign(final.squad[0],market);
const commander=Adaptive.createCommander({getEnemies:()=>final.enemies,getSquad:()=>final.squad,getPhase:()=>({...final.objectives.manager.current(),index:2}),getZones:()=>({market}),roads:map.roads.map(r=>({...r,points:r.points.map(p=>p.map(v=>v*2))})),scale:2,navigation:final.nav,blocked:final.nav.obstacleAt,queuePath:final.nav.assignPath});
for(let i=1;i<240&&!final.objectives.manager.missionState().complete;i++){commander.maintain(i/10);if(i>10)final.enemies.filter(e=>e.checkpointWave).forEach(e=>e.alive=false);final.objectives.update(.1,{living:final.squad,enemies:final.enemies,zones:{market},scale:2})}
assert.equal(final.enemies.filter(e=>e.checkpointWave).length,70);assert(final.objectives.manager.missionState().complete);assert(final.squad[0].checkpointFortified);
// Frieda's actual wound reduces aid; a lost volunteer cannot give aid or silently revive someone.
for(const condition of ['WOUNDED','LOST']){const f=crisis();Object.assign(f.squad[0],point(map.story.refuge));f.squad[0].hp=4;if(condition==='WOUNDED')f.civilians.damage(f.frieda,1);else{f.civilians.damage(f.frieda,4);f.civilians.damage(f.frieda,1)}f.runtime.update(0);clearRefuge(f);assert.equal(f.squad[0].hp,condition==='WOUNDED'?5:4)}
// Final hold completes costly success for every documented refuge/Frieda outcome, under either Post result.
for(const route of ['HELD','LOST'])for(const refuge of ['SAFE','EVACUATED','EVACUATED_WITH_LOSSES'])for(const frieda of ['SAFE','WOUNDED','LOST']){
 const f=crisis(route);f.enemies.forEach(e=>e.alive=false);
 f.objectives.facts.set('refuge_status',refuge);f.objectives.manager.complete('crisis-refuge');f.objectives.manager.complete('crisis-route');f.runtime.update(0);
 if(frieda==='LOST'){f.frieda.alive=false;f.frieda.civilianState='DEAD'}else if(frieda==='WOUNDED')f.frieda.hp=1;
 // Remove named support: no mandatory survivor or perfect result.
 f.squad[2].alive=false;f.squad[3].alive=false;action(f,map.story.regroup);action(f,map.story.regroup);
 assert.deepEqual(f.objectives.facts.get('belzig_story').routes,route==='HELD'?['direct','burg-side']:['burg-side']);assert.equal(f.supplies.length,0);
 Object.assign(f.squad[0],point(map.pois.market));f.objectives.update(4,{living:f.squad,enemies:f.enemies,zones:{market:{...point(map.pois.market),r:172}},scale:2});assert(f.objectives.manager.missionState().complete,'Rathaus completion accepts costly outcomes');
 const text=f.runtime.finish();assert(text.includes(route==='HELD'?'crossing stayed open':'crossing was lost'));assert(text.includes(({SAFE:'refuge remained safe',EVACUATED:'civilians moved to safety',EVACUATED_WITH_LOSSES:'evacuation cost lives'})[refuge]));assert(text.includes(({SAFE:'Frieda survived to give first aid',WOUNDED:'Frieda survived wounded',LOST:'Frieda was lost'})[frieda]));assert.equal(f.saved.length,1);assert.equal(f.runtime.finish(),text);assert.equal(f.saved.length,1);assert.equal(f.saved[0].version,1);
 const g=restore(f);g.runtime.update(100);assert.equal(g.runtime.finish(),text);assert.equal(g.saved.length,0);assert.equal(g.messages.length,0);assert.equal(g.objectives.facts.get('post_route_status'),route);assert.equal(g.objectives.facts.get('frieda_status'),frieda);
}
const legacy=fixture();legacy.runtime.sync({legacy:true,phase:2});legacy.objectives.syncPhase(2);assert.equal(legacy.objectives.manager.current().id,'phase-2');assert.equal(legacy.messages.length,0);
const earlier= fresh();earlier.runtime.sync({legacy:true});earlier.objectives.manager.complete('phase-0');earlier.enemies.forEach(e=>e.alive=false);Object.assign(earlier.squad[0],point(map.pois.castle));earlier.objectives.update(3,{living:earlier.squad,enemies:earlier.enemies,zones:{castle:{...point(map.pois.castle),r:164}},scale:2});earlier.runtime.interactBurg(earlier.squad[0]);const upgraded=fixture();upgraded.objectives.restore(clone(earlier.objectives.snapshot()));upgraded.runtime.sync();upgraded.runtime.update(0);assert.equal(upgraded.objectives.manager.get('crisis-refuge').status,'ACTIVE');assert.equal(upgraded.objectives.facts.get('post_route_status'),'HELD');
const reset=fixture();assert.equal(reset.objectives.facts.get('post_route_status'),'PENDING');assert.equal(reset.objectives.facts.get('refuge_status'),'SAFE');assert.equal(reset.objectives.facts.get('frieda_status'),'SAFE');assert.deepEqual(reset.objectives.facts.get('belzig_story'),{});assert.equal(reset.objectives.manager.get('local-approach').status,'PENDING');
for(const m of missions.filter(m=>m.id!=='bad-belzig')){const o=Objectives.create(m);for(const key of ['refuge_status','frieda_status','belzig_story'])assert.equal(o.facts.get(key),undefined);assert.equal(o.manager.get('crisis-refuge'),null)}
// Live keyboard/touch contextual path accepts any eligible selected survivor, including a split group.
const html=fs.readFileSync(require.resolve('../index.html'),'utf8');function body(name){const start=html.indexOf('  function '+name+'('),brace=html.indexOf('{',start);let end=brace+1,depth=1;for(;depth;end++){if(html[end]==='{')depth++;if(html[end]==='}')depth--}return html.slice(start,end)}
const live=crisis('LOST');Object.assign(live.squad[3],point(map.pois.postcolumn));const env={badBelzigRuntime:live.runtime,barcelonaRuntime:null,buildingRuntime:null,civilianRuntime:live.civilians,coordinationSupport:null,started:true,menuOpen:false,paused:false,finished:false,mapOpen:false,coopCommand:()=>false,selectedUnits:()=>[live.squad[2],live.squad[3]],updateHud(){},setStatus(){}};vm.createContext(env);vm.runInContext(body('contextAction')+body('performCivilianAction'),env);assert(env.performCivilianAction());assert(live.group.every(c=>c.leaderIndex===3));
console.log('PASS: refuge/Frieda, native civilian routes, warning/recovery windows, either crisis priority, health aid, selected regroup, local support, all costly finales, aftermath/save/restore/reset and isolation.');

}
module.exports={fixture,crisis,action,clearRefuge,clearRoute,restore,point,map};
