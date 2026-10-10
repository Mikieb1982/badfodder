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
for(const name of ['MOVE_VECTOR','AIM_VECTOR','PRIMARY_ACTION','SECONDARY_ACTION','INTERACT','GARRISON','FOLLOW','REGROUP','MAP','PAUSE','SELECT_PREVIOUS','SELECT_NEXT'])assert(controller.includes("semantic('"+name)||controller.includes("semanticHold('"+name),'Controller bypasses semantic action '+name);
const input=fs.readFileSync(require.resolve('../game-input.js'),'utf8');
assert(input.indexOf("load('input-actions.js'")<input.indexOf("load('controller-support.js'"),'Semantic action bus must load before controller support');
Actions.clear();
console.log('PASS: semantic gameplay actions, controller routing and compatibility fallback.');
