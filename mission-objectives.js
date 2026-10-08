/* Runtime adapter for shared objective rules. Existing mission controllers remain authoritative. */
(function(root,factory){
  const rules=typeof module==='object'&&module.exports?require('./mission-rules.js'):root.BadFodderMissionRules;
  const facts=typeof module==='object'&&module.exports?require('./mission-facts.js'):root.BadFodderMissionFacts;
  const api=factory(rules,facts);
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.BadFodderObjectives=api;
})(typeof window!=='undefined'?window:globalThis,function(rules,factStores){
  'use strict';
  const WIGAN_COPY=[
    {title:'Rally at Tudor House',brief:"Clear Tudor House and hold the position long enough for May Cooper's group to rally."},
    {title:'Reconnect the Town Centre',brief:'Reconnect Market Place, then secure Grand Arcade as a shared rally point.'},
    {title:'Coordinate the Wallgate Advance',brief:"Restore the network if it is cut, then reach Wallgate and link with Nell Foster's railway group."}
  ];
  const WIGAN_FACTS={
    wigan_story:{networkCut:false},tudor_group:'ISOLATED',bus_group:'ISOLATED',market_group:'ISOLATED',
    king_group:'ISOLATED',railway_group:'ISOLATED',grand_arcade_status:'OPEN',network_status:'ISOLATED'
  };
  function definitions(mission){
    if(mission.objectives)return mission.objectives;
    const phases=mission.phases||[];
    return phases.map((phase,index)=>{
      const story=mission.id==='wigan'?WIGAN_COPY[index]:null;
      return{
        ...phase,...(story||{}),id:phase.id||'phase-'+index,phase:index,
        type:phase.type||(['INTERACT','DEFEND','GARRISON','HOLD'][index]||'INTERACT'),
        requires:index?[phases[index-1].id||'phase-'+(index-1)]:[],
        marker:phase.marker||(phase.zone?{kind:'zone',id:phase.zone}:null),
        meta:{...phase.meta,legacy:!!phase.type}
      };
    });
  }
  function create(mission){
    const isWigan=mission.id==='wigan';
    const factDefaults=isWigan?{...WIGAN_FACTS,...(mission.factDefaults||{})}:(mission.factDefaults||{});
    const facts=factStores.create(factDefaults);
    const manager=rules.createObjectiveManager(definitions(mission));
    const holds=new Map();
    const signals=Object.create(null);
    manager.onChange(event=>{
      if(event.action==='reset'){facts.reset();holds.clear();for(const id of Object.keys(signals))delete signals[id]}
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
    function livingInside(zoneId,context){
      const zone=context.zones?.[zoneId];
      return !!zone&&(context.living||[]).some(s=>s.alive!==false&&rules.pointInCircle(s.x,s.y,zone));
    }
    function routeClear(zoneId,context){
      const zone=context.zones?.[zoneId];
      if(!zone)return false;
      return !(context.enemies||[]).some(e=>e.alive&&!e.surrendered&&rules.pointInCircle(e.x,e.y,{...zone,r:zone.r*1.2}));
    }
    function setFact(key,value){if(facts.get(key)!==value)facts.set(key,value)}
    function updateWiganStory(context){
      if(!isWigan)return;
      const p0=manager.get('phase-0'),p1=manager.get('phase-1'),p2=manager.get('phase-2');
      if(p0?.status==='COMPLETED'){
        setFact('tudor_group','CONNECTED');
        if(facts.get('bus_group')==='ISOLATED')setFact('bus_group','CONTACTED');
        if(facts.get('network_status')==='ISOLATED')setFact('network_status','CONTACT');
      }
      if(['ACTIVE','COMPLETED'].includes(p1?.status)){
        if(livingInside('market',context)&&routeClear('market',context)){
          setFact('market_group','CONNECTED');
          setFact('bus_group','CONNECTED');
          if(!['DISRUPTED','RESTORED','COORDINATED'].includes(facts.get('network_status')))setFact('network_status','CONNECTED');
        }
        if(livingInside('kingStreet',context)&&routeClear('kingStreet',context))setFact('king_group','CONNECTED');
      }
      if(p1?.status==='COMPLETED'){
        setFact('grand_arcade_status','HELD');
        const story=facts.get('wigan_story')||{};
        if(!story.networkCut){
          facts.set('wigan_story',{...story,networkCut:true});
          setFact('network_status','DISRUPTED');
        }
      }
      if(p2?.status==='ACTIVE'){
        setFact('railway_group','CONTACTED');
        if(facts.get('network_status')==='DISRUPTED'){
          const alternate=facts.get('king_group')==='CONNECTED';
          const reopened=livingInside('market',context)&&routeClear('market',context);
          if(alternate||reopened)setFact('network_status','RESTORED');
        }
      }
      if(p2?.status==='COMPLETED'){
        setFact('railway_group','CONNECTED');
        setFact('network_status','COORDINATED');
      }
    }
    function wiganResult(objective,result){
      if(!isWigan)return result;
      if(objective.id==='phase-0'){
        return{...result,status:result.ready
          ?"Tudor House is clear. Hold it while May Cooper's group rallies."
          :"Reach Tudor House, clear the defenders and give May Cooper's group somewhere to rally."};
      }
      if(objective.id==='phase-1'){
        if(facts.get('market_group')!=='CONNECTED')return{...result,ready:false,complete:false,status:'Reconnect Market Place first. Clear the immediate route so runners and civilians can move through the centre.'};
        const linked=facts.get('bus_group')==='CONNECTED'?'New Market Street and Market Place are linked. ':'Market Place is linked. ';
        return{...result,status:linked+(result.ready?'Hold Grand Arcade as the shared rally point.':'Push on to Grand Arcade and secure the rally point.')};
      }
      if(objective.id==='phase-2'){
        if(facts.get('network_status')==='DISRUPTED')return{...result,ready:false,complete:false,status:'The central route has been cut. Return through Market Place, or secure King Street support, before the Wallgate advance.'};
        const support=facts.get('king_group')==='CONNECTED'?'King Street support is linked. ':'';
        return{...result,status:support+(result.ready?"Hold Wallgate while Nell Foster's railway group secures the station route.":"The network is working again. Advance to Wallgate and link with Nell Foster's railway group.")};
      }
      return result;
    }
    function evaluate(objective,context){
      const fact=(context.facts||{})[objective.id]??facts.get(objective.id)??signals[objective.id];
      if(fact?.failed)return{failed:true,status:fact.text||objective.text};
      let result;
      if(objective.meta?.legacy&&['reach','secure-zone','eliminate-and-reach','eliminate','destroy','rescue','protect'].includes(objective.legacyType))result=rules.evaluatePhase({...context,phase:{...objective,type:objective.legacyType}});
      else if(objective.eventDriven)result={ready:fact===true||fact?.complete===true,complete:fact===true||fact?.complete===true,status:fact?.text||objective.text};
      else{
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
        result={ready,complete:ready&&!objective.hold,status:fact?.text||objective.text};
      }
      return wiganResult(objective,result);
    }
    function update(dt,context={}){
      if(!Number.isFinite(dt)||dt<0)throw new Error('Invalid objective timestep');
      if(manager.missionState().failed)return manager.missionState();
      updateWiganStory(context);
      // Newly activated objectives start on the next step, preventing accidental chain completion.
      for(const objective of manager.active()){
        const result=evaluate(objective,context);
        if(result.failed){manager.fail(objective.id,{text:result.status});continue}
        const progress=rules.advanceHold(objective,result,holds.get(objective.id)||0,dt);
        holds.set(objective.id,progress.holdTime);
        if(progress.complete){holds.delete(objective.id);manager.complete(objective.id)}
      }
      updateWiganStory(context);
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
    function snapshot(){return{version:1,manager:manager.snapshot(),holds:[...holds],signals:JSON.parse(JSON.stringify(signals)),facts:facts.snapshot()}}
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
      if(Object.hasOwn(saved,'facts'))facts.restore(saved.facts);else facts.reset();
      return api;
    }
    function holdTime(){return holds.get(manager.current()?.id)||0}
    const api={manager,facts,phase,marker,evaluate,update,syncPhase,snapshot,restore,holdTime,signal};
    return api;
  }
  return{definitions,create};
});
