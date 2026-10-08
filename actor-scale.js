/* World actors only: portraits, scenery, input radii and simulation clocks stay unchanged. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root){root.BadFodderActorScale=api;if(root.BadFodderArt)api.installArt(root.BadFodderArt)}})(typeof window!=='undefined'?window:globalThis,function(){
 'use strict';
 const size=.6825,speed=.455;
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
 function installArt(art){
  if(!art?.drawActor||art.actorScaleInstalled)return;
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
