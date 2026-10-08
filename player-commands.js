/* One human claim per player. Only the host simulates unclaimed companions. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.BadFodderCommands=api;})(typeof window!=='undefined'?window:globalThis,function(){
 'use strict';
 let mode='local',player=0,transport=null,applying=null,claims=[0,null,null,null];
 const owner=index=>claims.indexOf(index);
 const owns=(index,p=player)=>Number.isInteger(p)&&p>=0&&p<4&&Number.isInteger(index)&&index>=0&&index<4&&(owner(index)<0||owner(index)===p);
 function configure(next='local',send=null){mode=next;player=next==='client'?1:0;transport=send;applying=null;claims=next==='local'?[0,null,null,null]:[0,2,null,null];}
 function claim(index,p=player){if(!owns(index,p))return false;claims[p]=index;return true;}
 function release(p){claims[p]=null;}
 function units(squad,selection){return squad.filter((s,i)=>s.alive&&!s.downed&&(applying?applying.includes(i):i===claims[player]&&(selection==='all'||selection===i||(Array.isArray(selection)&&selection.includes(i)))));}
 function dispatch(type,ids,data={}){if(mode==='local'||applying)return false;const command={type,units:ids,...data};if(mode==='client')transport?.(command);else transport?.(command,true);return true;}
 function apply(ids,fn){const old=applying;applying=ids;try{return fn()}finally{applying=old}}
 function restore(rows){if(!Array.isArray(rows)||rows.length!==4||rows.some(i=>i!==null&&(!Number.isInteger(i)||i<0||i>3))||new Set(rows.filter(i=>i!==null)).size!==rows.filter(i=>i!==null).length)return false;claims=[...rows];return true;}
 return {configure,owns,owner,claim,release,active:(p=player)=>claims[p],snapshot:()=>[...claims],restore,units,dispatch,apply,get mode(){return mode},get player(){return player},get applying(){return !!applying},get appliedIds(){return applying}};
});
