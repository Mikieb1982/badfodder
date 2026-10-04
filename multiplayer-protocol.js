/* Small wire protocol. Intent only from P2; state only from the authoritative host. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.BadFodderCoopProtocol=api;})(typeof window!=='undefined'?window:globalThis,function(){
 'use strict';
 const VERSION=1,MAX_BYTES=65536,TYPES=new Set(['move','fire','grenade','garrison','release','select','stick']);
 const actorKeys=['x','y','hp','maxHp','alive','dir','state','variant','anim','objectiveGroup','groupId','fireTimer','hitTimer','throwTimer','deadTimer','deathAngle','flash','aiming','manualGarrison','garrisonAnchorX','garrisonAnchorY','checkpointCover','checkpointGarrison','checkpointHeld','checkpointFortified','checkpointFacing','checkpointCenterX','checkpointCenterY','checkpointSandbagRadius','checkpointFortificationPhase','checkpointFortificationLead','checkpointFortificationRearLead','checkpointFortificationFrontLead'];
 const itemKeys=['x','y','vx','vy','life','owner','type','active','optional','amount','startX','startY','tx','ty','t','flight','fuse','z','landed','angle'];
 const primitive=v=>v===null||typeof v==='boolean'||typeof v==='string'&&v.length<=64||typeof v==='number'&&Number.isFinite(v)&&Math.abs(v)<1e8;
 const pack=(obj,keys)=>keys.map(k=>primitive(obj[k])?obj[k]:null);
 const unpack=(row,keys)=>Object.fromEntries(keys.map((k,i)=>[k,row[i]]));
 function parse(raw){try{if(typeof raw!=='string'||raw.length>MAX_BYTES)return null;const v=JSON.parse(raw);return v&&typeof v==='object'&&!Array.isArray(v)?v:null;}catch{return null;}}
 function encode(packet){const text=JSON.stringify(packet);if(text.length>MAX_BYTES)throw new Error('Network packet too large');return text;}
 function validCommand(c,{player=1,squad=[],active=false,w=0,h=0}={}){
  if(!active||!c||!TYPES.has(c.type)||!Array.isArray(c.units)||c.units.length<1||c.units.length>2||new Set(c.units).size!==c.units.length)return false;
  if(!c.units.every(i=>Number.isInteger(i)&&i>=player*2&&i<player*2+2&&squad[i]?.alive))return false;
  if(['move','fire','grenade'].includes(c.type)&&(!Number.isFinite(c.x)||!Number.isFinite(c.y)||c.x<0||c.y<0||c.x>w||c.y>h))return false;
  if(c.type==='stick'&&(!Number.isFinite(c.x)||!Number.isFinite(c.y)||Math.abs(c.x)>1||Math.abs(c.y)>1))return false;
  return !['garrison','release'].includes(c.type)||c.units.length===1;
 }
 function limiter(rate=35,burst=45){let tokens=burst,last=0;return time=>{tokens=Math.min(burst,tokens+Math.max(0,time-last)*rate/1000);last=time;if(tokens<1)return false;tokens--;return true;};}
 function snapshot(s,seq){
  const rows=(list,keys)=>list.map(v=>pack(keys===actorKeys?{...v,alive:v.alive!==false,state:v.state||'idle',dir:v.dir||0}:v,keys));
  return {v:VERSION,t:'state',seq,s:rows(s.squad,actorKeys),e:rows(s.enemies,actorKeys),c:rows(s.civilians,actorKeys),p:rows(s.pickups,itemKeys),b:rows(s.bullets,itemKeys),g:rows(s.thrown,itemKeys),f:rows(s.effects,itemKeys),
   stage:s.missionStage,hold:s.phaseHoldTime,grenades:s.squadGrenades,done:s.finished,win:s.win,
   checkpoint:s.checkpoint?{phase:s.checkpoint.phase,started:!!s.checkpoint.started,cleared:!!s.checkpoint.cleared,style:s.checkpoint.style}:null,
   stats:s.stats.map(r=>[r.index,r.name,r.kills,r.alive])};
 }
 function readSnapshot(p){
  if(!p||p.v!==VERSION||p.t!=='state'||!Number.isSafeInteger(p.seq)||p.seq<0||!Number.isInteger(p.stage)||p.stage<0||p.stage>20||!Number.isFinite(p.hold)||p.hold<0||!Number.isInteger(p.grenades)||p.grenades<0||p.grenades>100||typeof p.done!=='boolean'||typeof p.win!=='boolean')return null;
  const list=(rows,keys,max)=>Array.isArray(rows)&&rows.length<=max&&rows.every(row=>Array.isArray(row)&&row.length===keys.length&&row.every(primitive));
  if(!list(p.s,actorKeys,4)||p.s.length!==4||!list(p.e,actorKeys,512)||!list(p.c,actorKeys,128)||!list(p.p,itemKeys,64)||!list(p.b,itemKeys,256)||!list(p.g,itemKeys,32)||!list(p.f,itemKeys,256))return null;
  if(![...p.s,...p.e,...p.c].every(r=>Number.isFinite(r[0])&&Number.isFinite(r[1])&&typeof r[4]==='boolean'&&Number.isFinite(r[5])&&['idle','walk','run','fire','hurt','throw','dead','stumble','aim'].includes(r[6])))return null;
  if(!Array.isArray(p.stats)||p.stats.length!==4||!p.stats.every((r,i)=>Array.isArray(r)&&r.length===4&&r[0]===i&&typeof r[1]==='string'&&r[1].length<64&&Number.isSafeInteger(r[2])&&r[2]>=0&&typeof r[3]==='boolean'))return null;
  if(p.checkpoint!==null&&(!p.checkpoint||!Number.isInteger(p.checkpoint.phase)||typeof p.checkpoint.started!=='boolean'||typeof p.checkpoint.cleared!=='boolean'||!['rush','pincer','siege'].includes(p.checkpoint.style)))return null;
  const rows=(list,keys)=>list.map(r=>unpack(r,keys));
  return {squad:rows(p.s,actorKeys),enemies:rows(p.e,actorKeys),civilians:rows(p.c,actorKeys),pickups:rows(p.p,itemKeys),bullets:rows(p.b,itemKeys),thrown:rows(p.g,itemKeys),effects:rows(p.f,itemKeys),missionStage:p.stage,phaseHoldTime:p.hold,squadGrenades:p.grenades,finished:p.done,win:p.win,checkpoint:p.checkpoint,stats:p.stats.map(r=>({index:r[0],name:r[1],kills:r[2],alive:r[3]}))};
 }
 const owner=i=>i<2?1:2;
 const totals=records=>[1,2].map(p=>records.filter(r=>owner(r.index)===p).reduce((n,r)=>n+r.kills,0));
 return {VERSION,MAX_BYTES,parse,encode,validCommand,limiter,snapshot,readSnapshot,owner,totals};
});
