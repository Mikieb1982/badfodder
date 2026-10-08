'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const Support=require('../coordination-support'),Group=require('../group-movement'),Navigation=require('../navigation'),Health=require('../character-health');
const makeUnit=(id,x=200,y=200)=>({id,x,y,alive:true,hp:8,maxHp:8,dir:0});
function fixture(profile={},buildings=[]){
 let nav;const squad=[makeUnit('actor'),makeUnit('partner',220),makeUnit('other',260)];let selected=squad;
 const moveEntity=(u,dx,dy,r)=>{if(!nav.obstacleAt(u.x+dx,u.y,r))u.x+=dx;if(!nav.obstacleAt(u.x,u.y+dy,r))u.y+=dy};
 nav=Navigation.create({worldWidth:500,worldHeight:500,buildings,moveEntity,updateFacing:(u,dx,dy)=>{u.dir=Math.atan2(dy,dx)}});
 const group=Group.create({navigation:nav,moveEntity,worldWidth:500,worldHeight:500});
 const coord=Support.create({navigation:nav,groupMovement:group,movementProfile:Group.defaults,getSquad:()=>squad,getSelected:()=>selected,
  profile:{interactionCover:true,casualtySupport:true,...profile}});
 return{squad,nav,group,coord,select:units=>{selected=units}};
}
const actor=makeUnit('actor'),near=makeUnit('near',210),tie=makeUnit('tie',190),far=makeUnit('far',240),list=[actor,near,tie,far];
assert.equal(Support.findSupportPartner(actor,list,{selected:list}),near);
assert.equal(Support.findSupportPartner(actor,[actor,tie,near],{selected:list}),tie,'Ties use stable squad order');
for(const flag of [{alive:false},{downed:true},{carryingUnit:{}},{carriedBy:{}},{insideBuilding:'room'},{manualGarrison:true},{checkpointCover:true},{isFormationLeader:true},{navDestination:{x:300,y:300}},{path:[{x:300,y:300}]}]){
 const invalid={...near,...flag};assert.equal(Support.findSupportPartner(actor,[actor,invalid,far],{selected:[actor,invalid,far]}),far);
}
assert.equal(Support.findSupportPartner(actor,list,{selected:[actor]}),null);
assert.equal(Support.findSupportPartner(actor,list,{selected:[actor],allowUnselected:true}),near);
assert.equal(Support.findSupportPartner(actor,list,{selected:[actor,far],allowUnselected:true}),far,'Prefer selected allies');
assert.equal(Support.findSupportPartner(actor,list,{selected:list,supportRadius:5}),null);
assert.equal(Support.findSupportPartner(actor,list,{selected:list,isBusy:u=>u===near||u===tie}),far);
assert.equal(Support.findSupportPartner(actor,list,{selected:list,canControl:u=>u===far}),far);
assert.equal(Support.findSupportPartner(actor,list,{selected:list,canReach:()=>false}),null);
const disabled=fixture({interactionCover:false,casualtySupport:false});
assert.equal(disabled.coord.beginSupport({actor:disabled.squad[0]}),null);assert(!disabled.squad[1].navDestination);

const f=fixture(),[a,p]=f.squad;let active=true;
const session=f.coord.beginSupport({actor:a,action:'repair',target:a,threatDirection:.7,isActive:()=>active});
assert(session);assert.equal(session.partner,p);assert(f.coord.isSupporting(p));
assert(Math.hypot(session.point.x-a.x,session.point.y-a.y)>=f.nav.NAV_RADIUS*2+2);
assert(!f.nav.obstacleAt(session.point.x,session.point.y,f.nav.NAV_RADIUS));assert(p.navDestination);
for(let i=0;i<60;i++){f.coord.update(1/60);f.group.follow(p,185,1/60)}
f.coord.update(0);assert.equal(p.dir,.7);assert(!p.fireTimer,'Support never creates firing logic');
const searches=f.nav.metrics().findCalls;for(let i=0;i<60;i++)f.coord.update(1/60);assert.equal(f.nav.metrics().findCalls,searches);
active=false;f.coord.update(0);assert.equal(f.coord.size,0);assert.equal(p.navDestination,null);assert(!f.coord.isSupporting(p));
f.coord.beginSupport({actor:a,action:'repair'});assert(f.coord.endSupport(a));assert.equal(p.navDestination,null);assert(!f.coord.endSupport(a));

