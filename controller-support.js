/* Standard Gamepad API support for desktop, Chromebook and Mac browsers. */
(function(root){
'use strict';
const DEADZONE=.18;
let binding=null,padIndex=-1,previous=[],moving=false,cycleIndex=0;
const held=new Set();
function bindJoystick(options){binding=options}
function menuOpen(){const el=document.getElementById('menuScreen');return !!el&&!el.hidden}
function controls(){const menu=document.getElementById('menuScreen');return menu?[...menu.querySelectorAll('button,select,input')].filter(el=>!el.disabled&&!el.closest('[hidden]')&&el.getClientRects().length):[]}
function focus(delta){const list=controls();if(!list.length)return;const i=list.indexOf(document.activeElement);list[(i<0?(delta>0?0:list.length-1):(i+delta+list.length)%list.length)].focus({preventScroll:true})}
function adjust(delta){const el=document.activeElement;if(el?.tagName==='SELECT'){const n=Math.max(0,Math.min(el.options.length-1,el.selectedIndex+delta));if(n!==el.selectedIndex){el.selectedIndex=n;el.dispatchEvent(new Event('change',{bubbles:true}))}return true}if(el?.tagName==='INPUT'&&el.type==='range'){const step=Number(el.step)||1,min=Number(el.min)||0,max=Number(el.max)||100;el.value=String(Math.max(min,Math.min(max,Number(el.value)+delta*step)));el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));return true}return false}
function key(type,key,code=key,modifiers={}){const menu=document.getElementById('menuScreen');let target=document.activeElement;if(menuOpen()&&(!target||!menu.contains(target)))target=menu;(target?.dispatchEvent?target:root).dispatchEvent(new KeyboardEvent(type,{key,code,bubbles:true,cancelable:true,...modifiers}))}
function tap(k,c=k,modifiers={}){key('keydown',k,c,modifiers);key('keyup',k,c,modifiers)}
function hold(k,down,c=k){if(down&&!held.has(k)){held.add(k);key('keydown',k,c)}else if(!down&&held.has(k)){held.delete(k);key('keyup',k,c)}}
function click(id){const el=document.getElementById(id);if(el&&!el.hidden&&!el.disabled){el.click();return true}return false}
function notice(text){const el=document.getElementById('hudNotice');if(!el)return;el.textContent=text;el.classList.add('show');setTimeout(()=>el.classList.remove('show'),1600)}
function radial(x,y){const m=Math.min(1,Math.hypot(x,y));if(m<=DEADZONE)return{x:0,y:0,mag:0};const s=(m-DEADZONE)/(1-DEADZONE),f=s/m;return{x:x*f,y:y*f,mag:s}}
function pad(){let pads;try{pads=navigator.getGamepads?.()}catch(_){return null}if(!pads)return null;if(padIndex>=0&&pads[padIndex]?.connected)return pads[padIndex];const found=[...pads].find(Boolean);if(found){padIndex=found.index;previous=[]}return found||null}
function down(gp,i){const b=gp.buttons[i];return !!b&&(b.pressed||b.value>.45)}
function edge(gp,i){const d=down(gp,i),was=!!previous[i];previous[i]=d;return d&&!was}
function releaseMove(){if(!moving||!binding)return;const s=binding.state;s.moveX=0;s.moveY=0;s.moveMag=0;binding.stick.style.transform='translate(0px,0px)';binding.element.classList.remove('active');try{root.BadFodderCoop?.releaseStick?.()}catch(_){ }moving=false}
function move(gp){if(!binding||binding.state.movePointer!==null||!binding.canMove()){releaseMove();return}const v=radial(Number(gp.axes[0])||0,Number(gp.axes[1])||0);if(!v.mag){releaseMove();return}if(!moving)try{root.BadFodderGarrison?.releaseForMovement?.()}catch(_){ }moving=true;binding.state.moveX=v.x;binding.state.moveY=v.y;binding.state.moveMag=v.mag;const max=binding.element.getBoundingClientRect().width*.34||38;binding.stick.style.transform=`translate(${v.x*max}px,${v.y*max}px)`;binding.element.classList.add('active')}
function aim(gp){const v=radial(Number(gp.axes[2])||0,Number(gp.axes[3])||0);if(!v.mag)return;const canvas=document.getElementById('game');if(!canvas)return;const r=canvas.getBoundingClientRect(),radius=Math.min(r.width,r.height)*.42,x=r.left+r.width/2+v.x*radius,y=r.top+r.height/2+v.y*radius;try{canvas.dispatchEvent(new PointerEvent('pointermove',{bubbles:true,pointerType:'mouse',clientX:x,clientY:y}))}catch(_){canvas.dispatchEvent(new MouseEvent('mousemove',{bubbles:true,clientX:x,clientY:y}))}}
function cycle(delta,multi=false){const units=[...document.querySelectorAll('.hud-unit')];const count=units.length||4;for(let i=0;i<count;i++){cycleIndex=(cycleIndex+delta+count)%count;if(!units[cycleIndex]?.disabled){tap(String(cycleIndex+1),'Digit'+(cycleIndex+1),{shiftKey:multi});return}}}
function menuInput(gp){releaseMove();hold('f',false,'KeyF');if(edge(gp,12))focus(-1);if(edge(gp,13))focus(1);if(edge(gp,14)){if(!adjust(-1))focus(-1)}if(edge(gp,15)){if(!adjust(1))focus(1)}if(edge(gp,0)){const el=document.activeElement;if(el?.tagName==='BUTTON'||(el?.tagName==='INPUT'&&el.type==='checkbox'))el.click();else focus(1)}if(edge(gp,1)||edge(gp,9))tap('Escape','Escape')}
function gameplayInput(gp){
  move(gp);aim(gp);
  // Standard gamepad face buttons follow the on-screen action diamond:
  // bottom A/Cross = FIRE, right B/Circle = GRENADE,
  // left X/Square = ACTION, top Y/Triangle = GARRISON.
  hold('f',down(gp,0)||down(gp,7),'KeyF');
  if(edge(gp,1))tap('g','KeyG');
  if(edge(gp,2))tap('e','KeyE');
  if(edge(gp,3))tap('h','KeyH');
  if(edge(gp,5))tap('g','KeyG');
  if(edge(gp,8))click('touchMap')||click('mapBtn');
  if(edge(gp,9))click('touchPause')||click('pauseBtn');
  if(edge(gp,12))tap('a','KeyA');
  if(edge(gp,13))tap('r','KeyR');
  if(edge(gp,14))cycle(-1,down(gp,4));
  if(edge(gp,15))cycle(1,down(gp,4));
}
function reset(){releaseMove();for(const k of [...held])hold(k,false,k==='f'?'KeyF':k);previous=[]}
function loop(){const gp=pad();if(!gp){reset();requestAnimationFrame(loop);return}if(menuOpen())menuInput(gp);else gameplayInput(gp);requestAnimationFrame(loop)}
function installLegend(){
 const panel=document.querySelector('[data-view="controls"]');const dl=panel?.querySelector('dl');
 if(dl&&!document.getElementById('controllerControlHelp')){
  const dt=document.createElement('dt');dt.id='controllerControlHelp';dt.textContent='CONTROLLER';
  const dd=document.createElement('dd');dd.textContent='Left stick: move · Right stick: aim · RT/R2: fire or shove · RB/R1: grenade/throw · A/Cross (bottom): fire · B/Circle (right): grenade · X/Square (left): action · Y/Triangle (top): garrison · D-pad up: all squad · D-pad down: regroup · D-pad left/right: squad selection · LB/L1 + D-pad left/right: add/remove squad member · View/Create: map · Start/Options: pause.';
  dl.append(dt,dd);
 }
 const hint=document.querySelector('#menuScreen .menu-hint');if(hint&&!/CONTROLLER/.test(hint.textContent||''))hint.textContent=(hint.textContent||'')+' · CONTROLLER';
}
function install(){if(!navigator.getGamepads)return;installLegend();root.addEventListener('gamepadconnected',e=>{padIndex=e.gamepad.index;previous=[];notice('Controller connected: '+(e.gamepad.id||'gamepad'))});root.addEventListener('gamepaddisconnected',e=>{if(e.gamepad.index===padIndex){padIndex=-1;reset();notice('Controller disconnected.')}});root.addEventListener('blur',reset);document.addEventListener('visibilitychange',()=>{if(document.hidden)reset()});requestAnimationFrame(loop)}
root.BadFodderController={bindJoystick,reset,connected:()=>!!pad()};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})(window);
