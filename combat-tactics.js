/* Local cover and suppression; all timers advance only with mission simulation. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.BadFodderCombatTactics=api;})(typeof window!=='undefined'?window:globalThis,function(){
 'use strict';
 const active=u=>u.alive&&!u.surrendered&&!u.downed&&!u.insideBuilding;
 const suppression=u=>Math.max(0,Math.min(1,u.suppression||0));
 function coveredAgainst(u,x,y){const sector=(Math.round(Math.atan2(y-u.y,x-u.x)*4/Math.PI)+8)%8;return !!((u.coverMask||0)&(1<<sector));}
 function movementScale(u){return 1-.35*suppression(u);}
 function spreadScale(u){return (1+1.4*suppression(u))*(u.coverMask&&u.state!=='walk'&&u.state!=='run'?.85:1);}
 function create({getSquad=()=>[],getEnemies=()=>[],obstacleAt=()=>false,scale=1,resistance=()=>1,canSee=()=>true}={}){
  let coverClock=0,cursor=0;
  const actors=()=>[...getSquad(),...getEnemies()];
  function fixedUpdate(dt){
   const list=actors();for(const u of list)u.suppression=active(u)?Math.max(0,suppression(u)-dt*.22):0;
   coverClock-=dt;if(coverClock>0)return;coverClock=.05;
   // Bounded collision work even with large enemy populations. Four players refresh first.
   const sample=u=>{u.coverMask=0;if(!active(u))return;for(let i=0;i<8;i++){const a=i*Math.PI/4;if(obstacleAt(u.x+Math.cos(a)*24*scale,u.y+Math.sin(a)*24*scale,3*scale))u.coverMask|=1<<i;}};
   for(const u of getSquad())sample(u);
   const enemies=getEnemies();for(let n=0;n<Math.min(8,enemies.length);n++){sample(enemies[cursor%enemies.length]);cursor++;}
  }
  function nearShot(owner,ax,ay,bx,by,seen=new Set()){
   const dx=bx-ax,dy=by-ay,length=dx*dx+dy*dy;if(length<.0001)return;
   for(const u of owner==='squad'?getEnemies():getSquad()){
    if(!active(u)||seen.has(u))continue;
    const t=Math.max(0,Math.min(1,((u.x-ax)*dx+(u.y-ay)*dy)/length));
    const distance=Math.hypot(u.x-ax-t*dx,u.y-ay-t*dy),radius=22*scale;
    if(distance>=radius||!canSee(ax+t*dx,ay+t*dy,u.x,u.y))continue;
    seen.add(u);
    // A projectile contributes once per actor, even when it spans several frames.
    const amount=.32*(1-distance/radius)*(coveredAgainst(u,ax,ay)?.45:1)*resistance(u);
    u.suppression=Math.min(1,suppression(u)+amount);
   }
  }
  function snapshot(){const pack=list=>list.map(u=>[Math.round(suppression(u)*100)/100,u.coverMask||0]);return{squad:pack(getSquad()),enemies:pack(getEnemies())};}
  function receive(state){for(const [key,list] of [['squad',getSquad()],['enemies',getEnemies()]])state[key]?.forEach((r,i)=>{if(list[i]){list[i].suppression=r[0];list[i].coverMask=r[1];}});}
  return{fixedUpdate,nearShot,snapshot,receive};
 }
 return{create,coveredAgainst,movementScale,spreadScale};
});
