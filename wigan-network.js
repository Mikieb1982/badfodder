/* Visible Wigan resistance network. Uses the existing mission fact store and civilian renderer. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root){root.BadFodderWiganNetwork=api;if(typeof window!=='undefined')api.install(root);}
})(typeof window!=='undefined'?window:globalThis,function(){
  'use strict';
  const ACTIVE_RAIL=new Set(['CONTACTED','CONNECTED']);
  let activeRuntime=null;

  function create({map,objectives,getSquad=()=>[],getEnemies=()=>[],navigation,scale=1,status=()=>{}}={}){
    if(!map?.pois||!objectives?.facts||!navigation)throw new Error('Wigan network requires map, objectives and navigation.');
    const actors=[];
    let clock=0,busNotice=false;
    const fact=key=>objectives.facts.get(key);
    const setFact=(key,value)=>{if(fact(key)!==value)objectives.facts.set(key,value)};
    const point=key=>{
      const poi=map.pois[key],zone=map.zones?.[key],p=poi?.approach||(zone?[zone.x,zone.y]:null);
      return p?{x:p[0]*scale,y:p[1]*scale}:null;
    };
    const clearAround=(p,r)=>!(getEnemies()||[]).some(e=>e.alive&&!e.surrendered&&!e.missionDormant&&Math.hypot(e.x-p.x,e.y-p.y)<r);
    function safePoint(key,ox=0,oy=0){
      const p=point(key);if(!p)return null;
      for(const [dx,dy] of [[ox,oy],[oy,-ox],[-ox,-oy],[-oy,ox],[0,0]]){
        const x=p.x+dx*scale,y=p.y+dy*scale;if(!navigation.obstacleAt?.(x,y,5*scale))return{x,y};
      }
      return p;
    }
    function actor(id,kind,key,variant,ox=0,oy=0){
      const p=safePoint(key,ox,oy)||{x:0,y:0};
      const a={id,networkActor:true,networkKind:kind,networkNode:key,team:'civilian',active:false,alive:false,storyVisible:true,civilianState:'EVACUATED',
        x:p.x,y:p.y,homeX:p.x,homeY:p.y,hp:1,maxHp:1,variant:variant%4,dir:(variant%4)*Math.PI*.5,anim:variant*.43,state:'idle',path:null,pathIndex:0,pause:0,routeKey:'',routeIndex:0,routeDirection:1};
      actors.push(a);return a;
    }

    const volunteers={
      tudor:[actor('wigan-vol-tudor-a','volunteer','tudor',0,-13,8),actor('wigan-vol-tudor-b','volunteer','tudor',1,14,7)],
      busStation:[actor('wigan-vol-bus-a','volunteer','busStation',2,-19,7),actor('wigan-vol-bus-b','volunteer','busStation',3,0,12),actor('wigan-vol-bus-c','volunteer','busStation',0,19,7)],
      market:[actor('wigan-vol-market-a','volunteer','market',1,-13,9),actor('wigan-vol-market-b','volunteer','market',2,14,8)],
      grandArcade:[actor('wigan-vol-arcade-a','volunteer','grandArcade',3,-12,8),actor('wigan-vol-arcade-b','volunteer','grandArcade',0,13,9)],
      kingStreet:[actor('wigan-vol-king-a','volunteer','kingStreet',1,-13,8),actor('wigan-vol-king-b','volunteer','kingStreet',2,13,8)],
      wallgate:[actor('wigan-vol-wallgate-a','volunteer','wallgate',3,-13,8),actor('wigan-vol-wallgate-b','volunteer','wallgate',0,13,8)]
    };
    volunteers.busStation[0].networkBusAnchor=true;
    const runners=[actor('wigan-runner-a','runner','tudor',1),actor('wigan-runner-b','runner','market',3)];
    const traffic=[
      actor('wigan-civic-bus-a','civilian','busStation',0,-8,0),actor('wigan-civic-bus-b','civilian','busStation',2,8,0),
      actor('wigan-civic-centre','civilian','market',1),actor('wigan-civic-rail','civilian','grandArcade',3)
    ];

    function nodeActive(key){
      switch(key){
        case 'tudor':return fact('tudor_group')==='CONNECTED';
        case 'busStation':return fact('bus_group')!=='ISOLATED';
        case 'market':return fact('market_group')==='CONNECTED';
        case 'grandArcade':return fact('grand_arcade_status')==='HELD';
        case 'kingStreet':return fact('king_group')==='CONNECTED';
        case 'wallgate':return ACTIVE_RAIL.has(fact('railway_group'));
        default:return false;
      }
    }
    function setActive(a,value){a.active=!!value;a.alive=!!value;if(!value){navigation.cancelPath?.(a);a.path=null;a.state='idle'}}
    function showVolunteers(){for(const [key,list] of Object.entries(volunteers))for(const a of list)setActive(a,nodeActive(key))}
    function route(keys){return keys.filter(k=>nodeActive(k)&&point(k))}
    function setRoute(a,keys){
      const signature=keys.join('|');if(a.routeKey===signature)return;
      a.routeKey=signature;a.path=null;a.pathIndex=0;a.pause=0;a.routeIndex=0;a.routeDirection=1;
      if(keys.length){const p=safePoint(keys[0]);if(p){a.x=p.x;a.y=p.y;a.homeX=p.x;a.homeY=p.y}}
    }
    function nextRouteIndex(a,length){
      if(length<2)return 0;let next=a.routeIndex+a.routeDirection;
      if(next>=length){a.routeDirection=-1;next=length-2}else if(next<0){a.routeDirection=1;next=1}
      return Math.max(0,next);
    }
    function moveRouteActor(a,keys,dt,speed){
      setRoute(a,keys);setActive(a,keys.length>=2);if(!a.active)return;
      if(a.pause>0){a.pause=Math.max(0,a.pause-dt);a.state='idle';return}
      const targetKey=keys[nextRouteIndex(a,keys.length)],target=safePoint(targetKey);if(!target){a.state='idle';return}
      if(!a.path&&navigation.assignPath(a,target.x,target.y)===false){a.pause=.7;a.state='idle';return}
      const moving=!!a.path&&navigation.followPath(a,speed,dt);a.state=moving?'walk':'idle';
      if(!a.path&&Math.hypot(a.x-target.x,a.y-target.y)<22*scale){a.routeIndex=nextRouteIndex(a,keys.length);a.pause=a.networkKind==='runner'?.55:1.4}
    }
    function updateBusEncounter(){
      const bus=point('busStation'),state=fact('bus_group');if(!bus||state!=='CONTACTED')return;
      const near=(getSquad()||[]).some(s=>s.alive&&!s.downed&&Math.hypot(s.x-bus.x,s.y-bus.y)<82*scale);
      if(near&&clearAround(bus,92*scale)){
        setFact('bus_group','MUSTERED');
        if(!busNotice){busNotice=true;status('Bus Station group contacted. Their runners can move once the town-centre route opens.',2.4)}
      }
    }
    function update(dt){
      clock+=dt;updateBusEncounter();showVolunteers();
      const centralOpen=fact('market_group')==='CONNECTED';
      moveRouteActor(runners[0],route(['tudor','busStation','market','grandArcade']),dt,116);
      moveRouteActor(runners[1],route(['market','grandArcade','kingStreet','wallgate']),dt,110);
      moveRouteActor(traffic[0],centralOpen?route(['busStation','market']):[],dt,58);
      moveRouteActor(traffic[1],centralOpen?route(['busStation','market','grandArcade']):[],dt,55);
      moveRouteActor(traffic[2],centralOpen?route(['market','grandArcade','kingStreet']):[],dt,52);
      const railOpen=['RESTORED','COORDINATED'].includes(fact('network_status'))||fact('railway_group')==='CONNECTED';
      moveRouteActor(traffic[3],railOpen?route(['grandArcade','wallgate']):[],dt,54);
      for(const list of Object.values(volunteers))for(const a of list)if(a.active){a.state='idle';a.dir+=Math.sin(clock*.45+a.variant)*dt*.06}
    }
    function drawWorld(ctx,time=clock){
      const bus=point('busStation'),state=fact('bus_group');if(!bus||state==='ISOLATED'||state==='CONNECTED')return;
      const pulse=.72+Math.sin(time*3)*.12;
      ctx.save();ctx.globalAlpha=pulse;ctx.setLineDash([7*scale,7*scale]);ctx.strokeStyle='rgba(244,234,198,.78)';ctx.lineWidth=1.4;
      ctx.beginPath();ctx.arc(bus.x,bus.y,34*scale,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);
      ctx.globalAlpha=1;ctx.fillStyle='rgba(35,45,40,.88)';ctx.fillRect(bus.x-29*scale,bus.y-50*scale,58*scale,12*scale);
      ctx.strokeStyle='rgba(244,234,198,.88)';ctx.strokeRect(bus.x-29*scale,bus.y-50*scale,58*scale,12*scale);
      ctx.fillStyle='#f4eac6';ctx.font='700 '+(5.2*scale)+'px system-ui,sans-serif';ctx.textAlign='center';ctx.fillText(state==='MUSTERED'?'BUS GROUP READY':'BUS STATION GROUP',bus.x,bus.y-41*scale);
      ctx.fillStyle='#655d4d';ctx.fillRect(bus.x-20*scale,bus.y+15*scale,8*scale,5*scale);ctx.fillRect(bus.x-9*scale,bus.y+17*scale,7*scale,4*scale);
      ctx.strokeStyle='#4a453b';ctx.lineWidth=1.2*scale;ctx.strokeRect(bus.x-20*scale,bus.y+15*scale,8*scale,5*scale);ctx.strokeRect(bus.x-9*scale,bus.y+17*scale,7*scale,4*scale);
      ctx.beginPath();ctx.moveTo(bus.x+9*scale,bus.y+17*scale);ctx.lineTo(bus.x+22*scale,bus.y+13*scale);ctx.lineTo(bus.x+24*scale,bus.y+20*scale);ctx.stroke();
      ctx.beginPath();ctx.arc(bus.x+12*scale,bus.y+21*scale,2.5*scale,0,Math.PI*2);ctx.arc(bus.x+22*scale,bus.y+21*scale,2.5*scale,0,Math.PI*2);ctx.stroke();ctx.restore();
    }
    function drawActor(ctx,a){
      if(!a?.networkActor||!a.active)return;
      ctx.save();
      if(a.networkKind==='runner'){
        ctx.strokeStyle='#eadfc1';ctx.lineWidth=1.3;ctx.beginPath();ctx.moveTo(a.x-5*scale,a.y-19*scale);ctx.lineTo(a.x+5*scale,a.y-7*scale);ctx.stroke();
        ctx.fillStyle='#675542';ctx.fillRect(a.x+2*scale,a.y-11*scale,6*scale,5*scale);ctx.strokeStyle='#2b302b';ctx.strokeRect(a.x+2*scale,a.y-11*scale,6*scale,5*scale);
      }else if(a.networkKind==='volunteer'){
        ctx.fillStyle='#eee6ce';ctx.fillRect(a.x-8*scale,a.y-15*scale,4*scale,2*scale);
      }
      ctx.restore();
    }
    function snapshot(){return{busGroup:fact('bus_group'),networkStatus:fact('network_status'),active:actors.filter(a=>a.active).map(a=>({id:a.id,kind:a.networkKind,node:a.networkNode,x:a.x,y:a.y,state:a.state})),runners:runners.filter(a=>a.active).length,civilians:traffic.filter(a=>a.active).length,volunteers:Object.fromEntries(Object.entries(volunteers).map(([k,v])=>[k,v.filter(a=>a.active).length]))}}
    function dispose(){for(const a of actors)setActive(a,false)}
    showVolunteers();
    return{actors,update,drawWorld,drawActor,snapshot,dispose,point};
  }

  function install(root){
    const civiliansApi=root.BadFodderCivilians,art=root.BadFodderArt;
    if(!civiliansApi?.create||!art?.drawActor)return false;
    if(!civiliansApi.__wiganNetworkPatched){
      const originalCreate=civiliansApi.create.bind(civiliansApi);
      civiliansApi.create=function(options={}){
        const runtime=originalCreate(options),objectives=root.BadFodderMissionObjectives;
        if(!objectives?.facts?.get('wigan_story'))return runtime;
        const map=typeof WIGAN_MAP!=='undefined'?WIGAN_MAP:null;if(!map)return runtime;
        const list=options.getCivilians?.();if(!Array.isArray(list))return runtime;
        activeRuntime?.dispose?.();
        const navigation={
          assignPath:options.path,followPath:options.follow,
          obstacleAt:(x,y)=>options.canOccupy?!options.canOccupy(x,y):false,
          cancelPath:a=>{a.path=null;a.pathIndex=0;a.target=null}
        };
        const network=create({map,objectives,getSquad:options.getSquad,getEnemies:options.getEnemies,navigation,scale:2});
        list.push(...network.actors);activeRuntime=network;root.BadFodderWiganNetworkRuntime=network;
        const update=runtime.update.bind(runtime),snapshot=runtime.snapshot.bind(runtime),receive=runtime.receive.bind(runtime),add=runtime.add.bind(runtime);
        runtime.update=dt=>{update(dt);network.update(dt)};
        runtime.snapshot=()=>snapshot().slice(0,list.findIndex(c=>c.networkActor));
        runtime.receive=rows=>receive(rows);
        runtime.counts=()=>{const residents=list.filter(c=>!c.networkActor);return{total:residents.length,evacuated:residents.filter(c=>c.civilianState==='EVACUATED').length,lost:residents.filter(c=>c.civilianState==='DEAD').length,following:residents.filter(c=>c.alive&&c.leaderIndex!==null).length,down:residents.filter(c=>c.civilianState==='DOWN').length}};
        runtime.add=c=>{const added=add(c),idx=list.indexOf(added),first=list.findIndex(x=>x.networkActor);if(first>=0&&idx>first){list.splice(idx,1);list.splice(first,0,added)}return added};
        runtime.network=network;return runtime;
      };
      civiliansApi.__wiganNetworkPatched=true;
    }
    if(!art.__wiganNetworkPatched){
      const originalDraw=art.drawActor.bind(art);
      art.drawActor=function(ctx,ent,team='squad'){
        if(ent?.networkActor&&!ent.active)return;
        if(ent?.networkBusAnchor&&activeRuntime)activeRuntime.drawWorld(ctx);
        const result=originalDraw(ctx,ent,team);
        if(ent?.networkActor&&activeRuntime)activeRuntime.drawActor(ctx,ent);
        return result;
      };
      art.__wiganNetworkPatched=true;
    }
    return true;
  }

  return{create,install,get active(){return activeRuntime}};
});
