#!/usr/bin/env node
'use strict';

const fs=require('node:fs');
const path=require('node:path');
const Authoring=require('./validate-authoring.cjs');

function readJson(file){return JSON.parse(fs.readFileSync(file,'utf8'))}
function finitePair(v,label){
  if(!Array.isArray(v)||v.length<2||!Number.isFinite(v[0])||!Number.isFinite(v[1])){
    throw new Error(label+' must be a finite [x,y] pair.');
  }
  return[v[0],v[1]];
}

function bngToLocal(coord,transform){
  const [easting,northing]=finitePair(coord,'BNG coordinate');
  const [originE,originN]=finitePair(transform.originBng,'Game transform originBng');
  const metres=transform.metresPerMapUnit;
  if(!Number.isFinite(metres)||metres<=0)throw new Error('metresPerMapUnit must be positive.');
  return[
    (easting-originE)/metres,
    (originN-northing)/metres
  ];
}

function transformCoordinates(coords,transform,depth=0){
  if(!Array.isArray(coords))throw new Error('Geometry coordinates must be arrays.');
  if(coords.length>=2&&Number.isFinite(coords[0])&&Number.isFinite(coords[1])){
    return bngToLocal(coords,transform);
  }
  return coords.map(c=>transformCoordinates(c,transform,depth+1));
}

function transformGeometry(geometry,transform){
  if(!geometry||typeof geometry!=='object'||typeof geometry.type!=='string'){
    throw new Error('Feature geometry is required.');
  }
  if(geometry.type==='GeometryCollection'){
    return{
      type:'GeometryCollection',
      geometries:(geometry.geometries||[]).map(g=>transformGeometry(g,transform))
    };
  }
  return{
    type:geometry.type,
    coordinates:transformCoordinates(geometry.coordinates,transform)
  };
}

function flattenCoords(geometry,out=[]){
  if(!geometry)return out;
  if(geometry.type==='GeometryCollection'){
    for(const g of geometry.geometries||[])flattenCoords(g,out);
    return out;
  }
  (function walk(v){
    if(!Array.isArray(v))return;
    if(v.length>=2&&Number.isFinite(v[0])&&Number.isFinite(v[1])){out.push(v);return}
    v.forEach(walk);
  })(geometry.coordinates);
  return out;
}

function boundsForFeatures(features){
  const points=[];
  for(const feature of features)flattenCoords(feature.geometry,points);
  if(!points.length)return null;
  const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);
  return{
    minX:Math.min(...xs),minY:Math.min(...ys),
    maxX:Math.max(...xs),maxY:Math.max(...ys),
    width:Math.max(...xs)-Math.min(...xs),
    height:Math.max(...ys)-Math.min(...ys)
  };
}

function compile(baseDir){
  const report=Authoring.evaluate(baseDir);
  if(!report.productionReady){
    throw new Error('Cable Street authoring package is not MAP-01 to MAP-06 ready.');
  }
  if(!report.gameTransformReady){
    throw new Error('Cable Street game transform is not ready for SLICE-01 compilation.');
  }

  const trace=readJson(path.join(baseDir,'trace.geojson'));
  const overlay=readJson(path.join(baseDir,'event-overlay.geojson'));
  const transform=readJson(path.join(baseDir,'game-transform.json'));
  const evidence=readJson(path.join(baseDir,'evidence-register.json'));
  const reconciliation=readJson(path.join(baseDir,'reconciliation.json'));
  const review=readJson(path.join(baseDir,'historical-review.json'));

  const features=(trace.features||[]).map(feature=>({
    type:'Feature',
    properties:{...(feature.properties||{})},
    geometry:transformGeometry(feature.geometry,transform)
  }));
  const eventZones=(overlay.features||[]).map(feature=>({
    type:'Feature',
    properties:{...(feature.properties||{})},
    geometry:transformGeometry(feature.geometry,transform)
  }));

  const bounds=boundsForFeatures(features);
  if(!bounds||bounds.width<=0||bounds.height<=0)throw new Error('Compiled Cable Street trace has no usable bounds.');
  if(bounds.minX<-.001||bounds.minY<-.001){
    throw new Error('Game transform origin must be north-west of the approved trace so local coordinates remain non-negative.');
  }
  const worldWidth=Math.max(1,Math.ceil(bounds.maxX));
  const worldHeight=Math.max(1,Math.ceil(bounds.maxY));

  const layers={};
  for(const feature of features){
    const layer=feature.properties.layer||'unclassified';
    if(!layers[layer])layers[layer]=[];
    layers[layer].push(feature);
  }

  return{
    id:'cable-street-1936-map-package-v1',
    missionId:'cable-street-1936',
    status:'compiled-authoring-package',
    sourceCrs:'EPSG:27700',
    localCrs:'bad-fodder-local-map',
    orientation:'north-up',
    transform:{
      originBng:[...transform.originBng],
      metresPerMapUnit:transform.metresPerMapUnit,
      axis:{...transform.axis}
    },
    bounds,
    width:worldWidth,
    height:worldHeight,
    layers,
    eventZones,
    features,
    evidence:{
      sourceIds:(evidence.sources||[]).map(s=>s.id),
      reconciliationId:reconciliation.id,
      historicalReviewId:review.id
    }
  };
}

function main(argv){
  const baseDir=path.resolve(argv[2]||path.join(__dirname,'../../authoring/cable-street'));
  const output=argv[3]&&path.resolve(argv[3]);
  try{
    const result=compile(baseDir);
    const json=JSON.stringify(result,null,2)+'\n';
    if(output)fs.writeFileSync(output,json);
    else process.stdout.write(json);
  }catch(err){
    process.stderr.write(String(err&&err.message||err)+'\n');
    process.exitCode=1;
  }
}

if(require.main===module)main(process.argv);
module.exports={bngToLocal,transformGeometry,boundsForFeatures,compile};
