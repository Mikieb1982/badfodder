'use strict';

const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const assert=require('node:assert/strict');
const Calibration=require('../tools/cable-street/calibrate-grid.cjs');
const Authoring=require('../tools/cable-street/validate-authoring.cjs');
const Compiler=require('../tools/cable-street/compile-map-package.cjs');

const root=path.join(__dirname,'..');
const realDir=path.join(root,'authoring/cable-street');

function write(dir,name,value){
  fs.writeFileSync(path.join(dir,name),JSON.stringify(value,null,2)+'\n');
}
function source(id){
  return{id,title:id+' title',url:'https://example.test/'+id,supports:['test support'],limits:['test limit']};
}
function makeReadyPackage(){
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'badfodder-cable-ready-'));
  const schema=JSON.parse(fs.readFileSync(path.join(realDir,'authoring-schema.json'),'utf8'));

  write(dir,'first-slice-boundary.json',{
    id:'boundary-ready',
    missionId:'cable-street-1936',
    status:'frozen-research-boundary',
    productionGeometry:false,
    masterCrs:'EPSG:27700',
    includes:['barrier area','west approach','player work area','withdrawal destination'],
    excludes:[],
    evidenceSourceIds:['S01','S03'],
    exactCropGeometry:null,
    exactBarricadeCoordinate:null
  });

  write(dir,'evidence-register.json',{
    sources:['S01','S02','S03','S04','S05','S06'].map(source)
  });
  write(dir,'authoring-schema.json',schema);

  const calibration=Calibration.fitCalibrationRecord({
    id:'fixture-calibration',
    status:'awaiting-control-points',
    masterCrs:'EPSG:27700',
    controls:[
      {id:'c1',image:[0,0],grid:[534000,181000]},
      {id:'c2',image:[1000,0],grid:[535000,181000]},
      {id:'c3',image:[0,1000],grid:[534000,180000]}
    ],
    checkControls:[
      {id:'check',image:[500,500],grid:[534500,180500]}
    ]
  });
  write(dir,'calibration.json',calibration);

  write(dir,'trace.geojson',{
    type:'FeatureCollection',
    properties:{id:'ready-trace',status:'traced',productionReady:false,crs:'EPSG:27700'},
    features:[
      {
        type:'Feature',
        properties:{
          id:'road-edge-west',kind:'street-edge',layer:'carriageway-edge',
          sourceIds:['S01','S02'],sourceDate:'1916 baseline / 1937 cross-check',
          confidence:'directly depicted',eventDateConfidence:'corroborated',
          affectsMovement:true,interpretationNote:'street edge retained after cross-check',
          gameplayAdjustment:''
        },
        geometry:{type:'LineString',coordinates:[[534100,180950],[534220,180950]]}
      },
      {
        type:'Feature',
        properties:{
          id:'building-a',kind:'building',layer:'building-envelope',
          sourceIds:['S01'],sourceDate:'1916',
          confidence:'directly depicted',eventDateConfidence:'inferred',
          affectsMovement:true,interpretationNote:'building envelope directly depicted in baseline; 1936 continuity inferred',
          gameplayAdjustment:''
        },
        geometry:{type:'Polygon',coordinates:[[
          [534120,180940],[534150,180940],[534150,180910],[534120,180910],[534120,180940]
        ]]}
      },
      {
        type:'Feature',
        properties:{
          id:'railway-1',kind:'railway',layer:'railway',
          sourceIds:['S01','S02'],sourceDate:'1916 / 1937',
          confidence:'directly depicted',eventDateConfidence:'corroborated',
          affectsMovement:true,interpretationNote:'alignment cross-checked against near-period evidence',
          gameplayAdjustment:''
        },
        geometry:{type:'LineString',coordinates:[[534090,180990],[534240,180990]]}
      }
    ]
  });

  write(dir,'reconciliation.json',{
    id:'reconciliation-ready',
    missionId:'cable-street-1936',
    eventDate:'1936-10-04',
    status:'complete',
    baselineSourceIds:['S01'],
    nearPeriodSourceIds:['S02','S05'],
    decisionLabels:['retain','exclude','uncertain','fictional adaptation'],
    decisions:[
      {
        featureId:'road-edge-west',sourceGeometryConfidence:'directly depicted',
        eventDateConfidence:'corroborated',sourceIds:['S01','S02'],
        treatment:'retain',essentialRouteUse:true,note:'cross-checked route geometry'
      },
      {
        featureId:'building-a',sourceGeometryConfidence:'directly depicted',
        eventDateConfidence:'inferred',sourceIds:['S01'],
        treatment:'retain',essentialRouteUse:false,note:'not used as an essential passage'
      },
      {
        featureId:'railway-1',sourceGeometryConfidence:'directly depicted',
        eventDateConfidence:'corroborated',sourceIds:['S01','S02'],
        treatment:'retain',essentialRouteUse:false,note:'orientation/collision context only'
      }
    ]
  });

  write(dir,'event-overlay.geojson',{
    type:'FeatureCollection',
    properties:{
      id:'overlay-ready',missionId:'cable-street-1936',status:'complete',
      eventDate:'1936-10-04',sourceIds:['S03','S04']
    },
    features:[
      {
        type:'Feature',
        properties:{
          id:'christian-street-barricade-vicinity',
          kind:'barricade-vicinity',
          sourceIds:['S03'],
          confidence:'corroborated',
          interpretationNote:'supported vicinity represented as an area, not an exact point'
        },
        geometry:{type:'Polygon',coordinates:[[
          [534160,180958],[534184,180958],[534184,180936],[534160,180936],[534160,180958]
        ]]}
      }
    ]
  });

  write(dir,'historical-review.json',{
    id:'review-ready',
    missionId:'cable-street-1936',
    status:'complete',
    mapDescription:'historical reconstruction from mixed-date evidence',
    checks:[
      {id:'junction-order',status:'passed',blocking:true},
      {id:'modern-anachronisms',status:'passed',blocking:true},
      {id:'passage-evidence',status:'resolved',blocking:true}
    ],
    remainingUncertainty:['Exact barricade footprint remains an interpretation inside the supported area.'],
    reviewNotes:['Synthetic ready package used only for validator/compiler tests.']
  });

  write(dir,'game-transform.json',{
    id:'transform-ready',
    missionId:'cable-street-1936',
    status:'ready',
    sourceCrs:'EPSG:27700',
    originBng:[534000,181000],
    metresPerMapUnit:1,
    orientation:'north-up',
    axis:{x:'east-positive',y:'south-positive'}
  });

  return dir;
}

