/* Bounded deterministic companion decisions above Foundation B/C, nav and health. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.BadFodderCompanions=api;})(typeof window!=='undefined'?window:globalThis,function(){
 'use strict';
 const viable=u=>!!u&&u.alive!==false&&!u.downed&&!u.carriedBy;
 function create({getSquad,commands,navigation:nav,groupMovement:group,health,support,getHostiles=()=>[],canSee=()=>false,fire=()=>false,firearmsAllowed=()=>false,getContext=()=>null,findCover=()=>null,isBusy=()=>false,releaseCover=()=>{},exitBuilding=()=>{},profile={}}){
  const config={spacing:30,comfortable:50,catchUp:96,leash:270,engagement:190,...profile};
  let order='FOLLOW',hold=null,clock=0,decisionClock=0,context={mode:'FOLLOW'},states=new Map(),aid=null;
  const squad=()=>getSquad(),active=(p=commands.player)=>squad()[commands.active(p)]||null;
  const ai=u=>viable(u)&&commands.owner(squad().indexOf(u))<0;
  function cancel(u,{keepCover=false}={}){if(!u)return;support?.directOrder(u);nav.cancelPath(u);if(!keepCover)releaseCover(u);states.delete(u);if(aid?.helper===u)aid=null;u.companionState=null;}
  function switchTo(index,p=commands.player){
   const unit=squad()[index];if(!viable(unit)||!commands.owns(index,p))return false;
   if(commands.active(p)===index)return true;
   const previous=active(p);cancel(unit);cancel(previous);if(!commands.claim(index,p))return false;return true;
  }
  function ensureActive(){
   for(let p=0;p<4;p++)if(commands.active(p)!==null){
    if(viable(active(p)))continue;
    const index=squad().findIndex((u,i)=>viable(u)&&commands.owns(i,p));
    if(index>=0)switchTo(index,p);
   }
   return viable(active())?active():null;
  }
  function next(){const start=commands.active()??-1;for(let n=1;n<=4;n++){const i=(start+n)%4;if(switchTo(i))return i}return null;}
  function setOrder(value){
   if(!['FOLLOW','HOLD','REGROUP'].includes(value))return false;
   order=value;hold=value==='HOLD'&&active()?{x:active().x,y:active().y}:null;aid=null;
   for(const u of squad())if(ai(u)){cancel(u,{keepCover:value==='HOLD'});exitBuilding(u)}clock=0;decisionClock=0;return true;
  }
  function setContext(value={}){context={mode:'FOLLOW',...value};}
  function route(u,point,state,holdFor=0){
   releaseCover(u);exitBuilding(u);
   const old=states.get(u),changed=!old?.point||Math.hypot(point.x-old.point.x,point.y-old.point.y)>14||old.version!==nav.navigationVersion;
   if(changed||!u.path?.length&&Math.hypot(u.x-point.x,u.y-point.y)>18)nav.assignPath(u,point.x,point.y);
   states.set(u,{state,point:{x:point.x,y:point.y},version:nav.navigationVersion,until:holdFor?decisionClock+holdFor:old?.until||0});u.companionState=state;
  }
  function update(dt){
   if(commands.mode==='client')return;
   decisionClock+=Math.max(0,dt||0);
   const leader=ensureActive();if(!leader)return;
   for(const u of states.keys())if(!ai(u))cancel(u);
   clock-=dt;if(clock>0)return;clock=.22;
   const hint=getContext();if(hint)setContext(hint);
   const companions=squad().filter(ai),anchor=order==='HOLD'?hold:order==='REGROUP'?leader:context.anchor||leader;
   const heading=Number.isFinite(context.threatDirection)?context.threatDirection:leader.dir||0;
   const points=group.slots([leader,...companions],anchor,{spacing:config.spacing},true,heading).slice(1);
   const enemies=getHostiles().filter(e=>e.alive&&!e.surrendered&&!e.missionDormant);
   const visible=(u,radius)=>enemies.filter(e=>Math.hypot(e.x-u.x,e.y-u.y)<=radius&&Math.hypot(e.x-anchor.x,e.y-anchor.y)<=config.leash&&canSee(u,e));
   const sharedThreats=visible(leader,config.engagement+55);
   if(aid&&(!ai(aid.helper)||!aid.target.alive||!aid.target.downed||aid.target.stabilised||order==='REGROUP'||visible(aid.helper,config.engagement).length>1||(aid.helper.suppression||0)>.45)){cancel(aid.helper);aid=null;}
   if(!aid&&order!=='REGROUP'&&context.casualtyAid!==false){
    for(const target of squad())if(target.alive&&target.downed&&!target.stabilised&&!target.carriedBy){
     const helper=companions.filter(u=>!u.carryingUnit&&!isBusy(u)&&!support?.isSupporting(u)&&(u.suppression||0)<.35&&!visible(u,config.engagement).length&&(order!=='HOLD'||Math.hypot(target.x-anchor.x,target.y-anchor.y)<=config.comfortable*1.5)).sort((a,b)=>Math.hypot(a.x-target.x,a.y-target.y)-Math.hypot(b.x-target.x,b.y-target.y))[0];
     if(helper&&Math.hypot(helper.x-target.x,helper.y-target.y)<=config.engagement&&nav.routeClear(helper.x,helper.y,target.x,target.y,nav.NAV_RADIUS)){aid={helper,target};break}
    }
   }
   for(let i=0;i<companions.length;i++){
    const u=companions[i];if(isBusy(u)||support?.isSupporting(u))continue;
    const distance=Math.hypot(u.x-anchor.x,u.y-anchor.y),targets=visible(u,config.engagement);
    let target=null,best=Infinity;for(const e of targets){const d=Math.hypot(u.x-e.x,u.y-e.y);if(d<best){target=e;best=d}}
    let shared=null,sharedBest=Infinity;for(const e of sharedThreats){const d=Math.hypot(u.x-e.x,u.y-e.y);if(d<sharedBest){shared=e;sharedBest=d}}
    const threat=target||shared;
    if(aid?.helper===u){
      const d=Math.hypot(u.x-aid.target.x,u.y-aid.target.y);
      if(d>health.AID_RANGE){route(u,{x:aid.target.x,y:aid.target.y},'PROTECT_CASUALTY');continue}
      nav.cancelPath(u);releaseCover(u);u.companionState='AID';health.stabilise(aid.target,u);try{globalThis.BadFodderExperience?.event?.('STABILISED',{unit:aid.target})}catch(_){}aid=null;continue;
    }
    const threatened=!!threat&&(threat.alert||threat.fireTimer>0||threat.target||u.suppression>.12);
    const coverState=states.get(u),settledCover=coverState?.state==='TAKE_COVER'&&coverState.until>decisionClock&&Math.hypot(u.x-coverState.point.x,u.y-coverState.point.y)<=26;
    if((u.suppression||0)>.65&&threat){
      const reserved=[...states.entries()].filter(([actor,s])=>actor!==u&&s.state==='TAKE_COVER').map(([,s])=>s.point),cover=findCover(u,threat,anchor,reserved);
      if(cover){route(u,cover,'BREAK_CONTACT',2.3);continue}
    }
    if(order==='HOLD'&&u.checkpointCover&&distance<=config.comfortable){nav.cancelPath(u);u.companionState='WATCH_DIRECTION';if(Number.isFinite(context.threatDirection))u.dir=context.threatDirection;}
    else if(distance>config.catchUp||order==='REGROUP'){route(u,points[i],'REGROUP');continue;}
    else if(settledCover&&threatened){nav.cancelPath(u);u.companionState=target?'SUPPRESS':'TAKE_COVER';}
    else if(threatened||u.suppression>.32){
     const reserved=[...states.entries()].filter(([actor,s])=>actor!==u&&['TAKE_COVER','BREAK_CONTACT'].includes(s.state)).map(([,s])=>s.point);
     const cover=findCover(u,threat,anchor,reserved);
     if(cover){u.companionIntent=target?'COVER_ADVANCE':'TAKE_COVER';route(u,cover,'TAKE_COVER',1.8)}
     else{nav.cancelPath(u);u.companionState=target?'ENGAGE':'WATCH_DIRECTION';if(shared)u.dir=Math.atan2(shared.y-u.y,shared.x-u.x)}
    }else if(order==='HOLD'||context.mode==='DEFEND'||context.mode==='INTERACT_SUPPORT'){
     const point=points[i];if(Math.hypot(u.x-point.x,u.y-point.y)>18)route(u,point,order==='HOLD'?'HOLD':'MOVE_TO_SUPPORT');else{nav.cancelPath(u);u.companionState='WATCH_DIRECTION';if(Number.isFinite(context.threatDirection))u.dir=context.threatDirection;}
    }else if(distance>config.comfortable){route(u,points[i],'FOLLOW');}
    else if(['TAKE_COVER','COVER_ADVANCE','BREAK_CONTACT'].includes(states.get(u)?.state)){route(u,points[i],'FOLLOW');}
    else if(!u.path?.length)u.companionState='FOLLOW';
    if(target&&firearmsAllowed()&&!u.carryingUnit&&(u.suppression||0)<.78){
     const dx=target.x-u.x,dy=target.y-u.y,l2=dx*dx+dy*dy;
     const blocked=squad().some(a=>{if(a===u||!a.alive)return false;const t=l2?((a.x-u.x)*dx+(a.y-u.y)*dy)/l2:0;return t>0&&t<1&&Math.hypot(a.x-u.x-t*dx,a.y-u.y-t*dy)<nav.NAV_RADIUS+4});
     if(!blocked)fire(u,target);
    }
   }
   if(order==='REGROUP'&&companions.every(u=>Math.hypot(u.x-leader.x,u.y-leader.y)<=config.comfortable*1.5))order='FOLLOW';
  }
  function speedScale(u){const anchor=order==='HOLD'?hold:context.anchor||active(0)||active();return ai(u)&&anchor&&Math.hypot(u.x-anchor.x,u.y-anchor.y)>config.catchUp?1.38:1;}
  function reset(){for(const u of states.keys())cancel(u);states.clear();aid=null;order='FOLLOW';hold=null;context={mode:'FOLLOW'};clock=0;decisionClock=0;}
  function snapshot(){return{version:1,active:commands.snapshot(),order,hold:hold&&{...hold}};}
  function restore(saved){reset();if(saved?.version!==1)return;commands.restore(saved.active);order=['FOLLOW','HOLD','REGROUP'].includes(saved.order)?saved.order:'FOLLOW';hold=order==='HOLD'&&Number.isFinite(saved.hold?.x)&&Number.isFinite(saved.hold?.y)?{...saved.hold}:null;if(order==='HOLD'&&!hold)order='FOLLOW';ensureActive();}
  return{update,switchTo,next,ensureActive,speedScale,setOrder,setCompanionContext:setContext,reset,snapshot,restore,isCompanion:ai,active,get order(){return order},get context(){return context}};
 }
 return{create,viable};
});
