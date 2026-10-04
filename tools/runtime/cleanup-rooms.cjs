'use strict';
// Administrator-only scheduled expiry sweep. Never stores gameplay or logs credentials.
const token=process.env.FIREBASE_ACCESS_TOKEN;
const base='https://bad-fodder-default-rtdb.europe-west1.firebasedatabase.app/coopRooms';
(async()=>{
 if(!token)throw Error('Missing Firebase service-account access token');
 const headers={Authorization:'Bearer '+token},now=Date.now();let removed=0;
 for(let page=0;page<20;page++){
  const query=new URLSearchParams({orderBy:'"expires"',endAt:String(now),limitToFirst:'100'});
  const response=await fetch(base+'.json?'+query,{headers,signal:AbortSignal.timeout(15000)});if(!response.ok)throw Error('Expiry query failed: '+response.status);
  const rooms=await response.json()||{},entries=Object.entries(rooms);if(!entries.length)break;
  for(const [code,room] of entries){if(!/^RABBIT-[A-HJ-NP-Z2-9]{10}$/.test(code)||!Number.isFinite(room?.expires)||room.expires>now)throw Error('Unexpected expired room');const result=await fetch(base+'/'+code+'.json',{method:'DELETE',headers,signal:AbortSignal.timeout(15000)});if(!result.ok)throw Error('Expiry deletion failed: '+result.status);removed++;}
 }
 console.log('Removed expired signalling rooms:',removed);
})().catch(e=>{console.error(e.message);process.exitCode=1});
