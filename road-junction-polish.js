/* Visual-only road junction polish for street-line renderers.
   Fills internal kerb seams at real road intersections without touching map geometry. */
(function(root,factory){
  'use strict';
  const api=factory(root||globalThis);
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root){root.BadFodderRoadJunctionPolish=api;api.install();}
})(typeof window!=='undefined'?window:globalThis,function(root){
  'use strict';

  const ROAD_EXCLUDE=/railway|footway|path|steps|pedestrian|cycleway|track/i;
  const finitePoint=p=>Array.isArray(p)&&Number.isFinite(p[0])&&Number.isFinite(p[1]);
  const vehicleRoad=r=>r&&Array.isArray(r.points)&&r.points.length>1&&!ROAD_EXCLUDE.test(String(r.kind||''));

  function near(a,b,eps=1.5){return Math.hypot(a[0]-b[0],a[1]-b[1])<=eps}

  function segmentIntersection(a,b,c,d){
    const rx=b[0]-a[0],ry=b[1]-a[1],sx=d[0]-c[0],sy=d[1]-c[1];
    const den=rx*sy-ry*sx;
    if(Math.abs(den)<1e-7){
      for(const p of [a,b])for(const q of [c,d])if(near(p,q))return{x:(p[0]+q[0])*.5,y:(p[1]+q[1])*.5};
      return null;
    }
    const qx=c[0]-a[0],qy=c[1]-a[1];
    const t=(qx*sy-qy*sx)/den,u=(qx*ry-qy*rx)/den;
    if(t<-.001||t>1.001||u<-.001||u>1.001)return null;
    return{x:a[0]+t*rx,y:a[1]+t*ry};
  }

  function collectJunctions(map,defaultWidth){
    const roads=(map?.roads||[]).filter(vehicleRoad),found=[];
    for(let i=0;i<roads.length;i++)for(let j=i+1;j<roads.length;j++){
      const a=roads[i],b=roads[j],aw=Number(a.width)||defaultWidth,bw=Number(b.width)||defaultWidth;
      for(let ai=1;ai<a.points.length;ai++)for(let bi=1;bi<b.points.length;bi++){
        const a0=a.points[ai-1],a1=a.points[ai],b0=b.points[bi-1],b1=b.points[bi];
        if(!finitePoint(a0)||!finitePoint(a1)||!finitePoint(b0)||!finitePoint(b1))continue;
        const hit=segmentIntersection(a0,a1,b0,b1);if(!hit)continue;
        const existing=found.find(p=>Math.hypot(p.x-hit.x,p.y-hit.y)<2);
        if(existing)existing.width=Math.max(existing.width,aw,bw);
        else found.push({x:hit.x,y:hit.y,width:Math.max(aw,bw)});
      }
    }
    return found;
  }

  function drawJunctions(g,junctions,S,fill,fallback){
    if(!g||!junctions.length)return;
    const scale=typeof S==='function'?S:(n=>n);
    g.save();g.fillStyle=fill||fallback;
    for(const p of junctions){
      const x=scale(p.x),y=scale(p.y),r=Math.max(scale(2),scale(p.width)*.53+scale(1.25));
      g.beginPath();g.arc(x,y,r,0,Math.PI*2);g.fill();
    }
    g.restore();
  }

  function patch(api,map,{defaultWidth,fallback,textureFromArgs}={}){
    if(!api?.road||api.__junctionPolish||!map)return false;
    const original=api.road,junctions=collectJunctions(map,defaultWidth);
    api.road=function(g,r,S,...args){
      const result=original(g,r,S,...args);
      const texture=textureFromArgs?textureFromArgs(g,args):root.BadFodderArt?.texture?.(g,'urban-asphalt');
      drawJunctions(g,junctions,S,texture,fallback);
      return result;
    };
    Object.defineProperty(api,'__junctionPolish',{value:true});
    return true;
  }

  function install(){
    let changed=false;
    const wiganMap=typeof WIGAN_MAP!=='undefined'?WIGAN_MAP:null;
    const barcelonaMap=root.BARCELONA_MAP||(typeof BARCELONA_MAP!=='undefined'?BARCELONA_MAP:null);
    changed=patch(root.BadFodderWigan,wiganMap,{
      defaultWidth:7,fallback:'#696b61',
      textureFromArgs:(g,args)=>args[0]?.texture?.(g,'urban-asphalt')||root.BadFodderArt?.texture?.(g,'urban-asphalt')
    })||changed;
    changed=patch(root.BadFodderBarcelonaArt,barcelonaMap,{defaultWidth:40,fallback:'#77776d'})||changed;
    return changed;
  }

  return{install,collectJunctions,segmentIntersection};
});