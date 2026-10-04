'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../mission-stats.js'),'utf8');
const squad=[
  {name:'One',x:0,y:0,alive:true,fireTimer:.1,dir:0},
  {name:'Two',x:100,y:0,alive:true,fireTimer:0,dir:Math.PI},
  {name:'Three',x:0,y:100,alive:true,fireTimer:0,dir:0},
  {name:'Four',x:100,y:100,alive:true,fireTimer:0,dir:0}
];
const enemies=[{x:40,y:0,alive:true,hp:1}];
const scope={window:null,globalThis:null,setTimeout,clearTimeout,WeakMap,WeakSet,Math,console};
scope.window=scope;scope.globalThis=scope;
vm.createContext(scope);vm.runInContext(source,scope);
assert(scope.BadFodderMissionStats,'Mission stats module missing');
const Adaptive={createCommander(options){return{maintain(){return true}}}};
scope.BadFodderAdaptive=Adaptive;
const commander=Adaptive.createCommander({getSquad:()=>squad,getEnemies:()=>enemies});
assert(Adaptive.__missionStatsPatched,'Adaptive commander not patched');
enemies[0].alive=false;commander.maintain(1);
let stats=scope.BadFodderMissionStats.snapshot();
assert.equal(stats.length,4,'Squad report is not four-person');
assert.equal(stats[0].kills,1,'Likely shooter did not receive kill credit');
squad[2].alive=false;commander.maintain(2);stats=scope.BadFodderMissionStats.snapshot();
assert.equal(stats[2].alive,false,'Squad casualty not retained in report');
class Menu{showResult(identity,won,next){this.called=true;this.won=won;this.next=next}}
scope.BadFodderMenu=Menu;
assert(Menu.prototype.__missionStatsPatched,'Result menu was not patched');
let reports=0,lastIdentity=null;
scope.BadFodderMissionStats.renderResult=identity=>{reports++;lastIdentity=identity};
const failedMenu=new Menu(),identity={key:'bad-belzig'};
failedMenu.showResult(identity,false,false);
assert.equal(failedMenu.called,true,'Failure result screen did not open');
assert.equal(failedMenu.won,false,'Failure result was converted to victory');
assert.equal(reports,1,'Squad report was not rendered after mission failure');
assert.equal(lastIdentity,identity,'Failure report did not receive mission identity');
const wonMenu=new Menu();wonMenu.showResult(identity,true,true);
assert.equal(reports,2,'Squad report was not rendered after mission victory');
assert(source.includes('MAN DOWN')&&source.includes('KILLED IN ACTION'),'Casualty acknowledgement missing');
assert(source.includes('SQUAD REPORT')&&source.includes("status.textContent=r.alive?'SURVIVED':'KIA'"),'End-of-mission report missing');
console.log('PASS: casualty acknowledgement and squad report work on both victory and mission failure.');
