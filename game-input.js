// @ts-check
/* Analogue pointer input, independent of mission and renderer state. */
(function(root){
 'use strict';
 /** @param {{element:HTMLElement,stick:HTMLElement,state:{movePointer:number|null,moveX:number,moveY:number,moveMag:number},canMove:()=>boolean,release:()=>void}} options */
 function joystick({element,stick,state,canMove,release}){
  function update(evt){const r=element.getBoundingClientRect(),max=r.width*.34;if(!max)return;let dx=evt.clientX-r.left-r.width/2,dy=evt.clientY-r.top-r.height/2;const d=Math.hypot(dx,dy);if(d>max){dx=dx/d*max;dy=dy/d*max}state.moveX=dx/max;state.moveY=dy/max;state.moveMag=Math.min(1,Math.hypot(state.moveX,state.moveY));stick.style.transform='translate('+dx+'px,'+dy+'px)';}
  element.addEventListener('pointerdown',evt=>{if(state.movePointer!==null||!canMove())return;evt.preventDefault();evt.stopPropagation();state.movePointer=evt.pointerId;try{element.setPointerCapture?.(evt.pointerId)}catch{}element.classList.add('active');update(evt);});
  element.addEventListener('pointermove',evt=>{if(evt.pointerId!==state.movePointer)return;if(evt.cancelable)evt.preventDefault();evt.stopPropagation();update(evt);});
  function end(evt){if(evt.pointerId!==state.movePointer)return;if(evt.cancelable)evt.preventDefault();evt.stopPropagation();release();}
  for(const type of ['pointerup','pointercancel','lostpointercapture'])element.addEventListener(type,end);
 }
 root.BadFodderInput={joystick};
})(window);
