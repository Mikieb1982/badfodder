/* Authored Bahnhofstraße opening; combat and civilian navigation remain shared. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.BadFodderBelzigOpening=api;})(typeof window!=='undefined'?window:globalThis,function(){
 'use strict';
 function create({map,objectives,civilians,getSquad,getEnemies,scale=1,status=()=>{},stop=()=>{}}){
  const authored=map.opening,manager=objectives.manager,facts=objectives.facts;
  const point=p=>({x:p.x*scale,y:p.y*scale,r:p.r*scale});
  const contact=point(authored.contact),post=point({...map.pois.postcolumn,r:authored.postRevealRadius});
  const group=()=>authored.civilianIndexes.map(i=>getResidents()[i]).filter(Boolean);
  // The caller supplies live residents, including after a checkpoint merge.
  const getResidents=civilians.getResidents;
  const exits=civilians.zones.slice();
  const existing=manager.all().map(o=>o.optional?o:{...o,status:'PENDING',...(o.phase===0?{requires:['opening-route'],hidden:true,discovered:false}:{})});
  manager.setObjectives([
   {id:'opening-contact',type:'REACH',eventDriven:true,priority:100,title:'REACH THE CIVILIANS',brief:'Neighbours are sheltering on Bahnhofstraße.',marker:contact},
   {id:'opening-route',type:'ESCORT',eventDriven:true,priority:100,requires:['opening-contact'],title:'HELP THEM TOWARD ST. MARIEN',brief:'Stay with the residents. The direct route passes the Postdistanzsäule.',marker:post},
   ...existing
  ],{activate:false});
  manager.activate('opening-contact');
  for(const c of group()){c.civilianState='HIDING';c.leaderIndex=null;stop(c)}
  function sync({legacy=false}={}){
   if(legacy&&manager.get('opening-contact')){manager.complete('opening-contact');manager.complete('opening-route');facts.set('opening_state','POST_BLOCKED')}
   // Older snapshots contain the original combat objectives only.
   if(!manager.get('opening-contact'))facts.set('opening_state','POST_BLOCKED');
   const ready=facts.get('opening_state')==='POST_BLOCKED';
   for(const e of getEnemies())e.missionDormant=!ready;
   civilians.zones.splice(0,civilians.zones.length,...(ready?exits:[]));
  }
  function update(){
   if(facts.get('opening_state')==='POST_BLOCKED')return;
   const living=getSquad().filter(s=>s.alive&&!s.downed);
   const near=(s,p)=>Math.hypot(s.x-p.x,s.y-p.y)<=p.r;
   if(facts.get('opening_state')==='NOT_MET'){
    const actor=living.find(s=>near(s,contact))||living.find(s=>near(s,post));if(!actor)return;
    facts.set('opening_state','MOVING');
    manager.complete('opening-contact');
    // Existing gather controls select a single guide for the whole nearby group.
    civilians.interact(actor);
    status('Greta: They are heading for St. Marien. Stay with them.');
   }
   if(living.some(s=>near(s,post))){
    facts.set('opening_state','POST_BLOCKED');
    for(const c of group())if(c.alive&&!['DOWN','EVACUATED'].includes(c.civilianState)){c.leaderIndex=null;c.civilianState=c.hp<2?'WOUNDED':'HIDING';stop(c)}
    manager.complete('opening-route');sync();
    status('Karl: The Post patrol blocks the direct route. Keep the civilians back.');
   }
  }
  sync();
  return{update,sync,start:()=>status('Bahnhofstraße. Neighbours are sheltering ahead.'),get combatReady(){return facts.get('opening_state')==='POST_BLOCKED'}};
 }
 return{create};
});
