'use strict';
const assert=require('node:assert/strict');
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
console.log('actor render pipeline ok');
