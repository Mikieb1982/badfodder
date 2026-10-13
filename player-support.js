/* Local player tools: Portable progress, contextual guidance and measured render quality. */
(function(root,factory){const api=factory(root);if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.BadFodderPlayerSupport=api;})(typeof window!=='undefined'?window:globalThis,root=>{
'use strict';
const KEYS=['badfodder.campaign.v1','badfodder.continuity.v1','badfodder.resistance.records.v1','badfodder.options.v1','badfodder.player-tools.v1'];
function validateBackup(text){
 if(typeof text!=='string'||text.length>1024*1024)throw Error('Backup is too large.');
 const value=JSON.parse(text),object=v=>v&&typeof v==='object'&&!Array.isArray(v);
 if(!object(value)||value.game!=='badfodder'||value.version!==1||!object(value.saves))throw Error('Choose a Bad Fodder version 1 backup.');
 const entries=Object.entries(value.saves);if(!entries.length)throw Error('Backup contains no progress.');
 for(const [key,raw] of entries){
  if(!KEYS.includes(key)||typeof raw!=='string')throw Error('Backup contains unsupported data.');
  const data=JSON.parse(raw);if(!object(data))throw Error('Invalid saved data.');
  if(key===KEYS[0]&&(data.campaignSchema!==2||typeof data.currentId!=='string'||typeof data.unlockedId!=='string'||!Array.isArray(data.completedIds)||data.completedIds.some(id=>typeof id!=='string')))throw Error('Invalid campaign progress.');
  if(key===KEYS[0]){const ids=root.BadFodderCampaign?.missions?.map(m=>m.id)||['bad-belzig','wigan','cable-street','barcelona-1936'];if(![data.currentId,data.unlockedId,...data.completedIds].every(id=>ids.includes(id)))throw Error('Backup refers to an unknown campaign mission.');}
  if(key===KEYS[1]&&(data.version!==1||!object(data.slots)||!Array.isArray(data.history)))throw Error('Invalid squad history.');
  if(key===KEYS[1]){
   const states=['FIT','WOUNDED','BADLY_WOUNDED','DOWN','DEAD'];
   for(const unit of Object.values(data.slots)){if(!object(unit)||typeof unit.name!=='string'||!states.includes(unit.health)||typeof unit.alive!=='boolean'||['experience','missions','rescues','timesDowned','stabilisations'].some(k=>unit[k]!==undefined&&(!Number.isFinite(unit[k])||unit[k]<0)))throw Error('Invalid saved fighter.');}
   if(data.history.length>10000||data.history.some(row=>!object(row)||Object.values(row).some(v=>typeof v==='number'&&!Number.isFinite(v))))throw Error('Invalid mission history.');
  }
  if(key===KEYS[4]&&(data.quality!==undefined&&!['auto','original','performance'].includes(data.quality)||data.hints!==undefined&&typeof data.hints!=='boolean'||data.tutorial!==undefined&&(!object(data.tutorial)||Object.values(data.tutorial).some(v=>typeof v!=='boolean'))))throw Error('Invalid player preferences.');
  if(key===KEYS[2]&&Object.entries(data).some(([map,record])=>!['bad-belzig','wigan','cable-street','barcelona'].includes(map)||!object(record)||['wave','score','kills'].some(k=>!Number.isSafeInteger(record[k])||record[k]<0)))throw Error('Invalid Resistance records.');
 }
 return value;
}
function exportBackup(store){const saves={};for(const key of KEYS){const raw=store.getItem(key);if(raw!==null)saves[key]=raw;}return JSON.stringify({game:'badfodder',version:1,createdAt:new Date().toISOString(),saves},null,2);}
function importBackup(store,text){const data=validateBackup(text);if(store.importItems)return store.importItems(Object.entries(data.saves));const old=new Map();try{for(const [key,value] of Object.entries(data.saves)){old.set(key,store.getItem(key));if(store.setItem(key,value)===false)throw Error('Device storage could not save the backup.');}}catch(error){for(const [key,value] of old){if(value===null)store.removeItem(key);else store.setItem(key,value);}throw error;}return Object.keys(data.saves).length;}
function createQuality(mode='auto'){
 const mobile=!!(root.navigator?.maxTouchPoints||0);
 let selected=['auto','original','performance'].includes(mode)?mode:'auto',scale=selected==='performance'?(mobile?.8:.75):1,samples=[],slow=0,fast=0,total=0,lastAverage=null,lastP95=null;
 return {get mode(){return selected},get scale(){return scale},setMode(value){if(!['auto','original','performance'].includes(value))return;selected=value;scale=value==='performance'?(mobile?.8:.75):1;samples=[];slow=fast=0;},sample(ms,active){if(!active||!Number.isFinite(ms)||ms<1||ms>120){samples=[];slow=fast=0;return false;}samples.push(ms);total++;if(samples.length<(mobile?60:180))return false;const average=samples.reduce((a,b)=>a+b,0)/samples.length;lastAverage=average;lastP95=[...samples].sort((a,b)=>a-b)[Math.floor(samples.length*.95)];samples=[];slow=average>(mobile?22:24)?slow+1:0;fast=average<(mobile?17:18)?fast+1:0;const previous=scale;if(selected==='auto'){if(mobile){/* Stable mobile backing resolution. */}else{if(slow>=2&&scale>.75){scale=.75;slow=fast=0;}else if(fast>=8&&scale<1){scale=1;slow=fast=0;}}}return scale!==previous;},report(){return {mode:selected,renderScale:scale,frames:total,averageFrameMs:lastAverage===null?null:Math.round(lastAverage*10)/10,p95FrameMs:lastP95===null?null:Math.round(lastP95*10)/10};}};
}
function createGuide(saved={}){let moved=!!saved.moved,fired=!!saved.fired,mapped=!!saved.mapped,elapsed=0;return{action(type){if(type==='move')moved=true;if(type==='fire')fired=true;if(type==='map')mapped=true;},snapshot(){return {moved,fired,mapped}},update(env,dt,touch=false){const squad=env.squad||[],unit=squad.find(u=>u?.selected&&u.alive&&!u.downed)||squad.find(u=>u?.alive&&!u.downed);if(!unit)return '';elapsed+=dt;
 if(squad.some(u=>u?.alive&&u.downed&&!u.stabilised))return touch?'Casualty: move close and use the context action to stabilise.':'Casualty: move close and press E to stabilise when safe.';
 if((unit.suppression||0)>.58)return 'Under pressure: take cover and regroup before advancing.';
 if(!moved)return touch?'Move with the joystick. Your companions will follow.':'Click open ground to move. Your companions will follow.';
 if(!fired&&env.actionAllowed?.('firearms')!==false&&(env.enemies||[]).some(e=>e.alive&&!e.surrendered&&!e.missionDormant&&Math.hypot(e.x-unit.x,e.y-unit.y)<250))return touch?'Contact: hold FIRE. Use cover to reduce incoming fire.':'Contact: aim and hold F or right-click. Use cover.';
 if(!mapped&&elapsed<45)return touch?'Tap MAP for your route. Tap squad portraits to select a fighter.':'M opens the map. 1–4 selects a fighter; R regroups companions.';
 return '';},reset(){elapsed=0;}};}
const store=()=>root.BadFodderStorage?.local||root.localStorage;
let preferences={};try{preferences=JSON.parse(store()?.getItem(KEYS[4])||'{}')||{};}catch{}
const quality=createQuality(preferences.quality),guide=createGuide(preferences.tutorial);let notice=null,lastUi=0,wasStarted=false,pendingBackup=null;
function savePreferences(){store()?.setItem(KEYS[4],JSON.stringify(preferences));}
function action(type){const before=JSON.stringify(guide.snapshot());guide.action(type);const after=guide.snapshot();if(before!==JSON.stringify(after)){preferences.tutorial=after;savePreferences();}}
function qualityChanged(){root.dispatchEvent?.(new Event('badfodder-quality'));}
function frame(ms,active,env){
 if(quality.sample(ms,active))qualityChanged();
 if(!root.document)return;
 if(!env.started&&wasStarted)guide.reset();wasStarted=!!env.started;
 if(!active){if(notice)notice.hidden=true;return;}
 lastUi+=ms;if(lastUi<200)return;const dt=lastUi/1000;lastUi=0;
 if(!notice){notice=root.document.createElement('div');notice.id='fieldGuide';notice.setAttribute('role','status');notice.style.cssText='position:absolute;bottom:82px;left:12px;max-width:min(350px,65%);padding:6px 9px;background:rgba(24,33,22,.86);color:#eee7d4;font:12px/1.4 system-ui;pointer-events:none;z-index:8;border-left:2px solid #c9bc8b';(root.document.querySelector('.viewport')||root.document.body).appendChild(notice);}
 const isOpening=env.missionKey==='bad-belzig'&&root.BadFodderCampaign?.state?.completed?.length===0&&!root.BadFodderArcade?.active?.();
 const text=preferences.hints===false||!isOpening?'':guide.update(env,dt,(root.navigator?.maxTouchPoints||0)>0);notice.hidden=!text;if(notice.textContent!==text)notice.textContent=text;
}
function mount(){
 const panel=root.document.querySelector('[data-view="options"]');if(!panel||root.document.getElementById('playerTools'))return;
 const tools=root.document.createElement('div');tools.id='playerTools';tools.innerHTML='<label class="menu-setting">RENDER QUALITY <select id="renderQuality"><option value="auto">Balanced</option><option value="original">Original</option><option value="performance">Performance</option></select></label><label class="menu-setting">CONTEXTUAL HINTS <input id="contextualHints" type="checkbox"></label><p id="saveStatus" class="menu-copy" role="status"></p><button id="exportProgress" class="menu-button" type="button">EXPORT PROGRESS</button><label class="menu-setting" style="display:block">CHOOSE PROGRESS BACKUP <input id="progressBackup" style="display:block;width:100%;max-width:100%;min-width:0;box-sizing:border-box;margin-top:8px;font-size:12px" type="file" accept=".json,application/json"></label><button id="restoreProgress" class="menu-button" type="button" disabled>RESTORE SELECTED BACKUP</button><p class="menu-copy">Progress includes completed campaign missions, squad history and Resistance records. Restoring replaces those saved entries and reloads the game. Local mission checkpoints are saved separately. Use RESUME SAVED GAME on the main menu.</p><button id="performanceReport" class="menu-button" type="button">DOWNLOAD PERFORMANCE REPORT</button>';
 panel.insertBefore(tools,panel.querySelector('[data-back]'));
 const $=id=>tools.querySelector('#'+id),status=$('saveStatus');
 $('renderQuality').value=quality.mode;$('renderQuality').onchange=e=>{quality.setMode(e.target.value);preferences.quality=quality.mode;savePreferences();qualityChanged();};
 $('contextualHints').checked=preferences.hints!==false;$('contextualHints').onchange=e=>{preferences.hints=e.target.checked;savePreferences();};
 function download(name,text){const url=URL.createObjectURL(new Blob([text],{type:'application/json'})),link=root.document.createElement('a');link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 $('exportProgress').onclick=()=>{try{download('badfodder-progress.json',exportBackup(store()));status.textContent='Progress backup downloaded.';}catch{status.textContent='Could not export progress.';}};
 $('progressBackup').onchange=async e=>{pendingBackup=null;$('restoreProgress').disabled=true;const file=e.target.files[0];if(!file)return;try{if(file.size>1024*1024)throw Error('Backup is too large.');const text=await file.text();validateBackup(text);pendingBackup=text;$('restoreProgress').disabled=false;status.textContent='Backup checked. Restore selected backup to replace local progress.';}catch(error){status.textContent=error.message;}};
 $('restoreProgress').onclick=()=>{try{importBackup(store(),pendingBackup);root.location.reload();}catch(error){status.textContent=error.message;}};
 $('performanceReport').onclick=()=>download('badfodder-performance.json',JSON.stringify({capturedAt:new Date().toISOString(),quality:quality.report(),runtime:root.BadFodderDiagnostics?.snapshot?.(),browser:root.navigator?.userAgent,viewport:[root.innerWidth,root.innerHeight],devicePixelRatio:root.devicePixelRatio},null,2));
 const observer=new MutationObserver(()=>{if(panel.hidden)return;const state=store()?.status;status.textContent=state?.persisted===false?'Progress is only in memory: device storage is unavailable. Export a backup before closing.':state?.savedAt?'Progress saved on this device. Last write: '+new Date(state.savedAt).toLocaleTimeString():'Progress is stored on this device.';});observer.observe(panel,{attributes:true,attributeFilter:['hidden']});
}
if(root.document){if(root.document.readyState==='loading')root.document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();}
return {KEYS,validateBackup,exportBackup,importBackup,createQuality,createGuide,quality,frame,action,resetGuide:()=>guide.reset()};
});
