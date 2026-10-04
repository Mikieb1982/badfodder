'use strict';
const {defineConfig}=require('@playwright/test');
module.exports=defineConfig({testDir:'tests/visual',outputDir:'test-results/visual',fullyParallel:false,workers:1,timeout:90000,retries:0,
 use:{baseURL:'http://127.0.0.1:4173',viewport:{width:1280,height:800},headless:true,locale:'en-GB',colorScheme:'dark',reducedMotion:'reduce'},
 projects:[{name:'chromium',use:{browserName:'chromium'}}],
 expect:{toHaveScreenshot:{animations:'disabled',caret:'hide',threshold:.25,maxDiffPixelRatio:.005}},
 webServer:{command:'node tools/runtime/serve.cjs',url:'http://127.0.0.1:4173',reuseExistingServer:false,env:{BADFODDER_VISUAL:'1'}}
});
