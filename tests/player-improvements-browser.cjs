'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'../dist'),output=path.resolve('test-results/player-improvements');fs.mkdirSync(output,{recursive:true});
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.webp':'image/webp','.mp3':'audio/mpeg','.mp4':'video/mp4','.webm':'audio/webm','.json':'application/json','.webmanifest':'application/manifest+json','.ico':'image/x-icon'};
const injection='window.__playerTest={state:()=>({started,menuOpen,mapOpen,faults:runtimeFaultCount,map:MAP_DATA.key}),down:()=>BadFodderHealth.down(squad[2])};';
const server=http.createServer((req,res)=>{try{const name=new URL(req.url,'http://local').pathname,file=path.resolve(root,'.'+(name==='/'?'/index.html':decodeURIComponent(name)));if(!file.startsWith(root+path.sep))throw Error('path');let data=fs.readFileSync(file);if(file.endsWith('index.html'))data=Buffer.from(data.toString().replace('  // BOOT_MISSION:',injection+'\n  // BOOT_MISSION:'));res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.end(data);}catch{res.writeHead(404);res.end();}});
function reviewImage(name,bytes){const data=bytes.toString('base64');for(let i=0;i<data.length;i+=8000)console.log('REVIEW_IMAGE '+name+' '+Math.floor(i/8000)+' '+data.slice(i,i+8000));}
let browser;
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const url='http://127.0.0.1:'+server.address().port;browser=await chromium.launch({headless:true});
 for(const device of [{name:'desktop',width:1365,height:768,touch:false},{name:'touch-landscape',width:915,height:412,touch:true},{name:'touch-portrait',width:412,height:915,touch:true}]){
  const context=await browser.newContext({viewport:{width:device.width,height:device.height},hasTouch:device.touch,serviceWorkers:'block'}),page=await context.newPage(),errors=[],remote=[];
  page.on('pageerror',error=>errors.push(error.message));page.on('request',request=>{if(/firebase|googleapis|gstatic/.test(request.url()))remote.push(request.url());});
  try{
   await page.goto(url);await page.waitForFunction(()=>!!window.__playerTest,{},{timeout:120000});const skip=page.locator('[data-presentation-skip]');if(await skip.isVisible())await skip.click();
   await page.locator('#menuOptions').click();await page.locator('#renderQuality').selectOption('original');const originalWidth=await page.locator('#game').evaluate(canvas=>canvas.width);await page.locator('#renderQuality').selectOption('performance');assert(Math.abs(await page.locator('#game').evaluate(canvas=>canvas.width)-originalWidth*.75)<=1,'Performance scales the actual render surface');assert.equal(await page.evaluate(()=>BadFodderPlayerSupport.quality.scale),.75);
   await page.locator('#renderQuality').selectOption('original');assert.equal(await page.evaluate(()=>BadFodderPlayerSupport.quality.scale),1);
   const downloadPromise=page.waitForEvent('download');await page.locator('#exportProgress').click();const download=await downloadPromise;const backup=fs.readFileSync(await download.path(),'utf8');assert.equal(JSON.parse(backup).game,'badfodder');
   const restored=JSON.parse(backup);restored.saves['badfodder.campaign.v1']=JSON.stringify({campaignSchema:2,currentId:'wigan',unlockedId:'wigan',completedIds:['bad-belzig']});
   await page.locator('#progressBackup').setInputFiles({name:'progress.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(restored))});await page.locator('#restoreProgress').waitFor({state:'visible'});await page.waitForFunction(()=>!document.querySelector('#restoreProgress').disabled);
   await page.screenshot({path:path.join(output,device.name+'-options.png'),fullPage:true});if(device.name==='touch-portrait')reviewImage('portrait-options',await page.screenshot({type:'jpeg',quality:45}));await page.locator('#restoreProgress').click();await page.waitForFunction(()=>!!window.__playerTest&&window.BadFodderCampaign.state.current===1,{},{timeout:120000});
   if(await skip.isVisible())await skip.click();await page.locator('#menuStart').waitFor({state:'visible'});assert.match(await page.locator('#menuStart').textContent(),/CONTINUE.*WIGAN/);
   await page.evaluate(()=>BadFodderCampaign.resetProgress());await page.locator('#menuMissionSelect').click();await page.locator('#menuMissionBad').click();await page.locator('#briefingBegin').click();await page.waitForFunction(()=>window.__playerTest?.state().started&&!window.__playerTest?.state().menuOpen,{},{timeout:120000});
   await page.locator('#fieldGuide').waitFor({state:'visible'});assert.match(await page.locator('#fieldGuide').textContent(),device.touch?/joystick/:/Click/);await page.screenshot({path:path.join(output,device.name+'-opening.png')});if(device.name==='desktop')reviewImage('desktop-opening',await page.screenshot({type:'jpeg',quality:45}));
   await page.keyboard.press('m');await page.waitForFunction(()=>window.__playerTest.state().mapOpen);await page.keyboard.press('m');await page.waitForFunction(()=>!window.__playerTest.state().mapOpen);await page.keyboard.press('r');
   await page.evaluate(()=>window.__playerTest.down());await page.waitForTimeout(300);await page.screenshot({path:path.join(output,device.name+'-casualty.png')});
   assert.equal(await page.evaluate(()=>window.__playerTest.state().faults),0);assert.deepEqual(errors,[]);assert.deepEqual(remote,[],'Single player must not contact Firebase');assert.equal(await page.evaluate(()=>!!window.BadFodderCoop),false);
   console.log('PASS: '+device.name+' options, backup round trip, Continue label, opening guidance and casualty rendering.');
  }catch(error){await page.screenshot({path:path.join(output,device.name+'-failure.png'),fullPage:true});throw error;}finally{await context.close();}
 }
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(async()=>{await browser?.close();await new Promise(resolve=>server.close(resolve));});
