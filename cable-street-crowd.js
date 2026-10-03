/* Deterministic ambient crowd layer for Cable Street.
   Crowd placement is derived from the approved runtime barricade geometry. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.BadFodderCableCrowd=api;
})(typeof window!=='undefined'?window:globalThis,function(){
  'use strict';

  function clamp(n,min,max){return Math.max(min,Math.min(max,n))}
  function finitePoint(v){return !!v&&Number.isFinite(v.x)&&Number.isFinite(v.y)}
  function centerOf(points){
    if(!Array.isArray(points)||!points.length)return null;
    let x=0,y=0,n=0;
    for(const p of points){
      if(!Array.isArray(p)||!Number.isFinite(p[0])||!Number.isFinite(p[1]))continue;
      x+=p[0];y+=p[1];n++;
    }
    return n?{x:x/n,y:y/n}:null;
  }
  function hashSeed(value){
    const s=String(value||'cable-street-1936');
    let h=2166136261>>>0;
    for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}
    return h>>>0;
  }
  function rng(seed){
    let x=seed>>>0||1;
    return function(){
      x^=x<<13;x^=x>>>17;x^=x<<5;
      return(x>>>0)/4294967296;
    };
  }

  function create({mission,controller,worldWidth,worldHeight,blocked=null,navigation=null,seed='1936-10-04',options={}}={}){
    if(!mission||mission.id!=='cable-street-1936')throw new Error('Cable Street crowd requires the historical mission.');
    if(!controller||!controller.state)throw new Error('Cable Street crowd requires a mission controller.');
    if(!Number.isFinite(worldWidth)||worldWidth<=0||!Number.isFinite(worldHeight)||worldHeight<=0){
      throw new Error('Cable Street crowd requires finite world bounds.');
    }
    const reactive=Math.max(0,mission.crowdBudget&&mission.crowdBudget.reactiveCivilians|0);
    const helpers=Math.max(0,mission.crowdBudget&&mission.crowdBudget.functionalHelpers|0);
    const settings={
      innerRadius:Number.isFinite(options.innerRadius)?options.innerRadius:52,
      outerRadius:Number.isFinite(options.outerRadius)?options.outerRadius:150,
      policeAvoidRadius:Number.isFinite(options.policeAvoidRadius)?options.policeAvoidRadius:120,
      edgePadding:Number.isFinite(options.edgePadding)?options.edgePadding:18,
      helperSupportThreshold:Number.isFinite(options.helperSupportThreshold)?options.helperSupportThreshold:.55,
      helperStrongThreshold:Number.isFinite(options.helperStrongThreshold)?options.helperStrongThreshold:.78,
      ...options
    };
    const random=rng(hashSeed(seed));
    const people=[];
    let elapsed=0,routeBudget=0;

    function mainBarricade(){
      const preferred=(mission.defencePositions||[]).find(x=>x.role==='christian-street-defence');
      if(preferred&&controller.state.barricades.has(preferred.id))return controller.state.barricades.get(preferred.id);
      return controller.state.barricades.values().next().value||null;
    }

    function anchor(){
      const b=mainBarricade();
      if(!b)return{x:worldWidth/2,y:worldHeight/2};
      if(finitePoint(b))return{x:b.x,y:b.y};
      return centerOf(b.points)||{x:worldWidth/2,y:worldHeight/2};
    }

    function openPoint(x,y,r=5){
      const px=clamp(x,settings.edgePadding,worldWidth-settings.edgePadding);
      const py=clamp(y,settings.edgePadding,worldHeight-settings.edgePadding);
      if(typeof blocked==='function'&&blocked(px,py,r))return null;
      return{x:px,y:py};
    }

    function spawnPoint(index,isHelper){
      const bs=[...controller.state.barricades.values()];
      const b=mission.fastAction?bs[index%bs.length]:mainBarricade(),base=finitePoint(b)?b:anchor();
      const work=isHelper&&b&&b.workPoints?.length?b.workPoints[index%b.workPoints.length]:null;
      const a=work||base;
      const inner=isHelper?settings.innerRadius*.65:settings.innerRadius;
      const outer=isHelper?settings.outerRadius*.62:settings.outerRadius;
      for(let attempt=0;attempt<40;attempt++){
        const angle=random()*Math.PI*2+(index%5)*.11;
        const radius=inner+(outer-inner)*Math.sqrt(random());
        const p=openPoint(a.x+Math.cos(angle)*radius,a.y+Math.sin(angle)*radius,4);
        if(p&&work&&(p.x-base.x)*(work.x-base.x)+(p.y-base.y)*(work.y-base.y)<0)continue;
        if(p)return p;
      }
      return openPoint(a.x+(index%7-3)*10,a.y+(Math.floor(index/7)%5-2)*10,3)||a;
    }

    function initialize(){
      people.forEach(releaseCarrier);
      people.length=0;
      const total=reactive+helpers;
      for(let i=0;i<total;i++){
        const helper=i>=reactive;
        const p=spawnPoint(i,helper);
        people.push({
          id:(helper?'ambient-helper-':'crowd-')+(helper?i-reactive:i),
          role:helper?'helper':'resident',
          x:p.x,y:p.y,homeX:p.x,homeY:p.y,
          phase:random()*Math.PI*2,
          animPhase:random()*Math.PI*2,
          animState:'idle',
          gestureTimer:.8+random()*3.2,
          speedVisual:0,
          speed:((helper?22:18)+random()*10)*(mission.fastAction?1.55:1),
          variant:i%8,
          dir:random()*Math.PI*2
        });
      }
      return people;
    }

    function closestFormation(person){
      let best=null,bestD=Infinity;
      controller.state.formations.forEach(f=>{
        if(!finitePoint(f)||f.state==='withdraw')return;
        const d=Math.hypot(person.x-f.x,person.y-f.y);
        if(d<bestD){best=f;bestD=d}
      });
      return{formation:best,distance:bestD};
    }

    function helperSlots(b){
      return b&&Array.isArray(b.occupiedWorkPositions)?b.occupiedWorkPositions:[];
    }

    function releaseHelperSupport(){
      const b=mainBarricade();
      if(!b)return 0;
      let released=0;
      helperSlots(b).forEach((owner,index)=>{
        if(typeof owner==='string'&&owner.startsWith('ambient-helper-')){
          b.occupiedWorkPositions[index]=null;
          released++;
        }
      });
      return released;
    }

    function syncHelperSupport(confidence){
      const b=mainBarricade();
      if(!b)return 0;
      const slots=helperSlots(b);
      const pressureActive=[...controller.state.formations.values()].some(f=>f&&f.state==='dismantle');
      if(!pressureActive||b.breached||confidence<settings.helperSupportThreshold){
        releaseHelperSupport();
        return 0;
      }

      const maxHelpers=Math.max(0,slots.length-1);
      const desired=Math.min(
        maxHelpers,
        confidence>=settings.helperStrongThreshold?2:1,
        helpers
      );
      const helperIds=people.filter(p=>p.role==='helper').slice(0,desired).map(p=>p.id);
      slots.forEach((owner,index)=>{
        if(typeof owner==='string'&&owner.startsWith('ambient-helper-')&&!helperIds.includes(owner)){
          slots[index]=null;
        }
      });
      for(const id of helperIds){
        if(slots.includes(id))continue;
        const person=people.find(p=>p.id===id);
        if(b.workPoints&&b.workPoints.length&&(!person||Math.hypot(person.x-b.workPoints[0].x,person.y-b.workPoints[0].y)>20))continue;
        const open=slots.indexOf(null);
        if(open<0)break;
        slots[open]=id;
      }
      return slots.filter(owner=>typeof owner==='string'&&owner.startsWith('ambient-helper-')).length;
    }

    function updatePerson(person,dt,confidence){
      const a=anchor();
      const pressure=closestFormation(person);
      const oldX=person.x,oldY=person.y;
      let tx=person.homeX,ty=person.homeY;
      const b=mainBarricade();
      const helping=person.role==='helper'&&b&&!b.breached&&confidence>=settings.helperSupportThreshold&&
        [...controller.state.formations.values()].some(f=>f.state==='dismantle');

      if(helping&&b.workPoints&&b.workPoints.length){
        const p=b.workPoints[(Number(person.id.split('-').at(-1))||0)%b.workPoints.length];
        const dx=p.x-person.x,dy=p.y-person.y,d=Math.hypot(dx,dy),step=Math.min(d,person.speed*dt);
        if(d>1){
          const nx=person.x+dx/d*step,ny=person.y+dy/d*step;
          if(!blocked||!blocked(nx,ny,4)){person.x=nx;person.y=ny;person.dir=Math.atan2(dy,dx)}
        }
        const moved=Math.hypot(person.x-oldX,person.y-oldY);
        person.speedVisual=dt>0?moved/dt:0;
        person.animPhase+=dt*(d>3?4.8:2.2);
        person.animState=d>9?'support':'brace';
        return;
      }

      if(pressure.formation&&pressure.distance<settings.policeAvoidRadius){
        const dx=person.x-pressure.formation.x,dy=person.y-pressure.formation.y;
        const d=Math.hypot(dx,dy)||1;
        const push=(settings.policeAvoidRadius-pressure.distance)*.65;
        tx+=dx/d*push;ty+=dy/d*push;
      }

      const adx=person.homeX-a.x,ady=person.homeY-a.y,ad=Math.hypot(adx,ady)||1;
      const confidenceShift=(confidence-.5)*(person.role==='helper'?24:14);
      tx-=adx/ad*confidenceShift;
      ty-=ady/ad*confidenceShift;

      tx+=Math.cos(elapsed*.7+person.phase)*5;
      ty+=Math.sin(elapsed*.6+person.phase)*4;
      tx=clamp(tx,settings.edgePadding,worldWidth-settings.edgePadding);
      ty=clamp(ty,settings.edgePadding,worldHeight-settings.edgePadding);

      const dx=tx-person.x,dy=ty-person.y,d=Math.hypot(dx,dy);
      if(d>=.5){
        const speed=pressure.formation&&pressure.distance<settings.policeAvoidRadius*.72?person.speed*1.75:person.speed;
        const step=Math.min(d,speed*dt);
        const nx=person.x+dx/d*step,ny=person.y+dy/d*step;
        if(typeof blocked!=='function'||!blocked(nx,ny,4)){
          person.x=nx;person.y=ny;person.dir=Math.atan2(dy,dx);
        }
      }

      const moved=Math.hypot(person.x-oldX,person.y-oldY);
      person.speedVisual=dt>0?moved/dt:0;
      person.animPhase+=dt*(moved>.08?(pressure.distance<settings.policeAvoidRadius*.72?7.2:4.2):1.1);
      if(moved>.08){
        person.animState=pressure.formation&&pressure.distance<settings.policeAvoidRadius*.72?'panic':'walk';
        person.gestureTimer=Math.max(.8,person.gestureTimer);
      }else{
        person.gestureTimer-=dt;
        if(person.gestureTimer<=0){
          person.animState='gesture';
          person.gestureTimer=1.2+((person.variant+1)%5)*.42;
        }else if(person.animState==='gesture'&&person.gestureTimer>.55){
          // Keep the gesture visible briefly, then return to a quiet idle.
          person.animState='gesture';
        }else{
          person.animState='idle';
        }
      }
    }

    function releaseCarrier(p){
      const m=controller.state.materials.get(p.carrying||p.supplyId);
      if(m&&(m.carriedBy===p.id||m.reservedBy===p.id)){if(m.carriedBy===p.id){m.x=p.x;m.y=p.y}m.carriedBy=null;m.reservedBy=null}
      p.carrying=null;p.supplyId=null;p.path=null;p.navDestination=null;
    }
    function moveFast(p,target,dt,speed){
      const oldX=p.x,oldY=p.y;
      if(navigation){
        p.routeClock=(p.routeClock||0)-dt;
        if(p.path&&p.path.length===0)navigation.cancelPath(p);
        if((p.stuckTime||0)+dt>.44){navigation.cancelPath(p);p.routeClock=0}
        const stale=!!p.path&&p.pathVersion!==navigation.navigationVersion;
        const changed=p.routeKey!==target.id;
        const retry=!p.path&&Math.hypot(p.x-target.x,p.y-target.y)>8&&p.routeClock<=0;
        if(routeBudget>0&&(stale||changed||retry)){
          routeBudget--;navigation.assignPath(p,target.x,target.y);p.routeKey=target.id;p.routeClock=1.6+(p.variant%3)*.3;
        }
        // Defer stale routes as well: followPath would otherwise replan the entire crowd.
        if(!p.path||p.pathVersion===navigation.navigationVersion)navigation.followPath(p,speed,dt);
      }else{
        const dx=target.x-p.x,dy=target.y-p.y,d=Math.hypot(dx,dy)||1,step=Math.min(d,speed*dt);
        const nx=p.x+dx/d*step,ny=p.y+dy/d*step;
        if(!blocked||!blocked(nx,p.y,4))p.x=nx;
        if(!blocked||!blocked(p.x,ny,4))p.y=ny;
      }
      const moved=Math.hypot(p.x-oldX,p.y-oldY);p.speedVisual=moved/dt;
      if(moved>.03){p.dir=Math.atan2(p.y-oldY,p.x-oldX);p.animState=speed>90?'panic':'walk';p.stall=0}else p.stall=(p.stall||0)+dt;
      p.animPhase+=moved*.08;
      return Math.hypot(p.x-target.x,p.y-target.y);
    }
    function updateFastPerson(p,index,dt){
      const bs=[...controller.state.barricades.values()];
      const ranked=bs.slice().sort((a,b)=>a.integrity/a.maxIntegrity-b.integrity/b.maxIntegrity);
      let b=ranked[index%ranked.length];
      const police=closestFormation(p);
      // Four helpers make a bounded number of real deliveries from the shared supply.
      if(p.role==='helper'&&index%2===0&&(p.deliveries||0)<2){
        if(!p.supplyId&&!p.carrying&&b.integrity<b.maxIntegrity*.85){
          const m=[...controller.state.materials.values()].filter(m=>!m.consumed&&!m.carriedBy&&!m.reservedBy&&((controller.state.phaseIndex||0)>0||m.id.startsWith('supply-')))
            .sort((a,b)=>Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(b.x-p.x,b.y-p.y))[0];
          if(m){p.supplyId=m.id;m.reservedBy=p.id;p.defenceId=b.id}
        }
        const m=controller.state.materials.get(p.supplyId||p.carrying);
        if(m){
          if(p.carrying){
            b=controller.state.barricades.get(p.defenceId)||b;
            const wp=b.workPoints[index%b.workPoints.length]||b,target={...wp,id:'delivery-'+b.id};
            m.x=p.x;m.y=p.y;
            if(moveFast(p,target,dt,110+p.variant*3)<12){
              const amount=controller.reinforceBarricadeById(b.id,Math.min(m.remainingValue,b.maxIntegrity-b.integrity));
              if(amount>0){m.remainingValue-=amount;m.consumed=m.remainingValue<=0;b.buildFlash=.65;p.deliveries=(p.deliveries||0)+1;controller.state.events.push({type:'crowd-reinforced',barricadeId:b.id,amount});if(typeof window!=='undefined')window.BadFodderSfx?.barricade('build')}
              releaseCarrier(p);
            }
          }else if(moveFast(p,{...m,id:'supply-'+m.id},dt,130+p.variant*3)<10){m.carriedBy=p.id;p.carrying=m.id;p.supplyId=null}
          if(p.stall>2){releaseCarrier(p);p.deliveries=(p.deliveries||0)+1}
          return;
        }
      }
      const f=police.formation,panic=f&&police.distance<80;
      p.decisionClock=(p.decisionClock||0)-dt;
      if(p.decisionClock<=0||!p.activityTarget){
        p.decisionClock=1.2+((index+Math.floor(elapsed))%5)*.35;
        const point=b.workPoints[index%b.workPoints.length]||b;
        const angle=p.phase+elapsed*.23,range=p.role==='helper'?15:55+index%4*15;
        let tx=point.x+Math.cos(angle)*range,ty=point.y+Math.sin(angle)*range;
        if(panic){const dx=p.x-f.x,dy=p.y-f.y,d=Math.hypot(dx,dy)||1;tx=p.x+dx/d*90;ty=p.y+dy/d*90}
        const target=openPoint(tx,ty,4);if(target)p.activityTarget={...target,id:'rally-'+index+'-'+Math.floor(elapsed)};
      }
      if(p.activityTarget){
        const d=moveFast(p,p.activityTarget,dt,panic?155:p.role==='helper'?95:65+index%4*12);
        if(d<5){p.animState=p.role==='helper'?'brace':((Math.floor(elapsed+p.phase)%3)?'gesture':'idle');p.speedVisual=0}
      }
      if(p.role==='helper'&&!p.carrying){
        const slots=b.occupiedWorkPositions||[];
        if(!b.breached&&Math.hypot(p.x-b.x,p.y-b.y)<b.interactionRadius){
          if(!slots.includes(p.id)&&slots.filter(Boolean).length<slots.length-1){const slot=slots.indexOf(null);if(slot>=0)slots[slot]=p.id}
        }
      }
    }

    function fixedUpdate(dt){
      if(!Number.isFinite(dt)||dt<=0)return false;
      elapsed+=dt;routeBudget=2;
      const confidence=clamp(Number(controller.state.confidence)||0,0,1);
      if(mission.fastAction&&controller.state.barricades.size>1){
        controller.state.barricades.forEach(b=>b.occupiedWorkPositions.forEach((owner,i)=>{if(typeof owner==='string'&&owner.startsWith('ambient-helper-'))b.occupiedWorkPositions[i]=null}));
        for(let i=0;i<people.length;i++){
          const p=people[i];let near=false;
          controller.state.actors.forEach(a=>{if(a.active&&Math.hypot(a.x-p.x,a.y-p.y)<600)near=true});
          p.updateClock=(p.updateClock||0)+dt;
          if(near||p.updateClock>=.2){updateFastPerson(p,i,p.updateClock);p.updateClock=0}
        }
      }else{syncHelperSupport(confidence);for(const person of people)updatePerson(person,dt,confidence)}
      return true;
    }

    function renderState(){
      return people.map(p=>({...p}));
    }

    function dispose(){
      controller.state.barricades.forEach(b=>b.occupiedWorkPositions.forEach((owner,i)=>{if(typeof owner==='string'&&owner.startsWith('ambient-helper-'))b.occupiedWorkPositions[i]=null}));
      people.forEach(releaseCarrier);
      people.length=0;
      return true;
    }

    initialize();
    function rally(target){
      if(!finitePoint(target))return false;
      // Redirect eight existing residents/helpers through the existing movement system.
      const nearest=people.slice().sort((a,b)=>Math.hypot(a.x-target.x,a.y-target.y)-Math.hypot(b.x-target.x,b.y-target.y)).slice(0,8);
      for(let i=0;i<nearest.length;i++){
        const p=nearest[i],wp=target.workPoints?.[i%target.workPoints.length]||target;
        const point=openPoint(wp.x+(i%3-1)*12,wp.y+Math.floor(i/3)*12,4);
        if(point){p.activityTarget={...point,id:'adaptive-rally-'+i};p.decisionClock=7;p.gestureTimer=0}
      }
      return true;
    }
    return{settings,people,fixedUpdate,renderState,anchor,initialize,syncHelperSupport,releaseHelperSupport,dispose,rally};
  }

  return{create};
});
