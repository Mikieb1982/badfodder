'use strict';
// Real production mission saves: reload through the menu and compare paused state.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),{chromium}=require('playwright');
const root=path.resolve('dist'),output=path.resolve('test-results/checkpoints');fs.mkdirSync(output,{recursive:true});
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.webp':'image/webp','.mp3':'audio/mpeg','.mp4':'video/mp4','.webm':'video/webm','.json':'application/json','.webmanifest':'application/manifest+json','.ico':'image/x-icon'};
const injection=`window.__checkpointTest={state:()=>({started,menuOpen,map:MAP_DATA.key,faults:runtimeFaultTotal}),freeze:()=>{paused=true;},unfreeze:()=>{paused=false;},edit:()=>{squad[0].hp=Math.max(1,squad[0].hp-1);squadGrenades=3;phaseHoldTime=2.5;if(barcelonaRuntime)barcelonaRuntime.damage(5);},save:()=>BadFodderCheckpoints.save(),snapshot:()=>({squad:squad.map(u=>({x:u.x,y:u.y,hp:u.hp})),grenades:squadGrenades,phaseHoldTime,objectives:missionObjectivesRuntime.snapshot(),barcelona:barcelonaRuntime?.snapshot(),historical:missionDirector?.snapshot(),arcade:BadFodderArcade?.runtime?.wave})};`;
const server=http.createServer((req,res)=>{try{const name=new URL(req.url,'http://local').pathname,file=path.resolve(root,'.'+(name==='/'?'/index.html':decodeURIComponent(name)));if(!file.startsWith(root+path.sep))throw Error('path');let data=fs.readFileSync(file);if(file.endsWith('index.html'))data=Buffer.from(data.toString().replace('  // BOOT_MISSION:',injection+'\n  // BOOT_MISSION:'));res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.end(data);}catch{res.writeHead(404);res.end();}});
let browser;
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const url='http://127.0.0.1:'+server.address().port;browser=await chromium.launch({headless:true});
 for(const [map,button]of [['bad-belzig','#menuMissionBad'],['wigan','#menuMissionWigan'],['cable-street','#menuHistoricalCable'],['barcelona','#menuMissionBarcelona'],['resistance',null]]){
  const context=await browser.newContext({viewport:{width:1365,height:768}}),page=await context.newPage(),errors=[],remote=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/firebase|googleapis|gstatic/.test(r.url()))remote.push(r.url());});
  // Freeze synchronously before the first resumed simulation tick.
  await context.addInitScript(()=>{const original=requestAnimationFrame;window.requestAnimationFrame=callback=>original.call(window,time=>{if(window.__freezeOnStart&&window.__checkpointTest?.state().started&&!window.__checkpointTest.state().menuOpen)window.__checkpointTest.freeze();callback(time);});});
  try{
   await page.goto(url+'/?seed=checkpoint-'+map);await page.waitForFunction(()=>!!window.__checkpointTest&&window.BadFodderOfflineStatus?.state==='ready'&&!!navigator.serviceWorker.controller,{},{timeout:120000});await context.setOffline(true);const skip=page.locator('[data-presentation-skip]');if(await skip.isVisible())await skip.click();
   if(button){await page.locator('#menuMissionSelect').click();await page.locator(button).click();await page.locator('#briefingBegin').click();}else{await page.locator('#menuResistance').click();await page.locator('[data-arcade-map="wigan"]').click();}
   await page.waitForFunction(()=>window.__checkpointTest?.state().started&&!window.__checkpointTest.state().menuOpen,{},{timeout:120000});
   if(map==='resistance')await page.waitForFunction(()=>BadFodderArcade.runtime.wave===1,{},{timeout:30000});
   const expected=await page.evaluate(()=>{__checkpointTest.freeze();__checkpointTest.edit();if(!__checkpointTest.save())throw Error('Checkpoint save failed');return __checkpointTest.snapshot();});
   await page.screenshot({path:path.join(output,map+'-saved.png')});
   await page.reload();await page.waitForFunction(()=>!!window.__checkpointTest,{},{timeout:120000});if(await skip.isVisible())await skip.click();await page.locator('#resumeSavedGame').waitFor({state:'visible'});
   await page.screenshot({path:path.join(output,map+'-resume-menu.png')});if(map==='wigan')console.log('CHECKPOINT_IMAGE menu '+(await page.screenshot({type:'jpeg',quality:45})).toString('base64'));
   await context.addInitScript(()=>{window.__freezeOnStart=true;});await page.locator('#resumeSavedGame').click();
   await page.waitForFunction(()=>window.__checkpointTest?.state().started&&!window.__checkpointTest.state().menuOpen,{},{timeout:120000});
   assert.deepEqual(await page.evaluate(()=>__checkpointTest.snapshot()),expected,'Mission state survives reload and Resume: '+map);
   await page.screenshot({path:path.join(output,map+'-resumed.png')});if(map==='wigan')console.log('CHECKPOINT_IMAGE resumed '+(await page.screenshot({type:'jpeg',quality:45})).toString('base64'));assert.equal(await page.evaluate(()=>__checkpointTest.state().faults),0);
   // Let the restored runtime advance, catching stale references and missing timers.
   await page.evaluate(()=>{window.__freezeOnStart=false;__checkpointTest.unfreeze();});await page.waitForTimeout(1200);assert.equal(await page.evaluate(()=>__checkpointTest.state().faults),0);
   assert.deepEqual(errors,[]);assert.deepEqual(remote,[],'Checkpoints never load Firebase');console.log('PASS: offline production '+map+' checkpoint resume, runtime continuation and no Firebase.');
  }catch(error){await page.screenshot({path:path.join(output,map+'-failure.png'),fullPage:true});throw error;}finally{await context.close();}
 }
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(async()=>{await browser?.close();await new Promise(resolve=>server.close(resolve));});
