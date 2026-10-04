/* Optional input boundary. Local mode retains the original simulation and selection. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.BadFodderCommands=api;})(typeof window!=='undefined'?window:globalThis,function(){
 'use strict';
 let mode='local',player=0,transport=null,applying=null;
 const owns=(index,p=player)=>mode==='local'||(Number.isInteger(index)&&index>=p*2&&index<p*2+2);
 function configure(next='local',send=null){mode=next;player=next==='client'?1:0;transport=send;applying=null;}
 function units(squad,selection){return squad.filter((s,i)=>s.alive&&(applying?applying.includes(i):owns(i)&&(selection==='all'||selection===i||(Array.isArray(selection)&&selection.includes(i)))));}
 function dispatch(type,ids,data={}){if(mode==='local'||applying)return false;const command={type,units:ids,...data};if(mode==='client')transport?.(command);else transport?.(command,true);return true;}
 function apply(ids,fn){const old=applying;applying=ids;try{return fn()}finally{applying=old}}
 return {configure,owns,units,dispatch,apply,get mode(){return mode},get player(){return player},get applying(){return !!applying}};
});
