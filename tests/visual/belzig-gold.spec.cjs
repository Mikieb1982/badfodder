const {test,expect}=require('@playwright/test');

async function openBelzig(page){
  await page.goto('/?seed=belzig-gold-1');
  await page.waitForFunction(()=>!!window.__visual);
  await page.addStyleTag({content:'*,*::before,*::after{animation:none!important;transition:none!important}'});
  const skip=page.locator('[data-presentation-skip]');if(await skip.isVisible())await skip.click();
  await page.locator('#menuMissionSelect').click();
  await page.locator('#menuMissionBad').click();
  await page.locator('#briefingBegin').click();
  await page.waitForFunction(()=>window.__visual.state().started&&window.__visual.state().actors===4,{},{timeout:60000});
  await page.evaluate(()=>window.__visual.freeze());
  const state=await page.evaluate(()=>window.__visual.state());
  expect(state.map).toBe('bad-belzig');expect(state.faults).toBe(0);
}

async function sceneShot(page,name,file){
  expect(await page.evaluate(name=>window.__visual.scene(name),name)).toBe(true);
  await expect(page).toHaveScreenshot(file,{fullPage:true});
}

test('Belzig gold-standard presentation states',async({page})=>{
  await openBelzig(page);
  for(const [name,file] of [
    ['opening','belzig-opening.png'],
    ['movement','belzig-movement.png'],
    ['first-firefight','belzig-first-firefight.png'],
    ['checkpoint-garrison','belzig-checkpoint-garrison.png'],
    ['wounded-down','belzig-wounded-down.png'],
    ['town-centre','belzig-town-centre.png'],
    ['burg-final','belzig-burg-final.png']
  ])await sceneShot(page,name,file);
});

test('Belzig completion presentation',async({page})=>{
  await openBelzig(page);
  expect(await page.evaluate(()=>window.__visual.scene('completion'))).toBe(true);
  await expect(page).toHaveScreenshot('belzig-completion.png',{fullPage:true});
});

test('Belzig landscape mobile gameplay HUD',async({browser})=>{
  const context=await browser.newContext({viewport:{width:915,height:412},isMobile:true,hasTouch:true,locale:'en-GB',colorScheme:'dark',reducedMotion:'reduce'});
  const page=await context.newPage();
  await openBelzig(page);
  expect(await page.evaluate(()=>window.__visual.scene('movement'))).toBe(true);
  await expect(page.locator('#touchJoystick')).toBeVisible();
  await expect(page).toHaveScreenshot('belzig-mobile-landscape.png',{fullPage:true});
  await context.close();
});
