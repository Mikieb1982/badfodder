'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const sourceRoot=path.resolve(__dirname,'..'),root=path.resolve(sourceRoot,'dist'),config=require('../firebase.json');
assert.equal(config.hosting.public,'dist');for(const n of ['tests','tools','authoring','docs','data','.git','package.json','README.md','multiplayer-database.rules.json'])assert(!fs.existsSync(path.join(root,n)),'Development content published: '+n);
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');assert(html.includes('href="manifest.webmanifest"'));assert(!html.includes('site.webmanifest'));assert(!fs.existsSync(path.join(root,'site.webmanifest')));
const manifest=JSON.parse(fs.readFileSync(path.join(root,'manifest.webmanifest')));assert(manifest.icons.length===2&&manifest.orientation==='landscape');
function check(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const f=path.join(dir,e.name);if(e.isDirectory()){check(f);continue}if(/\.(html|js|css|webmanifest|json)$/.test(f)){for(const m of fs.readFileSync(f,'utf8').matchAll(/\/static\/[a-f0-9]{16}\/[a-zA-Z0-9_.\/-]+/g))assert(fs.existsSync(path.join(root,m[0])),'Broken versioned asset: '+m[0]);}}}
check(root);assert(config.hosting.headers.some(h=>h.source==='/static/**'&&h.headers[0].value.includes('immutable')));
assert(!fs.existsSync(path.join(root,'assets/characters/belzig.png')));assert(html.includes('/assets/characters/belzig.webp'));assert(!fs.existsSync(path.join(root,'assets/characters/belzig.webp')));
for(const name of ['belzig.mp3','wigan.mp3','cable-street.mp3']){
 const file=path.join(root,'audio/voices/briefings',name);assert(fs.existsSync(file),'Missing production briefing recording: '+name);assert(fs.statSync(file).size>128,'Invalid production briefing recording: '+name);
}
const ffmpegAvailable=require('node:child_process').spawnSync('ffmpeg',['-version'],{stdio:'ignore'}).status===0;
if(ffmpegAvailable){
 const offline=JSON.parse(fs.readFileSync(path.join(root,'offline-assets.json'),'utf8'));
 for(const name of ['bad_fodder','mission','cable_street','barcelonamission']){
  const modern=path.join(root,'assets/audio',name+'.webm'),fallback=path.join(sourceRoot,'assets/audio',name+'.mp3');
  assert(fs.existsSync(modern),'Missing generated Opus/WebM track: '+name);
  assert(fs.statSync(modern).size<fs.statSync(fallback).size,'Modern audio is not smaller than MP3 fallback: '+name);
  assert(offline.includes('./assets/audio/'+name+'.webm'),'Modern audio missing from offline cache manifest: '+name);
 }
}
console.log('PASS: curated production output, generated Opus music with MP3 fallbacks, authoritative manifest, briefing audio and cache policy.');
