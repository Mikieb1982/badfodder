/* Standard Gamepad API support for desktop, Chromebook, Mac and mobile browsers. */
(function(root){
'use strict';
const DEADZONE=.18;
let binding=null,padIndex=-1,previous=[],moving=false,cycleIndex=0,menuAxisX=0,menuAxisY=0,menuNextX=0,menuNextY=0,lastSurface=null;
const held=new Set(),actionHeld=new Set();
const names=()=>root.BadFodderInputActions?.ACTIONS||{};
function bindJoystick(options){binding=options}
function visible(el){return !!el&&!el.hidden&&el.getClientRects?.().length>0}
function activeSurface(){
 const intro=document.getElementById('campaignIntro');if(visible(intro))return intro;
 const menu=document.getElementById('menuScreen');if(visible(menu))return menu;
 const dialogs=[...document.querySelectorAll('[role="dialog"],dialog,[aria-modal="true"]')].filter(visible);return dialogs.at(-1)||null;
}
function menuOpen(){return !!activeSurface()}
function controls(surface=activeSurface()){return surface?[...surface.querySelectorAll('button,select,input,[tabindex]')].filter(el=>!el.disabled&&el.tabIndex!==-1&&!el.closest('[hidden]')&&el.getClientRects().length):[]}
function linearFocus(delta,surface=activeSurface()){const list=controls(surface);if(!list.length)return false;const i=list.indexOf(document.activeElement);list[(i<0?(delta>0?0:list.length-1):(i+delta+list.length)%list.length)].focus({preventScroll:true});return true}
function spatialFocus(dx,dy,surface=activeSurface()){
 const list=controls(surface);if(!list.length)return false;const current=document.activeElement;
 if(!surface?.contains(current)||!list.includes(current))return linearFocus(dy||dx||1,surface);
 const r=current.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;let best=null,bestScore=Infinity;
 for(const el of list){if(el===current)continue;const q=el.getBoundingClientRect(),x=q.left+q.width/2-cx,y=q.top+q.height/2-cy,forward=x*dx+y*dy;if(forward<=2)continue;const cross=Math.abs(x*dy-y*dx),distance=Math.hypot(x,y),score=forward+cross*2.15+distance*.08;if(score<bestScore){bestScore=score;best=el}}
 if(best){best.focus({preventScroll:true});return true}return linearFocus(dy||dx||1,surface);
}
function adjust(delta){const el=document.activeElement;if(el?.tagName==='SELECT'){const n=Math.max(0,Math.min(el.options.length-1,el.selectedIndex+delta));if(n!==el.selectedIndex){el.selectedIndex=n;el.dispatchEvent(new Event('change',{bubbles:true}))}return true}if(el?.tagName==='INPUT'&&el.type==='range'){const step=Number(el.step)||1,min=Number(el.min)||0,max=Number(el.max)||100;el.value=String(Math.max(min,Math.min(max,Number(el.value)+delta*step)));el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));return true}return false}
function key(type,key,code=key,modifiers={}){const surface=activeSurface();let target=document.activeElement;if(surface&&(!target||!surface.contains(target)))target=surface;(target?.dispatchEvent?target:root).dispatchEvent(new KeyboardEvent(type,{key,code,bubbles:true,cancelable:true,...modifiers}))}
function tap(k,c=k,modifiers={}){key('keydown',k,c,modifiers);key('keyup',k,c,modifiers)}
function hold(k,down,c=k){if(down&&!held.has(k)){held.add(k);key('keydown',k,c)}else if(!down&&held.has(k)){held.delete(k);key('keyup',k,c)}}
function semantic(action,phase='press',detail={},fallback=null){
 const bus=root.BadFodderInputActions,known=names()[action]||action;
 if(bus?.dispatch?.(known,phase,{source:'controller',...detail}))return true;
 return fallback?fallback()!==false:false;
}
function semanticHold(action,down,fallback){
 if(down&&!actionHeld.has(action)){actionHeld.add(action);return semantic(action,'press',{},()=>fallback(true))}
 if(!down&&actionHeld.has(action)){actionHeld.delete(action);return semantic(action,'release',{},()=>fallback(false))}
 return false;
}
function click(id){const el=document.getElementById(id);if(el&&!el.hidden&&!el.disabled){el.click();return true}return false}
function notice(text){const el=document.getElementById('hudNotice');if(!el)return;el.textContent=text;el.classList.add('show');setTimeout(()=>el.classList.remove('show'),1600)}
function radial(x,y){const m=Math.min(1,Math.hypot(x,y));if(m<=DEADZONE)return{x:0,y:0,mag:0};const s=(m-DEADZONE)/(1-DEADZONE),f=s/m;return{x:x*f,y:y*f,mag:s}}
function pad(){let pads;try{pads=navigator.getGamepads?.()}catch(_){return null}if(!pads)return null;if(padIndex>=0&&pads[padIndex]?.connected)return pads[padIndex];const found=[...pads].find(Boolean);if(found){padIndex=found.index;previous=[];menuAxisX=menuAxisY=0}return found||null}
function down(gp,i){const b=gp.buttons[i];return !!b&&(b.pressed||b.value>.45)}
function edge(gp,i){const d=down(gp,i),was=!!previous[i];previous[i]=d;return d&&!was}
function applyLegacyMove(v){
 if(!binding)return false;const s=binding.state;
 if(!v.mag){if(!moving)return true;s.moveX=0;s.moveY=0;s.moveMag=0;binding.stick.style.transform='translate(0px,0px)';binding.element.classList.remove('active');try{root.BadFodderCoop?.releaseStick?.()}catch(_){ }moving=false;return true}
 if(!moving)try{root.BadFodderGarrison?.releaseForMovement?.()}catch(_){ }
 moving=true;s.moveX=v.x;s.moveY=v.y;s.moveMag=v.mag;const max=binding.element.getBoundingClientRect().width*.34||38;binding.stick.style.transform=`translate(${v.x*max}px,${v.y*max}px)`;binding.element.classList.add('active');return true;
}
function releaseMove(){if(!moving&&!binding)return;const v={x:0,y:0,mag:0};semantic('MOVE_VECTOR','release',{value:v},()=>applyLegacyMove(v))}
function move(gp){
 if(!binding||binding.state.movePointer!==null||!binding.canMove()){releaseMove();return}
 const v=radial(Number(gp.axes[0])||0,Number(gp.axes[1])||0);if(!v.mag){releaseMove();return}
 semantic('MOVE_VECTOR','change',{value:v},()=>applyLegacyMove(v));
}
function legacyAim(v){const canvas=document.getElementById('game');if(!canvas)return false;const r=canvas.getBoundingClientRect(),radius=Math.min(r.width,r.height)*.42,x=r.left+r.width/2+v.x*radius,y=r.top+r.height/2+v.y*radius;try{canvas.dispatchEvent(new PointerEvent('pointermove',{bubbles:true,pointerType:'mouse',clientX:x,clientY:y}))}catch(_){canvas.dispatchEvent(new MouseEvent('mousemove',{bubbles:true,clientX:x,clientY:y}))}return true}
function aim(gp){const v=radial(Number(gp.axes[2])||0,Number(gp.axes[3])||0);if(!v.mag)return;semantic('AIM_VECTOR','change',{value:v},()=>legacyAim(v))}
function cycle(delta,multi=false){const units=[...document.querySelectorAll('.hud-unit')];const count=units.length||4;for(let i=0;i<count;i++){cycleIndex=(cycleIndex+delta+count)%count;if(!units[cycleIndex]?.disabled){tap(String(cycleIndex+1),'Digit'+(cycleIndex+1),{shiftKey:multi});return true}}return false}
function navigateMenu(dx,dy,surface){if(dx&&adjust(dx))return true;return spatialFocus(dx,dy,surface)}
function menuInput(gp){
 releaseMove();semanticHold('PRIMARY_ACTION',false,down=>hold('f',down,'KeyF'));const surface=activeSurface();if(!surface)return;
 if(surface!==lastSurface){lastSurface=surface;menuAxisX=menuAxisY=0;menuNextX=menuNextY=0;if(!surface.contains(document.activeElement))linearFocus(1,surface)}
 const now=typeof performance!=='undefined'?performance.now():Date.now();
 const y=Number(gp.axes[1])||0,x=Number(gp.axes[0])||0,ay=y>.55?1:y<-.55?-1:0,ax=x>.55?1:x<-.55?-1:0;
 if(ay!==menuAxisY){if(ay)navigateMenu(0,ay,surface);menuNextY=now+330}else if(ay&&now>=menuNextY){navigateMenu(0,ay,surface);menuNextY=now+125}
 if(ax!==menuAxisX){if(ax)navigateMenu(ax,0,surface);menuNextX=now+330}else if(ax&&now>=menuNextX){navigateMenu(ax,0,surface);menuNextX=now+125}
 menuAxisY=ay;menuAxisX=ax;
 if(edge(gp,12))navigateMenu(0,-1,surface);if(edge(gp,13))navigateMenu(0,1,surface);if(edge(gp,14))navigateMenu(-1,0,surface);if(edge(gp,15))navigateMenu(1,0,surface);
 if(edge(gp,0)){const el=document.activeElement;if(surface.contains(el)&&(el?.tagName==='BUTTON'||(el?.tagName==='INPUT'&&['checkbox','radio','button','submit'].includes(el.type))))el.click();else linearFocus(1,surface)}
 if(edge(gp,1)||edge(gp,9)){if(surface.id==='campaignIntro'){const skip=[...surface.querySelectorAll('button')].find(b=>/skip|continue/i.test(b.textContent||''));if(skip)skip.click();else tap('Escape','Escape')}else tap('Escape','Escape')}
}
function gameplayInput(gp){
 move(gp);aim(gp);
 // Controller layout now emits device-independent gameplay actions. Legacy key adapters remain only as a migration fallback.
 semanticHold('PRIMARY_ACTION',down(gp,0)||down(gp,7),down=>hold('f',down,'KeyF'));
 if(edge(gp,1))semantic('SECONDARY_ACTION','press',{},()=>tap('g','KeyG'));
 if(edge(gp,2))semantic('INTERACT','press',{},()=>tap('e','KeyE'));
 if(edge(gp,3))semantic('GARRISON','press',{},()=>tap('h','KeyH'));
 if(edge(gp,5))semantic('SECONDARY_ACTION','press',{},()=>tap('g','KeyG'));
 if(edge(gp,8))semantic('MAP','press',{},()=>click('touchMap')||click('mapBtn'));
 if(edge(gp,9))semantic('PAUSE','press',{},()=>click('touchPause')||click('pauseBtn'));
 if(edge(gp,12))semantic('SELECT_ALL','press',{},()=>tap('a','KeyA'));
 if(edge(gp,13))semantic('REGROUP','press',{},()=>tap('r','KeyR'));
 if(edge(gp,14))semantic('SELECT_PREVIOUS','press',{multi:down(gp,4)},()=>cycle(-1,down(gp,4)));
 if(edge(gp,15))semantic('SELECT_NEXT','press',{multi:down(gp,4)},()=>cycle(1,down(gp,4)));
}
function reset(){releaseMove();semanticHold('PRIMARY_ACTION',false,down=>hold('f',down,'KeyF'));for(const k of [...held])hold(k,false,k==='f'?'KeyF':k);actionHeld.clear();previous=[];menuAxisX=menuAxisY=0;menuNextX=menuNextY=0;lastSurface=null}
function loop(){const gp=pad();if(!gp){reset();requestAnimationFrame(loop);return}if(menuOpen())menuInput(gp);else{lastSurface=null;gameplayInput(gp)}requestAnimationFrame(loop)}
function installLegend(){
 const panel=document.querySelector('[data-view="controls"]');const dl=panel?.querySelector('dl');
 if(dl&&!document.getElementById('controllerControlHelp')){
  const dt=document.createElement('dt');dt.id='controllerControlHelp';dt.textContent='CONTROLLER';
  const dd=document.createElement('dd');dd.textContent='Menus: left stick or D-pad moves between the nearest option · A/Cross: select · B/Circle: back. Gameplay: Left stick: move · Right stick: aim · RT/R2: fire or shove · RB/R1: grenade/throw · A/Cross (bottom): fire · B/Circle (right): grenade · X/Square (left): action · Y/Triangle (top): garrison · D-pad up: all squad · D-pad down: regroup · D-pad left/right: squad selection · LB/L1 + D-pad left/right: add/remove squad member · View/Create: map · Start/Options: pause.';
  dl.append(dt,dd);
 }
 const hint=document.querySelector('#menuScreen .menu-hint');if(hint&&!/CONTROLLER/.test(hint.textContent||''))hint.textContent=(hint.textContent||'')+' · CONTROLLER';
}
function install(){if(!navigator.getGamepads)return;installLegend();root.addEventListener('gamepadconnected',e=>{padIndex=e.gamepad.index;reset();notice('Controller connected: '+(e.gamepad.id||'gamepad'))});root.addEventListener('gamepaddisconnected',e=>{if(e.gamepad.index===padIndex){padIndex=-1;reset();notice('Controller disconnected.')}});root.addEventListener('blur',reset);document.addEventListener('visibilitychange',()=>{if(document.hidden)reset()});requestAnimationFrame(loop)}
root.BadFodderController={bindJoystick,reset,connected:()=>!!pad(),dispatch:semantic};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})(window);
