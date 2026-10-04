/* Frame orchestration and fault policy use explicit dependencies; no game globals. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.BadFodderRuntime=api;})(typeof window!=='undefined'?window:globalThis,()=>{
 'use strict';
 function fixedFrame({dt,accumulator,fixedDt=1/60,maxSteps=5,simulate,active}){
  if(!active)return 0;
  accumulator=Math.min(fixedDt*maxSteps,accumulator+dt);
  let steps=0;while(accumulator>=fixedDt&&steps<maxSteps){simulate(fixedDt);accumulator-=fixedDt;steps++;}
  return accumulator;
 }
 function interrupt({releaseFire,releaseMove,pointers,resetGesture}){releaseFire();releaseMove();pointers.clear();resetGesture();}
 function renderFrame({started,menuOpen,draw}){if(started&&!menuOpen)draw();}
 function fault({time,last,count}){return {at:time,count:(time-last>3000?0:count)+1};}
 function diagnostics({enabled=false,read}){
  const samples={frameMs:0,simulationMs:0,renderMs:0,fps:0,frames:0};
  return {enabled,record(frameMs,simulationMs,renderMs){if(!enabled)return;samples.frames++;samples.frameMs=samples.frameMs*.9+frameMs*.1;samples.simulationMs=samples.simulationMs*.9+simulationMs*.1;samples.renderMs=samples.renderMs*.9+renderMs*.1;samples.fps=samples.frameMs?1000/samples.frameMs:0;},snapshot(){return enabled?{...samples,...read()}:null;}};
 }
 return {fixedFrame,interrupt,renderFrame,fault,diagnostics};
});
