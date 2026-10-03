'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..');
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
const wiganSource=fs.readFileSync(path.join(root,'wigan-map.js'),'utf8');
const scenery=fs.readFileSync(path.join(root,'wigan-scenery.js'),'utf8');
const menu=fs.readFileSync(path.join(root,'menu-ui.js'),'utf8');
const navigation=fs.readFileSync(path.join(root,'navigation.js'),'utf8');
const map=new Function(wiganSource+';return WIGAN_MAP;')();

assert(index.includes('function intersectsSceneryBounds'),'Scenery bounds culling missing');
assert(index.includes("if(r.points.length<2||!intersectsSceneryBounds(r,S(24)))return"),'Road tiles are not culled before painting');
assert(index.includes("if(!intersectsSceneryBounds(a,S(10)))return"),'Area tiles are not culled before painting');
assert(index.includes('const TREE_CELL=S(80),treeGrid=new Map()'),'Vegetation spatial index missing');
assert(index.includes('treeIndexesInBounds(bounds,90)'),'Vegetation painting still scans the complete map');

assert(index.includes('function queueEnemyPath'),'Enemy path queue missing');
assert(index.includes('function processEnemyPathQueue'),'Enemy path queue processor missing');
assert(index.includes('const budget=LOW_POWER?1:2'),'Enemy pathfinding is not frame-budgeted');
assert(index.includes('processEnemyPathQueue();'),'Queued enemy paths are not processed by the simulation');
assert(!index.includes('assignPath(e,retreat.x,retreat.y)'),'Retreat pathfinding bypasses the queue');
assert(!index.includes('assignPath(e,e.lastSeen.x,e.lastSeen.y)'),'Search pathfinding bypasses the queue');

const tickStart=index.indexOf('  function tick(now){');
const tickEnd=index.indexOf('  async function startGame()',tickStart);
const tick=index.slice(tickStart,tickEnd);
assert(tick.indexOf('requestAnimationFrame(tick);')>=0,'Animation loop does not schedule another frame');
assert(tick.indexOf('requestAnimationFrame(tick);')<tick.indexOf('try{'),'Animation loop schedules too late and can hard-freeze after an exception');
assert(tick.includes('catch(err)')&&tick.includes('handleRuntimeFault(err)'),'Animation loop does not recover from runtime exceptions');
assert(index.includes("menu.showRecovery("),'Repeated runtime faults do not enter the dedicated recovery menu');
assert(menu.includes("showRecovery(message="),'Menu controller has no runtime recovery state');
assert(menu.includes("this.get('menuResume').hidden=true"),'Runtime recovery incorrectly offers Resume');
assert(index.includes("if(!canResumeMission())return"),'Resume must reject stopped or invalid sessions');

function geometryBounds(points){
  const xs=points.map(p=>p[0]*2),ys=points.map(p=>p[1]*2);
  return{minX:Math.min(...xs),maxX:Math.max(...xs),minY:Math.min(...ys),maxY:Math.max(...ys)};
}
const roads=map.roads.map(r=>geometryBounds(r.points)),tile=512,counts=[];
for(let y=0;y<map.height*2;y+=tile)for(let x=0;x<map.width*2;x+=tile){
  const w=Math.min(tile,map.width*2-x),h=Math.min(tile,map.height*2-y),margin=48;
  counts.push(roads.filter(r=>!(
    r.maxX<x-margin||r.minX>x+w+margin||r.maxY<y-margin||r.minY>y+h+margin
  )).length);
}
const average=counts.reduce((a,b)=>a+b,0)/counts.length;
assert(average<map.roads.length*.12,'Wigan tile culling still visits too much of the road network on average: '+average.toFixed(1));
assert(Math.max(...counts)<map.roads.length*.2,'A Wigan tile still visits too much of the complete road network');

assert(scenery.includes("map.projection&&map.projection.northUp===false?'N ↓':'N ↑'"),'Rotated Wigan tactical map has an incorrect north indicator');
assert(scenery.includes("function roundRectPath("),'Wigan overlay has no Canvas roundRect compatibility fallback');
assert(index.includes("Scenery tile rendering failed; using a lightweight fallback tile."),'Tile-render exceptions can still take down live play');
assert(index.includes("wigan-scenery.js?v=20261003-upgrade-1"),'Wigan runtime fix is not cache-busted');
assert(index.includes("navigation.js?v=20261003-upgrade-1"),'Navigation runtime fix is not cache-busted');
assert(navigation.includes("fallbackDepth<1"),'Navigation fallback recursion is not bounded');
assert(navigation.includes("if(d<1e-6)"),'Zero-distance path steps are not guarded');
assert(navigation.includes("function registerDynamicObstacle"),'Dynamic obstacle registration API missing');
assert(navigation.includes("pathComponents.fill(0)"),'Dynamic obstacle changes do not invalidate connected-area cache');
assert(navigation.includes("ent.pathVersion!==navigationVersion"),'Actors do not detect stale paths after dynamic navigation changes');

console.log('PASS: Wigan tile painting is spatially culled, vegetation is indexed and enemy A* work is staggered.');
console.log('PASS: animation-loop exceptions cannot silently kill requestAnimationFrame; recovery cannot Resume into a stopped loop.');
console.log('PASS: Wigan road work per tile averages '+average.toFixed(1)+' of '+map.roads.length+' roads.');
