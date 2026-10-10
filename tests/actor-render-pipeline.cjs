'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const ActorScale=require('../actor-scale.js');

const calls=[];
const art={
  drawActor(ctx,ent,team){calls.push(`base:${team}`);return 7;}
};
const pipeline=ActorScale.installRenderPipeline(art);
assert(pipeline,'render pipeline should install');
assert.equal(art.actorRenderPipeline,pipeline);

const previous=art.drawActor;
art.drawActor=function(ctx,ent,team){
  calls.push('legacy:before');
  const result=previous.call(this,ctx,ent,team);
  calls.push('legacy:after');
  return result+1;
};

assert.equal(pipeline.register('state-cues',{
  before(){calls.push('registered:before')},
  after(){calls.push('registered:after')}
}),true);
assert.equal(pipeline.register('state-cues',{}),false,'duplicate named layers should be rejected');

const result=art.drawActor({}, {}, 'squad');
assert.equal(result,8,'wrappers should preserve the renderer return value');
assert.deepEqual(calls,[
  'registered:before',
  'legacy:before',
  'base:squad',
  'legacy:after',
  'registered:after'
]);
const layers=pipeline.list();
assert.equal(layers[0].name,'base-renderer');
assert.equal(layers[1].kind,'legacy');
assert.equal(layers[2].name,'state-cues');
assert.equal(layers[2].kind,'registered');
assert.equal(typeof pipeline.renderer,'function');

const professional=fs.readFileSync(require.resolve('../professional-feel.js'),'utf8');
assert(professional.includes("pipeline.register('professional-feel'"),'Professional actor feedback must use the named render pipeline');
const garrison=fs.readFileSync(require.resolve('../garrison-control.js'),'utf8');
assert(garrison.includes("pipeline.register('manual-garrison'"),'Garrison sandbags must use the named render pipeline');
console.log('actor render pipeline ok');
const Fortification=require('../checkpoint-fortification.js');
const checkpointSource=fs.readFileSync(require.resolve('../checkpoint-fortification.js'),'utf8');
assert(!/\.drawActor\s*=/.test(checkpointSource),'Checkpoint must not replace drawActor');
const order=[];
const checkpointArt={drawActor(){order.push('actor');return 19},animate(ent){order.push('animate');return ent.dir}};
delete global.BadFodderActorScale;
assert.equal(Fortification.patchArt(checkpointArt),false,'Wait for a pipeline when it is unavailable');
const checkpointPipeline=ActorScale.installRenderPipeline(checkpointArt);
assert.equal(Fortification.patchArt(checkpointArt),true);
assert.equal(Fortification.patchArt(checkpointArt),true);
assert.deepEqual(checkpointPipeline.list().map(l=>l.name),['base-renderer','checkpoint-fortification']);
let depth=0,halves=0;
const ctx=new Proxy({save(){if(depth++===0)order.push(halves++===0?'rear':'front')},restore(){depth--},setLineDash(){},createLinearGradient(){return{addColorStop(){}}}},{get(target,key){return target[key]||(()=>{})},set(target,key,value){target[key]=value;return true}});
const ent={checkpointFortified:true,checkpointFortificationRearLead:true,checkpointFortificationFrontLead:true,checkpointCenterX:10,checkpointCenterY:20,checkpointSandbagRadius:30,checkpointFacing:1.2};
assert.equal(checkpointArt.drawActor(ctx,ent,'squad'),19);
assert.deepEqual(order.filter(x=>['rear','actor'].includes(x)),['rear','actor']);
assert(order.lastIndexOf('actor')<order.lastIndexOf('front'),'Front sandbags must follow actor');
assert.equal(checkpointArt.animate(ent,.1),1.2,'Facing and animation return must survive');
order.length=0;assert.equal(checkpointArt.drawActor(ctx,ent,'enemy'),19);assert.deepEqual(order,['actor']);
console.log('checkpoint named layer, order, return and facing ok');
const vm=require('node:vm');let onLoad;
const late={document:{addEventListener(type,handler,capture){assert.equal(type,'load');assert.equal(capture,true);onLoad=handler}}};late.window=late;
vm.runInNewContext(checkpointSource,late);
late.BadFodderArt={drawActor(){return 23},animate(){return 29}};
onLoad();assert(!late.BadFodderArt.__checkpointFortificationPatched,'Late art should wait for the pipeline');
late.BadFodderActorScale=ActorScale;onLoad();
assert(late.BadFodderArt.actorRenderPipeline.list().some(layer=>layer.name==='checkpoint-fortification'));
assert.equal(late.BadFodderArt.drawActor({}, {}, 'squad'),23);
console.log('late art/pipeline script loading ok');
