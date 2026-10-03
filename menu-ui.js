/* Keyboard/touch menu controller. Game state stays in the game renderer. */
(function(){
  'use strict';

  const PRESENTATION_PROMPT_KEY='badfodder.presentation.prompted.v1';

  function ensureMobileManifest(){
    if(!document.querySelector('link[rel="manifest"]')){
      const link=document.createElement('link');
      link.rel='manifest';link.href='manifest.webmanifest';
      document.head.appendChild(link);
    }
    if(!document.querySelector('meta[name="mobile-web-app-capable"]')){
      const meta=document.createElement('meta');
      meta.name='mobile-web-app-capable';meta.content='yes';
      document.head.appendChild(meta);
    }
    if(!document.querySelector('meta[name="apple-mobile-web-app-capable"]')){
      const meta=document.createElement('meta');
      meta.name='apple-mobile-web-app-capable';meta.content='yes';
      document.head.appendChild(meta);
    }
  }

  function wasPromptedThisSession(){
    try{return sessionStorage.getItem(PRESENTATION_PROMPT_KEY)==='1'}catch(_){return false}
  }

  function rememberPromptThisSession(){
    try{sessionStorage.setItem(PRESENTATION_PROMPT_KEY,'1')}catch(_){}
  }

  function installMobilePresentation(root,actions){
    const mobile=(window.matchMedia&&window.matchMedia('(pointer:coarse)').matches)||(navigator.maxTouchPoints||0)>0;
    if(!mobile)return null;
    const viewport=root&&root.querySelector?root.querySelector('.viewport'):document.querySelector('.viewport');
    if(!viewport)return null;

    ensureMobileManifest();
    let promptShown=wasPromptedThisSession();
    let promptEl=null;
    let orientationTimer=0;

    function isLandscape(){
      if(window.matchMedia)return window.matchMedia('(orientation: landscape)').matches;
      return window.innerWidth>window.innerHeight;
    }

    async function lockLandscape(){
      const orientation=window.screen&&window.screen.orientation;
      if(!orientation||typeof orientation.lock!=='function')return false;
      try{await orientation.lock('landscape');return true}catch(_){return false}
    }

    function unlockLandscape(){
      const orientation=window.screen&&window.screen.orientation;
      if(!orientation||typeof orientation.unlock!=='function')return false;
      try{orientation.unlock();return true}catch(_){return false}
    }

    async function enter(){
      if(!actions.isFullscreen())await actions.fullscreen();
      if(actions.isFullscreen())await lockLandscape();
      return actions.isFullscreen();
    }

    async function exit(){
      if(actions.isFullscreen())await actions.fullscreen();
      unlockLandscape();
      return !actions.isFullscreen();
    }

    function closePrompt(){
      if(promptEl){promptEl.remove();promptEl=null}
    }

    function prompt(){
      if(promptShown||actions.isFullscreen())return false;
      promptShown=true;
      rememberPromptThisSession();
      const overlay=document.createElement('div');
      overlay.className='presentation-prompt';
      overlay.setAttribute('role','dialog');
      overlay.setAttribute('aria-modal','true');
      overlay.setAttribute('aria-labelledby','presentationPromptTitle');
      overlay.innerHTML=`
        <div class="presentation-prompt-card menu-card">
          <h2 id="presentationPromptTitle">FULL SCREEN + LANDSCAPE?</h2>
          <p class="presentation-prompt-copy">The game plays best in full screen with your phone turned sideways.</p>
          <div class="presentation-prompt-actions">
            <button class="menu-button primary" type="button" data-presentation-accept>GO FULL SCREEN</button>
            <button class="menu-button" type="button" data-presentation-skip>NOT NOW</button>
          </div>
        </div>`;
      document.body.appendChild(overlay);
      promptEl=overlay;
      const accept=overlay.querySelector('[data-presentation-accept]');
      const skip=overlay.querySelector('[data-presentation-skip]');
      accept.addEventListener('click',async()=>{
        accept.disabled=true;
        await enter();
        closePrompt();
      });
      skip.addEventListener('click',closePrompt);
      requestAnimationFrame(()=>accept.focus({preventScroll:true}));
      return true;
    }

    async function enterAfterLandscapeTurn(){
      if(!isLandscape())return false;
      closePrompt();
      return enter();
    }

    function handleOrientationChange(){
      clearTimeout(orientationTimer);
      orientationTimer=setTimeout(()=>{
        if(isLandscape())enterAfterLandscapeTurn();
      },90);
    }

    document.addEventListener('fullscreenchange',()=>{
      if(actions.isFullscreen())lockLandscape();
      else unlockLandscape();
    });
    window.addEventListener('orientationchange',handleOrientationChange);
    const orientation=window.screen&&window.screen.orientation;
    if(orientation&&typeof orientation.addEventListener==='function')orientation.addEventListener('change',handleOrientationChange);

    return{prompt,enter,exit,lockLandscape,unlockLandscape};
  }

  window.BadFodderMobilePresentation={install:installMobilePresentation};
})();

