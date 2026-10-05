'use strict';
// Optional real-browser suite: npm install, npx playwright install chromium, npm run test:browser.
const assert=require('node:assert/strict'),fs=require('node:fs'),http=require('node:http'),path=require('node:path');
const {chromium,firefox,webkit}=require(process.env.BADFODDER_PLAYWRIGHT||'playwright');
const root=path.resolve(__dirname,'..',process.env.BADFODDER_TEST_DIST==='1'?'dist':'.');
const engine=({chromium,firefox,webkit})[process.env.BADFODDER_BROWSER||'chromium'];
const injection=`
window.__testGame={state:()=>({started,paused,menuOpen,finished,runtimeSafeStop,lifecycle:lifecycle.state,zoom,map:MAP_DATA.key,mode:missionLaunch.mode(),faults:runtimeFaultCount,touch:{...touchState},units:squad.map(s=>({x:s.x,y:s.y,hp:s.hp,selected:s.selected,garrison:!!s.manualGarrison,building:s.insideBuilding||null})),progress:missionDirector?.snapshot(),controllerDisposed:missionController?.disposed,streetActors:missionController?[...missionController.state.actors.values()].map(a=>({stamina:a.stamina,attackKind:a.attackKind})):[]}),
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
objectiveTransition:()=>{const first=currentObjectivePhase(),zone=phaseZone(first);enemies.forEach(e=>e.alive=false);squad.forEach(s=>{s.x=zone.x;s.y=zone.y});updateMissionProgress(first.hold||.1);const result={stage:missionStage,statuses:missionObjectivesRuntime.manager.all().filter(o=>!o.optional).map(o=>o.status)};resetGame();return result},
adaptive:()=>({enabled:!!adaptiveDirector&&!adaptiveDirector.state.disabled,decisions:adaptiveDirector?.state.decisions,commander:!!enemyCommander,militaryEnemies:enemies.length}),
directorFault:()=>{adaptiveDirector.update=()=>{throw new Error('Injected optional Director fault')};simulateStep(1/60)},

prepare:()=>{if(missionController){const b=[...missionController.state.barricades.values()][0];Object.assign(squad[0],b.workPoints[0]);missionInteractionLayer.syncActors(squad.map((s,i)=>({id:'player-'+i,x:s.x,y:s.y,active:true})));}}, action:performHistoricalNearestAction,
battle:()=>{resetGame();missionDirector.enterPhase(1);const b=[...missionController.state.barricades.values()][0],f=[...missionController.state.formations.values()][0];Object.assign(f,{x:b.workPoints[0].x+35,y:b.workPoints[0].y,state:'dismantle',stateTime:0,resistance:0});squad.forEach((s,i)=>{Object.assign(s,{x:b.workPoints[0].x,y:b.workPoints[0].y+i*5,path:null,target:null});missionInteractionLayer.cancelJob('player-'+i)});missionInteractionLayer.syncActors(squad.map((s,i)=>({id:'player-'+i,x:s.x,y:s.y,active:true})));missionController.state.actors.forEach(a=>{a.stamina=100;a.attackCooldown=0;a.stunned=0});setSelection('all');cursorWorld=null;updateHud(true)}};

`;
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.webp':'image/webp','.mp3':'audio/mpeg','.json':'application/json'};
const server=http.createServer((req,res)=>{
 const file=path.join(root,decodeURIComponent(new URL(req.url,'http://local').pathname==='/'?'/index.html':new URL(req.url,'http://local').pathname));
 if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end()}
 try{let data=fs.readFileSync(file);if(file.endsWith('index.html')){let html=data.toString().replace('  // BOOT_MISSION:',injection+'\n  // BOOT_MISSION:');if(req.url.includes('failStartup=1'))html=html.replace('      await preload();',"      throw new Error('Injected startup failure');");data=Buffer.from(html)}res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');if(req.headers.range&&file.endsWith('.mp3')){const m=/bytes=(\d+)-(\d*)/.exec(req.headers.range),start=Number(m?.[1]||0),end=Math.min(data.length-1,m?.[2]?Number(m[2]):data.length-1);res.writeHead(206,{'Accept-Ranges':'bytes','Content-Range':`bytes ${start}-${end}/${data.length}`,'Content-Length':end-start+1});return res.end(data.subarray(start,end+1));}res.setHeader('Content-Length',data.length);res.end(data)}catch{res.writeHead(404);res.end()}
});
async function runLifecycle(providedBrowser, testInfo){
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const url='http://127.0.0.1:'+server.address().port;
 const browser=providedBrowser||await engine.launch({headless:true});
 const browserName=testInfo?.project.name||process.env.BADFODDER_BROWSER||'chromium';
 const contexts=[],logs=[];
 const newPage=async options=>{const context=await browser.newContext(options);contexts.push(context);await context.tracing.start({screenshots:true,snapshots:true,sources:true});const page=await context.newPage();page.on('console',m=>{if(['error','warning'].includes(m.type()))logs.push({type:m.type(),text:m.text()})});page.on('pageerror',e=>logs.push({type:'pageerror',text:e.message}));return page;};
 try{
 const page=await newPage({viewport:{width:1280,height:900}}),errors=[],requests=[];page.on('request',r=>requests.push(r.url()));let expectedRuntimeLogs=0,expectedStartupLogs=0;
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()!=='error')return;const t=m.text();if(expectedRuntimeLogs&&t.startsWith('If I Can Shoot Rabbits runtime fault')){expectedRuntimeLogs--;return;}if(expectedStartupLogs&&t.startsWith('If I Can Shoot Rabbits failed to start')){expectedStartupLogs--;return;}errors.push(t)});
 await page.goto(url,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>!!window.__testGame);await page.locator('#menuMissionSelect').click();assert.equal((await page.evaluate(()=>window.__testGame.state())).started,false,'Boot must wait for Begin Mission');assert(!requests.some(u=>/wigan-(map|details|scenery)|cable-street-(map|runtime|interactions|director|crowd|art)/.test(u)),'Startup loaded an unused mission');
 assert.equal(await page.locator('#menuMissionBad').isVisible(),true);assert.equal(await page.locator('#menuMissionWigan').isVisible(),true);assert.equal(await page.locator('#menuHistoricalCable').isVisible(),true);assert.equal(await page.locator('#menuHistorical').count(),0);
 const campaignBefore=await page.evaluate(()=>localStorage.getItem('badfodder.campaign.v1'));
 async function select(button){console.log('Checking',button);await page.locator('#menuMissionSelect').click();await page.locator(button).click();assert(await page.locator('#briefingBegin').isVisible());await page.locator('#briefingBegin').click();await page.waitForFunction(()=>window.__testGame?.state().started&&!window.__testGame.state().menuOpen,{},{timeout:90000})}
 async function active(){const state=await page.evaluate(()=>window.__testGame.state());assert(state.started&&!state.menuOpen&&!state.paused&&!state.runtimeSafeStop);assert.equal(state.faults,0);assert.equal(state.lifecycle,'PLAYING');return state}
 async function resultCycle(p,map){await p.evaluate(()=>window.__testGame.fail());assert(await p.locator('#resultRetry').isVisible());const id=await p.evaluate(()=>window.__testGame.identity());assert.equal(await p.locator('#resultTitle').textContent(),id.failure);await p.locator('#resultBriefing').click();assert(await p.locator('#briefingBegin').isVisible());await p.locator('#briefingBack').click();await p.locator('#resultRetry').click();await p.waitForFunction(()=>!window.__testGame.state().menuOpen&&!window.__testGame.state().finished);assert(await p.locator('#briefingBegin').isHidden());await p.evaluate(()=>window.__testGame.complete());assert.equal(await p.locator('#resultTitle').textContent(),id.victory[0]);if(process.env.BADFODDER_SCREENSHOTS)await p.screenshot({path:path.join(process.env.BADFODDER_SCREENSHOTS||'/tmp',map+'-result.png')});await p.locator('#resultRetry').click();}
 async function pauseMenuResume(){await page.evaluate(()=>window.__testGame.pause());await page.locator('#menuMain').click();assert(await page.locator('#menuResume').isVisible());await page.locator('#menuResume').click();await active()}
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
 for(const [button,map] of [['#menuMissionBad','bad-belzig'],['#menuMissionWigan','wigan']]){
  await page.locator('#menuMissionSelect').click();await page.locator(button).click();assert.equal((await page.evaluate(()=>window.__testGame.state())).menuOpen,true);assert(await page.locator('#briefingStory').isVisible());assert.equal(await page.locator('#briefingCharacters canvas').count(),4);await page.evaluate(()=>BadFodderArt.preloadMissionArt(document.getElementById('briefingTitle').textContent.toLowerCase()));if(process.env.BADFODDER_SCREENSHOTS)await page.screenshot({path:path.join(process.env.BADFODDER_SCREENSHOTS||'/tmp',map+'-briefing.png')});await page.locator('#briefingBack').click();assert(await page.locator(button).isVisible());await page.locator('[data-view="missions"] [data-back]').click();
  await select(button);assert.equal((await active()).map,map);
  const objectiveTransition=await page.evaluate(()=>window.__testGame.objectiveTransition());
  assert.equal(objectiveTransition.stage,1);assert.deepEqual(objectiveTransition.statuses,['COMPLETED','ACTIVE','PENDING']);
  assert.equal((await page.evaluate(()=>window.__testGame.objectives())).manager.objectives[0].status,'ACTIVE','Restart must reset objective state');
  await controllerSelection();
  const characters=await page.evaluate(()=>window.__testGame.characters());
  assert.equal(new Set(characters.map(c=>c.id)).size,4);assert(characters.every(c=>c.occupation&&c.trait&&c.voiceSet&&c.healthState==='FIT'&&c.relationships.length));
  await casualtyCycle(page);await civilianCycle(page);await buildingCycle(page);
  const identity=await page.evaluate(()=>window.__testGame.identity());assert.equal(identity.year,map==='wigan'?1941:1945);assert.equal(await page.locator('#loadingEra').textContent(),identity.loading);assert((await page.locator('#hudSquadBar').textContent()).includes(identity.characters[0].name));assert((await page.evaluate(()=>BadFodderMusic.source)).endsWith('assets/audio/mission.mp3'));
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
  assert((await page.evaluate(()=>BadFodderMusic.source)).endsWith('assets/audio/bad_fodder.mp3'));
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
 assert((await page.evaluate(()=>BadFodderMusic.source)).endsWith('assets/audio/cable_street.mp3'));
 await pauseMenuResume();await page.evaluate(()=>window.__testGame.pause());await page.locator('#menuRestart').click();await active();
 await page.evaluate(()=>window.__testGame.main());await page.locator('#menuMissionSelect').click();await page.locator('#menuHistoricalCable').click();await page.locator('#briefingBegin').click();await page.waitForFunction(()=>window.__testGame?.state().started&&!window.__testGame.state().menuOpen,{},{timeout:90000});await active();
 expectedRuntimeLogs=3;await page.evaluate(()=>window.__testGame.fault());assert(await page.locator('#menuResume').isHidden());assert(await page.locator('#menuMissionSelect').isVisible());await page.locator('#menuRestart').click();await active();
 expectedStartupLogs=1;await page.goto(url+'?failStartup=1',{waitUntil:'domcontentloaded'});await page.locator('#menuStart').click();await page.locator('#briefingBegin').click();await page.waitForFunction(()=>document.getElementById('menuStart').textContent==='CAMPAIGN UNAVAILABLE');assert(await page.locator('#menuResume').isHidden());assert(await page.locator('#loading').isHidden());await page.evaluate(()=>history.replaceState(null,'',location.pathname));await select('#menuMissionBad');await active();
 await page.evaluate(()=>window.__testGame.main());await page.locator('#menuStart').click();await page.locator('#briefingBegin').click();await page.waitForFunction(()=>window.__testGame?.state().started&&!window.__testGame.state().menuOpen,{},{timeout:90000});assert.equal((await active()).mode,'campaign');
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
 const failedAssets=await newPage({viewport:{width:1280,height:900}});
 await failedAssets.addInitScript(()=>{if(!sessionStorage.getItem('asset-failure-test')){sessionStorage.setItem('asset-failure-test','1');sessionStorage.setItem('badfodder.launch.v1',JSON.stringify({mode:'select',index:1}));}});
 await failedAssets.route('**/wigan-map.js',r=>r.abort());await failedAssets.goto(url,{waitUntil:'domcontentloaded'});
 await failedAssets.locator('#missionLoadError').waitFor();await failedAssets.locator('#menuMissionSelect').click();await failedAssets.locator('#menuMissionBad').click();await failedAssets.waitForFunction(()=>!!window.__testGame);assert(!(await failedAssets.evaluate(()=>__testGame.state())).started,'Failed assets retry must return safely to menu');await failedAssets.close();
 assert.equal(expectedRuntimeLogs,0);assert.equal(expectedStartupLogs,0);
 assert.deepEqual(errors,[]);console.log('PASS: desktop startup, Campaign/direct selection, all three missions, movement/combat, repeated Wigan menu/Resume, restart/re-entry, recovery restart, load failure escape keyboard/touch street attacks and mobile joystick/pause.');
 }catch(error){
 const dir=testInfo?.outputDir||path.resolve('test-results',browserName);fs.mkdirSync(dir,{recursive:true});
 fs.writeFileSync(path.join(dir,'failure.json'),JSON.stringify({browser:browserName,error:error.stack,logs},null,2));
 for(const [i,context] of contexts.entries()){for(const [j,page] of context.pages().entries())await page.screenshot({path:path.join(dir,`failure-${i}-${j}.png`)}).catch(()=>{});await context.tracing.stop({path:path.join(dir,`trace-${i}.zip`)}).catch(()=>{});}
 throw error;
 }finally{for(const c of contexts)await c.close();if(!providedBrowser)await browser.close();await new Promise(r=>server.close(r));}
}
module.exports={runLifecycle};
if(require.main===module)runLifecycle().catch(e=>{console.error(e);process.exitCode=1;server.close()});
