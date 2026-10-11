'use strict';
const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const origin='https://game.test/';
function harness({release='one',storage=new Map(),active=null,fail=''}={}){
 const handlers={},messages=[],requests=[];let online=true,skipped=0,claimed=0;
 const caches={keys:async()=>[...storage.keys()],delete:async key=>storage.delete(key),open:async key=>{
  if(!storage.has(key))storage.set(key,new Map());const entries=storage.get(key);
  return {put:async(req,res)=>entries.set(new URL(typeof req==='string'?req:req.url,origin).href,res.clone()),match:async(req,options={})=>{const url=new URL(typeof req==='string'?req:req.url,origin);for(const [key,value]of entries){const candidate=new URL(key);if(options.ignoreSearch){url.search='';candidate.search=''}if(url.href===candidate.href)return value.clone()}}};
 },match:async(req,options)=>{for(const key of storage.keys()){const value=await(await caches.open(key)).match(req,options);if(value)return value}}};
 const assets=['./index.html','./mission.js','./movie.mp4','./music.mp3'];
 const fetch=async req=>{const url=new URL(typeof req==='string'?req:req.url,origin);requests.push(url.href);if(!online)throw Error('Disconnected');if(url.pathname==='/offline-assets.json')return new Response(JSON.stringify(assets));if(url.pathname===fail)return new Response('',{status:404});return new Response(url.pathname==='/movie.mp4'?'0123456789':url.pathname==='/index.html'?'HTML '+release:release,{headers:{'Content-Type':url.pathname.endsWith('.mp4')?'video/mp4':'text/plain'}})};
 const self={location:{origin:new URL(origin).origin,href:origin+'service-worker.js'},registration:{active},clients:{matchAll:async()=>[{postMessage:value=>messages.push({...value})}],claim:async()=>{claimed++}},skipWaiting:async()=>{skipped++},addEventListener:(name,fn)=>{handlers[name]=fn}};
 vm.runInNewContext(fs.readFileSync('service-worker.js','utf8').replace('__OFFLINE_RELEASE__',release),{self,caches,fetch,Response,Headers,URL});
 async function event(name,extra={}){let pending;handlers[name]({...extra,waitUntil:value=>{pending=value}});return pending}
 async function request(path,range,mode='cors'){let result;handlers.fetch({request:{url:new URL(path,origin).href,method:'GET',mode,headers:new Headers(range?{range}:{})},respondWith:value=>{result=value}});return result}
 return {storage,messages,requests,event,request,disconnect:()=>{online=false},get skipped(){return skipped},get claimed(){return claimed}};
}
(async()=>{
 const game=harness();await game.event('install');assert.equal(game.skipped,1);await game.event('activate');assert.equal(game.claimed,1);assert.equal(game.messages.at(-1).state,'ready');
 game.disconnect();const count=game.requests.length;
 assert.equal(await(await game.request('/?mission=wigan',null,'navigate')).text(),'HTML one');
 assert.equal(await(await game.request('/mission.js?v=1')).text(),'one');
 const media=await game.request('/movie.mp4','bytes=2-5');assert.equal(media.status,206);assert.equal(media.headers.get('content-range'),'bytes 2-5/10');assert.equal(await media.text(),'2345');
 assert.equal(await(await game.request('/movie.mp4','bytes=-3')).text(),'789');assert.equal(await(await game.request('/movie.mp4','bytes=7-')).text(),'789');assert.equal((await game.request('/movie.mp4','bytes=99-')).status,416);
 assert.equal(await(await game.request('/music.mp3')).text(),'one');assert.equal(game.requests.length,count,'Installed game must not depend on network');
 assert.equal(await game.request('/__/firebase/init.json'),undefined,'Firebase endpoints must bypass cache');
 assert.equal(await game.request('/multiplayer-config.json'),undefined,'Multiplayer configuration must stay network-only so installed clients see current room services');
 assert.equal((await game.request('/missing.js')).status,503);
 const update=harness({release:'two',storage:game.storage,active:{},fail:'/mission.js'});
 await assert.rejects(update.event('install'),/Could not download/);assert.equal(update.skipped,0);assert.equal(update.messages.find(m=>m.state==='error')?.state,'error');
 const broken=game.storage.get('if-i-can-shoot-rabbits-offline-two');assert(!broken.has(origin+'__offline-ready__'),'Incomplete downloads cannot claim readiness');
 assert(game.storage.get('if-i-can-shoot-rabbits-offline-one').has(origin+'__offline-ready__'),'Failed update must preserve installed release');
 const retry=harness({release:'two',storage:game.storage,active:{}});await retry.event('install');assert.equal(retry.skipped,0,'Update waits for restart');await retry.event('message',{data:{type:'ACTIVATE_OFFLINE_UPDATE'}});assert.equal(retry.skipped,1);await retry.event('activate');retry.disconnect();assert.equal(await(await retry.request('/',null,'navigate')).text(),'HTML two');
 console.log('PASS: complete offline download, cold launch, query URLs, media ranges, network isolation, failed-update preservation and retry.');
})().catch(error=>{console.error(error);process.exitCode=1});
