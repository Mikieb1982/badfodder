/* Authored Bad Belzig refuge, bounded crisis, recovery and finale. No shared story engine. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.BadFodderBelzigStory=api;})(typeof window!=='undefined'?window:globalThis,function(){
 'use strict';
 function create({opening,map,objectives,civilians,getSquad,getEnemies,getSelected=getSquad,navigation,health,groupMovement,scale=1,status=()=>{},supply=()=>{},persist=()=>{}}){
  const manager=objectives.manager,facts=objectives.facts,data=map.story,residents=civilians.getResidents;
  const circle=p=>({x:p.x*scale,y:p.y*scale,r:(p.r||60)*scale});
  const refuge=circle(data.refuge),regroup=circle(data.regroup),post=circle({...map.pois.postcolumn,r:100}),junction=circle(data.volunteerPoint);
  const points=data.fallback.map(([x,y])=>circle({x,y,r:60})),onward=[...data.refugeRoute.map(([x,y])=>circle({x,y,r:60})),refuge];
  const group=()=>data.refugeIndexes.map(i=>residents()[i]).filter(Boolean),southern=()=>map.opening.civilianIndexes.map(i=>residents()[i]).filter(Boolean),frieda=()=>residents()[data.friedaIndex];
  const defaults={started:false,clock:0,refugeArmed:false,routeArmed:false,refugeWarned:false,routeWarned:false,refugeVisited:false,routeVisited:false,refugeMoving:false,routeMoving:false,onwardMoving:false,onwardLegs:{},legs:{},postUnsafe:0,postHold:0,aid:[],regrouped:false,approach:null,approachLeg:0,routes:[],civiliansSafe:0,support:0,volunteers:[],finished:false};
  const state=()=>({...defaults,...facts.get('belzig_story')});
  const save=s=>facts.set('belzig_story',s);
  const living=()=>getSquad().filter(s=>s.alive&&!s.downed),near=(a,p)=>Math.hypot(a.x-p.x,a.y-p.y)<=p.r;
  const active=id=>manager.get(id)?.status==='ACTIVE',done=id=>manager.get(id)?.status==='COMPLETED';
  const hostile=e=>e?.alive&&!e.surrendered&&!e.missionDormant;
  const threats=indexes=>indexes.map(i=>getEnemies()[i]).filter(e=>e?.alive&&!e.surrendered);
  const quiet=p=>!getEnemies().some(e=>hostile(e)&&near(e,p));
  const aidReady=()=>frieda()?.alive&&frieda().civilianState!=='DOWN'&&facts.get('frieda_status')!=='LOST';
  const evac=c=>c.civilianState==='EVACUATED',movable=c=>c.alive&&!['DOWN','DEAD','EVACUATED'].includes(c.civilianState);
  // Only fresh runtime construction edits the graph. Snapshots own subsequent progress.
  const list=manager.all(),market=list.find(o=>o.id==='phase-2');
  const added=[
   {id:'crisis-refuge',type:'EVACUATE',eventDriven:true,requires:['burg-command'],priority:20,title:'PROTECT ST. MARIEN',text:'Reach Frieda. Clear the patrol to secure the refuge, or E / ACTION to evacuate toward Reißigerhaus.',marker:refuge},
   {id:'crisis-route',type:'ESCORT',eventDriven:true,requires:['burg-command'],priority:20,title:'RESPOND TO THE POST ROUTE',text:'Visit the Post. Preserve the crossing or gather survivors for the longer Burg-side route.',marker:post},
   {id:'reissiger-regroup',type:'INTERACT',eventDriven:true,requires:['act-three','crisis-refuge','crisis-route'],title:'REGROUP AT REISSIGERHAUS',text:'E / ACTION: reform and request first aid. Prepare to hold the Rathaus.',marker:regroup},
   {id:'local-approach',type:'INTERACT',eventDriven:true,requires:['reissiger-regroup'],title:'USE THE TOWN YOU KNOW',text:'E / ACTION: Lotte can identify the courtyard link; Greta can rally neighbours. The Burg-side approach always remains open.',marker:regroup}
  ];
  const index=list.findIndex(o=>o.id==='phase-2');list.splice(index,0,...added);
  if(market)Object.assign(market,{requires:['local-approach'],title:'HOLD THE RATHAUS FOR THE TOWN',brief:'Secure the square and hold the Rathaus while neighbours keep the safe approaches open.',text:'Secure the square and hold the Rathaus while neighbours keep the safe approaches open.'});
  manager.setObjectives(list,{activate:false});
  for(const c of [...group(),...southern()])c.storyVisible=true;
  for(const c of group()){c.civilianState='HIDING';c.leaderIndex=null}
  if(frieda())Object.assign(frieda(),{name:'Frieda Lehmann',civilianRole:'first-aid volunteer',fictional:true});
  function updateFrieda(){const f=frieda();if(f)facts.set('frieda_status',!f.alive?'LOST':f.hp<f.maxHp||f.civilianState==='DOWN'?'WOUNDED':'SAFE')}
  function sync(options){
   opening.sync(options);
   // Upgrade earlier Bad Belzig snapshots without resetting their facts or objectives.
   const old=manager.get('phase-2'),missing=!manager.get('crisis-refuge')&&manager.get('burg-command');
   if(missing){for(const definition of added)manager.add(definition,{beforeId:'phase-2'});manager.replace('phase-2',{...old,requires:['local-approach'],title:market.title,text:market.text});}
   if(options?.legacy&&options.phase>=2||missing&&old.status!=='PENDING'){
    for(const definition of added){const o=manager.get(definition.id);if(o.status==='PENDING')manager.activate(o.id);if(manager.get(o.id).status==='ACTIVE')manager.complete(o.id);}
   }
   const s=state();
   for(const [key,indexes]of [['refugeArmed',data.refugeEnemies],['routeArmed',data.routeEnemies]])for(const i of indexes){const e=getEnemies()[i];if(e){e.missionDormant=!s.started||!s[key]||s.finished;e.belzigThreatTarget=key==='refugeArmed'&&s[key]?group().find(movable)||null:null}}
   if(!s.started&&!s.finished&&!civilians.zones.includes(refuge))civilians.zones.push(refuge);
   for(const i of s.volunteers)if(residents()[i])residents()[i].belzigVolunteer=true;
   if(!s.finished)updateFrieda();
  }
  function arm(s,key,indexes,target){
   if(s[key])return;s[key]=true;
   for(const i of indexes){const e=getEnemies()[i];if(!e?.alive)continue;e.missionDormant=false;e.alert=true;e.lastSeen={x:target.x,y:target.y};e.commandOrder={type:'PRESSURE',point:{x:target.x,y:target.y},until:1e8,engageAt:0};navigation.assignPath(e,target.x,target.y)}
  }
  function start(){const s=state();if(s.started||!active('act-three'))return;s.started=true;for(const c of group())if(evac(c)){c.civilianState='HIDING';c.leaderIndex=null}facts.set('refuge_status','THREATENED');save(s);manager.activate('crisis-refuge');manager.activate('crisis-route');status('St. Marien and the Post need attention. Visit either first; unattended patrols will be warned before they advance.');sync()}
  const offscreenWarning=(s,key,label)=>{if(!s[key]&&s.clock>=data.warningSeconds){s[key]=true;status(label+' patrol is advancing. You have '+data.recoverySeconds+' seconds before it reaches the position.')}};
  function recruit(list,actor){const id=getSquad().indexOf(actor);for(const c of list.filter(movable)){c.leaderIndex=id;c.civilianState=c.hp<2?'WOUNDED':'FOLLOWING';c.path=null;c.repath=0}}
  function resolveRefuge(result){const s=state();s.civiliansSafe=Math.max(s.civiliansSafe,[...southern(),...group()].filter(evac).length);save(s);facts.set('refuge_status',result);manager.complete('crisis-refuge');status(result==='SAFE'?'Frieda: The refuge is safe for now.':'The refuge survivors are reaching Reißigerhaus.');}
  function finishThreads(){if(done('crisis-refuge')&&done('crisis-route')&&active('act-three')){manager.complete('act-three');status('Both situations are settled enough to move on. Regroup at Reißigerhaus.')}}
  function update(dt){
   if(state().finished)return;opening.update(dt);updateFrieda();start();let s=state();
   if(!s.onwardMoving&&facts.get('post_route_status')==='HELD'&&done('phase-0')){s.onwardMoving=true;const actor=living()[0];if(actor)for(const c of southern().filter(c=>c.alive)){if(evac(c))c.civilianState='HIDING';recruit([c],actor)}}
   if(s.onwardMoving&&!s.routeMoving)for(const [i,c]of southern().entries())if(movable(c)){const leg=s.onwardLegs[i]||0;if(near(c,onward[leg])&&leg<onward.length-1)s.onwardLegs[i]=leg+1}
   save(s);if(!s.started||s.finished)return;
   const step=Number.isFinite(dt)&&dt>0?dt:0;s.clock+=step;
   if(active('crisis-refuge')){
    offscreenWarning(s,'refugeWarned','St. Marien');
    if(living().some(u=>near(u,{...refuge,r:refuge.r+100*scale}))||s.refugeWarned&&s.clock>=data.warningSeconds+data.recoverySeconds){arm(s,'refugeArmed',data.refugeEnemies,refuge)}
    if(s.refugeMoving){const list=group(),safe=list.filter(evac).length,possible=list.filter(movable).length;
     if(safe>=Math.max(1,Math.ceil((safe+possible)/2))||!possible)resolveRefuge(list.some(c=>!c.alive||c.civilianState==='DOWN')?'EVACUATED_WITH_LOSSES':'EVACUATED');}
   }
   if(active('crisis-route')){
    offscreenWarning(s,'routeWarned','Post');
    if(living().some(u=>near(u,post))||s.routeWarned&&s.clock>=data.warningSeconds+data.recoverySeconds)arm(s,'routeArmed',data.routeEnemies,post);
    if(facts.get('post_route_status')==='HELD'){
     const blocked=!quiet(post);
     if(blocked){if(s.postUnsafe===0)status('Post patrol is inside the crossing. Clear it within 12 seconds to preserve the direct route.');s.postUnsafe+=step;s.postHold=0}
     else{s.postUnsafe=0;s.postHold=s.routeVisited&&!threats(data.routeEnemies).length?s.postHold+step:0}
     if(s.postUnsafe>=12){facts.set('post_route_status','LOST');s.routeMoving=false;status('The direct route is lost. E / ACTION near the Post: gather survivors for the Burg-side route.');}
     else if(s.postHold>=2.5){manager.complete('crisis-route');status('The direct route remains held.');}
    }
    if(facts.get('post_route_status')==='LOST'&&s.routeMoving){
     for(const [i,c]of southern().entries())if(movable(c)){const leg=s.legs[i]||0;if(near(c,points[leg])&&leg<points.length-1)s.legs[i]=leg+1}
     const list=southern(),safe=list.filter(evac).length,possible=list.filter(movable).length;
     if(safe>=Math.max(1,Math.ceil((safe+possible)/2))||!possible)manager.complete('crisis-route');
    }
   }
   s.civiliansSafe=Math.max(s.civiliansSafe,[...southern(),...group()].filter(evac).length);
   if(active('phase-2')){if(!s.approach)for(const name of s.routes){const p=name==='direct'?circle({...map.pois.market,r:110}):circle({x:(name==='courtyard'?data.courtyard:data.burgSide)[0][0],y:(name==='courtyard'?data.courtyard:data.burgSide)[0][1],r:60});if(living().some(u=>near(u,p))){s.approach=name;break}}if(s.approach&&s.approach!=='direct'){const route=s.approach==='courtyard'?data.courtyard:data.burgSide,p=route[s.approachLeg];if(p&&living().some(u=>near(u,circle({x:p[0],y:p[1],r:60}))))s.approachLeg++;}}
   save(s);sync();finishThreads();
  }
  function guide(c,leader){
   const s=state();if(!leader)return null;
   if(s.support&&c.belzigVolunteer)return{...junction,alive:true,shelters:[]};
   if(group().includes(c)&&(s.refugeMoving||done('crisis-refuge')&&facts.get('refuge_status')==='SAFE'&&done('act-three')))return{x:regroup.x,y:regroup.y,alive:true,shelters:[regroup]};
   const i=southern().indexOf(c);
   if(i>=0&&s.routeMoving&&!evac(c)){const p=points[s.legs[i]||0];return{...p,alive:true,...((s.legs[i]||0)===points.length-1?{shelters:[regroup]}:{shelters:[]})}}
   if(i>=0&&s.onwardMoving&&facts.get('post_route_status')==='HELD'){if(s.refugeMoving)return{...regroup,alive:true,shelters:[regroup]};const leg=s.onwardLegs[i]||0;return{...onward[leg],alive:true,shelters:leg===onward.length-1&&facts.get('refuge_status')!=='THREATENED'?[refuge]:[]}}
   return opening.civilianGuide(c,leader);
  }
  function hint(actor){
   if(!actor?.alive||actor.downed||!getSquad().includes(actor))return'';
   if(residents().some(c=>c.alive&&c.civilianState==='DOWN'&&Math.hypot(c.x-actor.x,c.y-actor.y)<=90*scale))return'';
   if(active('crisis-refuge')&&near(actor,refuge))return !threats(data.refugeEnemies).length&&quiet(refuge)?'SECURE REFUGE':'EVACUATE REFUGE';
   if(active('crisis-route')&&near(actor,post))return facts.get('post_route_status')==='LOST'?'GATHER FOR BURG-SIDE ROUTE':'REINFORCE POST';
   if(active('reissiger-regroup')&&near(actor,regroup))return'REGROUP / FIRST AID';
   if(active('local-approach')&&near(actor,regroup))return'PLAN THE FINAL APPROACH';
   const s=state(),phase=active('act-three')?'refuge':active('phase-2')?'final':null;
   if(phase&&aidReady()&&near(actor,refuge)&&!s.aid.includes(phase))return'FRIEDA: FIRST AID';
   return'';
  }
  function aid(s,actor,key){
   if(!aidReady()||s.aid.includes(key))return false;let helped=false;
   for(const u of getSquad())if(u.alive&&near(u,{...regroup,r:120*scale})||u.alive&&near(u,refuge)){helped=(u.downed&&!u.stabilised?health.stabilise(u,actor):health.recover(u,facts.get('frieda_status')==='SAFE'?2:1))||helped}
   if(helped)s.aid.push(key);return helped;
  }
  function interact(actor){
   const action=hint(actor);if(!action)return false;const s=state();
   if(action==='SECURE REFUGE'){s.refugeVisited=true;aid(s,actor,'refuge');resolveRefuge('SAFE')}
   else if(action==='EVACUATE REFUGE'){s.refugeVisited=true;s.refugeMoving=true;recruit(group(),actor);aid(s,actor,'refuge');status('Frieda: Take everyone toward Reißigerhaus. E / ACTION can help a wounded resident.');}
   else if(action==='REINFORCE POST'){s.routeVisited=true;arm(s,'routeArmed',data.routeEnemies,post);status('Hold off the returning patrol. The civilians still need this route.');}
   else if(action==='GATHER FOR BURG-SIDE ROUTE'){s.routeVisited=true;s.routeMoving=true;recruit(southern(),actor);status('The direct crossing is closed. Follow the slower Burg-side streets to Reißigerhaus.');}
   else if(action==='REGROUP / FIRST AID'){
    const eligible=getSelected().filter(u=>u.alive&&!u.downed);groupMovement.regroup(eligible,regroup);aid(s,actor,'regroup');s.regrouped=true;
    if(facts.get('refuge_status')==='SAFE')recruit(group(),actor);
    manager.complete('reissiger-regroup');status('Greta: Take stock of who remains. We can hold the Rathaus together.');
   }else if(action==='PLAN THE FINAL APPROACH'){
    const units=living(),lotte=units.find(u=>u.name==='Lotte'&&health.stateFor(u)!=='BADLY_WOUNDED'),greta=units.find(u=>u.name==='Greta'&&health.stateFor(u)!=='BADLY_WOUNDED');
    s.routes=['burg-side'];if(facts.get('post_route_status')==='HELD')s.routes.unshift('direct');if(lotte&&facts.get('refuge_status')!=='EVACUATED_WITH_LOSSES')s.routes.unshift('courtyard');s.approach=null;s.approachLeg=0;s.civiliansSafe=Math.max(s.civiliansSafe,[...southern(),...group()].filter(evac).length);
    s.support=greta?Math.min(facts.get('post_route_status')==='HELD'&&facts.get('refuge_status')!=='EVACUATED_WITH_LOSSES'?2:1,group().filter(c=>c.alive&&c!==frieda()&&c.civilianState!=='DOWN').length):0;
    if(s.support){for(const c of group().filter(c=>c.alive&&c!==frieda()&&c.civilianState!=='DOWN').slice(0,s.support)){s.volunteers.push(residents().indexOf(c));c.belzigVolunteer=true;c.civilianState='HIDING';c.leaderIndex=getSquad().indexOf(actor);c.repath=0} supply({x:regroup.x,y:regroup.y,type:'med',amount:s.support,active:true});}
    manager.complete('local-approach');status((lotte?'Lotte: The courtyard link is open. ':'Use the Burg-side streets. ')+(s.support?'Greta has rallied '+s.support+' neighbours with first-aid supplies.':'We go with the people we have.'));
   }else aid(s,actor,active('phase-2')?'final':'refuge');
   save(s);sync();finishThreads();return true;
  }
  function guidance(){
   const s=state(),units=living();if(!units.length)return null;
   if(active('act-three')){const candidates=[];if(active('crisis-refuge'))candidates.push({target:refuge,caption:'St. Marien refuge'});if(active('crisis-route')){let p=post;if(s.routeMoving&&facts.get('post_route_status')==='LOST'){const legs=Object.values(s.legs);p=points[legs.length?Math.min(...legs):0]}candidates.push({target:p,caption:facts.get('post_route_status')==='LOST'?'Burg-side evacuation route':'Post route'});}return candidates.sort((a,b)=>Math.min(...units.map(u=>Math.hypot(u.x-a.target.x,u.y-a.target.y)))-Math.min(...units.map(u=>Math.hypot(u.x-b.target.x,u.y-b.target.y))))[0]||null;}
   if(active('phase-2')){const route=s.approach==='courtyard'?data.courtyard:data.burgSide,p=s.approach&&s.approach!=='direct'?route[s.approachLeg]:null;return{target:p?circle({x:p[0],y:p[1],r:60}):circle({...map.pois.market,r:86}),caption:p?(s.approach==='courtyard'?'Lotte: courtyard approach':'Burg-side approach'):'Hold the Rathaus · '+s.routes.join(' / ')+' approaches'};}return null;
  }
  function instruction(){if(!active('act-three'))return null;const s=state(),left=Math.max(0,Math.ceil(data.warningSeconds+data.recoverySeconds-s.clock));return 'ST. MARIEN: '+facts.get('refuge_status')+(s.refugeArmed?' · patrol active':s.refugeWarned?' · patrol arrives in '+left+'s':'')+' | POST: '+facts.get('post_route_status')+(s.postUnsafe?' · recover in '+Math.max(0,Math.ceil(12-s.postUnsafe))+'s':s.routeWarned&&!s.routeArmed?' · patrol arrives in '+left+'s':'')+' · E / ACTION at either place.'}
  function summary(){if(state().finished&&facts.get('bad_belzig_aftermath'))return facts.get('bad_belzig_aftermath');const all=[...southern(),...group()],units=getSquad();return 'The Rathaus holds. Home is the people who remain. Post '+facts.get('post_route_status')+'; refuge '+facts.get('refuge_status')+'; Frieda '+facts.get('frieda_status')+'. '+Math.max(state().civiliansSafe,all.filter(evac).length)+'/'+all.length+' civilians safe, '+all.filter(c=>!c.alive).length+' lost. '+units.filter(u=>u.alive).length+' returned, '+units.filter(u=>u.alive&&health.stateFor(u)!=='FIT').length+' wounded.'}
  function finish(){const s=state();if(s.finished)return facts.get('bad_belzig_aftermath')||summary();s.finished=true;save(s);const text=summary();facts.set('bad_belzig_aftermath',text);persist({version:1,facts:facts.snapshot(),health:health.snapshot()});sync();return text}
  sync();
  return{...opening,get combatReady(){return opening.combatReady},get quiet(){return active('reissiger-regroup')||active('local-approach')||state().finished},update,sync,civilianGuide:guide,storyHint:hint,interactStory:interact,guidance,instruction,summary,finish};
 }
 return{create};
});
