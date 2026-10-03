'use strict';
// Preserve the research trace. This explicit gameplay adaptation widens carriageways,
// moves intact building footprints back and projects the whole battlefield diagonally.
function apply(map,layout){
 if(!layout)return map;
 const a=layout.angleDegrees*Math.PI/180,c=Math.cos(a),s=Math.sin(a);
 const cx=layout.junctionX,cy=layout.streetY,halfX=layout.sideHalfWidth,halfY=layout.streetHalfWidth;
 const spread=(v,centre,half,extra)=>v+Math.max(-1,Math.min(1,(v-centre)/half))*extra;
 const widen=([x,y])=>[spread(x,cx,halfX,layout.sideExtraWidth)+(layout.sideStreets||[]).reduce((extra,j)=>extra+Math.max(-1,Math.min(1,(x-j.x)/j.halfWidth))*j.extraWidth,0),spread(y,cy,halfY,layout.streetExtraWidth)];
 const rotate=([x,y])=>[x*c-y*s,x*s+y*c];
 const corners=[[0,0],[map.width,0],[0,map.height],[map.width,map.height]].map(p=>rotate(widen(p)));
 const ox=48-Math.min(...corners.map(p=>p[0])),oy=48-Math.min(...corners.map(p=>p[1]));
 const project=p=>{const q=rotate(widen(p));return[q[0]+ox,q[1]+oy]};
 const bounds=o=>{if(!o.points)return;const xs=o.points.map(p=>p[0]),ys=o.points.map(p=>p[1]);Object.assign(o,{minX:Math.min(...xs),maxX:Math.max(...xs),minY:Math.min(...ys),maxY:Math.max(...ys)})};
 function item(o){
  if(!o)return;
  if(o.points){o.points=o.points.map(project);bounds(o)}
  for(const [x,y] of [['x','y'],['targetX','targetY'],['withdrawX','withdrawY'],['exitX','exitY']])if(Number.isFinite(o[x])&&Number.isFinite(o[y]))[o[x],o[y]]=project([o[x],o[y]]);
  if(o.workPoints)o.workPoints.forEach(item);
 }
 for(const b of map.buildings){
  if(b.hidden){item(b);continue}
  // Rigid translation keeps roofs/facades proportional instead of stretching houses.
  const mx=(b.minX+b.maxX)/2,my=(b.minY+b.maxY)/2;
  const [wx,wy]=widen([mx,my]),dx=wx-mx,dy=wy-my;
  b.points=b.points.map(([x,y])=>{const q=rotate([x+dx,y+dy]);return[q[0]+ox,q[1]+oy]});bounds(b);
 }
 for(const group of [map.roads,map.areas,map.railways,map.eventZones,map.gameplayAdjustments])group.forEach(item);
 for(const group of Object.values(map.historicalObjects))group.forEach(item);
 Object.values(map.zones).forEach(item);item(map.regroupPoint);
 map.spawns.squad=map.spawns.squad.map(project);
 map.routeRequirements.forEach(r=>{item(r.from);item(r.to)});
 map.width=Math.ceil(Math.max(...corners.map(p=>p[0]))+ox+48);
 map.height=Math.ceil(Math.max(...corners.map(p=>p[1]))+oy+48);
 map.projection.gameplayLayout={...layout,interpretation:'Widened tactical adaptation of the historical trace; additional defence placements are fictional gameplay.'};
 return map;
}
module.exports={apply};
