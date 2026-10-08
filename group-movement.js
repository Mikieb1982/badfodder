/* Local squad slots and spacing above the authoritative navigation system. No retained unit state. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.BadFodderGroupMovement=api;})(typeof window!=='undefined'?window:globalThis,function(){
  'use strict';
  const defaults=Object.freeze({spacing:26,compression:.5,arriveRadius:12,separationRadius:14});
  function profile(options={}){
    const result={...defaults};
    for(const key of Object.keys(defaults))if(Number.isFinite(options[key])&&options[key]>0)result[key]=options[key];
    result.compression=Math.min(1,result.compression);return result;
  }
  function arrive(distance,speed,dt,options=defaults){
    if(distance<=1||dt<=0)return 0;
    return Math.min(distance/dt,speed*Math.max(.35,Math.min(1,distance/options.arriveRadius)));
  }
  function create({navigation:nav,moveEntity,worldWidth=Infinity,worldHeight=Infinity}){
    const radius=nav.NAV_RADIUS;
    const clamp=(x,y)=>({x:Math.max(16,Math.min(worldWidth-16,x)),y:Math.max(16,Math.min(worldHeight-16,y))});
    function slots(units,destination,options={},leaderAnchor=false,heading){
      if(!units.length)return[];
      const p=profile(options),anchor=clamp(destination.x,destination.y);
      // Resolve blocked anchors only through navigation's existing open-cell lookup.
      if(nav.obstacleAt(anchor.x,anchor.y,radius)){
        const open=nav.nearestOpenCell(Math.floor(anchor.x/nav.PATH_CELL),Math.floor(anchor.y/nav.PATH_CELL));
        if(open)Object.assign(anchor,nav.pathCellCenter(open[0],open[1]));
      }
      const angle=Number.isFinite(heading)?heading:Math.atan2(anchor.y-units[0].y,anchor.x-units[0].x),fx=Math.cos(angle),fy=Math.sin(angle);
      const points=[];
      for(let i=0;i<units.length;i++){
        if(units.length===1){points.push(anchor);continue}
        const side=leaderAnchor?(i===0?0:(i%2?-1:1)*Math.ceil(i/2)*p.spacing):(i-(units.length-1)/2)*p.spacing;
        const back=leaderAnchor?Math.ceil(i/2)*p.spacing*.9:0;
        let chosen=null;
        for(const scale of [1,p.compression,0]){
          const depth=scale===0?i*p.spacing:back;
          const point=clamp(anchor.x-fx*depth-fy*side*scale,anchor.y-fy*depth+fx*side*scale);
          if(nav.obstacleAt(point.x,point.y,radius)||!nav.routeClear(anchor.x,anchor.y,point.x,point.y,radius))continue;
          if(points.some(other=>Math.hypot(other.x-point.x,other.y-point.y)<radius*2+2))continue;
          chosen=point;break;
        }
        points.push(chosen||{...anchor,shared:true});
      }
      return points;
    }
    function assign(units,destination,options={}){
      // One path search per chosen slot, at most one fallback. No path searches while calculating slots.
      const points=slots(units,destination,options);let routed=0;
      for(let i=0;i<units.length;i++){
        const unit=units[i],point=points[i];
        if(nav.assignPath(unit,point.x,point.y)||nav.assignPath(unit,destination.x,destination.y))routed++;
      }
      return routed;
    }
    function regroup(units,anchor=units[0],options={}){return anchor?assign(units,anchor,options):0}
    function follow(unit,speed,dt,options=defaults){
      // Slow only the final waypoint. Navigation retains all routing/retry/invalidation decisions.
      if(unit.path?.length&&unit.pathIndex===unit.path.length-1){
        const last=unit.path[unit.pathIndex],d=Math.hypot(last.x-unit.x,last.y-unit.y);
        speed=arrive(d,speed,dt,options);
      }
      return nav.followPath(unit,speed,dt);
    }
    function separate(units,options=defaults,dt=1/60,canMove=()=>true){
      const min=options.separationRadius,step=Math.min(1,Math.max(0,dt)*60);
      for(let i=0;i<units.length;i++){
        const a=units[i];if(a.alive===false||a.downed||a.insideBuilding||a.carriedBy)continue;
        for(let j=i+1;j<units.length;j++){
          const b=units[j];if(b.alive===false||b.downed||b.insideBuilding||b.carriedBy)continue;
          let dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy);
          if(d>=min-.1)continue;
          if(d<.01){dx=1;dy=0;d=1}
          const push=Math.min(2.2,(min-d)*.18)*step,nx=dx/d,ny=dy/d;
          // Existing movement collision and health/carry modifiers remain authoritative.
          if(canMove(a)&&!a.manualGarrison&&!a.checkpointCover&&nav.routeClear(a.x,a.y,a.x-nx*push,a.y-ny*push,radius))moveEntity(a,-nx*push,-ny*push,radius);
          if(canMove(b)&&!b.manualGarrison&&!b.checkpointCover&&nav.routeClear(b.x,b.y,b.x+nx*push,b.y+ny*push,radius))moveEntity(b,nx*push,ny*push,radius);
        }
      }
    }
    return{slots,assign,regroup,follow,separate,arrive};
  }
  return{defaults,profile,arrive,create};
});
