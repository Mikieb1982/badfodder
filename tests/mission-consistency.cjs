'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),vm=require('node:vm');
const root=path.join(__dirname,'..');
const source=fs.readFileSync(path.join(root,'index.html'),'utf8');

function body(name){
  const start=source.indexOf('  function '+name+'('),open=source.indexOf('{',start);
  assert(start>=0&&open>=0,'Missing function '+name);
  let depth=1,end=open+1;
  for(;depth&&end<source.length;end++){if(source[end]==='{')depth++;if(source[end]==='}')depth--;}
  return source.slice(start,end);
}

const map=new Function(
  fs.readFileSync(path.join(root,'town-map.js'),'utf8')+'\n'+
  fs.readFileSync(path.join(root,'bad-belzig-data.js'),'utf8')+
  ';return TOWN_MAP;'
)();

assert.equal(map.key,'bad-belzig');
assert.equal(map.spawns.enemies.length,20);
assert.equal(map.spawns.squad.length,4);
assert(map.spawns.pickups.every(p=>p.type==='grenade'||p.type==='med'),'Bad Belzig has misleading supply types');
assert(map.spawns.pickups.filter(p=>p.type==='grenade').every(p=>p.amount>0));

const geometry=`const MAP_DATA=TOWN_MAP;const WORLD_W=TOWN_MAP.width*2,WORLD_H=TOWN_MAP.height*2;const S=n=>n*2;const buildings=TOWN_MAP.buildings.map((b,i)=>{const points=b.points.map(p=>p.map(v=>v*2));return{i,points,minX:Math.min(...points.map(p=>p[0])),maxX:Math.max(...points.map(p=>p[0])),minY:Math.min(...points.map(p=>p[1])),maxY:Math.max(...points.map(p=>p[1]))};});`;
const nav=source.slice(source.indexOf('  const CELL=150;'),source.indexOf('  function pointInCircle('));
const q=new Function(
  'TOWN_MAP',
  geometry+body('pointInPoly')+nav+body('moveEntity')+body('updateFacing')+
  ';return {obstacleAt,pathComponent,findPath,PATH_CELL};'
)(map);

const start=map.spawns.squad[0],startComponent=q.pathComponent(Math.floor(start[0]*2/q.PATH_CELL),Math.floor(start[1]*2/q.PATH_CELL));
assert(startComponent>0);

function checkSpawn(kind,p,i,r){
  const x=(Array.isArray(p)?p[0]:p.x)*2,y=(Array.isArray(p)?p[1]:p.y)*2;
  assert(!q.obstacleAt(x,y,r),kind+' '+i+' is inside blocked scenery');
  const component=q.pathComponent(Math.floor(x/q.PATH_CELL),Math.floor(y/q.PATH_CELL));
  assert.equal(component,startComponent,kind+' '+i+' is disconnected from squad start');
}
map.spawns.squad.forEach((p,i)=>checkSpawn('Squad spawn',p,i,6));
map.spawns.enemies.forEach((p,i)=>checkSpawn('Enemy spawn',p,i,6));
map.spawns.civilians.forEach((p,i)=>checkSpawn('Civilian spawn',p,i,4));
map.spawns.pickups.forEach((p,i)=>checkSpawn('Supply spawn',p,i,4));


assert(source.includes('const pathComponents=new Int32Array(PATH_COLS*PATH_ROWS);'),'Connected-area cache must apply to both playable maps');
assert(!source.includes("filter(e=>!obstacleAt(e.x,e.y,12))"),'Invalid enemy spawns must not be silently deleted');

const scope={window:{},localStorage:{getItem:()=>null,setItem(){}}};
vm.runInNewContext(fs.readFileSync(path.join(root,'campaign.js'),'utf8'),scope);
const badMission=scope.window.BadFodderCampaign.missions[0];
const wiganMission=scope.window.BadFodderCampaign.missions[1];
assert.equal(badMission.phases[0].defenderGroup,'post');
assert.equal(badMission.phases[1].defenderGroup,'castle');
assert.equal(badMission.phases[2].defenderGroup,'market');
assert(badMission.phases.every(p=>p.hold>0),'Every Bad Belzig encounter should require a short secure hold');
assert.equal(wiganMission.phases[0].defenderGroup,'tudor');
assert.equal(wiganMission.phases[1].defenderGroup,'grandArcade');
assert.equal(wiganMission.phases[2].defenderGroup,'wallgate');

