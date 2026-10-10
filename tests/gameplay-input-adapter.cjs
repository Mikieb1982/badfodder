'use strict';
const assert=require('node:assert/strict');
const path=require('node:path');
const Actions=require('../input-actions.js');

Actions.clear();
const clicks=[];const nodes={
 hudAll:{hidden:false,disabled:false,click:()=>clicks.push('all')},
 touchMap:{hidden:false,disabled:false,click:()=>clicks.push('map')},
 touchPause:{hidden:false,disabled:false,click:()=>clicks.push('pause')},
 companionFOLLOW:{hidden:false,disabled:false,click:()=>clicks.push('follow')},
 companionHOLD:{hidden:false,disabled:false,click:()=>clicks.push('hold')}
};
global.document={getElementById:id=>nodes[id]||null};
global.BadFodderInputActions=Actions;
const garrison=[];global.BadFodderGarrison={toggleGarrison:()=>garrison.push('garrison'),regroup:()=>garrison.push('regroup')};
delete require.cache[require.resolve('../gameplay-input-adapter.js')];require('../gameplay-input-adapter.js');
assert(global.BadFodderGameplayInputAdapter.installed);
for(const action of ['GARRISON','REGROUP','FOLLOW','HOLD','SELECT_ALL','MAP','PAUSE'])assert.equal(Actions.dispatch(action,'press',{source:'controller'}),true,action+' should have a direct binding');
assert.deepEqual(garrison,['garrison','regroup']);
assert.deepEqual(clicks,['follow','hold','all','map','pause']);

const gameplayCalls=[];
global.BadFodderInput={gameplay:{}};
for(const method of ['primary','aim','interact','cycle','select'])global.BadFodderInput.gameplay[method]=function(event){assert.equal(this,global.BadFodderInput.gameplay);gameplayCalls.push([method,event.phase,event.multi,event.delta]);return true};
for(const action of ['PRIMARY_ACTION','AIM_VECTOR','INTERACT','SELECT_PREVIOUS','SELECT_NEXT','SELECT_INDEX'])assert.equal(Actions.dispatch(action,'press',{source:'controller',multi:true}),true);
assert.equal(Actions.dispatch('PRIMARY_ACTION','release',{source:'controller'}),true);
assert.deepEqual(gameplayCalls.map(x=>x[0]),['primary','aim','interact','cycle','cycle','select','primary']);
assert.deepEqual(gameplayCalls.filter(x=>x[0]==='cycle').map(x=>[x[2],x[3]]),[[true,-1],[true,1]]);
delete global.BadFodderInput;
for(const action of ['PRIMARY_ACTION','AIM_VECTOR','INTERACT','SELECT_PREVIOUS','SELECT_NEXT','SELECT_INDEX'])assert.equal(Actions.dispatch(action),false,'Missing runtime API must allow compatibility fallback');
global.BadFodderGameplayInputAdapter.reset();assert(!global.BadFodderGameplayInputAdapter.installed);
Actions.clear();delete global.document;delete global.BadFodderGarrison;delete global.BadFodderGameplayInputAdapter;
console.log('PASS: stable gameplay APIs bypass controller key synthesis through semantic bindings.');

// Evaluate the small extracted ownership block with the same gameplay API boundaries.
const fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const block=html.slice(html.indexOf('  function primaryGameplayInput(event)'),html.indexOf('  root.tabIndex=0;'));
const calls=[];
const runtime={BadFodderInput:{},keyboardFireHeld:false,menuOpen:false,missionInteractionLayer:null,civilianRuntime:{},buildingRuntime:null,cursorWorld:{x:12,y:13},squad:[{},{},{},{}],actionAllowed:()=>true,refreshCursorWorld:()=>calls.push('refresh'),squadFireAt:(x,y)=>calls.push(['fire',x,y]),performStreetAttack:type=>calls.push(type),performHistoricalNearestAction:()=>calls.push('historical'),performCivilianAction:()=>calls.push('civilian'),rememberCanvasPointer:p=>calls.push(p),canvas:{getBoundingClientRect:()=>({left:10,top:20,width:100,height:80})},document:{querySelectorAll:()=>[{disabled:false},{disabled:true},{disabled:false},{disabled:false}]},setSelection:i=>calls.push(['select',i]),toggleSelection:i=>calls.push(['multi',i])};
runtime.window=runtime;
vm.runInNewContext(block,runtime);
const api=runtime.BadFodderInput.gameplay;
api.primary({phase:'press'});assert(runtime.keyboardFireHeld);api.primary({phase:'release'});assert(!runtime.keyboardFireHeld);assert.deepEqual(calls.splice(0),['refresh',['fire',12,13]]);
api.interact({});assert.deepEqual(calls.splice(0),['civilian']);runtime.missionInteractionLayer={};api.primary({phase:'press'});api.interact({});assert.deepEqual(calls.splice(0),['shove','historical']);assert(!runtime.keyboardFireHeld);
api.aim({value:{x:.5,y:-.25}});assert.equal(calls[0].clientX,76.8);assert.equal(calls[0].clientY,51.6);calls.length=0;
api.cycle({delta:1,multi:true});assert.deepEqual(calls.splice(0),[['multi',2]],'Skip disabled roster entries and preserve modifier');
api.select({index:0,multi:false});assert.deepEqual(calls.splice(0),[['select',0]],'Delegate ownership checks to existing selection handler');
console.log('PASS: extracted primary/context/aim/selection gameplay ownership.');

runtime.BadFodderHealth={handleContextInput:()=>{calls.push('casualty');return true}};
api.interact({});assert.deepEqual(calls.splice(0),['casualty'],'Casualty input must retain keyboard capture priority');
console.log('PASS: semantic contextual input retains casualty priority.');