const wall={id:'wall',solid:true,minX:145,minY:140,maxX:188,maxY:182,points:[[145,140],[188,140],[188,182],[145,182]]};
const geometry=fixture({},[wall]),gs=geometry.coord.beginSupport({actor:geometry.squad[0],action:'repair'});assert(gs);
assert(!geometry.nav.obstacleAt(gs.point.x,gs.point.y,geometry.nav.NAV_RADIUS));
for(let i=0;i<90;i++){geometry.coord.update(1/60);geometry.group.follow(gs.partner,185,1/60);assert(!geometry.nav.obstacleAt(gs.partner.x,gs.partner.y,geometry.nav.NAV_RADIUS))}
for(const who of ['actor','partner'])for(const flag of ['downed','dead']){
 const x=fixture(),s=x.coord.beginSupport({actor:x.squad[0]});assert(s);
 if(flag==='downed')s[who].downed=true;else s[who].alive=false;
 x.coord.update(0);assert.equal(x.coord.size,0);assert.equal(s.partner.navDestination,null);
}
const unselected=fixture();unselected.select([unselected.squad[0]]);assert.equal(unselected.coord.beginSupport({actor:unselected.squad[0]}),null);
const permitted=fixture({allowUnselected:true});permitted.select([permitted.squad[0]]);assert(permitted.coord.beginSupport({actor:permitted.squad[0]}));permitted.coord.reset();
const changed=fixture();changed.coord.beginSupport({actor:changed.squad[0]});changed.select([changed.squad[0]]);changed.coord.update(0);assert.equal(changed.coord.size,0);

// Casualty actions stay in character-health; hooks add only a supporting partner.
const casualty=fixture(),[helper,buddy,down]=casualty.squad;down.x=184;down.y=195;casualty.select([helper,buddy]);
Health.bindRuntime({getSquad:()=>casualty.squad,getSelected:()=>[helper,buddy],onSupportAction:event=>casualty.coord.casualtyAction(event)});
Health.down(down);assert(Health.contextualAction());assert(down.stabilised);assert(casualty.coord.isSupporting(buddy));
casualty.coord.update(.8);assert.equal(casualty.coord.size,0);assert.equal(buddy.navDestination,null);
assert(Health.contextualAction());assert.equal(helper.carryingUnit,down);assert(casualty.coord.isSupporting(buddy));assert.equal(Health.movementScale(helper),Health.CARRY_SPEED);
const carrySearches=casualty.nav.metrics().findCalls;helper.x+=20;casualty.coord.update(.5);assert(casualty.nav.metrics().findCalls<=carrySearches+2);
const afterMove=casualty.nav.metrics().findCalls;for(let i=0;i<60;i++)casualty.coord.update(1/60);assert.equal(casualty.nav.metrics().findCalls,afterMove);
assert(Health.contextualAction());assert.equal(helper.carryingUnit,null);assert.equal(casualty.coord.size,0);assert.equal(buddy.navDestination,null);
assert(Health.contextualAction());assert(casualty.coord.size);Health.receive(Health.snapshot());assert.equal(casualty.coord.size,0,'Checkpoint restore clears temporary support');
Health.bindRuntime();

const regroup=fixture({regroupOnComplete:true}),r=regroup.coord.beginSupport({actor:regroup.squad[0],duration:.1});assert(r);
regroup.coord.update(.1);assert.equal(regroup.coord.size,0);assert(r.partner.navDestination,'Shared regroup resumes normal navigation');
regroup.group.follow(r.partner,185,1/60);
const reset=fixture(),resetSession=reset.coord.beginSupport({actor:reset.squad[0]});reset.coord.reset();assert.equal(reset.coord.size,0);assert.equal(resetSession.partner.navDestination,null);
reset.coord.beginSupport({actor:reset.squad[0]});reset.squad.splice(0);reset.coord.update(0);assert.equal(reset.coord.size,0,'Reinitialised squads cannot inherit support');

// Actual movement command hook: input wins before navigation receives the new destination.
const html=fs.readFileSync(require.resolve('../index.html'),'utf8');
function body(name){const start=html.indexOf('  function '+name+'('),brace=html.indexOf('{',start);let end=brace+1,depth=1;for(;depth;end++){if(html[end]==='{')depth++;if(html[end]==='}')depth--}return html.slice(start,end)}
const command=fixture(),commandActor=command.squad[0],commandPartner=command.squad[1];
let chosen=[commandPartner];
const scope={coordinationSupport:command.coord,squad:command.squad,squadFormation:{active:false},groupMovement:command.group,groupMovementProfile:Group.defaults,
 navigation:command.nav,assignPath:command.nav.assignPath,WORLD_W:500,WORLD_H:500,coopCommand:()=>false,buildingRuntime:null,selectedUnits:()=>chosen,window:{},setStatus(){}};
