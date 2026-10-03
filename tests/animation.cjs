'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const scope={window:{},document:{createElement(){throw new Error('Animation must not allocate artwork');}}};
vm.createContext(scope);
vm.runInContext(fs.readFileSync(path.join(__dirname,'../pixel-art.js'),'utf8'),scope);
const art=scope.window.BadFodderArt;
const actor=()=>({x:100,y:100,dir:0,alive:true,fireTimer:0});
const a=actor();art.animate(a,0);
for(let i=0;i<60;i++)art.animate(a,1/60);
assert.equal(art.pose(a).state,'idle');assert.equal(art.pose(a).frame,0);
a.x+=3;art.animate(a,1/60);
assert.equal(art.pose(a).state,'walk');assert.equal(art.pose(a).frame,0);
const runner=actor();art.animate(runner,0);runner.x+=4;art.animate(runner,1/60);assert.equal(art.pose(runner).state,'run','High-speed movement uses the run presentation');
art.animate(a,1/60);assert.equal(art.pose(a).state,'idle','Blocked actors must stop stepping');
// Walking phase depends on distance, regardless of update frequency.
const slow=actor(),fast=actor();art.animate(slow,0);art.animate(fast,0);
for(let i=0;i<4;i++){slow.x+=10;art.animate(slow,1/30);}
for(let i=0;i<8;i++){fast.x+=5;art.animate(fast,1/60);}
assert.equal(art.pose(slow).frame,art.pose(fast).frame);
a.fireTimer=.11;art.animate(a,1/60);assert.equal(art.pose(a).state,'fire');assert.equal(art.pose(a).frame,0);
a.fireTimer=.03;art.animate(a,1/60);assert.equal(art.pose(a).frame,1,'Late shot uses recoil pose without a flash');
a.fireTimer=0;a.dir=.4;art.animate(a,1/60);assert.equal(art.pose(a).dir,0,'Facings resist jitter near the boundary');
a.dir=.6;art.animate(a,1/60);assert.equal(art.pose(a).dir,1);
a.alive=false;art.animate(a,.01);assert.equal(art.pose(a).state,'dead');assert.equal(art.pose(a).frame,0);
art.animate(a,.1);assert.equal(art.pose(a).frame,1);art.animate(a,.1);assert.equal(art.pose(a).frame,2);
art.animate(a,10);assert.equal(art.pose(a).frame,2,'Fallen pose stays settled');
console.log('PASS: distinct walk/run presentation, distance-based gait, update-rate independence, shot timing, facing stability and collapse sequence.');
const walker=actor();art.animate(walker,0);
for(let i=0;i<50;i++){walker.x+=6;art.animate(walker,1/60);}
assert(art.pose(walker).dust.length>0);assert(art.pose(walker).dust.length<=4);
art.animate(walker,.3);assert.equal(art.pose(walker).dust.length,0,'Footstep dust settles while the actor is idle');

// Live poses interpolate direction and gait without changing simulation fields.
const turner=actor();art.animate(turner,0);turner.dir=1;art.animate(turner,1/60);
assert(art.pose(turner).facing>0&&art.pose(turner).facing<1,'Facing interpolates rather than snapping');
const wrap=actor();wrap.dir=Math.PI-.01;art.animate(wrap,0);wrap.dir=-Math.PI+.01;art.animate(wrap,1/60);
assert(Math.abs(art.pose(wrap).facing-(Math.PI-.01))<.02,'Turning crosses the angle seam by the shortest route');
const continuous=actor();art.animate(continuous,0);continuous.x+=.5;art.animate(continuous,1/60);
const firstPhase=art.pose(continuous).phase;continuous.x+=.5;art.animate(continuous,1/60);
assert(art.pose(continuous).phase>firstPhase);assert.equal(art.pose(continuous).frame,0,'Continuous gait advances between atlas frames');
assert.equal(art.pose(slow).phase,art.pose(fast).phase,'Continuous gait stays distance-based');
console.log('PASS: continuous gait, smooth turns and shortest-path angle wrapping.');

const injured=actor();art.animate(injured,0);injured.hitTimer=.2;art.animate(injured,1/60);
assert.equal(art.pose(injured).state,'hurt');injured.x+=2;art.animate(injured,1/60);assert.equal(art.pose(injured).state,'stumble');
injured.hitTimer=0;injured.throwTimer=.3;art.animate(injured,1/60);assert.equal(art.pose(injured).state,'throw');assert(art.pose(injured).throwProgress>0);
injured.throwTimer=0;injured.aiming=true;art.animate(injured,1/60);assert.equal(art.pose(injured).state,'aim');
const firingWalker=actor();art.animate(firingWalker,0);firingWalker.x+=2;firingWalker.fireTimer=.1;art.animate(firingWalker,1/60);assert.equal(art.pose(firingWalker).state,'fire');assert(art.pose(firingWalker).moving,'Firing must not freeze a moving actor’s gait');
const steadyRunner=actor();art.animate(steadyRunner,0);steadyRunner.x+=4;art.animate(steadyRunner,1/60);steadyRunner.x+=3.1;art.animate(steadyRunner,1/60);assert.equal(art.pose(steadyRunner).state,'run','Run state uses hysteresis near the speed threshold');
console.log('PASS: hurt/stumble, throw progress, aiming, firing gait and run hysteresis.');
