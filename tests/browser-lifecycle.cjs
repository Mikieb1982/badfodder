'use strict';
// Optional real-browser suite: npm install, npx playwright install chromium, npm run test:browser.
const assert=require('node:assert/strict'),fs=require('node:fs'),http=require('node:http'),path=require('node:path');
const {chromium,firefox,webkit}=require(process.env.BADFODDER_PLAYWRIGHT||'playwright');
const root=path.resolve(__dirname,'..',process.env.BADFODDER_TEST_DIST==='1'?'dist':'.');
const engine=({chromium,firefox,webkit})[process.env.BADFODDER_BROWSER||'chromium'];
const injection=`
let testFriendlyShots=0;const originalFireBullet=fireBullet;fireBullet=function(...args){const fired=originalFireBullet(...args);if(args[0]==='friendly'&&fired!==false)testFriendlyShots++;return fired};
window.__testGame={
barcelonaState:()=>({objective:missionObjectivesRuntime.manager.current()?.id,ammo:squad.map(s=>s.ammo),weapons:squad.map(s=>s.weapon),allies:resistanceRuntime?.counts(),friendlyShots:testFriendlyShots,stage:barcelonaRuntime?.stage,summary:barcelonaRuntime?.summary(),carry:barcelonaRuntime?.carrying,markers:missionObjectives().map(o=>o.phase.id)}),
barcelonaPlace:where=>{clearSquadFormation();squad.forEach(s=>{s.path=null;s.target=null});const p=where==='material'?barcelonaRuntime.materialPoints[0]:where==='barrier'?barcelonaRuntime.barrier:zones[where];Object.assign(squad[0],{x:p.x,y:p.y});setSelection(0);updateCamera(1);updateHud(true);},
barcelonaTick:dt=>{barcelonaRuntime.update(dt);updateMissionProgress(dt);updateHud(true)},
barcelonaClear:()=>{enemies.forEach(e=>{e.alive=false;e.path=null;e.commandOrder=null});updateMissionProgress(.1);updateHud(true)},
barcelonaEscort:()=>{enemies.forEach(e=>{e.alive=false;e.path=null});for(const [x,y]of [[576,692],[568,837],[415,837],[375,792],[300,780]]){assignPath(squad[0],S(x),S(y));for(let i=0;i<1500&&squad[0].path;i++){followPath(squad[0],185,1/30);civilianRuntime.update(1/30)}}for(let i=0;i<1800;i++)civilianRuntime.update(1/30);updateMissionProgress(.1);updateCamera(1);updateHud(true);return civilianRuntime.counts()},
barcelonaBattle:({east=false,wounded=false,low=false}={})=>{
 resetGame();missionObjectivesRuntime.syncPhase(east?10:5);enemies.forEach(e=>{e.alive=false});BadFodderBarricades.reinforceBarricade(barcelonaRuntime.barrier,60,{tierIncrease:2});barcelonaRuntime.damage(0);clearSquadFormation();
 const spots=east?[[567,689],[600,704],[575,742],[754,706]]:[[310,649],[359,680],[417,651],[255,668]];
 squad.forEach((s,i)=>{Object.assign(s,{x:S(spots[i][0]),y:S(spots[i][1]),weapon:'mauser',ammo:low?12:60,path:null,target:null});if(wounded&&i===0){s.hp=5;s.healthState='WOUNDED'}BadFodderGarrison.toggleGarrison(s)});setSelection('all');updateCamera(1);
 diagnostics.start();let peak=0,maxBullets=0,maxEffects=0,maxQueue=0,steps=0;const before=performance.now();
 for(;steps<12000&&!finished;steps++){simulateStep(1/60);peak=Math.max(peak,enemies.filter(e=>e.alive&&!e.surrendered&&!e.missionDormant).length);maxBullets=Math.max(maxBullets,bullets.length);maxEffects=Math.max(maxEffects,effects.length);maxQueue=Math.max(maxQueue,enemyPathQueue.length);if(missionObjectivesRuntime.manager.current()?.id!==(east?'hold-east':'hold-barricade'))break;}
 updateHud(true);return{east,wounded,low,objective:missionObjectivesRuntime.manager.current()?.id,steps,msPerStep:(performance.now()-before)/Math.max(1,steps),peak,maxBullets,maxEffects,maxQueue,roles:enemies.map(e=>e.combatRole),friendlyKills:enemies.filter(e=>!e.alive&&e.lastHitSide==='friendly').length,summary:barcelonaRuntime.summary(),health:squad.map(s=>s.healthState),ammo:squad.map(s=>s.ammo),diagnostics:diagnostics.snapshot()};
},
barcelonaAmmo:value=>{const before=squad[0].ammo;squad[0].ammo=value;updateHud(true);return before},
barcelonaFire:()=>squadFireAt(squad[0].x+50,squad[0].y-30),
state:()=>({started,paused,menuOpen,finished,runtimeSafeStop,lifecycle:lifecycle.state,zoom,map:MAP_DATA.key,mode:missionLaunch.mode(),faults:runtimeFaultCount,touch:{...touchState},units:squad.map(s=>({x:s.x,y:s.y,hp:s.hp,selected:s.selected,garrison:!!s.manualGarrison,building:s.insideBuilding||null})),progress:missionDirector?.snapshot(),controllerDisposed:missionController?.disposed,streetActors:missionController?[...missionController.state.actors.values()].map(a=>({stamina:a.stamina,attackKind:a.attackKind})):[]}),
step:n=>{for(let i=0;i<n;i++)simulateStep(1/60)}, moveTarget:()=>{const s=squad[0],r=canvas.getBoundingClientRect();for(const [dx,dy] of [[70,0],[-70,0],[0,70],[0,-70]]){const x=s.x+dx,y=s.y+dy;if(routeClear(s.x,s.y,x,y,NAV_RADIUS))return{x:(x-camera.x)*zoom/VIEW_W*r.width,y:(y-camera.y)*zoom/VIEW_H*r.height}}throw new Error('No open movement test target')},
fault:()=>{for(let i=0;i<3;i++)handleRuntimeFault(new Error('Injected unrecoverable test fault'))},
restart:beginMission, pause:togglePause, main:showTitle, resume:resumeMission,
fail:()=>{squad.forEach(s=>s.alive=false);checkFailure()},complete:completeCurrentMission,
identity:()=>missionIdentity, phase:()=>missionStage,
objectives:()=>missionObjectivesRuntime.snapshot(),
characters:()=>squad.map(s=>({id:s.id,name:s.name,occupation:s.occupation,trait:s.trait,healthState:s.healthState,experience:s.experience,voiceSet:s.voiceSet,relationships:s.relationships})),
opportunity:()=>{civilianRuntime.damage(civilians[0],3);return opportunitiesRuntime.execute('OPTIONAL_RESCUE')},opportunityState:()=>missionObjectivesRuntime.manager.get('director-rescue-0')?.status,enemyState:()=>enemyBehaviour.snapshot(),surrender:()=>{const e=enemies[1];Object.assign(e,{alive:true,hp:1,surrendered:false,x:squad[1].x,y:squad[1].y,combatRole:'RIFLEMAN'});squad.forEach(s=>{s.x=e.x+5;s.y=e.y});for(let i=0;i<4;i++){e.suppression=.95;enemyBehaviour.fixedUpdate(.5)}return{alive:e.alive,surrendered:e.surrendered};},
tactics:()=>({state:tacticsRuntime.snapshot(),movement:BadFodderCombatTactics.movementScale(squad[0]),spread:BadFodderCombatTactics.spreadScale(squad[0])}),
pressure:()=>{enemies.forEach(e=>e.alive=false);adaptiveDirector=null;clearSquadFormation();squad.forEach(s=>{s.path=null;s.target=null});squad[0].coverMask=0;squad[0].suppression=.85;updateHud(true)},
building:()=>({state:buildingRuntime.snapshot(),grenades:squadGrenades}),
prepareBuilding:()=>{adaptiveDirector=null;clearSquadFormation();enemies.forEach(e=>e.alive=false);civilians.forEach(c=>{c.x=WORLD_W-50;c.y=WORLD_H-50;c.homeX=c.x;c.homeY=c.y;c.leaderIndex=null});squad.forEach(s=>{s.path=null;s.target=null});const site=buildingRuntime.sites.find(s=>s.cache);if(!site)throw Error('No reachable building site');Object.assign(squad[1],site.door);setSelection(1);updateHud(true);return site.id},
health:()=>BadFodderHealth.snapshot(),
civilians:()=>({counts:civilianRuntime.counts(),rows:civilianRuntime.snapshot(),optional:missionObjectivesRuntime.manager.get('evacuate-residents').status}),
prepareResidents:()=>{enemies.forEach(e=>e.alive=false);squad.forEach(s=>{s.path=null;s.target=null});const c=civilians[0],z=civilianRuntime.zones[0];squad[1].x=z.x+z.r+40;squad[1].y=z.y;c.x=squad[1].x+10;c.y=squad[1].y;setSelection(1);updateHud(true)},
evacuateResident:()=>{const c=civilians[0],z=civilianRuntime.zones[0];c.x=z.x;c.y=z.y;civilianRuntime.update(.1);updateMissionProgress(.1);updateHud(true)},
downForRescue:()=>{adaptiveDirector=null;clearSquadFormation();squad.forEach(s=>{s.path=null;s.target=null});enemies.forEach(e=>e.alive=false);squad[0].x=squad[1].x-25;squad[0].y=squad[1].y;squad[0].hp=2;squad[0].damageGrace=0;applyDamage(squad[0],3,squad[0].x,squad[0].y);setSelection(1);updateHud(true);},
objectiveTransition:()=>{
 const manager=missionObjectivesRuntime.manager;
 if(MAP_DATA.key==='bad-belzig'){
  for(const id of ['opening-contact','opening-route']){
   const objective=manager.get(id),zone=phaseZone(objective);if(!objective||!zone)throw new Error('Missing Bad Belzig authored opening objective: '+id);
   squad.forEach(s=>{s.path=null;s.target=null;s.x=zone.x;s.y=zone.y});simulateStep(1/60);
  }
 }else{
  const first=currentObjectivePhase(),zone=phaseZone(first);enemies.forEach(e=>e.alive=false);squad.forEach(s=>{s.x=zone.x;s.y=zone.y});updateMissionProgress(first.hold||.1);
 }
 const result={stage:missionStage,current:manager.current()?.id,statuses:Object.fromEntries(manager.all().filter(o=>!o.optional).map(o=>[o.id,o.status]))};resetGame();return result
},
adaptive:()=>({enabled:!!adaptiveDirector&&!adaptiveDirector.state.disabled,decisions:adaptiveDirector?.state.decisions,commander:!!enemyCommander,militaryEnemies:enemies.length}),
directorFault:()=>{adaptiveDirector.update=()=>{throw new Error('Injected optional Director fault')};simulateStep(1/60)},

prepare:()=>{if(missionController){const b=[...missionController.state.barricades.values()][0];Object.assign(squad[0],b.workPoints[0]);missionInteractionLayer.syncActors(squad.map((s,i)=>({id:'player-'+i,x:s.x,y:s.y,active:true})));}}, action:performHistoricalNearestAction,
battle:()=>{resetGame();missionDirector.enterPhase(1);const b=[...missionController.state.barricades.values()][0],f=[...missionController.state.formations.values()][0];Object.assign(f,{x:b.workPoints[0].x+35,y:b.workPoints[0].y,state:'dismantle',stateTime:0,resistance:0});squad.forEach((s,i)=>{Object.assign(s,{x:b.workPoints[0].x,y:b.workPoints[0].y+i*5,path:null,target:null});missionInteractionLayer.cancelJob('player-'+i)});missionInteractionLayer.syncActors(squad.map((s,i)=>({id:'player-'+i,x:s.x,y:s.y,active:true})));missionController.state.actors.forEach(a=>{a.stamina=100;a.attackCooldown=0;a.stunned=0});setSelection('all');cursorWorld=null;updateHud(true)}};

`;
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.webp':'image/webp','.mp3':'audio/mpeg','.webm':'audio/webm','.json':'application/json'};
const server=http.createServer((req,res)=>{
 const file=path.join(root,decodeURIComponent(new URL(req.url,'http://local').pathname==='/'?'/index.html':new URL(req.url,'http://local').pathname));
 if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end()}
 try{let data=fs.readFileSync(file);if(file.endsWith('index.html')){let html=data.toString().replace('  // BOOT_MISSION:',injection+'\n  // BOOT_MISSION:');if(req.url.includes('failStartup=1'))html=html.replace('  async function preload(){',"  async function preload(){throw new Error('Injected startup failure');");data=Buffer.from(html)}res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');if(req.headers.range&&file.endsWith('.mp3')){const m=/bytes=(\d+)-(\d*)/.exec(req.headers.range),start=Number(m?.[1]||0),end=Math.min(data.length-1,m?.[2]?Number(m[2]):data.length-1);res.writeHead(206,{'Accept-Ranges':'bytes','Content-Range':`bytes ${start}-${end}/${data.length}`,'Content-Length':end-start+1});return res.end(data.subarray(start,end+1));}res.setHeader('Content-Length',data.length);res.end(data)}catch{res.writeHead(404);res.end()}
});
async function runLifecycle(providedBrowser, testInfo){
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const url='http://127.0.0.1:'+server.address().port;
 const browser=providedBrowser||await engine.launch({headless:true,...(process.env.BADFODDER_CHROMIUM_EXECUTABLE?{executablePath:process.env.BADFODDER_CHROMIUM_EXECUTABLE}:{})});
 const browserName=testInfo?.project.name||process.env.BADFODDER_BROWSER||'chromium';
 const contexts=[],logs=[];
 const newPage=async options=>{const context=await browser.newContext(options);contexts.push(context);await context.tracing.start({screenshots:true,snapshots:true,sources:true});const page=await context.newPage();page.on('console',m=>{if(['error','warning'].includes(m.type()))logs.push({type:m.type(),text:m.text()})});page.on('pageerror',e=>logs.push({type:'pageerror',text:e.message}));return page;};
 try{
 const page=await newPage({viewport:{width:1280,height:900},...(process.env.BADFODDER_BARCELONA_ONLY?{hasTouch:true,isMobile:true}:{})}),errors=[],requests=[];page.on('request',r=>requests.push(r.url()));let expectedRuntimeLogs=0,expectedStartupLogs=0;
 page.on('pageerror',e=>{errors.push(e.message);console.error('Page error:',e.message)});page.on('console',m=>{if(m.type()!=='error')return;const t=m.text();if(expectedRuntimeLogs&&t.startsWith('If I Can Shoot Rabbits runtime fault')){expectedRuntimeLogs--;return;}if(expectedStartupLogs&&t.startsWith('If I Can Shoot Rabbits failed to start')){expectedStartupLogs--;return;}errors.push(t)});
 console.log('Browser ready');await page.goto(url+'?debug=1&directorDebug=1&seed='+encodeURIComponent(process.env.BADFODDER_SEED||'barcelona-balance'),{waitUntil:'domcontentloaded'});console.log('Page loaded');await page.waitForFunction(()=>!!window.__testGame);if(process.env.BADFODDER_BARCELONA_ONLY)await page.locator('[data-presentation-skip]').click();await page.locator('#menuMissionSelect').click();assert.equal((await page.evaluate(()=>window.__testGame.state())).started,false,'Boot must wait for Begin Mission');assert(!requests.some(u=>/wigan-(map|details|scenery)|cable-street-(map|runtime|interactions|director|crowd|art)/.test(u)),'Startup loaded an unused mission');
 assert.equal(await page.locator('#menuMissionBad').isVisible(),true);assert.equal(await page.locator('#menuMissionWigan').isVisible(),true);assert.equal(await page.locator('#menuHistoricalCable').isVisible(),true);assert.equal(await page.locator('#menuHistorical').count(),0);
 const campaignBefore=await page.evaluate(()=>localStorage.getItem('badfodder.campaign.v1'));
 async function select(button){console.log('Checking',button);await page.locator('#menuMissionSelect').click();await page.locator(button).click();assert(await page.locator('#briefingBegin').isVisible());await page.locator('#briefingBegin').click();await page.waitForFunction(()=>window.__testGame?.state().started&&!window.__testGame.state().menuOpen,{},{timeout:90000})}
 async function active(){const state=await page.evaluate(()=>window.__testGame.state());assert(state.started&&!state.menuOpen&&!state.paused&&!state.runtimeSafeStop);assert.equal(state.faults,0);assert.equal(state.lifecycle,'PLAYING');return state}
 async function resultCycle(p,map){await p.evaluate(()=>window.__testGame.fail());assert(await p.locator('#resultRetry').isVisible());const id=await p.evaluate(()=>window.__testGame.identity());assert.equal(await p.locator('#resultTitle').textContent(),id.failure);await p.locator('#resultBriefing').click();assert(await p.locator('#briefingBegin').isVisible());await p.locator('#briefingBack').click();await p.locator('#resultRetry').click();await p.waitForFunction(()=>!window.__testGame.state().menuOpen&&!window.__testGame.state().finished);assert(await p.locator('#briefingBegin').isHidden());await p.evaluate(()=>window.__testGame.complete());assert.equal(await p.locator('#resultTitle').textContent(),id.victory[0]);if(process.env.BADFODDER_SCREENSHOTS)await p.screenshot({path:path.join(process.env.BADFODDER_SCREENSHOTS||'/tmp',map+'-result.png')});await p.locator('#resultRetry').click();}
 async function barcelonaCycle(p,touch=false){
  const read=()=>p.evaluate(()=>window.__testGame.barcelonaState());
  const place=where=>p.evaluate(where=>window.__testGame.barcelonaPlace(where),where);
  // Teleported fixtures still respect simulation-time interaction cooldowns.
  const act=async()=>{await p.evaluate(()=>window.__testGame.barcelonaTick(.85));if(touch){await p.locator('#touchAction').tap()}else{await p.keyboard.press('e')}await p.waitForTimeout(420)};
  assert.equal((await read()).objective,'opening');assert.deepEqual((await read()).markers,['opening']);assert.deepEqual((await read()).weapons,['pistol',null,null,null]);assert.equal((await read()).allies.alive,3);
  await p.evaluate(()=>window.__testGame.barcelonaFire());assert.equal((await read()).ammo[0],17);assert.deepEqual((await read()).ammo.slice(1),[0,0,0]);
  if(process.env.BADFODDER_SCREENSHOTS)await p.screenshot({path:path.join(process.env.BADFODDER_SCREENSHOTS,'barcelona-'+(touch?'mobile':'desktop')+'-opening.png')});
  await place('junction');await p.evaluate(()=>window.__testGame.barcelonaTick(30));assert.equal((await read()).objective,'patrol');
  await p.evaluate(()=>window.__testGame.barcelonaClear());assert.equal((await read()).objective,'acquire-weapons');await place('contact');await act();assert((await read()).weapons.every(w=>w==='mauser'));const ammoBefore=await p.evaluate(()=>window.__testGame.barcelonaAmmo(3));assert((await p.locator('#hudInstruction').textContent()).includes('CRITICAL'));await p.evaluate(value=>window.__testGame.barcelonaAmmo(value),ammoBefore);
  await place('barricade');await p.evaluate(()=>window.__testGame.barcelonaTick(.1));assert.equal((await read()).objective,'build-barricade');
  for(let i=0;i<2;i++){await place('material');await act();assert.equal((await read()).carry,0);await place('barrier');await act();}
  assert.equal((await read()).objective,'hold-barricade');assert((await read()).summary.barrier>=60);
  await place('barricade');await p.evaluate(()=>window.__testGame.barcelonaTick(9));assert.equal((await read()).stage.wave,1);
  await p.waitForFunction(()=>window.__testGame.barcelonaState().friendlyShots>0,{},{timeout:20000});assert.equal((await p.evaluate(()=>window.__testGame.state())).faults,0);assert((await p.evaluate(()=>window.__testGame.adaptive())).commander);
  if(process.env.BADFODDER_SCREENSHOTS)await p.screenshot({path:path.join(process.env.BADFODDER_SCREENSHOTS,'barcelona-'+(touch?'mobile':'desktop')+'-hold.png')});
  await p.evaluate(()=>window.__testGame.barcelonaClear());await p.evaluate(()=>window.__testGame.barcelonaTick(25));assert.equal((await read()).stage.wave,2);
  await p.evaluate(()=>window.__testGame.barcelonaClear());await p.evaluate(()=>window.__testGame.barcelonaTick(7));assert.equal((await read()).objective,'recovery');assert(!(await p.evaluate(()=>window.__testGame.state())).finished);
  await p.evaluate(()=>window.__testGame.barcelonaTick(.1));assert((await read()).stage.recovery>0);await p.evaluate(()=>window.__testGame.barcelonaTick(17));assert.equal((await read()).objective,'reach-civilians');await p.evaluate(()=>window.__testGame.barcelonaTick(.1));assert.equal((await read()).summary.civiliansFound,6);
  await place('residents');await p.evaluate(()=>window.__testGame.barcelonaTick(.1));assert.equal((await read()).objective,'escort-civilians');if(touch)await act();else await controllerGather(p);
  assert.deepEqual((await read()).markers,['escort-civilians']);const noticeClear=await p.evaluate(()=>{const n=document.getElementById('hudNotice').getBoundingClientRect(),h=document.querySelector('.hud-mission').getBoundingClientRect();return n.top>=h.bottom+3});assert(noticeClear,'Barcelona notice overlaps objective panel');const following=await p.evaluate(()=>window.__testGame.civilians().counts.following);assert(following>=6,'Desktop/touch contextual action gathers the trapped group');
  if(process.env.BADFODDER_SCREENSHOTS)await p.screenshot({path:path.join(process.env.BADFODDER_SCREENSHOTS,'barcelona-'+(touch?'mobile':'desktop')+'-rescue.png')});
  const evacuated=await p.evaluate(()=>window.__testGame.barcelonaEscort());assert(evacuated.evacuated>=6);await p.evaluate(()=>window.__testGame.barcelonaTick(.1));assert.equal((await read()).objective,'second-route');assert.equal((await read()).summary.civiliansRescued,6);
  await place('eastern');await p.evaluate(()=>window.__testGame.barcelonaTick(.1));assert.equal((await read()).objective,'hold-east');await p.evaluate(()=>window.__testGame.barcelonaTick(11));assert.equal((await read()).stage.eastWave,1);
  if(process.env.BADFODDER_SCREENSHOTS)await p.screenshot({path:path.join(process.env.BADFODDER_SCREENSHOTS,'barcelona-'+(touch?'mobile':'desktop')+'-east.png')});
  await p.evaluate(()=>window.__testGame.barcelonaClear());await p.evaluate(()=>window.__testGame.barcelonaTick(25));assert.equal((await read()).stage.eastWave,2);await p.evaluate(()=>window.__testGame.barcelonaClear());await p.evaluate(()=>window.__testGame.barcelonaTick(7));assert.equal((await read()).objective,'counterattack');
  await p.evaluate(()=>window.__testGame.barcelonaTick(.1));await p.evaluate(()=>window.__testGame.barcelonaTick(7));assert((await read()).stage.rearguard);await p.evaluate(()=>window.__testGame.barcelonaClear());await place('advance');
  if(process.env.BADFODDER_SCREENSHOTS)await p.screenshot({path:path.join(process.env.BADFODDER_SCREENSHOTS,'barcelona-'+(touch?'mobile':'desktop')+'-counterattack.png')});
  await p.evaluate(()=>window.__testGame.barcelonaTick(7));assert((await p.evaluate(()=>window.__testGame.state())).finished);assert.equal(await p.locator('#resultTitle').textContent(),'THE POSITION IS SECURE');assert((await p.locator('#resultFlavour').textContent()).includes('6/6 civilians rescued'));
  await p.locator('#resultRetry').click();await p.waitForFunction(()=>!window.__testGame.state().menuOpen&&!window.__testGame.state().finished);assert.equal((await read()).stage.wave,0);assert.equal((await read()).ammo[0],18);
 }
 async function pauseMenuResume(){await page.evaluate(()=>window.__testGame.pause());await page.locator('#menuMain').click();assert(await page.locator('#menuResume').isVisible());await page.locator('#menuResume').click();await active()}
 async function controllerGather(p){
  await p.evaluate(()=>{window.__originalGamepads=navigator.getGamepads.bind(navigator);window.__testPad={index:0,connected:true,axes:[0,0,0,0],buttons:Array.from({length:16},()=>({pressed:false,value:0}))};Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>[window.__testPad]});window.BadFodderController.reset();});
  await p.waitForTimeout(100);await p.evaluate(()=>window.__testPad.buttons[0].pressed=true);await p.waitForFunction(()=>window.__testGame.civilians().counts.following>=6);
  await p.evaluate(()=>{window.BadFodderController.reset();Object.defineProperty(navigator,'getGamepads',{configurable:true,value:window.__originalGamepads});delete window.__testPad;delete window.__originalGamepads;});
 }
 async function controllerSelection(){
  await page.waitForFunction(()=>!!window.BadFodderController);
  await page.evaluate(()=>{
   window.__originalGamepads=navigator.getGamepads.bind(navigator);
   window.__testPad={index:0,connected:true,axes:[0,0,0,0],buttons:Array.from({length:16},()=>({pressed:false,value:0}))};
   Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>[window.__testPad]});
   window.BadFodderController.reset();
  });
  async function press(indices,count){
   await page.evaluate(()=>window.__testPad.buttons.forEach(b=>b.pressed=false));await page.waitForTimeout(100);
   await page.evaluate(indices=>indices.forEach(i=>window.__testPad.buttons[i].pressed=true),indices);
   await page.waitForFunction(count=>window.__testGame.state().units.filter(u=>u.selected).length===count,count);
  }
  await press([15],1);await press([4,15],2);await press([12],4);
  await page.evaluate(()=>{window.BadFodderController.reset();Object.defineProperty(navigator,'getGamepads',{configurable:true,value:window.__originalGamepads});delete window.__testPad;delete window.__originalGamepads;});
 }
 async function casualtyCycle(p,touch=false){
  await p.evaluate(()=>window.__testGame.downForRescue());
  assert.equal((await p.evaluate(()=>window.__testGame.health()))[0][0],'DOWN');
  await p.evaluate(()=>window.__testGame.pause());const before=(await p.evaluate(()=>window.__testGame.health()))[0][3];
  await p.waitForTimeout(300);assert.equal((await p.evaluate(()=>window.__testGame.health()))[0][3],before,'Pause consumed the rescue window');
  await p.evaluate(()=>window.__testGame.pause());
  async function action(){if(touch)await p.locator('#touchAid').dispatchEvent('pointerdown',{pointerId:71,pointerType:'touch'});else await p.keyboard.press('e');}
  await action();assert((await p.evaluate(()=>window.__testGame.health()))[0][2],'Contextual action did not stabilise casualty');
  await action();assert.equal((await p.evaluate(()=>window.__testGame.health()))[1][5],0,'Contextual action did not carry casualty');
  if(process.env.BADFODDER_SCREENSHOTS)await p.screenshot({path:path.join(process.env.BADFODDER_SCREENSHOTS,'casualty-'+(touch?'touch':'desktop')+'.png')});
  await action();assert.equal((await p.evaluate(()=>window.__testGame.health()))[1][5],null,'Contextual action did not drop casualty');
  await p.evaluate(()=>window.__testGame.restart());
 }
 async function assertTouchLayout(p,label){
  const rects=await p.evaluate(()=>{
   const names=['.hud-roster','#touchJoystick','.hud-mission',...Array.from(document.querySelectorAll('.touch-actions button'),b=>'#'+b.id)];
   const out={};for(const name of names){const e=document.querySelector(name);if(!e||e.hidden||getComputedStyle(e).display==='none'||getComputedStyle(e).visibility==='hidden')continue;const r=e.getBoundingClientRect();if(r.width&&r.height)out[name]={x:r.x,y:r.y,right:r.right,bottom:r.bottom,w:r.width,h:r.height}}
   const r=document.getElementById('game').getBoundingClientRect();return{out,canvas:{x:r.x,y:r.y,right:r.right,bottom:r.bottom}};
  });
  const controls=Object.keys(rects.out).filter(n=>n.startsWith('#touch'));
  const overlap=(a,b)=>Math.min(a.right,b.right)-Math.max(a.x,b.x)>1&&Math.min(a.bottom,b.bottom)-Math.max(a.y,b.y)>1;
  for(const [i,name] of controls.entries()){
   const r=rects.out[name];assert(r.w>=44&&r.h>=44,label+': small '+name);
   assert(r.x>=rects.canvas.x-1&&r.y>=rects.canvas.y-1&&r.right<=rects.canvas.right+1&&r.bottom<=rects.canvas.bottom+1,label+': clipped '+name);
   for(const other of ['.hud-roster','.hud-mission',...controls.slice(i+1)])assert(!overlap(r,rects.out[other]),label+': '+name+' overlaps '+other);
  }
  if(process.env.BADFODDER_SCREENSHOTS)await p.screenshot({path:path.join(process.env.BADFODDER_SCREENSHOTS,'touch-layout-'+label+'.png')});
 }
 async function militaryLayout(p){
  await p.evaluate(()=>{__testGame.prepareResidents();__testGame.downForRescue()});
  await p.waitForFunction(()=>!document.getElementById('touchAid').hidden);
  for(const size of [{width:915,height:412},{width:844,height:390},{width:667,height:375},{width:568,height:320}]){
   await p.setViewportSize(size);await p.waitForTimeout(120);await assertTouchLayout(p,'military-'+size.width);
  }
  await p.setViewportSize({width:915,height:412});await p.evaluate(()=>__testGame.restart());
 }
 async function buildingCycle(p,touch=false){
 await p.evaluate(()=>window.__testGame.pressure());
 assert((await p.evaluate(()=>window.__testGame.tactics())).movement<1);
 await p.waitForFunction(()=>document.querySelector('.hud-state')?.textContent.includes('PINNED'));
 await p.evaluate(()=>window.__testGame.step(300));
 assert.equal((await p.evaluate(()=>window.__testGame.tactics())).state.squad[0][0],0);

  const surrender=await p.evaluate(()=>__testGame.surrender());assert(surrender.alive&&surrender.surrendered,'Overwhelmed enemies must surrender alive');
  const id=await p.evaluate(()=>__testGame.prepareBuilding());
  async function action(){if(touch)await p.locator('#touchAction').dispatchEvent('pointerdown',{pointerId:74,pointerType:'touch'});else await p.keyboard.press('e')}
  await action();assert.equal((await p.evaluate(()=>__testGame.state())).units[1].building,id,'Entrance did not place the selected person inside');
  if(process.env.BADFODDER_SCREENSHOTS)await p.screenshot({path:path.join(process.env.BADFODDER_SCREENSHOTS,'building-'+(touch?'touch':'desktop')+'.png')});
  await action();assert((await p.evaluate(()=>__testGame.building())).state.sites.find(r=>r[0]===id)[1],'Search was not recorded');
  const before=(await p.evaluate(()=>__testGame.building())).grenades;await action();assert.equal((await p.evaluate(()=>__testGame.building())).grenades,before+2);
  await action();assert.equal((await p.evaluate(()=>__testGame.state())).units[1].building,null,'Exit did not return to the street');
  await action();
  if(touch)await p.locator('#touchGarrison').dispatchEvent('pointerdown',{pointerId:75,pointerType:'touch'});else await p.keyboard.press('h');
  const held=(await p.evaluate(()=>__testGame.state())).units[1];assert(held.garrison);assert.equal(held.building,null,'Defensive hold must use the reachable doorway');
  if(touch)await p.locator('#touchRegroup').dispatchEvent('pointerdown',{pointerId:76,pointerType:'touch'});else await p.keyboard.press('r');
  const regrouped=(await p.evaluate(()=>__testGame.state())).units;assert(regrouped.every(u=>u.selected&&!u.garrison),'Live regroup did not release and select the squad');
  await p.evaluate(()=>__testGame.restart());
 }
 async function civilianCycle(p,touch=false){
 await p.evaluate(()=>__testGame.prepareResidents());assert(await p.evaluate(()=>__testGame.opportunity()));
 if(touch)await p.locator('#touchAction').dispatchEvent('pointerdown',{pointerId:79,pointerType:'touch'});else await p.keyboard.press('e');
 await p.waitForFunction(()=>__testGame.opportunityState()==='COMPLETED');
 await p.evaluate(()=>__testGame.restart());

  await p.evaluate(()=>window.__testGame.prepareResidents());
  if(touch)await p.locator('#touchAction').dispatchEvent('pointerdown',{pointerId:72,pointerType:'touch'});else await p.keyboard.press('e');
  assert.equal((await p.evaluate(()=>window.__testGame.civilians())).rows[0][1],1,'Resident did not follow selected helper');
  if(process.env.BADFODDER_SCREENSHOTS)await p.screenshot({path:path.join(process.env.BADFODDER_SCREENSHOTS,'civilians-'+(touch?'touch':'desktop')+'.png')});
  await p.evaluate(()=>window.__testGame.evacuateResident());
  const outcome=await p.evaluate(()=>window.__testGame.civilians());assert(outcome.counts.evacuated>=1);assert.equal(outcome.optional,'COMPLETED');
  await p.evaluate(()=>window.__testGame.restart());
 }
 await page.locator('[data-view="missions"] [data-back]').click();
 if(process.env.BADFODDER_CABLE_ONLY){
  await select('#menuHistoricalCable');assert.equal((await active()).map,'cable-street');assert(await page.locator('#touchFire').isHidden());assert(await page.locator('#touchGrenade').isHidden());await page.evaluate(()=>{window.__testGame.prepare();window.__testGame.action();window.__testGame.step(1200)});await active();assert((await active()).progress.phaseIndex>0);await page.evaluate(()=>window.__testGame.battle());await page.keyboard.press('f');assert((await active()).streetActors.some(a=>a.attackKind==='shove'));await resultCycle(page,'cable-street');await pauseMenuResume();assert.deepEqual(errors,[]);console.log('PASS: Cable Street launch, materials, pressure, nonviolent actions, completion, restart and menu/resume.');return;
 }
 if(process.env.BADFODDER_BARCELONA_BALANCE){
  await select('#menuMissionBarcelona');
  for(const sample of [{},{wounded:true},{east:true},{east:true,low:true}]){const result=await page.evaluate(sample=>window.__testGame.barcelonaBattle(sample),sample);console.log('BALANCE '+JSON.stringify({...result,diagnostics:{runtimeFaults:result.diagnostics.runtimeFaults,navigation:result.diagnostics.navigation,director:result.diagnostics.director}}));assert.equal(result.diagnostics.runtimeFaults,0);if(!sample.east)assert(!result.roles.includes('COMMANDER'),'Early Barcelona must preserve authored roles');assert(result.peak<=(sample.east?6:4));assert(result.summary.characters.some(c=>c.alive));assert(result.maxQueue<=18);assert(result.maxBullets<80);assert(result.maxEffects<100);if(!sample.low)assert.equal(result.objective,sample.east?'counterattack':'recovery');}
  return;
 }
 if(process.env.BADFODDER_BARCELONA_ONLY){
  await select('#menuMissionBarcelona');assert.equal((await active()).map,'barcelona');await barcelonaCycle(page);await controllerSelection();await casualtyCycle(page);await pauseMenuResume();
  await page.setViewportSize({width:915,height:412});await militaryLayout(page);await barcelonaCycle(page,true);await page.evaluate(()=>window.__testGame.main());assert(/assets\/audio\/bad_fodder\.(?:webm|mp3)$/.test(await page.evaluate(()=>BadFodderMusic.source)));assert.deepEqual(errors,[]);console.log('PASS: Barcelona desktop/touch launch, equipment, objectives, contextual materials/reinforcement, friendly defence, finite completion, controller selection, casualty aid, pause/resume, restart and menu audio.');return;
 }
 for(const [button,map] of [['#menuMissionBad','bad-belzig'],['#menuMissionWigan','wigan']]){
  await page.locator('#menuMissionSelect').click();await page.locator(button).click();assert.equal((await page.evaluate(()=>window.__testGame.state())).menuOpen,true);assert(await page.locator('#briefingStory').isVisible());assert.equal(await page.locator('#briefingCharacters canvas').count(),4);await page.evaluate(()=>BadFodderArt.preloadMissionArt(document.getElementById('briefingTitle').textContent.toLowerCase()));if(process.env.BADFODDER_SCREENSHOTS)await page.screenshot({path:path.join(process.env.BADFODDER_SCREENSHOTS||'/tmp',map+'-briefing.png')});await page.locator('#briefingBack').click();assert(await page.locator(button).isVisible());await page.locator('[data-view="missions"] [data-back]').click();
  await select(button);assert.equal((await active()).map,map);
  const objectiveTransition=await page.evaluate(()=>window.__testGame.objectiveTransition());
  if(map==='bad-belzig'){
   assert.equal(objectiveTransition.stage,0);assert.equal(objectiveTransition.current,'phase-0');
   assert.equal(objectiveTransition.statuses['opening-contact'],'COMPLETED');assert.equal(objectiveTransition.statuses['opening-route'],'COMPLETED');assert.equal(objectiveTransition.statuses['phase-0'],'ACTIVE');
  }else{
   assert.equal(objectiveTransition.stage,1);assert.equal(objectiveTransition.current,'phase-1');assert.equal(objectiveTransition.statuses['phase-0'],'COMPLETED');assert.equal(objectiveTransition.statuses['phase-1'],'ACTIVE');assert.equal(objectiveTransition.statuses['phase-2'],'PENDING');
  }
  assert.equal((await page.evaluate(()=>window.__testGame.objectives())).manager.objectives[0].status,'ACTIVE','Restart must reset objective state');
  await controllerSelection();
  const characters=await page.evaluate(()=>window.__testGame.characters());
  assert.equal(new Set(characters.map(c=>c.id)).size,4);assert(characters.every(c=>c.occupation&&c.trait&&c.voiceSet&&c.healthState==='FIT'&&c.relationships.length));
  await casualtyCycle(page);await civilianCycle(page);await buildingCycle(page);
  const identity=await page.evaluate(()=>window.__testGame.identity());assert.equal(identity.year,map==='wigan'?1941:1945);assert.equal(await page.locator('#loadingEra').textContent(),identity.loading);assert((await page.locator('#hudSquadBar').textContent()).includes(identity.characters[0].name));assert(/assets\/audio\/mission\.(?:webm|mp3)$/.test(await page.evaluate(()=>BadFodderMusic.source)));
  const chips=page.locator('#hudSquadBar .hud-unit');
  await chips.nth(0).click();
  assert.deepEqual(await page.evaluate(()=>window.__testGame.state().units.map(u=>u.selected)),[true,false,false,false],'Portrait tap must isolate one soldier');
  await chips.nth(0).click();
  assert.deepEqual(await page.evaluate(()=>window.__testGame.state().units.map(u=>u.selected)),[false,true,true,true],'Tapping the lone selected soldier must switch to the other three');
  await page.locator('#hudAll').click();await chips.nth(0).click();await chips.nth(1).click();
  assert.deepEqual(await page.evaluate(()=>window.__testGame.state().units.map(u=>u.selected)),[true,true,false,false],'Two-soldier subgroup selection failed');
  const pairBefore=await page.evaluate(()=>window.__testGame.state().units.slice(0,2));
  await page.locator('#game').click({position:await page.evaluate(()=>window.__testGame.moveTarget())});await page.waitForTimeout(500);
  const pairAfter=await page.evaluate(()=>window.__testGame.state().units.slice(0,2));
  assert(pairAfter.every((u,i)=>Math.hypot(u.x-pairBefore[i].x,u.y-pairBefore[i].y)>1),'Selected pair did not move as a subgroup');
  await page.locator('#hudAll').click();
  const before=await page.evaluate(()=>window.__testGame.state().units[0]);
  await page.locator('#game').click({position:await page.evaluate(()=>window.__testGame.moveTarget())});await page.waitForTimeout(700);
  const after=await page.evaluate(()=>window.__testGame.state().units[0]);assert(Math.hypot(before.x-after.x,before.y-after.y)>1,'Click movement did not move leader');
  await page.mouse.click(660,550,{button:'right'});await page.keyboard.press('g');
  await page.waitForTimeout(600);await active();
  assert((await page.evaluate(()=>window.__testGame.adaptive())).enabled,'Military Director did not initialise');
  assert((await page.evaluate(()=>window.__testGame.adaptive())).commander,'Military Commander missing');
  await page.evaluate(()=>window.__testGame.directorFault());await active();
  assert(!(await page.evaluate(()=>window.__testGame.adaptive())).enabled,'Failed Director was not disabled');
  for(let i=0;i<3;i++)await pauseMenuResume();
  await page.evaluate(()=>window.__testGame.pause());await page.locator('#menuRestart').click();await active();
  if(process.env.BADFODDER_SCREENSHOTS)await page.screenshot({path:path.join(process.env.BADFODDER_SCREENSHOTS||'/tmp',map+'-upgrade.png')});
  await resultCycle(page,map);
  await page.evaluate(()=>window.__testGame.main());
  assert(/assets\/audio\/bad_fodder\.(?:webm|mp3)$/.test(await page.evaluate(()=>BadFodderMusic.source)));
 }
 assert.equal(await page.evaluate(()=>localStorage.getItem('badfodder.campaign.v1')),campaignBefore,'Direct selection changed campaign');
 await page.locator('#menuMissionSelect').click();await page.locator('#menuHistoricalCable').click();await page.locator('#briefingBegin').click();
 await page.waitForFunction(()=>window.__testGame?.state().started&&!window.__testGame.state().menuOpen,{},{timeout:90000});assert.equal((await active()).map,'cable-street');
 await page.waitForTimeout(500);if(process.env.BADFODDER_SCREENSHOTS)await page.screenshot({path:path.join(process.env.BADFODDER_SCREENSHOTS||'/tmp','cable-street-upgrade.png')});
 assert(await page.locator('#touchFire').isHidden());assert(await page.locator('#touchGrenade').isHidden());
 await page.evaluate(()=>{window.__testGame.prepare();window.__testGame.action();window.__testGame.step(1200)});await active();
 assert((await active()).progress.phaseIndex>0,'Pressure did not begin promptly after the build deadline');
 await page.evaluate(()=>window.__testGame.battle());await page.keyboard.press('f');assert((await active()).streetActors.some(a=>a.attackKind==='shove'),'Keyboard shove did not attack');
 await page.evaluate(()=>window.__testGame.battle());await page.keyboard.press('g');assert((await active()).streetActors.some(a=>a.attackKind==='throw'),'Keyboard debris did not attack');
 if(process.env.BADFODDER_SCREENSHOTS)await page.screenshot({path:path.join(process.env.BADFODDER_SCREENSHOTS||'/tmp','cable-street-fight.png')});
 assert((await page.evaluate(()=>window.__testGame.adaptive())).enabled);assert.equal((await page.evaluate(()=>window.__testGame.adaptive())).militaryEnemies,0);assert(!(await page.evaluate(()=>window.__testGame.adaptive())).commander);
 await page.evaluate(()=>window.__testGame.directorFault());await active();
 await resultCycle(page,'cable-street');
 assert(/assets\/audio\/cable_street\.(?:webm|mp3)$/.test(await page.evaluate(()=>BadFodderMusic.source)));
 await pauseMenuResume();await page.evaluate(()=>window.__testGame.pause());await page.locator('#menuRestart').click();await active();
 await page.evaluate(()=>window.__testGame.main());await page.locator('#menuMissionSelect').click();await page.locator('#menuHistoricalCable').click();await page.locator('#briefingBegin').click();await page.waitForFunction(()=>window.__testGame?.state().started&&!window.__testGame.state().menuOpen,{},{timeout:90000});await active();
 expectedRuntimeLogs=3;await page.evaluate(()=>window.__testGame.fault());assert(await page.locator('#menuResume').isHidden());assert(await page.locator('#menuMissionSelect').isVisible());await page.locator('#menuRestart').click();await active();
 expectedStartupLogs=1;await page.goto(url+'?failStartup=1',{waitUntil:'domcontentloaded'});await page.locator('#menuStart').click();await page.locator('#briefingBegin').click();await page.waitForFunction(()=>document.getElementById('menuStart').textContent==='CAMPAIGN UNAVAILABLE');assert(await page.locator('#menuResume').isHidden());assert(await page.locator('#loading').isHidden());await page.evaluate(()=>history.replaceState(null,'',location.pathname));await select('#menuMissionBad');await active();
 await page.evaluate(()=>window.__testGame.main());await page.locator('#menuStart').click();await page.locator('#briefingBegin').click();await page.waitForFunction(()=>window.__testGame?.state().started&&!window.__testGame.state().menuOpen,{},{timeout:90000});assert.equal((await active()).mode,'campaign');
 // Verify real campaign transitions retain Cable Street's specialised simulation.
 for(const map of ['wigan','cable-street']){
  await page.evaluate(()=>window.__testGame.complete());assert(await page.locator('#resultNext').isVisible());
  await page.locator('#resultNext').click();assert(await page.locator('#briefingBegin').isVisible());
  await page.locator('#briefingBegin').click();await page.waitForFunction(()=>window.__testGame?.state().started&&!window.__testGame.state().menuOpen,{},{timeout:90000});
  assert.equal((await active()).map,map);assert.equal((await active()).mode,'campaign');
 }
 assert(await page.locator('#touchFire').isHidden());assert((await active()).progress);
 await page.evaluate(()=>window.__testGame.complete());assert(await page.locator('#resultNext').isVisible());
 assert.deepEqual(await page.evaluate(()=>JSON.parse(BadFodderStorage.local.getItem('badfodder.campaign.v1')).completedIds),['bad-belzig','wigan','cable-street']);
 await page.locator('#resultNext').click();await page.locator('#briefingBegin').click();await page.waitForFunction(()=>window.__testGame?.state().started&&!window.__testGame.state().menuOpen,{},{timeout:90000});assert.equal((await active()).map,'barcelona');
 await barcelonaCycle(page);await controllerSelection();await pauseMenuResume();await page.evaluate(()=>window.__testGame.main());assert(/assets\/audio\/bad_fodder\.(?:webm|mp3)$/.test(await page.evaluate(()=>BadFodderMusic.source)));

 const mobile=await newPage({viewport:{width:915,height:412},...(browserName!=='firefox'?{isMobile:true}:{}),hasTouch:true});mobile.on('pageerror',e=>errors.push(e.message));await mobile.goto(url,{waitUntil:'domcontentloaded'});await mobile.locator('[data-presentation-skip]').click();await mobile.waitForFunction(()=>!!window.__testGame);await mobile.locator('#menuStart').click();await mobile.locator('#briefingBegin').click();await mobile.waitForFunction(()=>window.__testGame?.state().started&&!window.__testGame.state().menuOpen);
 await casualtyCycle(mobile,true);await civilianCycle(mobile,true);await buildingCycle(mobile,true);
 // Exercise pinch through real pointer listeners in every browser engine.
 const originalZoom=await mobile.evaluate(()=>window.__testGame.state().zoom);
 await mobile.evaluate(()=>{const c=document.getElementById('game'),r=c.getBoundingClientRect(),capture=c.setPointerCapture;c.setPointerCapture=()=>{};const fire=(type,id,x)=>c.dispatchEvent(new PointerEvent(type,{pointerId:id,pointerType:'touch',clientX:r.left+x,clientY:r.top+100,bubbles:true,buttons:type==='pointerup'?0:1}));fire('pointerdown',901,200);fire('pointerdown',902,300);fire('pointermove',902,360);fire('pointerup',901,200);fire('pointerup',902,360);c.setPointerCapture=capture;});
 assert((await mobile.evaluate(()=>window.__testGame.state().zoom))>originalZoom,'Pinch did not change zoom');
 await mobile.evaluate(()=>{document.querySelector('.viewport').requestFullscreen=async()=>{throw new Error('Test denial')};});await mobile.locator('#touchFull').click();assert(await mobile.evaluate(()=>document.body.classList.contains('mobile-fullscreen-fallback')),'Fullscreen denial did not use fallback');await militaryLayout(mobile);await mobile.locator('#touchFull').click();
 const joy=await mobile.locator('#touchJoystick').boundingBox(),before=await mobile.evaluate(()=>window.__testGame.state().units[0]);
 if(browserName==='chromium'){const touch=await mobile.context().newCDPSession(mobile);await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:joy.x+joy.width*.5,y:joy.y+joy.height*.2}]});await mobile.waitForTimeout(500);await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}else{
  // Firefox's touch context does not turn Playwright mouse presses into pointer events.
  // Exercise the same touch listeners, as in the cross-engine pinch test above.
  await mobile.evaluate(()=>{const el=document.getElementById('touchJoystick'),r=el.getBoundingClientRect();window.__capture=el.setPointerCapture;el.setPointerCapture=()=>{};el.dispatchEvent(new PointerEvent('pointerdown',{pointerId:903,pointerType:'touch',clientX:r.left+r.width*.5,clientY:r.top+r.height*.2,bubbles:true,buttons:1}));});
  assert((await mobile.evaluate(()=>__testGame.state().touch.moveMag))>.1,'Joystick did not accept touch input');
  await mobile.waitForTimeout(500);
  await mobile.evaluate(()=>{const el=document.getElementById('touchJoystick');el.dispatchEvent(new PointerEvent('pointerup',{pointerId:903,pointerType:'touch',bubbles:true}));el.setPointerCapture=window.__capture;});
 }
 const after=await mobile.evaluate(()=>window.__testGame.state().units[0]);assert(Math.hypot(before.x-after.x,before.y-after.y)>1,'Joystick did not move squad');await mobile.locator('#touchPause').click();await mobile.locator('#menuResume').click();if(process.env.BADFODDER_SCREENSHOTS)await mobile.screenshot({path:path.join(process.env.BADFODDER_SCREENSHOTS||'/tmp','mobile-upgrade.png')});
 await mobile.evaluate(()=>window.__testGame.main());await mobile.locator('#menuMissionSelect').click();await mobile.locator('#menuHistoricalCable').click();await mobile.locator('#briefingBegin').click();await mobile.waitForFunction(()=>window.__testGame?.state().started&&!window.__testGame.state().menuOpen,{},{timeout:90000});
 assert(await mobile.locator('#touchShove').isVisible());assert(await mobile.locator('#touchDebris').isVisible());assert(await mobile.locator('#touchFire').isHidden());
 await mobile.evaluate(()=>window.__testGame.battle());await assertTouchLayout(mobile,'cable-street');await mobile.locator('#touchShove').tap();assert((await mobile.evaluate(()=>window.__testGame.state())).streetActors.some(a=>a.attackKind==='shove'),'Touch shove did not attack');await mobile.evaluate(()=>window.__testGame.battle());await mobile.locator('#touchDebris').tap();assert((await mobile.evaluate(()=>window.__testGame.state())).streetActors.some(a=>a.attackKind==='throw'),'Touch debris did not attack');if(process.env.BADFODDER_SCREENSHOTS)await mobile.screenshot({path:path.join(process.env.BADFODDER_SCREENSHOTS||'/tmp','cable-street-mobile.png')});
 await mobile.evaluate(()=>window.__testGame.main());await mobile.locator('#menuMissionSelect').click();await mobile.locator('#menuMissionWigan').click();await mobile.locator('#briefingBegin').click();await mobile.waitForFunction(()=>window.__testGame?.state().started&&!window.__testGame.state().menuOpen,{},{timeout:90000});assert.equal((await mobile.evaluate(()=>window.__testGame.state())).map,'wigan');await mobile.locator('#touchPause').tap();await mobile.locator('#menuResume').tap();await resultCycle(mobile,'wigan-mobile');
 const fallback=await newPage({viewport:{width:390,height:844},hasTouch:true});fallback.on('pageerror',e=>errors.push(e.message));await fallback.route('**/assets/characters/**',route=>route.abort());await fallback.goto(url,{waitUntil:'domcontentloaded'});assert(await fallback.evaluate(()=>matchMedia('(orientation:portrait)').matches));if(process.env.BADFODDER_SCREENSHOTS)await fallback.screenshot({path:path.join(process.env.BADFODDER_SCREENSHOTS||'/tmp','portrait-landscape-required.png')});await fallback.setViewportSize({width:844,height:390});await fallback.locator('[data-presentation-skip]').click();await fallback.locator('#menuMissionSelect').click();await fallback.locator('#menuMissionBad').click();if(process.env.BADFODDER_SCREENSHOTS)await fallback.screenshot({path:path.join(process.env.BADFODDER_SCREENSHOTS||'/tmp','portrait-mobile-briefing.png')});assert(await fallback.locator('#briefingBegin').isVisible());await fallback.locator('#briefingBegin').click();await fallback.waitForFunction(()=>window.__testGame?.state().started&&!window.__testGame.state().menuOpen,{},{timeout:90000});assert.equal((await fallback.evaluate(()=>window.__testGame.state())).faults,0,'Missing optional art must use the procedural costume fallback');await fallback.close();
 await mobile.evaluate(()=>window.__testGame.main());await mobile.locator('#menuMissionSelect').click();await mobile.locator('#menuMissionBarcelona').click();await mobile.locator('#briefingBegin').click();await mobile.waitForFunction(()=>window.__testGame?.state().started&&!window.__testGame.state().menuOpen,{},{timeout:90000});await militaryLayout(mobile);await barcelonaCycle(mobile,true);
 // Close the long-lived touch page before opening another mission document. Firefox/Juggler can otherwise time out while tearing down media execution contexts after the Barcelona audio lifecycle.
 await mobile.close();
 const failedAssets=await newPage({viewport:{width:1280,height:900}});
 await failedAssets.addInitScript(()=>{if(!sessionStorage.getItem('asset-failure-test')){sessionStorage.setItem('asset-failure-test','1');sessionStorage.setItem('badfodder.launch.v1',JSON.stringify({mode:'select',index:1}));}});
 await failedAssets.route('**/wigan-map.js',r=>r.abort());await failedAssets.goto(url,{waitUntil:'domcontentloaded'});
 await failedAssets.locator('#missionLoadError').waitFor();await failedAssets.locator('#menuMissionSelect').click();await failedAssets.locator('#menuMissionBad').click();await failedAssets.waitForFunction(()=>!!window.__testGame);assert(!(await failedAssets.evaluate(()=>__testGame.state())).started,'Failed assets retry must return safely to menu');await failedAssets.close();
 assert.equal(expectedRuntimeLogs,0);assert.equal(expectedStartupLogs,0);
 assert.deepEqual(errors,[]);console.log('PASS: desktop startup, Campaign/direct selection, all four missions including Barcelona equipment/barricade/finite defence on desktop and touch, movement/combat, repeated Wigan menu/Resume, restart/re-entry, recovery restart, load failure escape keyboard/touch street attacks and mobile joystick/pause.');
 }catch(error){
 const dir=testInfo?.outputDir||path.resolve('test-results',browserName);fs.mkdirSync(dir,{recursive:true});
 fs.writeFileSync(path.join(dir,'failure.json'),JSON.stringify({browser:browserName,error:error.stack,logs},null,2));
 for(const [i,context] of contexts.entries()){for(const [j,page] of context.pages().entries())await page.screenshot({path:path.join(dir,`failure-${i}-${j}.png`)}).catch(()=>{});await context.tracing.stop({path:path.join(dir,`trace-${i}.zip`)}).catch(()=>{});}
 throw error;
 }finally{for(const c of contexts)await c.close();if(!providedBrowser)await browser.close();await new Promise(r=>server.close(r));}
}
module.exports={runLifecycle};
if(require.main===module)runLifecycle().catch(e=>{console.error(e);process.exitCode=1;server.close()});