const current=Authoring.evaluate(realDir);
assert.equal(current.gates['MAP-01'],true);
assert.equal(current.gates['MAP-02'],true);
assert.equal(current.gates['MAP-03'],false);
assert.equal(current.gates['MAP-04'],false);
assert.equal(current.gates['MAP-05'],false);
assert.equal(current.gates['MAP-06'],false);
assert.equal(current.gameTransformReady,false);
assert.throws(()=>Compiler.compile(realDir),/not MAP-01 to MAP-06 ready/);

const readyDir=makeReadyPackage();
const ready=Authoring.evaluate(readyDir);
assert.equal(ready.ok,true);
assert.deepEqual(ready.gates,{
  'MAP-01':true,'MAP-02':true,'MAP-03':true,
  'MAP-04':true,'MAP-05':true,'MAP-06':true
});
assert.equal(ready.productionReady,true);
assert.equal(ready.gameTransformReady,true);
assert.equal(ready.traceFeatureCount,3);
assert.equal(ready.movementFeatureCount,3);
assert.equal(ready.eventOverlayFeatureCount,1);

const compiled=Compiler.compile(readyDir);
assert.equal(compiled.status,'compiled-authoring-package');
assert.equal(compiled.sourceCrs,'EPSG:27700');
assert.equal(compiled.orientation,'north-up');
assert.equal(compiled.features.length,3);
assert.equal(compiled.eventZones.length,1);
assert.equal(compiled.layers['carriageway-edge'].length,1);
assert.equal(compiled.layers['building-envelope'].length,1);
assert.equal(compiled.layers.railway.length,1);

const road=compiled.features.find(f=>f.properties.id==='road-edge-west');
assert.deepEqual(road.geometry.coordinates[0],[100,50]);
assert.deepEqual(road.geometry.coordinates[1],[220,50]);
assert.deepEqual(Compiler.bngToLocal([534100,180900],{
  originBng:[534000,181000],metresPerMapUnit:2
}),[50,50]);
assert(compiled.bounds.width>0&&compiled.bounds.height>0);

// An inferred 1936 passage cannot quietly become an essential route.
const reconciliationPath=path.join(readyDir,'reconciliation.json');
const reconciliation=JSON.parse(fs.readFileSync(reconciliationPath,'utf8'));
const buildingDecision=reconciliation.decisions.find(x=>x.featureId==='building-a');
buildingDecision.essentialRouteUse=true;
buildingDecision.treatment='retain';
write(readyDir,'reconciliation.json',reconciliation);
const unsafe=Authoring.evaluate(readyDir);
assert.equal(unsafe.gates['MAP-04'],false);
assert.equal(unsafe.productionReady,false);

// Explicitly labelling the same decision as a fictional gameplay adaptation is accepted.
buildingDecision.treatment='fictional adaptation';
buildingDecision.note='Essential route is a deliberate gameplay adaptation, not a historical passage claim.';
write(readyDir,'reconciliation.json',reconciliation);
const adapted=Authoring.evaluate(readyDir);
assert.equal(adapted.gates['MAP-04'],true);
assert.equal(adapted.productionReady,true);

// Approximate event locations may not be encoded as precise points.
const overlayPath=path.join(readyDir,'event-overlay.geojson');
const overlay=JSON.parse(fs.readFileSync(overlayPath,'utf8'));
overlay.features[0].geometry={type:'Point',coordinates:[534170,180947]};
write(readyDir,'event-overlay.geojson',overlay);
const pointOverlay=Authoring.evaluate(readyDir);
assert.equal(pointOverlay.gates['MAP-05'],false);
assert.equal(pointOverlay.gates['MAP-06'],false);

fs.rmSync(readyDir,{recursive:true,force:true});

console.log('PASS: MAP-04 to MAP-06 become computable gates and reject unsafe inferred essential routes or point-like event claims.');
console.log('PASS: guarded compiler refuses the real incomplete package and compiles a fully approved synthetic EPSG:27700 package.');
console.log('PASS: BNG-to-game conversion preserves north-up orientation while keeping calibration and game transforms separate.');
