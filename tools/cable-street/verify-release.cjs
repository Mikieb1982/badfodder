#!/usr/bin/env node
'use strict';

const path=require('node:path');
const Navigation=require('../../navigation.js');
const RouteValidation=require('../../mission-route-validation.js');
const Compiler=require('./compile-trace.cjs');

const REQUIRED_ROUTE_IDS=Object.freeze([
  'defender-retreat',
  'support-access',
  'police-approach',
  'barrier-separation'
]);

function pointInPoly(x,y,pts){
  let hit=false;
  for(let i=0,j=pts.length-1;i<pts.length;j=i++){
    const a=pts[i],b=pts[j];
    if(((a[1]>y)!==(b[1]>y))&&x<(b[0]-a[0])*(y-a[1])/((b[1]-a[1])||1)+a[0])hit=!hit;
  }
  return hit;
}

function supportedBarricadeZone(map,barricade){
  const zones=(map.eventZones||[]).filter(z=>
    z&&Array.isArray(z.points)&&z.points.length>=3&&
    (z.kind==='barricade-vicinity'||z.role==='barricade-vicinity')
  );
  return zones.find(zone=>
    Array.isArray(barricade.points)&&barricade.points.length>=3&&
    barricade.points.every(p=>Array.isArray(p)&&pointInPoly(p[0],p[1],zone.points))
  )||null;
}

function createNavigation(map){
  let navigation;
  const moveEntity=(ent,dx,dy,r=6)=>{
    const nx=Math.max(r,Math.min(map.width-r,ent.x+dx));
    if(!navigation.obstacleAt(nx,ent.y,r))ent.x=nx;
    const ny=Math.max(r,Math.min(map.height-r,ent.y+dy));
    if(!navigation.obstacleAt(ent.x,ny,r))ent.y=ny;
  };
  const updateFacing=(ent,dx,dy)=>{
    if(Math.abs(dx)>.001||Math.abs(dy)>.001)ent.dir=Math.atan2(dy,dx);
  };
  navigation=Navigation.create({
    worldWidth:map.width,
    worldHeight:map.height,
    buildings:(map.buildings||[]).map((b,i)=>({...b,i})),
    mapKey:'cable-street',
    moveEntity,
    updateFacing
  });
  return navigation;
}