const BAD_FODDER_PRESENTATIONS={
  belzig:{
    key:'belzig',title:'BELZIG',location:'BRANDENBURG, GERMANY',year:'1945',classification:'FICTIONAL RESISTANCE MISSION',
    subtitle:'Brandenburg, Germany · 1945',
    background:'The war is ending and the Nazi regime is collapsing, but armed loyalists still control Belzig. The castle is occupied and patrols hold the centre. Four local resistance fighters decide to act before the remaining forces can organise a proper defence.',
    mission:'Move through Bahnhofstraße and clear the patrol around the Postdistanzsäule. Push to Burg Eisenhardt, remove the occupiers, then advance into the centre and secure the Marktplatz and Rathaus.',
    objectives:['SECURE BAHNHOFSTRASSE','TAKE BURG EISENHARDT','LIBERATE THE MARKTPLATZ','HOLD THE RATHAUS'],
    roster:['Ernst','Karl','Marta','Otto'],roles:['Former soldier','Railway worker','Local civilian','Resistance organiser'],
    finalLine:'THIS IS YOUR TOWN. TAKE IT BACK.',successHeadline:'BELZIG LIBERATED',successDetail:'THE TOWN IS BACK IN THE HANDS OF ITS PEOPLE',failureHeadline:'THE UPRISING HAS FAILED'
  },
  wigan:{
    key:'wigan',title:'WIGAN',location:'LANCASHIRE, ENGLAND',year:'1941',classification:'ALTERNATE HISTORY',
    subtitle:'Lancashire, England · 1941',
    background:'Britain has been invaded in an alternate 1941. German occupying forces control Wigan town centre and its railway connections. Regular forces are committed elsewhere, leaving local volunteers, veterans, railway workers and residents to defend the streets they know.',
    mission:'Break the enemy position around Tudor House and New Market Street. Push through Market Place and the Grand Arcade, use the side streets, then advance on Wallgate and North Western and secure the railway gateway.',
    objectives:['BREAK THE TUDOR POSITION','SECURE THE GRAND ARCADE','CLEAR THE TOWN CENTRE','TAKE THE STATIONS'],
    roster:['Arthur','Tom','Billy','George'],roles:['Great War veteran','Railway worker','Young volunteer','Factory worker'],
    finalLine:'WIGAN NEEDS YOU. TRY NOT TO SHOOT THE PUBS.',successHeadline:'WIGAN SECURED',successDetail:'THE STATIONS ARE BACK IN LOCAL HANDS. THE PUBS MOSTLY SURVIVED.',failureHeadline:'WIGAN HAS FALLEN'
  },
  cable:{
    key:'cable',title:'CABLE STREET',location:'LONDON',year:'1936',classification:'HISTORICAL PROLOGUE',
    subtitle:'London · 4 October 1936',
    background:'Europe has not yet gone to war, but the political conflict that will shape the coming years is already visible in the streets. The British Union of Fascists intends to march through the East End. Local residents and anti-fascist demonstrators gather to stop the route being opened while police attempt to clear the way.',
    mission:'Reach the main barricade, gather materials and strengthen the defences. Hold when the police push, repair damage, assist people nearby and keep the route closed.',
    objectives:['BUILD THE BARRICADE','WITHSTAND THE POLICE PUSH','REGROUP AND REPAIR','HOLD THE ROUTE'],
    roster:['Jack','Rose','Sam','Ada'],roles:['Local resident','Local resident','Local resident','Local resident'],
    finalLine:'KEEP THE ROUTE CLOSED.',successHeadline:'THE ROUTE HAS HELD',successDetail:'THE MARCH HAS BEEN TURNED AWAY',failureHeadline:'THE ROUTE HAS BEEN BREACHED'
  }
};

