/* Swept projectile collision helpers shared by gameplay and Node tests. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.BadFodderCombatGeometry=api;
})(typeof window!=='undefined'?window:globalThis,function(){
  'use strict';

  function segmentCircleHitT(ax,ay,bx,by,cx,cy,radius){
    const dx=bx-ax,dy=by-ay;
    const fx=ax-cx,fy=ay-cy;
    const a=dx*dx+dy*dy;
    if(a<=1e-12)return Math.hypot(ax-cx,ay-cy)<=radius?0:null;

    const c=fx*fx+fy*fy-radius*radius;
    if(c<=0)return 0;

    const b=2*(fx*dx+fy*dy);
    const disc=b*b-4*a*c;
    if(disc<0)return null;

    const rootDisc=Math.sqrt(disc);
    const t1=(-b-rootDisc)/(2*a);
    const t2=(-b+rootDisc)/(2*a);
    if(t1>=0&&t1<=1)return t1;
    if(t2>=0&&t2<=1)return t2;
    return null;
  }

  function firstObstacleHitT(ax,ay,bx,by,obstacleAt,step=2,radius=2){
    const dx=bx-ax,dy=by-ay,distance=Math.hypot(dx,dy);
    if(distance<=1e-9)return obstacleAt(ax,ay,radius)?0:null;

    const samples=Math.max(1,Math.ceil(distance/Math.max(.25,step)));
    let previousT=0;
    let previousBlocked=obstacleAt(ax,ay,radius);
    if(previousBlocked)return 0;

    for(let i=1;i<=samples;i++){
      const t=i/samples;
      const blocked=obstacleAt(ax+dx*t,ay+dy*t,radius);
      if(blocked){
        // Refine the first blocked interval to reduce visible impact error.
        let lo=previousT,hi=t;
        for(let j=0;j<6;j++){
          const mid=(lo+hi)/2;
          if(obstacleAt(ax+dx*mid,ay+dy*mid,radius))hi=mid;
          else lo=mid;
        }
        return hi;
      }
      previousT=t;
      previousBlocked=blocked;
    }
    return null;
  }

  function nearestCharacterHit(ax,ay,bx,by,targets,radius=14){
    let best=null;
    for(const target of targets){
      if(!target||target.alive===false)continue;
      const t=segmentCircleHitT(ax,ay,bx,by,target.x,target.y,radius);
      if(t===null)continue;
      if(!best||t<best.t)best={t,target};
    }
    return best;
  }

  return{segmentCircleHitT,firstObstacleHitT,nearestCharacterHit};
});
