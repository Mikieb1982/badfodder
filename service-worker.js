/* Offline application shell for If I Can Shoot Rabbits. */
'use strict';

const CACHE_NAME='if-i-can-shoot-rabbits-offline-v3';
const SHELL=['./','./index.html','./manifest.webmanifest'];
const unavailable=()=>new Response('',{status:503,statusText:'Offline'});

async function cacheOne(cache,url){
  try{await cache.add(url);return true}catch(_){return false}
}

async function fillOfflineCache(){
  const cache=await caches.open(CACHE_NAME);
  await Promise.all(SHELL.map(url=>cacheOne(cache,url)));
  try{
    const response=await fetch('./offline-assets.json',{cache:'no-store'});
    if(!response.ok)return false;
    const urls=await response.json();
    if(!Array.isArray(urls))return false;
    // Keep installation resilient: one optional asset must not break the whole app.
    for(let i=0;i<urls.length;i+=12){
      await Promise.all(urls.slice(i,i+12).map(url=>cacheOne(cache,url)));
    }
    return true;
  }catch(_){return false}
}

self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    await fillOfflineCache();
    await self.skipWaiting();
  })());
});

self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const names=await caches.keys();
    await Promise.all(names.filter(name=>name.startsWith('if-i-can-shoot-rabbits-')&&name!==CACHE_NAME).map(name=>caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener('message',event=>{
  if(event.data?.type==='REFRESH_OFFLINE')event.waitUntil(fillOfflineCache());
});

async function networkFirst(request){
  const cache=await caches.open(CACHE_NAME);
  try{
    const response=await fetch(request);
    if(response&&response.ok)await cache.put(request,response.clone());
    return response;
  }catch(_){
    return (await cache.match(request))||(await cache.match('./index.html'))||unavailable();
  }
}

async function cacheFirst(request){
  const cache=await caches.open(CACHE_NAME);
  const cached=await cache.match(request,{ignoreSearch:true});
  if(cached)return cached;
  try{
    const response=await fetch(request);
    if(response&&response.ok)await cache.put(request,response.clone());
    return response;
  }catch(_){return unavailable()}
}

async function rangeResponse(request){
  const cache=await caches.open(CACHE_NAME);
  const cached=await cache.match(request,{ignoreSearch:true});
  if(!cached){
    // Preserve the browser's native range handling while online.
    try{return await fetch(request)}catch(_){return unavailable()}
  }
  const range=request.headers.get('range')||'';
  const match=/^bytes=(\d*)-(\d*)$/i.exec(range.trim());
  if(!match)return cached;
  const bytes=await cached.arrayBuffer(),size=bytes.byteLength;
  let start,end;
  if(!match[1]&&match[2]){
    const suffix=Number(match[2]);
    if(!Number.isFinite(suffix)||suffix<=0)return new Response(null,{status:416,headers:{'Content-Range':`bytes */${size}`}});
    start=Math.max(0,size-suffix);end=size-1;
  }else{
    start=Number(match[1]);
    end=match[2]?Math.min(Number(match[2]),size-1):size-1;
  }
  if(!Number.isFinite(start)||!Number.isFinite(end)||start<0||start>=size||end<start){
    return new Response(null,{status:416,headers:{'Content-Range':`bytes */${size}`}});
  }
  const headers=new Headers(cached.headers);
  headers.set('Content-Range',`bytes ${start}-${end}/${size}`);
  headers.set('Accept-Ranges','bytes');
  headers.set('Content-Length',String(end-start+1));
  return new Response(bytes.slice(start,end+1),{status:206,statusText:'Partial Content',headers});
}

async function staleWhileRevalidate(request){
  const cache=await caches.open(CACHE_NAME);
  const cached=await cache.match(request,{ignoreSearch:true});
  const update=fetch(request).then(response=>{
    if(response&&response.ok)cache.put(request,response.clone());
    return response;
  }).catch(()=>null);
  return cached||(await update)||unavailable();
}

self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET')return;
  const url=new URL(request.url);
  if(url.origin!==self.location.origin)return;
  if(request.mode==='navigate'){
    event.respondWith(networkFirst(request));
    return;
  }
  // Firefox and Safari request audio in byte ranges. Serve those ranges from the
  // already-cached full file so installed/offline playback behaves like HTTP.
  if(request.headers.has('range')){
    event.respondWith(rangeResponse(request));
    return;
  }
  if(url.pathname.includes('/static/')){
    event.respondWith(cacheFirst(request));
    return;
  }
  event.respondWith(staleWhileRevalidate(request));
});
