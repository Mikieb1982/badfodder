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

const projection={
  status:'configured',
  masterCrs:'EPSG:27700',
  originEastingNorthing:[534500,181000],
  metresToWorldUnits:2,
  padding:20,
  northUp:true
};

const map=Compiler.compileAuthoring({trace,schema,projection,eventOverlay,mapKey:'fixture-cable'});
assert.equal(map.key,'fixture-cable');
assert.equal(map.buildings.length,1);
assert.equal(map.roads.length,1);
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
assert(map.width>map.buildings[0].maxX);
assert(map.height>map.buildings[0].maxY);
assert.equal(map.authoring.runtimeObjectsReady,false);
assert.deepEqual(map.historicalObjects,{barricades:[],materials:[],civilians:[],formations:[]});

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
  ()=>Compiler.compileDirectory(path.join(root,'authoring/cable-street')),
  /not MAP-01 to MAP-06 ready/
);

console.log('PASS: Cable Street compiler converts current layer/kind authoring data into deterministic runtime geometry.');
console.log('PASS: compiler preserves evidence metadata, projects event areas and rejects missing critical layers, duplicate IDs and invalid confidence.');
console.log('PASS: the real Cable Street map remains blocked until MAP-01 through MAP-06 and the runtime projection are ready.');
