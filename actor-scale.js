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
 function drawCastleElevation(ctx,dx,dy,dw,dh){
  // Top-down elevation is sold with broad hillshade, contour breaks and slope-direction texture.
  // Keep it gradual: no literal green mound under the landmark and no gameplay-coordinate changes.
  if(!ctx?.save||!ctx?.ellipse||!ctx?.stroke||!ctx?.createRadialGradient)return;
  const cx=dx+dw*.5,crestY=dy+dh*.92;
  ctx.save();
  // Large feathered hillshade. Light comes from the upper-left, with the downhill face subtly darker.
  ctx.save();ctx.translate(cx,crestY+dh*.82);ctx.scale(dw*2.1,dh*2.75);
  let shade=ctx.createRadialGradient(-.13,-.38,.08,.04,.08,1);
  shade.addColorStop(0,'rgba(246,237,194,.075)');shade.addColorStop(.38,'rgba(171,164,118,.018)');shade.addColorStop(.72,'rgba(52,49,38,.055)');shade.addColorStop(1,'rgba(40,38,31,0)');
  ctx.globalCompositeOperation='multiply';ctx.fillStyle=shade;ctx.beginPath();ctx.arc(0,0,1,0,Math.PI*2);ctx.fill();ctx.restore();
  // Progressive contour lips: the player crosses these one by one when moving uphill.
  const bands=[
   {rx:.72,ry:.32,cy:.22,a:.16,s:.10,e:.90},
   {rx:1.02,ry:.58,cy:.46,a:.14,s:.08,e:.92},
   {rx:1.34,ry:.90,cy:.78,a:.12,s:.06,e:.94},
   {rx:1.68,ry:1.25,cy:1.12,a:.105,s:.05,e:.95},
   {rx:2.02,ry:1.62,cy:1.50,a:.085,s:.04,e:.96}
  ];
  for(let i=0;i<bands.length;i++){
   const b=bands[i],cy=crestY+dh*b.cy,rx=dw*b.rx,ry=dh*b.ry,start=Math.PI*b.s,end=Math.PI*b.e;
   ctx.save();ctx.lineCap='round';
   ctx.strokeStyle=`rgba(47,45,36,${b.a})`;ctx.lineWidth=Math.max(1.1,dw*.0105);ctx.beginPath();ctx.ellipse(cx,cy,rx,ry,0,start,end);ctx.stroke();
   ctx.translate(0,-Math.max(.8,dh*.012));ctx.strokeStyle=`rgba(232,221,177,${b.a*.60})`;ctx.lineWidth=Math.max(.7,dw*.0058);ctx.beginPath();ctx.ellipse(cx,cy,rx,ry,0,start,end);ctx.stroke();ctx.restore();
  }
  // Sparse fall-line strokes make the grass surface read as a slope instead of a flat contour map.
  ctx.save();let seed=0x7b31d2a9;ctx.lineCap='round';
  for(let i=0;i<34;i++){
   seed=(Math.imul(seed,1664525)+1013904223)>>>0;const u=seed/4294967296;
   seed=(Math.imul(seed,1664525)+1013904223)>>>0;const v=seed/4294967296;
   const x=cx+(u-.5)*dw*3.15,y=crestY+dh*(.34+v*1.82);
   const nx=(x-cx)/(dw*1.72),ny=(y-(crestY+dh*.95))/(dh*1.70);if(nx*nx+ny*ny>1)continue;
   const angle=Math.atan2(Math.max(.22,ny+.42),nx*.48),len=3.2+((seed>>>24)&7)*.55;
   ctx.strokeStyle=i%3===0?'rgba(236,225,184,.085)':'rgba(54,51,40,.085)';ctx.lineWidth=.8;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+Math.cos(angle)*len,y+Math.sin(angle)*len);ctx.stroke();
  }
  ctx.restore();
  // A restrained crest highlight gives the highest area a readable break.
  ctx.save();ctx.globalCompositeOperation='screen';ctx.strokeStyle='rgba(239,228,184,.09)';ctx.lineWidth=Math.max(1,dw*.007);ctx.beginPath();ctx.ellipse(cx-dw*.08,crestY+dh*.16,dw*.63,dh*.24,0,Math.PI*.15,Math.PI*.85);ctx.stroke();ctx.restore();
  ctx.restore();
 }
 function installCastleElevationDraw(){
  if(typeof CanvasRenderingContext2D==='undefined')return;
  const proto=CanvasRenderingContext2D.prototype;if(proto.__badFodderCastleElevationInstalled)return;
  const native=proto.drawImage;
  Object.defineProperty(proto,'__badFodderCastleElevationInstalled',{value:true,configurable:true});
  proto.drawImage=function(source,...args){
   if(source&&source.__badFodderCastleLandmark){
    let dx,dy,dw,dh;
    if(args.length===4){[dx,dy,dw,dh]=args;}
    else if(args.length===8){dx=args[4];dy=args[5];dw=args[6];dh=args[7];}
    if([dx,dy,dw,dh].every(Number.isFinite))drawCastleElevation(this,dx,dy,dw,dh);
   }
   return native.call(this,source,...args);
  };
 }
 function finishLandmark(source,key){
  if(typeof document==='undefined'||!source||!landmarkKeys.has(key))return source;
  const hit=landmarkCache.get(key);if(hit?.source===source)return hit.canvas;
  const w=source.width||320,h=source.height||240,probe=document.createElement('canvas');probe.width=w;probe.height=h;
  const pg=probe.getContext('2d');if(!pg)return source;pg.drawImage(source,0,0,w,h);
  const b=alphaBounds(pg,w,h)||{x:0,y:0,w,h};
  const c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d');if(!g)return source;
  const castle=key==='castle';
  // Keep the landmark itself crisp and normally proportioned. Elevation is now expressed in the surrounding terrain.
  const fill=castle?.88:key==='rathaus'?.88:.84,maxW=w*fill,maxH=h*(castle?.76:.84),scale=Math.min(maxW/b.w,maxH/b.h);
  const dw=b.w*scale,dh=b.h*scale,dx=(w-dw)/2,dy=h-dh-h*.045;
  const mask=silhouette(source,b.x,b.y,b.w,b.h,Math.max(1,Math.ceil(dw)),Math.max(1,Math.ceil(dh)),'#28342d');
  // Soft contact depth and a restrained cut-paper edge make the old POI sheet sit in the newer miniature world.
  g.save();g.globalAlpha=.22;if('filter' in g)g.filter='blur(2.4px)';g.drawImage(mask,dx+3,dy+5,dw,dh);g.restore();
  g.save();g.globalAlpha=.22;for(const [ox,oy] of [[-1,0],[1,0],[0,-1],[0,1]])g.drawImage(mask,dx+ox,dy+oy,dw,dh);g.restore();
  g.drawImage(source,b.x,b.y,b.w,b.h,dx,dy,dw,dh);
  // Gentle directional light, warmer walls and darker lower edges. No high-frequency grunge.
  g.save();g.globalCompositeOperation='source-atop';
  if(g.createLinearGradient){const light=g.createLinearGradient(0,dy,w,dy+dh);light.addColorStop(0,'rgba(255,244,210,.115)');light.addColorStop(.5,'rgba(255,234,194,.025)');light.addColorStop(1,'rgba(44,50,42,.13)');g.fillStyle=light;g.fillRect(0,0,w,h);
   const lower=g.createLinearGradient(0,dy+dh*.5,0,dy+dh);lower.addColorStop(0,'rgba(45,50,39,0)');lower.addColorStop(1,'rgba(45,50,39,.10)');g.fillStyle=lower;g.fillRect(dx,dy,dw,dh);}
  g.globalAlpha=.055;g.fillStyle='#4d4438';let seed=key.split('').reduce((n,ch)=>Math.imul(n^ch.charCodeAt(0),16777619)>>>0,2166136261);
  if(g.beginPath&&g.ellipse&&g.fill)for(let i=0;i<34;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const x=dx+(seed/4294967296)*dw;seed=(Math.imul(seed,1664525)+1013904223)>>>0;const yy=dy+(seed/4294967296)*dh;g.beginPath();g.ellipse(x,yy,1.2,.55,-.35,0,Math.PI*2);g.fill();}
  g.restore();
  if(castle)Object.defineProperty(c,'__badFodderCastleLandmark',{value:true});
  landmarkCache.set(key,{source,canvas:c});return c;
 }
 function installRenderPipeline(art){
  if(!art||typeof art.drawActor!=='function')return null;
  if(art.actorRenderPipeline)return art.actorRenderPipeline;
  let current=art.drawActor;
  const layers=[{name:'base-renderer',kind:'base'}];
  const snapshot=()=>current;
  const api={
   register(name,{before,after,around}={}){
    if(!name||layers.some(layer=>layer.name===name))return false;
    const previous=current;
    current=function(ctx,ent,team='squad',...rest){
     before?.(ctx,ent,team,...rest);
     const invoke=()=>previous.call(this,ctx,ent,team,...rest);
     const result=around?around.call(this,invoke,ctx,ent,team,...rest):invoke();
     after?.(ctx,ent,team,result,...rest);return result;
    };
    layers.push({name:String(name),kind:'registered'});return true;
   },
   list(){return layers.map(layer=>({...layer}))},
   get renderer(){return snapshot()}
  };
  Object.defineProperty(art,'drawActor',{
   configurable:true,enumerable:true,
   get(){const draw=snapshot();return function(...args){return draw.apply(this,args)}},
   set(next){if(typeof next!=='function'||next===current)return;current=next;layers.push({name:next.__actorRenderLayer||next.name||`legacy-wrapper-${layers.length}`,kind:'legacy'})}
  });
  Object.defineProperty(art,'actorRenderPipeline',{value:api,configurable:true,enumerable:false});
  return api;
 }
 function installArt(art){
  if(!art||art.actorScaleInstalled)return;
  installCastleElevationDraw();
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
  installRenderPipeline(art);
  art.actorScaleInstalled=true;
 }
 function installNavigation(nav){
  if(!nav?.followPath||nav.actorScaleInstalled)return;
  const follow=nav.followPath;
  nav.followPath=function(ent,pace,dt){return follow.call(this,ent,pace*speed,dt)};
  nav.actorScaleInstalled=true;
 }
 return Object.freeze({size,speed,installArt,installNavigation,installRenderPipeline});
});
