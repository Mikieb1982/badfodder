'use strict';

const assert=require('node:assert/strict');
const Verify=require('../tools/cable-street/verify-release.cjs');
const fixture=require('./fixtures/cable-street-navigation-fixture.cjs');

const p=fixture.points;
const map={
  key:'cable-street',
  width:fixture.worldWidth,
  height:fixture.worldHeight,
  authoring:{productionReady:true,runtimeObjectsReady:true},
  buildings:fixture.buildings,
  eventZones:[{
    id:'supported-barricade-vicinity',
    kind:'barricade-vicinity',
    role:'barricade-vicinity',
    points:[[168,62],[192,62],[192,118],[168,118]]
  }],
  spawns:{
    squad:[[48,90],[54,90],[48,98],[54,98]],
    enemies:[],civilians:[],pickups:[]
  },
  historicalObjects:{
    barricades:[{
      id:'B',points:fixture.barricade.points,
      maxIntegrity:30,integrity:20,breached:false
    }],
    materials:[
      {id:'timber',type:'timber'},
      {id:'crates',type:'crates'},
      {id:'furniture',type:'furniture'}
    ],
    civilians:[{id:'resident-1'}],
    formations:[{id:'police-1',objective:'B'}]
  },
  routeRequirements:[
    {id:'defender-retreat',phase:'regroup',side:'defender',from:p.defenderStart,to:p.defenderRetreat,expect:'reachable'},
    {id:'support-access',phase:'hold-approach',side:'support',from:p.defenderStart,to:p.supportAccess,expect:'reachable'},
    {id:'police-approach',phase:'hold-approach',side:'police',from:p.policeStart,to:p.policeApproach,expect:'reachable'},
    {id:'barrier-separation',phase:'hold-approach',side:'separation',from:p.policeStart,to:p.defenderStart,expect:'blocked'}
  ]
};

const ready=Verify.verifyMap(map);
assert.equal(ready.ready,true,JSON.stringify(ready.problems));
assert.equal(ready.problems.length,0);
assert(ready.routeReport&&ready.routeReport.ok);
assert.equal(ready.counts.squadSpawns,4);
assert.equal(ready.counts.routeRequirements,4);
assert(Verify.supportedBarricadeZone(map,map.historicalObjects.barricades[0]));

const outside=JSON.parse(JSON.stringify(map));
outside.historicalObjects.barricades[0].points=[[150,68],[162,68],[162,112],[150,112]];
const outsideReport=Verify.verifyMap(outside);
assert.equal(outsideReport.ready,false);
assert(outsideReport.problems.some(x=>/not wholly inside/.test(x)));

const missingRoute=JSON.parse(JSON.stringify(map));
missingRoute.routeRequirements=missingRoute.routeRequirements.filter(x=>x.id!=='defender-retreat');
const missingRouteReport=Verify.verifyMap(missingRoute);
assert.equal(missingRouteReport.ready,false);
assert(missingRouteReport.problems.some(x=>/defender-retreat/.test(x)));

const militaryLeak=JSON.parse(JSON.stringify(map));
militaryLeak.spawns.enemies=[[300,90]];
const leakReport=Verify.verifyMap(militaryLeak);
assert.equal(leakReport.ready,false);
assert(leakReport.problems.some(x=>/military enemy spawns/.test(x)));

console.log('PASS: Cable Street release verification requires safe routes, four squad spawns, historical interaction objects and a barricade wholly inside the supported event area.');
console.log('PASS: release verification rejects missing route checks, unsupported barricade placement and accidental military spawns.');
