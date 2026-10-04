'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(require('node:path').join(__dirname,'../garrison-control.js'),'utf8');
const soldier={x:100,y:100,alive:true,path:[1],pendingPath:{},pathIndex:1,target:{},hp:8};
const enemy={x:150,y:100,alive:true,hp:2};
const listeners={};
const scope={
  window:null,globalThis:null,
  actionAllowed:()=>true,
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
assert.equal(scope.BadFodderGarrison.selectedOne(),soldier,'Garrison did not capture live squad state');
assert.equal(scope.BadFodderGarrison.toggleGarrison(),true,'Garrison did not activate');
assert.equal(soldier.manualGarrison,true);
soldier.x=130;soldier.y=125;commander.maintain(1);
assert.equal(soldier.x,100,'Garrison soldier moved from anchor');
assert.equal(soldier.y,100,'Garrison soldier moved from anchor');
assert.equal(soldier.path,null);assert.equal(soldier.target,null);
assert.equal(soldier.garrisonTarget,enemy,'Garrison did not acquire nearby enemy');
assert.equal(enemy.hp,1,'Garrison fallback shot did not damage nearby enemy');
assert(soldier.garrisonTracerFrames>0,'Garrison firing has no visible tracer state');
assert.equal(scope.BadFodderGarrison.releaseForMovement(),true,'Movement order did not release garrison');
assert.equal(soldier.manualGarrison,false,'Soldier remained garrisoned after movement order');
assert.equal(soldier.garrisonAnchorX,null);assert.equal(soldier.garrisonTarget,null);
commander.maintain(2);
assert.equal(enemy.hp,1,'Released soldier kept auto-firing');
assert.equal(scope.BadFodderGarrison.toggleGarrison(),true,'Garrison could not be re-entered');
assert.equal(scope.BadFodderGarrison.toggleGarrison(),false,'Second H/button press did not still release garrison');
assert(source.includes("KEY='h'"),'Desktop H garrison key missing');
assert(source.includes("id='touchGarrison'")&&source.includes("querySelector('.touch-actions')"),'Mobile gameplay garrison button missing');
assert(source.includes("btn.textContent=active?'RELEASE':'GARRISON'"),'Mobile control does not visibly switch to RELEASE');
assert(source.includes("target?.id==='game'")&&source.includes("target?.id==='touchJoystick'"),'Desktop/mobile movement release hook missing');
assert(!source.includes("querySelector('.hud-tools')"),'Garrison should not live with map/pause HUD tools');
console.log('PASS: garrison holds and fires, then automatically releases on desktop/mobile movement orders.');
