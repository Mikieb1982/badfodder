'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),identities=require('../mission-identities');
let allocations=0,draws=0,fallback=0,loads=0;const rotations=[],canvases=[];
function context(){const calls=[];return new Proxy({calls,createLinearGradient:()=>({addColorStop(){}}),rotate(a){assert(Number.isFinite(a));rotations.push(a);calls.push(['rotate',a])},drawImage(image,...args){draws++;for(const n of args)assert(Number.isFinite(n));calls.push(['drawImage',image,...args])}},{get:(g,k)=>k in g?g[k]:(...args)=>{for(const n of args)if(typeof n==='number')assert(Number.isFinite(n));calls.push([k,...args])}})}
const ctx=context();
class Image{set src(value){loads++;throw Error('Barcelona must not require a tiny atlas: '+value)}}
const art={drawActor(){fallback++},pose:e=>({dir:e.dir,state:e.state,phase:e.phase||0,moving:['walk','run'].includes(e.state),facing:e.dir*Math.PI/4,death:e.state==='dead'?1:0,clock:1})};
const window={BadFodderArt:art,BadFodderIdentities:identities};
vm.runInNewContext(fs.readFileSync(require.resolve('../mission-character-art'),'utf8'),{window,document:{createElement(){allocations++;const g=context(),c={width:0,height:0,getContext:()=>g,calls:g.calls};canvases.push(c);return c}},Image,setTimeout,clearTimeout});
(async()=>{
 art.setMissionIdentity('barcelona');await art.preloadMissionArt('barcelona');assert.equal(loads,0);
 for(let variant=0;variant<4;variant++){const portrait=art.missionPortrait('barcelona',variant);assert.equal(portrait.width,144);assert.equal(portrait.height,144);assert.equal(art.missionPortrait('barcelona',variant),portrait,'Portraits remain cached')}
 const before=allocations;
 for(let variant=0;variant<4;variant++)for(let dir=0;dir<8;dir++)for(const state of ['idle','walk','run','aim','fire','hurt','dead'])for(const weapon of [null,'pistol','mauser'])for(let step=0;step<8;step++){
  const ent=identities.runtimeCharacter('barcelona',variant,{variant,dir,state,phase:step*Math.PI/4,weapon,equipmentManaged:true,x:100,y:120});art.drawActor(ctx,ent,'squad');
 }
 for(const team of ['enemy','resistance','civilian'])for(let variant=0;variant<4;variant++)for(let dir=0;dir<8;dir++)for(const state of ['idle','walk','run','fire','hurt','dead'])art.drawActor(ctx,{variant,dir,state,phase:Math.PI/2,x:100,y:120},team);
 art.drawActor(ctx,{variant:0,dir:2,state:'idle',downed:true,equipmentManaged:true,weapon:null,x:0,y:0},'squad');assert(rotations.includes(1.45));assert.equal(allocations,before,'Live Barcelona poses must allocate no canvases');assert.equal(fallback,0,'Civilians and allies must use the shared costume renderer');assert(draws>5000);
 // Distinct directional silhouettes, independent legs and rifle acquisition.
 const pose=(dir,phase,weapon)=>{ctx.calls.length=0;art.drawActor(ctx,{variant:0,dir,state:'walk',phase,weapon,equipmentManaged:true,x:0,y:0},'squad');return ctx.calls.find(c=>c[0]==='drawImage')[1]};
 assert.notEqual(pose(0,0,null),pose(2,0,null));assert.notDeepEqual(pose(0,0,null).calls,pose(0,Math.PI/2,null).calls);assert.notDeepEqual(pose(0,0,null).calls,pose(0,0,'mauser').calls);
 const bytes=canvases.reduce((n,c)=>n+c.width*c.height*4,0);assert(bytes<55*1024*1024,'Preloaded costume cache must remain bounded on mobile');
 art.setMissionIdentity('wigan');art.drawActor(ctx,{variant:0,dir:2,state:'idle',x:0,y:0},'enemy');
 console.log('PASS: four shared Barcelona costumes/portraits; eight facings; articulated walk/run; armed poses, fire, hurt, down/dead; matching enemies/allies/civilians; no atlas dependency; cached live poses; '+Math.round(bytes/1024/1024)+' MiB bounded cache.');
})().catch(e=>{console.error(e);process.exitCode=1});
