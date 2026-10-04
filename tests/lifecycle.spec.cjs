const {test}=require('@playwright/test');
const {runLifecycle}=require('./browser-lifecycle.cjs');
test('mission, menu, recovery and touch lifecycle',async({browser},testInfo)=>{await runLifecycle(browser,testInfo)});
