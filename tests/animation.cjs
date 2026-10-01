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
a.x+=6;art.animate(a,1/60);
assert.equal(art.pose(a).state,'walk');assert.equal(art.pose(a).frame,1);
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
console.log('PASS: distance-based gait, blocked/idle actors, update-rate independence, shot timing, facing stability and collapse sequence.');
const walker=actor();art.animate(walker,0);
for(let i=0;i<50;i++){walker.x+=6;art.animate(walker,1/60);}
assert(art.pose(walker).dust.length>0);assert(art.pose(walker).dust.length<=4);
art.animate(walker,.3);assert.equal(art.pose(walker).dust.length,0,'Footstep dust settles while the actor is idle');
