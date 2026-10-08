'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const Group=require('../group-movement'),Navigation=require('../navigation');
function rect(id,x0,y0,x1,y1){return{id,solid:true,minX:x0,minY:y0,maxX:x1,maxY:y1,points:[[x0,y0],[x1,y0],[x1,y1],[x0,y1]]}}
function fixture(buildings=[]){
 let nav;
 const moveEntity=(u,dx,dy,r)=>{if(!nav.obstacleAt(u.x+dx,u.y,r))u.x+=dx;if(!nav.obstacleAt(u.x,u.y+dy,r))u.y+=dy};
 nav=Navigation.create({worldWidth:640,worldHeight:640,buildings,moveEntity,updateFacing:(u,dx,dy)=>{u.dir=Math.atan2(dy,dx)}});
 return{nav,group:Group.create({navigation:nav,moveEntity,worldWidth:640,worldHeight:640})};
}
const units=n=>Array.from({length:n},(_,i)=>({id:i,x:60,y:200+i*20,alive:true}));
const destination={x:400,y:200},open=fixture();
const one=units(1);assert.equal(open.group.assign(one,destination),1);assert.deepEqual(one[0].navDestination,destination);
for(const count of [2,3,4,8]){
 const squad=units(count),before=JSON.stringify(squad),a=open.group.slots(squad,destination),b=open.group.slots(squad,destination);
 assert.deepEqual(a,b);assert.equal(JSON.stringify(squad),before,'Slot planning mutates units');
 assert.equal(new Set(a.map(p=>p.x+','+p.y)).size,count);
 const points=open.group.slots(squad,destination,{},true);assert.deepEqual(points[0],destination);
 assert.equal(new Set(points.map(p=>p.x+','+p.y)).size,count);
 open.group.assign(squad,destination);const goals=squad.map(s=>s.navDestination);
 open.group.assign(squad,destination);assert.deepEqual(squad.map(s=>s.navDestination),goals);
}
const split=units(4),untouched=JSON.stringify(split.slice(2));
open.group.assign(split.slice(0,2),destination);assert.equal(JSON.stringify(split.slice(2)),untouched);
const firstOrders=JSON.stringify(split.slice(0,2));open.group.assign(split.slice(2),{x:450,y:400});assert.equal(JSON.stringify(split.slice(0,2)),firstOrders);
assert.equal(open.group.regroup(split.slice(0,2),split[0]),2);
assert.equal(open.group.regroup(split.slice(0,2),{x:300,y:300}),2);
assert.equal(open.group.regroup([]),0);

// Horizontal corridor: lateral slots compress into a column without additional A* work.
const narrow=fixture([rect('north',20,20,620,188),rect('south',20,212,620,620)]),pair=units(2);
pair[1].y=200;
const compressed=narrow.group.slots(pair,destination);
assert.equal(narrow.nav.metrics().findCalls,0);
assert(compressed.every(p=>Math.abs(p.y-200)<10));
assert.equal(new Set(compressed.map(p=>p.x+','+p.y)).size,2);
assert.equal(narrow.group.assign(pair,destination),2);
assert(narrow.nav.metrics().findCalls<=pair.length*2);
for(let step=0;step<360;step++)for(const unit of pair)narrow.group.follow(unit,185,1/60);
assert(pair.every(u=>u.x>350&&!narrow.nav.obstacleAt(u.x,u.y,narrow.nav.NAV_RADIUS)));

// All local slots blocked: retain a navigation-owned fallback destination.
const stub={NAV_RADIUS:6,PATH_CELL:20,obstacleAt:()=>true,routeClear:()=>false,nearestOpenCell:()=>null,assignPath(u,x,y){u.goal={x,y};return true}};
const fallback=Group.create({navigation:stub}),blocked=units(4);
assert.equal(fallback.assign(blocked,destination),4);assert(blocked.every(u=>u.goal.x===400&&u.goal.y===200));
let attempts=0;stub.obstacleAt=()=>false;stub.routeClear=()=>true;stub.assignPath=(u,x,y)=>{attempts++;u.goal={x,y};return x===400&&y===200};
assert.equal(fallback.assign(blocked,destination),4);assert(attempts<=8);

