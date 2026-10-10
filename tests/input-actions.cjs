'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const Actions=require('../input-actions.js');

Actions.clear();
assert(Actions.valid(Actions.ACTIONS.MOVE_VECTOR));
assert(!Actions.valid('FAKE_ACTION'));
assert.equal(Actions.dispatch('FAKE_ACTION'),false);

const seen=[];
const off=Actions.register(Actions.ACTIONS.PRIMARY_ACTION,event=>{seen.push([event.action,event.phase,event.source]);return true});
assert.equal(Actions.dispatch(Actions.ACTIONS.PRIMARY_ACTION,'press',{source:'controller'}),true);
assert.equal(Actions.dispatch(Actions.ACTIONS.PRIMARY_ACTION,'release',{source:'controller'}),true);
assert.deepEqual(seen,[['PRIMARY_ACTION','press','controller'],['PRIMARY_ACTION','release','controller']]);
off();assert.equal(Actions.registered(Actions.ACTIONS.PRIMARY_ACTION).length,0);

let fallback=null;
Actions.setFallback(event=>{fallback=event;return event.action===Actions.ACTIONS.INTERACT});
assert.equal(Actions.dispatch(Actions.ACTIONS.INTERACT,'press',{source:'controller'}),true);
assert.equal(fallback.action,'INTERACT');
assert.equal(fallback.source,'controller');

const move=[];Actions.register(Actions.ACTIONS.MOVE_VECTOR,event=>{move.push(event.value);return true});
assert.equal(Actions.dispatch(Actions.ACTIONS.MOVE_VECTOR,'change',{source:'controller',value:{x:.5,y:-.25,mag:.56}}),true);
assert.deepEqual(move[0],{x:.5,y:-.25,mag:.56});

const controller=fs.readFileSync(require.resolve('../controller-support.js'),'utf8');
for(const name of ['MOVE_VECTOR','AIM_VECTOR','PRIMARY_ACTION','SECONDARY_ACTION','INTERACT','GARRISON','REGROUP','MAP','PAUSE','SELECT_PREVIOUS','SELECT_NEXT'])assert(controller.includes("semantic('"+name)||controller.includes("semanticHold('"+name),'Controller bypasses semantic action '+name);
const input=fs.readFileSync(require.resolve('../game-input.js'),'utf8');
assert(input.indexOf("load('input-actions.js'")<input.indexOf("load('controller-support.js'"),'Semantic action bus must load before controller support');
Actions.clear();
console.log('PASS: semantic gameplay actions, controller routing and compatibility fallback.');

// Exercise the existing controller loop, including its legacy fallback and menu branch.
const vm=require('node:vm');
function controllerFixture(direct){
 let loop;const events=[],actions=[],clicked=[];
 const buttons=Array.from({length:16},()=>({pressed:false,value:0}));
 const gp={index:0,connected:true,axes:[0,0,0,0],buttons};
 let menu=null;
 const option={tagName:'BUTTON',disabled:false,tabIndex:0,getClientRects:()=>[{}],closest:()=>null,focus(){document.activeElement=this},click(){clicked.push('menu')},getBoundingClientRect:()=>({left:0,top:0,width:20,height:20})};
 const document={readyState:'complete',activeElement:null,getElementById:id=>id==='menuScreen'?menu:null,querySelector:()=>null,querySelectorAll:selector=>selector==='.hud-unit'?Array.from({length:4},()=>({disabled:false})):[],addEventListener(){}};
 const context={document,navigator:{getGamepads:()=>[gp]},requestAnimationFrame:callback=>{loop=callback},setTimeout(){},performance:{now:()=>0},KeyboardEvent:class{constructor(type,detail){Object.assign(this,{type},detail)}},Event:class{},console};
 context.window=context;context.addEventListener=()=>{};context.dispatchEvent=e=>events.push([e.type,e.key,!!e.shiftKey]);
 context.BadFodderInputActions={ACTIONS:Actions.ACTIONS,dispatch(action,phase,detail){actions.push([action,phase,detail.multi]);return direct}};
 vm.runInNewContext(controller,context);
 return{gp,events,actions,clicked,tick:()=>loop(),menu(){menu={id:'menuScreen',hidden:false,getClientRects:()=>[{}],contains:el=>el===option,querySelectorAll:()=>[option]};document.activeElement=option}};
}
for(const direct of [true,false]){
 const f=controllerFixture(direct);f.gp.buttons[7].pressed=true;f.tick();f.tick();f.gp.buttons[7].pressed=false;f.tick();
 assert.deepEqual(f.actions.filter(x=>x[0]==='PRIMARY_ACTION').map(x=>x[1]),['press','release'],'Held fire must emit exactly one press/release');
 assert.deepEqual(f.events,direct?[]:[['keydown','f',false],['keyup','f',false]],'Unavailable direct handler must retain F fallback');
}
const mapping=controllerFixture(true);
for(const [button,action]of [[0,'PRIMARY_ACTION'],[1,'SECONDARY_ACTION'],[2,'INTERACT'],[3,'GARRISON'],[5,'SECONDARY_ACTION'],[8,'MAP'],[9,'PAUSE'],[12,'SELECT_ALL'],[13,'REGROUP'],[14,'SELECT_PREVIOUS'],[15,'SELECT_NEXT']]){
 mapping.gp.buttons[button].pressed=true;mapping.tick();assert(mapping.actions.some(x=>x[0]===action&&x[1]==='press'),`Button ${button} must retain ${action}`);mapping.gp.buttons[button].pressed=false;mapping.tick();mapping.actions.length=0;
}
mapping.gp.buttons[4].pressed=true;mapping.gp.buttons[15].pressed=true;mapping.tick();assert(mapping.actions.some(x=>x[0]==='SELECT_NEXT'&&x[2]===true),'LB modifier must reach selection API');
const menu=controllerFixture(true);menu.menu();menu.gp.buttons[0].pressed=true;menu.tick();assert.deepEqual(menu.clicked,['menu']);assert(!menu.actions.some(x=>x[0]==='PRIMARY_ACTION'&&x[1]==='press'),'Menu confirm must not fire');
console.log('PASS: controller mapping, held fire, fallback, multi-select modifier and menu confirm.');
