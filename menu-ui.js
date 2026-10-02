/* Keyboard/touch menu controller. Game state stays in the game renderer. */
window.BadFodderMenu=class{
  constructor(actions){
    this.actions=actions;this.root=actions.root;this.screen=actions.screen;this.mode='title';this.panel='main';this.loaded=false;
    this.get=id=>this.screen.querySelector('#'+id);
    for(const [id,action] of [['menuStart','start'],['menuResume','resume'],['menuRestart','restart'],['menuMain','main']])this.get(id).addEventListener('click',()=>actions[action]());
    this.get('menuMissionSelect').addEventListener('click',()=>this.showPanel('missions'));
    this.get('menuHistorical').addEventListener('click',()=>this.showPanel('historical'));
    this.get('menuHistoricalCable').addEventListener('click',()=>this.showPanel('historical-cable'));
    const historicalCablePlay=this.get('menuHistoricalCablePlay');
    if(historicalCablePlay)historicalCablePlay.addEventListener('click',()=>actions.selectHistorical?.('cable-street-1936'));
    this.get('menuMissionBad').addEventListener('click',()=>actions.selectMission(0));
    this.get('menuMissionWigan').addEventListener('click',()=>actions.selectMission(1));
    this.get('menuControls').addEventListener('click',()=>this.showPanel('controls'));
    this.get('menuOptions').addEventListener('click',()=>this.showPanel('options'));
    this.screen.querySelectorAll('[data-back]').forEach(b=>b.addEventListener('click',()=>this.showPanel(b.dataset.backTo||'main')));
    this.get('menuZoom').addEventListener('change',e=>actions.zoom(e.target.value));
    this.get('menuDust').checked=actions.dustEnabled;
    this.get('menuDust').addEventListener('change',e=>actions.dust(e.target.checked));
    this.get('menuFull').addEventListener('click',async()=>{await actions.fullscreen();this.syncFullscreen();});
    document.addEventListener('fullscreenchange',()=>this.syncFullscreen());
    this.screen.addEventListener('keydown',e=>this.keydown(e));
  }
  show(mode){
    this.mode=mode;this.screen.hidden=false;this.screen.dataset.mode=mode;this.root.classList.add('menu-open');
    this.screen.setAttribute('aria-label',mode==='pause'?'Mission paused':'Bad Fodder main menu');
    const badge=this.get('menuBadge');badge.hidden=mode!=='pause';badge.textContent=mode==='pause'?'MISSION PAUSED':'';
    for(const id of ['menuResume','menuRestart','menuMain'])this.get(id).hidden=mode!=='pause';
    for(const id of ['menuStart','menuMissionSelect','menuHistorical'])this.get(id).hidden=mode!=='title';
    this.showPanel('main');
  }
  close(){this.screen.hidden=true;this.root.classList.remove('menu-open');}
  showRecovery(message='A runtime error was caught. Restart the mission.'){
    this.mode='recovery';this.screen.hidden=false;this.screen.dataset.mode='recovery';this.root.classList.add('menu-open');
    this.screen.setAttribute('aria-label','Runtime recovery');
    const badge=this.get('menuBadge');badge.hidden=false;badge.textContent='RUNTIME RECOVERY';
    this.get('menuResume').hidden=true;
    this.get('menuRestart').hidden=false;this.get('menuRestart').textContent='RESTART MISSION';
    this.get('menuMain').hidden=false;
    this.get('menuStart').hidden=true;this.get('menuMissionSelect').hidden=true;this.get('menuHistorical').hidden=true;
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
    const status=this.get('menuHistoricalCableStatus');
    if(play){
      play.disabled=!ready;
      play.textContent=ready?'PLAY CABLE STREET':'MAP NOT READY';
      play.setAttribute('aria-disabled',String(!ready));
    }
    if(status)status.textContent=ready?'READY · VERIFIED MAP PACKAGE LOADED':'GROUNDWORK · MAP RECONSTRUCTION PENDING';
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
      if(this.panel==='historical-cable')this.showPanel('historical');
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
