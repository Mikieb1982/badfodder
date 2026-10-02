#!/usr/bin/env node
'use strict';

const fs=require('node:fs');
const path=require('node:path');
const Authoring=require('./validate-authoring.cjs');

function readJson(file){return JSON.parse(fs.readFileSync(file,'utf8'))}
function finiteNumber(v){return Number.isFinite(v)}
function nonEmptyString(v){return typeof v==='string'&&v.trim().length>0}
function round(v){return Math.round(v*100)/100}
function finitePoint(p){return Array.isArray(p)&&p.length>=2&&finiteNumber(p[0])&&finiteNumber(p[1])}

function geometryParts(geometry){
  if(!geometry||!nonEmptyString(geometry.type))return[];
  const c=geometry.coordinates;
  if(geometry.type==='Point')return finitePoint(c)?[[c]]:[];
  if(geometry.type==='LineString')return Array.isArray(c)?[c]:[];
  if(geometry.type==='MultiLineString')return Array.isArray(c)?c:[];
  if(geometry.type==='Polygon')return Array.isArray(c)&&Array.isArray(c[0])?[c[0]]:[];
  if(geometry.type==='MultiPolygon'){
    return Array.isArray(c)?c.map(poly=>Array.isArray(poly)&&Array.isArray(poly[0])?poly[0]:[]):[];
  }
  return[];
}

