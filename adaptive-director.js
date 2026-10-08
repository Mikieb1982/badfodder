/* Local utility Director. Strategic work is sampled, bounded and optional. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.BadFodderAdaptive=api;
})(typeof window!=='undefined'?window:globalThis,function(){
  'use strict';
  const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,Number(n)||0));
  const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
  const MILITARY=['HOLD','PROBE','PRESSURE','MAJOR_PUSH','FLANK_LEFT','FLANK_RIGHT','REINFORCE','REGROUP','RETREAT','AMBUSH','CHANGE_APPROACH','DEFEND_OBJECTIVE','PATROL','OPTIONAL_RESCUE','SUPPLY_OPPORTUNITY','DO_NOTHING'];
  const CABLE=['PRESSURE_MAIN','PRESSURE_SIDE','PROBE_DEFENCE','DELAY_PRESSURE','ESCALATE_PRESSURE','SWITCH_PRESSURE','REGROUP','CROWD_EVENT','MATERIAL_OPPORTUNITY','CIVILIAN_EVENT','MOUNTED_PRESSURE','RECOVERY_WINDOW','DO_NOTHING'];
  const FIELDS=['aggression','caution','mobility','grenadeUse','retreatFrequency','casualtyRate','objectiveFocus'];
  function profile(source={}){
    const p={routes:[]};
    FIELDS.forEach(k=>p[k]=clamp(source[k]));
    p.routes=(Array.isArray(source.routes)?source.routes:[]).slice(-8).filter(r=>r&&typeof r.key==='string').map(r=>({key:r.key.slice(0,48),weight:clamp(r.weight,0,12)}));
    return p;
  }
  // Only this small behavioural profile persists; no mission/save state is touched.
  function loadProfile(storage){try{return profile(JSON.parse(storage?.getItem('badfodder.director.profile.v1')||'{}'))}catch{return profile()}}
  function choose(choices,history,random=Math.random){
    const scored=choices.filter(c=>c.valid&&c.score>0).map(c=>{
      const recent=history.slice(-4),count=recent.filter(h=>h===c.action).length;
      const consecutive=recent.slice(-2).length===2&&recent.slice(-2).every(h=>h===c.action);
      return{...c,weight:c.score*(consecutive?.12:1)/(1+count*.7)};
    });
    const total=scored.reduce((s,c)=>s+c.weight,0);
    let roll=clamp(random())*total;
    const picked=scored.find(c=>(roll-=c.weight)<0)||scored.at(-1);
    return picked?{action:picked.action,confidence:picked.weight/total}:null;
  }
  function create({mission,adapter,memory=profile(),random=Math.random,debug=false,storage=null}={}){
    const cable=mission==='cable-street',actions=cable?CABLE:MILITARY;
    const state={time:0,tension:0,situation:'quiet',history:[],log:[],disabled:false,nextDecision:6,decisions:0,lastMeaningfulEvent:0,quietUntil:0};
    const cooldowns=Object.create(null),events={shots:0,grenades:0,combat:0,meaningful:0};
    let nextSample=0,last=null,still=0,lastCombat=0,combatUntil=0,nextSave=30,lastDecision=-Infinity,recoveryUntil=0;
    function disable(){state.disabled=true;try{adapter.release?.()}catch{}}
    function guard(fn,fallback=false){if(state.disabled)return fallback;try{return fn()}catch{disable();return fallback}}
    function notify(type){return guard(()=>{
      if(type==='shot'){events.shots=Math.min(100,events.shots+1);events.combat=1}
      if(type==='grenade'){events.grenades=Math.min(8,events.grenades+1);events.combat=1}
      if(type==='combat')events.combat=Math.min(40,events.combat+1);
      if(type==='meaningful')events.meaningful=1;
    })}
    function sample(){
      const s=adapter.sample(state.time),dt=last?Math.max(.1,state.time-last.time):1;
      const movement=last&&s.position&&last.position?dist(s.position,last.position)/dt:0;
      still=movement<(s.scale||1)*5?still+dt:0;
      const losses=last?Math.max(0,last.enemies-s.enemies):0;
      const damage=last?Math.max(0,last.strength-s.strength):0;
      const objectiveChanged=!!last&&s.phase!==last.phase;
      const progress=last?Math.max(0,s.progress-last.progress,(s.objectiveProgress||0)-(last.objectiveProgress||0)):0;
      const rescueChanged=!!last&&(s.civiliansRescued!==last.civiliansRescued||s.civilianDown!==last.civilianDown);
      if(events.meaningful||progress||objectiveChanged||rescueChanged||events.combat||s.combat)state.lastMeaningfulEvent=state.time;
      if(objectiveChanged)state.quietUntil=state.time+5;
      s.timeSinceMeaningfulEvent=state.time-state.lastMeaningfulEvent;s.combatIntensity=clamp((events.shots+events.combat)/24);
      if(events.combat||losses||damage||s.combat){lastCombat=state.time;combatUntil=state.time+6}
      const blend=(key,value)=>memory[key]=clamp(memory[key]*.92+clamp(value)*.08);
      blend('aggression',events.shots/12+(s.activity||0));
      blend('caution',movement<(s.scale||1)*12&&!events.shots?1:0);
      blend('mobility',movement/((s.scale||1)*100));
      blend('grenadeUse',events.grenades/2);
      blend('casualtyRate',s.casualties||0);
      blend('objectiveFocus',s.objectiveFocus||progress*4);
      const retreat=last&&s.threatDistance>last.threatDistance+(s.scale||1)*25&&combatUntil>state.time;
      blend('retreatFrequency',retreat?1:0);
      let repeated=false;
      if(s.route){
        s.route=mission+':'+s.route;
        for(const r of memory.routes)r.weight*=.98;
        let route=memory.routes.find(r=>r.key===s.route);
        if(!route){if(memory.routes.length>=8)memory.routes.shift();route={key:s.route.slice(0,48),weight:0};memory.routes.push(route)}
        route.weight=clamp(route.weight+dt*.25,0,12);repeated=route.weight>4;
      }
      const target=clamp((s.pressure||0)*40+(state.time<combatUntil?20:0)+(1-s.strength)*25+damage*120+(s.climax?10:0)+(s.combatIntensity||0)*15+(s.civilianDanger||0)*12,0,100);
      state.tension=clamp(state.tension*.7+target*.3,0,100);
      const struggling=s.strength<.4||damage>.12||s.breach||s.confidence<.32||s.downed>0||s.suppression>.65||(s.ammo??1)<.15;
      const excessive=state.tension>78||(s.pressure||0)>.88||(s.civilianDanger||0)>.7;
      const dominant=!struggling&&(losses>0||s.dominant||memory.aggression>.5)&&s.strength>.65;
      const bored=state.time-lastCombat>16&&s.timeSinceMeaningfulEvent>16&&!progress&&!objectiveChanged;
      state.situation=struggling?'struggling':excessive?'overwhelmed':dominant?'dominant':still>10||repeated?'repeating':bored?'bored':state.time<combatUntil?'fight':'anticipation';
      s.repeated=repeated||still>10;s.struggling=struggling;s.excessive=excessive;s.dominant=dominant;s.bored=bored;
      s.recovery=state.time<recoveryUntil||state.time<state.quietUntil;s.failedAttack=!!s.failedAttack;
      if((damage>.12||objectiveChanged||losses>=2)&&state.time-lastDecision>=5)state.nextDecision=state.time;
      events.shots=0;events.grenades=0;events.combat=0;events.meaningful=0;
      last={...s,time:state.time};
      if(storage&&state.time>=nextSave){nextSave=state.time+30;try{storage.setItem('badfodder.director.profile.v1',JSON.stringify(memory))}catch{}}
      return s;
    }
    function scores(s){
      const recover=s.struggling||s.excessive,repeat=s.repeated;
      const attack=!recover&&!s.recovery;
      const weights=cable?{
        PRESSURE_MAIN:attack?18:0,PRESSURE_SIDE:attack?(repeat||s.dominant?65:24):0,
        PROBE_DEFENCE:attack?35:0,DELAY_PRESSURE:recover?90:8,
        ESCALATE_PRESSURE:attack&&s.climax?35:0,SWITCH_PRESSURE:attack&&(repeat||s.dominant)?75:15,
        REGROUP:recover||s.failedAttack?90:6,CROWD_EVENT:recover?40:16,
        MATERIAL_OPPORTUNITY:recover?80:10,CIVILIAN_EVENT:s.bored?55:8,
        MOUNTED_PRESSURE:attack&&s.climax?22:0,RECOVERY_WINDOW:recover?120:s.failedAttack?50:5,
        DO_NOTHING:s.recovery?100:recover?18:2
      }:{
        HOLD:recover?35:10,PROBE:attack?(s.bored?60:30):0,PRESSURE:attack?20:0,
        MAJOR_PUSH:attack&&s.dominant?35:0,FLANK_LEFT:attack?(repeat?65:s.dominant?45:20):0,
        FLANK_RIGHT:attack?(repeat?65:s.dominant?45:20):0,REINFORCE:attack&&s.objectiveFocus>.4?60:attack?16:0,
        REGROUP:recover||s.failedAttack?110:4,RETREAT:recover||s.failedAttack?75:2,
        AMBUSH:attack&&repeat?38:10,CHANGE_APPROACH:attack&&repeat?70:12,
        DEFEND_OBJECTIVE:attack&&s.objectiveFocus>.4?50:8,PATROL:attack&&s.bored?45:12,
        OPTIONAL_RESCUE:s.civilianDown>0?100:0,SUPPLY_OPPORTUNITY:recover?60:s.bored?30:5,
        DO_NOTHING:s.recovery?150:recover?35:s.civilianDanger>.5?25:8
      };
      // Persistent preferences gently bias choices; they never ban a player tactic.
      if(attack){if(cable)weights.SWITCH_PRESSURE+=memory.mobility*8;else{weights.AMBUSH+=memory.grenadeUse*10;weights.PROBE+=memory.caution*8}}
      return actions.map(action=>({action,score:weights[action],valid:state.time>=(cooldowns[action]||0)&&adapter.valid(action,s,state.time)}));
    }
    function decide(s){
      const decision=choose(scores(s),state.history,random);if(!decision)return;
      if(adapter.execute(decision.action,s,state.time)===false)return;
      const action=decision.action;
      const recovery=['REGROUP','RETREAT','RECOVERY_WINDOW','DELAY_PRESSURE','OPTIONAL_RESCUE','SUPPLY_OPPORTUNITY'].includes(action);
      if(recovery)recoveryUntil=state.time+12;
      cooldowns[action]=state.time+(action==='DO_NOTHING'?5:/EVENT|OPPORTUNITY|MOUNTED|RESCUE/.test(action)?40:18);
      state.history.push(action);if(state.history.length>6)state.history.shift();
      state.decisions++;lastDecision=state.time;
      if(debug){state.log.push({time:+state.time.toFixed(1),mission,tension:Math.round(state.tension),situation:state.situation,decision:action,confidence:+decision.confidence.toFixed(2)});if(state.log.length>32)state.log.shift()}
    }
    function update(dt){return guard(()=>{
      if(!Number.isFinite(dt)||dt<=0)return false;
      state.time+=Math.min(dt,.25);
      if(state.time<nextSample)return true;
      nextSample=state.time+1;
      adapter.maintain?.(state.time);
      const s=sample();
      if(state.time>=state.nextDecision&&state.time-lastDecision>=5){
        state.nextDecision=state.time+7+clamp(random())*4;decide(s);
      }
      return true;
    })}
    return{state,memory,update,notify,guard,scores,disable};
  }

  function createCommander({getEnemies,getSquad,getPhase,getZones,roads,scale=1,navigation,queuePath,blocked,getContext=()=>({}),opportunities=null,canGarrison=()=>true}={}){
    let clock=0,failedUntil=0;
    const groups=new Map(),routePoints=[],counts=new Map(),checkpointStates=new Map();
    for(const e of getEnemies()){
      if(!groups.has(e.groupId))groups.set(e.groupId,[]);
      groups.get(e.groupId).push(e);
    }
    // Existing road centres only. No map mutation and no strategic A* searches.
    for(const r of roads){
      if(/railway/.test(r.kind))continue;
      for(let i=0;i<r.points.length-1;i++){
        const a=r.points[i],b=r.points[i+1];
        const steps=Math.min(12,Math.max(1,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/(scale*60))));
        for(let j=0;j<steps;j++)routePoints.push({x:a[0]+(b[0]-a[0])*j/steps,y:a[1]+(b[1]-a[1])*j/steps,name:r.name});
      }
    }
    if(routePoints.length>1600){const step=routePoints.length/1600;const points=Array.from({length:1600},(_,i)=>routePoints[Math.floor(i*step)]);routePoints.length=0;routePoints.push(...points)}
    const liveGroups=()=>[...groups.values()].map(g=>g.filter(e=>(e.alive&&!e.surrendered&&!e.missionDormant))).filter(g=>g.length);
    function knowledge(){
      return getEnemies().filter(e=>(e.alive&&!e.surrendered&&!e.missionDormant)&&e.lastSeen&&Number.isFinite(e.observedAt)&&clock-e.observedAt<24).sort((a,b)=>b.observedAt-a.observedAt)[0]?.lastSeen||null;
    }
    const center=g=>({x:g.reduce((n,e)=>n+e.x,0)/g.length,y:g.reduce((n,e)=>n+e.y,0)/g.length});
    function routePoint(g,target,type){
      const c=center(g),dx=target.x-c.x,dy=target.y-c.y,d=Math.hypot(dx,dy)||1;
      const side=type==='FLANK_LEFT'?-1:type==='FLANK_RIGHT'?1:0;
      const desired=side?{x:target.x-dy/d*side*scale*105-dx/d*scale*40,y:target.y+dx/d*side*scale*105-dy/d*scale*40}:target;
      const comp=navigation.pathComponent(Math.floor(c.x/navigation.PATH_CELL),Math.floor(c.y/navigation.PATH_CELL));
      let best=null,score=Infinity;
      for(const p of routePoints){
        if(dist(p,desired)>scale*170||blocked(p.x,p.y,14)||navigation.pathComponent(Math.floor(p.x/navigation.PATH_CELL),Math.floor(p.y/navigation.PATH_CELL))!==comp)continue;
        if(side){const cross=(dx*(p.y-target.y)-dy*(p.x-target.x))/d;if(cross*side<scale*35)continue}
        const cost=dist(p,desired)+dist(p,c)*.12;
        if(cost<score){score=cost;best=p}
      }
      return best;
    }
    function issue(g,type,point,duration=16,delay=0){
      g.forEach((e,i)=>{
        e.commandOrder={type,point:{x:point.x,y:point.y},until:clock+duration,engageAt:clock+delay};
        e.tacticalPoint=null;e.path=null;e.pendingPath=null;e.repath=0;
        if(type!=='HOLD')queuePath(e,point.x,point.y);
        e.role=type==='FLANK_LEFT'?'left':type==='FLANK_RIGHT'?'right':i%3===0?'anchor':i%3===1?'left':'right';
        e.alertCue=['REGROUP','RETREAT'].includes(type)?'↙':type.startsWith('FLANK')?'↗':'!';e.cueTimer=1.5;
      });
    }
    function checkpointState(phase=getPhase()){
      if(!phase?.checkpoint||!phase.zone||!phase.defenderGroup)return null;
      let state=checkpointStates.get(phase.index);
      if(!state){state={phase:phase.index,style:phase.checkpoint.style||'rush',started:false,cleared:false,startedAt:0,groups:[]};checkpointStates.set(phase.index,state)}
      return state;
    }
    function checkpointSpawnPoint(zone,angle,distance=scale*235){
      const desired={x:zone.x+Math.cos(angle)*distance,y:zone.y+Math.sin(angle)*distance};
      let best=null,score=Infinity;
      for(const p of routePoints){
        const d=dist(p,zone);if(d<scale*145||d>scale*360||blocked(p.x,p.y,12))continue;
        const cost=dist(p,desired)+Math.abs(d-distance)*.2;
        if(cost<score){score=cost;best=p}
      }
      if(best)return best;
      for(let ring=distance;ring>=scale*150;ring-=scale*25){
        for(let i=0;i<12;i++){
          const a=angle+i*Math.PI/6,p={x:zone.x+Math.cos(a)*ring,y:zone.y+Math.sin(a)*ring};
          if(!blocked(p.x,p.y,12))return p;
        }
      }
      return null;
    }
    function garrisonSquad(zone,phaseIndex,completed=false){
      const living=getSquad().filter(s=>s.alive&&!s.downed&&canGarrison(s)&&dist(s,zone)<=zone.r&&s.checkpointExitPhase!==phaseIndex&&(!completed||s.checkpointGarrison!==phaseIndex));
      if(!living.length)return;
      const radius=Math.min(zone.r*.34,scale*22);
      living.forEach((s,i)=>{
        if(s.checkpointGarrison===phaseIndex)return;
        const base=-Math.PI/2+i*Math.PI*2/Math.max(1,living.length);
        let point=null;
        for(let ring=radius;ring<=Math.min(zone.r*.62,scale*38)&&!point;ring+=scale*7){
          for(let k=0;k<8;k++){
            const a=base+k*Math.PI/4,p={x:zone.x+Math.cos(a)*ring,y:zone.y+Math.sin(a)*ring};
            if(!blocked(p.x,p.y,8)){point=p;break}
          }
        }
        if(point){s.checkpointGarrison=phaseIndex;s.checkpointCover=true;s.x=point.x;s.y=point.y;s.path=null;s.pendingPath=null;s.pathIndex=0;s.target=null}
      });
    }
    function spawnCheckpointEnemy(template,point,phase,groupId,index,target){
      const maxHp=Number(template?.maxHp)||3;
      const e={...template,
        x:point.x,y:point.y,homeX:point.x,homeY:point.y,
        variant:(Number(template?.variant)||0)+index%4,hp:maxHp,maxHp,alive:true,phase:clock*.67+index*.31,cooldown:.35+index*.05,
        alert:true,lastSeen:{x:target.x,y:target.y},observedAt:clock,aiState:'alert',flash:0,
        dir:Math.atan2(target.y-point.y,target.x-point.x),anim:clock+index*.41,state:'idle',fireTimer:0,deadTimer:0,deathAngle:0,path:null,pathIndex:0,repath:0,
        hitTimer:0,groupId,objectiveGroup:phase.defenderGroup,role:['anchor','left','right'][index%3],
        tacticTimer:.12+(index%3)*.14,tacticalPoint:null,burstCount:0,burstLimit:2+(index%2),burstPause:0,searchTimer:0,
        reactionTimer:.2+index*.04,cueTimer:1.5,alertCue:'!',pathQueued:false,pendingPath:null,commandOrder:null,
        checkpointWave:true,checkpointPhase:phase.index
      };
      getEnemies().push(e);return e;
    }
    function spawnCheckpointGroup(phase,zone,state,template,spec,index){
      const groupId='checkpoint:'+phase.index+':'+index;
      const spawn=checkpointSpawnPoint(zone,spec.angle,spec.distance||scale*235);if(!spawn)return[];
      const group=[];
      for(let i=0;i<spec.count;i++){
        const side=(i-(spec.count-1)/2)*scale*8,perp=spec.angle+Math.PI/2;
        let point={x:spawn.x+Math.cos(perp)*side,y:spawn.y+Math.sin(perp)*side};
        if(blocked(point.x,point.y,10))point=spawn;
        group.push(spawnCheckpointEnemy(template,point,phase,groupId,i,zone));
      }
      groups.set(groupId,group);counts.set(groupId,group.length);state.groups.push(groupId);
      const target={x:zone.x+Math.cos(spec.targetAngle||0)*(spec.targetOffset||0),y:zone.y+Math.sin(spec.targetAngle||0)*(spec.targetOffset||0)};
      issue(group,spec.type||'PRESSURE',target,spec.duration||22,spec.delay||0);
      return group;
    }
    function startCheckpointWave(phase,zone,state){
      const living=getSquad().filter(s=>s.alive);if(!living.length)return false;
      const template=getEnemies().find(e=>!e.checkpointWave)||getEnemies()[0];if(!template)return false;
      const origin=center(living),approach=Math.atan2(origin.y-zone.y,origin.x-zone.x),front=approach+Math.PI;
      const total=Math.max(2,Math.min(8,Number(phase.checkpoint.count)||3));
      let specs=[];
      if(state.style==='pincer'){
        const left=Math.ceil(total/2),right=total-left;
        specs=[
          {angle:front-Math.PI*.55,count:left,type:'FLANK_LEFT',targetAngle:front-Math.PI/2,targetOffset:scale*18,delay:.5},
          {angle:front+Math.PI*.55,count:right,type:'FLANK_RIGHT',targetAngle:front+Math.PI/2,targetOffset:scale*18,delay:2}
        ];
      }else if(state.style==='siege'){
        const pin=Math.max(1,Math.floor(total*.35)),remain=total-pin,left=Math.ceil(remain/2),right=remain-left;
        specs=[
          {angle:front,count:pin,type:'PRESSURE',targetOffset:0,delay:0,duration:24},
          {angle:front-Math.PI*.62,count:left,type:'FLANK_LEFT',targetAngle:front-Math.PI/2,targetOffset:scale*24,delay:2,duration:26},
          {angle:front+Math.PI*.62,count:right,type:'FLANK_RIGHT',targetAngle:front+Math.PI/2,targetOffset:scale*24,delay:4,duration:26}
        ];
      }else{
        specs=[{angle:front,count:total,type:'PRESSURE',targetOffset:0,delay:0,duration:18}];
      }
      const spawned=specs.flatMap((spec,i)=>spawnCheckpointGroup(phase,zone,state,template,spec,i));
      if(!spawned.length)return false;
      state.started=true;state.startedAt=clock;state.cleared=false;
      garrisonSquad(zone,phase.index);
      return true;
    }
    function maintainCheckpoint(){
      const phase=getPhase(),state=checkpointState(phase);if(!state)return;
      const zone=getZones()[phase.zone];if(!zone)return;
      const living=getSquad().filter(s=>s.alive),inside=living.some(s=>dist(s,zone)<=zone.r);
      for(const s of living)if(s.checkpointExitPhase!==phase.index||dist(s,zone)>zone.r)s.checkpointExitPhase=null;
      const original=getEnemies().filter(e=>(e.alive&&!e.surrendered&&!e.missionDormant)&&!e.checkpointWave&&e.objectiveGroup===phase.defenderGroup);
      if(!state.started&&inside&&original.length===0)startCheckpointWave(phase,zone,state);
      if(!state.started)return;
      const wave=getEnemies().filter(e=>(e.alive&&!e.surrendered&&!e.missionDormant)&&e.checkpointWave&&e.checkpointPhase===phase.index);
      garrisonSquad(zone,phase.index,state.cleared);
      if(wave.length)return;
      if(state.cleared)for(const s of living)if(s.checkpointGarrison===phase.index){s.checkpointCover=false;s.checkpointHeld=phase.index}
      if(!state.cleared){state.cleared=true;for(const s of living)if(s.checkpointGarrison===phase.index){s.checkpointCover=false;s.checkpointHeld=phase.index}}
    }
    function release(){
      getEnemies().forEach(e=>{if(e.commandOrder){e.commandOrder=null;e.path=null;e.pendingPath=null;e.tacticalPoint=null}});
      getSquad().forEach(s=>{s.checkpointCover=false;s.checkpointGarrison=null});
    }
    function maintain(time){
      clock=time;
      for(const e of getEnemies())if(e.commandOrder&&clock>=e.commandOrder.until){e.commandOrder=null;e.path=null;e.pendingPath=null;e.tacticalPoint=null}
      maintainCheckpoint();
    }
    function valid(action){
      if(['OPTIONAL_RESCUE','SUPPLY_OPPORTUNITY'].includes(action))return opportunities?.valid(action)||false;
      if(action==='DO_NOTHING')return true;
      const gs=liveGroups(),known=knowledge();
      if(!gs.length)return false;
      if(['REGROUP','RETREAT','HOLD','PATROL','DEFEND_OBJECTIVE'].includes(action))return true;
      if(!known)return false;
      const nearby=gs.filter(g=>dist(center(g),known)<scale*440);
      if(!nearby.length)return false;
      if(action==='MAJOR_PUSH')return nearby.length>1;
      if(action.startsWith('FLANK'))return nearby.some(g=>routePoint(g,known,action));
      return true;
    }
    function execute(action,s,time){
      clock=time;if(action==='DO_NOTHING')return true;
      if(['OPTIONAL_RESCUE','SUPPLY_OPPORTUNITY'].includes(action))return opportunities?.execute(action)||false;
      const known=knowledge(),gs=liveGroups();
      if(!gs.length)return false;
      const focus=known||getZones()[getPhase().zone]||center(gs[0]);
      const nearby=gs.filter(g=>dist(center(g),focus)<scale*440).sort((a,b)=>dist(center(a),focus)-dist(center(b),focus));
      if(['REGROUP','RETREAT','HOLD'].includes(action)){
        // Recover across the active front, allowing surviving groups to return later.
        for(const g of nearby){
          const c=center(g),dx=c.x-focus.x,dy=c.y-focus.y,d=Math.hypot(dx,dy)||1;
          const point=action==='HOLD'?c:routePoint(g,{x:c.x+dx/d*scale*85,y:c.y+dy/d*scale*85},action);
          if(point)issue(g,action,point,12);
        }
        return nearby.length>0;
      }
      const g=known?(nearby[0]||gs[0]):gs[Math.floor(clock/10)%gs.length];if(!g)return false;
      if(['REINFORCE','DEFEND_OBJECTIVE'].includes(action)){
        const zones=getZones(),zone=known?Object.values(zones).reduce((a,z)=>!a||dist(z,known)<dist(a,known)?z:a,null):zones[getPhase().zone];
        if(!zone)return false;
        const supporters=gs.filter(other=>other!==g&&dist(center(other),zone)<scale*500).sort((a,b)=>dist(center(a),zone)-dist(center(b),zone));
        const support=supporters[0]||g,point=routePoint(support,zone,action);
        if(!point)return false;issue(support,action,point);return true;
      }
      if(action==='PATROL'){
        const target=known||{x:g[0].homeX+Math.cos(clock)*scale*90,y:g[0].homeY+Math.sin(clock)*scale*90},point=routePoint(g,target,action);
        if(!point)return false;issue(g,action,point,12);return true;
      }
      if(!known)return false;
      const flank=action==='CHANGE_APPROACH'?(s.repeated?'FLANK_RIGHT':'FLANK_LEFT'):action;
      const point=routePoint(g,known,flank);if(!point)return false;
      if(action==='PROBE')issue(g.slice(0,Math.min(2,g.length)),action,point,10);
      else if(action==='MAJOR_PUSH'){
        issue(g,'PRESSURE',point,18);
        const other=nearby[1],side=routePoint(other,known,'FLANK_LEFT')||routePoint(other,known,'FLANK_RIGHT');
        if(side)issue(other,'FLANK_LEFT',side,22,4);
      }else{
        issue(g,flank,point,action==='AMBUSH'?20:18);
        // A second group holds attention while the flank moves into position.
        if(flank.startsWith('FLANK')&&nearby[1]){const p=routePoint(nearby[1],known,'PRESSURE');if(p)issue(nearby[1],'PRESSURE',p,14)}
      }
      return true;
    }
    function sample(time){
      clock=time;const squad=getSquad(),living=squad.filter(s=>s.alive&&!s.downed),enemies=getEnemies(),alive=enemies.filter(e=>(e.alive&&!e.surrendered&&!e.missionDormant));
      for(const [id,g] of groups){const count=g.filter(e=>(e.alive&&!e.surrendered&&!e.missionDormant)).length;if(count<(counts.get(id)??g.length)&&count<=g.length/2)failedUntil=clock+14;counts.set(id,count)}
      const position=living.length?center(living):{x:0,y:0},phase=getPhase(),zone=getZones()[phase.zone];
      const known=knowledge(),near=alive.filter(e=>dist(e,position)<scale*180);
      return{position,scale,strength:squad.reduce((n,s)=>n+(s.alive?s.hp/s.maxHp:0),0)/Math.max(1,squad.length),casualties:1-living.length/Math.max(1,squad.length),
        phase:phase.index,progress:phase.index,objective:phase.objective||null,enemies:alive.length,pressure:clamp(near.filter(e=>e.alert).length/7),combat:near.some(e=>e.fireTimer>0),
        threatDistance:known?dist(position,known):0,objectiveFocus:zone?clamp(1-dist(position,zone)/(scale*200)):0,climax:phase.index>=2,
        route:Math.floor(position.x/(scale*100))+':'+Math.floor(position.y/(scale*100)),
        failedAttack:clock<failedUntil,...getContext()};
    }
    function control(e,dt,followPath){
      const order=e.commandOrder;if(!order)return null;
      if(clock>=order.until){e.commandOrder=null;return null}
      const reached=dist(e,order.point)<scale*12;
      const stationary=order.type==='HOLD'||(order.type==='AMBUSH'&&reached);
      const withdrawing=['REGROUP','RETREAT'].includes(order.type);
      if(reached&&order.type.startsWith('FLANK')&&clock>=order.engageAt){
        e.commandOrder=null;e.tacticalPoint=order.point;e.tacticTimer=2;e.role='anchor';return null;
      }
      if(!stationary&&!reached&&!e.path&&!e.pathQueued&&e.repath<=0){queuePath(e,order.point.x,order.point.y);e.repath=1.5}
      const moving=!stationary&&!reached&&!!e.path&&followPath(e,withdrawing?78:70,dt);
      return{moving,canFire:!withdrawing&&clock>=order.engageAt};
    }
    return{sample,valid,execute,maintain,release,control,groups,knowledge,checkpointState,get clock(){return clock}};
  }

  function createCableAdapter({controller,director,interactions,crowd,scale=1}={}){
    let lastFightback=0,lastCycles=0;
    const active=f=>['approach','halt','dismantle'].includes(f.state);
    function sample(){
      const s=controller.state,p=director.snapshot(),actors=[...s.actors.values()].filter(a=>a.active),bs=[...s.barricades.values()];
      const position=actors.length?{x:actors.reduce((n,a)=>n+a.x,0)/actors.length,y:actors.reduce((n,a)=>n+a.y,0)/actors.length}:{x:0,y:0};
      const activity=p.fightbackSignals-lastFightback,cycles=p.pressureCycles-lastCycles;lastFightback=p.fightbackSignals;lastCycles=p.pressureCycles;
      return{position,scale,phase:p.phaseIndex,progress:p.phaseIndex+p.finalHoldSeconds/Math.max(1,p.finalHoldTarget),enemies:s.formations.size,
        strength:Math.min(...bs.map(b=>b.integrity/b.maxIntegrity)),confidence:p.confidence,casualties:0,pressure:[...s.formations.values()].filter(active).length/Math.max(1,s.formations.size),
        combat:[...s.formations.values()].some(f=>f.state==='dismantle'),breach:bs.some(b=>b.breached),dominant:cycles>0&&p.barricadeRatio>.65,
        failedAttack:cycles>0,climax:p.phaseIndex===3,activity:activity/3,objectiveFocus:activity>0?1:0,threatDistance:0,
        route:position.x+position.y>0?'cable:'+bs.reduce((best,b)=>!best||dist(b,position)<dist(best,position)?b:best,null)?.id:'cable'};
    }
    function valid(action,s){
      if(action==='DO_NOTHING')return true;
      // Phase progression remains exclusively with the historical Director.
      if(s.phase===0||s.phase===2)return ['MATERIAL_OPPORTUNITY','CIVILIAN_EVENT','CROWD_EVENT'].includes(action)&&interactions.canAdaptiveAction(action);
      if(action==='PRESSURE_SIDE'||action==='SWITCH_PRESSURE')return [...controller.state.formations.values()].some(f=>f.objective==='S'&&(f.activationPhase||1)<=s.phase)&&interactions.canAdaptiveAction(action);
      return interactions.canAdaptiveAction(action);
    }
    function execute(action,s,time){
      if(action==='DO_NOTHING')return true;
      return interactions.adaptiveAction(action,{time,phase:s.phase,crowd,director});
    }
    function release(){director.releaseAdaptivePressure();interactions.releaseAdaptivePressure()}
    return{sample,valid,execute,release};
  }
  return{create,createCommander,createCableAdapter,profile,loadProfile,choose,MILITARY,CABLE};
});
