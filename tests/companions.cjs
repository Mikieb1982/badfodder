'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const C=require('../player-commands'),AI=require('../companion-controller'),Nav=require('../navigation'),Group=require('../group-movement'),Health=require('../character-health');
function fixture({buildings=[],armed=true,cover=null}={}){
 C.configure();const squad=Array.from({length:4},(_,i)=>({id:i,x:80,y:180+i*24,alive:true,hp:8,maxHp:8,dir:0})),enemies=[],shots=[],released=[];let context={mode:'FOLLOW'},nav;
 const move=(u,dx,dy,r)=>{if(!nav.obstacleAt(u.x+dx,u.y,r))u.x+=dx;if(!nav.obstacleAt(u.x,u.y+dy,r))u.y+=dy};
 nav=Nav.create({worldWidth:640,worldHeight:640,buildings,moveEntity:move,updateFacing:(u,dx,dy)=>u.dir=Math.atan2(dy,dx)});
 const group=Group.create({navigation:nav,moveEntity:move,worldWidth:640,worldHeight:640});Health.bindRuntime({getSquad:()=>squad,getSelected:()=>[squad[C.active()]]});
 const ai=AI.create({getSquad:()=>squad,commands:C,navigation:nav,groupMovement:group,health:Health,getHostiles:()=>enemies,canSee:(u,e)=>nav.routeClear(u.x,u.y,e.x,e.y,1),fire:(u,e)=>shots.push([u.id,e.id]),firearmsAllowed:()=>armed,findCover:()=>cover,getContext:()=>context,releaseCover:u=>{released.push(u.id);u.checkpointCover=false;u.manualGarrison=false;}});
 function tick(n=1){for(let k=0;k<n;k++){ai.update(1/60);for(const u of squad)if(AI.viable(u))group.follow(u,120,1/60);group.separate(squad,Group.defaults,1/60,u=>C.owner(u.id)<0);Health.fixedUpdate(1/60)}}
 return{squad,enemies,shots,ai,nav,group,tick,released,context:v=>context=v};
}
let f=fixture();assert.equal(C.units(f.squad,'all').length,1);assert.equal(f.ai.active(),f.squad[0]);
const html=fs.readFileSync(require.resolve('../index.html'),'utf8');
const selected=html.slice(html.indexOf('  function selectedUnits(){'),html.indexOf('  function selectedHistoricalActor('));
const scope={squad:f.squad,commands:C,companions:f.ai};vm.createContext(scope);vm.runInContext(selected,scope);
assert.equal(scope.selectedUnits().length,1);
// Real click-movement function changes only the active path, leaving AI to issue its own paths.
const a=html.indexOf('  function setMoveTargets('),b=html.indexOf('  function ensureTouchFormation(',a);
Object.assign(scope,{coopCommand:()=>false,coordinationSupport:null,window:{BadFodderGarrison:{releaseCheckpoint:u=>u.checkpointCover=false,release:u=>u.manualGarrison=false}},buildingRuntime:null,missionInteractionLayer:null,WORLD_W:640,WORLD_H:640,clearSquadFormation(){},assignPath:f.nav.assignPath,setStatus(){}});
vm.runInContext(html.slice(a,b),scope);scope.setMoveTargets({x:340,y:200});assert(f.squad[0].path);assert(f.squad.slice(1).every(u=>!u.path));
f.squad[1].path=[{x:600,y:600}];assert(f.ai.switchTo(1));assert.equal(f.ai.active().id,1);assert.equal(f.squad[1].path,null);assert(f.ai.isCompanion(f.squad[0]));assert.equal(C.units(f.squad,'all').length,1);
Health.down(f.squad[1]);assert.equal(f.ai.ensureActive().id,0);f.squad[0].alive=false;assert.equal(f.ai.ensureActive().id,2);f.squad[2].alive=false;f.squad[3].alive=false;assert.equal(f.ai.ensureActive(),null);
assert(html.includes('!squad.some(s=>s.alive&&!s.downed)'));
f=fixture();f.squad[0].x=420;assert(f.ai.speedScale(f.squad[1])>1);assert.equal(f.ai.speedScale(f.squad[0]),1);f.tick(240);assert(f.squad.slice(1).every(u=>Math.hypot(u.x-420,u.y-180)<85));
assert.equal(new Set(f.squad.slice(1).map(u=>Math.round(u.x)+','+Math.round(u.y))).size,3);
assert(f.squad.slice(1).every(u=>u.x<=420));const calls=f.nav.metrics().findCalls;f.tick(120);assert(f.nav.metrics().findCalls-calls<8,'Settled group must not continually repath');
const wall={id:'wall',solid:true,minX:220,minY:80,maxX:260,maxY:250,points:[[220,80],[260,80],[260,250],[220,250]]};
f=fixture({buildings:[wall]});f.squad[0].x=430;f.tick(480);assert(f.squad.slice(1).every(u=>u.x>300&&!f.nav.obstacleAt(u.x,u.y,f.nav.NAV_RADIUS)));
f=fixture();f.squad[0].x=420;f.squad[1].checkpointCover=true;f.squad[1].manualGarrison=true;f.tick(180);assert(!f.squad[1].checkpointCover&&!f.squad[1].manualGarrison);assert(f.squad[1].x>200);
f=fixture({cover:{x:110,y:210}});f.enemies.push({id:9,x:200,y:210,alive:true,alert:true});f.tick(1);assert(f.squad.some(u=>u.companionState==='TAKE_COVER'));assert(f.shots.length>0);
f.enemies[0].x=600;f.tick(30);const fired=f.shots.length;f.tick(30);assert.equal(f.shots.length,fired,'No chasing/fire beyond leash');
for(const armed of [false,true]){f=fixture({armed});f.enemies.push({id:9,x:180,y:220,alive:true,alert:true});f.tick(30);assert.equal(f.shots.length>0,armed,'Mission firearm restrictions');}
f=fixture();Health.down(f.squad[0]);f.tick(1);assert.equal(C.active(),1);assert(f.squad[0].stabilised);assert.equal(f.squad.filter(u=>u.aidTimer>0).length,1);assert(Health.beginCarry(f.squad[0],f.squad[1]));assert.equal(Health.movementScale(f.squad[1]),Health.CARRY_SPEED);assert(Health.dropCarry(f.squad[1]));
f=fixture();Health.down(f.squad[3]);f.enemies.push({id:9,x:170,y:250,alive:true,alert:true});f.tick(1);assert(!f.squad[3].stabilised,'Do not aid in visible fire');f.squad[0].x=500;f.ai.setOrder('REGROUP');f.enemies.length=0;f.tick(16);assert(!f.squad[3].stabilised,'Regroup cancels aid');
f=fixture();f.squad[1].checkpointCover=true;f.ai.setOrder('HOLD');f.tick(1);assert(f.squad[1].checkpointCover,'HOLD may retain nearby prepared cover');f.ai.setOrder('FOLLOW');assert(!f.squad[1].checkpointCover);f.ai.setOrder('HOLD');f.squad[0].x=450;f.tick(240);assert(f.squad.slice(1).every(u=>u.x<170));f.enemies.push({id:9,x:180,y:210,alive:true,alert:true});f.tick(30);assert(f.shots.length);f.enemies.length=0;f.ai.setOrder('FOLLOW');f.tick(240);assert(f.squad.slice(1).every(u=>u.x>300));
f.ai.setOrder('HOLD');const saved=f.ai.snapshot();f.ai.setOrder('FOLLOW');f.ai.switchTo(2);f.ai.restore(saved);assert.deepEqual(f.ai.snapshot(),saved);f.ai.reset();assert.equal(f.ai.order,'FOLLOW');assert(f.squad.every(u=>u.companionState===null||u.companionState===undefined));
f=fixture();C.configure('host');f.ai.update(.3);assert(!f.ai.isCompanion(f.squad[0])&&!f.ai.isCompanion(f.squad[2]));assert(f.ai.isCompanion(f.squad[1]));const position={x:f.squad[1].x,y:f.squad[1].y,hp:f.squad[1].hp};assert(f.ai.switchTo(1,1));assert.deepEqual({x:f.squad[1].x,y:f.squad[1].y,hp:f.squad[1].hp},position);assert(!f.ai.isCompanion(f.squad[1]));f.ai.update(.3);assert.equal(f.squad[1].path,null);C.release(1);assert(f.ai.isCompanion(f.squad[1]));
assert(C.claim(1,1));assert(C.claim(2,2));assert(C.claim(3,3));assert(f.squad.every(u=>!f.ai.isCompanion(u)),'Four ownership slots support four human claims');assert(!C.claim(0,1));C.configure('client');const before=JSON.stringify(f.squad);f.ai.update(1);assert.equal(JSON.stringify(f.squad),before,'Client must not simulate AI');
function replay(){const f=fixture();f.squad[0].x=420;f.tick(240);return f.squad.map(u=>[u.x,u.y,u.companionState,u.path])}assert.deepEqual(replay(),replay());
assert(html.includes("if(key==='Tab'.toLowerCase())"));assert(html.includes('companions?.snapshot()'));assert(html.includes('companions?.restore(state.companion)'));
console.log('PASS: active-only input, switching/down/death, follow/spacing/nav/settling/cover exit, cover/combat/restrictions, aid/carry, orders, 1–4 ownership/transfer/disconnect, lifecycle and deterministic replay.');

const P=require('../multiplayer-protocol');const unitState={squad:Array.from({length:4},()=>({alive:true,x:100,y:100,dir:0,state:'idle'})),enemies:[],civilians:[],pickups:[],bullets:[],thrown:[],effects:[],missionStage:0,phaseHoldTime:0,squadGrenades:0,finished:false,win:false,checkpoint:null,stats:Array.from({length:4},(_,index)=>({index,name:'Unit',kills:0,assists:0,alive:true})),companion:{version:1,active:[0,2,null,null],order:'HOLD',hold:{x:100,y:100}}};const packet=P.snapshot(unitState,1);assert.deepEqual(P.readSnapshot(packet).companion,unitState.companion);assert(!P.readSnapshot({...packet,companion:{...unitState.companion,active:[0,0,null,null]}}));assert(!P.readSnapshot({...packet,companion:{...unitState.companion,hold:{x:NaN,y:0}}}));
