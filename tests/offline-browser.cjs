'use strict';
// Production-only test: install online, close the browser, then cold-start offline.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),os=require('node:os');
const browsers=require(process.env.BADFODDER_PLAYWRIGHT||'playwright');
const root=path.resolve(__dirname,'../dist'),engine=process.env.BADFODDER_BROWSER||'chromium';
const output=path.resolve('test-results/offline-'+engine);fs.mkdirSync(output,{recursive:true});
const profile=fs.mkdtempSync(path.join(os.tmpdir(),'rabbits-offline-'));
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.webp':'image/webp','.mp3':'audio/mpeg','.mp4':'video/mp4','.webm':'audio/webm','.json':'application/json','.webmanifest':'application/manifest+json','.ico':'image/x-icon'};
const injection="window.__offlineTest=()=>({started,menuOpen,faults:runtimeFaultCount,map:MAP_DATA.key,actors:squad.length});";
let context,online=true,serverHits=0;
const server=http.createServer((req,res)=>{
 if(!online){res.destroy();return}serverHits++;
 try{
  const name=new URL(req.url,'http://local').pathname,file=path.resolve(root,'.'+(name==='/'?'/index.html':decodeURIComponent(name)));
  if(!file.startsWith(root+path.sep))throw Error('path');
  let data=fs.readFileSync(file);if(file.endsWith('index.html'))data=Buffer.from(data.toString().replace('  // BOOT_MISSION:',injection+'\n  // BOOT_MISSION:'));
  res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.end(data);
 }catch{res.writeHead(404);res.end()}
});
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const url='http://127.0.0.1:'+server.address().port;
 const options={headless:true,viewport:{width:915,height:412},hasTouch:true,...(engine==='chromium'&&process.env.BADFODDER_CHROMIUM_EXECUTABLE?{executablePath:process.env.BADFODDER_CHROMIUM_EXECUTABLE}:{})};
 context=await browsers[engine].launchPersistentContext(profile,options);
 let page=await context.newPage();await page.goto(url);
 await page.waitForFunction(()=>window.BadFodderOfflineStatus?.state==='ready'&&!!navigator.serviceWorker.controller,{},{timeout:120000});
 const expected=JSON.parse(fs.readFileSync(path.join(root,'offline-assets.json'),'utf8'));
 const cached=await page.evaluate(async()=>{const names=await caches.keys(),cache=await caches.open(names.find(n=>n.includes('offline-')));return(await cache.keys()).map(r=>new URL(r.url).pathname)});
 for(const asset of expected)assert(cached.includes(new URL(asset,url+'/').pathname),'Missing offline asset: '+asset);
 await page.evaluate(()=>localStorage.setItem('offline-save-probe','saved'));
 await page.screenshot({path:path.join(output,'download-ready.png')});
 await context.close();context=null;
 // Reopen the persisted app with no usable server or network.
 online=false;const hits=serverHits;
 context=await browsers[engine].launchPersistentContext(profile,options);
 if(engine==='webkit'){
  // Playwright #42775: WebKit's offline emulation kills even synthetic SW
  // responses. Shut down the origin and block uncached requests instead.
  await context.route('**/*',route=>route.abort());
  await context.addInitScript(()=>Object.defineProperty(navigator,'onLine',{get:()=>false}));
 }else await context.setOffline(true);
 page=await context.newPage();const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto(url+'/?seed=offline-cold-start',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>!!window.__offlineTest);
 assert.equal(await page.evaluate(()=>localStorage.getItem('offline-save-probe')),'saved');
 const skip=page.locator('[data-presentation-skip]');if(await skip.isVisible())await skip.click();
 // Campaign intro must play from cached MP4 before the mission briefing.
 await page.locator('#menuStart').click();
 await page.waitForFunction(()=>{const v=document.querySelector('#campaignIntro video');return !!v&&!v.paused&&v.currentTime>0},{},{timeout:30000});
 await page.screenshot({path:path.join(output,'offline-campaign-intro.png')});
 await page.locator('#campaignIntro button').last().click();
 await page.locator('#briefingBegin').waitFor();await page.locator('#briefingBack').click();
 for(const [key,button]of [['bad-belzig','#menuMissionBad'],['wigan','#menuMissionWigan'],['cable-street','#menuHistoricalCable'],['barcelona','#menuMissionBarcelona']]){
  await page.goto(url+'/?seed=offline-'+key,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>!!window.__offlineTest);if(await skip.isVisible())await skip.click();
  await page.locator('#menuMissionSelect').click();await page.locator(button).click();await page.locator('#briefingBegin').click();
  await page.waitForFunction(key=>{const s=window.__offlineTest?.();return s?.started&&!s.menuOpen&&s.map===key&&s.actors>0},key,{timeout:60000});
  await page.waitForTimeout(500);assert.equal((await page.evaluate(()=>window.__offlineTest())).faults,0);
  await page.screenshot({path:path.join(output,'offline-'+key+'.png')});
 }
 const media=await page.evaluate(async()=>{
  const paths=['assets/menu/rabbitscampaign.mp4','assets/audio/mission.mp3'],results=[];
  for(const path of paths){const r=await fetch(window.BadFodderAssetUrl(path),{headers:{Range:'bytes=0-127'}});results.push({status:r.status,size:(await r.arrayBuffer()).byteLength,range:r.headers.get('Content-Range')})}return results;
 });
 for(const value of media){assert.equal(value.status,206);assert.equal(value.size,128);assert(value.range.startsWith('bytes 0-127/'))}
 await page.goto(url,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>!!window.__offlineTest);if(await skip.isVisible())await skip.click();
 await page.locator('#menuMultiplayer').click();assert((await page.locator('#offlineStatus').textContent()).includes('requires internet'));
 assert.equal(serverHits,hits,'Offline launch must make no server requests');assert.deepEqual(errors,[]);
 console.log('PASS: '+engine+' persisted offline cold start, all four missions, campaign video, audio/video ranges, local saves and online-only multiplayer message.');
})().catch(async error=>{if(context)for(const [i,page]of context.pages().entries())await page.screenshot({path:path.join(output,'failure-'+i+'.png')}).catch(()=>{});console.error(error);process.exitCode=1}).finally(async()=>{await context?.close();await new Promise(resolve=>server.close(resolve));fs.rmSync(profile,{recursive:true,force:true})});
