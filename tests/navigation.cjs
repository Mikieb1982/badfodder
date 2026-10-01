const fs=require('node:fs'),assert=require('node:assert/strict');
const path=require('node:path');
const root=path.join(__dirname,'..');
const source=fs.readFileSync(path.join(root,'index.html'),'utf8');
const map=new Function(fs.readFileSync(path.join(root,'town-map.js'),'utf8')+';return TOWN_MAP;')();
function body(name){const start=source.indexOf('  function '+name+'('),open=source.indexOf('{',start);let depth=1,end=open+1;for(;depth&&end<source.length;end++){if(source[end]==='{')depth++;if(source[end]==='}')depth--;}return source.slice(start,end);}

const geometry=`const WORLD_W=TOWN_MAP.width*2,WORLD_H=TOWN_MAP.height*2;const buildings=TOWN_MAP.buildings.map((b,i)=>{const points=b.points.map(p=>p.map(v=>v*2));return{i,points,minX:Math.min(...points.map(p=>p[0])),maxX:Math.max(...points.map(p=>p[0])),minY:Math.min(...points.map(p=>p[1])),maxY:Math.max(...points.map(p=>p[1]))};});`;
const nav=source.slice(source.indexOf('  const CELL=150;'),source.indexOf('  function pointInCircle('));
const q=new Function('TOWN_MAP',geometry+body('pointInPoly')+nav+body('moveEntity')+body('updateFacing')+';return {findPath,routeClear,followPath,assignPath,obstacleAt};')(map);

const start={x:1572,y:2900};
for(const [name,p] of Object.entries(map.pois)){
 const ent={...start,alive:true},target={x:p.x*2,y:p.y*2},path=q.findPath(ent.x,ent.y,target.x,target.y);
 let ax=ent.x,ay=ent.y;for(const w of path){assert(q.routeClear(ax,ay,w.x,w.y,6),name+' invalid segment');ax=w.x;ay=w.y;}
 q.assignPath(ent,target.x,target.y);for(let i=0;i<7000&&ent.path;i++)q.followPath(ent,185,1/30);
 assert(path.length,name+' unreachable');assert(!ent.path,name+' stuck');assert(Math.hypot(ent.x-target.x,ent.y-target.y)<=70,name+' approach too far from POI');assert(!q.obstacleAt(ent.x,ent.y,6),name+' finishes inside a building');
}

const formationCode=source.slice(source.indexOf('  function clearSquadFormation('),source.indexOf('  function pointSegmentDistance('));
const formation=new Function('TOWN_MAP',geometry+body('pointInPoly')+nav+body('moveEntity')+body('updateFacing')+`let squad=[],squadFormation={active:false},pickups=[];const selectedUnits=()=>squad.filter(s=>s.alive),setStatus=()=>{};`+formationCode+body('resolveSquadSpacing')+body('updateSquad')+body('setMoveTargets')+`;return {setMoveTargets,updateSquad,get squad(){return squad},reset(){squad=Array.from({length:4},(_,i)=>({x:1572+(i%2)*34,y:2900+Math.floor(i/2)*34,alive:true,dir:-Math.PI/2,fireTimer:0,cooldown:0,flash:0,fireHeat:0,hp:5,maxHp:5}));squadFormation={active:false};}};`)(map);
for(const [name,p] of Object.entries(map.pois)){
 formation.reset();const target={x:p.x*2,y:p.y*2};formation.setMoveTargets(target);
 for(let i=0;i<5000;i++)formation.updateSquad(1/30);
 const distances=formation.squad.map(s=>Math.round(Math.hypot(s.x-target.x,s.y-target.y)));
 assert(distances.every(d=>d<=160),name+' stranded follower: '+distances.join(', '));assert(formation.squad.every(s=>!q.obstacleAt(s.x,s.y,6)),name+' follower enters a building');
}
let checked=0;
for(const road of map.roads){
 const point=road.points[Math.floor(road.points.length/2)];if(!point)continue;
 const route=q.findPath(start.x,start.y,point[0]*2,point[1]*2);assert(route.length,'No route to street '+road.name);let x=start.x,y=start.y;
 for(const w of route){assert(q.routeClear(x,y,w.x,w.y,6),'Street route crosses a footprint: '+road.name);x=w.x;y=w.y;}checked++;
}
console.log('PASS: individual and full-squad travel to all '+Object.keys(map.pois).length+' POIs; '+checked+' mapped street destinations; collision-safe route segments and arrival.');
