/* Keep Resistance mode mechanically on the selected map without inheriting mission story presentation. */
(function(root){
 'use strict';

 function active(){return root.BadFodderArcade?.active?.('resistance')===true;}
 function mapLabel(){
  const selected=root.BadFodderArcade?.read?.()?.map;
  return root.BadFodderArcade?.MAPS?.find?.(map=>map.key===selected)?.label||'Resistance';
 }
 function wave(){return Math.max(1,Number(root.BadFodderArcade?.runtime?.wave)||1);}
 function cleanPresentation(env){
  if(!active()||!env)return;
  const currentWave=wave();
  if(env.hudCampaign)env.hudCampaign.textContent='RESISTANCE · '+mapLabel().toUpperCase();
  if(env.hudStage)env.hudStage.textContent='WAVE '+currentWave;
  if(env.hudMission)env.hudMission.textContent='SURVIVE THE WAVES';
  if(env.hudProgress?.replaceChildren)env.hudProgress.replaceChildren();
  if(env.hudEnemyLabel)env.hudEnemyLabel.textContent='HOSTILES';
  if(env.hudGrenadeLabel)env.hudGrenadeLabel.textContent='GRENADES';
  const instruction=root.document?.getElementById('hudInstruction');
  if(instruction){instruction.hidden=true;instruction.textContent='';}
  const briefing=root.document?.getElementById('menuViewBriefing');
  if(briefing)briefing.hidden=true;
  const status=String(env.statusEl?.textContent||'');
  if(env.statusEl&&!/^(RESISTANCE|WAVE)\b/i.test(status))env.statusEl.textContent='RESISTANCE · Survive the waves';
 }

 function patchHud(api){
  if(!api||api.__resistanceSeparated||typeof api.create!=='function')return false;
  const create=api.create;
  api.create=function(env){
   const hud=create.call(this,env);
   if(!hud||hud.__resistanceSeparated)return hud;
   if(typeof hud.updateHud==='function'){
    const update=hud.updateHud.bind(hud);
    hud.updateHud=function(...args){const value=update(...args);cleanPresentation(env);return value;};
   }
   hud.__resistanceSeparated=true;
   return hud;
  };
  api.__resistanceSeparated=true;
  return true;
 }

 function patchMissionController(api){
  if(!api||api.__resistanceSeparated||typeof api.create!=='function')return false;
  const create=api.create;
  api.create=function(env){
   const controller=create.call(this,env);
   if(!controller||controller.__resistanceSeparated)return controller;
   if(typeof controller.requestMissionBriefing==='function'){
    const request=controller.requestMissionBriefing.bind(controller);
    controller.requestMissionBriefing=function(mission,begin,back){
     if(active()){if(typeof begin==='function')begin();cleanPresentation(env);return true;}
     return request(mission,begin,back);
    };
   }
   if(typeof controller.startStandaloneMission==='function'&&typeof controller.launchStandalone==='function'){
    const start=controller.startStandaloneMission.bind(controller),launch=controller.launchStandalone.bind(controller);
    controller.startStandaloneMission=function(index){return active()?launch(index):start(index);};
   }
   if(typeof controller.viewMissionBriefing==='function'){
    const view=controller.viewMissionBriefing.bind(controller);
    controller.viewMissionBriefing=function(){
     if(active()){env.setStatus?.('RESISTANCE · No mission briefing in this mode.');cleanPresentation(env);return false;}
     return view();
    };
   }
   for(const name of ['completeCurrentMission','advanceCampaign','showMissionResult']){
    if(typeof controller[name]!=='function')continue;
    const original=controller[name].bind(controller);
    controller[name]=function(...args){return active()?false:original(...args);};
   }
   for(const name of ['beginMission','resumeMission']){
    if(typeof controller[name]!=='function')continue;
    const original=controller[name].bind(controller);
    controller[name]=function(...args){const value=original(...args);cleanPresentation(env);return value;};
   }
   if(typeof controller.startGame==='function'){
    const startGame=controller.startGame.bind(controller);
    controller.startGame=function(...args){
     const value=startGame(...args);
     if(value&&typeof value.then==='function')return value.then(result=>{cleanPresentation(env);return result;});
     cleanPresentation(env);return value;
    };
   }
   controller.__resistanceSeparated=true;
   return controller;
  };
  api.__resistanceSeparated=true;
  return true;
 }

 function watch(name,patch){
  const descriptor=Object.getOwnPropertyDescriptor(root,name);
  if(descriptor&&!descriptor.configurable){patch(root[name]);return;}
  let value=descriptor&&'value'in descriptor?descriptor.value:root[name];
  Object.defineProperty(root,name,{configurable:true,enumerable:true,get(){return value;},set(next){value=next;patch(next);}});
  patch(value);
 }
 function install(){watch('BadFodderHudController',patchHud);watch('BadFodderMissionController',patchMissionController);}
 install();
 root.BadFodderResistanceSeparation={active,cleanPresentation,patchHud,patchMissionController,install};
})(typeof window!=='undefined'?window:globalThis);