// Final-waypoint arrival settles without oscillation or more path searches.
const arriving=units(1);open.group.assign(arriving,{x:200,y:200});const calls=open.nav.metrics().findCalls;
let previous=Infinity;
for(let step=0;step<180;step++){
 open.group.follow(arriving[0],185,1/60);
 const distance=Math.hypot(200-arriving[0].x,200-arriving[0].y);assert(distance<=previous+1e-9);previous=distance;
}
assert(previous<=1);assert.equal(arriving[0].path,null);assert.equal(open.nav.metrics().findCalls,calls);
assert(Group.arrive(5,185,1/60)<185);assert.equal(Group.arrive(5,185,0),0);
const stacked=[{x:300,y:300,alive:true},{x:300,y:300,alive:true}];
for(let step=0;step<90;step++)open.group.separate(stacked);
assert(Math.hypot(stacked[0].x-stacked[1].x,stacked[0].y-stacked[1].y)>13.8);
const settled=JSON.stringify(stacked);for(let step=0;step<30;step++)open.group.separate(stacked);assert.equal(JSON.stringify(stacked),settled);
const wall=fixture([rect('wall',304,20,340,620)]),againstWall=[{x:297,y:300,alive:true},{x:297,y:300,alive:true}];
for(let step=0;step<90;step++)wall.group.separate(againstWall);
assert(againstWall.every(u=>u.x<304&&!wall.nav.obstacleAt(u.x,u.y,wall.nav.NAV_RADIUS)));
const pinned=[{x:300,y:300,alive:true,checkpointCover:true},{x:300,y:300,alive:true}];open.group.separate(pinned);assert.equal(pinned[0].x,300);
const carried=[{x:300,y:300,alive:true,carriedBy:{}},{x:300,y:300,alive:true}];open.group.separate(carried);assert(carried.every(u=>u.x===300));

// Dynamic geometry belongs to navigation, including re-expansion when removed.
const elastic=units(2),preferred=open.group.slots(elastic,destination);
open.nav.registerDynamicObstacle({id:'local-wall',points:[[370,205],[430,205],[430,240],[370,240]]});
const squeezed=open.group.slots(elastic,destination);assert.notDeepEqual(squeezed,preferred);
open.nav.removeDynamicObstacle('local-wall');assert.deepEqual(open.group.slots(elastic,destination),preferred);
const diagonal=units(4),heading=.8;
const stableFacing=open.group.slots(diagonal,destination,{},true,heading);
Object.assign(diagonal[0],destination);assert.deepEqual(open.group.slots(diagonal,destination,{},true,heading),stableFacing,'Arrival or obstacle invalidation swapped formation sides');

// Exercise the actual extracted command and lifecycle boundary, including co-op execute.
const html=fs.readFileSync(require.resolve('../index.html'),'utf8');
function body(name){
 const start=html.indexOf('  function '+name+'('),brace=html.indexOf('{',start);let end=brace+1,depth=1;
 for(;depth;end++){if(html[end]==='{')depth++;if(html[end]==='}')depth--}
 return html.slice(start,end);
}
const live=fixture(),squad=units(4);
const scope={badBelzigRuntime:null,coordinationSupport:null,squad,selection:[0,1],squadFormation:{active:false},groupMovement:live.group,groupMovementProfile:Group.defaults,navigation:live.nav,
 WORLD_W:640,WORLD_H:640,assignPath:live.nav.assignPath,coopCommand:()=>false,buildingRuntime:null,window:{},setStatus(){},
 selectedUnits:()=>scope.selection.map(i=>squad[i])};
