'use strict';

const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const Compiler=require('../tools/cable-street/compile-trace.cjs');

const root=path.join(__dirname,'..');
const schema=JSON.parse(fs.readFileSync(path.join(root,'authoring/cable-street/authoring-schema.json'),'utf8'));

function props(id,kind,layer,extra={}){
  return{
    id,kind,layer,
    sourceIds:['S01'],
    sourceDate:'1916',
    confidence:'directly depicted',
    eventDateConfidence:'corroborated',
    affectsMovement:true,
    interpretationNote:'synthetic compiler fixture',
    gameplayAdjustment:'',
    ...extra
  };
}

const trace={
  type:'FeatureCollection',
  properties:{id:'cable-compiler-fixture',crs:'EPSG:27700',productionReady:false},
  features:[
    {
      type:'Feature',
      properties:props('road-north-edge','street-edge','carriageway-edge'),
      geometry:{type:'LineString',coordinates:[[534500,181000],[534600,181000]]}
    },
    {
      type:'Feature',
      properties:props('building-1','building','building-envelope',{
        eventDateConfidence:'inferred'
      }),
      geometry:{type:'Polygon',coordinates:[[
        [534520,180990],[534540,180990],[534540,180970],[534520,180970],[534520,180990]
      ]]}
    },
    {
      type:'Feature',
      properties:props('railway-1','railway','railway'),
      geometry:{type:'LineString',coordinates:[[534510,180950],[534610,180950]]}
    },
    {
      type:'Feature',
      properties:props('readability-1','clearance-area','gameplay-adjustment',{
        confidence:'fictional gameplay',
        eventDateConfidence:'fictional gameplay',
        affectsMovement:false,
        gameplayAdjustment:'Keep the action target readable.'
      }),
      geometry:{type:'Polygon',coordinates:[[
        [534545,180990],[534555,180990],[534555,180980],[534545,180980],[534545,180990]
      ]]}
    }
  ]
};

const eventOverlay={
  type:'FeatureCollection',
  properties:{id:'event-overlay-fixture'},
  features:[
    {
      type:'Feature',
      properties:{
        id:'event-b',
        kind:'barricade-vicinity',
        sourceIds:['S03'],
        confidence:'corroborated',
        interpretationNote:'Supported vicinity, not an exact point.'
      },
      geometry:{type:'Polygon',coordinates:[[
        [534560,180995],[534580,180995],[534580,180975],[534560,180975],[534560,180995]
      ]]}
    }
  ]
};


const runtimeObjects={
  id:'runtime-objects-fixture',
  status:'ready',
  crs:'EPSG:27700',
  requirements:{
    squadSpawns:4,
    mainBarricades:1,
    materialTypes:['timber','crates','furniture'],
    rescueInteractions:1,
    policeFormations:1
  },
  squadSpawns:[
    [534520,180960],[534525,180960],[534520,180955],[534525,180955]
  ],
  routeRequirements:[
    {
      id:'player-to-defence',phase:'gathering',side:'defender',expect:'reachable',
      from:[534520,180960],to:[534565,180985]
    }
  ],
  objects:{
    barricades:[
      {
        id:'barricade-b',label:'Main defence',
        polygon:[
          [534565,180990],[534575,180990],[534575,180980],[534565,180980],[534565,180990]
        ],
        maxIntegrity:30,integrity:10,constructionTier:1,workPositions:2,
        interactionRadiusMetres:2.5,
        historicalStatus:'historically-supported-vicinity',
        sourceIds:['S03'],
        interpretationNote:'Synthetic test placement inside a supported-area fixture.'
      }
    ],
    materials:[
      {id:'mat-timber',type:'timber',label:'Timber',position:[534550,180970],interactionRadiusMetres:2,historicalStatus:'gameplay-placement'},
      {id:'mat-crates',type:'crates',label:'Crates',position:[534555,180970],interactionRadiusMetres:2,historicalStatus:'gameplay-placement'},
      {id:'mat-furniture',type:'furniture',label:'Furniture',position:[534560,180970],interactionRadiusMetres:2,historicalStatus:'gameplay-placement'}
    ],
    civilians:[
      {
        id:'resident-1',label:'Resident',position:[534545,180965],
        optional:true,interactionRadiusMetres:2,exitSeconds:0.8,
        historicalStatus:'fictional-gameplay'
      }
    ],
    formations:[
      {
        id:'police-west',label:'Police formation',widthMetres:6,
        objective:'barricade-b',state:'approach',
        position:[534510,180990],target:[534565,180985],withdraw:[534505,180995],
        speedMetresPerSecond:3,stopDistanceMetres:2,
        haltSeconds:0.7,regroupSeconds:0.8,damageRate:5,
        historicalStatus:'route-level-evidence'
      }
    ]
  }
};

const projection={
  status:'configured',
  masterCrs:'EPSG:27700',
  originEastingNorthing:[534500,181000],
  metresToWorldUnits:2,
  padding:20,
  northUp:true
};

