'use strict';
// Execute against the actual RTDB rules, not a permissive mock.
const assert=require('node:assert/strict');
const origin='http://'+(process.env.FIREBASE_DATABASE_EMULATOR_HOST||'127.0.0.1:9000');
const url=code=>origin+'/coopRooms/'+code+'.json?ns=demo-badfodder-default-rtdb';
const request=(code,method,data)=>fetch(url(code),{method,headers:{'Content-Type':'application/json'},...(data===undefined?{}:{body:JSON.stringify(data)})});
const sub=(code,field,method,data)=>fetch(url(code).replace('.json?', '/'+field+'.json?'),{method,headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
const code='RABBIT-ABCDEFGHJK',time=Date.now();
const room={host:'HOSTPEER1',mission:'wigan',created:time,expires:time+1000,offer:{type:'offer',sdp:'test-offer'}};
(async()=>{
 assert((await request(code,'PUT',room)).ok,'create');
 assert(!(await request(code,'PUT',room)).ok,'overwrite denied');
 assert(!(await sub(code,'answer','PUT',{type:'answer',sdp:'premature'})).ok,'answer before join denied');
 assert((await sub(code,'joiner','PUT','JOINPEER1')).ok,'join');
 assert(!(await sub(code,'joiner','PUT','JOINPEER2')).ok,'second join denied');
 assert((await sub(code,'answer','PUT',{type:'answer',sdp:'test-answer'})).ok,'answer');
 assert(!(await sub(code,'answer','PUT',{type:'offer',sdp:'bad'})).ok,'rewrite denied');
 assert(!(await sub(code,'expires','PUT',Date.now()+900000)).ok,'expiry cannot extend');
 assert(!(await sub(code,'extra','PUT','bad')).ok,'unknown fields denied');
 await new Promise(r=>setTimeout(r,1100));
 assert(!(await request(code,'GET')).ok,'expired read denied');
 assert(!(await sub(code,'joiner','PUT','JOINPEER3')).ok,'expired join denied');
 assert((await request(code,'DELETE')).ok,'expired room cleanup');
 for(const bad of [{...room,created:Date.now(),expires:Date.now()+10000,mission:'cable-street'},{...room,created:Date.now(),expires:Date.now()+10000,offer:{type:'answer',sdp:'bad'}},{...room,created:Date.now(),expires:Date.now()+1000000},{...room,created:Date.now(),expires:Date.now()+10000,extra:1},{...room,created:Date.now(),expires:Date.now()+10000,answer:{type:'answer',sdp:'bad'}}])assert(!(await request(code,'PUT',bad)).ok,'invalid create denied');
 const fresh={...room,created:Date.now(),expires:Date.now()+10000};assert((await request(code,'PUT',fresh)).ok);assert((await request(code,'DELETE')).ok,'live cleanup');
 console.log('PASS: actual database rules enforce create/join/answer/expiry/deletion and invalid writes.');
})().catch(e=>{console.error(e);process.exitCode=1});
