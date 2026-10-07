/* Load only the active mission. Existing mission selection reloads remain authoritative. */
(function(root){
 'use strict';
 const pending=new Map();
 const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
 function script(file){return new Promise((resolve,reject)=>{const el=document.createElement('script');el.src=root.BadFodderAssetUrl?.(file.split('?')[0])||file;const timer=setTimeout(()=>{el.remove();reject(new Error('Mission load timed out: '+file))},15000);el.onload=()=>{clearTimeout(timer);resolve()};el.onerror=()=>{clearTimeout(timer);el.remove();reject(new Error('Mission file failed: '+file))};document.head.appendChild(el);});}
 async function loadFile(file){try{return await script(file)}catch(first){await delay(250);try{return await script(file)}catch(second){second.cause=first;throw second}}}
 async function registry(){
  if(root.BadFodderMissionRegistry)return root.BadFodderMissionRegistry;
  if(!root.BadFodderMissionDefinition)await loadFile('mission-definition.js');
  if(!root.BadFodderMissionRegistry)await loadFile('mission-registry.js');
  if(!root.BadFodderMissionRegistry)throw new Error('Mission registry failed to load.');
  return root.BadFodderMissionRegistry;
 }
 async function load(ref){
  const missions=await registry(),definition=missions.get(ref);
  if(!definition)throw new Error('Unknown mission: '+ref);
  const key=definition.key;
  if(!pending.has(key))pending.set(key,(async()=>{for(const file of definition.modules)await loadFile(file);})().catch(error=>{pending.delete(key);throw error}));
  return pending.get(key);
 }
 const ready=(async()=>{
  const missions=await registry();
  const launch=BadFodderMissionLaunch.create({storage:BadFodderStorage.session,missions:BadFodderCampaign.missions,campaign:BadFodderCampaign,historicalMissions:BadFodderHistoricalMissions.missions,registry:missions});
  const current=launch.current(),definition=missions.get(current);
  if(!definition)throw new Error('Unknown mission: '+(current?.id||current?.map||'none'));
  return load(definition.key);
 })();
 function recover(error){
  console.error('Mission assets failed to load',error);
  document.getElementById('loading')?.classList.add('hidden');
  const main=document.querySelector('[data-view="main"]'),screen=document.getElementById('menuScreen');
  if(!main||!screen)return;
  main.hidden=false;screen.hidden=false;
  let hint=document.getElementById('missionLoadError');
  if(!hint){hint=document.createElement('p');hint.id='missionLoadError';hint.setAttribute('role','status');main.appendChild(hint)}
  hint.textContent='MISSION LOAD FAILED. Choose a mission to retry.';
  function retry(mode,index,id){BadFodderStorage.session.removeItem('badfodder.launch.autostart.v1');BadFodderStorage.session.setItem('badfodder.launch.v1',JSON.stringify({mode,index,id}));location.reload();}
  const missionSelect=document.getElementById('menuMissionSelect');if(missionSelect)missionSelect.onclick=()=>{main.hidden=true;const missions=document.querySelector('[data-view="missions"]');if(missions)missions.hidden=false;};
  const start=document.getElementById('menuStart');if(start)start.onclick=()=>retry('campaign',null,null);
  const missions=root.BadFodderMissionRegistry;
  for(const definition of missions?.all?.()||[]){
   for(const id of definition.selection?.buttonIds||[]){const button=document.getElementById(id);if(button)button.onclick=()=>retry('select',null,definition.id);}
  }
 }
 root.BadFodderMissionAssets={load,ready,recover,has:key=>root.BadFodderMissionRegistry?.has(key)||false};
})(window);
