'use strict';
// Curated, dependency-free production copy with content-addressed static URLs.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),cp=require('node:child_process');
const root=path.resolve(__dirname,'../..'),out=path.join(root,'dist');
fs.rmSync(out,{recursive:true,force:true});fs.mkdirSync(out);
const allowed=fs.readdirSync(root).filter(n=>/\.(js|css)$/.test(n));
allowed.push('index.html','join.html','manifest.webmanifest','favicon.ico','multiplayer-config.json');
function files(dir){return fs.readdirSync(path.join(root,dir),{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(dir+'/'+e.name):[dir+'/'+e.name]);}
allowed.push(...files('assets').filter(n=>/\.(png|webp|mp3|mp4|webm|ico|json)$/i.test(n)&&!(n.startsWith('assets/characters/')&&n.endsWith('.png')&&fs.existsSync(path.join(root,n.replace(/\.png$/,'.webp'))))));
if(fs.existsSync(path.join(root,'audio')))allowed.push(...files('audio').filter(n=>/\.mp3$/i.test(n)&&fs.statSync(path.join(root,n)).size>128));
const availableAudio=allowed.filter(n=>n.startsWith('audio/')&&/\.mp3$/i.test(n));
const stableRuntime=new Set(['service-worker.js']);
const hashes=new Map(allowed.filter(n=>/\.(js|css|png|webp|mp3|mp4|webm|ico)$/i.test(n)&&!n.startsWith('audio/')&&!stableRuntime.has(n)).map(n=>[n,crypto.createHash('sha256').update(fs.readFileSync(path.join(root,n))).digest('hex').slice(0,16)]));
const release=crypto.createHash('sha256').update(allowed.map(n=>n+fs.readFileSync(path.join(root,n))).join('')).digest('hex').slice(0,16);
const prefix='static/'+release+'/';
function rewrite(text){for(const n of [...hashes.keys()].sort((a,b)=>b.length-a.length)){const escaped=n.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');text=text.replace(new RegExp('(["\\\'`(])'+escaped+'(?:\\?[^"\\\'`\\s)]*)?(?=["\\\'`)])','g'),(_,lead)=>lead+'/'+prefix+n)}return text}
function publicUrl(n){return hashes.has(n)&&n!=='favicon.ico'?'./'+prefix+n:'./'+n}
const generatedAudio=[];let mobileCampaignVideo=null;
function hasFfmpeg(){return cp.spawnSync('ffmpeg',['-version'],{stdio:'ignore'}).status===0}
function transcodeMusic(){
 if(!hasFfmpeg()){console.warn('ffmpeg unavailable; WebM/Opus music omitted and MP3 fallback retained.');return}
 for(const mp3 of files('assets/audio').filter(n=>/\.mp3$/i.test(n))){const webm=mp3.replace(/\.mp3$/i,'.webm');if(fs.existsSync(path.join(root,webm)))continue;const target=path.join(out,webm);fs.mkdirSync(path.dirname(target),{recursive:true});const run=cp.spawnSync('ffmpeg',['-y','-loglevel','error','-i',path.join(root,mp3),'-vn','-c:a','libopus','-b:a','72k','-vbr','on','-compression_level','5',target],{stdio:'inherit'});if(run.status!==0){fs.rmSync(target,{force:true});console.warn('Could not create '+webm+'; MP3 fallback retained.');continue}generatedAudio.push(webm)}
}
function transcodeCampaignVideo(){
 const source=path.join(root,'assets/menu/rabbitscampaign.mp4');if(!fs.existsSync(source)||!hasFfmpeg())return;
 const rel='assets/menu/rabbitscampaign-mobile.mp4',target=path.join(out,rel);fs.mkdirSync(path.dirname(target),{recursive:true});
 const args=['-y','-loglevel','error','-i',source,'-vf','scale=min(1280\\,iw):-2','-c:v','libx264','-profile:v','baseline','-level','3.1','-pix_fmt','yuv420p','-preset','veryfast','-crf','24','-movflags','+faststart','-c:a','aac','-b:a','96k','-ac','2',target];
 const run=cp.spawnSync('ffmpeg',args,{stdio:'inherit'});if(run.status!==0){fs.rmSync(target,{force:true});console.warn('Could not create mobile campaign intro; original MP4 fallback retained.');return}mobileCampaignVideo='./'+rel;
}
transcodeMusic();transcodeCampaignVideo();
for(const n of allowed){
 let data=fs.readFileSync(path.join(root,n));if(/\.(html|css|js|webmanifest|json)$/.test(n)){let text=rewrite(data.toString());if(n==='index.html'){const map=Object.fromEntries([...hashes.keys()].map(k=>[k,'/'+prefix+k]));text=text.replace('<script src=', '<script>window.BadFodderBuild='+JSON.stringify({release,commit:cp.execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim()})+';window.BadFodderAvailableAudio='+JSON.stringify(availableAudio)+';window.BadFodderCampaignVideoMobile='+JSON.stringify(mobileCampaignVideo)+';window.BadFodderAssetUrl=(path)=>('+JSON.stringify(map)+')[path]||path;</script>\n<script src="'+publicUrl('campaign-intro.js')+'"></script>\n<script src=');}data=Buffer.from(text)}
 const target=path.join(out,hashes.has(n)&&n!=='favicon.ico'?prefix+n:n);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,data);if(n==='favicon.ico'){const immutable=path.join(out,prefix,n);fs.mkdirSync(path.dirname(immutable),{recursive:true});fs.writeFileSync(immutable,data)}
}
const offlineAssets=[...new Set(['./','./index.html','./manifest.webmanifest',...allowed.map(publicUrl),...generatedAudio.map(n=>'./'+n),...(mobileCampaignVideo?[mobileCampaignVideo]:[])])];
fs.writeFileSync(path.join(out,'offline-assets.json'),JSON.stringify(offlineAssets));
console.log('Built curated dist, release '+release+' with '+offlineAssets.length+' offline assets');
