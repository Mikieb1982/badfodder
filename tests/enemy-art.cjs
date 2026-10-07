'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ids=require('../mission-identities');
const code=fs.readFileSync(require.resolve('../enemy-character-art'),'utf8');
function setup(fail=false){
 let loads=0,draws=0,fallback=0,allocations=0;const imageCalls=[];
 const g=new Proxy({drawImage(img,...a){draws++;assert.equal(a.length,8);assert(a.every(Number.isFinite));assert(a[0]>=0&&a[1]>=0&&a[0]+a[2]<=img.naturalWidth&&a[1]+a[3]<=img.naturalHeight);imageCalls.push(a)}},{get:(t,k)=>k in t?t[k]:()=>{}});
 const art={drawActor(){fallback++},setMissionIdentity(){},preloadMissionArt:async()=>{},pose:e=>({dir:e.dir,state:e.state,phase:e.phase||0,moving:e.state==='walk'||e.state==='run',facing:e.dir*Math.PI/4,death:1})};
 class Image{set src(src){loads++;this.naturalWidth=2560;this.naturalHeight=src.includes('cable-street')?512:1024;queueMicrotask(()=>fail?this.onerror():this.onload())}}
 vm.runInNewContext(code,{window:{BadFodderArt:art,BadFodderIdentities:ids},Image,setTimeout,clearTimeout,document:{createElement(){allocations++;throw Error('Live enemy drawing allocated a canvas')}}});
 return {g,art,imageCalls,get loads(){return loads},get draws(){return draws},get fallback(){return fallback},get allocations(){return allocations}};
}
(async()=>{
 const t=setup();
 for(const mission of ['belzig','wigan','barcelona','cable-street']){
  t.art.setMissionIdentity(mission);await t.art.preloadMissionArt(mission);assert(t.art.enemyArtStatus(mission));
  for(let variant=0;variant<4;variant++)for(let dir=0;dir<8;dir++)for(const state of ['idle','walk','run','aim','fire','hurt','dead']){
   const roles=mission==='cable-street'?['police','march']:[null];
   for(const periodRole of roles)t.art.drawActor(t.g,{variant,dir,state,phase:Math.PI/2,x:100,y:100,periodRole},mission==='cable-street'?'civilian':'enemy');
  }
 }
 assert.equal(t.loads,3,'Belzig/Wigan share one cached atlas');assert.equal(t.allocations,0);assert.equal(t.fallback,0);assert.equal(t.draws,3360);
 t.art.drawActor(t.g,{identityRole:'squad'},'squad');t.art.drawActor(t.g,{},'civilian');assert.equal(t.fallback,2,'Players/civilians keep their current renderer');
 const broken=setup(true);broken.art.setMissionIdentity('barcelona');await broken.art.preloadMissionArt('barcelona');broken.art.drawActor(broken.g,{dir:0},'enemy');assert.equal(broken.fallback,1);assert(!broken.art.enemyArtStatus('barcelona'));
 for(const name of ['occupation','barcelona','cable-street']){const metadata=JSON.parse(fs.readFileSync('assets/characters/enemies/'+name+'.json'));assert.equal(metadata.frames.length,name==='cable-street'?2:4);assert(metadata.frames.every(row=>row.length===8));assert(fs.statSync('assets/characters/enemies/'+name+'.webp').size>50000)}
 console.log('PASS: painted enemies in all four missions, every facing/state, foot anchors, shared cache, zero live allocations and missing-asset fallback.');
})().catch(e=>{console.error(e);process.exitCode=1});
