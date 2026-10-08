/* Opt-in assistance around explicit actions. Movement and casualty rules remain authoritative. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.BadFodderCoordinationSupport=api;})(typeof window!=='undefined'?window:globalThis,function(){
  'use strict';
  const defaults=Object.freeze({interactionCover:false,casualtySupport:false,allowUnselected:false,supportRadius:80,regroupOnComplete:false});
  function profile(options={}){
    const p={...defaults};
    for(const key of ['interactionCover','casualtySupport','allowUnselected','regroupOnComplete'])p[key]=options[key]===true;
    if(Number.isFinite(options.supportRadius)&&options.supportRadius>0)p.supportRadius=options.supportRadius;
    return p;
  }
  const fit=u=>!!u&&u.alive!==false&&!u.downed&&!u.carriedBy;
  function findSupportPartner(actor,squad,{selected=[],allowUnselected=false,supportRadius=80,canControl=()=>true,isBusy=()=>false,canReach=()=>true,exclude=null}={}){
    if(!fit(actor))return null;
    let best=null,bestRank=Infinity,bestDistance=Infinity;
    for(const unit of squad){
      if(unit===actor||unit===exclude||!fit(unit)||unit.carryingUnit||unit.insideBuilding||unit.manualGarrison||unit.checkpointCover||unit.isFormationLeader||unit.navDestination||unit.path?.length||!canControl(unit)||isBusy(unit))continue;
      const rank=selected.includes(unit)?0:1;if(rank&&!allowUnselected)continue;
      const distance=Math.hypot(unit.x-actor.x,unit.y-actor.y);
      if(distance>supportRadius||!canReach(unit,actor))continue;
      if(rank<bestRank||rank===bestRank&&distance<bestDistance){best=unit;bestRank=rank;bestDistance=distance}
    }
    return best;
  }
  function create({navigation,groupMovement,movementProfile,getSquad=()=>[],getSelected=()=>[],canControl=()=>true,isBusy=()=>false,getHostiles=()=>[],profile:options={}}){
    const config=profile(options),sessions=new Map(),partners=new Set();
    function facing(actor,point,explicit){
      if(Number.isFinite(explicit))return explicit;
      let nearest=null,distance=Infinity;
      // Known hostiles only, once on begin. No perception or continuous enemy scan.
      for(const enemy of getHostiles())if(enemy.alive!==false&&!enemy.surrendered&&(enemy.known||enemy.alert||enemy.lastSeen)){
        const d=Math.hypot(enemy.x-actor.x,enemy.y-actor.y);if(d<distance){nearest=enemy;distance=d}
      }
      if(nearest)return Math.atan2(nearest.y-actor.y,nearest.x-actor.x);
      if(point.x!==actor.x||point.y!==actor.y)return Math.atan2(actor.y-point.y,actor.x-point.x);
      return Number.isFinite(actor.dir)?actor.dir:null;
    }
    function supportPoint(actor,partner,target,direction){
      const anchor=target||actor;
      const point=groupMovement.slots([actor,partner],anchor,movementProfile,true,direction)[1];
      const min=navigation.NAV_RADIUS*2+2;
      if(!point||point.shared||Math.hypot(point.x-actor.x,point.y-actor.y)<min||Math.hypot(point.x-actor.x,point.y-actor.y)>config.supportRadius||target&&Math.hypot(point.x-target.x,point.y-target.y)<min)return null;
      return navigation.routeClear(partner.x,partner.y,point.x,point.y,navigation.NAV_RADIUS)?point:null;
    }
    function endSupport(actor,{regroup=false}={}){
      const state=sessions.get(actor);if(!state)return false;
      sessions.delete(actor);partners.delete(state.partner);navigation.cancelPath(state.partner);
      // Never move the actor or pull an unselected/former partner back into a group.
      const selected=getSelected();
      if(regroup&&fit(actor)&&fit(state.partner)&&canControl(state.partner)&&selected.includes(actor)&&selected.includes(state.partner)&&!isBusy(state.partner)){
        const point=supportPoint(actor,state.partner,actor,state.direction);
        if(point)groupMovement.regroup([state.partner],point,movementProfile);
      }
      return true;
    }
    function directOrder(units){
      for(const state of sessions.values())if(Array.isArray(units)?units.includes(state.actor)||units.includes(state.partner):units===state.actor||units===state.partner)endSupport(state.actor);
    }
    function reset(){for(const actor of sessions.keys())endSupport(actor)}
    function beginSupport({actor,action,target=null,kind='interaction',threatDirection,isActive=null,duration=null}={}){
      if(!(kind==='casualty'?config.casualtySupport:config.interactionCover)||!fit(actor)||!canControl(actor)||partners.has(actor))return null;
      endSupport(actor);
      const selected=getSelected();
      if(!selected.includes(actor))return null;
      const partner=findSupportPartner(actor,getSquad(),{...config,selected,canControl,exclude:target,
        isBusy:u=>partners.has(u)||sessions.has(u)||isBusy(u),
        canReach:(u,a)=>{const point=a.insideBuilding&&target?target:a;return navigation.routeClear(u.x,u.y,point.x,point.y,navigation.NAV_RADIUS)}});
      if(!partner)return null;
      const direction=facing(actor,target||actor,threatDirection);
      const point=supportPoint(actor,partner,action==='carry'?actor:target,direction);if(!point)return null;
      navigation.cancelPath(partner);
      if(!groupMovement.assign([partner],point,movementProfile)){navigation.cancelPath(partner);return null}
      const state={actor,partner,action,target,point,direction,isActive,remaining:Number.isFinite(duration)?Math.max(0,duration):null,repath:0};
      sessions.set(actor,state);partners.add(partner);return state;
    }
    function update(dt){
      if(!sessions.size||!Number.isFinite(dt)||dt<0)return;
      const squad=getSquad(),selected=getSelected();
      for(const state of sessions.values()){
        const {actor,partner}=state;
        if(!squad.includes(actor)||!squad.includes(partner)||!fit(actor)||!fit(partner)||!canControl(actor)||!canControl(partner)||isBusy(partner)||partner.carryingUnit||partner.manualGarrison||partner.checkpointCover||partner.insideBuilding||Math.hypot(partner.x-actor.x,partner.y-actor.y)>config.supportRadius||!config.allowUnselected&&(!selected.includes(actor)||!selected.includes(partner))){endSupport(actor);continue}
        if(state.isActive&&!state.isActive()){endSupport(actor,{regroup:config.regroupOnComplete});continue}
        if(state.remaining!==null){state.remaining-=dt;if(state.remaining<=0){endSupport(actor,{regroup:config.regroupOnComplete});continue}}
        if(state.action==='carry'){
          state.repath=Math.max(0,state.repath-dt);
          if(state.repath===0){
            const point=supportPoint(actor,partner,actor,state.direction);
            if(!point){endSupport(actor);continue}
            if(Math.hypot(point.x-state.point.x,point.y-state.point.y)>12){
              if(!groupMovement.assign([partner],point,movementProfile)){endSupport(actor);continue}
              state.point=point;
            }
            state.repath=.5;
          }
        }
        if(Number.isFinite(state.direction)&&Math.hypot(partner.x-state.point.x,partner.y-state.point.y)<=12&&!partner.fireTimer)partner.dir=state.direction;
      }
    }
    function casualtyAction({phase,actor,action,target,duration}={}){
      if(phase==='reset'){reset();return}
      if(phase==='end'){endSupport(actor,{regroup:config.regroupOnComplete});return}
      directOrder(actor);
      return beginSupport({actor,action,target,kind:'casualty',duration,
        isActive:()=>action==='carry'?actor.carryingUnit===target:target.alive!==false&&target.stabilised});
    }
    return{beginSupport,endSupport,casualtyAction,directOrder,reset,update,isSupporting:u=>partners.has(u),get size(){return sessions.size},profile:config};
  }
  return{defaults,profile,findSupportPartner,create};
});
