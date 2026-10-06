'use strict';
const assert=require('node:assert/strict');
const path=require('node:path');
const root=path.resolve(__dirname,'..');

const Dispatch=require(path.join(root,'procedural-dispatch.js'));
assert.match(Dispatch.generateEpitaph({name:'Ada',killingEntityRole:'GRENADE',landmark:'Marktplatz',timeElapsed:73}),/Marktplatz/);
let report=Dispatch.generateDebrief({title:'Test Action',objective:'hold the junction',success:true},[{alive:true,kills:2,assists:1},{alive:false,kills:1,assists:0},{alive:false},{alive:false}], [{alive:true},{alive:false},{alive:false},{alive:false}]);
assert.equal(report.rating,'PYRRHIC_VICTORY');
assert.equal((report.body.match(/[.!?](?:\s|$)/g)||[]).length,3,'Debrief must be exactly three sentences');
assert.match(report.body,/3 fatal casualties/);
assert.equal(Dispatch.generateDebrief({success:false},[{alive:true}],[{alive:true}]).rating,'ROUT');
assert.equal(Dispatch.generateDebrief({success:true},[{alive:false}],[{alive:false}]).rating,'DISASTER');

const Combat=require(path.join(root,'combat-tactics-extension.js'));
const unit={alive:true,x:0,y:0};
Combat.applyNearMissSuppression(unit,{});assert.equal(unit.tacticalSuppression,8);
Combat.applyDirectHitSuppression(unit);assert.equal(unit.tacticalSuppression,33);
unit.tacticalSuppression=50;let mods=Combat.getUnitTacticalModifiers(unit);assert.equal(mods.speedMultiplier,.6);assert(mods.accuracyMultiplier<1);
unit.tacticalSuppression=90;mods=Combat.getUnitTacticalModifiers(unit);assert.equal(mods.speedMultiplier,.25);assert.equal(mods.isPinned,true);
Combat.updateTacticalState([unit],[],[],1);assert.equal(unit.tacticalSuppression,78);assert.equal(unit.suppression,.78);

const commander={alive:true,x:0,y:0,combatRole:'COMMANDER',groupId:'a',coverMask:1};
const mate={alive:true,x:20,y:0,groupId:'a',coverMask:1};
Combat.updateTacticalState([commander,mate],[],[],.3);commander.alive=false;Combat.updateTacticalState([commander,mate],[],[],.3);
assert.equal(mate.surrendered,undefined,'Commander loss alone should not force surrender above panic threshold');
Combat.notifyGrenadeDetonation(20,0,[mate]);Combat.notifyGrenadeDetonation(20,0,[mate]);
mate.coverMask=0;Combat.updateTacticalState([mate],[],[],.3);
assert(['PANIC','SURRENDERED'].includes(mate.tacticalState),'Low morale uncovered unit should panic or surrender');

const Pacing=require(path.join(root,'director-pacing.js'));
const squad=[{alive:true,hp:10,maxHp:10,x:0,y:0,ammo:30,maxAmmo:30,grenades:3,maxGrenades:3},{alive:true,hp:10,maxHp:10,x:10,y:0,ammo:30,maxAmmo:30}];
const enemies=[{alive:true,x:100,y:0,alert:true,target:squad[0]}];
const state=Pacing.createState();
let pace=Pacing.updateState(state,.25,squad,enemies,{});assert.equal(pace.phase,'PEAK');assert.equal(pace.allowFlankers,true);
for(let i=0;i<30;i++)pace=Pacing.updateState(state,.25,squad,enemies,{});assert.equal(pace.phase,'SUSTAIN','Peak must settle into sustain during continuing contact');
squad[0].hp=1;pace=Pacing.updateState(state,.25,squad,enemies,{});assert.equal(pace.phase,'FADE_DOWN');assert.equal(pace.spawnRateModifier,0);
for(let i=0;i<60;i++)pace=Pacing.updateState(state,.25,squad,enemies,{});assert.equal(pace.phase,'FADE_DOWN','Breathing window must last 18 seconds');
const low=Pacing.calculateStress([{alive:true,hp:10,maxHp:10,ammo:30,maxAmmo:30}],[],{});assert(low<.35);

class Param{constructor(){this.value=0}setValueAtTime(v){this.value=v}exponentialRampToValueAtTime(v){this.value=v}cancelScheduledValues(){}}
class Node{constructor(){this.gain=new Param();this.frequency=new Param();this.Q={value:0};this.pan={value:0};}connect(){return this}start(){}stop(){}}
class Buffer{constructor(length){this.duration=length/48000;this.data=new Float32Array(length)}getChannelData(){return this.data}}
const fake={sampleRate:48000,currentTime:0,state:'running',destination:new Node(),createGain:()=>new Node(),createBuffer:(_c,l)=>new Buffer(l),createBufferSource:()=>new Node(),createBiquadFilter:()=>new Node(),createOscillator:()=>new Node(),createStereoPanner:()=>new Node(),createWaveShaper:()=>new Node()};
const Sfx=require(path.join(root,'procedural-sfx.js'));
assert.equal(Sfx.init(fake),true);assert.equal(Sfx.playGunshot(0,0,0,0),true);assert.equal(Sfx.playRicochet(10,0,0,0),true);assert.equal(Sfx.playExplosion(0,0,0,0),true);assert.equal(Sfx.playFootstep('gravel'),true);assert.equal(Sfx.playHit(true,false),true);assert.equal(Sfx.playSoldierDown(),true);

const bytes=['procedural-dispatch.js','combat-tactics-extension.js','director-pacing.js','procedural-sfx.js'].reduce((n,f)=>n+require('node:fs').statSync(path.join(root,f)).size,0);
assert(bytes<100*1024,'Combined raw modules must remain under 100 KB');
console.log('procedural systems ok:',bytes,'bytes');
