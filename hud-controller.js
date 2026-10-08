/* hud-controller: existing engine behaviour with an explicit live-state adapter. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.BadFodderHudController=api;
})(typeof window!=='undefined'?window:globalThis,function(){
  'use strict';
  function create(env){
  let noticePriority=0,noticeRuntime=null;
  function setStatus(text,priority=0){
    if(env.badBelzigRuntime&&noticeRuntime!==env.badBelzigRuntime){noticeRuntime=env.badBelzigRuntime;noticePriority=0;}
    if(env.badBelzigRuntime&&!env.finished&&performance.now()<env.hudNoticeUntil&&priority<noticePriority)return;
    noticePriority=priority;
    if(env.statusEl.textContent!==text)env.statusEl.textContent=text;
    const phaseLine=/^Phase\s+\d+:/.test(text),missionLine=/^Mission (complete|failed)/i.test(text);
    if(phaseLine||missionLine){
      const brief=text.replace(/^Phase\s+\d+:\s*/,'');
      if(env.hudMission.textContent!==brief)env.hudMission.textContent=brief;
      return;
    }
    if(env.hudNotice){
      env.hudNotice.textContent=text;
      env.hudNotice.classList.add('show');
      env.hudNoticeUntil=performance.now()+2400;
    }
  }

  function updateHudNotice(now){
    if(env.hudNotice&&env.hudNotice.classList.contains('show')&&now>=env.hudNoticeUntil){
      env.hudNotice.classList.remove('show');
    }
  }

  function updateHistoricalActionButton(){
    if(!env.touchAction)return;
    const selected=env.selectedHistoricalActor();
    const enabled=!!(env.missionInteractionLayer&&selected&&!env.menuOpen&&!env.paused&&!env.finished&&!env.mapOpen);
    const civilianHint=env.contextAction(selected?.unit)?.label||'';
    env.touchAction.hidden=!env.missionInteractionLayer&&!civilianHint;
    env.touchAction.disabled=env.missionInteractionLayer?!enabled:!civilianHint||env.menuOpen||env.paused||env.finished||env.mapOpen;
    env.touchAction.textContent=env.missionInteractionLayer&&selected?env.missionInteractionLayer.hint(selected.id):civilianHint||'ACTION';
    env.touchDrop.hidden=!env.missionInteractionLayer;env.touchDrop.disabled=!enabled;
    env.touchDrop.textContent=selected&&env.missionController?.state.actors.get(selected.id)?.carrying?'DROP':'CANCEL';
  }

  function rebuildUnitButtons(){
    env.unitButtons.forEach(b=>b.remove());
    env.unitButtons=env.squad.map((s,i)=>{
      const b=document.createElement('button');
      b.className='unitBtn';
      b.dataset.unit=String(i);
      b.type='button';
      b.textContent=(i+1)+' '+s.name;
      b.addEventListener('click',evt=>(evt.shiftKey||evt.ctrlKey||evt.metaKey)?env.toggleSelection(i):env.setSelection(i));
      env.selectAllBtn.parentElement.appendChild(b);
      return b;
    });
  }

  function updateRoster(force=false){
    const signature=env.squad.map((s,i)=>[
      i,s.companionState,env.companions?.order,env.commands?.owner?.(i),s.alive?1:0,s.hp,s.maxHp,s.selected?1:0,s.downed?1:0,(s.suppression||0)>=.55?1:0,s.coverMask||0,env.missionController?Math.round((env.missionController.state.actors.get('player-'+i)?.stamina??100)/10):0
    ].join(':')).join('|');
    if(!force&&signature===env.lastRosterSignature)return;
    env.lastRosterSignature=signature;

    env.rosterEl.innerHTML='';


    env.squad.forEach((s,i)=>{
      const d=document.createElement('div');
      d.className='card'+(s.selected?' selected':'');
      d.innerHTML='<strong>'+(i+1)+' '+s.name+'</strong><div>'+(s.alive?'HP '+s.hp+'/'+s.maxHp:env.badBelzigRuntime?'DEAD':'DOWN')+'</div><div>'+(s.alive&&env.actionAllowed('firearms')?'Machine gun ∞':'')+'</div>';
      env.rosterEl.appendChild(d);

      let chip=env.hudChips.get(i);
      if(!chip){
        chip=document.createElement('button');chip.type='button';
        chip.addEventListener('click',()=>env.toggleSelection(i));env.hudChips.set(i,chip);env.hudSquadBar.appendChild(chip);
      }
      chip.className='hud-unit'+(s.selected?' selected':'')+(s.alive&&!(env.badBelzigRuntime&&s.downed)?'':' down');
      const energy=env.missionController?Math.round((env.missionController.state.actors.get('player-'+i)?.stamina??100)/10)*10:null;
      chip.setAttribute('aria-label',(s.alive?'Select ':env.badBelzigRuntime?'Dead: ':'Down: ')+s.name+(energy===null?', health '+s.hp+' of '+s.maxHp:', energy '+energy+' percent'));
      const cachedPortrait=chip.querySelector('canvas');
      chip.setAttribute('aria-pressed',String(s.selected));chip.disabled=!s.alive||s.downed||!!(env.commands&&!env.commands.owns(i));
      chip.title=s.name+' · '+s.occupation+' · '+s.trait.toLowerCase();
      const hp=Array.from({length:energy===null?s.maxHp:10},(_,h)=>'<i class="'+(h<(energy===null?s.hp:energy/10)?((energy===null?s.hp<=2:energy<30)?'on low':'on'):'')+'"></i>').join('');
      chip.innerHTML='<span class="hud-unit-info"><span class="hud-name"><em>'+(i+1)+'</em>'+s.name+(env.commands&&env.commands.mode!=='local'&&env.commands.owner(i)>=0?' P'+(env.commands.owner(i)+1):'')+'</span><span class="hud-health">'+hp+'</span><span class="hud-state">'+(s.alive?(s.selected?'YOU ▸ ':env.commands?.owner(i)>=0?'P'+(env.commands.owner(i)+1)+' ':'AI ')+(s.downed?'DOWN + ':s.carryingUnit?'CARRYING + ':(s.suppression||0)>=.55?'PINNED ! ':s.coverMask?'COVER ◇ ':s.manualGarrison?'HOLD ◇ ':s.companionState?s.companionState+' ':'')+(energy===null?'HP '+s.hp+'/'+s.maxHp:'ENERGY '+energy+'%'):env.badBelzigRuntime?'DEAD ×':'DOWN ×')+'</span></span>';
      const portrait=cachedPortrait||document.createElement('canvas');portrait.width=96;portrait.height=96;portrait.className='hud-portrait';
      const pg=portrait.getContext('2d');pg.imageSmoothingEnabled=true;pg.drawImage(env.art.missionPortrait?env.art.missionPortrait(env.missionIdentity.key,i,s.alive?'idle':'dead'):env.art.soldier(env.missionController?'civilian':'squad',2,s.alive?0:2,s.alive?'idle':'dead',i),0,0,96,96);
      chip.insertBefore(portrait,chip.firstChild);

    });
  }

  function rebuildHudProgress(count){
    const current=env.hudProgress.querySelectorAll('i').length;
    if(current===count)return;
    env.hudProgress.innerHTML='';
    for(let i=0;i<count;i++)env.hudProgress.appendChild(document.createElement('i'));
  }

  function updateHud(force=false){
    const hudNow=performance.now();
    if(!force&&hudNow<env.nextHudUpdate)return;
    env.nextHudUpdate=hudNow+100;
    const mission=env.activeMission();
    const phases=mission.phases||[];
    const objectiveRows=env.missionObjectivesRuntime?.manager.all().filter(o=>!o.optional)||[];
    const phaseCount=Math.max(1,objectiveRows.length||phases.length);
    const living=env.squad.filter(s=>s.alive);
    const remaining=env.enemies.filter(e=>e.alive&&!e.surrendered).length;
    const currentPhase=env.currentObjectivePhase();
    const objectiveIndex=objectiveRows.findIndex(o=>o.id===currentPhase?.id);
    const objectiveDefenders=currentPhase?env.phaseDefenders(currentPhase):null;
    const belzig=env.badBelzigRuntime?.presentation?.();
    const targetCount=belzig?belzig.threats:objectiveDefenders?objectiveDefenders.length:remaining;

    env.hudCampaign.textContent=env.missionLaunch.isHistorical()
      ?env.missionIdentity.title+' · '+env.missionIdentity.year
      :'MISSION '+String(env.activeMissionIndex+1).padStart(2,'0')+'/'+String(env.campaign.missions.length).padStart(2,'0')+' · '+mission.title.toUpperCase();
    const historicalMode=env.missionLaunch.isHistorical();
    env.hudAll.querySelector('span').textContent='NEXT · '+(env.companions?.order||'FOLLOW');
    env.hudSquadLabel.textContent=historicalMode?'VOLUNTEERS':'SQUAD';
    env.hudStage.textContent=env.finished?(env.win?(env.badBelzigRuntime?.finish?'HOME: WHAT REMAINS':'MISSION COMPLETE'):'MISSION FAILED'):'OBJECTIVE '+Math.min(phaseCount,(objectiveIndex<0?env.missionStage:objectiveIndex)+1)+'/'+phaseCount;
    rebuildHudProgress(phaseCount);
    env.hudProgress.querySelectorAll('i').forEach((p,i)=>{p.className=env.win||objectiveRows[i]?.status==='COMPLETED'?'done':objectiveRows[i]?.status==='ACTIVE'?'current':'';});

    const stats=[living.length,env.squad.length,remaining,targetCount,env.squadGrenades,mission.id,env.missionStage].join('|');
    if(force||stats!==env.lastHudStats){
      env.lastHudStats=stats;
      env.squadCountEl.textContent=living.length;
      env.squadMaxEl.textContent=env.squad.length;
      env.enemyCountEl.textContent=remaining;
      env.grenadeCountEl.textContent=env.squadGrenades;
      env.hudSquad.textContent=living.length;
      env.hudEnemies.textContent=targetCount;
      env.hudGrenades.textContent=env.squadGrenades;
    }

    updateRoster(force);
    updateHistoricalActionButton();
    if(env.finished)return;

    if(env.missionDirector){
      const historicalProgress=env.missionDirector.snapshot();
      env.missionStage=historicalProgress.phaseIndex;
      env.hudProgress.querySelectorAll('i').forEach((p,i)=>{
        p.className=i<env.missionStage?'done':i===env.missionStage?'current':'';
      });
      env.hudStage.textContent='PHASE '+Math.min(phaseCount,env.missionStage+1)+'/'+phaseCount;
      env.hudEnemyLabel.textContent='DEFENCE';
      env.hudGrenadeLabel.textContent='ENERGY';
      env.hudEnemies.textContent=Math.round(historicalProgress.barricadeRatio*100)+'%';
      env.hudEnemyLabel.textContent=historicalProgress.threat?.id==='S'?'SIDE DEFENCE':'MAIN DEFENCE';
      if(historicalProgress.threat)env.hudEnemies.textContent=Math.round(historicalProgress.threat.integrity)+'%';
      const selected=env.selectedHistoricalActor();
      env.hudGrenades.textContent=Math.round(selected?(env.missionController.state.actors.get(selected.id)?.stamina??100):0)+'%';
      const nextHistoricalObjective=historicalProgress.objectives.find(o=>!o.done);
      const threat=historicalProgress.threat;
      const historicalBrief=env.missionStage===0?'BUILD: '+historicalProgress.materialDeliveries+'/'+historicalProgress.buildsRequired+' loads · CHARGE IN '+historicalProgress.buildSecondsLeft+'s'
        :env.missionStage===3?'HOLD THE ROUTE: '+Math.ceil(historicalProgress.finalHoldTarget-historicalProgress.finalHoldSeconds)+'s'
        :env.missionStage===2?'REGROUP: repair both defences':(threat?.id==='S'?'SIDE STREET UNDER ATTACK':'MAIN BARRICADE UNDER ATTACK');
      const instructionEl=document.getElementById('hudInstruction');
      instructionEl.hidden=false;
      const hint=historicalProgress.breachSeconds>0?'REBUILD '+(historicalProgress.barricades.find(b=>b.breachSeconds>0)?.id==='S'?'SIDE STREET':'MAIN DEFENCE')+': '+Math.ceil((env.activeMission().breachRecoverySeconds||30)-historicalProgress.breachSeconds)+'s · E / ACTION with material'
        :env.missionStage===2?(nextHistoricalObjective?.label||'Regroup and repair')+' · E / ACTION'
        :env.missionStage===0?'E / ACTION: pick up, then deliver. Rescues earn repairs.'
        :(threat?.id==='S'?'SIDE STREET: ':'MAIN DEFENCE: ')+'F / SHOVE · G / THROW · E: build · Breach '+(env.activeMission().breachRecoverySeconds||30)+'s = defeat';
      if(instructionEl.textContent!==hint)instructionEl.textContent=hint;
      if(env.hudMission.textContent!==historicalBrief)env.hudMission.textContent=historicalBrief;
      const instruction=historicalProgress.instruction||historicalProgress.status;
      if(env.statusEl.textContent!==instruction)env.statusEl.textContent=instruction;
      return;
    }
    if(belzig){env.hudMission.textContent=belzig.title;env.statusEl.textContent=belzig.instruction;const line=document.getElementById('hudInstruction');line.hidden=!belzig.warning;line.textContent=belzig.warning;env.hudEnemyLabel.textContent='NEARBY THREATS';env.hudGrenadeLabel.textContent='GRENADES';return;}
    const civCounts=env.civilianRuntime?.counts();
    if(env.barcelonaRuntime){const instruction=document.getElementById('hudInstruction');instruction.hidden=false;const ammo=env.barcelonaRuntime.ammoStatus(env.selectedUnits());instruction.textContent=env.barcelonaRuntime.guidance().text+(['LOW','CRITICAL','EMPTY'].includes(ammo.level)?' '+ammo.level+' AMMO: '+ammo.total+'.':'');}
    if(!env.barcelonaRuntime)document.getElementById('hudInstruction').hidden=!civCounts?.total;
    if(civCounts?.total&&!env.barcelonaRuntime)document.getElementById('hudInstruction').textContent='CIVILIANS '+civCounts.evacuated+'/'+civCounts.total+' SAFE · '+civCounts.lost+' LOST · E / ACTION: gather or hide';
    const belzigInstruction=env.badBelzigRuntime?.instruction?.();if(belzigInstruction){document.getElementById('hudInstruction').hidden=false;document.getElementById('hudInstruction').textContent=belzigInstruction;}
    env.hudEnemyLabel.textContent='TARGETS';
    env.hudGrenadeLabel.textContent='GRENADES';

    const phase=env.currentObjectivePhase();
    if(!phase)return;
    const result=env.missionObjectivesRuntime.evaluate(env.missionObjectivesRuntime.manager.current(),{living,enemies:env.enemies,zones:env.zones,scale:env.S(1)});
    if(env.barcelonaRuntime){env.hudMission.textContent=phase.title;return;}
    setStatus('Phase '+(env.missionStage+1)+': '+env.phaseStatus(phase,result));
  }
  return {setStatus,updateHudNotice,rebuildUnitButtons,updateRoster,rebuildHudProgress,updateHistoricalActionButton,updateHud};
  }
  return {create};
});
