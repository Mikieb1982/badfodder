'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),vm=require('node:vm');
const root=path.join(__dirname,'..');
const MissionLaunch=require('../mission-launch.js');
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
const menu=fs.readFileSync(path.join(root,'menu-ui.js'),'utf8');
const campaignSource=fs.readFileSync(path.join(root,'campaign.js'),'utf8');

function campaign(){
  const data={};
  const localStorage={
    getItem:key=>data[key]??null,
    setItem:(key,value)=>{data[key]=String(value)}
  };
  const scope={window:{},localStorage};
  vm.runInNewContext(campaignSource,scope);
  return scope.window.BadFodderCampaign;
}
function storage(){
  const data={};
  return{
    data,
    getItem:key=>data[key]??null,
    setItem:(key,value)=>{data[key]=String(value)},
    removeItem:key=>{delete data[key]}
  };
}

const c=campaign(),s=storage();
const launch=MissionLaunch.create({storage:s,missions:c.missions,campaign:c});

assert(launch.isCampaign(),'Default launch mode must be campaign');
assert.equal(launch.currentIndex(),0);
assert.equal(launch.current().id,1);

assert(launch.select(1),'Playable Wigan should be selectable directly');
assert(launch.isSelection());
assert.equal(launch.currentIndex(),1);
assert.equal(launch.current().id,2);
assert.equal(c.state.current,0,'Standalone selection must not change campaign current mission');
assert.equal(c.state.unlocked,0,'Standalone selection must not unlock campaign missions');

launch.requestAutoStart();
assert(launch.consumeAutoStart(),'Selected mission should request automatic start after reload');
assert(!launch.consumeAutoStart(),'Auto-start token should be consumed only once');

launch.useCampaign();
assert(launch.isCampaign());
assert.equal(launch.currentIndex(),0,'Returning to campaign must restore campaign position');

c.complete(0);
c.setCurrent(1);
assert.equal(launch.currentIndex(),1,'Campaign should advance to Wigan after Mission 1 completion');
assert.equal(launch.current().id,2);

assert(!launch.select(2),'Placeholder Mission 3 must not be directly selectable');

assert(index.includes('id="menuMissionSelect"'),'Main menu Mission Select button missing');
assert(index.includes('id="menuMissionBad"'),'Bad Belzig mission button missing');
assert(index.includes('id="menuMissionWigan"'),'Wigan mission button missing');
assert(index.includes('CAMPAIGN PLAYS MISSIONS IN ORDER'),'Campaign ordering is not explained');
assert(index.includes("if(missionLaunch.isCampaign())campaign.complete(activeMissionIndex)"),'Standalone completion can alter campaign progress');
assert(index.includes("if(!missionLaunch.isCampaign())return false"),'Standalone missions can incorrectly advance to the next campaign mission');
assert(index.includes('start:startCampaignFromMenu,selectMission:startStandaloneMission'),'Menu launch actions are not connected');
assert(menu.includes("this.get('menuMissionSelect').addEventListener"),'Mission Select panel is not interactive');
assert(menu.includes("actions.selectMission(0)")&&menu.includes("actions.selectMission(1)"),'Both playable mission choices are not wired');

console.log('PASS: main menu offers Campaign and Mission Select with Bad Belzig and Wigan.');
console.log('PASS: standalone mission choice is session-scoped and does not alter campaign progression; campaign mode still advances in order.');
