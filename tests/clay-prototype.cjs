'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
let canvases=0,previous=0;
const gradient={addColorStop(){}};
const ctx=new Proxy({createLinearGradient:()=>gradient,createRadialGradient:()=>gradient},{get:(o,k)=>k in o?o[k]:()=>{}});
const art={pose:e=>({...e.visual}),drawActor:()=>previous++,tree:()=>previous++};
class TestImage{set src(value){queueMicrotask(()=>this.onload())}}
const scope={Image:TestImage,setTimeout,clearTimeout,Promise,window:{BadFodderArt:art,BadFodderWartimeScenery:{draw:()=>previous++},location:{search:'?clay=1'}},document:{getElementById:()=>true,createElement(){canvases++;return{getContext:()=>ctx}}},URLSearchParams};
vm.runInNewContext(fs.readFileSync(require.resolve('../clay-prototype.js'),'utf8'),scope);
const clay=scope.window.BadFodderClay;
(async()=>{await clay.preload('bad-belzig');assert(clay.ready);
const actor=()=>({x:10,y:20,alive:true,variant:0,visual:{clock:0,phase:0,state:'walk',dir:2,moving:true}});
const player=actor(),enemy=actor(),civilian=actor(),other=actor(),groups={squad:[player,other],enemy:[enemy],civilian:[civilian]};
const tree={x:10,y:20,r:5},b={i:0,minX:5,maxX:20,minY:5,maxY:25,points:[[5,5],[20,5],[20,25],[5,25]]},road={kind:'residential',points:[[0,0],[20,20]]},area={type:'grass',minX:0,maxX:40,minY:0,maxY:40,points:[[0,0],[40,0],[40,40],[0,40]]},bag={kind:'sandbags',x:5,y:5,angle:0,seed:1};
const config=key=>({key,anchor:[10,20],trees:[tree],buildings:[b],roads:[road],areas:[area],props:[bag],getActors:()=>groups});
clay.configure(config('bad-belzig'));assert(clay.sample.enabled);
for(const [team,e]of Object.entries({squad:player,enemy,civilian}))assert(clay.actorSelected(e,team));assert(!clay.actorSelected(other,'squad'));
let old=clay.steppedPose(player),changes=0;
for(let i=1;i<=60;i++){player.visual.clock=i/60;player.visual.phase=i/10;player.x+=.1;const now=clay.steppedPose(player);if(now!==old){changes++;old=now}assert.equal(player.y,20)}
assert.equal(changes,12,'Exactly twelve held pose replacements in sixty simulation steps');
player.visual.clock=1.01;player.visual.state='fire';assert.equal(clay.steppedPose(player).state,'fire','Shot pose starts without waiting for a tick');
const shot=clay.steppedPose(player);player.visual.clock=1.02;player.visual.state='idle';assert.equal(clay.steppedPose(player),shot,'Recoil is held after a short weapon event');
player.visual.clock=1.09;assert.equal(clay.steppedPose(player).state,'idle');
assert(clay.coverBag(ctx,10,20,.4,14,8,3,1));
for(const state of ['idle','walk','run','fire','hurt','stumble','dead']){player.visual.state=state;player.visual.clock+=.1;player.visual.death=.3;art.drawActor(ctx,player,'squad')}
// Restore presentation fixture changes before checking the render-only functions.
const frozen=JSON.stringify(groups);art.drawActor(ctx,player,'squad');art.drawActor(ctx,enemy,'enemy');art.drawActor(ctx,civilian,'civilian');art.tree(ctx,tree);clay.ground(ctx);assert(clay.road(ctx,road,20));assert(clay.buildingMaterial(ctx,b,b.points,'#ad9971'));scope.window.BadFodderWartimeScenery.draw(ctx,[bag]);const explosion={type:'blast',x:10,y:20,life:.55};for(let stage=0;stage<8;stage++){explosion.life=.55-stage/15;assert(clay.blast(ctx,explosion))}assert.equal(JSON.stringify(groups),frozen,'Drawing must not mutate gameplay or presentation state');
const n=canvases;art.drawActor(ctx,player,'squad');art.drawActor(ctx,enemy,'enemy');art.tree(ctx,tree);clay.ground(ctx);assert.equal(canvases,n,'Warmed rendering reuses cached assets');
assert.equal(clay.noise(13,2),clay.noise(13,2));assert(clay.cacheSize<320);
for(const key of ['wigan','cable-street','barcelona']){clay.configure(config(key));assert(!clay.sample.enabled);const n=previous;art.drawActor(ctx,player,'squad');art.tree(ctx,tree);assert.equal(previous,n+2);assert(!clay.road(ctx,road,20));assert(!clay.blast(ctx,{type:'blast',life:.4}))}
scope.window.location.search='';
for(const key of ['bad-belzig','wigan','cable-street','barcelona']){clay.configure(config(key));assert(clay.full,'Default presentation covers each current mission');assert(clay.actorSelected(other,'squad'),'All squad members receive miniature presentation');assert(clay.actorSelected(enemy,'enemy'));const frozen=JSON.stringify(groups);art.drawActor(ctx,other,'squad');art.drawActor(ctx,enemy,'enemy');art.tree(ctx,tree);assert.equal(JSON.stringify(groups),frozen);assert(clay.buildingMaterial(ctx,b,b.points,'#ad9971'));assert(clay.blast(ctx,{type:'blast',x:20,y:30,life:.3}));assert(clay.blast(ctx,{type:'blast',x:40,y:30,life:.2}));let before=art.pose(enemy),changes=0;for(let i=1;i<=60;i++){enemy.visual.clock=i/60;const now=art.pose(enemy);if(now!==before){changes++;before=now}}assert.equal(changes,12);enemy.visual.clock=0;}
scope.window.location.search='?miniatures=0';clay.configure(config('bad-belzig'));assert(!clay.sample.enabled,'Original art remains available for comparison and fallback');

console.log('PASS: 12 Hz held poses at 60 Hz, immediate events, entity immutability, cached deterministic materials, isolated reference study, default four-mission coverage, preserved identities and original-art fallback.');

})().catch(error=>{console.error(error);process.exitCode=1});
