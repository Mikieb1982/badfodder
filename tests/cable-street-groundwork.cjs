'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),vm=require('node:vm');
const root=path.join(__dirname,'..');
const Historical=require('../historical-missions.js');
const Cable=require('../cable-street-runtime.js');

const mission=Historical.get('cable-street-1936');
assert(mission,'Cable Street historical mission registry entry missing');
assert.equal(mission.integration,'historical');
assert.equal(mission.campaignLinked,false);
assert.equal(mission.playable,true);
assert(require('../tools/cable-street/verify-release.cjs').verifyDirectory(path.join(root,'authoring/cable-street')).report.ready);
assert.equal(mission.mapReady,true);
assert.equal(mission.map,'cable-street');
assert.equal(mission.spawns,undefined,'Unverified Cable Street spawn coordinates must not be invented');
assert.deepEqual(mission.phases.map(p=>p.id),['gathering','hold-approach','regroup','they-shall-not-pass']);
assert.equal(mission.phases[3].proposedHoldSeconds,90);
assert.equal(mission.actionProfile.firearms,false);
assert.equal(mission.actionProfile.grenades,false);
assert.deepEqual(mission.actionProfile.contextualActions,['reinforce','carry','assist','hold','drop']);
assert.equal(mission.crowdBudget.reactiveCivilians,24);
assert.equal(mission.crowdBudget.functionalHelpers,8);
assert.equal(mission.firstImplementationSlice.documentedStreetSegments,1);
assert.equal(mission.firstImplementationSlice.mainBarricades,2);
assert.equal(mission.firstImplementationSlice.materialTypes,3);
assert.equal(mission.firstImplementationSlice.rescueInteractions,1);
assert.equal(mission.firstImplementationSlice.policeFormations,2);
assert.equal(mission.firstImplementationSlice.improvisedFightback,true);
assert.equal(mission.firstImplementationSlice.mountedPressure,true);
assert.equal(mission.firstImplementationSlice.backgroundMarchThreat,true);
assert.equal(mission.combatStyle,'improvised-street-defence');

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

const reservedCart=Cable.createMaterial({id:'cart-reserved',type:'cart'});
assert(Cable.reserveMaterial(reservedCart,'helper-a'));
assert(Cable.releaseMaterialReservation(reservedCart,'helper-a'),'Reservation must be cancellable before pickup');
assert.equal(reservedCart.reservedBy,null,'Cancelled reservation remains stranded');
assert(Cable.reserveMaterial(reservedCart,'helper-b'),'Released material must become available to another actor');

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

const nullDelivery=Cable.createMaterial({id:'crate-null',type:'crates'});
const nullBefore=barricade.integrity;
assert.equal(Cable.deliverMaterial(nullDelivery,barricade,null),0,'Null actor must not deliver an uncarried material');
assert.equal(barricade.integrity,nullBefore,'Rejected null delivery mutated barricade integrity');
assert.equal(nullDelivery.consumed,false,'Rejected null delivery consumed material');

const nearlyFull=Cable.createBarricade({id:'partial',maxIntegrity:100,integrity:95,constructionTier:1});
const partialCart=Cable.createMaterial({id:'partial-cart',type:'cart'});
assert(Cable.carryMaterial(partialCart,'helper-a'));
assert.equal(Cable.deliverMaterial(partialCart,nearlyFull,'helper-a'),5,'Delivery should use only available barricade capacity');
assert.equal(partialCart.remainingValue,15,'Unused material value should remain after partial delivery');
assert.equal(partialCart.consumed,false,'Partially used material should not be destroyed');
assert.equal(partialCart.carriedBy,'helper-a','Partially used material should remain with its carrier');

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

const invalidHold=Cable.createPhaseState();
assert(Cable.startPressure(invalidHold));
assert.equal(Cable.advanceHold(invalidHold,1,undefined),false,'Undefined target duration must be rejected');
assert.equal(invalidHold.holdSeconds,0,'Invalid duration corrupted hold timer');
assert.equal(Cable.advanceHold(invalidHold,1,0),false,'Zero target duration must be rejected');
assert.equal(Cable.advanceHold(invalidHold,1,-5),false,'Negative target duration must be rejected');
assert.equal(Cable.advanceHold(invalidHold,1,Infinity),false,'Non-finite target duration must be rejected');

assert.throws(()=>Cable.createBarricade({id:'bad',maxIntegrity:100,integrity:NaN}),/finite/);
assert.throws(()=>Cable.createBarricade({id:'tier',maxIntegrity:100,constructionTier:Cable.MAX_CONSTRUCTION_TIER+1}),/constructionTier/);

const missionController=Cable.createController({mission});
const controllerBarricade=Cable.createBarricade({id:'controller-b',maxIntegrity:100,integrity:20,workPositions:1});
const controllerMaterial=Cable.createMaterial({id:'controller-timber',type:'timber'});
missionController.initialize({
  actors:[{id:'actor-a',name:'A'},{id:'actor-b',name:'B'}],
  barricades:[controllerBarricade],
  materials:[controllerMaterial]
});
assert(missionController.reserveForActor('actor-a','controller-timber'));
assert(missionController.carryForActor('actor-a','controller-timber'));
assert(!missionController.carryForActor('actor-b','controller-timber'),'Second actor must not acquire an already-carried material');
assert(missionController.fixedUpdate(1/60));
assert(missionController.cancelActor('actor-a'),'Actor cancellation should clean jobs/resources');
assert.equal(controllerMaterial.carriedBy,null);
assert.equal(controllerMaterial.reservedBy,null);
assert(missionController.dispose());
assert(missionController.disposed);
assert.throws(()=>missionController.fixedUpdate(1/60),/disposed/);

const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
const menu=fs.readFileSync(path.join(root,'menu-ui.js'),'utf8');
assert(!index.includes('id="menuHistorical"'),'Historical category must not appear in the main menu');
assert(!index.includes('data-view="historical"'),'Redundant historical category panel must be removed');
assert(index.includes('data-view="briefing"'),'Shared mission briefing missing');
assert(index.includes('id="menuHistoricalCable"'),'Select Mission must include Cable Street');
assert(menu.includes("this.get('menuHistoricalCable').addEventListener"),'Cable Street selection is not wired');
assert(index.includes('id="briefingBegin"'),'Shared briefing has no Begin control');
assert(index.includes("menu-ui.js?v=20261003-wartime-1"),'Menu controller cache version is stale');
assert(index.includes('selectHistorical:startHistoricalMission'),'Cable Street briefing action is not supplied');
assert(index.includes('m?.playable&&m.mapReady&&BadFodderMissionAssets.has(m.map)'),'Cable Street briefing must require a registered ready map');
assert(menu.includes("actions.selectHistorical?.('cable-street-1936')"),'Cable Street selection does not request its mission');
assert(menu.includes('leaveBriefing()'),'Shared briefing lacks Back navigation');
assert(menu.includes("this.showPanel(this.briefingBack||'missions')"),'Briefing must return to its source panel');

console.log('PASS: Cable Street is a separate playable historical mission with gated reconstructed map and four phases.');
console.log('PASS: Cable Street groundwork now explicitly includes improvised fightback, mounted pressure and a background march threat.');
console.log('PASS: Cable Street helpers reject invalid ownership/timers, release cancelled reservations, preserve partial materials and clean actor/controller state.');
