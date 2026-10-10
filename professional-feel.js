/* Professional feel layer: readable combat, AI intent, camera impulse, controller focus and mobile HUD standards. */
(function(root){
'use strict';
if(!root.document)return;
const doc=root.document;
const reduce=()=>root.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
const actorState=new WeakMap();
let artPatched=false,experiencePatched=false,sfxPatched=false,objectiveObserver=null,shakeRaf=0,shakeUntil=0,shakeStrength=0;

function angleOf(ent){let a=Number(ent?.dir)||0;if(Math.abs(a)>Math.PI*2+.01)a=(a%8)*Math.PI/4;return a}
function canDraw(g){return !!(g?.save&&g?.restore&&g?.beginPath&&g?.arc&&g?.fill&&g?.stroke)}
function currentMap(){try{return root.BadFodderCoopBridge?.map?.()||''}catch(_){return''}}
function isBelzig(){return currentMap()==='bad-belzig'}
function healthOf(ent){
 try{return root.BadFodderHealth?.stateFor?.(ent)||(ent?.alive===false?'DEAD':ent?.downed?'DOWN':'FIT')}catch(_){return ent?.alive===false?'DEAD':ent?.downed?'DOWN':'FIT'}
}
function poseOf(ent){try{return root.BadFodderArt?.pose?.(ent)||null}catch(_){return null}}
function visualOf(ent){
 let state=actorState.get(ent);if(!state){state={health:'FIT',garrison:false,changed:0};actorState.set(ent,state)}
 const health=healthOf(ent),garrison=!!(ent?.manualGarrison||ent?.checkpointCover||Number.isFinite(ent?.checkpointGarrison));
 if(state.health!==health||state.garrison!==garrison){state.health=health;state.garrison=garrison;state.changed=performance.now?.()||0}
 return state;
}
function line(g,x1,y1,x2,y2){g.beginPath();g.moveTo(x1,y1);g.lineTo(x2,y2);g.stroke()}
function drawConditionCue(g,ent,team){
 if(!canDraw(g)||!ent)return;
 const health=healthOf(ent),suppression=Math.max(0,Math.min(1,Number(ent.suppression)||0));
 if(team==='squad'&&health==='DOWN'){
   const pulse=reduce()?0:(Math.sin((performance.now?.()||0)/190)+1)*.5;
   g.save();g.globalAlpha=.6+.2*pulse;g.strokeStyle='#f0d98e';g.lineWidth=1.5;g.beginPath();g.arc(ent.x,ent.y,12.5+pulse*1.5,0,Math.PI*2);g.stroke();
   g.fillStyle='#f3e6ba';g.fillRect(ent.x-1.2,ent.y-17,2.4,7);g.fillRect(ent.x-3.5,ent.y-14.7,7,2.4);g.restore();return;
 }
 if(team==='squad'&&(health==='WOUNDED'||health==='BADLY_WOUNDED')){
   const bad=health==='BADLY_WOUNDED';g.save();g.globalAlpha=bad?.9:.68;g.strokeStyle='#f1d39a';g.lineWidth=bad?1.7:1.25;const y=ent.y-18;
   line(g,ent.x-4,y,ent.x+4,y);if(bad)line(g,ent.x-4,y-3,ent.x+4,y-3);g.restore();
 }
 if(suppression>=.48){
   g.save();g.globalAlpha=.28+.42*suppression;g.strokeStyle=team==='squad'?'#f1c16a':'#d6b47b';g.lineWidth=1.25;const y=ent.y-20;
   for(let i=0;i<2;i++)line(g,ent.x-5+i*5,y-i*2,ent.x-1+i*5,y+3-i*2);g.restore();
 }
}
function drawOrderCue(g,ent,team){
 if(!canDraw(g)||team!=='squad'||!ent||ent.alive===false||ent.downed)return;
 const state=String(ent.companionState||ent.order||''),garrison=!!(ent.manualGarrison||ent.checkpointCover||Number.isFinite(ent.checkpointGarrison));
 const tracked=visualOf(ent),age=(performance.now?.()||0)-tracked.changed,transition=Math.max(0,1-age/460);
 if(!garrison&&!state&&!transition)return;
 const x=ent.x,y=ent.y-20;g.save();g.lineWidth=1.15;g.strokeStyle='#e7dbb0';g.fillStyle='rgba(27,35,27,.74)';
 if(garrison){
   g.globalAlpha=.78;g.beginPath();g.moveTo(x-4,y-3);g.lineTo(x+4,y-3);g.lineTo(x+3,y+3);g.lineTo(x,y+5);g.lineTo(x-3,y+3);g.closePath();g.stroke();
 }else if(/HOLD|TAKE_COVER/.test(state)){
   g.globalAlpha=.64;line(g,x-4,y-2,x+4,y-2);line(g,x-3,y+2,x+3,y+2);
 }else if(/FOLLOW|REGROUP/.test(state)){
   g.globalAlpha=.62;g.beginPath();g.moveTo(x-4,y-3);g.lineTo(x,y+2);g.lineTo(x+4,y-3);g.stroke();
 }else if(/AID|PROTECT_CASUALTY/.test(state)){
   g.globalAlpha=.7;g.fillRect(x-1,y-4,2,8);g.fillRect(x-4,y-1,8,2);
 }else if(/SUPPRESS|ENGAGE/.test(state)){
   g.globalAlpha=.62;g.beginPath();g.arc(x-2.2,y,1.5,0,Math.PI*2);g.arc(x+2.2,y,1.5,0,Math.PI*2);g.fill();
 }
 if(transition>0){
   g.globalAlpha=.48*transition;g.lineWidth=1.15;const r=11+(1-transition)*3;
   for(const sx of [-1,1])for(const sy of [-1,1]){const cx=ent.x+sx*r,cy=ent.y+sy*r*.58;line(g,cx,cy,cx-sx*3,cy);line(g,cx,cy,cx,cy-sy*3)}
 }
 g.restore();
}
function drawCombatCue(g,ent,team){
 if(!canDraw(g)||!ent||ent.alive===false)return;
 const a=angleOf(ent),fire=Math.max(0,Number(ent.fireTimer)||0),hit=Math.max(0,Number(ent.hitTimer)||0);
 // Belzig's illustrated enemy renderer already owns its muzzle flash. Do not stack another flash over it.
 if(fire>0&&!(isBelzig()&&team==='enemy')){
   const d=15,x=ent.x+Math.cos(a)*d,y=ent.y+Math.sin(a)*d-5;
   g.save();g.globalAlpha=Math.min(.95,.45+fire*4);g.fillStyle=team==='squad'?'#ffe39a':'#ffc77f';g.beginPath();g.moveTo(x+Math.cos(a)*7,y+Math.sin(a)*7);g.lineTo(x+Math.cos(a+2.45)*3.8,y+Math.sin(a+2.45)*3.8);g.lineTo(x+Math.cos(a-2.45)*3.8,y+Math.sin(a-2.45)*3.8);g.closePath();g.fill();g.restore();
 }
 if(hit>0){
   const phase=Math.min(1,hit/.18),r=5+(1-phase)*3;g.save();g.globalAlpha=.32+.46*phase;g.strokeStyle='#f6e9bf';g.lineWidth=1.1;
   for(let i=0;i<3;i++){const q=i*2.094+(ent.variant||0)*.3;line(g,ent.x+Math.cos(q)*2,ent.y-7+Math.sin(q)*2,ent.x+Math.cos(q)*r,ent.y-7+Math.sin(q)*r)}g.restore();
 }
}
function belzigTransform(g,ent,team,invoke){
 if(!isBelzig()||!g?.save||!ent)return invoke();
 const pose=poseOf(ent),health=healthOf(ent),a=angleOf(ent),fire=Math.max(0,Number(ent.fireTimer)||0),hit=Math.max(0,Number(ent.hitTimer)||0);
 const moving=!!(pose?.moving||/walk|run/.test(String(pose?.state||ent.state||''))),phase=Number(pose?.phase)||0;
 const still=ent.alive!==false&&!ent.downed&&!moving,clock=(performance.now?.()||0)/1000+(Number(ent.variant)||0)*.73;
 const firePhase=Math.min(1,fire/.12),hitPhase=Math.min(1,hit/.18),garrison=!!(ent.manualGarrison||ent.checkpointCover||Number.isFinite(ent.checkpointGarrison));
 let ox=0,oy=0,rot=0;
 if(!reduce()){
   if(moving){oy+=Math.cos(phase*2)*.32;rot+=Math.sin(phase)*.008}
   else if(still){oy+=Math.sin(clock*1.8)*.18;rot+=Math.sin(clock*.72)*.004}
 }
 if(garrison){oy+=1.25;rot+=Math.cos(a)*.012}
 if(health==='WOUNDED')rot+=Math.sin(a)*.018;else if(health==='BADLY_WOUNDED'){oy+=.7;rot+=Math.sin(a)*.032}
 ox-=Math.cos(a)*(firePhase*1.15+hitPhase*1.8);oy-=Math.sin(a)*(firePhase*.7+hitPhase*1.05);
 g.save();g.translate(ent.x+ox,ent.y+oy);if(rot)g.rotate(rot);g.translate(-ent.x,-ent.y);
 let result;try{result=invoke()}finally{g.restore()}return result;
}
function renderActorFeedback(invoke,g,ent,team='squad'){
 const a=angleOf(ent),hit=Math.max(0,Number(ent?.hitTimer)||0),fire=Math.max(0,Number(ent?.fireTimer)||0),hitPhase=Math.min(1,hit/.18),firePhase=Math.min(1,fire/.12),kick=isBelzig()?0:hitPhase*2.6+firePhase*.9;
 let result;
 const draw=()=>belzigTransform(g,ent,team,invoke);
 if(kick&&g?.save){g.save();g.translate(-Math.cos(a)*kick,-Math.sin(a)*kick*.58);try{result=draw()}finally{g.restore()}}
 else result=draw();
 drawCombatCue(g,ent,team);drawConditionCue(g,ent,team);if(isBelzig())drawOrderCue(g,ent,team);return result;
}
function patchArt(){
 const art=root.BadFodderArt;if(!art||artPatched||art.__professionalFeelPatched||typeof art.drawActor!=='function')return false;
 const pipeline=art.actorRenderPipeline;
 if(pipeline?.register){
   const registered=pipeline.register('professional-feel',{around:(invoke,g,ent,team='squad')=>renderActorFeedback(invoke,g,ent,team)});
   if(!registered&&!pipeline.list().some(layer=>layer.name==='professional-feel'))return false;
 }else{
   const original=art.drawActor;
   art.drawActor=function(g,ent,team='squad',...rest){return renderActorFeedback(()=>original.call(this,g,ent,team,...rest),g,ent,team)};
 }
 art.__professionalFeelPatched=true;artPatched=true;return true;
}
function objectivePulse(){
 const host=doc.querySelector('.hud-mission');if(!host)return;host.classList.remove('pro-objective-pulse');void host.offsetWidth;host.classList.add('pro-objective-pulse');setTimeout(()=>host.classList.remove('pro-objective-pulse'),760);
 if(isBelzig())try{root.BadFodderSfx?.environment?.('bad-belzig','objective')}catch(_){}
}
function observeObjectives(){
 if(objectiveObserver||!root.MutationObserver)return;
 const nodes=[doc.getElementById('hudStage'),doc.getElementById('hudMission'),doc.getElementById('hudInstruction')].filter(Boolean);if(!nodes.length)return;
 let armed=false,timer=0;objectiveObserver=new MutationObserver(()=>{clearTimeout(timer);timer=setTimeout(()=>{if(armed)objectivePulse();armed=true},35)});
 nodes.forEach(n=>{const options={childList:true,subtree:true,characterData:true};if(n.id==='hudInstruction'){options.attributes=true;options.attributeFilter=['hidden']}objectiveObserver.observe(n,options)});
 setTimeout(()=>{armed=true},500);
}
function shakeFrame(){
 shakeRaf=0;const canvas=doc.getElementById('game');if(!canvas||reduce()||performance.now()>=shakeUntil){if(canvas&&'translate' in canvas.style)canvas.style.translate='';shakeStrength=0;return}
 const remaining=Math.max(0,(shakeUntil-performance.now())/220),s=shakeStrength*remaining;
 if('translate' in canvas.style)canvas.style.translate=(Math.sin(performance.now()*.09)*s).toFixed(2)+'px '+(Math.cos(performance.now()*.073)*s*.55).toFixed(2)+'px';
 shakeRaf=requestAnimationFrame(shakeFrame);
}
function impulse(strength=1,duration=140){
 if(reduce())return;const canvas=doc.getElementById('game');if(!canvas||!('translate' in canvas.style))return;
 shakeStrength=Math.max(shakeStrength,Math.max(0,Number(strength)||0));shakeUntil=Math.max(shakeUntil,performance.now()+Math.max(60,Number(duration)||140));if(!shakeRaf)shakeRaf=requestAnimationFrame(shakeFrame);
}
function patchExperience(){
 const xp=root.BadFodderExperience;if(!xp||experiencePatched||xp.__professionalFeelPatched)return false;
 if(typeof xp.hit==='function'){const hit=xp.hit.bind(xp);xp.hit=function(data={}){const result=hit(data);impulse(data.team==='squad'?1.8:.55,data.team==='squad'?170:95);return result}}
 if(typeof xp.event==='function'){const event=xp.event.bind(xp);xp.event=function(type,data){const result=event(type,data);if(type==='ALLY_DOWN')impulse(1.1,150);return result}}
 xp.__professionalFeelPatched=true;experiencePatched=true;return true;
}
function patchSfx(){
 const sfx=root.BadFodderSfx;if(!sfx||sfxPatched||sfx.__professionalFeelPatched)return false;
 if(typeof sfx.explosion==='function'){const explode=sfx.explosion.bind(sfx);sfx.explosion=function(...args){const result=explode(...args);impulse(3.5,260);return result}}
 sfx.__professionalFeelPatched=true;sfxPatched=true;return true;
}
function install(){observeObjectives();patchArt();patchExperience();patchSfx();doc.documentElement.classList.add('professional-game-feel')}
if(doc.readyState==='loading')doc.addEventListener('DOMContentLoaded',install,{once:true});else install();
let attempts=0;const poll=setInterval(()=>{install();if((artPatched&&experiencePatched&&sfxPatched)||++attempts>40)clearInterval(poll)},250);
root.BadFodderProfessionalFeel={install,impulse,isBelzig,get artPatched(){return artPatched},get experiencePatched(){return experiencePatched},get sfxPatched(){return sfxPatched}};
})(window);