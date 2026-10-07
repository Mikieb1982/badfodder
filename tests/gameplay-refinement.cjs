'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..');
const MissionRules=require('../mission-rules.js');
const index=require('./engine-source.cjs')(fs.readFileSync(path.join(root,'index.html'),'utf8'));
const campaignSource=fs.readFileSync(path.join(root,'campaign.js'),'utf8');
const wiganSource=fs.readFileSync(path.join(root,'wigan-map.js'),'utf8');
const townSource=fs.readFileSync(path.join(root,'town-map.js'),'utf8');
const badSource=fs.readFileSync(path.join(root,'bad-belzig-data.js'),'utf8');

const scope={window:{BadFodderHistoricalMissions:require('../historical-missions')},localStorage:{getItem:()=>null,setItem(){}}};
vm.runInNewContext(campaignSource,scope);
const [badMission,wiganMission]=scope.window.BadFodderCampaign.missions;
assert.equal(badMission.phases.length,3);
assert.equal(wiganMission.phases.length,3);
assert.deepEqual(Array.from(badMission.phases,p=>p.defenderGroup),['post','castle','market']);
assert.deepEqual(Array.from(wiganMission.phases,p=>p.defenderGroup),['tudor','grandArcade','wallgate']);
assert(badMission.phases.every(p=>p.hold>0&&p.contestRadius>0));
assert(wiganMission.phases.every(p=>p.hold>0&&p.contestRadius>0));

const badMap=new Function(townSource+'\n'+badSource+';return TOWN_MAP;')();
const wiganMap=new Function(wiganSource+';return WIGAN_MAP;')();
assert.deepEqual(Array.from(badMap.defenderGroups.castle),[3,4,5,6]);
assert.deepEqual(Array.from(badMap.defenderGroups.market),[8,9,10,11,12,13,14,15]);
assert(wiganMap.optionalEncounters&&wiganMap.optionalEncounters.kingStreet);
assert.deepEqual(Array.from(wiganMap.defenderGroups.kingStreet),[2,3]);
assert.deepEqual(Array.from(wiganMap.defenderGroups.wallgate),[0,1,4,9]);
const optional=wiganMap.spawns.pickups.find(p=>p.optional);
assert(optional&&optional.type==='grenade'&&optional.amount===3);

const hudStart=index.indexOf('  function updateHud(force=false)');
const hudEnd=index.indexOf('  function moveEntity(',hudStart);
const hud=index.slice(hudStart,hudEnd);
assert(!hud.includes('missionStage++'),'HUD must not advance mission progression');
assert(index.includes('function updateMissionProgress(dt)'));
const holdProbe=MissionRules.advanceHold({hold:1},{ready:true},0,.25);assert.equal(holdProbe.holdTime,.25);assert(!holdProbe.complete);
assert(index.includes('updateMissionProgress(dt);'));
assert(index.includes('missionObjectivesRuntime.update(dt,{living,enemies,zones,scale:S(1)})'));
assert(index.includes('reactionTimer<=0'),'Enemies can fire before reaction delay finishes');
assert(index.includes("prepareEnemyReaction(e,sees?.48:.58,sees?'!':'?')"));
assert(index.includes("prepareEnemyReaction(t,.22,'!')"));
assert(index.includes("ent.searching"));
assert(index.includes('id="hudEnemyLabel">TARGETS</span>'),'HUD should show objective targets rather than imply all enemies are compulsory');
assert(index.includes('function drawOptionalEncounters'));
assert(index.includes("fillText('OPTIONAL SUPPLY'"));

console.log('PASS: six compulsory encounters use secure holds, local contesting and focused defender groups.');
console.log('PASS: Wigan King Street is optional, enemy reaction/search cues are explicit, and mission progression is simulation-owned rather than HUD-owned.');
