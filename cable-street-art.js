/* Cable Street presentation layer.
   Environment, crowd, police pressure and street-conflict effects. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.BadFodderCableArt=api;
})(typeof window!=='undefined'?window:globalThis,function(){
  'use strict';

  const TAU=Math.PI*2;
  const PALETTE={
    brick:'#875e4a',brickDark:'#5c4035',brickLight:'#ad795d',stone:'#9f967f',
    timber:'#805a37',timberLight:'#ad7b49',timberDark:'#4d3728',paper:'#d8cfaf',
    police:'#26363c',policeLight:'#46575c',blackshirt:'#272a29',accent:'#e1c668'
  };
  const npcActors=new Map();
  const policeActors=new Map();
  const marchActors=new Map();

  function clamp(n,min,max){return Math.max(min,Math.min(max,n))}
  function centerOf(points){
    if(!Array.isArray(points)||!points.length)return null;
    let x=0,y=0,n=0;
    for(const p of points){if(Array.isArray(p)&&Number.isFinite(p[0])&&Number.isFinite(p[1])){x+=p[0];y+=p[1];n++}}
    return n?{x:x/n,y:y/n}:null;
  }
  function hashText(value){
    const s=String(value||'cable-street');let h=2166136261>>>0;
    for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}
    return h>>>0;
  }
  function seededUnit(seed,salt){
    let x=(Number(seed)||1)^Math.imul((salt||1)+1,0x9e3779b1);
    x^=x>>>16;x=Math.imul(x,0x7feb352d);x^=x>>>15;x=Math.imul(x,0x846ca68b);x^=x>>>16;
    return(x>>>0)/4294967296;
  }
  function line(ctx,x1,y1,x2,y2,color,width=1){
    ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();
  }
  function ellipse(ctx,x,y,rx,ry,color,alpha=1,rotation=0){
    ctx.save();ctx.globalAlpha*=alpha;ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(x,y,rx,ry,rotation,0,TAU);ctx.fill();ctx.restore();
  }
  function polygon(ctx,points,fill,stroke,width=1){
    if(!points||points.length<2)return;
    ctx.beginPath();ctx.moveTo(points[0][0],points[0][1]);for(let i=1;i<points.length;i++)ctx.lineTo(points[i][0],points[i][1]);ctx.closePath();
    if(fill){ctx.fillStyle=fill;ctx.fill()}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke()}
  }

  function sharedActor(ctx,cache,key,p,art,team,clock,{scale=1,filter='none'}={}){
    if(!ctx||!art||typeof art.drawActor!=='function'||typeof art.animate!=='function')return false;
    let ent=cache.get(key);
    if(!ent){
      ent={x:p.x,y:p.y,dir:Number.isFinite(p.dir)?p.dir:0,variant:p.variant||0,alive:true,active:true,selected:false,fireTimer:0,hitTimer:0,_clock:clock,state:'idle',anim:0};
      cache.set(key,ent);art.animate(ent,1/60);
    }
    const old=Number.isFinite(ent._clock)?ent._clock:clock,dt=clamp(Number.isFinite(clock)?clock-old:1/60,1/240,.08);
    ent._clock=clock;ent.x=p.x;ent.y=p.y;ent.dir=Number.isFinite(p.dir)?p.dir:ent.dir;ent.variant=p.variant||0;ent.alive=true;
    if(p.animState)ent.state=/panic|support|walk/.test(p.animState)?'walk':'idle';
    art.animate(ent,dt);
    ctx.save();if(filter&&filter!=='none')ctx.filter=filter;
    if(scale!==1){ctx.translate(ent.x,ent.y);ctx.scale(scale,scale);ctx.translate(-ent.x,-ent.y)}
    art.drawActor(ctx,ent,team);
    ctx.restore();return true;
  }

  function buildingStyle(seed,b,S){
    const scale=typeof S==='function'?S:(n=>n);
    const walls=['#8a604b','#9a6d53','#775344','#a27659','#6f5146','#93644e'];
    const roofs=['#4b5051','#58514d','#41484b','#625048','#555b5b'];
    const doors=['#344846','#483b35','#334248','#574238','#3f493b'];
    return{
      family:'east-end-brick',height:scale(5+Math.floor(seededUnit(seed,1)*3)),
      wall:walls[Math.floor(seededUnit(seed,2)*walls.length)],roof:roofs[Math.floor(seededUnit(seed,3)*roofs.length)],
      door:doors[Math.floor(seededUnit(seed,4)*doors.length)],trim:seededUnit(seed,5)>.5?'#b8aa8e':'#8e846f',
      facadeVariant:Math.floor(seededUnit(seed,6)*4),shopfront:seededUnit(seed,7)>.72
    };
  }

  function drawRoad(ctx,r,S){
    if(!ctx||!r||!Array.isArray(r.points)||r.points.length<2)return;
    const scale=typeof S==='function'?S:(n=>n);
    const path=()=>{ctx.beginPath();ctx.moveTo(r.points[0][0],r.points[0][1]);for(let i=1;i<r.points.length;i++)ctx.lineTo(r.points[i][0],r.points[i][1])};
    ctx.save();ctx.lineCap='round';ctx.lineJoin='round';
    if(r.kind==='railway'){
      path();ctx.strokeStyle='#303436';ctx.lineWidth=scale(7);ctx.stroke();
      path();ctx.strokeStyle='#68665f';ctx.lineWidth=scale(4);ctx.stroke();
      ctx.setLineDash([scale(1.5),scale(3.5)]);path();ctx.strokeStyle='#c1b59a';ctx.lineWidth=scale(.85);ctx.stroke();ctx.setLineDash([]);
    }else{
      path();ctx.strokeStyle='#343532';ctx.lineWidth=scale(5);ctx.stroke();
      path();ctx.strokeStyle='#817d72';ctx.lineWidth=scale(3.2);ctx.stroke();
      path();ctx.strokeStyle='rgba(206,195,168,.68)';ctx.lineWidth=scale(.72);ctx.stroke();
      ctx.setLineDash([scale(.8),scale(5.6)]);path();ctx.strokeStyle='rgba(45,44,41,.5)';ctx.lineWidth=scale(.55);ctx.stroke();ctx.setLineDash([]);
    }
    ctx.restore();
  }

  function drawFacadeDetails(ctx,b,zoom=1){
    if(!ctx||!b||b.hidden||b.family!=='east-end-brick')return;
    const w=b.maxX-b.minX;if(w<12)return;
    const seed=hashText((b.name||'building')+'|'+b.i),frontY=b.maxY-Math.max(1,b.height*.08),count=clamp(Math.floor(w/18),1,5);
    ctx.save();line(ctx,b.minX+2,frontY,b.maxX-2,frontY,'rgba(44,42,37,.62)',1.4);
    if(zoom>.72){
      for(let i=0;i<count;i++){
        const x=b.minX+(i+.5)*w/count,y=frontY-b.height*.55;
        ctx.fillStyle='#303c3b';ctx.fillRect(x-3,y-3,6,6);ctx.strokeStyle='rgba(208,195,162,.75)';ctx.lineWidth=.7;ctx.strokeRect(x-3.6,y-3.6,7.2,7.2);
        line(ctx,x,y-3,x,y+3,'rgba(205,203,181,.62)',.55);line(ctx,x-3,y,x+3,y,'rgba(205,203,181,.62)',.55);
      }
    }
    if(seededUnit(seed,2)>.58&&w>28){
      const x=b.minX+w*.1,sw=Math.min(32,w*.38),y=frontY-b.height*.3;
      ctx.fillStyle=seededUnit(seed,3)>.5?'#355653':'#66483c';ctx.fillRect(x,y,sw,b.height*.23);
      ctx.strokeStyle='rgba(222,206,168,.7)';ctx.strokeRect(x,y,sw,b.height*.23);ctx.fillStyle='#c4b28e';ctx.fillRect(x,y-3,sw,2.5);
    }
    ctx.restore();
  }

  function streetBounds(map,S){
    const pts=[];for(const r of map.roads||[])for(const p of r.points||[])pts.push([S(p[0]),S(p[1])]);if(!pts.length)return null;
    const xs=pts.map(p=>p[0]),ys=pts.map(p=>p[1]);return{minX:Math.min(...xs),maxX:Math.max(...xs),minY:Math.min(...ys),maxY:Math.max(...ys)};
  }
  function drawStreetProps(ctx,map,S,bounds=null){
    if(!ctx||!map)return;const box=streetBounds(map,S);if(!box)return;const seed=hashText(map.key||'cable-street');
    const inside=(x,y)=>!bounds||!(x<bounds.x-30||x>bounds.x+bounds.w+30||y<bounds.y-30||y>bounds.y+bounds.h+30);
    ctx.save();
    for(let i=0;i<28;i++){
      const x=box.minX+(box.maxX-box.minX)*seededUnit(seed,i*7+1),y=box.minY+(box.maxY-box.minY)*seededUnit(seed,i*7+2);if(!inside(x,y))continue;
      switch(i%6){
        case 0: ellipse(ctx,x,y+2,5,1.8,'rgba(25,27,24,.24)');line(ctx,x,y,x,y-25,'#3d4441',2.2);ctx.fillStyle='#47504c';ctx.fillRect(x-4,y-29,8,8);break;
        case 1: ctx.fillStyle=PALETTE.timber;ctx.fillRect(x-7,y-7,14,11);ctx.strokeStyle=PALETTE.timberDark;ctx.strokeRect(x-7,y-7,14,11);line(ctx,x-6,y-6,x+6,y+3,PALETTE.timberDark,.8);break;
        case 2: ellipse(ctx,x,y-1,6,7,'#41413d');ellipse(ctx,x-2,y-4,3,2,'#5b5951',.65);break;
        case 3: ctx.save();ctx.translate(x,y-7);ctx.rotate((seededUnit(seed,i+99)-.5)*.2);ctx.fillStyle='#d2c7a5';ctx.fillRect(-4,-5,8,10);line(ctx,-2,-2,2,-2,'#665b4c',.55);ctx.restore();break;
        case 4: ctx.fillStyle='#635246';ctx.fillRect(x-4,y-8,8,10);ellipse(ctx,x,y-8,4,1.5,'#88755e');line(ctx,x-4,y-4,x+4,y-4,'#2f3330',.8);break;
        default: line(ctx,x-8,y,x+8,y-4,'#7c5839',3);line(ctx,x-7,y-1,x+7,y-5,'#aa7849',1);break;
      }
    }
    ctx.restore();
  }

  function drawBarricade(ctx,b,clock=0){
    const c=centerOf(b.points);if(!c)return;const ratio=b.maxIntegrity>0?clamp(b.integrity/b.maxIntegrity,0,1):0,seed=hashText(b.id),tier=Math.max(0,b.constructionTier|0);
    ctx.save();polygon(ctx,b.points,b.breached?'rgba(91,70,49,.3)':'rgba(96,72,46,.6)',b.breached?'#8c765e':'#d7bd86',1.2);ellipse(ctx,c.x+2,c.y+8,23,5,'rgba(22,23,20,.28)');
    const pieces=9+tier*2;
    for(let i=0;i<pieces;i++){
      const rx=(seededUnit(seed,i*3+2)-.5)*34,ry=(seededUnit(seed,i*3+3)-.5)*15,a=(seededUnit(seed,i*3+1)-.5)*.45;
      ctx.save();ctx.translate(c.x+rx,c.y+ry);ctx.rotate(a);
      if(i%5===0){ctx.fillStyle='#675545';ctx.fillRect(-8,-5,16,9);ctx.strokeStyle='#392f28';ctx.strokeRect(-8,-5,16,9);line(ctx,-7,-4,7,3,'#443429',.8)}
      else if(i%5===1){line(ctx,-13,0,13,-2,'#7f5938',4);line(ctx,-12,-1,12,-3,'#b07b49',1)}
      else if(i%5===2){ellipse(ctx,0,0,8,5,'#5e5b4e');line(ctx,-5,-1,5,-1,'#7b7765',.8)}
      else if(i%5===3){ctx.fillStyle='#594a3e';ctx.fillRect(-9,-4,18,7);ellipse(ctx,-6,5,3,3,'#2e302e');ellipse(ctx,6,5,3,3,'#2e302e')}
      else{ctx.fillStyle='#85715c';ctx.fillRect(-7,-3,14,6);line(ctx,-5,-5,5,5,'#5a4838',2)}
      ctx.restore();
    }
    if(b.breached){for(let i=0;i<7;i++){const t=(clock*.6+i*.13)%1;ellipse(ctx,c.x-20+i*7,c.y+4-t*11,2+t*2,1+t,'#98886f',1-t)}}
    ctx.fillStyle='rgba(21,25,21,.82)';ctx.fillRect(c.x-22,c.y+18,44,6);ctx.fillStyle=ratio<.35?'#c37f55':'#dcc36f';ctx.fillRect(c.x-21,c.y+19,42*ratio,4);ctx.strokeStyle='#d9caa2';ctx.strokeRect(c.x-22,c.y+18,44,6);
    ctx.fillStyle='#f0e2b9';ctx.font='800 7px system-ui,sans-serif';ctx.textAlign='center';ctx.fillText('DEFENCE '+Math.round(ratio*100)+'%',c.x,c.y+34);ctx.restore();
  }

  function drawMaterial(ctx,m,clock=0){
    if(!Number.isFinite(m.x)||!Number.isFinite(m.y))return;ctx.save();ctx.translate(m.x,m.y);ellipse(ctx,0,6,11,3.5,'rgba(20,20,17,.28)');
    if(m.type==='timber')[-5,0,5].forEach((y,i)=>{line(ctx,-11,y,11,y-2,PALETTE.timberDark,4);line(ctx,-10,y-1,10,y-3,i%2?PALETTE.timberLight:PALETTE.timber,1.5)});
    else if(m.type==='crates'){ctx.fillStyle=PALETTE.timberLight;ctx.fillRect(-10,-9,20,15);ctx.strokeStyle=PALETTE.timberDark;ctx.strokeRect(-10,-9,20,15);line(ctx,-9,-8,9,5,PALETTE.timberDark,1)}
    else if(m.type==='cart'){ctx.fillStyle='#79583f';ctx.fillRect(-13,-9,26,12);ellipse(ctx,-9,6,4.5,4.5,'#2d312f');ellipse(ctx,9,6,4.5,4.5,'#2d312f')}
    else{ctx.fillStyle='#8e6745';ctx.fillRect(-8,-7,16,12)}
    if(!m.carriedBy){const pulse=.5+.5*Math.sin(clock*4+hashText(m.id)%7);ctx.globalAlpha=.55+.2*pulse;ctx.strokeStyle='#ead28b';ctx.beginPath();ctx.ellipse(0,0,15+pulse*2,10+pulse,0,0,TAU);ctx.stroke();ctx.globalAlpha=1;ctx.fillStyle='#f0e1b3';ctx.font='800 7px system-ui,sans-serif';ctx.textAlign='center';ctx.fillText(String(m.label||m.type).toUpperCase(),0,-15)}
    ctx.restore();
  }

  function drawCivilian(ctx,p,clock,art){
    if(!p||p.status==='exited'||!Number.isFinite(p.x)||!Number.isFinite(p.y))return;
    const assisted=p.status==='assisted'||p.status==='evacuating',dir=assisted&&Number.isFinite(p.exitX)&&Number.isFinite(p.exitY)?Math.atan2(p.exitY-p.y,p.exitX-p.x):0;
    sharedActor(ctx,npcActors,'resident:'+p.id,{x:p.x,y:p.y,dir,variant:hashText(p.id)%8,animState:assisted?'walk':'idle'},art,'civilian',clock,{scale:.97});
    ctx.save();ctx.font='900 8px system-ui,sans-serif';ctx.textAlign='center';ctx.strokeStyle='rgba(22,27,23,.95)';ctx.lineWidth=3;ctx.strokeText(assisted?'SAFE':'ASSIST',p.x,p.y-31);ctx.fillStyle=assisted?'#add1ad':'#ffe69a';ctx.fillText(assisted?'SAFE':'ASSIST',p.x,p.y-31);
    if(!assisted){const pulse=1+Math.sin(clock*5)*.12;ctx.strokeStyle='rgba(244,213,117,.85)';ctx.lineWidth=1.5;ctx.beginPath();ctx.ellipse(p.x,p.y,13*pulse,8*pulse,0,0,TAU);ctx.stroke()}ctx.restore();
  }

  function drawCrowd(ctx,people,clock=0,art=null){
    if(!ctx||!Array.isArray(people))return;
    for(const p of [...people].sort((a,b)=>(a.y||0)-(b.y||0))){
      if(!Number.isFinite(p.x)||!Number.isFinite(p.y))continue;
      const scale=p.role==='helper'?.95:.9;
      if(!sharedActor(ctx,npcActors,'crowd:'+p.id,p,art,'civilian',clock,{scale})){
        ellipse(ctx,p.x,p.y,5,7,p.role==='helper'?'#786b4f':'#686356');ellipse(ctx,p.x,p.y-8,3,3,'#d3a37d');
      }
      if(p.role==='helper'){ellipse(ctx,p.x,p.y-27,3,3,'#e5cf81',.9)}
    }
  }

  function formationDirection(p){
    const tx=p.state==='withdraw'?p.withdrawX:p.targetX,ty=p.state==='withdraw'?p.withdrawY:p.targetY;
    return Number.isFinite(tx)&&Number.isFinite(ty)?Math.atan2(ty-p.y,tx-p.x):(Number.isFinite(p.dir)?p.dir:0);
  }
  function drawFormation(ctx,p,clock,art){
    if(!p||!Number.isFinite(p.x)||!Number.isFinite(p.y))return;
    const width=Math.max(20,Number(p.width)||24),count=clamp(Math.round(width/8),4,10),dir=formationDirection(p),nx=-Math.sin(dir),ny=Math.cos(dir);
    ellipse(ctx,p.x,p.y+6,width*.55,4,'rgba(20,23,22,.25)');
    for(let i=0;i<count;i++){
      const side=-width/2+(count===1?0:i/(count-1)*width),row=(i%2)*3;
      const officer={x:p.x+nx*side-Math.cos(dir)*row,y:p.y+ny*side-Math.sin(dir)*row,dir,variant:i%4,animState:/approach|withdraw|regroup/.test(p.state)?'walk':'idle'};
      sharedActor(ctx,policeActors,'police:'+p.id+':'+i,officer,art,'enemy',clock,{scale:.94,filter:'brightness(.6) saturate(.52) hue-rotate(145deg)'});
      ctx.save();ctx.fillStyle='#203139';ctx.beginPath();ctx.ellipse(officer.x,officer.y-25,4.1,2.1,dir,0,TAU);ctx.fill();ctx.fillRect(officer.x-1.2,officer.y-29,2.4,4);
      if(p.state==='dismantle'){const swing=Math.sin(clock*10+i)*2.8;line(ctx,officer.x+3,officer.y-11,officer.x+8,officer.y-3+swing,'#47382c',1.8)}ctx.restore();
    }
    const ratio=clamp(Number(p.resistanceRatio)||0,0,1);if(ratio>0){ctx.fillStyle='rgba(20,24,22,.8)';ctx.fillRect(p.x-20,p.y-42,40,5);ctx.fillStyle='#ddbd62';ctx.fillRect(p.x-19,p.y-41,38*ratio,3)}
    ctx.save();ctx.font='900 8px system-ui,sans-serif';ctx.textAlign='center';ctx.strokeStyle='rgba(19,23,21,.95)';ctx.lineWidth=3;ctx.strokeText(String(p.state||'POLICE').toUpperCase(),p.x,p.y-49);ctx.fillStyle='#efe2b8';ctx.fillText(String(p.state||'POLICE').toUpperCase(),p.x,p.y-49);ctx.restore();
  }

  function drawBlackshirtMarch(ctx,march,clock,art){
    if(!march||!Number.isFinite(march.x)||!Number.isFinite(march.y)||march.threat<=0)return;
    const count=6+Math.round(march.threat*10),dir=Number.isFinite(march.dir)?march.dir:0,nx=-Math.sin(dir),ny=Math.cos(dir);
    for(let i=0;i<count;i++){
      const row=Math.floor(i/5),col=i%5-2,spacing=9;
      const p={x:march.x+nx*col*spacing-Math.cos(dir)*row*10,y:march.y+ny*col*spacing-Math.sin(dir)*row*10,dir,variant:i%4,animState:'walk'};
      sharedActor(ctx,marchActors,'march:'+i,p,art,'enemy',clock,{scale:.82,filter:'brightness(.38) saturate(.28)'});
    }
    ctx.save();ctx.font='900 8px system-ui,sans-serif';ctx.textAlign='center';ctx.strokeStyle='rgba(18,20,18,.95)';ctx.lineWidth=3;ctx.strokeText('BUF MARCH - BEHIND POLICE LINE',march.x,march.y-45);ctx.fillStyle='#d9cda9';ctx.fillText('BUF MARCH - BEHIND POLICE LINE',march.x,march.y-45);ctx.restore();
  }

  function drawMountedCharge(ctx,c,clock,art){
    if(!c||!Number.isFinite(c.x)||!Number.isFinite(c.y))return;
    const dir=Math.atan2(c.targetY-c.startY,c.targetX-c.startX),gallop=Math.sin(clock*18+c.t*12);
    ctx.save();ctx.translate(c.x,c.y);ctx.rotate(dir);ellipse(ctx,0,5,17,6,'rgba(20,22,20,.28)');
    ctx.fillStyle='#76533c';ctx.beginPath();ctx.ellipse(0,0,14,6,0,0,TAU);ctx.fill();ctx.strokeStyle='#4a3428';ctx.lineWidth=1.2;ctx.stroke();
    ctx.fillStyle='#856047';ctx.beginPath();ctx.ellipse(10,-4,6,4,-.25,0,TAU);ctx.fill();ctx.beginPath();ctx.ellipse(15,-6,4,3,-.15,0,TAU);ctx.fill();
    line(ctx,-8,3,-12+gallop*2,10,'#4c392d',2);line(ctx,-2,4,-4-gallop*2,11,'#4c392d',2);line(ctx,6,3,9-gallop*2,10,'#4c392d',2);line(ctx,10,2,14+gallop*2,8,'#4c392d',2);line(ctx,-13,-1,-20,-5,'#4d392d',1.5);
    ctx.fillStyle='#4a4339';ctx.fillRect(-4,-6,9,4);ctx.restore();
    const officer={x:c.x,y:c.y-8,dir,variant:1,animState:'idle'};sharedActor(ctx,policeActors,'mounted:'+c.id,officer,art,'enemy',clock,{scale:1.05,filter:'brightness(.58) saturate(.5) hue-rotate(145deg)'});
    ctx.save();ctx.fillStyle='#203139';ctx.beginPath();ctx.ellipse(officer.x,officer.y-27,4.3,2.3,dir,0,TAU);ctx.fill();ctx.restore();
  }

  function drawGround(ctx,state,clock=0,art=null){
    if(!ctx||!state)return;
    if(state.conflict&&state.conflict.march)drawBlackshirtMarch(ctx,state.conflict.march,clock,art);
    const items=[];
    for(const b of state.barricades||[]){const c=centerOf(b.points)||b;items.push({y:c.y||0,draw:()=>drawBarricade(ctx,b,clock)})}
    for(const m of state.materials||[])if(!m.carriedBy)items.push({y:m.y||0,draw:()=>drawMaterial(ctx,m,clock)});
    for(const p of state.civilians||[])items.push({y:p.y||0,draw:()=>drawCivilian(ctx,p,clock,art)});
    for(const f of state.formations||[])items.push({y:f.y||0,draw:()=>drawFormation(ctx,f,clock,art)});
    items.sort((a,b)=>a.y-b.y).forEach(i=>i.draw());
    drawJobMarkers(ctx,state,clock);
  }

  function drawCarried(ctx,state,clock=0){if(!ctx||!state)return;for(const m of state.materials||[])if(m.carriedBy)drawMaterial(ctx,m,clock)}

  function volunteerJob(state,index){return state&&Array.isArray(state.jobs)?state.jobs.find(j=>j.actorId==='player-'+index&&(j.status==='working'||j.status==='waiting'||j.status==='queued'))||null:null}
  function drawVolunteer(ctx,ent,art,{state=null,index=0,clock=0}={}){
    if(!ctx||!ent||!art)return;art.drawActor(ctx,ent,'civilian');const job=volunteerJob(state,index),actor=state&&state.actors&&state.actors.find(a=>a.id==='player-'+index),carrying=actor&&actor.carrying;
    ctx.save();ctx.translate(ent.x,ent.y);ctx.strokeStyle=['#dfc35e','#8fc0b2','#bf8b69','#ae9bc4'][index%4];ctx.lineWidth=2.2;ctx.beginPath();ctx.arc(0,-16,5.5,.1,Math.PI-.1);ctx.stroke();
    if(job&&job.status==='working'){
      const fighting=job.action==='hold'&&(state.formations||[]).some(f=>f.objective===job.targetId&&['halt','dismantle'].includes(f.state));
      const swing=Math.sin(clock*11+index)*4;
      if(fighting){line(ctx,3,-8,11,-7+swing,'#6d4b30',2.4);ellipse(ctx,11,-7+swing,1.5,1.5,'#a47952')}
      else if(job.action==='reinforce'||job.action==='hold'){line(ctx,-5,-9,-10,-2-swing*.3,'#d8bc8e',2);line(ctx,5,-9,10,-2+swing*.3,'#d8bc8e',2)}
      else if(job.action==='assist'){ctx.strokeStyle='rgba(147,202,173,.75)';ctx.beginPath();ctx.arc(0,-4,10,0,TAU);ctx.stroke()}
    }
    if(carrying){ctx.fillStyle='#efd77e';ctx.beginPath();ctx.arc(0,-23,2.7,0,TAU);ctx.fill()}ctx.restore();
  }

  function drawJobMarkers(ctx,state,clock=0){
    for(const job of state.jobs||[]){
      if(job.status!=='waiting'&&job.status!=='working')continue;let target=null;
      if(job.targetType==='barricade')target=(state.barricades||[]).find(x=>x.id===job.targetId);else if(job.targetType==='material')target=(state.materials||[]).find(x=>x.id===job.targetId);else if(job.targetType==='civilian')target=(state.civilians||[]).find(x=>x.id===job.targetId);
      const c=target&&Number.isFinite(target.x)&&Number.isFinite(target.y)?target:centerOf(target&&target.points);if(!c)continue;const pulse=1+Math.sin(clock*5+hashText(job.id)%7)*.12;
      ctx.save();ctx.strokeStyle=job.status==='working'?'rgba(245,210,111,.9)':'rgba(235,224,183,.55)';ctx.lineWidth=1.3;ctx.setLineDash(job.status==='working'?[]:[4,4]);ctx.beginPath();ctx.arc(c.x,c.y,14*pulse,0,TAU);ctx.stroke();ctx.restore();
    }
  }

  function drawConflictProjectile(ctx,p){
    ctx.save();ctx.translate(p.x,p.y);if(p.kind==='brick'){ctx.rotate((p.t||0)*8);ctx.fillStyle='#9a654d';ctx.fillRect(-3,-2,6,4);ctx.strokeStyle='#5d4135';ctx.strokeRect(-3,-2,6,4)}
    else{ctx.rotate((p.t||0)*5);line(ctx,-7,0,7,0,'#765132',2.6);line(ctx,-6,-.8,6,-.8,'#aa794c',.8)}ctx.restore();
  }
  function drawImpact(ctx,i){
    const age=1-clamp(i.life/(i.maxLife||.42),0,1);ctx.save();ctx.globalAlpha=1-age;
    if(i.kind==='mounted'){for(let n=0;n<10;n++){const a=n*2.399,d=5+age*22;ellipse(ctx,i.x+Math.cos(a)*d,i.y+Math.sin(a)*d,3,1.6,n%2?'#847860':'#aa9774',1-age)}}
    else if(i.kind==='shove'){ctx.strokeStyle='#f0d178';ctx.lineWidth=2;ctx.beginPath();ctx.arc(i.x,i.y,7+age*10,0,TAU);ctx.stroke()}
    else for(let n=0;n<5;n++){const a=n*2.1,d=3+age*10;ellipse(ctx,i.x+Math.cos(a)*d,i.y+Math.sin(a)*d,1.7,1,'#9a8363',1-age)}
    ctx.restore();
  }

  function drawEffects(ctx,state,clock=0){
    if(!ctx||!state)return;
    for(const job of state.jobs||[]){
      if(job.status!=='working')continue;let target=null;
      if(job.targetType==='barricade')target=(state.barricades||[]).find(b=>b.id===job.targetId);else if(job.targetType==='civilian')target=(state.civilians||[]).find(p=>p.id===job.targetId);
      const c=target&&Number.isFinite(target.x)?target:centerOf(target&&target.points);if(!c)continue;
      if(job.action==='reinforce'){for(let i=0;i<6;i++){const t=(clock*1.8+i*.17)%1,a=i*2.399;ellipse(ctx,c.x+Math.cos(a)*t*17,c.y+Math.sin(a)*t*8-t*7,1.7-t*.7,1-t*.4,i%2?'#b79a6a':'#8b6d4d',1-t)}}
      else if(job.action==='hold'){ellipse(ctx,c.x,c.y,24,8,'#e1c668',.05+.03*Math.sin(clock*5))}
    }
    const conflict=state.conflict;if(!conflict)return;
    for(const p of conflict.projectiles||[])drawConflictProjectile(ctx,p);
    for(const i of conflict.impacts||[])drawImpact(ctx,i);
    for(const c of conflict.charges||[])drawMountedCharge(ctx,c,clock,window.BadFodderArt||null);
    if(conflict.dramaTime>0&&conflict.dramaText){
      const b=(state.barricades||[])[0],c=b&&centerOf(b.points);if(c){const pulse=1+Math.sin(clock*7)*.05;ctx.save();ctx.translate(c.x,c.y-58);ctx.scale(pulse,pulse);ctx.font='900 13px system-ui,sans-serif';ctx.textAlign='center';ctx.strokeStyle='rgba(28,29,24,.98)';ctx.lineWidth=5;ctx.strokeText(conflict.dramaText,0,0);ctx.fillStyle='#ffe28a';ctx.fillText(conflict.dramaText,0,0);ctx.restore()}
    }
  }

  function drawGuidance(ctx,guidance,clock=0){
    if(!ctx||!guidance||!Number.isFinite(guidance.x)||!Number.isFinite(guidance.y))return;const pulse=1+Math.sin(clock*5)*.1,r=(guidance.kind==='regroup'?27:20)*pulse;
    ctx.save();ctx.strokeStyle='#ffe071';ctx.lineWidth=2.4;ctx.setLineDash([7,4]);ctx.beginPath();ctx.ellipse(guidance.x,guidance.y,r,r*.62,0,0,TAU);ctx.stroke();ctx.setLineDash([]);
    const y=guidance.y-r*.72-13-Math.sin(clock*5)*2;ctx.fillStyle='#ffe071';ctx.beginPath();ctx.moveTo(guidance.x,y+8);ctx.lineTo(guidance.x-6,y);ctx.lineTo(guidance.x+6,y);ctx.closePath();ctx.fill();
    ctx.font='900 9px system-ui,sans-serif';ctx.textAlign='center';ctx.strokeStyle='#1c211d';ctx.lineWidth=4;ctx.strokeText(String(guidance.label||'GO HERE'),guidance.x,y-6);ctx.fillStyle='#fff0b0';ctx.fillText(String(guidance.label||'GO HERE'),guidance.x,y-6);ctx.restore();
  }
  function drawHint(ctx,{x,y,label}={}){
    if(!ctx||!Number.isFinite(x)||!Number.isFinite(y)||!label)return;const w=Math.max(54,String(label).length*5.5+12),h=17;ctx.save();ctx.fillStyle='rgba(25,31,25,.9)';ctx.strokeStyle='#e2cf92';ctx.beginPath();ctx.roundRect(x-w/2,y-34,w,h,4);ctx.fill();ctx.stroke();ctx.fillStyle='#f0dfad';ctx.font='800 8px system-ui,sans-serif';ctx.textAlign='center';ctx.fillText(label,x,y-22);ctx.restore();
  }
  function drawRegroup(ctx,p,clock=0){const pulse=1+Math.sin(clock*4)*.08;ctx.save();ctx.strokeStyle='#95c7ed';ctx.lineWidth=2.5;ctx.setLineDash([8,5]);ctx.beginPath();ctx.arc(p.x,p.y,30*pulse,0,TAU);ctx.stroke();ctx.setLineDash([]);ctx.fillStyle='#e3f2ff';ctx.font='bold 11px system-ui';ctx.textAlign='center';ctx.fillText('REGROUP',p.x,p.y-40);ctx.restore()}

  function drawScenery(ctx,map,S){
    if(!ctx||!map)return;const area=(map.gameplayAdjustments||[]).find(a=>a.id==='coal-depot-closed');if(!area)return;
    const pts=area.points.map(p=>[S(p[0]),S(p[1])]);ctx.save();polygon(ctx,pts,'#777671','#454946',3);ctx.clip();const xs=pts.map(p=>p[0]),ys=pts.map(p=>p[1]),minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
    for(let x=minX+30;x<maxX;x+=58){ellipse(ctx,x,maxY-24,23,10,'#3a3b38');line(ctx,x-17,maxY-29,x,maxY-39,'#5c5f58',2);line(ctx,x,maxY-39,x+18,maxY-28,'#5c5f58',2)}ctx.fillStyle='rgba(219,208,175,.72)';ctx.font='bold 10px system-ui';ctx.textAlign='center';ctx.fillText('COAL DEPOT',(minX+maxX)/2,(minY+maxY)/2);ctx.restore();
  }

  function drawAtmosphere(ctx,{viewWidth=0,viewHeight=0,clock=0,pressure=0}={}){
    if(!ctx||!viewWidth||!viewHeight)return;ctx.save();const haze=ctx.createLinearGradient(0,0,0,viewHeight);haze.addColorStop(0,'rgba(43,44,41,.11)');haze.addColorStop(.55,'rgba(73,67,58,.025)');haze.addColorStop(1,'rgba(24,29,26,.14)');ctx.fillStyle=haze;ctx.fillRect(0,0,viewWidth,viewHeight);
    for(let i=0;i<8;i++){const x=((i*173+clock*13)%(viewWidth+80))-40,y=((i*91+Math.sin(clock*.4+i)*24)%Math.max(1,viewHeight-30))+15;ctx.save();ctx.translate(x,y);ctx.rotate(Math.sin(clock+i)*.45);ctx.globalAlpha=.1+pressure*.06;ctx.fillStyle=PALETTE.paper;ctx.fillRect(-2.5,-1.5,5,3);ctx.restore()}
    const v=ctx.createRadialGradient(viewWidth/2,viewHeight/2,Math.min(viewWidth,viewHeight)*.28,viewWidth/2,viewHeight/2,Math.max(viewWidth,viewHeight)*.72);v.addColorStop(0,'rgba(0,0,0,0)');v.addColorStop(1,'rgba(7,12,10,'+(pressure?.25:.18)+')');ctx.fillStyle=v;ctx.fillRect(0,0,viewWidth,viewHeight);ctx.restore();
  }

  return{
    buildingStyle,drawRoad,drawFacadeDetails,drawStreetProps,drawScenery,
    drawGround,drawCarried,drawCrowd,drawVolunteer,drawEffects,drawAtmosphere,
    drawGuidance,drawHint,drawRegroup
  };
});
