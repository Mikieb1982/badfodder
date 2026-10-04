/* Single-soldier garrison command for Bad Fodder. */
(function(root){
  'use strict';
  const RANGE=300;
  const FIRE_INTERVAL=.18;

  function selectedOne(){
    try{
      const units=typeof root.selectedUnits==='function'?root.selectedUnits():[];
      return units.length===1?units[0]:null;
    }catch(_){return null}
  }

  function setNotice(text){
    try{if(typeof root.setStatus==='function')root.setStatus(text)}catch(_){ }
    const notice=root.document?.getElementById('hudNotice');
    if(notice){notice.textContent=text;notice.classList.add('show');setTimeout(()=>notice.classList.remove('show'),1400)}
  }

  function toggleGarrison(){
    const unit=selectedOne();
    if(!unit){setNotice('Select one soldier to garrison.');return false}
    if(unit.manualGarrison){
      unit.manualGarrison=false;unit.garrisonAnchorX=null;unit.garrisonAnchorY=null;unit.garrisonTarget=null;
      setNotice('Garrison released.');syncButtons();return false;
    }
    unit.manualGarrison=true;unit.garrisonAnchorX=unit.x;unit.garrisonAnchorY=unit.y;unit.garrisonTarget=null;
    unit.path=null;unit.pendingPath=null;unit.pathIndex=0;unit.target=null;
    setNotice('Garrison set. Soldier will hold and auto-fire.');syncButtons();return true;
  }

  function syncButtons(){
    const unit=selectedOne(),active=!!unit?.manualGarrison;
    root.document?.querySelectorAll('[data-garrison-command]').forEach(btn=>{
      btn.classList.toggle('active',active);
      btn.setAttribute('aria-pressed',active?'true':'false');
      btn.title=unit?'Hold/release selected soldier':'Select one soldier first';
    });
  }

  function makeButton(id,cls){
    const b=root.document.createElement('button');
    b.id=id;b.type='button';b.className=cls||'';b.textContent='GARRISON';
    b.dataset.garrisonCommand='1';b.setAttribute('aria-pressed','false');
    if(id==='touchGarrison'){b.style.width='68px';b.style.height='56px';b.style.fontSize='9px';b.style.padding='0 4px'}
    b.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();toggleGarrison()});
    return b;
  }

  function installButtons(){
    if(!root.document)return;
    const tools=root.document.querySelector('.hud-tools');
    if(tools&&!root.document.getElementById('hudGarrison'))tools.appendChild(makeButton('hudGarrison',''));
    const actions=root.document.querySelector('.touch-actions');
    if(actions&&!root.document.getElementById('touchGarrison'))actions.appendChild(makeButton('touchGarrison','touch-action touch-gameplay'));
    if(!root.__garrisonButtonSync){
      root.__garrisonButtonSync=true;
      root.document.addEventListener('click',()=>setTimeout(syncButtons,0),true);
      setInterval(syncButtons,350);
    }
  }

  function drawPersonalSandbags(ctx,ent,half){
    if(!ctx||!ent?.manualGarrison)return;
    const r=15;
    ctx.save();
    ctx.fillStyle='rgba(28,22,15,.28)';
    ctx.beginPath();ctx.ellipse(ent.x,ent.y+5,22,10,0,0,Math.PI*2);ctx.fill();
    const count=9;
    for(let i=0;i<count;i++){
      const a=-Math.PI*.15+i*(Math.PI*1.3/(count-1));
      const front=Math.sin(a)>.15;
      if(half==='back'&&front)continue;
      if(half==='front'&&!front)continue;
      const x=ent.x+Math.cos(a)*r,y=ent.y+Math.sin(a)*r*.72;
      ctx.save();ctx.translate(x,y);ctx.rotate(a+Math.PI/2);
      const grad=ctx.createLinearGradient(0,-3,0,4);grad.addColorStop(0,'#c4aa78');grad.addColorStop(.45,'#987a50');grad.addColorStop(1,'#665039');
      ctx.fillStyle=grad;ctx.strokeStyle='#493a28';ctx.lineWidth=.8;
      ctx.beginPath();
      if(typeof ctx.roundRect==='function')ctx.roundRect(-5.5,-3,11,6,2.5);
      else{ctx.moveTo(-3,-3);ctx.lineTo(3,-3);ctx.quadraticCurveTo(5.5,-3,5.5,-.5);ctx.lineTo(5.5,.5);ctx.quadraticCurveTo(5.5,3,3,3);ctx.lineTo(-3,3);ctx.quadraticCurveTo(-5.5,3,-5.5,.5);ctx.lineTo(-5.5,-.5);ctx.quadraticCurveTo(-5.5,-3,-3,-3)}
      ctx.fill();ctx.stroke();
      ctx.strokeStyle='rgba(232,211,169,.42)';ctx.beginPath();ctx.moveTo(-3.8,-1.8);ctx.lineTo(3.8,-1.8);ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }

  function patchArt(){
    const art=root.BadFodderArt;
    if(!art||art.__manualGarrisonPatched||typeof art.drawActor!=='function')return false;
    const original=art.drawActor;
    art.drawActor=function(ctx,ent,team='squad'){
      if(team==='squad'&&ent?.manualGarrison)drawPersonalSandbags(ctx,ent,'back');
      const result=original.call(this,ctx,ent,team);
      if(team==='squad'&&ent?.manualGarrison)drawPersonalSandbags(ctx,ent,'front');
      return result;
    };
    art.__manualGarrisonPatched=true;return true;
  }

  function patchAdaptive(){
    const adaptive=root.BadFodderAdaptive;
    if(!adaptive||adaptive.__manualGarrisonPatched||typeof adaptive.createCommander!=='function')return false;
    const create=adaptive.createCommander;
    adaptive.createCommander=function(options={}){
      const commander=create.call(this,options);
      const maintain=commander.maintain?.bind(commander);
      commander.maintain=function(time){
        const result=maintain?maintain(time):undefined;
        const squad=options.getSquad?.()||[],enemies=options.getEnemies?.()||[],scale=options.scale||1;
        for(const s of squad){
          if(!s?.alive||!s.manualGarrison)continue;
          if(!Number.isFinite(s.garrisonAnchorX)){s.garrisonAnchorX=s.x;s.garrisonAnchorY=s.y}
          s.x=s.garrisonAnchorX;s.y=s.garrisonAnchorY;s.path=null;s.pendingPath=null;s.pathIndex=0;s.target=null;
          let target=null,best=RANGE*scale;
          for(const e of enemies){
            if(!e?.alive)continue;
            const d=Math.hypot(e.x-s.x,e.y-s.y);if(d<best){best=d;target=e}
          }
          s.garrisonTarget=target||null;
          if(!target)continue;
          s.dir=Math.atan2(target.y-s.y,target.x-s.x);
          if((s.garrisonNextFire||0)>time)continue;
          if(typeof root.fireBullet==='function'&&(!root.actionAllowed||root.actionAllowed('firearms'))){
            root.fireBullet('squad',s.x,s.y,target.x,target.y);
            s.fireTimer=.11;s.state='fire';s.flash=.08;s.garrisonNextFire=time+FIRE_INTERVAL;
          }
        }
        return result;
      };
      return commander;
    };
    adaptive.__manualGarrisonPatched=true;return true;
  }

  function install(){
    installButtons();
    patchArt();patchAdaptive();
    if(!root.__garrisonPatchTimer){
      root.__garrisonPatchTimer=setInterval(()=>{
        installButtons();
        const artDone=patchArt(),adaptiveDone=patchAdaptive();
        if((root.BadFodderArt?.__manualGarrisonPatched||artDone)&&(root.BadFodderAdaptive?.__manualGarrisonPatched||adaptiveDone)){
          clearInterval(root.__garrisonPatchTimer);root.__garrisonPatchTimer=null;
        }
      },100);
    }
  }

  root.BadFodderGarrison={toggleGarrison,drawPersonalSandbags,patchArt,patchAdaptive,install};
  if(root.document){if(root.document.readyState==='loading')root.document.addEventListener('DOMContentLoaded',install,{once:true});else install()}
})(typeof window!=='undefined'?window:globalThis);
