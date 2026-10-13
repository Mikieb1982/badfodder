'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const checkpoints=require('../mission-checkpoints.js');
const unit={x:4,y:7},state={unit,list:[unit],map:new Map([[unit,new Set([unit])]])};state.self=state;
const restored=checkpoints.decode(checkpoints.encode(state));
assert.equal(restored.self,restored);assert.equal(restored.unit,restored.list[0]);assert(restored.map.get(restored.unit).has(restored.unit));
const html=fs.readFileSync('index.html','utf8'),start=html.indexOf('  function drawForegroundOccluders('),end=html.indexOf('\n  function drawIdentityMarker',start);let queries=0;
const context={camera:{x:0,y:0},VIEW_W:900,VIEW_H:400,zoom:1,S:x=>x,nearbyBuildings:()=>{queries++;return[]},treeIndexesInBounds:()=>{queries++;return[]}};
vm.createContext(context);vm.runInContext(html.slice(start,end),context);
const actors=Array.from({length:120},(_,i)=>({ent:{alive:true,x:i<12?100:2000,y:100},team:'enemy'}));
context.drawForegroundOccluders(actors);assert.equal(queries,24);
const runtime=fs.readFileSync('simulation-runtime.js','utf8');
const condition=runtime.match(/if\(!MOBILE_RENDER\|\|([^\n]+)\)\{/)[1];
const advance=runtime.match(/lastMobileRender\+=([^;]+);/)[1];
for(const hz of [60,90,120]){let lastMobileRender=0,frames=0;for(let i=1;i<=hz*10;i++){const now=i*1000/hz;if(eval(condition)){lastMobileRender+=eval(advance);frames++;}}assert(Math.abs(frames-300)<=1,`${hz} Hz: ${frames} frames`);}
assert(!fs.readFileSync('scenery-cache.js','utf8').includes('setTimeout(install,0)'));
console.log('PASS: checkpoint graph identity; 24 vs 240 foreground queries in viewport fixture; 30 Hz render pacing on 60/90/120 Hz displays; no scenery polling loop.');
