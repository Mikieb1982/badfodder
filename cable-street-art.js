/* Lightweight Cable Street world rendering.
   Draws historical interaction objects without depending on map-specific art. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.BadFodderCableArt=api;
})(typeof window!=='undefined'?window:globalThis,function(){
  'use strict';

  function centerOf(points){
    if(!Array.isArray(points)||!points.length)return null;
    let x=0,y=0,n=0;
    for(const p of points){
      if(!Array.isArray(p)||!Number.isFinite(p[0])||!Number.isFinite(p[1]))continue;
      x+=p[0];y+=p[1];n++;
    }
    return n?{x:x/n,y:y/n}:null;
  }

  function drawBarricade(ctx,b){
    const points=Array.isArray(b.points)?b.points:[];
    if(points.length<3)return;
    const ratio=b.maxIntegrity>0?Math.max(0,Math.min(1,b.integrity/b.maxIntegrity)):0;
    ctx.save();
    ctx.beginPath();ctx.moveTo(points[0][0],points[0][1]);
    for(let i=1;i<points.length;i++)ctx.lineTo(points[i][0],points[i][1]);
    ctx.closePath();
    ctx.fillStyle=b.breached?'rgba(92,72,50,.34)':'rgba(108,79,42,.78)';
    ctx.strokeStyle=b.breached?'rgba(214,190,147,.55)':'rgba(238,211,159,.92)';
    ctx.lineWidth=2;ctx.fill();ctx.stroke();

    const c=centerOf(points);
    if(c){
      const tier=Math.max(0,b.constructionTier|0);
      ctx.strokeStyle='rgba(62,42,23,.7)';
      ctx.lineWidth=1.4;
      for(let i=0;i<tier;i++){
        const y=c.y-5+i*3;
        ctx.beginPath();ctx.moveTo(c.x-14,y);ctx.lineTo(c.x+14,y);ctx.stroke();
      }
      ctx.fillStyle='rgba(20,23,18,.72)';ctx.fillRect(c.x-18,c.y+12,36,4);
      ctx.fillStyle=b.breached?'#9c7958':'#e3c779';ctx.fillRect(c.x-18,c.y+12,36*ratio,4);
      ctx.fillStyle='#f1dfb7';ctx.font='700 8px system-ui,sans-serif';ctx.textAlign='center';
      ctx.fillText((b.label||b.id)+' '+Math.round(ratio*100)+'%',c.x,c.y+26);
    }
    ctx.restore();
  }

  function drawMaterial(ctx,m){
    if(!Number.isFinite(m.x)||!Number.isFinite(m.y))return;
    ctx.save();
    ctx.translate(m.x,m.y);
    ctx.fillStyle='rgba(20,20,17,.25)';
    ctx.beginPath();ctx.ellipse(0,5,10,4,0,0,Math.PI*2);ctx.fill();
    if(m.type==='timber'){
      ctx.strokeStyle='#8f623d';ctx.lineWidth=3;
      [-4,1,6].forEach(y=>{ctx.beginPath();ctx.moveTo(-10,y);ctx.lineTo(10,y-2);ctx.stroke()});
    }else if(m.type==='crates'){
      ctx.fillStyle='#a77a49';ctx.fillRect(-9,-8,18,14);
      ctx.strokeStyle='#5e4028';ctx.lineWidth=1;ctx.strokeRect(-9,-8,18,14);
      ctx.beginPath();ctx.moveTo(-9,-8);ctx.lineTo(9,6);ctx.moveTo(9,-8);ctx.lineTo(-9,6);ctx.stroke();
    }else if(m.type==='cart'){
      ctx.fillStyle='#8d633f';ctx.fillRect(-12,-8,24,11);
      ctx.fillStyle='#333';ctx.beginPath();ctx.arc(-8,6,4,0,Math.PI*2);ctx.arc(8,6,4,0,Math.PI*2);ctx.fill();
    }else{
      ctx.fillStyle='#9b7047';ctx.fillRect(-8,-7,16,12);
    }
    if(!m.carriedBy){
      ctx.fillStyle='#efe1b5';ctx.font='700 7px system-ui,sans-serif';ctx.textAlign='center';
      ctx.fillText(String(m.label||m.type).toUpperCase(),0,-12);
    }
    ctx.restore();
  }

  function drawCivilian(ctx,p){
    if(!Number.isFinite(p.x)||!Number.isFinite(p.y)||p.status==='exited')return;
    ctx.save();ctx.translate(p.x,p.y);
    ctx.fillStyle=p.status==='assisted'?'#8fbf9c':'#d9c9a0';
    ctx.beginPath();ctx.arc(0,-7,4,0,Math.PI*2);ctx.fill();
    ctx.fillRect(-3,-3,6,12);
    ctx.strokeStyle='rgba(26,29,24,.55)';ctx.lineWidth=1.3;
    ctx.beginPath();ctx.moveTo(-3,2);ctx.lineTo(-7,8);ctx.moveTo(3,2);ctx.lineTo(7,8);ctx.stroke();
    ctx.fillStyle='#efe4c3';ctx.font='700 7px system-ui,sans-serif';ctx.textAlign='center';
    ctx.fillText(p.status==='assisted'?'ASSISTED':'ASSIST',0,-16);
    ctx.restore();
  }

  function drawFormation(ctx,p){
    if(!Number.isFinite(p.x)||!Number.isFinite(p.y))return;
    ctx.save();ctx.translate(p.x,p.y);
    const width=Math.max(18,Number(p.width)||24);
    ctx.strokeStyle='rgba(43,49,50,.9)';ctx.lineWidth=3;
    ctx.beginPath();ctx.moveTo(-width/2,0);ctx.lineTo(width/2,0);ctx.stroke();
    const count=Math.max(3,Math.min(8,Math.round(width/8)));
    for(let i=0;i<count;i++){
      const x=-width/2+(count===1?0:i/(count-1)*width);
      ctx.fillStyle='#26363b';ctx.beginPath();ctx.arc(x,-5,3.2,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#48575a';ctx.fillRect(x-2.5,-2,5,8);
    }
    ctx.fillStyle='#ede1ba';ctx.font='700 7px system-ui,sans-serif';ctx.textAlign='center';
    ctx.fillText(String(p.state||'').toUpperCase(),0,-13);
    ctx.restore();
  }

  function drawJobMarkers(ctx,state){
    for(const job of state.jobs||[]){
      if(job.status!=='waiting'&&job.status!=='working')continue;
      let target=null;
      if(job.targetType==='barricade')target=(state.barricades||[]).find(x=>x.id===job.targetId);
      if(job.targetType==='material')target=(state.materials||[]).find(x=>x.id===job.targetId);
      if(job.targetType==='civilian')target=(state.civilians||[]).find(x=>x.id===job.targetId);
      let c=target&&Number.isFinite(target.x)&&Number.isFinite(target.y)?{x:target.x,y:target.y}:centerOf(target&&target.points);
      if(!c)continue;
      ctx.save();
      ctx.strokeStyle=job.status==='working'?'#f0d07f':'rgba(235,224,183,.7)';
      ctx.lineWidth=1.5;ctx.setLineDash(job.status==='working'?[]:[4,4]);
      ctx.beginPath();ctx.arc(c.x,c.y,16,0,Math.PI*2);ctx.stroke();
      ctx.restore();
    }
  }

  function drawGround(ctx,state){
    if(!ctx||!state)return;
    for(const b of state.barricades||[])drawBarricade(ctx,b);
    for(const m of state.materials||[])if(!m.carriedBy)drawMaterial(ctx,m);
    for(const p of state.civilians||[])drawCivilian(ctx,p);
    for(const f of state.formations||[])drawFormation(ctx,f);
    drawJobMarkers(ctx,state);
  }

  function drawCarried(ctx,state){
    if(!ctx||!state)return;
    for(const m of state.materials||[])if(m.carriedBy)drawMaterial(ctx,m);
  }

  function drawHint(ctx,{x,y,label}={}){
    if(!ctx||!Number.isFinite(x)||!Number.isFinite(y)||!label)return;
    ctx.save();
    ctx.fillStyle='rgba(26,33,24,.82)';
    ctx.strokeStyle='rgba(226,207,146,.8)';
    ctx.lineWidth=1;
    const w=Math.max(54,String(label).length*5.5+12),h=17;
    ctx.fillRect(x-w/2,y-34,w,h);ctx.strokeRect(x-w/2,y-34,w,h);
    ctx.fillStyle='#f0dfad';ctx.font='700 8px system-ui,sans-serif';ctx.textAlign='center';
    ctx.fillText(label,x,y-22);
    ctx.restore();
  }

  return{drawGround,drawCarried,drawHint};
});
