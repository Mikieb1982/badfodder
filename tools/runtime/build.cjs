'use strict';
// Curated, dependency-free production copy with content-addressed static URLs.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../..'),out=path.join(root,'dist');
fs.rmSync(out,{recursive:true,force:true});fs.mkdirSync(out);
const allowed=fs.readdirSync(root).filter(n=>/\.(js|css)$/.test(n));
allowed.push('index.html','join.html','manifest.webmanifest','favicon.ico','multiplayer-config.json');
function files(dir){return fs.readdirSync(path.join(root,dir),{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(dir+'/'+e.name):[dir+'/'+e.name]);}
allowed.push(...files('assets').filter(n=>/\.(png|webp|mp3|ico|json)$/.test(n)&&!(n.startsWith('assets/characters/')&&n.endsWith('.png')&&fs.existsSync(path.join(root,n.replace(/\.png$/,'.webp'))))));
// Ship valid dialogue/narration audio too. Tiny/empty placeholder files are omitted so runtime TTS fallback can handle them cleanly.
if(fs.existsSync(path.join(root,'audio')))allowed.push(...files('audio').filter(n=>/\.mp3$/i.test(n)&&fs.statSync(path.join(root,n)).size>128));
const availableAudio=allowed.filter(n=>n.startsWith('audio/')&&/\.mp3$/i.test(n));
const stableRuntime=new Set(['service-worker.js']);
// Dynamic voice paths and the root service worker stay stable; other static assets are content-addressed.
const hashes=new Map(allowed.filter(n=>/\.(js|css|png|webp|mp3|ico)$/.test(n)&&!n.startsWith('audio/')&&!stableRuntime.has(n)).map(n=>[n,crypto.createHash('sha256').update(fs.readFileSync(path.join(root,n))).digest('hex').slice(0,16)]));
// Query versions are rewritten consistently in HTML, CSS, JS and manifests.
// Firebase revalidates these stable paths; immutable URLs use a build-specific directory.
const release=crypto.createHash('sha256').update(allowed.map(n=>n+fs.readFileSync(path.join(root,n))).join('')).digest('hex').slice(0,16);
const prefix='static/'+release+'/';
function rewrite(text){
 for(const n of [...hashes.keys()].sort((a,b)=>b.length-a.length)){
  const escaped=n.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  text=text.replace(new RegExp('(["\\\'`(])'+escaped+'(?:\\?[^"\\\'`\\s)]*)?(?=["\\\'`)])','g'),(_,lead)=>lead+'/'+prefix+n);
 }
 return text;
}
function publicUrl(n){return hashes.has(n)&&n!=='favicon.ico'?'./'+prefix+n:'./'+n}
for(const n of allowed){
 let data=fs.readFileSync(path.join(root,n));if(/\.(html|css|js|webmanifest|json)$/.test(n)){let text=rewrite(data.toString());if(n==='index.html'){const map=Object.fromEntries([...hashes.keys()].map(k=>[k,'/'+prefix+k]));text=text.replace('<script src=', '<script>window.BadFodderBuild='+JSON.stringify({release,commit:require('node:child_process').execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim()})+';window.BadFodderAvailableAudio='+JSON.stringify(availableAudio)+';window.BadFodderAssetUrl=(path)=>('+JSON.stringify(map)+')[path]||path;</script>\n<script src=');}data=Buffer.from(text);}
 const target=path.join(out,hashes.has(n)&&n!=='favicon.ico'?prefix+n:n);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,data);
 if(n==='favicon.ico'){const immutable=path.join(out,prefix,n);fs.mkdirSync(path.dirname(immutable),{recursive:true});fs.writeFileSync(immutable,data);}
}
const offlineAssets=[...new Set(['./','./index.html','./manifest.webmanifest',...allowed.map(publicUrl)])];
fs.writeFileSync(path.join(out,'offline-assets.json'),JSON.stringify(offlineAssets));
console.log('Built curated dist, release '+release+' with '+offlineAssets.length+' offline assets');
