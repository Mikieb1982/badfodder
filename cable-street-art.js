/* Cable Street presentation layer.
   Mission-specific environment, character, animation and effects rendering. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.BadFodderCableArt=api;
})(typeof window!=='undefined'?window:globalThis,function(){
  'use strict';

  const TAU=Math.PI*2;
  const PALETTE={
    ink:'#252824',soot:'#343431',brick:'#875e4a',brickDark:'#63463a',brickLight:'#a7785d',
    stone:'#a49a82',stoneLight:'#c8bda0',stoneDark:'#68665c',paving:'#77766d',
    timber:'#805a37',timberLight:'#aa7a48',timberDark:'#4e3829',paper:'#d8cfaf',
    police:'#26363c',policeLight:'#47575c',volunteer:'#867552',accent:'#d3bd74'
  };
  const COATS=['#786d57','#596b70','#8b674f','#676257','#6f7554','#795f5f','#586b63','#77674b'];
  const HATS=['#51473e','#3e4544','#65513e','#484d42','#5c4c45','#424744'];
  const SKIN=['#e2bb90','#c89570','#ae7658','#edc9a0','#d9a982','#ba8665'];

  function clamp(n,min,max){return Math.max(min,Math.min(max,n))}
  function centerOf(points){
    if(!Array.isArray(points)||!points.length)return null;
    let x=0,y=0,n=0;
    for(const p of points){
      if(!Array.isArray(p)||!Number.isFinite(p[0])||!Number.isFinite(p[1]))continue;
      x+=p[0];y+=p[1];n++;
    }
    return n?{x:x/n,y:y/n}:null;
  }
  function seededUnit(seed,salt){
    let x=(Number(seed)||1)^Math.imul((salt||1)+1,0x9e3779b1);
    x^=x>>>16;x=Math.imul(x,0x7feb352d);x^=x>>>15;x=Math.imul(x,0x846ca68b);x^=x>>>16;
    return(x>>>0)/4294967296;
  }
  function hashText(value){
    const s=String(value||'cable-street');
    let h=2166136261>>>0;
    for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}
    return h>>>0;
  }
  function line(ctx,x1,y1,x2,y2,color,width=1){
    ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap='round';
    ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();
  }
  function ellipse(ctx,x,y,rx,ry,color,alpha=1){
    ctx.save();ctx.globalAlpha*=alpha;ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,TAU);ctx.fill();ctx.restore();
  }
  function polygon(ctx,points,fill,stroke,width=1){
    if(!points||points.length<2)return;
    ctx.beginPath();ctx.moveTo(points[0][0],points[0][1]);
    for(let i=1;i<points.length;i++)ctx.lineTo(points[i][0],points[i][1]);
    ctx.closePath();
    if(fill){ctx.fillStyle=fill;ctx.fill()}
    if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke()}
  }

  // Priority 1: richer, deterministic East End environment styling.
  function buildingStyle(seed,b,S){
    const scale=typeof S==='function'?S:(n=>n);
    const walls=['#8a604b','#9a6d53','#775344','#a27659','#6f5146','#93644e'];
    const roofs=['#4b5051','#58514d','#41484b','#625048','#555b5b'];
    const doors=['#344846','#483b35','#334248','#574238','#3f493b'];
    return{
      family:'east-end-brick',
      height:scale(5+Math.floor(seededUnit(seed,1)*3)),
      wall:walls[Math.floor(seededUnit(seed,2)*walls.length)],
      roof:roofs[Math.floor(seededUnit(seed,3)*roofs.length)],
      door:doors[Math.floor(seededUnit(seed,4)*doors.length)],
      trim:seededUnit(seed,5)>.5?'#b8aa8e':'#8e846f',
      facadeVariant:Math.floor(seededUnit(seed,6)*4),
      shopfront:seededUnit(seed,7)>.72
    };
  }

  function drawRoad(ctx,r,S){
    if(!ctx||!r||!Array.isArray(r.points)||r.points.length<2)return;
    const scale=typeof S==='function'?S:(n=>n);
    const path=()=>{
      ctx.beginPath();ctx.moveTo(r.points[0][0],r.points[0][1]);
      for(let i=1;i<r.points.length;i++)ctx.lineTo(r.points[i][0],r.points[i][1]);
    };
    ctx.save();ctx.lineCap='round';ctx.lineJoin='round';
    if(r.kind==='railway'){
      path();ctx.strokeStyle='#303436';ctx.lineWidth=scale(7);ctx.stroke();
      path();ctx.strokeStyle='#62645f';ctx.lineWidth=scale(4.2);ctx.stroke();
      path();ctx.setLineDash([scale(1.5),scale(3.6)]);ctx.strokeStyle='#b6aa91';ctx.lineWidth=scale(.9);ctx.stroke();
      ctx.setLineDash([]);
    }else{
      // Stone kerb, dark gutter and a worn carriageway edge.
      path();ctx.strokeStyle='rgba(41,42,39,.88)';ctx.lineWidth=scale(4.6);ctx.stroke();
      path();ctx.strokeStyle='rgba(126,122,111,.95)';ctx.lineWidth=scale(3.1);ctx.stroke();
      path();ctx.strokeStyle='rgba(191,181,158,.72)';ctx.lineWidth=scale(.72);ctx.stroke();
      ctx.setLineDash([scale(.7),scale(5.8)]);
      path();ctx.strokeStyle='rgba(55,54,50,.46)';ctx.lineWidth=scale(.45);ctx.stroke();ctx.setLineDash([]);
    }
    ctx.restore();
  }

  function drawFacadeDetails(ctx,b,zoom=1){
    if(!ctx||!b||b.family!=='east-end-brick'||b.hidden)return;
    const w=b.maxX-b.minX,h=b.maxY-b.minY;
    if(w<12||h<5)return;
    const seed=hashText((b.name||'building')+'|'+b.i);
    const frontY=b.maxY-Math.max(1,b.height*.08);
    const count=clamp(Math.floor(w/18),1,5);
    ctx.save();
    // Soot line / stone sill helps the building read against the road.
    line(ctx,b.minX+2,frontY,b.maxX-2,frontY,'rgba(49,46,40,.58)',1.4);
    if(zoom>.72){
      for(let i=0;i<count;i++){
        const x=b.minX+(i+.5)*w/count;
        const upper=frontY-b.height*.55;
        ctx.fillStyle='rgba(49,59,58,.94)';ctx.fillRect(x-3,upper-3,6,6);
        ctx.strokeStyle='rgba(199,188,157,.74)';ctx.lineWidth=.7;ctx.strokeRect(x-3.6,upper-3.6,7.2,7.2);
        line(ctx,x,upper-3,x,upper+3,'rgba(205,203,181,.72)',.55);
        line(ctx,x-3,upper,x+3,upper,'rgba(205,203,181,.58)',.55);
      }
    }
    if(seededUnit(seed,2)>.62&&w>28){
      const sx=b.minX+w*.12,sw=Math.min(30,w*.36),sy=frontY-b.height*.30;
      ctx.fillStyle=seededUnit(seed,3)>.5?'#3d5c59':'#61473c';ctx.fillRect(sx,sy,sw,b.height*.23);
      ctx.strokeStyle='rgba(215,199,161,.66)';ctx.lineWidth=.8;ctx.strokeRect(sx,sy,sw,b.height*.23);
      ctx.fillStyle='rgba(216,205,174,.85)';ctx.fillRect(sx,sy-3,sw,2.4);
      for(let x=sx+4;x<sx+sw-2;x+=6)line(ctx,x,sy+2,x,sy+b.height*.20,'rgba(190,205,196,.38)',.6);
    }
    ctx.restore();
  }

  function streetBounds(map,S){
    const points=[];
    for(const r of map.roads||[])for(const p of r.points||[])points.push([S(p[0]),S(p[1])]);
    if(!points.length)return null;
    const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);
    return{minX:Math.min(...xs),maxX:Math.max(...xs),minY:Math.min(...ys),maxY:Math.max(...ys)};
  }

  function drawStreetProps(ctx,map,S,bounds=null){
    if(!ctx||!map)return;
    const box=streetBounds(map,S);if(!box)return;
    const seed=hashText(map.key||'cable-street');
    const inside=(x,y)=>!bounds||!(x<bounds.x-30||x>bounds.x+bounds.w+30||y<bounds.y-30||y>bounds.y+bounds.h+30);
    ctx.save();
    for(let i=0;i<26;i++){
      const u=seededUnit(seed,i*5+1),v=seededUnit(seed,i*5+2);
      const x=box.minX+(box.maxX-box.minX)*u,y=box.minY+(box.maxY-box.minY)*v;
      if(!inside(x,y))continue;
      const kind=i%5;
      if(kind===0){
        // Cast-iron lamp.
        ellipse(ctx,x,y+2,4.8,1.7,'rgba(28,31,29,.22)');
        line(ctx,x,y,x,y-25,'#3d4441',2.2);line(ctx,x-1,y-18,x+1,y-18,'#8c8b79',.7);
        ctx.fillStyle='#48504c';ctx.fillRect(x-4,y-28,8,7);ctx.fillStyle='rgba(225,205,142,.42)';ctx.fillRect(x-2.5,y-26.5,5,4);
      }else if(kind===1){
        // Wooden crates.
        ctx.fillStyle=PALETTE.timber;ctx.fillRect(x-7,y-7,14,11);ctx.strokeStyle=PALETTE.timberDark;ctx.lineWidth=.8;ctx.strokeRect(x-7,y-7,14,11);
        line(ctx,x-6,y-6,x+6,y+3,PALETTE.timberDark,.8);line(ctx,x+6,y-6,x-6,y+3,PALETTE.timberDark,.8);
      }else if(kind===2){
        // Coal sacks / street clutter.
        ellipse(ctx,x,y-1,6,7,'#41413d');ellipse(ctx,x-2,y-4,3,2,'#55544d',.65);
      }else if(kind===3){
        // Poster pasted to a wall/fence proxy.
        ctx.save();ctx.translate(x,y-7);ctx.rotate((seededUnit(seed,i+99)-.5)*.18);
        ctx.fillStyle='rgba(210,199,165,.82)';ctx.fillRect(-4,-5,8,10);
        line(ctx,-2.5,-2,2.5,-2,'#695d4e',.55);line(ctx,-2.5,1,1.7,1,'#695d4e',.55);ctx.restore();
      }else{
        // Barrel.
        ctx.fillStyle='#635246';ctx.fillRect(x-4,y-8,8,10);ellipse(ctx,x,y-8,4,1.5,'#82705b');ellipse(ctx,x,y+2,4,1.4,'#493e37');
        line(ctx,x-4,y-4,x+4,y-4,'#2f3330',.8);
      }
    }
    ctx.restore();
  }

  function drawBarricade(ctx,b,clock=0){
    const points=Array.isArray(b.points)?b.points:[];
    if(points.length<3)return;
    const ratio=b.maxIntegrity>0?clamp(b.integrity/b.maxIntegrity,0,1):0;
    const c=centerOf(points);if(!c)return;
    const tier=Math.max(0,b.constructionTier|0);
    const seed=hashText(b.id);
    ctx.save();
    polygon(ctx,points,b.breached?'rgba(91,70,49,.28)':'rgba(96,72,46,.58)',b.breached?'rgba(174,149,111,.45)':'rgba(211,186,137,.72)',1.2);
    ellipse(ctx,c.x+2,c.y+8,22,5,'rgba(25,25,22,.24)');

    // Layered furniture, timber, sacks and cart fragments rather than a flat polygon.
    const pieces=6+tier*2;
    for(let i=0;i<pieces;i++){
      const a=seededUnit(seed,i*3+1)*TAU;
      const rx=(seededUnit(seed,i*3+2)-.5)*30;
      const ry=(seededUnit(seed,i*3+3)-.5)*13;
      ctx.save();ctx.translate(c.x+rx,c.y+ry);ctx.rotate(a*.18);
      if(i%4===0){
        ctx.fillStyle='#6a5747';ctx.fillRect(-7,-5,14,9);ctx.strokeStyle='#392f28';ctx.lineWidth=.8;ctx.strokeRect(-7,-5,14,9);
        line(ctx,-6,-4,6,3,'#443429',.8);
      }else if(i%4===1){
        ctx.strokeStyle='#7f5938';ctx.lineWidth=3.4;ctx.beginPath();ctx.moveTo(-12,0);ctx.lineTo(12,-2);ctx.stroke();
        ctx.strokeStyle='#b07b49';ctx.lineWidth=1;ctx.stroke();
      }else if(i%4===2){
        ellipse(ctx,0,0,7,5,'#5d5b4d');line(ctx,-4,-1,4,-1,'#777463',.8);
      }else{
        ctx.fillStyle='#594a3e';ctx.fillRect(-8,-4,16,7);
        ellipse(ctx,-6,5,3,3,'#2e302e');ellipse(ctx,6,5,3,3,'#2e302e');
      }
      ctx.restore();
    }
    if(b.breached){
      for(let i=0;i<5;i++){
        const t=(clock*.4+i*.19)%1;
        ellipse(ctx,c.x-18+i*9,c.y+2-t*10,2+t*2,1.2+t,'#9b8b72',1-t);
      }
    }

    // Readability: compact integrity strip and label.
    ctx.fillStyle='rgba(24,27,23,.78)';ctx.fillRect(c.x-20,c.y+17,40,5);
    ctx.fillStyle=b.breached?'#a77c59':ratio<.4?'#c28b58':'#d8c275';ctx.fillRect(c.x-19,c.y+18,38*ratio,3);
    ctx.strokeStyle='rgba(225,211,173,.6)';ctx.lineWidth=.6;ctx.strokeRect(c.x-20,c.y+17,40,5);
    ctx.fillStyle='#eee0b7';ctx.font='700 7px system-ui,sans-serif';ctx.textAlign='center';
    ctx.fillText((b.label||b.id)+' '+Math.round(ratio*100)+'%',c.x,c.y+31);
    ctx.restore();
  }

  function drawMaterial(ctx,m,clock=0){
    if(!Number.isFinite(m.x)||!Number.isFinite(m.y))return;
    const pulse=m.carriedBy?0:Math.sin(clock*2.6+hashText(m.id)%7)*.5+.5;
    ctx.save();ctx.translate(m.x,m.y);
    ellipse(ctx,0,6,11,3.5,'rgba(20,20,17,.28)');
    if(m.type==='timber'){
      [-5,0,5].forEach((y,i)=>{line(ctx,-11,y,11,y-2,PALETTE.timberDark,4);line(ctx,-10,y-1,10,y-3,i%2?PALETTE.timberLight:PALETTE.timber,1.5)});
    }else if(m.type==='crates'){
      ctx.fillStyle=PALETTE.timberLight;ctx.fillRect(-10,-9,20,15);ctx.strokeStyle=PALETTE.timberDark;ctx.lineWidth=1;ctx.strokeRect(-10,-9,20,15);
      line(ctx,-9,-8,9,5,PALETTE.timberDark,1);line(ctx,9,-8,-9,5,PALETTE.timberDark,1);
    }else if(m.type==='cart'){
      ctx.fillStyle='#79583f';ctx.fillRect(-13,-9,26,12);line(ctx,-11,-6,11,-6,'#a87d55',1.2);
      ellipse(ctx,-9,6,4.5,4.5,'#2d312f');ellipse(ctx,9,6,4.5,4.5,'#2d312f');
      ellipse(ctx,-9,6,2.3,2.3,'#8b816e');ellipse(ctx,9,6,2.3,2.3,'#8b816e');
    }else{
      ctx.fillStyle='#8e6745';ctx.fillRect(-8,-7,16,12);
    }
    if(!m.carriedBy){
      ctx.globalAlpha=.5+.25*pulse;ctx.strokeStyle='#ead28b';ctx.lineWidth=1;
      ctx.beginPath();ctx.ellipse(0,0,15+pulse*2,10+pulse,0,0,TAU);ctx.stroke();ctx.globalAlpha=1;
      ctx.fillStyle='#efe1b5';ctx.font='700 7px system-ui,sans-serif';ctx.textAlign='center';ctx.fillText(String(m.label||m.type).toUpperCase(),0,-15);
    }
    ctx.restore();
  }

  function drawCivilian(ctx,p,clock=0){
    if(!Number.isFinite(p.x)||!Number.isFinite(p.y)||p.status==='exited')return;
    const seed=hashText(p.id),variant=seed%COATS.length,assisted=p.status==='assisted'||p.status==='evacuating';
    const sway=Math.sin(clock*2.2+(seed%31))*.7;
    ctx.save();ctx.translate(p.x,p.y+sway);
    ellipse(ctx,0,6,6,2.2,'rgba(25,27,23,.22)');
    ctx.fillStyle=COATS[variant];ctx.beginPath();ctx.roundRect(-4,-5,8,13,[3,3,2,2]);ctx.fill();
    ctx.fillStyle=SKIN[variant%SKIN.length];ctx.beginPath();ctx.arc(0,-9,3.4,0,TAU);ctx.fill();
    ctx.fillStyle=HATS[variant%HATS.length];ctx.beginPath();ctx.ellipse(0,-11,4.2,1.9,0,0,TAU);ctx.fill();
    ctx.strokeStyle='#403e36';ctx.lineWidth=1.5;
    ctx.beginPath();ctx.moveTo(-2,7);ctx.lineTo(-3.5,12);ctx.moveTo(2,7);ctx.lineTo(3.5,12);ctx.stroke();
    if(!assisted){line(ctx,-4,-1,-7+sway,5,COATS[variant],2);line(ctx,4,-1,7-sway,4,COATS[variant],2);}
    ctx.fillStyle=assisted?'#a9d0aa':'#eee2bc';ctx.font='700 7px system-ui,sans-serif';ctx.textAlign='center';
    ctx.fillText(assisted?'SAFE':'ASSIST',0,-17);
    ctx.restore();
  }

  // Priority 2 + 3: individualised crowd silhouettes with explicit animation states.
  function drawCrowdPerson(ctx,p,clock){
    const helper=p.role==='helper',variant=(p.variant||0)%COATS.length;
    const state=p.animState||'idle',phase=(p.animPhase||0)+clock*.25;
    const moving=state==='walk'||state==='panic'||state==='support';
    const stride=moving?Math.sin(phase*5.5)*(state==='panic'?3.1:2.1):0;
    const bob=moving?Math.cos(phase*11)*.7:Math.sin(phase*1.6)*.25;
    const dir=Number.isFinite(p.dir)?p.dir:0,dx=Math.cos(dir),dy=Math.sin(dir);
    const coat=helper?'#796a4c':COATS[variant],hat=HATS[(variant+2)%HATS.length],skin=SKIN[variant%SKIN.length];
    ctx.save();ctx.translate(p.x,p.y+bob);
    ellipse(ctx,0,6,6.5,2.2,'rgba(22,24,21,.22)');
    // Legs.
    for(const side of [-1,1]){
      const sx=side*2.2,footX=sx+dx*stride*side,footY=8+dy*stride*side+Math.abs(stride)*.25;
      line(ctx,sx,3,footX,footY,'#30322e',2.4);
      line(ctx,footX-1.6,footY,footX+1.8,footY,'#252927',1.8);
    }
    // Coat.
    ctx.fillStyle=coat;ctx.strokeStyle='#3b3b34';ctx.lineWidth=.7;ctx.beginPath();ctx.roundRect(-4.5,-6,9,11,[3,3,1.5,1.5]);ctx.fill();ctx.stroke();
    ctx.fillStyle=skin;ctx.beginPath();ctx.arc(dx*1.1,-10.2,3.1,0,TAU);ctx.fill();
    if(variant%3===0){
      ctx.fillStyle=hat;ctx.beginPath();ctx.ellipse(dx*.7,-12.1,4.4,1.7,0,0,TAU);ctx.fill();ctx.fillRect(-2.8+dx*.6,-13.1,5.6,1.5);
    }else if(variant%3===1){
      ctx.fillStyle=hat;ctx.beginPath();ctx.arc(dx*.8,-12,3.4,Math.PI,TAU);ctx.fill();
    }else{
      ctx.fillStyle='#5c493f';ctx.beginPath();ctx.ellipse(dx*.6,-12,3.2,2,0,0,TAU);ctx.fill();
    }
    // Arms communicate intent.
    const armSwing=moving?stride*.55:Math.sin(phase*2)*.8;
    if(state==='support'){
      line(ctx,-4,-2,-8,-6-armSwing,coat,2.2);line(ctx,4,-2,8,-6+armSwing,coat,2.2);
    }else if(state==='gesture'){
      line(ctx,-4,-2,-7,3,coat,2.2);line(ctx,4,-2,8,-9,coat,2.2);ellipse(ctx,8,-9,1.2,1.2,skin);
    }else if(state==='brace'){
      line(ctx,-4,-2,-8,2,coat,2.2);line(ctx,4,-2,8,2,coat,2.2);
      ctx.save();ctx.globalAlpha=.65;line(ctx,-9,4,9,4,'#8a623e',2.2);ctx.restore();
    }else{
      line(ctx,-4,-2,-7-armSwing,4,coat,2.2);line(ctx,4,-2,7+armSwing,4,coat,2.2);
    }
    if(helper){ctx.fillStyle='rgba(231,215,161,.8)';ctx.fillRect(-2,-15,4,2);}
    ctx.restore();
  }

  function drawCrowd(ctx,people,clock=0){
    if(!ctx||!Array.isArray(people))return;
    const ordered=[...people].sort((a,b)=>(a.y||0)-(b.y||0));
    for(const p of ordered){
      if(!Number.isFinite(p.x)||!Number.isFinite(p.y))continue;
      drawCrowdPerson(ctx,p,clock);
    }
  }

  function drawFormation(ctx,p,clock=0){
    if(!Number.isFinite(p.x)||!Number.isFinite(p.y))return;
    const width=Math.max(20,Number(p.width)||24),count=clamp(Math.round(width/8),3,9);
    const state=String(p.state||'approach');
    const moving=state==='approach'||state==='withdraw'||state==='regroup';
    const pressure=state==='dismantle';
    const stride=Math.sin(clock*7+(hashText(p.id)%17))*(moving?1.8:.35);
    ctx.save();ctx.translate(p.x,p.y);ctx.rotate((p.dir||0)+Math.PI/2);
    ellipse(ctx,0,7,width*.55,4,'rgba(22,25,24,.22)');
    for(let i=0;i<count;i++){
      const x=-width/2+(count===1?0:i/(count-1)*width);
      const offset=(i%2?1:-1)*stride;
      // 1930s police silhouette: dark tunic, custodian helmet, baton.
      line(ctx,x-1.8,1,x-2+offset,9,PALETTE.police,2.5);
      line(ctx,x+1.8,1,x+2-offset,9,PALETTE.police,2.5);
      ctx.fillStyle=PALETTE.policeLight;ctx.beginPath();ctx.roundRect(x-3.2,-7,6.4,10,[2,2,1,1]);ctx.fill();
      ctx.fillStyle='#d1a47e';ctx.beginPath();ctx.arc(x,-10,2.4,0,TAU);ctx.fill();
      ctx.fillStyle=PALETTE.police;ctx.beginPath();ctx.ellipse(x,-12,3.4,2,0,0,TAU);ctx.fill();ctx.fillRect(x-1.4,-15,2.8,3.5);
      const arm=pressure?Math.sin(clock*9+i)*2.6:stride*.45;
      line(ctx,x+3,-4,x+6,-1+arm,PALETTE.policeLight,1.8);
      line(ctx,x+6,-1+arm,x+8,5+arm,'#433a31',1.1);
    }
    if(pressure){
      ctx.strokeStyle='rgba(222,186,118,.62)';ctx.lineWidth=1.2;ctx.setLineDash([4,4]);
      ctx.beginPath();ctx.moveTo(-width*.55,12);ctx.lineTo(width*.55,12);ctx.stroke();ctx.setLineDash([]);
    }
    ctx.fillStyle='#e8ddb9';ctx.font='700 7px system-ui,sans-serif';ctx.textAlign='center';
    ctx.fillText(state.toUpperCase(),0,-21);
    ctx.restore();
  }

  function volunteerJob(state,index){
    if(!state||!Array.isArray(state.jobs))return null;
    return state.jobs.find(j=>j.actorId==='player-'+index&&(j.status==='working'||j.status==='waiting'||j.status==='queued'))||null;
  }

  function drawVolunteer(ctx,ent,art,{state=null,index=0,clock=0}={}){
    if(!ctx||!ent||!art)return;
    art.drawActor(ctx,ent,'civilian');
    const job=volunteerJob(state,index);
    const actor=state&&Array.isArray(state.actors)?state.actors.find(a=>a.id==='player-'+index):null;
    const carrying=actor&&actor.carrying;
    const seed=hashText(ent.name||index),variant=seed%5;
    ctx.save();ctx.translate(ent.x,ent.y);
    // Distinguishing scarf/cap highlight keeps player volunteers readable inside a large crowd.
    ctx.strokeStyle=['#cfb85e','#8fb4a8','#b98968','#a89abb','#c8aa7c'][variant];ctx.lineWidth=2.2;
    ctx.beginPath();ctx.arc(0,-16,5.5,.1,Math.PI-.1);ctx.stroke();
    if(job&&job.status==='working'){
      const t=job.duration?clamp(job.progress/job.duration,0,1):0;
      const swing=Math.sin(clock*11+index)*4;
      if(job.action==='reinforce'||job.action==='hold'){
        line(ctx,-5,-9,-10,-2-swing*.3,'#dbc091',2);
        line(ctx,5,-9,10,-2+swing*.3,'#dbc091',2);
        if(job.action==='reinforce'){
          line(ctx,8,-3,12,-7+swing,'#76502f',2);
          ellipse(ctx,12,-7+swing,2,1.4,'#ae8557');
        }
      }else if(job.action==='assist'){
        ctx.strokeStyle='rgba(147,202,173,.72)';ctx.lineWidth=1.4;ctx.beginPath();ctx.arc(0,-4,10+t*4,0,TAU);ctx.stroke();
      }
    }
    if(carrying){
      ctx.fillStyle='rgba(238,214,137,.86)';ctx.beginPath();ctx.arc(0,-23,2.5,0,TAU);ctx.fill();
    }
    ctx.restore();
  }

  function drawJobMarkers(ctx,state,clock=0){
    for(const job of state.jobs||[]){
      if(job.status!=='waiting'&&job.status!=='working')continue;
      let target=null;
      if(job.targetType==='barricade')target=(state.barricades||[]).find(x=>x.id===job.targetId);
      if(job.targetType==='material')target=(state.materials||[]).find(x=>x.id===job.targetId);
      if(job.targetType==='civilian')target=(state.civilians||[]).find(x=>x.id===job.targetId);
      const c=target&&Number.isFinite(target.x)&&Number.isFinite(target.y)?{x:target.x,y:target.y}:centerOf(target&&target.points);
      if(!c)continue;
      const pulse=1+Math.sin(clock*5+(hashText(job.id)%8))*.12;
      ctx.save();ctx.strokeStyle=job.status==='working'?'rgba(240,208,127,.88)':'rgba(235,224,183,.55)';
      ctx.lineWidth=1.2;ctx.setLineDash(job.status==='working'?[]:[4,4]);
      ctx.beginPath();ctx.arc(c.x,c.y,14*pulse,0,TAU);ctx.stroke();ctx.restore();
    }
  }

  // Priority 4: visible but restrained work/pressure effects.
  function drawEffects(ctx,state,clock=0){
    if(!ctx||!state)return;
    const barricades=state.barricades||[];
    for(const job of state.jobs||[]){
      if(job.status!=='working')continue;
      let target=null;
      if(job.targetType==='barricade')target=barricades.find(b=>b.id===job.targetId);
      if(job.targetType==='civilian')target=(state.civilians||[]).find(p=>p.id===job.targetId);
      const c=target&&Number.isFinite(target.x)&&Number.isFinite(target.y)?target:centerOf(target&&target.points);
      if(!c)continue;
      if(job.action==='reinforce'){
        for(let i=0;i<6;i++){
          const t=(clock*1.8+i*.17)%1,a=(i*2.399)+(hashText(job.id)%7);
          ellipse(ctx,c.x+Math.cos(a)*t*17,c.y-2+Math.sin(a)*t*8-t*7,1.7-t*.7,1-t*.4,i%2?'#b79a6a':'#8b6d4d',1-t);
        }
      }else if(job.action==='hold'){
        const pulse=.35+.15*Math.sin(clock*5);
        ellipse(ctx,c.x,c.y,24,8,'#d8c171',pulse*.18);
      }else if(job.action==='assist'){
        for(let i=0;i<3;i++){
          const t=(clock*.7+i*.33)%1;
          ellipse(ctx,c.x-5+i*5,c.y-12-t*8,1.6,1.6,'#b9d1b4',1-t);
        }
      }
    }
    for(const f of state.formations||[]){
      if(f.state!=='dismantle')continue;
      const objective=barricades.find(b=>b.id===f.objective),c=objective&&centerOf(objective.points);
      if(!c)continue;
      for(let i=0;i<5;i++){
        const t=(clock*1.4+i*.21)%1;
        ellipse(ctx,c.x+(i-2)*5,c.y+4-t*14,2+t*2,1.1+t,'#837b69',(1-t)*.42);
      }
    }
  }

  function drawGround(ctx,state,clock=0){
    if(!ctx||!state)return;
    const items=[];
    for(const b of state.barricades||[]){const c=centerOf(b.points)||b;items.push({y:c.y||0,draw:()=>drawBarricade(ctx,b,clock)})}
    for(const m of state.materials||[])if(!m.carriedBy)items.push({y:m.y||0,draw:()=>drawMaterial(ctx,m,clock)});
    for(const p of state.civilians||[])items.push({y:p.y||0,draw:()=>drawCivilian(ctx,p,clock)});
    for(const f of state.formations||[])items.push({y:f.y||0,draw:()=>drawFormation(ctx,f,clock)});
    items.sort((a,b)=>a.y-b.y).forEach(item=>item.draw());
    drawJobMarkers(ctx,state,clock);
  }

  function drawCarried(ctx,state,clock=0){
    if(!ctx||!state)return;
    for(const m of state.materials||[])if(m.carriedBy)drawMaterial(ctx,m,clock);
  }

  function drawHint(ctx,{x,y,label}={}){
    if(!ctx||!Number.isFinite(x)||!Number.isFinite(y)||!label)return;
    ctx.save();
    const w=Math.max(54,String(label).length*5.5+12),h=17;
    ctx.fillStyle='rgba(25,31,25,.88)';ctx.strokeStyle='rgba(226,207,146,.82)';ctx.lineWidth=1;
    ctx.beginPath();ctx.roundRect(x-w/2,y-34,w,h,4);ctx.fill();ctx.stroke();
    ctx.fillStyle='#f0dfad';ctx.font='700 8px system-ui,sans-serif';ctx.textAlign='center';ctx.fillText(label,x,y-22);
    ctx.restore();
  }

  function drawScenery(ctx,map,S){
    if(!ctx||!map)return;
    const area=(map.gameplayAdjustments||[]).find(a=>a.id==='coal-depot-closed');
    if(area){
      const pts=area.points.map(p=>[S(p[0]),S(p[1])]);
      ctx.save();polygon(ctx,pts,'#777671','#454946',3);ctx.clip();
      const xs=pts.map(p=>p[0]),ys=pts.map(p=>p[1]),minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
      for(let x=minX+30;x<maxX;x+=58){
        ellipse(ctx,x,maxY-24,23,10,'#3a3b38');line(ctx,x-17,maxY-29,x,maxY-39,'#5c5f58',2);line(ctx,x,maxY-39,x+18,maxY-28,'#5c5f58',2);
      }
      ctx.fillStyle='rgba(219,208,175,.72)';ctx.font='bold 10px system-ui';ctx.textAlign='center';ctx.fillText('COAL DEPOT',(minX+maxX)/2,(minY+maxY)/2);
      ctx.restore();
    }
  }

  function drawAtmosphere(ctx,{viewWidth=0,viewHeight=0,clock=0,pressure=0}={}){
    if(!ctx||!viewWidth||!viewHeight)return;
    ctx.save();
    // Subtle soot/haze and paper movement without obscuring play.
    const haze=ctx.createLinearGradient(0,0,0,viewHeight);
    haze.addColorStop(0,'rgba(45,46,43,.10)');haze.addColorStop(.55,'rgba(70,65,57,.025)');haze.addColorStop(1,'rgba(25,30,27,.12)');
    ctx.fillStyle=haze;ctx.fillRect(0,0,viewWidth,viewHeight);
    for(let i=0;i<8;i++){
      const x=((i*173+clock*13)% (viewWidth+80))-40;
      const y=((i*91+Math.sin(clock*.4+i)*24)%Math.max(1,viewHeight-30))+15;
      ctx.save();ctx.translate(x,y);ctx.rotate(Math.sin(clock+i)*.45);
      ctx.globalAlpha=.11+pressure*.05;ctx.fillStyle=PALETTE.paper;ctx.fillRect(-2.5,-1.5,5,3);ctx.restore();
    }
    const vignette=ctx.createRadialGradient(viewWidth/2,viewHeight/2,Math.min(viewWidth,viewHeight)*.28,viewWidth/2,viewHeight/2,Math.max(viewWidth,viewHeight)*.72);
    vignette.addColorStop(0,'rgba(0,0,0,0)');vignette.addColorStop(1,'rgba(7,12,10,.18)');
    ctx.fillStyle=vignette;ctx.fillRect(0,0,viewWidth,viewHeight);
    ctx.restore();
  }

  function drawRegroup(ctx,p,clock=0){
    const pulse=1+Math.sin(clock*4)*.08;
    ctx.save();ctx.strokeStyle='#95c7ed';ctx.lineWidth=2.5;ctx.setLineDash([8,5]);
    ctx.beginPath();ctx.arc(p.x,p.y,30*pulse,0,TAU);ctx.stroke();ctx.setLineDash([]);
    ctx.fillStyle='#e3f2ff';ctx.font='bold 11px system-ui';ctx.textAlign='center';ctx.fillText('REGROUP',p.x,p.y-40);ctx.restore();
  }

  return{
    buildingStyle,drawRoad,drawFacadeDetails,drawStreetProps,drawScenery,
    drawGround,drawCarried,drawCrowd,drawVolunteer,drawEffects,drawAtmosphere,
    drawHint,drawRegroup
  };
});