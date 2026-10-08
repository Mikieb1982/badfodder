'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),vm=require('node:vm');
const Network=require('../wigan-network.js'),Objectives=require('../mission-objectives.js'),Protocol=require('../multiplayer-protocol.js');
const root=path.join(__dirname,'..');
const map=new Function(fs.readFileSync(path.join(root,'wigan-map.js'),'utf8')+';return WIGAN_MAP;')();
const campaignScope={window:{BadFodderHistoricalMissions:require('../historical-missions')},localStorage:{getItem:()=>null,setItem(){}}};
vm.runInNewContext(fs.readFileSync(path.join(root,'campaign.js'),'utf8'),campaignScope);
const mission=JSON.parse(JSON.stringify(campaignScope.window.BadFodderCampaign.missions.find(m=>m.id==='wigan')));
const objectives=Objectives.create(mission),squad=[{x:0,y:0,alive:true,downed:false}],enemies=[];
const navigation={
 obstacleAt:()=>false,cancelPath:a=>{a.path=null;a.pathIndex=0},
 assignPath(a,x,y){a.path=[{x,y}];a.pathIndex=0;return true},
 followPath(a,speed,dt){const p=a.path?.[0];if(!p)return false;const dx=p.x-a.x,dy=p.y-a.y,d=Math.hypot(dx,dy);if(d<=speed*dt||d<1){a.x=p.x;a.y=p.y;a.path=null;return false}a.x+=dx/d*speed*dt;a.y+=dy/d*speed*dt;a.dir=Math.atan2(dy,dx);return true}
};
const notices=[];
const network=Network.create({map,objectives,getSquad:()=>squad,getEnemies:()=>enemies,navigation,scale:2,status:t=>notices.push(t)});
assert.equal(network.snapshot().active.length,0,'Network actors should not exist before contact is made');
objectives.facts.set('tudor_group','CONNECTED');objectives.facts.set('bus_group','CONTACTED');
network.update(.1);
let state=network.snapshot();
assert.equal(state.volunteers.tudor,2);assert.equal(state.volunteers.busStation,3);assert.equal(state.runners,1,'A runner should link Tudor House and the Bus Station');
const bus=network.point('busStation');squad[0].x=bus.x;squad[0].y=bus.y;network.update(.1);
assert.equal(objectives.facts.get('bus_group'),'MUSTERED','Cleared Bus Station contact should become a visible muster');assert.equal(notices.length,1);
const labels=[];const ctx=new Proxy({fillText:t=>labels.push(t),save(){},restore(){},setLineDash(){},beginPath(){},arc(){},stroke(){},fillRect(){},strokeRect(){},moveTo(){},lineTo(){}},{get:(o,k)=>k in o?o[k]:null,set:(o,k,v)=>(o[k]=v,true)});
network.drawWorld(ctx);assert(labels.some(t=>/BUS GROUP READY/.test(t)),'Bus Station encounter needs an in-world state label');
objectives.facts.set('market_group','CONNECTED');objectives.facts.set('bus_group','CONNECTED');
const start=network.actors.find(a=>a.id==='wigan-runner-a').x;
for(let i=0;i<80;i++)network.update(.1);
state=network.snapshot();assert(state.civilians>=2,'Reopened Market Place should create civilian foot traffic');assert.notEqual(network.actors.find(a=>a.id==='wigan-runner-a').x,start,'Runner should visibly travel between connected groups');
objectives.facts.set('grand_arcade_status','HELD');objectives.facts.set('king_group','CONNECTED');objectives.facts.set('railway_group','CONTACTED');objectives.facts.set('network_status','RESTORED');network.update(.1);
state=network.snapshot();assert.equal(state.volunteers.kingStreet,2);assert.equal(state.volunteers.wallgate,2);assert.equal(state.runners,2);assert.equal(state.civilians,4,'Restored station route should carry civilian traffic as well as runners');
assert(network.actors.every(a=>a.civilianState==='EVACUATED'&&a.storyVisible),'Visual network actors must remain outside rescue/combat civilian rules');

// Browser integration: visual actors share the normal renderer but stay out of rescue counts, save rows and co-op actor packets.
const residents=[{x:0,y:0,homeX:0,homeY:0,phase:0,speed:30,alive:true,civilianState:'CALM',dir:0,state:'idle'}];
const fakeCivilianRuntime={
 create(options){return{update(){},snapshot:()=>options.getCivilians().map(c=>[c.civilianState,null,null]),receive(){},add(c){options.getCivilians().push(c);return c},counts:()=>({total:options.getCivilians().length})}}
};
let draws=0;
const browser={window:{BadFodderCivilians:fakeCivilianRuntime,BadFodderArt:{drawActor(){draws++}},BadFodderMissionObjectives:objectives,BadFodderCoopProtocol:{...Protocol}},globalThis:null,console};browser.globalThis=browser.window;
vm.createContext(browser);
vm.runInContext(fs.readFileSync(path.join(root,'wigan-map.js'),'utf8')+'\n'+fs.readFileSync(path.join(root,'wigan-network.js'),'utf8'),browser);
const patched=browser.window.BadFodderCivilians.create({getCivilians:()=>residents,getSquad:()=>squad,getEnemies:()=>enemies,path:navigation.assignPath,follow:navigation.followPath,canOccupy:()=>true});
assert(residents.some(c=>c.networkActor),'Wigan module should inject visual actors into the normal render list');assert.equal(patched.counts().total,1,'Visual actors must not inflate rescue counts');assert.equal(patched.snapshot().length,1,'Visual actors must not enter civilian save rows');
patched.update(.1);const visual=residents.find(c=>c.networkActor&&c.active);browser.window.BadFodderArt.drawActor(ctx,visual,'civilian');assert(draws>0,'Active network actors should use the normal character renderer');
const coopSquad=Array.from({length:4},(_,i)=>({x:i,y:i,hp:8,maxHp:8,alive:true,dir:0,state:'idle'}));
const packet=browser.window.BadFodderCoopProtocol.snapshot({squad:coopSquad,enemies:[],civilians:residents,pickups:[],bullets:[],thrown:[],effects:[],missionStage:0,phaseHoldTime:0,squadGrenades:5,finished:false,win:false,checkpoint:null,civilianState:patched.snapshot(),stats:coopSquad.map((_,i)=>({index:i,name:'Local',kills:0,assists:0,alive:true}))},1);
assert.equal(packet.c.length,1,'Cosmetic Wigan actors must stay out of co-op actor packets');assert.equal(packet.civilianState.length,1);assert(Protocol.readSnapshot(packet),'Filtered Wigan co-op packet must remain protocol-valid');
assert(fs.readFileSync(path.join(root,'mission-registry.js'),'utf8').includes('wigan-network.js?v=20261008-network-1'),'Wigan network module is not registered for the browser runtime');
console.log('PASS: Wigan runners, volunteers, reopened civilian routes, Bus Station muster, normal rendering and cosmetic-only co-op integration.');
