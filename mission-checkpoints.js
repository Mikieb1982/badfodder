/* Local mission checkpoints. Shared references, Maps and Sets survive a restart. */
(function(root,factory){const api=factory(root);if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.BadFodderCheckpoints=api;})(typeof window!=='undefined'?window:globalThis,root=>{
'use strict';
const KEY='badfodder.mission-checkpoint.v1',REQUEST='badfodder.checkpoint.resume.v1',LIMIT=4*1024*1024;
const forbidden=k=>['__proto__','constructor','prototype'].includes(k);
function encode(value){
 const nodes=[],seen=new Map();
 function visit(v){
  if(v===null||['string','boolean'].includes(typeof v))return v;
  if(typeof v==='number')return Number.isFinite(v)?v:{number:String(v)};
  if(typeof v!=='object')return null;
  if(seen.has(v))return {ref:seen.get(v)};
  if(!(Array.isArray(v)||v instanceof Map||v instanceof Set||Object.getPrototypeOf(v)===Object.prototype||Object.getPrototypeOf(v)===null))return null;
  const id=nodes.length;seen.set(v,id);nodes.push(null);
  nodes[id]=v instanceof Map?{type:'map',value:[...v].map(([k,x])=>[visit(k),visit(x)])}:v instanceof Set?{type:'set',value:[...v].map(visit)}:Array.isArray(v)?{type:'array',value:v.map(visit)}:{type:'object',value:Object.entries(v).filter(([k,x])=>!forbidden(k)&&typeof x!=='function').map(([k,x])=>[k,visit(x)])};
  return {ref:id};
 }
 const entry=visit(value);return {entry,nodes};
}
function decode(graph){
 if(!graph||!Array.isArray(graph.nodes)||graph.nodes.length>100000)throw Error('Invalid checkpoint graph.');
 const nodes=graph.nodes.map(n=>{if(!n||!Array.isArray(n.value))throw Error('Invalid checkpoint node.');switch(n.type){case 'map':return new Map();case 'set':return new Set();case 'array':return [];case 'object':return {};default:throw Error('Invalid checkpoint type.');}});
 function resolve(v){if(v===null||['string','boolean'].includes(typeof v)||typeof v==='number'&&Number.isFinite(v))return v;if(!v||typeof v!=='object')throw Error('Invalid checkpoint value.');if(Object.hasOwn(v,'number')&&['Infinity','-Infinity','NaN'].includes(v.number))return Number(v.number);if(Number.isInteger(v.ref)&&v.ref>=0&&v.ref<nodes.length)return nodes[v.ref];throw Error('Invalid checkpoint reference.');}
 graph.nodes.forEach((n,i)=>{const out=nodes[i];for(const entry of n.value){if(n.type==='array')out.push(resolve(entry));else if(n.type==='set')out.add(resolve(entry));else{if(!Array.isArray(entry)||entry.length!==2)throw Error('Invalid checkpoint entry.');if(n.type==='map')out.set(resolve(entry[0]),resolve(entry[1]));else{if(typeof entry[0]!=='string'||forbidden(entry[0]))throw Error('Invalid checkpoint property.');out[entry[0]]=resolve(entry[1]);}}}});
 return resolve(graph.entry);
}
function validate(text){
 if(typeof text!=='string'||text.length>LIMIT)throw Error('Saved mission is too large.');
 const save=JSON.parse(text);
 if(!save||save.version!==1||save.rules!==1||!['bad-belzig','wigan','cable-street','barcelona'].includes(save.map)||!['campaign','select','historical','resistance'].includes(save.mode)||typeof save.missionId!=='string'||typeof save.title!=='string'||!Number.isFinite(save.savedAt))throw Error('Unsupported saved mission.');
 const data=decode(save.graph);
 for(const key of ['squad','enemies','civilians','pickups','bullets','thrown','effects'])if(!Array.isArray(data?.[key])||data[key].length>10000)throw Error('Invalid mission actors.');
 if(data.squad.length<1||data.squad.length>8||!data.squad.some(u=>u?.alive&&!u.downed)||data.finished||!data.objectives||!data.health||!data.companion||!Number.isFinite(data.missionStage)||!Number.isFinite(data.phaseHoldTime)||!Number.isFinite(data.squadGrenades))throw Error('Invalid saved mission state.');
 for(const unit of [...data.squad,...data.enemies,...data.civilians])if(!unit||!Number.isFinite(unit.x)||!Number.isFinite(unit.y)||typeof unit.alive!=='boolean')throw Error('Invalid saved actor position.');
 return {save,data};
}
function create({local,session,context,capture,restore,launch,onError=()=>{}}){
 let elapsed=0,lastSignature=null,armed=false,launching=false;
 const current=()=>context();
 function read(){try{const text=local.getItem(KEY);return text?validate(text):null;}catch{return null;}}
 function matching(save,info){return save&&save.map===info.map&&save.mode===info.mode&&save.missionId===info.missionId;}
 function save(){const info=current();if(launching||!info.active||info.networked||!info.playable)return false;
  try{const data=capture(),record={version:1,rules:1,map:info.map,mode:info.mode,missionId:info.missionId,title:info.title,savedAt:Date.now(),graph:encode(data)},text=JSON.stringify(record);validate(text);if(local.setItem(KEY,text)===false)throw Error('Device storage could not save this checkpoint.');elapsed=0;lastSignature=info.signature;return true;}catch(error){onError(error.message);return false;}}
 function frame(dt,active){const info=current();if(info.networked||!info.active){if(info.finished&&matching(read()?.save,info))local.removeItem(KEY);return;}if(!active)return;elapsed+=dt;if(!armed){armed=true;elapsed=0;lastSignature=info.signature;}if(elapsed>=30||info.signature!==lastSignature&&elapsed>=2)save();}
 function request(restart=false){const entry=read();if(!entry)return false;if(restart){local.removeItem(KEY);session.removeItem(REQUEST);}else if(session.setItem(REQUEST,JSON.stringify({map:entry.save.map,mode:entry.save.mode,missionId:entry.save.missionId}))===false){onError('Could not prepare the saved mission.');return false;}launching=true;launch(entry.save);return true;}
 function restoreCurrent(){launching=false;armed=false;elapsed=0;lastSignature=null;let requested;try{requested=JSON.parse(session.getItem(REQUEST)||'null')}catch{}session.removeItem(REQUEST);
  const entry=read(),info=current();if(!requested){if(matching(entry?.save,info))local.removeItem(KEY);return false;}if(info.networked||!entry||!matching(entry.save,info)||!matching(requested,info)){onError('Saved mission is unavailable. Starting a fresh mission.');return false;}
  try{restore(entry.data);lastSignature=current().signature;return true;}catch(error){throw Error('Saved mission could not be restored: '+error.message);}
 }
 return {read,save,frame,request,restoreCurrent};
}
let manager=null;
function install(options){manager=create(options);if(!root.document)return manager;
 const main=root.document.querySelector('[data-view="main"] .menu-actions');if(main){
  const resume=root.document.createElement('button'),restart=root.document.createElement('button'),note=root.document.createElement('p');
  resume.id='resumeSavedGame';restart.id='restartSavedGame';for(const button of [resume,restart]){button.type='button';button.className='menu-button';main.insertBefore(button,main.firstChild);}
  resume.textContent='RESUME SAVED GAME';restart.textContent='RESTART SAVED MISSION';note.className='menu-copy';note.id='checkpointStatus';main.insertBefore(note,resume);
  function refresh(){const entry=manager.read();for(const node of [resume,restart,note])if(node.hidden!==!entry)node.hidden=!entry;note.textContent=entry?'Saved: '+entry.save.title+' · '+new Date(entry.save.savedAt).toLocaleString():'';}
  resume.onclick=()=>manager.request();restart.onclick=()=>manager.request(true);refresh();new MutationObserver(refresh).observe(root.document.getElementById('menuScreen'),{attributes:true,subtree:true,attributeFilter:['hidden']});
 }
 root.addEventListener('pagehide',()=>manager.save());root.document.addEventListener('visibilitychange',()=>{if(root.document.hidden)manager.save();});return manager;
}
return {KEY,REQUEST,encode,decode,validate,create,install,frame:(dt,active)=>manager?.frame(dt,active),save:()=>manager?.save(),restoreCurrent:()=>manager?.restoreCurrent()};
});
