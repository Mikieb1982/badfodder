/* Squad casualty acknowledgement + per-soldier mission statistics. */
(function(root){
  'use strict';
  let runtimeGetSquad=null,runtimeGetEnemies=null,squad=[],enemies=[],records=[];
  let enemyAlive=new WeakMap(),lastCasualty=new WeakSet();

  function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]))}
  function injectStyle(){
    if(!root.document||root.document.getElementById('missionStatsStyle'))return;
    const s=root.document.createElement('style');s.id='missionStatsStyle';s.textContent=`
      .casualty-callout{position:absolute;inset:0;z-index:12;display:grid;place-items:center;pointer-events:none;background:radial-gradient(circle at center,rgba(12,12,10,.12),rgba(8,8,7,.62));animation:casualtyFade 1.75s ease forwards}
      .casualty-card{display:grid;grid-template-columns:76px 1fr;gap:14px;align-items:center;min-width:min(420px,84%);padding:14px 18px;background:rgba(29,27,22,.94);border:1px solid #9f8960;box-shadow:0 8px 30px #0009,inset 0 0 0 1px #302b22;text-shadow:0 1px 2px #000}
      .casualty-card canvas{width:76px;height:76px;filter:grayscale(.8) contrast(1.08);border:1px solid #8b7a5d;background:#1b201a}.casualty-card small{display:block;color:#c4b68e;font:800 9px system-ui,sans-serif;letter-spacing:.18em;margin-bottom:4px}.casualty-card strong{display:block;color:#f0e4c2;font:900 20px/1.05 system-ui,sans-serif}.casualty-card span{display:block;color:#b7aa8b;font:700 11px system-ui,sans-serif;margin-top:5px}@keyframes casualtyFade{0%{opacity:0}8%,72%{opacity:1}100%{opacity:0}}
      .mission-stat-report{margin:14px 0 4px;padding-top:12px;border-top:1px solid #5c5848}.mission-stat-heading{text-align:center;color:#d7c894;font:800 10px system-ui,sans-serif;letter-spacing:.18em;margin:0 0 10px}.mission-stat-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}.mission-stat-card{position:relative;text-align:center;padding:8px 6px;background:#20251f;border:1px solid #555c49;min-width:0}.mission-stat-card.kia{background:#201c1a;border-color:#675044}.mission-stat-portrait{position:relative;width:76px;height:76px;margin:0 auto 7px}.mission-stat-portrait canvas{width:76px;height:76px;border:1px solid #77705a;background:#1a211b}.mission-stat-card.kia canvas{filter:grayscale(1) brightness(.62)}.mission-stat-cross{display:none;position:absolute;inset:0;align-items:center;justify-content:center;color:#d8c8a7;font:900 56px/1 Georgia,serif;text-shadow:0 2px 4px #000}.mission-stat-card.kia .mission-stat-cross{display:flex}.mission-stat-name{display:block;color:#eee5ca;font:800 10px system-ui,sans-serif;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.mission-stat-kills{display:block;margin-top:4px;color:#c8bd9c;font:700 9px system-ui,sans-serif;letter-spacing:.08em}.mission-stat-kills b{color:#f2d989;font-size:16px;margin-left:3px}.mission-stat-kia{display:block;height:12px;margin-top:3px;color:#bd8d76;font:900 8px system-ui,sans-serif;letter-spacing:.12em}
      @media(max-width:620px){.mission-stat-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.casualty-card{grid-template-columns:58px 1fr}.casualty-card canvas{width:58px;height:58px}.casualty-card strong{font-size:16px}}@media(prefers-reduced-motion:reduce){.casualty-callout{animation:none;opacity:1}}
    `;root.document.head.appendChild(s);
  }

  function capture(){try{squad=runtimeGetSquad?.()||squad;enemies=runtimeGetEnemies?.()||enemies}catch(_){ }return{squad,enemies}}
  function begin(getSquad,getEnemies){
    runtimeGetSquad=getSquad||runtimeGetSquad;runtimeGetEnemies=getEnemies||runtimeGetEnemies;capture();
    records=squad.map((u,i)=>({unit:u,index:i,name:u.name||('Soldier '+(i+1)),kills:0,alive:u.alive!==false}));
    enemyAlive=new WeakMap();lastCasualty=new WeakSet();enemies.forEach(e=>enemyAlive.set(e,e.alive!==false));
  }
  function candidateKiller(enemy){
    const living=squad.filter(s=>s?.alive!==false);let best=null,bestScore=-Infinity;
    for(const s of living){const d=Math.max(1,Math.hypot((enemy.x||0)-(s.x||0),(enemy.y||0)-(s.y||0)));let score=260/d;if((s.fireTimer||0)>0)score+=7;if((s.flash||0)>0)score+=3;if((s.throwTimer||0)>0)score+=8;if((s.garrisonTracerFrames||0)>0)score+=9;const dir=Math.atan2((enemy.y||0)-(s.y||0),(enemy.x||0)-(s.x||0));const da=Math.abs((((dir-(s.dir||0))+Math.PI*3)%(Math.PI*2))-Math.PI);score+=Math.max(0,2-da);if(score>bestScore){bestScore=score;best=s}}return best;
  }
  function creditKill(enemy){const killer=candidateKiller(enemy);const rec=records.find(r=>r.unit===killer);if(rec)rec.kills++}
  function currentMissionKey(){const title=root.document?.querySelector('#resultLocation,#briefingTitle')?.textContent||'';if(/wigan/i.test(title))return'wigan';if(/cable/i.test(title))return'cable-street-1936';return'bad-belzig'}

  function paintRealPortrait(canvas,key,index,state='idle'){
    if(!canvas)return Promise.resolve(false);
    const art=root.BadFodderArt;if(!art?.preloadMissionArt||!art?.missionPortrait)return Promise.resolve(false);
    return Promise.resolve(art.preloadMissionArt(key)).then(()=>{
      try{
        const image=art.missionPortrait(key,index,state);if(!image)return false;
        const g=canvas.getContext('2d');g.clearRect(0,0,canvas.width,canvas.height);g.drawImage(image,0,0,canvas.width,canvas.height);
        canvas.dataset.portraitSource='assets/characters/portraits-1936-1945.png';return true;
      }catch(_){return false}
    }).catch(()=>false);
  }

  function showCasualty(rec){
    if(!root.document)return;injectStyle();const viewport=root.document.querySelector('.viewport');if(!viewport)return;viewport.querySelector('.casualty-callout')?.remove();
    const o=root.document.createElement('div');o.className='casualty-callout';o.setAttribute('role','status');o.setAttribute('aria-live','assertive');const card=root.document.createElement('div');card.className='casualty-card';const portrait=root.document.createElement('canvas');portrait.width=96;portrait.height=96;
    paintRealPortrait(portrait,currentMissionKey(),rec.index,'dead');
    const text=root.document.createElement('div');text.innerHTML='<small>MAN DOWN</small><strong>'+esc(rec.name)+'</strong><span>KILLED IN ACTION</span>';card.append(portrait,text);o.appendChild(card);viewport.appendChild(o);setTimeout(()=>o.remove(),1800);
  }
  function casualty(unit){const rec=records.find(r=>r.unit===unit);if(rec)rec.alive=false;if(lastCasualty.has(unit))return;lastCasualty.add(unit);showCasualty(rec||{unit,name:unit.name||'Squad member',index:squad.indexOf(unit)})}
  function tick(){
    capture();if(records.length!==squad.length||records.some((r,i)=>r.unit!==squad[i]))begin(runtimeGetSquad,runtimeGetEnemies);
    enemies.forEach(e=>{const was=enemyAlive.get(e),now=e.alive!==false;if(was===true&&!now)creditKill(e);enemyAlive.set(e,now)});
    squad.forEach(u=>{const rec=records.find(r=>r.unit===u);if(rec&&rec.alive&&u.alive===false)casualty(u)});
  }
  function snapshot(){capture();return records.map((r,i)=>({index:i,name:r.name,kills:r.kills,alive:r.unit?.alive!==false}))}
  function renderResult(identity){
    if(!root.document)return;injectStyle();tick();const anchor=root.document.getElementById('resultFlavour');if(!anchor)return;anchor.parentElement?.querySelector('.mission-stat-report')?.remove();
    const key=identity?.key||currentMissionKey();
    try{root.BadFodderArt?.preloadMissionArt?.(key)}catch(_){ }
    const report=root.document.createElement('section');report.className='mission-stat-report';report.setAttribute('aria-label','Squad mission statistics');const h=root.document.createElement('div');h.className='mission-stat-heading';h.textContent='SQUAD REPORT';report.appendChild(h);const grid=root.document.createElement('div');grid.className='mission-stat-grid';
    snapshot().forEach(r=>{const card=root.document.createElement('div');card.className='mission-stat-card'+(r.alive?'':' kia');const p=root.document.createElement('div');p.className='mission-stat-portrait';const c=root.document.createElement('canvas');c.width=112;c.height=112;paintRealPortrait(c,key,r.index,r.alive?'idle':'dead');const cross=root.document.createElement('span');cross.className='mission-stat-cross';cross.textContent='✕';p.append(c,cross);const name=root.document.createElement('strong');name.className='mission-stat-name';name.textContent=r.name;const kills=root.document.createElement('span');kills.className='mission-stat-kills';kills.innerHTML='KILLS <b>'+r.kills+'</b>';const status=root.document.createElement('span');status.className='mission-stat-kia';status.textContent=r.alive?'SURVIVED':'KIA';card.append(p,name,kills,status);grid.appendChild(card)});
    report.appendChild(grid);anchor.insertAdjacentElement('afterend',report);
  }
  function patchAdaptive(adaptive=root.BadFodderAdaptive){
    if(!adaptive||adaptive.__missionStatsPatched||typeof adaptive.createCommander!=='function')return false;const create=adaptive.createCommander;
    adaptive.createCommander=function(options={}){begin(options.getSquad,options.getEnemies);const commander=create.call(this,options),maintain=commander.maintain?.bind(commander);commander.maintain=function(time){const result=maintain?maintain(time):undefined;tick();return result};return commander};adaptive.__missionStatsPatched=true;return true;
  }
  function patchMenu(Menu=root.BadFodderMenu){
    if(!Menu?.prototype||Menu.prototype.__missionStatsPatched||typeof Menu.prototype.showResult!=='function')return false;const original=Menu.prototype.showResult;
    Menu.prototype.showResult=function(identity,won,next){const result=original.call(this,identity,won,next);root.BadFodderMissionStats?.renderResult(identity);return result};Menu.prototype.__missionStatsPatched=true;return true;
  }
  function chainProperty(name,patch){
    const d=Object.getOwnPropertyDescriptor(root,name);if(d&&!d.configurable){patch(root[name]);return}if(d&&(d.get||d.set)){const g=d.get,s=d.set;Object.defineProperty(root,name,{configurable:true,enumerable:d.enumerable!==false,get(){return g?g.call(root):undefined},set(v){s?.call(root,v);patch(g?g.call(root):v)}});patch(g?g.call(root):undefined);return}let v=d&&'value'in d?d.value:root[name];Object.defineProperty(root,name,{configurable:true,enumerable:true,get(){return v},set(n){v=n;patch(n)}});patch(v);
  }
  root.BadFodderMissionStats={begin,tick,snapshot,renderResult,paintRealPortrait,patchAdaptive,patchMenu};injectStyle();chainProperty('BadFodderAdaptive',patchAdaptive);chainProperty('BadFodderMenu',patchMenu);
})(typeof window!=='undefined'?window:globalThis);
