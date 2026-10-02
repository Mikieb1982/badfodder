#!/usr/bin/env node
'use strict';

const fs=require('node:fs');
const path=require('node:path');

function readJson(file){
  return JSON.parse(fs.readFileSync(file,'utf8'));
}
function exists(file){
  try{return fs.statSync(file).isFile()}catch(_){return false}
}
function nonEmptyString(v){return typeof v==='string'&&v.trim().length>0}
function finitePair(v){return Array.isArray(v)&&v.length>=2&&Number.isFinite(v[0])&&Number.isFinite(v[1])}
function sourceListValid(ids,sourceIds){return Array.isArray(ids)&&ids.length>0&&ids.every(id=>sourceIds.has(id))}
function geometryType(feature,...types){return !!(feature&&feature.geometry&&types.includes(feature.geometry.type))}

function evaluate(baseDir){
  const files={
    boundary:path.join(baseDir,'first-slice-boundary.json'),
    evidence:path.join(baseDir,'evidence-register.json'),
    schema:path.join(baseDir,'authoring-schema.json'),
    calibration:path.join(baseDir,'calibration.json'),
    trace:path.join(baseDir,'trace.geojson'),
    reconciliation:path.join(baseDir,'reconciliation.json'),
    eventOverlay:path.join(baseDir,'event-overlay.geojson'),
    historicalReview:path.join(baseDir,'historical-review.json'),
    gameTransform:path.join(baseDir,'game-transform.json')
  };
  const missing=Object.entries(files).filter(([,file])=>!exists(file)).map(([key])=>key);
  if(missing.length)return{ok:false,productionReady:false,missing,gates:{},problems:['Missing authoring files: '+missing.join(', ')]};

  const boundary=readJson(files.boundary);
  const evidence=readJson(files.evidence);
  const schema=readJson(files.schema);
  const calibration=readJson(files.calibration);
  const trace=readJson(files.trace);
  const reconciliation=readJson(files.reconciliation);
  const eventOverlay=readJson(files.eventOverlay);
  const historicalReview=readJson(files.historicalReview);
  const gameTransform=readJson(files.gameTransform);
  const problems=[];

  const sourceIds=new Set((evidence.sources||[]).map(s=>s&&s.id).filter(Boolean));
  const boundarySources=boundary.evidenceSourceIds||[];
  const evidenceComplete=(evidence.sources||[]).length>=6&&
    (evidence.sources||[]).every(s=>nonEmptyString(s.id)&&nonEmptyString(s.title)&&nonEmptyString(s.url)&&Array.isArray(s.supports)&&Array.isArray(s.limits));
  if(!evidenceComplete)problems.push('Evidence register is incomplete.');
  for(const id of boundarySources)if(!sourceIds.has(id))problems.push('Boundary references unknown source '+id+'.');

  const map01=
    boundary.status==='frozen-research-boundary'&&
    boundary.productionGeometry===false&&
    boundary.masterCrs==='EPSG:27700'&&
    Array.isArray(boundary.includes)&&boundary.includes.length>=4&&
    boundary.exactBarricadeCoordinate===null;
  if(!map01)problems.push('MAP-01 research boundary is not frozen safely.');

  const map02=evidenceComplete&&boundarySources.every(id=>sourceIds.has(id));
  if(!map02)problems.push('MAP-02 source catalogue is not complete.');

  const calibrationReady=
    calibration.status==='calibrated'&&
    calibration.masterCrs==='EPSG:27700'&&
    Array.isArray(calibration.controls)&&calibration.controls.length>=3&&
    Array.isArray(calibration.checkControls)&&calibration.checkControls.length>=1&&
    calibration.transform&&calibration.transform.type==='affine-2d'&&
    calibration.residuals&&calibration.residuals.controlSummary;
  const traceHasFeatures=Array.isArray(trace.features)&&trace.features.length>0;
  const traceCrs=trace.properties&&trace.properties.crs==='EPSG:27700';
  const requiredAttrs=schema.requiredFeatureAttributes||[];
  const traceAttributesValid=traceHasFeatures&&trace.features.every(feature=>{
    const props=feature.properties||{};
    return requiredAttrs.every(attr=>attr==='geometry'?!!feature.geometry:Object.prototype.hasOwnProperty.call(props,attr));
  });
  const map03=!!(calibrationReady&&traceCrs&&traceHasFeatures&&traceAttributesValid);
  if(!map03)problems.push('MAP-03 calibrated production trace is not complete.');

  const confidence=new Set(schema.confidenceLabels||[]);
  const requiredLabels=['directly depicted','corroborated','inferred','fictional gameplay'];
  const schemaReady=schema.masterCrs==='EPSG:27700'&&requiredLabels.every(x=>confidence.has(x));
  if(!schemaReady)problems.push('Authoring confidence schema is incomplete.');

  // MAP-04 to MAP-06 intentionally require explicit review artifacts that do not exist yet.
  const map04=false;
  const map05=false;
  const map06=false;

  const gates={
    'MAP-01':map01,
    'MAP-02':map02,
    'MAP-03':map03,
    'MAP-04':map04,
    'MAP-05':map05,
    'MAP-06':map06
  };
  const productionReady=Object.values(gates).every(Boolean);

  return{
    ok:map01&&map02&&schemaReady,
    productionReady,
    gates,
    calibrationReady,
    traceFeatureCount:Array.isArray(trace.features)?trace.features.length:0,
    problems
  };
}

function main(argv){
  const baseDir=path.resolve(argv[2]||path.join(__dirname,'../../authoring/cable-street'));
  const report=evaluate(baseDir);
  process.stdout.write(JSON.stringify(report,null,2)+'\n');
  if(argv.includes('--require-ready')&&!report.productionReady)process.exitCode=1;
  else if(!report.ok)process.exitCode=1;
}

if(require.main===module)main(process.argv);
module.exports={evaluate};