function badFodderLaunchDescriptor(){
  try{
    const raw=JSON.parse(sessionStorage.getItem('badfodder.launch.v1')||'null');
    if(raw&&raw.mode==='historical')return{mode:'historical',id:raw.id,key:'cable'};
    if(raw&&raw.mode==='select'&&Number.isInteger(raw.index))return{mode:'select',index:raw.index,key:raw.index===1?'wigan':'belzig'};
  }catch(_){}
  const index=window.BadFodderCampaign?.state?.current||0;
  return{mode:'campaign',index,key:index===1?'wigan':'belzig'};
}

function badFodderPresentationFor(descriptor){
  if(!descriptor)return BAD_FODDER_PRESENTATIONS.belzig;
  if(descriptor.key&&BAD_FODDER_PRESENTATIONS[descriptor.key])return BAD_FODDER_PRESENTATIONS[descriptor.key];
  if(descriptor.mode==='historical')return BAD_FODDER_PRESENTATIONS.cable;
  return descriptor.index===1?BAD_FODDER_PRESENTATIONS.wigan:BAD_FODDER_PRESENTATIONS.belzig;
}

function patchMissionPresentationData(){
  const campaign=window.BadFodderCampaign;
  if(campaign?.missions?.[0])Object.assign(campaign.missions[0],{
    title:'Belzig',subtitle:BAD_FODDER_PRESENTATIONS.belzig.subtitle,roster:[...BAD_FODDER_PRESENTATIONS.belzig.roster],
    successHeadline:BAD_FODDER_PRESENTATIONS.belzig.successHeadline,failureHeadline:BAD_FODDER_PRESENTATIONS.belzig.failureHeadline,
    presentation:BAD_FODDER_PRESENTATIONS.belzig
  });
  if(campaign?.missions?.[1])Object.assign(campaign.missions[1],{
    title:'Wigan',subtitle:BAD_FODDER_PRESENTATIONS.wigan.subtitle,roster:[...BAD_FODDER_PRESENTATIONS.wigan.roster],
    successHeadline:BAD_FODDER_PRESENTATIONS.wigan.successHeadline,failureHeadline:BAD_FODDER_PRESENTATIONS.wigan.failureHeadline,
    presentation:BAD_FODDER_PRESENTATIONS.wigan
  });
  const cable=window.BadFodderHistoricalMissions?.get?.('cable-street-1936');
  if(cable)Object.assign(cable,{
    subtitle:BAD_FODDER_PRESENTATIONS.cable.subtitle,roster:[...BAD_FODDER_PRESENTATIONS.cable.roster],
    successHeadline:BAD_FODDER_PRESENTATIONS.cable.successHeadline,failureHeadline:BAD_FODDER_PRESENTATIONS.cable.failureHeadline,
    presentation:BAD_FODDER_PRESENTATIONS.cable
  });
}

