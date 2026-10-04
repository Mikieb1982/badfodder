const {defineConfig}=require('@playwright/test');
module.exports=defineConfig({testDir:'tests',outputDir:'test-results/lifecycle',testMatch:'lifecycle.spec.cjs',workers:1,timeout:240000,retries:0,reporter:'list',use:{headless:true},projects:['chromium','firefox','webkit'].map(name=>({name,use:{browserName:name}}))});
