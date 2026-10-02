/* Cable Street phase director.
   Owns historical mission progression without reusing military objective rules. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.BadFodderCableDirector=api;
})(typeof window!=='undefined'?window:globalThis,function(){
  'use strict';

  const DEFAULTS=Object.freeze({
    gatheringMaterialDeliveries:1,
    gatheringRescues:1,
    regroupStableSeconds:8,
    finalHoldSeconds:null,
    repeatPressureDelay:6,
    minimumRegroupIntegrityRatio:.25
  });

  function clamp(n,min,max){return Math.max(min,Math.min(max,n))}
  function finitePoint(v){return !!v&&Number.isFinite(v.x)&&Number.isFinite(v.y)}
  function distance(a,b){return finitePoint(a)&&finitePoint(b)?Math.hypot(a.x-b.x,a.y-b.y):Infinity}

  function create({controller,mission,options={}}={}){
    if(!controller||!controller.state)throw new Error('Cable Street director requires a mission controller.');
    if(!mission||mission.id!=='cable-street-1936')throw new Error('Cable Street director requires the Cable Street mission.');
    if(!Array.isArray(mission.phases)||mission.phases.length<4)throw new Error('Cable Street director requires four mission phases.');

    const settings={...DEFAULTS,...options};
    const finalPhase=mission.phases.find(p=>p.id==='they-shall-not-pass')||mission.phases[3];
    const finalHoldTarget=Number.isFinite(settings.finalHoldSeconds)&&settings.finalHoldSeconds>0
      ?settings.finalHoldSeconds
      :(Number.isFinite(finalPhase.proposedHoldSeconds)&&finalPhase.proposedHoldSeconds>0?finalPhase.proposedHoldSeconds:240);

    const state={
      phaseIndex:0,
      phaseElapsed:0,
      eventCursor:0,
      materialDeliveries:0,
      rescues:0,
      holdSignals:0,
      pressureCycles:0,
      breaches:0,
      gatheringReady:false,
      holdSignalsWhenReady:0,
      pressureCyclesAtPhaseStart:0,
      regroupStableSeconds:0,
      finalHoldSeconds:0,
      completed:false,
      failed:false,
      breachSeconds:0,
      waveCooldowns:new Map()
    };

    function phase(){return mission.phases[state.phaseIndex]||null}

    function mainBarricade(){
      const preferred=options.mainBarricadeId||
        (Array.isArray(mission.defencePositions)&&mission.defencePositions.find(x=>x.role==='christian-street-defence')||{}).id;
      if(preferred&&controller.state.barricades.has(preferred))return controller.state.barricades.get(preferred);
      return controller.state.barricades.values().next().value||null;
    }

    function activeActors(){
      return[...controller.state.actors.values()].filter(a=>a&&a.active!==false&&finitePoint(a));
    }

    function defenceVisited(){
      const b=mainBarricade();
      if(!b)return false;
      const p=finitePoint(b)?b:(Array.isArray(b.points)&&b.points.length
        ?{x:b.points.reduce((sum,x)=>sum+x[0],0)/b.points.length,y:b.points.reduce((sum,x)=>sum+x[1],0)/b.points.length}
        :null);
      if(!p)return false;
      const radius=Number.isFinite(b.interactionRadius)?b.interactionRadius:48;
      return activeActors().some(a=>distance(a,p)<=radius+12);
    }

    function setConfidence(delta){
      if(!Number.isFinite(controller.state.confidence))controller.state.confidence=.65;
      controller.state.confidence=clamp(controller.state.confidence+delta,0,1);
    }

    function consumeEvents(){
      const events=controller.state.events||[];
      while(state.eventCursor<events.length){
        const event=events[state.eventCursor++];
        if(!event)continue;
        if(event.type==='barricade-reinforced'){
          state.materialDeliveries++;
          setConfidence(.025);
        }else if(event.type==='civilian-exited'){
          state.rescues++;
          setConfidence(.04);
        }else if(event.type==='barricade-held'){
          state.holdSignals++;
          setConfidence(.01);
        }else if(event.type==='barricade-breach-change'){
          if(event.breached){state.breaches++;setConfidence(-.14)}
          else setConfidence(.03);
        }else if(event.type==='police-state'&&event.state==='regroup'){
          state.pressureCycles++;
          setConfidence(.035);
        }
      }
    }

    function resetFormationForPressure(formation){
      if(!formation)return false;
      if(!Number.isFinite(formation.x)||!Number.isFinite(formation.y)||
         !Number.isFinite(formation.targetX)||!Number.isFinite(formation.targetY))return false;
      formation.state='approach';
      formation.stateTime=0;
      return true;
    }

    function startPressureWave(){
      let started=0;
      controller.state.formations.forEach(f=>{if(resetFormationForPressure(f))started++});
      if(started){
        controller.state.pressureStarted=true;
        controller.state.events.push({type:'pressure-wave-start',phaseId:phase()&&phase().id,count:started});
      }
      return started;
    }

    function enterPhase(index){
      if(index<=state.phaseIndex||index>=mission.phases.length)return false;
      state.phaseIndex=index;
      state.phaseElapsed=0;
      state.regroupStableSeconds=0;
      state.pressureCyclesAtPhaseStart=state.pressureCycles;
      state.waveCooldowns.clear();
      controller.state.phaseIndex=index;
      controller.state.events.push({type:'mission-phase-change',phaseIndex:index,phaseId:mission.phases[index].id});
      if(index===1||index===3)startPressureWave();
      return true;
    }

    function gatheringReady(){
      return defenceVisited()&&
        state.materialDeliveries>=settings.gatheringMaterialDeliveries&&
        state.rescues>=settings.gatheringRescues;
    }

    function allPressureWithdrawing(){
      const formations=[...controller.state.formations.values()];
      return formations.length>0&&formations.every(f=>f.state==='withdraw');
    }

    function updateGathering(){
      const ready=gatheringReady();
      if(ready&&!state.gatheringReady){
        state.gatheringReady=true;
        state.holdSignalsWhenReady=state.holdSignals;
        controller.state.events.push({type:'gathering-ready'});
      }
      if(state.gatheringReady&&state.holdSignals>state.holdSignalsWhenReady)enterPhase(1);
    }

    function updateHoldApproach(){
      if(!controller.state.pressureStarted)startPressureWave();
      if(state.pressureCycles>state.pressureCyclesAtPhaseStart)enterPhase(2);
    }

    function updateRegroup(dt){
      const b=mainBarricade();
      if(!b)return;
      const integrityRatio=b.maxIntegrity>0?b.integrity/b.maxIntegrity:0;
      const atRegroup=!finitePoint(options.regroupPoint)||activeActors().some(a=>distance(a,options.regroupPoint)<(options.regroupRadius||40));
      const stable=atRegroup&&!b.breached&&integrityRatio>=settings.minimumRegroupIntegrityRatio&&allPressureWithdrawing();
      if(stable)state.regroupStableSeconds+=dt;
      else state.regroupStableSeconds=0;
      if(state.regroupStableSeconds>=settings.regroupStableSeconds)enterPhase(3);
    }

    function updateRepeatedPressure(dt){
      controller.state.formations.forEach(f=>{
        if(f.state!=='withdraw'){
          state.waveCooldowns.delete(f.id);
          return;
        }
        const atWithdraw=Number.isFinite(f.withdrawX)&&Number.isFinite(f.withdrawY)&&
          Math.hypot(f.x-f.withdrawX,f.y-f.withdrawY)<=Math.max(4,Number(f.stopDistance)||0);
        if(!atWithdraw){state.waveCooldowns.delete(f.id);return}
        const next=(state.waveCooldowns.get(f.id)||0)+dt;
        if(next>=settings.repeatPressureDelay){
          state.waveCooldowns.set(f.id,0);
          resetFormationForPressure(f);
          controller.state.events.push({type:'pressure-wave-repeat',formationId:f.id});
        }else state.waveCooldowns.set(f.id,next);
      });
    }

    function updateFinal(dt){
      updateRepeatedPressure(dt);
      const b=mainBarricade();
      if(!b)return;
      if(!b.breached){
        state.finalHoldSeconds=Math.min(finalHoldTarget,state.finalHoldSeconds+dt);
      }
      if(state.finalHoldSeconds>=finalHoldTarget){
        state.completed=true;
        controller.state.events.push({type:'mission-complete',missionId:mission.id});
      }
    }

    function fixedUpdate(dt){
      if(state.completed||state.failed||!Number.isFinite(dt)||dt<=0)return state.completed;
      state.phaseElapsed+=dt;
      consumeEvents();
      const b=mainBarricade();
      if(state.phaseIndex>0&&b&&b.breached){
        state.breachSeconds+=dt;
        if(state.breachSeconds>=(mission.breachRecoverySeconds||30)){
          state.failed=true;controller.state.events.push({type:'mission-failed',reason:'route-open'});return false;
        }
      }else state.breachSeconds=0;
      if(state.phaseIndex===0)updateGathering();
      else if(state.phaseIndex===1)updateHoldApproach();
      else if(state.phaseIndex===2)updateRegroup(dt);
      else if(state.phaseIndex===3)updateFinal(dt);
      consumeEvents();
      return state.completed;
    }

    function objectiveState(){
      const p=phase();
      const b=mainBarricade();
      const barricadeIntact=!!b&&!b.breached;
      if(!p)return[];
      if(p.id==='gathering')return[
        {id:'reach-main-defence',label:'Reach the main defence',done:defenceVisited()},
        {id:'deliver-material-load',label:'Deliver material',done:state.materialDeliveries>=settings.gatheringMaterialDeliveries},
        {id:'assist-resident',label:'Assist a resident',done:state.rescues>=settings.gatheringRescues},
        {id:'start-pressure',label:'Take position and hold',done:state.phaseIndex>0}
      ];
      if(p.id==='hold-approach')return[
        {id:'hold-main-defence',label:'Keep the main defence contested',done:barricadeIntact},
        {id:'first-pressure',label:'Withstand the first pressure',done:state.pressureCycles>state.pressureCyclesAtPhaseStart}
      ];
      if(p.id==='regroup')return[
        {id:'restore-defence',label:'Restore the main defence',done:barricadeIntact},
        {id:'regroup-pressure',label:'Let the pressure withdraw',done:allPressureWithdrawing()},
        {id:'stabilise',label:'Stabilise the position',done:state.regroupStableSeconds>=settings.regroupStableSeconds}
      ];
      return[
        {id:'final-route',label:'Keep the final route blocked',done:state.completed}
      ];
    }

    function statusText(){
      if(state.failed)return'Local defence lost. Retry to help keep the route blocked.';
      if(state.breachSeconds>0)return'BREACH: bring material to rebuild within '+Math.ceil((mission.breachRecoverySeconds||30)-state.breachSeconds)+'s.';
      const p=phase();
      if(!p)return'Cable Street';
      if(p.id==='gathering'){
        if(!state.gatheringReady)return'Gathering: reach the defence, deliver material and assist a resident.';
        return'Gathering: take position at the barricade and HOLD to begin.';
      }
      if(p.id==='hold-approach')return'Hold the approach: withstand the first pressure.';
      if(p.id==='regroup')return'Regroup: move to the marked point, restore the barricade and let police withdraw.';
      const remaining=Math.max(0,Math.ceil(finalHoldTarget-state.finalHoldSeconds));
      return'They Shall Not Pass: keep the route blocked for '+remaining+'s.';
    }

    function snapshot(){
      const b=mainBarricade();
      const barricadeIntegrity=b&&Number.isFinite(b.integrity)?b.integrity:0;
      const barricadeMaxIntegrity=b&&Number.isFinite(b.maxIntegrity)&&b.maxIntegrity>0?b.maxIntegrity:0;
      return{
        phaseIndex:state.phaseIndex,
        phaseId:phase()&&phase().id||null,
        phaseTitle:phase()&&phase().title||'',
        objectives:objectiveState(),
        materialDeliveries:state.materialDeliveries,
        rescues:state.rescues,
        pressureCycles:state.pressureCycles,
        breaches:state.breaches,
        barricadeIntegrity,
        barricadeMaxIntegrity,
        barricadeRatio:barricadeMaxIntegrity>0?clamp(barricadeIntegrity/barricadeMaxIntegrity,0,1):0,
        confidence:controller.state.confidence,
        regroupStableSeconds:state.regroupStableSeconds,
        finalHoldSeconds:state.finalHoldSeconds,
        finalHoldTarget,
        completed:state.completed,
        failed:state.failed,
        breachSeconds:state.breachSeconds,
        status:statusText()
      };
    }

    controller.state.phaseIndex=0;
    return{settings,state,fixedUpdate,snapshot,statusText,startPressureWave,enterPhase};
  }

  return{create,DEFAULTS};
});
