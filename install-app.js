/* Verified offline download and install UI, including installed-app updates. */
(function(root){
'use strict';
let deferred=null,registration=null,restarting=false;
const standalone=()=>!!navigator.standalone||!!root.matchMedia?.('(display-mode: standalone)').matches;
const nativeApp=()=>{try{return !!root.Capacitor?.isNativePlatform?.()||['android','ios'].includes(root.Capacitor?.getPlatform?.())}catch(_){return false}};
async function cleanupNativeOffline(){
  try{const regs=await navigator.serviceWorker?.getRegistrations?.();if(regs?.length)await Promise.all(regs.map(r=>r.unregister()))}catch(_){}
  try{if('caches' in root){const names=await caches.keys();await Promise.all(names.filter(n=>n.startsWith('if-i-can-shoot-rabbits-offline-')).map(n=>caches.delete(n)))}}catch(_){}
}
function ui(){
  const nav=document.querySelector('#menuScreen .menu-actions');if(!nav)return;
  if(!document.getElementById('menuInstall')){
    const button=document.createElement('button');button.id='menuInstall';button.type='button';button.className='menu-button';button.textContent='DOWNLOAD / INSTALL GAME';button.addEventListener('click',promptInstall);nav.appendChild(button);
    const note=document.createElement('small');note.id='offlineStatus';note.setAttribute('role','status');note.style.cssText='display:block;grid-column:1/-1;justify-self:center;text-align:center;max-width:36em;white-space:normal;line-height:1.4;font-size:11px;color:inherit';nav.appendChild(note);
  }
}
function render(value){
  ui();const button=document.getElementById('menuInstall'),note=document.getElementById('offlineStatus');if(!button||!note)return;
  root.BadFodderOfflineStatus=value;
  button.hidden=false;
  if(value.state==='downloading'){
    button.disabled=true;button.textContent='DOWNLOADING…';
    note.textContent=`Saving the full single-player game: ${value.completed} / ${value.total||'…'} files. Keep this window open.`;
  }else if(value.state==='ready'){
    button.disabled=false;
    button.textContent=registration?.waiting?'RESTART TO UPDATE':standalone()?'SAVED FOR OFFLINE PLAY':'INSTALL GAME';
    button.hidden=standalone()&&!registration?.waiting;
    note.textContent='Single player is ready offline. Saves stay on this device. Multiplayer requires internet.';
  }else{
    button.disabled=false;button.textContent='RETRY OFFLINE DOWNLOAD';
    note.textContent='Download incomplete. Reconnect and retry before playing offline.';
  }
}
function check(worker){worker?.postMessage({type:'GET_OFFLINE_STATUS'})}
function watch(worker){
  if(!worker)return;
  worker.addEventListener('statechange',()=>{
    if(worker.state==='installed'){check(worker);}
    if(worker.state==='redundant')render({state:'error'});
  });
  check(worker);
}
async function promptInstall(){
  if(registration?.waiting){restarting=true;registration.waiting.postMessage({type:'ACTIVATE_OFFLINE_UPDATE'});return}
  if(root.BadFodderOfflineStatus?.state!=='ready'){
    render({state:'downloading',completed:0,total:0});
    try{if(!registration){await register();return}await registration.update();watch(registration.installing);check(registration.active)}catch(_){render({state:'error'})}
    return;
  }
  try{await navigator.storage?.persist?.()}catch(_){}
  if(deferred){const prompt=deferred;deferred=null;await prompt.prompt();await prompt.userChoice;return}
  const note=document.getElementById('offlineStatus');
  if(note)note.textContent=/iPhone|iPad|iPod/i.test(navigator.userAgent)?'To install: Share → Add to Home Screen. Single player is saved offline.':/Mac/i.test(navigator.platform||'')?'To install: Chrome menu → Install app, or Safari File → Add to Dock. Single player is saved offline.':'To install: browser menu → Install app. Single player is saved offline.';
}
async function register(){
  ui();
  if(!('serviceWorker'in navigator)||(location.protocol!=='https:'&&!['localhost','127.0.0.1'].includes(location.hostname))){
    const note=document.getElementById('offlineStatus');if(note)note.textContent='Offline download needs HTTPS and a browser with service worker support.';return;
  }
  navigator.serviceWorker.addEventListener('message',event=>{
    if(event.data?.type!=='OFFLINE_STATUS')return;
    // A previous active worker must not overwrite a new download's progress.
    if(registration?.installing&&event.source===registration.active)return;
    if(registration?.waiting&&event.source===registration.active)return;
    render(event.data);
  });
  navigator.serviceWorker.addEventListener('controllerchange',()=>{if(restarting)location.reload();else check(navigator.serviceWorker.controller)});
  try{
    registration=await navigator.serviceWorker.register('service-worker.js',{scope:'./',updateViaCache:'none'});
    registration.addEventListener('updatefound',()=>{render({state:'downloading',completed:0,total:0});watch(registration.installing)});
    if(registration.installing){render({state:'downloading',completed:0,total:0});watch(registration.installing)}
    else check(registration.waiting||registration.active);
    root.addEventListener('online',()=>{if(root.BadFodderOfflineStatus?.state==='error')promptInstall()});
  }catch(error){render({state:'error'});console.warn('Offline download unavailable:',error)}
}
function install(){
  if(nativeApp()){void cleanupNativeOffline();return}
  ui();root.addEventListener('beforeinstallprompt',event=>{event.preventDefault();deferred=event});
  root.addEventListener('appinstalled',()=>{deferred=null;if(root.BadFodderOfflineStatus)render(root.BadFodderOfflineStatus)});
  if(document.readyState==='complete')register();else root.addEventListener('load',register,{once:true});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})(window);
