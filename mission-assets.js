/* Load only the active mission. Existing mission selection reloads remain authoritative. */
(function(root){
 'use strict';
 const groups={
  barcelona:['barcelona-map.js','barcelona-art.js','barcelona-polish.js?v=20261006-cohesion-2','friendly-resistance.js','barcelona-runtime.js'],
  'bad-belzig':['town-map.js','bad-belzig-data.js'],
  wigan:['wigan-map.js','wigan-details.js','wigan-scenery.js?v=20261003-upgrade-1'],
  'cable-street':['cable-street-map.js?v=20261003-tactical-1','cable-street-runtime.js','cable-street-interactions.js?v=20261004-adaptive-1','cable-street-director.js?v=20261004-adaptive-1','cable-street-crowd.js?v=20261004-adaptive-1','cable-street-art.js?v=20261003-visual-2']
 };
 const pending=new Map();
 const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
 function script(file){return new Promise((resolve,reject)=>{const el=document.createElement('script');el.src=root.BadFodderAssetUrl?.(file.split('?')[0])||file;const timer=setTimeout(()=>{el.remove();reject(new Error('Mission load timed out: '+file))},15000);el.onload=()=>{clearTimeout(timer);resolve()};el.onerror=()=>{clearTimeout(timer);el.remove();reject(new Error('Mission file failed: '+file))};document.head.appendChild(el);});}
 async function loadFile(file){try{return await script(file)}catch(first){await delay(250);try{return await script(file)}catch(second){second.cause=first;throw second}}}
 function load(key){if(!groups[key])return Promise.reject(new Error('Unknown mission: '+key));if(!pending.has(key))pending.set(key,(async()=>{for(const file of groups[key])await loadFile(file);})().catch(error=>{pending.delete(key);throw error}));return pending.get(key);}
 const launch=BadFodderMissionLaunch.create({storage:BadFodderStorage.session,missions:BadFodderCampaign.missions,campaign:BadFodderCampaign,historicalMissions:BadFodderHistoricalMissions.missions});
 const ready=load(launch.current().map);
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
  const bad=document.getElementById('menuMissionBad');if(bad)bad.onclick=()=>retry('select',0,null);
  const wigan=document.getElementById('menuMissionWigan');if(wigan)wigan.onclick=()=>retry('select',1,null);
  const barcelona=document.getElementById('menuMissionBarcelona');if(barcelona)barcelona.onclick=()=>retry('select',3,'barcelona-1936');
  const cable=document.getElementById('menuHistoricalCable');if(cable)cable.onclick=()=>retry('select',2,null);
 }
 root.BadFodderMissionAssets={load,ready,recover,has:key=>Object.hasOwn(groups,key)};
})(window);
