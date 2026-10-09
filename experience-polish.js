/* Cohesive experience layer: continuity, reactions, combat feedback, pacing and location atmosphere. */
(function(root){
'use strict';
if(!root.document)return;
const doc=root.document,reduce=()=>root.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
const CONTINUITY_KEY='badfodder.continuity.v1',RESISTANCE_SEED_KEY='badfodder.resistance.seed.v1';
let mission='',lifecycle='TITLE',canvas=null,ctx=null,raf=0,last=0,hitPulse=0,hitTeam='',lastObjective='',activeRun=null,lastDebrief=null,resistanceSeenWave=-1,resistanceScenario=null;
const particles=Array.from({length:16},(_,i)=>({x:(i*83%997)/997,y:(i*137%991)/991,s:.45+(i%4)*.18,p:(i*1.77)%6.28}));
const reactionCooldown=new Map();
const now=()=>typeof performance!=='undefined'&&performance.now?performance.now():Date.now();
const store=()=>root.BadFodderStorage?.local||root.localStorage;
function safeJson(value,fallback){try{return JSON.parse(value)}catch(_){return fallback}}
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
 mission=String(key||mission);lastDebrief=null;resistanceSeenWave=-1;resistanceScenario=null;
 if(campaign)applyPersistentSquad(squad);
 const observed=new Map();squad.forEach((u,i)=>observed.set(unitKey(u,i),{state:stateOf(u),stabilised:!!u?.stabilised}));
 activeRun={campaign:!!campaign,key:mission,started:Date.now(),events:[],downed:new Set(),stabilised:new Set(),baseline:squad.map((u,i)=>snapshotUnit(u,i)),squad,observed};
 return activeRun;
}
function remember(type,data={}){
 if(!activeRun)return;const unit=data.unit,index=Number.isInteger(data.index)?data.index:null,key=index===null?(unit?.campaignId||unit?.persistenceId||unit?.name||''):unitKey(unit,index);
 activeRun.events.push({type,key:String(key||''),name:String(unit?.name||data.name||''),time:Date.now()});if(activeRun.events.length>48)activeRun.events.shift();
 if(type==='ALLY_DOWN'&&key)activeRun.downed.add(String(key));if(type==='STABILISED'&&key)activeRun.stabilised.add(String(key));
}
function missionEnd({campaign=false,key='',squad=[],win=false,civiliansRescued=0,civiliansLost=0}={}){
 if(!activeRun||activeRun.ended)return lastDebrief;activeRun.ended=true;
 const survivors=squad.filter(u=>u?.alive!==false),dead=squad.filter(u=>u?.alive===false),hurt=survivors.filter(u=>stateOf(u)!=='FIT');
 const notable=[];for(const e of activeRun.events){if(e.type==='STABILISED'&&e.name)notable.push(e.name+' was stabilised under fire.');if(e.type==='ALLY_DOWN'&&e.name)notable.push(e.name+' was brought down during the fighting.');if(e.type==='ALLY_DEAD'&&e.name)notable.push(e.name+' did not survive.');if(notable.length>=2)break}
 lastDebrief={key:String(key||activeRun.key||mission),win:!!win,survivors:survivors.length,dead:dead.length,hurt:hurt.length,civiliansRescued:Number(civiliansRescued)||0,civiliansLost:Number(civiliansLost)||0,characters:squad.map((u,i)=>({name:String(u?.name||('Volunteer '+(i+1))),health:stateOf(u),alive:u?.alive!==false})),notable};
 if(campaign&&win){
   const continuity=loadContinuity();squad.forEach((unit,index)=>{const key=unitKey(unit,index),previous=continuity.slots[key]||snapshotUnit(unit,index),next={...previous,...snapshotUnit(unit,index)};next.missions=(Number(previous.missions)||0)+1;next.timesDowned=(Number(previous.timesDowned)||0)+(activeRun.downed.has(key)?1:0);next.stabilisations=(Number(previous.stabilisations)||0)+(activeRun.stabilised.has(key)?1:0);continuity.slots[key]=next});
   continuity.history.push({mission:lastDebrief.key,at:Date.now(),survivors:lastDebrief.survivors,dead:lastDebrief.dead,hurt:lastDebrief.hurt,civiliansRescued:lastDebrief.civiliansRescued});if(continuity.history.length>24)continuity.history=continuity.history.slice(-24);saveContinuity(continuity);
 }
 return lastDebrief;
}
function decorateResult(){
 const d=lastDebrief;if(!d)return false;const subtitle=doc.getElementById('resultSubtitle'),flavour=doc.getElementById('resultFlavour');
 if(subtitle)subtitle.textContent=d.survivors+' SURVIVED · '+d.hurt+' WOUNDED · '+d.dead+' LOST';
 if(flavour){const roster=d.characters.map(c=>c.name+' — '+c.health).join(' · '),civ=d.civiliansRescued||d.civiliansLost?' · Civilians: '+d.civiliansRescued+' rescued'+(d.civiliansLost?' · '+d.civiliansLost+' lost':''):'';flavour.textContent=roster+civ+(d.notable.length?' · '+d.notable.join(' '):'')}
 return true;
}
function ensure(){
 if(canvas||!doc.body)return;
 canvas=doc.createElement('canvas');canvas.id='experiencePolish';canvas.setAttribute('aria-hidden','true');canvas.style.cssText='position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:12;opacity:.8;';doc.body.appendChild(canvas);ctx=canvas.getContext('2d');resize();
 root.addEventListener('resize',resize,{passive:true});const stage=doc.getElementById('hudStage');if(stage&&root.MutationObserver){new MutationObserver(()=>objectiveChanged(stage.textContent||'')).observe(stage,{subtree:true,childList:true,characterData:true});lastObjective=stage.textContent||'';}
}
function resize(){if(!canvas)return;const d=Math.min(2,root.devicePixelRatio||1),w=Math.max(1,innerWidth),h=Math.max(1,innerHeight);canvas.width=Math.round(w*d);canvas.height=Math.round(h*d);ctx?.setTransform(d,0,0,d,0,0)}
function toast(text,duration=1800){const notice=doc.getElementById('hudNotice');if(!notice||notice.classList.contains('show'))return false;notice.textContent=text;notice.classList.add('show');setTimeout(()=>{if(notice.textContent===text)notice.classList.remove('show')},duration);return true}
function objectiveChanged(text){text=String(text).trim();if(!text||text===lastObjective){lastObjective=text;return}const previous=lastObjective;lastObjective=text;if(!previous||lifecycle!=='PLAYING'||/COMPLETE|FAILED/i.test(text))return;toast('OBJECTIVE UPDATED · '+text,2200);event('OBJECTIVE_UPDATED',{text})}
function setState(next,key){ensure();lifecycle=String(next||'');if(key)mission=String(key);if(root.BadFodderSfx?.environment&&lifecycle==='PLAYING')try{root.BadFodderSfx.environment(mission,'enter')}catch(_){}sync()}
function sync(){if(lifecycle==='PLAYING'&&!doc.hidden&&!reduce()){if(!raf){last=performance.now();raf=requestAnimationFrame(frame)}}else if(raf){cancelAnimationFrame(raf);raf=0;if(ctx&&canvas)ctx.clearRect(0,0,canvas.width,canvas.height)}}
function hit({team='enemy',amount=1}={}){ensure();hitTeam=team;hitPulse=Math.max(hitPulse,team==='squad'?Math.min(1,0.5+Number(amount)*.2):.58);if(team==='squad'&&root.navigator?.vibrate)try{root.navigator.vibrate(18)}catch(_){}sync()}
function event(type,data={}){
 type=String(type||'');remember(type,data);const t=now(),key=type+':'+String(data.unit?.name||data.name||'');const cooldown=/UNDER_FIRE|HIT/.test(type)?4500:1800;if(t-(reactionCooldown.get(key)||0)<cooldown)return false;reactionCooldown.set(key,t);
 if(type==='ALLY_DOWN'){root.BadFodderVoices?.speakSquad?.('casualty',data.unit?[data.unit]:null,90);if(data.unit?.name)toast(data.unit.name.toUpperCase()+' IS DOWN',1500)}
 else if(type==='ALLY_DEAD'){root.BadFodderVoices?.speakSquad?.('casualty',null,100);if(data.unit?.name)toast(data.unit.name.toUpperCase()+' HAS BEEN LOST',1800)}
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
 if(!resistanceScenario){let seed;try{seed=Number(root.sessionStorage?.getItem(RESISTANCE_SEED_KEY))||0;if(!seed){seed=(Date.now()^hash(arcade.read?.()?.map||mission))>>>0;root.sessionStorage?.setItem(RESISTANCE_SEED_KEY,String(seed))}}catch(_){seed=hash(mission)}const variants=[{name:'ENCIRCLED',rest:6},{name:'PRESSURE FROM THE FLANKS',rest:5.5},{name:'SCATTERED APPROACHES',rest:6.5},{name:'RELENTLESS PATROLS',rest:4.8}];resistanceScenario=variants[seed%variants.length];if(state.anchors?.length>1){const a=state.anchors.slice(),shift=seed%a.length;state.anchors.splice(0,state.anchors.length,...a.slice(shift),...a.slice(0,shift))}toast('RESISTANCE · '+resistanceScenario.name,2200)}
 const hud=doc.getElementById('arcadeHud');if(hud&&resistanceScenario&&!hud.dataset.scenario){hud.dataset.scenario='1';const tag=doc.createElement('span');tag.textContent=resistanceScenario.name;tag.style.opacity='.72';hud.appendChild(tag)}
 if(state.between&&state.wave!==resistanceSeenWave){resistanceSeenWave=state.wave;const alive=state.env.squad.filter(u=>u?.alive!==false&&!u?.downed).length;state.score+=(alive*75);state.nextWaveAt=Math.max(state.nextWaveAt,state.clock+resistanceScenario.rest+(alive<3?2:0));toast('REGROUP · '+alive+' FIGHTERS READY',1500)}
}
function drawAtmosphere(w,h,t){const key=mission;ctx.save();for(let i=0;i<particles.length;i++){const p=particles[i],phase=t*.00005*p.s+p.p;let x=(p.x*w+(t*.006*p.s))%(w+30)-15,y=(p.y*h+Math.sin(phase*2.3)*14)%h;if(key==='wigan'){ctx.fillStyle='rgba(42,39,35,.12)';ctx.beginPath();ctx.arc(x,y,1+p.s,0,Math.PI*2);ctx.fill()}else if(key==='cable-street'){if(i>9)continue;ctx.save();ctx.translate(x,y);ctx.rotate(phase);ctx.fillStyle='rgba(208,199,171,.12)';ctx.fillRect(-2-p.s,-1,4+p.s*2,2);ctx.restore()}else if(key==='barcelona'){ctx.fillStyle='rgba(235,194,119,.10)';ctx.beginPath();ctx.arc(x,y,.8+p.s*.7,0,Math.PI*2);ctx.fill()}else if(key==='bad-belzig'&&i<9){ctx.save();ctx.translate(x,y);ctx.rotate(phase);ctx.fillStyle='rgba(115,101,63,.10)';ctx.fillRect(-1.8,-.7,3.6,1.4);ctx.restore()}}ctx.restore()}
function drawHit(w,h,dt){if(hitPulse<=0)return;hitPulse=Math.max(0,hitPulse-dt*(hitTeam==='squad'?3.8:6.5));const a=hitPulse;ctx.save();if(hitTeam==='squad'){const g=ctx.createRadialGradient(w/2,h/2,Math.min(w,h)*.22,w/2,h/2,Math.max(w,h)*.72);g.addColorStop(0,'rgba(120,18,12,0)');g.addColorStop(1,'rgba(120,18,12,'+(.14*a)+')');ctx.fillStyle=g;ctx.fillRect(0,0,w,h)}else{ctx.strokeStyle='rgba(255,236,188,'+(.18*a)+')';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(w/2,h/2,8+(1-a)*8,0,Math.PI*2);ctx.stroke()}ctx.restore()}
function frame(ts){raf=0;if(lifecycle!=='PLAYING'||doc.hidden||reduce())return;const dt=Math.min(.05,(ts-last)/1000||.016);last=ts;const w=innerWidth,h=innerHeight;ctx.clearRect(0,0,w,h);drawAtmosphere(w,h,ts);drawHit(w,h,dt);raf=requestAnimationFrame(frame)}
setInterval(()=>{observeSquad();resistanceTick()},350);
doc.addEventListener('visibilitychange',sync);if(doc.readyState==='loading')doc.addEventListener('DOMContentLoaded',ensure,{once:true});else ensure();
root.BadFodderExperience={setState,hit,event,missionStart,missionEnd,decorateResult,recoverySeconds,sync,continuity:loadContinuity,get debrief(){return lastDebrief},get mission(){return mission}};
})(window);
