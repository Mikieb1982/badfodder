/* Versioned storage envelopes. Legacy raw values migrate on first successful write. */
(function(root,factory){const api=factory(root);if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.BadFodderStorage=api;})(typeof window!=='undefined'?window:globalThis,root=>{
 'use strict';
 function create(getBackend){const memory=new Map();
  return {getItem(key){try{const raw=getBackend()?.getItem(key)??memory.get(key)??null;if(raw===null)return null;let value;try{value=JSON.parse(raw)}catch{return raw}if(value&&typeof value==='object'&&value.storageSchema!==undefined){if(value.storageSchema!==1||typeof value.value!=='string')return null;return value.value;}return raw;}catch{return memory.get(key)??null;}},
   setItem(key,value){value=String(value);memory.set(key,value);try{getBackend()?.setItem(key,JSON.stringify({storageSchema:1,value}))}catch{}},
   removeItem(key){memory.delete(key);try{getBackend()?.removeItem(key)}catch{}}};
 }
 const local=create(()=>root.localStorage),session=create(()=>root.sessionStorage);
 return {create,local,session};
});
