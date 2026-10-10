/* Direct semantic input bindings for gameplay APIs that already have stable ownership. */
(function(root){
 'use strict';
 let installed=false,unbind=[];
 function clickFirst(...ids){for(const id of ids){const el=root.document?.getElementById(id);if(el&&!el.hidden&&!el.disabled){el.click();return true}}return false}
 function install(){
  const bus=root.BadFodderInputActions;if(installed||!bus?.register)return false;installed=true;
  const A=bus.ACTIONS;
  const bind=(action,handler)=>unbind.push(bus.register(action,event=>handler(event)!==false));
  const runtime=(method,event)=>{const handler=root.BadFodderInput?.gameplay?.[method];return typeof handler==='function'?handler.call(root.BadFodderInput.gameplay,event):false};
  bind(A.PRIMARY_ACTION,event=>runtime('primary',event));
  bind(A.AIM_VECTOR,event=>runtime('aim',event));
  bind(A.INTERACT,event=>runtime('interact',event));
  bind(A.SELECT_PREVIOUS,event=>runtime('cycle', {...event,delta:-1}));
  bind(A.SELECT_NEXT,event=>runtime('cycle', {...event,delta:1}));
  bind(A.SELECT_INDEX,event=>runtime('select',event));
  bind(A.GARRISON,()=>{const api=root.BadFodderGarrison;if(!api?.toggleGarrison)return false;api.toggleGarrison();return true});
  bind(A.REGROUP,()=>{const api=root.BadFodderGarrison;if(!api?.regroup)return false;api.regroup();return true});
  bind(A.FOLLOW,()=>clickFirst('companionFOLLOW'));
  bind(A.HOLD,()=>clickFirst('companionHOLD'));
  bind(A.SELECT_ALL,()=>clickFirst('hudAll'));
  bind(A.MAP,()=>clickFirst('touchMap','mapBtn'));
  bind(A.PAUSE,()=>clickFirst('touchPause','pauseBtn'));
  return true;
 }
 function reset(){for(const off of unbind.splice(0))off();installed=false}
 root.BadFodderGameplayInputAdapter={install,reset,get installed(){return installed}};
 if(root.BadFodderInputActions)install();
})(typeof window!=='undefined'?window:globalThis);
