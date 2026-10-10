/* World presentation scale, movement pacing and Bad Belzig landmark finishing. Gameplay geometry stays unchanged. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root){root.BadFodderActorScale=api;if(root.BadFodderArt)api.installArt(root.BadFodderArt)}})(typeof window!=='undefined'?window:globalThis,function(){
 'use strict';
 const size=.6825,speed=.455;
 const landmarkKeys=new Set(['castle','butter','post','rathaus','reissiger','briccius','marien']);
 const landmarkCache=new Map();
 function canGround(ctx){return !!(ctx?.beginPath&&ctx?.ellipse&&ctx?.arc&&ctx?.stroke&&ctx?.fill)}
 function drawGrounding(ctx,ent,team){
  if(!canGround(ctx)||!ent||ent.alive===false)return;
  const squad=team==='squad',selected=squad&&!!ent.selected;
  ctx.save();
  ctx.globalAlpha=.46;ctx.fillStyle='#000';ctx.beginPath();ctx.ellipse(ent.x,ent.y+2.5,9,4.2,0,0,Math.PI*2);ctx.fill();
  if(squad){
   ctx.globalAlpha=selected?.95:.36;ctx.strokeStyle=selected?'#f2df9a':'#d7dfc6';ctx.lineWidth=selected?1.8:1.1;
   if(ctx.setLineDash)ctx.setLineDash(selected?[]:[3,3]);
   ctx.beginPath();ctx.arc(ent.x,ent.y,10.5,0,Math.PI*2);ctx.stroke();
   if(selected){
    const a=Number.isFinite(ent.dir)?ent.dir:-Math.PI/2,r=14,tipX=ent.x+Math.cos(a)*r,tipY=ent.y+Math.sin(a)*r;
    ctx.fillStyle='#f2df9a';ctx.globalAlpha=.95;ctx.beginPath();
    ctx.moveTo(tipX,tipY);ctx.lineTo(ent.x+Math.cos(a+2.55)*9,ent.y+Math.sin(a+2.55)*9);ctx.lineTo(ent.x+Math.cos(a-2.55)*9,ent.y+Math.sin(a-2.55)*9);ctx.closePath();ctx.fill();
   }
  }
  if(ent.occluded||ent.insideBuilding){
   ctx.globalAlpha=.55;ctx.strokeStyle='#f5e8b0';ctx.lineWidth=1.6;ctx.beginPath();ctx.arc(ent.x,ent.y-5,8.5,Math.PI*.15,Math.PI*.85);ctx.stroke();
  }
  ctx.restore();
 }
 function alphaBounds(ctx,w,h){
  try{
   const data=ctx.getImageData(0,0,w,h).data;let minX=w,minY=h,maxX=-1,maxY=-1;
   for(let y=0;y<h;y+=2)for(let x=0;x<w;x+=2)if(data[(y*w+x)*4+3]>14){if(x<minX)minX=x;if(x>maxX)maxX=x;if(y<minY)minY=y;if(y>maxY)maxY=y;}
   return maxX>=minX&&maxY>=minY?{x:Math.max(0,minX-4),y:Math.max(0,minY-4),w:Math.min(w,maxX-minX+9),h:Math.min(h,maxY-minY+9)}:null;
  }catch(_){return null;}
 }
 function silhouette(source,sx,sy,sw,sh,w,h,color){
  const c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d');
  g.drawImage(source,sx,sy,sw,sh,0,0,w,h);g.globalCompositeOperation='source-in';g.fillStyle=color;g.fillRect(0,0,w,h);return c;
 }
 function hillPolygon(g,points,color){
  if(!g?.beginPath||!g?.moveTo||!g?.lineTo||!g?.fill)return;
  g.fillStyle=color;g.beginPath();g.moveTo(points[0][0],points[0][1]);for(let i=1;i<points.length;i++)g.lineTo(points[i][0],points[i][1]);g.closePath();g.fill();
 }
 function drawCastleHill(g,w,h){
  if(!g)return;
  // Burg Eisenhardt sits above Bad Belzig. These broad terraces create that elevation
  // entirely in the presentation layer: map coordinates, collision and navigation stay untouched.
  const y=h;
  hillPolygon(g,[[-8,y*.96],[8,y*.78],[42,y*.63],[92,y*.53],[151,y*.47],[215,y*.51],[271,y*.62],[312,y*.78],[328,y*.96]],'#4a4f3f');
  hillPolygon(g,[[-5,y*.91],[24,y*.72],[68,y*.58],[126,y*.50],[188,y*.50],[246,y*.58],[294,y*.72],[325,y*.91]],'#60684d');
  hillPolygon(g,[[18,y*.80],[56,y*.65],[106,y*.56],[160,y*.53],[217,y*.57],[268,y*.67],[304,y*.81],[304,y*.91],[18,y*.91]],'#707755');
  hillPolygon(g,[[66,y*.67],[104,y*.58],[153,y*.55],[202,y*.58],[244,y*.68],[229,y*.73],[93,y*.73]],'#7c815d');
  // Exposed earth/retaining cuts make the slope read as height rather than a green blob.
  hillPolygon(g,[[9,y*.80],[44,y*.69],[88,y*.62],[91,y*.66],[48,y*.75],[15,y*.86]],'#655944');
  hillPolygon(g,[[235,y*.68],[271,y*.75],[306,y*.87],[303,y*.92],[263,y*.82],[224,y*.73]],'#5d523f');
  if(g.beginPath&&g.moveTo&&g.lineTo&&g.stroke){
   // Winding pale approach up the slope.
   g.save();g.strokeStyle='#9a9278';g.lineWidth=Math.max(4,w*.018);g.lineCap='round';g.lineJoin='round';g.globalAlpha=.72;
   g.beginPath();g.moveTo(w*.51,h*.99);g.lineTo(w*.56,h*.86);g.lineTo(w*.47,h*.77);g.lineTo(w*.53,h*.68);g.lineTo(w*.49,h*.61);g.stroke();
   g.strokeStyle='rgba(49,45,36,.42)';g.lineWidth=Math.max(1,w*.005);g.globalAlpha=.48;g.beginPath();g.moveTo(w*.51,h*.99);g.lineTo(w*.56,h*.86);g.lineTo(w*.47,h*.77);g.lineTo(w*.53,h*.68);g.lineTo(w*.49,h*.61);g.stroke();g.restore();
  }
  // Low-frequency texture: enough physical variation to sell earth/grass, not visible grunge.
  g.save();let seed=0x5e17a1d3;for(let i=0;i<42;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const x=(seed/4294967296)*w;seed=(Math.imul(seed,1664525)+1013904223)>>>0;const yy=h*.58+(seed/4294967296)*h*.36;g.globalAlpha=.09;g.fillStyle=i%3===0?'#302f27':'#a7a37d';g.fillRect(x,yy,1.5+(i%2),1);}
  g.restore();
  // Stronger downhill contact shadow is what makes the castle feel materially above the town.
  if(g.createLinearGradient){const shade=g.createLinearGradient(0,h*.68,0,h);shade.addColorStop(0,'rgba(35,38,31,0)');shade.addColorStop(1,'rgba(29,31,27,.34)');g.fillStyle=shade;g.fillRect(0,h*.64,w,h*.36);}
 }
 function finishLandmark(source,key){
  if(typeof document==='undefined'||!source||!landmarkKeys.has(key))return source;
  const hit=landmarkCache.get(key);if(hit?.source===source)return hit.canvas;
  const w=source.width||320,h=source.height||240,probe=document.createElement('canvas');probe.width=w;probe.height=h;
  const pg=probe.getContext('2d');if(!pg)return source;pg.drawImage(source,0,0,w,h);
  const b=alphaBounds(pg,w,h)||{x:0,y:0,w,h};
  const c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d');if(!g)return source;
  const castle=key==='castle';
  if(castle)drawCastleHill(g,w,h);
  // Burg is deliberately lifted and given more breathing room so its hill remains visible at normal game zoom.
  const fill=castle?.78:key==='rathaus'?.88:.84,maxW=w*fill,maxH=h*(castle?.58:.84),scale=Math.min(maxW/b.w,maxH/b.h);
  const dw=b.w*scale,dh=b.h*scale,dx=(w-dw)/2,dy=castle?h*.035:h-dh-h*.045;
  const mask=silhouette(source,b.x,b.y,b.w,b.h,Math.max(1,Math.ceil(dw)),Math.max(1,Math.ceil(dh)),'#28342d');
  // Soft contact depth and a restrained cut-paper edge make the old POI sheet sit in the newer miniature world.
  g.save();g.globalAlpha=castle?.31:.22;if('filter' in g)g.filter=castle?'blur(3.1px)':'blur(2.4px)';g.drawImage(mask,dx+(castle?5:3),dy+(castle?8:5),dw,dh);g.restore();
  g.save();g.globalAlpha=.22;for(const [ox,oy] of [[-1,0],[1,0],[0,-1],[0,1]])g.drawImage(mask,dx+ox,dy+oy,dw,dh);g.restore();
  g.drawImage(source,b.x,b.y,b.w,b.h,dx,dy,dw,dh);
  // Gentle directional light, warmer walls and darker lower edges. No high-frequency grunge.
  g.save();g.globalCompositeOperation='source-atop';
  if(g.createLinearGradient){const light=g.createLinearGradient(0,dy,w,dy+dh);light.addColorStop(0,'rgba(255,244,210,.115)');light.addColorStop(.5,'rgba(255,234,194,.025)');light.addColorStop(1,'rgba(44,50,42,.13)');g.fillStyle=light;g.fillRect(0,0,w,h);
   const lower=g.createLinearGradient(0,dy+dh*.5,0,dy+dh);lower.addColorStop(0,'rgba(45,50,39,0)');lower.addColorStop(1,'rgba(45,50,39,.10)');g.fillStyle=lower;g.fillRect(dx,dy,dw,dh);}
  g.globalAlpha=.055;g.fillStyle='#4d4438';let seed=key.split('').reduce((n,ch)=>Math.imul(n^ch.charCodeAt(0),16777619)>>>0,2166136261);
  if(g.beginPath&&g.ellipse&&g.fill)for(let i=0;i<34;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const x=dx+(seed/4294967296)*dw;seed=(Math.imul(seed,1664525)+1013904223)>>>0;const yy=dy+(seed/4294967296)*dh;g.beginPath();g.ellipse(x,yy,1.2,.55,-.35,0,Math.PI*2);g.fill();}
  g.restore();
  landmarkCache.set(key,{source,canvas:c});return c;
 }
 function installArt(art){
  if(!art||art.actorScaleInstalled)return;
  if(art.landmark&&typeof document!=='undefined'&&!art.landmarkFinishInstalled){
   const landmark=art.landmark;
   art.landmark=function(key){return finishLandmark(landmark.call(this,key),key)};
   art.landmarkFinishInstalled=true;
  }
  if(!art.drawActor){art.actorScaleInstalled=true;return;}
  const draw=art.drawActor;
  art.drawActor=function(ctx,ent,...args){
   const team=args[0]||'squad';drawGrounding(ctx,ent,team);
   ctx.save();ctx.translate(ent.x,ent.y);ctx.scale(size,size);ctx.translate(-ent.x,-ent.y);
   if('shadowColor' in ctx){ctx.shadowColor='rgba(245,236,205,.32)';ctx.shadowBlur=1.6;ctx.shadowOffsetX=0;ctx.shadowOffsetY=0;}
   try{return draw.call(this,ctx,ent,...args)}finally{ctx.restore()}
  };
  art.actorScaleInstalled=true;
 }
 function installNavigation(nav){
  if(!nav?.followPath||nav.actorScaleInstalled)return;
  const follow=nav.followPath;
  nav.followPath=function(ent,pace,dt){return follow.call(this,ent,pace*speed,dt)};
  nav.actorScaleInstalled=true;
 }
 return Object.freeze({size,speed,installArt,installNavigation});
});