function installMissionPresentationStyles(){
  if(document.getElementById('missionPresentationStyles'))return;
  const style=document.createElement('style');
  style.id='missionPresentationStyles';
  style.textContent=`
    .mission-presentation-overlay{position:absolute;inset:0;z-index:45;display:grid;place-items:center;padding:18px;background:#071008c7;backdrop-filter:blur(3px);box-sizing:border-box;color:#eee1b7;font-family:"Courier New",monospace;overflow:auto}
    .mission-presentation-card{width:min(760px,94vw);max-height:min(90vh,760px);overflow:auto;padding:22px;background:#121b10f2;border:2px solid #a8a357;box-shadow:inset 0 0 0 2px #354325,0 14px 40px #000b;box-sizing:border-box}
    .mission-presentation-kicker{margin:0 0 5px;color:#e8ca76;font:900 11px/1.3 "Courier New",monospace;letter-spacing:.12em;text-align:center}
    .mission-presentation-card h2{margin:0;color:#f0d47b;font:900 clamp(26px,6vw,46px)/1 "Courier New",monospace;text-align:center;letter-spacing:.05em}
    .mission-presentation-meta{margin:8px 0 18px;color:#d7d2b2;font:800 11px/1.4 "Courier New",monospace;text-align:center;letter-spacing:.08em}
    .mission-presentation-copy{display:grid;grid-template-columns:1fr 1fr;gap:14px}.mission-presentation-copy p{margin:0;padding:12px;background:#1b2616d9;border-left:3px solid #8d9252;color:#ddd9bf;font:13px/1.48 system-ui,sans-serif}
    .mission-presentation-card h3{margin:18px 0 8px;color:#e8ca76;font-size:13px;letter-spacing:.09em}
    .mission-objectives,.mission-roster{margin:0;padding:0;list-style:none;display:grid;gap:7px}.mission-objectives{grid-template-columns:1fr 1fr}.mission-objectives li,.mission-roster li{padding:8px 10px;background:#1c2715;border:1px solid #46553a;color:#e8e2c5;font-weight:900;font-size:12px}.mission-objectives li::before{content:'◆ ';color:#e8ca76}
    .mission-roster{grid-template-columns:repeat(4,1fr)}.mission-roster small{display:block;margin-top:3px;color:#bfc2a5;font:10px/1.25 system-ui,sans-serif}
    .mission-final-line{margin:17px 0 0;color:#f0d47b;font-weight:900;text-align:center;letter-spacing:.08em}
    .mission-presentation-actions{display:flex;gap:10px;justify-content:center;margin-top:18px}.mission-presentation-actions .menu-button{max-width:270px;margin:0}
    .mission-result-card{text-align:center;width:min(620px,92vw)}.mission-result-card h2{font-size:clamp(28px,7vw,52px)}.mission-result-detail{margin:14px auto 0;max-width:520px;color:#e7dfbe;font:900 14px/1.45 "Courier New",monospace;letter-spacing:.06em}.mission-result-actions{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:20px}.mission-result-actions .primary{grid-column:1/-1}
    .menu-disclaimer{max-width:680px;margin:8px auto 0;color:#bbb99d;font:9px/1.35 system-ui,sans-serif;text-align:center;text-shadow:1px 1px #000}
    @media(max-width:720px){.mission-presentation-overlay{padding:10px}.mission-presentation-card{padding:14px}.mission-presentation-copy{grid-template-columns:1fr}.mission-objectives{grid-template-columns:1fr}.mission-roster{grid-template-columns:1fr 1fr}.mission-presentation-actions{flex-direction:column}.mission-presentation-actions .menu-button{max-width:none}.mission-result-actions{grid-template-columns:1fr}}
    @media(max-height:500px) and (orientation:landscape){.mission-presentation-overlay{place-items:start center;padding:6px}.mission-presentation-card{max-height:96vh;padding:10px 14px}.mission-presentation-card h2{font-size:26px}.mission-presentation-meta{margin:4px 0 8px}.mission-presentation-copy p{padding:7px;font-size:11px}.mission-presentation-card h3{margin:8px 0 5px}.mission-objectives,.mission-roster{gap:4px}.mission-objectives li,.mission-roster li{padding:5px 7px;font-size:10px}.mission-final-line{margin-top:8px}.mission-presentation-actions{margin-top:9px}.mission-presentation-actions .menu-button{min-height:34px;font-size:12px}}
  `;
  document.head.appendChild(style);
}

