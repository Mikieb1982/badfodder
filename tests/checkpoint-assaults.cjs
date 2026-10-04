'use strict';
const assert=require('node:assert/strict');
const Adaptive=require('../adaptive-director.js');

function scenario(style,count,index=0){
  const zone={x:500,y:500,r:90};
  const phase={index,type:index===2?'eliminate-and-reach':'secure-zone',zone:'poi',defenderGroup:'poi-'+index,checkpoint:{style,count}};
  const template={x:100,y:100,homeX:100,homeY:100,variant:0,hp:3,maxHp:3,alive:false,phase:0,cooldown:.3,alert:false,lastSeen:null,aiState:'patrol',flash:0,dir:0,anim:0,state:'idle',fireTimer:0,deadTimer:0,deathAngle:0,path:null,pathIndex:0,repath:0,hitTimer:0,groupId:'initial',objectiveGroup:phase.defenderGroup,role:'anchor',tacticTimer:.2,tacticalPoint:null,burstCount:0,burstLimit:2,burstPause:0,searchTimer:0,reactionTimer:0,cueTimer:0,alertCue:'',pathQueued:false,pendingPath:null};
  const enemies=[template];
  const squad=[0,1,2,3].map(i=>({x:zone.x+(i-1.5)*8,y:zone.y+20,alive:true,hp:8,maxHp:8,path:null,target:null}));
  const roads=[
    {kind:'road',name:'north',points:[[500,40],[500,960]]},
    {kind:'road',name:'cross',points:[[40,500],[960,500]]},
    {kind:'road',name:'diag',points:[[80,80],[920,920]]}
  ];
  const queued=[];
  const navigation={PATH_CELL:20,pathComponent:()=>1};
  const commander=Adaptive.createCommander({
    getEnemies:()=>enemies,getSquad:()=>squad,getPhase:()=>phase,getZones:()=>({poi:zone}),roads,scale:1,navigation,
    blocked:()=>false,queuePath:(e,x,y)=>{queued.push({e,x,y});e.pathQueued=true}
  });
  commander.maintain(1);
  const wave=enemies.filter(e=>e.checkpointWave);
  assert.equal(wave.length,count,style+' wave count');
  assert(wave.every(e=>e.objectiveGroup===phase.defenderGroup&&e.checkpointPhase===index),style+' attackers must block the active checkpoint');
  assert.equal(commander.checkpointState().started,true,style+' checkpoint did not start');
  assert.equal(commander.checkpointState().cleared,false,style+' checkpoint cleared before attackers were defeated');
  assert(squad.some(s=>s.checkpointGarrison===index&&s.checkpointCover),style+' squad was not placed into checkpoint garrison state');
  assert(queued.length>=count,style+' attackers did not receive paths');
  const groupIds=new Set(wave.map(e=>e.groupId));
  if(style==='rush')assert.equal(groupIds.size,1,'Rush should be one concentrated group');
  if(style==='pincer'){
    assert.equal(groupIds.size,2,'Pincer should attack from two groups');
    assert(wave.some(e=>e.commandOrder?.type==='FLANK_LEFT')&&wave.some(e=>e.commandOrder?.type==='FLANK_RIGHT'),'Pincer styles missing');
  }
  if(style==='siege'){
    assert.equal(groupIds.size,3,'Siege should use three groups');
    assert(wave.some(e=>e.commandOrder?.type==='PRESSURE'),'Siege needs a pinning group');
    assert(wave.some(e=>e.commandOrder?.type==='FLANK_LEFT')&&wave.some(e=>e.commandOrder?.type==='FLANK_RIGHT'),'Siege flanks missing');
  }
  wave.forEach(e=>e.alive=false);
  commander.maintain(2);
  assert.equal(commander.checkpointState().cleared,true,style+' checkpoint did not clear after wave defeat');
  const total=enemies.length;
  commander.maintain(3);
  assert.equal(enemies.length,total,style+' checkpoint wave respawned');
}

scenario('rush',3,0);
scenario('pincer',4,1);
scenario('siege',5,2);
console.log('PASS: checkpoint garrisons spawn bounded rush, pincer and siege waves and only clear after the attackers are defeated.');
