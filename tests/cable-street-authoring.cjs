'use strict';

const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');

const root=path.join(__dirname,'..');
const Calibration=require('../tools/cable-street/calibrate-grid.cjs');
const Authoring=require('../tools/cable-street/validate-authoring.cjs');
const Historical=require('../historical-missions.js');

const fixture=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/cable-street-calibration-fixture.json'),'utf8'));
const fitted=Calibration.fitCalibrationRecord(fixture);

assert.equal(fitted.status,'calibrated');
assert.equal(fitted.transform.type,'affine-2d');
for(const value of Object.values(fitted.transform.coefficients))assert(Number.isFinite(value));

const transformed=Calibration.applyTransform(fitted.transform,[500,400]);
assert(Math.abs(transformed[0]-534400)<1e-7);
assert(Math.abs(transformed[1]-180950)<1e-7);
assert(fitted.residuals.controlSummary.rmsMetres<1e-7);
assert(fitted.residuals.checkSummary.rmsMetres<1e-7);

assert.throws(
  ()=>Calibration.fitAffine([
    {id:'a',image:[0,0],grid:[0,0]},
    {id:'b',image:[1,1],grid:[1,1]},
    {id:'c',image:[2,2],grid:[2,2]}
  ]),
  /degenerate/
);
assert.throws(
  ()=>Calibration.fitAffine([
    {id:'a',image:[0,0],grid:[0,0]},
    {id:'a',image:[1,0],grid:[1,0]},
    {id:'c',image:[0,1],grid:[0,1]}
  ]),
  /Duplicate control id/
);

const authoringDir=path.join(root,'authoring/cable-street');
const report=Authoring.evaluate(authoringDir);

assert.equal(report.ok,true,'MAP-01/MAP-02 authoring package should be structurally valid');
assert.equal(report.gates['MAP-01'],true,'Research boundary should be frozen');
assert.equal(report.gates['MAP-02'],true,'Evidence register should be complete');
assert.equal(report.gates['MAP-03'],false,'Production trace must remain incomplete before real calibration/tracing');
assert.equal(report.gates['MAP-04'],false,'Reconciliation must remain pending before traced features exist');
assert.equal(report.gates['MAP-05'],false,'Event overlay must remain pending before reconciliation');
assert.equal(report.gates['MAP-06'],false,'Historical review must remain pending before overlay/reconciliation');
assert.equal(report.productionReady,false,'Cable Street must not become production-ready from metadata alone');
assert.equal(report.calibrationReady,false,'Real calibration record must remain pending');
assert.equal(report.reconciliationReady,false);
assert.equal(report.eventOverlayReady,false);
assert.equal(report.reviewReady,false);
assert.equal(report.uncertaintyReady,false);
assert.equal(report.blockingUncertaintyCount,2);
assert.equal(report.runtimeProjectionReady,false,'Runtime projection must remain locked before approved geometry');
assert.equal(report.traceFeatureCount,0,'Production trace must stay empty until source geometry is traced');

const boundary=JSON.parse(fs.readFileSync(path.join(authoringDir,'first-slice-boundary.json'),'utf8'));
assert.equal(boundary.id,'cable-street-christian-street-slice-v1');
assert.equal(boundary.masterCrs,'EPSG:27700');
assert.equal(boundary.productionGeometry,false);
assert.equal(boundary.exactCropGeometry,null);
assert.equal(boundary.exactBarricadeCoordinate,null);
assert(boundary.includes.some(x=>/western police approach/i.test(x)));
assert(boundary.includes.some(x=>/withdrawal/i.test(x)));

const evidence=JSON.parse(fs.readFileSync(path.join(authoringDir,'evidence-register.json'),'utf8'));
assert.equal(evidence.sources.length,6);
const ids=evidence.sources.map(s=>s.id);
assert.deepEqual(ids,['S01','S02','S03','S04','S05','S06']);
assert.deepEqual(evidence.sources.find(s=>s.id==='S02').catalogueEastingNorthing,[534552,181303]);
assert.deepEqual(evidence.sources.find(s=>s.id==='S01').reportedGridReference,[534565,180929]);

const schema=JSON.parse(fs.readFileSync(path.join(authoringDir,'authoring-schema.json'),'utf8'));
assert.deepEqual(schema.confidenceLabels,[
  'directly depicted',
  'corroborated',
  'inferred',
  'fictional gameplay'
]);
for(const attr of ['id','kind','layer','sourceIds','sourceDate','confidence','eventDateConfidence','affectsMovement','geometry','interpretationNote','gameplayAdjustment']){
  assert(schema.requiredFeatureAttributes.includes(attr),'Missing required authoring attribute '+attr);
}

