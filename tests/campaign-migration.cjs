'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const Launch=require('../mission-launch'),Bootstrap=require('../mission-bootstrap'),Identities=require('../mission-identities'),Storage=require('../game-storage');
const Historical=require('../historical-missions');
const source=fs.readFileSync(require.resolve('../campaign.js'),'utf8'),key='badfodder.campaign.v1';
function fixture(raw,wrapped=false){
 const data=new Map(raw===undefined?[]:[[key,JSON.stringify(wrapped?{storageSchema:1,value:JSON.stringify(raw)}:raw)]]);
 const backend={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};
 const storage=Storage.create(()=>backend);
 function reload(){const scope={window:{BadFodderHistoricalMissions:Historical},BadFodderStorage:{local:storage}};vm.runInNewContext(source,scope);return scope.window.BadFodderCampaign}
 return{reload,storage,data,c:reload()};
}
const ids=['bad-belzig','wigan','cable-street','barcelona-1936'];
for(const wrapped of [false,true]){
 const f=fixture({current:1,unlocked:1,completed:[0]},wrapped);
 assert.equal(f.c.state.current,1);assert.equal(f.c.state.unlocked,1);assert.deepEqual(Array.from(f.c.state.completed),[0]);
 const persisted=JSON.parse(f.storage.getItem(key));assert.equal(persisted.campaignSchema,2);assert.equal(persisted.currentId,'wigan');
 const restored=f.reload();assert.equal(restored.current().id,'wigan');
 restored.complete('wigan');assert.equal(restored.state.unlocked,2);restored.setCurrent('cable-street');restored.complete('cable-street');
 assert.equal(f.reload().current().id,'cable-street');assert.deepEqual(JSON.parse(f.storage.getItem(key)).completedIds,ids.slice(0,3));
}
for(const current of [2,23,999,-1,'broken']){
 const f=fixture({current,unlocked:23,completed:[0,1,2,23,-1,'broken']});
 assert.equal(f.c.current().id,'cable-street');assert.equal(f.c.state.unlocked,2);assert.deepEqual(Array.from(f.c.state.completed),[0,1]);
}
assert.equal(fixture({current:23,unlocked:23,completed:[]}).c.current().id,'wigan');
for(const raw of [null,{},[],{current:-1,unlocked:-1,completed:[-1]}])assert.equal(fixture(raw).c.current().id,'bad-belzig');
const f=fixture(),c=f.c;assert.deepEqual(Array.from(c.missions,m=>m.id),ids);assert.equal(c.futureChapters.length,3);assert(c.futureChapters.every(m=>!m.playable));
const launch=Launch.create({storage:f.storage,missions:c.missions,campaign:c,historicalMissions:Historical.missions});
for(const [i,id] of ids.entries()){
 assert(launch.select(id));assert.equal(launch.currentIndex(),i);assert.equal(launch.currentId(),id);assert.equal(c.state.unlocked,0);
 assert.equal(launch.isHistorical(),i>=2);assert.equal(Bootstrap.actionProfile(launch.current()).firearms,i!==2);
 assert.equal(Identities.get(launch.current()).classification,i>=2?'BASED ON REAL EVENTS':'FICTIONAL SCENARIO');
 const restored=Launch.create({storage:f.storage,missions:c.missions,campaign:c,historicalMissions:Historical.missions});assert.equal(restored.currentId(),id);
}
const reordered=Launch.create({storage:f.storage,missions:[c.missions[3],c.missions[2],c.missions[0],c.missions[1]],campaign:c});assert.equal(reordered.currentId(),'barcelona-1936');assert.equal(reordered.currentIndex(),0);
assert.equal(c.missions[2].date,'1936-10-04');assert.equal(c.missions[2].phases,Historical.missions[0].phases);assert.equal(c.missions[2].actionProfile,Historical.missions[0].actionProfile);
launch.useCampaign();assert.equal(launch.currentId(),ids[0]);c.complete(0);c.setCurrent(1);assert.equal(launch.currentId(),ids[1]);c.complete(1);c.setCurrent(2);assert.equal(launch.currentId(),ids[2]);assert(launch.isCampaign());assert(launch.isHistorical());c.complete(2);assert.equal(c.state.unlocked,3);
c.complete(999);assert.equal(c.state.completed.length,3);
f.storage.setItem(launch.keys.launch,JSON.stringify({mode:'select',index:1}));assert.equal(Launch.create({storage:f.storage,missions:c.missions,campaign:c}).currentId(),'wigan');
f.storage.setItem(launch.keys.launch,JSON.stringify({mode:'historical',id:'cable-street-1936'}));assert.equal(Launch.create({storage:f.storage,missions:c.missions,campaign:c,historicalMissions:Historical.missions}).current().map,'cable-street');
console.log('PASS: legacy/enveloped saves, stable IDs, invalid-index recovery, all four launches, standalone access, campaign progression, persistence and scenario metadata.');

const html=fs.readFileSync(require.resolve('../index.html'),'utf8');
const controllerCode=html.slice(html.indexOf('  function createActiveMissionController('),html.indexOf('  async function preload('));
const cable=c.missions[2],privateDefinition={...cable,id:cable.legacyId};
const controller=new Function('initialMission','historicalControllerMission','cableStreetRuntime',controllerCode+';return createActiveMissionController();')(cable,privateDefinition,require('../cable-street-runtime'));
assert(controller);assert.equal(cable.id,'cable-street');controller.dispose();
for(const creation of ['cableStreetInteractions.create','cableStreetDirector.create','cableStreetCrowd.create'])assert.match(html.slice(html.indexOf(creation),html.indexOf(creation)+160),/mission:historicalControllerMission/,'Specialised Cable components must receive the legacy private ID');

const throughCable=fixture({campaignSchema:2,currentId:'cable-street',unlockedId:'cable-street',completedIds:ids.slice(0,3)});
const missionSource=fs.readFileSync(require.resolve('../mission-controller.js'),'utf8').replace(/\benv\./g,'');
const continueCode=missionSource.slice(missionSource.indexOf('  function startCampaignFromMenu('),missionSource.indexOf('  function startStandaloneMission('));let briefing,begin,launched=false;
new Function('commands','campaign','showTitle','requestMissionBriefing','launchCampaign',continueCode+';startCampaignFromMenu();')(null,throughCable.c,()=>{},(m,action)=>{briefing=m;begin=action},()=>launched=true);
assert.equal(briefing.id,'barcelona-1936','Continue offers the new chapter after an old terminal Cable save');assert.equal(throughCable.c.current().id,'cable-street','Briefing cancellation preserves the previous current mission');begin();assert(launched);assert.equal(throughCable.reload().current().id,'barcelona-1936');
