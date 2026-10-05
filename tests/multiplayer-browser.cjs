'use strict';
// Two real browsers + native DataChannels; Firebase REST is mocked locally, never billed.
const assert=require('node:assert/strict'),fs=require('node:fs'),http=require('node:http'),path=require('node:path');
const browsers=require(process.env.BADFODDER_PLAYWRIGHT||'playwright');
const browserName=process.env.BADFODDER_BROWSER||'chromium';
const root=path.resolve(__dirname,'..',process.env.BADFODDER_TEST_DIST==='1'?'dist':'.');
const injection=`const commandResults={};const coopExecute=BadFodderCoopBridge.execute;BadFodderCoopBridge.execute=c=>{const result=coopExecute(c);if(result)commandResults[c.type]=(commandResults[c.type]||0)+1;return result;};window.__coopTest={
 state:()=>({started,paused,menuOpen,finished,win,faults:runtimeFaultCount,stage:missionStage,hp:squad.map(s=>s.hp),units:squad.map(s=>({x:s.x,y:s.y,alive:s.alive,garrison:!!s.manualGarrison})),grenades:squadGrenades,bullets:bullets.length,director:!!adaptiveDirector,checkpoint:coopCheckpoint,commandResults,stats:BadFodderMissionStats.snapshot()}),
 target:(id)=>{const s=squad[id];for(const [dx,dy] of [[60,0],[-60,0],[0,60],[0,-60]])if(routeClear(s.x,s.y,s.x+dx,s.y+dy,NAV_RADIUS))return{x:s.x+dx,y:s.y+dy};throw Error('No open target')},
 death:(id)=>{squad[id].damageGrace=0;BadFodderHealth.finalise(squad[id])},
 kill:()=>{const e=enemies.find(e=>e.alive);applyDamage(e,100,e.x,e.y,2);BadFodderMissionStats.tick()},
 phase:()=>{missionObjectivesRuntime.syncPhase(1);missionStage=1;phaseHoldTime=1;enemyCommander.checkpointState().started=true;},complete:completeCurrentMission,fail:()=>{squad.forEach(s=>s.alive=false);checkFailure()},
 select:setSelection,localMove:p=>setMoveTargets(p),fire:p=>squadFireAt(p.x,p.y),grenade:p=>throwGrenade(p.x,p.y)
 ,health:()=>BadFodderHealth.snapshot(),down:()=>{adaptiveDirector=null;clearSquadFormation();squad.forEach(s=>{s.path=null;s.target=null});bullets=[];thrown=[];enemies.forEach(e=>e.cooldown=30);Object.assign(squad[2],{hp:8,alive:true,downed:false,healthState:'FIT',damageGrace:30});squad[0].x=squad[2].x-20;squad[0].y=squad[2].y;BadFodderHealth.down(squad[0]);},recover:()=>{Object.assign(squad[0],{hp:8,downed:false,stabilised:false,downUntil:null,healthState:'FIT'});}
};`;
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.webp':'image/webp','.png':'image/png','.mp3':'audio/mpeg'};
const server=http.createServer((req,res)=>{try{const name=decodeURIComponent(new URL(req.url,'http://local').pathname),file=path.join(root,name==='/'?'index.html':name);if(!file.startsWith(root+path.sep))throw Error();let data=fs.readFileSync(file);if(file.endsWith('index.html'))data=Buffer.from(data.toString().replace('  // BOOT_MISSION:',injection+'\n  // BOOT_MISSION:'));res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');res.end(data);}catch{res.writeHead(404);res.end();}});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const url='http://127.0.0.1:'+server.address().port;
 const browser=await browsers[browserName].launch({headless:true,...(browserName==='chromium'?{executablePath:process.env.BADFODDER_CHROMIUM,args:['--no-sandbox','--disable-dev-shm-usage','--allow-loopback-in-peer-connection']}:{} )});
 const contexts=[],logs=[];
 try{
 for(const index of [0,1]){console.log('Checking native co-op mission',index);
  const errors=[],pages=[],rooms=new Map();
  for(const mobile of [false,true]){
   const context=await browser.newContext(mobile?{viewport:{width:900,height:500},...(browserName==='firefox'?{}:{isMobile:true}),hasTouch:true}:{viewport:{width:1280,height:900}});
   await context.addInitScript(({index})=>{sessionStorage.setItem('badfodder.presentation.prompted.v1','1');sessionStorage.setItem('badfodder.launch.v1',JSON.stringify({mode:'select',index}));const Native=RTCPeerConnection;window.RTCPeerConnection=class extends Native{constructor(config){super({...config,iceServers:[]});}};},{index});
   const p=await context.newPage();const slot=pages.length;pages.push(p);
   if(process.env.BADFODDER_COOP_MOCK_RTC==='1'){
    await p.exposeFunction('__coopTestSend',async(label,raw)=>{const other=pages[1-slot];if(other&&!other.isClosed())await other.evaluate(({label,raw})=>window.__fakeDeliver(label,raw),{label,raw});});
    await p.exposeFunction('__coopTestConnect',async()=>{for(const other of pages)await other.evaluate(()=>window.__fakeConnect());});
    await p.exposeFunction('__coopTestClose',async()=>{const other=pages[1-slot];if(other&&!other.isClosed())await other.evaluate(()=>window.__fakeDisconnect());});
    await p.addInitScript(()=>{
     let channels={},pending={};let rtc;
     const channel=label=>channels[label]||(channels[label]={label,readyState:'connecting',bufferedAmount:0,send(raw){void window.__coopTestSend(label,raw)},close(){this.readyState='closed'}});
     window.__fakeDeliver=(label,raw)=>{const c=channel(label);if(c.onmessage)c.onmessage({data:raw});else(pending[label]||=[]).push(raw);};
     window.__fakeConnect=()=>{rtc.connectionState='connected';for(const label of ['control','state']){const c=channel(label);if(!c.onmessage)rtc.ondatachannel?.({channel:c});c.readyState='open';c.onopen?.();for(const raw of pending[label]||[])c.onmessage?.({data:raw});pending[label]=[];}rtc.onconnectionstatechange?.();};
     window.__fakeDisconnect=()=>{if(!rtc)return;rtc.connectionState='failed';rtc.onconnectionstatechange?.();};
     window.RTCPeerConnection=class{constructor(){channels={};pending={};rtc=this;this.connectionState='new';this.iceGatheringState='complete';}createDataChannel(label){return channel(label)}async createOffer(){return {type:'offer',sdp:'test-offer'}}async createAnswer(){return {type:'answer',sdp:'test-answer'}}async setLocalDescription(sdp){this.localDescription=sdp;}async setRemoteDescription(sdp){this.remoteDescription=sdp;if(sdp.type==='answer')await window.__coopTestConnect();}close(){this.connectionState='closed';void window.__coopTestClose();}};
    });
   }
   contexts.push(p.context());await p.context().tracing.start({screenshots:true,snapshots:true,sources:true});p.on('pageerror',e=>{errors.push(e.message);logs.push({type:'pageerror',text:e.message})});p.on('console',m=>{if(m.type()==='error')logs.push({type:'console',text:m.text()})});
   await p.route('**/multiplayer-config.json',r=>r.fulfill({contentType:'application/json',body:JSON.stringify({databaseURL:'https://coop-test.firebaseio.com'})}));
   await p.route('https://coop-test.firebaseio.com/**',async r=>{
    const req=r.request(),parts=new URL(req.url()).pathname.split('/'),code=parts[2],key=parts[3]?.replace('.json','');let data=null,status=200;
    if(req.method()==='PUT'){const value=JSON.parse(req.postData());if(key){data=rooms.get(code);if(!data)status=404;else data[key]=value;}else{rooms.set(code.replace('.json',''),value);data=value;}}
    else if(req.method()==='DELETE')rooms.delete(code.replace('.json',''));else data=rooms.get(code.replace('.json',''))||null;
    await r.fulfill({status,contentType:'application/json',body:JSON.stringify(data)});
   });
   await p.goto(url,{waitUntil:'domcontentloaded'});await p.waitForFunction(()=>!!window.__coopTest);assert.equal(await p.evaluate(()=>typeof BadFodderCoop),'undefined','Single player must not initialise networking');
   await p.locator('#menuMultiplayer').click();await p.locator('#coopHost').waitFor();
  }
  const [host,client]=pages;
  console.log('Creating room');await host.locator('#coopHost').click();await host.waitForFunction(()=>document.querySelector('#coopRoom').value.startsWith('RABBIT-'));
  const code=await host.locator('#coopRoom').inputValue();await client.locator('#coopRoom').fill(code);await client.locator('#coopJoin').click();
  console.log('Joining room',code);
  await Promise.all(pages.map(p=>p.locator('#coopReady').waitFor({state:'visible',timeout:30000})));
  for(const p of pages)assert.equal(await p.locator('#coopLobbyRoster .coop-lobby-unit').count(),4,'Ready room did not show four soldiers');
  await Promise.all(pages.map(p=>p.locator('#coopReady').click()));
  await Promise.all(pages.map(p=>p.waitForFunction(()=>__coopTest.state().started&&!__coopTest.state().menuOpen&&BadFodderCommands.mode!=='local',{},{timeout:120000}))).catch(async e=>{for(const p of pages)console.error(await p.evaluate(()=>({status:document.getElementById('coopStatus')?.textContent,state:__coopTest.state(),mode:BadFodderCommands.mode})));throw e;});
  for(const p of pages){await p.locator('#coopLiveHud').waitFor();assert(await p.locator('#coopQuality').isVisible());assert(await p.locator('#coopTeammate').isVisible());assert(await p.locator('#coopPingButton').isVisible());}
  await client.evaluate(()=>BadFodderCoop.setPing('help'));await host.waitForFunction(()=>document.querySelector('#coopToast')?.textContent.includes('P2 · HELP!'));
  await client.waitForFunction(()=>__coopTest.state().units[0].x===__coopTest.state().units[0].x);
  assert(await host.evaluate(()=>__coopTest.state().director));assert(!(await client.evaluate(()=>__coopTest.state().director)),'Client started competing Director');
  const rejectedTarget=await host.evaluate(()=>__coopTest.target(0));await client.evaluate(p=>BadFodderCoop.command({type:'move',units:[0],...p}),rejectedTarget);await client.waitForTimeout(120);assert.equal(await host.evaluate(()=>__coopTest.state().commandResults.move||0),0,'P2 controlled P1');
  await client.evaluate(()=>__coopTest.select(0));assert(await client.evaluate(()=>BadFodderCommands.units(BadFodderCoopBridge.squad(),0).length===0));
  await client.evaluate(()=>__coopTest.select(2));const before=await client.evaluate(()=>__coopTest.state().units[2]);const target=await host.evaluate(()=>__coopTest.target(2));
  await client.evaluate(p=>__coopTest.localMove(p),target);await host.waitForFunction(({before})=>Math.hypot(__coopTest.state().units[2].x-before.x,__coopTest.state().units[2].y-before.y)>5,{before});
  await client.waitForFunction(({before})=>Math.hypot(__coopTest.state().units[2].x-before.x,__coopTest.state().units[2].y-before.y)>5,{before});
  await client.evaluate(()=>BadFodderCoop.garrison());await host.waitForFunction(()=>__coopTest.state().units[2].garrison);await client.waitForFunction(()=>__coopTest.state().units[2].garrison);
  const grenades=await host.evaluate(()=>__coopTest.state().grenades);await client.evaluate(()=>{const u=BadFodderCoopBridge.squad()[2];__coopTest.fire({x:u.x+30,y:u.y});__coopTest.grenade({x:u.x+20,y:u.y});});await host.waitForFunction(n=>__coopTest.state().grenades<n,grenades);await client.waitForFunction(n=>__coopTest.state().grenades<n,grenades);assert((await host.evaluate(()=>__coopTest.state().commandResults.fire))>=1,'Remote fire did not reach normal combat');assert((await host.evaluate(()=>__coopTest.state().commandResults.grenade))>=1);

  await host.evaluate(()=>__coopTest.down());await client.waitForFunction(()=>__coopTest.health()[0][1]&&BadFodderHealth.contextualLabel()==='STABILISE');
  await client.keyboard.press('e');await host.waitForFunction(()=>__coopTest.health()[0][2]);
  await client.keyboard.press('e');await host.waitForFunction(()=>__coopTest.health()[2][5]===0);await client.waitForFunction(()=>__coopTest.health()[0][4]===2);
  await client.keyboard.press('e');await host.waitForFunction(()=>__coopTest.health()[2][5]===null);await host.evaluate(()=>__coopTest.recover());
  await host.evaluate(()=>{__coopTest.kill();__coopTest.phase();__coopTest.death(2);});await client.waitForFunction(()=>!__coopTest.state().units[2].alive&&__coopTest.state().stage===1&&__coopTest.state().checkpoint?.started);assert((await client.evaluate(()=>__coopTest.state().stats))[2].kills>=1);
  await host.evaluate(()=>__coopTest.death(3));await client.waitForFunction(()=>!__coopTest.state().units[3].alive);assert.equal(await client.evaluate(()=>BadFodderCommands.units(BadFodderCoopBridge.squad(),'all').length),0,'Dead P2 gained control of P1');
  await host.evaluate(()=>__coopTest.complete());await client.waitForFunction(()=>__coopTest.state().finished&&__coopTest.state().win);
  assert.equal(await client.locator('.mission-stat-card').count(),4);const report=await client.locator('.mission-stat-report').textContent();assert(report.includes('P2')&&report.includes('ASSISTS'),'Multiplayer result report lacks ownership/assists');
  await client.waitForTimeout(1900);
  await host.locator('#resultRetry').click();await Promise.all(pages.map(p=>p.waitForFunction(()=>!__coopTest.state().finished&&!__coopTest.state().menuOpen)));
  await host.evaluate(()=>__coopTest.fail());await client.waitForFunction(()=>__coopTest.state().finished&&!__coopTest.state().win);assert.equal(await client.locator('.mission-stat-card.kia').count(),4);
  await host.locator('#resultRetry').click();await host.waitForFunction(()=>!__coopTest.state().finished);await client.evaluate(()=>BadFodderCoopBridge.menu());await host.waitForFunction(()=>BadFodderCoop.diagnostics().connection==='disconnected');
  await host.evaluate(()=>{__coopTest.select(0);__coopTest.localMove(__coopTest.target(0));});assert.equal(await host.evaluate(()=>__coopTest.state().faults),0);await host.evaluate(()=>BadFodderCoopBridge.menu());assert.equal(await host.evaluate(()=>BadFodderCommands.mode),'local');assert.equal(await host.evaluate(()=>BadFodderCommands.units(BadFodderCoopBridge.squad(),'all').length),4);assert.deepEqual(errors,[]);
  if(index===0){
   await host.locator('#menuMultiplayer').click();await host.locator('#coopManual').click();await host.locator('#coopManualHost').click();await host.waitForFunction(()=>document.querySelector('#coopOutgoing').value.length>0);
   const offer=await host.locator('#coopOutgoing').inputValue();await client.locator('#menuMultiplayer').click();await client.locator('#coopManual').click();await client.locator('#coopIncoming').fill(offer);await client.locator('#coopApply').click();await client.waitForFunction(()=>document.querySelector('#coopOutgoing').value.length>0);
   await host.locator('#coopIncoming').fill(await client.locator('#coopOutgoing').inputValue());await host.locator('#coopApply').click();
   await Promise.all(pages.map(p=>p.locator('#coopReady').waitFor({state:'visible',timeout:30000})));await Promise.all(pages.map(p=>p.locator('#coopReady').click()));
   await Promise.all(pages.map(p=>p.waitForFunction(()=>__coopTest.state().started&&!__coopTest.state().menuOpen&&BadFodderCommands.mode!=='local')));
   await host.evaluate(()=>BadFodderCoopBridge.menu());await client.waitForFunction(()=>BadFodderCommands.mode==='local');
   await host.route('**/multiplayer-config.json',r=>r.fulfill({contentType:'application/json',body:'{}'}));await host.route('**/__/firebase/init.json',r=>r.fulfill({contentType:'application/json',body:JSON.stringify({databaseURL:''})}));
   await host.locator('#menuMultiplayer').click();await host.locator('#coopHost').click();await host.waitForFunction(()=>document.querySelector('#coopStatus').textContent.includes('NOT CONFIGURED'));assert(await host.locator('#coopManualFields').isVisible());await host.locator('#coopReturn').click();assert.equal(await host.evaluate(()=>BadFodderCommands.mode),'local');assert.equal(await host.evaluate(()=>BadFodderCommands.units(BadFodderCoopBridge.squad(),'all').length),4);assert.deepEqual(errors,[]);
   console.log('PASS: manual offer/reply ready-room and missing-Firebase fallback preserve single player.');
  }
  for(const p of pages)await p.context().close();console.log('PASS: '+(process.env.BADFODDER_COOP_MOCK_RTC==='1'?'test-transport':'native')+' two-browser co-op '+(index?'Wigan':'Belzig')+' with ready-room, teammate HUD, pings, commands, garrison, deaths, assists, results and disconnect.');
 }
 }catch(error){const dir=path.resolve('test-results/coop');fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,'failure.json'),JSON.stringify({browser:'chromium',error:error.stack,logs},null,2));for(const [i,c] of contexts.entries()){for(const [j,p] of c.pages().entries())await p.screenshot({path:path.join(dir,`failure-${i}-${j}.png`)}).catch(()=>{});await c.tracing.stop({path:path.join(dir,`trace-${i}.zip`)}).catch(()=>{});}throw error;
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1});
