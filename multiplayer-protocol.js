/* Small wire protocol. Intent only from P2; state only from the authoritative host. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.BadFodderCoopProtocol=api;})(typeof window!=='undefined'?window:globalThis,function(){
 'use strict';
 const VERSION=1,MAX_BYTES=65536,SNAPSHOT_BYTES=60*1024,TYPES=new Set(['move','fire','grenade','garrison','release','select','stick','aid','interact']);
 const actorKeys=['x','y','hp','maxHp','alive','dir','state','variant','anim','objectiveGroup','groupId','fireTimer','hitTimer','throwTimer','deadTimer','deathAngle','flash','aiming','manualGarrison','garrisonAnchorX','garrisonAnchorY','checkpointCover','checkpointGarrison','checkpointHeld','checkpointFortified','checkpointFacing','checkpointCenterX','checkpointCenterY','checkpointSandbagRadius','checkpointFortificationPhase','checkpointFortificationLead','checkpointFortificationRearLead','checkpointFortificationFrontLead'];
 const itemKeys=['x','y','vx','vy','life','owner','type','active','optional','amount','startX','startY','tx','ty','t','flight','fuse','z','landed','angle'];
 const primitive=v=>v===null||typeof v==='boolean'||typeof v==='string'&&v.length<=80||typeof v==='number'&&Number.isFinite(v)&&Math.abs(v)<1e8;
 const pack=(obj,keys)=>keys.map(k=>primitive(obj[k])?obj[k]:null);
 const unpack=(row,keys)=>Object.fromEntries(keys.map((k,i)=>[k,row[i]]));
 const bytes=text=>new TextEncoder().encode(text).byteLength;
 function parse(raw){try{if(typeof raw!=='string'||(raw.length>MAX_BYTES||bytes(raw)>MAX_BYTES))return null;const v=JSON.parse(raw);return v&&typeof v==='object'&&!Array.isArray(v)?v:null;}catch{return null;}}
 function encode(packet){const text=JSON.stringify(packet);if(bytes(text)>MAX_BYTES)throw new Error('Network packet too large');return text;}
 function validCommand(c,{player=1,squad=[],active=false,w=0,h=0}={}){
  if(!active||!c||!TYPES.has(c.type)||!Array.isArray(c.units)||c.units.length<1||c.units.length>2||new Set(c.units).size!==c.units.length)return false;
  if(!c.units.every(i=>Number.isInteger(i)&&i>=player*2&&i<player*2+2&&squad[i]?.alive&&!squad[i]?.downed))return false;
  if(['move','fire','grenade'].includes(c.type)&&(!Number.isFinite(c.x)||!Number.isFinite(c.y)||c.x<0||c.y<0||c.x>w||c.y>h))return false;
  if(c.type==='stick'&&(!Number.isFinite(c.x)||!Number.isFinite(c.y)||Math.abs(c.x)>1||Math.abs(c.y)>1))return false;
  return !['garrison','release'].includes(c.type)||c.units.length===1;
 }
 function limiter(rate=40,burst=50){let tokens=burst,last=0;return time=>{tokens=Math.min(burst,tokens+Math.max(0,time-last)*rate/1000);last=time;if(tokens<1)return false;tokens--;return true;};}
 function snapshot(s,seq){
  const rows=(list,keys)=>list.map(v=>pack(keys===actorKeys?{...v,alive:v.alive!==false,state:v.state||'idle',dir:v.dir||0}:v,keys));
  return {v:VERSION,t:'state',seq,s:rows(s.squad,actorKeys),e:rows(s.enemies,actorKeys),c:rows(s.civilians,actorKeys),p:rows(s.pickups,itemKeys),b:rows(s.bullets,itemKeys),g:rows(s.thrown,itemKeys),f:rows(s.effects,itemKeys),
   stage:s.missionStage,hold:s.phaseHoldTime,grenades:s.squadGrenades,done:s.finished,win:s.win,
   ...(s.objectives?{objectives:s.objectives}:{}),
   ...(s.health?{health:s.health}:{}),
   ...(s.civilianState?{civilianState:s.civilianState}:{}),
   ...(s.buildingState?{buildingState:s.buildingState}:{}),
   ...(s.tactics?{tactics:s.tactics}:{}),
   checkpoint:s.checkpoint?{phase:s.checkpoint.phase,started:!!s.checkpoint.started,cleared:!!s.checkpoint.cleared,style:s.checkpoint.style}:null,
   stats:s.stats.map(r=>[r.index,r.name,r.kills,Number.isSafeInteger(r.assists)?r.assists:0,r.alive])};
 }
 function budgetSnapshot(packet,budget=SNAPSHOT_BYTES){
  if(!Number.isInteger(budget)||budget<1||budget>MAX_BYTES)throw new Error('Invalid snapshot byte budget');
  let result=packet;if(bytes(JSON.stringify(result))<=budget)return result;
  result={...packet,f:[]}; // Effects are cosmetic. Projectiles, actors and objectives stay complete.
  if(bytes(JSON.stringify(result))>budget){
   const cosmetic=['anim','hitTimer','throwTimer','deathAngle','flash','aiming'].map(k=>actorKeys.indexOf(k));
   for(const key of ['s','e','c'])result[key]=packet[key].map(row=>row.map((v,i)=>cosmetic.includes(i)?null:v));
  }
  if(bytes(JSON.stringify(result))>budget)throw new Error('Co-op snapshot exceeds byte budget; gameplay state was not dropped');
  return result;
 }
 function readSnapshot(p){
  if(!p||p.v!==VERSION||p.t!=='state'||!Number.isSafeInteger(p.seq)||p.seq<0||!Number.isInteger(p.stage)||p.stage<0||p.stage>20||!Number.isFinite(p.hold)||p.hold<0||!Number.isInteger(p.grenades)||p.grenades<0||p.grenades>100||typeof p.done!=='boolean'||typeof p.win!=='boolean')return null;
  const list=(rows,keys,max)=>Array.isArray(rows)&&rows.length<=max&&rows.every(row=>Array.isArray(row)&&row.length===keys.length&&row.every(primitive));
  if(!list(p.s,actorKeys,4)||p.s.length!==4||!list(p.e,actorKeys,512)||!list(p.c,actorKeys,128)||!list(p.p,itemKeys,64)||!list(p.b,itemKeys,256)||!list(p.g,itemKeys,32)||!list(p.f,itemKeys,256))return null;
  if(![...p.s,...p.e,...p.c].every(r=>Number.isFinite(r[0])&&Number.isFinite(r[1])&&typeof r[4]==='boolean'&&Number.isFinite(r[5])&&['idle','walk','run','fire','hurt','throw','dead','stumble','aim'].includes(r[6])))return null;
  if(!Array.isArray(p.stats)||p.stats.length!==4||!p.stats.every((r,i)=>Array.isArray(r)&&(r.length===4||r.length===5)&&r[0]===i&&typeof r[1]==='string'&&r[1].length<64&&Number.isSafeInteger(r[2])&&r[2]>=0&&(r.length===4||Number.isSafeInteger(r[3])&&r[3]>=0)&&typeof r[r.length-1]==='boolean'))return null;
  if(p.checkpoint!==null&&(!p.checkpoint||!Number.isInteger(p.checkpoint.phase)||typeof p.checkpoint.started!=='boolean'||typeof p.checkpoint.cleared!=='boolean'||!['rush','pincer','siege'].includes(p.checkpoint.style)))return null;
  if(p.objectives!=null&&!validObjectives(p.objectives))return null;
  if(p.health!=null&&!validHealth(p.health,p.s))return null;
  if(p.civilianState!=null&&(!Array.isArray(p.civilianState)||p.civilianState.length!==p.c.length||!p.civilianState.every(r=>Array.isArray(r)&&r.length===3&&['CALM','FRIGHTENED','HIDING','FOLLOWING','FLEEING','EVACUATED','WOUNDED','DOWN','DEAD'].includes(r[0])&&(r[1]===null||Number.isInteger(r[1])&&r[1]>=0&&r[1]<4)&&(r[2]===null||Number.isFinite(r[2])&&r[2]>=0&&r[2]<=86400))))return null;
  if(p.tactics!=null){
   const valid=(r,n)=>Array.isArray(r)&&r.length===n&&r.every(v=>Array.isArray(v)&&v.length===2&&Number.isFinite(v[0])&&v[0]>=0&&v[0]<=1&&Number.isInteger(v[1])&&v[1]>=0&&v[1]<=255);
   if(!p.tactics||!valid(p.tactics.squad,p.s.length)||!valid(p.tactics.enemies,p.e.length))return null;
  }
  if(p.buildingState!=null){
   const b=p.buildingState,id=v=>typeof v==='string'&&v.length<=80;
   if(!b||!Array.isArray(b.units)||b.units.length!==4||!b.units.every(v=>v===null||id(v))||!Array.isArray(b.sites)||b.sites.length>12||!b.sites.every(r=>Array.isArray(r)&&r.length===5&&id(r[0])&&r.slice(1).every(v=>typeof v==='boolean'))||new Set(b.sites.map(r=>r[0])).size!==b.sites.length||!b.units.every(v=>v===null||b.sites.some(r=>r[0]===v)))return null;
  }
  const rows=(list,keys)=>list.map(r=>unpack(r,keys));
  return {squad:rows(p.s,actorKeys),enemies:rows(p.e,actorKeys),civilians:rows(p.c,actorKeys),pickups:rows(p.p,itemKeys),bullets:rows(p.b,itemKeys),thrown:rows(p.g,itemKeys),effects:rows(p.f,itemKeys),missionStage:p.stage,phaseHoldTime:p.hold,squadGrenades:p.grenades,finished:p.done,win:p.win,checkpoint:p.checkpoint,objectives:p.objectives||null,health:p.health||null,civilianState:p.civilianState||null,buildingState:p.buildingState||null,tactics:p.tactics||null,stats:p.stats.map(r=>({index:r[0],name:r[1],kills:r[2],assists:r.length===5?r[3]:0,alive:r[r.length-1]}))};
 }
 function validObjectives(saved){
  try{
   const list=saved?.manager?.objectives;
   if(bytes(JSON.stringify(saved))>16384||!Array.isArray(list)||!list.length||list.length>32||!Array.isArray(saved.holds)||saved.holds.length>32)return false;
   if(!list.every(o=>typeof o.id==='string'&&o.id.length<=80&&typeof o.title==='string'&&o.title.length<=512&&typeof o.text==='string'&&o.text.length<=512))return false;
   const runtime=typeof module==='object'&&module.exports?require('./mission-objectives.js'):globalThis.BadFodderObjectives;
   runtime.create({objectives:list}).restore(saved);
   return true;
  }catch{return false}
 }
 function validHealth(list,actors){
  const states=['FIT','WOUNDED','BADLY_WOUNDED','DOWN','DEAD'];
  const index=v=>v===null||Number.isInteger(v)&&v>=0&&v<4;
  return Array.isArray(list)&&list.length===4&&list.every((r,i)=>
   Array.isArray(r)&&r.length===6&&states.includes(r[0])&&typeof r[1]==='boolean'&&typeof r[2]==='boolean'
   &&(r[3]===null||Number.isFinite(r[3])&&r[3]>=0&&r[3]<=86400)&&index(r[4])&&index(r[5])
   &&r[4]!==i&&r[5]!==i&&r[1]===(r[0]==='DOWN')&&(r[0]==='DEAD')===!actors[i][4]
   &&(r[4]===null||r[1]&&list[r[4]]?.[5]===i)&&(r[5]===null||!r[1]&&list[r[5]]?.[4]===i));
 }
 const owner=i=>i<2?1:2;
 const totals=records=>[1,2].map(p=>records.filter(r=>owner(r.index)===p).reduce((n,r)=>n+r.kills,0));
 const assistTotals=records=>[1,2].map(p=>records.filter(r=>owner(r.index)===p).reduce((n,r)=>n+(r.assists||0),0));
 return {VERSION,MAX_BYTES,SNAPSHOT_BYTES,bytes,budgetSnapshot,parse,encode,validCommand,limiter,snapshot,readSnapshot,owner,totals,assistTotals};
});
