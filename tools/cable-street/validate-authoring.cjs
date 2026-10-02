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

  const confidence=new Set(schema.confidenceLabels||[]);
  const requiredLabels=['directly depicted','corroborated','inferred','fictional gameplay'];
  const layerIds=new Set((schema.layers||[]).map(x=>x&&x.id).filter(Boolean));
  const requiredAttrs=schema.requiredFeatureAttributes||[];
  const schemaReady=
    schema.masterCrs==='EPSG:27700'&&
    requiredLabels.every(x=>confidence.has(x))&&
    ['carriageway-edge','building-envelope','railway','event-zone','gameplay-adjustment'].every(x=>layerIds.has(x));
  if(!schemaReady)problems.push('Authoring confidence/layer schema is incomplete.');

  const calibrationReady=
    calibration.status==='calibrated'&&
    calibration.masterCrs==='EPSG:27700'&&
    Array.isArray(calibration.controls)&&calibration.controls.length>=3&&
    Array.isArray(calibration.checkControls)&&calibration.checkControls.length>=1&&
    calibration.transform&&calibration.transform.type==='affine-2d'&&
    calibration.residuals&&
    calibration.residuals.controlSummary&&
    Number.isFinite(calibration.residuals.controlSummary.rmsMetres)&&
    calibration.residuals.checkSummary&&
    Number.isFinite(calibration.residuals.checkSummary.rmsMetres);

  const traceFeatures=Array.isArray(trace.features)?trace.features:[];
  const traceHasFeatures=traceFeatures.length>0;
  const traceCrs=trace.properties&&trace.properties.crs==='EPSG:27700';
  const traceAttributesValid=traceHasFeatures&&traceFeatures.every(feature=>{
    const props=feature.properties||{};
    if(!requiredAttrs.every(attr=>attr==='geometry'?!!feature.geometry:Object.prototype.hasOwnProperty.call(props,attr)))return false;
    if(!layerIds.has(props.layer))return false;
    if(!confidence.has(props.confidence)||!confidence.has(props.eventDateConfidence))return false;
    if(typeof props.affectsMovement!=='boolean')return false;
    if(!sourceListValid(props.sourceIds,sourceIds))return false;
    return !!feature.geometry&&nonEmptyString(feature.geometry.type);
  });
  const map03=!!(calibrationReady&&traceCrs&&traceHasFeatures&&traceAttributesValid);
  if(!map03)problems.push('MAP-03 calibrated production trace is not complete.');

  const movementFeatures=traceFeatures.filter(feature=>feature.properties&&feature.properties.affectsMovement===true);
  const decisions=Array.isArray(reconciliation.decisions)?reconciliation.decisions:[];
  const decisionsByFeature=new Map(decisions.map(d=>[d&&d.featureId,d]));
  const treatmentLabels=new Set(reconciliation.decisionLabels||[]);
  const reconciliationSources=[
    ...(reconciliation.baselineSourceIds||[]),
    ...(reconciliation.nearPeriodSourceIds||[])
  ];
  let reconciliationReady=
    reconciliation.status==='complete'&&
    reconciliation.eventDate==='1936-10-04'&&
    reconciliationSources.length>0&&
    reconciliationSources.every(id=>sourceIds.has(id));

  if(reconciliationReady){
    for(const feature of movementFeatures){
      const props=feature.properties||{};
      const decision=decisionsByFeature.get(props.id);
      if(!decision){reconciliationReady=false;break}
      const validDecision=
        nonEmptyString(decision.featureId)&&
        confidence.has(decision.sourceGeometryConfidence)&&
        confidence.has(decision.eventDateConfidence)&&
        sourceListValid(decision.sourceIds,sourceIds)&&
        treatmentLabels.has(decision.treatment)&&
        typeof decision.essentialRouteUse==='boolean'&&
        nonEmptyString(decision.note);
      if(!validDecision){reconciliationReady=false;break}
      const strong=decision.eventDateConfidence==='directly depicted'||decision.eventDateConfidence==='corroborated';
      if(decision.essentialRouteUse&&!strong&&decision.treatment!=='fictional adaptation'){
        reconciliationReady=false;break;
      }
    }
  }
  const map04=!!(map03&&reconciliationReady);
  if(!map04)problems.push('MAP-04 near-period reconciliation is not complete.');

  const overlayFeatures=Array.isArray(eventOverlay.features)?eventOverlay.features:[];
  const overlayReady=
    eventOverlay.type==='FeatureCollection'&&
    eventOverlay.properties&&eventOverlay.properties.status==='complete'&&
    sourceListValid(eventOverlay.properties.sourceIds,sourceIds)&&
    overlayFeatures.length>0&&
    overlayFeatures.every(feature=>{
      const props=feature.properties||{};
      return geometryType(feature,'Polygon','MultiPolygon')&&
        nonEmptyString(props.id)&&
        nonEmptyString(props.kind)&&
        sourceListValid(props.sourceIds,sourceIds)&&
        confidence.has(props.confidence)&&
        nonEmptyString(props.interpretationNote);
    });
  const map05=!!(map02&&map04&&overlayReady);
  if(!map05)problems.push('MAP-05 event overlay is not complete.');

  const reviewChecks=Array.isArray(historicalReview.checks)?historicalReview.checks:[];
  const reviewReady=
    historicalReview.status==='complete'&&
    nonEmptyString(historicalReview.mapDescription)&&
    /reconstruction/i.test(historicalReview.mapDescription)&&
    reviewChecks.length>0&&
    reviewChecks.every(check=>
      check&&nonEmptyString(check.id)&&
      ['passed','resolved'].includes(check.status)
    )&&
    Array.isArray(historicalReview.remainingUncertainty);
  const map06=!!(map03&&map04&&map05&&reviewReady);
  if(!map06)problems.push('MAP-06 historical contradiction review is not complete.');

  const gameTransformReady=
    gameTransform.status==='ready'&&
    gameTransform.sourceCrs==='EPSG:27700'&&
    gameTransform.orientation==='north-up'&&
    finitePair(gameTransform.originBng)&&
    Number.isFinite(gameTransform.metresPerMapUnit)&&gameTransform.metresPerMapUnit>0&&
    gameTransform.axis&&
    gameTransform.axis.x==='east-positive'&&
    gameTransform.axis.y==='south-positive';
  if(!gameTransformReady)problems.push('Game transform is not ready for SLICE-01 compilation.');

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
    gameTransformReady,
    gates,
    calibrationReady,
    reconciliationReady,
    eventOverlayReady:overlayReady,
    reviewReady,
    traceFeatureCount:traceFeatures.length,
    eventOverlayFeatureCount:overlayFeatures.length,
    movementFeatureCount:movementFeatures.length,
    problems
  };
}

function main(argv){
  const baseDir=path.resolve(argv[2]||path.join(__dirname,'../../authoring/cable-street'));
  const report=evaluate(baseDir);
  process.stdout.write(JSON.stringify(report,null,2)+'\n');
  if(argv.includes('--require-ready')&&(!report.productionReady||!report.gameTransformReady))process.exitCode=1;
  else if(!report.ok)process.exitCode=1;
}

if(require.main===module)main(process.argv);
module.exports={evaluate};
