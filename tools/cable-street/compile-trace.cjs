#!/usr/bin/env node
'use strict';

const fs=require('node:fs');
const path=require('node:path');
const PackageCompiler=require('./compile-map-package.cjs');

function nonEmptyString(v){return typeof v==='string'&&v.trim().length>0}
function finitePoint(p){return Array.isArray(p)&&p.length>=2&&Number.isFinite(p[0])&&Number.isFinite(p[1])}
function round(v){return Math.round(v*100)/100}

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

function normalizePoints(points,label,{polygon=false}={}){
  if(!Array.isArray(points)||(polygon?points.length<3:points.length<1)){
    throw new Error(label+' has insufficient geometry.');
  }
  const out=points.map((p,i)=>{
    if(!finitePoint(p))throw new Error(label+' contains an invalid coordinate at '+i+'.');
    return[round(p[0]),round(p[1])];
  });
  if(polygon&&out.length>3&&out[0][0]===out.at(-1)[0]&&out[0][1]===out.at(-1)[1])out.pop();
  if(polygon&&out.length<3)throw new Error(label+' collapses below three polygon points.');
  return out;
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

function layerOf(feature){
  const layer=feature&&feature.properties&&feature.properties.layer;
  return nonEmptyString(layer)?layer:null;
}

function convertFeature(feature,expectedLayer){
  const props=feature&&feature.properties||{};
  const layer=layerOf(feature);
  if(layer!==expectedLayer)return[];
  if(!nonEmptyString(props.id))throw new Error('Compiled feature requires a stable id.');
  const parts=geometryParts(feature.geometry);
  if(!parts.length)throw new Error('Feature '+props.id+' has unsupported or empty geometry.');
  return parts.map((part,index)=>{
    const polygon=expectedLayer==='building-envelope'||expectedLayer==='gameplay-adjustment'||expectedLayer==='event-zone';
    const points=normalizePoints(part,props.id,{polygon});
    const id=parts.length>1?props.id+':'+(index+1):props.id;
    return{id,points,kind:props.kind||expectedLayer,layer,...evidence(props)};
  });
}

function convertEventZone(feature){
  const props=feature&&feature.properties||{};
  if(!nonEmptyString(props.id))throw new Error('Event overlay feature requires a stable id.');
  const parts=geometryParts(feature.geometry);
  if(!parts.length)throw new Error('Event overlay feature '+props.id+' has unsupported or empty geometry.');
  return parts.map((part,index)=>{
    const points=normalizePoints(part,props.id,{polygon:true});
    const id=parts.length>1?props.id+':'+(index+1):props.id;
    return{
      id,points,...bounds(points),
      kind:props.kind||'event-zone',
      layer:'event-zone',
      role:props.role||props.kind||null,
      label:props.label||props.id,
      ...evidence(props)
    };
  });
}

function compilePackage(pkg,{mapKey='cable-street'}={}){
  if(!pkg||pkg.status!=='compiled-authoring-package')throw new Error('Cable Street runtime compiler requires a guarded compiled authoring package.');
  if(pkg.sourceCrs!=='EPSG:27700')throw new Error('Cable Street runtime compiler requires EPSG:27700 source geometry.');
  if(!Number.isFinite(pkg.width)||pkg.width<=0||!Number.isFinite(pkg.height)||pkg.height<=0){
    throw new Error('Compiled authoring package has invalid world dimensions.');
  }
  if(!Array.isArray(pkg.features)||!pkg.features.length)throw new Error('Compiled authoring package contains no trace features.');

  const ids=new Set();
  for(const feature of pkg.features){
    const id=feature&&feature.properties&&feature.properties.id;
    if(!nonEmptyString(id))throw new Error('Compiled trace feature requires a stable id.');
    if(ids.has(id))throw new Error('Duplicate compiled trace feature id: '+id);
    ids.add(id);
  }

  const buildingFeatures=pkg.features.filter(f=>layerOf(f)==='building-envelope');
  const roadFeatures=pkg.features.filter(f=>layerOf(f)==='carriageway-edge');
  const railwayFeatures=pkg.features.filter(f=>layerOf(f)==='railway');
  if(!buildingFeatures.length||!roadFeatures.length||!railwayFeatures.length){
    throw new Error('Compiled authoring package is missing a production-critical runtime layer.');
  }

  const buildings=buildingFeatures.flatMap(f=>convertFeature(f,'building-envelope')).map(item=>({
    ...item,...bounds(item.points),solid:true,name:item.label||''
  }));
  const roads=roadFeatures.flatMap(f=>convertFeature(f,'carriageway-edge')).map(item=>({
    ...item,name:item.label||'',roadKind:'historical-carriageway-edge'
  }));
  const railways=railwayFeatures.flatMap(f=>convertFeature(f,'railway'));
  const gameplayAdjustments=pkg.features
    .filter(f=>layerOf(f)==='gameplay-adjustment')
    .flatMap(f=>convertFeature(f,'gameplay-adjustment'))
    .map(item=>({...item,...bounds(item.points)}));
  const tracedEventZones=pkg.features
    .filter(f=>layerOf(f)==='event-zone')
    .flatMap(f=>convertFeature(f,'event-zone'))
    .map(item=>({...item,...bounds(item.points),role:item.kind||null,label:item.id}));
  const overlayEventZones=(pkg.eventZones||[]).flatMap(convertEventZone);

  const maxX=Math.max(
    0,
    ...buildings.flatMap(b=>b.points.map(p=>p[0])),
    ...roads.flatMap(r=>r.points.map(p=>p[0])),
    ...railways.flatMap(r=>r.points.map(p=>p[0]))
  );
  const maxY=Math.max(
    0,
    ...buildings.flatMap(b=>b.points.map(p=>p[1])),
    ...roads.flatMap(r=>r.points.map(p=>p[1])),
    ...railways.flatMap(r=>r.points.map(p=>p[1]))
  );
  if(maxX>pkg.width+.01||maxY>pkg.height+.01){
    throw new Error('Compiled geometry exceeds declared Cable Street world bounds.');
  }

  return{
    key:mapKey,
    width:pkg.width,
    height:pkg.height,
    buildings,roads,railways,
    eventZones:[...tracedEventZones,...overlayEventZones],
    gameplayAdjustments,
    historicalObjects:{barricades:[],materials:[],civilians:[],formations:[]},
    projection:{
      type:'bng-local',
      sourceCrs:pkg.sourceCrs,
      localCrs:pkg.localCrs,
      orientation:pkg.orientation,
      transform:pkg.transform
    },
    authoring:{
      packageId:pkg.id,
      status:pkg.status,
      evidence:pkg.evidence||null,
      productionReady:true,
      runtimeObjectsReady:false
    }
  };
}

function compileDirectory(baseDir){
  return compilePackage(PackageCompiler.compile(baseDir),{mapKey:'cable-street'});
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
module.exports={geometryParts,compilePackage,compileDirectory};
