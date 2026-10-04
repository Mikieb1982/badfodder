/* Seeded gameplay RNG for tests and reproducible bug reports; default stays native. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.BadFodderRng=api;})(typeof window!=='undefined'?window:globalThis,()=>{
 'use strict';
 function create(seed){if(seed===undefined||seed===null)return {seed:null,random:()=>Math.random()};let state=2166136261;for(const ch of String(seed)){state^=ch.charCodeAt(0);state=Math.imul(state,16777619)}state>>>=0;
  return {seed:String(seed),random(){state=(state+0x6D2B79F5)>>>0;let t=Math.imul(state^state>>>15,1|state);t^=t+Math.imul(t^t>>>7,61|t);return ((t^t>>>14)>>>0)/4294967296;}};
 }
 return {create};
});
