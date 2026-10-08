'use strict';
const assert=require('node:assert/strict');
const Adaptive=require('../adaptive-director.js');
const Fortification=require('../checkpoint-fortification.js');
const WaveConfig=require('../checkpoint-wave-config.js');
Fortification.patchAdaptive(Adaptive);

function angleDiff(a,b){return Math.abs(Math.atan2(Math.sin(a-b),Math.cos(a-b)))}
function fixture(checkpoint,index=0,canGarrison=()=>true){
  const zone={x:500,y:500,r:90};
  const phase={index,type:index===2?'eliminate-and-reach':'secure-zone',zone:'poi',defenderGroup:'poi-'+index,checkpoint};
  const template={x:100,y:100,homeX:100,homeY:100,variant:0,hp:3,maxHp:3,alive:false,phase:0,cooldown:.3,alert:false,lastSeen:null,aiState:'patrol',flash:0,dir:0,anim:0,state:'idle',fireTimer:0,deadTimer:0,deathAngle:0,path:null,pathIndex:0,repath:0,hitTimer:0,groupId:'initial',objectiveGroup:phase.defenderGroup,role:'anchor',tacticTimer:.2,tacticalPoint:null,burstCount:0,burstLimit:2,burstPause:0,searchTimer:0,reactionTimer:0,cueTimer:0,alertCue:'',pathQueued:false,pendingPath:null};
  const enemies=[template];
  const squad=[0,1,2,3].map(i=>({x:zone.x+(i-1.5)*8,y:zone.y+20,alive:true,hp:8,maxHp:8,path:null,target:null}));
  const roads=[
    {kind:'road',name:'north',points:[[500,40],[500,960]]},
    {kind:'road',name:'cross',points:[[40,500],[960,500]]},
    {kind:'road',name:'diag',points:[[80,80],[920,920]]},
    {kind:'road',name:'other-diag',points:[[920,80],[80,920]]}
  ];
  const queued=[];
  const navigation={PATH_CELL:20,pathComponent:()=>1};
  const commander=Adaptive.createCommander({getEnemies:()=>enemies,getSquad:()=>squad,getPhase:()=>phase,getZones:()=>({poi:zone}),roads,scale:1,navigation,canGarrison,blocked:()=>false,queuePath:(e,x,y)=>{queued.push({e,x,y});e.pathQueued=true}});
  return{zone,phase,enemies,squad,queued,commander};
}

function baseScenario(style,count,index=0){
  const f=fixture({style,count},index);f.commander.maintain(1);
  const wave=f.enemies.filter(e=>e.checkpointWave);
  assert.equal(wave.length,count,style+' wave count');
  assert(wave.every(e=>e.objectiveGroup===f.phase.defenderGroup&&e.checkpointPhase===index),style+' attackers must block the active checkpoint');
  assert.equal(f.commander.checkpointState().started,true,style+' checkpoint did not start');
  assert.equal(f.commander.checkpointState().cleared,false,style+' checkpoint cleared before attackers were defeated');
  assert(f.squad.every(s=>s.checkpointGarrison===index&&s.checkpointCover&&s.checkpointFortified),style+' squad was not placed into checkpoint fortification');
  assert.equal(f.squad.filter(s=>s.checkpointFortificationRearLead).length,1,style+' sandbag ring needs one rear render leader');
  assert.equal(f.squad.filter(s=>s.checkpointFortificationFrontLead).length,1,style+' sandbag ring needs one front render leader');
  const cx=f.squad[0].checkpointCenterX,cy=f.squad[0].checkpointCenterY,sandbagRadius=f.squad[0].checkpointSandbagRadius;
  const radii=f.squad.map(s=>Math.hypot(s.x-cx,s.y-cy));
  assert(radii.every(r=>r<=11.01),style+' squad is not crowded into the tight back-to-back circle');
  assert(sandbagRadius>Math.max(...radii)+10,style+' sandbags do not surround the squad');
  for(const s of f.squad){const outward=Math.atan2(s.y-cy,s.x-cx);assert(angleDiff(s.dir,outward)<.001,style+' defender is not facing outward')}
  assert(f.queued.length>=count,style+' attackers did not receive paths');
  const groupIds=new Set(wave.map(e=>e.groupId));
  if(style==='rush')assert.equal(groupIds.size,1,'Rush should be one concentrated group');
  if(style==='pincer')assert.equal(groupIds.size,2,'Pincer should attack from two groups');
  if(style==='siege')assert.equal(groupIds.size,3,'Siege should use three groups');
  wave.forEach(e=>e.alive=false);f.commander.maintain(2);
  assert.equal(f.commander.checkpointState().cleared,true,style+' checkpoint did not clear after wave defeat');
  assert(f.squad.every(s=>s.checkpointHeld===index&&s.checkpointFortified),style+' fortification should remain through the checkpoint hold');
}

