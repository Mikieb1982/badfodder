/* Lightweight presentation polish: objective transitions, hit response and location atmosphere. */
(function(root){
'use strict';
if(!root.document)return;
const doc=root.document,reduce=()=>root.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
let mission='',lifecycle='TITLE',canvas=null,ctx=null,raf=0,last=0,hitPulse=0,hitTeam='',lastObjective='';
const particles=Array.from({length:12},(_,i)=>({x:(i*83%997)/997,y:(i*137%991)/991,s:.45+(i%4)*.18,p:(i*1.77)%6.28}));
function ensure(){
 if(canvas||!doc.body)return;
 canvas=doc.createElement('canvas');canvas.id='experiencePolish';canvas.setAttribute('aria-hidden','true');
 canvas.style.cssText='position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:12;opacity:.8;';doc.body.appendChild(canvas);ctx=canvas.getContext('2d');resize();
 root.addEventListener('resize',resize,{passive:true});
 const stage=doc.getElementById('hudStage');if(stage&&root.MutationObserver){
  new MutationObserver(()=>objectiveChanged(stage.textContent||'')).observe(stage,{subtree:true,childList:true,characterData:true});
  lastObjective=stage.textContent||'';
 }
}
function resize(){if(!canvas)return;const d=Math.min(2,root.devicePixelRatio||1),w=Math.max(1,innerWidth),h=Math.max(1,innerHeight);canvas.width=Math.round(w*d);canvas.height=Math.round(h*d);ctx?.setTransform(d,0,0,d,0,0)}
function objectiveChanged(text){
 text=String(text).trim();if(!text||text===lastObjective){lastObjective=text;return}const previous=lastObjective;lastObjective=text;
 if(!previous||lifecycle!=='PLAYING'||/COMPLETE|FAILED/i.test(text))return;
 const notice=doc.getElementById('hudNotice');if(!notice||notice.classList.contains('show'))return;
 notice.textContent='OBJECTIVE UPDATED · '+text;notice.classList.add('show');setTimeout(()=>{if(notice.textContent.startsWith('OBJECTIVE UPDATED'))notice.classList.remove('show')},1800);
}
function setState(next,key){ensure();lifecycle=String(next||'');if(key)mission=String(key);if(root.BadFodderSfx?.environment&&lifecycle==='PLAYING')root.BadFodderSfx.environment(mission,'enter');sync()}
function sync(){if(lifecycle==='PLAYING'&&!doc.hidden&&!reduce()){if(!raf){last=performance.now();raf=requestAnimationFrame(frame)}}else if(raf){cancelAnimationFrame(raf);raf=0;if(ctx&&canvas)ctx.clearRect(0,0,canvas.width,canvas.height)}}
function hit({team='enemy'}={}){ensure();hitTeam=team;hitPulse=Math.max(hitPulse,team==='squad'?1:.58);sync()}
function drawAtmosphere(w,h,t){
 const key=mission;ctx.save();
 for(let i=0;i<particles.length;i++){
  const p=particles[i],phase=t*.00005*p.s+p.p;let x=(p.x*w+(t*.006*p.s))%(w+30)-15,y=(p.y*h+Math.sin(phase*2.3)*14)%h;
  if(key==='wigan'){ctx.fillStyle='rgba(42,39,35,.12)';ctx.beginPath();ctx.arc(x,y,1+p.s,0,Math.PI*2);ctx.fill()}
  else if(key==='cable-street'){if(i>7)continue;ctx.save();ctx.translate(x,y);ctx.rotate(phase);ctx.fillStyle='rgba(208,199,171,.12)';ctx.fillRect(-2-p.s,-1,4+p.s*2,2);ctx.restore()}
  else if(key==='barcelona'){ctx.fillStyle='rgba(235,194,119,.10)';ctx.beginPath();ctx.arc(x,y,.8+p.s*.7,0,Math.PI*2);ctx.fill()}
  else if(key==='bad-belzig'&&i<7){ctx.save();ctx.translate(x,y);ctx.rotate(phase);ctx.fillStyle='rgba(115,101,63,.10)';ctx.fillRect(-1.8,-.7,3.6,1.4);ctx.restore()}
 }
 ctx.restore();
}
function drawHit(w,h,dt){
 if(hitPulse<=0)return;hitPulse=Math.max(0,hitPulse-dt*(hitTeam==='squad'?3.8:6.5));const a=hitPulse;
 ctx.save();if(hitTeam==='squad'){
  const g=ctx.createRadialGradient(w/2,h/2,Math.min(w,h)*.22,w/2,h/2,Math.max(w,h)*.72);g.addColorStop(0,'rgba(120,18,12,0)');g.addColorStop(1,'rgba(120,18,12,'+(.14*a)+')');ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
 }else{ctx.strokeStyle='rgba(255,236,188,'+(.18*a)+')';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(w/2,h/2,8+(1-a)*8,0,Math.PI*2);ctx.stroke()}
 ctx.restore();
}
function frame(now){raf=0;if(lifecycle!=='PLAYING'||doc.hidden||reduce())return;const dt=Math.min(.05,(now-last)/1000||.016);last=now;const w=innerWidth,h=innerHeight;ctx.clearRect(0,0,w,h);drawAtmosphere(w,h,now);drawHit(w,h,dt);raf=requestAnimationFrame(frame)}
doc.addEventListener('visibilitychange',sync);if(doc.readyState==='loading')doc.addEventListener('DOMContentLoaded',ensure,{once:true});else ensure();
root.BadFodderExperience={setState,hit,sync,get mission(){return mission}};
})(window);
