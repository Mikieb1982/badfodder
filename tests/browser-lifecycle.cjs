'use strict';
// Optional real-browser suite: npm install, npx playwright install chromium, npm run test:browser.
const assert=require('node:assert/strict'),fs=require('node:fs'),http=require('node:http'),path=require('node:path');
const {chromium,firefox}=require(process.env.BADFODDER_PLAYWRIGHT||'playwright');
const root=path.resolve(__dirname,'..');
const engine=process.env.BADFODDER_BROWSER==='firefox'?firefox:chromium;
const injection=`
window.__testGame={state:()=>({started,paused,menuOpen,finished,runtimeSafeStop,map:MAP_DATA.key,mode:missionLaunch.mode(),faults:runtimeFaultCount,units:squad.map(s=>({x:s.x,y:s.y,hp:s.hp})),progress:missionDirector?.snapshot(),controllerDisposed:missionController?.disposed,streetActors:missionController?[...missionController.state.actors.values()].map(a=>({stamina:a.stamina,attackKind:a.attackKind})):[]}),
step:n=>{for(let i=0;i<n;i++)simulateStep(1/60)}, moveTarget:()=>{const s=squad[0],r=canvas.getBoundingClientRect();for(const [dx,dy] of [[70,0],[-70,0],[0,70],[0,-70]]){const x=s.x+dx,y=s.y+dy;if(routeClear(s.x,s.y,x,y,NAV_RADIUS))return{x:(x-camera.x)*zoom/VIEW_W*r.width,y:(y-camera.y)*zoom/VIEW_H*r.height}}throw new Error('No open movement test target')},
fault:()=>{for(let i=0;i<3;i++)handleRuntimeFault(new Error('Injected unrecoverable test fault'))},
restart:beginMission, pause:togglePause, main:showTitle, resume:resumeMission,
fail:()=>{squad.forEach(s=>s.alive=false);checkFailure()},complete:completeCurrentMission,
identity:()=>missionIdentity, phase:()=>missionStage,

prepare:()=>{if(missionController){const b=[...missionController.state.barricades.values()][0];Object.assign(squad[0],b.workPoints[0]);missionInteractionLayer.syncActors(squad.map((s,i)=>({id:'player-'+i,x:s.x,y:s.y,active:true})));}}, action:performHistoricalNearestAction,
battle:()=>{missionDirector.enterPhase(1);const b=[...missionController.state.barricades.values()][0],f=[...missionController.state.formations.values()][0];Object.assign(f,{x:b.workPoints[0].x+35,y:b.workPoints[0].y,state:'dismantle',stateTime:0,resistance:0});squad.forEach((s,i)=>{Object.assign(s,{x:b.workPoints[0].x,y:b.workPoints[0].y+i*5,path:null,target:null});missionInteractionLayer.cancelJob('player-'+i)});missionInteractionLayer.syncActors(squad.map((s,i)=>({id:'player-'+i,x:s.x,y:s.y,active:true})));missionController.state.actors.forEach(a=>{a.stamina=100;a.attackCooldown=0});setSelection('all');cursorWorld=null;updateHud(true)}};

`;
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.webp':'image/webp','.mp3':'audio/mpeg','.json':'application/json'};
const server=http.createServer((req,res)=>{
 const file=path.join(root,decodeURIComponent(new URL(req.url,'http://local').pathname==='/'?'/index.html':new URL(req.url,'http://local').pathname));
 if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end()}
 try{let data=fs.readFileSync(file);if(file.endsWith('index.html')){let html=data.toString().replace('  // BOOT_MISSION:',injection+'\n  // BOOT_MISSION:');if(req.url.includes('failStartup=1'))html=html.replace('      await preload();',"      throw new Error('Injected startup failure');");data=Buffer.from(html)}res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');res.end(data)}catch{res.writeHead(404);res.end()}
});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const url='http://127.0.0.1:'+server.address().port;
 const browser=await engine.launch({headless:true,...(process.env.BADFODDER_CHROMIUM?{executablePath:process.env.BADFODDER_CHROMIUM,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']}: {})});
 try{
 const page=await browser.newPage({viewport:{width:1280,height:900}}),errors=[];let expectedRuntimeLogs=0,expectedStartupLogs=0;
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()!=='error')return;const t=m.text();if(expectedRuntimeLogs&&t.startsWith('Bad Fodder runtime fault')){expectedRuntimeLogs--;return;}if(expectedStartupLogs&&t.startsWith('Bad Fodder failed to start')){expectedStartupLogs--;return;}errors.push(t)});
 await page.goto(url);await page.locator('#menuMissionSelect').click();await page.waitForFunction(()=>!!window.__testGame);assert.equal((await page.evaluate(()=>window.__testGame.state())).started,false,'Boot must wait for Begin Mission');
 assert.equal(await page.locator('#menuMissionBad').isVisible(),true);assert.equal(await page.locator('#menuMissionWigan').isVisible(),true);assert.equal(await page.locator('#menuHistoricalCable').isVisible(),true);assert.equal(await page.locator('#menuHistorical').count(),0);
 const campaignBefore=await page.evaluate(()=>localStorage.getItem('badfodder.campaign.v1'));
 async function select(button){console.log('Checking',button);await page.locator('#menuMissionSelect').click();await page.locator(button).click();assert(await page.locator('#briefingBegin').isVisible());await page.locator('#briefingBegin').click();await page.waitForFunction(()=>window.__testGame?.state().started&&!window.__testGame.state().menuOpen,{},{timeout:90000})}
 async function active(){const state=await page.evaluate(()=>window.__testGame.state());assert(state.started&&!state.menuOpen&&!state.paused&&!state.runtimeSafeStop);assert.equal(state.faults,0);return state}
 async function resultCycle(p,map){await p.evaluate(()=>window.__testGame.fail());assert(await p.locator('#resultRetry').isVisible());const id=await p.evaluate(()=>window.__testGame.identity());assert.equal(await p.locator('#resultTitle').textContent(),id.failure);await p.locator('#resultBriefing').click();assert(await p.locator('#briefingBegin').isVisible());await p.locator('#briefingBack').click();await p.locator('#resultRetry').click();await p.waitForFunction(()=>!window.__testGame.state().menuOpen&&!window.__testGame.state().finished);assert(await p.locator('#briefingBegin').isHidden());await p.evaluate(()=>window.__testGame.complete());assert.equal(await p.locator('#resultTitle').textContent(),id.victory[0]);await p.screenshot({path:path.join(process.env.BADFODDER_SCREENSHOTS||'/tmp',map+'-result.png')});await p.locator('#resultRetry').click();}
 async function pauseMenuResume(){await page.evaluate(()=>window.__testGame.pause());await page.locator('#menuMain').click();assert(await page.locator('#menuResume').isVisible());await page.locator('#menuResume').click();await active()}
 await page.locator('[data-view="missions"] [data-back]').click();
 for(const [button,map] of [['#menuMissionBad','bad-belzig'],['#menuMissionWigan','wigan']]){
  await page.locator('#menuMissionSelect').click();await page.locator(button).click();assert.equal((await page.evaluate(()=>window.__testGame.state())).menuOpen,true);assert(await page.locator('#briefingStory').isVisible());assert.equal(await page.locator('#briefingCharacters canvas').count(),4);await page.evaluate(()=>BadFodderArt.preloadMissionArt(document.getElementById('briefingTitle').textContent.toLowerCase()));await page.screenshot({path:path.join(process.env.BADFODDER_SCREENSHOTS||'/tmp',map+'-briefing.png')});await page.locator('#briefingBack').click();assert(await page.locator(button).isVisible());await page.locator('[data-view="missions"] [data-back]').click();
  await select(button);assert.equal((await active()).map,map);
  const identity=await page.evaluate(()=>window.__testGame.identity());assert.equal(identity.year,map==='wigan'?1941:1945);assert.equal(await page.locator('#loadingEra').textContent(),identity.loading);assert((await page.locator('#hudSquadBar').textContent()).includes(identity.characters[0].name));assert.equal(await page.evaluate(()=>BadFodderMusic.source),'assets/audio/mission.mp3');
  const before=await page.evaluate(()=>window.__testGame.state().units[0]);
  await page.locator('#game').click({position:await page.evaluate(()=>window.__testGame.moveTarget())});await page.waitForTimeout(700);
  const after=await page.evaluate(()=>window.__testGame.state().units[0]);assert(Math.hypot(before.x-after.x,before.y-after.y)>1,'Click movement did not move leader');
  await page.mouse.click(660,550,{button:'right'});await page.keyboard.press('g');
  await page.waitForTimeout(600);await active();
  for(let i=0;i<3;i++)await pauseMenuResume();
  await page.evaluate(()=>window.__testGame.pause());await page.locator('#menuRestart').click();await active();
  await page.screenshot({path:path.join(process.env.BADFODDER_SCREENSHOTS||'/tmp',map+'-upgrade.png')});
  await resultCycle(page,map);
  await page.evaluate(()=>window.__testGame.main());
  assert.equal(await page.evaluate(()=>BadFodderMusic.source),'assets/audio/bad_fodder.mp3');
 }
 assert.equal(await page.evaluate(()=>localStorage.getItem('badfodder.campaign.v1')),campaignBefore,'Direct selection changed campaign');
 await page.locator('#menuMissionSelect').click();await page.locator('#menuHistoricalCable').click();await page.locator('#briefingBegin').click();
 await page.waitForFunction(()=>window.__testGame?.state().started&&!window.__testGame.state().menuOpen,{},{timeout:90000});assert.equal((await active()).map,'cable-street');
 await page.waitForTimeout(500);await page.screenshot({path:path.join(process.env.BADFODDER_SCREENSHOTS||'/tmp','cable-street-upgrade.png')});
 assert(await page.locator('#touchFire').isHidden());assert(await page.locator('#touchGrenade').isHidden());
 await page.evaluate(()=>{window.__testGame.prepare();window.__testGame.action();window.__testGame.step(1200)});await active();
 assert((await active()).progress.phaseIndex>0,'Pressure did not begin promptly after the build deadline');
 await page.evaluate(()=>window.__testGame.battle());await page.keyboard.press('f');assert((await active()).streetActors.some(a=>a.attackKind==='shove'),'Keyboard shove did not attack');
 await page.keyboard.press('g');assert((await active()).streetActors.some(a=>a.attackKind==='throw'),'Keyboard debris did not attack');
 await page.screenshot({path:path.join(process.env.BADFODDER_SCREENSHOTS||'/tmp','cable-street-fight.png')});
 await resultCycle(page,'cable-street');
 assert.equal(await page.evaluate(()=>BadFodderMusic.source),'assets/audio/cable_street.mp3');
 await pauseMenuResume();await page.evaluate(()=>window.__testGame.pause());await page.locator('#menuRestart').click();await active();
 await page.evaluate(()=>window.__testGame.main());await page.locator('#menuMissionSelect').click();await page.locator('#menuHistoricalCable').click();await page.locator('#briefingBegin').click();await page.waitForFunction(()=>window.__testGame?.state().started&&!window.__testGame.state().menuOpen,{},{timeout:90000});await active();
 expectedRuntimeLogs=3;await page.evaluate(()=>window.__testGame.fault());assert(await page.locator('#menuResume').isHidden());assert(await page.locator('#menuMissionSelect').isVisible());await page.locator('#menuRestart').click();await active();
 expectedStartupLogs=1;await page.goto(url+'?failStartup=1');await page.locator('#menuStart').click();await page.locator('#briefingBegin').click();await page.waitForFunction(()=>document.getElementById('menuStart').textContent==='CAMPAIGN UNAVAILABLE');assert(await page.locator('#menuResume').isHidden());assert(await page.locator('#loading').isHidden());await page.evaluate(()=>history.replaceState(null,'',location.pathname));await select('#menuMissionBad');await active();
 await page.evaluate(()=>window.__testGame.main());await page.locator('#menuStart').click();await page.locator('#briefingBegin').click();await page.waitForFunction(()=>window.__testGame?.state().started&&!window.__testGame.state().menuOpen,{},{timeout:90000});assert.equal((await active()).mode,'campaign');
 const mobile=await browser.newPage({viewport:{width:915,height:412},...(engine===chromium?{isMobile:true}:{}),hasTouch:true});mobile.on('pageerror',e=>errors.push(e.message));await mobile.goto(url);await mobile.locator('[data-presentation-skip]').click();await mobile.waitForFunction(()=>!!window.__testGame);await mobile.locator('#menuStart').click();await mobile.locator('#briefingBegin').click();await mobile.waitForFunction(()=>window.__testGame?.state().started&&!window.__testGame.state().menuOpen);
 const joy=await mobile.locator('#touchJoystick').boundingBox(),before=await mobile.evaluate(()=>window.__testGame.state().units[0]);
 if(engine===chromium){const touch=await mobile.context().newCDPSession(mobile);await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:joy.x+joy.width*.5,y:joy.y+joy.height*.2}]});await mobile.waitForTimeout(500);await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}else{await mobile.mouse.move(joy.x+joy.width*.5,joy.y+joy.height*.2);await mobile.mouse.down();await mobile.waitForTimeout(500);await mobile.mouse.up();}
 const after=await mobile.evaluate(()=>window.__testGame.state().units[0]);assert(Math.hypot(before.x-after.x,before.y-after.y)>1,'Joystick did not move squad');await mobile.locator('#touchPause').click();await mobile.locator('#menuResume').click();await mobile.screenshot({path:path.join(process.env.BADFODDER_SCREENSHOTS||'/tmp','mobile-upgrade.png')});
 await mobile.evaluate(()=>window.__testGame.main());await mobile.locator('#menuMissionSelect').click();await mobile.locator('#menuHistoricalCable').click();await mobile.locator('#briefingBegin').click();await mobile.waitForFunction(()=>window.__testGame?.state().started&&!window.__testGame.state().menuOpen,{},{timeout:90000});
 assert(await mobile.locator('#touchShove').isVisible());assert(await mobile.locator('#touchDebris').isVisible());assert(await mobile.locator('#touchFire').isHidden());
 await mobile.evaluate(()=>window.__testGame.battle());await mobile.locator('#touchShove').tap();assert((await mobile.evaluate(()=>window.__testGame.state())).streetActors.some(a=>a.attackKind==='shove'),'Touch shove did not attack');await mobile.locator('#touchDebris').tap();assert((await mobile.evaluate(()=>window.__testGame.state())).streetActors.some(a=>a.attackKind==='throw'),'Touch debris did not attack');await mobile.screenshot({path:path.join(process.env.BADFODDER_SCREENSHOTS||'/tmp','cable-street-mobile.png')});
 await mobile.evaluate(()=>window.__testGame.main());await mobile.locator('#menuMissionSelect').click();await mobile.locator('#menuMissionWigan').click();await mobile.locator('#briefingBegin').click();await mobile.waitForFunction(()=>window.__testGame?.state().started&&!window.__testGame.state().menuOpen,{},{timeout:90000});assert.equal((await mobile.evaluate(()=>window.__testGame.state())).map,'wigan');await mobile.locator('#touchPause').tap();await mobile.locator('#menuResume').tap();await resultCycle(mobile,'wigan-mobile');
 const fallback=await browser.newPage({viewport:{width:390,height:844},hasTouch:true});fallback.on('pageerror',e=>errors.push(e.message));await fallback.route('**/assets/characters/**',route=>route.abort());await fallback.goto(url);assert(await fallback.evaluate(()=>matchMedia('(orientation:portrait)').matches));await fallback.screenshot({path:path.join(process.env.BADFODDER_SCREENSHOTS||'/tmp','portrait-landscape-required.png')});await fallback.setViewportSize({width:844,height:390});await fallback.locator('[data-presentation-skip]').click();await fallback.locator('#menuMissionSelect').click();await fallback.locator('#menuMissionBad').click();await fallback.screenshot({path:path.join(process.env.BADFODDER_SCREENSHOTS||'/tmp','portrait-mobile-briefing.png')});assert(await fallback.locator('#briefingBegin').isVisible());await fallback.locator('#briefingBegin').click();await fallback.waitForFunction(()=>window.__testGame?.state().started&&!window.__testGame.state().menuOpen,{},{timeout:90000});assert.equal((await fallback.evaluate(()=>window.__testGame.state())).faults,0,'Missing optional art must use the procedural costume fallback');await fallback.close();
 assert.equal(expectedRuntimeLogs,0);assert.equal(expectedStartupLogs,0);
 assert.deepEqual(errors,[]);console.log('PASS: desktop startup, Campaign/direct selection, all three missions, movement/combat, repeated Wigan menu/Resume, restart/re-entry, recovery restart, load failure escape keyboard/touch street attacks and mobile joystick/pause.');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>server.close());