baseScenario('rush',3,0);baseScenario('pincer',4,1);baseScenario('siege',5,2);

{
  const f=fixture({style:'pincer',count:8,intermission:.45,waves:[{style:'pincer',count:16},{style:'siege',count:18}]},1);
  f.commander.maintain(1);assert.equal(f.enemies.filter(e=>e.alive&&e.checkpointWave).length,8);
  f.enemies.filter(e=>e.checkpointWave).forEach(e=>e.alive=false);
  f.commander.maintain(2);assert.equal(f.commander.checkpointState().cleared,true);
  f.commander.maintain(3);
  let live=f.enemies.filter(e=>e.alive&&e.checkpointExtra);
  assert.equal(live.length,16,'Second checkpoint did not launch its larger pincer wave');
  assert.equal(new Set(live.map(e=>e.groupId)).size,2,'Checkpoint reinforcement should attack as a pincer');
  assert(live.every(e=>e.checkpointAggressive&&e.cooldown<.4&&e.reactionTimer<.25&&e.burstLimit>=4),'Checkpoint reinforcements should use the aggressive combat profile');
  live.forEach(e=>e.alive=false);f.commander.maintain(4);f.commander.maintain(5);
  live=f.enemies.filter(e=>e.alive&&e.checkpointExtra);
  assert.equal(live.length,18,'Second checkpoint did not launch its final siege wave');
  assert.equal(new Set(live.map(e=>e.groupId)).size,3,'Final checkpoint reinforcement should be a three-pronged siege');
}

{
  const f=fixture({style:'siege',count:8,intermission:.4,waves:[{style:'siege',count:18},{style:'pincer',count:20},{style:'last-stand',count:24}]},2);
  f.commander.maintain(1);let live=f.enemies.filter(e=>e.alive&&e.checkpointWave);assert.equal(live.length,8);
  live.forEach(e=>e.alive=false);f.commander.maintain(2);f.commander.maintain(3);
  live=f.enemies.filter(e=>e.alive&&e.checkpointExtra);assert.equal(live.length,18,'Final stand reinforcement one size');assert.equal(new Set(live.map(e=>e.groupId)).size,3,'Wave two must be a siege');
  live.forEach(e=>e.alive=false);f.commander.maintain(4);f.commander.maintain(5);
  live=f.enemies.filter(e=>e.alive&&e.checkpointExtra);assert.equal(live.length,20,'Final stand reinforcement two size');assert.equal(new Set(live.map(e=>e.groupId)).size,2,'Wave three must be a pincer');
  live.forEach(e=>e.alive=false);f.commander.maintain(6);f.commander.maintain(7);
  live=f.enemies.filter(e=>e.alive&&e.checkpointExtra);assert.equal(live.length,24,'Final stand last wave size');assert.equal(new Set(live.map(e=>e.groupId)).size,4,'Last stand must close from four directions');
}

{
  const fake={missions:['bad-belzig','wigan'].map(map=>({map,playable:true,phases:[{},{},{}]}))};WaveConfig.apply(fake);
  for(const mission of fake.missions){
    assert.equal(mission.phases[0].checkpoint.count,8);assert.deepEqual(mission.phases[0].checkpoint.waves.map(w=>w.count),[14]);
    assert.equal(mission.phases[1].checkpoint.count,8);assert.deepEqual(mission.phases[1].checkpoint.waves.map(w=>w.count),[16,18]);
    assert.equal(mission.phases[2].checkpoint.count,8);assert.deepEqual(mission.phases[2].checkpoint.waves.map(w=>w.count),[18,20,24]);
    assert.equal(mission.phases[2].checkpoint.waves[2].style,'last-stand');
  }
}

{
  const ent={checkpointFortified:true,checkpointCenterX:100,checkpointCenterY:100,checkpointSandbagRadius:30};let fills=0;
  const grad={addColorStop(){}};const ctx={save(){},restore(){},translate(){},rotate(){},beginPath(){},moveTo(){},lineTo(){},quadraticCurveTo(){},closePath(){},fill(){fills++},stroke(){},ellipse(){},fillRect(){},arc(){},setLineDash(){},createLinearGradient(){return grad},set fillStyle(v){},set strokeStyle(v){},set lineWidth(v){}};
  assert(Fortification.drawSandbagRing(ctx,ent,'all'));assert(fills>85,'Sandbag fortification is not drawing the denser three-row detailed bag geometry');
}

