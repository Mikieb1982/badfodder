'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),vm=require('node:vm');
const root=path.join(__dirname,'..'),source=fs.readFileSync(path.join(root,'index.html'),'utf8');
const map=new Function(fs.readFileSync(path.join(root,'wigan-map.js'),'utf8')+';return WIGAN_MAP;')();
function body(name){const start=source.indexOf('  function '+name+'('),open=source.indexOf('{',start);let depth=1,end=open+1;for(;depth&&end<source.length;end++){if(source[end]==='{')depth++;if(source[end]==='}')depth--;}return source.slice(start,end);}
const geometry=`const MAP_DATA=TOWN_MAP,WORLD_W=TOWN_MAP.width*2,WORLD_H=TOWN_MAP.height*2;const buildings=TOWN_MAP.buildings.map((b,i)=>{const points=b.points.map(p=>p.map(v=>v*2));return{i,solid:b.solid!==false,points,minX:Math.min(...points.map(p=>p[0])),maxX:Math.max(...points.map(p=>p[0])),minY:Math.min(...points.map(p=>p[1])),maxY:Math.max(...points.map(p=>p[1]))};});`;
const nav=source.slice(source.indexOf('  const CELL=150;'),source.indexOf('  function pointInCircle('));
const makeNavigation=new Function('TOWN_MAP',geometry+body('pointInPoly')+nav+body('moveEntity')+body('updateFacing')+';return {findPath,routeClear,followPath,assignPath,obstacleAt,get components(){return nextPathComponent}};');
const q=makeNavigation(map);
assert.equal(map.projection.northUp,false);assert.equal(map.projection.gameRotationDegrees,180);assert.equal(map.orientation,'reference-rotated-180');assert(map.roads.length>400&&map.buildings.length>300,'Do not replace geography with a handful of fictional blocks');
const expected={wallgate:1350051925,northWestern:126406381,tudor:738652992,moon:941417293,johnBull:759771131,grandArcade:581252033,busStation:782427411};
for(const [key,id] of Object.entries(expected)){assert.equal(map.pois[key].osmId,id);assert(map.buildings.some(b=>b.osmId===id&&b.landmark===key));}
assert(map.pois.northWestern.y<map.pois.wallgate.y,'North Western should appear above Wallgate in the gameplay orientation');assert(map.pois.grandArcade.x<map.pois.market.x);assert(map.pois.tudor.y>map.pois.busStation.y,'Tudor House should sit below the bus station in the gameplay orientation');assert(map.pois.kingStreet.x<map.pois.wallgate.x&&map.pois.kingStreet.y<map.pois.wallgate.y);
for(const e of [...map.buildings,...map.roads,...map.areas])for(const p of e.points){assert(p.every(Number.isFinite));assert(p[0]>=0&&p[0]<=map.width&&p[1]>=0&&p[1]<=map.height,'Feature outside clipped map');}
const start={x:map.spawns.squad[0][0]*2,y:map.spawns.squad[0][1]*2};
const tudorStart={x:map.pois.tudor.approach[0]*2,y:map.pois.tudor.approach[1]*2};
assert(Math.hypot(start.x-tudorStart.x,start.y-tudorStart.y)<130,'Mission 2 must start at Tudor House');
for(const p of map.spawns.squad)assert(!q.obstacleAt(p[0]*2,p[1]*2,4),'Squad spawns inside a footprint');
for(const [name,p] of Object.entries(map.pois)){
 const target={x:p.approach[0]*2,y:p.approach[1]*2};assert(!q.obstacleAt(target.x,target.y,4),name+' frontage blocked');
 const ent={...start,alive:true},route=q.findPath(ent.x,ent.y,target.x,target.y);assert(route.length,name+' unreachable');let x=ent.x,y=ent.y;
 for(const w of route){assert(q.routeClear(x,y,w.x,w.y,4),name+' crosses a building');x=w.x;y=w.y;}
 q.assignPath(ent,target.x,target.y);for(let i=0;i<7000&&ent.path;i++)q.followPath(ent,185,1/30);
 assert(!ent.path,name+' gets stuck');assert(Math.hypot(ent.x-target.x,ent.y-target.y)<12,name+' misses its street frontage');
}
const formationCode=source.slice(source.indexOf('  function clearSquadFormation('),source.indexOf('  function pointSegmentDistance('));
const f=new Function('TOWN_MAP',geometry+body('pointInPoly')+nav+body('moveEntity')+body('updateFacing')+`let squad=[],squadFormation={active:false},pickups=[],squadGrenades=5;const selectedUnits=()=>squad.filter(s=>s.alive),setStatus=()=>{};`+formationCode+body('resolveSquadSpacing')+body('updateSquad')+body('setMoveTargets')+`;return {setMoveTargets,updateSquad,get squad(){return squad},get grenades(){return squadGrenades},get pickups(){return pickups},setGrenades(n){squadGrenades=n},addPickup(type){pickups.push({type,x:squad[0].x,y:squad[0].y,active:true})},reset(){squad=TOWN_MAP.spawns.squad.map(([x,y])=>({x:x*2,y:y*2,alive:true,dir:-Math.PI/2,fireTimer:0,cooldown:0,flash:0,fireHeat:0,hp:8,maxHp:8}));squadFormation={active:false};pickups=[];squadGrenades=5;}};`)(map);
for(const [name,p] of Object.entries(map.pois)){
 f.reset();const target={x:p.approach[0]*2,y:p.approach[1]*2};f.setMoveTargets(target);for(let i=0;i<5000;i++)f.updateSquad(1/30);
 const distances=f.squad.map(s=>Math.round(Math.hypot(s.x-target.x,s.y-target.y)));assert(distances.every(d=>d<=160),name+' stranded follower '+distances);assert(f.squad.every(s=>!q.obstacleAt(s.x,s.y,4)));
}
let checked=0;
for(const r of map.roads.filter(r=>['King Street','King Street West','Wallgate','Market Place','Standishgate','Market Street','New Market Street','Crompton Street','Library Street','Millgate','Hallgate','Coopers Row'].includes(r.name))){
 const p=r.points[Math.floor(r.points.length/2)],x=p[0]*2,y=p[1]*2;assert(!q.obstacleAt(x,y,4),'Blocked street '+r.name);const route=q.findPath(start.x,start.y,x,y);assert(route.length,'Unreachable street '+r.name);checked++;
}
for(const [key,z] of Object.entries(map.zones)){assert(map.pois[key].approach);assert.equal(z.x,map.pois[key].approach[0]);assert.equal(z.y,map.pois[key].approach[1]);}
const scope={window:{},localStorage:{getItem:()=>null,setItem(){}}};
vm.runInNewContext(fs.readFileSync(path.join(root,'campaign.js'),'utf8'),scope);
const mission=scope.window.BadFodderCampaign.missions[1];
assert.deepEqual(Array.from(mission.phases,p=>p.zone),['tudor','grandArcade','wallgate']);assert.equal(mission.phases.length,3);
const evaluator=new Function('map','const S=n=>n*2;const zones=Object.fromEntries(Object.entries(map.zones).map(([k,z])=>[k,{x:z.x*2,y:z.y*2,r:z.r*2}]));let enemies=[];'+body('pointInCircle')+body('phaseZone')+body('phaseEvaluation')+';return{phaseEvaluation,setEnemies(e){enemies=e}};')(map);
for(const phase of mission.phases){
 const z=map.zones[phase.zone],at={x:z.x*2,y:z.y*2};
 evaluator.setEnemies([]);assert(evaluator.phaseEvaluation(phase,[at],0).complete,phase.zone+' does not complete at its frontage');
 assert(!evaluator.phaseEvaluation(phase,[{x:0,y:0}],0).complete,'An objective completes before arrival');
 if(phase.type==='secure-zone'){
  evaluator.setEnemies([{...at,alive:true}]);assert(!evaluator.phaseEvaluation(phase,[at],1).complete,'A defended sector completes too early');
  evaluator.setEnemies([{x:0,y:0,alive:true}]);assert(evaluator.phaseEvaluation(phase,[at],1).complete,'A distant sector prevents local clearance');
 }
 if(phase.type==='eliminate-and-reach')assert(!evaluator.phaseEvaluation(phase,[at],1).complete,'Final extraction ignores remaining hostiles');
}
f.reset();f.addPickup('ammo');f.updateSquad(0);assert.equal(f.grenades,7);assert(!f.pickups[0].active);
f.addPickup('ammo');f.updateSquad(0);assert.equal(f.grenades,8);f.addPickup('ammo');f.updateSquad(0);assert(f.pickups.at(-1).active,'A full grenade reserve wastes a supply crate');
f.setGrenades(4);f.updateSquad(0);assert.equal(f.grenades,6);
f.reset();f.addPickup('med');f.updateSquad(0);assert(f.pickups[0].active,'Healthy soldiers waste a medical crate');f.squad[0].hp=2;f.updateSquad(0);assert.equal(f.squad[0].hp,6);assert(!f.pickups[0].active);
vm.runInNewContext(fs.readFileSync(path.join(root,'wigan-details.js'),'utf8'),scope);
const before=JSON.stringify(map),details=scope.window.BadFodderWiganDetails.prepare(map);assert.equal(JSON.stringify(map),before,'Scenery mutates geographic data');
assert(details.props.length>30&&details.buildings.size>30);
const inPoly=new Function(body('pointInPoly')+';return pointInPoly;')();
for(const p of details.props){assert(Number.isFinite(p.x)&&Number.isFinite(p.y));assert(!map.buildings.some(b=>inPoly(p.x/2,p.y/2,b.points)),'Street furniture inside a building');}
for(const key of Object.keys(expected))assert(details.buildings.has(expected[key]),'Missing distinctive frontage '+key);
const rectangle=(x,y,w,h)=>({points:[[x,y],[x+w,y],[x+w,y+h],[x,y+h],[x,y]]});
const ring={key:'wigan',width:120,height:120,buildings:[rectangle(20,20,80,10),rectangle(20,90,80,10),rectangle(20,30,10,60),rectangle(90,30,10,60)]};
const courtyard=makeNavigation(ring);assert.equal(courtyard.findPath(20,120,120,120).length,0,'An enclosed courtyard is reachable');const components=courtyard.components;
for(let i=0;i<50;i++)assert.equal(courtyard.findPath(20+i%5,120,120+i%5,120).length,0);
assert.equal(courtyard.components,components,'Disconnected goals rebuild the same components');
assert(courtyard.findPath(20,120,50,120).length,'Clicking a roof loses its reachable outside approach');
const open=makeNavigation({...ring,buildings:ring.buildings.slice(0,2).concat(rectangle(20,30,10,24),rectangle(20,66,10,24),rectangle(90,30,10,60))});
assert(open.findPath(20,120,120,120).length,'A courtyard with an open alley is rejected');
console.log('PASS: real Wigan landmark IDs, 180-degree gameplay orientation, Tudor start, bounded footprints; individual and full-squad routes to all '+Object.keys(map.pois).length+' frontages and '+checked+' town-centre street segments.');
console.log('PASS: three Tudor-to-town-centre-to-stations objectives, final clearance gate, useful supplies, unchanged geography and '+details.props.length+' curb props.');
console.log('PASS: cached disconnected courtyards, roof-click approaches and open-alley connectivity.');
