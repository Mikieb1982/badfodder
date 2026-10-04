/* Firebase Spark-compatible signalling via REST. No SDK, Auth, game-state storage or relay. */
(function(root,factory){const api=factory(root);if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.BadFodderCoopSignalling=api;})(typeof window!=='undefined'?window:globalThis,function(root){
 'use strict';
 const TTL=15*60*1000,alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
 function randomId(crypto=root.crypto,count=12){const b=new Uint8Array(count);crypto.getRandomValues(b);return Array.from(b,n=>alphabet[n%32]).join('');}
 function roomCode(crypto=root.crypto){return 'RABBIT-'+randomId(crypto,10);}
 function validCode(code){return /^RABBIT-[A-HJ-NP-Z2-9]{10}$/.test(code);}
 function validDescription(value,type){return !!value&&Object.keys(value).every(k=>['type','sdp'].includes(k))&&value.type===type&&typeof value.sdp==='string'&&value.sdp.length>0&&value.sdp.length<50000;}
 function validRoom(room,now=Date.now()){return !!room&&Object.keys(room).every(k=>['host','mission','created','expires','offer','joiner','answer'].includes(k))&&typeof room.host==='string'&&room.host.length>=8&&room.host.length<=64&&Number.isFinite(room.created)&&Number.isFinite(room.expires)&&room.created<=now+10000&&room.expires>now&&room.expires>room.created&&room.expires-room.created<=TTL&&['bad-belzig','wigan'].includes(room.mission)&&validDescription(room.offer,'offer')&&(!room.joiner||typeof room.joiner==='string'&&room.joiner.length>=8&&room.joiner.length<=64)&&(!room.answer||!!room.joiner&&validDescription(room.answer,'answer'));}
 function inviteUrl(code,href=root.location?.href||'https://bad-fodder.web.app/'){
  code=String(code||'').toUpperCase().trim();if(!validCode(code))return'';
  const url=new URL('join.html',href);url.search='?room='+encodeURIComponent(code);url.hash='';return url.href;
 }
 async function copyText(text){
  if(root.navigator?.clipboard?.writeText){try{await root.navigator.clipboard.writeText(text);return true}catch(_){}}
  if(!root.document)return false;const area=root.document.createElement('textarea');area.value=text;area.setAttribute('readonly','');area.style.cssText='position:fixed;left:-9999px;top:-9999px';root.document.body.appendChild(area);area.select();let ok=false;try{ok=root.document.execCommand('copy')}catch(_){}area.remove();return ok;
 }
 function installInviteUi(){
  if(!root.document||!root.MutationObserver)return;
  function attach(panel){
   if(!panel||panel.dataset.inviteUi==='1')return;panel.dataset.inviteUi='1';
   const roomInput=panel.querySelector('#coopRoom'),status=panel.querySelector('#coopStatus');if(!roomInput||!status)return;
   const box=root.document.createElement('section');box.id='coopInvite';box.hidden=true;box.style.cssText='width:min(520px,94vw);padding:10px;text-align:center;background:#20291fe8;border:1px solid #6f7652';
   box.innerHTML='<strong style="display:block;margin-bottom:7px;letter-spacing:.08em">INVITE PLAYER</strong><input id="coopInviteLink" readonly aria-label="Multiplayer invite link" style="width:100%;max-width:470px;padding:8px;box-sizing:border-box;background:#151d16;color:#efe2b0;border:1px solid #66704d"><div style="display:flex;justify-content:center;gap:8px;flex-wrap:wrap;margin-top:8px"><button id="coopCopyInvite" class="menu-button" type="button">COPY INVITE LINK</button><button id="coopShareInvite" class="menu-button" type="button">SHARE INVITE</button></div><small style="display:block;margin-top:7px;color:#bfc6a2">Send this link to Player 2. The room code still works as a fallback.</small>';
   const label=roomInput.closest('label');(label||status).insertAdjacentElement('afterend',box);
   const link=box.querySelector('#coopInviteLink'),copy=box.querySelector('#coopCopyInvite'),share=box.querySelector('#coopShareInvite');
   const flash=(button,text)=>{const old=button.textContent;button.textContent=text;setTimeout(()=>{button.textContent=old},1400)};
   copy.onclick=async()=>{if(link.value&&await copyText(link.value))flash(copy,'LINK COPIED');else flash(copy,'COPY FAILED')};
   share.onclick=async()=>{if(!link.value)return;try{if(root.navigator?.share){await root.navigator.share({title:'If I Can Shoot Rabbits',text:'Join my Bad Fodder co-op game.',url:link.value});return}}catch(e){if(e?.name==='AbortError')return}if(await copyText(link.value))flash(share,'LINK COPIED');else flash(share,'COPY FAILED')};
   function refresh(){
    const code=roomInput.value.toUpperCase().trim(),text=status.textContent||'',waiting=/WAITING FOR PLAYER 2/.test(text);
    if(waiting&&validCode(code)){box.dataset.active='1';link.value=inviteUrl(code,root.location?.href);}
    box.hidden=!(box.dataset.active==='1'&&validCode(code));
    let invited='';try{invited=root.BadFodderStorage?.session?.getItem('badfodder.coop.invite')||''}catch(_){}
    if(invited&&/ROOM EXPIRED OR NOT FOUND|INVALID ROOM CODE/.test(text)){
      status.textContent='THIS GAME INVITE HAS EXPIRED OR IS NO LONGER AVAILABLE.';
      const manual=panel.querySelector('#coopManualFields');if(manual)manual.hidden=true;
      try{root.BadFodderStorage?.session?.removeItem('badfodder.coop.invite')}catch(_){}
    }else if(invited&&/CONNECTED|STARTING MISSION/.test(text)){try{root.BadFodderStorage?.session?.removeItem('badfodder.coop.invite')}catch(_){}}
   }
   roomInput.addEventListener('input',refresh);new root.MutationObserver(refresh).observe(status,{childList:true,subtree:true,characterData:true});refresh();
  }
  const scan=()=>attach(root.document.querySelector('#coopPanel'));scan();new root.MutationObserver(scan).observe(root.document.documentElement,{childList:true,subtree:true});
 }
 function create({fetch:request=root.fetch,now=Date.now,crypto=root.crypto,config=null,storage=root.BadFodderStorage?.local,schedule=root.setTimeout,cancel=root.clearTimeout}={}){
  let settings=config,uid=null,code=null,host=false,expiryTimer=null;
  const PENDING='badfodder.coop.cleanup.v1';
  function pending(){try{return JSON.parse(storage?.getItem(PENDING)||'[]').filter(r=>validCode(r.code)&&Number.isFinite(r.expires)).slice(-32)}catch{return []}}
  function remember(entry,remove=false){try{const list=pending().filter(r=>r.code!==entry.code);if(!remove)list.push(entry);storage?.setItem(PENDING,JSON.stringify(list.slice(-32)))}catch{}}
  function roomUrl(next){return settings.databaseURL.replace(/\/$/,'')+'/coopRooms/'+next+'.json';}
  async function deleteRoom(next){const r=await timedRequest(roomUrl(next),{method:'DELETE',keepalive:true},6000);if(!r.ok)throw new Error('ROOM CLEANUP FAILED');remember({code:next},true);}
  async function sweep(){for(const r of pending()){if(r.expires<=now())try{await deleteRoom(r.code)}catch{}}}
  async function timedRequest(url,options={},ms=12000){
   const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),ms);timer?.unref?.();
   try{return await request(url,{...options,signal:controller.signal})}finally{clearTimeout(timer)}
  }
  async function json(url,options){const r=await timedRequest(url,options);const data=await r.json();if(!r.ok||data?.error)throw new Error('ROOM SERVICE UNAVAILABLE. Use manual connection.');return data;}
  async function initialise(){
   if(!settings){const custom=await timedRequest('multiplayer-config.json',{cache:'no-store'}).then(r=>r.ok?r.json():{}).catch(()=>({}));settings=custom.databaseURL?custom:await json('/__/firebase/init.json');}
   if(!/^https:\/\/[a-z0-9-]+\.(firebaseio\.com|[a-z0-9-]+\.firebasedatabase\.app)\/?$/.test(settings.databaseURL||''))throw new Error('ROOM SERVICE NOT CONFIGURED. Use manual connection.');
   if(!uid)uid=randomId(crypto,12);await sweep();return true;
  }
  const url=(suffix='')=>settings.databaseURL.replace(/\/$/,'')+'/coopRooms/'+code+suffix+'.json';
  async function put(suffix,value,method='PUT'){return json(url(suffix),{method,headers:{'Content-Type':'application/json'},body:JSON.stringify(value)});}
  async function read(next=code){if(!uid)await initialise();if(!validCode(next))throw new Error('INVALID ROOM CODE');code=next;const room=await json(url());if(!validRoom(room,now()))throw new Error('ROOM EXPIRED OR NOT FOUND');return room;}
  async function createRoom(mission,offer){if(!['bad-belzig','wigan'].includes(mission)||!validDescription(offer,'offer'))throw new Error('INVALID ROOM');if(code&&host)await cleanup();if(!uid)await initialise();host=false;
   // The database rules reject overwriting a live room, so no custom If-Match header is needed.
   // Avoiding that header keeps creation compatible with mobile browser CORS/preflight behaviour.
   for(let attempt=0;attempt<3;attempt++){
    code=roomCode(crypto);const created=now(),room={host:uid,mission,created,expires:created+TTL,offer};
    const r=await timedRequest(url(),{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(room)});
    if(r.ok){host=true;remember({code,expires:room.expires});if(schedule){expiryTimer=schedule(()=>{void cleanup()},TTL);expiryTimer?.unref?.();}return code;}
    // A denied write can only be an extremely unlikely live-room collision under the deployed rules.
    if(r.status===401||r.status===403)continue;
    throw new Error('ROOM SERVICE UNAVAILABLE. Use manual connection.');
   }
   throw new Error('COULD NOT CREATE ROOM');
  }
  async function joinRoom(next){if(!uid)await initialise();const room=await read(next);if(room.joiner&&room.joiner!==uid)throw new Error('ROOM ALREADY FULL');if(!room.joiner)await put('/joiner',uid);return room;}
  async function answer(sdp){if(!validDescription(sdp,'answer'))throw new Error('INVALID ANSWER');await put('/answer',sdp);}
  async function cleanup(){if(expiryTimer!==null)cancel?.(expiryTimer);expiryTimer=null;if(!host||!code||!uid)return;const next=code;try{await deleteRoom(next);if(code===next)code=null;}catch{} }
  return {initialise,createRoom,joinRoom,read,answer,cleanup,sweep,get uid(){return uid}};
 }
 if(root.document)installInviteUi();
 return {TTL,roomCode,validCode,validRoom,validDescription,inviteUrl,create};
});
