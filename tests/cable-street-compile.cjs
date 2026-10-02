'use strict';

const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const Compiler=require('../tools/cable-street/compile-trace.cjs');

const root=path.join(__dirname,'..');
const schema=JSON.parse(fs.readFileSync(path.join(root,'authoring/cable-street/authoring-schema.json'),'utf8'));

function props(id,kind,extra={}){
  return{
    id,kind,
    sourceIds:['S01'],
    sourceDate:'1916',
    confidence:'directly depicted',
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
      properties:props('road-north-edge','carriageway-edge'),
      geometry:{type:'LineString',coordinates:[[534500,181000],[534600,181000]]}
    },
    {
      type:'Feature',
      properties:props('building-1','building-envelope'),
      geometry:{type:'Polygon',coordinates:[[
        [534520,180990],[534540,180990],[534540,180970],[534520,180970],[534520,180990]
      ]]}
    },
    {
      type:'Feature',
      properties:props('railway-1','railway'),
      geometry:{type:'LineString',coordinates:[[534510,180950],[534610,180950]]}
    },
    {
      type:'Feature',
      properties:props('event-b','event-zone',{role:'barricade-vicinity'}),
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

const map=Compiler.compileAuthoring({trace,schema,projection,mapKey:'fixture-cable'});
assert.equal(map.key,'fixture-cable');
assert.equal(map.buildings.length,1);
assert.equal(map.roads.length,1);
assert.equal(map.railways.length,1);
assert.equal(map.eventZones.length,1);
assert.equal(map.gameplayAdjustments.length,0);
assert.deepEqual(map.buildings[0].points[0],[60,40]);
assert.equal(map.buildings[0].minX,60);
assert.equal(map.buildings[0].maxY,80);
assert.equal(map.authoring.productionReady,false);
assert(map.width>map.buildings[0].maxX);
assert(map.height>map.buildings[0].maxY);

assert.throws(
  ()=>Compiler.compileAuthoring({trace,schema,projection:{...projection,status:'awaiting-approved-trace'}}),
  /not configured/
);

const noRail={...trace,features:trace.features.filter(f=>f.properties.kind!=='railway')};
assert.throws(
  ()=>Compiler.compileAuthoring({trace:noRail,schema,projection}),
  /missing production-critical layers: railway/
);

const duplicate={...trace,features:[...trace.features,trace.features[0]]};
assert.throws(
  ()=>Compiler.compileAuthoring({trace:duplicate,schema,projection}),
  /Duplicate trace feature id/
);

const invalidConfidence={
  ...trace,
  features:trace.features.map((feature,index)=>index?feature:{
    ...feature,
    properties:{...feature.properties,confidence:'certain'}
  })
};
assert.throws(
  ()=>Compiler.compileAuthoring({trace:invalidConfidence,schema,projection}),
  /invalid confidence label/
);

const realProjection=JSON.parse(fs.readFileSync(path.join(root,'authoring/cable-street/runtime-projection.json'),'utf8'));
assert.equal(realProjection.status,'awaiting-approved-trace');
assert.throws(
  ()=>Compiler.compileDirectory(path.join(root,'authoring/cable-street')),
  /not configured|contains no features/
);

console.log('PASS: Cable Street trace compiler projects BNG geometry into deterministic local map coordinates.');
console.log('PASS: compiler requires all production-critical trace layers and rejects duplicate IDs, invalid confidence and an unconfigured runtime projection.');
console.log('PASS: the real Cable Street authoring package remains non-compilable until approved production geometry and game-space projection exist.');
