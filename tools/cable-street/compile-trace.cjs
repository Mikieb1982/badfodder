#!/usr/bin/env node
'use strict';

const fs=require('node:fs');
const path=require('node:path');
const Authoring=require('./validate-authoring.cjs');

function readJson(file){return JSON.parse(fs.readFileSync(file,'utf8'))}
function finiteNumber(v){return Number.isFinite(v)}
function nonEmptyString(v){return typeof v==='string'&&v.trim().length>0}
function round(v){return Math.round(v*100)/100}

function geometryParts(geometry){
  if(!geometry||!nonEmptyString(geometry.type))return[];
  const c=geometry.coordinates;
  if(geometry.type==='Point')return Array.isArray(c)?[[c]]:[];
  if(geometry.type==='LineString')return Array.isArray(c)?[c]:[];
  if(geometry.type==='MultiLineString')return Array.isArray(c)?c:[];
  if(geometry.type==='Polygon')return Array.isArray(c)&&Array.isArray(c[0])?[c[0]]:[];
  if(geometry.type==='MultiPolygon')return Array.isArray(c)?c.map(poly=>Array.isArray(poly)&&Array.isArray(poly[0])?poly[0]:[]):[];
  return[];
}

function validateCoordinate(p,label){
  if(!Array.isArray(p)||p.length<2||!finiteNumber(p[0])||!finiteNumber(p[1])){
    throw new Error(label+' contains an invalid coordinate.');
  }
}

function normalizeRing(points,label){
  if(!Array.isArray(points)||points.length<3)throw new Error(label+' requires at least three points.');
  const out=points.map((p,i)=>{validateCoordinate(p,label+' point '+i);return[p[0],p[1]]});
  if(out.length>3&&out[0][0]===out.at(-1)[0]&&out[0][1]===out.at(-1)[1])out.pop();
  if(out.length<3)throw new Error(label+' collapses below three unique polygon points.');
  return out;
}

function createProjector(projection,expectedCrs){
  if(!projection||projection.status!=='configured')throw new Error('Cable Street runtime projection is not configured.');
  if(projection.masterCrs!==expectedCrs)throw new Error('Runtime projection CRS does not match the authoring CRS.');
  const origin=projection.originEastingNorthing;
  if(!Array.isArray(origin)||origin.length<2||!finiteNumber(origin[0])||!finiteNumber(origin[1])){
    throw new Error('Runtime projection requires a finite originEastingNorthing pair.');
  }
  const scale=projection.metresToWorldUnits;
  if(!finiteNumber(scale)||scale<=0)throw new Error('Runtime projection requires a positive metresToWorldUnits value.');
  const padding=finiteNumber(projection.padding)&&projection.padding>=0?projection.padding:32;
  const northUp=projection.northUp!==false;
  return{
    project(point){
      validateCoordinate(point,'Projected geometry');
      const x=(point[0]-origin[0])*scale+padding;
      const y=(northUp?(origin[1]-point[1]):(point[1]-origin[1]))*scale+padding;
      if(x<-0.001||y<-0.001){
        throw new Error('Projected geometry falls outside the configured origin; choose a north-west origin that bounds the approved trace.');
      }
      return[round(x),round(y)];
    },
    metadata:{
      type:'bng-local',masterCrs:expectedCrs,
      originEastingNorthing:[origin[0],origin[1]],
      metresToWorldUnits:scale,padding,northUp
    }
  };
}

function bounds(points){
  const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);
  return{minX:Math.min(...xs),maxX:Math.max(...xs),minY:Math.min(...ys),maxY:Math.max(...ys)};
}

function evidence(props){
  return{
    sourceIds:Array.isArray(props.sourceIds)?[...props.sourceIds]:[],
    sourceDate:props.sourceDate??null,
    confidence:props.confidence,
    eventDateConfidence:props.eventDateConfidence,
    affectsMovement:props.affectsMovement===true,
    layer:props.layer,
    interpretationNote:props.interpretationNote||'',
    gameplayAdjustment:props.gameplayAdjustment||''
  };
}

