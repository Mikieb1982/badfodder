/* Reusable civilians. Rendering animation stays separate from gameplay state. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.BadFodderCivilians=api;})(typeof window!=='undefined'?window:globalThis,function(){
 'use strict';
 const STATES=Object.freeze(['CALM','FRIGHTENED','HIDING','FOLLOWING','FLEEING','EVACUATED','WOUNDED','DOWN','DEAD']);
 function create({getCivilians,getSquad,getEnemies=()=>[],getNoise=()=>[],getGuide=(c,leader)=>leader,zones=[],move,path,follow,face,onEvent=()=>{},canOccupy=()=>true,scale=1}={}){
  let clock=0;
  const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
  const stop=c=>{c.path=null;c.target=null;c.navDestination=null;c.state=c.alive?'idle':'dead'};
  function init(c,i){Object.assign(c,{civilianId:c.civilianId||'resident-'+i,civilianState:c.civilianState||'CALM',alive:true,hp:3,maxHp:3,leaderIndex:null,panic:0,repath:0,state:'idle'});return c}
  function counts(){const list=getCivilians();return{total:list.length,evacuated:list.filter(c=>c.civilianState==='EVACUATED').length,lost:list.filter(c=>c.civilianState==='DEAD').length,following:list.filter(c=>c.alive&&c.leaderIndex!==null).length,down:list.filter(c=>c.civilianState==='DOWN').length}}
  function nearest(helper){return getCivilians().filter(c=>c.alive&&c.civilianState!=='EVACUATED'&&distance(c,helper)<=90*scale).sort((a,b)=>(b.civilianState==='DOWN')-(a.civilianState==='DOWN')||distance(a,helper)-distance(b,helper))[0]||null}
  function hint(helper){const c=helper&&nearest(helper);return c?(c.civilianState==='DOWN'?'HELP':c.leaderIndex!==null?'HIDE':'GATHER'):''}
  function interact(helper){
   if(!helper?.alive||helper.downed)return false;
   const c=nearest(helper);if(!c)return false;
   const leader=getSquad().indexOf(helper);if(leader<0)return false;
   if(c.civilianState==='DOWN'){c.hp=1;c.downUntil=null;c.civilianState='WOUNDED';c.leaderIndex=leader;onEvent('helped',c);return true}
   const hide=c.leaderIndex!==null;
   for(const resident of getCivilians())if(resident.alive&&!['DOWN','EVACUATED'].includes(resident.civilianState)&&distance(resident,helper)<=110*scale){
    resident.leaderIndex=hide?null:leader;resident.civilianState=hide?'HIDING':'FOLLOWING';resident.panic=0;stop(resident);
   }
   onEvent(hide?'hiding':'gathered',c);return true;
  }
  function damage(c,amount){
   if(!c.alive||c.civilianState==='EVACUATED'||!Number.isFinite(amount)||amount<=0)return false;
   c.hp-=amount;c.flash=.14;
   if(c.civilianState==='DOWN'){c.alive=false;c.civilianState='DEAD';c.state='dead';c.deadTimer=0;onEvent('lost',c)}
   else if(c.hp<=0){c.hp=0;c.civilianState='DOWN';c.downUntil=clock+18;stop(c);c.state='hurt';onEvent('down',c)}
   else{c.civilianState='WOUNDED';c.panic=4}
   return true;
  }
  function update(dt){
   clock+=dt;let pathBudget=2;
   const enemies=getEnemies().filter(e=>(e.alive&&!e.surrendered&&!e.missionDormant)),noise=getNoise(),squad=getSquad(),residents=getCivilians(),neighbours=[...residents,...squad];
   for(const [i,c] of residents.entries()){
    if(!c.alive||c.civilianState==='EVACUATED')continue;
    if(c.civilianState==='DOWN'){if(clock>=c.downUntil)damage(c,1);continue}
    c.flash=Math.max(0,(c.flash||0)-dt);
    c.repath=Math.max(0,(c.repath||0)-dt);c.panic=Math.max(0,(c.panic||0)-dt);
    const threat=enemies.find(e=>distance(c,e)<170*scale)||noise.find(n=>distance(c,n)<(n.r||130*scale));
    // An opt-in mission guide can use the same following/navigation toward an onward shelter.
    const leader=getGuide(c,Number.isInteger(c.leaderIndex)?squad[c.leaderIndex]:null);
    if(leader&&(!leader.alive||leader.downed||distance(c,leader)>420*scale)){c.leaderIndex=null;c.civilianState='HIDING';stop(c);onEvent('separated',c)}
    if(threat)c.panic=3;
    const safe=z=>!enemies.some(e=>distance(e,z)<z.r+60*scale);
    const shelters=leader?.shelters||zones;
    const zone=shelters.find(z=>distance(c,z)<=z.r&&safe(z));
    if(zone&&c.leaderIndex!==null){c.civilianState='EVACUATED';c.leaderIndex=null;stop(c);onEvent('evacuated',c);continue}
    let target=null,speed=(c.speed||40)*1.7;
    if(c.leaderIndex!==null){
     c.civilianState=c.hp<2?'WOUNDED':'FOLLOWING';
     // Once the guide reaches shelter, followers aim inside it, including at the rim.
     const shelter=shelters.find(z=>distance(leader,z)<=z.r&&safe(z)),radius=shelter?Math.min(18*scale,shelter.r*.3):(22+i%3*4)*scale;
     const centre=shelter||leader;
     target={x:centre.x+Math.cos(i*2.4)*radius,y:centre.y+Math.sin(i*2.4)*radius};
     if(!canOccupy(target.x,target.y))target={x:centre.x,y:centre.y};
     const incoming=noise.filter(n=>n.owner!=='squad'&&n.owner!=='friendly'&&distance(c,n)<75*scale).length;
     if(incoming>=3&&clock>=(c.nextHesitate||0)){c.hesitateUntil=clock+.7;c.nextHesitate=clock+4}
     if(clock<(c.hesitateUntil||0)){c.civilianState=c.hp<2?'WOUNDED':'HIDING';stop(c);continue}
     if(distance(c,target)<(shelter?8:18)*scale)target=null;
    }
    else if(threat&&c.civilianState!=='HIDING'){c.civilianState='FLEEING';const d=distance(c,threat)||1;target={x:c.x+(c.x-threat.x)/d*75*scale,y:c.y+(c.y-threat.y)/d*75*scale};speed*=1.5}
    else if(c.panic>0){c.civilianState=c.civilianState==='HIDING'?'HIDING':'FRIGHTENED'}
    else if(!['HIDING','WOUNDED'].includes(c.civilianState)){c.civilianState='CALM';c.phase+=dt*.5;target={x:c.homeX+Math.cos(c.phase)*32*scale,y:c.homeY+Math.sin(c.phase*.8)*24*scale};speed=c.speed}
    if(c.hp<2)speed*=.65;
    if(c.leaderIndex!==null&&distance(c,leader)>140*scale)speed*=1.25;
    if(target){
     // Soft separation is bounded and uses the existing collision-aware movement.
     if(c.leaderIndex!==null&&move){
      let dx=0,dy=0;for(const other of neighbours){
       if(other===c||!other.alive||other.downed||['DOWN','EVACUATED'].includes(other.civilianState))continue;
       const d=distance(c,other),r=9*scale;if(d<r){const a=d>0?Math.atan2(c.y-other.y,c.x-other.x):i*2.4;dx+=Math.cos(a)*(1-d/r);dy+=Math.sin(a)*(1-d/r)}
      }
      const d=Math.hypot(dx,dy);if(d>0)move(c,dx/Math.max(1,d)*16*scale*dt,dy/Math.max(1,d)*16*scale*dt,6);
     }
     if(path&&follow){if(c.repath<=0&&pathBudget>0){path(c,target.x,target.y);c.repath=1.2;pathBudget--}const next=c.path?.[c.pathIndex||0],ahead=next?(Array.isArray(next)?{x:next[0],y:next[1]}:next):target;
      const blocked=c.leaderIndex!==null&&enemies.some(e=>distance(e,ahead)<70*scale&&distance(e,ahead)+15*scale<distance(e,c));
      if(blocked){c.state='idle';c.civilianState='HIDING';c.panic=3}else c.state=follow(c,speed,dt)?'walk':'idle'}
     else{const dx=target.x-c.x,dy=target.y-c.y,d=Math.hypot(dx,dy);if(d>3){face?.(c,dx,dy);move?.(c,dx/d*speed*dt,dy/d*speed*dt,8);c.state='walk'}}
    }else{stop(c)}
   }
  }
  function snapshot(){return getCivilians().map(c=>[c.civilianState,c.leaderIndex,c.civilianState==='DOWN'?Math.max(0,c.downUntil-clock):null])}
  function receive(rows){rows.forEach((r,i)=>{const c=getCivilians()[i];if(c){c.civilianState=r[0];c.leaderIndex=r[1];c.downUntil=r[2]===null?null:clock+r[2]}})}
  getCivilians().forEach(init);
  function add(c){init(c,getCivilians().length);getCivilians().push(c);return c}
  return{add,update,interact,hint,nearest,damage,counts,snapshot,receive,zones};
 }
 return{STATES,create};
});
