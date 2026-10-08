'use strict';
const {test,expect}=require('@playwright/test');
async function prepare(page){await page.goto('/?seed=visual-42');await page.waitForFunction(()=>!!window.__visual);await page.addStyleTag({content:'*,*::before,*::after{animation:none!important;transition:none!important}'});const skip=page.locator('[data-presentation-skip]');if(await skip.isVisible())await skip.click();}
async function choose(page,button){await page.locator('#menuMissionSelect').click();await page.locator(button).click();}
test('main menu and briefing',async({page})=>{await prepare(page);await expect(page.locator('#menuInstall')).toBeVisible();await expect(page.locator('#menuInstall')).toHaveText('INSTALL GAME');await expect(page.locator('.menu-backdrop')).toBeVisible();expect(await page.locator('.menu-backdrop').evaluate(el=>getComputedStyle(el).backgroundImage.includes('if-i-can-shoot-rabbits-title.png'))).toBe(true);await choose(page,'#menuMissionBad');await page.evaluate(()=>BadFodderArt.preloadMissionArt('belzig'));const briefing=page.getByRole('dialog',{name:'BELZIG mission briefing'});await expect(briefing.getByText('FICTIONAL MISSION',{exact:true})).toBeVisible();await expect(page).toHaveScreenshot('briefing.png',{maxDiffPixelRatio:.015});});
for(const [key,button] of [['bad-belzig','#menuMissionBad'],['wigan','#menuMissionWigan'],['cable-street','#menuHistoricalCable']])test(key+' scenery and actors',async({page})=>{
 await prepare(page);await choose(page,button);await page.locator('#briefingBegin').click();await page.waitForFunction(()=>window.__visual?.state().started&&!window.__visual.state().menuOpen&&window.__visual.state().actors===4);await page.evaluate(()=>window.__visual.freeze());expect(await page.evaluate(()=>window.__visual.state().faults)).toBe(0);await expect(page.locator('.viewport')).toHaveScreenshot(key+'.png');
});
test('barcelona scenery actors and roster',async({page})=>{await prepare(page);await choose(page,'#menuMissionBarcelona');await page.locator('#briefingBegin').click();await page.waitForFunction(()=>window.__visual?.state().started&&!window.__visual.state().menuOpen&&window.__visual.state().actors===4);await page.evaluate(()=>window.__visual.freeze());expect(await page.evaluate(()=>window.__visual.state().faults)).toBe(0);await expect(page.locator('.viewport')).toHaveClass(/barcelona-mission/);await expect(page.locator('.hud-unit')).toHaveCount(4);});
test('mobile HUD',async({browser})=>{const context=await browser.newContext({viewport:{width:915,height:412},hasTouch:true,isMobile:true,reducedMotion:'reduce',locale:'en-GB',colorScheme:'dark'});const page=await context.newPage();await prepare(page);await choose(page,'#menuMissionBad');await page.locator('#briefingBegin').click();await page.waitForFunction(()=>window.__visual?.state().started&&!window.__visual.state().menuOpen&&window.__visual.state().actors===4);await page.evaluate(()=>window.__visual.freeze());await expect(page.locator('.viewport')).toHaveScreenshot('mobile-hud.png');
 const layout=await page.evaluate(()=>{
  const rect=el=>{const r=el.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height}};
  const fire=document.querySelector('#touchFire'),stick=document.querySelector('#touchJoystick');
  const controls=[...document.querySelectorAll('.touch-actions button,#companionOrders button,.touch-joystick,.hud-roster')].filter(el=>el.getBoundingClientRect().width&&getComputedStyle(el).display!=='none'&&!el.hidden);
  return {fire:rect(fire),stick:rect(stick),idleFire:+getComputedStyle(fire).opacity,idleStick:+getComputedStyle(stick).opacity,boxes:controls.map(el=>({id:el.id,...rect(el)}))};
 });
 expect(layout.fire.width).toBe(72);expect(layout.fire.x).toBeLessThan(915/2);expect(layout.stick.x).toBeGreaterThan(915/2);
 expect(layout.idleFire).toBeLessThan(.8);expect(layout.idleStick).toBeLessThan(.3);
 for(let i=0;i<layout.boxes.length;i++)for(let j=i+1;j<layout.boxes.length;j++){const a=layout.boxes[i],b=layout.boxes[j];expect(a.x<b.right&&a.right>b.x&&a.y<b.bottom&&a.bottom>b.y,JSON.stringify({a,b})).toBe(false);}
 await expect(page.locator('.hud-unit')).toHaveCount(4);
 await page.locator('#companionHOLD').tap();
 await page.locator('#companionHOLD').evaluate(el=>el.setAttribute('aria-pressed','true'));
 expect(await page.locator('#companionHOLD').evaluate(el=>+getComputedStyle(el).opacity)).toBe(1);
 // Check visual state hooks atomically because the frozen runtime still clears synthetic input.
 expect(await page.locator('#touchFire').evaluate(el=>{el.style.setProperty('transition','none','important');el.classList.add('active');return +getComputedStyle(el).opacity})).toBe(1);
 expect(await page.locator('#touchJoystick').evaluate(el=>{el.style.setProperty('transition','none','important');el.classList.add('active');return +getComputedStyle(el).opacity})).toBeGreaterThan(.9);
 await context.close();});
test('double-click releases selected checkpoint defenders',async({page})=>{
 await prepare(page);await choose(page,'#menuMissionBad');await page.locator('#briefingBegin').click();
 await page.waitForFunction(()=>window.__visual?.state().started&&!window.__visual.state().menuOpen);
 await page.evaluate(()=>{window.__visual.freeze();for(const u of BadFodderCoopBridge.squad()){u.checkpointGarrison=0;u.checkpointCover=true;u.checkpointHeld=0;u.checkpointFortified=true;u.checkpointAnchorX=u.x;u.checkpointAnchorY=u.y;}});
 const canvas=page.locator('#game');const box=await canvas.boundingBox();
 await page.mouse.dblclick(box.x+box.width*.7,box.y+box.height*.7);
 const released=await page.evaluate(()=>BadFodderCoopBridge.squad().map(u=>({cover:u.checkpointCover,phase:u.checkpointGarrison,held:u.checkpointHeld,fortified:u.checkpointFortified,exit:u.checkpointExitPhase,anchor:u.checkpointAnchorX})));
 for(const unit of released)expect(unit).toEqual({cover:false,phase:null,held:null,fortified:false,exit:0,anchor:null});
});
test('double-tap releases checkpoint defenders on touchscreens',async({browser})=>{
 const context=await browser.newContext({viewport:{width:915,height:412},hasTouch:true,isMobile:true});
 const page=await context.newPage();await prepare(page);await choose(page,'#menuMissionBad');await page.locator('#briefingBegin').click();
 await page.waitForFunction(()=>window.__visual?.state().started&&!window.__visual.state().menuOpen);
 await page.evaluate(()=>{window.__visual.freeze();for(const u of BadFodderCoopBridge.squad()){u.checkpointGarrison=0;u.checkpointCover=true;u.checkpointFortified=true;}});
 const box=await page.locator('#game').boundingBox();
 await page.touchscreen.tap(box.x+box.width*.7,box.y+box.height*.7);
 expect(await page.evaluate(()=>BadFodderCoopBridge.squad().every(u=>u.checkpointCover))).toBe(true);
 await page.touchscreen.tap(box.x+box.width*.7,box.y+box.height*.7);
 expect(await page.evaluate(()=>BadFodderCoopBridge.squad().every(u=>!u.checkpointCover&&!u.checkpointFortified&&u.checkpointExitPhase===0))).toBe(true);
 await context.close();
});
