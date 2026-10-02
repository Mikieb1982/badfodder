/* Contextual interaction/job layer for Cable Street.
   Geography is supplied by a historical map; this module owns no map coordinates. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.BadFodderCableInteractions=api;
})(typeof window!=='undefined'?window:globalThis,function(){
  'use strict';

  const DEFAULTS=Object.freeze({
    materialRadius:30,
    civilianRadius:34,
    barricadeRadius:42,
    reinforceSeconds:.65,
    assistSeconds:1.15,
    holdSeconds:2,
    rescueExitSeconds:.8,
    pressureControlled:false,
    holdMitigationPerWorker:.28,
    maxHoldMitigation:.7
  });

  function finitePoint(value){
    return !!value&&Number.isFinite(value.x)&&Number.isFinite(value.y);
  }
  function distance(a,b){
    return finitePoint(a)&&finitePoint(b)?Math.hypot(a.x-b.x,a.y-b.y):Infinity;
  }
  function centroid(points){
    if(!Array.isArray(points)||!points.length)return null;
    let x=0,y=0,n=0;
    for(const p of points){
      if(!Array.isArray(p)||!Number.isFinite(p[0])||!Number.isFinite(p[1]))continue;
      x+=p[0];y+=p[1];n++;
    }
    return n?{x:x/n,y:y/n}:null;
  }
  function clonePoints(points){
    return Array.isArray(points)?points.map(p=>[p[0],p[1]]):[];
  }

  function pressureDamageMultiplier(barricade,settings=DEFAULTS){
    if(!barricade||!Array.isArray(barricade.occupiedWorkPositions))return 1;
    const workers=barricade.occupiedWorkPositions.filter(Boolean).length;
    const perWorker=Number.isFinite(settings.holdMitigationPerWorker)?Math.max(0,settings.holdMitigationPerWorker):0;
    const maximum=Number.isFinite(settings.maxHoldMitigation)?Math.max(0,Math.min(1,settings.maxHoldMitigation)):0;
    const mitigation=Math.min(maximum,workers*perWorker);
    return Math.max(0,1-mitigation);
  }

  function create({controller,runtime,mission,options={}}={}){
    if(!controller||!controller.state)throw new Error('Cable Street interactions require a controller.');
    if(!runtime)throw new Error('Cable Street interactions require the Cable Street runtime.');
    if(!mission||mission.id!=='cable-street-1936')throw new Error('Cable Street interactions require the Cable Street mission.');
    const settings={...DEFAULTS,...options};
    const worldScale=Number.isFinite(options.scale)&&options.scale>0?options.scale:1;
    const scaleValue=n=>Number.isFinite(n)?n*worldScale:n;
    const scalePoints=points=>Array.isArray(points)?points.map(p=>[scaleValue(p[0]),scaleValue(p[1])]):[];
    let initialized=false;
    let jobSequence=0;

    function allowed(action){
      const actions=mission.actionProfile&&mission.actionProfile.contextualActions;
      return Array.isArray(actions)&&actions.includes(action);
    }

    function actor(actorId){return controller.state.actors.get(actorId)||null}
    function material(id){return controller.state.materials.get(id)||null}
    function barricade(id){return controller.state.barricades.get(id)||null}
    function civilian(id){return controller.state.civilians.get(id)||null}
    function formation(id){return controller.state.formations.get(id)||null}

    function targetPoint(targetType,targetId){
      let target=null;
      if(targetType==='material')target=material(targetId);
      else if(targetType==='barricade')target=barricade(targetId);
      else if(targetType==='civilian')target=civilian(targetId);
      if(!target)return null;
      if(Number.isFinite(target.x)&&Number.isFinite(target.y))return{x:target.x,y:target.y};
      const center=centroid(target.points);
      return center;
    }

    function actorPoint(actorId){
      const a=actor(actorId);
      return a&&finitePoint(a)?{x:a.x,y:a.y}:null;
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
          id:def.id,
          maxIntegrity:def.maxIntegrity,
          integrity:def.integrity,
          constructionTier:def.constructionTier||0,
          workPositions:def.workPositions||0
        });
        const rawCenter=finitePoint(def)?{x:def.x,y:def.y}:centroid(def.points);
        const center=rawCenter?{x:scaleValue(rawCenter.x),y:scaleValue(rawCenter.y)}:null;
        Object.assign(b,{
          x:center&&center.x,
          y:center&&center.y,
          points:scalePoints(def.points),
          label:def.label||def.id,
          interactionRadius:def.interactionRadius,
          historicalStatus:def.historicalStatus||null
        });
        return b;
      });
      const materials=(source.materials||[]).map(def=>{
        const m=runtime.createMaterial({id:def.id,type:def.type});
        Object.assign(m,{
          x:scaleValue(def.x),y:scaleValue(def.y),
          label:def.label||def.type,
          interactionRadius:def.interactionRadius
        });
        return m;
      });
      const civilians=(source.civilians||[]).map(def=>{
        const p=runtime.createCivilian({id:def.id,optional:def.optional!==false});
        Object.assign(p,{
          x:scaleValue(def.x),y:scaleValue(def.y),
          label:def.label||'Resident',
          interactionRadius:def.interactionRadius,
          exitSeconds:Number.isFinite(def.exitSeconds)?def.exitSeconds:settings.rescueExitSeconds,
          exitTimer:null
        });
        return p;
      });
      const formations=(source.formations||[]).map(def=>{
        const p=runtime.createPoliceFormation({
          id:def.id,
          width:def.width,
          objective:def.objective,
          state:def.state||'approach'
        });
        Object.assign(p,{
          x:scaleValue(def.x),y:scaleValue(def.y),
          targetX:scaleValue(def.targetX),targetY:scaleValue(def.targetY),
          withdrawX:scaleValue(def.withdrawX),withdrawY:scaleValue(def.withdrawY),
          speed:Number.isFinite(def.speed)?def.speed*worldScale:34*worldScale,
          stopDistance:Number.isFinite(def.stopDistance)?def.stopDistance*worldScale:18*worldScale,
          haltSeconds:Number.isFinite(def.haltSeconds)?def.haltSeconds:.7,
          regroupSeconds:Number.isFinite(def.regroupSeconds)?def.regroupSeconds:.8,
          damageRate:Number.isFinite(def.damageRate)?def.damageRate:5,
          stateTime:0,
          label:def.label||'Police formation'
        });
        return p;
      });
      return{actors,barricades,materials,civilians,formations};
    }

    function initialize({actors=[],mapData=null}={}){
      const seed=buildSeed(mapData,actors);
      controller.reset(seed);
      for(const b of seed.barricades){
        if(Array.isArray(b.points)&&b.points.length>=3){
          controller.registerBarricadeGeometry(b.id,{points:b.points});
        }
      }
      initialized=true;
      return controller.state;
    }

    function syncActors(snapshots){
      if(!initialized||!Array.isArray(snapshots))return false;
      const seen=new Set();
      for(const snap of snapshots){
        if(!snap||typeof snap.id!=='string')continue;
        const a=actor(snap.id);
        if(!a)continue;
        seen.add(snap.id);
        if(Number.isFinite(snap.x))a.x=snap.x;
        if(Number.isFinite(snap.y))a.y=snap.y;
        if(typeof snap.name==='string')a.name=snap.name;
        a.active=snap.active!==false;
        if(!a.active)cancelJob(snap.id,{dropCarried:true});
      }
      controller.state.actors.forEach((a,id)=>{
        if(!seen.has(id)&&a.active!==false)a.active=false;
      });
      updateCarriedMaterials();
      return true;
    }

    function materialAvailable(m,actorId){
      return !!m&&!m.consumed&&(!m.reservedBy||m.reservedBy===actorId)&&(!m.carriedBy||m.carriedBy===actorId);
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
        if(d<=radiusFor('material',m)+10)out.push({
          action:'carry',targetType:'material',targetId:m.id,label:'CARRY '+String(m.label||m.type).toUpperCase(),
          x:m.x,y:m.y,distance:d
        });
      });

      controller.state.civilians.forEach(p=>{
        if(!allowed('assist')||p.status!=='waiting'||!finitePoint(p))return;
        const d=distance(probe,p);
        if(d<=radiusFor('civilian',p)+10)out.push({
          action:'assist',targetType:'civilian',targetId:p.id,label:'ASSIST '+String(p.label||'RESIDENT').toUpperCase(),
          x:p.x,y:p.y,distance:d
        });
      });

      controller.state.barricades.forEach(b=>{
        const bp=targetPoint('barricade',b.id);
        if(!bp)return;
        const d=distance(probe,bp);
        if(d>radiusFor('barricade',b)+14)return;
        if(carrying&&allowed('reinforce')&&b.integrity<b.maxIntegrity){
          out.push({
            action:'reinforce',targetType:'barricade',targetId:b.id,label:'REINFORCE '+String(b.label||b.id).toUpperCase(),
            x:bp.x,y:bp.y,distance:d
          });
        }else if(!carrying&&allowed('hold')&&!b.breached){
          out.push({
            action:'hold',targetType:'barricade',targetId:b.id,label:'HOLD '+String(b.label||b.id).toUpperCase(),
            x:bp.x,y:bp.y,distance:d
          });
        }
      });

      out.sort((a,b)=>a.distance-b.distance);
      if(carrying&&allowed('drop')&&nearActor){
        out.push({
          action:'drop',targetType:'material',targetId:carrying.id,label:'DROP '+String(carrying.label||carrying.type).toUpperCase(),
          x:a.x,y:a.y,distance:999
        });
      }
      return out;
    }

    function contextAt(actorId,x,y){
      return contexts(actorId,{x,y})[0]||null;
    }

    function contextNearActor(actorId){
      return contexts(actorId,{nearActor:true})[0]||null;
    }

    function cleanupJob(job){
      if(!job)return;
      if(job.action==='carry'){
        const m=material(job.targetId);
        if(m&&m.reservedBy===job.actorId&&!m.carriedBy)runtime.releaseMaterialReservation(m,job.actorId);
      }
      if(job.action==='hold'||job.action==='reinforce'){
        const b=barricade(job.targetId);
        if(b)runtime.releaseAllWorkPositions(b,job.actorId);
      }
    }

    function cancelJob(actorId,{dropCarried=false}={}){
      const current=controller.state.jobs.get(actorId);
      if(current){
        cleanupJob(current);
        current.status='cancelled';
        controller.state.jobs.delete(actorId);
      }
      const a=actor(actorId);
      if(a)a.job=null;
      if(dropCarried&&a&&a.carrying)controller.dropForActor(actorId);
      return !!current;
    }

    function assignJob(actorId,context){
      if(!context||!allowed(context.action))return null;
      const a=actor(actorId);
      if(!a||!a.active)return null;
      cancelJob(actorId,{dropCarried:false});

      if(context.action==='carry'){
        if(a.carrying||!controller.reserveForActor(actorId,context.targetId))return null;
      }
      if(context.action==='reinforce'&&!a.carrying)return null;
      if(context.action==='assist'){
        const p=civilian(context.targetId);
        if(!p||p.status!=='waiting')return null;
      }
      if((context.action==='hold'||context.action==='reinforce')&&!barricade(context.targetId))return null;
      if(context.action==='drop'&&!a.carrying)return null;

      const duration=context.action==='reinforce'?settings.reinforceSeconds:
        context.action==='assist'?settings.assistSeconds:
        context.action==='hold'?settings.holdSeconds:0;
      const job={
        id:'job-'+(++jobSequence),
        actorId,
        action:context.action,
        targetType:context.targetType,
        targetId:context.targetId,
        status:'queued',
        progress:0,
        duration,
        workSlot:-1,
        label:context.label||context.action.toUpperCase()
      };
      controller.state.jobs.set(actorId,job);
      a.job=job.id;
      controller.state.events.push({type:'job-assigned',jobId:job.id,actorId,action:job.action,targetId:job.targetId});
      return job;
    }

    function assignAt(actorId,x,y){
      const context=contextAt(actorId,x,y);
      return context?assignJob(actorId,context):null;
    }

    function assignNearest(actorId){
      const context=contextNearActor(actorId);
      return context?assignJob(actorId,context):null;
    }

    function finishJob(job,result=true){
      cleanupJob(job);
      job.status=result?'complete':'failed';
      controller.state.jobs.delete(job.actorId);
      const a=actor(job.actorId);
      if(a)a.job=null;
      controller.state.events.push({
        type:'job-'+job.status,jobId:job.id,actorId:job.actorId,action:job.action,targetId:job.targetId
      });
      return result;
    }

    function updateCarriedMaterials(){
      controller.state.actors.forEach(a=>{
        if(!a.carrying||!finitePoint(a))return;
        const m=material(a.carrying);
        if(!m||m.consumed)return;
        m.x=a.x+8;
        m.y=a.y-8;
      });
    }

    function workInRange(job,a,target){
      const p=job.targetType==='barricade'?targetPoint('barricade',job.targetId):target;
      return p&&distance(a,p)<=radiusFor(job.targetType,target);
    }

    function updateJob(job,dt){
      const a=actor(job.actorId);
      if(!a||!a.active){cancelJob(job.actorId,{dropCarried:true});return}
      const target=job.targetType==='material'?material(job.targetId):
        job.targetType==='civilian'?civilian(job.targetId):
        job.targetType==='barricade'?barricade(job.targetId):null;

      if(job.action==='drop'){
        if(controller.dropForActor(job.actorId)){
          const m=material(job.targetId);
          if(m){m.x=a.x;m.y=a.y}
          finishJob(job,true);
        }else finishJob(job,false);
        return;
      }

      if(!target){finishJob(job,false);return}
      if(!workInRange(job,a,target)){job.status='waiting';job.progress=0;return}

      if(job.action==='carry'){
        if(controller.carryForActor(job.actorId,job.targetId)){
          updateCarriedMaterials();
          finishJob(job,true);
        }else finishJob(job,false);
        return;
      }

      if(job.action==='hold'||job.action==='reinforce'){
        if(job.workSlot<0){
          job.workSlot=runtime.reserveWorkPosition(target,job.actorId);
          if(job.workSlot<0){job.status='waiting';return}
        }
      }

      job.status='working';
      job.progress=Math.min(job.duration,job.progress+dt);
      if(job.progress<job.duration)return;

      if(job.action==='reinforce'){
        const added=controller.deliverForActor(job.actorId,job.targetId);
        if(added>0){
          controller.state.events.push({type:'barricade-reinforced',barricadeId:job.targetId,actorId:job.actorId,amount:added});
          finishJob(job,true);
        }else finishJob(job,false);
        return;
      }

      if(job.action==='hold'){
        controller.state.events.push({type:'barricade-held',barricadeId:job.targetId,actorId:job.actorId,duration:job.duration});
        finishJob(job,true);
        return;
      }

      if(job.action==='assist'){
        if(runtime.assistCivilian(target,job.actorId)){
          target.exitTimer=Number.isFinite(target.exitSeconds)?target.exitSeconds:settings.rescueExitSeconds;
          target.justAssisted=true;
          controller.state.events.push({type:'civilian-assisted',civilianId:target.id,actorId:job.actorId});
          finishJob(job,true);
        }else finishJob(job,false);
      }
    }

    function moveToward(entity,x,y,speed,dt){
      if(!entity||!finitePoint(entity)||!Number.isFinite(x)||!Number.isFinite(y)||!Number.isFinite(speed)||speed<=0)return 0;
      const dx=x-entity.x,dy=y-entity.y,d=Math.hypot(dx,dy);
      if(d<1e-6)return 0;
      const step=Math.min(d,speed*dt);
      entity.x+=dx/d*step;
      entity.y+=dy/d*step;
      return d-step;
    }

    function updateFormation(p,dt){
      if(!p||!finitePoint(p))return;
      if(settings.pressureControlled&&!controller.state.pressureStarted)return;
      p.stateTime=(p.stateTime||0)+dt;
      if(p.state==='approach'){
        const left=moveToward(p,p.targetX,p.targetY,p.speed,dt);
        if(left<=p.stopDistance){
          runtime.setPoliceState(p,'halt');p.stateTime=0;
          controller.state.events.push({type:'police-state',formationId:p.id,state:'halt'});
        }
        return;
      }
      if(p.state==='halt'){
        if(p.stateTime>=p.haltSeconds){
          runtime.setPoliceState(p,'dismantle');p.stateTime=0;
          controller.state.events.push({type:'police-state',formationId:p.id,state:'dismantle'});
        }
        return;
      }
      if(p.state==='dismantle'){
        const b=p.objective?barricade(p.objective):null;
        if(!b||b.breached){
          runtime.setPoliceState(p,'regroup');p.stateTime=0;
          controller.state.events.push({type:'police-state',formationId:p.id,state:'regroup'});
          return;
        }
        const multiplier=pressureDamageMultiplier(b,settings);
        controller.damageBarricadeById(p.objective,p.damageRate*dt*multiplier);
        if(b.breached){
          runtime.setPoliceState(p,'regroup');p.stateTime=0;
          controller.state.events.push({type:'police-state',formationId:p.id,state:'regroup'});
        }
        return;
      }
      if(p.state==='regroup'){
        if(p.stateTime>=p.regroupSeconds){
          runtime.setPoliceState(p,'withdraw');p.stateTime=0;
          controller.state.events.push({type:'police-state',formationId:p.id,state:'withdraw'});
        }
        return;
      }
      if(p.state==='withdraw'){
        moveToward(p,p.withdrawX,p.withdrawY,p.speed,dt);
      }
    }

    function updateRescues(dt){
      controller.state.civilians.forEach(p=>{
        if(p.status!=='assisted'||!Number.isFinite(p.exitTimer))return;
        if(p.justAssisted){p.justAssisted=false;return}
        p.exitTimer=Math.max(0,p.exitTimer-dt);
        if(p.exitTimer<=0&&runtime.evacuateCivilian(p)){
          controller.state.events.push({type:'civilian-exited',civilianId:p.id});
        }
      });
    }

    function fixedUpdate(dt){
      if(!initialized||!Number.isFinite(dt)||dt<=0)return false;
      updateCarriedMaterials();
      [...controller.state.jobs.values()].forEach(job=>updateJob(job,dt));
      controller.state.formations.forEach(p=>updateFormation(p,dt));
      updateRescues(dt);
      updateCarriedMaterials();
      controller.fixedUpdate(dt);
      return true;
    }

    function hint(actorId){
      const context=contextNearActor(actorId);
      if(context)return context.label;
      const a=actor(actorId);
      if(a&&a.carrying&&allowed('drop')){
        const m=material(a.carrying);
        return 'DROP '+String(m&&m.label||'MATERIAL').toUpperCase();
      }
      return 'ACTION';
    }

    function renderState(){
      return{
        actors:[...controller.state.actors.values()].map(a=>({...a})),
        barricades:[...controller.state.barricades.values()].map(b=>({...b,points:clonePoints(b.points)})),
        materials:[...controller.state.materials.values()].filter(m=>!m.consumed).map(m=>({...m})),
        civilians:[...controller.state.civilians.values()].map(p=>({...p})),
        formations:[...controller.state.formations.values()].map(p=>({...p})),
        jobs:[...controller.state.jobs.values()].map(j=>({...j}))
      };
    }

    return{
      settings,
      initialize,syncActors,fixedUpdate,
      contextAt,contextNearActor,assignJob,assignAt,assignNearest,cancelJob,
      hint,renderState,
      get initialized(){return initialized}
    };
  }

  return{create,DEFAULTS,pressureDamageMultiplier};
});