for(const [name,indices] of Object.entries(map.defenderGroups)){
  assert(indices.length,name+' defender group is empty');
  for(const i of indices)assert(i>=0&&i<map.spawns.enemies.length,name+' defender index out of range');
}

const zones={
  post:{x:map.pois.postcolumn.x*2,y:map.pois.postcolumn.y*2,r:46*2},
  castle:{x:map.pois.castle.x*2,y:map.pois.castle.y*2,r:82*2},
  market:{x:map.pois.market.x*2,y:map.pois.market.y*2,r:86*2}
};

for(const [name,z] of Object.entries(zones)){
  const route=q.findPath(start[0]*2,start[1]*2,z.x,z.y);
  assert(route.length,'Bad Belzig objective '+name+' is unreachable from the mission start');
}
const evaluator=new Function(
  'zones',
  'const S=n=>n*2;let enemies=[];'+
  body('pointInCircle')+body('phaseZone')+body('phaseDefenders')+body('phaseEvaluation')+
  ';return{phaseEvaluation,setEnemies(e){enemies=e}};'
)(zones);

for(const phase of badMission.phases.filter(p=>p.defenderGroup)){
  const z=zones[phase.zone],at={x:z.x,y:z.y};
  evaluator.setEnemies([{x:z.x,y:z.y,alive:true,objectiveGroup:phase.defenderGroup}]);
  assert(!evaluator.phaseEvaluation(phase,[at],1).ready,phase.defenderGroup+' assigned defender is ignored');

  evaluator.setEnemies([{x:0,y:0,alive:true,objectiveGroup:'unrelated'}]);
  const clear=evaluator.phaseEvaluation(phase,[at],1);
  assert(clear.ready,'A distant unrelated enemy blocks '+phase.defenderGroup);
  assert(!clear.complete,'A held objective completes instantly without its secure timer');

  evaluator.setEnemies([{x:z.x,y:z.y,alive:true,objectiveGroup:'unrelated'}]);
  const contested=evaluator.phaseEvaluation(phase,[at],1);
  assert(!contested.ready,'A nearby hostile does not contest '+phase.defenderGroup);
}

const formationCode=source.slice(source.indexOf('  function clearSquadFormation('),source.indexOf('  function pointSegmentDistance('));
const supplies=new Function(
  'TOWN_MAP',
  geometry+body('pointInPoly')+nav+body('moveEntity')+body('updateFacing')+
  `let squad=[],squadFormation={active:false},pickups=[],squadGrenades=5;
   const selectedUnits=()=>squad.filter(s=>s.alive),setStatus=()=>{};
  `+
  formationCode+body('resolveSquadSpacing')+body('updateSquad')+
  `;return{
    updateSquad,
    get squad(){return squad},
    get grenades(){return squadGrenades},
    get pickups(){return pickups},
    setGrenades(n){squadGrenades=n},
    addPickup(type,amount){pickups.push({type,amount,x:squad[0].x,y:squad[0].y,active:true})},
    reset(){
      squad=TOWN_MAP.spawns.squad.map(([x,y])=>({x:x*2,y:y*2,alive:true,dir:-Math.PI/2,fireTimer:0,cooldown:0,flash:0,fireHeat:0,damageGrace:0,hp:8,maxHp:8}));
      squadFormation={active:false};pickups=[];squadGrenades=5;
    }
  };`
)(map);

supplies.reset();
supplies.addPickup('med',4);
supplies.updateSquad(0);
assert(supplies.pickups[0].active,'Healthy soldier should leave medkit available');
supplies.squad[0].hp=2;
supplies.updateSquad(0);
assert.equal(supplies.squad[0].hp,6);
assert(!supplies.pickups[0].active,'Injured soldier should consume medkit');

supplies.reset();
supplies.setGrenades(8);
supplies.addPickup('grenade',2);
supplies.updateSquad(0);
assert(supplies.pickups[0].active,'Full grenade reserve should leave supply available');
supplies.setGrenades(5);
supplies.updateSquad(0);
assert.equal(supplies.grenades,7);
assert(!supplies.pickups[0].active,'Grenade supply should be consumed when useful');

console.log('PASS: Bad Belzig mission data is externalised, objective routes are reachable, and compulsory encounters use assigned defenders plus secure holds.');
console.log('PASS: medkits wait for injury, grenade supplies are explicit, full reserves do not waste crates, and connected-area caching is shared.');
