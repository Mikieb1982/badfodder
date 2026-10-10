'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const ActorScale=require('../actor-scale.js');

function context(map='bad-belzig'){
  const calls=[];
  const art={
    pose:ent=>({state:ent.state||'idle',moving:!!ent.moving,phase:ent.phase||0}),
    drawActor(){calls.push('base');return 17;}
  };
  ActorScale.installRenderPipeline(art);
  const document={
    readyState:'complete',documentElement:{classList:{add(){}}},
    querySelector(){return null},getElementById(){return null}
  };
  const root={document,BadFodderArt:art,BadFodderCoopBridge:{map:()=>map},BadFodderHealth:{stateFor:u=>u.healthState||'FIT'},
    matchMedia:()=>({matches:false}),performance:{now:()=>1000},requestAnimationFrame:()=>0,cancelAnimationFrame(){},setTimeout:()=>0,clearTimeout(){},setInterval:()=>0};
  root.window=root;root.globalThis=root;
  vm.createContext(root);vm.runInContext(fs.readFileSync(require.resolve('../professional-feel.js'),'utf8'),root);
  return{root,art,calls};
}
function canvas(){
  const calls=[];
  const base={
    save(){calls.push(['save'])},restore(){calls.push(['restore'])},translate(x,y){calls.push(['translate',x,y])},rotate(a){calls.push(['rotate',a])},
    beginPath(){},arc(){},ellipse(){},fill(){},stroke(){calls.push(['stroke'])},moveTo(){},lineTo(){},closePath(){},fillRect(){calls.push(['fillRect'])},setLineDash(){}
  };
  return{calls,ctx:new Proxy(base,{get:(o,k)=>k in o?o[k]:o[k],set:(o,k,v)=>{o[k]=v;return true}})};
}

const belzig=context();
assert.equal(belzig.root.BadFodderProfessionalFeel.isBelzig(),true);
assert(belzig.art.actorRenderPipeline.list().some(layer=>layer.name==='professional-feel'));
const wounded={x:40,y:50,dir:0,alive:true,healthState:'BADLY_WOUNDED',manualGarrison:true,state:'idle',variant:1};
let draw=canvas();assert.equal(belzig.art.drawActor(draw.ctx,wounded,'squad'),17);
assert(draw.calls.some(c=>c[0]==='translate'&&c[1]!==0),'Belzig actors should receive presentation-only body motion/recoil transforms');
assert(draw.calls.filter(c=>c[0]==='stroke').length>=2,'Wounded/garrison state should be readable in world space');

const enemy={x:60,y:70,dir:0,alive:true,fireTimer:.1,hitTimer:0,state:'fire',variant:2};
draw=canvas();belzig.art.drawActor(draw.ctx,enemy,'enemy');
assert.equal(draw.calls.filter(c=>c[0]==='fillRect').length,0,'Belzig enemy muzzle feedback should not be duplicated by the professional pass');

const wigan=context('wigan');assert.equal(wigan.root.BadFodderProfessionalFeel.isBelzig(),false);
draw=canvas();wigan.art.drawActor(draw.ctx,{x:10,y:10,dir:0,alive:true,state:'idle'},'squad');
assert(!draw.calls.some(c=>c[0]==='rotate'),'Belzig presentation transforms must not leak into other missions');

const source=fs.readFileSync(require.resolve('../professional-feel.js'),'utf8');
assert(source.includes("pipeline.register('professional-feel'"),'Actor feedback must stay on the named render pipeline');
assert(source.includes("currentMap()==='bad-belzig'"),'Gold-standard actor presentation must be scoped to Belzig');
assert(source.includes("BadFodderSfx?.environment?.('bad-belzig','objective')"),'Belzig objective transitions should use the existing SFX architecture');
console.log('belzig gold-standard presentation ok');
