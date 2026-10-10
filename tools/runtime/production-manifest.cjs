'use strict';

const path=require('node:path');

const shellFiles=Object.freeze([
  'index.html','join.html','manifest.webmanifest','favicon.ico','multiplayer-config.json'
]);

const developmentPrefixes=Object.freeze([
  'tests/','tools/','authoring/','docs/','data/','tmp/','.git/'
]);

const groups=Object.freeze([
  ['core-runtime',n=>/^[^/]+\.(?:js|css)$/.test(n)||shellFiles.includes(n)],
  ['menu-branding',n=>n.startsWith('assets/menu/')||n.startsWith('assets/icons/')],
  ['painted-world',n=>n.startsWith('assets/painted/')||/^assets\/(?:burg-eisenhardt|butterturm|postmeile|rathaus|reissiger|st-briccius|st-marien)\./.test(n)],
  ['miniature-world',n=>n.startsWith('assets/clay/')],
  ['characters',n=>n.startsWith('assets/characters/')],
  ['wigan-world',n=>n.startsWith('assets/wigan/')],
  ['mission-audio',n=>n.startsWith('assets/audio/')],
  ['voice-audio',n=>n.startsWith('audio/')],
  ['other-assets',n=>n.startsWith('assets/')]
]);

function isDevelopmentFile(name){return developmentPrefixes.some(prefix=>name.startsWith(prefix));}
function isRootRuntime(name){return /^[^/]+\.(?:js|css)$/.test(name);}
function isSupportedAsset(name){return /\.(?:png|webp|mp3|mp4|webm|ico|json)$/i.test(name);}
function shouldShipAsset(name,{hasWebpSibling=()=>false}={}){
  if(isDevelopmentFile(name)||!isSupportedAsset(name))return false;
  if(name.startsWith('assets/characters/')&&name.endsWith('.png')&&hasWebpSibling(name))return false;
  return name.startsWith('assets/');
}
function shouldShipVoice(name,size=0){return name.startsWith('audio/')&&/\.mp3$/i.test(name)&&size>128;}
function groupFor(name){for(const [id,test] of groups)if(test(name))return id;return 'unclassified';}
function report(files,root){
  const entries=files.map(name=>{
    let bytes=0;try{bytes=require('node:fs').statSync(path.join(root,name)).size}catch(_){}
    return {name,group:groupFor(name),bytes};
  });
  const summary={};
  for(const entry of entries){const g=summary[entry.group]||(summary[entry.group]={files:0,bytes:0});g.files++;g.bytes+=entry.bytes;}
  return {version:1,totalFiles:entries.length,totalBytes:entries.reduce((n,e)=>n+e.bytes,0),groups:summary,largest:[...entries].sort((a,b)=>b.bytes-a.bytes).slice(0,20),unclassified:entries.filter(e=>e.group==='unclassified').map(e=>e.name)};
}

module.exports=Object.freeze({shellFiles,developmentPrefixes,groups,isDevelopmentFile,isRootRuntime,isSupportedAsset,shouldShipAsset,shouldShipVoice,groupFor,report});
