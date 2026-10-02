'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
module.exports=function(){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'cable-pending-'));
 fs.cpSync(path.join(__dirname,'../../authoring/cable-street'),dir,{recursive:true});
 const file=path.join(dir,'trace.geojson'),trace=JSON.parse(fs.readFileSync(file,'utf8'));
 trace.features=[];trace.properties.productionReady=false;
 fs.writeFileSync(file,JSON.stringify(trace));
 return dir;
};
