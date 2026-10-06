/* Procedural after-action dispatches and casualty epitaphs. No network or external assets. */
(function(root,factory){
  const api=factory(root||{});
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.BadFodderProceduralDispatch=api;
})(typeof window!=='undefined'?window:globalThis,function(root){
  'use strict';

  const casualtyMeta=new WeakMap();
  const seenDead=new WeakSet();
  let getSquad=()=>[],getEnemies=()=>[],missionStartedAt=0;
  const now=()=>typeof performance!=='undefined'&&performance.now?performance.now()/1000:Date.now()/1000;
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,Number(n)||0));
  const text=(v,fallback)=>String(v??fallback??'').trim();
  const titleCase=s=>text(s).toLowerCase().replace(/(^|[\s_-])\w/g,m=>m.toUpperCase()).replace(/[_-]/g,' ');
  function hash(value){let h=2166136261,s=String(value);for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}
  function pick(pool,key){return pool[hash(key)%pool.length]}
  function formatTime(seconds){const s=Math.max(0,Math.round(Number(seconds)||0));if(s<60)return s+'s';const m=Math.floor(s/60),r=s%60;return r?m+'m '+r+'s':m+'m'}

  function roleOf(data={}){
    const raw=text(data.killingEntityRole||data.killerRole||data.damageRole||data.cause,'RIFLEMAN').toUpperCase();
    if(data.friendlyFire||/FRIEND|CROSS/.test(raw))return'CROSSFIRE';
    if(/GRENADE|EXPLOS|BLAST|SHRAP/.test(raw))return'GRENADE';
    if(/SNIP/.test(raw))return'SNIPER';
    return'RIFLEMAN';
  }
  function landmarkOf(data={}){return text(data.landmark||data.nearestLandmark||data.zoneName||data.zone,'the objective')}

  function generateEpitaph(soldierData={}){
    const role=roleOf(soldierData),landmark=landmarkOf(soldierData),time=formatTime(soldierData.timeElapsed??soldierData.elapsedSeconds);
    const key=[soldierData.name,role,landmark,time].join('|');
    const pools={
      CROSSFIRE:[
        'Tragically lost to squad crossfire in the confusion near {landmark}.',
        'Killed by friendly crossfire during the fighting near {landmark}.'
      ],
      GRENADE:[
        'Killed in action by shrapnel clearing the barricades at {landmark}.',
        'Fell to an explosive blast during the action at {landmark}.'
      ],
      SNIPER:[
        'Killed by precision fire near {landmark} after {time} in action.',
        'Fell to a concealed marksman near {landmark} after {time} in action.'
      ],
      RIFLEMAN:[
        'Fell under concentrated fire near {landmark} after {time} in action.',
        'Killed in the exchange of fire near {landmark} after {time} in action.'
      ]
    };
    return pick(pools[role]||pools.RIFLEMAN,key).replace('{landmark}',landmark).replace('{time}',time);
  }

  function missionSucceeded(missionData={}){
    if(typeof missionData.success==='boolean')return missionData.success;
    if(typeof missionData.won==='boolean')return missionData.won;
    if(typeof missionData.complete==='boolean')return missionData.complete;
    if(typeof missionData.failed==='boolean')return !missionData.failed;
    return true;
  }
  function evaluateOutcome(missionData={},statsData=[],squadRoster=[]){
    const roster=squadRoster.length?squadRoster:statsData;
    const total=Math.max(1,roster.length||statsData.length||1);
    const survivors=roster.filter((u,i)=>u?.alive!==false&&(statsData[i]?.alive!==false)).length;
    const casualties=total-survivors;
    if(survivors===0)return'DISASTER';
    if(!missionSucceeded(missionData))return'ROUT';
    if(survivors<2||casualties/total>.5)return'PYRRHIC_VICTORY';
    return'DECISIVE_VICTORY';
  }
  function generateDebrief(missionData={},statsData=[],squadRoster=[]){
    const rating=evaluateOutcome(missionData,statsData,squadRoster);
    const roster=squadRoster.length?squadRoster:statsData,total=Math.max(1,roster.length||statsData.length||1);
    const survivors=roster.filter((u,i)=>u?.alive!==false&&(statsData[i]?.alive!==false)).length;
    const casualties=total-survivors;
    const kills=statsData.reduce((n,r)=>n+(Number(r?.kills)||0),0),assists=statsData.reduce((n,r)=>n+(Number(r?.assists)||0),0);
    const missionName=text(missionData.title||missionData.name||missionData.location||missionData.key,'the operation');
    const objective=text(missionData.objective||missionData.objectiveText||missionData.summary,'the assigned objective');
    const sentence1=rating==='DISASTER'?`${missionName}: ${objective} ended with the squad destroyed.`
      :rating==='ROUT'?`${missionName}: the squad failed to secure ${objective} and withdrew with ${survivors} survivor${survivors===1?'':'s'}.`
      :`${missionName}: ${objective} was secured.`;
    const sentence2=casualties?`The squad suffered ${casualties} fatal ${casualties===1?'casualty':'casualties'} from ${total} personnel, recording ${kills} confirmed kill${kills===1?'':'s'} and ${assists} assist${assists===1?'':'s'}.`
      :`All ${total} squad members survived, recording ${kills} confirmed kill${kills===1?'':'s'} and ${assists} assist${assists===1?'':'s'}.`;
    const verdict={DECISIVE_VICTORY:'Command commends the unit for disciplined action and preservation of fighting strength.',PYRRHIC_VICTORY:'The objective was taken, but command judges the losses too severe for the result to be considered clean.',DISASTER:'Command records a catastrophic loss of the unit and orders the action reviewed before further deployment.',ROUT:'Command orders regrouping, casualty recovery and a review of the failed approach before another attempt.'}[rating];
    const headline={DECISIVE_VICTORY:'DECISIVE VICTORY',PYRRHIC_VICTORY:'PYRRHIC VICTORY',DISASTER:'UNIT LOST',ROUT:'WITHDRAWAL'}[rating];
    return{headline,body:[sentence1,sentence2,verdict].join(' '),rating};
  }

  function flattenPoints(value,out){
    if(!value)return out;
    if(Array.isArray(value)){for(const item of value)flattenPoints(item,out);return out}
    if(typeof value!=='object')return out;
    const x=Number(value.x??value.cx),y=Number(value.y??value.cy),name=value.name||value.label||value.title||value.id;
    if(Number.isFinite(x)&&Number.isFinite(y)&&name)out.push({x,y,name:String(name)});
    for(const key of ['landmarks','pois','points','zones','objectives','checkpoints'])if(value[key]&&value[key]!==value)flattenPoints(value[key],out);
    return out;
  }
  function nearestLandmark(unit,mission){
    const points=flattenPoints(mission,[]);let best=null,bestD=Infinity;
    for(const p of points){const d=Math.hypot((unit?.x||0)-p.x,(unit?.y||0)-p.y);if(d<bestD){bestD=d;best=p}}
    return best?.name||mission?.location||mission?.title||'the objective';
  }
  function inferKiller(unit){
    const last=casualtyMeta.get(unit)||{};
    if(last.role)return last.role;
    if(unit?.lastHitSide==='friendly')return'CROSSFIRE';
    let nearest=null,d=Infinity;
    for(const e of safe(getEnemies)){if(!e||e.alive===false)continue;const n=Math.hypot((unit?.x||0)-(e.x||0),(unit?.y||0)-(e.y||0));if(n<d){d=n;nearest=e}}
    return nearest?.combatRole==='SNIPER'?'SNIPER':nearest?.combatRole||'RIFLEMAN';
  }
  function safe(fn){try{return fn?.()||[]}catch(_){return[]}}
  function activeMissionSafe(){try{return typeof root.activeMission==='function'?root.activeMission():{}}catch(_){return{}}}
  function recordDeaths(){
    const mission=activeMissionSafe(),elapsed=Math.max(0,now()-missionStartedAt);
    for(const unit of safe(getSquad)){
      if(!unit||unit.alive!==false||seenDead.has(unit))continue;
      seenDead.add(unit);const old=casualtyMeta.get(unit)||{};
      casualtyMeta.set(unit,{...old,name:unit.name||'Squad member',rank:unit.rank||'Volunteer',killingEntityRole:inferKiller(unit),landmark:old.landmark||nearestLandmark(unit,mission),timeElapsed:old.timeElapsed??elapsed});
    }
  }
  function casualtySnapshot(){recordDeaths();return safe(getSquad).map((unit,index)=>({index,name:unit?.name||('Soldier '+(index+1)),rank:unit?.rank||'Volunteer',alive:unit?.alive!==false,...(casualtyMeta.get(unit)||{})}));}
  function runtimeDebrief(extraMission={}){
    const mission={...activeMissionSafe(),...extraMission};
    const stats=root.BadFodderMissionStats?.snapshot?.()||[];
    return generateDebrief(mission,stats,casualtySnapshot());
  }

  function annotateDamage(target,amount,hitX,hitY,source){
    if(!target)return;
    const blastDistance=Math.hypot((target.x||0)-(Number(hitX)||0),(target.y||0)-(Number(hitY)||0));
    const role=target.lastHitSide==='friendly'?'CROSSFIRE':blastDistance>4?'GRENADE':null;
    const previous=casualtyMeta.get(target)||{};
    casualtyMeta.set(target,{...previous,role:role||previous.role,damageAmount:Number(amount)||0,source,timeElapsed:Math.max(0,now()-missionStartedAt)});
  }
  function patchHealth(health){
    if(!health||health.__proceduralDispatchPatched||typeof health.handleDamage!=='function')return false;
    const original=health.handleDamage;
    health.handleDamage=function(target,amount,hitX,hitY,source){annotateDamage(target,amount,hitX,hitY,source);return original.call(this,target,amount,hitX,hitY,source)};
    health.__proceduralDispatchPatched=true;return true;
  }
  function patchStats(stats){
    if(!stats||stats.__proceduralDispatchPatched)return false;
    if(typeof stats.begin==='function'){
      const begin=stats.begin;stats.begin=function(squadGetter,enemyGetter){getSquad=squadGetter||getSquad;getEnemies=enemyGetter||getEnemies;missionStartedAt=now();return begin.apply(this,arguments)};
    }
    if(typeof stats.tick==='function'){
      const tick=stats.tick;stats.tick=function(){const result=tick.apply(this,arguments);recordDeaths();return result};
    }
    stats.casualtySnapshot=casualtySnapshot;stats.generateDebrief=runtimeDebrief;stats.__proceduralDispatchPatched=true;return true;
  }
  function renderDispatch(identity,won){
    if(!root.document)return;recordDeaths();
    const anchor=root.document.querySelector('.mission-stat-report')||root.document.getElementById('resultFlavour');if(!anchor)return;
    anchor.parentElement?.querySelector('.procedural-dispatch-report')?.remove();
    const mission={...activeMissionSafe(),title:identity?.title||identity?.location||activeMissionSafe().title,success:!!won};
    const report=generateDebrief(mission,root.BadFodderMissionStats?.snapshot?.()||[],casualtySnapshot());
    const section=root.document.createElement('section');section.className='procedural-dispatch-report';section.style.cssText='margin:10px 0 4px;padding:12px 14px;border:1px solid #5c5848;background:#1d211c;color:#d9cfb2;text-align:left;font:600 11px/1.45 system-ui,sans-serif';
    const head=root.document.createElement('strong');head.textContent='AFTER-ACTION DISPATCH · '+report.headline;head.style.cssText='display:block;color:#f0dfaa;letter-spacing:.12em;margin-bottom:7px';
    const body=root.document.createElement('div');body.textContent=report.body;section.append(head,body);
    const casualties=casualtySnapshot().filter(c=>!c.alive);for(const c of casualties){const line=root.document.createElement('div');line.style.cssText='margin-top:7px;color:#bcae8e';line.textContent=(c.rank?c.rank+' ':'')+c.name+': '+generateEpitaph(c);section.appendChild(line)}
    anchor.insertAdjacentElement('afterend',section);root.BadFodderLastDispatch=report;
  }
  function patchMenu(Menu){
    if(!Menu?.prototype||Menu.prototype.__proceduralDispatchPatched||typeof Menu.prototype.showResult!=='function')return false;
    const original=Menu.prototype.showResult;Menu.prototype.showResult=function(identity,won,next){const result=original.apply(this,arguments);renderDispatch(identity,won);return result};
    Menu.prototype.__proceduralDispatchPatched=true;return true;
  }
  function chainProperty(name,patch){
    const d=Object.getOwnPropertyDescriptor(root,name);if(d&&!d.configurable){patch(root[name]);return}
    if(d&&(d.get||d.set)){const g=d.get,s=d.set;Object.defineProperty(root,name,{configurable:true,enumerable:d.enumerable!==false,get(){return g?g.call(root):undefined},set(v){s?.call(root,v);patch(g?g.call(root):v)}});patch(g?g.call(root):undefined);return}
    let value=d&&'value'in d?d.value:root[name];Object.defineProperty(root,name,{configurable:true,enumerable:true,get(){return value},set(v){value=v;patch(v)}});patch(value);
  }
  missionStartedAt=now();
  chainProperty('BadFodderHealth',patchHealth);chainProperty('BadFodderMissionStats',patchStats);chainProperty('BadFodderMenu',patchMenu);if(root.document)root.document.addEventListener('DOMContentLoaded',()=>{patchHealth(root.BadFodderHealth);patchStats(root.BadFodderMissionStats);patchMenu(root.BadFodderMenu)},{once:true});
  return{generateEpitaph,generateDebrief,evaluateOutcome,casualtySnapshot,runtimeDebrief,recordDeaths,formatTime};
});
