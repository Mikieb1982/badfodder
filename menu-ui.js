/* Keyboard/touch menu controller. Game state stays in the game renderer. */
window.BadFodderMenu=class{
  constructor(actions){
    this.actions=actions;this.root=actions.root;this.screen=actions.screen;this.mode='title';this.panel='main';this.loaded=false;
    this.get=id=>this.screen.querySelector('#'+id);
    for(const [id,action] of [['menuStart','start'],['menuResume','resume'],['menuRestart','restart'],['menuMain','main']])this.get(id).addEventListener('click',()=>actions[action]());
    this.get('menuControls').addEventListener('click',()=>this.showPanel('controls'));
    this.get('menuOptions').addEventListener('click',()=>this.showPanel('options'));
    this.screen.querySelectorAll('[data-back]').forEach(b=>b.addEventListener('click',()=>this.showPanel('main')));
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
    this.get('menuStart').hidden=mode!=='title';this.showPanel('main');
  }
  close(){this.screen.hidden=true;this.root.classList.remove('menu-open');}
  showPanel(panel){
    this.panel=panel;this.screen.dataset.panel=panel;this.screen.scrollTop=0;
    this.screen.querySelectorAll('[data-view]').forEach(p=>p.hidden=p.dataset.view!==panel);
    this.get('menuHelp').textContent=panel==='main'?(this.mode==='pause'?'ENTER / ESC TO RESUME':'SELECT AN OPTION TO BEGIN'):'ESC TO GO BACK';
    this.syncFullscreen();this.buttons()[0]?.focus({preventScroll:true});
  }
  ready(){this.loaded=true;this.get('menuStart').disabled=false;this.get('menuStart').textContent='START MISSION';if(!this.screen.hidden&&this.mode==='title'&&this.panel==='main')this.get('menuStart').focus({preventScroll:true});}
  fail(){this.get('menuStart').disabled=true;this.get('menuStart').textContent='MISSION UNAVAILABLE';this.get('menuHelp').textContent='Reload the page to try again.';}
  syncFullscreen(){this.get('menuFull').textContent=this.actions.isFullscreen()?'EXIT FULL SCREEN':'FULL SCREEN';}
  buttons(){return [...this.screen.querySelectorAll('button,select,input')].filter(b=>!b.disabled&&!b.closest('[hidden]'));}
  keydown(e){
    if(e.repeat&&e.key==='Enter'){e.preventDefault();return;}
    if(e.key==='Escape'){
      e.preventDefault();e.stopPropagation();if(this.panel!=='main')this.showPanel('main');else if(this.mode==='pause')this.actions.resume();return;
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
