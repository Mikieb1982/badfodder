/* Deterministic ambient crowd layer for Cable Street.
   Crowd placement is derived from the approved runtime barricade geometry. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.BadFodderCableCrowd=api;
})(typeof window!=='undefined'?window:globalThis,function(){
  'use strict';

  function clamp(n,min,max){return Math.max(min,Math.min(max,n))}
  function finitePoint(v){return !!v&&Number.isFinite(v.x)&&Number.isFinite(v.y)}
  function centerOf(points){
    if(!Array.isArray(points)||!points.length)return null;
    let x=0,y=0,n=0;
    for(const p of points){
      if(!Array.isArray(p)||!Number.isFinite(p[0])||!Number.isFinite(p[1]))continue;
      x+=p[0];y+=p[1];n++;
    }
    return n?{x:x/n,y:y/n}:null;
  }
  function hashSeed(value){
    const s=String(value||'cable-street-1936');
    let h=2166136261>>>0;
    for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}
    return h>>>0;
  }
  function rng(seed){
    let x=seed>>>0||1;
    return function(){
      x^=x<<13;x^=x>>>17;x^=x<<5;
      return(x>>>0)/4294967296;
    };
  }

  function create({mission,controller,worldWidth,worldHeight,blocked=null,seed='1936-10-04',options={}}={}){
    if(!mission||mission.id!=='cable-street-1936')throw new Error('Cable Street crowd requires the historical mission.');
    if(!controller||!controller.state)throw new Error('Cable Street crowd requires a mission controller.');
    if(!Number.isFinite(worldWidth)||worldWidth<=0||!Number.isFinite(worldHeight)||worldHeight<=0){
      throw new Error('Cable Street crowd requires finite world bounds.');
    }
    const reactive=Math.max(0,mission.crowdBudget&&mission.crowdBudget.reactiveCivilians|0);
    const helpers=Math.max(0,mission.crowdBudget&&mission.crowdBudget.functionalHelpers|0);
    const settings={
      innerRadius:Number.isFinite(options.innerRadius)?options.innerRadius:52,
      outerRadius:Number.isFinite(options.outerRadius)?options.outerRadius:150,
      policeAvoidRadius:Number.isFinite(options.policeAvoidRadius)?options.policeAvoidRadius:120,
      edgePadding:Number.isFinite(options.edgePadding)?options.edgePadding:18,
      ...options
    };
    const random=rng(hashSeed(seed));
    const people=[];
    let elapsed=0;

    function mainBarricade(){
      const preferred=(mission.defencePositions||[]).find(x=>x.role==='christian-street-defence');
      if(preferred&&controller.state.barricades.has(preferred.id))return controller.state.barricades.get(preferred.id);
      return controller.state.barricades.values().next().value||null;
    }

    function anchor(){
      const b=mainBarricade();
      if(!b)return{x:worldWidth/2,y:worldHeight/2};
      if(finitePoint(b))return{x:b.x,y:b.y};
      return centerOf(b.points)||{x:worldWidth/2,y:worldHeight/2};
    }

    function openPoint(x,y,r=5){
      const px=clamp(x,settings.edgePadding,worldWidth-settings.edgePadding);
      const py=clamp(y,settings.edgePadding,worldHeight-settings.edgePadding);
      if(typeof blocked==='function'&&blocked(px,py,r))return null;
      return{x:px,y:py};
    }

    function spawnPoint(index,isHelper){
      const a=anchor();
      const inner=isHelper?settings.innerRadius*.65:settings.innerRadius;
      const outer=isHelper?settings.outerRadius*.62:settings.outerRadius;
      for(let attempt=0;attempt<40;attempt++){
        const angle=random()*Math.PI*2+(index%5)*.11;
        const radius=inner+(outer-inner)*Math.sqrt(random());
        const p=openPoint(a.x+Math.cos(angle)*radius,a.y+Math.sin(angle)*radius,4);
        if(p)return p;
      }
      return openPoint(a.x+(index%7-3)*10,a.y+(Math.floor(index/7)%5-2)*10,3)||a;
    }

    function initialize(){
      people.length=0;
      const total=reactive+helpers;
      for(let i=0;i<total;i++){
        const helper=i>=reactive;
        const p=spawnPoint(i,helper);
        people.push({
          id:(helper?'helper-':'crowd-')+(helper?i-reactive:i),
          role:helper?'helper':'resident',
          x:p.x,y:p.y,homeX:p.x,homeY:p.y,
          phase:random()*Math.PI*2,
          speed:(helper?22:18)+random()*10,
          variant:i%6,
          dir:random()*Math.PI*2
        });
      }
      return people;
    }

    function closestFormation(person){
      let best=null,bestD=Infinity;
      controller.state.formations.forEach(f=>{
        if(!finitePoint(f)||f.state==='withdraw')return;
        const d=Math.hypot(person.x-f.x,person.y-f.y);
        if(d<bestD){best=f;bestD=d}
      });
      return{formation:best,distance:bestD};
    }

    function updatePerson(person,dt,confidence){
      const a=anchor();
      const pressure=closestFormation(person);
      let tx=person.homeX,ty=person.homeY;

      if(pressure.formation&&pressure.distance<settings.policeAvoidRadius){
        const dx=person.x-pressure.formation.x,dy=person.y-pressure.formation.y;
        const d=Math.hypot(dx,dy)||1;
        const push=(settings.policeAvoidRadius-pressure.distance)*.65;
        tx+=dx/d*push;ty+=dy/d*push;
      }

      const adx=person.homeX-a.x,ady=person.homeY-a.y,ad=Math.hypot(adx,ady)||1;
      const confidenceShift=(confidence-.5)*(person.role==='helper'?24:14);
      tx-=adx/ad*confidenceShift;
      ty-=ady/ad*confidenceShift;

      tx+=Math.cos(elapsed*.7+person.phase)*5;
      ty+=Math.sin(elapsed*.6+person.phase)*4;
      tx=clamp(tx,settings.edgePadding,worldWidth-settings.edgePadding);
      ty=clamp(ty,settings.edgePadding,worldHeight-settings.edgePadding);

      const dx=tx-person.x,dy=ty-person.y,d=Math.hypot(dx,dy);
      if(d<.5)return;
      const step=Math.min(d,person.speed*dt);
      const nx=person.x+dx/d*step,ny=person.y+dy/d*step;
      if(typeof blocked!=='function'||!blocked(nx,ny,4)){
        person.x=nx;person.y=ny;person.dir=Math.atan2(dy,dx);
      }
    }

    function fixedUpdate(dt){
      if(!Number.isFinite(dt)||dt<=0)return false;
      elapsed+=dt;
      const confidence=clamp(Number(controller.state.confidence)||0,0,1);
      for(const person of people)updatePerson(person,dt,confidence);
      return true;
    }

    function renderState(){
      return people.map(p=>({...p}));
    }

    initialize();
    return{settings,people,fixedUpdate,renderState,anchor,initialize};
  }

  return{create};
});