vm.createContext(scope);vm.runInContext(body('clearSquadFormation')+body('setMoveTargets'),scope);
scope.setMoveTargets(destination);assert(!scope.squadFormation.active);assert(!squad[2].path&&!squad[3].path);
scope.selection=[0,1,2,3];scope.setMoveTargets(destination);assert(scope.squadFormation.active);assert.equal(scope.squadFormation.slots.length,4);
scope.clearSquadFormation(true);assert(!scope.squadFormation.active);assert.equal(scope.squadFormation.slots,null);assert(squad.every(s=>s.path?.length));
scope.setMoveTargets(destination);scope.clearSquadFormation();assert.equal(scope.squadFormation.slots,null);assert.deepEqual(Array.from(scope.squadFormation.members),[]);
const menuBrowser={window:{}};vm.runInNewContext(fs.readFileSync(require.resolve('../mission-controller.js'),'utf8'),menuBrowser);
const menu=menuBrowser.window.BadFodderMissionController.create({clearSquadFormation:scope.clearSquadFormation,
 commands:{mode:'local'},lifecycle:{transition(){}},releaseAllFireInputs(){},releaseInterruptedInput(){},menu:{show(){}},syncTouchControlState(){}});
scope.setMoveTargets(destination);menu.showTitle();assert.equal(scope.squadFormation.slots,null);assert(squad.every(s=>s.path?.length));
// Recreating the stateless helper never inherits a previous group's slots or units.
assert.deepEqual(live.group.slots(units(4),destination),fixture().group.slots(units(4),destination));
function replay(){
 const f=fixture(),team=units(4);f.group.assign(team,destination);
 for(let step=0;step<180;step++){for(const u of team)f.group.follow(u,185,1/60);f.group.separate(team)}
 return team.map(u=>({x:u.x,y:u.y,path:u.path}));
}
assert.deepEqual(replay(),replay());
assert(html.includes('squadFormation={active:false,leader:null,members:[],trail:[],destination:null,manualMoving:false};'));
assert(html.includes('units.forEach(u=>window.BadFodderGarrison?.release(u));setMoveTargets(c);return true;'));
const Commands=require('../player-commands');Commands.configure('host',()=>{throw new Error('Received command was sent again')});
scope.commands=Commands;scope.selectedUnits=()=>Commands.units(squad,scope.selection);
scope.coopCommand=(type,data)=>Commands.mode!=='local'&&!Commands.applying&&Commands.dispatch(type,scope.selectedUnits().map(u=>squad.indexOf(u)),data);
const executeStart=html.indexOf('    execute(c){'),executeEnd=html.indexOf('    stick(',executeStart);
vm.runInContext('function '+html.slice(executeStart,executeEnd).trim().replace(/,$/,''),scope);
scope.clearSquadFormation();const unselected=JSON.stringify(squad.slice(0,2));
assert(scope.execute({type:'move',units:[2,3],x:500,y:400}));assert.equal(JSON.stringify(squad.slice(0,2)),unselected);
assert(squad.slice(2).every(u=>u.navDestination));assert(!Commands.applying);Commands.configure();
assert(html.indexOf('<script src="group-movement.js">')<html.indexOf('const groupMovement='));

// Squad-size/mobile-sized budget: planning and separation have no per-frame path searches.
const crowd=units(8),start=performance.now(),before=open.nav.metrics().findCalls;
for(let i=0;i<1000;i++)open.group.slots(crowd,destination);
for(let i=0;i<600;i++)open.group.separate(crowd);
const elapsed=performance.now()-start;assert.equal(open.nav.metrics().findCalls,before);
assert(elapsed<2000,'Small-squad coordination exceeded its generous regression budget');
console.log('PASS: stable 1–8 unit slots, independent splits, compression/fallback, regroup, arrival, collision-safe separation, lifecycle and deterministic repeats; 1,000 plans + 600 spacing steps '+elapsed.toFixed(1)+' ms, zero A* calls.');
