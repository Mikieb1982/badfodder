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
global.BadFodderGameplayInputAdapter.reset();assert(!global.BadFodderGameplayInputAdapter.installed);
Actions.clear();delete global.document;delete global.BadFodderGarrison;delete global.BadFodderGameplayInputAdapter;
console.log('PASS: stable gameplay APIs bypass controller key synthesis through semantic bindings.');
