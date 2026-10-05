/* Installable PWA bootstrap for Chromebook, Windows and macOS browsers. */
(function(root){
'use strict';
let deferred=null;
function standalone(){return !!navigator.standalone||!!root.matchMedia?.('(display-mode: standalone)').matches}
function hide(){const b=document.getElementById('menuInstall');if(b)b.hidden=true}
function help(){const el=document.getElementById('menuHelp');if(!el)return;el.textContent=/Mac/i.test(navigator.platform||'')?'INSTALL: CHROME MENU → INSTALL APP, OR SAFARI FILE → ADD TO DOCK':'INSTALL: OPEN THE BROWSER MENU AND CHOOSE INSTALL APP'}
async function promptInstall(){if(standalone())return hide();if(!deferred){help();return}const p=deferred;deferred=null;await p.prompt();try{if((await p.userChoice)?.outcome==='accepted')hide()}catch(_){ }}
function button(){if(standalone())return hide();const nav=document.querySelector('#menuScreen .menu-actions');if(!nav||document.getElementById('menuInstall'))return;const b=document.createElement('button');b.id='menuInstall';b.type='button';b.className='menu-button';b.textContent='INSTALL GAME';b.addEventListener('click',promptInstall);nav.insertBefore(b,document.getElementById('menuViewBriefing')||null)}
async function register(){if(!('serviceWorker'in navigator))return;if(location.protocol!=='https:'&&!['localhost','127.0.0.1'].includes(location.hostname))return;try{const reg=await navigator.serviceWorker.register('service-worker.js',{scope:'./'});const ready=await navigator.serviceWorker.ready;(ready.active||reg.active)?.postMessage({type:'REFRESH_OFFLINE'})}catch(error){console.warn('Offline app setup unavailable:',error)}}
function install(){button();root.addEventListener('beforeinstallprompt',event=>{event.preventDefault();deferred=event;button()});root.addEventListener('appinstalled',()=>{deferred=null;hide()});root.addEventListener('load',register,{once:true})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})(window);
