'use strict';
// Focused real-browser input and runtime checks, using the existing mission fixtures.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require(process.env.BADFODDER_PLAYWRIGHT||'playwright'),root=path.resolve(__dirname,'..');
const old=fs.readFileSync(path.join(__dirname,'browser-lifecycle.cjs'),'utf8'),injection=old.slice(old.indexOf('const injection=`')+17,old.indexOf('\nconst types=' )).trim().replace(/`;$/,'');
const extra=`window.__controls={
 read:()=>({map:MAP_DATA.key,active:commands.active(),order:companions.order,units:squad.map(u=>({x:u.x,y:u.y,selected:u.selected,alive:u.alive,downed:u.downed,path:!!u.path,ai:companions.isCompanion(u),state:u.companionState,cover:!!u.checkpointCover})),faults:runtimeFaultTotal,bullets:bullets.length,firearms:actionAllowed('firearms')}),
 quiet:()=>{enemies.forEach(e=>e.alive=false);squad.forEach(u=>u.damageGrace=100000);adaptiveDirector?.disable();},
 step:n=>{for(let i=0;i<n&&!finished;i++)simulateStep(1/60);updateHud(true)},
 target:()=>{const u=selectedUnits()[0];for(const [dx,dy]of [[80,0],[-80,0],[0,80],[0,-80]])if(routeClear(u.x,u.y,u.x+dx,u.y+dy,NAV_RADIUS))return{x:u.x+dx,y:u.y+dy};throw Error('No target')},
 asHost:()=>{commands.configure('host');companions.reset();setSelection(0)},
 asClient:()=>{commands.configure('client');companions.reset()},
 remote:c=>{if(!BadFodderCoopProtocol.validCommand(c,{player:1,claims:commands.snapshot(),squad,active:true,w:WORLD_W,h:WORLD_H}))return false;return BadFodderCoopBridge.execute({...c,player:1})},
 packet:()=>BadFodderCoopProtocol.snapshot(BadFodderCoopBridge.capture(),1),
 receive:p=>BadFodderCoopBridge.receive(BadFodderCoopProtocol.readSnapshot(p)),
 disconnect:()=>BadFodderCoopBridge.disconnect(1),
 move:setMoveTargets,
 directCheck:()=>{const before=squad.map(u=>JSON.stringify(u.navDestination)),id=commands.active();setMoveTargets(__controls.target());return squad.map((u,i)=>before[i]!==JSON.stringify(u.navDestination)?i:-1).filter(i=>i>=0);},
 cover:()=>{const u=selectedUnits()[0];Object.assign(u,{checkpointGarrison:0,checkpointCover:true,checkpointAnchorX:u.x,checkpointAnchorY:u.y,checkpointAnchorPhase:0});},
 down:()=>{BadFodderHealth.down(selectedUnits()[0]);companions.ensureActive();updateSquad(1/60);updateHud(true)},
 saved:()=>companions.snapshot(),restore:v=>companions.restore(v),
 walk:zone=>{const z=zones[zone];setMoveTargets(z);for(let i=0;i<2400&&!finished;i++)simulateStep(1/60);updateCamera(1);updateHud(true);return{distance:Math.hypot(squad[commands.active()].x-z.x,squad[commands.active()].y-z.y),units:squad.map(u=>({x:u.x,y:u.y})),objective:missionObjectivesRuntime.manager.current()?.id};}
};`;
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.webp':'image/webp','.json':'application/json','.mp3':'audio/mpeg','.webm':'audio/webm'};
const server=http.createServer((req,res)=>{try{const file=path.join(root,new URL(req.url,'http://local').pathname==='/'?'index.html':decodeURIComponent(new URL(req.url,'http://local').pathname));if(!file.startsWith(root+path.sep))throw Error();let data=fs.readFileSync(file);if(file.endsWith('index.html'))data=Buffer.from(data.toString().replace('  // BOOT_MISSION:',injection+extra+'\n  // BOOT_MISSION:'));res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');res.end(data)}catch{res.writeHead(404);res.end()}});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({headless:true,executablePath:process.env.BADFODDER_CHROMIUM_EXECUTABLE});const errors=[];
 try{
 const context=await browser.newContext({viewport:{width:1280,height:900}});await context.addInitScript(()=>sessionStorage.setItem('badfodder.presentation.prompted.v1','1'));const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&!m.text().includes('404'))errors.push(m.text())});await page.goto('http://127.0.0.1:'+server.address().port+'?seed=companion-smoke&debug=1');
 const read=()=>page.evaluate(()=>__controls.read());
 const screenshots=process.env.BADFODDER_SCREENSHOTS||'/tmp/companion-current';fs.mkdirSync(screenshots,{recursive:true});
 for(const [button,map]of [['#menuMissionBad','bad-belzig'],['#menuMissionWigan','wigan'],['#menuHistoricalCable','cable-street'],['#menuMissionBarcelona','barcelona']]){
  await page.locator('#menuMissionSelect').click();await page.locator(button).click();await page.locator('#briefingBegin').click();await page.waitForFunction(()=>window.__controls&&__testGame.state().started&&!__testGame.state().menuOpen,{},{timeout:90000});
  let s=await read();assert.equal(s.map,map);assert.equal(s.units.filter(u=>u.selected).length,1);assert.equal(s.units.filter(u=>u.ai).length,3);
  await page.locator('#hudSquadBar .hud-unit').nth(1).click();assert.equal((await read()).active,1);await page.keyboard.press('Tab');assert.equal((await read()).active,2);await page.keyboard.press('1');assert.equal((await read()).active,0);
  await page.evaluate(()=>__controls.quiet());await page.locator('#companionHOLD').click();const saved=await page.evaluate(()=>__controls.saved());assert.equal(saved.order,'HOLD');
  assert.deepEqual(await page.evaluate(()=>__controls.directCheck()),[0],'Direct movement writes exactly one destination');await page.evaluate(()=>__controls.step(120));
  await page.locator('#companionFOLLOW').click();await page.evaluate(()=>__controls.step(300));s=await read();assert.equal(s.units.filter(u=>u.selected).length,1);
  const distances=s.units.slice(1).map(u=>Math.hypot(u.x-s.units[0].x,u.y-s.units[0].y));assert(distances.every(d=>d<170),'Companions stranded: '+map+' '+distances);
  if(map!=='cable-street'){
   await page.evaluate(()=>__controls.cover());await page.evaluate(()=>__controls.move(__controls.target()));assert(!(await read()).units[0].cover,'Active move must exit prepared cover');await page.evaluate(()=>__controls.step(90));
  }else{assert.equal(s.firearms,false);await page.keyboard.press('f');await page.evaluate(()=>__controls.step(60));assert.equal((await read()).bullets,0);await page.evaluate(()=>{__testGame.prepare();__testGame.action();__controls.step(600)});}
  if(map==='bad-belzig'){
   for(const zone of ['post','castle']){const outcome=await page.evaluate(z=>__controls.walk(z),zone);assert(outcome.distance<160,zone+' route failed: '+outcome.distance);await page.screenshot({path:path.join(screenshots,'bad-belzig-'+zone+'.png')});}
  }
  await page.locator('#companionREGROUP').click();await page.evaluate(()=>__controls.step(60));await page.evaluate(saved=>__controls.restore(saved),saved);assert.equal((await read()).order,'HOLD');
  await page.locator('#companionFOLLOW').click();await page.evaluate(()=>__controls.down());assert.equal((await read()).active,1);assert.equal((await read()).units.filter(u=>u.selected).length,1);
  assert.equal((await read()).faults,0);await page.screenshot({path:path.join(screenshots,map+'-companions.png')});
  await page.evaluate(()=>__testGame.restart());assert.equal((await read()).active,0);assert.equal((await read()).order,'FOLLOW');
  await page.evaluate(()=>__testGame.main());console.log('PASS browser: '+map+' switching, active-only movement, following, commands, restrictions, casualty transfer and restart');
 }
 // Ownership and snapshot smoke through host/client runtime states; no external signalling.
 await page.locator('#menuMissionSelect').click();await page.locator('#menuMissionWigan').click();await page.locator('#briefingBegin').click();await page.waitForFunction(()=>window.__testGame&&window.__controls&&__testGame.state().started&&!__testGame.state().menuOpen);
 await page.addScriptTag({url:'http://127.0.0.1:'+server.address().port+'/multiplayer-protocol.js'});await page.evaluate(()=>{__controls.quiet();__controls.asHost();__controls.step(30)});
 assert.deepEqual((await read()).units.map(u=>u.ai),[false,true,false,true]);
 assert.equal(await page.evaluate(()=>__controls.remote({type:'select',units:[0]})),false,'Remote may not steal host');
 assert.equal(await page.evaluate(()=>__controls.remote({type:'select',units:[1]})),true);await page.evaluate(()=>__controls.step(1));assert.equal((await read()).units[1].ai,false);assert.equal((await read()).units[2].ai,true);
 const packet=await page.evaluate(()=>__controls.packet());await page.evaluate(p=>{__controls.asClient();__controls.receive(p)},packet);
 const clientBefore=await read();await page.evaluate(()=>__controls.step(120));assert.deepEqual(await read(),clientBefore,'Client cannot run competing AI');assert.equal(clientBefore.active,1);
 await page.evaluate(p=>{__controls.asHost();__controls.receive(p);__controls.disconnect();__controls.step(30)},packet);assert.equal((await read()).units[1].ai,true,'Disconnected claim must return to AI');
 console.log('PASS browser: host ownership, remote claims, client snapshot/authority and disconnect handoff');
 // Touch input through the existing joystick API on a real mobile context.
 const mobile=await browser.newContext({viewport:{width:915,height:412},hasTouch:true,isMobile:true});await mobile.addInitScript(()=>sessionStorage.setItem('badfodder.presentation.prompted.v1','1'));const p=await mobile.newPage();p.on('pageerror',e=>errors.push(e.message));await p.goto('http://127.0.0.1:'+server.address().port);await p.locator('#menuMissionSelect').tap();await p.locator('#menuMissionBad').tap();await p.locator('#briefingBegin').tap();await p.waitForFunction(()=>window.__controls&&__testGame.state().started&&!__testGame.state().menuOpen,{},{timeout:90000});await p.evaluate(()=>__controls.quiet());
 await p.locator('#hudSquadBar .hud-unit').nth(2).tap();assert.equal(await p.evaluate(()=>__controls.read().active),2);await p.locator('#companionHOLD').tap();await p.locator('#companionFOLLOW').tap();await p.screenshot({path:path.join(screenshots,'mobile-companions.png')});
 const boxes=await p.evaluate(()=>['#companionOrders','.hud-roster','#touchJoystick','.touch-actions'].map(sel=>{const r=document.querySelector(sel).getBoundingClientRect();return{sel,x:r.x,y:r.y,w:r.width,h:r.height}}));
 for(const b of boxes)assert(b.x>=0&&b.y>=0&&b.x+b.w<=915&&b.y+b.h<=412,JSON.stringify(b));
 assert.deepEqual(errors,[]);console.log('PASS browser: mobile portraits/commands, visible controls, no runtime faults; screenshots '+screenshots);
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;server.close()});
