/* Complete, versioned offline game. Multiplayer traffic remains network-only. */
'use strict';
const RELEASE='__OFFLINE_RELEASE__'; // Replaced by the production build.
const CACHE_NAME='if-i-can-shoot-rabbits-offline-'+RELEASE;
const READY_URL=new URL('./__offline-ready__',self.location.href).href;
const unavailable=()=>new Response('',{status:503,statusText:'Offline'});
let download=null;
let progress={type:'OFFLINE_STATUS',release:RELEASE,state:'downloading',completed:0,total:0};
async function publish(value){
  progress={...progress,...value};
  for(const client of await self.clients.matchAll({includeUncontrolled:true}))client.postMessage(progress);
}
async function status(){
  const cache=await caches.open(CACHE_NAME),ready=await cache.match(READY_URL);
  return ready?await ready.json():progress;
}
function fillOfflineCache(){
  if(download)return download;
  download=(async()=>{
    const cache=await caches.open(CACHE_NAME);
    if(await cache.match(READY_URL))return publish(await status());
    try{
      const response=await fetch('./offline-assets.json',{cache:'no-store'});
      if(!response.ok)throw new Error('Download list unavailable');
      const urls=await response.json();
      if(!Array.isArray(urls)||!urls.includes('./index.html')||!urls.length)throw new Error('Invalid download list');
      await publish({state:'downloading',completed:0,total:urls.length});
      for(let i=0;i<urls.length;i+=6){
        await Promise.all(urls.slice(i,i+6).map(async url=>{
          const absolute=new URL(url,self.location.href);
          if(absolute.origin!==self.location.origin)throw new Error('Invalid asset origin');
          if(!await cache.match(absolute.href)){
            const asset=await fetch(absolute.href,{cache:'reload'});
            if(!asset.ok||asset.status===206)throw new Error('Could not download '+url);
            await cache.put(absolute.href,asset);
          }
          await publish({completed:progress.completed+1});
        }));
      }
      // Publish readiness only after every file, including full media bodies, is stored.
      const ready={...progress,state:'ready'};
      await cache.put(READY_URL,new Response(JSON.stringify(ready),{headers:{'Content-Type':'application/json'}}));
      await publish(ready);
      return true;
    }catch(error){
      await publish({state:'error',error:error.message});
      throw error;
    }
  })().finally(()=>{download=null});
  return download;
}
self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    await fillOfflineCache();
    // Updates wait for an explicit restart; an in-progress mission keeps its release.
    if(!self.registration.active)await self.skipWaiting();
  })());
});
self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    // Keep the previous complete release for other tabs still using its static URLs.
    const names=(await caches.keys()).filter(n=>n.startsWith('if-i-can-shoot-rabbits-')&&n!==CACHE_NAME);
    let previous=null;
    for(const name of [...names].reverse()){
      if(await(await caches.open(name)).match(READY_URL)||/offline-v\d+$/.test(name)){previous=name;break}
    }
    await Promise.all(names.filter(name=>name!==previous).map(name=>caches.delete(name)));
    await self.clients.claim();
    await publish(await status());
  })());
});
self.addEventListener('message',event=>{
  if(event.data?.type==='GET_OFFLINE_STATUS'||event.data?.type==='REFRESH_OFFLINE'){
    event.waitUntil(status().then(value=>{event.ports?.[0]?.postMessage(value);event.source?.postMessage(value)}));
  }
  if(event.data?.type==='ACTIVATE_OFFLINE_UPDATE')event.waitUntil(self.skipWaiting());
});
async function cachedResponse(request){
  const cache=await caches.open(CACHE_NAME);
  const url=new URL(request.url);
  if(request.mode==='navigate'&&(url.pathname===new URL('./',self.location.href).pathname||url.pathname.endsWith('/index.html'))){
    return cache.match(new URL('./index.html',self.location.href).href);
  }
  return (await cache.match(request,{ignoreSearch:true}))||(url.pathname.includes('/static/')?await caches.match(request,{ignoreSearch:true}):null);
}
async function rangedResponse(request,response){
  const body=await response.arrayBuffer(),size=body.byteLength;
  const match=/^bytes=(\d*)-(\d*)$/.exec(request.headers.get('range')||'');
  let start=0,end=size-1;
  if(match&&(match[1]||match[2])){
    if(match[1]){start=Number(match[1]);if(match[2])end=Math.min(Number(match[2]),end)}
    else start=Math.max(0,size-Number(match[2]));
  }else start=size;
  const headers=new Headers(response.headers);headers.delete('Content-Encoding');headers.set('Accept-Ranges','bytes');
  if(start>=size||start>end||!size){headers.set('Content-Range','bytes */'+size);return new Response(null,{status:416,headers})}
  headers.set('Content-Range',`bytes ${start}-${end}/${size}`);
  headers.set('Content-Length',String(end-start+1));
  return new Response(body.slice(start,end+1),{status:206,statusText:'Partial Content',headers});
}
self.addEventListener('fetch',event=>{
  const request=event.request,url=new URL(request.url);
  if(request.method!=='GET'||url.origin!==self.location.origin||url.pathname.startsWith('/__/')||url.href===new URL('./multiplayer-config.json',self.location.href).href)return;
  event.respondWith((async()=>{
    const cached=await cachedResponse(request);
    if(cached)return request.headers.has('range')?rangedResponse(request,cached):cached;
    // Never cache partial media or API responses. The installed release is immutable.
    try{return await fetch(request)}catch(_){return unavailable()}
  })());
});
