/* Tight outward-facing POI garrison, layered sandbag fortification and escalating checkpoint assaults.
   Browser patches the existing military commander and actor renderer.
   Node exports pure helpers for regression tests. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.BadFodderCheckpointFortification=api;
  if(root&&root.document)api.install(root);
})(typeof window!=='undefined'?window:globalThis,function(){
  'use strict';
  const TAU=Math.PI*2;
  const finite=n=>Number.isFinite(n);
  const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
  const noise=(i,s=0)=>Math.sin((i+1)*12.9898+s*78.233)*43758.5453%1;

  function clearVisual(unit){
    unit.checkpointFortificationLead=false;
    unit.checkpointFortificationRearLead=false;
    unit.checkpointFortificationFrontLead=false;
    unit.checkpointFortified=false;
    unit.checkpointFacing=null;
    unit.checkpointCenterX=null;
    unit.checkpointCenterY=null;
    unit.checkpointSandbagRadius=null;
    unit.checkpointFortificationPhase=null;
  }

  function candidate(center,angle,radius,blocked){
    const offsets=[0,Math.PI/12,-Math.PI/12,Math.PI/6,-Math.PI/6];
    for(const extra of [0,4,8,12]){
      for(const turn of offsets){
        const r=radius+extra,p={x:center.x+Math.cos(angle+turn)*r,y:center.y+Math.sin(angle+turn)*r};
        if(!blocked(p.x,p.y,8))return p;
      }
    }
    return null;
  }

  function arrangeSquad({squad,phase,zones,scale=1,blocked=()=>false}={}){
    const units=Array.isArray(squad)?squad:[];
    units.forEach(u=>{u.checkpointFortificationLead=false;u.checkpointFortificationRearLead=false;u.checkpointFortificationFrontLead=false});
    if(!phase?.checkpoint||!phase.zone||!zones?.[phase.zone]){
      units.forEach(clearVisual);return null;
    }
    const zone=zones[phase.zone];
    const defenders=units.filter(s=>s.alive&&s.checkpointGarrison===phase.index&&(s.checkpointCover||s.checkpointHeld===phase.index));
    for(const unit of units)if(!defenders.includes(unit))clearVisual(unit);
    if(!defenders.length)return null;

    const center={
      x:defenders.reduce((n,s)=>n+s.x,0)/defenders.length,
      y:defenders.reduce((n,s)=>n+s.y,0)/defenders.length
    };
    const radius=Math.min(zone.r*.18,scale*11);
    const sandbagRadius=Math.max(radius+scale*14,scale*25);

    defenders.forEach((s,i)=>{
      const angle=-Math.PI/2+i*TAU/defenders.length;
      const point=candidate(center,angle,radius,(x,y,r)=>blocked(x,y,r));
      if(point){s.x=point.x;s.y=point.y;s.path=null;s.pendingPath=null;s.pathIndex=0;s.target=null}
      const facing=Math.atan2(s.y-center.y,s.x-center.x);
      s.dir=facing;s.checkpointFacing=facing;s.checkpointFortified=true;
      s.checkpointCenterX=center.x;s.checkpointCenterY=center.y;
      s.checkpointSandbagRadius=sandbagRadius;s.checkpointFortificationPhase=phase.index;
    });
    const rear=defenders.reduce((lead,s)=>!lead||s.y<lead.y?s:lead,null);
    const front=defenders.reduce((lead,s)=>!lead||s.y>lead.y?s:lead,null);
    rear.checkpointFortificationLead=true;rear.checkpointFortificationRearLead=true;
    front.checkpointFortificationFrontLead=true;
    return{center,radius,sandbagRadius,count:defenders.length};
  }

  function bagPath(ctx,w,h,seed){
    const j=(noise(seed,2)+.5)*.06;
    ctx.beginPath();
    ctx.moveTo(-w*(.43+j),-h*.43);
    ctx.quadraticCurveTo(-w*.53,-h*.12,-w*.46,h*.34);
    ctx.quadraticCurveTo(-w*.22,h*.53,w*.08,h*.46);
    ctx.quadraticCurveTo(w*.43,h*.51,w*.49,h*.18);
    ctx.quadraticCurveTo(w*.54,-h*.24,w*.31,-h*.45);
    ctx.quadraticCurveTo(0,-h*.55,-w*(.43+j),-h*.43);
    ctx.closePath();
  }

  function drawBag(ctx,x,y,a,w,h,index,row){
    const jitter=(noise(index,row)+.5),rot=(jitter-.5)*.18;
    const palettes=row===0?['#8b704b','#967954','#806744']:['#a2875d','#ad9165','#987b54'];
    ctx.save();ctx.translate(x,y);ctx.rotate(a+Math.PI/2+rot);
    ctx.fillStyle='rgba(31,27,20,.34)';bagPath(ctx,w*1.04,h*1.05,index+31);ctx.translate(1.5,2.8);ctx.fill();ctx.translate(-1.5,-2.8);
    const grad=ctx.createLinearGradient(0,-h*.5,0,h*.5);
    const base=palettes[index%palettes.length];grad.addColorStop(0,row===0?'#b19a74':'#c0a77a');grad.addColorStop(.32,base);grad.addColorStop(1,row===0?'#665338':'#715b3d');
    bagPath(ctx,w,h,index);ctx.fillStyle=grad;ctx.fill();ctx.strokeStyle='#4f402d';ctx.lineWidth=1.05;ctx.stroke();
    ctx.strokeStyle='rgba(68,52,34,.72)';ctx.lineWidth=.75;ctx.beginPath();ctx.moveTo(0,-h*.39);ctx.quadraticCurveTo(1,h*.02,0,h*.39);ctx.stroke();
    ctx.strokeStyle='rgba(226,207,164,.34)';ctx.beginPath();ctx.moveTo(-w*.31,-h*.28);ctx.quadraticCurveTo(0,-h*.42,w*.28,-h*.27);ctx.stroke();
    for(let s=-2;s<=2;s++){
      ctx.fillStyle=s%2?'rgba(68,52,34,.55)':'rgba(225,203,158,.42)';
      ctx.fillRect(s*w*.095-.7,-1,.9,1.4);
    }
    ctx.strokeStyle='#4d3c29';ctx.lineWidth=.8;
    ctx.beginPath();ctx.moveTo(-w*.47,-1);ctx.lineTo(-w*.55,-3);ctx.moveTo(w*.47,-1);ctx.lineTo(w*.55,-3);ctx.stroke();
    if(index%4===1){ctx.fillStyle='rgba(67,56,39,.24)';ctx.beginPath();ctx.ellipse(w*.18,h*.08,w*.12,h*.12,.3,0,TAU);ctx.fill()}
    ctx.restore();
  }

  function drawSandbagRing(ctx,ent,half='all'){
    if(!ctx||!ent?.checkpointFortified)return false;
    const cx=ent.checkpointCenterX,cy=ent.checkpointCenterY,r=ent.checkpointSandbagRadius;
    if(!finite(cx)||!finite(cy)||!finite(r)||r<=0)return false;
    ctx.save();
    ctx.strokeStyle='rgba(45,38,27,.2)';ctx.lineWidth=Math.max(8,r*.22);ctx.beginPath();ctx.arc(cx,cy,r*.93,0,TAU);ctx.stroke();
    const rows=[
      {radius:r*.88,bags:15,w:Math.max(11,r*.27),h:Math.max(6,r*.125),offset:Math.PI/15,row:0},
      {radius:r*1.03,bags:18,w:Math.max(12,r*.3),h:Math.max(7,r*.14),offset:0,row:1}
    ];
    for(const spec of rows){
      for(let i=0;i<spec.bags;i++){
        const a=spec.offset+(i+.5)*TAU/spec.bags;
        const front=Math.sin(a)>.02;
        if(half==='back'&&front)continue;
        if(half==='front'&&!front)continue;
        const radial=(noise(i,spec.row)-.5)*r*.035;
        const x=cx+Math.cos(a)*(spec.radius+radial),y=cy+Math.sin(a)*(spec.radius+radial);
        drawBag(ctx,x,y,a,spec.w*(.94+Math.abs(noise(i,5))*.12),spec.h,spec.row*100+i,spec.row);
      }
    }
    if(half!=='front'){
      ctx.strokeStyle='rgba(91,72,45,.32)';ctx.lineWidth=1.2;ctx.setLineDash([3,5]);ctx.beginPath();ctx.arc(cx,cy,r*.67,0,TAU);ctx.stroke();ctx.setLineDash([]);
    }
    ctx.restore();return true;
  }

  function routePoints(options,scale){
    const out=[];
    for(const r of options.roads||[]){
      if(/railway/.test(r.kind||''))continue;
      for(let i=0;i<(r.points||[]).length-1;i++){
        const a=r.points[i],b=r.points[i+1],length=Math.hypot(b[0]-a[0],b[1]-a[1]);
        const steps=Math.max(1,Math.min(10,Math.ceil(length/(scale*75))));
        for(let k=0;k<=steps;k++)out.push({x:a[0]+(b[0]-a[0])*k/steps,y:a[1]+(b[1]-a[1])*k/steps});
      }
    }
    return out;
  }

  function extraWaveSpecs(style,total,front,scale){
    if(style==='last-stand'){
      const a=Math.ceil(total*.3),b=Math.ceil(total*.25),c=Math.ceil(total*.25),d=Math.max(1,total-a-b-c);
      return[
        {angle:front,count:a,type:'PRESSURE',targetAngle:front,targetOffset:0,delay:0},
        {angle:front-Math.PI*.52,count:b,type:'FLANK_LEFT',targetAngle:front-Math.PI/2,targetOffset:scale*20,delay:1.2},
        {angle:front+Math.PI*.52,count:c,type:'FLANK_RIGHT',targetAngle:front+Math.PI/2,targetOffset:scale*20,delay:2.2},
        {angle:front+Math.PI,count:d,type:'PRESSURE',targetAngle:front+Math.PI,targetOffset:scale*8,delay:3.2}
      ];
    }
    if(style==='pincer'){
      const left=Math.ceil(total/2),right=total-left;
      return[
        {angle:front-Math.PI*.58,count:left,type:'FLANK_LEFT',targetAngle:front-Math.PI/2,targetOffset:scale*20,delay:.4},
        {angle:front+Math.PI*.58,count:right,type:'FLANK_RIGHT',targetAngle:front+Math.PI/2,targetOffset:scale*20,delay:1.8}
      ];
    }
    if(style==='siege'){
      const pin=Math.max(2,Math.floor(total*.4)),remain=total-pin,left=Math.ceil(remain/2),right=remain-left;
      return[
        {angle:front,count:pin,type:'PRESSURE',targetOffset:0,delay:0},
        {angle:front-Math.PI*.6,count:left,type:'FLANK_LEFT',targetAngle:front-Math.PI/2,targetOffset:scale*24,delay:1.4},
        {angle:front+Math.PI*.6,count:right,type:'FLANK_RIGHT',targetAngle:front+Math.PI/2,targetOffset:scale*24,delay:2.6}
      ];
    }
    return[{angle:front,count:total,type:'PRESSURE',targetOffset:0,delay:0}];
  }

  function createEscalator(options,commander){
    const states=new Map(),scale=options.scale||1,points=routePoints(options,scale);
    const blocked=options.blocked||(()=>false),getEnemies=options.getEnemies||(()=>[]),getSquad=options.getSquad||(()=>[]);
    function spawnPoint(zone,angle,distance=scale*250){
      const wanted={x:zone.x+Math.cos(angle)*distance,y:zone.y+Math.sin(angle)*distance};
      let best=null,score=Infinity;
      for(const p of points){
        const d=dist(p,zone);if(d<scale*150||d>scale*390||blocked(p.x,p.y,12))continue;
        const cost=dist(p,wanted)+Math.abs(d-distance)*.18;if(cost<score){score=cost;best=p}
      }
      if(best)return best;
      for(let ring=distance;ring>=scale*155;ring-=scale*24){
        for(let k=0;k<16;k++){
          const a=angle+k*TAU/16,p={x:zone.x+Math.cos(a)*ring,y:zone.y+Math.sin(a)*ring};
          if(!blocked(p.x,p.y,12))return p;
        }
      }
      return null;
    }
    function template(){return getEnemies().find(e=>!e.checkpointWave)||getEnemies()[0]||null}
    function spawnEnemy(base,point,target,phase,groupId,index,waveNo,time){
      const maxHp=Number(base?.maxHp)||3;
      const e={...base,x:point.x,y:point.y,homeX:point.x,homeY:point.y,variant:(Number(base?.variant)||0)+(index+waveNo)%4,
        hp:maxHp,maxHp,alive:true,phase:time*.67+index*.37,cooldown:.28+index*.035,alert:true,lastSeen:{x:target.x,y:target.y},observedAt:time,
        aiState:'alert',flash:0,dir:Math.atan2(target.y-point.y,target.x-point.x),anim:time+index*.43,state:'idle',fireTimer:0,deadTimer:0,deathAngle:0,
        path:null,pathIndex:0,repath:0,hitTimer:0,groupId,objectiveGroup:phase.defenderGroup,role:['anchor','left','right'][index%3],
        tacticTimer:.1+(index%3)*.12,tacticalPoint:null,burstCount:0,burstLimit:2+(index%2),burstPause:0,searchTimer:0,reactionTimer:.12+index*.025,
        cueTimer:1.5,alertCue:'!',pathQueued:false,pendingPath:null,checkpointWave:true,checkpointExtra:true,checkpointPhase:phase.index,checkpointWaveNumber:waveNo};
      getEnemies().push(e);return e;
    }
    function issue(group,type,target,time,delay){
      for(const e of group){
        e.commandOrder={type,point:{x:target.x,y:target.y},until:time+32,engageAt:time+(delay||0)};
        e.role=type==='FLANK_LEFT'?'left':type==='FLANK_RIGHT'?'right':e.role;
        options.queuePath?.(e,target.x,target.y);
      }
    }
    function spawnWave(phase,cfg,waveIndex,time){
      const zone=options.getZones?.()?.[phase.zone],base=template(),living=getSquad().filter(s=>s.alive);
      if(!zone||!base||!living.length)return 0;
      const center={x:living.reduce((n,s)=>n+s.x,0)/living.length,y:living.reduce((n,s)=>n+s.y,0)/living.length};
      const approach=Math.atan2(center.y-zone.y,center.x-zone.x),front=approach+Math.PI;
      const total=Math.max(4,Math.min(14,Number(cfg.count)||8)),specs=extraWaveSpecs(cfg.style||'siege',total,front,scale);
      let spawned=0;
      specs.forEach((spec,groupIndex)=>{
        const origin=spawnPoint(zone,spec.angle,cfg.distance||scale*250);if(!origin)return;
        const groupId='checkpoint:'+phase.index+':extra:'+waveIndex+':'+groupIndex,group=[];
        for(let i=0;i<spec.count;i++){
          const side=(i-(spec.count-1)/2)*scale*8,perp=spec.angle+Math.PI/2;
          let p={x:origin.x+Math.cos(perp)*side,y:origin.y+Math.sin(perp)*side};if(blocked(p.x,p.y,10))p=origin;
          const target={x:zone.x+Math.cos(spec.targetAngle||0)*(spec.targetOffset||0),y:zone.y+Math.sin(spec.targetAngle||0)*(spec.targetOffset||0)};
          group.push(spawnEnemy(base,p,target,phase,groupId,i,waveIndex+2,time));spawned++;
        }
        if(group.length){commander.groups?.set(groupId,group);const target={x:zone.x+Math.cos(spec.targetAngle||0)*(spec.targetOffset||0),y:zone.y+Math.sin(spec.targetAngle||0)*(spec.targetOffset||0)};issue(group,spec.type||'PRESSURE',target,time,spec.delay||0)}
      });
      if(spawned){
        for(const s of living)if(s.checkpointGarrison===phase.index||dist(s,zone)<=zone.r*1.2){s.checkpointGarrison=phase.index;s.checkpointCover=true}
      }
      return spawned;
    }
    function update(time){
      const phase=options.getPhase?.(),extras=phase?.checkpoint?.waves;
      if(!phase||!Array.isArray(extras)||!extras.length)return;
      const baseState=commander.checkpointState?.(phase);if(!baseState?.started)return;
      let state=states.get(phase.index);if(!state){state={next:0,active:-1,pendingAt:0,completed:0};states.set(phase.index,state)}
      const live=getEnemies().filter(e=>e.alive&&e.checkpointExtra&&e.checkpointPhase===phase.index);
      if(live.length)return;
      if(state.active>=0){state.completed++;state.next=state.active+1;state.active=-1;state.pendingAt=time+Math.max(.55,Number(phase.checkpoint.intermission)||.8)}
      if(!baseState.cleared||state.next>=extras.length)return;
      if(!state.pendingAt){state.pendingAt=time+Math.max(.55,Number(phase.checkpoint.intermission)||.8);return}
      if(time<state.pendingAt)return;
      const count=spawnWave(phase,extras[state.next],state.next,time);
      if(count){state.active=state.next;state.pendingAt=0}
    }
    return{update,states,spawnWave};
  }

  function patchArt(art){
    if(!art||art.__checkpointFortificationPatched)return !!art;
    if(typeof art.drawActor!=='function'||typeof art.animate!=='function')return false;
    const drawActor=art.drawActor,animate=art.animate;
    art.drawActor=function(ctx,ent,team='squad'){
      if(team==='squad'&&ent.checkpointFortificationRearLead)drawSandbagRing(ctx,ent,'back');
      const result=drawActor.call(this,ctx,ent,team);
      if(team==='squad'&&ent.checkpointFortificationFrontLead)drawSandbagRing(ctx,ent,'front');
      return result;
    };
    art.animate=function(ent,dt){if(ent?.checkpointFortified&&finite(ent.checkpointFacing))ent.dir=ent.checkpointFacing;return animate.call(this,ent,dt)};
    art.__checkpointFortificationPatched=true;return true;
  }

  function patchAdaptive(adaptive){
    if(!adaptive||adaptive.__checkpointFortificationPatched)return !!adaptive;
    if(typeof adaptive.createCommander!=='function')return false;
    const createCommander=adaptive.createCommander;
    adaptive.createCommander=function(options={}){
      const commander=createCommander.call(this,options),maintain=commander.maintain.bind(commander),escalator=createEscalator(options,commander);
      const arrange=()=>arrangeSquad({squad:options.getSquad?.()||[],phase:options.getPhase?.(),zones:options.getZones?.()||{},scale:options.scale||1,blocked:options.blocked||(()=>false)});
      commander.maintain=function(time){const result=maintain(time);escalator.update(time);arrange();return result};
      commander.arrangeCheckpoint=arrange;commander.checkpointEscalation=escalator.states;
      return commander;
    };
    adaptive.__checkpointFortificationPatched=true;return true;
  }

  function install(root){
    patchArt(root.BadFodderArt);
    if(root.BadFodderAdaptive){patchAdaptive(root.BadFodderAdaptive);return}
    const existing=Object.getOwnPropertyDescriptor(root,'BadFodderAdaptive');
    if(!existing||existing.configurable){
      let value=existing&&'value'in existing?existing.value:null;
      Object.defineProperty(root,'BadFodderAdaptive',{configurable:true,enumerable:true,get(){return value},set(next){value=next;patchAdaptive(next)}});
      if(value)patchAdaptive(value);
    }
  }

  return{arrangeSquad,drawSandbagRing,extraWaveSpecs,createEscalator,patchArt,patchAdaptive,install};
});
