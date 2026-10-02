'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),path=require('node:path');
const root=path.join(__dirname,'..');
const {create}=require('../navigation.js');
const map=new Function(fs.readFileSync(path.join(root,'town-map.js'),'utf8')+';return TOWN_MAP;')();

function scaledBuildings(map){
  return map.buildings.map((b,i)=>{
    const points=b.points.map(p=>[p[0]*2,p[1]*2]),xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);
    return{i,solid:b.solid!==false,points,minX:Math.min(...xs),maxX:Math.max(...xs),minY:Math.min(...ys),maxY:Math.max(...ys)};
  });
}

let q;
function updateFacing(ent,dx,dy){if(Math.abs(dx)>.001||Math.abs(dy)>.001)ent.dir=Math.atan2(dy,dx)}
function moveEntity(ent,dx,dy,r=6){
  const nx=Math.max(r,Math.min(map.width*2-r,ent.x+dx));
  if(!q.obstacleAt(nx,ent.y,r))ent.x=nx;
  const ny=Math.max(r,Math.min(map.height*2-r,ent.y+dy));
  if(!q.obstacleAt(ent.x,ny,r))ent.y=ny;
}
q=create({worldWidth:map.width*2,worldHeight:map.height*2,buildings:scaledBuildings(map),mapKey:'bad-belzig',moveEntity,updateFacing});

const start={x:1572,y:2900};
for(const [name,p] of Object.entries(map.pois)){
  const ent={...start,alive:true},target={x:p.x*2,y:p.y*2},route=q.findPath(ent.x,ent.y,target.x,target.y);
  assert(route.length,name+' unreachable');
  let ax=ent.x,ay=ent.y;
  for(const waypoint of route){
    assert(q.routeClear(ax,ay,waypoint.x,waypoint.y,6),name+' invalid segment');
    ax=waypoint.x;ay=waypoint.y;
  }
  q.assignPath(ent,target.x,target.y);
  for(let i=0;i<7000&&ent.path;i++)q.followPath(ent,185,1/30);
  assert(!ent.path,name+' stuck');
  assert(Math.hypot(ent.x-target.x,ent.y-target.y)<=70,name+' approach too far from POI');
  assert(!q.obstacleAt(ent.x,ent.y,6),name+' finishes inside a building');
}

let checked=0;
for(const road of map.roads){
  const point=road.points[Math.floor(road.points.length/2)];
  if(!point)continue;
  const route=q.findPath(start.x,start.y,point[0]*2,point[1]*2);
  assert(route.length,'No route to street '+road.name);
  let x=start.x,y=start.y;
  for(const waypoint of route){
    assert(q.routeClear(x,y,waypoint.x,waypoint.y,6),'Street route crosses a footprint: '+road.name);
    x=waypoint.x;y=waypoint.y;
  }
  checked++;
}

const metrics=q.metrics();
const totalCells=q.PATH_COLS*q.PATH_ROWS;
assert(metrics.findCalls>=checked,'Navigation metrics did not record searches');
assert(metrics.maxExpanded<totalCells*.7,'A path search expanded an excessive fraction of the whole map: '+metrics.maxExpanded+'/'+totalCells);
assert(metrics.componentBuilds<=6,'Connected-area cache rebuilt too many components: '+metrics.componentBuilds);
assert(metrics.edgeCache>0&&metrics.blockedCache>0,'Navigation caches were not populated');

console.log('PASS: exported navigation reaches all '+Object.keys(map.pois).length+' POIs and '+checked+' mapped streets with collision-safe segments.');
console.log('PASS: navigation workload metrics: '+JSON.stringify(metrics));
