/* Cable Street mission mechanics and controller foundation.
   Geography is deliberately supplied by a separate verified map module. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.BadFodderCableStreet=api;
})(typeof window!=='undefined'?window:globalThis,function(){
  'use strict';

  const MATERIAL_VALUES=Object.freeze({
    cart:20,
    crates:10,
    timber:15,
    furniture:8,
    barrel:10
  });
  const POLICE_STATES=Object.freeze(['approach','halt','dismantle','regroup','withdraw']);
  const MAX_CONSTRUCTION_TIER=4;

  function clamp(n,min,max){return Math.max(min,Math.min(max,n))}
  function validActorId(actorId){return typeof actorId==='string'&&actorId.trim().length>0}
  function validBarricade(b){
    return !!b&&Number.isFinite(b.maxIntegrity)&&b.maxIntegrity>0&&Number.isFinite(b.integrity)&&
      Number.isInteger(b.constructionTier)&&b.constructionTier>=0&&b.constructionTier<=MAX_CONSTRUCTION_TIER&&
      Array.isArray(b.occupiedWorkPositions);
  }

  function createBarricade({id,maxIntegrity,constructionTier=0,integrity=0,workPositions=0}={}){
    if(typeof id!=='string'||!id.trim())throw new Error('Barricade requires an id.');
    if(!Number.isFinite(maxIntegrity)||maxIntegrity<=0)throw new Error('Barricade requires a positive finite maxIntegrity.');
    if(!Number.isFinite(integrity))throw new Error('Barricade integrity must be finite.');
    if(!Number.isInteger(constructionTier)||constructionTier<0||constructionTier>MAX_CONSTRUCTION_TIER){
      throw new Error('Barricade constructionTier must be an integer from 0 to '+MAX_CONSTRUCTION_TIER+'.');
    }
    if(!Number.isInteger(workPositions)||workPositions<0)throw new Error('Barricade workPositions must be a non-negative integer.');
    const current=clamp(integrity,0,maxIntegrity);
    return{
      id:id.trim(),
      maxIntegrity,
      integrity:current,
      constructionTier,
      breached:current<=0,
      occupiedWorkPositions:Array(workPositions).fill(null)
    };
  }

  function reinforceBarricade(barricade,value,{tierIncrease=0}={}){
    if(!validBarricade(barricade)||!Number.isFinite(value)||value<=0)return 0;
    if(!Number.isInteger(tierIncrease)||tierIncrease<0)return 0;
    const before=barricade.integrity;
    barricade.integrity=clamp(barricade.integrity+value,0,barricade.maxIntegrity);
    if(barricade.integrity>before&&tierIncrease){
      barricade.constructionTier=clamp(
        barricade.constructionTier+tierIncrease,
        0,MAX_CONSTRUCTION_TIER
      );
    }
    barricade.breached=barricade.integrity<=0;
    return barricade.integrity-before;
  }

  function damageBarricade(barricade,value){
    if(!validBarricade(barricade)||!Number.isFinite(value)||value<=0)return 0;
    const before=barricade.integrity;
    barricade.integrity=clamp(barricade.integrity-value,0,barricade.maxIntegrity);
    barricade.breached=barricade.integrity<=0;
    return before-barricade.integrity;
  }

  function reserveWorkPosition(barricade,actorId){
    if(!validBarricade(barricade)||!validActorId(actorId))return-1;
    const existing=barricade.occupiedWorkPositions.indexOf(actorId);
    if(existing>=0)return existing;
    const slot=barricade.occupiedWorkPositions.indexOf(null);
    if(slot<0)return-1;
    barricade.occupiedWorkPositions[slot]=actorId;
    return slot;
  }

  function releaseWorkPosition(barricade,actorId){
    if(!validBarricade(barricade)||!validActorId(actorId))return false;
    const slot=barricade.occupiedWorkPositions.indexOf(actorId);
    if(slot<0)return false;
    barricade.occupiedWorkPositions[slot]=null;
    return true;
  }

  function releaseAllWorkPositions(barricade,actorId){
    if(!validBarricade(barricade)||!validActorId(actorId))return 0;
    let released=0;
    barricade.occupiedWorkPositions.forEach((owner,i)=>{
      if(owner===actorId){barricade.occupiedWorkPositions[i]=null;released++}
    });
    return released;
  }

  function createMaterial({id,type}={}){
    if(typeof id!=='string'||!id.trim())throw new Error('Material requires an id.');
    if(!Object.prototype.hasOwnProperty.call(MATERIAL_VALUES,type))throw new Error('Unknown material type: '+type);
    const value=MATERIAL_VALUES[type];
    return{id:id.trim(),type,value,remainingValue:value,reservedBy:null,carriedBy:null,consumed:false};
  }

  function reserveMaterial(material,actorId){
    if(!material||material.consumed||!validActorId(actorId))return false;
    if(material.carriedBy&&material.carriedBy!==actorId)return false;
    if(material.reservedBy&&material.reservedBy!==actorId)return false;
    material.reservedBy=actorId;
    return true;
  }

  function releaseMaterialReservation(material,actorId){
    if(!material||material.consumed||!validActorId(actorId))return false;
    if(material.carriedBy)return false;
    if(material.reservedBy!==actorId)return false;
    material.reservedBy=null;
    return true;
  }

  function carryMaterial(material,actorId){
    if(!validActorId(actorId)||!reserveMaterial(material,actorId))return false;
    material.carriedBy=actorId;
    return true;
  }

  function dropMaterial(material,actorId){
    if(!material||material.consumed||!validActorId(actorId)||material.carriedBy!==actorId)return false;
    material.carriedBy=null;
    material.reservedBy=null;
    return true;
  }

  function deliverMaterial(material,barricade,actorId){
    if(
      !material||material.consumed||!validActorId(actorId)||
      material.carriedBy!==actorId||material.reservedBy!==actorId||
      !validBarricade(barricade)||!Number.isFinite(material.remainingValue)||material.remainingValue<=0
    )return 0;

    const capacity=Math.max(0,barricade.maxIntegrity-barricade.integrity);
    if(capacity<=0)return 0;

    const requested=Math.min(material.remainingValue,capacity);
    const added=reinforceBarricade(barricade,requested);
    if(added<=0)return 0;

    material.remainingValue=Math.max(0,material.remainingValue-added);
    if(material.remainingValue<=0){
      material.remainingValue=0;
      material.carriedBy=null;
      material.reservedBy=null;
      material.consumed=true;
    }
    return added;
  }

  function createCivilian({id,optional=true}={}){
    if(typeof id!=='string'||!id.trim())throw new Error('Civilian requires an id.');
    return{id:id.trim(),optional:!!optional,status:'waiting',assistedBy:null};
  }

  function assistCivilian(civilian,actorId){
    if(!civilian||civilian.status!=='waiting'||!validActorId(actorId))return false;
    civilian.status='assisted';
    civilian.assistedBy=actorId;
    return true;
  }

  function evacuateCivilian(civilian){
    if(!civilian||civilian.status!=='assisted')return false;
    civilian.status='exited';
    return true;
  }

  function createPoliceFormation({id,width,objective=null,state='approach'}={}){
    if(typeof id!=='string'||!id.trim())throw new Error('Police formation requires an id.');
    if(!Number.isFinite(width)||width<=0)throw new Error('Police formation requires a positive fitted width.');
    if(!POLICE_STATES.includes(state))throw new Error('Invalid police formation state: '+state);
    return{id:id.trim(),width,objective,state};
  }

  function setPoliceState(formation,state){
    if(!formation||!POLICE_STATES.includes(state))return false;
    formation.state=state;
    return true;
  }

  function updateCrowdConfidence(current,delta){
    if(!Number.isFinite(current)||!Number.isFinite(delta))return current;
    return clamp(current+delta,0,1);
  }

  function createPhaseState(){
    return{phaseIndex:0,started:false,holdSeconds:0,completed:false};
  }

  function startPressure(state){
    if(!state||state.completed)return false;
    state.started=true;
    return true;
  }

  function advanceHold(state,dt,targetSeconds){
    if(
      !state||!state.started||state.completed||
      !Number.isFinite(dt)||dt<=0||
      !Number.isFinite(targetSeconds)||targetSeconds<=0
    )return false;
    const next=Math.min(targetSeconds,state.holdSeconds+dt);
    if(!Number.isFinite(next))return false;
    state.holdSeconds=next;
    if(state.holdSeconds>=targetSeconds)state.completed=true;
    return state.completed;
  }

  function createController({mission}={}){
    if(!mission||mission.id!=='cable-street-1936')throw new Error('Cable Street controller requires the Cable Street mission definition.');

    let disposed=false;
    let initialized=false;
    const state={
      phaseIndex:0,
      pressureStarted:false,
      confidence:.65,
      elapsed:0,
      actors:new Map(),
      barricades:new Map(),
      materials:new Map(),
      civilians:new Map(),
      formations:new Map(),
      jobs:new Map(),
      events:[]
    };

    function ensureLive(){
      if(disposed)throw new Error('Cable Street controller has been disposed.');
    }

    function clear(){
      state.phaseIndex=0;
      state.pressureStarted=false;
      state.confidence=.65;
      state.elapsed=0;
      state.actors.clear();
      state.barricades.clear();
      state.materials.clear();
      state.civilians.clear();
      state.formations.clear();
      state.jobs.clear();
      state.events.length=0;
    }

    function initialize(seed={}){
      ensureLive();
      clear();
      for(const actor of seed.actors||[]){
        if(!actor||!validActorId(actor.id))throw new Error('Controller actor requires a valid id.');
        if(state.actors.has(actor.id))throw new Error('Duplicate actor id: '+actor.id);
        state.actors.set(actor.id,{...actor,carrying:null,job:null,active:actor.active!==false});
      }
      for(const b of seed.barricades||[])state.barricades.set(b.id,b);
      for(const material of seed.materials||[])state.materials.set(material.id,material);
      for(const civilian of seed.civilians||[])state.civilians.set(civilian.id,civilian);
      for(const formation of seed.formations||[])state.formations.set(formation.id,formation);
      initialized=true;
      return state;
    }

    function cancelActor(actorId,{dropCarried=true}={}){
      ensureLive();
      const actor=state.actors.get(actorId);
      if(!actor)return false;

      state.materials.forEach(material=>{
        if(material.carriedBy===actorId){
          if(dropCarried)dropMaterial(material,actorId);
        }else if(material.reservedBy===actorId){
          releaseMaterialReservation(material,actorId);
        }
      });
      state.barricades.forEach(b=>releaseAllWorkPositions(b,actorId));
      state.jobs.delete(actorId);
      actor.carrying=null;
      actor.job=null;
      return true;
    }

    function removeActor(actorId){
      ensureLive();
      const actor=state.actors.get(actorId);
      if(!actor)return false;
      cancelActor(actorId,{dropCarried:true});
      state.actors.delete(actorId);
      return true;
    }

    function reserveForActor(actorId,materialId){
      ensureLive();
      const actor=state.actors.get(actorId),material=state.materials.get(materialId);
      if(!actor||!material||!actor.active||actor.carrying)return false;
      return reserveMaterial(material,actorId);
    }

    function carryForActor(actorId,materialId){
      ensureLive();
      const actor=state.actors.get(actorId),material=state.materials.get(materialId);
      if(!actor||!material||!actor.active||actor.carrying)return false;
      if(!carryMaterial(material,actorId))return false;
      actor.carrying=materialId;
      return true;
    }

    function dropForActor(actorId){
      ensureLive();
      const actor=state.actors.get(actorId);
      if(!actor||!actor.carrying)return false;
      const material=state.materials.get(actor.carrying);
      if(!material||!dropMaterial(material,actorId))return false;
      actor.carrying=null;
      return true;
    }

    function deliverForActor(actorId,barricadeId){
      ensureLive();
      const actor=state.actors.get(actorId);
      const barricade=state.barricades.get(barricadeId);
      const material=actor&&actor.carrying?state.materials.get(actor.carrying):null;
      if(!actor||!material||!barricade)return 0;
      const added=deliverMaterial(material,barricade,actorId);
      if(material.consumed)actor.carrying=null;
      return added;
    }

    function fixedUpdate(dt){
      ensureLive();
      if(!initialized||!Number.isFinite(dt)||dt<=0)return false;
      state.elapsed+=dt;
      return true;
    }

    function reset(seed={}){
      ensureLive();
      return initialize(seed);
    }

    function dispose(){
      if(disposed)return false;
      if(initialized)[...state.actors.keys()].forEach(id=>cancelActor(id,{dropCarried:true}));
      clear();
      initialized=false;
      disposed=true;
      return true;
    }

    return{
      mission,
      state,
      get initialized(){return initialized},
      get disposed(){return disposed},
      initialize,fixedUpdate,reset,dispose,
      cancelActor,removeActor,
      reserveForActor,carryForActor,dropForActor,deliverForActor
    };
  }

  return{
    MATERIAL_VALUES,POLICE_STATES,MAX_CONSTRUCTION_TIER,
    createBarricade,reinforceBarricade,damageBarricade,
    reserveWorkPosition,releaseWorkPosition,releaseAllWorkPositions,
    createMaterial,reserveMaterial,releaseMaterialReservation,carryMaterial,dropMaterial,deliverMaterial,
    createCivilian,assistCivilian,evacuateCivilian,
    createPoliceFormation,setPoliceState,updateCrowdConfidence,
    createPhaseState,startPressure,advanceHold,
    createController
  };
});
