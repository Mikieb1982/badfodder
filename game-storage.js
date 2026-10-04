/* Versioned storage envelopes. Legacy raw values migrate on first successful write. */
(function(root,factory){const api=factory(root);if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.BadFodderStorage=api;})(typeof window!=='undefined'?window:globalThis,root=>{
 'use strict';
 function decode(raw){if(raw===null)return null;let value;try{value=JSON.parse(raw)}catch{return raw}if(value&&typeof value==='object'&&Object.hasOwn(value,'storageSchema'))return value.storageSchema===1&&typeof value.value==='string'?value.value:null;return raw;}
 function create(getBackend){const memory=new Map();
  return {getItem(key){try{return decode(getBackend()?.getItem(key)??memory.get(key)??null)}catch{return memory.get(key)??null;}},
   setItem(key,value){value=String(value);memory.set(key,value);try{getBackend()?.setItem(key,JSON.stringify({storageSchema:1,value}))}catch{}},
   removeItem(key){memory.delete(key);try{getBackend()?.removeItem(key)}catch{}}};
 }
 const local=create(()=>root.localStorage),session=create(()=>root.sessionStorage);
 return {create,local,session};
});
