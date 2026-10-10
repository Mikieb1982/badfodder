'use strict';
const {test,expect}=require('@playwright/test');

async function openBelzig(page){
  await page.goto('/?seed=belzig-gold-42');
  await page.waitForFunction(()=>!!window.__visual);
  await page.addStyleTag({content:'*,*::before,*::after{animation:none!important;transition:none!important}'});
  const skip=page.locator('[data-presentation-skip]');if(await skip.isVisible())await skip.click();
  await page.locator('#menuMissionSelect').click();
  await page.locator('#menuMissionBad').click();
  await page.locator('#briefingBegin').click();
  await page.waitForFunction(()=>window.__visual?.state().started&&!window.__visual.state().menuOpen&&window.__visual.state().actors===4);
  await page.evaluate(()=>window.__visual.freeze());
  expect(await page.evaluate(()=>window.__visual.state().map)).toBe('bad-belzig');
  expect(await page.evaluate(()=>window.__visual.state().faults)).toBe(0);
}

for(const [scene,snapshot] of [
  ['movement','belzig-movement.png'],
  ['first-firefight','belzig-first-firefight.png'],
  ['checkpoint-garrison','belzig-checkpoint-garrison.png'],
  ['wounded-down','belzig-wounded-down.png'],
  ['town-centre','belzig-town-centre.png'],
  ['burg-final','belzig-burg-final.png']
])test('Belzig gold reference: '+scene,async({page})=>{
  await openBelzig(page);
  expect(await page.evaluate(name=>window.__visual.scene(name),scene)).toBe(true);
  await expect(page.locator('.viewport')).toHaveScreenshot(snapshot);
});

test('Belzig gold reference: mission completion',async({page})=>{
  await openBelzig(page);
  expect(await page.evaluate(()=>window.__visual.scene('completion'))).toBe(true);
  await expect(page.locator('#menuScreen')).toBeVisible();
  await expect(page).toHaveScreenshot('belzig-completion.png');
});
