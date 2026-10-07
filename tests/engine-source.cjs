'use strict';
// Existing source contracts also inspect extracted implementations. Runtime tests
// still load the actual scripts and exercise their injected state adapters.
const fs=require('node:fs'),path=require('node:path');
module.exports=function engineSource(html){
 const root=path.join(__dirname,'..');
 return html.replace(/  function \w+\(\.\.\.args\)\{return (?:simulation|mission|hud)Engine\.\w+\(\.\.\.args\);\}/g,'')+'\n'+['simulation-runtime.js','mission-controller.js','hud-controller.js'].map(file=>fs.readFileSync(path.join(root,file),'utf8').replace(/\benv\./g,'')).join('\n');
};
