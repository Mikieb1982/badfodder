/* Reactive voice and dialogue director for If I Can Shoot Rabbits. */
(function(root,factory){
  const api=factory(root||{});
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.BadFodderVoices=api;
})(typeof window!=='undefined'?window:globalThis,function(root){
  'use strict';

  const STORAGE_KEY='badfodder.voices.enabled.v1';
  const VOLUME_KEY='badfodder.voices.volume.v1';
  const BASE='audio/voices';
  const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,Number(n)||0));
  const slug=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
  const now=()=>typeof performance!=='undefined'&&performance.now?performance.now():Date.now();

  const SQUAD_BANKS=[
    {move:'Right. Moving.',garrison:'Holding here.',release:'Moving out.',contact:'Contact!',underFire:'Taking fire!',noRoute:"Can't get through.",clear:'Area clear.',casualty:'One of ours is down!'},
    {move:'On my way.',garrison:"I'll hold this position.",release:'Leaving position.',contact:'Enemy spotted!',underFire:"I'm taking fire!",noRoute:"Route's blocked.",clear:'Looks clear.',casualty:"We've lost one!"},
    {move:'Got it.',garrison:"I'll cover this.",release:'Coming out.',contact:'Movement ahead!',underFire:'Under fire!',noRoute:"I can't reach it.",clear:'All clear.',casualty:"Someone's down!"},
    {move:'Moving now.',garrison:'Position secured.',release:'Moving with you.',contact:'Trouble ahead!',underFire:"They're firing on me!",noRoute:'No way through.',clear:"It's clear.",casualty:"We've got a casualty!"}
  ];
  const EVENT_FILE={move:'move',garrison:'garrison',release:'release',contact:'contact',underFire:'under-fire',noRoute:'no-route',clear:'clear',casualty:'casualty'};
  const ENEMY_FILE={spotted:'spotted',hold:'hold',pressure:'pressure',flankLeft:'flank-left',flankRight:'flank-right',reinforce:'reinforce',regroup:'regroup',retreat:'retreat',ambush:'ambush',defend:'defend',patrol:'patrol'};

  const ENEMY_GERMAN={
    spotted:{spoken:'Feind gesichtet!',caption:'Enemy spotted!',lang:'de-DE'},
    hold:{spoken:'Stellung halten!',caption:'Hold this position!',lang:'de-DE'},
    pressure:{spoken:'Vorwärts!',caption:'Push forward!',lang:'de-DE'},
    flankLeft:{spoken:'Links herum!',caption:'Flank left!',lang:'de-DE'},
    flankRight:{spoken:'Rechts herum!',caption:'Flank right!',lang:'de-DE'},
    reinforce:{spoken:'Verstärkung nach vorn!',caption:'Reinforcements forward!',lang:'de-DE'},
    regroup:{spoken:'Sammeln!',caption:'Regroup!',lang:'de-DE'},
    retreat:{spoken:'Zurück!',caption:'Fall back!',lang:'de-DE'},
    ambush:{spoken:'In Deckung. Warten!',caption:'Take cover. Wait!',lang:'de-DE'},
    defend:{spoken:'Stellung verteidigen!',caption:'Defend the position!',lang:'de-DE'},
    patrol:{spoken:'Straße absuchen!',caption:'Search the street!',lang:'de-DE'}
  };
  const ENEMY_CABLE={
    spotted:{spoken:'There they are!',caption:'There they are!',lang:'en-GB'},
    hold:{spoken:'Hold the line!',caption:'Hold the line!',lang:'en-GB'},
    pressure:{spoken:'Move forward!',caption:'Move forward!',lang:'en-GB'},
    flankLeft:{spoken:'Take the left side!',caption:'Take the left side!',lang:'en-GB'},
    flankRight:{spoken:'Take the right side!',caption:'Take the right side!',lang:'en-GB'},
    reinforce:{spoken:'More men forward!',caption:'More men forward!',lang:'en-GB'},
    regroup:{spoken:'Regroup!',caption:'Regroup!',lang:'en-GB'},
    retreat:{spoken:'Fall back!',caption:'Fall back!',lang:'en-GB'},
    ambush:{spoken:'Wait for the signal!',caption:'Wait for the signal!',lang:'en-GB'},
    defend:{spoken:'Keep this route open!',caption:'Keep this route open!',lang:'en-GB'},
    patrol:{spoken:'Check the side streets!',caption:'Check the side streets!',lang:'en-GB'}
  };

  const actionEvent=action=>({
    HOLD:'hold',PROBE:'pressure',PRESSURE:'pressure',MAJOR_PUSH:'pressure',
    FLANK_LEFT:'flankLeft',FLANK_RIGHT:'flankRight',REINFORCE:'reinforce',
    REGROUP:'regroup',RETREAT:'retreat',AMBUSH:'ambush',CHANGE_APPROACH:'flankLeft',
    DEFEND_OBJECTIVE:'defend',PATROL:'patrol',
    PRESSURE_MAIN:'pressure',PRESSURE_SIDE:'flankRight',PROBE_DEFENCE:'patrol',
    DELAY_PRESSURE:'hold',ESCALATE_PRESSURE:'pressure',SWITCH_PRESSURE:'flankLeft',
    MOUNTED_PRESSURE:'pressure',RECOVERY_WINDOW:'retreat'
  })[action]||null;

  const normalizeMission=key=>{
    key=String(key||'').toLowerCase();
    if(key.includes('cable'))return'cable-street';
    if(key.includes('wigan'))return'wigan';
    return'belzig';
  };
  const missionFromDom=()=>{
    if(!root.document)return'belzig';
    const text=((root.document.querySelector('.subtitle')?.textContent||'')+' '+(root.document.getElementById('hudCampaign')?.textContent||'')).toLowerCase();
    return normalizeMission(text);
  };

  let enabled=true,volume=.8;
  try{
    const v=root.BadFodderStorage?.local?.getItem(STORAGE_KEY);
    if(v!==null&&v!==undefined)enabled=v!=='0';
    const n=Number(root.BadFodderStorage?.local?.getItem(VOLUME_KEY));
    if(Number.isFinite(n))volume=clamp(n);
  }catch(_){}

  const runtime={getSquad:null,getEnemies:null,cableController:null,missionKey:null};
  let queue=[],current=null,currentBriefing=null,captionEl=null,lastNoRoute=0,combatSeenAt=0,clearSpokenAt=0;
  const missing=new Set(),lastEvent=new Map(),previousEnemyAlert=new WeakMap(),previousSquad=new WeakMap();
  const teamCooldown={squad:1150,enemy:2600,narrator:0},lastTeam={squad:0,enemy:0,narrator:0};

  function missionKey(){return normalizeMission(runtime.missionKey||missionFromDom())}
  function saveSettings(){
    try{
      root.BadFodderStorage?.local?.setItem(STORAGE_KEY,enabled?'1':'0');
      root.BadFodderStorage?.local?.setItem(VOLUME_KEY,String(volume));
    }catch(_){}
  }
  function setEnabled(value){
    enabled=!!value;saveSettings();syncUi();
    if(!enabled)stopAll();
    return enabled;
  }
  function setVolume(value){volume=clamp(value);saveSettings();syncUi();return volume}

  function squadList(){try{return runtime.getSquad?.()||[]}catch(_){return[]}}
  function enemyList(){try{return runtime.getEnemies?.()||[]}catch(_){return[]}}
  function livingSquad(){return squadList().filter(s=>s?.alive)}
  function selectedSquad(){
    const squad=livingSquad(),selected=squad.filter(s=>s.selected);
    return selected.length?selected:squad;
  }
  function listenerPosition(){
    const squad=livingSquad();if(!squad.length)return null;
    return{x:squad.reduce((n,s)=>n+s.x,0)/squad.length,y:squad.reduce((n,s)=>n+s.y,0)/squad.length};
  }
  function positionalGain(speaker){
    if(!speaker||!Number.isFinite(speaker.x)||!Number.isFinite(speaker.y))return 1;
    const p=listenerPosition();if(!p)return 1;
    const d=Math.hypot(speaker.x-p.x,speaker.y-p.y);
    return clamp(1-d/1100,.16,1);
  }
  function slotFor(unit){
    const squad=squadList(),i=Math.max(0,squad.indexOf(unit));
    return i%4;
  }
  function squadRequest(event,unit,priority=45){
    const slot=slotFor(unit),bank=SQUAD_BANKS[slot],text=bank[event];if(!text)return null;
    return{team:'squad',event,priority,speaker:unit,text,caption:text,lang:'en-GB',
      url:`${BASE}/squad/voice-${slot+1}/${EVENT_FILE[event]}.mp3`,voiceSlot:slot};
  }
  function enemyRequest(event,speaker,priority=55){
    const key=missionKey(),bank=key==='cable-street'?ENEMY_CABLE:ENEMY_GERMAN,line=bank[event];if(!line)return null;
    return{team:'enemy',event,priority,speaker,text:line.spoken,caption:line.caption,lang:line.lang,
      url:`${BASE}/enemy/${key}/${ENEMY_FILE[event]||slug(event)}.mp3`,voiceSlot:1};
  }
  function briefingText(identity){
    if(!identity)return'';
    const objectives=(identity.objectives||[]).length?' Objectives: '+identity.objectives.join('. ')+'.':'';
    const final=(identity.final||[]).length?' '+identity.final.join(' '):'';
    return `${identity.title}. ${identity.location}, ${identity.year}. ${(identity.background||[]).join(' ')} Your mission: ${identity.mission||''}.${objectives}${final}`.replace(/\s+/g,' ').trim();
  }
  function briefingRequest(identity){
    const key=normalizeMission(identity?.key),text=briefingText(identity);if(!text)return null;
    return{team:'narrator',event:'briefing',priority:1000,text,caption:'Mission briefing',lang:'en-GB',
      url:`${BASE}/briefings/${key}.mp3`,voiceSlot:0,identity};
  }

  function showCaption(req){
    if(req?.team==='narrator')return;
    if(!root.document||!req?.caption)return;
    if(!captionEl){
      captionEl=root.document.createElement('div');
      captionEl.id='voiceCaption';captionEl.setAttribute('aria-live','polite');
      captionEl.style.cssText='position:absolute;left:50%;bottom:86px;transform:translateX(-50%);z-index:35;max-width:min(82vw,720px);padding:7px 12px;border-radius:7px;background:rgba(10,14,18,.82);color:#f5f0dd;font:700 12px/1.35 system-ui,sans-serif;letter-spacing:.02em;text-align:center;pointer-events:none;opacity:0;transition:opacity .12s';
      (root.document.querySelector('.viewport')||root.document.body).appendChild(captionEl);
    }
    const label=req.team==='enemy'?'ENEMY':req.team==='squad'?(req.speaker?.name||'SQUAD'):'BRIEFING';
    captionEl.textContent=label+': '+req.caption;captionEl.style.opacity='1';
  }
  function hideCaption(){if(captionEl)captionEl.style.opacity='0'}

  function finishCurrent(){
    current=null;hideCaption();
    setTimeout(pump,90);
  }
  function playRecorded(req){
    // Until recorded character banks are supplied, gameplay dialogue is caption-only.
    // The three mission briefing MP3s are the only speech that should play.
    if(req.team!=='narrator'){
      setTimeout(finishCurrent,1400);
      return;
    }
    const available=root.BadFodderAvailableAudio;
    if(Array.isArray(available)&&req.url&&req.url.startsWith(BASE+'/')&&!available.includes(req.url)){finishCurrent();return}
    if(!root.Audio||!req.url||missing.has(req.url)){finishCurrent();return}
    let audio;
    try{audio=new root.Audio(req.url)}catch(_){missing.add(req.url);finishCurrent();return}
    current.audio=audio;audio.preload='auto';audio.volume=clamp(volume*positionalGain(req.speaker));
    let failed=false;
    const fail=()=>{if(failed)return;failed=true;missing.add(req.url);try{audio.pause()}catch(_){};finishCurrent()};
    audio.addEventListener?.('ended',finishCurrent,{once:true});audio.addEventListener?.('error',fail,{once:true});
    try{
      const p=audio.play();
      if(p&&typeof p.catch==='function')p.catch(fail);
    }catch(_){fail()}
  }
  function pump(){
    if(current||!enabled||!queue.length)return;
    const req=queue.shift(),t=now(),cool=teamCooldown[req.team]||0;
    if(req.team!=='narrator'&&t-lastTeam[req.team]<cool){setTimeout(pump,Math.max(80,cool-(t-lastTeam[req.team])));return}
    current={req};lastTeam[req.team]=t;showCaption(req);playRecorded(req);
  }
  function enqueue(req){
    if(!enabled||!req)return false;
    const key=req.team+':'+req.event+':'+(req.speaker?.name||'');
    const t=now(),repeat=req.event==='underFire'?5000:req.event==='spotted'||req.event==='contact'?7000:2600;
    if(req.team!=='narrator'&&t-(lastEvent.get(key)||0)<repeat)return false;
    lastEvent.set(key,t;
    if(req.team==='narrator'){stopAll(false);queue=[req];pump();return true}
    if(current?.req?.team==='narrator')return false;
    queue.push(req);queue.sort((a,b)=>b.priority-a.priority);if(queue.length>8)queue.length=8;pump();return true;
  }
  function stopAll(clearBriefing=true){
    queue=[];
    if(current?.audio){try{current.audio.pause();current.audio.currentTime=0}catch(_){}}
    try{root.speechSynthesis?.cancel?.()}catch(_){}
    current=null;hideCaption();
    if(clearBriefing)currentBriefing=null;
  }

  function speakSquad(event,units=null,priority){
    const list=(units&&units.length?units:selectedSquad()).filter(Boolean);if(!list.length)return false;
    return enqueue(squadRequest(event,list[0],priority));
  }
  function enemyChatter(event,speaker=null,priority){
    if(!speaker){
      const enemies=enemyList().filter(e=>e?.alive);
      const p=listenerPosition();
      speaker=enemies.sort((a,b)=>p?(Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(b.x-p.x,b.y-p.y)):0)[0]||null;
    }
    return enqueue(enemyRequest(event,speaker,priority));
  }
  function enemyOrder(action,speaker=null){
    const event=actionEvent(action);if(!event)return false;
    return enemyChatter(event,speaker,60);
  }
  function narrateBriefing(identity){
    currentBriefing=identity;runtime.missionKey=identity?.key||runtime.missionKey;
    return enqueue(briefingRequest(identity));
  }
  function replayBriefing(){if(currentBriefing)return narrateBriefing(currentBriefing);return false}
  function stopNarration(){if(current?.req?.team==='narrator'||queue.some(q=>q.team==='narrator'))stopAll(false)}

  function patchMenu(){
    const proto=root.BadFodderMenu?.prototype;if(!proto||proto.__voicesPatched)return false;
    const show=proto.showBriefing,leave=proto.leaveBriefing,close=proto.close;
    proto.showBriefing=function(identity,...args){const result=show.call(this,identity,...args);narrateBriefing(identity);return result};
    proto.leaveBriefing=function(...args){stopNarration();currentBriefing=null;return leave.apply(this,args)};
    proto.close=function(...args){stopNarration();return close.apply(this,args)};
    proto.__voicesPatched=true;return true;
  }
  function patchGarrison(){
    const g=root.BadFodderGarrison;if(!g||g.__voicesPatched)return false;
    const toggle=g.toggleGarrison;
    g.toggleGarrison=function(chosen=null){
      const unit=chosen||g.selectedOne?.(),before=!!unit?.manualGarrison;
      const result=toggle.call(this,chosen);
      if(unit&&!before&&unit.manualGarrison)speakSquad('garrison',[unit],65);
      else if(unit&&before&&!unit.manualGarrison)speakSquad('release',[unit],55);
      return result;
    };
    g.__voicesPatched=true;return true;
  }
  function patchAdaptive(){
    const a=root.BadFodderAdaptive;if(!a||a.__voicesPatched)return false;
    const createCommander=a.createCommander;
    if(typeof createCommander==='function')a.createCommander=function(options={}){
      runtime.getSquad=options.getSquad||runtime.getSquad;runtime.getEnemies=options.getEnemies||runtime.getEnemies;
      const commander=createCommander.call(this,options),execute=commander?.execute;
      if(typeof execute==='function')commander.execute=function(action,s,time){
        const result=execute.call(this,action,s,time);
        if(result!==false&&action!=='DO_NOTHING')enemyOrder(action);
        return result;
      };
      return commander;
    };
    const createCable=a.createCableAdapter;
    if(typeof createCable==='function')a.createCableAdapter=function(options={}){
      runtime.cableController=options.controller||runtime.cableController;runtime.missionKey='cable-street';
      const adapter=createCable.call(this,options),execute=adapter?.execute;
      if(typeof execute==='function')adapter.execute=function(action,s,time){
        const result=execute.call(this,action,s,time);
        if(result!==false&&action!=='DO_NOTHING')enemyOrder(action);
        return result;
      };
      return adapter;
    };
    a.__voicesPatched=true;return true;
  }

  function monitorRuntime(){
    const t=now(),squad=squadList(),enemies=enemyList();
    let combat=false;
    for(const e of enemies){
      if(!e)continue;
      const prev=previousEnemyAlert.get(e)||false,alert=!!e.alive&&!!e.alert;
      if(alert&&!prev){enemyChatter('spotted',e,78);speakSquad('contact',null,68)}
      previousEnemyAlert.set(e,alert);
      if(alert||e.fireTimer>0)combat=true;
    }
    for(const s of squad){
      if(!s)continue;
      const prev=previousSquad.get(s)||{alive:!!s.alive,hp:Number(s.hp)||0};
      if(prev.alive&&!s.alive){
        const witness=livingSquad().filter(x=>x!==s).sort((a,b)=>Math.hypot(a.x-s.x,a.y-s.y)-Math.hypot(b.x-s.x,b.y-s.y))[0];
        if(witness)speakSquad('casualty',[witness],95);
      }else if(s.alive&&Number(s.hp)<prev.hp)speakSquad('underFire',[s],88);
      previousSquad.set(s,{alive:!!s.alive,hp:Number(s.hp)||0});
    }
    if(combat){combatSeenAt=t;clearSpokenAt=0}
    else if(combatSeenAt&&t-combatSeenAt>5500&&!clearSpokenAt){clearSpokenAt=t;speakSquad('clear',null,36)}
  }

  function installInputHooks(){
    if(!root.document||root.__badFodderVoiceInput)return;root.__badFodderVoiceInput=true;
    root.document.addEventListener('pointerdown',e=>{
      const target=e.target;
      if(target?.id==='briefingBegin'||target?.id==='briefingBack')stopNarration();
      if(target?.closest?.('#touchJoystick')){speakSquad('move',null,42);return}
      if((target?.id==='game'||target?.tagName?.toLowerCase()==='canvas')&&e.button===0){
        const before=selectedSquad().map(s=>({s,path:s.path,target:s.target,x:s.x,y:s.y}));
        setTimeout(()=>{
          if(now()-lastNoRoute<350)return;
          const moved=before.filter(r=>r.s?.alive&&(r.s.path!==r.path||r.s.target!==r.target||Math.hypot(r.s.x-r.x,r.s.y-r.y)>1)).map(r=>r.s);
          if(moved.length)speakSquad('move',moved,42);
        },120);
      }
    },false);
    const status=root.document.getElementById('status');
    if(status&&root.MutationObserver)new root.MutationObserver(()=>{
      if(/no clear route/i.test(status.textContent||'')){lastNoRoute=now();speakSquad('noRoute',null,70)}
    }).observe(status,{childList:true,characterData:true,subtree:true});
  }

  function injectUi(){
    if(!root.document)return;
    const briefing=root.document.querySelector('.briefing-actions');
    if(briefing&&!root.document.getElementById('briefingReplayVoice')){
      const replay=root.document.createElement('button');replay.id='briefingReplayVoice';replay.className='menu-button';replay.type='button';replay.textContent='REPLAY NARRATION';replay.addEventListener('click',replayBriefing);
      const skip=root.document.createElement('button');skip.id='briefingStopVoice';skip.className='menu-button';skip.type='button';skip.textContent='SKIP NARRATION';skip.addEventListener('click',stopNarration);
      briefing.append(replay,skip);
    }
    const options=root.document.querySelector('[data-view="options"]');
    if(options&&!root.document.getElementById('menuVoices')){
      const back=options.querySelector('[data-back]'),toggle=root.document.createElement('button');
      toggle.id='menuVoices';toggle.className='menu-button';toggle.type='button';toggle.addEventListener('click',()=>setEnabled(!enabled));
      const label=root.document.createElement('label');label.className='menu-setting menu-volume';label.htmlFor='menuVoiceVolume';
      label.innerHTML='<span>VOICE VOLUME</span><span class="menu-range-control"><input id="menuVoiceVolume" type="range" min="0" max="100" step="1"><output id="menuVoiceVolumeValue" for="menuVoiceVolume"></output></span>';
      options.insertBefore(toggle,back);options.insertBefore(label,back);
      label.querySelector('input').addEventListener('input',e=>setVolume(Number(e.target.value)/100));
    }
    syncUi();
  }
  function syncUi(){
    if(!root.document)return;
    const toggle=root.document.getElementById('menuVoices');if(toggle){toggle.textContent='VOICES: '+(enabled?'ON':'OFF');toggle.setAttribute('aria-pressed',String(enabled))}
    const input=root.document.getElementById('menuVoiceVolume'),out=root.document.getElementById('menuVoiceVolumeValue');
    if(input)input.value=String(Math.round(volume*100));if(out)out.textContent=Math.round(volume*100)+'%';
  }

  function install(){
    patchMenu();patchGarrison();patchAdaptive();injectUi();installInputHooks();
    if(root.document&&!root.__badFodderVoiceMonitor){root.__badFodderVoiceMonitor=true;root.setInterval?.(monitorRuntime,280)}
  }

  function assetRequirements(){
    const files=[];
    for(let slot=1;slot<=4;slot++)for(const [event,file] of Object.entries(EVENT_FILE))files.push({
      path:`${BASE}/squad/voice-${slot}/${file}.mp3`,type:'squad',slot,event,text:SQUAD_BANKS[slot-1][event]
    });
    for(const mission of ['belzig','wigan','cable-street']){
      const bank=mission==='cable-street'?ENEMY_CABLE:ENEMY_GERMAN;
      for(const [event,line] of Object.entries(bank))files.push({
        path:`${BASE}/enemy/${mission}/${ENEMY_FILE[event]||slug(event)}.mp3`,type:'enemy',mission,event,text:line.spoken,caption:line.caption
      });
      files.push({path:`${BASE}/briefings/${mission}.mp3`,type:'briefing',mission,text:'Read the complete on-screen mission briefing in order: story, mission, objectives, final line.'});
    }
    return files;
  }

  if(root.document){
    if(root.document.readyState==='loading')root.document.addEventListener('DOMContentLoaded',install,{once:true});
    else install();
  }
  return{install,setEnabled,setVolume,stopAll,stopNarration,narrateBriefing,replayBriefing,speakSquad,enemyChatter,enemyOrder,
    briefingText,actionEvent,assetRequirements,get enabled(){return enabled},get volume(){return volume},_runtime:runtime};
});