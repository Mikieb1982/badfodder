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
let runtimeSquad=[soldier];
const commander=baseAdaptive.createCommander({getSquad:()=>runtimeSquad,getEnemies:()=>[enemy],scale:1});
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

// Regroup preserves the directly controlled survivor, releases every living personal hold and gives the companions a regroup destination.
const wing={x:260,y:180,alive:true,hp:8,manualGarrison:true,garrisonAnchorX:260,garrisonAnchorY:180};
runtimeSquad=[soldier,wing];soldier.manualGarrison=true;soldier.garrisonAnchorX=soldier.x;soldier.garrisonAnchorY=soldier.y;
let currentSelection=[soldier],selectionCommand=null,moveCommand=null;
scope.selectedUnits=()=>currentSelection;
scope.setSelection=value=>{selectionCommand=value};
scope.setMoveTargets=point=>{moveCommand=point};
assert.equal(scope.BadFodderGarrison.regroup(),true,'Regroup command was not accepted');
assert.equal(selectionCommand,null,'Regroup must preserve the current directly controlled soldier');
assert.equal(currentSelection.length,1,'Regroup must not reintroduce multi-selection');
assert.equal(soldier.manualGarrison,false,'Regroup did not release the controlled soldier');
assert.equal(wing.manualGarrison,false,'Regroup did not release a separated squad member');
assert.equal(moveCommand.x,soldier.x,'Regroup did not use the directly controlled survivor as the anchor');
assert.equal(moveCommand.y,soldier.y,'Regroup anchor Y is incorrect');
assert.equal(moveCommand.regroup,true,'Regroup movement is not marked as a regroup order');

// POI/checkpoint garrison is a hard hold, unlike the player's manual H-garrison.
soldier.checkpointGarrison=2;soldier.checkpointCover=true;soldier.x=210;soldier.y=220;
scope.BadFodderGarrison.lockCheckpointGarrisons();
assert.equal(soldier.checkpointAnchorX,210,'POI garrison anchor X was not captured');
assert.equal(soldier.checkpointAnchorY,220,'POI garrison anchor Y was not captured');
soldier.x=245;soldier.y=260;soldier.path=[{x:300,y:300}];soldier.pendingPath={x:300,y:300};soldier.pathIndex=2;soldier.target={x:320,y:300};
scope.BadFodderGarrison.lockCheckpointGarrisons();
assert.equal(soldier.x,210,'POI garrison drifted when aiming/pathing changed X');
assert.equal(soldier.y,220,'POI garrison drifted when aiming/pathing changed Y');
assert.equal(soldier.path,null,'POI garrison retained a movement path');
assert.equal(soldier.pendingPath,null,'POI garrison retained a pending path');
assert.equal(soldier.target,null,'POI garrison retained a movement target');
soldier.checkpointCover=false;
scope.BadFodderGarrison.lockCheckpointGarrisons();
assert.equal(soldier.checkpointAnchorX,null,'POI position lock remained after defence ended');
assert.equal(soldier.checkpointAnchorY,null,'POI position lock remained after defence ended');

assert(source.includes("KEY='h',REGROUP_KEY='r'"),'Desktop H/R squad command keys missing');
assert(source.includes("id='touchGarrison'")&&source.includes("id='touchRegroup'")&&source.includes("querySelector('.touch-actions')"),'Mobile garrison/regroup buttons missing');
assert(source.includes("btn.textContent=active?'RELEASE':'GARRISON'"),'Mobile control does not visibly switch to RELEASE');
assert(source.includes("target?.id==='game'")&&source.includes("target?.id==='touchJoystick'"),'Desktop/mobile movement release hook missing');
assert(source.includes('lockCheckpointGarrisons')&&source.includes('checkpointAnchorX'),'Fixed POI garrison lock missing');
assert(!source.includes("querySelector('.hud-tools')"),'Garrison should not live with map/pause HUD tools');
console.log('PASS: active-soldier regroup releases squad personal holds while POI garrisons remain fixed during defence.');

// Live closure callbacks work without exporting engine functions on window.
delete scope.selectedUnits;delete scope.setSelection;delete scope.setMoveTargets;
let liveActive=true,held=0,shots=0,visible=true;currentSelection=[soldier];
scope.BadFodderGarrison.bindRuntime({getSquad:()=>runtimeSquad,getEnemies:()=>[enemy],getSelected:()=>currentSelection,select:value=>{selectionCommand=value},move:p=>moveCommand=p,isActive:()=>liveActive,firearmsAllowed:()=>true,prepareHold:()=>held++,canSee:()=>visible,shoot:()=>shots++});
soldier.manualGarrison=false;assert(scope.BadFodderGarrison.toggleGarrison());assert(held);
visible=false;commander.maintain(100);assert.equal(shots,0,'Walls must block garrison fire');
visible=true;commander.maintain(101);assert.equal(shots,1,'Live garrisons must use normal projectiles');
selectionCommand=null;wing.manualGarrison=true;assert(scope.BadFodderGarrison.regroup());assert.equal(selectionCommand,null);assert(!soldier.manualGarrison);assert(!wing.manualGarrison);
assert.equal(scope.BadFodderGarrison.selectedOne(),soldier,'Regroup must keep one directly controlled soldier');
liveActive=false;assert(!scope.BadFodderGarrison.regroup());assert(!scope.BadFodderGarrison.toggleGarrison(soldier));
// Unactivated Barcelona patrols cannot waste a garrison's limited ammunition.
liveActive=true;const shotsBeforeDormant=shots;enemy.alive=true;enemy.surrendered=false;enemy.missionDormant=true;enemy.hp=3;runtimeSquad=[soldier];soldier.alive=true;soldier.downed=false;soldier.manualGarrison=true;soldier.garrisonNextFire=0;commander.maintain(100);assert.equal(soldier.garrisonTarget,null);assert.equal(enemy.hp,3);assert.equal(shots,shotsBeforeDormant);enemy.missionDormant=false;
console.log('PASS: explicit live squad callbacks, normal garrison shots, line-of-sight, active selection and paused command guards.');
