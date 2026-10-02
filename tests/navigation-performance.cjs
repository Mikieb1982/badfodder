'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..');
const Navigation=require('../navigation.js');

function loadBad(){
  return new Function(
    fs.readFileSync(path.join(root,'town-map.js'),'utf8')+'\n'+
    fs.readFileSync(path.join(root,'bad-belzig-data.js'),'utf8')+
    ';return TOWN_MAP;'
  )();
}
function loadWigan(){
  return new Function(fs.readFileSync(path.join(root,'wigan-map.js'),'utf8')+';return WIGAN_MAP;')();
}
function scaleBuildings(map){
  return map.buildings.map((b,i)=>{
    const points=b.points.map(p=>[p[0]*2,p[1]*2]),xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);
    return{i,solid:b.solid!==false,points,minX:Math.min(...xs),maxX:Math.max(...xs),minY:Math.min(...ys),maxY:Math.max(...ys)};
  });
}
function makeNav(map){
  return Navigation.create({
    worldWidth:map.width*2,
    worldHeight:map.height*2,
    buildings:scaleBuildings(map),
    mapKey:map.key
  });
}
function targets(map){
  const out=[];
  if(map.zones){
    for(const z of Object.values(map.zones))out.push([z.x*2,z.y*2]);
  }else{
    out.push([map.pois.postcolumn.x*2,map.pois.postcolumn.y*2]);
    out.push([map.pois.castle.x*2,map.pois.castle.y*2]);
    out.push([map.pois.market.x*2,map.pois.market.y*2]);
  }
  for(const p of Object.values(map.pois)){
    const a=p.approach||[p.x,p.y];
    out.push([a[0]*2,a[1]*2]);
  }
  return out;
}
function exercise(map){
  const nav=makeNav(map);
  const start=map.spawns.squad[0].map(v=>v*2);
  const list=targets(map);
  for(let round=0;round<3;round++){
    for(const [x,y] of list)nav.findPath(start[0],start[1],x,y);
  }
  const before=nav.metrics();
  // Repeat a disconnected/blocked target pattern to ensure connected-area caching is reused.
  for(let i=0;i<20;i++)nav.findPath(start[0],start[1],-40-i,-40-i);
  const after=nav.metrics();

  const cells=nav.PATH_COLS*nav.PATH_ROWS;
  assert(after.maxExpanded<cells*.75,map.key+' search expanded too much of the grid');
  assert(after.componentBuilds<=before.componentBuilds+2,map.key+' rebuilt connected components during repeated failed searches');
  assert(after.findCalls===before.findCalls+20,map.key+' metrics lost repeated search calls');
  assert(after.blockedCache>0&&after.edgeCache>0,map.key+' navigation caches are not active');
  return after;
}

const bad=exercise(loadBad());
const wigan=exercise(loadWigan());

console.log('PASS: pathfinding workload remains bounded and connected-area caches are reused on Bad Belzig and Wigan.');
console.log('Bad Belzig metrics: '+JSON.stringify(bad));
console.log('Wigan metrics: '+JSON.stringify(wigan));
