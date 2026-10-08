'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
let allocations=0;const calls=[],renders=[];
const context=()=>new Proxy({drawImage(...args){calls.push(args)},createPattern(c){return c}},{get:(t,k)=>k in t?t[k]:()=>{}});
const art={pose:e=>({state:e.state}),drawActor(g,e,team){renders.push({e,team})},texture:()=> 'fallback',landmark:()=>({width:320,height:240})};
vm.runInNewContext(fs.readFileSync('chibi-art.js','utf8'),{window:{BadFodderArt:art},document:{createElement(){allocations++;return {width:0,height:0,getContext:context}}}});
const g=context(),ent={x:120,y:240,dir:1,alive:true,variant:2},before={...ent},initial=allocations;
for(const team of ['squad','enemy','civilian'])for(const state of ['idle','walk','run','fire','hurt','dead']){ent.state=state;art.drawActor(g,ent,team);assert.equal(renders.at(-1).e,ent);assert.equal(renders.at(-1).team,team)}
assert.equal(allocations,initial,'Actor rendering reuses scratch canvases');delete ent.state;assert.deepEqual(ent,before,'Presentation leaves actor state intact');
assert(calls.some(c=>c.length===9&&c[1]===16&&c[2]===12),'Standing poses reshape the head');
assert(calls.some(c=>c.length===9&&c[1]===0&&c[2]===0&&c[3]===96),'Fallen poses retain their full silhouette');
for(const key of ['grass','road','roof','urban-asphalt']){const first=art.texture(g,key),n=allocations;assert.equal(art.texture(g,key),first);assert.equal(allocations,n)}
assert.equal(art.texture(g,'unknown'),'fallback');assert.equal(art.landmark('castle'),art.landmark('castle'));
art.tree(g,{x:4,y:8,r:10});const n=allocations;art.tree(g,{x:4,y:8,r:10});assert.equal(allocations,n);
console.log('PASS: shared chibi poses, untouched actor state, fallen silhouettes, cached tiles/trees/landmarks and no per-actor canvas allocation.');
