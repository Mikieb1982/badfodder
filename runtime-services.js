/* Frame orchestration and fault policy use explicit dependencies; no game globals. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.BadFodderRuntime=api;})(typeof window!=='undefined'?window:globalThis,()=>{
 'use strict';
 function fixedFrame({dt,accumulator,fixedDt=1/60,maxSteps=5,simulate,active,onSteps}){
  if(!active)return 0;
  const available=accumulator+dt;
  accumulator=Math.min(fixedDt*maxSteps,available);
  let steps=0;while(accumulator>=fixedDt&&steps<maxSteps){simulate(fixedDt);accumulator-=fixedDt;steps++;}
  onSteps?.({steps,dropped:Math.max(0,Math.floor((available-fixedDt*maxSteps)/fixedDt)),capped:available>fixedDt*maxSteps});
  return accumulator;
 }
 function interrupt({releaseFire,releaseMove,pointers,resetGesture}){releaseFire();releaseMove();pointers.clear();resetGesture();}
 function renderFrame({started,menuOpen,draw}){if(started&&!menuOpen)draw();}
 function fault({time,last,count}){return {at:time,count:(time-last>3000?0:count)+1};}
 function diagnostics({enabled=false,read}){
  const samples={frameMs:0,simulationMs:0,renderMs:0,fps:0,frames:0,simulationSteps:0,droppedSteps:0,cappedFrames:0,recentFaults:[]};
  return {get enabled(){return enabled},start(){enabled=true},rememberFault(error){samples.recentFaults.push(String(error?.message||error).slice(0,300));if(samples.recentFaults.length>8)samples.recentFaults.shift();},steps({steps,dropped,capped}){samples.simulationSteps+=steps;samples.droppedSteps+=dropped;if(capped)samples.cappedFrames++;},record(frameMs,simulationMs,renderMs){if(!enabled)return;samples.frames++;samples.frameMs=samples.frameMs*.9+frameMs*.1;samples.simulationMs=samples.simulationMs*.9+simulationMs*.1;samples.renderMs=samples.renderMs*.9+renderMs*.1;samples.fps=samples.frameMs?1000/samples.frameMs:0;},snapshot(){return {...samples,...read()};}};
 }
 return {fixedFrame,interrupt,renderFrame,fault,diagnostics};
});