console.log('PASS: detailed three-row sandbags, tight outward defence, heavier aggressive checkpoint reinforcements and escalating final stand.');
// A released defender stays free through repeated updates and reinforcement spawns.
{
  const fs=require('node:fs'),vm=require('node:vm');
  const scope={setTimeout,clearTimeout,setInterval,clearInterval};scope.window=scope;
  vm.runInNewContext(fs.readFileSync(require.resolve('../garrison-control.js'),'utf8'),scope);
  const f=fixture({style:'rush',count:3,waves:[{style:'siege',count:6}],intermission:.3});
  f.commander.maintain(1);const unit=f.squad[0],other=f.squad[1];
  assert(scope.BadFodderGarrison.releaseCheckpoint(unit));
  unit.path=[{x:650,y:500}];unit.target={x:650,y:500};
  f.commander.maintain(1.1);f.commander.maintain(1.2);
  assert.equal(unit.checkpointCover,false);assert.equal(unit.checkpointFortified,false);
  assert(unit.path&&unit.target,'Released defender movement was cleared inside the circle');
  assert(other.checkpointCover,'Releasing one defender released an unselected soldier');
  f.enemies.forEach(e=>e.alive=false);f.commander.maintain(2);f.commander.maintain(3);
  assert.equal(unit.checkpointGarrison,null,'Reinforcements recaptured a released defender');
  unit.x=f.zone.x+f.zone.r+10;unit.y=f.zone.y;f.commander.maintain(3.1);
  assert.equal(unit.checkpointExitPhase,null,'Leaving the circle did not re-arm entry');
  assert.equal(unit.checkpointGarrison,null,'Defender outside the circle was captured');
  unit.x=f.zone.x;f.commander.maintain(3.2);
  assert.equal(unit.checkpointGarrison,f.phase.index);assert(unit.checkpointFortified,'Returning defender did not enter sandbags');
}
console.log('PASS: checkpoint release persists inside the circle and through reinforcements, then re-arms after exit and return.');

// Joining, leaving and casualties must not drag existing defenders or the sandbags.
{
 const f=fixture({style:'rush',count:3});f.commander.maintain(1);
 const before=f.squad.map(s=>({x:s.x,y:s.y}));
 for(let tick=0;tick<30;tick++)f.commander.maintain(1+tick*.1);
 f.squad.forEach((s,i)=>assert.deepEqual({x:s.x,y:s.y},before[i],'Occupied slot drifted'));
 f.squad[0].checkpointCover=false;f.squad[0].checkpointGarrison=null;f.squad[0].checkpointExitPhase=0;
 f.squad[1].downed=true;
 f.commander.maintain(5);
 for(const i of [2,3])assert.deepEqual({x:f.squad[i].x,y:f.squad[i].y},before[i],'Remaining defenders shuffled');
 assert(!f.squad[1].checkpointFortified,'Downed soldier retained sandbags');
 const newcomer={x:510,y:520,alive:true};f.squad.push(newcomer);f.commander.maintain(6);
 assert(newcomer.checkpointFortified,'Newcomer did not get an available slot');
 for(const i of [2,3])assert.deepEqual({x:f.squad[i].x,y:f.squad[i].y},before[i],'Joining defender displaced existing slot');
 const defenders=f.squad.filter(s=>s.checkpointFortified);
 for(const s of defenders){assert.equal(s.checkpointAnchorX,s.x);assert.equal(s.checkpointAnchorY,s.y);for(const other of defenders)if(other!==s)assert(Math.hypot(s.x-other.x,s.y-other.y)>=9.99,'Defender slots overlap');}
 const trapped={x:500,y:500,alive:true,checkpointGarrison:0,checkpointCover:true};
 Fortification.arrangeSquad({squad:[trapped],phase:f.phase,zones:{poi:f.zone},blocked:()=>true});
 assert(!trapped.checkpointCover&&!trapped.checkpointFortified&&trapped.checkpointGarrison===null,'Blocked placement created a hard hold');
}
console.log('PASS: stable occupied slots, casualty handling, safe newcomer spacing and blocked-placement release.');

// An explicit move may cross a prepared position without being commandeered en route.
{
 const f=fixture({style:'rush',count:3,waves:[{style:'siege',count:6}],intermission:.3},0,s=>!s.path?.length&&!(s.touchMoveSpeed>0));
 const moving=f.squad[0],touch=f.squad[1];moving.path=[{x:800,y:500}];touch.touchMoveSpeed=120;f.commander.maintain(1);
 assert.equal(moving.checkpointGarrison,undefined);assert(moving.path);assert.equal(touch.checkpointGarrison,undefined);assert(f.squad[2].checkpointCover);
 f.enemies.forEach(e=>e.alive=false);f.commander.maintain(2);f.commander.maintain(3);
 assert.equal(moving.checkpointGarrison,undefined,'Reinforcement cannot interrupt an explicit route');assert(moving.path);assert.equal(touch.checkpointGarrison,undefined);
 moving.path=null;touch.touchMoveSpeed=0;f.commander.maintain(3.1);assert(moving.checkpointCover&&touch.checkpointCover,'Settled arrivals may enter prepared cover');
}
console.log('PASS: direct mouse/touch movement crosses prepared positions without path cancellation or reinforcement recapture.');
