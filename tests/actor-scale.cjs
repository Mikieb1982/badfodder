'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const Scale=require('../actor-scale'),Navigation=require('../navigation'),Cable=require('../cable-street-runtime'),Interactions=require('../cable-street-interactions'),Crowd=require('../cable-street-crowd'),Historical=require('../historical-missions');
assert.equal(Scale.size,.6825);assert.equal(Scale.speed,.455);
// Real canvas transforms halve bodies about their feet without moving world coordinates or portraits.
let matrix=[1,0,0,1,0,0],stack=[],rendered=[];
const ctx={save(){stack.push([...matrix])},restore(){matrix=stack.pop()},translate(x,y){matrix[4]+=matrix[0]*x;matrix[5]+=matrix[3]*y},scale(x,y){matrix[0]*=x;matrix[3]*=y}};
const art={drawActor(g,u,team){rendered.push({team,x:matrix[0]*u.x+matrix[4],y:matrix[3]*u.y+matrix[5],width:40*matrix[0],height:50*matrix[3]});return true},missionPortrait:()=>({width:144,height:144})},portrait=art.missionPortrait;
Scale.installArt(art);Scale.installArt(art);
for(const team of ['squad','enemy','civilian','resistance'])assert(art.drawActor(ctx,{x:180,y:240},team));
assert(rendered.every(r=>Math.abs(r.width-27.3)<1e-8&&Math.abs(r.height-34.125)<1e-8&&r.x===180&&r.y===240));assert.deepEqual(matrix,[1,0,0,1,0,0]);assert.equal(art.missionPortrait,portrait);
function navFixture(){const nav=Navigation.create({worldWidth:600,worldHeight:600,buildings:[],moveEntity:(u,x,y)=>{u.x+=x;u.y+=y},updateFacing(){}});Scale.installNavigation(nav);Scale.installNavigation(nav);return nav}
const nav=navFixture(),unit={x:100,y:100};nav.assignPath(unit,400,100);nav.followPath(unit,100,.1);assert.equal(unit.x,104.55);
// Waypoint arrival uses the reduced speed as well, so no last-step teleport or overshoot.
Object.assign(unit,{x:100,y:100,path:[{x:108,y:100}],pathIndex:0,navDestination:null});assert(nav.followPath(unit,100,.1));assert.equal(unit.x,104.55);nav.followPath(unit,100,.1);assert.equal(unit.x,108);assert.equal(unit.path,null);
// Cable Street police and assisted residents use their existing movement/controller clock.
const mission=Historical.missions.find(m=>m.id==='cable-street-1936');
function police(factor){const controller=Cable.createController({mission}),layer=Interactions.create({controller,runtime:Cable,mission,options:{movementScale:factor}});layer.initialize({actors:[],mapData:{historicalObjects:{formations:[{id:'p',x:100,y:100,targetX:500,targetY:100,speed:40,width:20}]}}});return{controller,layer}}
const normal=police(1),slow=police(Scale.speed);normal.layer.fixedUpdate(.1);slow.layer.fixedUpdate(.1);const a=[...normal.controller.state.formations.values()][0],b=[...slow.controller.state.formations.values()][0];assert(a&&b);assert(Math.abs((b.x-100)/(a.x-100)-Scale.speed)<1e-8);
function mounted(factor){const controller=Cable.createController({mission}),layer=Interactions.create({controller,runtime:Cable,mission:{...mission,fastAction:false},options:{movementScale:factor,mountedChargeFirstDelay:0,mountedChargeDuration:2}});controller.attachNavigation(navFixture());layer.initialize({actors:[],mapData:{historicalObjects:{barricades:[{id:'B',x:600,y:100,maxIntegrity:100,integrity:100,points:[[590,90],[610,90],[610,110],[590,110]]}],formations:[{id:'p',objective:'B',x:100,y:100,targetX:600,targetY:100,speed:40,width:20}]}}});controller.state.phaseIndex=1;controller.state.pressureStarted=true;layer.fixedUpdate(.1);layer.fixedUpdate(.1);return layer.renderState().conflict.charges[0]}
const mountedNormal=mounted(1),mountedSlow=mounted(Scale.speed);assert(mountedNormal&&mountedSlow);assert(Math.abs(mountedSlow.t/mountedNormal.t-Scale.speed)<1e-8);
function crowd(factor){const controller=Cable.createController({mission});controller.initialize({barricades:[],actors:[]});return Crowd.create({mission,controller,worldWidth:1200,worldHeight:1200,seed:'scale',options:{movementScale:factor}})}
const crowdA=crowd(1),crowdB=crowd(Scale.speed);for(const c of [crowdA,crowdB]){c.people.splice(1);c.people[0].x+=200}const before=crowdA.people.map(p=>({x:p.x,y:p.y}));crowdA.fixedUpdate(.1);crowdB.fixedUpdate(.1);let moved=0;crowdA.people.forEach((p,i)=>{const d=Math.hypot(p.x-before[i].x,p.y-before[i].y),q=crowdB.people[i];if(d>.1){assert(Math.abs(Math.hypot(q.x-before[i].x,q.y-before[i].y)/d-Scale.speed)<1e-6);moved++}});assert(moved);
const source=fs.readFileSync(require.resolve('../index.html'),'utf8');assert(source.indexOf('src="actor-scale.js"')<source.indexOf('src="checkpoint-fortification.js"'),'Prepared positions must remain world-sized');assert(source.includes('BadFodderActorScale.installNavigation(navigation)'));assert(source.includes('(missionController?245:205)*ACTOR_SPEED*smoothIntensity'));assert(source.includes('speed=205*ACTOR_SPEED*v*v*(3-2*v)'));assert(source.includes('moveEntity(c,dx*ACTOR_SPEED,dy*ACTOR_SPEED,r)'));
for(const script of source.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g))if(script[1].trim())new vm.Script(script[1]);
console.log('PASS: scaled actors and reduced movement, stable feet/portraits/cover, paths and arrival, Cable Street police/crowds, mouse/touch/co-op wiring and parsed inline runtime.');
