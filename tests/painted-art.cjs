'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(path.join(__dirname,'../painted-art.js'),'utf8');
function setup(fail){
  let created=0,canvases=0,fallbackCalls=0;
  const timers=new Map();let timerId=0;
  const schedule=(fn,delay)=>{timers.set(++timerId,{fn,delay});return timerId};
  const cancel=id=>timers.delete(id);
  const draws=[],ctx={drawImage(...args){draws.push(args)},createPattern(c){return {canvas:c}},save(){},restore(){},fillRect(){},beginPath(){},ellipse(){},fill(){},translate(){},rotate(){},scale(){}};
  const art={texture:()=>{fallbackCalls++;return 'fallback'},landmark:()=>{fallbackCalls++;return 'fallback'},tree:()=>{fallbackCalls++},soldier:()=>{fallbackCalls++;return 'fallback'},drawActor:()=>{fallbackCalls++},pose:ent=>({dir:ent.dir||0,state:ent.state||'walk',phase:1.2,clock:1,death:.12,facing:0})};
  class FakeImage{
    constructor(){created++}
    set src(value){this.source=value;const key=value.split('/').at(-1).split('.')[0];const dimensions={materials:[1024,1024],troops:[1024,480],trees:[256,320],landmarks:[1280,480]}[key];[this.width,this.height]=dimensions;if(key==='troops'&&fail==='stall')return;queueMicrotask(()=>key===fail?this.onerror():this.onload())}
  }
  vm.runInNewContext(source,{window:{BadFodderArt:art},Image:FakeImage,setTimeout:schedule,clearTimeout:cancel,document:{createElement(){canvases++;return {width:0,height:0,getContext:()=>ctx}}},console:{warn(){}}});
  return {art,ctx,draws,expire(){assert.equal(timers.size,1);const timer=[...timers.values()][0];assert.equal(timer.delay,8000);timer.fn()},get created(){return created},get canvases(){return canvases},get fallbackCalls(){return fallbackCalls}};
}
(async()=>{
  const t=setup();assert.equal(t.art.texture(t.ctx,'grass'),'fallback');const loading=t.art.preloadPainted();assert.equal(t.art.preloadPainted(),loading);assert(await loading);assert.equal(t.created,4);
  const roads=t.art.texture(t.ctx,'road');assert.equal(roads.canvas.width,96);assert.equal(t.art.texture(t.ctx,'road').canvas,roads.canvas,'Materials are cached');
  const landmark=t.art.landmark('castle');assert.equal(t.art.landmark('castle'),landmark);assert.equal(landmark.width,320);assert.equal(landmark.height,240);
  t.art.soldier('squad',2,0,'idle');const before=t.canvases;
  for(const state of ['idle','walk','fire','dead'])for(let dir=0;dir<8;dir++)t.art.drawActor(t.ctx,{x:100,y:100,dir,state,hitTimer:0},'squad');
  assert.equal(t.canvases,before,'Live animation must not allocate artwork');
  for(const args of t.draws){if(args.length!==9)continue;const [image,x,y,w,h]=args;assert(x>=0&&y>=0&&w>0&&h>0);assert(x+w<=image.width&&y+h<=image.height,'Source rectangle crosses an atlas boundary');}
  const missing=setup('troops');assert.equal(await missing.art.preloadPainted(),false);assert.equal(missing.art.paintedReady,false);assert.equal(missing.art.soldier('squad',2,0,'idle'),'fallback');missing.art.drawActor(missing.ctx,{x:0,y:0},'squad');assert.equal(missing.fallbackCalls,2);
  const stalled=setup('stall');const wait=stalled.art.preloadPainted();await new Promise(resolve=>setImmediate(resolve));stalled.expire();assert.equal(await wait,false,'A stalled image must not leave startup waiting forever');
  for(const key of ['materials','troops','trees','landmarks']){const asset=fs.readFileSync(path.join(__dirname,'../assets/painted/'+key+'.webp'));assert.equal(asset.subarray(0,4).toString(),'RIFF');assert.equal(asset.subarray(8,12).toString(),'WEBP');}
  console.log('PASS: painted preload/cache, atlas bounds in all facings/states, allocation-free live animation, missing/stalled-asset fallback and packaged WebP assets.');
})().catch(error=>{console.error(error);process.exitCode=1});
