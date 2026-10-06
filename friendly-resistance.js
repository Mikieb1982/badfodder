/* Small autonomous allies reuse navigation, cover, projectiles and damage. No squad UI or networking. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.BadFodderResistance=api;})(typeof window!=='undefined'?window:globalThis,function(){
'use strict';
function create({starts=[],positions=[],getEnemies,getSquad=()=>[],navigation,fire,scale=1,canSee=()=>true,enabled=()=>true,random=Math.random,spreadScale=()=>1}={}){
 const units=starts.map((p,i)=>({x:p[0]*scale,y:p[1]*scale,homeX:p[0]*scale,homeY:p[1]*scale,alive:true,hp:4,maxHp:4,identityRole:'resistance',variant:i,name:['Pau','Elena','Ramon'][i]||'Neighbour',weapon:'mauser',equipmentManaged:true,dir:0,anim:i*.4,state:'idle',cooldown:.5+i*.2,path:null,pathIndex:0,flash:0,fireTimer:0}));
 let pathClock=0,cursor=0,coverClock=0;
 function target(unit){return getEnemies().filter(e=>e.alive&&!e.surrendered&&!e.missionDormant&&Math.hypot(e.x-unit.x,e.y-unit.y)<190*scale&&canSee(unit,e)).sort((a,b)=>Math.hypot(a.x-unit.x,a.y-unit.y)-Math.hypot(b.x-unit.x,b.y-unit.y))[0]||null}
 function update(dt){
  pathClock-=dt;coverClock-=dt;
  const ready=enabled();
  // Dead slots cannot stall the shared staggered path budget.
  if(ready&&pathClock<=0&&units.length){
   for(let n=0;n<units.length;n++){const i=cursor++%units.length,u=units[i];if(!u.alive)continue;
    const p=positions[i]||starts[i];if(Math.hypot(u.x-p[0]*scale,u.y-p[1]*scale)>18*scale)navigation.assignPath(u,p[0]*scale,p[1]*scale);pathClock=.6;break;
   }
  }
  const sampleCover=coverClock<=0;if(sampleCover)coverClock=.25;
  for(const [i,u]of units.entries()){
   if(!u.alive){u.state='dead';u.deadTimer=(u.deadTimer||0)+dt;continue}
   u.cooldown=Math.max(0,u.cooldown-dt);u.fireTimer=Math.max(0,u.fireTimer-dt);u.flash=Math.max(0,u.flash-dt);u.wounded=u.hp<u.maxHp;
   if(sampleCover){u.coverMask=0;for(let k=0;k<8;k++){const a=k*Math.PI/4;if(navigation.obstacleAt(u.x+Math.cos(a)*24*scale,u.y+Math.sin(a)*24*scale,3*scale))u.coverMask|=1<<k}}
   if(!ready){u.state='idle';continue}
   const closePlayer=getSquad().find(s=>s.alive&&Math.hypot(s.x-u.x,s.y-u.y)<13*scale);
   if(closePlayer){const a=Math.atan2(u.y-closePlayer.y,u.x-closePlayer.x)||i*2.4;navigation.move?.(u,Math.cos(a)*30*dt,Math.sin(a)*30*dt,6)}
   const moving=u.path&&navigation.followPath(u,u.wounded?54:74,dt),e=target(u);
   u.state=moving?'walk':'idle';
   if(e&&u.cooldown<=0){const spread=(10+Math.hypot(e.x-u.x,e.y-u.y)*.05)*spreadScale(u);u.dir=Math.atan2(e.y-u.y,e.x-u.x);if(fire('friendly',u.x,u.y,e.x+(random()-.5)*spread,e.y+(random()-.5)*spread,null)!==false){u.state='fire';u.fireTimer=.12;u.cooldown=u.wounded?1.9:1.35}}
  }
 }
 function reposition(points){positions=points;for(const u of units){u.path=null;u.pathIndex=0}pathClock=0}
 return{units,update,target,reposition,counts:()=>({alive:units.filter(u=>u.alive).length,lost:units.filter(u=>!u.alive).length,wounded:units.filter(u=>u.alive&&u.wounded).length})};
}
return{create};
});
