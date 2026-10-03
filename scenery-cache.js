/* Native-resolution scenery tiles: bounded memory, no enlarged town bitmap. */
window.BadFodderScenery = class {
  constructor({width,height,size=512,limit=16,gutter=0,paint}) {Object.assign(this,{width,height,size,limit,gutter,paint});this.tiles=new Map()}
  draw(ctx,x,y,width,height) {
    const minX=Math.max(0,Math.floor(x/this.size)),minY=Math.max(0,Math.floor(y/this.size));
    const maxX=Math.min(Math.ceil(this.width/this.size)-1,Math.floor((x+width)/this.size)),maxY=Math.min(Math.ceil(this.height/this.size)-1,Math.floor((y+height)/this.size));
    const visible=new Set();
    for(let ty=minY;ty<=maxY;ty++)for(let tx=minX;tx<=maxX;tx++){
      const key=tx+'|'+ty;visible.add(key);let tile=this.tiles.get(key);
      if(!tile){const left=tx*this.size,top=ty*this.size;tile=this.paint(left-this.gutter,top-this.gutter,Math.min(this.size,this.width-left)+this.gutter*2,Math.min(this.size,this.height-top)+this.gutter*2)}
      this.tiles.delete(key);this.tiles.set(key,tile);ctx.drawImage(tile,tx*this.size-this.gutter,ty*this.size-this.gutter)
    }
    const target=Math.max(this.limit,visible.size);for(const key of this.tiles.keys()){if(this.tiles.size<=target)break;if(!visible.has(key))this.tiles.delete(key)}
  }
};

