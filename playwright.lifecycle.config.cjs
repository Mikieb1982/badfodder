const {defineConfig}=require('@playwright/test');
// The lifecycle spec exercises all four missions plus desktop/touch recovery flows in one serial test.
// Keep every assertion; allow enough wall-clock time for Chromium's slower headless mobile pass.
module.exports=defineConfig({testDir:'tests',outputDir:'test-results/lifecycle',testMatch:'lifecycle.spec.cjs',workers:1,timeout:480000,retries:0,reporter:'list',use:{headless:true},projects:['chromium','firefox','webkit'].map(name=>({name,use:{browserName:name}}))});
