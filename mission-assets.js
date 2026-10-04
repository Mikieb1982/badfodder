/* Load only the active mission. Existing mission selection reloads remain authoritative. */
(function(root){
 'use strict';
 const groups={
  'bad-belzig':['town-map.js','bad-belzig-data.js'],
  wigan:['wigan-map.js','wigan-details.js','wigan-scenery.js?v=20261003-upgrade-1'],
  'cable-street':['cable-street-map.js?v=20261003-tactical-1','cable-street-runtime.js','cable-street-interactions.js?v=20261004-adaptive-1','cable-street-director.js?v=20261004-adaptive-1','cable-street-crowd.js?v=20261004-adaptive-1','cable-street-art.js?v=20261003-visual-2']
 };
 const pending=new Map();
 function script(file){return new Promise((resolve,reject)=>{const el=document.createElement('script');el.src=root.BadFodderAssetUrl?.(file.split('?')[0])||file;const timer=setTimeout(()=>{el.remove();reject(new Error('Mission load timed out: '+file))},15000);el.onload=()=>{clearTimeout(timer);resolve()};el.onerror=()=>{clearTimeout(timer);el.remove();reject(new Error('Mission file failed: '+file))};document.head.appendChild(el);});}
 function load(key){if(!groups[key])return Promise.reject(new Error('Unknown mission: '+key));if(!pending.has(key))pending.set(key,(async()=>{for(const file of groups[key])await script(file);})().catch(error=>{pending.delete(key);throw error}));return pending.get(key);}
 const launch=BadFodderMissionLaunch.create({storage:BadFodderStorage.session,missions:BadFodderCampaign.missions,campaign:BadFodderCampaign,historicalMissions:BadFodderHistoricalMissions.missions});
 const ready=load(launch.current().map);
 function recover(error){
  console.error('Mission assets failed to load',error);document.getElementById('loading').classList.add('hidden');
  document.querySelector('[data-view="main"]').hidden=false;document.getElementById('menuScreen').hidden=false;
  const hint=document.createElement('p');hint.id='missionLoadError';hint.setAttribute('role','status');document.querySelector('[data-view="main"]').appendChild(hint);hint.textContent='MISSION LOAD FAILED. Choose a mission to retry.';
  function retry(mode,index,id){BadFodderStorage.session.removeItem('badfodder.launch.autostart.v1');BadFodderStorage.session.setItem('badfodder.launch.v1',JSON.stringify({mode,index,id}));location.reload();}
  document.getElementById('menuMissionSelect').onclick=()=>{document.querySelector('[data-view="main"]').hidden=true;document.querySelector('[data-view="missions"]').hidden=false;};
  document.getElementById('menuStart').onclick=()=>retry('campaign',null,null);
  document.getElementById('menuMissionBad').onclick=()=>retry('select',0,null);
  document.getElementById('menuMissionWigan').onclick=()=>retry('select',1,null);
  document.getElementById('menuHistoricalCable').onclick=()=>retry('historical',null,'cable-street-1936');
 }
 root.BadFodderMissionAssets={load,ready,recover,has:key=>Object.hasOwn(groups,key)};
})(window);
