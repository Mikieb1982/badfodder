'use strict';
const assert=require('node:assert/strict'),R=require('../runtime-services'),Sim=require('../simulation-runtime'),P=require('../player-support');
const quality=P.createQuality(),diagnostics=R.diagnostics({read:()=>({})});let movement=0,drawn=0;
global.requestAnimationFrame=()=>{};global.window={BadFodderPlayerSupport:{frame(ms,active){quality.sample(ms,active);}}};
const env={commands:{mode:'client'},started:true,finished:false,menuOpen:false,paused:false,mapOpen:false,last:0,simulationAccumulator:0,FIXED_DT:1/60,MAX_CATCHUP_STEPS:5,diagnostics,touchState:{fireHeld:false},applyTouchMovement(){movement++;},drawWorld(){drawn++;}};
const runtime=Sim.create(env);for(let n=1;n<=360;n++)runtime.tick(n*30);
assert.equal(quality.scale,.75,'Multiplayer clients adapt their actual render quality');assert.equal(drawn,360);assert.equal(movement,360);assert(diagnostics.snapshot().frames===360,'Normal reports collect timing without debug mode');assert.equal(diagnostics.snapshot().simulationSteps,0,'Clients never simulate the host world');env.menuOpen=true;for(let n=361;n<=720;n++)runtime.tick(n*30);assert.equal(quality.report().frames,360,'Menus do not bias quality sampling');
console.log('PASS: guest render quality adapts independently of simulation ownership; normal timing reports work without debug mode.');
