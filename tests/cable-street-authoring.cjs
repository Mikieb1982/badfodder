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
assert.equal(report.productionReady,true,JSON.stringify(report));
assert.equal(report.runtimeProjectionReady,true);
assert.equal(report.blockingUncertaintyCount,0);
assert(report.traceFeatureCount>20);
const calibration=JSON.parse(fs.readFileSync(path.join(authoringDir,'calibration.json')));
assert.equal(calibration.sourceCrop.pdfPage,154);
assert(calibration.residuals.checkSummary.rmsMetres<1);
const boundary=JSON.parse(fs.readFileSync(path.join(authoringDir,'first-slice-boundary.json')));
assert.equal(boundary.exactBarricadeCoordinate,null,'Approximate event must not claim exact historical coordinates');
const mission=Historical.get('cable-street-1936');
assert.equal(mission.mapReady,true);assert.equal(mission.playable,true);
assert.equal(mission.map,'cable-street');
assert.equal(mission.campaignLinked,false);
const pending=require('./fixtures/cable-street-pending-authoring.cjs')();
assert.equal(Authoring.evaluate(pending).productionReady,false,'Empty trace must stay blocked even with passed metadata');
console.log('PASS: calibrated period-map slice passes evidence gates; removing real trace blocks production.');