/* Visual-only upgrades: preserve the complete title artwork and enrich Cable Street. */
(function(){
  'use strict';
  const style=document.createElement('style');style.id='rabbits-layout-polish';style.textContent=`
    .menu-backdrop{overflow:hidden!important;background:linear-gradient(#080c0958,#080c0958),url('assets/menu/if-i-can-shoot-rabbits-title.png?v=20261003-frame2') center/cover no-repeat!important;filter:none}
    .menu-backdrop::before{content:"";position:absolute;inset:0;background:url('assets/menu/if-i-can-shoot-rabbits-title.png?v=20261003-frame2') center top/contain no-repeat;pointer-events:none}
    .menu-backdrop::after{background:linear-gradient(0deg,#050805e8 0%,#070b079a 8%,#070b0745 15%,transparent 23%)!important}
    .menu-screen[data-panel="main"] .menu-layout{padding-bottom:7px;gap:4px}.menu-screen[data-panel="main"] .menu-panel{width:min(1180px,97vw)}
    .menu-screen[data-panel="main"] .menu-actions{gap:8px}.menu-screen[data-panel="main"] .menu-button{min-height:38px}.menu-screen[data-panel="main"] .menu-disclaimer{margin-top:4px;max-width:900px}
    @media(min-aspect-ratio:2/1){.menu-backdrop::before{background-size:auto 100%}.menu-screen[data-panel="main"] .menu-layout{padding:5px 16px}.menu-screen[data-panel="main"] .menu-button{min-height:34px;padding:4px 8px}.menu-screen[data-panel="main"] .menu-disclaimer{font-size:8px;line-height:1.15}}
    @media(max-width:720px),(pointer:coarse){.menu-backdrop::before{background-size:contain;background-position:center top}.menu-backdrop::after{background:linear-gradient(0deg,#050805ed 0%,#070b07b8 16%,#070b0755 28%,transparent 42%)!important}}
    .menu-screen[data-panel]:not([data-panel="main"]) .menu-backdrop{filter:brightness(.48) saturate(.8)}
  `;document.head.appendChild(style);

  const TAU=Math.PI*2;
  const hash=s=>{s=String(s);let h=2166136261>>>0;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0};
  const rnd=(seed,n)=>{let x=seed^Math.imul(n+1,0x9e3779b1);x^=x>>>16;x=Math.imul(x,0x7feb352d);x^=x>>>15;x=Math.imul(x,0x846ca68b);x^=x>>>16;return(x>>>0)/4294967296};
  const path=(c,p,close=false)=>{if(!p||p.length<2)return false;c.beginPath();c.moveTo(p[0][0],p[0][1]);for(let i=1;i<p.length;i++)c.lineTo(p[i][0],p[i][1]);if(close)c.closePath();return true};
  const samples=(p,space)=>{const out=[];for(let i=0;i<p.length-1;i++){const a=p[i],b=p[i+1],dx=b[0]-a[0],dy=b[1]-a[1],d=Math.hypot(dx,dy);if(d<1)continue;const n=Math.max(1,Math.floor(d/space));for(let j=0;j<n;j++){const t=(j+.5)/n;out.push({x:a[0]+dx*t,y:a[1]+dy*t,dx:dx/d,dy:dy/d})}}return out};
  const inView=(x,y,b,m=30)=>!b||!(x<b.x-m||x>b.x+b.w+m||y<b.y-m||y>b.y+b.h+m);

  function install(){
    const art=window.BadFodderCableArt;if(!art){setTimeout(install,0);return}if(art.__polishedStreet)return;art.__polishedStreet=true;
    const baseProps=art.drawStreetProps,baseFacade=art.drawFacadeDetails,baseScenery=art.drawScenery;

    art.drawStreetProps=function(ctx,map,S,bounds){
      const roads=map?.roads||[],a=roads.find(r=>/north-edge/i.test(r.id||''))||roads[0],b=roads.find(r=>/south-edge/i.test(r.id||''))||roads[1];
      if(a&&b){
        const n=a.points.map(p=>[S(p[0]),S(p[1])]),s=b.points.map(p=>[S(p[0]),S(p[1])]),poly=[...n,...s.slice().reverse()],xs=poly.map(p=>p[0]),ys=poly.map(p=>p[1]);
        const minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys),seed=hash((map.key||'cable')+'street');
        ctx.save();path(ctx,poly,true);ctx.clip();const g=ctx.createLinearGradient(minX,minY,maxX,maxY);g.addColorStop(0,'#58554e');g.addColorStop(.5,'#454742');g.addColorStop(1,'#5d5950');ctx.fillStyle=g;ctx.fillRect(minX-10,minY-10,maxX-minX+20,maxY-minY+20);
        for(let i=0;i<72;i++){const x=minX+(maxX-minX)*rnd(seed,i*4+1),y=minY+(maxY-minY)*rnd(seed,i*4+2);if(!inView(x,y,bounds))continue;ctx.save();ctx.translate(x,y);ctx.rotate((rnd(seed,i*4+3)-.5));ctx.globalAlpha=.05+rnd(seed,i+400)*.1;ctx.fillStyle=i%4?'#201f1d':'#b0a58e';ctx.beginPath();ctx.ellipse(0,0,3+rnd(seed,i*4+4)*10,.8+rnd(seed,i+500)*2.2,0,0,TAU);ctx.fill();ctx.restore()}ctx.restore();
        for(const edge of [n,s]){ctx.save();ctx.lineCap='round';ctx.lineJoin='round';path(ctx,edge);ctx.strokeStyle='#69665e';ctx.lineWidth=S(3.2);ctx.stroke();path(ctx,edge);ctx.strokeStyle='#aaa18d';ctx.lineWidth=S(1.55);ctx.stroke();path(ctx,edge);ctx.strokeStyle='rgba(45,44,40,.72)';ctx.lineWidth=S(.45);ctx.stroke();
          samples(edge,Math.max(14,S(14))).forEach((q,i)=>{if(!inView(q.x,q.y,bounds,15))return;const nx=-q.dy,ny=q.dx;if(i%2===0){ctx.strokeStyle='rgba(56,54,49,.4)';ctx.lineWidth=Math.max(.4,S(.18));ctx.beginPath();ctx.moveTo(q.x-nx*S(2),q.y-ny*S(2));ctx.lineTo(q.x+nx*S(2),q.y+ny*S(2));ctx.stroke()}if(i%7===3){ctx.save();ctx.translate(q.x,q.y);ctx.rotate(Math.atan2(q.dy,q.dx));ctx.fillStyle='#252826';ctx.fillRect(-S(1.7),-S(.65),S(3.4),S(1.3));ctx.restore()}});ctx.restore()}
        const cx=(minX+maxX)/2,cy=(minY+maxY)/2;[n,s].forEach((edge,e)=>samples(edge,Math.max(38,S(38))).forEach((q,i)=>{if((i+e)%2||!inView(q.x,q.y,bounds))return;let nx=-q.dy,ny=q.dx;const p1={x:q.x+nx*S(4),y:q.y+ny*S(4)},p2={x:q.x-nx*S(4),y:q.y-ny*S(4)};const p=((p1.x-cx)**2+(p1.y-cy)**2>(p2.x-cx)**2+(p2.y-cy)**2)?p1:p2;ctx.save();ctx.translate(p.x,p.y);ctx.rotate(Math.atan2(q.dy,q.dx));const k=(i+e*2)%4;if(k===0){ctx.strokeStyle='#343b39';ctx.lineWidth=S(.8);ctx.beginPath();ctx.moveTo(0,S(2));ctx.lineTo(0,-S(11));ctx.stroke();ctx.fillStyle='#47504c';ctx.fillRect(-S(1.8),-S(14),S(3.6),S(4))}else if(k===1){ctx.fillStyle='#67503d';ctx.fillRect(-S(5),-S(3),S(10),S(6));ctx.fillStyle='#2d302e';ctx.beginPath();ctx.arc(-S(3.6),S(4),S(1.6),0,TAU);ctx.arc(S(3.6),S(4),S(1.6),0,TAU);ctx.fill()}else if(k===2){ctx.fillStyle='#474843';ctx.fillRect(-S(2.5),-S(3),S(5),S(6));ctx.fillStyle='#69645a';ctx.fillRect(-S(2.8),-S(3.8),S(5.6),S(1))}else{ctx.fillStyle='#886746';ctx.fillRect(-S(4),-S(3),S(8),S(6));ctx.strokeStyle='#49372a';ctx.lineWidth=S(.4);ctx.strokeRect(-S(4),-S(3),S(8),S(6))}ctx.restore()}));
      }
      baseProps.call(this,ctx,map,S,bounds);
    };

    art.drawFacadeDetails=function(ctx,b,zoom=1){
      baseFacade.call(this,ctx,b,zoom);if(!ctx||!b||b.hidden||b.family!=='east-end-brick'||zoom<.65)return;const w=b.maxX-b.minX,h=Math.max(5,b.height||8);if(w<12)return;const seed=hash((b.name||'terrace')+'|'+b.i),front=b.maxY-Math.max(1,h*.08),top=front-h*.86;
      ctx.save();ctx.beginPath();ctx.rect(b.minX,top,w,front-top);ctx.clip();ctx.strokeStyle='rgba(58,41,34,.22)';ctx.lineWidth=.4;for(let y=top+2;y<front;y+=3.3){ctx.beginPath();ctx.moveTo(b.minX,y);ctx.lineTo(b.maxX,y);ctx.stroke()}const soot=ctx.createLinearGradient(0,front-h*.35,0,front);soot.addColorStop(0,'#0000');soot.addColorStop(1,'#201d1a42');ctx.fillStyle=soot;ctx.fillRect(b.minX,front-h*.35,w,h*.35);ctx.restore();
      const dx=b.minX+w*(.18+rnd(seed,2)*.58),dw=Math.min(7,Math.max(4,w*.11));ctx.fillStyle=b.door||'#403a34';ctx.fillRect(dx-dw/2,front-h*.43,dw,h*.41);ctx.fillStyle='#a79c82';ctx.fillRect(dx-dw*.7,front-.8,dw*1.4,1.1);const pipe=rnd(seed,3)>.5?b.minX+2:b.maxX-2;ctx.strokeStyle='#343a38';ctx.lineWidth=1.1;ctx.beginPath();ctx.moveTo(pipe,top);ctx.lineTo(pipe,front);ctx.stroke();
      if(w>25&&rnd(seed,4)>.38){const x=b.minX+w*(.55+rnd(seed,5)*.2),y=front-h*(.35+rnd(seed,6)*.2),pw=Math.min(9,w*.14),ph=Math.min(7,h*.28);ctx.save();ctx.translate(x,y);ctx.rotate((rnd(seed,7)-.5)*.08);ctx.fillStyle=rnd(seed,8)>.5?'#cdbf9a':'#b6a27b';ctx.fillRect(-pw/2,-ph/2,pw,ph);ctx.strokeStyle='#655441';ctx.lineWidth=.4;ctx.strokeRect(-pw/2,-ph/2,pw,ph);ctx.restore()}
    };

    art.drawScenery=function(ctx,map,S){baseScenery.call(this,ctx,map,S);const area=(map?.gameplayAdjustments||[]).find(a=>a.id==='coal-depot-closed');if(!area)return;const p=area.points.map(q=>[S(q[0]),S(q[1])]);ctx.save();ctx.strokeStyle='#39413f';ctx.lineWidth=Math.max(1,S(.5));path(ctx,p,true);ctx.stroke();samples([...p,p[0]],Math.max(18,S(18))).forEach(q=>{ctx.fillStyle='#333937';ctx.fillRect(q.x-S(.4),q.y-S(2.5),S(.8),S(5))});ctx.restore()};
  }
  setTimeout(install,0);
})();
