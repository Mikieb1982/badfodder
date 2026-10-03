'use strict';
// Optional real-browser suite: npm install, npx playwright install chromium, npm run test:browser.
const assert=require('node:assert/strict'),fs=require('node:fs'),http=require('node:http'),path=require('node:path');
const {chromium}=require(process.env.BADFODDER_PLAYWRIGHT||'playwright');
const root=path.resolve(__dirname,'..');
const injection=`
window.__testGame={state:()=>({started,paused,menuOpen,finished,runtimeSafeStop,map:MAP_DATA.key,mode:missionLaunch.mode(),faults:runtimeFaultCount,units:squad.map(s=>({x:s.x,y:s.y,hp:s.hp})),progress:missionDirector?.snapshot(),controllerDisposed:missionController?.disposed,streetActors:missionController?[...missionController.state.actors.values()].map(a=>({stamina:a.stamina,attackKind:a.attackKind})):[]}),
step:n=>{for(let i=0;i<n;i++)simulateStep(1/60)}, moveTarget:()=>{const s=squad[0],r=canvas.getBoundingClientRect();for(const [dx,dy] of [[70,0],[-70,0],[0,70],[0,-70]]){const x=s.x+dx,y=s.y+dy;if(routeClear(s.x,s.y,x,y,NAV_RADIUS))return{x:(x-camera.x)*zoom/VIEW_W*r.width,y:(y-camera.y)*zoom/VIEW_H*r.height}}throw new Error('No open movement test target')},
fault:()=>{for(let i=0;i<3;i++)handleRuntimeFault(new Error('Injected unrecoverable test fault'))},
restart:beginMission, pause:togglePause, main:showTitle, resume:resumeMission,
prepare:()=>{if(missionController){const b=[...missionController.state.barricades.values()][0];Object.assign(squad[0],b.workPoints[0]);missionInteractionLayer.syncActors(squad.map((s,i)=>({id:'player-'+i,x:s.x,y:s.y,active:true})));}}, action:performHistoricalNearestAction,
battle:()=>{missionDirector.enterPhase(1);const b=[...missionController.state.barricades.values()][0],f=[...missionController.state.formations.values()][0];Object.assign(f,{x:b.workPoints[0].x+35,y:b.workPoints[0].y,state:'dismantle',stateTime:0,resistance:0});squad.forEach((s,i)=>{Object.assign(s,{x:b.workPoints[0].x,y:b.workPoints[0].y+i*5,path:null,target:null});missionInteractionLayer.cancelJob('player-'+i)});missionInteractionLayer.syncActors(squad.map((s,i)=>({id:'player-'+i,x:s.x,y:s.y,active:true})));missionController.state.actors.forEach(a=>{a.stamina=100;a.attackCooldown=0});setSelection('all');cursorWorld=null;updateHud(true)}};

`;
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.webp':'image/webp','.mp3':'audio/mpeg','.json':'application/json'};
const server=http.createServer((req,res)=>{
 const file=path.join(root,decodeURIComponent(new URL(req.url,'http://local').pathname==='/'?'/index.html':new URL(req.url,'http://local').pathname));
 if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end()}
 try{let data=fs.readFileSync(file);if(file.endsWith('index.html')){let html=data.toString().replace('  startGame();',injection+'\n  startGame();');if(req.url.includes('failStartup=1'))html=html.replace('      await preload();',"      throw new Error('Injected startup failure');");data=Buffer.from(html)}res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');res.end(data)}catch{res.writeHead(404);res.end()}
});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const url='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({headless:true,...(process.env.BADFODDER_CHROMIUM?{executablePath:process.env.BADFODDER_CHROMIUM,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']}: {})});
 try{
 const page=await browser.newPage({viewport:{width:1280,height:900}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&!m.text().includes('Injected unrecoverable')&&!m.text().includes('Injected startup failure'))errors.push(m.text())});
 await page.goto(url);await page.locator('#menuMissionSelect').click();await page.waitForFunction(()=>window.__testGame?.state().started);
 assert.equal(await page.locator('#menuMissionBad').isVisible(),true);assert.equal(await page.locator('#menuMissionWigan').isVisible(),true);assert.equal(await page.locator('#menuHistoricalCable').isVisible(),true);assert.equal(await page.locator('#menuHistorical').count(),0);
 const campaignBefore=await page.evaluate(()=>localStorage.getItem('badfodder.campaign.v1'));
 async function select(button){console.log('Checking',button);await page.locator('#menuMissionSelect').click();await page.locator(button).click();await page.waitForFunction(()=>window.__testGame?.state().started&&!window.__testGame.state().menuOpen,{},{timeout:90000})}
 async function active(){const state=await page.evaluate(()=>window.__testGame.state());assert(state.started&&!state.menuOpen&&!state.paused&&!state.runtimeSafeStop);assert.equal(state.faults,0);return state}
 async function pauseMenuResume(){await page.evaluate(()=>window.__testGame.pause());await page.locator('#menuMain').click();assert(await page.locator('#menuResume').isVisible());await page.locator('#menuResume').click();await active()}
 await page.locator('[data-view="missions"] [data-back]').click();
 for(const [button,map] of [['#menuMissionBad','bad-belzig'],['#menuMissionWigan','wigan']]){
  await select(button);assert.equal((await active()).map,map);
  const before=await page.evaluate(()=>window.__testGame.state().units[0]);
  await page.locator('#game').click({position:await page.evaluate(()=>window.__testGame.moveTarget())});await page.waitForTimeout(700);
  const after=await page.evaluate(()=>window.__testGame.state().units[0]);assert(Math.hypot(before.x-after.x,before.y-after.y)>1,'Click movement did not move leader');
  await page.mouse.click(660,550,{button:'right'});await page.keyboard.press('g');
  await page.waitForTimeout(600);await active();
  for(let i=0;i<3;i++)await pauseMenuResume();
  await page.evaluate(()=>window.__testGame.pause());await page.locator('#menuRestart').click();await active();
  await page.screenshot({path:path.join(process.env.BADFODDER_SCREENSHOTS||'/tmp',map+'-upgrade.png')});
  await page.evaluate(()=>window.__testGame.main());
 }
 assert.equal(await page.evaluate(()=>localStorage.getItem('badfodder.campaign.v1')),campaignBefore,'Direct selection changed campaign');
 await page.locator('#menuMissionSelect').click();await page.locator('#menuHistoricalCable').click();await page.locator('#menuHistoricalCablePlay').click();
 await page.waitForFunction(()=>window.__testGame?.state().started&&!window.__testGame.state().menuOpen,{},{timeout:90000});assert.equal((await active()).map,'cable-street');
 await page.waitForTimeout(500);await page.screenshot({path:path.join(process.env.BADFODDER_SCREENSHOTS||'/tmp','cable-street-upgrade.png')});
 assert(await page.locator('#touchFire').isHidden());assert(await page.locator('#touchGrenade').isHidden());
 await page.evaluate(()=>{window.__testGame.prepare();window.__testGame.action();window.__testGame.step(1200)});await active();
 assert((await active()).progress.phaseIndex>0,'Pressure did not begin promptly after the build deadline');
 await page.evaluate(()=>window.__testGame.battle());await page.keyboard.press('f');assert((await active()).streetActors.some(a=>a.attackKind==='shove'),'Keyboard shove did not attack');
 await page.keyboard.press('g');assert((await active()).streetActors.some(a=>a.attackKind==='throw'),'Keyboard debris did not attack');
 await page.screenshot({path:path.join(process.env.BADFODDER_SCREENSHOTS||'/tmp','cable-street-fight.png')});
 await pauseMenuResume();await page.evaluate(()=>window.__testGame.pause());await page.locator('#menuRestart').click();await active();
 await page.evaluate(()=>window.__testGame.main());await page.locator('#menuMissionSelect').click();await page.locator('#menuHistoricalCable').click();await page.locator('#menuHistoricalCablePlay').click();await page.waitForFunction(()=>window.__testGame?.state().started&&!window.__testGame.state().menuOpen,{},{timeout:90000});await active();
 await page.evaluate(()=>window.__testGame.fault());assert(await page.locator('#menuResume').isHidden());assert(await page.locator('#menuMissionSelect').isVisible());await page.locator('#menuRestart').click();await active();
 await page.goto(url+'?failStartup=1');await page.waitForFunction(()=>document.getElementById('menuStart').textContent==='CAMPAIGN UNAVAILABLE');assert(await page.locator('#menuResume').isHidden());assert(await page.locator('#loading').isHidden());await page.evaluate(()=>history.replaceState(null,'',location.pathname));await select('#menuMissionBad');await active();
 await page.evaluate(()=>window.__testGame.main());await page.locator('#menuStart').click();await page.waitForFunction(()=>window.__testGame?.state().started&&!window.__testGame.state().menuOpen,{},{timeout:90000});assert.equal((await active()).mode,'campaign');
 const mobile=await browser.newPage({viewport:{width:915,height:412},isMobile:true,hasTouch:true});mobile.on('pageerror',e=>errors.push(e.message));await mobile.goto(url);await mobile.locator('[data-presentation-skip]').click();await mobile.waitForFunction(()=>window.__testGame?.state().started,{},{timeout:90000});await mobile.locator('#menuStart').click();await mobile.waitForFunction(()=>window.__testGame?.state().started&&!window.__testGame.state().menuOpen);
 const joy=await mobile.locator('#touchJoystick').boundingBox(),before=await mobile.evaluate(()=>window.__testGame.state().units[0]);
 const touch=await mobile.context().newCDPSession(mobile);
 await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:joy.x+joy.width*.8,y:joy.y+joy.height*.5}]});await mobile.waitForTimeout(500);await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 const after=await mobile.evaluate(()=>window.__testGame.state().units[0]);assert(Math.hypot(before.x-after.x,before.y-after.y)>1,'Joystick did not move squad');await mobile.locator('#touchPause').click();await mobile.locator('#menuResume').click();await mobile.screenshot({path:path.join(process.env.BADFODDER_SCREENSHOTS||'/tmp','mobile-upgrade.png')});
 await mobile.evaluate(()=>window.__testGame.main());await mobile.locator('#menuMissionSelect').click();await mobile.locator('#menuHistoricalCable').click();await mobile.locator('#menuHistoricalCablePlay').click();await mobile.waitForFunction(()=>window.__testGame?.state().started&&!window.__testGame.state().menuOpen,{},{timeout:90000});
 assert(await mobile.locator('#touchShove').isVisible());assert(await mobile.locator('#touchDebris').isVisible());assert(await mobile.locator('#touchFire').isHidden());
 await mobile.evaluate(()=>window.__testGame.battle());await mobile.locator('#touchShove').tap();assert((await mobile.evaluate(()=>window.__testGame.state())).streetActors.some(a=>a.attackKind==='shove'),'Touch shove did not attack');await mobile.locator('#touchDebris').tap();assert((await mobile.evaluate(()=>window.__testGame.state())).streetActors.some(a=>a.attackKind==='throw'),'Touch debris did not attack');await mobile.screenshot({path:path.join(process.env.BADFODDER_SCREENSHOTS||'/tmp','cable-street-mobile.png')});
 assert.deepEqual(errors,[]);console.log('PASS: desktop startup, Campaign/direct selection, all three missions, movement/combat, repeated Wigan menu/Resume, restart/re-entry, recovery restart, load failure escape keyboard/touch street attacks and mobile joystick/pause.');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>server.close());
