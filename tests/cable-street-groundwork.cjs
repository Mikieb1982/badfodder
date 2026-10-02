'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),vm=require('node:vm');
const root=path.join(__dirname,'..');
const Historical=require('../historical-missions.js');
const Cable=require('../cable-street-runtime.js');

const mission=Historical.get('cable-street-1936');
assert(mission,'Cable Street historical mission registry entry missing');
assert.equal(mission.integration,'historical');
assert.equal(mission.campaignLinked,false);
assert.equal(mission.playable,false,'Cable Street must not be marked playable before verified geography exists');
assert.equal(mission.mapReady,false,'Cable Street map must remain explicitly unready');
assert.equal(mission.map,undefined,'Unverified Cable Street map geometry must not be invented');
assert.equal(mission.spawns,undefined,'Unverified Cable Street spawn coordinates must not be invented');
assert.deepEqual(mission.phases.map(p=>p.id),['gathering','hold-approach','regroup','they-shall-not-pass']);
assert.equal(mission.phases[3].proposedHoldSeconds,240);
assert.equal(mission.actionProfile.firearms,false);
assert.equal(mission.actionProfile.grenades,false);
assert.deepEqual(mission.actionProfile.contextualActions,['reinforce','carry','assist','hold','drop']);
assert.equal(mission.crowdBudget.reactiveCivilians,24);
assert.equal(mission.crowdBudget.functionalHelpers,8);
assert.deepEqual(mission.firstImplementationSlice,{
  documentedStreetSegments:1,
  mainBarricades:1,
  materialTypes:3,
  rescueInteractions:1,
  policeFormations:1
});

const campaignSource=fs.readFileSync(path.join(root,'campaign.js'),'utf8');
const scope={window:{},localStorage:{getItem:()=>null,setItem(){}}};
vm.runInNewContext(campaignSource,scope);
assert(!scope.window.BadFodderCampaign.missions.some(m=>String(m.id)==='cable-street-1936'||/Cable Street/i.test(m.title)),'Cable Street was incorrectly appended to the standard campaign');

const barricade=Cable.createBarricade({id:'B',maxIntegrity:100,constructionTier:2,integrity:45,workPositions:2});
Cable.damageBarricade(barricade,15);
assert.equal(barricade.integrity,30);
assert.equal(barricade.constructionTier,2,'Damage must not erase construction tier');
Cable.reinforceBarricade(barricade,20,{tierIncrease:1});
assert.equal(barricade.integrity,50);
assert.equal(barricade.constructionTier,3,'Reinforcement tier must remain distinct from integrity');

assert.equal(Cable.reserveWorkPosition(barricade,'helper-a'),0);
assert.equal(Cable.reserveWorkPosition(barricade,'helper-b'),1);
assert.equal(Cable.reserveWorkPosition(barricade,'helper-c'),-1,'Helpers must not share an occupied work position');
assert(Cable.releaseWorkPosition(barricade,'helper-a'));
assert.equal(Cable.reserveWorkPosition(barricade,'helper-c'),0);

const timber=Cable.createMaterial({id:'timber-1',type:'timber'});
assert.equal(timber.value,15);
assert(Cable.carryMaterial(timber,'muller'));
assert(!Cable.carryMaterial(timber,'becker'),'One material object cannot be carried by two actors');
assert(Cable.dropMaterial(timber,'muller'),'Interrupted carrying should leave a recoverable object');
assert.equal(timber.consumed,false);
assert(Cable.carryMaterial(timber,'becker'));
const delivered=Cable.deliverMaterial(timber,barricade,'becker');
assert(delivered>0);
assert.equal(timber.consumed,true);
assert.equal(Cable.deliverMaterial(timber,barricade,'becker'),0,'Delivered material cannot be consumed twice');

for(const [type,value] of Object.entries({cart:20,crates:10,timber:15,furniture:8,barrel:10})){
  assert.equal(Cable.createMaterial({id:'x-'+type,type}).value,value);
}

const civilian=Cable.createCivilian({id:'resident-1',optional:true});
assert(Cable.assistCivilian(civilian,'muller'));
assert(Cable.evacuateCivilian(civilian));
assert.equal(civilian.status,'exited');

const formation=Cable.createPoliceFormation({id:'formation-1',width:6,objective:'B'});
for(const state of Cable.POLICE_STATES)assert(Cable.setPoliceState(formation,state),'Police state unavailable: '+state);
assert.equal(formation.state,'withdraw');
assert(!Cable.setPoliceState(formation,'firefight'),'Unsupported military formation state accepted');

assert.equal(Cable.updateCrowdConfidence(.5,.2),.7);
assert.equal(Cable.updateCrowdConfidence(.9,.3),1);
assert.equal(Cable.updateCrowdConfidence(.1,-.4),0);

const hold=Cable.createPhaseState();
assert(!Cable.advanceHold(hold,1,4),'Pressure hold must not advance before explicit start');
assert(Cable.startPressure(hold));
assert(!Cable.advanceHold(hold,2,4));
assert(Cable.advanceHold(hold,2,4));
assert.equal(hold.completed,true);

const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
const menu=fs.readFileSync(path.join(root,'menu-ui.js'),'utf8');
assert(index.includes('id="menuHistorical"'),'Historical Missions main-menu option missing');
assert(index.includes('data-view="historical"'),'Historical Missions panel missing');
assert(index.includes('data-view="historical-cable"'),'Cable Street groundwork detail panel missing');
assert(index.includes('MAP RECONSTRUCTION PENDING'),'Cable Street status does not disclose unverified geography');
assert(menu.includes("this.get('menuHistorical').addEventListener"),'Historical Missions button is not wired');
assert(menu.includes("this.get('menuHistoricalCable').addEventListener"),'Cable Street detail button is not wired');
assert(index.includes('data-back-to="historical"'),'Cable Street detail screen does not return to Historical Missions');
assert(menu.includes("b.dataset.backTo||'main'"),'Nested historical menu back navigation is not wired');

console.log('PASS: Cable Street is a separate non-playable historical mission groundwork entry with four planned phases and no fabricated map.');
console.log('PASS: barricade, material, rescue, crowd-confidence and police-formation mechanics preserve the blueprint invariants.');
