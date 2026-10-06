/* Pure Web Audio combat synthesis using a shared AudioContext. */
(function(root,factory){
  const api=factory(root||{});
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.BadFodderProceduralSfx=api;
})(typeof window!=='undefined'?window:globalThis,function(root){
  'use strict';
  let ctx=null,master=null,white=null,pink=null,ready=false,distortionCurve=null;
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,Number(n)||0));
  function buildNoise(seconds=2){
    const length=Math.max(1,Math.floor(ctx.sampleRate*seconds)),w=ctx.createBuffer(1,length,ctx.sampleRate),p=ctx.createBuffer(1,length,ctx.sampleRate),wd=w.getChannelData(0),pd=p.getChannelData(0);let b0=0,b1=0,b2=0,b3=0,b4=0,b5=0,b6=0;
    for(let i=0;i<length;i++){const x=Math.random()*2-1;wd[i]=x;b0=.99886*b0+x*.0555179;b1=.99332*b1+x*.0750759;b2=.969*b2+x*.153852;b3=.8665*b3+x*.3104856;b4=.55*b4+x*.5329522;b5=-.7616*b5-x*.016898;b6=x*.115926;pd[i]=(b0+b1+b2+b3+b4+b5+b6+x*.5362)*.11}white=w;pink=p}
  function init(audioContext){
    if(!audioContext||typeof audioContext.createGain!=='function')return false;if(ctx===audioContext&&ready)return true;ctx=audioContext;master=ctx.createGain();master.gain.value=.72;master.connect(ctx.destination);buildNoise();distortionCurve=new Float32Array(256);for(let i=0;i<distortionCurve.length;i++){const v=i/(distortionCurve.length-1)*2-1;distortionCurve[i]=Math.tanh(v*3.2)}ready=true;return true;
  }
  function spatial(x,y,lx,ly,volume=1){
    const dx=(Number(x)||0)-(Number(lx)||0),dy=(Number(y)||0)-(Number(ly)||0),distance=Math.hypot(dx,dy),gain=ctx.createGain();gain.gain.value=clamp(volume/(1+distance/260),0,.9);let tail=gain;
    if(typeof ctx.createStereoPanner==='function'){const pan=ctx.createStereoPanner();pan.pan.value=clamp(dx/220,-1,1);gain.connect(pan);pan.connect(master);tail=pan}else gain.connect(master);return{input:gain,tail,distance}
  }
  function envelope(gain,start,attack,release,peak){gain.gain.cancelScheduledValues(start);gain.gain.setValueAtTime(.0001,start);gain.gain.exponentialRampToValueAtTime(Math.max(.0001,peak),start+Math.max(.001,attack));gain.gain.exponentialRampToValueAtTime(.0001,start+attack+release)}
  function noiseLayer(buffer,start,duration,filterType,f1,f2,q,destination,volume){const src=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain();src.buffer=buffer;filter.type=filterType;filter.frequency.setValueAtTime(Math.max(20,f1),start);if(f2)filter.frequency.exponentialRampToValueAtTime(Math.max(20,f2),start+duration);filter.Q.value=q||.7;envelope(gain,start,.002,duration,volume);src.connect(filter);filter.connect(gain);gain.connect(destination);src.start(start,Math.random()*Math.max(.01,buffer.duration-duration-.01),Math.min(duration+.03,buffer.duration));src.stop(start+duration+.04)}
  function tone(start,duration,type,f1,f2,destination,volume){const osc=ctx.createOscillator(),gain=ctx.createGain();osc.type=type;osc.frequency.setValueAtTime(Math.max(20,f1),start);osc.frequency.exponentialRampToValueAtTime(Math.max(20,f2),start+duration);envelope(gain,start,.002,duration,volume);osc.connect(gain);gain.connect(destination);osc.start(start);osc.stop(start+duration+.03)}
  function canPlay(){return ready&&ctx&&ctx.state==='running'}
  function playGunshot(x=0,y=0,listenerX=0,listenerY=0){if(!canPlay())return false;const t=ctx.currentTime,s=spatial(x,y,listenerX,listenerY,.9);noiseLayer(white,t,.04,'lowpass',5200,1200,.7,s.input,.7);tone(t,.07,'sine',80,30,s.input,.42);return true}
  function playRicochet(x=0,y=0,listenerX=0,listenerY=0){if(!canPlay())return false;const t=ctx.currentTime,s=spatial(x,y,listenerX,listenerY,.42);noiseLayer(white,t,.16,'bandpass',3200,900,18,s.input,.45);return true}
  function playExplosion(x=0,y=0,listenerX=0,listenerY=0){if(!canPlay())return false;const t=ctx.currentTime,s=spatial(x,y,listenerX,listenerY,1),drive=ctx.createWaveShaper();drive.curve=distortionCurve;drive.oversample='2x';drive.connect(s.input);tone(t,.46,'sine',50,28,drive,.75);noiseLayer(pink,t,.48,'lowpass',1800,240,.5,s.input,.8);noiseLayer(pink,t+.18,1.02,'lowpass',900,120,.35,s.input,.34);return true}
  function playFootstep(surfaceType='cobbles'){if(!canPlay())return false;const t=ctx.currentTime,g=ctx.createGain(),pitch=.88+Math.random()*.24,f={mud:260,gravel:650,cobbles:420}[surfaceType]||400;g.gain.value=.32;g.connect(master);noiseLayer(surfaceType==='mud'?pink:white,t,.055,'bandpass',f*pitch,f*.82*pitch,1.1,g,.22);return true}
  function playHit(isFlesh=true,isArmour=false){if(!canPlay())return false;const t=ctx.currentTime,g=ctx.createGain();g.gain.value=.3;g.connect(master);noiseLayer(isFlesh?pink:white,t,.07,'bandpass',isArmour?1600:520,isArmour?900:300,isArmour?5:1.3,g,isArmour?.38:.25);if(isArmour)tone(t,.05,'triangle',980,420,g,.12);return true}
  function playSoldierDown(){if(!canPlay())return false;const t=ctx.currentTime,g=ctx.createGain(),f1=ctx.createBiquadFilter(),f2=ctx.createBiquadFilter(),source=ctx.createOscillator(),voice=ctx.createGain();g.gain.value=.36;g.connect(master);source.type='sawtooth';source.frequency.setValueAtTime(190,t);source.frequency.exponentialRampToValueAtTime(82,t+.42);f1.type='bandpass';f1.frequency.value=650;f1.Q.value=8;f2.type='bandpass';f2.frequency.value=1200;f2.Q.value=10;envelope(voice,t,.015,.46,.24);source.connect(f1);source.connect(f2);f1.connect(voice);f2.connect(voice);voice.connect(g);source.start(t);source.stop(t+.5);return true}
  function patchSfx(sfx){
    if(!sfx||sfx.__proceduralSfxPatched)return false;
    const context=()=>sfx.audioContext||sfx.context?.();
    for(const [name,fn] of [['shoot',playGunshot],['explosion',playExplosion],['death',playSoldierDown]])if(typeof sfx[name]==='function'){const original=sfx[name];sfx[name]=function(){const c=context();if(c)init(c);if(canPlay()){fn(0,0,0,0);return}return original.apply(this,arguments)}}
    sfx.__proceduralSfxPatched=true;return true;
  }
  function chainProperty(name,patch){const d=Object.getOwnPropertyDescriptor(root,name);if(d&&!d.configurable){patch(root[name]);return}if(d&&(d.get||d.set)){const g=d.get,s=d.set;Object.defineProperty(root,name,{configurable:true,enumerable:d.enumerable!==false,get(){return g?g.call(root):undefined},set(v){s?.call(root,v);patch(g?g.call(root):v)}});patch(g?g.call(root):undefined);return}let value=d&&'value'in d?d.value:root[name];Object.defineProperty(root,name,{configurable:true,enumerable:true,get(){return value},set(v){value=v;patch(v)}});patch(value)}
  chainProperty('BadFodderSfx',patchSfx);if(root.document)root.document.addEventListener('DOMContentLoaded',()=>patchSfx(root.BadFodderSfx),{once:true});
  return{init,playGunshot,playExplosion,playRicochet,playFootstep,playHit,playSoldierDown,get ready(){return canPlay()}};
});