const map=Compiler.compileAuthoring({trace,schema,projection,eventOverlay,runtimeObjects,mapKey:'fixture-cable'});
assert.equal(map.key,'fixture-cable');
assert.equal(map.buildings.length,1);
assert.equal(map.roads.length,1);
assert.equal(map.roads[0].kind,'historical-carriageway-edge');
assert.equal(map.roads[0].featureKind,'street-edge');
assert.equal(map.railways.length,1);
assert.equal(map.gameplayAdjustments.length,1);
assert.equal(map.eventZones.length,1);
assert.deepEqual(map.buildings[0].points[0],[60,40]);
assert.equal(map.buildings[0].minX,60);
assert.equal(map.buildings[0].maxY,80);
assert.equal(map.buildings[0].kind,'building');
assert.equal(map.buildings[0].layer,'building-envelope');
assert.equal(map.buildings[0].eventDateConfidence,'inferred');
assert.equal(map.eventZones[0].role,'barricade-vicinity');
assert.equal(map.title,'Cable Street');
assert.deepEqual(map.areas,[]);
assert.deepEqual(map.pois,{});
assert.equal(map.spawns.squad.length,4);
assert.deepEqual(map.spawns.enemies,[]);
assert.deepEqual(map.spawns.civilians,[]);
assert.deepEqual(map.spawns.pickups,[]);
assert.equal(map.routeRequirements.length,1);
assert.deepEqual(map.routeRequirements[0].from,{x:60,y:100});
assert.deepEqual(map.routeRequirements[0].to,{x:150,y:50});
assert(Object.keys(map.zones).includes('event-b'));
assert(map.width>map.buildings[0].maxX);
assert(map.height>map.buildings[0].maxY);
assert.equal(map.authoring.runtimeObjectsReady,true);
assert.equal(map.historicalObjects.barricades.length,1);
assert.equal(map.historicalObjects.materials.length,3);
assert.equal(map.historicalObjects.civilians.length,1);
assert.equal(map.historicalObjects.formations.length,1);
assert.deepEqual(
  {x:map.historicalObjects.barricades[0].x,y:map.historicalObjects.barricades[0].y},
  {x:160,y:50}
);
assert.equal(map.historicalObjects.materials[0].interactionRadius,4);
assert.equal(map.historicalObjects.formations[0].width,12);
assert.equal(map.historicalObjects.formations[0].speed,6);
assert.equal(map.historicalObjects.formations[0].dismantleSeconds,4.5);
assert.equal(map.historicalObjects.formations[0].objective,'barricade-b');

const pendingMap=Compiler.compileAuthoring({
  trace,schema,projection,eventOverlay,
  runtimeObjects:{status:'awaiting-approved-map'},
  mapKey:'fixture-pending'
});
assert.equal(pendingMap.authoring.runtimeObjectsReady,false);
assert.deepEqual(pendingMap.historicalObjects,{barricades:[],materials:[],civilians:[],formations:[]});

const badRuntimeObjects=JSON.parse(JSON.stringify(runtimeObjects));
badRuntimeObjects.objects.formations[0].objective='missing-barricade';
assert.throws(
  ()=>Compiler.compileAuthoring({trace,schema,projection,eventOverlay,runtimeObjects:badRuntimeObjects}),
  /references unknown barricade objective/
);

const missingSpawnObjects=JSON.parse(JSON.stringify(runtimeObjects));
missingSpawnObjects.squadSpawns.length=1;
assert.throws(
  ()=>Compiler.compileAuthoring({trace,schema,projection,eventOverlay,runtimeObjects:missingSpawnObjects}),
  /requires more authored squad spawns/
);

assert.throws(
  ()=>Compiler.compileAuthoring({trace,schema,projection:{...projection,status:'awaiting-approved-trace'}}),
  /not configured/
);

const noRail={...trace,features:trace.features.filter(f=>f.properties.layer!=='railway')};
assert.throws(
  ()=>Compiler.compileAuthoring({trace:noRail,schema,projection,eventOverlay}),
  /missing production-critical layers: railway/
);

const duplicate={...trace,features:[...trace.features,trace.features[0]]};
assert.throws(
  ()=>Compiler.compileAuthoring({trace:duplicate,schema,projection,eventOverlay}),
  /Duplicate trace feature id/
);

const invalidConfidence={
  ...trace,
  features:trace.features.map((feature,index)=>index?feature:{
    ...feature,
    properties:{...feature.properties,eventDateConfidence:'certain'}
  })
};
assert.throws(
  ()=>Compiler.compileAuthoring({trace:invalidConfidence,schema,projection,eventOverlay}),
  /invalid confidence label/
);

assert.throws(
  ()=>Compiler.compileDirectory(require('./fixtures/cable-street-pending-authoring.cjs')()),
  /not MAP-01 to MAP-06 ready/
);

console.log('PASS: Cable Street compiler converts current layer/kind authoring data into deterministic runtime geometry.');
console.log('PASS: compiler preserves evidence metadata, projects event areas and validates/project SLICE-02 barricade, material, rescue and police placements.');
console.log('PASS: a pending Cable Street package remains blocked until MAP-01 through MAP-06 and the runtime projection are ready.');
