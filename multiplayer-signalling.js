/* Firebase Spark-compatible signalling via REST. No SDK, game-state storage or relay. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.BadFodderCoopSignalling=api;})(typeof window!=='undefined'?window:globalThis,function(){
 'use strict';
 const TTL=15*60*1000,alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
 function roomCode(crypto=globalThis.crypto){const b=new Uint8Array(10);crypto.getRandomValues(b);return 'RABBIT-'+Array.from(b,n=>alphabet[n%32]).join('');}
 function validCode(code){return /^RABBIT-[A-HJ-NP-Z2-9]{10}$/.test(code);}
 function validRoom(room,now=Date.now()){return !!room&&typeof room.host==='string'&&Number.isFinite(room.created)&&Number.isFinite(room.expires)&&room.created<=now+10000&&room.expires>now&&room.expires-room.created<=TTL&&['bad-belzig','wigan'].includes(room.mission)&&room.offer?.type==='offer'&&typeof room.offer.sdp==='string'&&room.offer.sdp.length<50000;}
 function create({fetch:request=globalThis.fetch,now=Date.now,crypto=globalThis.crypto,config=null}={}){
  let settings=config,token=null,uid=null,code=null,host=false;
  async function json(url,options){const r=await request(url,{...options,signal:AbortSignal.timeout(12000)});const data=await r.json();if(!r.ok||data?.error)throw new Error('ROOM SERVICE UNAVAILABLE. Use manual connection.');return data;}
  async function initialise(){
   if(!settings){const custom=await request('multiplayer-config.json',{signal:AbortSignal.timeout(12000)}).then(r=>r.ok?r.json():{}).catch(()=>({}));settings=custom.databaseURL?custom:await json('/__/firebase/init.json');}
   if(!settings.apiKey||!/^https:\/\/[a-z0-9-]+\.(firebaseio\.com|[a-z0-9-]+\.firebasedatabase\.app)\/?$/.test(settings.databaseURL||''))throw new Error('ROOM SERVICE NOT CONFIGURED. Use manual connection.');
   const auth=await json('https://identitytoolkit.googleapis.com/v1/accounts:signUp?key='+encodeURIComponent(settings.apiKey),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({returnSecureToken:true})});token=auth.idToken;uid=auth.localId;if(!token||!uid)throw new Error('ROOM SERVICE UNAVAILABLE');
  }
  const url=(suffix='')=>settings.databaseURL.replace(/\/$/,'')+'/coopRooms/'+code+suffix+'.json?auth='+encodeURIComponent(token);
  async function put(suffix,value,method='PUT'){return json(url(suffix),{method,headers:{'Content-Type':'application/json'},body:JSON.stringify(value)});}
  async function read(next=code){if(!validCode(next))throw new Error('INVALID ROOM CODE');code=next;const room=await json(url());if(!validRoom(room,now()))throw new Error('ROOM EXPIRED OR NOT FOUND');return room;}
  async function createRoom(mission,offer){if(!token)await initialise();host=true;
   // Conditional create prevents even an improbable code collision overwriting another room.
   for(let attempt=0;attempt<3;attempt++){code=roomCode(crypto);const room={host:uid,mission,created:now(),expires:now()+TTL,offer};
    const r=await request(url(),{method:'PUT',headers:{'Content-Type':'application/json','if-match':'null_etag'},body:JSON.stringify(room),signal:AbortSignal.timeout(12000)});
    if(r.ok)return code;if(r.status!==412)throw new Error('ROOM SERVICE UNAVAILABLE. Use manual connection.');
   }throw new Error('COULD NOT CREATE ROOM');
  }
  async function joinRoom(next){if(!token)await initialise();const room=await read(next);if(room.joiner&&room.joiner!==uid)throw new Error('ROOM ALREADY FULL');await put('/joiner',uid);return room;}
  async function answer(sdp){await put('/answer',sdp);}
  async function cleanup(){if(!host||!code||!token)return;const target=url();code=null;try{await request(target,{method:'DELETE',keepalive:true,signal:AbortSignal.timeout(6000)});}catch{} }
  return {initialise,createRoom,joinRoom,read,answer,cleanup,get uid(){return uid}};
 }
 return {TTL,roomCode,validCode,validRoom,create};
});
