/* World actors only: portraits, scenery, input radii and simulation clocks stay unchanged. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root){root.BadFodderActorScale=api;if(root.BadFodderArt)api.installArt(root.BadFodderArt)}})(typeof window!=='undefined'?window:globalThis,function(){
 'use strict';
 const size=.5,speed=.65;
 function installArt(art){
  if(!art?.drawActor||art.actorScaleInstalled)return;
  const draw=art.drawActor;
  art.drawActor=function(ctx,ent,...args){ctx.save();ctx.translate(ent.x,ent.y);ctx.scale(size,size);ctx.translate(-ent.x,-ent.y);try{return draw.call(this,ctx,ent,...args)}finally{ctx.restore()}};
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