function validateCoordinate(p,label){
  if(!finitePoint(p))throw new Error(label+' contains an invalid coordinate.');
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
  if(!finitePoint(origin))throw new Error('Runtime projection requires a finite originEastingNorthing pair.');
  const scale=projection.metresToWorldUnits;
  if(!finiteNumber(scale)||scale<=0)throw new Error('Runtime projection requires a positive metresToWorldUnits value.');
  const padding=finiteNumber(projection.padding)&&projection.padding>=0?projection.padding:32;
  const northUp=projection.northUp!==false;
  return{
    project(point){
      validateCoordinate(point,'Projected geometry');
      const x=(point[0]-origin[0])*scale+padding;
      const y=(northUp?(origin[1]-point[1]):(point[1]-origin[1]))*scale+padding;
      if(x<-.001||y<-.001){
        throw new Error('Projected geometry falls outside the configured origin; choose a north-west origin that bounds the approved trace.');
      }
      return[round(x),round(y)];
    },
    metadata:{
      type:'bng-local',
      masterCrs:expectedCrs,
      originEastingNorthing:[origin[0],origin[1]],
      metresToWorldUnits:scale,
      padding,
      northUp
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
    confidence:props.confidence??null,
    eventDateConfidence:props.eventDateConfidence??null,
    affectsMovement:props.affectsMovement===true,
    interpretationNote:props.interpretationNote||'',
    gameplayAdjustment:props.gameplayAdjustment||''
  };
}

function projectTraceFeature(feature,projector,knownLayers,requiredAttrs,confidenceLabels){
  if(!feature||feature.type!=='Feature')throw new Error('Trace contains a non-Feature entry.');
  const props=feature.properties||{};
  for(const attr of requiredAttrs){
    if(attr==='geometry')continue;
    if(!Object.prototype.hasOwnProperty.call(props,attr))throw new Error('Feature is missing required attribute '+attr+'.');
  }
  if(!nonEmptyString(props.id))throw new Error('Trace feature requires a stable id.');
  if(!knownLayers.has(props.layer))throw new Error('Unknown Cable Street authoring layer: '+props.layer);
  if(!confidenceLabels.has(props.confidence)||!confidenceLabels.has(props.eventDateConfidence)){
    throw new Error('Feature '+props.id+' has an invalid confidence label.');
  }
  if(typeof props.affectsMovement!=='boolean')throw new Error('Feature '+props.id+' must declare affectsMovement.');
  if(!Array.isArray(props.sourceIds)||!props.sourceIds.length)throw new Error('Feature '+props.id+' sourceIds must be a non-empty array.');

  const parts=geometryParts(feature.geometry);
  if(!parts.length)throw new Error('Feature '+props.id+' has unsupported or empty geometry.');
  return parts.map((part,index)=>{
    const polygon=['building-envelope','event-zone','gameplay-adjustment'].includes(props.layer);
    const raw=polygon
      ?normalizeRing(part,props.id)
      :part.map((p,i)=>{validateCoordinate(p,props.id+' point '+i);return[p[0],p[1]]});
    if(!polygon&&raw.length<2)throw new Error('Linear feature '+props.id+' requires at least two points.');
    const points=raw.map(projector.project);
    return{
      id:parts.length>1?props.id+':'+(index+1):props.id,
      points,
      kind:props.kind||props.layer,
      layer:props.layer,
      label:props.label||props.name||'',
      ...evidence(props)
    };
  });
}

function projectOverlayFeature(feature,projector){
  if(!feature||feature.type!=='Feature')throw new Error('Event overlay contains a non-Feature entry.');
  const props=feature.properties||{};
  if(!nonEmptyString(props.id))throw new Error('Event overlay feature requires a stable id.');
  const parts=geometryParts(feature.geometry);
  if(!parts.length)throw new Error('Event overlay feature '+props.id+' has unsupported or empty geometry.');
  return parts.map((part,index)=>{
    const raw=normalizeRing(part,props.id);
    const points=raw.map(projector.project);
    return{
      id:parts.length>1?props.id+':'+(index+1):props.id,
      points,...bounds(points),
      kind:props.kind||'event-zone',
      layer:'event-zone',
      role:props.role||props.kind||null,
      label:props.label||props.id,
      sourceIds:Array.isArray(props.sourceIds)?[...props.sourceIds]:[],
      confidence:props.confidence??null,
      interpretationNote:props.interpretationNote||''
    };
  });
}

function compileAuthoring({trace,schema,projection,eventOverlay=null,mapKey='cable-street',gates=null}={}){
  if(!trace||trace.type!=='FeatureCollection'||!Array.isArray(trace.features))throw new Error('Cable Street trace must be a GeoJSON FeatureCollection.');
  if(!schema||!Array.isArray(schema.layers)||!Array.isArray(schema.confidenceLabels))throw new Error('Cable Street authoring schema is unavailable.');
  const crs=trace.properties&&trace.properties.crs;
  if(crs!==schema.masterCrs)throw new Error('Trace CRS does not match the authoring schema.');
  if(!trace.features.length)throw new Error('Cable Street trace contains no features.');

  const requiredAttrs=schema.requiredFeatureAttributes||[];
  const confidenceLabels=new Set(schema.confidenceLabels);
  const knownLayers=new Set(schema.layers.map(layer=>layer.id));
  const criticalLayers=schema.layers.filter(layer=>layer.productionCritical).map(layer=>layer.id);
  const projector=createProjector(projection,schema.masterCrs);
  const seenIds=new Set(),seenLayers=new Set();
  const buildings=[],roads=[],railways=[],tracedEventZones=[],gameplayAdjustments=[];
  const allProjected=[];

  for(const feature of trace.features){
    const rawId=feature&&feature.properties&&feature.properties.id;
    if(nonEmptyString(rawId)&&seenIds.has(rawId))throw new Error('Duplicate trace feature id: '+rawId);
    if(nonEmptyString(rawId))seenIds.add(rawId);
    const items=projectTraceFeature(feature,projector,knownLayers,requiredAttrs,confidenceLabels);
    const layer=feature.properties.layer;
    seenLayers.add(layer);
    for(const item of items){
      allProjected.push(...item.points);
      if(layer==='building-envelope'){
        buildings.push({...item,...bounds(item.points),solid:true,name:item.label||''});
      }else if(layer==='carriageway-edge'){
        roads.push({...item,name:item.label||'',roadKind:'historical-carriageway-edge'});
      }else if(layer==='railway'){
        railways.push(item);
      }else if(layer==='event-zone'){
        tracedEventZones.push({...item,...bounds(item.points),role:item.kind||null,label:item.label||item.id});
      }else if(layer==='gameplay-adjustment'){
        gameplayAdjustments.push({...item,...bounds(item.points)});
      }
    }
  }

  const missingCritical=criticalLayers.filter(id=>!seenLayers.has(id));
  if(missingCritical.length)throw new Error('Trace is missing production-critical layers: '+missingCritical.join(', ')+'.');
  if(!buildings.length)throw new Error('Trace does not contain building collision geometry.');

  const overlayEventZones=[];
  if(eventOverlay){
    if(eventOverlay.type!=='FeatureCollection'||!Array.isArray(eventOverlay.features))throw new Error('Cable Street event overlay must be a GeoJSON FeatureCollection.');
    for(const feature of eventOverlay.features){
      const zones=projectOverlayFeature(feature,projector);
      for(const zone of zones){overlayEventZones.push(zone);allProjected.push(...zone.points)}
    }
  }

  const maxX=Math.max(...allProjected.map(p=>p[0]));
  const maxY=Math.max(...allProjected.map(p=>p[1]));
  const padding=projector.metadata.padding;
  return{
    key:mapKey,
    width:Math.max(1,Math.ceil(maxX+padding)),
    height:Math.max(1,Math.ceil(maxY+padding)),
    buildings,roads,railways,
    eventZones:[...tracedEventZones,...overlayEventZones],
    gameplayAdjustments,
    historicalObjects:{barricades:[],materials:[],civilians:[],formations:[]},
    projection:projector.metadata,
    authoring:{
      traceId:trace.properties&&trace.properties.id||null,
      featureCount:trace.features.length,
      gates:gates?{...gates}:null,
      productionReady:gates?Object.values(gates).every(Boolean):trace.properties&&trace.properties.productionReady===true,
      runtimeObjectsReady:false
    }
  };
}

function compileDirectory(baseDir){
  const report=Authoring.evaluate(baseDir);
  if(!report.productionReady)throw new Error('Cable Street authoring package is not MAP-01 to MAP-06 ready.');
  if(!report.runtimeProjectionReady)throw new Error('Cable Street runtime projection is not ready for SLICE-01 compilation.');
  const schema=readJson(path.join(baseDir,'authoring-schema.json'));
  const trace=readJson(path.join(baseDir,'trace.geojson'));
  const projection=readJson(path.join(baseDir,'runtime-projection.json'));
  const eventOverlay=readJson(path.join(baseDir,'event-overlay.geojson'));
  return compileAuthoring({trace,schema,projection,eventOverlay,mapKey:'cable-street',gates:report.gates});
}

function main(argv){
  const args=argv.slice(2).filter(x=>!x.startsWith('--'));
  const baseDir=path.resolve(args[0]||path.join(__dirname,'../../authoring/cable-street'));
  const output=args[1]?path.resolve(args[1]):null;
  const map=compileDirectory(baseDir);
  const json=JSON.stringify(map,null,2)+'\n';
  if(output){fs.writeFileSync(output,json);process.stdout.write('Wrote '+output+'\n')}
  else process.stdout.write(json);
}

if(require.main===module){
  try{main(process.argv)}
  catch(err){process.stderr.write(String(err&&err.message||err)+'\n');process.exitCode=1}
}
module.exports={geometryParts,createProjector,compileAuthoring,compileDirectory};
