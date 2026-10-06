'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),identities=require('../mission-identities');
let allocations=0,draws=0,cleared=false;const rotations=[];
const pixels=new Uint8ClampedArray(600*335*4);for(let i=0;i<pixels.length;i+=4){pixels[i]=pixels[i+1]=pixels[i+2]=42;pixels[i+3]=255}
// An enclosed dark costume region must survive background removal.
for(let y=20;y<40;y++)for(let x=95;x<115;x++){const i=(y*600+x)*4;pixels[i]=pixels[i+1]=pixels[i+2]=20}
const ctx=new Proxy({createLinearGradient:()=>({addColorStop(){}}),getImageData:()=>({data:pixels}),putImageData(d){assert.equal(d.data[3],0);assert.equal(d.data[(25*600+100)*4+3],255);cleared=true},rotate(a){assert(Number.isFinite(a));rotations.push(a)},drawImage(image,...args){draws++;for(const n of args)assert(Number.isFinite(n));if(args.length===8){const [x,y,w,h]=args;assert(x>=0&&y>=0&&w>0&&h>0);assert(x+w<=image.width&&y+h<=image.height)}},},{get:(g,k)=>k in g?g[k]:()=>{}});
class Image{constructor(){this.width=this.naturalWidth=600;this.height=this.naturalHeight=335}set src(value){assert(value.endsWith('barcelona.webp'));queueMicrotask(()=>this.onload())}}
const art={drawActor(){throw Error('Unexpected fallback')},pose:e=>({dir:e.dir,state:e.state,phase:1.2,moving:['walk','run'].includes(e.state),facing:e.dir*Math.PI/4,death:e.state==='dead'?1:0,clock:1})};
const window={BadFodderArt:art,BadFodderIdentities:identities};
vm.runInNewContext(fs.readFileSync(require.resolve('../mission-character-art'),'utf8'),{window,document:{createElement(){allocations++;return{width:0,height:0,getContext:()=>ctx}}},Image,setTimeout,clearTimeout});
(async()=>{
 art.setMissionIdentity('barcelona');await art.preloadMissionArt('barcelona');assert(cleared);
 const before=allocations;
 for(let variant=0;variant<4;variant++)for(let dir=0;dir<8;dir++)for(const state of ['idle','walk','run','aim','fire','hurt','dead'])for(const weapon of [null,'pistol','mauser']){
  const ent=identities.runtimeCharacter('barcelona',variant,{variant,dir,state,weapon,equipmentManaged:true,x:100,y:120});art.drawActor(ctx,ent,'squad');
 }
 art.drawActor(ctx,{variant:0,dir:2,state:'idle',downed:true,equipmentManaged:true,x:0,y:0},'squad');assert(rotations.includes(1.45));assert.equal(allocations,before,'Live character animation allocates no canvases');assert(draws>2000);
 // Allies continue using the established costume renderer rather than player atlases.
 art.drawActor(ctx,{variant:0,dir:2,state:'idle',x:0,y:0},'resistance');
 console.log('PASS: four Barcelona sprites, eight facings, idle/walk/run/aim/fire/hurt/down/dead, weapon acquisition, atlas bounds, transparent backdrop and allocation-free player rendering.');
})().catch(e=>{console.error(e);process.exitCode=1});
