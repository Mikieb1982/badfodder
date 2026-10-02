'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),vm=require('node:vm');
const root=path.join(__dirname,'..');
const MissionLaunch=require('../mission-launch.js');
const Bootstrap=require('../mission-bootstrap.js');
const Historical=require('../historical-missions.js');

function makeCampaign(){
  const data={};
  const localStorage={
    getItem:key=>data[key]??null,
    setItem:(key,value)=>{data[key]=String(value)}
  };
  const scope={window:{},localStorage};
  vm.runInNewContext(fs.readFileSync(path.join(root,'campaign.js'),'utf8'),scope);
  return scope.window.BadFodderCampaign;
}
function storage(seed={}){
  const data={...seed};
  return{
    data,
    getItem:key=>data[key]??null,
    setItem:(key,value)=>{data[key]=String(value)},
    removeItem:key=>{delete data[key]}
  };
}

const campaign=makeCampaign();
assert.equal(campaign.missions[0].map,'bad-belzig','Bad Belzig must have an explicit map key');
assert.equal(campaign.missions[1].map,'wigan','Wigan must retain its explicit map key');

const fakeThirdMap={key:'fixture-third',title:'Fixture Third',width:100,height:100};
const registry=Bootstrap.createMapRegistry({
  'bad-belzig':{key:'bad-belzig'},
  'wigan':{key:'wigan'},
  'fixture-third':fakeThirdMap
});
assert.strictEqual(Bootstrap.resolveMap({id:'fixture',title:'Fixture',map:'fixture-third'},registry),fakeThirdMap);
assert.throws(
  ()=>Bootstrap.resolveMap({id:'unknown',title:'Unknown',map:'does-not-exist'},registry),
  /Unknown mission map "does-not-exist"/
);
assert.throws(
  ()=>Bootstrap.resolveMap({id:'missing',title:'Missing map'},registry),
  /does not define a map key/
);

const profile=Bootstrap.actionProfile({
  actionProfile:{firearms:false,grenades:false,contextualActions:['reinforce','carry','assist']}
});
assert.equal(Bootstrap.allows(profile,'firearms'),false);
assert.equal(Bootstrap.allows(profile,'grenades'),false);
assert.equal(Bootstrap.allows(profile,'reinforce'),true);
assert.equal(Bootstrap.allows(profile,'hold'),false);
const militaryProfile=Bootstrap.actionProfile(campaign.missions[0]);
assert.equal(Bootstrap.allows(militaryProfile,'firearms'),true);
assert.equal(Bootstrap.allows(militaryProfile,'grenades'),true);

const lockedStorage=storage();
const lockedLaunch=MissionLaunch.create({
  storage:lockedStorage,
  missions:campaign.missions,
  campaign,
  historicalMissions:Historical.missions
});
assert.equal(lockedLaunch.selectHistorical('cable-street-1936'),false,'Production Cable Street must remain locked before map readiness');
assert.equal(lockedLaunch.isCampaign(),true);
assert.equal(campaign.state.current,0,'Rejected historical selection changed campaign progress');

const fixtureHistorical={
  id:'fixture-history',
  title:'Fixture History',
  playable:true,
  mapReady:true,
  map:'fixture-third',
  actionProfile:{firearms:false,grenades:false,contextualActions:['hold']}
};
const fixtureStorage=storage();
const fixtureLaunch=MissionLaunch.create({
  storage:fixtureStorage,
  missions:campaign.missions,
  campaign,
  historicalMissions:[fixtureHistorical]
});
assert(fixtureLaunch.selectHistorical('fixture-history'),'Available historical fixture was not selectable');
assert(fixtureLaunch.isHistorical());
assert.equal(fixtureLaunch.currentId(),'fixture-history');
assert.strictEqual(fixtureLaunch.current(),fixtureHistorical);
assert.equal(campaign.state.current,0,'Historical selection altered campaign position');

const restored=MissionLaunch.create({
  storage:fixtureStorage,
  missions:campaign.missions,
  campaign,
  historicalMissions:[fixtureHistorical]
});
assert(restored.isHistorical(),'Stored historical selection was not restored by stable ID');
assert.equal(restored.currentId(),'fixture-history');

const corruptStorage=storage({'badfodder.launch.v1':JSON.stringify({mode:'historical',id:'missing-id'})});
const corrupt=MissionLaunch.create({
  storage:corruptStorage,
  missions:campaign.missions,
  campaign,
  historicalMissions:[fixtureHistorical]
});
assert(corrupt.isCampaign(),'Stale historical selection should fall back to campaign');

campaign.state.current=2;
campaign.state.unlocked=2;
const staleCampaign=MissionLaunch.create({
  storage:storage(),
  missions:campaign.missions,
  campaign,
  historicalMissions:[]
});
assert.equal(staleCampaign.currentIndex(),1,'Unavailable future campaign position should resolve to nearest playable mission');
assert.equal(staleCampaign.current().id,2);

const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
assert(index.includes('BadFodderMissionBootstrap'),'Live bootstrap does not use explicit mission resolver');
assert(!index.includes("initialMission.map==='wigan')?WIGAN_MAP:TOWN_MAP"),'Two-map Bad Belzig fallback still exists');
assert(index.includes("historicalMissions:historicalMissions.missions"),'Historical registry is not supplied to launch resolver');
assert(index.includes("function startHistoricalMission(id)"),'Historical start path is missing');
assert(index.includes("if(!actionAllowed('firearms'))return false"),'Simulation-level firearm gate missing');
assert(index.includes("if(!actionAllowed('grenades'))return false"),'Simulation-level grenade gate missing');
assert(index.includes("touchFire.hidden=!actionAllowed('firearms')"),'Touch firearm control is not profile-gated');
assert(index.includes("touchGrenade.hidden=!actionAllowed('grenades')"),'Touch grenade control is not profile-gated');
assert(index.includes("missionController.fixedUpdate(dt)"),'Historical controller is not connected to fixed-step simulation');
assert(index.includes("enemies=missionController?[]"),'Historical controller can still create normal military enemy AI');

console.log('PASS: historical launch resolves stable IDs without altering campaign progress and rejects locked/stale historical selections.');
console.log('PASS: explicit map bootstrap rejects unknown maps, supports a third registered fixture and no longer falls through to Bad Belzig.');
console.log('PASS: mission action profiles gate firearms/grenades in both controls and simulation while military missions retain them.');
