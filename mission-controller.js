/* mission-controller: existing engine behaviour with an explicit live-state adapter. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.BadFodderMissionController=api;
})(typeof window!=='undefined'?window:globalThis,function(){
  'use strict';
  function create(env){
  const experience=()=>typeof window!=='undefined'?window.BadFodderExperience:null;
  const missionKey=()=>env.activeMission?.()?.map||env.activeMission?.()?.id||env.MAP_DATA?.key||'';
  const campaignMode=()=>!!env.missionLaunch?.isCampaign?.();
  const localCampaign=()=>campaignMode()&&(!env.commands||env.commands.mode==='local');
  function experienceState(state,key=missionKey()){try{experience()?.setState?.(state,key)}catch(_){}}
  function togglePause(){
    if(env.commands?.mode==='host'){env.setStatus('Co-op continues while the menu is open.');}
    if(env.finished||!env.started)return;
    if(env.menuOpen){if(env.menu&&env.menu.mode==='pause')resumeMission();return;}
    env.lifecycle.transition('PAUSED');experienceState('PAUSED');
    env.releaseAllFireInputs();
    env.releaseTouchMove();
    env.pauseBtn.textContent='Resume (Enter)';
    if(env.menu)env.menu.show('pause');
    env.syncTouchControlState();
  }

  function canResumeMission(){
    return env.started&&!env.finished&&!env.runtimeSafeStop&&env.squad.some(s=>s.alive)&&(!env.missionController||!env.missionController.disposed);
  }

  function resumeMission(){
    window.BadFodderSfx?.unlock();
    if(!canResumeMission())return;
    window.BadFodderMusic?.playMission(env.activeMission());experienceState('PLAYING');
    env.simulationAccumulator=0;env.last=performance.now();
    env.releaseInterruptedInput();
    env.lifecycle.transition('PLAYING');
    env.pauseBtn.textContent='Pause (Enter)';
    env.menu.close();env.syncTouchControlState();env.root.focus({preventScroll:true});
  }

  function beginMission(){
    env.diagnostics.start();
    if(env.commands&&env.commands.mode!=='local'&&!env.commands.applying){window.BadFodderCoop?.restart();return;}
    window.BadFodderSfx?.unlock();
    if(!env.started)return;
    window.BadFodderMusic?.playMission(env.activeMission());
    try{env.resetGame()}catch(err){env.runtimeFaultCount=2;env.handleRuntimeFault(err);return}
    try{
      const xp=experience(),history=xp?.continuity?.()?.history||[],last=history[history.length-1];
      // Campaign chapters use different people and eras. Carry wounds only when replaying the same cast,
      // while still recording every chapter in the wider campaign chronicle.
      const resumeSameCast=localCampaign()&&last?.mission===missionKey();
      xp?.missionStart?.({campaign:resumeSameCast,key:missionKey(),squad:env.squad});
    }catch(_){}
    env.lifecycle.transition('PLAYING');experienceState('PLAYING');
    env.menu.close();env.syncTouchControlState();env.root.focus({preventScroll:true});
    env.refreshCursorWorld();
  }

  function requestMissionBriefing(mission,begin,back='missions'){
    env.releaseInterruptedInput();env.lifecycle.transition('BRIEFING');experienceState('BRIEFING',mission?.map||mission?.id||'');env.mapOpen=false;env.simulationAccumulator=0;
    env.menu.showBriefing(BadFodderIdentities.get(mission),begin,back);env.syncTouchControlState();
    void BadFodderMissionAssets.load(mission.map).catch(()=>env.setStatus('Mission preload failed. Begin Mission retries the load.'));
  }

  function startCampaignFromMenu(skipIntro=false){
    const intro=typeof window!=='undefined'?window.BadFodderCampaignIntro:null;
    const debug=typeof window!=='undefined'&&new URLSearchParams(window.location.search).has('debug');
    if(!skipIntro&&!debug&&intro?.play){intro.play(()=>startCampaignFromMenu(true));return;}
    if(env.commands&&env.commands.mode!=='local')showTitle();
    let next=env.campaign.state.current;while(next<env.campaign.state.unlocked&&env.campaign.state.completed.includes(next))next++;
    requestMissionBriefing(env.campaign.missions[next]||env.campaign.missions[0],()=>{env.campaign.setCurrent(next);launchCampaign();},'main');
  }

  function startStandaloneMission(index){if(env.commands&&env.commands.mode!=='local')showTitle();if(env.campaign.missions[index]?.playable)requestMissionBriefing(env.campaign.missions[index],()=>launchStandalone(index));}

  function startHistoricalMission(id){if(env.commands&&env.commands.mode!=='local')showTitle();const m=env.historicalMissions.get(id);if(m?.playable&&m.mapReady&&BadFodderMissionAssets.has(m.map))requestMissionBriefing(m,()=>launchHistorical(id));}

  function viewMissionBriefing(){requestMissionBriefing(env.activeMission(),env.finished?beginMission:resumeMission,env.finished?'result':'main');}

  function showMissionResult(){
    window.BadFodderCoop?.flush();
    env.releaseInterruptedInput();env.lifecycle.transition('RESULT');experienceState('RESULT');env.mapOpen=false;
    env.menu.showResult(env.missionIdentity,env.win,env.win&&hasPlayableNextMission());
    let summary=null;
    if(env.barcelonaRuntime)summary=env.barcelonaRuntime.summary();
    try{experience()?.missionEnd?.({campaign:localCampaign(),key:missionKey(),squad:env.squad,win:env.win,civiliansRescued:summary?.civiliansRescued||0,civiliansLost:summary?.civiliansLost||0});experience()?.decorateResult?.()}catch(_){}
    // Authored mission aftermath remains primary; the continuity layer supplies the survivor summary above it.
    if(summary){document.getElementById('resultFlavour').textContent=summary.characters.filter(s=>s.alive).length+' neighbours survived · '+summary.characters.filter(s=>!s.alive).length+' casualties · '+summary.characters.filter(s=>s.alive&&s.health!=='FIT').length+' hurt · '+summary.alliesLost+' friendly losses · '+summary.civiliansRescued+'/'+summary.civiliansFound+' civilians rescued · '+summary.civiliansLost+' lost · '+(summary.breached?'barricade breached':'barricade standing');}
    if(!env.win&&env.badBelzigRuntime){document.getElementById('resultTitle').textContent='NO ONE CAN CONTINUE';document.getElementById('resultFlavour').textContent='No conscious survivor remains. Losing people or a route alone does not end the mission.';}
    if(env.win&&env.badBelzigRuntime?.summary){document.getElementById('resultTitle').textContent='HOME: WHAT WE COULD PROTECT';document.getElementById('resultFlavour').textContent=env.badBelzigRuntime.summary();}
    env.syncTouchControlState();
  }

  function launchCampaign(){
    if(env.missionLaunch.isCampaign()&&env.activeMissionIndex===env.campaign.state.current){
      if(env.started)beginMission();else{env.launchAfterLoad=true;startGame();}
      return;
    }
    env.missionLaunch.useCampaign();
    env.missionLaunch.requestAutoStart();
    location.reload();
  }

  function launchStandalone(index){
    const selected=env.campaign.missions[index];
    if(!selected||!selected.playable)return;
    if(env.missionLaunch.isSelection()&&env.activeMissionIndex===index&&env.started){
      beginMission();
      return;
    }
    if(!env.missionLaunch.select(index))return;
    env.missionLaunch.requestAutoStart();
    location.reload();
  }

  function launchHistorical(id){
    if(!env.missionLaunch.selectHistorical(id)){
      env.setStatus('Historical mission is not ready for play.');
      return false;
    }
    env.missionLaunch.requestAutoStart();
    location.reload();
    return true;
  }

  function showTitle(){
    env.coordinationSupport?.reset();
    env.clearSquadFormation?.(true);
    const wasCoop=env.commands&&env.commands.mode!=='local';
    window.BadFodderCoop?.leave();
    if(wasCoop&&env.started)env.resetGame();
    env.lifecycle.transition('TITLE');experienceState('TITLE','');
    env.releaseAllFireInputs();
    env.releaseInterruptedInput();env.mapOpen=false;env.simulationAccumulator=0;
    window.BadFodderMusic?.playHome();
    env.menu.show('title');env.syncTouchControlState();
  }

  function hasPlayableNextMission(){
    if(!env.missionLaunch.isCampaign())return false;
    const next=env.activeMissionIndex+1;
    return !!(env.campaign.missions[next]&&env.campaign.missions[next].playable);
  }

  function advanceCampaign(){
    if(env.commands?.mode!=='local'&&env.commands)return false;
    if(!env.finished||!env.win||!hasPlayableNextMission())return false;
    requestMissionBriefing(env.campaign.missions[env.activeMissionIndex+1],()=>{
      env.campaign.setCurrent(env.activeMissionIndex+1);env.missionLaunch.useCampaign();env.missionLaunch.requestAutoStart();location.reload();
    },'result');
    return true;
  }

  function completeCurrentMission(){
    if(env.finished)return;
    env.finished=true;env.win=true;
    if(env.commands?.mode!=='client')env.squad.filter(s=>s.alive).forEach(s=>s.experience=Math.min(24,(s.experience||0)+1));
    const mission=env.activeMission();
    if(!env.commands||env.commands.mode==='local'){if(env.missionLaunch.isCampaign())env.campaign.complete(env.activeMissionIndex);}
    env.hudStage.textContent='MISSION COMPLETE';
    const completion=env.missionLaunch.isHistorical()&&mission.successHeadline
      ?mission.successHeadline
      :mission.title+' complete.';
    if(env.badBelzigRuntime?.finish)env.setStatus(env.badBelzigRuntime.finish());else env.setStatus('Mission complete. '+completion);
    if(env.missionLaunch.isHistorical())env.hudMission.textContent=completion;
    showMissionResult();
  }

  async function startGame(){
    if(env.loadingMission)return;env.loadingMission=true;
    env.menu.close();env.lifecycle.transition('LOADING');experienceState('LOADING');env.syncTouchControlState();
    try{
      env.loadingEl.classList.remove('hidden');
      const loadingText=env.loadingEl.querySelector('span');
      if(loadingText)loadingText.textContent=env.LOW_POWER?'Preparing mobile terrain…':'Preparing '+(env.MAP_DATA.title||env.activeMission().title)+'…';

      await env.preload();
      env.resetGame();

      // Let the loading screen render before starting the expensive scenery work.
      await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));

      if(env.pathComponents){
        if(loadingText)loadingText.textContent='Preparing navigation routes…';
        env.pathComponent(Math.floor(env.squad[0].x/env.PATH_CELL),Math.floor(env.squad[0].y/env.PATH_CELL));
        env.validateMissionConnectivity();
      }

      try{
        env.bakeScenery(false);
      }catch(err){
        console.warn('High-detail scenery bake failed; retrying lightweight mode.',err);
        if(loadingText)loadingText.textContent='Preparing lightweight terrain…';
        await new Promise(resolve=>setTimeout(resolve,0));
        env.bakeScenery(true);
      }

      env.sceneryTiles.draw(env.ctx,env.camera.x,env.camera.y,env.VIEW_W/env.zoom,env.VIEW_H/env.zoom);
      env.started=true;
      env.menu.ready();
      env.loadingEl.classList.add('hidden');
      const firstPhase=env.currentObjectivePhase?.()||(env.activeMission().phases||[])[0];
      if(env.badBelzigRuntime)env.setStatus(env.badBelzigRuntime.presentation().title,2);else env.setStatus('Phase 1: '+(firstPhase?(firstPhase.brief||firstPhase.title):'Begin mission.'));
      env.syncTouchControlState();
      env.updateHud(true);
      if(env.launchAfterLoad){env.launchAfterLoad=false;beginMission();}
    }catch(err){
      console.error('If I Can Shoot Rabbits failed to start',err);
      env.started=false;env.lifecycle.transition('RECOVERY');experienceState('RECOVERY');
      env.releaseInterruptedInput();
      env.loadingEl.classList.add('hidden');
      env.menu.show('title');env.menu.fail();env.lifecycle.transition('RECOVERY');
      const loadingText=env.loadingEl.querySelector('span');
      if(loadingText)loadingText.textContent='Unable to start game. Reload the page to try again.';
      env.setStatus('Game startup failed.');
    }finally{env.loadingMission=false;}
  }
  return {togglePause,canResumeMission,resumeMission,beginMission,requestMissionBriefing,startCampaignFromMenu,startStandaloneMission,startHistoricalMission,viewMissionBriefing,showMissionResult,launchCampaign,launchStandalone,launchHistorical,showTitle,hasPlayableNextMission,advanceCampaign,completeCurrentMission,startGame};
  }
  return {create};
});
