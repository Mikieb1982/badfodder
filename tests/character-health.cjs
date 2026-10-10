'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../character-health.js'),'utf8');
let clock=0;
const scope={window:null,globalThis:null,performance:{now:()=>clock*1000},Date,Math,Set,WeakMap,setTimeout,clearTimeout,setInterval,clearInterval,console};
scope.window=scope;scope.globalThis=scope;
const squad=[
 {name:'One',x:0,y:0,hp:4,maxHp:4,alive:true,state:'idle'},
 {name:'Two',x:30,y:0,hp:4,maxHp:4,alive:true,state:'idle'}
];
scope.selectedUnits=()=>[squad[1]];
scope.applyDamage=(target,amount)=>{if(!target.alive)return;target.hp-=amount;if(target.hp<=0){target.alive=false;target.state='dead';target.deadTimer=0}};
scope.moveEntity=(entity,dx,dy)=>{entity.x+=dx;entity.y+=dy};
vm.createContext(scope);vm.runInContext(source,scope);
const health=scope.BadFodderHealth;assert(health,'Character health module missing');
const Adaptive={createCommander(){return{maintain(){return true}}}};
scope.BadFodderAdaptive=Adaptive;
const commander=Adaptive.createCommander({getSquad:()=>squad});
assert(Adaptive.__characterHealthPatched,'Health runtime did not capture the squad');
assert.equal(health.patchDamage(),true,'Damage function was not wrapped');
assert.equal(health.patchMovement(),true,'Movement function was not wrapped');
assert.equal(health.stateFor(squad[0]),'FIT');
scope.applyDamage(squad[0],3,0,0);
assert.equal(squad[0].alive,true);assert.equal(squad[0].healthState,'BADLY_WOUNDED');
scope.applyDamage(squad[0],2,0,0);
assert.equal(squad[0].alive,true,'Lethal playable-character hit bypassed DOWN state');
assert.equal(squad[0].downed,true);assert.equal(squad[0].healthState,'DOWN');assert.equal(squad[0].hp,0);
assert.equal(health.contextualLabel(),'STABILISE');assert.equal(health.contextualAction(),true);assert.equal(squad[0].stabilised,true);
assert.equal(health.contextualLabel(),'CARRY');assert.equal(health.contextualAction(),true);assert.equal(squad[1].carryingUnit,squad[0]);assert.equal(squad[0].carriedBy,squad[1]);
const before=squad[1].x;scope.moveEntity(squad[1],10,0);assert(Math.abs(squad[1].x-before-10*health.CARRY_SPEED)<1e-9,'Carrying did not slow movement');
commander.maintain(1);assert.equal(squad[0].x,squad[1].x-10);assert.equal(squad[0].y,squad[1].y+9);
assert.equal(health.contextualLabel(),'DROP');assert.equal(health.contextualAction(),true);assert.equal(squad[1].carryingUnit,null);assert.equal(squad[0].carriedBy,null);
health.finalise(squad[0]);assert.equal(squad[0].alive,false);assert.equal(squad[0].healthState,'DEAD');

const timer={name:'Three',x:0,y:0,hp:2,maxHp:2,alive:true};squad.push(timer);health.down(timer,2);clock=1;commander.maintain(1);assert.equal(timer.alive,true);clock=3;commander.maintain(3);assert.equal(timer.alive,false,'Unstabilised downed character did not bleed out');assert.equal(timer.healthState,'DEAD');
assert.deepEqual(Array.from(health.STATES),['FIT','WOUNDED','BADLY_WOUNDED','DOWN','DEAD']);
assert(source.includes("event.key||'').toLowerCase()!=='e'")&&source.includes("button.id='touchAid'"),'Contextual keyboard/mobile casualty controls missing');
console.log('PASS: wound states, downed rescue window, stabilise, carry/drop, carry slowdown and bleed-out.');
const live=Array.from({length:4},(_,i)=>({x:i*10,y:0,hp:8,maxHp:8,alive:true,state:'idle',dir:0}));
const damage=(unit,amount)=>{unit.hp-=amount;if(unit.hp<=0)unit.alive=false};
health.bindRuntime({getSquad:()=>live,getSelected:()=>[live[1]],damage});
health.handleDamage(live[0],10,0,0);assert(live[0].downed);assert.equal(health.movementScale(live[0]),0);
const rescueTime=health.remaining(live[0]);clock+=60;assert.equal(health.remaining(live[0]),rescueTime,'Wall clock and paused tabs must not consume the rescue window');
health.fixedUpdate(1);assert.equal(health.remaining(live[0]),rescueTime-1);
assert(health.contextualAction());assert(health.contextualAction());assert.equal(health.movementScale(live[1]),health.CARRY_SPEED);
const rows=health.snapshot();assert.equal(rows[0][4],1);assert.equal(rows[1][5],0);
const copy=live.map(u=>({...u,carriedBy:null,carryingUnit:null}));health.bindRuntime({getSquad:()=>copy,getSelected:()=>[copy[1]],damage});health.receive(rows);
assert.equal(copy[0].carriedBy,copy[1]);assert.equal(copy[1].carryingUnit,copy[0]);
copy[1].damageGrace=0;health.handleDamage(copy[1],10,0,0);assert(copy[1].downed);assert.equal(copy[0].carriedBy,null,'An incapacitated carrier must drop their casualty');
health.down(copy[2],2);health.fixedUpdate(3);assert.equal(copy[2].alive,false,'Simulation timer must finalise unstabilised casualties');
console.log('PASS: explicit live binding, paused rescue timers, incapacitation, carrying replication and simulation-owned bleed-out.');

assert.equal(health.handleContextInput(),false,'No casualty context leaves interaction to the mission');
