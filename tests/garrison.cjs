'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(require('node:path').join(__dirname,'../garrison-control.js'),'utf8');
const soldier={x:100,y:100,alive:true,path:[1],pendingPath:{},pathIndex:1,target:{}};
const enemy={x:150,y:100,alive:true};
const shots=[];
const listeners={};
const scope={
  window:null,globalThis:null,
  selectedUnits:()=>[soldier],actionAllowed:()=>true,
  fireBullet:(owner,sx,sy,tx,ty)=>shots.push({owner,sx,sy,tx,ty}),
  addEventListener:(type,fn)=>{listeners[type]=fn},
  setTimeout,clearTimeout,setInterval,clearInterval,
  console
};
scope.window=scope;scope.globalThis=scope;
vm.createContext(scope);vm.runInContext(source,scope);
assert(scope.BadFodderGarrison,'Garrison module missing');
const baseAdaptive={createCommander(options){return{maintain(){return true}}}};
scope.BadFodderAdaptive=baseAdaptive;
assert(baseAdaptive.__manualGarrisonPatched,'Adaptive commander was not patched before commander creation');
const commander=baseAdaptive.createCommander({getSquad:()=>[soldier],getEnemies:()=>[enemy],scale:1});
assert.equal(scope.BadFodderGarrison.toggleGarrison(),true,'Garrison did not activate');
assert.equal(soldier.manualGarrison,true);
soldier.x=130;soldier.y=125;commander.maintain(1);
assert.equal(soldier.x,100,'Garrison soldier moved from anchor');
assert.equal(soldier.y,100,'Garrison soldier moved from anchor');
assert.equal(soldier.path,null);assert.equal(soldier.target,null);
assert.equal(soldier.garrisonTarget,enemy,'Garrison did not acquire nearby enemy');
assert.equal(shots.length,1,'Garrison did not auto-fire');
assert.equal(shots[0].owner,'squad');
assert.equal(scope.BadFodderGarrison.toggleGarrison(),false,'Garrison did not release');
assert.equal(soldier.manualGarrison,false);
assert(source.includes("const KEY='h'"),'Desktop H garrison key missing');
assert(source.includes("id='touchGarrison'")&&source.includes("querySelector('.touch-actions')"),'Mobile gameplay garrison button missing');
assert(!source.includes("querySelector('.hud-tools')"),'Garrison should not live with map/pause HUD tools');
console.log('PASS: H-key/mobile garrison command anchors one soldier and auto-fires at nearby enemies.');
