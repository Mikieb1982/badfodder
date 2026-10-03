'use strict';

const assert=require('node:assert/strict');
const Art=require('../cable-street-art.js');

const styleA=Art.buildingStyle(12345,{},n=>n*2);
const styleB=Art.buildingStyle(12345,{},n=>n*2);
assert.deepEqual(styleA,styleB,'Cable Street building style must be deterministic');
assert.equal(styleA.family,'east-end-brick');
assert(styleA.height>=28&&styleA.height<=34,'Terraces need two readable storeys at the shared scene scale');
assert.match(styleA.wall,/^#/);
assert.match(styleA.roof,/^#/);
assert.match(styleA.door,/^#/);

function mockContext(){
  return{
    save(){},restore(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},setLineDash(){},
    arc(){},ellipse(){},fill(){},fillRect(){},strokeRect(){},closePath(){},translate(){},fillText(){},
    strokeStyle:'',fillStyle:'',lineWidth:1,lineCap:'',lineJoin:'',font:'',textAlign:''
  };
}
const ctx=mockContext();
Art.drawRoad(ctx,{kind:'historical-carriageway-edge',points:[[0,0],[20,0],[40,10]]},n=>n*2,{});
Art.drawRoad(ctx,{kind:'railway',points:[[0,10],[20,10],[40,20]]},n=>n*2,{});

assert.equal(typeof Art.drawCrowd,'function');
assert.equal(typeof Art.drawGround,'function');
assert.equal(typeof Art.drawCarried,'function');
assert.equal(typeof Art.drawHint,'function');
assert.equal(typeof Art.drawFacadeDetails,'function');
assert.equal(typeof Art.drawStreetProps,'function');
assert.equal(typeof Art.drawVolunteer,'function');
assert.equal(typeof Art.drawEffects,'function');
assert.equal(typeof Art.drawAtmosphere,'function');
assert.equal(typeof Art.drawGuidance,'function');
const runtimeCtx={
  save(){},restore(){},translate(){},scale(){},beginPath(){},ellipse(){},fill(){},stroke(){},
  moveTo(){},lineTo(){},setLineDash(){},fillRect(){},strokeRect(){},closePath(){},arc(){},
  fillText(){},strokeText(){},roundRect(){},rotate(){},
  filter:'none',strokeStyle:'',fillStyle:'',lineWidth:1,font:'',textAlign:''
};
const fakeArt={
  animate(ent){ent._animated=true;},
  drawActor(ctx,ent,team){assert(ctx===runtimeCtx);assert(ent._animated);assert.equal(team,'civilian');}
};
assert.doesNotThrow(()=>Art.drawCrowd(runtimeCtx,[{
  id:'npc-test',x:40,y:50,dir:0,variant:1,role:'civilian'
}],1,fakeArt),'Cable Street shared NPC rendering must receive its canvas context explicitly');

assert(require('node:fs').readFileSync(require('node:path').join(__dirname,'..','cable-street-art.js'),'utf8').includes("art.drawActor(ctx,ent,team)"),'Cable Street NPCs do not reuse the main character renderer');

console.log('PASS: Cable Street art exposes deterministic East End brick styling and dedicated carriageway-edge / railway drawing.');

assert.doesNotThrow(()=>Art.drawCrowd(runtimeCtx,[{id:'offscreen',x:9000,y:9000}],0,{drawActor(){throw new Error('Off-screen crowd was rendered')},animate(){}},{x:0,y:0,w:300,h:200}));
