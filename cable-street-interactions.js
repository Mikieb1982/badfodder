/* Contextual interaction and street-conflict layer for Cable Street.
   Geography comes from the historical map. This module owns gameplay state only. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.BadFodderCableInteractions=api;
})(typeof window!=='undefined'?window:globalThis,function(){
  'use strict';

  const DEFAULTS=Object.freeze({
    movementScale:1,
    materialRadius:30,
    civilianRadius:34,
    barricadeRadius:42,
    reinforceSeconds:.65,
    assistSeconds:1.15,
    holdSeconds:2,
    rescueExitSeconds:.8,
    pressureControlled:false,
    holdMitigationPerWorker:.28,
    maxHoldMitigation:.7,
    dismantleSeconds:4.5,
    fightPulseSeconds:.38,
    fightResistancePerPulse:12,
    crowdResistancePerPulse:4,
    repelResistance:100,
    resistanceDecayPerSecond:3,
    mountedChargeFirstDelay:10,
    mountedChargeRepeat:24,
    mountedChargeDuration:1.25,
    mountedChargeDamage:5
  });

  function clamp(n,min,max){return Math.max(min,Math.min(max,n))}
  function finitePoint(value){return !!value&&Number.isFinite(value.x)&&Number.isFinite(value.y)}
  function distance(a,b){return finitePoint(a)&&finitePoint(b)?Math.hypot(a.x-b.x,a.y-b.y):Infinity}
  function centroid(points){
    if(!Array.isArray(points)||!points.length)return null;
    let x=0,y=0,n=0;
    for(const p of points){
      if(!Array.isArray(p)||!Number.isFinite(p[0])||!Number.isFinite(p[1]))continue;
      x+=p[0];y+=p[1];n++;
    }
    return n?{x:x/n,y:y/n}:null;
  }
  function clonePoints(points){return Array.isArray(points)?points.map(p=>[p[0],p[1]]):[]}
  function playCableSfx(name,arg){
    if(typeof window==='undefined')return;
    const fn=window.BadFodderSfx&&window.BadFodderSfx[name];
    if(typeof fn==='function')fn(arg);
  }

  function pressureDamageMultiplier(barricade,settings=DEFAULTS){
    if(!barricade||!Array.isArray(barricade.occupiedWorkPositions))return 1;
    const workers=barricade.occupiedWorkPositions.filter(Boolean).length;
    const perWorker=Number.isFinite(settings.holdMitigationPerWorker)?Math.max(0,settings.holdMitigationPerWorker):0;
    const maximum=Number.isFinite(settings.maxHoldMitigation)?Math.max(0,Math.min(1,settings.maxHoldMitigation)):0;
    return Math.max(0,1-Math.min(maximum,workers*perWorker));
  }

  function create({controller,runtime,mission,options={}}={}){
    if(!controller||!controller.state)throw new Error('Cable Street interactions require a controller.');
    if(!runtime)throw new Error('Cable Street interactions require the Cable Street runtime.');
    if(!mission||mission.id!=='cable-street-1936')throw new Error('Cable Street interactions require the Cable Street mission.');

    const settings={...DEFAULTS,...mission.streetCombat,...options};
    const worldScale=Number.isFinite(options.scale)&&options.scale>0?options.scale:1;
    const navigation=options.navigation||null;
    for(const key of ['materialRadius','civilianRadius','barricadeRadius'])settings[key]*=worldScale;
    const scaleValue=n=>Number.isFinite(n)?n*worldScale:n;
    const scalePoints=points=>Array.isArray(points)?points.map(p=>[scaleValue(p[0]),scaleValue(p[1])]):[];
    let initialized=false;
    let jobSequence=0;

    const conflict={
      elapsed:0,
      projectileSequence:0,
      fightSequence:0,
      projectiles:[],
      impacts:[],
      charges:[],
      mountedTimer:settings.mountedChargeFirstDelay,
      chargeSequence:0,
      crowdPulse:0,
      dramaText:'',
      dramaTime:0,
      marchThreat:0
    };

    function allowed(action){
      const actions=mission.actionProfile&&mission.actionProfile.contextualActions;
      return Array.isArray(actions)&&actions.includes(action);
    }
    function actor(id){return controller.state.actors.get(id)||null}
    function material(id){return controller.state.materials.get(id)||null}
    function barricade(id){return controller.state.barricades.get(id)||null}
    function civilian(id){return controller.state.civilians.get(id)||null}

    function targetPoint(targetType,targetId){
      let target=null;
      if(targetType==='material')target=material(targetId);
      else if(targetType==='barricade')target=barricade(targetId);
      else if(targetType==='civilian')target=civilian(targetId);
      if(!target)return null;
      if(finitePoint(target))return{x:target.x,y:target.y};
      return centroid(target.points);
    }
    function radiusFor(targetType,target){
      if(target&&Number.isFinite(target.interactionRadius)&&target.interactionRadius>0)return target.interactionRadius;
      if(targetType==='material')return settings.materialRadius;
      if(targetType==='civilian')return settings.civilianRadius;
      return settings.barricadeRadius;
    }

    function buildSeed(mapData,actors){
      const source=mapData&&mapData.historicalObjects||{};
      const barricades=(source.barricades||[]).map(def=>{
        const b=runtime.createBarricade({
          id:def.id,maxIntegrity:def.maxIntegrity,integrity:def.integrity,
          constructionTier:def.constructionTier||0,workPositions:def.workPositions||0
        });
        const rawCenter=finitePoint(def)?{x:def.x,y:def.y}:centroid(def.points);
        const center=rawCenter?{x:scaleValue(rawCenter.x),y:scaleValue(rawCenter.y)}:null;
        Object.assign(b,{
          x:center&&center.x,y:center&&center.y,points:scalePoints(def.points),
          label:def.label||def.id,interactionRadius:scaleValue(def.interactionRadius),
          workPoints:(def.workPoints||[]).map(p=>({x:scaleValue(p.x),y:scaleValue(p.y)})),
          historicalStatus:def.historicalStatus||null
        });
        return b;
      });
      const materials=(source.materials||[]).map(def=>{
        const m=runtime.createMaterial({id:def.id,type:def.type});
        Object.assign(m,{x:scaleValue(def.x),y:scaleValue(def.y),originX:scaleValue(def.x),originY:scaleValue(def.y),label:def.label||def.type,interactionRadius:scaleValue(def.interactionRadius)});
        return m;
      });
      const civilians=(source.civilians||[]).map(def=>{
        const p=runtime.createCivilian({id:def.id,optional:def.optional!==false});
        Object.assign(p,{
          x:scaleValue(def.x),y:scaleValue(def.y),label:def.label||'Resident',
          interactionRadius:scaleValue(def.interactionRadius),exitX:scaleValue(def.exitX),exitY:scaleValue(def.exitY),
          speed:scaleValue(Number.isFinite(def.speed)?def.speed:28),
          exitSeconds:Number.isFinite(def.exitSeconds)?def.exitSeconds:settings.rescueExitSeconds,exitTimer:null
        });
        return p;
      });
      const formations=(source.formations||[]).map(def=>{
        const p=runtime.createPoliceFormation({id:def.id,width:scaleValue(def.width),objective:def.objective,state:def.state||'approach'});
        Object.assign(p,{
          x:scaleValue(def.x),y:scaleValue(def.y),targetX:scaleValue(def.targetX),targetY:scaleValue(def.targetY),
          withdrawX:scaleValue(def.withdrawX),withdrawY:scaleValue(def.withdrawY),
          speed:Number.isFinite(def.speed)?def.speed*worldScale:34*worldScale,
          stopDistance:Number.isFinite(def.stopDistance)?def.stopDistance*worldScale:18*worldScale,
          haltSeconds:Number.isFinite(def.haltSeconds)?def.haltSeconds:.7,
          regroupSeconds:Number.isFinite(def.regroupSeconds)?def.regroupSeconds:.8,
          dismantleSeconds:Number.isFinite(def.dismantleSeconds)&&def.dismantleSeconds>0?def.dismantleSeconds:settings.dismantleSeconds,
          activationPhase:def.activationPhase||1,damageRate:Number.isFinite(def.damageRate)?def.damageRate:5,stateTime:0,
          resistance:0,resistanceMax:settings.repelResistance,staggerTime:0,label:def.label||'Police formation'
        });
        if(mission.fastAction){p.speed*=1.65;p.haltSeconds=.35;p.regroupSeconds=.45;p.dismantleSeconds=settings.dismantleSeconds}
        return p;
      });
      return{actors,barricades,materials,civilians,formations};
    }

    function initialize({actors=[],mapData=null}={}){
      const seed=buildSeed(mapData,actors);
      controller.reset(seed);
      for(const b of seed.barricades){
        if(Array.isArray(b.points)&&b.points.length>=3)controller.registerBarricadeGeometry(b.id,{points:b.points});
      }
      conflict.elapsed=0;conflict.projectileSequence=0;conflict.fightSequence=0;conflict.projectiles=[];conflict.impacts=[];conflict.charges=[];
      conflict.mountedTimer=settings.mountedChargeFirstDelay;conflict.chargeSequence=0;conflict.crowdPulse=0;
      conflict.dramaText='BUILD THE BARRICADE';conflict.dramaTime=2.2;conflict.marchThreat=0;
      initialized=true;
      return controller.state;
    }

    function syncActors(snapshots){
      if(!initialized||!Array.isArray(snapshots))return false;
      const seen=new Set();
      for(const snap of snapshots){
        if(!snap||typeof snap.id!=='string')continue;
        const a=actor(snap.id);if(!a)continue;
        seen.add(snap.id);
        if(Number.isFinite(snap.x))a.x=snap.x;
        if(Number.isFinite(snap.y))a.y=snap.y;
        if(typeof snap.name==='string')a.name=snap.name;
        a.active=snap.active!==false;
        if(!a.active)cancelJob(snap.id,{dropCarried:true});
      }
      controller.state.actors.forEach((a,id)=>{if(!seen.has(id)&&a.active!==false)a.active=false});
      updateCarriedMaterials();
      return true;
    }

    function materialAvailable(m,actorId){
      return !!m&&!m.consumed&&(!m.reservedBy||m.reservedBy===actorId)&&(!m.carriedBy||m.carriedBy===actorId);
    }
    function policePressureAt(barricadeId){
      return[...controller.state.formations.values()].some(f=>f.objective===barricadeId&&['halt','dismantle'].includes(f.state));
    }

    function contexts(actorId,{x=null,y=null,nearActor=false}={}){
      const a=actor(actorId);
      if(!a||!a.active||!finitePoint(a))return[];
      const probe=nearActor?{x:a.x,y:a.y}:{x,y};
      if(!finitePoint(probe))return[];
      const carrying=a.carrying?material(a.carrying):null;
      const out=[];

      controller.state.materials.forEach(m=>{
        if(!allowed('carry')||carrying||!materialAvailable(m,actorId)||!finitePoint(m))return;
        const d=distance(probe,m);
        if(d<=radiusFor('material',m)+10)out.push({action:'carry',targetType:'material',targetId:m.id,label:'CARRY '+String(m.label||m.type).toUpperCase(),x:m.x,y:m.y,distance:d});
      });
      controller.state.civilians.forEach(p=>{
        if(!allowed('assist')||p.status!=='waiting'||!finitePoint(p))return;
        const d=distance(probe,p);
        if(d<=radiusFor('civilian',p)+10)out.push({action:'assist',targetType:'civilian',targetId:p.id,label:'ASSIST '+String(p.label||'RESIDENT').toUpperCase(),x:p.x,y:p.y,distance:d});
      });
      controller.state.barricades.forEach(b=>{
        const bp=targetPoint('barricade',b.id);if(!bp)return;
        const d=distance(probe,bp);if(d>radiusFor('barricade',b)+14)return;
        if(carrying&&allowed('reinforce')&&b.integrity<b.maxIntegrity){
          out.push({action:'reinforce',targetType:'barricade',targetId:b.id,label:'REINFORCE '+String(b.label||b.id).toUpperCase(),x:bp.x,y:bp.y,distance:d});
        }else if(!carrying&&allowed('hold')&&!b.breached){
          const fighting=policePressureAt(b.id);
          out.push({action:'hold',targetType:'barricade',targetId:b.id,label:fighting?'FIGHT BACK':'HOLD '+String(b.label||b.id).toUpperCase(),x:bp.x,y:bp.y,distance:d});
        }
      });

      if(!carrying&&allowed('hold')){
        controller.state.formations.forEach(f=>{
          if(!finitePoint(f)||!['approach','halt','dismantle'].includes(f.state))return;
          const d=distance(probe,f),hit=Math.max(24,(f.width||30)/2+14);
          if(d>hit)return;
          const b=f.objective?barricade(f.objective):null,bp=b&&targetPoint('barricade',b.id);
          if(b&&!b.breached&&bp)out.push({action:'hold',targetType:'barricade',targetId:b.id,label:'FIGHT BACK',x:bp.x,y:bp.y,distance:d+.5});
        });
      }

      out.sort((a,b)=>a.distance-b.distance);
      if(carrying&&allowed('drop')&&nearActor)out.push({action:'drop',targetType:'material',targetId:carrying.id,label:'DROP '+String(carrying.label||carrying.type).toUpperCase(),x:a.x,y:a.y,distance:999});
      return out;
    }
    function contextAt(actorId,x,y){return contexts(actorId,{x,y})[0]||null}
    function contextNearActor(actorId){return contexts(actorId,{nearActor:true})[0]||null}

    function cleanupJob(job){
      if(!job)return;
      if(job.action==='carry'){
        const m=material(job.targetId);
        if(m&&m.reservedBy===job.actorId&&!m.carriedBy)runtime.releaseMaterialReservation(m,job.actorId);
      }
      if(job.action==='hold'||job.action==='reinforce'){
        const b=barricade(job.targetId);if(b)runtime.releaseAllWorkPositions(b,job.actorId);
      }
    }
    function cancelJob(actorId,{dropCarried=false}={}){
      const current=controller.state.jobs.get(actorId);
      if(current){cleanupJob(current);current.status='cancelled';controller.state.jobs.delete(actorId)}
      const a=actor(actorId);if(a)a.job=null;
      if(dropCarried&&a&&a.carrying)controller.dropForActor(actorId);
      return !!current;
    }
    function assignJob(actorId,context){
      if(!context||!allowed(context.action))return null;
      const a=actor(actorId);if(!a||!a.active)return null;
      cancelJob(actorId,{dropCarried:false});
      if(context.action==='carry'&&(a.carrying||!controller.reserveForActor(actorId,context.targetId)))return null;
      if(context.action==='reinforce'&&!a.carrying)return null;
      if(context.action==='assist'){
        const p=civilian(context.targetId);if(!p||p.status!=='waiting')return null;
      }
      if((context.action==='hold'||context.action==='reinforce')&&!barricade(context.targetId))return null;
      if(context.action==='drop'&&!a.carrying)return null;
      const duration=context.action==='reinforce'?settings.reinforceSeconds:context.action==='assist'?settings.assistSeconds:context.action==='hold'?settings.holdSeconds:0;
      const job={id:'job-'+(++jobSequence),actorId,action:context.action,targetType:context.targetType,targetId:context.targetId,status:'queued',progress:0,duration,workSlot:-1,fightClock:0,label:context.label||context.action.toUpperCase()};
      controller.state.jobs.set(actorId,job);a.job=job.id;
      controller.state.events.push({type:'job-assigned',jobId:job.id,actorId,action:job.action,targetId:job.targetId});
      return job;
    }
    function assignAt(actorId,x,y){const c=contextAt(actorId,x,y);return c?assignJob(actorId,c):null}
    function assignNearest(actorId){const c=contextNearActor(actorId);return c?assignJob(actorId,c):null}
    function finishJob(job,result=true){
      cleanupJob(job);job.status=result?'complete':'failed';controller.state.jobs.delete(job.actorId);
      const a=actor(job.actorId);if(a)a.job=null;
      controller.state.events.push({type:'job-'+job.status,jobId:job.id,actorId:job.actorId,action:job.action,targetId:job.targetId});
      return result;
    }
    function updateCarriedMaterials(){
      controller.state.actors.forEach(a=>{
        if(!a.carrying||!finitePoint(a))return;
        const m=material(a.carrying);if(!m||m.consumed)return;
        m.x=a.x+8;m.y=a.y-8;
      });
    }
    function workInRange(job,a,target){
      const p=job.targetType==='barricade'?targetPoint('barricade',job.targetId):target;
      return p&&distance(a,p)<=radiusFor(job.targetType,target);
    }

    function activeFormationForBarricade(id){
      return[...controller.state.formations.values()]
        .filter(f=>f.objective===id&&['approach','halt','dismantle'].includes(f.state))
        .sort((a,b)=>distance(a,targetPoint('barricade',id))-distance(b,targetPoint('barricade',id)))[0]||null;
    }
    function addImpact(x,y,kind='debris'){
      conflict.impacts.push({x,y,kind,life:.42,maxLife:.42});
      if(conflict.impacts.length>40)conflict.impacts.shift();
    }
    function addProjectile(from,to,kind='brick',source='crowd'){
      if(!finitePoint(from)||!finitePoint(to))return;
      conflict.projectiles.push({id:'missile-'+(++conflict.projectileSequence),kind,source,startX:from.x,startY:from.y,targetX:to.x,targetY:to.y,x:from.x,y:from.y,t:0,duration:kind==='stick'?.34:.28,arc:kind==='brick'?20:12});
      if(conflict.projectiles.length>36)conflict.projectiles.shift();
    }
    function repelFormation(f,reason='crowd-fightback'){
      if(!f||!['approach','halt','dismantle'].includes(f.state))return false;
      f.breakthrough=false;f.breakthroughProgress=0;f.charging=false;
      f.resistance=0;f.staggerTime=.35;runtime.setPoliceState(f,'regroup');f.stateTime=0;
      controller.state.events.push({type:'police-state',formationId:f.id,state:'regroup',reason});
      controller.state.events.push({type:'crowd-fightback',formationId:f.id});
      conflict.dramaText='POLICE PUSHED BACK';conflict.dramaTime=1.8;
      playCableSfx('crowdSurge');
      return true;
    }
    function applyResistance(f,amount,source='crowd'){
      if(!f||!Number.isFinite(amount)||amount<=0||!['approach','halt','dismantle'].includes(f.state))return false;
      f.resistance=clamp((f.resistance||0)+amount,0,settings.repelResistance);
      f.staggerTime=Math.max(f.staggerTime||0,.12);
      controller.state.events.push({type:'street-resistance',formationId:f.id,amount,source,resistance:f.resistance});
      if(f.resistance>=settings.repelResistance)return repelFormation(f);
      return true;
    }
    function fightPulse(job,a,b){
      const f=activeFormationForBarricade(b.id);if(!f||!['halt','dismantle'].includes(f.state))return;
      if(mission.fastAction){if((a.stamina??100)<5)return;a.stamina=(a.stamina??100)-5}
      const type=['shove','brick','stick'][(conflict.fightSequence++)%3];
      if(type==='shove'){
        const dx=f.x-a.x,dy=f.y-a.y,d=Math.hypot(dx,dy)||1;
        f.x+=dx/d*3.5*worldScale;f.y+=dy/d*3.5*worldScale;
        addImpact(f.x,f.y,'shove');
      }else addProjectile(a,f,type,job.actorId);
      playCableSfx('scuffle',type);
      applyResistance(f,settings.fightResistancePerPulse,job.actorId);
      conflict.dramaText='FIGHT FOR THE BARRICADE';conflict.dramaTime=Math.max(conflict.dramaTime,.35);
    }

    function streetAttack(actorId,{kind='shove',x=null,y=null}={}){
      const a=actor(actorId);
      if(!mission.fastAction||!a||!a.active||(a.attackCooldown||0)>0||(a.stunned||0)>0)return false;
      const cost=kind==='throw'?14:10;
      if((a.stamina??100)<cost)return false;
      const candidates=[...controller.state.formations.values()].filter(f=>['approach','halt','dismantle'].includes(f.state)&&finitePoint(f));
      const range=(kind==='throw'?175:58)*worldScale;
      const f=candidates.filter(f=>distance(a,f)<=range+(f.width||0)/2)
        .sort((u,v)=>Number.isFinite(x)&&Number.isFinite(y)?distance(u,{x,y})-distance(v,{x,y}):distance(a,u)-distance(a,v))[0];
      if(!f)return false;
      a.stamina=(a.stamina??100)-cost;a.attackCooldown=kind==='throw'?.85:.55;
      a.attackKind=kind;a.attackFlash=.22;
      if(kind==='throw'){
        addProjectile(a,f,'brick',actorId);
        const projectile=conflict.projectiles[conflict.projectiles.length-1];
        projectile.formationId=f.id;projectile.resistance=24;
      }else{
        const dx=f.x-a.x,dy=f.y-a.y,d=Math.hypot(dx,dy)||1;
        const nx=f.x+dx/d*8*worldScale,ny=f.y+dy/d*8*worldScale;
        if(!navigation||navigation.routeClear(f.x,f.y,nx,ny,Math.max(3,f.width/2))){f.x=nx;f.y=ny}
        addImpact(f.x,f.y,'shove');applyResistance(f,20,actorId);
      }
      playCableSfx('scuffle',kind==='throw'?'brick':'shove');
      controller.state.events.push({type:'player-street-attack',actorId,kind});
      return true;
    }

    function updateJob(job,dt){
      const a=actor(job.actorId);
      if(!a||!a.active){cancelJob(job.actorId,{dropCarried:true});return}
      const target=job.targetType==='material'?material(job.targetId):job.targetType==='civilian'?civilian(job.targetId):job.targetType==='barricade'?barricade(job.targetId):null;
      if(job.action==='drop'){
        if(controller.dropForActor(job.actorId)){
          const m=material(job.targetId);if(m){m.x=a.x;m.y=a.y}finishJob(job,true);
        }else finishJob(job,false);
        return;
      }
      if(!target){finishJob(job,false);return}
      if(!workInRange(job,a,target)){
        if(job.workSlot>=0){runtime.releaseAllWorkPositions(target,job.actorId);job.workSlot=-1}
        job.status='waiting';job.progress=0;job.fightClock=0;return;
      }
      if(job.action==='carry'){
        if(controller.carryForActor(job.actorId,job.targetId)){updateCarriedMaterials();finishJob(job,true)}else finishJob(job,false);
        return;
      }
      if(job.action==='hold'||job.action==='reinforce'){
        if(job.workSlot<0){job.workSlot=runtime.reserveWorkPosition(target,job.actorId);if(job.workSlot<0){job.status='waiting';return}}
      }
      job.status='working';job.progress=Math.min(job.duration,job.progress+dt);
      if(job.action==='hold'&&policePressureAt(job.targetId)){
        job.fightClock=(job.fightClock||0)+dt;
        while(job.fightClock>=settings.fightPulseSeconds){job.fightClock-=settings.fightPulseSeconds;fightPulse(job,a,target)}
      }
      if(job.progress<job.duration)return;
      if(job.action==='reinforce'){
        const added=controller.deliverForActor(job.actorId,job.targetId);
        if(added>0){target.buildFlash=.6;playCableSfx('barricade','build');addImpact(target.x,target.y,'build');controller.state.events.push({type:'barricade-reinforced',barricadeId:job.targetId,actorId:job.actorId,amount:added});finishJob(job,true)}else finishJob(job,false);
        return;
      }
      if(job.action==='hold'){
        controller.state.events.push({type:'barricade-held',barricadeId:job.targetId,actorId:job.actorId,duration:job.duration});
        if(mission.continuousHold){job.progress=0;return}
        finishJob(job,true);return;
      }
      if(job.action==='assist'){
        if(runtime.assistCivilian(target,job.actorId)){
          target.exitTimer=Number.isFinite(target.exitSeconds)?target.exitSeconds:settings.rescueExitSeconds;target.justAssisted=true;
          controller.state.events.push({type:'civilian-assisted',civilianId:target.id,actorId:job.actorId});finishJob(job,true);
        }else finishJob(job,false);
      }
    }

    function moveToward(entity,x,y,speed,dt){
      if(!entity||!finitePoint(entity)||!Number.isFinite(x)||!Number.isFinite(y)||!Number.isFinite(speed)||speed<=0)return 0;
      const dx=x-entity.x,dy=y-entity.y,d=Math.hypot(dx,dy);if(d<1e-6)return 0;
      const step=Math.min(d,speed*settings.movementScale*dt),nx=entity.x+dx/d*step,ny=entity.y+dy/d*step;
      const radius=entity.width?entity.width/2:5*worldScale;
      if(navigation&&!navigation.routeClear(entity.x,entity.y,nx,ny,radius)){entity.blockedSeconds=(entity.blockedSeconds||0)+dt;return d}
      entity.blockedSeconds=0;entity.dir=Math.atan2(dy,dx);entity.x=nx;entity.y=ny;return d-step;
    }

    function updateFormation(p,dt){
      if(!p||!finitePoint(p))return;
      if(settings.pressureControlled&&!controller.state.pressureStarted)return;
      if((p.activationPhase||1)>1&&p.activationPhase>(controller.state.phaseIndex||0))return;
      if(p.advanceDelay>0){p.advanceDelay=Math.max(0,p.advanceDelay-dt);return}
      p.stateTime=(p.stateTime||0)+dt;p.staggerTime=Math.max(0,(p.staggerTime||0)-dt);
      if(p.state!=='dismantle')p.resistance=Math.max(0,(p.resistance||0)-settings.resistanceDecayPerSecond*dt);
      if(p.state==='approach'){
        const charge=mission.fastAction&&Math.hypot(p.x-p.targetX,p.y-p.targetY)<85*worldScale;
        if(charge&&!p.charging){p.charging=true;playCableSfx('crowdSurge');conflict.dramaText='POLICE CHARGE: '+String(p.objective==='S'?'SIDE STREET':'MAIN DEFENCE');conflict.dramaTime=1.2}
        const left=moveToward(p,p.targetX,p.targetY,p.speed*(charge?2.3:1)*(p.staggerTime>0?.45:1),dt);
        if(left<=p.stopDistance){runtime.setPoliceState(p,'halt');p.stateTime=0;controller.state.events.push({type:'police-state',formationId:p.id,state:'halt'});conflict.dramaText='POLICE LINE ADVANCING';conflict.dramaTime=1.2}
        return;
      }
      if(p.state==='halt'){
        if(p.stateTime>=p.haltSeconds){runtime.setPoliceState(p,'dismantle');p.stateTime=0;controller.state.events.push({type:'police-state',formationId:p.id,state:'dismantle'});conflict.dramaText='POLICE CHARGE - FIGHT BACK';conflict.dramaTime=2;playCableSfx('crowdSurge')}
        return;
      }
      if(p.state==='dismantle'){
        const b=p.objective?barricade(p.objective):null;
        if(!b){runtime.setPoliceState(p,'regroup');p.stateTime=0;return}
        if(b.breached&&mission.fastAction){
          p.breakthrough=true;p.breakthroughProgress=Math.min(1,(p.breakthroughProgress||0)+dt/(mission.breachRecoverySeconds||15));
          moveToward(p,b.x,b.y,p.speed*.9,dt);
          conflict.dramaText=p.objective==='S'?'SIDE STREET BREACH: REBUILD!':'MAIN BARRICADE DOWN: REBUILD!';conflict.dramaTime=.5;
          if((p.resistance||0)>=settings.repelResistance)repelFormation(p,'counter-push');
          return;
        }
        if(p.breakthrough){
          // Reinforcing the choke point drives an intruding line back to its approach.
          p.x=p.targetX;p.y=p.targetY;p.breakthrough=false;p.breakthroughProgress=0;
          addImpact(b.x,b.y,'shove');repelFormation(p,'repaired');return;
        }
        if(b.breached&&!mission.fastAction){runtime.setPoliceState(p,'regroup');p.stateTime=0;controller.state.events.push({type:'police-state',formationId:p.id,state:'regroup'});return}
        if(mission.fastAction){
          p.batonClock=(p.batonClock||0)+dt;
          if(p.batonClock>.45){p.batonClock=0;addImpact(p.targetX,p.targetY,'shove');playCableSfx('scuffle','shove')}
        }
        const holdMultiplier=pressureDamageMultiplier(b,settings);
        const resistanceMultiplier=1-Math.min(.48,((p.resistance||0)/settings.repelResistance)*.48);
        controller.damageBarricadeById(p.objective,p.damageRate*dt*holdMultiplier*resistanceMultiplier);
        if(b.breached&&!mission.fastAction){runtime.setPoliceState(p,'regroup');p.stateTime=0;controller.state.events.push({type:'police-state',formationId:p.id,state:'regroup',reason:'breach'});conflict.dramaText='THE BARRICADE IS DOWN';conflict.dramaTime=2.2}
        else if(!b.breached&&(p.resistance||0)>=settings.repelResistance)repelFormation(p);
        else if(!b.breached&&Number.isFinite(p.dismantleSeconds)&&p.dismantleSeconds>0&&p.stateTime>=p.dismantleSeconds){runtime.setPoliceState(p,'regroup');p.stateTime=0;controller.state.events.push({type:'police-state',formationId:p.id,state:'regroup',reason:'repelled'})}
        return;
      }
      if(p.state==='regroup'){
        if(p.stateTime>=p.regroupSeconds){runtime.setPoliceState(p,'withdraw');p.stateTime=0;controller.state.events.push({type:'police-state',formationId:p.id,state:'withdraw'})}
        return;
      }
      if(p.state==='withdraw'){p.charging=false;moveToward(p,p.withdrawX,p.withdrawY,p.speed*(mission.fastAction?1.8:1),dt);}
    }

    function mainBarricade(){
      const preferred=[...controller.state.barricades.values()].find(b=>b.id==='B');
      return preferred||controller.state.barricades.values().next().value||null;
    }
    function updateMountedPressure(dt){
      const phase=Number(controller.state.phaseIndex)||0;
      conflict.marchThreat=phase===0?0:phase===1?.45:phase===2?.6:.88;
      if(!controller.state.pressureStarted||phase<1)return;
      if(controller.state.elapsed<adaptiveMountedAfter)return;
      conflict.mountedTimer-=dt;
      if(conflict.mountedTimer>0)return;
      const f=[...controller.state.formations.values()].find(x=>finitePoint(x)&&!['withdraw','regroup'].includes(x.state));
      const b=mainBarricade(),bp=b&&targetPoint('barricade',b.id);
      if(!f||!b||!bp){conflict.mountedTimer=3;return}
      const dx=f.x-bp.x,dy=f.y-bp.y,d=Math.hypot(dx,dy)||1;
      const start={x:f.x+dx/d*36*worldScale,y:f.y+dy/d*36*worldScale};
      conflict.charges.push({barricadeId:b.id,id:'mounted-'+(++conflict.chargeSequence),startX:start.x,startY:start.y,targetX:bp.x,targetY:bp.y,x:start.x,y:start.y,t:0,warning:mission.fastAction ? .9 : 0,warningRadius:48*worldScale,duration:settings.mountedChargeDuration,hit:false,done:false});
      conflict.mountedTimer=settings.mountedChargeRepeat+(conflict.chargeSequence%3)*3;
      conflict.dramaText='MOUNTED POLICE CHARGE';conflict.dramaTime=2;
      playCableSfx('mountedCharge');
      controller.state.events.push({type:'mounted-charge-start',formationId:f.id,barricadeId:b.id});
    }
    function updateConflictEffects(dt){
      if(controller.state.phaseIndex>0&&conflict.dramaText==='BUILD THE BARRICADE'){conflict.dramaText='POLICE ADVANCING';conflict.dramaTime=1.2}
      conflict.elapsed+=dt;conflict.dramaTime=Math.max(0,conflict.dramaTime-dt);
      conflict.projectiles.forEach(p=>{
        p.t=Math.min(1,p.t+dt/p.duration);p.x=p.startX+(p.targetX-p.startX)*p.t;p.y=p.startY+(p.targetY-p.startY)*p.t-Math.sin(Math.PI*p.t)*p.arc;
        if(p.t>=1&&!p.done){
          p.done=true;addImpact(p.targetX,p.targetY,p.kind);
          if(p.formationId){const f=controller.state.formations.get(p.formationId);if(f&&distance(f,{x:p.targetX,y:p.targetY})<=40*worldScale)applyResistance(f,p.resistance,p.source)}
        }
      });
      conflict.projectiles=conflict.projectiles.filter(p=>!p.done);
      conflict.impacts.forEach(i=>i.life-=dt);conflict.impacts=conflict.impacts.filter(i=>i.life>0);
      conflict.charges.forEach(c=>{
        if(c.warning>0){c.warning=Math.max(0,c.warning-dt);return}
        c.t=Math.min(1,c.t+dt*settings.movementScale/c.duration);c.x=c.startX+(c.targetX-c.startX)*c.t;c.y=c.startY+(c.targetY-c.startY)*c.t;
        if(c.t>=.72&&!c.hit){
          c.hit=true;const b=barricade(c.barricadeId)||mainBarricade();if(b&&!b.breached)controller.damageBarricadeById(b.id,settings.mountedChargeDamage);
          if(mission.fastAction)controller.state.actors.forEach(a=>{
            if(a.active&&distance(a,{x:c.targetX,y:c.targetY})<48*worldScale){a.stunned=.65;a.stamina=Math.max(0,(a.stamina??100)-18);cancelJob(a.id);controller.state.events.push({type:'volunteer-stagger',actorId:a.id,x:c.startX,y:c.startY})}
          });
          addImpact(c.targetX,c.targetY,'mounted');playCableSfx('scuffle','shove');controller.state.events.push({type:'mounted-charge-impact',barricadeId:b&&b.id||null,damage:settings.mountedChargeDamage});
        }
        if(c.t>=1)c.done=true;
      });
      conflict.charges=conflict.charges.filter(c=>!c.done);

      conflict.crowdPulse+=dt;
      if(conflict.crowdPulse>=.9){
        conflict.crowdPulse=0;
        for(const f of controller.state.formations.values()){
          if(f.state!=='dismantle'||!f.objective)continue;
          const b=barricade(f.objective),bp=b&&targetPoint('barricade',b.id);if(!b||!bp)continue;
          const workers=(b.occupiedWorkPositions||[]).filter(Boolean).length;
          if(!workers)continue;
          const offset=(conflict.projectileSequence%5-2)*7*worldScale;
          const kind=conflict.projectileSequence%2?'brick':'stick';
          addProjectile({x:bp.x+offset,y:bp.y+14*worldScale},f,kind,'crowd');
          playCableSfx('scuffle',kind);
          applyResistance(f,Math.max(settings.crowdResistancePerPulse,workers*settings.crowdResistancePerPulse),'crowd');
        }
      }
      updateMountedPressure(dt);
    }

    function updateRescues(dt){
      controller.state.civilians.forEach(p=>{
        if(p.status!=='assisted'||!Number.isFinite(p.exitTimer))return;
        if(p.justAssisted){p.justAssisted=false;return}
        if(Number.isFinite(p.exitX)&&Number.isFinite(p.exitY)){
          if(!p.exitPath&&navigation){p.exitPath=navigation.findPath(p.x,p.y,p.exitX,p.exitY);p.exitIndex=0}
          const waypoint=p.exitPath?p.exitPath[p.exitIndex||0]:{x:p.exitX,y:p.exitY};if(!waypoint)return;
          if(moveToward(p,waypoint.x,waypoint.y,p.speed,dt)<=2*worldScale){
            if(p.exitPath&&(p.exitIndex||0)<p.exitPath.length-1){p.exitIndex++;return}
            if(distance(p,{x:p.exitX,y:p.exitY})>8*worldScale)return;
            if(runtime.evacuateCivilian(p))controller.state.events.push({type:'civilian-exited',civilianId:p.id});
          }
          return;
        }
        p.exitTimer=Math.max(0,p.exitTimer-dt);
        if(p.exitTimer<=0&&runtime.evacuateCivilian(p))controller.state.events.push({type:'civilian-exited',civilianId:p.id});
      });
    }

    function fixedUpdate(dt){
      if(!initialized||!Number.isFinite(dt)||dt<=0)return false;
      controller.state.actors.forEach(a=>{
        a.attackCooldown=Math.max(0,(a.attackCooldown||0)-dt);a.attackFlash=Math.max(0,(a.attackFlash||0)-dt);a.stunned=Math.max(0,(a.stunned||0)-dt);
        const j=controller.state.jobs.get(a.id),fighting=j&&j.action==='hold'&&policePressureAt(j.targetId);
        a.stamina=clamp((a.stamina??100)+(fighting?0:20)*dt,0,100);
      });
      updateCarriedMaterials();
      [...controller.state.jobs.values()].forEach(job=>updateJob(job,dt));
      controller.state.formations.forEach(p=>updateFormation(p,dt));
      controller.state.barricades.forEach(b=>{
        b.buildFlash=Math.max(0,(b.buildFlash||0)-dt);
        b.attacked=[...controller.state.formations.values()].some(f=>f.objective===b.id&&f.state==='dismantle');
        if(b.attacked){b.dustClock=(b.dustClock||0)+dt;if(b.dustClock>.4){b.dustClock=0;addImpact(b.x,b.y,'debris')}}
        if(b.breached&&!b.visualBreached){addImpact(b.x,b.y,'mounted');playCableSfx('barricade','collapse')}
        b.visualBreached=b.breached;
      });
      updateConflictEffects(dt);
      updateRescues(dt);updateCarriedMaterials();controller.fixedUpdate(dt);
      return true;
    }

    function hint(actorId){
      const job=controller.state.jobs.get(actorId);
      const player=actor(actorId);
      if(mission.fastAction&&player&&(player.stamina??100)<14)return'TIRED: ROTATE VOLUNTEER';
      if(job&&job.status==='working'){
        if(job.action==='hold')return policePressureAt(job.targetId)?'FIGHTING BACK':'HOLDING';
        return job.action.toUpperCase()+' '+Math.round(job.progress/job.duration*100)+'%';
      }
      const context=contextNearActor(actorId);if(context)return context.label;
      const a=actor(actorId);
      if(a&&a.carrying&&allowed('drop')){
        const m=material(a.carrying);return'DROP '+String(m&&m.label||'MATERIAL').toUpperCase();
      }
      return'ACTION';
    }

    function marchState(){
      const f=[...controller.state.formations.values()].find(finitePoint);
      if(!f||!Number.isFinite(conflict.marchThreat)||conflict.marchThreat<=0)return null;
      const b=f.objective?barricade(f.objective):mainBarricade(),bp=b&&targetPoint('barricade',b.id);
      if(!bp)return null;
      const dx=f.x-bp.x,dy=f.y-bp.y,d=Math.hypot(dx,dy)||1;
      return{x:f.x+dx/d*72*worldScale,y:f.y+dy/d*72*worldScale,dir:Math.atan2(bp.y-f.y,bp.x-f.x),threat:conflict.marchThreat,label:'BUF MARCH'};
    }
    function renderState(){
      return{
        actors:[...controller.state.actors.values()].map(a=>({...a})),
        barricades:[...controller.state.barricades.values()].map(b=>({...b,points:clonePoints(b.points)})),
        materials:[...controller.state.materials.values()].filter(m=>!m.consumed).map(m=>({...m})),
        civilians:[...controller.state.civilians.values()].map(p=>({...p})),
        formations:[...controller.state.formations.values()].map(p=>({...p,resistanceRatio:clamp((p.resistance||0)/settings.repelResistance,0,1)})),
        jobs:[...controller.state.jobs.values()].map(j=>({...j})),
        conflict:{
          elapsed:conflict.elapsed,dramaText:conflict.dramaText,dramaTime:conflict.dramaTime,marchThreat:conflict.marchThreat,
          march:marchState(),projectiles:conflict.projectiles.map(p=>({...p})),impacts:conflict.impacts.map(i=>({...i})),charges:conflict.charges.map(c=>({...c}))
        }
      };
    }

    let adaptiveMountedAfter=0,materialOpportunities=0;
    function canAdaptiveAction(action){
      const formations=[...controller.state.formations.values()];
      const attacking=f=>['approach','halt','dismantle'].includes(f.state);
      if(action==='ESCALATE_PRESSURE')return formations.some(f=>f.state==='withdraw'&&(f.activationPhase||1)<=controller.state.phaseIndex);
      if(['PRESSURE_MAIN','PRESSURE_SIDE','SWITCH_PRESSURE'].includes(action)){
        const side=action!=='PRESSURE_MAIN';
        return formations.some(f=>(f.objective==='S')===side&&(f.state==='withdraw'||f.advanceDelay>0))||formations.some(f=>(f.objective==='S')!==side&&attacking(f));
      }
      if(action==='MATERIAL_OPPORTUNITY')return materialOpportunities<3&&[...controller.state.materials.values()].some(m=>m.consumed&&!m.carriedBy&&!m.reservedBy);
      if(action==='CIVILIAN_EVENT')return [...controller.state.civilians.values()].some(c=>c.status==='waiting');
      if(action==='MOUNTED_PRESSURE')return conflict.charges.length===0&&[...controller.state.formations.values()].some(f=>['approach','halt','dismantle'].includes(f.state));
      return true;
    }
    function adaptiveAction(action,{crowd,director}={}){
      if(!canAdaptiveAction(action))return false;
      if(action==='MATERIAL_OPPORTUNITY'){
        const m=[...controller.state.materials.values()].find(m=>m.consumed&&!m.carriedBy&&!m.reservedBy);
        m.consumed=false;m.remainingValue=runtime.MATERIAL_VALUES[m.type]||20;m.x=m.originX;m.y=m.originY;materialOpportunities++;
        conflict.dramaText='MORE MATERIAL: '+String(m.label).toUpperCase();conflict.dramaTime=3;
      }else if(action==='CIVILIAN_EVENT'){
        const c=[...controller.state.civilians.values()].find(c=>c.status==='waiting');
        addImpact(c.x,c.y,'shove');conflict.dramaText='RESIDENT NEEDS HELP: '+String(c.label).toUpperCase();conflict.dramaTime=3;
        crowd?.rally?.(c);
      }else if(action==='CROWD_EVENT'){
        const b=[...controller.state.barricades.values()].sort((a,b)=>a.integrity/a.maxIntegrity-b.integrity/b.maxIntegrity)[0];
        crowd?.rally?.(b);conflict.crowdPulse=1;conflict.dramaText='RESIDENTS RALLY TO THE DEFENCE';conflict.dramaTime=2;
        playCableSfx('crowdSurge');
      }else if(action==='MOUNTED_PRESSURE'){
        adaptiveMountedAfter=controller.state.elapsed;conflict.mountedTimer=Math.min(conflict.mountedTimer,1.5);
      }else{
        if(!director.adaptivePressure(action))return false;
        if(['REGROUP','DELAY_PRESSURE','RECOVERY_WINDOW'].includes(action)){
          adaptiveMountedAfter=controller.state.elapsed+12;
          conflict.dramaText='POLICE FALL BACK: REPAIR AND REGROUP';conflict.dramaTime=2.5;
        }else{
          conflict.dramaText=['SWITCH_PRESSURE','PRESSURE_SIDE'].includes(action)?'POLICE SHIFT TO THE SIDE STREET':'POLICE TEST THE DEFENCE';conflict.dramaTime=2;
        }
      }
      controller.state.events.push({type:'adaptive-event',action});
      return true;
    }
    function releaseAdaptivePressure(){adaptiveMountedAfter=0}
    return{
      settings,initialize,syncActors,fixedUpdate,streetAttack,
      canAdaptiveAction,adaptiveAction,releaseAdaptivePressure,
      contextAt,contextNearActor,assignJob,assignAt,assignNearest,cancelJob,
      hint,renderState,
      get initialized(){return initialized}
    };
  }

  return{create,DEFAULTS,pressureDamageMultiplier};
});
