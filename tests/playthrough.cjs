'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),vm=require('node:vm');
const root=path.join(__dirname,'..');
const MissionRules=require('../mission-rules.js');

function loadCampaign(){
  const data={};
  const localStorage={
    getItem:key=>Object.prototype.hasOwnProperty.call(data,key)?data[key]:null,
    setItem:(key,value)=>{data[key]=String(value)}
  };
  const scope={window:{BadFodderHistoricalMissions:require('../historical-missions')},localStorage};
  vm.runInNewContext(fs.readFileSync(path.join(root,'campaign.js'),'utf8'),scope);
  return scope.window.BadFodderCampaign;
}

function loadBadBelzig(){
  return new Function(
    fs.readFileSync(path.join(root,'town-map.js'),'utf8')+'\n'+
    fs.readFileSync(path.join(root,'bad-belzig-data.js'),'utf8')+
    ';return TOWN_MAP;'
  )();
}
function loadWigan(){
  return new Function(fs.readFileSync(path.join(root,'wigan-map.js'),'utf8')+';return WIGAN_MAP;')();
}
function zonesFor(map){
  if(map.zones)return Object.fromEntries(Object.entries(map.zones).map(([k,z])=>[k,{x:z.x*2,y:z.y*2,r:z.r*2}]));
  return{
    post:{x:map.pois.postcolumn.x*2,y:map.pois.postcolumn.y*2,r:46*2},
    castle:{x:map.pois.castle.x*2,y:map.pois.castle.y*2,r:82*2},
    market:{x:map.pois.market.x*2,y:map.pois.market.y*2,r:86*2}
  };
}
function enemySet(map){
  return map.spawns.enemies.map(([x,y],i)=>({
    x:x*2,y:y*2,alive:true,
    objectiveGroup:Object.entries(map.defenderGroups||{}).find(([,ids])=>ids.includes(i))?.[0]||null
  }));
}

function simulateMission(mission,map){
  const zones=zonesFor(map),enemies=enemySet(map);
  let completed=0;
  for(const phase of mission.phases){
    const zone=zones[phase.zone];
    assert(zone,'Missing zone '+phase.zone);
    const living=[{x:zone.x,y:zone.y,alive:true}];

    const blocked=MissionRules.evaluatePhase({phase,living,enemies,zones,scale:2});
    assert(!blocked.ready,'Phase '+phase.title+' is ready while assigned defenders still live');

    for(const enemy of enemies){
      if(enemy.objectiveGroup===phase.defenderGroup)enemy.alive=false;
    }

    const farAmbient=enemies.find(e=>e.alive&&e.objectiveGroup!==phase.defenderGroup);
    if(farAmbient){farAmbient.x=0;farAmbient.y=0}

    const clear=MissionRules.evaluatePhase({phase,living,enemies,zones,scale:2});
    assert(clear.ready,'Phase '+phase.title+' does not become ready after its defenders are cleared');

    let hold=0,complete=false,steps=0;
    while(!complete&&steps<200){
      const result=MissionRules.evaluatePhase({phase,living,enemies,zones,scale:2});
      const progress=MissionRules.advanceHold(phase,result,hold,.1);
      hold=progress.holdTime;complete=progress.complete;steps++;
      if(phase.hold&&hold<phase.hold-.0001)assert(!complete,'Phase '+phase.title+' completes before hold expires');
    }
    assert(complete,'Phase '+phase.title+' never completes');
    completed++;
  }
  assert.equal(completed,3,mission.title+' did not complete all three phases');
}

const campaign=loadCampaign();
const badMission=campaign.missions[0],wiganMission=campaign.missions[1];
simulateMission(badMission,loadBadBelzig());
simulateMission(wiganMission,loadWigan());

assert.equal(campaign.state.current,0);
campaign.complete(0);
assert(campaign.state.completed.includes(0));
assert(campaign.state.unlocked>=1,'Completing Bad Belzig does not unlock Wigan');
campaign.setCurrent(1);
assert.equal(campaign.current().id,'wigan','Campaign cannot advance to Wigan');
campaign.complete(1);
assert(campaign.state.completed.includes(1),'Wigan completion is not stored');

console.log('PASS: Bad Belzig and Wigan each complete all three objective phases with defender clearance and timed secure holds.');
console.log('PASS: campaign progression unlocks and advances Mission 1 -> Mission 2 and records both completions.');
