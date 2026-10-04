/* Single-soldier garrison gameplay command for Bad Fodder. */
(function(root){
  'use strict';
  const RANGE=300,FIRE_INTERVAL=.18,KEY='h';
  let runtimeGetSquad=null,runtimeGetEnemies=null;

  function liveSquad(){try{return typeof runtimeGetSquad==='function'?(runtimeGetSquad()||[]):[]}catch(_){return[]}}

  function selectedOne(){
    try{
      if(typeof root.selectedUnits==='function'){
        const units=root.selectedUnits();
        if(units.length===1)return units[0];
      }
      const squad=liveSquad();
      if(!squad.length)return null;
      if(squad.length===1)return squad[0].alive?squad[0]:null;
      const doc=root.document;if(!doc)return null;
      if(doc.getElementById('hudAll')?.classList?.contains('selected'))return null;
      const hud=[...doc.querySelectorAll('.hud-unit')];
      const hudIndex=hud.findIndex(el=>el.classList?.contains('selected'));
      if(hudIndex>=0&&squad[hudIndex]?.alive)return squad[hudIndex];
      const cards=[...doc.querySelectorAll('.card')];
      const cardIndex=cards.findIndex(el=>el.classList?.contains('selected'));
      if(cardIndex>=0&&squad[cardIndex]?.alive)return squad[cardIndex];
      return null;
    }catch(_){return null}
  }

  function selectedForMovement(){
    try{
      if(typeof root.selectedUnits==='function'){
        const units=root.selectedUnits();
        if(units.length)return units;
      }
      const squad=liveSquad().filter((s,i)=>s?.alive&&(!root.BadFodderCommands||root.BadFodderCommands.owns(i)));
      const doc=root.document;
      if(!doc)return selectedOne()?[selectedOne()]:[];
      if(doc.getElementById('hudAll')?.classList?.contains('selected'))return squad;
      const one=selectedOne();return one?[one]:[];
    }catch(_){return[]}
  }

  function firearmsAllowed(){try{return typeof root.actionAllowed!=='function'||root.actionAllowed('firearms')}catch(_){return true}}
  function setNotice(text){
    try{if(typeof root.setStatus==='function')root.setStatus(text)}catch(_){ }
    const notice=root.document?.getElementById('hudNotice');
    if(notice){notice.textContent=text;notice.classList.add('show');setTimeout(()=>notice.classList.remove('show'),1400)}
  }
  function release(unit){
    if(!unit)return false;
    unit.manualGarrison=false;
    unit.garrisonAnchorX=null;unit.garrisonAnchorY=null;unit.garrisonTarget=null;unit.garrisonNextFire=0;
    unit.garrisonTracerFrames=0;unit.garrisonTracerX=null;unit.garrisonTracerY=null;
    return true;
  }
  function releaseForMovement(){
    if(root.BadFodderCommands?.mode==='client')return false;
    let changed=false;
    for(const unit of selectedForMovement())if(unit?.manualGarrison){release(unit);changed=true}
    if(changed){syncButtons();setNotice('Garrison released: movement order received.')}
    return changed;
  }
  function toggleGarrison(chosen=null){
    if(!chosen&&root.BadFodderCommands?.mode!=='local'&&root.BadFodderCoop?.garrison)return root.BadFodderCoop.garrison();
    if(!firearmsAllowed())return false;
    const unit=chosen||selectedOne();
    if(!unit){setNotice('Select one soldier to garrison.');return false}
    if(unit.manualGarrison){release(unit);setNotice('Garrison released.');syncButtons();return false}
    unit.manualGarrison=true;unit.garrisonAnchorX=unit.x;unit.garrisonAnchorY=unit.y;unit.garrisonTarget=null;unit.garrisonNextFire=0;
    unit.path=null;unit.pendingPath=null;unit.pathIndex=0;unit.target=null;
    setNotice('Garrison set. Soldier will hold and auto-fire.');syncButtons();return true;
  }
  function syncButtons(){
    const unit=selectedOne(),active=!!unit?.manualGarrison,allowed=firearmsAllowed();
    root.document?.querySelectorAll('[data-garrison-command]').forEach(btn=>{
      btn.hidden=!allowed;btn.classList.toggle('active',active);btn.setAttribute('aria-pressed',active?'true':'false');
      btn.textContent=active?'RELEASE':'GARRISON';
      btn.title=unit?(active?'Release selected soldier (H)':'Garrison selected soldier (H)'):'Select one soldier first';
    });
  }
  function makeTouchButton(){
    const b=root.document.createElement('button');
    b.id='touchGarrison';b.type='button';b.className='touch-action touch-gameplay';b.textContent='GARRISON';
    b.dataset.garrisonCommand='1';b.setAttribute('aria-pressed','false');b.setAttribute('aria-label','Garrison selected soldier');
    b.style.width='70px';b.style.height='58px';b.style.fontSize='8px';b.style.padding='0 4px';b.style.marginBottom='2px';
    b.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();toggleGarrison()});
    return b;
  }
  function installButtons(){
    if(!root.document)return;
    const oldTop=root.document.getElementById('hudGarrison');if(oldTop)oldTop.remove();
    const actions=root.document.querySelector('.touch-actions');
    if(actions&&!root.document.getElementById('touchGarrison'))actions.appendChild(makeTouchButton());
    if(!root.__garrisonButtonSync){
      root.__garrisonButtonSync=true;root.document.addEventListener('click',()=>setTimeout(syncButtons,0),true);setInterval(syncButtons,350);
    }
    syncButtons();
  }
  function installKeyboard(){
    if(root.__garrisonKeyboard||!root.document)return;root.__garrisonKeyboard=true;
    root.addEventListener('keydown',e=>{
      if(e.repeat||String(e.key||'').toLowerCase()!==KEY)return;
      const target=e.target,tag=target?.tagName?.toLowerCase();
      if(tag==='input'||tag==='textarea'||tag==='select'||target?.isContentEditable)return;
      if(!firearmsAllowed())return;e.preventDefault();toggleGarrison();
    });
  }
  function installMovementRelease(){
    if(root.__garrisonMovementRelease||!root.document)return;root.__garrisonMovementRelease=true;
    root.document.addEventListener('pointerdown',e=>{
      const target=e.target;
      if(target?.closest?.('[data-garrison-command]'))return;
      const canvas=target?.id==='game'||target?.tagName?.toLowerCase()==='canvas';
      const joystick=target?.id==='touchJoystick'||target?.closest?.('#touchJoystick');
      if((canvas&&e.button===0)||joystick)releaseForMovement();
    },true);
  }

  function lockCheckpointGarrisons(){
    if(root.BadFodderCommands?.mode==='client')return;
    for(const unit of liveSquad()){
      if(!unit?.alive)continue;
      const holding=!!unit.checkpointCover&&Number.isFinite(unit.checkpointGarrison);
      if(holding){
        if(unit.checkpointAnchorPhase!==unit.checkpointGarrison||!Number.isFinite(unit.checkpointAnchorX)||!Number.isFinite(unit.checkpointAnchorY)){
          unit.checkpointAnchorPhase=unit.checkpointGarrison;
          unit.checkpointAnchorX=unit.x;unit.checkpointAnchorY=unit.y;
        }
        unit.x=unit.checkpointAnchorX;unit.y=unit.checkpointAnchorY;
        unit.path=null;unit.pendingPath=null;unit.pathIndex=0;unit.target=null;
        unit.isFormationLeader=false;unit.followRepath=0;
      }else if(unit.checkpointAnchorPhase!==undefined){
        unit.checkpointAnchorPhase=undefined;unit.checkpointAnchorX=null;unit.checkpointAnchorY=null;
      }
    }
  }
  function installCheckpointLock(){
    if(root.__checkpointGarrisonLock)return;root.__checkpointGarrisonLock=true;
    setInterval(lockCheckpointGarrisons,16);
  }

  function drawPersonalSandbags(ctx,ent,half){
    if(!ctx||!ent?.manualGarrison)return;
    const r=15;ctx.save();
    if(half==='front'&&ent.garrisonTracerFrames>0&&Number.isFinite(ent.garrisonTracerX)){
      ctx.strokeStyle='rgba(255,232,150,.9)';ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(ent.x,ent.y);ctx.lineTo(ent.garrisonTracerX,ent.garrisonTracerY);ctx.stroke();ent.garrisonTracerFrames--;
    }
    ctx.fillStyle='rgba(28,22,15,.28)';ctx.beginPath();ctx.ellipse(ent.x,ent.y+5,22,10,0,0,Math.PI*2);ctx.fill();
    const count=9;
    for(let i=0;i<count;i++){
      const a=-Math.PI*.15+i*(Math.PI*1.3/(count-1)),front=Math.sin(a)>.15;
      if(half==='back'&&front)continue;if(half==='front'&&!front)continue;
      const x=ent.x+Math.cos(a)*r,y=ent.y+Math.sin(a)*r*.72;ctx.save();ctx.translate(x,y);ctx.rotate(a+Math.PI/2);
      const grad=ctx.createLinearGradient(0,-3,0,4);grad.addColorStop(0,'#c4aa78');grad.addColorStop(.45,'#987a50');grad.addColorStop(1,'#665039');
      ctx.fillStyle=grad;ctx.strokeStyle='#493a28';ctx.lineWidth=.8;ctx.beginPath();
      if(typeof ctx.roundRect==='function')ctx.roundRect(-5.5,-3,11,6,2.5);
      else{ctx.moveTo(-3,-3);ctx.lineTo(3,-3);ctx.quadraticCurveTo(5.5,-3,5.5,-.5);ctx.lineTo(5.5,.5);ctx.quadraticCurveTo(5.5,3,3,3);ctx.lineTo(-3,3);ctx.quadraticCurveTo(-5.5,3,-5.5,.5);ctx.lineTo(-5.5,-.5);ctx.quadraticCurveTo(-5.5,-3,-3,-3)}
      ctx.fill();ctx.stroke();ctx.strokeStyle='rgba(232,211,169,.42)';ctx.beginPath();ctx.moveTo(-3.8,-1.8);ctx.lineTo(3.8,-1.8);ctx.stroke();ctx.restore();
    }
    ctx.restore();
  }
  function patchArt(art=root.BadFodderArt){
    if(!art||art.__manualGarrisonPatched||typeof art.drawActor!=='function')return false;
    const original=art.drawActor;
    art.drawActor=function(ctx,ent,team='squad'){
      if(team==='squad'&&ent?.manualGarrison)drawPersonalSandbags(ctx,ent,'back');
      const result=original.call(this,ctx,ent,team);
      if(team==='squad'&&ent?.manualGarrison)drawPersonalSandbags(ctx,ent,'front');return result;
    };
    art.__manualGarrisonPatched=true;return true;
  }
  function applyGarrisonShot(s,target){
    s.fireTimer=.11;s.state='fire';s.flash=.08;s.garrisonTracerFrames=3;s.garrisonTracerX=target.x;s.garrisonTracerY=target.y;
    if(root.BadFodderCommands?.mode==='host'&&root.BadFodderCoopBridge?.shootGarrison)return root.BadFodderCoopBridge.shootGarrison(s,target);
    if(typeof root.fireBullet==='function')return root.fireBullet('squad',s.x,s.y,target.x,target.y);
    try{root.BadFodderSfx?.shoot?.('squad')}catch(_){ }
    if(Number.isFinite(target.hp)){
      target.hp=Math.max(0,target.hp-1);target.hitTimer=.12;target.flash=.08;
      if(target.hp<=0){target.alive=false;target.deadTimer=0;target.aiState='dead'}
    }
    return true;
  }
  function patchAdaptive(adaptive=root.BadFodderAdaptive){
    if(!adaptive||adaptive.__manualGarrisonPatched||typeof adaptive.createCommander!=='function')return false;
    const create=adaptive.createCommander;
    adaptive.createCommander=function(options={}){
      runtimeGetSquad=options.getSquad||runtimeGetSquad;runtimeGetEnemies=options.getEnemies||runtimeGetEnemies;
      const commander=create.call(this,options),maintain=commander.maintain?.bind(commander);
      commander.maintain=function(time){
        const result=maintain?maintain(time):undefined,squad=options.getSquad?.()||[],enemies=options.getEnemies?.()||[],scale=options.scale||1;
        lockCheckpointGarrisons();
        for(const s of squad){
          if(!s?.alive||!s.manualGarrison)continue;
          if(!Number.isFinite(s.garrisonAnchorX)){s.garrisonAnchorX=s.x;s.garrisonAnchorY=s.y}
          s.x=s.garrisonAnchorX;s.y=s.garrisonAnchorY;s.path=null;s.pendingPath=null;s.pathIndex=0;s.target=null;
          let target=null,best=RANGE*scale;
          for(const e of enemies){if(!e?.alive)continue;const d=Math.hypot(e.x-s.x,e.y-s.y);if(d<best){best=d;target=e}}
          s.garrisonTarget=target||null;if(!target)continue;s.dir=Math.atan2(target.y-s.y,target.x-s.x);
          if((s.garrisonNextFire||0)>time)continue;if(firearmsAllowed()){applyGarrisonShot(s,target);s.garrisonNextFire=time+FIRE_INTERVAL}
        }
        return result;
      };
      return commander;
    };
    adaptive.__manualGarrisonPatched=true;return true;
  }
  function chainProperty(name,patch){
    const d=Object.getOwnPropertyDescriptor(root,name);
    if(d&&!d.configurable){patch(root[name]);return false}
    if(d&&(d.get||d.set)){
      const oldGet=d.get,oldSet=d.set;
      Object.defineProperty(root,name,{configurable:true,enumerable:d.enumerable!==false,get(){return oldGet?oldGet.call(root):undefined},set(value){if(oldSet)oldSet.call(root,value);const current=oldGet?oldGet.call(root):value;patch(current)}});
      patch(oldGet?oldGet.call(root):undefined);return true;
    }
    let value=d&&'value'in d?d.value:root[name];
    Object.defineProperty(root,name,{configurable:true,enumerable:true,get(){return value},set(next){value=next;patch(next)}});patch(value);return true;
  }
  function install(){installButtons();installKeyboard();installMovementRelease();installCheckpointLock();patchArt();patchAdaptive()}

  root.BadFodderGarrison={toggleGarrison,release,releaseForMovement,selectedOne,lockCheckpointGarrisons,drawPersonalSandbags,patchArt,patchAdaptive,install};
  chainProperty('BadFodderArt',patchArt);chainProperty('BadFodderAdaptive',patchAdaptive);
  if(root.document){if(root.document.readyState==='loading')root.document.addEventListener('DOMContentLoaded',install,{once:true});else install()}
})(typeof window!=='undefined'?window:globalThis);
