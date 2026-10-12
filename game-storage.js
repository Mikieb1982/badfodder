/* Versioned storage envelopes. Legacy raw values migrate on first successful write. */
(function(root,factory){const api=factory(root);if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.BadFodderStorage=api;})(typeof window!=='undefined'?window:globalThis,root=>{
 'use strict';
 function decode(raw){if(raw===null)return null;let value;try{value=JSON.parse(raw)}catch{return raw}if(value&&typeof value==='object'&&Object.hasOwn(value,'storageSchema'))return value.storageSchema===1&&typeof value.value==='string'?value.value:null;return raw;}
 function create(getBackend){const memory=new Map(),pending=new Set();let status={persisted:null,savedAt:null,error:null};
  return {get status(){return {...status}},getItem(key){if(pending.has(key))return memory.get(key)??null;try{return decode(getBackend()?.getItem(key)??memory.get(key)??null)}catch{return memory.get(key)??null;}},
   setItem(key,value){value=String(value);memory.set(key,value);pending.add(key);try{const backend=getBackend();if(!backend)throw Error('Storage unavailable');const savedAt=Date.now();backend.setItem(key,JSON.stringify({storageSchema:1,value,savedAt}));pending.delete(key);status={persisted:true,savedAt,error:null};return true}catch(error){status={persisted:false,savedAt:status.savedAt,error:String(error.message||error)};return false}},
   removeItem(key){memory.delete(key);pending.add(key);try{const backend=getBackend();if(!backend)throw Error('Storage unavailable');backend.removeItem(key);pending.delete(key);return true}catch{return false}}};
 }
 const local=create(()=>root.localStorage),session=create(()=>root.sessionStorage);
 return {create,local,session};
});