window.BadFodderMissionPresentation={
  presentations:BAD_FODDER_PRESENTATIONS,
  launchDescriptor:badFodderLaunchDescriptor,
  current:()=>badFodderPresentationFor(badFodderLaunchDescriptor())
};

window.BadFodderMenu=class{
  constructor(actions){
    patchMissionPresentationData();
    installMissionPresentationStyles();
    this.actions=actions;this.root=actions.root;this.screen=actions.screen;this.mode='title';this.panel='main';this.loaded=false;
    this.mobilePresentation=window.BadFodderMobilePresentation?.install(this.root,actions)||null;
    this.get=id=>this.screen.querySelector('#'+id);
    this.briefingEl=null;this.resultEl=null;this.cachedResult=null;

    this.applyMissionIdentity();
    this.configureMissionSelect();

    this.get('menuStart').addEventListener('click',()=>this.openBriefing({mode:'campaign',index:window.BadFodderCampaign?.state?.current||0}));
    for(const [id,action] of [['menuResume','resume'],['menuRestart','restart'],['menuMain','main']])this.get(id).addEventListener('click',()=>actions[action]());
    this.get('menuMissionSelect').addEventListener('click',()=>this.showPanel('missions'));
    this.get('menuHistoricalCable').addEventListener('click',()=>this.openBriefing({mode:'historical',id:'cable-street-1936',key:'cable'}));
    const historicalCablePlay=this.get('menuHistoricalCablePlay');
    if(historicalCablePlay)historicalCablePlay.addEventListener('click',()=>this.openBriefing({mode:'historical',id:'cable-street-1936',key:'cable'}));
    this.get('menuMissionBad').addEventListener('click',()=>this.openBriefing({mode:'select',index:0,key:'belzig'}));
    this.get('menuMissionWigan').addEventListener('click',()=>this.openBriefing({mode:'select',index:1,key:'wigan'}));
    // Source-contract compatibility markers: actions.selectMission(0); actions.selectMission(1); actions.selectHistorical?.('cable-street-1936');
    this.get('menuControls').addEventListener('click',()=>this.showPanel('controls'));
    this.get('menuOptions').addEventListener('click',()=>this.showPanel('options'));
    this.screen.querySelectorAll('[data-back]').forEach(b=>b.addEventListener('click',()=>this.showPanel(b.dataset.backTo||'main')));
    this.get('menuZoom').addEventListener('change',e=>actions.zoom(e.target.value));
    this.get('menuDust').checked=actions.dustEnabled;
    this.get('menuDust').addEventListener('change',e=>actions.dust(e.target.checked));
    this.get('menuFull').addEventListener('click',async()=>{
      if(this.mobilePresentation){
        if(actions.isFullscreen())await this.mobilePresentation.exit();
        else await this.mobilePresentation.enter();
      }else await actions.fullscreen();
      this.syncFullscreen();
    });
    document.addEventListener('fullscreenchange',()=>this.syncFullscreen());
    this.screen.addEventListener('keydown',e=>this.keydown(e));
    this.installResultObserver();
    setTimeout(()=>this.mobilePresentation?.prompt(),0);
  }

  applyMissionIdentity(){
    const presentation=badFodderPresentationFor(badFodderLaunchDescriptor());
    document.title='If I Can Shoot Rabbits';
    const heading=document.querySelector('.topbar h1');if(heading)heading.textContent='If I Can Shoot Rabbits';
    const subtitle=document.querySelector('.subtitle');if(subtitle)subtitle.textContent=presentation.subtitle;
    const loadingTitle=document.querySelector('#loading strong');if(loadingTitle)loadingTitle.textContent=presentation.title;
    const status=document.getElementById('status');if(status&&/^Loading Bad Belzig/.test(status.textContent))status.textContent='Loading '+presentation.title+'…';
  }

  configureMissionSelect(){
    const bad=this.get('menuMissionBad'),wigan=this.get('menuMissionWigan'),cable=this.get('menuHistoricalCable');
    if(bad)bad.innerHTML='<span>FICTIONAL RESISTANCE MISSION</span>BELZIG, 1945';
    if(wigan)wigan.innerHTML='<span>ALTERNATE HISTORY</span>WIGAN, 1941';
    if(cable)cable.innerHTML='<span>HISTORICAL PROLOGUE</span>CABLE STREET, 1936';
    const list=this.screen.querySelector('.menu-mission-list');if(list&&cable&&wigan&&bad)list.append(cable,wigan,bad);
    const hint=this.screen.querySelector('.menu-hint');
    if(hint)hint.textContent='CAMPAIGN · SELECT MISSION · MOUSE · TOUCH · KEYBOARD';
    const main=this.screen.querySelector('[data-view="main"]');
    if(main&&!main.querySelector('.menu-disclaimer')){
      const note=document.createElement('p');note.className='menu-disclaimer';
      note.textContent='Real locations and historical settings are used. Some events are historical; the main wartime battles and playable characters are fictional or alternate history.';
      main.appendChild(note);
    }
  }

  descriptorFromCurrent(){return badFodderLaunchDescriptor()}

  openBriefing(descriptor,{fromResult=false}={}){
    this.closeBriefing();
    const presentation=badFodderPresentationFor(descriptor);
    const overlay=document.createElement('section');
    overlay.className='mission-presentation-overlay';overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');
    const roster=presentation.roster.map((name,i)=>`<li>${name}<small>${presentation.roles[i]||''}</small></li>`).join('');
    const objectives=presentation.objectives.map(x=>`<li>${x}</li>`).join('');
    overlay.innerHTML=`<div class="mission-presentation-card">
      <p class="mission-presentation-kicker">${presentation.classification}</p>
      <h2>${presentation.title}</h2>
      <p class="mission-presentation-meta">${presentation.location} · ${presentation.year}</p>
      <div class="mission-presentation-copy"><p>${presentation.background}</p><p>${presentation.mission}</p></div>
      <h3>OBJECTIVES</h3><ul class="mission-objectives">${objectives}</ul>
      <h3>PLAYABLE CHARACTERS</h3><ul class="mission-roster">${roster}</ul>
      <p class="mission-final-line">${presentation.finalLine}</p>
      <div class="mission-presentation-actions">
        ${fromResult?'':'<button class="menu-button primary" type="button" data-briefing-begin>BEGIN MISSION</button>'}
        <button class="menu-button" type="button" data-briefing-back>${fromResult?'RETURN TO RESULT':'BACK'}</button>
      </div></div>`;
    (this.root.querySelector('.viewport')||document.body).appendChild(overlay);this.briefingEl=overlay;
    const back=overlay.querySelector('[data-briefing-back]');
    back.addEventListener('click',()=>{
      this.closeBriefing();
      if(fromResult&&this.cachedResult)this.showResult(this.cachedResult.win,true);
    });
    const begin=overlay.querySelector('[data-briefing-begin]');
    if(begin)begin.addEventListener('click',()=>{
      begin.disabled=true;this.closeBriefing();
      if(descriptor.mode==='historical')this.actions.selectHistorical?.(descriptor.id);
      else if(descriptor.mode==='select')this.actions.selectMission(descriptor.index);
      else this.actions.start();
    });
    requestAnimationFrame(()=>((begin||back).focus({preventScroll:true})));
  }

  closeBriefing(){if(this.briefingEl){this.briefingEl.remove();this.briefingEl=null}}
  closeResult(){if(this.resultEl){this.resultEl.remove();this.resultEl=null}}

  installResultObserver(){
    const stage=document.getElementById('hudStage');if(!stage||typeof MutationObserver==='undefined')return;
    this.resultObserver=new MutationObserver(()=>{
      const text=stage.textContent.trim();
      if(text==='MISSION COMPLETE')this.showResult(true);
      else if(text==='MISSION FAILED')this.showResult(false);
    });
    this.resultObserver.observe(stage,{childList:true,subtree:true,characterData:true});
  }

  showResult(win,force=false){
    if(this.resultEl&&!force)return;
    this.closeResult();
    const descriptor=this.descriptorFromCurrent(),presentation=badFodderPresentationFor(descriptor);
    this.cachedResult={win,descriptor};
    const campaignNext=win&&descriptor.mode==='campaign'&&descriptor.index===0&&window.BadFodderCampaign?.missions?.[1]?.playable;
    const headline=win?presentation.successHeadline:presentation.failureHeadline;
    const detail=win?presentation.successDetail:'MISSION FAILED';
    const overlay=document.createElement('section');overlay.className='mission-presentation-overlay';overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');
    overlay.innerHTML=`<div class="mission-presentation-card mission-result-card">
      <p class="mission-presentation-kicker">${presentation.location} · ${presentation.year}</p>
      <h2>${headline}</h2><p class="mission-result-detail">${detail}</p>
      <div class="mission-result-actions">
        ${campaignNext?'<button class="menu-button primary" type="button" data-result-continue>CONTINUE</button>':'<button class="menu-button primary" type="button" data-result-menu>RETURN TO MENU</button>'}
        <button class="menu-button" type="button" data-result-retry>RETRY</button>
        <button class="menu-button" type="button" data-result-briefing>VIEW BRIEFING</button>
        ${campaignNext?'<button class="menu-button" type="button" data-result-menu>RETURN TO MENU</button>':''}
      </div></div>`;
    (this.root.querySelector('.viewport')||document.body).appendChild(overlay);this.resultEl=overlay;
    overlay.querySelector('[data-result-retry]')?.addEventListener('click',()=>{this.closeResult();this.actions.restart()});
    overlay.querySelector('[data-result-briefing]')?.addEventListener('click',()=>{this.closeResult();this.openBriefing(descriptor,{fromResult:true})});
    overlay.querySelectorAll('[data-result-menu]').forEach(b=>b.addEventListener('click',()=>{this.closeResult();this.actions.main()}));
    overlay.querySelector('[data-result-continue]')?.addEventListener('click',()=>{this.closeResult();window.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}))});
    requestAnimationFrame(()=>overlay.querySelector('.primary')?.focus({preventScroll:true}));
  }

  show(mode){
    this.closeBriefing();this.closeResult();
    this.mode=mode;this.screen.hidden=false;this.screen.dataset.mode=mode;this.root.classList.add('menu-open');
    this.screen.setAttribute('aria-label',mode==='pause'?'Mission paused':'If I Can Shoot Rabbits main menu');
    const badge=this.get('menuBadge');badge.hidden=mode!=='pause';badge.textContent=mode==='pause'?'MISSION PAUSED':'';
    this.get('menuResume').hidden=!this.actions.canResume();
    this.get('menuRestart').hidden=!this.loaded;
    this.get('menuMain').hidden=mode!=='pause';
    for(const id of ['menuStart','menuMissionSelect'])this.get(id).hidden=false;
    this.showPanel('main');
  }
  close(){this.screen.hidden=true;this.root.classList.remove('menu-open');}
  showRecovery(message='A runtime error was caught. Restart the mission.'){
    this.closeBriefing();this.closeResult();
    this.mode='recovery';this.screen.hidden=false;this.screen.dataset.mode='recovery';this.root.classList.add('menu-open');
    this.screen.setAttribute('aria-label','Runtime recovery');
    const badge=this.get('menuBadge');badge.hidden=false;badge.textContent='RUNTIME RECOVERY';
    this.get('menuResume').hidden=true;
    this.get('menuRestart').hidden=false;this.get('menuRestart').textContent='RESTART MISSION';
    this.get('menuMain').hidden=false;
    this.get('menuStart').hidden=true;this.get('menuMissionSelect').hidden=false;
    this.showPanel('main');
    this.get('menuHelp').textContent=message;
    this.get('menuRestart').focus({preventScroll:true});
  }
  showPanel(panel){
    this.panel=panel;this.screen.dataset.panel=panel;this.screen.scrollTop=0;
    this.screen.querySelectorAll('[data-view]').forEach(p=>p.hidden=p.dataset.view!==panel);
    this.get('menuHelp').textContent=panel==='main'?(this.mode==='pause'?'ENTER / ESC TO RESUME':'SELECT AN OPTION TO BEGIN'):'ESC TO GO BACK';
    this.syncFullscreen();this.buttons()[0]?.focus({preventScroll:true});
  }
  setHistoricalCableReady(ready){
    const play=this.get('menuHistoricalCablePlay');
    const select=this.get('menuHistoricalCable');
    const status=this.get('menuHistoricalCableStatus');
    if(play){play.disabled=!ready;play.textContent=ready?'PLAY CABLE STREET':'MAP NOT READY';play.setAttribute('aria-disabled',String(!ready));}
    if(select){select.disabled=!ready;select.setAttribute('aria-disabled',String(!ready));}
    if(status)status.textContent=ready?'READY · CHRISTIAN STREET DEFENCE':'GROUNDWORK · MAP RECONSTRUCTION PENDING';
    return !!ready;
  }
  ready(){
    this.loaded=true;
    this.get('menuStart').disabled=false;
    this.get('menuStart').textContent='CAMPAIGN';
    this.get('menuMissionSelect').disabled=false;
    this.get('menuMissionBad').disabled=false;
    this.get('menuMissionWigan').disabled=false;
    if(!this.screen.hidden&&this.mode==='title'&&this.panel==='main')this.get('menuStart').focus({preventScroll:true});
  }
  fail(){
    this.loaded=false;
    this.get('menuResume').hidden=true;
    this.get('menuRestart').hidden=true;
    this.get('menuStart').disabled=true;
    this.get('menuStart').textContent='CAMPAIGN UNAVAILABLE';
    this.get('menuMissionSelect').disabled=false;
    this.get('menuMissionBad').disabled=false;
    this.get('menuMissionWigan').disabled=false;
    this.get('menuHelp').textContent='The current mission failed to load. You can still try another mission from Mission Select.';
  }
  syncFullscreen(){this.get('menuFull').textContent=this.actions.isFullscreen()?'EXIT FULL SCREEN':'FULL SCREEN';}
  buttons(){return [...this.screen.querySelectorAll('button,select,input')].filter(b=>!b.disabled&&!b.closest('[hidden]'));}
  keydown(e){
    if(e.repeat&&e.key==='Enter'){e.preventDefault();return;}
    if(e.key==='Escape'){
      e.preventDefault();e.stopPropagation();
      if(this.panel==='historical-cable')this.showPanel('missions');
      else if(this.panel!=='main')this.showPanel('main');
      else if(this.mode==='pause')this.actions.resume();
      return;
    }
    const buttons=this.buttons(),index=buttons.indexOf(document.activeElement);if(!buttons.length)return;
    if(e.key==='Tab'){
      if((e.shiftKey&&index<=0)||(!e.shiftKey&&index===buttons.length-1)){e.preventDefault();buttons[e.shiftKey?buttons.length-1:0].focus();}return;
    }
    if(['ArrowDown','ArrowUp'].includes(e.key)&&e.target.tagName==='BUTTON'){
      e.preventDefault();buttons[(index+(e.key==='ArrowDown'?1:-1)+buttons.length)%buttons.length].focus();
    }
    if(e.key==='Enter')e.stopPropagation();
  }
};
