'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(require.resolve('../index.html'),'utf8');
const group={squad:Array.from({length:4},(_,i)=>({x:i*10,y:0,alive:true})),commands:null,selection:'all',squadFormation:{active:true,manualMoving:false,destination:{x:300,y:300},members:[]},
 selectAllBtn:{classList:{toggle(){}}},hudAll:{classList:{toggle(){}},setAttribute(){}},unitButtons:[],updateRoster(){},assignPath(unit,x,y){unit.path=[{x,y}];unit.target={x,y};return true}};
group.groupMovement=require('../group-movement').create({navigation:{NAV_RADIUS:6,obstacleAt:()=>false,routeClear:()=>true,assignPath:group.assignPath}});group.groupMovementProfile=require('../group-movement').defaults;
group.squadFormation.members=[...group.squad];vm.createContext(group);
for(const [start,end] of [
 ['  function selectionIds(','  function selectedHistoricalActor('],
 ['  function setSelection(','  function updateRoster('],
 ['  function clearSquadFormation(','  function promoteFormationLeader(']
])vm.runInContext(source.slice(source.indexOf(start),source.indexOf(end)),group);
group.setSelection([0,1]);assert(group.squad.every(u=>u.path?.length),'Changing selection discarded formation orders');
const otherPaths=group.squad.slice(2).map(u=>JSON.stringify(u.path));
group.setSelection([2,3]);assert.deepEqual(group.squad.slice(2).map(u=>JSON.stringify(u.path)),otherPaths,'Group switching cancelled independent movement');
group.toggleSelection(3);assert.deepEqual(Array.from(group.selectionIds()),[2]);
group.toggleSelection(0);assert.deepEqual(Array.from(group.selectionIds()),[0,2]);
group.squad[0].alive=false;assert.deepEqual(Array.from(group.selectionIds()),[2]);
group.commands={owns:i=>i>=2,mode:'host',units:(units,ids)=>units.filter((u,i)=>u.alive&&i>=2&&(ids==='all'||ids.includes(i)))};
group.setSelection([0,1]);assert.deepEqual(Array.from(group.selectionIds()),[2],'Foreign units must not replace a valid co-op selection');
group.setSelection('all');assert.deepEqual(Array.from(group.selectionIds()),[2,3]);

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
console.log('PASS: independent squad orders, multi-selection, death/ownership filtering, controller subgroups, unavailable-unit skipping, regroup/garrison and input reset.');