function compileAuthoring({trace,schema,projection,mapKey='cable-street'}={}){
  if(!trace||trace.type!=='FeatureCollection'||!Array.isArray(trace.features))throw new Error('Cable Street trace must be a GeoJSON FeatureCollection.');
  if(!schema||!Array.isArray(schema.layers)||!Array.isArray(schema.confidenceLabels))throw new Error('Cable Street authoring schema is unavailable.');
  const crs=trace.properties&&trace.properties.crs;
  if(crs!==schema.masterCrs)throw new Error('Trace CRS does not match the authoring schema.');
  if(!trace.features.length)throw new Error('Cable Street trace contains no features.');

  const requiredAttrs=schema.requiredFeatureAttributes||[];
  const confidenceLabels=new Set(schema.confidenceLabels);
  const knownLayers=new Set(schema.layers.map(layer=>layer.id));
  const criticalLayers=schema.layers.filter(layer=>layer.productionCritical).map(layer=>layer.id);
  const seenLayers=new Set();
  const seenIds=new Set();
  const projector=createProjector(projection,schema.masterCrs);
  const buildings=[],roads=[],railways=[],eventZones=[],gameplayAdjustments=[];
  const allProjected=[];

  for(const feature of trace.features){
    if(!feature||feature.type!=='Feature')throw new Error('Trace contains a non-Feature entry.');
    const props=feature.properties||{};
    for(const attr of requiredAttrs){
      if(attr==='geometry')continue;
      if(!Object.prototype.hasOwnProperty.call(props,attr))throw new Error('Feature is missing required attribute '+attr+'.');
    }
    if(!nonEmptyString(props.id))throw new Error('Trace feature requires a stable id.');
    if(seenIds.has(props.id))throw new Error('Duplicate trace feature id: '+props.id);
    seenIds.add(props.id);
    if(!nonEmptyString(props.kind))throw new Error('Feature '+props.id+' requires a descriptive kind.');
    if(!knownLayers.has(props.layer))throw new Error('Unknown Cable Street authoring layer: '+props.layer);
    if(!confidenceLabels.has(props.confidence))throw new Error('Feature '+props.id+' has an invalid confidence label.');
    if(!confidenceLabels.has(props.eventDateConfidence))throw new Error('Feature '+props.id+' has an invalid eventDateConfidence label.');
    if(typeof props.affectsMovement!=='boolean')throw new Error('Feature '+props.id+' affectsMovement must be boolean.');
    if(!Array.isArray(props.sourceIds))throw new Error('Feature '+props.id+' sourceIds must be an array.');

    const parts=geometryParts(feature.geometry);
    if(!parts.length)throw new Error('Feature '+props.id+' has unsupported or empty geometry.');
    seenLayers.add(props.layer);

    for(let partIndex=0;partIndex<parts.length;partIndex++){
      const raw=props.layer==='building-envelope'||props.layer==='event-zone'||props.layer==='gameplay-adjustment'
        ?normalizeRing(parts[partIndex],props.id)
        :parts[partIndex].map((p,i)=>{validateCoordinate(p,props.id+' point '+i);return[p[0],p[1]]});
      const points=raw.map(projector.project);
      allProjected.push(...points);
      const id=parts.length>1?props.id+':'+(partIndex+1):props.id;
      const base={id,points,...evidence(props)};

      if(props.layer==='building-envelope'){
        buildings.push({...base,...bounds(points),solid:true,name:props.label||props.name||''});
      }else if(props.layer==='carriageway-edge'){
        if(points.length<2)throw new Error('Carriageway edge '+props.id+' requires at least two points.');
        roads.push({...base,name:props.label||props.name||'',kind:'historical-carriageway-edge'});
      }else if(props.layer==='railway'){
        if(points.length<2)throw new Error('Railway feature '+props.id+' requires at least two points.');
        railways.push({...base,name:props.label||props.name||''});
      }else if(props.layer==='event-zone'){
        eventZones.push({...base,...bounds(points),role:props.role||null,label:props.label||props.id});
      }else if(props.layer==='gameplay-adjustment'){
        gameplayAdjustments.push({...base,...bounds(points),role:props.role||null,label:props.label||props.id});
      }
    }
  }

  const missingCritical=criticalLayers.filter(id=>!seenLayers.has(id));
  if(missingCritical.length)throw new Error('Trace is missing production-critical layers: '+missingCritical.join(', ')+'.');
  if(!buildings.length)throw new Error('Trace does not contain building collision geometry.');

  const maxX=Math.max(...allProjected.map(p=>p[0]));
  const maxY=Math.max(...allProjected.map(p=>p[1]));
  const padding=projector.metadata.padding;
  return{
    key:mapKey,
    width:Math.max(1,Math.ceil(maxX+padding)),
    height:Math.max(1,Math.ceil(maxY+padding)),
    buildings,roads,railways,eventZones,gameplayAdjustments,
    historicalObjects:{barricades:[],materials:[],civilians:[],formations:[]},
    projection:projector.metadata,
    authoring:{
      traceId:trace.properties&&trace.properties.id||null,
      featureCount:trace.features.length,
      productionReady:trace.properties&&trace.properties.productionReady===true,
      compiledLayers:[...seenLayers].sort()
    }
  };
}

function compileDirectory(baseDir){
  const readiness=Authoring.evaluate(baseDir);
  if(!readiness.productionReady)throw new Error('Cable Street authoring package is not MAP-01 to MAP-06 ready.');
  if(!readiness.runtimeProjectionReady)throw new Error('Cable Street runtime projection is not configured for SLICE-01.');
  const schema=readJson(path.join(baseDir,'authoring-schema.json'));
  const trace=readJson(path.join(baseDir,'trace.geojson'));
  const projection=readJson(path.join(baseDir,'runtime-projection.json'));
  const map=compileAuthoring({trace,schema,projection,mapKey:'cable-street'});
  map.authoring.gates={...readiness.gates};
  map.authoring.reconciliationReady=readiness.reconciliationReady;
  map.authoring.eventOverlayReady=readiness.eventOverlayReady;
  map.authoring.reviewReady=readiness.reviewReady;
  return map;
}

function main(argv){
  const args=argv.slice(2).filter(x=>!x.startsWith('--'));
  const baseDir=path.resolve(args[0]||path.join(__dirname,'../../authoring/cable-street'));
  const output=args[1]?path.resolve(args[1]):null;
  const map=compileDirectory(baseDir);
  const json=JSON.stringify(map,null,2)+'\n';
  if(output){fs.writeFileSync(output,json);process.stdout.write('Wrote '+output+'\n')}
  else process.stdout.write(json);
  if(argv.includes('--require-production-ready')&&!map.authoring.productionReady){
    process.stderr.write('Compiled trace is not marked productionReady.\n');
    process.exitCode=1;
  }
}

if(require.main===module)main(process.argv);
module.exports={geometryParts,createProjector,compileAuthoring,compileDirectory};