vm.createContext(scope);vm.runInContext(body('clearSquadFormation')+body('setMoveTargets'),scope);
command.coord.beginSupport({actor:commandActor});scope.setMoveTargets({x:400,y:400});assert.equal(command.coord.size,0);assert.deepEqual(commandPartner.navDestination,{x:400,y:400});
command.nav.cancelPath(commandPartner);command.coord.beginSupport({actor:commandActor});chosen=[commandActor];scope.setMoveTargets({x:350,y:350});assert.equal(command.coord.size,0);assert.equal(commandPartner.navDestination,null,'Actor-only commands do not drag the former partner');
const menuScope={window:{}};vm.runInNewContext(fs.readFileSync(require.resolve('../mission-controller.js'),'utf8'),menuScope);
const menuFixture=fixture();menuFixture.coord.beginSupport({actor:menuFixture.squad[0]});
menuScope.window.BadFodderMissionController.create({coordinationSupport:menuFixture.coord,commands:{mode:'local'},lifecycle:{transition(){}},releaseAllFireInputs(){},releaseInterruptedInput(){},menu:{show(){}},syncTouchControlState(){}}).showTitle();assert.equal(menuFixture.coord.size,0);

// Actual contextual-action hooks, both timed actions and a long-lived historical job.
const context=fixture(),ctxActor=context.squad[0];
const ctx={coordinationSupport:context.coord,started:true,menuOpen:false,paused:false,finished:false,mapOpen:false,coopCommand:()=>false,
 selectedUnits:()=>context.squad,badBelzigRuntime:null,barcelonaRuntime:null,contextAction:()=>({type:'building',label:'SEARCH',site:{door:ctxActor}}),buildingRuntime:{perform:()=>true},civilianRuntime:null,updateHud(){}};
vm.createContext(ctx);vm.runInContext(body('performCivilianAction'),ctx);assert(ctx.performCivilianAction());assert.equal(context.coord.size,1);context.coord.update(.35);assert.equal(context.coord.size,0);
ctx.buildingRuntime.perform=()=>false;assert.equal(ctx.performCivilianAction(),false);assert.equal(context.coord.size,0);
const jobFixture=fixture(),jobActor=jobFixture.squad[0],job={action:'reinforce',targetType:'barricade',targetId:'b',status:'queued'};
const history={coordinationSupport:jobFixture.coord,missionController:{state:{barricades:new Map([['b',{x:200,y:200}]]),jobs:new Map([['player-0',job]])}},clearSquadFormation(){},updateHistoricalActionButton(){}};
vm.createContext(history);vm.runInContext(body('approachHistoricalJob'),history);
assert(history.approachHistoricalJob({unit:jobActor,id:'player-0'},job));assert.equal(jobFixture.coord.size,1);
history.missionController.state.jobs.delete('player-0');jobFixture.coord.update(0);assert.equal(jobFixture.coord.size,0);

// Ownership and threat direction are bounded, opt-in inputs rather than a perception system.
const owned=fixture();let scans=0;
const ownership=Support.create({navigation:owned.nav,groupMovement:owned.group,movementProfile:Group.defaults,getSquad:()=>owned.squad,getSelected:()=>owned.squad,
 canControl:u=>u!==owned.squad[1],getHostiles:()=>{scans++;return[{x:300,y:200,alive:true,known:true}]},profile:{interactionCover:true}});
const ownedSession=ownership.beginSupport({actor:owned.squad[0]});assert.equal(ownedSession.partner,owned.squad[2]);assert.equal(ownedSession.direction,0);
for(let i=0;i<10;i++)ownership.update(.01);assert.equal(scans,1);ownership.reset();assert.equal(ownership.beginSupport({actor:owned.squad[1]}),null);
function repeat(){const x=fixture(),s=x.coord.beginSupport({actor:x.squad[0],threatDirection:.7});for(let i=0;i<40;i++){x.coord.update(1/60);x.group.follow(s.partner,185,1/60)}return{partner:s.partner.id,point:s.point,x:s.partner.x,y:s.partner.y,dir:s.partner.dir}}
assert.deepEqual(repeat(),repeat());
assert(!fs.readFileSync(require.resolve('../coordination-support'),'utf8').includes('Math.random'));
assert(html.includes('coordinationSupport?.reset();\n    coordinationSupport=window.BadFodderCoordinationSupport.create('));
assert(html.includes('receive(state,refresh=true){\n      coordinationSupport?.reset();'));
console.log('PASS: opt-in deterministic partners, safe positions, interaction and casualty hooks, completion/cancel, direct-order priority, regroup, ownership, bounded path work and lifecycle cleanup.');
