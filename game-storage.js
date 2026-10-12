/* Versioned storage envelopes. Legacy raw values migrate on first successful write. */
(function(root,factory){const api=factory(root);if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.BadFodderStorage=api;})(typeof window!=='undefined'?window:globalThis,root=>{
 'use strict';
 function decode(raw){if(raw===null)return null;let value;try{value=JSON.parse(raw)}catch{return raw}if(value&&typeof value==='object'&&Object.hasOwn(value,'storageSchema'))return value.storageSchema===1&&typeof value.value==='string'?value.value:null;return raw;}
 const TRANSACTION_KEY='badfodder.storage.transaction.v1';
 function create(getBackend){const memory=new Map(),pending=new Set();let status={persisted:null,savedAt:null,error:null};
  function overrides(backend){const raw=backend?.getItem(TRANSACTION_KEY);if(!raw)return {};const value=JSON.parse(raw);if(value.version!==1||!value.values||typeof value.values!=='object'||Array.isArray(value.values))throw Error('Invalid storage transaction');return value.values;}
  function write(backend,key,value){const values=overrides(backend);if(Object.hasOwn(values,key)){values[key]=value;backend.setItem(TRANSACTION_KEY,JSON.stringify({version:1,values}));}else if(value===null)backend.removeItem(key);else backend.setItem(key,JSON.stringify({storageSchema:1,value,savedAt:Date.now()}));}
  return {importItems(entries){const backend=getBackend();if(!backend)throw Error('Device storage is unavailable.');const values={...overrides(backend)};for(const [key,value] of entries){if(key===TRANSACTION_KEY||typeof value!=='string')throw Error('Invalid storage import');values[key]=value;}
   // One atomic backend write commits the entire import. Existing keys remain the last good save if it fails.
   backend.setItem(TRANSACTION_KEY,JSON.stringify({version:1,values}));for(const [key,value] of entries){memory.set(key,value);pending.delete(key);}status={persisted:pending.size===0,savedAt:Date.now(),error:null};return entries.length;},get status(){return {...status}},getItem(key){if(pending.has(key))return memory.get(key)??null;try{const backend=getBackend(),values=overrides(backend);return Object.hasOwn(values,key)?values[key]:decode(backend?backend.getItem(key)??null:memory.get(key)??null)}catch{return memory.get(key)??null;}},
   setItem(key,value){value=String(value);memory.set(key,value);pending.add(key);try{const backend=getBackend();if(!backend)throw Error('Storage unavailable');const savedAt=Date.now();write(backend,key,value);pending.delete(key);status={persisted:pending.size===0,savedAt,error:pending.size?status.error:null};return true}catch(error){status={persisted:false,savedAt:status.savedAt,error:String(error.message||error)};return false}},
   removeItem(key){memory.delete(key);pending.add(key);try{const backend=getBackend();if(!backend)throw Error('Storage unavailable');write(backend,key,null);pending.delete(key);return true}catch{return false}}};
 }
 const local=create(()=>root.localStorage),session=create(()=>root.sessionStorage);
 return {create,local,session};
});
