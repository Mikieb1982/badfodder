/* Cable Street mission mechanics groundwork.
   No map coordinates are defined here: geography remains deliberately separate. */
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

  function clamp(n,min,max){return Math.max(min,Math.min(max,n))}

  function createBarricade({id,maxIntegrity,constructionTier=0,integrity=0,workPositions=0}){
    if(!id)throw new Error('Barricade requires an id.');
    if(!Number.isFinite(maxIntegrity)||maxIntegrity<=0)throw new Error('Barricade requires a positive maxIntegrity.');
    return{
      id,
      maxIntegrity,
      integrity:clamp(integrity,0,maxIntegrity),
      constructionTier:Math.max(0,constructionTier|0),
      breached:integrity<=0,
      occupiedWorkPositions:Array(Math.max(0,workPositions|0)).fill(null)
    };
  }

  function reinforceBarricade(barricade,value,{tierIncrease=0}={}){
    if(!barricade||!Number.isFinite(value)||value<=0)return 0;
    const before=barricade.integrity;
    barricade.integrity=clamp(barricade.integrity+value,0,barricade.maxIntegrity);
    barricade.constructionTier=Math.max(0,barricade.constructionTier+(tierIncrease|0));
    barricade.breached=barricade.integrity<=0;
    return barricade.integrity-before;
  }

  function damageBarricade(barricade,value){
    if(!barricade||!Number.isFinite(value)||value<=0)return 0;
    const before=barricade.integrity;
    barricade.integrity=clamp(barricade.integrity-value,0,barricade.maxIntegrity);
    barricade.breached=barricade.integrity<=0;
    return before-barricade.integrity;
  }

  function reserveWorkPosition(barricade,actorId){
    if(!barricade||!actorId)return-1;
    const existing=barricade.occupiedWorkPositions.indexOf(actorId);
    if(existing>=0)return existing;
    const slot=barricade.occupiedWorkPositions.indexOf(null);
    if(slot<0)return-1;
    barricade.occupiedWorkPositions[slot]=actorId;
    return slot;
  }

  function releaseWorkPosition(barricade,actorId){
    if(!barricade||!actorId)return false;
    const slot=barricade.occupiedWorkPositions.indexOf(actorId);
    if(slot<0)return false;
    barricade.occupiedWorkPositions[slot]=null;
    return true;
  }

  function createMaterial({id,type}){
    if(!id)throw new Error('Material requires an id.');
    if(!Object.prototype.hasOwnProperty.call(MATERIAL_VALUES,type))throw new Error('Unknown material type: '+type);
    return{id,type,value:MATERIAL_VALUES[type],reservedBy:null,carriedBy:null,consumed:false};
  }

  function reserveMaterial(material,actorId){
    if(!material||material.consumed||!actorId)return false;
    if(material.reservedBy&&material.reservedBy!==actorId)return false;
    material.reservedBy=actorId;
    return true;
  }

  function carryMaterial(material,actorId){
    if(!reserveMaterial(material,actorId))return false;
    material.carriedBy=actorId;
    return true;
  }

  function dropMaterial(material,actorId){
    if(!material||material.consumed||material.carriedBy!==actorId)return false;
    material.carriedBy=null;
    material.reservedBy=null;
    return true;
  }

  function deliverMaterial(material,barricade,actorId){
    if(!material||material.consumed||material.carriedBy!==actorId)return 0;
    const added=reinforceBarricade(barricade,material.value);
    if(added<=0)return 0;
    material.carriedBy=null;
    material.reservedBy=null;
    material.consumed=true;
    return added;
  }

  function createCivilian({id,optional=true}){
    if(!id)throw new Error('Civilian requires an id.');
    return{id,optional,status:'waiting',assistedBy:null};
  }

  function assistCivilian(civilian,actorId){
    if(!civilian||civilian.status!=='waiting'||!actorId)return false;
    civilian.status='assisted';
    civilian.assistedBy=actorId;
    return true;
  }

  function evacuateCivilian(civilian){
    if(!civilian||civilian.status!=='assisted')return false;
    civilian.status='exited';
    return true;
  }

  function createPoliceFormation({id,width,objective=null,state='approach'}){
    if(!id)throw new Error('Police formation requires an id.');
    if(!Number.isFinite(width)||width<=0)throw new Error('Police formation requires a positive fitted width.');
    if(!POLICE_STATES.includes(state))throw new Error('Invalid police formation state: '+state);
    return{id,width,objective,state};
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
    if(!state||!state.started||state.completed||!Number.isFinite(dt)||dt<=0)return false;
    state.holdSeconds=Math.min(targetSeconds,state.holdSeconds+dt);
    if(state.holdSeconds>=targetSeconds)state.completed=true;
    return state.completed;
  }

  return{
    MATERIAL_VALUES,POLICE_STATES,
    createBarricade,reinforceBarricade,damageBarricade,
    reserveWorkPosition,releaseWorkPosition,
    createMaterial,reserveMaterial,carryMaterial,dropMaterial,deliverMaterial,
    createCivilian,assistCivilian,evacuateCivilian,
    createPoliceFormation,setPoliceState,updateCrowdConfidence,
    createPhaseState,startPressure,advanceHold
  };
});
