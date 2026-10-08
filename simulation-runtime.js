/* simulation-runtime: existing engine behaviour with an explicit live-state adapter. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.BadFodderSimulationRuntime=api;
})(typeof window!=='undefined'?window:globalThis,function(){
  'use strict';
  function create(env){
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
    env.squad.forEach((s,i)=>{s.aiming=env.actionAllowed('firearms')&&(env.rightHeld||env.macFireHeld||env.keyboardFireHeld||env.touchState.fireHeld);s.streetActor=env.missionController?.state.actors.get('player-'+i)});
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

  function handleRuntimeFault(err){
    const now=performance.now();
    env.runtimeFaultTotal++;
    const fault=BadFodderRuntime.fault({time:now,last:env.runtimeFaultAt,count:env.runtimeFaultCount});
    env.runtimeFaultAt=fault.at;env.runtimeFaultCount=fault.count;
    env.diagnostics.rememberFault(err);
    console.error('If I Can Shoot Rabbits runtime fault',err);
    env.releaseInterruptedInput();
    env.simulationAccumulator=0;

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
      env.simulationAccumulator=BadFodderRuntime.fixedFrame({dt:frameDt,accumulator:env.simulationAccumulator,fixedDt:env.FIXED_DT,maxSteps:env.MAX_CATCHUP_STEPS,simulate:simulateStep,onSteps:env.diagnostics.steps,active:env.commands?.mode!=='client'&&env.started&&!env.finished&&((env.commands?.mode==='host')||(!env.menuOpen&&!env.paused&&!env.mapOpen))});
      const simulatedAt=env.diagnostics.enabled?performance.now():0;

      if(env.commands?.mode==='client'){
        if(env.started&&!env.menuOpen&&!env.paused&&!env.finished&&!env.mapOpen){env.applyTouchMovement(frameDt);if((env.rightHeld||env.macFireHeld||env.keyboardFireHeld)&&env.cursorWorld&&!env.bothLatched)env.squadFireAt(env.cursorWorld.x,env.cursorWorld.y);if(env.touchState.fireHeld)env.fireMobile();}
        window.BadFodderCoop?.clientFrame(frameDt);
      }
      BadFodderRuntime.renderFrame({started:env.started,menuOpen:env.menuOpen,draw:env.drawWorld});
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
