/* Shared navigation/pathfinding for Bad Fodder.
   Browser: window.BadFodderNavigation
   Node: require('./navigation.js') */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.BadFodderNavigation=api;
})(typeof window!=='undefined'?window:globalThis,function(){
  'use strict';

  function pointInPoly(x,y,pts){
    let hit=false;
    for(let i=0,j=pts.length-1;i<pts.length;j=i++){
      const a=pts[i],b=pts[j];
      if(((a[1]>y)!==(b[1]>y))&&x<(b[0]-a[0])*(y-a[1])/((b[1]-a[1])||1)+a[0])hit=!hit;
    }
    return hit;
  }

  class MinHeap{
    constructor(){this.a=[]}
    push(node){
      const a=this.a;a.push(node);
      let i=a.length-1;
      while(i>0){
        const p=(i-1)>>1;
        if(a[p].f<=node.f)break;
        a[i]=a[p];i=p;
      }
      a[i]=node;
    }
    pop(){
      const a=this.a;
      if(!a.length)return null;
      const root=a[0],last=a.pop();
      if(a.length){
        a[0]=last;
        let i=0;
        while(true){
          const l=i*2+1,r=l+1;
          let small=i;
          if(l<a.length&&a[l].f<a[small].f)small=l;
          if(r<a.length&&a[r].f<a[small].f)small=r;
          if(small===i)break;
          [a[i],a[small]]=[a[small],a[i]];
          i=small;
        }
      }
      return root;
    }
    get length(){return this.a.length}
  }

  function create(options){
    const {
      worldWidth,worldHeight,buildings,mapKey='',
      moveEntity=null,updateFacing=null,
      spatialCell=150
    }=options||{};

    if(!Number.isFinite(worldWidth)||!Number.isFinite(worldHeight))throw new Error('Navigation requires finite world dimensions.');
    if(!Array.isArray(buildings))throw new Error('Navigation requires building geometry.');

    const CELL=spatialCell;
    const NAV_RADIUS=mapKey==='wigan'?4:6;
    const PATH_CELL=mapKey==='wigan'?8:12;
    const PATH_COLS=Math.ceil(worldWidth/PATH_CELL);
    const PATH_ROWS=Math.ceil(worldHeight/PATH_CELL);
    const buildingGrid=new Map();
    const pathBlockedCache=new Map();
    const pathEdgeCache=new Map();
    const pathComponents=new Int32Array(PATH_COLS*PATH_ROWS);
    let nextPathComponent=0;

    const perf={
      findCalls:0,directRoutes:0,failedPaths:0,
      expandedNodes:0,maxExpanded:0,maxOpen:0,
      componentBuilds:0,componentCells:0,maxComponentCells:0
    };

    function cellKey(x,y){return x+'|'+y}
    buildings.filter(b=>b.solid!==false).forEach(b=>{
      const x0=Math.floor(b.minX/CELL),x1=Math.floor(b.maxX/CELL);
      const y0=Math.floor(b.minY/CELL),y1=Math.floor(b.maxY/CELL);
      for(let gx=x0;gx<=x1;gx++)for(let gy=y0;gy<=y1;gy++){
        const key=cellKey(gx,gy);
        if(!buildingGrid.has(key))buildingGrid.set(key,[]);
        buildingGrid.get(key).push(b);
      }
    });

    function nearbyBuildings(x,y,r=0){
      const out=[],seen=new Set();
      const x0=Math.floor((x-r)/CELL),x1=Math.floor((x+r)/CELL);
      const y0=Math.floor((y-r)/CELL),y1=Math.floor((y+r)/CELL);
      for(let gx=x0;gx<=x1;gx++)for(let gy=y0;gy<=y1;gy++){
        const list=buildingGrid.get(cellKey(gx,gy))||[];
        list.forEach(b=>{if(!seen.has(b.i)){seen.add(b.i);out.push(b)}});
      }
      return out;
    }

    function solidPoint(x,y){
      const list=nearbyBuildings(x,y,2);
      for(const b of list){
        if(x<b.minX||x>b.maxX||y<b.minY||y>b.maxY)continue;
        if(pointInPoly(x,y,b.points))return true;
      }
      return false;
    }

    function obstacleAt(x,y,r=8){
      if(solidPoint(x,y))return true;
      if(r<=1)return false;
      return solidPoint(x+r,y)||solidPoint(x-r,y)||solidPoint(x,y+r)||solidPoint(x,y-r);
    }

    function lineBlocked(x1,y1,x2,y2){
      const d=Math.hypot(x2-x1,y2-y1);
      const steps=Math.ceil(d/22);
      for(let i=1;i<steps;i++){
        const t=i/steps;
        if(obstacleAt(x1+(x2-x1)*t,y1+(y2-y1)*t,2))return true;
      }
      return false;
    }

    function pathCellKey(gx,gy){return gx+'|'+gy}
    function pathCellCenter(gx,gy){
      return{
        x:Math.min(worldWidth-14,gx*PATH_CELL+PATH_CELL/2),
        y:Math.min(worldHeight-14,gy*PATH_CELL+PATH_CELL/2)
      };
    }

    function pathCellBlocked(gx,gy){
      if(gx<0||gy<0||gx>=PATH_COLS||gy>=PATH_ROWS)return true;
      const key=pathCellKey(gx,gy);
      if(pathBlockedCache.has(key))return pathBlockedCache.get(key);
      const p=pathCellCenter(gx,gy);
      const blocked=obstacleAt(p.x,p.y,NAV_RADIUS);
      pathBlockedCache.set(key,blocked);
      return blocked;
    }

    function routeClear(x1,y1,x2,y2,r=NAV_RADIUS){
      const d=Math.hypot(x2-x1,y2-y1);
      const steps=Math.max(1,Math.ceil(d/4));
      for(let i=1;i<=steps;i++){
        const t=i/steps;
        if(obstacleAt(x1+(x2-x1)*t,y1+(y2-y1)*t,r))return false;
      }
      return true;
    }

    function pathEdgeClear(ax,ay,bx,by){
      const ai=ay*PATH_COLS+ax,bi=by*PATH_COLS+bx;
      const edge=Math.min(ai,bi)*(PATH_COLS*PATH_ROWS)+Math.max(ai,bi);
      if(!pathEdgeCache.has(edge)){
        const a=pathCellCenter(ax,ay),b=pathCellCenter(bx,by);
        pathEdgeCache.set(edge,routeClear(a.x,a.y,b.x,b.y,NAV_RADIUS));
      }
      return pathEdgeCache.get(edge);
    }

    function pathComponent(gx,gy){
      if(pathCellBlocked(gx,gy))return -1;
      const start=gy*PATH_COLS+gx;
      if(pathComponents[start])return pathComponents[start];

      const id=++nextPathComponent,queue=new Int32Array(PATH_COLS*PATH_ROWS);
      let read=0,write=1,cells=1;
      queue[0]=start;pathComponents[start]=id;
      perf.componentBuilds++;

      const dirs=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
      while(read<write){
        const cell=queue[read++],x=cell%PATH_COLS,y=Math.floor(cell/PATH_COLS);
        for(const [dx,dy] of dirs){
          const nx=x+dx,ny=y+dy;
          if(pathCellBlocked(nx,ny))continue;
          const key=ny*PATH_COLS+nx;
          if(pathComponents[key])continue;
          if(dx&&dy&&(pathCellBlocked(x+dx,y)||pathCellBlocked(x,y+dy)))continue;
          if(!pathEdgeClear(x,y,nx,ny))continue;
          pathComponents[key]=id;queue[write++]=key;cells++;
        }
      }
      perf.componentCells+=cells;
      perf.maxComponentCells=Math.max(perf.maxComponentCells,cells);
      return id;
    }

    function nearestOpenCell(gx,gy,from=null){
      if(!pathCellBlocked(gx,gy)){
        const p=pathCellCenter(gx,gy);
        if(!from||routeClear(from.x,from.y,p.x,p.y,NAV_RADIUS))return[gx,gy];
      }
      const candidates=[];
      for(let dy=-7;dy<=7;dy++)for(let dx=-7;dx<=7;dx++){
        const x=gx+dx,y=gy+dy;
        if(pathCellBlocked(x,y))continue;
        const p=pathCellCenter(x,y);
        if(from&&!routeClear(from.x,from.y,p.x,p.y,NAV_RADIUS))continue;
        candidates.push({x,y,d:from?Math.hypot(p.x-from.x,p.y-from.y):Math.hypot(dx,dy)});
      }
      candidates.sort((a,b)=>a.d-b.d);
      return candidates.length?[candidates[0].x,candidates[0].y]:null;
    }

    function findPath(sx,sy,tx,ty){
      perf.findCalls++;
      if(routeClear(sx,sy,tx,ty,NAV_RADIUS)){
        perf.directRoutes++;
        return[{x:tx,y:ty}];
      }

      const startRaw=[Math.floor(sx/PATH_CELL),Math.floor(sy/PATH_CELL)];
      const goalRaw=[Math.floor(tx/PATH_CELL),Math.floor(ty/PATH_CELL)];
      const start=nearestOpenCell(startRaw[0],startRaw[1],{x:sx,y:sy});
      let goal=nearestOpenCell(goalRaw[0],goalRaw[1]);
      if(!start||!goal){perf.failedPaths++;return[]}

      if(pathComponent(...start)!==pathComponent(...goal)){
        if(!obstacleAt(tx,ty,NAV_RADIUS)){perf.failedPaths++;return[]}
        const component=pathComponent(...start);
        let closest=null,distance=160;
        for(let y=goalRaw[1]-20;y<=goalRaw[1]+20;y++)for(let x=goalRaw[0]-20;x<=goalRaw[0]+20;x++){
          if(pathCellBlocked(x,y)||pathComponent(x,y)!==component)continue;
          const p=pathCellCenter(x,y),d=Math.hypot(p.x-tx,p.y-ty);
          if(d<distance){closest=[x,y];distance=d}
        }
        if(!closest){perf.failedPaths++;return[]}
        goal=closest;
      }

      const approachRadius=obstacleAt(tx,ty,NAV_RADIUS)?64:0;
      const startKey=pathCellKey(start[0],start[1]);
      const goalKey=pathCellKey(goal[0],goal[1]);
      const open=new MinHeap();
      const gScore=new Map([[startKey,0]]);
      const came=new Map();
      const closed=new Set();
      let approach=null,approachDistance=Infinity,expanded=0,maxOpen=0;
      const heuristic=(x,y)=>Math.hypot(goal[0]-x,goal[1]-y)*1.2;

      open.push({x:start[0],y:start[1],f:heuristic(start[0],start[1])});
      const dirs=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];

      while(open.length){
        maxOpen=Math.max(maxOpen,open.length);
        const cur=open.pop();
        const ck=pathCellKey(cur.x,cur.y);
        if(closed.has(ck))continue;
        expanded++;

        const cp=pathCellCenter(cur.x,cur.y);
        if(ck===goalKey||(approachRadius&&Math.hypot(cp.x-tx,cp.y-ty)<=approachRadius)){
          perf.expandedNodes+=expanded;
          perf.maxExpanded=Math.max(perf.maxExpanded,expanded);
          perf.maxOpen=Math.max(perf.maxOpen,maxOpen);

          const raw=[];
          let key=ck;
          while(key!==startKey){
            const [gx,gy]=key.split('|').map(Number);
            raw.push(pathCellCenter(gx,gy));
            key=came.get(key);
            if(!key)break;
          }
          raw.push(pathCellCenter(start[0],start[1]));
          raw.reverse();
          if(routeClear(raw.length?raw[raw.length-1].x:sx,raw.length?raw[raw.length-1].y:sy,tx,ty,NAV_RADIUS))raw.push({x:tx,y:ty});

          const smooth=[];
          let ax=sx,ay=sy,index=0;
          while(index<raw.length){
            let far=-1;
            for(let j=raw.length-1;j>=index;j--){
              if(routeClear(ax,ay,raw[j].x,raw[j].y,NAV_RADIUS)){far=j;break}
            }
            if(far<0){perf.failedPaths++;return[]}
            smooth.push(raw[far]);
            ax=raw[far].x;ay=raw[far].y;index=far+1;
          }
          return smooth;
        }

        closed.add(ck);
        const currentPoint=pathCellCenter(cur.x,cur.y);
        const distanceToTarget=Math.hypot(currentPoint.x-tx,currentPoint.y-ty);
        if(distanceToTarget<approachDistance){approachDistance=distanceToTarget;approach=currentPoint}
        const currentG=gScore.get(ck)??Infinity;

        for(const [dx,dy] of dirs){
          const nx=cur.x+dx,ny=cur.y+dy;
          if(pathCellBlocked(nx,ny))continue;
          if(dx&&dy&&(pathCellBlocked(cur.x+dx,cur.y)||pathCellBlocked(cur.x,cur.y+dy)))continue;
          const nk=pathCellKey(nx,ny);
          if(closed.has(nk))continue;
          if(!pathEdgeClear(cur.x,cur.y,nx,ny))continue;
          const tentative=currentG+(dx&&dy?1.4142:1);
          if(tentative<(gScore.get(nk)??Infinity)){
            came.set(nk,ck);
            gScore.set(nk,tentative);
            open.push({x:nx,y:ny,f:tentative+heuristic(nx,ny)});
          }
        }
      }

      perf.expandedNodes+=expanded;
      perf.maxExpanded=Math.max(perf.maxExpanded,expanded);
      perf.maxOpen=Math.max(perf.maxOpen,maxOpen);

      if(approach&&approachDistance<=160)return findPath(sx,sy,approach.x,approach.y);
      perf.failedPaths++;
      return[];
    }

    function assignPath(ent,tx,ty){
      const path=findPath(ent.x,ent.y,tx,ty);
      ent.path=path;
      ent.pathIndex=0;
      ent.target=path.length?{...path[path.length-1]}:null;
      ent.stuckTime=0;
      return path.length>0;
    }

    function followPath(ent,speed,dt){
      if(!moveEntity||!updateFacing)throw new Error('followPath requires moveEntity and updateFacing callbacks.');
      if(!ent.path||ent.pathIndex>=ent.path.length){
        ent.path=null;ent.target=null;return false;
      }
      const p=ent.path[ent.pathIndex];
      const dx=p.x-ent.x,dy=p.y-ent.y,d=Math.hypot(dx,dy);
      if(d<=Math.max(1,speed*dt)&&routeClear(ent.x,ent.y,p.x,p.y,NAV_RADIUS)){
        ent.x=p.x;ent.y=p.y;
        ent.pathIndex++;
        if(ent.pathIndex>=ent.path.length){
          ent.path=null;ent.target=null;return false;
        }
        return true;
      }
      updateFacing(ent,dx,dy);
      const oldX=ent.x,oldY=ent.y;
      moveEntity(ent,dx/d*speed*dt,dy/d*speed*dt,NAV_RADIUS);
      ent.stuckTime=Math.hypot(ent.x-oldX,ent.y-oldY)<.2?(ent.stuckTime||0)+dt:0;
      if(ent.stuckTime>.45&&ent.target){
        const target={...ent.target};
        assignPath(ent,target.x,target.y);
      }
      return true;
    }

    function metrics(){return{...perf,blockedCache:pathBlockedCache.size,edgeCache:pathEdgeCache.size,components:nextPathComponent}}
    function resetMetrics(){
      Object.assign(perf,{findCalls:0,directRoutes:0,failedPaths:0,expandedNodes:0,maxExpanded:0,maxOpen:0,componentBuilds:0,componentCells:0,maxComponentCells:0});
    }

    return{
      pointInPoly,nearbyBuildings,solidPoint,obstacleAt,lineBlocked,
      routeClear,findPath,assignPath,followPath,pathComponent,pathCellBlocked,pathCellCenter,
      metrics,resetMetrics,
      NAV_RADIUS,PATH_CELL,PATH_COLS,PATH_ROWS,pathComponents
    };
  }

  return{create,pointInPoly};
});
