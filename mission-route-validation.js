/* Phase-aware mission route validation.
   Browser: window.BadFodderRouteValidation
   Node: require('./mission-route-validation.js') */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.BadFodderRouteValidation=api;
})(typeof window!=='undefined'?window:globalThis,function(){
  'use strict';

  function validPoint(p){
    return !!p&&Number.isFinite(p.x)&&Number.isFinite(p.y);
  }

  function routeEndpoint(path,from){
    return path&&path.length?path[path.length-1]:from;
  }

  function validateRouteRequirements(navigation,requirements,{endpointTolerance=null}={}){
    if(!navigation||typeof navigation.findPath!=='function'||typeof navigation.routeClear!=='function'){
      throw new Error('Route validation requires a navigation instance.');
    }
    if(!Array.isArray(requirements))throw new Error('Route requirements must be an array.');

    const tolerance=Number.isFinite(endpointTolerance)&&endpointTolerance>=0
      ?endpointTolerance
      :Math.max(12,(navigation.PATH_CELL||8)*2);

    const results=requirements.map((req,index)=>{
      const id=req&&req.id||('route-'+(index+1));
      if(!req||!validPoint(req.from)||!validPoint(req.to)){
        return{id,ok:false,expected:req&&req.expect||'reachable',reachable:false,error:'invalid-endpoint',phase:req&&req.phase||null,side:req&&req.side||null};
      }
      const expected=req.expect==='blocked'?'blocked':'reachable';
      const path=navigation.findPath(req.from.x,req.from.y,req.to.x,req.to.y);
      let segmentSafe=true,ax=req.from.x,ay=req.from.y;
      for(const waypoint of path){
        if(!navigation.routeClear(ax,ay,waypoint.x,waypoint.y,navigation.NAV_RADIUS)){
          segmentSafe=false;break;
        }
        ax=waypoint.x;ay=waypoint.y;
      }
      const end=routeEndpoint(path,req.from);
      const endpointDistance=Math.hypot(end.x-req.to.x,end.y-req.to.y);
      const reachable=path.length>0&&segmentSafe&&endpointDistance<=tolerance;
      const ok=expected==='reachable'?reachable:!reachable;
      return{
        id,phase:req.phase||null,side:req.side||null,expected,reachable,segmentSafe,
        endpointDistance,pathLength:path.length,ok
      };
    });

    return{
      ok:results.every(r=>r.ok),
      results,
      failed:results.filter(r=>!r.ok)
    };
  }

  function assertRouteRequirements(navigation,requirements,options){
    const report=validateRouteRequirements(navigation,requirements,options);
    if(!report.ok){
      const detail=report.failed.map(r=>r.id+' expected '+r.expected+' but was '+(r.reachable?'reachable':'blocked')).join('; ');
      const error=new Error('Mission route validation failed: '+detail);
      error.report=report;
      throw error;
    }
    return report;
  }

  return{validateRouteRequirements,assertRouteRequirements};
});
