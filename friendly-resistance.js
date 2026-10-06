/* Small autonomous allies reuse navigation, cover, projectiles and damage. No squad UI or networking. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.BadFodderResistance=api;})(typeof window!=='undefined'?window:globalThis,function(){
'use strict';
function create({starts=[],positions=[],getEnemies,getSquad=()=>[],navigation,fire,scale=1,canSee=()=>true,enabled=()=>true}={}){
 const units=starts.map((p,i)=>({x:p[0]*scale,y:p[1]*scale,homeX:p[0]*scale,homeY:p[1]*scale,alive:true,hp:4,maxHp:4,identityRole:'resistance',variant:i,name:['Pau','Elena','Ramon'][i]||'Neighbour',weapon:'mauser',equipmentManaged:true,dir:0,anim:i*.4,state:'idle',cooldown:.5+i*.2,path:null,pathIndex:0,flash:0,fireTimer:0}));
 let pathClock=0,cursor=0;
 function target(unit){return getEnemies().filter(e=>e.alive&&!e.surrendered&&!e.missionDormant&&Math.hypot(e.x-unit.x,e.y-unit.y)<190*scale&&canSee(unit,e)).sort((a,b)=>Math.hypot(a.x-unit.x,a.y-unit.y)-Math.hypot(b.x-unit.x,b.y-unit.y))[0]||null}
 function update(dt){
  pathClock-=dt;
  for(const [i,u]of units.entries()){
   if(!u.alive){u.state='dead';u.deadTimer=(u.deadTimer||0)+dt;continue}
   u.cooldown=Math.max(0,u.cooldown-dt);u.fireTimer=Math.max(0,u.fireTimer-dt);u.flash=Math.max(0,u.flash-dt);u.wounded=u.hp<u.maxHp;
   u.coverMask=0;for(let k=0;k<8;k++){const a=k*Math.PI/4;if(navigation.obstacleAt(u.x+Math.cos(a)*24*scale,u.y+Math.sin(a)*24*scale,3*scale))u.coverMask|=1<<k}
   if(!enabled()){u.state='idle';continue}
   const p=positions[i]||starts[i],at={x:p[0]*scale,y:p[1]*scale};
   // One path query per refresh, staggered across the whole group.
   if(pathClock<=0&&cursor%units.length===i){pathClock=.6;cursor++;if(Math.hypot(u.x-at.x,u.y-at.y)>18*scale)navigation.assignPath(u,at.x,at.y)}
   const closePlayer=getSquad().find(s=>s.alive&&Math.hypot(s.x-u.x,s.y-u.y)<13*scale);
   if(closePlayer){const d=Math.hypot(u.x-closePlayer.x,u.y-closePlayer.y)||1;navigation.move?.(u,(u.x-closePlayer.x)/d*20*dt,(u.y-closePlayer.y)/d*20*dt,6)}
   const moving=u.path&&navigation.followPath(u,u.wounded?42:58,dt),e=target(u);
   u.state=moving?'walk':'idle';
   if(e&&u.cooldown<=0){u.dir=Math.atan2(e.y-u.y,e.x-u.x);if(fire('friendly',u.x,u.y,e.x,e.y,null)!==false){u.state='fire';u.fireTimer=.12;u.cooldown=u.wounded?1.5:1}}
  }
 }
 function reposition(points){positions=points;for(const u of units){u.path=null;u.pathIndex=0}pathClock=0}
 return{units,update,target,reposition,counts:()=>({alive:units.filter(u=>u.alive).length,lost:units.filter(u=>!u.alive).length,wounded:units.filter(u=>u.alive&&u.wounded).length})};
}
return{create};
});
