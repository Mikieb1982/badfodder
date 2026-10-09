/* Resistance survival and competitive skirmish modes layered over existing missions/maps. */
(function(root,factory){
  const api=factory(root||{});
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.BadFodderArcade=api;
})(typeof window!=='undefined'?window:globalThis,function(root){
  'use strict';

  const MODE_KEY='badfodder.arcade.v1';
  const LAUNCH_KEY='badfodder.launch.v1';
  const AUTO_KEY='badfodder.launch.autostart.v1';
  const MAPS=Object.freeze([
    {key:'bad-belzig',label:'Bad Belzig',fallbackIndex:0},
    {key:'wigan',label:'Wigan',fallbackIndex:1},
    {key:'cable-street',label:'Cable Street',fallbackIndex:2},
    {key:'barcelona',label:'Barcelona',fallbackIndex:3}
  ]);
  const SKIRMISH_MAPS=Object.freeze(MAPS.filter(m=>m.key==='bad-belzig'||m.key==='wigan'));
  const ALLOWED_MODES=new Set(['resistance','skirmish']);

  function storage(){return root.BadFodderStorage?.session||root.sessionStorage||null}
  function read(){
    try{
      const value=JSON.parse(storage()?.getItem(MODE_KEY)||'null');
      return value&&ALLOWED_MODES.has(value.mode)?value:null;
    }catch(_){return null}
  }
  function write(value){try{storage()?.setItem(MODE_KEY,JSON.stringify(value))}catch(_){}return value}
  function clear(){try{storage()?.removeItem(MODE_KEY)}catch(_){}hideHud();hideResult();}
  function mode(){return read()?.mode||null}
  function active(name=null){const current=mode();return name?current===name:!!current}
  function missionIndex(key){
    const missions=root.BadFodderCampaign?.missions||[];
    const found=missions.findIndex(m=>m&&(m.map===key||m.id===key||m.legacyId===key));
    if(found>=0)return found;
    return MAPS.find(m=>m.key===key)?.fallbackIndex??-1;
  }
  function launchResistance(key){
    const index=missionIndex(key);if(index<0)return false;
    write({mode:'resistance',map:key});
    try{
      storage()?.setItem(LAUNCH_KEY,JSON.stringify({mode:'select',index}));
      storage()?.setItem(AUTO_KEY,'1');
    }catch(_){return false}
    root.location?.reload?.();return true;
  }
  function clearForStandardPlay(){clear();try{storage()?.removeItem('badfodder.coop.resume')}catch(_){} }
  function waveSize(wave){return Math.min(40,8+Math.max(1,Number(wave)||1)*3)}
  function teamForSource(source){return Number.isInteger(source)?(source<2?1:source<4?2:0):0}
  function opposingIndices(source){const team=teamForSource(source);return team===1?[2,3]:team===2?[0,1]:[]}
  function combatReady(unit){return !!(unit&&unit.alive!==false&&!unit.downed&&unit.healthState!=='DEAD')}

  let hud=null,result=null,lastRuntime=null;
  function ensureStyle(){
    if(!root.document||root.document.getElementById('arcadeModeStyle'))return;
    const style=root.document.createElement('style');style.id='arcadeModeStyle';style.textContent=`
      #arcadeHud{position:absolute;left:50%;top:max(8px,env(safe-area-inset-top));transform:translateX(-50%);z-index:9;pointer-events:none;display:flex;gap:10px;align-items:center;padding:7px 10px;background:rgba(18,22,20,.88);border:1px solid rgba(236,229,207,.4);border-radius:5px;color:#f0eadb;font:800 10px/1.2 system-ui,sans-serif;letter-spacing:.08em;text-shadow:0 1px 2px #000;white-space:nowrap}
      #arcadeHud strong{font-size:12px;color:#fff}#arcadeHud[hidden]{display:none}
      #arcadeResult{position:absolute;inset:0;z-index:40;display:flex;align-items:center;justify-content:center;background:rgba(9,12,11,.84);padding:16px}
      #arcadeResult[hidden]{display:none}#arcadeResult .arcade-card{width:min(460px,92vw);padding:20px;text-align:center;background:#20271f;border:1px solid #7f805f;color:#eee7d4}
      #arcadeResult h2{margin:0 0 8px;letter-spacing:.08em}#arcadeResult p{margin:7px 0 16px}.arcade-actions{display:flex;justify-content:center;gap:8px;flex-wrap:wrap}
      @media(max-width:720px){#arcadeHud{top:6px;padding:5px 7px;gap:7px;font-size:8px}#arcadeHud strong{font-size:10px}}
    `;root.document.head.appendChild(style);
  }
  function ensureHud(){
    if(!root.document)return null;if(hud?.isConnected)return hud;ensureStyle();
    hud=root.document.createElement('div');hud.id='arcadeHud';hud.hidden=true;
    (root.document.querySelector('.viewport')||root.document.body).appendChild(hud);return hud;
  }
  function hideHud(){if(hud)hud.hidden=true}
  function paintHud(state){
    const el=ensureHud();if(!el)return;el.hidden=false;
    if(state.mode==='resistance'){
      const live=state.env.enemies.filter(e=>e?.alive&&!e.surrendered).length;
      el.innerHTML=`<span>RESISTANCE</span><strong>WAVE ${state.wave}</strong><span>HOSTILES ${live}</span><span>KILLS ${state.kills}</span><span>SCORE ${state.score}</span>`;
    }else{
      const p1=state.env.squad.slice(0,2).filter(combatReady).length,p2=state.env.squad.slice(2,4).filter(combatReady).length;
      el.innerHTML=`<span>SKIRMISH</span><strong>P1 ${p1}/2</strong><span>VS</span><strong>P2 ${p2}/2</strong>`;
    }
  }
  function hideResult(){if(result)result.hidden=true}
  function showResult(state,title,copy){
    if(!root.document||state.resultShown)return;state.resultShown=true;ensureStyle();
    if(!result){result=root.document.createElement('div');result.id='arcadeResult';result.hidden=true;(root.document.querySelector('.viewport')||root.document.body).appendChild(result)}
    result.hidden=false;result.innerHTML=`<div class="arcade-card"><h2>${title}</h2><p>${copy}</p><div class="arcade-actions"><button id="arcadeRetry" class="menu-button primary" type="button">PLAY AGAIN</button><button id="arcadeMain" class="menu-button" type="button">MAIN MENU</button></div></div>`;
    result.querySelector('#arcadeRetry').onclick=()=>{try{storage()?.setItem(AUTO_KEY,'1')}catch(_){}root.location?.reload?.()};
    result.querySelector('#arcadeMain').onclick=()=>{clear();try{storage()?.removeItem(LAUNCH_KEY);storage()?.removeItem(AUTO_KEY);storage()?.removeItem('badfodder.coop.resume')}catch(_){}root.location?.reload?.()};
  }

  function resetEnemy(template,x,y,wave,index){
    const maxHp=Math.max(1,Number(template?.maxHp)||Number(template?.hp)||3);
    return {...template,
      id:'arcade-'+wave+'-'+index+'-'+Math.random().toString(36).slice(2,7),x,y,alive:true,hp:maxHp,maxHp,
      state:'idle',alert:true,missionDormant:false,surrendered:false,surrenderTimer:0,deadTimer:0,hitTimer:0,flash:0,fireTimer:0,
      cooldown:.25+(index%5)*.08,suppression:0,path:null,pendingPath:null,pathIndex:0,target:null,lastSeen:null,retreating:false,
      checkpointWave:false,objectiveGroup:'arcade',groupId:'arcade-wave-'+wave
    };
  }
  function anchorsFrom(enemies){return enemies.filter(e=>e&&Number.isFinite(e.x)&&Number.isFinite(e.y)).map(e=>({x:e.x,y:e.y,template:e}))}
  function farthestAnchor(origin,anchors){
    if(!anchors.length)return null;let best=anchors[0],d=-1;
    for(const a of anchors){const next=(a.x-origin.x)**2+(a.y-origin.y)**2;if(next>d){d=next;best=a}}
    return best;
  }
  function createState(env){return{mode:mode(),env,clock:0,initialised:false,wave:0,kills:0,score:0,nextWaveAt:0,between:false,templates:[],anchors:[],counted:new WeakSet(),resultShown:false,aiClock:0,skirmishAnchor:null}}
  function setStatus(env,text){try{env.setStatus?.(text,2.2)}catch(_){} }

  function initResistance(state){
    const env=state.env,existing=[...env.enemies],anchors=anchorsFrom(existing);
    state.templates=anchors.map(a=>a.template);state.anchors=anchors;
    if(!state.templates.length)state.templates=[{hp:3,maxHp:3,alive:true,alert:true,state:'idle',dir:0,cooldown:.5,suppression:0}];
    if(!state.anchors.length){
      const leader=env.squad.find(s=>s?.alive)||{x:120,y:120};
      state.anchors=[{x:leader.x+220,y:leader.y,template:state.templates[0]},{x:leader.x-220,y:leader.y,template:state.templates[0]},{x:leader.x,y:leader.y+220,template:state.templates[0]}];
    }
    env.enemies.length=0;state.nextWaveAt=.8;state.initialised=true;setStatus(env,'RESISTANCE · Prepare for wave 1');paintHud(state);
  }
  function spawnWave(state){
    const env=state.env;state.wave++;state.between=false;const count=waveSize(state.wave),anchors=state.anchors;
    for(let i=0;i<count;i++){
      const anchor=anchors[i%anchors.length],template=state.templates[i%state.templates.length]||anchor.template;
      const ring=Math.floor(i/anchors.length),angle=(i*2.3999632297)+(state.wave*.37),radius=Math.min(42,ring*8);
      const x=anchor.x+Math.cos(angle)*radius,y=anchor.y+Math.sin(angle)*radius;
      env.enemies.push(resetEnemy(template,x,y,state.wave,i));
    }
    setStatus(env,'WAVE '+state.wave+' · '+count+' hostiles');paintHud(state);
  }
  function countResistanceKills(state){
    for(const enemy of state.env.enemies){
      if(!enemy||state.counted.has(enemy)||enemy.alive!==false)continue;
      state.counted.add(enemy);state.kills++;state.score+=100+state.wave*10;
    }
  }
  function resistanceStep(state,dt){
    if(!state.initialised)initResistance(state);state.clock+=dt;countResistanceKills(state);
    if(!state.env.squad.some(combatReady)){showResult(state,'RESISTANCE OVER','Wave '+state.wave+' · '+state.kills+' enemies defeated · '+state.score+' points');paintHud(state);return}
    const live=state.env.enemies.some(e=>e?.alive&&!e.surrendered);
    if(!live&&state.wave>0&&!state.between){state.between=true;state.nextWaveAt=state.clock+4.5;setStatus(state.env,'WAVE '+state.wave+' CLEARED · Next wave in 5 seconds');}
    if((state.wave===0||state.between)&&state.clock>=state.nextWaveAt)spawnWave(state);
    paintHud(state);
  }

  function initSkirmish(state){
    const env=state.env,anchors=anchorsFrom(env.enemies),origin=env.squad[0]||{x:100,y:100},away=farthestAnchor(origin,anchors);
    state.skirmishAnchor=away||{x:origin.x+320,y:origin.y+180};env.enemies.length=0;
    const base=state.skirmishAnchor;for(let i=2;i<4;i++){const unit=env.squad[i];if(!unit)continue;unit.x=base.x+(i===2?-14:14);unit.y=base.y+(i===2?-10:10);unit.path=null;unit.pendingPath=null;unit.target=null;}
    env.squad.forEach((u,i)=>{if(u){u.arcadeTeam=i<2?1:2;u.manualGarrison=false;u.checkpointCover=false;u.checkpointGarrison=null;}});
    state.initialised=true;setStatus(env,'SKIRMISH · P1 vs P2 · Last team standing');paintHud(state);
  }
  function skirmishHits(state,dt){
    const env=state.env,geometry=root.BadFodderCombatGeometry;if(!geometry?.nearestCharacterHit)return;
    for(const bullet of env.bullets||[]){
      if(!bullet||bullet.life<=0||bullet.owner!=='squad')continue;
      const targets=opposingIndices(bullet.source).map(i=>env.squad[i]).filter(u=>u?.alive!==false);if(!targets.length)continue;
      const ax=bullet.x,ay=bullet.y,bx=ax+bullet.vx*dt,by=ay+bullet.vy*dt,hit=geometry.nearestCharacterHit(ax,ay,bx,by,targets,14);
      if(!hit)continue;const target=hit.target||hit.character||hit.entity;if(!target)continue;
      bullet.x=ax+(bx-ax)*hit.t;bullet.y=ay+(by-ay)*hit.t;bullet.life=0;
      if(typeof root.applyDamage==='function')root.applyDamage(target,1,bullet.x,bullet.y,Number.isInteger(bullet.source)?env.squad[bullet.source]:null);
      else{target.hp=Math.max(0,(Number(target.hp)||1)-1);if(target.hp<=0){target.alive=false;target.state='dead';}}
    }
  }
  function skirmishCompanions(state,dt){
    state.aiClock-=dt;if(state.aiClock>0)return;state.aiClock=.55;
    const env=state.env,bridge=root.BadFodderCoopBridge;if(!bridge?.shootGarrison)return;
    for(const index of [1,3]){
      const unit=env.squad[index];if(!combatReady(unit))continue;
      const opponents=(index<2?env.squad.slice(2,4):env.squad.slice(0,2)).filter(combatReady);if(!opponents.length)continue;
      opponents.sort((a,b)=>Math.hypot(a.x-unit.x,a.y-unit.y)-Math.hypot(b.x-unit.x,b.y-unit.y));const target=opponents[0];
      if(Math.hypot(target.x-unit.x,target.y-unit.y)<=520)bridge.shootGarrison(unit,target);
    }
  }
  function skirmishStep(state,dt){
    if(!state.initialised)initSkirmish(state);state.clock+=dt;skirmishHits(state,dt);skirmishCompanions(state,dt);
    const p1=state.env.squad.slice(0,2).some(combatReady),p2=state.env.squad.slice(2,4).some(combatReady);
    if(!p1||!p2){const title=!p1&&!p2?'DRAW':p1?'PLAYER 1 WINS':'PLAYER 2 WINS';showResult(state,title,'The opposing squad can no longer continue.');}
    paintHud(state);
  }

  function wrapEnvironment(env,state){
    const storyNull=new Set(['missionController','missionInteractionLayer','missionDirector','missionCrowd','badBelzigRuntime','barcelonaRuntime','resistanceRuntime','opportunitiesRuntime']);
    return new Proxy(env,{get(target,prop,receiver){
      const current=mode();state.mode=current||state.mode;
      const arcade=ALLOWED_MODES.has(current);if(!arcade)return Reflect.get(target,prop,receiver);
      if(storyNull.has(prop))return null;
      if(prop==='actionAllowed')return action=>action==='firearms'||action==='grenades'?true:target.actionAllowed(action);
      if(prop==='checkFailure')return()=>{};
      if(prop==='updateMissionProgress')return()=>{};
      if(prop==='updateEnemies')return dt=>{if(state.mode==='resistance')resistanceStep(state,dt);else if(state.mode==='skirmish'&&target.commands?.mode!=='local')skirmishStep(state,dt);target.updateEnemies(dt)};
      if(prop==='updateProjectiles')return dt=>{if(state.mode==='skirmish'&&target.commands?.mode!=='local')skirmishHits(state,dt);target.updateProjectiles(dt)};
      if(prop==='updateHud')return(...args)=>{const value=target.updateHud(...args);paintHud(state);return value};
      return Reflect.get(target,prop,receiver);
    }});
  }
  function patchSimulation(api){
    if(!api||api.__arcadeModesPatched||typeof api.create!=='function')return false;
    const create=api.create;api.create=function(env){const state=createState(env);lastRuntime=state;return create.call(this,wrapEnvironment(env,state))};api.__arcadeModesPatched=true;return true;
  }

  function addResistancePanel(menu){
    if(!root.document||menu.screen.querySelector('[data-view="resistance"]'))return;
    const main=menu.screen.querySelector('[data-view="main"]'),nav=main?.querySelector('.menu-actions'),missionSelect=menu.get('menuMissionSelect'),multiplayer=menu.get('menuMultiplayer');if(!main||!nav||!missionSelect||!multiplayer)return;
    const label=nav.querySelector('span');if(label&&/SINGLE PLAYER/i.test(label.textContent||''))label.textContent='PLAY';
    const resistance=root.document.createElement('button');resistance.id='menuResistance';resistance.className='menu-button';resistance.type='button';resistance.textContent='RESISTANCE';
    nav.insertBefore(missionSelect,multiplayer);nav.insertBefore(resistance,multiplayer);multiplayer.textContent='SKIRMISH MULTIPLAYER';
    const panel=root.document.createElement('div');panel.className='menu-panel menu-card';panel.dataset.view='resistance';panel.hidden=true;
    panel.innerHTML='<h2>RESISTANCE</h2><p class="menu-copy">Choose a map. Survive escalating waves for as long as you can.</p><div class="menu-mission-list" data-resistance-maps></div><button class="menu-button" type="button" data-back>BACK</button>';
    menu.screen.appendChild(panel);const list=panel.querySelector('[data-resistance-maps]');
    for(const map of MAPS){const button=root.document.createElement('button');button.type='button';button.className='menu-button';button.textContent=map.label;button.dataset.arcadeMap=map.key;button.onclick=()=>launchResistance(map.key);list.appendChild(button)}
    resistance.onclick=()=>menu.showPanel('resistance');panel.querySelector('[data-back]').onclick=()=>menu.showPanel('main');
    const clearStandard=()=>clearForStandardPlay();menu.get('menuStart')?.addEventListener('click',clearStandard,true);missionSelect.addEventListener('click',clearStandard,true);
    menu.screen.querySelectorAll('#menuMissionBad,#menuMissionWigan,#menuHistoricalCable,#menuMissionBarcelona').forEach(b=>b.addEventListener('click',clearStandard,true));
    multiplayer.addEventListener('click',()=>write({mode:'skirmish'}),true);
  }
  function patchMenu(Menu){
    if(!Menu||Menu.__arcadeModesPatched)return false;
    class ArcadeMenu extends Menu{constructor(actions){super(actions);addResistancePanel(this)}}
    ArcadeMenu.__arcadeModesPatched=true;root.BadFodderMenu=ArcadeMenu;return true;
  }

  function decodeConnectionCode(text,original){
    if(mode()!=='skirmish')return original(text);
    if(typeof text!=='string'||text.length>70000)throw new Error('INVALID CONNECTION CODE');
    const value=JSON.parse(decodeURIComponent(escape(root.atob(text.trim()))));
    if(value.v!==1||!SKIRMISH_MAPS.some(m=>m.key===value.mission)||!['offer','answer'].includes(value.sdp?.type)||typeof value.sdp.sdp!=='string'||value.sdp.sdp.length>50000||!Number.isFinite(value.expires)||value.expires<Date.now()||value.expires>Date.now()+900000)throw new Error('INVALID OR EXPIRED CONNECTION CODE');
    return value;
  }
  function customiseCoopPanel(){
    if(mode()!=='skirmish'||!root.document)return;const panel=root.document.getElementById('coopPanel');if(!panel)return;
    const heading=panel.querySelector('h2');if(heading)heading.textContent='SKIRMISH MULTIPLAYER';
    const intro=heading?.nextElementSibling;if(intro)intro.textContent='2 PLAYERS · 1 CHARACTER + 1 AI COMPANION EACH · LAST TEAM STANDING';
    const select=panel.querySelector('#coopMission');if(select){const current=root.BadFodderCoopBridge?.map?.();select.replaceChildren(...SKIRMISH_MAPS.map(map=>{const option=root.document.createElement('option');option.value=map.key;option.textContent=map.label;return option}));if(SKIRMISH_MAPS.some(m=>m.key===current))select.value=current;}
  }
  function patchCoop(coop){
    if(!coop||coop.__arcadeModesPatched)return false;coop.__arcadeModesPatched=true;
    if(coop.manual?.decode){const original=coop.manual.decode.bind(coop.manual);coop.manual.decode=text=>decodeConnectionCode(text,original)}
    if(typeof coop.open==='function'){const open=coop.open.bind(coop);coop.open=function(...args){write({mode:'skirmish'});const value=open(...args);customiseCoopPanel();setTimeout(customiseCoopPanel,0);return value}}
    return true;
  }
  function watch(name,patch){
    const descriptor=Object.getOwnPropertyDescriptor(root,name);if(descriptor&&!descriptor.configurable){patch(root[name]);return}
    let value=descriptor&&'value'in descriptor?descriptor.value:root[name];Object.defineProperty(root,name,{configurable:true,enumerable:true,get(){return value},set(next){value=next;patch(next)}});patch(value);
  }
  function install(){patchSimulation(root.BadFodderSimulationRuntime);patchMenu(root.BadFodderMenu);watch('BadFodderCoop',patchCoop);if(!active())hideHud();}
  if(root.document)install();

  return{MODE_KEY,MAPS,SKIRMISH_MAPS,read,write,clear,mode,active,waveSize,teamForSource,opposingIndices,combatReady,launchResistance,patchSimulation,patchMenu,patchCoop,install,get runtime(){return lastRuntime}};
});
