/* Cable Street presentation layer.
   Environment, crowd, police pressure and street-conflict effects. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.BadFodderCableArt=api;
})(typeof window!=='undefined'?window:globalThis,function(){
  'use strict';

  const TAU=Math.PI*2,ACTOR_SIZE=typeof window!=='undefined'?window.BadFodderActorScale?.size||1:1;
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
      cache.set(key,ent);art.animate(ent,(hashText(key)%1000)/1000);
    }
    const old=Number.isFinite(ent._clock)?ent._clock:clock,dt=clamp(Number.isFinite(clock)?clock-old:1/60,0,.08);
    ent.periodRole=p.periodRole||null;
    ent._clock=clock;ent.x=p.x;ent.y=p.y;ent.dir=Number.isFinite(p.dir)?p.dir:ent.dir;ent.variant=p.variant||0;ent.alive=true;
    if(p.animState)ent.state=/panic|run/.test(p.animState)?'run':/support|walk/.test(p.animState)?'walk':'idle';
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
      family:'east-end-brick',height:scale(14+Math.floor(seededUnit(seed,1)*4)),
      wall:walls[Math.floor(seededUnit(seed,2)*walls.length)],roof:roofs[Math.floor(seededUnit(seed,3)*roofs.length)],
      door:doors[Math.floor(seededUnit(seed,4)*doors.length)],trim:seededUnit(seed,5)>.5?'#b8aa8e':'#8e846f',
      facadeVariant:Math.floor(seededUnit(seed,6)*4),shopfront:seededUnit(seed,7)>.72
    };
  }

  function drawRoad(ctx,r,S,art){
    if(!ctx||!r||!Array.isArray(r.points)||r.points.length<2)return;
    const scale=typeof S==='function'?S:(n=>n);
    const path=()=>{ctx.beginPath();ctx.moveTo(r.points[0][0],r.points[0][1]);for(let i=1;i<r.points.length;i++)ctx.lineTo(r.points[i][0],r.points[i][1])};
    ctx.save();ctx.lineCap='round';ctx.lineJoin='round';
    if(r.kind==='railway'){
      path();ctx.strokeStyle='#303436';ctx.lineWidth=scale(7);ctx.stroke();
      path();ctx.strokeStyle='#68665f';ctx.lineWidth=scale(4);ctx.stroke();
      ctx.setLineDash([scale(1.5),scale(3.5)]);path();ctx.strokeStyle='#c1b59a';ctx.lineWidth=scale(.85);ctx.stroke();ctx.setLineDash([]);
    }else{
      const paving=art&&typeof art.texture==='function'?art.texture(ctx,'urban-paving'):'#777969';
      const asphalt=art&&typeof art.texture==='function'?art.texture(ctx,'urban-asphalt'):'#696b61';
      path();ctx.strokeStyle='#777969';ctx.lineWidth=scale(5);ctx.stroke();
      path();ctx.strokeStyle=paving;ctx.lineWidth=scale(3.2);ctx.stroke();
      path();ctx.strokeStyle=asphalt;ctx.lineWidth=scale(1.8);ctx.stroke();
    }
    ctx.restore();
  }

  // Facade coordinates follow each footprint edge, so detail stays on diagonal terraces.
  function drawFacadeDetails(ctx,b,zoom=1,wall=null){
    if(!ctx||!b||b.hidden||b.family!=='east-end-brick')return;
    const mesh=b.artMesh;if(!mesh)return;
    const seed=hashText((b.name||'building')+'|'+b.i),walls=wall?[wall]:mesh.walls;
    for(const side of walls){
      const a=side.a[0]<=side.b[0]?side.a:side.b,d=a===side.a?side.b:side.a,dx=d[0]-a[0],dy=d[1]-a[1],len=Math.hypot(dx,dy);if(len<14||dx<1)continue;
      const ux=dx/len,uy=dy/len,h=b.height,rows=2,count=clamp(Math.floor(len/17),1,8);
      // Hide the rear elevations just as the roof hides them in the scene.
      const front=(a[1]+d[1])/2>=mesh.cy-2;
      ctx.save();polygon(ctx,side.points,null);ctx.clip();
      ctx.transform(ux,uy,0,1,a[0],a[1]);
      ctx.strokeStyle='rgba(224,191,153,.24)';ctx.lineWidth=.55;
      for(let y=-h+3,row=0;y<0;y+=4,row++){
        line(ctx,0,y,len,y,'rgba(232,193,151,.22)',.55);
        for(let x=(row%2)*5;x<len;x+=10)line(ctx,x,y,x,y+4,'rgba(49,36,31,.22)',.55);
      }
      line(ctx,0,-h+1,len,-h+1,'#d0b695',1.8);
      line(ctx,0,-h*.49,len,-h*.49,'rgba(208,177,137,.55)',1);
      line(ctx,0,-1,len,-1,'#463d34',2.5);
      const shop=front&&len>32&&seededUnit(seed,7)>.66;
      for(let row=0;row<rows;row++)for(let i=0;i<count;i++){
        if(shop&&row===0)continue;
        const x=(i+.5)*len/count,y=-h*(row+.55)/rows,w=Math.min(7,len/count*.48),wh=Math.min(9,h/rows*.6);
        ctx.fillStyle='#c9b390';ctx.fillRect(x-w/2-1,y-wh-1,w+2,wh+2);
        ctx.fillStyle='#253a3e';ctx.fillRect(x-w/2,y-wh,w,wh);
        ctx.fillStyle='#75969b';ctx.fillRect(x-w/2+.7,y-wh+.7,w-1.4,wh*.32);
        line(ctx,x,y-wh,x,y,'#b6b6a0',.7);line(ctx,x-w/2,y-wh*.48,x+w/2,y-wh*.48,'#b6b6a0',.7);
        line(ctx,x-w/2-1.5,y+1.5,x+w/2+1.5,y+1.5,'#e0c9a0',1.2);
      }
      if(front){
        const doorX=len*.22,doorH=h*.4;
        ctx.fillStyle='#c9b390';ctx.fillRect(doorX-4,-doorH-1,8,doorH+1);
        ctx.fillStyle=b.door;ctx.fillRect(doorX-3,-doorH,6,doorH);
        ctx.strokeStyle='#9b9980';ctx.lineWidth=.6;ctx.strokeRect(doorX-2,-doorH+2,4,doorH*.35);
        ellipse(ctx,doorX+1.7,-doorH*.35,.65,.65,'#e3c887');
        if(shop){
          const x=len*.37,w=len*.55,y=-h*.43;
          ctx.fillStyle=['#355d62','#72513f','#4d536b'][b.i%3];ctx.fillRect(x,y,w,h*.43);
          ctx.fillStyle='#284044';ctx.fillRect(x+2,y+5,w-4,h*.43-7);
          line(ctx,x+w/2,y+5,x+w/2,-2,'#c7b28c',1);
          line(ctx,x+3,y+6,x+w-3,y+6,'#9eb4ae',1);
          ctx.fillStyle='#d3bb88';ctx.font='bold 5px serif';ctx.textAlign='center';
          ctx.fillText(['GROCER','TAILOR','BAKERY','PROVISIONS'][b.i%4],x+w/2,y+3.7);
        }
        if(seed%4===0){
          ctx.fillStyle='#ded0ae';ctx.fillRect(len-9,-h*.38,5,8);
          line(ctx,len-8,-h*.38+2,len-5,-h*.38+2,'#786750',.6);
          line(ctx,len-8,-h*.38+4,len-5,-h*.38+4,'#786750',.6);
        }
      }
      ctx.restore();
    }
  }

  function drawBuilding(ctx,b,art,meshFactory){
    if(!ctx||!b||b.hidden)return;
    const mesh=b.artMesh||(b.artMesh=meshFactory(b.points,b.height));if(!mesh)return;
    ctx.save();ctx.lineJoin='round';ctx.lineCap='round';
    ctx.save();ctx.translate(6,8);polygon(ctx,b.points,'rgba(24,31,31,.25)');ctx.restore();
    for(const wall of mesh.walls){
      polygon(ctx,wall.points,b.wall,'#524138',.8);
      if(art&&art.texture){
        ctx.save();polygon(ctx,wall.points,null);ctx.clip();ctx.globalAlpha=.35;ctx.globalCompositeOperation='multiply';
        ctx.fillStyle=art.texture(ctx,'urban-brick');ctx.fillRect(b.minX-2,b.minY-b.height-mesh.rise-2,b.maxX-b.minX+4,b.maxY-b.minY+b.height+mesh.rise+4);ctx.restore();
      }
      polygon(ctx,wall.points,wall.b[1]>wall.a[1]?'rgba(35,37,41,.2)':'rgba(255,221,174,.09)');
      drawFacadeDetails(ctx,b,1,wall);
    }
    for(const plane of [...mesh.planes].sort((a,b)=>a.points[0][1]-b.points[0][1])){
      polygon(ctx,plane.points,b.roof,'#303b3d',1.3);
      if(art&&art.texture){
        ctx.save();polygon(ctx,plane.points,null);ctx.clip();ctx.transform(...plane.transform);ctx.globalAlpha=.7;
        ctx.fillStyle=art.texture(ctx,'urban-roof');ctx.fillRect(-mesh.length/2-2,-mesh.half-2,mesh.length+4,mesh.half*2+4);
        // Slate courses follow the actual roof slope rather than the screen axes.
        for(let y=-mesh.half;y<mesh.half;y+=5)line(ctx,-mesh.length/2,y,mesh.length/2,y,'rgba(189,200,202,.2)',.65);
        ctx.restore();
      }
      polygon(ctx,plane.points,plane.sign<0?'rgba(219,208,181,.12)':'rgba(17,30,40,.24)');
    }
    for(const ridge of mesh.ridges){line(ctx,...ridge[0],...ridge[1],'#394144',2.7);line(ctx,...ridge[0],...ridge[1],'#a3aaa1',.8)}
    for(const u of (mesh.length>70?[-.29,.29]:[.2])){
      const [x,y]=mesh.project({u:mesh.length*u,v:-mesh.half*.15});
      polygon(ctx,[[x-4,y+2],[x+4,y+2],[x+4,y-10],[x-4,y-10]],'#986b50','#503f36',.7);
      polygon(ctx,[[x+4,y+2],[x+7,y],[x+7,y-12],[x+4,y-10]],'#624a3c');
      polygon(ctx,[[x-5,y-10],[x+4,y-10],[x+7,y-12],[x-2,y-12]],'#c6a783','#59483d',.7);
      for(const offset of [-2,2]){ctx.fillStyle='#9a6b4d';ctx.fillRect(x+offset-1,y-16,2,5);ellipse(ctx,x+offset,y-16,1.5,.75,'#3b3330')}
      line(ctx,x-4,y-3,x+4,y-3,'#c59d7a',.6);line(ctx,x-4,y-7,x+4,y-7,'#c59d7a',.6);
    }
    ctx.restore();
  }

  function pointInPolygon(x,y,points){
    let inside=false;for(let i=0,j=points.length-1;i<points.length;j=i++){
      const a=points[i],b=points[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])inside=!inside;
    }return inside;
  }
  function streetSurfaces(map){
    const areas=(map.areas||[]).filter(a=>a.type==='asphalt').map(a=>a.points);
    const groups=new Map();for(const r of map.roads||[]){if(r.kind==='railway')continue;const key=r.name||r.label;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(r)}
    for(const [name,roads] of groups)if(name!=='Cable Street'&&roads.length===2)areas.push([...roads[0].points,...roads[1].points.slice().reverse()]);
    return areas;
  }
  function drawStreetSurface(ctx,map,S,art,bounds=null){
    if(!ctx||!map)return;
    for(const raw of streetSurfaces(map)){
      const pts=raw.map(p=>[S(p[0]),S(p[1])]),xs=pts.map(p=>p[0]),ys=pts.map(p=>p[1]),x=Math.min(...xs),y=Math.min(...ys),w=Math.max(...xs)-x,h=Math.max(...ys)-y;
      if(bounds&&(x+w<bounds.x||x>bounds.x+bounds.w||y+h<bounds.y||y>bounds.y+bounds.h))continue;
      const asphalt=art&&typeof art.texture==='function'?art.texture(ctx,'urban-asphalt'):'#696b61';
      const paving=art&&typeof art.texture==='function'?art.texture(ctx,'urban-paving'):'#8b8779';
      // Match Wigan's road material stack: dark kerb edge, paving strip, then the shared asphalt texture.
      ctx.save();
      polygon(ctx,pts,asphalt,'#777969',S(2.5));
      polygon(ctx,pts,null,paving,S(1.5));
      ctx.restore();
    }
  }
  function drawStreetProps(ctx,map,S,bounds=null){
    if(!ctx||!map)return;
    const surfaces=streetSurfaces(map),inside=(x,y)=>!bounds||!(x<bounds.x-60||x>bounds.x+bounds.w+60||y<bounds.y-60||y>bounds.y+bounds.h+60);
    ctx.save();
    for(const r of map.roads||[]){
      if(r.kind==='railway')continue;let distance=0,slot=0;
      for(let n=1;n<r.points.length;n++){
        const a=r.points[n-1],b=r.points[n],dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy);if(!len)continue;
        const nx=-dy/len,ny=dx/len;
        for(let d=(70-distance%70)%70;d<len;d+=70,slot++){
          const t=d/len,cx=a[0]+dx*t,cy=a[1]+dy*t;
          // Choose the pavement side of each mapped kerb, never the middle of the road.
          let sign=1;if(surfaces.some(p=>pointInPolygon(cx+nx*7,cy+ny*7,p)))sign=-1;
          const px=cx+nx*7*sign,py=cy+ny*7*sign,x=S(px),y=S(py);
          if(!inside(x,y)||surfaces.some(p=>pointInPolygon(px,py,p))||(map.buildings||[]).some(b=>!b.hidden&&pointInPolygon(px,py,b.points)))continue;
          const seed=hashText((r.id||r.name)+'|'+slot),kind=seed%4;
          ellipse(ctx,x+4,y+4,kind===0?10:8,3,'rgba(25,34,36,.2)');
          if(kind===0){
            line(ctx,x,y,x,y-51,'#293b40',2.5);line(ctx,x-3,y,x+3,y,'#293b40',3);
            polygon(ctx,[[x-5,y-51],[x+5,y-51],[x+4,y-62],[x-4,y-62]],'#bdb991','#344447',1);
            line(ctx,x,y-61,x,y-52,'#49595b',.8);polygon(ctx,[[x-6,y-62],[x,y-67],[x+6,y-62]],'#43595b','#24363b',.8);
            ellipse(ctx,x-1,y-56,1.5,2.8,'#e0d7ad',.8);
          }else if(kind===1){
            polygon(ctx,[[x-8,y-12],[x+8,y-12],[x+8,y+1],[x-8,y+1]],'#a68053','#574534',.8);
            polygon(ctx,[[x-8,y-12],[x-3,y-16],[x+13,y-16],[x+8,y-12]],'#c2a06e','#68543b',.8);
            polygon(ctx,[[x+8,y-12],[x+13,y-16],[x+13,y-3],[x+8,y+1]],'#72573c');
            line(ctx,x-6,y-10,x+6,y-1,'#68513a',1);line(ctx,x-6,y-1,x+6,y-10,'#68513a',1);
          }else if(kind===2){
            ctx.fillStyle='#697574';ctx.fillRect(x-4,y-9,8,10);ellipse(ctx,x,y-9,4.5,1.6,'#a2aaa0');
            line(ctx,x-3,y-6,x+3,y-6,'#3d4d4e',.8);line(ctx,x-3,y-3,x+3,y-3,'#3d4d4e',.8);
          }else{
            ctx.save();ctx.translate(x,y);ctx.rotate(-.56);ctx.fillStyle='#ded2ad';ctx.fillRect(-3,-2,6,4);line(ctx,-2,-1,2,-1,'#82735c',.5);ctx.restore();
          }
        }
        distance+=len;
      }
    }
    ctx.restore();
  }

  function drawBarricade(ctx,b,clock=0){
    const c=centerOf(b.points);if(!c)return;const ratio=b.maxIntegrity>0?clamp(b.integrity/b.maxIntegrity,0,1):0,seed=hashText(b.id),tier=Math.max(0,b.constructionTier|0);
    ctx.save();polygon(ctx,b.points,b.breached?'rgba(91,70,49,.3)':'rgba(96,72,46,.6)',b.breached?'#8c765e':'#d7bd86',1.2);ellipse(ctx,c.x+2,c.y+8,23,5,'rgba(22,23,20,.28)');
    let edge=[0,1],length=0;
    for(let n=0;n<b.points.length;n++){const q=b.points[n],r=b.points[(n+1)%b.points.length],d=Math.hypot(r[0]-q[0],r[1]-q[1]);if(d>length){length=d;edge=[n,(n+1)%b.points.length]}}
    const q=b.points[edge[0]],r=b.points[edge[1]],vx=(r[0]-q[0])/length,vy=(r[1]-q[1])/length;
    const pieces=Math.max(6,Math.min(30,Math.floor((length/8+tier*2)*(b.breached?.3:.45+.55*ratio))));
    for(let i=0;i<pieces;i++){
      const along=(i/(pieces-1)-.5)*length*.92,across=(seededUnit(seed,i*3+3)-.5)*12,rx=vx*along-vy*across,ry=vy*along+vx*across,a=(seededUnit(seed,i*3+1)-.5)*.45;
      ctx.save();ctx.translate(c.x+rx+(b.attacked?Math.sin(clock*24+i)*1.3:0),c.y+ry);ctx.rotate(a+(b.breached?.3:0));
      if(i%5===0){drawCrate(ctx,0,4,16,10)}
      else if(i%5===1){line(ctx,-13,0,13,-2,'#7f5938',4);line(ctx,-12,-1,12,-3,'#b07b49',1)}
      else if(i%5===2){ellipse(ctx,0,0,8,5,'#5e5b4e');line(ctx,-5,-1,5,-1,'#7b7765',.8)}
      else if(i%5===3){ctx.fillStyle='#594a3e';ctx.fillRect(-9,-4,18,7);ellipse(ctx,-6,5,3,3,'#2e302e');ellipse(ctx,6,5,3,3,'#2e302e')}
      else{ctx.scale(.7,.7);drawFurniture(ctx,0,3)}
      ctx.restore();
    }
    if(b.breached){for(let i=0;i<7;i++){const t=(clock*.6+i*.13)%1;ellipse(ctx,c.x-20+i*7,c.y+4-t*11,2+t*2,1+t,'#98886f',1-t)}}
    ctx.fillStyle='rgba(21,25,21,.82)';ctx.fillRect(c.x-22,c.y+18,44,6);ctx.fillStyle=ratio<.35?'#c37f55':'#dcc36f';ctx.fillRect(c.x-21,c.y+19,42*ratio,4);ctx.strokeStyle='#d9caa2';ctx.strokeRect(c.x-22,c.y+18,44,6);
    ctx.fillStyle='#f0e2b9';ctx.font='800 7px system-ui,sans-serif';ctx.textAlign='center';ctx.fillText((b.id==='S'?'SIDE ':'MAIN ')+(b.breached?'DOWN':b.buildFlash>0?'BUILDING':Math.round(ratio*100)+'%'),c.x,c.y+34);ctx.restore();
  }

  function drawCrate(ctx,x=0,y=0,w=20,h=14){
    polygon(ctx,[[x-w/2,y-h],[x+w/2,y-h],[x+w/2,y],[x-w/2,y]],'#ac8557','#514131',.8);
    polygon(ctx,[[x-w/2,y-h],[x-w/2+4,y-h-3],[x+w/2+4,y-h-3],[x+w/2,y-h]],'#cfaa74','#6d563a',.7);
    polygon(ctx,[[x+w/2,y-h],[x+w/2+4,y-h-3],[x+w/2+4,y-3],[x+w/2,y]],'#77593d','#514131',.7);
    for(let row=1;row<3;row++)line(ctx,x-w/2+1,y-h+row*h/3,x+w/2-1,y-h+row*h/3,'#d1aa72',.5);
    line(ctx,x-w/2+2,y-h+2,x+w/2-2,y-2,'#654b31',1.5);line(ctx,x-w/2+2,y-2,x+w/2-2,y-h+2,'#654b31',1.5);
    for(const side of [-1,1]){ellipse(ctx,x+side*(w/2-2),y-h+2,.65,.65,'#3a372e');ellipse(ctx,x+side*(w/2-2),y-2,.65,.65,'#3a372e')}
  }
  function drawFurniture(ctx,x=0,y=0){
    // A discarded chair remains recognisable at gameplay zoom.
    line(ctx,x-7,y-4,x-8,y+5,'#4c392c',2);line(ctx,x+6,y-4,x+7,y+5,'#4c392c',2);
    polygon(ctx,[[x-9,y-8],[x+7,y-8],[x+10,y-3],[x-6,y-3]],'#ad8159','#513c2d',1);
    polygon(ctx,[[x-9,y-8],[x-10,y-22],[x+5,y-22],[x+7,y-8]],'#8f6546','#513c2d',1);
    for(const offset of [-5,0,5])line(ctx,x+offset,y-20,x+offset+1,y-10,'#bb936b',1.1);
    line(ctx,x-10,y-22,x+5,y-22,'#d0aa7a',1.1);
  }
  function drawMaterial(ctx,m,clock=0){
    if(!Number.isFinite(m.x)||!Number.isFinite(m.y))return;ctx.save();ctx.translate(m.x,m.y);ellipse(ctx,0,6,11,3.5,'rgba(20,20,17,.28)');
    if(m.type==='timber')[-5,0,5].forEach((y,i)=>{line(ctx,-11,y,11,y-2,PALETTE.timberDark,4);line(ctx,-10,y-1,10,y-3,i%2?PALETTE.timberLight:PALETTE.timber,1.5)});
    else if(m.type==='crates'){drawCrate(ctx,0,4);}
    else if(m.type==='cart'){ctx.fillStyle='#79583f';ctx.fillRect(-13,-9,26,12);ellipse(ctx,-9,6,4.5,4.5,'#2d312f');ellipse(ctx,9,6,4.5,4.5,'#2d312f')}
    else{drawFurniture(ctx,0,1)}
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

  function visible(p,view,margin=65){return !view||(p.x>=view.x-margin&&p.x<=view.x+view.w+margin&&p.y>=view.y-margin&&p.y<=view.y+view.h+margin)}

  function drawCrowd(ctx,people,clock=0,art=null,view=null){
    if(!ctx||!Array.isArray(people))return;
    for(const p of [...people].sort((a,b)=>(a.y||0)-(b.y||0))){
      if(!Number.isFinite(p.x)||!Number.isFinite(p.y)||!visible(p,view))continue;
      const scale=(p.role==='helper'?.95:.9)+((p.variant||0)%3)*.025;
      if(!sharedActor(ctx,npcActors,'crowd:'+p.id,p,art,'civilian',clock,{scale})){
        ellipse(ctx,p.x,p.y,5,7,p.role==='helper'?'#786b4f':'#686356');ellipse(ctx,p.x,p.y-8,3,3,'#d3a37d');
      }
      if(p.role==='helper'){ellipse(ctx,p.x,p.y-27,3,3,'#e5cf81',.9);if(p.carrying){ctx.fillStyle='#ae7e4d';ctx.fillRect(p.x-7,p.y-13,14,9);ctx.strokeStyle='#4b362b';ctx.strokeRect(p.x-7,p.y-13,14,9)}}
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
      const officer={x:p.x+nx*side-Math.cos(dir)*row,y:p.y+ny*side-Math.sin(dir)*row,dir,variant:i%8,periodRole:'police',animState:p.charging?'run':/approach|withdraw|regroup/.test(p.state)?'walk':'idle'};
      sharedActor(ctx,policeActors,'police:'+p.id+':'+i,officer,art,'civilian',clock,{scale:.94});
      ctx.save();
      if(p.state==='dismantle'){const swing=Math.sin(clock*10+i)*2.8;line(ctx,officer.x+3,officer.y-11,officer.x+8,officer.y-3+swing,'#47382c',1.8)}ctx.restore();
    }
    const ratio=clamp(Number(p.resistanceRatio)||0,0,1);if(ratio>0){ctx.fillStyle='rgba(20,24,22,.8)';ctx.fillRect(p.x-20,p.y-42,40,5);ctx.fillStyle='#ddbd62';ctx.fillRect(p.x-19,p.y-41,38*ratio,3)}
    ctx.save();ctx.font='900 8px system-ui,sans-serif';ctx.textAlign='center';ctx.strokeStyle='rgba(19,23,21,.95)';ctx.lineWidth=3;ctx.strokeText(p.breakthrough?'BREAKTHROUGH!':String(p.charging?'CHARGE':p.state||'POLICE').toUpperCase(),p.x,p.y-49);ctx.fillStyle='#efe2b8';ctx.fillText(p.breakthrough?'BREAKTHROUGH!':String(p.charging?'CHARGE':p.state||'POLICE').toUpperCase(),p.x,p.y-49);ctx.restore();
  }

  function drawBlackshirtMarch(ctx,march,clock,art){
    if(!march||!Number.isFinite(march.x)||!Number.isFinite(march.y)||march.threat<=0)return;
    const count=6+Math.round(march.threat*10),dir=Number.isFinite(march.dir)?march.dir:0,nx=-Math.sin(dir),ny=Math.cos(dir);
    for(let i=0;i<count;i++){
      const row=Math.floor(i/5),col=i%5-2,spacing=9;
      const p={x:march.x+nx*col*spacing-Math.cos(dir)*row*10,y:march.y+ny*col*spacing-Math.sin(dir)*row*10,dir,variant:i%8,periodRole:'march',animState:'walk'};
      sharedActor(ctx,marchActors,'march:'+i,p,art,'civilian',clock,{scale:.9});
    }
    ctx.save();ctx.font='900 8px system-ui,sans-serif';ctx.textAlign='center';ctx.strokeStyle='rgba(18,20,18,.95)';ctx.lineWidth=3;ctx.strokeText('BUF MARCH',march.x,march.y-45);ctx.fillStyle='#d9cda9';ctx.fillText('BUF MARCH',march.x,march.y-45);ctx.restore();
  }

  function drawMountedCharge(ctx,c,clock,art){
    if(!c||!Number.isFinite(c.x)||!Number.isFinite(c.y))return;
    const dir=Math.atan2(c.targetY-c.startY,c.targetX-c.startX),gallop=Math.sin(clock*18+c.t*12);
    ctx.save();ctx.translate(c.x,c.y);ctx.scale(ACTOR_SIZE,ACTOR_SIZE);ctx.rotate(dir);ellipse(ctx,0,5,17,6,'rgba(20,22,20,.28)');
    ctx.fillStyle='#76533c';ctx.beginPath();ctx.ellipse(0,0,14,6,0,0,TAU);ctx.fill();ctx.strokeStyle='#4a3428';ctx.lineWidth=1.2;ctx.stroke();
    ctx.fillStyle='#856047';ctx.beginPath();ctx.ellipse(10,-4,6,4,-.25,0,TAU);ctx.fill();ctx.beginPath();ctx.ellipse(15,-6,4,3,-.15,0,TAU);ctx.fill();
    line(ctx,-8,3,-12+gallop*2,10,'#4c392d',2);line(ctx,-2,4,-4-gallop*2,11,'#4c392d',2);line(ctx,6,3,9-gallop*2,10,'#4c392d',2);line(ctx,10,2,14+gallop*2,8,'#4c392d',2);line(ctx,-13,-1,-20,-5,'#4d392d',1.5);
    ctx.fillStyle='#4a4339';ctx.fillRect(-4,-6,9,4);ctx.restore();
    const officer={x:c.x,y:c.y-8*ACTOR_SIZE,dir,variant:1,periodRole:'police',animState:'idle'};sharedActor(ctx,policeActors,'mounted:'+c.id,officer,art,'civilian',clock,{scale:1.05});
  }

  function drawGround(ctx,state,clock=0,art=null,view=null){
    if(!ctx||!state)return;
    if(state.conflict&&state.conflict.march&&visible(state.conflict.march,view,110))drawBlackshirtMarch(ctx,state.conflict.march,clock,art);
    const items=[];
    for(const b of state.barricades||[]){const c=centerOf(b.points)||b;items.push({y:c.y||0,draw:()=>drawBarricade(ctx,b,clock)})}
    for(const m of state.materials||[])if(!m.carriedBy&&visible(m,view))items.push({y:m.y||0,draw:()=>drawMaterial(ctx,m,clock)});
    for(const p of state.civilians||[])if(visible(p,view))items.push({y:p.y||0,draw:()=>drawCivilian(ctx,p,clock,art)});
    for(const f of state.formations||[])if(visible(f,view,100))items.push({y:f.y||0,draw:()=>drawFormation(ctx,f,clock,art)});
    items.sort((a,b)=>a.y-b.y).forEach(i=>i.draw());
    drawJobMarkers(ctx,state,clock);
    for(const police of state.formations||[]){
    const defence=(state.barricades||[]).find(b=>b.id===police.objective);
    const bp=defence&&(centerOf(defence.points)||defence);
    if(bp&&police){
      const a=Math.atan2(police.y-bp.y,police.x-bp.x);
      const x=bp.x+Math.cos(a)*70,y=bp.y+Math.sin(a)*70;
      ctx.save();ctx.translate(x,y);ctx.rotate(a+Math.PI);
      polygon(ctx,[[14,0],[-7,-7],[-7,7]],'#8fc8ee','#243744',1.5);ctx.restore();
      ctx.save();ctx.font='900 9px system-ui,sans-serif';ctx.textAlign='center';ctx.strokeStyle='#1c211d';ctx.lineWidth=4;ctx.strokeText(police.objective==='S'?'SIDE APPROACH':'POLICE APPROACH',x,y-15);ctx.fillStyle='#c8e6fa';ctx.fillText(police.objective==='S'?'SIDE APPROACH':'POLICE APPROACH',x,y-15);ctx.restore();
    }
    }
  }

  function drawCarried(ctx,state,clock=0){if(!ctx||!state)return;for(const m of state.materials||[])if(m.carriedBy)drawMaterial(ctx,m,clock)}

  function volunteerJob(state,index){return state&&Array.isArray(state.jobs)?state.jobs.find(j=>j.actorId==='player-'+index&&(j.status==='working'||j.status==='waiting'||j.status==='queued'))||null:null}
  function drawVolunteer(ctx,ent,art,{state=null,index=0,clock=0}={}){
    if(!ctx||!ent||!art)return;art.drawActor(ctx,ent,'civilian');const job=volunteerJob(state,index),actor=state&&state.actors&&state.actors.find(a=>a.id==='player-'+index),carrying=actor&&actor.carrying;
    ctx.save();ctx.translate(ent.x,ent.y);ctx.scale(ACTOR_SIZE,ACTOR_SIZE);ctx.strokeStyle=['#dfc35e','#8fc0b2','#bf8b69','#ae9bc4'][index%4];ctx.lineWidth=2.2;ctx.beginPath();ctx.arc(0,-16,5.5,.1,Math.PI-.1);ctx.stroke();
    if(job&&job.status==='working'){
      const fighting=job.action==='hold'&&(state.formations||[]).some(f=>f.objective===job.targetId&&['halt','dismantle'].includes(f.state));
      const swing=Math.sin(clock*11+index)*4;
      if(fighting){line(ctx,3,-8,11,-7+swing,'#6d4b30',2.4);ellipse(ctx,11,-7+swing,1.5,1.5,'#a47952')}
      else if(job.action==='reinforce'||job.action==='hold'){line(ctx,-5,-9,-10,-2-swing*.3,'#d8bc8e',2);line(ctx,5,-9,10,-2+swing*.3,'#d8bc8e',2)}
      else if(job.action==='assist'){ctx.strokeStyle='rgba(147,202,173,.75)';ctx.beginPath();ctx.arc(0,-4,10,0,TAU);ctx.stroke()}
    }
    if(actor&&(actor.stamina??100)<35){ctx.fillStyle='#ffe49b';ctx.font='900 8px system-ui';ctx.textAlign='center';ctx.fillText('TIRED',0,-48)}
    if(actor?.attackFlash>0){line(ctx,4,-12,14,-12-Math.sin(clock*18)*4,'#dbb682',3)}
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
    for(const c of conflict.charges||[]){
      if(c.warning>0){
        ctx.save();ctx.strokeStyle='#f8ca69';ctx.lineWidth=3;ctx.setLineDash([9,5]);
        ctx.beginPath();ctx.moveTo(c.startX,c.startY);ctx.lineTo(c.targetX,c.targetY);ctx.stroke();
        ctx.beginPath();ctx.ellipse(c.targetX,c.targetY,c.warningRadius||48,(c.warningRadius||48)*.58,0,0,TAU);ctx.stroke();
        ctx.setLineDash([]);ctx.font='900 12px system-ui';ctx.textAlign='center';ctx.fillStyle='#ffe59b';ctx.fillText('MOUNTED CHARGE: MOVE!',c.targetX,c.targetY-38);ctx.restore();
      }else drawMountedCharge(ctx,c,clock,typeof window!=='undefined'?window.BadFodderArt:null);
    }
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

  function drawEdgeCue(ctx,g,camera,zoom,w,h){
    if(!g)return;const x=(g.x-camera.x)*zoom,y=(g.y-camera.y)*zoom;
    if(x>38&&x<w-38&&y>90&&y<h-65)return;
    const dx=x-w/2,dy=y-h/2,angle=Math.atan2(dy,dx);
    const factor=Math.min((w/2-35)/(Math.abs(dx)||1),(h/2-85)/(Math.abs(dy)||1));
    const px=clamp(w/2+dx*factor,35,w-35),py=clamp(h/2+dy*factor,100,h-75);
    ctx.save();ctx.translate(px,py);ctx.rotate(angle);polygon(ctx,[[12,0],[-7,-8],[-7,8]],'#ffe190','#383227',2);ctx.restore();
    ctx.save();ctx.font='900 10px system-ui';ctx.textAlign='center';ctx.fillStyle='#ffe8ac';ctx.strokeStyle='#222d25';ctx.lineWidth=4;
    const label=g.id==='S'?'SIDE STREET':g.id==='B'?'MAIN DEFENCE':g.kind==='material'?'MATERIALS':g.label;
    const lx=clamp(px,65,w-65);ctx.strokeText(label,lx,py-18);ctx.fillText(label,lx,py-18);ctx.restore();
  }

  function drawAtmosphere(ctx,{viewWidth=0,viewHeight=0,clock=0,pressure=0}={}){
    if(!ctx||!viewWidth||!viewHeight)return;ctx.save();const haze=ctx.createLinearGradient(0,0,0,viewHeight);haze.addColorStop(0,'rgba(43,44,41,.11)');haze.addColorStop(.55,'rgba(73,67,58,.025)');haze.addColorStop(1,'rgba(24,29,26,.14)');ctx.fillStyle=haze;ctx.fillRect(0,0,viewWidth,viewHeight);
    for(let i=0;i<8;i++){const x=((i*173+clock*13)%(viewWidth+80))-40,y=((i*91+Math.sin(clock*.4+i)*24)%Math.max(1,viewHeight-30))+15;ctx.save();ctx.translate(x,y);ctx.rotate(Math.sin(clock+i)*.45);ctx.globalAlpha=.1+pressure*.06;ctx.fillStyle=PALETTE.paper;ctx.fillRect(-2.5,-1.5,5,3);ctx.restore()}
    const v=ctx.createRadialGradient(viewWidth/2,viewHeight/2,Math.min(viewWidth,viewHeight)*.28,viewWidth/2,viewHeight/2,Math.max(viewWidth,viewHeight)*.72);v.addColorStop(0,'rgba(0,0,0,0)');v.addColorStop(1,'rgba(7,12,10,'+(pressure?.25:.18)+')');ctx.fillStyle=v;ctx.fillRect(0,0,viewWidth,viewHeight);ctx.restore();
  }

  return{
    buildingStyle,drawBuilding,drawRoad,drawFacadeDetails,drawStreetSurface,drawStreetProps,drawScenery,
    reset(){npcActors.clear();policeActors.clear();marchActors.clear()},
    drawGround,drawCarried,drawCrowd,drawVolunteer,drawEffects,drawAtmosphere,
    drawGuidance,drawHint,drawRegroup,drawEdgeCue
  };
});
