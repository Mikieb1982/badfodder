/* Authored Bahnhofstraße opening and Post crossing; combat/navigation remain shared. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.BadFodderBelzigOpening=api;})(typeof window!=='undefined'?window:globalThis,function(){
 'use strict';
 function create({map,objectives,civilians,getSquad,getEnemies,scale=1,status=()=>{},stop=()=>{}}){
  const authored=map.opening,manager=objectives.manager,facts=objectives.facts;
  const point=p=>({x:p.x*scale,y:p.y*scale,r:p.r*scale});
  const contact=point(authored.contact),post=point({...map.pois.postcolumn,r:authored.postRevealRadius});
  const group=()=>authored.civilianIndexes.map(i=>getResidents()[i]).filter(Boolean);
  // The caller supplies live residents, including after a checkpoint merge.
  const getResidents=civilians.getResidents;
  const exits=civilians.zones.slice(),crossing=map.crossing,onward=point(crossing.onward);
  const guide={...onward,alive:true,shelters:[onward]},commandPoint=point({...map.pois.castle,r:55});
  const pending=()=>!['HELD','LOST'].includes(facts.get('post_route_status'));
  function progress(){const s=facts.get('post_crossing');return s&&typeof s.started==='boolean'&&Number.isFinite(s.hold)&&s.hold>=0&&Number.isFinite(s.unsafe)&&s.unsafe>=0?s:{started:false,hold:0,unsafe:0}};
  function preparePost(){
   const o=manager.get('phase-0');
   if(o&&!o.meta?.postCrossing)manager.replace(o.id,{...o,eventDriven:true,hold:0,meta:{...o.meta,legacy:false,postCrossing:true},title:'OPEN THE CIVILIAN ROUTE',text:'Clear the patrol so the civilians can cross toward St. Marien.'});
  }
  const existing=manager.all().flatMap(o=>{
   if(o.optional)return[o];
   const objective={...o,status:'PENDING',...(o.phase===0?{requires:['opening-route'],hidden:true,discovered:false}:o.phase===2?{requires:['act-three']}: {})};
   if(o.phase!==1)return[objective];
   return[
    {...objective,title:'DISRUPT THE BURG POSITION',brief:'Break the position coordinating attacks on the town.',text:'Break the position coordinating attacks on the town.'},
    {id:'burg-command',type:'INTERACT',eventDriven:true,requires:[o.id],title:'SEARCH THE COMMAND POST',text:'E / ACTION: search the marked orders.',marker:commandPoint},
    {id:'act-three',phase:2,type:'INTERACT',eventDriven:true,requires:['burg-command'],title:'ACT III: THE TOWN NEEDS HELP',text:'St. Marien and the civilian route both need attention.'}
   ];
  });
  manager.setObjectives([
   {id:'opening-contact',type:'REACH',eventDriven:true,priority:100,title:'REACH THE CIVILIANS',brief:'Neighbours need a safe way to St. Marien.',marker:contact},
   {id:'opening-route',type:'ESCORT',eventDriven:true,priority:100,requires:['opening-contact'],title:'GET THEM TO ST. MARIEN',brief:'Stay with the civilians; the Post blocks their route.',marker:post},
   ...existing
  ],{activate:false});
  manager.activate('opening-contact');preparePost();
  for(const c of group()){c.civilianState='HIDING';c.leaderIndex=null;stop(c)}
  function sync({legacy=false,phase=0}={}){
   if(legacy&&manager.get('opening-contact')){manager.complete('opening-contact');manager.complete('opening-route');facts.set('opening_state','POST_BLOCKED')}
   // Stage-only legacy snapshots already passed these interstitial discoveries.
   if(legacy&&phase>=2&&manager.get('burg-command')){
    for(const id of ['phase-0','phase-1','burg-command','act-three'])if(manager.get(id)?.status==='ACTIVE')manager.complete(id);
   }
   // Older snapshots contain the original combat objectives only.
   if(!manager.get('opening-contact'))facts.set('opening_state','POST_BLOCKED');
   const ready=facts.get('opening_state')==='POST_BLOCKED';
   if(manager.get('phase-0')?.status==='COMPLETED'&&pending())facts.set('post_route_status','HELD');
   else if(!facts.get('post_route_status'))facts.set('post_route_status','PENDING');
   preparePost();
   if(manager.get('burg-command')?.status==='COMPLETED')setupCrisis();
   for(const e of getEnemies())e.missionDormant=!ready;
   civilians.zones.splice(0,civilians.zones.length,...(ready?exits:[]));
  }
  function update(dt=0){
   if(facts.get('opening_state')==='POST_BLOCKED'){updateCrossing(dt);return;}
   const living=getSquad().filter(s=>s.alive&&!s.downed);
   const near=(s,p)=>Math.hypot(s.x-p.x,s.y-p.y)<=p.r;
   if(facts.get('opening_state')==='NOT_MET'){
    const actor=living.find(s=>near(s,contact))||living.find(s=>near(s,post));if(!actor)return;
    facts.set('opening_state','MOVING');
    manager.complete('opening-contact');
    // Existing gather controls select a single guide for the whole nearby group.
    civilians.interact(actor);
    status('Greta: Stay with them to St. Marien.');
   }
   if(living.some(s=>near(s,post))){
    facts.set('opening_state','POST_BLOCKED');
    for(const c of group())if(c.alive&&!['DOWN','EVACUATED'].includes(c.civilianState)){c.leaderIndex=null;c.civilianState=c.hp<2?'WOUNDED':'HIDING';stop(c)}
    manager.complete('opening-route');sync();
    status('Karl: The Post patrol blocks the civilians.');
   }
  }
  function resolveRoute(result){
   if(!pending())return;
   facts.set('post_route_status',result);
   if(result==='LOST')for(const c of group())if(c.alive&&c.civilianState!=='EVACUATED'){c.leaderIndex=null;stop(c);if(c.civilianState!=='DOWN')c.civilianState=c.hp<2?'WOUNDED':'HIDING'}
   manager.complete('phase-0');sync();
   status(result==='HELD'?'The civilians are through.':'The direct route is lost.',2);
  }
  function crossingText(text){if(manager.get('phase-0').text!==text)manager.updateText('phase-0',{title:'KEEP THE ROUTE OPEN',text})}
  function updateCrossing(dt){
   if(!pending()||manager.current()?.id!=='phase-0')return;
   const state=progress(),living=getSquad().filter(s=>s.alive&&!s.downed);
   const near=(s,r)=>Math.hypot(s.x-post.x,s.y-post.y)<=r*scale;
   const hostile=e=>e.alive&&!e.surrendered&&!e.missionDormant;
   const attackers=getEnemies().filter(e=>hostile(e)&&e.objectiveGroup==='post');
   if(!state.started){
    if(attackers.some(e=>!e.checkpointWave)||!living.some(s=>near(s,46)))return;
    state.started=true;
    const leader=getSquad().indexOf(living.find(s=>near(s,46)));
    for(const c of group())if(c.alive&&!['DOWN','EVACUATED'].includes(c.civilianState)){c.leaderIndex=leader;c.civilianState=c.hp<2?'WOUNDED':'FOLLOWING';c.panic=0;c.repath=0;stop(c)}
    facts.set('post_crossing',state);sync();
    status('Civilians crossing: keep the route open.');
   }
   const residents=group(),crossed=residents.filter(c=>c.civilianState==='EVACUATED').length;
   if(residents.filter(c=>c.alive||c.civilianState==='EVACUATED').length<crossing.minimum){resolveRoute('LOST');return}
   const nearby=living.some(s=>near(s,crossing.presenceRadius));
   const unsafe=getEnemies().some(e=>hostile(e)&&near(e,crossing.contestRadius))||!nearby&&attackers.length>0;
   const step=Number.isFinite(dt)&&dt>0?dt:0;
   if(unsafe){
    if(state.unsafe===0)status('Recover the Post: '+crossing.recoverySeconds+' seconds.',3);
    state.unsafe+=step;state.hold=0;
   }else{state.unsafe=0;state.hold=nearby&&!attackers.length?Math.min(crossing.holdSeconds,state.hold+step):0}
   facts.set('post_crossing',state);
   crossingText(unsafe?'RECOVER THE POST: '+Math.max(0,Math.ceil(crossing.recoverySeconds-state.unsafe))+'s before the direct route is lost.':crossed+'/'+crossing.minimum+' civilians through. '+(!attackers.length?'Keep the route clear: '+Math.ceil(crossing.holdSeconds-state.hold)+'s.':'Stay nearby and repel the counterattack.'));
   if(state.unsafe>=crossing.recoverySeconds)resolveRoute('LOST');
   else if(crossed>=crossing.minimum&&state.hold>=crossing.holdSeconds)resolveRoute('HELD');
  }
  function crisisText(){return facts.get('post_route_status')==='LOST'
   ?'St. Marien is threatened. The direct route is already lost; the remaining civilians need another way.'
   :'St. Marien is threatened. Renewed pressure threatens the preserved Post route. Both places need help.'}
  function setupCrisis(){
   const objective=manager.get('act-three'),text=crisisText();
   if(objective&&objective.text!==text)manager.updateText(objective.id,text);
  }
  function burgHint(actor){return actor?.alive&&!actor.downed&&getSquad().includes(actor)&&manager.get('burg-command')?.status==='ACTIVE'&&Math.hypot(actor.x-commandPoint.x,actor.y-commandPoint.y)<=commandPoint.r?'SEARCH ORDERS':''}
  function interactBurg(actor){
   if(!burgHint(actor))return false;
   setupCrisis();manager.complete('burg-command');
   status('Two areas need help: St. Marien and the Post.',2);
   return true;
  }
  function civilianGuide(c,leader){return leader&&authored.civilianIndexes.some(i=>getResidents()[i]===c)&&progress().started&&facts.get('post_route_status')!=='LOST'&&Math.hypot(c.x-guide.x,c.y-guide.y)<=420*scale?guide:null}
  sync();
  return{update,sync,civilianGuide,burgHint,interactBurg,commandPoint,start:()=>status('Neighbours ahead need a safe way through.',2),get combatReady(){return facts.get('opening_state')==='POST_BLOCKED'}};
 }
 return{create};
});
