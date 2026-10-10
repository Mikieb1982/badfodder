'use strict';
const assert=require('node:assert/strict');
const Commands=require('../player-commands'),AI=require('../companion-controller'),Nav=require('../navigation'),Group=require('../group-movement'),Health=require('../character-health');
function fixture(){
 Commands.configure();const squad=Array.from({length:4},(_,i)=>({id:i,x:80,y:180+i*24,alive:true,hp:8,maxHp:8,dir:0}));let nav;
 const move=(u,dx,dy,r)=>{if(!nav.obstacleAt(u.x+dx,u.y,r))u.x+=dx;if(!nav.obstacleAt(u.x,u.y+dy,r))u.y+=dy};
 nav=Nav.create({worldWidth:640,worldHeight:640,buildings:[],moveEntity:move,updateFacing:(u,dx,dy)=>u.dir=Math.atan2(dy,dx)});
 const group=Group.create({navigation:nav,moveEntity:move,worldWidth:640,worldHeight:640});Health.bindRuntime({getSquad:()=>squad,getSelected:()=>[squad[Commands.active()]]});
 const ai=AI.create({getSquad:()=>squad,commands:Commands,navigation:nav,groupMovement:group,health:Health,getHostiles:()=>[],canSee:()=>false,fire:()=>false,firearmsAllowed:()=>false});
 const tick=n=>{for(let i=0;i<n;i++){ai.update(1/60);Health.fixedUpdate(1/60)}};return{squad,ai,tick};
}
let f=fixture();Health.down(f.squad[3]);f.squad[3].x=f.squad[1].x+20;f.squad[3].y=f.squad[1].y;assert(f.ai.switchTo(1));f.tick(1);assert.equal(f.squad[3].stabilised,false,'A manual switch beside a casualty must leave the first aid action to the player');f.tick(60);assert.equal(f.squad[3].stabilised,true,'Companion aid should resume if the player does not act');
f=fixture();Health.down(f.squad[0]);f.tick(1);assert.equal(Commands.active(),1);assert.equal(f.squad[0].stabilised,true,'Automatic fallback after the active soldier is downed must retain companion rescue behaviour');
console.log('companion casualty aid priority ok');
