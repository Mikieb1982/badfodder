/* Procedural combat and Cable Street action sound effects: no external SFX assets required. */
(function(){
'use strict';

const KEY='badfodder.sfx.v1';
let enabled=true;
try{
  const saved=localStorage.getItem(KEY);
  if(saved!==null)enabled=saved!=='0';
}catch(_){}

let ctx=null;
let master=null;
let compressor=null;
let noiseBuffer=null;
let lastSquadShot=0;
let lastEnemyShot=0;
let lastScuffle=0;
let lastCrowd=0;
let lastMounted=0;
let lastBarricade=0;

const button=document.getElementById('menuSfx');

function ensureAudio(){
  if(ctx)return ctx;
  const AudioContext=window.AudioContext||window.webkitAudioContext;
  if(!AudioContext)return null;

  ctx=new AudioContext();
  master=ctx.createGain();
  master.gain.value=.32;

  compressor=ctx.createDynamicsCompressor();
  compressor.threshold.value=-18;
  compressor.knee.value=14;
  compressor.ratio.value=8;
  compressor.attack.value=.003;
  compressor.release.value=.18;

  master.connect(compressor);
  compressor.connect(ctx.destination);

  const seconds=2;
  noiseBuffer=ctx.createBuffer(1,ctx.sampleRate*seconds,ctx.sampleRate);
  const data=noiseBuffer.getChannelData(0);
  let last=0;
  for(let i=0;i<data.length;i++){
    const white=Math.random()*2-1;
    last=last*.82+white*.18;
    data[i]=white*.72+last*.28;
  }
  return ctx;
}

async function unlock(){
  const audio=ensureAudio();
  if(!audio)return;
  if(audio.state==='suspended'){
    try{await audio.resume();}catch(_){}
  }
}

function ready(){
  if(!enabled)return null;
  const audio=ensureAudio();
  if(!audio||audio.state!=='running')return null;
  return audio;
}

function gainEnvelope(audio,volume,attack,hold,release){
  const gain=audio.createGain();
  const now=audio.currentTime;
  gain.gain.setValueAtTime(.0001,now);
  gain.gain.exponentialRampToValueAtTime(Math.max(.0001,volume),now+attack);
  gain.gain.setValueAtTime(Math.max(.0001,volume),now+attack+hold);
  gain.gain.exponentialRampToValueAtTime(.0001,now+attack+hold+release);
  gain.connect(master);
  return {gain,now,end:now+attack+hold+release};
}

function noiseBurst({volume=.12,duration=.08,filter='bandpass',frequency=1000,q=.8}={}){
  const audio=ready();if(!audio||!noiseBuffer)return;
  const env=gainEnvelope(audio,volume,.002,Math.max(.001,duration*.25),Math.max(.01,duration*.75));
  const src=audio.createBufferSource();
  src.buffer=noiseBuffer;
  const biquad=audio.createBiquadFilter();
  biquad.type=filter;
  biquad.frequency.setValueAtTime(frequency,env.now);
  biquad.Q.value=q;
  src.connect(biquad);biquad.connect(env.gain);
  const offset=Math.random()*Math.max(0,noiseBuffer.duration-duration-.02);
  src.start(env.now,offset,duration+.04);
  src.stop(env.end+.03);
}

function tone({type='square',from=220,to=90,volume=.08,duration=.07,delay=0}={}){
  const audio=ready();if(!audio)return;
  const gain=audio.createGain();
  const start=audio.currentTime+Math.max(0,delay),end=start+duration;
  gain.gain.setValueAtTime(.0001,start);
  gain.gain.exponentialRampToValueAtTime(Math.max(.0001,volume),start+.002);
  gain.gain.exponentialRampToValueAtTime(.0001,end);
  gain.connect(master);
  const osc=audio.createOscillator();
  osc.type=type;
  osc.frequency.setValueAtTime(Math.max(20,from),start);
  osc.frequency.exponentialRampToValueAtTime(Math.max(20,to),end);
  osc.connect(gain);osc.start(start);osc.stop(end+.02);
}

function shoot(owner='squad'){
  const audio=ready();if(!audio)return;
  const now=performance.now();
  if(owner==='squad'){
    if(now-lastSquadShot<48)return;
    lastSquadShot=now;
  }else{
    if(now-lastEnemyShot<72)return;
    lastEnemyShot=now;
  }

  const player=owner==='squad';
  noiseBurst({volume:player?.16:.095,duration:player?.065:.055,filter:'bandpass',frequency:player?1450:1120,q:.55});
  tone({type:'square',from:player?235:195,to:player?78:68,volume:player?.085:.055,duration:.055});
}

function grenadeThrow(){
  if(!ready())return;
  noiseBurst({volume:.085,duration:.19,filter:'bandpass',frequency:720,q:.45});
  tone({type:'triangle',from:620,to:145,volume:.045,duration:.2});
}

function explosion(){
  const audio=ready();if(!audio)return;
  noiseBurst({volume:.42,duration:.58,filter:'lowpass',frequency:760,q:.25});
  noiseBurst({volume:.16,duration:.22,filter:'bandpass',frequency:1700,q:.35});
  tone({type:'sine',from:105,to:34,volume:.3,duration:.46});
}

function death(team='enemy'){
  if(!ready())return;
  const squadDeath=team==='squad';
  const variance=.9+Math.random()*.2;
  noiseBurst({volume:squadDeath?.105:.075,duration:.22,filter:'bandpass',frequency:390*variance,q:1.25});
  tone({type:'sawtooth',from:(squadDeath?175:195)*variance,to:(squadDeath?72:88)*variance,volume:squadDeath?.075:.05,duration:.24});
}

// Short, non-firearm impacts for the Cable Street street fighting.
function scuffle(kind='shove'){
  if(!ready())return;
  const now=performance.now();
  if(now-lastScuffle<105)return;
  lastScuffle=now;
  if(kind==='brick'){
    noiseBurst({volume:.11,duration:.055,filter:'bandpass',frequency:1350,q:.7});
    tone({type:'triangle',from:310,to:135,volume:.035,duration:.05});
  }else if(kind==='stick'){
    noiseBurst({volume:.085,duration:.045,filter:'highpass',frequency:1700,q:.6});
    tone({type:'square',from:250,to:115,volume:.03,duration:.045});
  }else{
    noiseBurst({volume:.12,duration:.075,filter:'lowpass',frequency:720,q:.4});
    tone({type:'sine',from:115,to:62,volume:.055,duration:.075});
  }
}

function barricade(kind='build'){
  if(!ready())return;
  const now=performance.now();if(now-lastBarricade<180)return;lastBarricade=now;
  const collapse=kind==='collapse';
  noiseBurst({volume:collapse?.14:.075,duration:collapse?.32:.09,filter:'lowpass',frequency:collapse?650:1500,q:.5});
  tone({type:'triangle',from:collapse?155:370,to:collapse?48:120,volume:.04,duration:collapse?.22:.08});
}

function crowdSurge(){
  if(!ready())return;
  const now=performance.now();
  if(now-lastCrowd<900)return;
  lastCrowd=now;
  noiseBurst({volume:.075,duration:.48,filter:'bandpass',frequency:520,q:.32});
  noiseBurst({volume:.045,duration:.36,filter:'bandpass',frequency:920,q:.45});
  tone({type:'triangle',from:150,to:105,volume:.022,duration:.34});
}

function mountedCharge(){
  if(!ready())return;
  const now=performance.now();
  if(now-lastMounted<1800)return;
  lastMounted=now;
  // Four uneven hoof beats and a low rush. This is deliberately distinct from gunfire.
  noiseBurst({volume:.12,duration:.42,filter:'lowpass',frequency:430,q:.25});
  [0,.105,.245,.35].forEach((delay,i)=>{
    tone({type:'sine',from:92+(i%2)*18,to:46,volume:.075,duration:.075,delay});
  });
}

function render(){
  if(!button)return;
  button.textContent=enabled?'SFX: ON':'SFX: OFF';
  button.setAttribute('aria-pressed',String(enabled));
}

function setEnabled(on){
  enabled=!!on;
  try{localStorage.setItem(KEY,enabled?'1':'0')}catch(_){}
  if(enabled)unlock();
  render();
}

function toggle(){setEnabled(!enabled)}
function arm(event){if(event&&event.target===button)return;unlock()}

addEventListener('pointerdown',arm,{passive:true});
addEventListener('touchstart',arm,{passive:true});
addEventListener('keydown',arm);
if(button)button.addEventListener('click',toggle);

window.BadFodderSfx={
  unlock,shoot,grenadeThrow,explosion,death,
  scuffle,barricade,crowdSurge,mountedCharge,
  toggle,setEnabled,
  get enabled(){return enabled}
};

render();
})();
