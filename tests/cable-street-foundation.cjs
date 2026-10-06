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
  const scope={window:{BadFodderHistoricalMissions:require('../historical-missions')},localStorage};
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
  historicalMissions:Historical.missions.map(m=>({...m,mapReady:false,playable:false}))
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

campaign.state.current=23;
campaign.state.unlocked=23;
const staleCampaign=MissionLaunch.create({
  storage:storage(),
  missions:campaign.missions,
  campaign,
  historicalMissions:[]
});
assert.equal(staleCampaign.currentIndex(),2,'Unavailable future campaign position should resolve to nearest playable mission');
assert.equal(staleCampaign.current().id,'cable-street');

const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
assert(index.includes('BadFodderMissionBootstrap'),'Live bootstrap does not use explicit mission resolver');
assert(!index.includes("initialMission.map==='wigan')?WIGAN_MAP:TOWN_MAP"),'Two-map Bad Belzig fallback still exists');
assert(index.includes("historicalMissions:historicalMissions.missions"),'Historical registry is not supplied to launch resolver');
assert(index.includes("function startHistoricalMission(id)"),'Historical start path is missing');
assert(index.includes("if(!actionAllowed('firearms'))return false"),'Simulation-level firearm gate missing');
assert(index.includes("if(!actionAllowed('grenades'))return false"),'Simulation-level grenade gate missing');
assert(index.includes("touchFire.hidden=!actionAllowed('firearms')"),'Touch firearm control is not profile-gated');
assert(index.includes("touchGrenade.hidden=!actionAllowed('grenades')"),'Touch grenade control is not profile-gated');
assert(index.includes("missionInteractionLayer.fixedUpdate(dt)")||index.includes("missionController.fixedUpdate(dt)"),'Historical controller/interactions are not connected to fixed-step simulation');
assert(index.includes("enemies=missionController?[]"),'Historical controller can still create normal military enemy AI');
assert(index.includes("touchAction"),'Historical ACTION control missing');
assert(index.includes("performHistoricalContextActionAt"),'Desktop historical contextual action path missing');
assert(index.includes("performHistoricalNearestAction"),'Keyboard/touch historical contextual action path missing');
assert(fs.readFileSync(path.join(root,'mission-assets.js'),'utf8').includes('cable-street-director.js?v=20261004-adaptive-1'),'Cable Street phase director is not loaded by the browser runtime');
assert(fs.readFileSync(path.join(root,'mission-assets.js'),'utf8').includes('cable-street-map.js?v=20261003-tactical-1'),'Cable Street runtime map slot is not loaded before bootstrap');
assert(index.includes("...(window.CABLE_STREET_MAP?{'cable-street':window.CABLE_STREET_MAP}:{})"),'Cable Street runtime map is not conditionally registered');
assert(fs.readFileSync(path.join(root,'mission-assets.js'),'utf8').includes('cable-street-crowd.js?v=20261004-adaptive-1'),'Cable Street crowd module is not loaded by the browser runtime');
assert(index.includes('const cableStreetCrowd=window.BadFodderCableCrowd'),'Cable Street crowd global is not bound');
assert(index.includes('missionCrowd=cableStreetCrowd.create'),'Cable Street crowd is not created during historical reset');
assert(index.includes('missionCrowd.fixedUpdate(dt)'),'Cable Street crowd is not connected to fixed-step simulation');
assert(fs.readFileSync(path.join(root,'cable-street-crowd.js'),'utf8').includes('syncHelperSupport'),'Cable Street functional helpers do not support the barricade');
assert(index.includes("missionCrowd&&typeof missionCrowd.dispose==='function'"),'Cable Street helper support is not released during reset');
assert(index.includes('cableStreetArt.drawCrowd(ctx,historicalCrowdState,historicalClock,art,historicalView)'),'Cable Street crowd is not rendered in the historical world');
assert(index.includes("if(MAP_DATA.key==='cable-street'){"),'Cable Street renderer does not use the historical urban art path');
assert(index.includes('cableStreetArt.drawRoad(ctx,r,S,art)'),'Cable Street street edges are not delegated to historical art');
assert(index.includes('cableStreetArt.drawGuidance(ctx,historicalProgress.guidance,historicalClock)'),'Cable Street next-action marker is not rendered in-world');
assert(index.includes("MAP_DATA.key!=='bad-belzig'"),'Non-Bad-Belzig maps can still enter the Bad Belzig landmark renderer');


assert(index.includes('const cableStreetDirector=window.BadFodderCableDirector'),'Cable Street phase director global is not bound');
assert(index.includes('missionDirector=cableStreetDirector.create'),'Cable Street phase director is not created during historical reset');
assert(index.includes('missionDirector.fixedUpdate(dt)'),'Cable Street phase director is not connected to fixed-step simulation');
assert(index.includes('const historicalProgress=missionDirector.snapshot()'),'Historical HUD/progression does not read the Cable Street director');
assert(index.includes('id="hudEnemyLabel"'),'HUD target label cannot switch for Cable Street');
assert(index.includes('id="hudGrenadeLabel"'),'HUD grenade label cannot switch for Cable Street');
assert(index.includes("hudEnemyLabel.textContent='DEFENCE'"),'Cable Street HUD does not show defence integrity');
assert(index.includes("hudGrenadeLabel.textContent='ENERGY'"),'Cable Street HUD does not show volunteer energy');
assert(index.includes('id="hudSquadLabel"'),'HUD squad label cannot switch for Cable Street');
assert(index.includes("historicalMode?'VOLUNTEERS':'SQUAD'"),'Cable Street HUD still labels the player group as a military squad');
assert(index.includes("historicalMode?' VOLUNTEERS':' LOCALS'"),'Cable Street roster still labels historical participants as troops');
assert(index.includes('mission.successHeadline'),'Cable Street completion does not use the historical success headline');

assert(index.includes("Math.round(historicalProgress.barricadeRatio*100)+'%'"),'Cable Street defence percentage is not displayed');
assert(index.includes('historicalProgress.objectives.find(o=>!o.done)'),'Cable Street HUD does not select the next incomplete historical objective');
assert(index.includes("id=\"hudInstruction\"")&&index.includes("nextHistoricalObjective?.label"),'Cable Street HUD does not clearly label the next required action');
assert(index.includes('historicalProgress.instruction||historicalProgress.status'),'Cable Street HUD does not prefer explicit player instructions');


assert(fs.readFileSync(path.join(root,'mission-assets.js'),'utf8').includes("cable-street-interactions.js?v=20261004-adaptive-1"),'Historical interaction module is not cache-busted');
assert(index.includes('options:{scale:SCALE,pressureControlled:true,navigation}'),'Live Cable Street interactions do not wait for the historical pressure director');
assert(fs.readFileSync(path.join(root,'cable-street-interactions.js'),'utf8').includes('pressureDamageMultiplier'),'Cable Street HOLD actions do not mitigate police pressure');
assert(fs.readFileSync(path.join(root,'cable-street-interactions.js'),'utf8').includes("reason:'repelled'"),'Cable Street pressure waves cannot be repelled without a breach');
assert(/cable-street-art\.js\?v=[^"\s]+/.test(fs.readFileSync(path.join(root,'mission-assets.js'),'utf8')),'Historical art module is not cache-busted');


console.log('PASS: historical launch resolves stable IDs without altering campaign progress and rejects locked/stale historical selections.');
console.log('PASS: explicit map bootstrap rejects unknown maps, supports a third registered fixture and no longer falls through to Bad Belzig.');
console.log('PASS: mission action profiles gate firearms/grenades in both controls and simulation while military missions retain them.');
