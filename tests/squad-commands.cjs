'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(require.resolve('../index.html'),'utf8');
// Direct selection now has one authoritative character; group movement remains internal.
const C=require('../player-commands'),AI=require('../companion-controller');
const squad=Array.from({length:4},(_,i)=>({id:i,alive:true,x:i*20,y:100}));C.configure();
const controller=AI.create({getSquad:()=>squad,commands:C,navigation:{cancelPath(u){u.path=null}},groupMovement:{},health:{},releaseCover(){}});
assert.equal(C.units(squad,'all').length,1);controller.switchTo(2);assert.equal(C.active(),2);assert(controller.isCompanion(squad[0]));
C.configure('host');assert(!controller.switchTo(2));assert(controller.switchTo(1));assert(!controller.isCompanion(squad[1]));assert(controller.isCompanion(squad[0]));
C.configure();

let tick,ready;const keys=[];
const gp={index:0,connected:true,axes:[0,0,0,0],buttons:Array.from({length:16},()=>({pressed:false,value:0}))};
const units=[{disabled:false},{disabled:true},{disabled:false},{disabled:false}];
const doc={readyState:'loading',activeElement:null,getElementById:()=>null,querySelector:()=>null,querySelectorAll:()=>units,addEventListener:(name,fn)=>{if(name==='DOMContentLoaded')ready=fn}};
const padScope={document:doc,navigator:{getGamepads:()=>[gp]},requestAnimationFrame:fn=>{tick=fn},setTimeout(){},KeyboardEvent:class{constructor(type,data){this.type=type;Object.assign(this,data)}},Event:class{},addEventListener(){},dispatchEvent:e=>keys.push(e)};
padScope.window=padScope;vm.runInNewContext(fs.readFileSync(require.resolve('../controller-support.js'),'utf8'),padScope);ready();
function press(...indices){for(const b of gp.buttons)b.pressed=false;tick();for(const index of indices)gp.buttons[index].pressed=true;tick();}
press(15);assert.equal(keys.at(-2).key,'3','Controller must skip unavailable units');assert.equal(keys.at(-2).shiftKey,false);
press(4,15);assert.equal(keys.at(-2).key,'4');assert.equal(keys.at(-2).shiftKey,true,'LB must modify selection rather than replace it');
press(12);assert.equal(keys.at(-2).key,'a');press(13);assert.equal(keys.at(-2).key,'r');press(3);assert.equal(keys.at(-2).key,'h');
press(7);assert.equal(keys.at(-1).key,'f');assert.equal(keys.at(-1).type,'keydown');
padScope.BadFodderController.reset();assert.equal(keys.at(-1).type,'keyup','Disconnect/reset must release controller fire');
console.log('PASS: single-character selection, ownership filtering, controller switching, unavailable-unit skipping, regroup/garrison and input reset.');
