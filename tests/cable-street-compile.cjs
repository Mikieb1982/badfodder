'use strict';

const path=require('node:path');
const assert=require('node:assert/strict');
const Compiler=require('../tools/cable-street/compile-trace.cjs');

const root=path.join(__dirname,'..');

function props(id,kind,layer,extra={}){
  return{
    id,kind,layer,
    sourceIds:['S01'],
    sourceDate:'1916',
    confidence:'directly depicted',
    eventDateConfidence:'corroborated',
    affectsMovement:true,
    interpretationNote:'synthetic runtime compiler fixture',
    gameplayAdjustment:'',
    ...extra
  };
}

const pkg={
  id:'compiled-cable-fixture',
  missionId:'cable-street-1936',
  status:'compiled-authoring-package',
  sourceCrs:'EPSG:27700',
  localCrs:'bad-fodder-local-map',
  orientation:'north-up',
  transform:{
    originBng:[534000,181000],
    metresPerMapUnit:1,
    axis:{x:'east-positive',y:'south-positive'}
  },
  width:260,
  height:140,
  features:[
    {
      type:'Feature',
      properties:props('road-north-edge','street-edge','carriageway-edge'),
      geometry:{type:'LineString',coordinates:[[20,40],[240,40]]}
    },
    {
      type:'Feature',
      properties:props('building-1','building','building-envelope',{
        eventDateConfidence:'inferred',
        affectsMovement:true
      }),
      geometry:{type:'Polygon',coordinates:[[
        [60,50],[100,50],[100,90],[60,90],[60,50]
      ]]}
    },
    {
      type:'Feature',
      properties:props('railway-1','railway','railway'),
      geometry:{type:'LineString',coordinates:[[20,110],[240,110]]}
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
        [130,50],[160,50],[160,80],[130,80],[130,50]
      ]]}
    }
  ],
  eventZones:[
    {
      type:'Feature',
      properties:{
        id:'christian-street-barricade-vicinity',
        kind:'barricade-vicinity',
        sourceIds:['S03'],
        confidence:'corroborated',
        interpretationNote:'Supported vicinity, not an exact point.'
      },
      geometry:{type:'Polygon',coordinates:[[
        [170,45],[205,45],[205,85],[170,85],[170,45]
      ]]}
    }
  ],
  evidence:{
    sourceIds:['S01','S03'],
    reconciliationId:'fixture-reconciliation',
    historicalReviewId:'fixture-review'
  }
};

const map=Compiler.compilePackage(pkg,{mapKey:'fixture-cable'});
assert.equal(map.key,'fixture-cable');
assert.equal(map.width,260);
assert.equal(map.height,140);
assert.equal(map.buildings.length,1);
assert.equal(map.roads.length,1);
assert.equal(map.railways.length,1);
assert.equal(map.gameplayAdjustments.length,1);
assert.equal(map.eventZones.length,1);
assert.deepEqual(map.buildings[0].points[0],[60,50]);
assert.equal(map.buildings[0].minX,60);
assert.equal(map.buildings[0].maxY,90);
assert.equal(map.buildings[0].kind,'building');
assert.equal(map.buildings[0].layer,'building-envelope');
assert.equal(map.buildings[0].eventDateConfidence,'inferred');
assert.equal(map.eventZones[0].role,'barricade-vicinity');
assert.equal(map.authoring.productionReady,true);
assert.equal(map.authoring.runtimeObjectsReady,false);
assert.deepEqual(map.historicalObjects,{barricades:[],materials:[],civilians:[],formations:[]});

const missingRail={
  ...pkg,
  features:pkg.features.filter(f=>f.properties.layer!=='railway')
};
assert.throws(
  ()=>Compiler.compilePackage(missingRail),
  /missing a production-critical runtime layer/
);

const duplicate={
  ...pkg,
  features:[...pkg.features,pkg.features[0]]
};
assert.throws(
  ()=>Compiler.compilePackage(duplicate),
  /Duplicate compiled trace feature id/
);

assert.throws(
  ()=>Compiler.compilePackage({...pkg,width:200}),
  /geometry exceeds declared Cable Street world bounds/
);

assert.throws(
  ()=>Compiler.compilePackage({...pkg,status:'draft'}),
  /requires a guarded compiled authoring package/
);

assert.throws(
  ()=>Compiler.compileDirectory(path.join(root,'authoring/cable-street')),
  /not MAP-01 to MAP-06 ready/
);

console.log('PASS: Cable Street runtime compiler converts approved local authoring layers into navigation/rendering map structures.');
console.log('PASS: runtime compiler preserves evidence metadata, keeps historical interaction objects empty for SLICE-02 and rejects missing critical layers or invalid bounds.');
console.log('PASS: the real Cable Street authoring package remains blocked until MAP-01 through MAP-06 and the game transform are ready.');
