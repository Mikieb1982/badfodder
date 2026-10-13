'use strict';
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../..'),dist=path.join(root,'dist');
const mobile='assets/menu/rabbitscampaign-mobile.mp4';
if(!fs.existsSync(path.join(dist,mobile)))throw Error('Run npm run build with ffmpeg first. Android requires the H.264/AAC mobile intro.');
let html=fs.readFileSync(path.join(dist,'index.html'),'utf8');
if(!html.includes('window.BadFodderNative=true'))html=html.replace('<head>','<head>\n<script>window.BadFodderNative=true;</script>');
fs.writeFileSync(path.join(dist,'index.html'),html);
const removed=new Set();
function walk(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())walk(p);else if(e.name==='rabbitscampaign.mp4'){removed.add('./'+path.relative(dist,p));fs.unlinkSync(p)}else if(/\.(js|html)$/.test(e.name)){const old=fs.readFileSync(p,'utf8'),next=old.replace(/\/static\/[a-f0-9]+\/assets\/menu\/rabbitscampaign\.mp4/g,'/'+mobile);if(next!==old)fs.writeFileSync(p,next)}}}
walk(dist);fs.rmSync(path.join(dist,'service-worker.js'),{force:true});
const manifest=path.join(dist,'offline-assets.json');fs.writeFileSync(manifest,JSON.stringify(JSON.parse(fs.readFileSync(manifest)).filter(n=>!removed.has(n)&&n!=='./service-worker.js')));
console.log('Prepared native assets: one H.264/AAC intro and no service-worker duplication.');
