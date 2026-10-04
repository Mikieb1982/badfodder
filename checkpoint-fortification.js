/* Tight outward-facing POI garrison with a shared sandbag ring.
   Browser patches the existing military commander and actor renderer.
   Node exports the pure helpers for regression tests. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.BadFodderCheckpointFortification=api;
  if(root&&root.document)api.install(root);
})(typeof window!=='undefined'?window:globalThis,function(){
  'use strict';
  const TAU=Math.PI*2;
  const finite=n=>Number.isFinite(n);

  function clearVisual(unit){
    unit.checkpointFortificationLead=false;
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
    units.forEach(u=>u.checkpointFortificationLead=false);
    if(!phase?.checkpoint||!phase.zone||!zones?.[phase.zone]){
      units.forEach(clearVisual);return null;
    }
    const zone=zones[phase.zone];
    const defenders=units.filter(s=>s.alive&&s.checkpointGarrison===phase.index&&(s.checkpointCover||s.checkpointHeld===phase.index));
    for(const unit of units){
      if(!defenders.includes(unit)&&unit.checkpointFortificationPhase!==phase.index)clearVisual(unit);
    }
    if(!defenders.length)return null;

    // Use the already validated garrison positions to find a safe local centre, then compress them.
    const center={
      x:defenders.reduce((n,s)=>n+s.x,0)/defenders.length,
      y:defenders.reduce((n,s)=>n+s.y,0)/defenders.length
    };
    const radius=Math.min(zone.r*.18,scale*11);
    const sandbagRadius=Math.max(radius+scale*14,scale*25);

    defenders.forEach((s,i)=>{
      const angle=-Math.PI/2+i*TAU/defenders.length;
      const point=candidate(center,angle,radius,(x,y,r)=>blocked(x,y,r));
      if(point){
        s.x=point.x;s.y=point.y;s.path=null;s.pendingPath=null;s.pathIndex=0;s.target=null;
      }
      const facing=Math.atan2(s.y-center.y,s.x-center.x);
      s.dir=facing;s.checkpointFacing=facing;s.checkpointFortified=true;
      s.checkpointCenterX=center.x;s.checkpointCenterY=center.y;
      s.checkpointSandbagRadius=sandbagRadius;s.checkpointFortificationPhase=phase.index;
    });
    // The northern-most member renders the shared ring first so the rest of the squad paints over it.
    defenders.reduce((lead,s)=>!lead||s.y<lead.y?s:lead,null).checkpointFortificationLead=true;
    return{center,radius,sandbagRadius,count:defenders.length};
  }

  function drawSandbagRing(ctx,ent){
    if(!ctx||!ent?.checkpointFortificationLead||!ent.checkpointFortified)return false;
    const cx=ent.checkpointCenterX,cy=ent.checkpointCenterY,r=ent.checkpointSandbagRadius;
    if(!finite(cx)||!finite(cy)||!finite(r)||r<=0)return false;
    const bags=16,w=Math.max(12,r*.31),h=Math.max(7,r*.14);
    ctx.save();
    for(let i=0;i<bags;i++){
      const a=(i+.5)*TAU/bags,x=cx+Math.cos(a)*r,y=cy+Math.sin(a)*r;
      ctx.save();ctx.translate(x,y);ctx.rotate(a+Math.PI/2);
      ctx.fillStyle='rgba(35,31,22,.28)';ctx.beginPath();ctx.ellipse(1,3,w*.52,h*.48,0,0,TAU);ctx.fill();
      ctx.fillStyle=i%2?'#9b8158':'#aa9063';ctx.strokeStyle='#5d4c35';ctx.lineWidth=1.1;
      ctx.beginPath();ctx.ellipse(0,0,w*.5,h*.5,0,0,TAU);ctx.fill();ctx.stroke();
      ctx.strokeStyle='rgba(76,60,39,.72)';ctx.lineWidth=.8;ctx.beginPath();ctx.moveTo(0,-h*.38);ctx.lineTo(0,h*.38);ctx.stroke();
      ctx.restore();
    }
    ctx.restore();return true;
  }

  function patchArt(art){
    if(!art||art.__checkpointFortificationPatched)return !!art;
    if(typeof art.drawActor!=='function'||typeof art.animate!=='function')return false;
    const drawActor=art.drawActor,animate=art.animate;
    art.drawActor=function(ctx,ent,team='squad'){
      if(team==='squad')drawSandbagRing(ctx,ent);
      return drawActor.call(this,ctx,ent,team);
    };
    art.animate=function(ent,dt){
      if(ent?.checkpointFortified&&finite(ent.checkpointFacing))ent.dir=ent.checkpointFacing;
      return animate.call(this,ent,dt);
    };
    art.__checkpointFortificationPatched=true;
    return true;
  }

  function patchAdaptive(adaptive){
    if(!adaptive||adaptive.__checkpointFortificationPatched)return !!adaptive;
    if(typeof adaptive.createCommander!=='function')return false;
    const createCommander=adaptive.createCommander;
    adaptive.createCommander=function(options={}){
      const commander=createCommander.call(this,options);
      const maintain=commander.maintain.bind(commander);
      const arrange=()=>arrangeSquad({
        squad:options.getSquad?.()||[],phase:options.getPhase?.(),zones:options.getZones?.()||{},
        scale:options.scale||1,blocked:options.blocked||(()=>false)
      });
      commander.maintain=function(time){const result=maintain(time);arrange();return result};
      commander.arrangeCheckpoint=arrange;
      return commander;
    };
    adaptive.__checkpointFortificationPatched=true;
    return true;
  }

  function install(root){
    let attempts=0,timer=null;
    const tryInstall=()=>{
      attempts++;
      const artReady=patchArt(root.BadFodderArt),adaptiveReady=patchAdaptive(root.BadFodderAdaptive);
      if(artReady&&adaptiveReady){if(timer)root.clearInterval(timer);timer=null;return true}
      if(attempts>=120&&timer){root.clearInterval(timer);timer=null}
      return false;
    };
    tryInstall();
    if(!(root.BadFodderArt?.__checkpointFortificationPatched&&root.BadFodderAdaptive?.__checkpointFortificationPatched))timer=root.setInterval(tryInstall,25);
  }

  return{arrangeSquad,drawSandbagRing,patchArt,patchAdaptive,install};
});
