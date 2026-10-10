/* Professional feel layer: readable combat, AI intent, camera impulse, controller focus and mobile HUD standards. */
(function(root){
'use strict';
if(!root.document)return;
const doc=root.document;
const reduce=()=>root.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
let artPatched=false,experiencePatched=false,sfxPatched=false,objectiveObserver=null,shakeRaf=0,shakeUntil=0,shakeStrength=0;

function angleOf(ent){let a=Number(ent?.dir)||0;if(Math.abs(a)>Math.PI*2+.01)a=(a%8)*Math.PI/4;return a}
function canDraw(g){return !!(g?.save&&g?.restore&&g?.beginPath&&g?.arc&&g?.fill&&g?.stroke)}
function drawStateCue(g,ent,team){
 if(!canDraw(g)||!ent||ent.alive===false)return;
 const suppression=Math.max(0,Math.min(1,Number(ent.suppression)||0)),state=String(ent.companionState||'');
 if(team==='squad'&&ent.downed){
   const pulse=reduce()?0:(Math.sin((performance.now?.()||0)/170)+1)*.5;
   g.save();g.globalAlpha=.55+.25*pulse;g.strokeStyle='#f0d98e';g.lineWidth=1.5;g.beginPath();g.arc(ent.x,ent.y,12.5+pulse*2,0,Math.PI*2);g.stroke();
   g.fillStyle='#f3e6ba';g.fillRect(ent.x-1.2,ent.y-16,2.4,7);g.fillRect(ent.x-3.5,ent.y-13.7,7,2.4);g.restore();return;
 }
 if(suppression>=.5){
   g.save();g.globalAlpha=.35+.35*suppression;g.strokeStyle=team==='squad'?'#f1c16a':'#d6b47b';g.lineWidth=1.25;
   const y=ent.y-18;for(let i=0;i<2;i++){g.beginPath();g.moveTo(ent.x-5+i*5,y-i*2);g.lineTo(ent.x-1+i*5,y+3-i*2);g.stroke()}g.restore();
 }
 if(team!=='squad'||!state)return;
 g.save();g.globalAlpha=.72;g.lineWidth=1.15;g.strokeStyle='#e7dbb0';g.fillStyle='rgba(27,35,27,.78)';
 const x=ent.x,y=ent.y-19;
 if(/AID|PROTECT_CASUALTY/.test(state)){g.fillRect(x-4,y-4,8,8);g.strokeStyle='#f0d98e';g.beginPath();g.moveTo(x,y-2.5);g.lineTo(x,y+2.5);g.moveTo(x-2.5,y);g.lineTo(x+2.5,y);g.stroke()}
 else if(/TAKE_COVER|BREAK_CONTACT|COVER_ADVANCE/.test(state)){g.beginPath();g.moveTo(x,y-4);g.lineTo(x+4,y-1);g.lineTo(x+2.7,y+4);g.lineTo(x-2.7,y+4);g.lineTo(x-4,y-1);g.closePath();g.fill();g.stroke()}
 else if(/SUPPRESS|ENGAGE/.test(state)){g.beginPath();g.arc(x-2.2,y,1.6,0,Math.PI*2);g.arc(x+2.2,y,1.6,0,Math.PI*2);g.fill()}
 else if(/REGROUP/.test(state)){g.beginPath();g.arc(x,y,4.2,0,Math.PI*2);g.stroke();g.beginPath();g.moveTo(x-5.5,y);g.lineTo(x+5.5,y);g.stroke()}
 g.restore();
}
function drawCombatCue(g,ent,team){
 if(!canDraw(g)||!ent||ent.alive===false)return;
 const a=angleOf(ent),fire=Number(ent.fireTimer)||0,hit=Number(ent.hitTimer)||0;
 if(fire>0){
   const d=15,x=ent.x+Math.cos(a)*d,y=ent.y+Math.sin(a)*d-5;
   g.save();g.globalAlpha=Math.min(.95,.45+fire*4);g.fillStyle=team==='squad'?'#ffe39a':'#ffc77f';g.beginPath();g.moveTo(x+Math.cos(a)*7,y+Math.sin(a)*7);g.lineTo(x+Math.cos(a+2.45)*3.8,y+Math.sin(a+2.45)*3.8);g.lineTo(x+Math.cos(a-2.45)*3.8,y+Math.sin(a-2.45)*3.8);g.closePath();g.fill();g.restore();
 }
 if(hit>0){
   const phase=Math.min(1,hit/.18),r=5+(1-phase)*3;
   g.save();g.globalAlpha=.35+.45*phase;g.strokeStyle='#f6e9bf';g.lineWidth=1.1;for(let i=0;i<3;i++){const q=i*2.094+(ent.variant||0)*.3;g.beginPath();g.moveTo(ent.x+Math.cos(q)*2,ent.y-7+Math.sin(q)*2);g.lineTo(ent.x+Math.cos(q)*r,ent.y-7+Math.sin(q)*r);g.stroke()}g.restore();
 }
}
function patchArt(){
 const art=root.BadFodderArt;if(!art||artPatched||art.__professionalFeelPatched||typeof art.drawActor!=='function')return false;
 const original=art.drawActor;
 art.drawActor=function(g,ent,team='squad',...rest){
   const a=angleOf(ent),hit=Math.max(0,Number(ent?.hitTimer)||0),fire=Math.max(0,Number(ent?.fireTimer)||0),hitPhase=Math.min(1,hit/.18),firePhase=Math.min(1,fire/.12),kick=hitPhase*2.6+firePhase*.9;
   let result;if(kick&&g?.save){g.save();g.translate(-Math.cos(a)*kick,-Math.sin(a)*kick*.58);try{result=original.call(this,g,ent,team,...rest)}finally{g.restore()}}else result=original.call(this,g,ent,team,...rest);
   drawCombatCue(g,ent,team);drawStateCue(g,ent,team);return result;
 };
 art.__professionalFeelPatched=true;artPatched=true;return true;
}
function objectivePulse(){
 const host=doc.querySelector('.hud-mission');if(!host)return;host.classList.remove('pro-objective-pulse');void host.offsetWidth;host.classList.add('pro-objective-pulse');setTimeout(()=>host.classList.remove('pro-objective-pulse'),760);
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
root.BadFodderProfessionalFeel={install,impulse,get artPatched(){return artPatched},get experiencePatched(){return experiencePatched},get sfxPatched(){return sfxPatched}};
})(window);