const trace=JSON.parse(fs.readFileSync(path.join(authoringDir,'trace.geojson'),'utf8'));
assert.equal(trace.type,'FeatureCollection');
assert.equal(trace.properties.status,'empty-awaiting-calibrated-trace');
assert.equal(trace.properties.productionReady,false);
assert.deepEqual(trace.features,[]);

const reconciliation=JSON.parse(fs.readFileSync(path.join(authoringDir,'reconciliation.json'),'utf8'));
assert.equal(reconciliation.status,'pending-feature-reconciliation');
assert.deepEqual(reconciliation.baselineSourceIds,['S01']);
assert(reconciliation.nearPeriodSourceIds.includes('S02'));

const overlay=JSON.parse(fs.readFileSync(path.join(authoringDir,'event-overlay.geojson'),'utf8'));
assert.equal(overlay.properties.status,'pending-event-overlay');
assert.deepEqual(overlay.features,[]);
assert(overlay.properties.rules.some(x=>/Polygon or MultiPolygon/i.test(x)));

const review=JSON.parse(fs.readFileSync(path.join(authoringDir,'historical-review.json'),'utf8'));
assert.equal(review.status,'pending-contradiction-review');
assert(review.checks.every(x=>x.status==='pending'));
assert(/reconstruction/i.test(review.mapDescription));

const uncertainty=JSON.parse(fs.readFileSync(path.join(authoringDir,'uncertainty-log.json'),'utf8'));
assert.equal(uncertainty.status,'active');
assert.equal(uncertainty.entries.filter(x=>x.blocking&&x.status==='open').length,2);
assert(uncertainty.entries.some(x=>x.id==='u-barricade-footprint'));
assert(uncertainty.entries.some(x=>x.id==='u-passages'));

const runtimeProjection=JSON.parse(fs.readFileSync(path.join(authoringDir,'runtime-projection.json'),'utf8'));
assert.equal(runtimeProjection.status,'awaiting-approved-trace');
assert.equal(runtimeProjection.masterCrs,'EPSG:27700');
assert.equal(runtimeProjection.originEastingNorthing,null);
assert.equal(runtimeProjection.metresToWorldUnits,null);

const runtimeObjects=JSON.parse(fs.readFileSync(path.join(authoringDir,'runtime-objects.json'),'utf8'));
assert.equal(runtimeObjects.status,'awaiting-approved-map');
assert.equal(runtimeObjects.crs,'EPSG:27700');
assert.deepEqual(runtimeObjects.requirements.materialTypes,['timber','crates','furniture']);
assert.deepEqual(runtimeObjects.objects,{barricades:[],materials:[],civilians:[],formations:[]});

const mission=Historical.get('cable-street-1936');
assert(mission&&mission.mapResearch);
assert.equal(mission.mapResearch.boundaryId,boundary.id);
assert.equal(mission.mapResearch.masterCrs,'EPSG:27700');
assert.deepEqual(mission.mapResearch.requiredGates,['MAP-01','MAP-02','MAP-03','MAP-04','MAP-05','MAP-06']);
assert.equal(mission.mapResearch.productionGeometryReady,false);
assert.equal(mission.mapResearch.reconciliationRecord,'authoring/cable-street/reconciliation.json');
assert.equal(mission.mapResearch.eventOverlay,'authoring/cable-street/event-overlay.geojson');
assert.equal(mission.mapResearch.contradictionReview,'authoring/cable-street/historical-review.json');
assert.equal(mission.mapResearch.uncertaintyLog,'authoring/cable-street/uncertainty-log.json');
assert.equal(mission.mapResearch.runtimeProjection,'authoring/cable-street/runtime-projection.json');
assert.equal(mission.mapResearch.runtimeObjects,'authoring/cable-street/runtime-objects.json');
assert.equal(mission.mapReady,false);
assert.equal(mission.playable,false);
assert.equal(mission.map,undefined,'Authoring groundwork must not prematurely add a production map key');

console.log('PASS: Cable Street authoring package freezes the Christian Street research boundary and catalogues S01-S06 without inventing production geometry.');
console.log('PASS: affine calibration tooling recovers known EPSG:27700 control/check points and rejects degenerate control sets.');
console.log('PASS: readiness validation keeps MAP-03 through MAP-06, runtime projection and SLICE-02 object placement locked until approved evidence exists.');
