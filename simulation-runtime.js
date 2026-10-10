/* simulation-runtime: existing engine behaviour with an explicit live-state adapter. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.BadFodderSimulationRuntime=api;
})(typeof window!=='undefined'?window:globalThis,function(){
  'use strict';
  function create(env){
  const previousPositions=new WeakMap();
  let previousCamera=null,interpolationReady=false;
  const MAX_INTERPOLATION_DISTANCE=160;

  function renderables(){
    const list=[],seen=new Set();
    const add=collection=>{
      if(!collection)return;
      const values=Array.isArray(collection)?collection:(typeof collection.values==='function'?collection.values():[]);
      for(const ent of values){
        if(!ent||typeof ent!=='object'||seen.has(ent)||!Number.isFinite(ent.x)||!Number.isFinite(ent.y))continue;
        seen.add(ent);list.push(ent);
      }
    };
    add(env.squad);add(env.enemies);add(env.civilians);add(env.projectiles);add(env.bullets);add(env.grenades);
    add(env.resistanceRuntime?.units);add(env.barcelonaRuntime?.units);add(env.barcelonaRuntime?.actors);
    add(env.missionController?.state?.actors);add(env.missionCrowd?.people);
    return list;
  }

  function captureRenderState(){
    for(const ent of renderables())previousPositions.set(ent,{x:ent.x,y:ent.y});
    const camera=env.camera;
    previousCamera=camera&&Number.isFinite(camera.x)&&Number.isFinite(camera.y)?{x:camera.x,y:camera.y}:null;
  }

  function drawInterpolated(alpha){
    if(!interpolationReady||env.commands?.mode==='client'||!env.FIXED_DT){env.drawWorld();return}
    const t=Math.max(0,Math.min(1,Number(alpha)||0)),saved=[];
    for(const ent of renderables()){
      const prev=previousPositions.get(ent);if(!prev)continue;
      const x=ent.x,y=ent.y,dx=x-prev.x,dy=y-prev.y;
      if(dx*dx+dy*dy>MAX_INTERPOLATION_DISTANCE*MAX_INTERPOLATION_DISTANCE)continue;
      saved.push([ent,x,y]);ent.x=prev.x+dx*t;ent.y=prev.y+dy*t;
    }
    const camera=env.camera,cameraSaved=camera&&Number.isFinite(camera.x)&&Number.isFinite(camera.y)?{x:camera.x,y:camera.y}:null;
    if(cameraSaved&&previousCamera){
      const dx=cameraSaved.x-previousCamera.x,dy=cameraSaved.y-previousCamera.y;
      if(dx*dx+dy*dy<=MAX_INTERPOLATION_DISTANCE*MAX_INTERPOLATION_DISTANCE*9){camera.x=previousCamera.x+dx*t;camera.y=previousCamera.y+dy*t}
    }
    try{env.drawWorld()}finally{
      for(const [ent,x,y] of saved){ent.x=x;ent.y=y}
      if(cameraSaved){camera.x=cameraSaved.x;camera.y=cameraSaved.y}
    }
  }

  function simulateStep(dt){
    if(env.commands?.mode==='client')return;
    env.tacticsRuntime?.fixedUpdate(dt);
    env.enemyBehaviour?.fixedUpdate(dt);
    if(env.badBelzigRuntime)env.squad.forEach(s=>s.touchMoveSpeed=0);
    window.BadFodderCoop?.remoteStep(dt);
    env.runAdaptive(()=>env.adaptiveDirector.update(dt));
    if(!env.menuOpen&&!env.paused&&!env.mapOpen)env.applyTouchMovement(dt);
    if(env.keyboardFireHeld&&env.actionAllowed('firearms'))env.refreshCursorWorld();
    if(!env.menuOpen&&!env.paused&&!env.mapOpen&&env.actionAllowed('firearms')&&(env.rightHeld||env.macFireHeld||env.keyboardFireHeld)&&env.cursorWorld&&!env.bothLatched)env.squadFireAt(env.cursorWorld.x,env.cursorWorld.y);
    if(!env.menuOpen&&!env.paused&&!env.mapOpen&&env.actionAllowed('firearms')&&env.touchState.fireHeld)env.fireMobile();
    env.squad.forEach((s,i)=>{s.aiming=s.selected&&env.actionAllowed('firearms')&&(env.rightHeld||env.macFireHeld||env.keyboardFireHeld||env.touchState.fireHeld);s.streetActor=env.missionController?.state.actors.get('player-'+i)});
    env.updateSquad(dt);
    window.BadFodderHealth.fixedUpdate(dt);

    if(env.missionController){
      if(env.missionInteractionLayer){
        env.missionInteractionLayer.syncActors(env.squad.map((s,i)=>({
          id:'player-'+i,name:s.name,x:s.x,y:s.y,active:s.alive
        })));
        env.missionInteractionLayer.fixedUpdate(dt);
      }else{
        env.missionController.fixedUpdate(dt);
      }
      if(env.missionDirector){
        env.missionDirector.fixedUpdate(dt);
        const historicalProgress=env.missionDirector.snapshot();
        env.missionObjectivesRuntime.syncPhase(historicalProgress.phaseIndex,historicalProgress);
        env.missionStage=historicalProgress.phaseIndex;
        if(historicalProgress.completed)env.completeCurrentMission();
        else if(historicalProgress.failed){env.finished=true;env.win=false;env.hudStage.textContent='MISSION FAILED';env.setStatus(historicalProgress.status);env.showMissionResult()}
      }
      if(env.missionCrowd)env.missionCrowd.fixedUpdate(dt);
      env.updateCivilians(dt);
      env.squad.forEach(ent=>env.art.animate(ent,dt));
      env.civilians.forEach(ent=>env.art.animate(ent,dt));
      env.updateCamera(dt);
      env.checkFailure();
      env.updateHud();
      return;
    }

    env.processEnemyPathQueue();
    env.updateEnemies(dt);
    env.badBelzigRuntime?.update?.(dt);
    env.updateCivilians(dt);
    env.updateProjectiles(dt);
    env.resistanceRuntime?.update(dt);env.resistanceRuntime?.units.forEach(ent=>env.art.animate(ent,dt));
    env.barcelonaRuntime?.update(dt);
    env.opportunitiesRuntime?.fixedUpdate(dt);
    env.squad.forEach(ent=>env.art.animate(ent,dt));
    env.enemies.forEach(ent=>env.art.animate(ent,dt));
    env.civilians.forEach(ent=>env.art.animate(ent,dt));
    env.updateCamera(dt);
    env.checkFailure();
    env.updateMissionProgress(dt);
    env.updateHud();
  }

  function simulateRenderStep(dt){captureRenderState();simulateStep(dt);interpolationReady=true}

  function handleRuntimeFault(err){
    const now=performance.now();
    env.runtimeFaultTotal++;
    const fault=BadFodderRuntime.fault({time:now,last:env.runtimeFaultAt,count:env.runtimeFaultCount});
    env.runtimeFaultAt=fault.at;env.runtimeFaultCount=fault.count;
    env.diagnostics.rememberFault(err);
    console.error('If I Can Shoot Rabbits runtime fault',err);
    env.releaseInterruptedInput();
    env.simulationAccumulator=0;
    interpolationReady=false;

    if(env.runtimeFaultCount>=3){
      env.lifecycle.transition('RECOVERY');
      env.setStatus('Runtime recovery paused the mission after repeated errors.');
      if(env.menu){
        const detail=err&&err.message?String(err.message).slice(0,140):'Unknown runtime error';
        env.menu.showRecovery('The mission hit a repeated runtime error: '+detail+'. Restart the mission.');
      }
      env.syncTouchControlState();
    }
  }

  function tick(now){
    // Schedule first: a runtime exception must never kill the animation loop.
    requestAnimationFrame(tick);
    if(env.runtimeSafeStop)return;

    try{
      const elapsedMs=Math.max(0,now-env.last);
      const frameDt=Math.min(.1,elapsedMs/1000||0);
      env.last=now;

      const measuredAt=env.diagnostics.enabled?performance.now():0;
      const simulationActive=env.commands?.mode!=='client'&&env.started&&!env.finished&&((env.commands?.mode==='host')||(!env.menuOpen&&!env.paused&&!env.mapOpen));
      if(!simulationActive)interpolationReady=false;
      env.simulationAccumulator=BadFodderRuntime.fixedFrame({dt:frameDt,accumulator:env.simulationAccumulator,fixedDt:env.FIXED_DT,maxSteps:env.MAX_CATCHUP_STEPS,simulate:simulateRenderStep,onSteps:env.diagnostics.steps,active:simulationActive});
      const simulatedAt=env.diagnostics.enabled?performance.now():0;

      if(env.commands?.mode==='client'){
        if(env.started&&!env.menuOpen&&!env.paused&&!env.finished&&!env.mapOpen){env.applyTouchMovement(frameDt);if((env.rightHeld||env.macFireHeld||env.keyboardFireHeld)&&env.cursorWorld&&!env.bothLatched)env.squadFireAt(env.cursorWorld.x,env.cursorWorld.y);if(env.touchState.fireHeld)env.fireMobile();}
        window.BadFodderCoop?.clientFrame(frameDt);
      }
      const alpha=env.FIXED_DT?env.simulationAccumulator/env.FIXED_DT:1;
      BadFodderRuntime.renderFrame({started:env.started,menuOpen:env.menuOpen,draw:()=>drawInterpolated(alpha)});
      if(env.diagnostics.enabled)env.diagnostics.record(elapsedMs,simulatedAt-measuredAt,performance.now()-simulatedAt);
      if(env.runtimeFaultCount&&now-env.runtimeFaultAt>3000)env.runtimeFaultCount=0;
    }catch(err){
      handleRuntimeFault(err);
    }
  }
  return {simulateStep,handleRuntimeFault,tick};
  }
  return {create};
});