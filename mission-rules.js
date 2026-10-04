/* Shared mission objective rules for If I Can Shoot Rabbits.
   Browser: window.BadFodderMissionRules
   Node: require('./mission-rules.js') */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.BadFodderMissionRules=api;
  if(root&&root.document&&!root.BadFodderCheckpointFortification){
    const script=root.document.createElement('script');
    script.src='checkpoint-fortification.js?v=20261004-circle-1';
    script.async=false;
    root.document.head.appendChild(script);
  }
})(typeof window!=='undefined'?window:globalThis,function(){
  'use strict';

  function pointInCircle(x,y,z){
    return !!z&&Math.hypot(x-z.x,y-z.y)<=z.r;
  }

  function phaseDefenders(phase,enemies){
    if(!phase||!phase.defenderGroup)return null;
    return enemies.filter(e=>e.alive&&e.objectiveGroup===phase.defenderGroup);
  }

  function evaluatePhase({phase,living,enemies,zones,scale=1}){
    const remaining=enemies.filter(e=>e.alive).length;
    if(!phase)return{complete:true,ready:true,status:'Mission complete.'};

    const zone=phase.zone?zones[phase.zone]||null:null;
    const inZone=!!(zone&&living.some(s=>pointInCircle(s.x,s.y,zone)));

    if(phase.type==='reach'){
      return{complete:inZone,ready:inZone,inZone,status:phase.brief};
    }

    if(phase.type==='secure-zone'||phase.type==='eliminate-and-reach'){
      const assigned=phaseDefenders(phase,enemies);
      const radius=(phase.radius||160)*scale;
      const defenders=assigned||(
        zone?enemies.filter(e=>e.alive&&Math.hypot(e.x-zone.x,e.y-zone.y)<radius):[]
      );
      const contestRadius=(phase.contestRadius||75)*scale;
      const contesters=zone&&defenders.length===0
        ?enemies.filter(e=>e.alive&&Math.hypot(e.x-zone.x,e.y-zone.y)<contestRadius)
        :[];
      const ready=inZone&&defenders.length===0&&contesters.length===0;

      let detail='';
      if(defenders.length){
        const label=phase.type==='eliminate-and-reach'?'final defender':'assigned defender';
        detail=defenders.length+' '+label+(defenders.length===1?'':'s')+' remain.';
      }else if(!inZone){
        detail='Area clear — move the squad into the objective.';
      }else if(contesters.length){
        detail='Objective contested by '+contesters.length+' nearby hostile'+(contesters.length===1?'':'s')+'.';
      }else{
        detail=phase.hold?'Area clear — hold position.':'Area secured.';
      }

      return{
        complete:ready&&!phase.hold,
        ready,inZone,contested:contesters.length>0,
        defenders:defenders.length,contesters:contesters.length,
        status:phase.brief+' '+detail
      };
    }

    if(phase.type==='eliminate'){
      const ready=remaining===0;
      return{complete:ready,ready,status:phase.brief+' '+remaining+' hostile'+(remaining===1?'':'s')+' remain.'};
    }

    if(phase.type==='destroy'||phase.type==='rescue'||phase.type==='protect'){
      return{complete:false,ready:false,status:phase.brief};
    }

    return{complete:false,ready:false,status:phase.brief||phase.title||'Complete the objective.'};
  }

  function advanceHold(phase,result,holdTime,dt){
    if(!phase||!phase.hold)return{holdTime:0,complete:!!result.complete};
    const next=result.ready?Math.min(phase.hold,holdTime+dt):0;
    return{holdTime:next,complete:next>=phase.hold};
  }

  function phaseStatus(phase,result,holdTime){
    if(!phase||!result)return'Mission complete.';
    if(result.ready&&phase.hold){
      const left=Math.max(0,phase.hold-holdTime);
      return result.status+' Hold '+left.toFixed(1)+'s.';
    }
    return result.status;
  }

  return{pointInCircle,phaseDefenders,evaluatePhase,advanceHold,phaseStatus};
});
