'use strict';
const assert=require('node:assert/strict');
const C=require('../player-commands'),P=require('../multiplayer-protocol');
const squad=Array.from({length:4},(_,i)=>({alive:true,x:100+i,y:200,hp:8,maxHp:8,dir:0,state:'idle',variant:i}));
assert.equal(C.mode,'local');assert.equal(C.dispatch('move',[0],{x:1,y:2}),false);assert.equal(C.units(squad,'all').length,4);
let received;C.configure('client',c=>received=c);assert.deepEqual(C.units(squad,'all'),squad.slice(2));assert.equal(C.units(squad,0).length,0);assert(!C.owns(0));assert(C.owns(2));
const context={player:1,squad,active:true,w:1000,h:1000};
for(const type of ['move','fire','grenade','garrison','release','select','stick']){
 C.dispatch(type,[2],{x:1,y:1});const decoded=P.parse(P.encode(received));assert(P.validCommand(decoded,context));
 assert(!P.validCommand({...decoded,units:[0]},context));assert(!P.validCommand({...decoded,units:[2,2]},context));
 assert(!P.validCommand(decoded,{...context,active:false}));
}
assert(!P.validCommand({type:'eval',units:[2]},context));assert(!P.validCommand({type:'move',units:[2],x:Infinity,y:0},context));assert(!P.validCommand({type:'fire',units:[2],x:2000,y:0},context));assert(!P.parse('{'));assert(!P.parse('x'.repeat(70000)));assert(!P.parse('[]'));
squad[2].alive=false;assert(!P.validCommand({type:'select',units:[2]},context));squad[2].alive=true;
let calls=0;C.configure('host',()=>calls++);C.apply([2],()=>{assert.deepEqual(C.units(squad,'all'),[squad[2]]);assert.equal(C.dispatch('move',[2]),false)});assert.equal(calls,0);
const rate=P.limiter(10,2);assert(rate(0)&&rate(0)&&!rate(0));assert(rate(100));
const state={squad,enemies:[{...squad[0],alive:false,state:'dead'}],civilians:[],pickups:[],bullets:[],thrown:[],effects:[],missionStage:1,phaseHoldTime:2,squadGrenades:4,finished:false,win:false,checkpoint:{phase:1,style:'pincer',started:true,cleared:false},stats:squad.map((s,i)=>({index:i,name:'Unit '+i,kills:i,alive:true}))};
state.squad[2].manualGarrison=true;const wire=P.snapshot(state,1),result=P.readSnapshot(P.parse(P.encode(wire)));assert(result);assert.equal(result.squad[2].manualGarrison,true);assert.equal(result.enemies[0].alive,false);assert.equal(result.checkpoint.started,true);
for(const win of [false,true]){state.finished=true;state.win=win;const out=P.readSnapshot(P.snapshot(state,2));assert(out.finished);assert.equal(out.win,win);}
assert(!P.readSnapshot({...wire,s:[]}));assert(!P.readSnapshot({...wire,stats:[[0,'x',-1,true]]}));assert.deepEqual(P.totals(state.stats),[1,5]);
C.configure();assert.equal(C.units(squad,'all').length,4);
console.log('PASS: local default, ownership, input intents, wire validation, rate limits, garrison/death/checkpoints/results and report totals.');

const S=require('../multiplayer-signalling');
const crypto={getRandomValues(a){a.fill(3);return a;}};
const code=S.roomCode(crypto);assert(S.validCode(code));assert(!S.validCode('../rooms'));assert(!S.validCode('RABBIT-1234'));
const time=1000000,offer={type:'offer',sdp:'fake-sdp'};
const room={host:'h',mission:'wigan',created:time,expires:time+S.TTL,offer};
assert(S.validRoom(room,time));assert(!S.validRoom(room,time+S.TTL));assert(!S.validRoom({...room,mission:'cable-street'},time));
(async()=>{
 const calls=[],store={};let user=0;
 const fetch=async(url,options={})=>{
  calls.push([url,options]);let value,status=200;
  if(url.includes('identitytoolkit'))value={idToken:'token'+(++user),localId:'u'+user};
  else if(options.method==='DELETE'){delete store.room;value=null;}
  else if(options.method==='PUT'){
   const body=JSON.parse(options.body);
   if(url.includes('/answer.json'))store.room.answer=body;
   else if(url.includes('/joiner.json'))store.room.joiner=body;
   else {assert.equal(options.headers['if-match'],'null_etag');store.room=body;}
   value=body;
  }else value=store.room;
  return {ok:status===200,status,json:async()=>value};
 };
 const config={apiKey:'test',databaseURL:'https://test-default-rtdb.firebaseio.com'};
 const host=S.create({fetch,now:()=>time,crypto,config}),join=S.create({fetch,now:()=>time,crypto,config});
 assert.equal(await host.createRoom('wigan',offer),code);assert.equal((await join.joinRoom(code)).mission,'wigan');await join.answer({type:'answer',sdp:'reply'});assert.equal((await host.read()).answer.sdp,'reply');
 await host.cleanup();assert.equal(store.room,undefined);
 assert(calls.every(([url])=>!url.includes('firestore')&&!url.includes('functions')));
 await assert.rejects(S.create({fetch,config:{apiKey:'x',databaseURL:''}}).initialise(),/NOT CONFIGURED/);
 const Session=require('../multiplayer-session');let closed=false,sent=[];
 class RTC{
  constructor(){this.connectionState='new';this.iceGatheringState='complete';}
  createDataChannel(label,options){assert(label==='control'?options.ordered:options.maxRetransmits===0);return {label,readyState:'open',bufferedAmount:0,send:v=>sent.push(v),close(){closed=true}};}
  async createOffer(){return offer}async createAnswer(){return {type:'answer',sdp:'reply'}}async setLocalDescription(v){this.localDescription=v}async setRemoteDescription(v){this.remote=v}
  close(){closed=true;}
 }
 const p=Session.peer({host:true,RTC});assert.deepEqual(await p.offer(),offer);await p.accept({type:'answer',sdp:'reply'});assert(p.sendControl('command'));assert(p.sendState('state'));assert.deepEqual(sent,['command','state']);p.close();assert(closed);
 console.log('PASS: room create/join/answer/expiry/cleanup, missing-config isolation and native reliable/unreliable peer channels.');
})().catch(e=>{console.error(e);process.exitCode=1});
