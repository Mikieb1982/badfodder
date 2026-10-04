'use strict';
const assert=require('node:assert/strict'),L=require('../game-lifecycle'),R=require('../runtime-services'),S=require('../game-storage'),G=require('../game-rng'),P=require('../multiplayer-protocol');
let flags={started:false,finished:false,runtimeSafeStop:false,paused:false,menuOpen:true};
const lifecycle=L.create({read:()=>flags,apply:next=>Object.assign(flags,next)});
assert(!lifecycle.transition('PLAYING'));for(const state of ['TITLE','MISSION_SELECT','BRIEFING','LOADING']){lifecycle.transition(state);assert(flags.menuOpen&&flags.paused)}
flags.started=true;for(let i=0;i<8;i++){assert(lifecycle.transition('PLAYING'));assert(!flags.menuOpen&&!flags.paused);lifecycle.transition('PAUSED');lifecycle.transition('TITLE');}
flags.finished=true;lifecycle.transition('RESULT');assert(!lifecycle.transition('PLAYING'));lifecycle.transition('RECOVERY');assert(flags.runtimeSafeStop);flags={started:true,finished:false,runtimeSafeStop:false};assert(lifecycle.transition('PLAYING'));
let steps=0;assert(R.fixedFrame({dt:1,accumulator:0,simulate:()=>steps++,active:true})<1/60);assert.equal(steps,5);assert.equal(R.fixedFrame({dt:1,accumulator:1,simulate:()=>steps++,active:false}),0);assert.equal(steps,5);
assert.equal(R.fault({time:10000,last:0,count:2}).count,1);assert.equal(R.fault({time:100,last:50,count:2}).count,3);
const raw=new Map([['legacy','0'],['future',JSON.stringify({storageSchema:99,value:'bad'})]]),store=S.create(()=>({getItem:k=>raw.get(k)??null,setItem:(k,v)=>raw.set(k,v),removeItem:k=>raw.delete(k)}));assert.equal(store.getItem('legacy'),'0');store.setItem('legacy','1');assert.equal(JSON.parse(raw.get('legacy')).storageSchema,1);assert.equal(store.getItem('legacy'),'1');assert.equal(store.getItem('future'),null);store.removeItem('legacy');assert.equal(store.getItem('legacy'),null);
const blocked=S.create(()=>{throw Error('blocked')});blocked.setItem('music','0');assert.equal(blocked.getItem('music'),'0');blocked.removeItem('music');assert.equal(blocked.getItem('music'),null);
const a=G.create('mission-42'),b=G.create('mission-42');for(let i=0;i<100;i++){const value=a.random();assert.equal(value,b.random());assert(value>=0&&value<1)}
assert.throws(()=>P.encode({text:'€'.repeat(23000)}),/too large/);assert.equal(P.parse(JSON.stringify({text:'€'.repeat(23000)})),null);
const actor={x:10,y:20,hp:8,maxHp:8,alive:true,dir:0,state:'idle',manualGarrison:true};
const state={squad:Array(4).fill(actor),enemies:Array(160).fill(actor),civilians:Array(40).fill(actor),pickups:[],bullets:Array(180).fill({x:10,y:20,vx:2,vy:3}),thrown:[],effects:Array(256).fill({x:10,y:20,type:'smoke'}),missionStage:1,phaseHoldTime:0,squadGrenades:5,finished:false,win:false,checkpoint:null,stats:Array.from({length:4},(_,index)=>({index,name:'Unit '+index,kills:0,assists:0,alive:true}))};
let packet=P.snapshot(state,1);const noEffects={...packet,f:[]};const budget=P.bytes(JSON.stringify(noEffects));packet=P.budgetSnapshot(packet,budget);assert.equal(packet.f.length,0);assert.equal(packet.e.length,160);assert.equal(packet.b.length,180);assert(P.readSnapshot(packet));assert(P.bytes(P.encode(P.budgetSnapshot(P.snapshot(state,2))))<=P.SNAPSHOT_BYTES);
assert.throws(()=>P.budgetSnapshot(P.snapshot({...state,enemies:Array(512).fill({...actor,x:9999999.123456,y:9999999.123456,hp:9999999.123456,maxHp:9999999.123456})},3),1024),/gameplay state was not dropped/);
console.log('PASS: lifecycle guards, fixed steps, recovery, versioned/blocked storage, seeded RNG and UTF-8 snapshot budgets.');

const fs=require('node:fs'),vm=require('node:vm'),B=require('../mission-bootstrap');
const scope={window:{},localStorage:{getItem:()=>null,setItem(){}}};vm.createContext(scope);
for(const file of ['town-map.js','bad-belzig-data.js','wigan-map.js','cable-street-map.js','campaign.js'])vm.runInContext(fs.readFileSync(require('node:path').join(__dirname,'..',file),'utf8'),scope);
const maps=vm.runInContext('({"bad-belzig":TOWN_MAP,wigan:WIGAN_MAP,"cable-street":window.CABLE_STREET_MAP})',scope);
const missions=[...scope.window.BadFodderCampaign.missions.filter(m=>m.playable),...require('../historical-missions').missions];
for(const m of missions){assert(B.validateConfiguration(m,maps[m.map]));assert.throws(()=>B.validateConfiguration({...m,squadSize:0},maps[m.map]),/squad/);}
const first=missions[0];assert.throws(()=>B.validateConfiguration({...first,phases:[{...first.phases[0],zone:'missing'}]},maps[first.map]),/Unknown/);
console.log('PASS: all three current mission configurations validate without map changes; malformed mission configuration fails early.');

for(const value of [{storageSchema:1,value:7},{storageSchema:'1',value:'bad'},{storageSchema:2,value:'future'}]){raw.set('malformed',JSON.stringify(value));assert.equal(store.getItem('malformed'),null)}
raw.set('old','{"music":false}');assert.equal(store.getItem('old'),' {"music":false}'.trim());raw.set('broken','{bad');assert.equal(store.getItem('broken'),'{bad');
let accounting;R.fixedFrame({dt:1,accumulator:0,simulate(){},active:true,onSteps:v=>accounting=v});assert.equal(accounting.steps,5);assert(accounting.dropped>50&&accounting.capped);
const debug=R.diagnostics({read:()=>({mission:'wigan'})});assert.equal(debug.snapshot().mission,'wigan');

debug.start();debug.record(16,2,3);assert(debug.snapshot().fps>0&&debug.snapshot().simulationMs>0);

for(let i=0;i<12;i++)debug.rememberFault(Error('fault '+i));assert.equal(debug.snapshot().recentFaults.length,8);assert.equal(debug.snapshot().recentFaults.at(-1),'fault 11');
