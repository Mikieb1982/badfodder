/* Experience 2.0: visible tactical feedback, objective beats, squad continuity and atmosphere. */
(function(root){
'use strict';
if(!root.document)return;
const doc=root.document,reduce=()=>root.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
const CONTINUITY_KEY='badfodder.continuity.v1',RESISTANCE_SEED_KEY='badfodder.resistance.seed.v1';
let mission='',lifecycle='TITLE',canvas=null,ctx=null,beat=null,beatKicker=null,beatTitle=null,beatDetail=null,beatTimer=0,raf=0,last=0,hitPulse=0,hitTeam='',lastObjective='',activeRun=null,lastDebrief=null,resistanceSeenWave=-1,resistanceScenario=null,lastCombatAt=0,hadCombat=false,lullShown=false;
const particles=Array.from({length:28},(_,i)=>({x:(i*83%997)/997,y:(i*137%991)/991,s:.42+(i%5)*.17,p:(i*1.77)%6.28}));
const reactionCooldown=new Map();
const now=()=>typeof performance!=='undefined'&&performance.now?performance.now():Date.now();
const store=()=>root.BadFodderStorage?.local||root.localStorage;
function safeJson(value,fallback){try{return JSON.parse(value)}catch(_){return fallback}}
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function loadContinuity(){const raw=safeJson(store()?.getItem(CONTINUITY_KEY)||'null',null);return raw&&raw.version===1?raw:{version:1,slots:{},history:[]}}
function saveContinuity(value){try{store()?.setItem(CONTINUITY_KEY,JSON.stringify(value))}catch(_){}return value}
function stateOf(unit){try{return root.BadFodderHealth?.stateFor?.(unit)||(unit?.alive===false?'DEAD':unit?.downed?'DOWN':'FIT')}catch(_){return unit?.alive===false?'DEAD':'FIT'}}
function unitKey(unit,index){return String(unit?.campaignId||unit?.persistenceId||('slot-'+(index+1)))}
function snapshotUnit(unit,index){return{key:unitKey(unit,index),name:String(unit?.name||unit?.label||('Volunteer '+(index+1))),occupation:String(unit?.occupation||unit?.job||''),trait:String(unit?.trait||''),health:stateOf(unit),alive:unit?.alive!==false,experience:Number(unit?.experience)||0,missions:0,rescues:0,timesDowned:0,stabilisations:0}}
function applyPersistentSquad(squad){
 const continuity=loadContinuity();
 squad.forEach((unit,index)=>{const saved=continuity.slots[unitKey(unit,index)];if(!saved||!unit)return;
   unit.experience=Math.max(Number(unit.experience)||0,Number(saved.experience)||0);
   if(saved.health==='DEAD'||saved.alive===false){unit.alive=false;unit.downed=false;unit.healthState='DEAD';unit.hp=0;return}
   const max=Math.max(1,Number(unit.maxHp)||Number(unit.hp)||3);
   if(saved.health==='BADLY_WOUNDED')unit.hp=Math.max(1,Math.ceil(max*.34));
   else if(saved.health==='WOUNDED')unit.hp=Math.max(1,Math.ceil(max*.67));
   root.BadFodderHealth?.sync?.(unit);
 });
 return continuity;
}
function missionStart({campaign=false,key='',squad=[]}={}){
 mission=String(key||mission);lastDebrief=null;resistanceSeenWave=-1;resistanceScenario=null;hadCombat=false;lullShown=false;lastCombatAt=0;
 if(campaign)applyPersistentSquad(squad);
 const observed=new Map();squad.forEach((u,i)=>observed.set(unitKey(u,i),{state:stateOf(u),stabilised:!!u?.stabilised}));
 activeRun={campaign:!!campaign,key:mission,started:Date.now(),events:[],downed:new Set(),stabilised:new Set(),baseline:squad.map((u,i)=>snapshotUnit(u,i)),squad,observed};
 return activeRun;
}
function remember(type,data={}){
 if(!activeRun)return;const unit=data.unit,index=Number.isInteger(data.index)?data.index:null,key=index===null?(unit?.campaignId||unit?.persistenceId||unit?.name||''):unitKey(unit,index);
 activeRun.events.push({type,key:String(key||''),name:String(unit?.name||data.name||''),time:Date.now()});if(activeRun.events.length>64)activeRun.events.shift();
 if(type==='ALLY_DOWN'&&key)activeRun.downed.add(String(key));if(type==='STABILISED'&&key)activeRun.stabilised.add(String(key));
}
function missionEnd({campaign=false,key='',squad=[],win=false,civiliansRescued=0,civiliansLost=0}={}){
 if(!activeRun||activeRun.ended)return lastDebrief;activeRun.ended=true;
 const survivors=squad.filter(u=>u?.alive!==false),dead=squad.filter(u=>u?.alive===false),hurt=survivors.filter(u=>stateOf(u)!=='FIT');
 const notable=[];for(const e of activeRun.events){if(e.type==='STABILISED'&&e.name)notable.push(e.name+' was stabilised under fire.');if(e.type==='ALLY_DOWN'&&e.name)notable.push(e.name+' was brought down during the fighting.');if(e.type==='ALLY_DEAD'&&e.name)notable.push(e.name+' did not survive.');if(notable.length>=2)break}
 lastDebrief={key:String(key||activeRun.key||mission),win:!!win,survivors:survivors.length,dead:dead.length,hurt:hurt.length,civiliansRescued:Number(civiliansRescued)||0,civiliansLost:Number(civiliansLost)||0,characters:squad.map((u,i)=>({name:String(u?.name||('Volunteer '+(i+1))),health:stateOf(u),alive:u?.alive!==false,occupation:String(u?.occupation||''),trait:String(u?.trait||'')})),notable};
 if(campaign&&win){
   const continuity=loadContinuity();squad.forEach((unit,index)=>{const key=unitKey(unit,index),previous=continuity.slots[key]||snapshotUnit(unit,index),next={...previous,...snapshotUnit(unit,index)};next.missions=(Number(previous.missions)||0)+1;next.timesDowned=(Number(previous.timesDowned)||0)+(activeRun.downed.has(key)?1:0);next.stabilisations=(Number(previous.stabilisations)||0)+(activeRun.stabilised.has(key)?1:0);continuity.slots[key]=next});
   continuity.history.push({mission:lastDebrief.key,at:Date.now(),survivors:lastDebrief.survivors,dead:lastDebrief.dead,hurt:lastDebrief.hurt,civiliansRescued:lastDebrief.civiliansRescued});if(continuity.history.length>24)continuity.history=continuity.history.slice(-24);saveContinuity(continuity);
 }
 return lastDebrief;
}
function decorateResult(){
 const d=lastDebrief;if(!d)return false;const subtitle=doc.getElementById('resultSubtitle'),flavour=doc.getElementById('resultFlavour');
 if(subtitle)subtitle.textContent=d.survivors+' SURVIVED · '+d.hurt+' WOUNDED · '+d.dead+' LOST';
 if(flavour){const civ=d.civiliansRescued||d.civiliansLost?'Civilians: '+d.civiliansRescued+' rescued'+(d.civiliansLost?' · '+d.civiliansLost+' lost':''):'';flavour.textContent=(d.notable.join(' ')||civ||'The people who made it out carry the mission forward.');}
 const parent=flavour?.parentElement;if(parent){
   let panel=doc.getElementById('experienceDebrief');if(!panel){panel=doc.createElement('div');panel.id='experienceDebrief';flavour.insertAdjacentElement('afterend',panel);}
   panel.innerHTML=d.characters.map(c=>'<div class="experience-person"><strong>'+esc(c.name)+'</strong><span>'+esc(c.health)+(c.occupation?' · '+esc(c.occupation):'')+'</span></div>').join('');
 }
 return true;
}
function ensure(){
 if(!doc.body)return;
 if(!canvas){canvas=doc.createElement('canvas');canvas.id='experiencePolish';canvas.setAttribute('aria-hidden','true');doc.body.appendChild(canvas);ctx=canvas.getContext('2d');resize();root.addEventListener('resize',resize,{passive:true});}
 if(!beat){
   beat=doc.createElement('div');beat.id='experienceBeat';beat.setAttribute('aria-live','polite');
   beat.innerHTML='<div data-kicker></div><div data-title></div><div data-detail></div>';
   beatKicker=beat.querySelector('[data-kicker]');beatTitle=beat.querySelector('[data-title]');beatDetail=beat.querySelector('[data-detail]');doc.body.appendChild(beat);
 }
 const stage=doc.getElementById('hudStage');if(stage&&root.MutationObserver&&!stage.dataset.experienceObserved){stage.dataset.experienceObserved='1';new MutationObserver(checkObjective).observe(stage,{subtree:true,childList:true,characterData:true});lastObjective=objectiveSignature();}
 patchArt(root.BadFodderArt);
}
function resize(){if(!canvas)return;const d=Math.min(2,root.devicePixelRatio||1),w=Math.max(1,innerWidth),h=Math.max(1,innerHeight);canvas.width=Math.round(w*d);canvas.height=Math.round(h*d);ctx?.setTransform(d,0,0,d,0,0)}
function showBeat(kicker,title,detail='',duration=2200){ensure();if(!beat||!title)return;clearTimeout(beatTimer);beatKicker.textContent=kicker;beatTitle.textContent=title;beatDetail.textContent=detail;beatDetail.hidden=!detail;beat.classList.add('show');beatTimer=setTimeout(()=>{if(beat){beat.classList.remove('show')}},duration)}
function toast(text,duration=1800){const notice=doc.getElementById('hudNotice');if(!notice||notice.classList.contains('show'))return false;notice.textContent=text;notice.classList.add('show');setTimeout(()=>{if(notice.textContent===text)notice.classList.remove('show')},duration);return true}
function objectiveSignature(){const stage=(doc.getElementById('hudStage')?.textContent||'').trim(),line=(doc.getElementById('hudMission')?.textContent||'').trim();return stage+'|'+line}
function checkObjective(){const signature=objectiveSignature();if(!signature||signature===lastObjective)return;const previous=lastObjective;lastObjective=signature;if(!previous||lifecycle!=='PLAYING'||/COMPLETE|FAILED/i.test(signature))return;const [stage,line]=signature.split('|');const instruction=(doc.getElementById('hudInstruction')?.textContent||'').trim();showBeat(stage||'OBJECTIVE UPDATED',line||'New objective',instruction,2500);event('OBJECTIVE_UPDATED',{text:line})}
function setState(next,key){ensure();const previous=lifecycle;lifecycle=String(next||'');if(key)mission=String(key);if(root.BadFodderSfx?.environment&&lifecycle==='PLAYING')try{root.BadFodderSfx.environment(mission,'enter')}catch(_){}if(lifecycle==='PLAYING'&&previous!=='PLAYING'){setTimeout(()=>{if(lifecycle==='PLAYING'){const stage=(doc.getElementById('hudStage')?.textContent||'MISSION START').trim(),line=(doc.getElementById('hudMission')?.textContent||mission.replace(/-/g,' ')).trim();showBeat(stage,line,'Stay together. Use cover and react to changing pressure.',2300)}},180)}sync()}
function sync(){if(lifecycle==='PLAYING'&&!doc.hidden&&!reduce()){if(!raf){last=performance.now();raf=requestAnimationFrame(frame)}}else if(raf){cancelAnimationFrame(raf);raf=0;if(ctx&&canvas)ctx.clearRect(0,0,innerWidth,innerHeight)}}
function markCombat(){lastCombatAt=now();hadCombat=true;lullShown=false}
function hit({team='enemy',amount=1}={}){ensure();markCombat();hitTeam=team;hitPulse=Math.max(hitPulse,team==='squad'?Math.min(1,0.58+Number(amount)*.2):.72);if(team==='squad'&&root.navigator?.vibrate)try{root.navigator.vibrate([18,12,24])}catch(_){}sync()}
function event(type,data={}){
 type=String(type||'');remember(type,data);if(/UNDER_FIRE|HIT|ALLY_DOWN|ALLY_DEAD/.test(type))markCombat();const t=now(),key=type+':'+String(data.unit?.name||data.name||'');const cooldown=/UNDER_FIRE|HIT/.test(type)?4200:1800;if(t-(reactionCooldown.get(key)||0)<cooldown)return false;reactionCooldown.set(key,t);
 if(type==='ALLY_DOWN'){root.BadFodderVoices?.speakSquad?.('casualty',data.unit?[data.unit]:null,90);if(data.unit?.name){toast(data.unit.name.toUpperCase()+' IS DOWN',1500);showBeat('CASUALTY',data.unit.name.toUpperCase()+' IS DOWN','Get them stabilised if the position is safe.',1700)}}
 else if(type==='ALLY_DEAD'){root.BadFodderVoices?.speakSquad?.('casualty',null,100);if(data.unit?.name)showBeat('SQUAD LOSS',data.unit.name.toUpperCase()+' HAS BEEN LOST','Keep moving. The rest of the group still needs you.',2000)}
 else if(type==='UNDER_FIRE')root.BadFodderVoices?.speakSquad?.('underFire',data.unit?[data.unit]:null,70);
 else if(type==='AREA_CLEAR')root.BadFodderVoices?.speakSquad?.('clear',data.unit?[data.unit]:null,45);
 else if(type==='STABILISED'&&data.unit?.name)toast(data.unit.name.toUpperCase()+' STABILISED',1200);
 return true;
}
function observeSquad(){
 if(!activeRun||activeRun.ended||!Array.isArray(activeRun.squad))return;
 activeRun.squad.forEach((unit,index)=>{if(!unit)return;const key=unitKey(unit,index),next={state:stateOf(unit),stabilised:!!unit.stabilised},prev=activeRun.observed.get(key)||next;
   if(next.state!==prev.state){if(next.state==='DOWN')event('ALLY_DOWN',{unit,index});else if(next.state==='DEAD')event('ALLY_DEAD',{unit,index});else if(next.state==='BADLY_WOUNDED'&&prev.state==='FIT')event('WOUNDED',{unit,index});}
   if(next.stabilised&&!prev.stabilised)event('STABILISED',{unit,index});activeRun.observed.set(key,next);
 });
}
function recoverySeconds(phase={}){const intensity=String(phase?.checkpoint?.style||phase?.type||'').toLowerCase();return /last-stand|siege|defend|hold/.test(intensity)?7:/pincer|clear|capture/.test(intensity)?5.5:4.5}
function hash(text){let h=2166136261;for(const ch of String(text)){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
function resistanceTick(){
 const arcade=root.BadFodderArcade;if(!arcade?.active?.('resistance'))return;const state=arcade.runtime;if(!state?.initialised||!state.env)return;
 if(!resistanceScenario){let seed;try{seed=Number(root.sessionStorage?.getItem(RESISTANCE_SEED_KEY))||0;if(!seed){seed=(Date.now()^hash(arcade.read?.()?.map||mission))>>>0;root.sessionStorage?.setItem(RESISTANCE_SEED_KEY,String(seed))}}catch(_){seed=hash(mission)}const variants=[{name:'ENCIRCLED',rest:6},{name:'PRESSURE FROM THE FLANKS',rest:5.5},{name:'SCATTERED APPROACHES',rest:6.5},{name:'RELENTLESS PATROLS',rest:4.8}];resistanceScenario=variants[seed%variants.length];if(state.anchors?.length>1){const a=state.anchors.slice(),shift=seed%a.length;state.anchors.splice(0,state.anchors.length,...a.slice(shift),...a.slice(0,shift))}showBeat('RESISTANCE',resistanceScenario.name,'Enemy approaches and recovery windows are different this run.',2500)}
 const hud=doc.getElementById('arcadeHud');if(hud&&resistanceScenario&&!hud.dataset.scenario){hud.dataset.scenario='1';const tag=doc.createElement('span');tag.textContent=resistanceScenario.name;tag.style.opacity='.78';hud.appendChild(tag)}
 if(state.between&&state.wave!==resistanceSeenWave){resistanceSeenWave=state.wave;const alive=state.env.squad.filter(u=>u?.alive!==false&&!u?.downed).length;state.score+=(alive*75);state.nextWaveAt=Math.max(state.nextWaveAt,state.clock+resistanceScenario.rest+(alive<3?2:0));showBeat('WAVE BROKEN','REGROUP · '+alive+' FIGHTERS READY','Reposition before the next pressure arrives.',1800)}
}
function tacticalLull(){if(lifecycle!=='PLAYING'||!hadCombat||lullShown||!lastCombatAt)return;if(now()-lastCombatAt<4700)return;lullShown=true;showBeat('TACTICAL LULL','PRESSURE EASING','Regroup · stabilise wounded · reload · reposition.',1800)}
function drawAtmosphere(w,h,t){const key=mission;ctx.save();for(let i=0;i<particles.length;i++){const p=particles[i],phase=t*.00005*p.s+p.p;let x=(p.x*w+(t*.008*p.s))%(w+40)-20,y=(p.y*h+Math.sin(phase*2.3)*18)%h;if(key==='wigan'){ctx.fillStyle='rgba(42,39,35,.16)';ctx.beginPath();ctx.arc(x,y,1.1+p.s,0,Math.PI*2);ctx.fill()}else if(key==='cable-street'){if(i>15)continue;ctx.save();ctx.translate(x,y);ctx.rotate(phase);ctx.fillStyle='rgba(208,199,171,.16)';ctx.fillRect(-2.5-p.s,-1,5+p.s*2,2);ctx.restore()}else if(key==='barcelona'){ctx.fillStyle='rgba(235,194,119,.14)';ctx.beginPath();ctx.arc(x,y,.9+p.s*.8,0,Math.PI*2);ctx.fill()}else if(key==='bad-belzig'&&i<16){ctx.save();ctx.translate(x,y);ctx.rotate(phase);ctx.fillStyle='rgba(115,101,63,.15)';ctx.fillRect(-2.2,-.8,4.4,1.6);ctx.restore()}}ctx.restore()}
function drawHit(w,h,dt){if(hitPulse<=0)return;hitPulse=Math.max(0,hitPulse-dt*(hitTeam==='squad'?3.3:5.8));const a=hitPulse;ctx.save();if(hitTeam==='squad'){const g=ctx.createRadialGradient(w/2,h/2,Math.min(w,h)*.18,w/2,h/2,Math.max(w,h)*.72);g.addColorStop(0,'rgba(130,18,12,0)');g.addColorStop(1,'rgba(130,18,12,'+(.22*a)+')');ctx.fillStyle=g;ctx.fillRect(0,0,w,h)}else{ctx.strokeStyle='rgba(255,236,188,'+(.34*a)+')';ctx.lineWidth=2;ctx.beginPath();ctx.arc(w/2,h/2,7+(1-a)*11,0,Math.PI*2);ctx.stroke()}ctx.restore()}
function drawActorCue(g,ent,team){if(!ent||!Number.isFinite(ent.x)||!Number.isFinite(ent.y))return;const x=ent.x,y=ent.y;if((ent.hitTimer||0)>0){const a=Math.min(1,(ent.hitTimer||0)/.14);g.save();g.strokeStyle=team==='enemy'?'rgba(255,224,150,'+(.9*a)+')':'rgba(255,245,215,'+(.95*a)+')';g.lineWidth=1.5;for(let i=0;i<4;i++){const q=i*Math.PI/2+.785,d1=12+(1-a)*4,d2=18+(1-a)*7;g.beginPath();g.moveTo(x+Math.cos(q)*d1,y-8+Math.sin(q)*d1);g.lineTo(x+Math.cos(q)*d2,y-8+Math.sin(q)*d2);g.stroke()}g.restore()}
 if((ent.suppression||0)>.58){g.save();g.strokeStyle=team==='enemy'?'rgba(215,175,120,.62)':'rgba(245,221,151,.72)';g.lineWidth=1.4;g.setLineDash?.([3,3]);g.beginPath();g.arc(x,y-15,10,Math.PI*1.12,Math.PI*1.88);g.stroke();g.restore()}
 if(team==='squad'&&ent.alive!==false&&!ent.downed){const state=String(ent.companionState||'');const label={TAKE_COVER:'COVER',BREAK_CONTACT:'FALL BACK',SUPPRESS:'SUPPRESS',AID:'AID',PROTECT_CASUALTY:'AID',REGROUP:'REGROUP',WATCH_DIRECTION:'WATCH',HOLD:'HOLD',MOVE_TO_SUPPORT:'SUPPORT'}[state];if(label){g.save();g.font='700 6px system-ui,sans-serif';const width=Math.max(24,g.measureText?.(label)?.width+8||28);g.fillStyle='rgba(16,23,17,.82)';g.strokeStyle='rgba(238,216,156,.58)';g.lineWidth=.7;g.fillRect(x-width/2,y-32,width,10);g.strokeRect(x-width/2,y-32,width,10);g.fillStyle='rgba(247,232,192,.92)';g.textAlign='center';g.textBaseline='middle';g.fillText(label,x,y-27);g.restore()}}
}
function patchArt(art){if(!art||art.__experienceV2||typeof art.drawActor!=='function')return false;const original=art.drawActor;art.drawActor=function(g,ent,team='squad'){const result=original.call(this,g,ent,team);try{drawActorCue(g,ent,team)}catch(_){}return result};Object.defineProperty(art,'__experienceV2',{value:true,configurable:true});return true}
function frame(ts){raf=0;if(lifecycle!=='PLAYING'||doc.hidden||reduce())return;const dt=Math.min(.05,(ts-last)/1000||.016);last=ts;const w=innerWidth,h=innerHeight;ctx.clearRect(0,0,w,h);drawAtmosphere(w,h,ts);drawHit(w,h,dt);raf=requestAnimationFrame(frame)}
setInterval(()=>{ensure();patchArt(root.BadFodderArt);observeSquad();resistanceTick();tacticalLull()},350);
doc.addEventListener('visibilitychange',sync);if(doc.readyState==='loading')doc.addEventListener('DOMContentLoaded',ensure,{once:true});else ensure();
root.BadFodderExperience={setState,hit,event,missionStart,missionEnd,decorateResult,recoverySeconds,sync,continuity:loadContinuity,showBeat,get debrief(){return lastDebrief},get mission(){return mission}};
})(window);