function verifyMap(map,{requiredRouteIds=REQUIRED_ROUTE_IDS}={}){
  const problems=[];
  if(!map||map.key!=='cable-street')problems.push('Runtime map key must be cable-street.');
  if(!map||!map.authoring||map.authoring.productionReady!==true)problems.push('Authoring gates are not production-ready.');
  if(!map||!map.authoring||map.authoring.runtimeObjectsReady!==true)problems.push('Runtime objects are not approved.');
  if(!map||!Number.isFinite(map.width)||map.width<=0||!Number.isFinite(map.height)||map.height<=0)problems.push('Runtime world bounds are invalid.');

  const spawns=map&&map.spawns||{};
  if(!Array.isArray(spawns.squad)||spawns.squad.length<4)problems.push('Four explicit squad spawns are required.');
  if(Array.isArray(spawns.enemies)&&spawns.enemies.length)problems.push('Historical mission must not contain standard military enemy spawns.');
  if(Array.isArray(spawns.pickups)&&spawns.pickups.length)problems.push('Historical mission must not contain standard military pickups.');

  const historical=map&&map.historicalObjects||{};
  const barricades=Array.isArray(historical.barricades)?historical.barricades:[];
  const materials=Array.isArray(historical.materials)?historical.materials:[];
  const civilians=Array.isArray(historical.civilians)?historical.civilians:[];
  const formations=Array.isArray(historical.formations)?historical.formations:[];
  if(barricades.length<1)problems.push('At least one approved barricade is required.');
  const materialTypes=new Set(materials.map(x=>x&&x.type));
  for(const type of ['timber','crates','furniture']){
    if(!materialTypes.has(type))problems.push('Missing required material type '+type+'.');
  }
  if(civilians.length<1)problems.push('At least one approved rescue interaction is required.');
  if(formations.length<1)problems.push('At least one police formation is required.');

  for(const b of barricades){
    if(!supportedBarricadeZone(map,b)){
      problems.push('Barricade '+(b&&b.id||'unknown')+' is not wholly inside a supported barricade-vicinity event area.');
    }
  }

  const routeRequirements=Array.isArray(map&&map.routeRequirements)?map.routeRequirements:[];
  const routeIds=new Set(routeRequirements.map(x=>x&&x.id));
  for(const id of requiredRouteIds){
    if(!routeIds.has(id))problems.push('Missing required route check '+id+'.');
  }

  let routeReport=null;
  if(!problems.length){
    try{
      const navigation=createNavigation(map);
      for(const b of barricades){
        navigation.registerDynamicObstacle({
          id:'release-barricade:'+b.id,
          kind:'barricade',
          solid:b.breached!==true,
          points:b.points
        });
      }
      routeReport=RouteValidation.validateRouteRequirements(navigation,routeRequirements);
      const start=spawns.squad[0];
      if(start){
        for(const target of [...materials,...civilians]){
          if(!Number.isFinite(target.x)||!Number.isFinite(target.y))continue;
          const path=navigation.findPath(start[0],start[1],target.x,target.y);
          const end=path.at(-1);
          if(!end||Math.hypot(end.x-target.x,end.y-target.y)>Math.max(12,target.interactionRadius||0))problems.push('Interaction '+target.id+' is unreachable from the squad start.');
        }
      }
      for(const f of formations){
        if(!Number.isFinite(f.x)||!Number.isFinite(f.targetX))continue;
        const radius=Math.max(6,f.width/2);
        if(!navigation.routeClear(f.x,f.y,f.targetX,f.targetY,radius)||
           !navigation.routeClear(f.targetX,f.targetY,f.withdrawX,f.withdrawY,radius))problems.push('Police formation '+f.id+' does not fit its approach/withdrawal corridor.');
      }
      for(const c of civilians){
        if(!Number.isFinite(c.exitX))continue;
        const path=navigation.findPath(c.x,c.y,c.exitX,c.exitY),end=path.at(-1);
        if(!end||Math.hypot(end.x-c.exitX,end.y-c.exitY)>12)problems.push('Evacuation '+c.id+' has no safe exit route.');
      }
      if(!routeReport.ok){
        for(const failed of routeReport.failed){
          problems.push('Route '+failed.id+' expected '+failed.expected+' but was '+(failed.reachable?'reachable':'blocked')+'.');
        }
      }
    }catch(err){
      problems.push('Navigation verification failed: '+String(err&&err.message||err));
    }
  }

  return{
    ready:problems.length===0,
    problems,
    counts:{
      squadSpawns:Array.isArray(spawns.squad)?spawns.squad.length:0,
      barricades:barricades.length,
      materials:materials.length,
      civilians:civilians.length,
      formations:formations.length,
      routeRequirements:routeRequirements.length
    },
    routeReport
  };
}

function verifyDirectory(baseDir){
  const map=Compiler.compileDirectory(baseDir);
  return{map,report:verifyMap(map)};
}

function main(argv){
  const baseDir=path.resolve(argv[2]||path.join(__dirname,'../../authoring/cable-street'));
  try{
    const {report}=verifyDirectory(baseDir);
    process.stdout.write(JSON.stringify(report,null,2)+'\n');
    if(!report.ready)process.exitCode=1;
  }catch(err){
    process.stderr.write(String(err&&err.message||err)+'\n');
    process.exitCode=1;
  }
}

if(require.main===module)main(process.argv);
module.exports={REQUIRED_ROUTE_IDS,pointInPoly,supportedBarricadeZone,createNavigation,verifyMap,verifyDirectory};
