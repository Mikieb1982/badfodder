/* Runtime adapter for shared objective rules. Existing mission controllers remain authoritative. */
(function(root,factory){
  const rules=typeof module==='object'&&module.exports?require('./mission-rules.js'):root.BadFodderMissionRules;
  const api=factory(rules);
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.BadFodderObjectives=api;
})(typeof window!=='undefined'?window:globalThis,function(rules){
  'use strict';
  function definitions(mission){
    if(mission.objectives)return mission.objectives;
    const phases=mission.phases||[];
    return phases.map((phase,index)=>({
      ...phase,id:phase.id||'phase-'+index,phase:index,
      type:phase.type||(['INTERACT','DEFEND','GARRISON','HOLD'][index]||'INTERACT'),
      requires:index?[phases[index-1].id||'phase-'+(index-1)]:[],
      marker:phase.marker||(phase.zone?{kind:'zone',id:phase.zone}:null),
      meta:{...phase.meta,legacy:!!phase.type}
    }));
  }
  function create(mission){
    const manager=rules.createObjectiveManager(definitions(mission));
    const holds=new Map();
    const signals=Object.create(null);
    manager.onChange(event=>{
      if(event.action==='reset'){holds.clear();for(const id of Object.keys(signals))delete signals[id]}
      if(event.objective&&(event.objective.status!=='ACTIVE'||['remove','replace'].includes(event.action))){holds.delete(event.objective.id);delete signals[event.objective.id]}
    });
    function phase(){return manager.current()?.phase??null}
    function marker(objective,zones={}){
      if(!objective||objective.hidden&&!objective.discovered)return null;
      const m=objective.marker;
      if(m?.kind==='zone')return zones[m.id]||null;
      if(Number.isFinite(m?.x)&&Number.isFinite(m?.y))return m;
      return objective.zone?zones[objective.zone]||null:null;
    }
    function evaluate(objective,context){
      const fact=(context.facts||{})[objective.id]??signals[objective.id];
      if(fact?.failed)return{failed:true,status:fact.text||objective.text};
      if(objective.meta?.legacy&&['reach','secure-zone','eliminate-and-reach','eliminate','destroy','rescue','protect'].includes(objective.legacyType))return rules.evaluatePhase({...context,phase:{...objective,type:objective.legacyType}});
      if(objective.eventDriven)return{ready:fact===true||fact?.complete===true,complete:fact===true||fact?.complete===true,status:fact?.text||objective.text};
      const zone=marker(objective,context.zones),living=(context.living||[]).filter(s=>s.alive!==false);
      const inside=zone?living.filter(s=>rules.pointInCircle(s.x,s.y,zone)):[];
      let ready=false;
      switch(objective.type){
        case 'REACH':case 'ESCAPE':ready=!!zone&&inside.length>0;break;
        case 'CLEAR':ready=objective.defenderGroup?rules.phaseDefenders(objective,context.enemies||[]).length===0
          :!!zone&&(context.enemies||[]).every(e=>(!e.alive||e.surrendered)||!rules.pointInCircle(e.x,e.y,zone));break;
        case 'CAPTURE':case 'HOLD':case 'DEFEND':case 'GARRISON':{
          const contested=!!zone&&(context.enemies||[]).some(e=>(e.alive&&!e.surrendered)&&rules.pointInCircle(e.x,e.y,zone));
          const defenders=rules.phaseDefenders(objective,context.enemies||[]);
          ready=inside.length>0&&!contested&&(!defenders||!defenders.length)&&(objective.type!=='GARRISON'||inside.some(s=>s.manualGarrison||s.checkpointCover));
          break;
        }
        case 'SURVIVE':ready=living.length>0;break;
        default:ready=fact===true||fact?.complete===true;
      }
      return{ready,complete:ready&&!objective.hold,status:fact?.text||objective.text};
    }
    function update(dt,context={}){
      if(!Number.isFinite(dt)||dt<0)throw new Error('Invalid objective timestep');
      if(manager.missionState().failed)return manager.missionState();
      // Newly activated objectives start on the next step, preventing accidental chain completion.
      for(const objective of manager.active()){
        const result=evaluate(objective,context);
        if(result.failed){manager.fail(objective.id,{text:result.status});continue}
        const progress=rules.advanceHold(objective,result,holds.get(objective.id)||0,dt);
        holds.set(objective.id,progress.holdTime);
        if(progress.complete){holds.delete(objective.id);manager.complete(objective.id)}
      }
      return manager.missionState();
    }
    function syncPhase(index,{completed=false,failed=false}={}){
      // Adapter for Cable Street and stage-only co-op snapshots, without replacing their rules.
      const all=manager.all();
      for(const objective of all){
        if(!Number.isInteger(objective.phase))continue;
        if((completed||objective.phase<index)&&!['COMPLETED','FAILED','SKIPPED'].includes(objective.status))manager.complete(objective.id);
      }
      const current=manager.all().find(o=>o.phase===index&&o.status==='PENDING');
      if(current)manager.activate(current.id);
      if(failed){const active=manager.current();if(active&&active.status==='ACTIVE')manager.fail(active.id)}
      return manager.missionState();
    }
    function signal(id,detail=true){
      const objective=manager.get(id);
      if(!objective||objective.status!=='ACTIVE')return false;
      signals[id]=detail;return true;
    }
    function snapshot(){return{version:1,manager:manager.snapshot(),holds:[...holds],signals:JSON.parse(JSON.stringify(signals))}}
    function restore(saved){
      if(!saved||saved.version!==1||!Array.isArray(saved.holds))throw new Error('Unsupported runtime objective snapshot');
      const candidate=rules.createObjectiveManager([],{autoActivate:false}).restore(saved.manager);
      const entries=saved.holds.map(([id,value])=>{
        const objective=candidate.get(id);
        if(!objective||objective.status!=='ACTIVE'||!Number.isFinite(value)||value<0||value>(objective.hold||0))throw new Error('Invalid objective hold');
        return[id,value];
      });
      if(saved.signals&&(!saved.signals||typeof saved.signals!=='object'||Array.isArray(saved.signals)))throw new Error('Invalid objective signals');
      manager.restore(saved.manager);holds.clear();for(const entry of entries)holds.set(...entry);
      for(const id of Object.keys(signals))delete signals[id];Object.assign(signals,saved.signals||{});
      return api;
    }
    function holdTime(){return holds.get(manager.current()?.id)||0}
    const api={manager,phase,marker,evaluate,update,syncPhase,snapshot,restore,holdTime,signal};
    return api;
  }
  return{definitions,create};
});
