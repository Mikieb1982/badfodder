'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const Opening=require('../bad-belzig-opening'),Objectives=require('../mission-objectives'),Civilians=require('../civilian-runtime'),Navigation=require('../navigation');
const map=new Function(fs.readFileSync(require.resolve('../town-map'),'utf8')+fs.readFileSync(require.resolve('../bad-belzig-data'),'utf8')+';return TOWN_MAP;')();
const scope={window:{BadFodderHistoricalMissions:require('../historical-missions')},localStorage:{getItem:()=>null,setItem(){}}};
vm.runInNewContext(fs.readFileSync(require.resolve('../campaign'),'utf8'),scope);
// VM fixtures cross a realm boundary; serialized campaign data matches runtime data.
scope.window.BadFodderCampaign.missions=JSON.parse(JSON.stringify(scope.window.BadFodderCampaign.missions));
const mission=scope.window.BadFodderCampaign.missions.find(m=>m.id==='bad-belzig');
const buildings=map.buildings.map(b=>{const points=b.points.map(p=>[p[0]*2,p[1]*2]);return{solid:b.solid!==false,points,minX:Math.min(...points.map(p=>p[0])),maxX:Math.max(...points.map(p=>p[0])),minY:Math.min(...points.map(p=>p[1])),maxY:Math.max(...points.map(p=>p[1]))}});
function fresh(){
 const squad=map.spawns.squad.map(([x,y])=>({x:x*2,y:y*2,alive:true}));
 const residents=map.spawns.civilians.map(([x,y],i)=>({x:x*2,y:y*2,homeX:x*2,homeY:y*2,phase:i,speed:40}));
 const enemies=map.spawns.enemies.map(([x,y])=>({x:x*2,y:y*2,alive:true})),messages=[];
 let nav;nav=Navigation.create({worldWidth:map.width*2,worldHeight:map.height*2,buildings,mapKey:map.key,moveEntity:(c,dx,dy)=>{if(!nav.obstacleAt(c.x+dx,c.y,6))c.x+=dx;if(!nav.obstacleAt(c.x,c.y+dy,6))c.y+=dy},updateFacing(){}});
 const civilians=Civilians.create({getCivilians:()=>residents,getSquad:()=>squad,getEnemies:()=>enemies,scale:2,zones:[{x:squad[0].x,y:squad[0].y,r:130}],path:nav.assignPath,follow:nav.followPath,canOccupy:(x,y)=>!nav.obstacleAt(x,y,6)});
 const objectives=Objectives.create(mission);
 const runtime=Opening.create({map,objectives,civilians:{getResidents:()=>residents,zones:civilians.zones,interact:civilians.interact},getSquad:()=>squad,getEnemies:()=>enemies,scale:2,status:t=>messages.push(t),stop:nav.cancelPath});
 return{runtime,objectives,civilians,squad,residents,enemies,messages,nav,group:map.opening.civilianIndexes.map(i=>residents[i])};
}
const f=fresh();f.runtime.start();
assert.equal(f.residents.length,16);assert.equal(f.group.length,4);assert(f.group.every(c=>c.civilianState==='HIDING'));
assert.equal(f.objectives.manager.current().id,'opening-contact');assert(f.enemies.every(e=>e.missionDormant));assert.equal(f.civilians.zones.length,0);
for(const c of f.group){assert(!f.nav.obstacleAt(c.x,c.y,6));assert(f.nav.findPath(f.squad[0].x,f.squad[0].y,c.x,c.y).length)}
f.runtime.update();assert.equal(f.objectives.facts.get('opening_state'),'NOT_MET');
// Any split-squad member can contact the group; selection and identity do not gate progress.
Object.assign(f.squad[3],{x:map.opening.contact.x*2,y:map.opening.contact.y*2});f.runtime.update();
assert.equal(f.objectives.facts.get('opening_state'),'MOVING');assert.equal(f.objectives.manager.current().id,'opening-route');
assert(f.group.every(c=>c.civilianState==='FOLLOWING'&&c.leaderIndex===3));
const y=f.group[0].y;f.squad[3].y-=40;for(let i=0;i<60;i++)f.civilians.update(1/30);assert.notEqual(f.group[0].y,y,'Existing navigation moves the group');assert(f.group.every(c=>c.civilianState!=='EVACUATED'));
const moving=JSON.parse(JSON.stringify(f.objectives.snapshot())),civilianRows=f.civilians.snapshot();
const copy=fresh();copy.objectives.restore(moving);copy.civilians.receive(civilianRows);copy.runtime.sync();
assert.equal(copy.objectives.manager.current().id,'opening-route');assert.equal(copy.messages.length,0);assert.equal(copy.objectives.facts.get('opening_state'),'MOVING');
// One delayed wounded resident does not block the route reveal.
f.group[0].hp=1;f.group[0].y+=200;
Object.assign(f.squad[3],{x:map.pois.postcolumn.x*2,y:(map.pois.postcolumn.y+90)*2});f.runtime.update();
assert.equal(f.objectives.facts.get('opening_state'),'POST_BLOCKED');assert.equal(f.objectives.manager.current().id,'phase-0');assert.equal(f.objectives.phase(),0);
assert(f.enemies.every(e=>!e.missionDormant));assert.equal(f.enemies.length,20);assert.deepEqual(map.defenderGroups.post,[0,1,2]);
assert(f.group.every(c=>c.leaderIndex===null&&!c.path));assert.equal(f.group[0].civilianState,'WOUNDED');assert.equal(f.civilians.zones.length,1);
const complete=JSON.parse(JSON.stringify(f.objectives.snapshot())),restored=fresh();restored.objectives.restore(complete);restored.civilians.receive(f.civilians.snapshot());restored.runtime.sync();restored.runtime.update();
assert.equal(restored.messages.length,0);assert.equal(restored.objectives.manager.current().id,'phase-0');assert(restored.runtime.combatReady);
// Trigger is radial and forgiving, including an approach that bypasses the residents.
for(const dx of [-90,90]){const a=fresh();Object.assign(a.squad[1],{x:(map.pois.postcolumn.x+dx)*2,y:map.pois.postcolumn.y*2});a.runtime.update();assert(a.runtime.combatReady);assert.equal(a.objectives.manager.current().id,'phase-0')}
const stageOnly=fresh();stageOnly.runtime.sync({legacy:true});stageOnly.objectives.syncPhase(1);assert.equal(stageOnly.objectives.manager.current().id,'phase-1');assert(stageOnly.runtime.combatReady);
const retry=fresh();assert.equal(retry.residents.length,16);assert(retry.group.every(c=>c.civilianState==='HIDING'&&c.leaderIndex===null));assert.equal(retry.objectives.facts.get('opening_state'),'NOT_MET');assert.equal(retry.objectives.manager.current().id,'opening-contact');
const combat=fresh();Object.assign(combat.squad[0],{x:map.pois.postcolumn.x*2,y:map.pois.postcolumn.y*2});combat.runtime.update();
combat.enemies.forEach(e=>e.alive=false);combat.objectives.update(3,{living:combat.squad,enemies:combat.enemies,zones:{post:{x:combat.squad[0].x,y:combat.squad[0].y,r:50}},scale:2});assert.equal(combat.objectives.manager.current().id,'phase-1','Original Post hold still advances to Burg');
const legacy=fresh();legacy.objectives.restore(Objectives.create({...mission,factDefaults:{}}).snapshot());legacy.runtime.sync();assert(legacy.runtime.combatReady,'Legacy combat snapshot must not replay the opening');
for(const m of scope.window.BadFodderCampaign.missions.filter(m=>m.id!=='bad-belzig'))assert.equal(Objectives.create(m).facts.get('opening_state'),undefined);
console.log('PASS: authored opening, civilian following/navigation, split contact, Post handoff, alternative approaches, restart and snapshot compatibility.');
