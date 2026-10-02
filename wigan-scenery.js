/* Urban presentation over the actual imported Wigan footprints and street lines. */
(() => {
 'use strict';
 const TAU=Math.PI*2;
 function poly(g,p,fill,stroke,width=1){if(p.length<3)return;g.beginPath();g.moveTo(...p[0]);p.slice(1).forEach(a=>g.lineTo(...a));g.closePath();if(fill){g.fillStyle=fill;g.fill()}if(stroke){g.strokeStyle=stroke;g.lineWidth=width;g.stroke()}}
 function line(g,p,color,width){if(p.length<2)return;g.beginPath();g.moveTo(...p[0]);p.slice(1).forEach(a=>g.lineTo(...a));g.strokeStyle=color;g.lineWidth=width;g.stroke()}
 function road(g,r,S,art){
  g.save();g.lineCap='round';g.lineJoin='round';const w=S(r.width||7);
  if(r.kind==='railway'){
   line(g,r.points,'#58584f',w+3);g.setLineDash([2,4]);line(g,r.points,'#8b8271',w+1);g.setLineDash([]);
   line(g,r.points,'#b5b8b0',1.5);
  }else{
   const foot=/footway|path|steps|pedestrian|cycleway/.test(r.kind);
   line(g,r.points,'#777969',w+5);line(g,r.points,art.texture(g,'urban-paving'),w+3);
   line(g,r.points,art.texture(g,foot?'urban-paving':'urban-asphalt'),w);
   if(!foot&&w>20){g.setLineDash([9,11]);line(g,r.points,'#d5cfaa66',.8);g.setLineDash([]);}
  }
  g.restore();
 }
 function buildingFamily(b){
  if(['tudor','moon','johnBull'].includes(b.landmark))return 'pub';
  if(['wallgate','northWestern'].includes(b.landmark))return 'station';
  if(b.landmark==='grandArcade')return 'arcade';
  if(b.landmark==='busStation'||b.material==='painted-brick')return 'civic';
  const street=b.detail&&b.detail.street||'';
  if(/Market|Standishgate|King Street|Coopers Row/.test(street))return 'shop';
  return (b.levels||2)>=3?'terrace':'residential';
 }
 function building(g,b,art){
  const p=b.points.slice(0,-1),h=b.height,flat=b.roofShape==='flat';
  const mesh=b.artMesh||(b.artMesh=BadFodderBuildings.mesh(p,h));if(!mesh)return;
  const family=buildingFamily(b);
  const palette={
    terrace:['#8e5b46','#9b644b','#7f5242','#a16e54'],
    residential:['#9a6d55','#88604d','#a2765c','#7f5a48'],
    shop:['#98634a','#a46d50','#895845','#a87558'],
    civic:['#beb69e','#afa993','#c8c1aa','#aaa48f'],
    station:['#a17a5f','#8f694f','#b39170','#8c6a56'],
    arcade:['#c3b8a0','#b7ad98','#ccc1aa','#aaa28f'],
    pub:['#8d6049','#9b6b50','#755043','#a1775c']
  }[family];
  const color=b.landmark==='tudor'?'#d7cfb4':b.landmark==='moon'?'#ad9d80':palette[b.i%palette.length];
  g.save();g.lineJoin='round';g.lineCap='round';g.save();g.translate(6,9);poly(g,p,'#20291f44');g.restore();
  const walls=flat?p.map((a,i)=>{const d=p[(i+1)%p.length];return{a,b:d,points:[a,d,[d[0],d[1]-h],[a[0],a[1]-h]]}}):mesh.walls;
  for(const wall of walls){
   const {a,b:d,points:side}=wall,dx=d[0]-a[0],dy=d[1]-a[1],len=Math.hypot(dx,dy);if(len<2)continue;
   poly(g,side,color,'#514637',.7);
   g.save();poly(g,side,null);g.clip();g.globalAlpha=family==='civic'||family==='arcade'?.26:family==='pub'?.52:.64;g.globalCompositeOperation='multiply';g.fillStyle=art.texture(g,'urban-brick');g.fillRect(b.minX-2,b.minY-h-mesh.rise-2,b.maxX-b.minX+4,b.maxY-b.minY+h+mesh.rise+4);g.restore();
   poly(g,side,dy>0?'#26342635':'#fff2c509');
   if(family==='terrace'&&len>22){
    g.save();poly(g,side,null);g.clip();g.strokeStyle='#d0b79738';g.lineWidth=1;
    for(const level of [.32,.63]){g.beginPath();g.moveTo(a[0],a[1]-h*level);g.lineTo(d[0],d[1]-h*level);g.stroke();}
    g.restore();
   }
   BadFodderWiganDetails.base(g,b,wall);
   line(g,[[a[0],a[1]-h+2],[d[0],d[1]-h+2]],'#c4b598',1.7);
   line(g,[[a[0],a[1]-1],[d[0],d[1]-1]],'#50483a',2);
   const count=Math.min(10,Math.floor(len/16)),rows=Math.min(3,Math.max(1,Math.round(b.levels))),ux=dx/len,uy=dy/len;
   for(let row=0;row<rows;row++)for(let j=1;j<=count;j++){
    const t=j/(count+1),x=a[0]+dx*t,y=a[1]+dy*t-h*(row+.55)/rows,w=rows===1?7:5.8,wh=Math.min(8,h/rows*.58);
    const pane=[[x-ux*w/2,y-uy*w/2],[x+ux*w/2,y+uy*w/2],[x+ux*w/2,y+uy*w/2-wh],[x-ux*w/2,y-uy*w/2-wh]];
    poly(g,pane,'#293b3a',b.landmark==='tudor'?'#48463b':'#b9ae8d',1);line(g,[[x-ux*w/2,y-uy*w/2-wh+1],[x+ux*w/2,y+uy*w/2-wh+1]],'#718982',.8);
    line(g,[[x,y],[x,y-wh]],'#9d9e85',.7);
   }
   BadFodderWiganDetails.facade(g,b,wall,BadFodderWiganDetails.isFront(b,wall,walls));
  }
  if(flat){
   const roof=p.map(a=>[a[0],a[1]-h]);poly(g,roof,art.texture(g,'urban-roof'),'#535347',2.5);
   g.save();poly(g,roof,null);g.clip();
   if(b.landmark==='grandArcade'){
    // A clipped glass lantern gives the shopping centre a distinct roof without moving it.
    const m=mesh,r=m.length*.45,w=Math.min(m.half*.7,26);
    g.transform(m.ux,m.uy,-m.uy,m.ux,m.cx,m.cy-h);
    g.fillStyle='#7b9fa095';g.fillRect(-r,-w,r*2,w*2);g.strokeStyle='#cecfc1';g.lineWidth=1.4;
    for(let x=-r;x<=r;x+=12){g.beginPath();g.moveTo(x,-w);g.lineTo(x,w);g.stroke()}
    for(let y=-w;y<=w;y+=12){g.beginPath();g.moveTo(-r,y);g.lineTo(r,y);g.stroke()}
    g.strokeRect(-r,-w,r*2,w*2);
   }else if(b.maxX-b.minX>45){
    for(let i=0;i<2;i++){const x=b.minX+12+i*14,y=b.minY-h+10;g.fillStyle='#b1b6aa';g.fillRect(x,y,9,5);g.fillStyle='#677b7a';g.fillRect(x+1,y+1,7,3);}
   }
   g.restore();
  }else{
   for(const plane of [...mesh.planes].sort((a,b)=>a.points[0][1]-b.points[0][1])){
    const roofBase=family==='pub'?'#58544d':family==='station'?'#5f625d':family==='residential'?'#6a6258':'#61635d';
    poly(g,plane.points,roofBase,'#3c4037',2);g.save();poly(g,plane.points,null);g.clip();g.transform(...plane.transform);g.fillStyle=art.texture(g,'roof-slate');g.fillRect(-mesh.length/2-2,-mesh.half-2,mesh.length+4,mesh.half*2+4);g.restore();poly(g,plane.points,plane.sign<0?'#e6cca617':'#16252a43');
   }
   for(const ridge of mesh.ridges){line(g,ridge,'#404239',3);line(g,ridge,'#b2aa94',.9)}
   if(mesh.length>22){const [x,y]=mesh.project({u:mesh.length*.2,v:-mesh.half*.3});poly(g,[[x-2,y],[x+3,y],[x+3,y-8],[x-2,y-8]],'#94745c','#443f34',.8);poly(g,[[x-3,y-8],[x+3,y-8],[x+5,y-10],[x-1,y-10]],'#bba88a','#484637',.6)}
  }
  g.restore();
 }
 function ground(g,map,S,art){
  g.save();
  for(const platform of map.platforms||[]){const p=platform.points.map(a=>a.map(S));poly(g,p,art.texture(g,'urban-paving'),'#c6c2a4',1.5)}
  g.restore();
 }
 function labels(g,map,zoom,canvasScale,camera,vw,vh){
  const unit=canvasScale/zoom,visible=[],placed=[];
  for(const item of map.labels||[]){
   const p=map.pois[item.key];if(!p)continue;const x=p.x*2,y=p.y*2;
   if(x<camera.x-50*unit||x>camera.x+vw/zoom+50*unit||y<camera.y-50*unit||y>camera.y+vh/zoom+50*unit)continue;
   if(item.kind==='street'&&zoom<.9)continue;
   visible.push({item,x,y});
  }
  g.save();g.textAlign='center';g.textBaseline='middle';g.font='700 '+10*unit+'px system-ui,sans-serif';
  // Fixed order and collision-aware rows keep neighbouring Market Place pub names readable.
  for(const {item,x,y} of visible){
   const text=item.text,w=g.measureText(text).width+14*unit,h=21*unit;
   let box=null;
   for(const offset of [-38,-64,-90,20,46]){
    const q={x:x-w/2,y:y+offset*unit-h/2,w,h};
    if(q.x<camera.x+3*unit||q.x+q.w>camera.x+vw/zoom-3*unit)continue;
    if(!placed.some(p=>q.x<p.x+p.w+3*unit&&q.x+q.w>p.x-3*unit&&q.y<p.y+p.h+3*unit&&q.y+q.h>p.y-3*unit)){box=q;break}
   }
   if(!box)continue;placed.push(box);
   line(g,[[x,y-12],[x,box.y+box.h]],'#e5dec0aa',unit*.7);
   g.fillStyle='#202e27e8';g.strokeStyle=item.kind==='station'?'#a5c2c8':'#bcae84';g.lineWidth=unit;
   g.beginPath();g.roundRect(box.x,box.y,box.w,box.h,4*unit);g.fill();g.stroke();
   g.fillStyle='#f0e7c6';g.fillText(text,x,box.y+box.h/2);
  }
  g.restore();
 }
 function guidance(g,map,hint,leader,vw,vh,scale){
  const W=vw/scale,H=vh/scale;if(H<280)return;
  const dx=hint.target.x-leader.x,dy=hint.target.y-leader.y,metres=Math.round(Math.hypot(dx,dy)/(2*map.projection.unitsPerMetre));
  const reached=!hint.contact&&Math.hypot(dx,dy)<hint.target.r;
  g.save();g.scale(scale,scale);const y=W<600?132:124;
  const text=reached&&hint.phase.type==='secure-zone'?'Clear this sector':hint.caption+' · '+metres+' m';
  g.font='700 11px system-ui,sans-serif';const w=Math.min(W-32,g.measureText(text).width+46);
  g.fillStyle='#253b2bea';g.strokeStyle='#a69771';g.lineWidth=1;g.beginPath();g.roundRect(16,y,w,29,5);g.fill();g.stroke();
  g.save();g.translate(31,y+14);g.rotate(Math.atan2(dy,dx));poly(g,[[7,0],[-3,-5],[-1,0],[-3,5]],hint.contact?'#e0a281':'#e9d294');g.restore();
  g.fillStyle='#e8dfc6';g.textAlign='left';g.textBaseline='middle';g.fillText(text,45,y+14,w-34);g.restore();
 }
 function tactical(g,map,scenery,squad,objectives,stage,vw,vh,scale,hint,enemies){
  g.save();g.scale(scale,scale);const W=vw/scale,H=vh/scale,compact=W<600,sideLegend=!compact&&H<450;
  g.fillStyle='#18221a';g.fillRect(0,0,W,H);
  const top=compact?96:58,legendH=compact?138:96,bottom=28;
  const mh=Math.max(50,sideLegend?Math.min(H-top-bottom,(W*.5-30)*map.height/map.width):Math.min(H-top-legendH-bottom,(W-36)*map.height/map.width)),mw=mh*map.width/map.height;
  const x=sideLegend?18:(W-mw)/2,y=top;
  g.imageSmoothingEnabled=true;g.drawImage(scenery,x,y,mw,mh);
  g.strokeStyle='#b5a781';g.lineWidth=2;g.strokeRect(x-2,y-2,mw+4,mh+4);
  g.font='700 13px system-ui,sans-serif';g.fillStyle='#f2e4bd';g.textAlign='left';g.fillText('WIGAN · TOWN CENTRE',18,compact?68:35);
  g.font='11px system-ui,sans-serif';g.fillStyle='#bcbd9f';g.fillText('Route: '+hint.caption,18,compact?86:49);
  g.textAlign='right';g.font='700 10px system-ui,sans-serif';g.fillText('N ↑',x+mw-5,y+13);
  const sx=mw/map.width,sy=mh/map.height;
  if(hint.path.length){g.save();g.setLineDash([5,3]);line(g,hint.path.map(p=>[x+p.x/2*sx,y+p.y/2*sy]),'#f5ce7c',2);g.restore();}
  if(hint.contact)for(const e of enemies.filter(e=>e.alive)){
   g.fillStyle='#c57962';g.beginPath();g.arc(x+e.x/2*sx,y+e.y/2*sy,3,0,TAU);g.fill();
  }
  for(const [i,item] of map.labels.entries()){
   const p=map.pois[item.key],px=x+p.x*sx,py=y+p.y*sy;
   g.beginPath();g.arc(px,py,8,0,TAU);g.fillStyle='#202a23';g.fill();g.strokeStyle='#e5d09a';g.lineWidth=1;g.stroke();
   g.fillStyle='#fff0c7';g.font='700 9px system-ui,sans-serif';g.textAlign='center';g.fillText(String(i+1),px,py+3);
  }
  const objective=objectives[stage];
  if(objective){g.strokeStyle='#ffe476';g.lineWidth=2;g.beginPath();g.arc(x+objective.zone.x/2*sx,y+objective.zone.y/2*sy,13,0,TAU);g.stroke();}
  for(const s of squad.filter(s=>s.alive)){g.fillStyle='#80d8e8';g.fillRect(x+s.x/2*sx-2,y+s.y/2*sy-2,4,4);}
  const columns=compact||sideLegend?2:3,rowH=22,lx=sideLegend?x+mw+24:compact?18:Math.max(18,(W-750)/2),columnW=(sideLegend?W-lx-18:W-lx*2)/columns;
  map.labels.forEach((item,i)=>{
   const column=Math.floor(i/Math.ceil(map.labels.length/columns)),row=i%Math.ceil(map.labels.length/columns),px=lx+column*columnW,py=(sideLegend?y+34:y+mh+24)+row*rowH;
   g.textAlign='left';g.font='700 10px system-ui,sans-serif';g.fillStyle='#e9d399';g.fillText(String(i+1).padStart(2,'0'),px,py);
   g.font='11px system-ui,sans-serif';g.fillStyle='#e7e4d5';g.fillText(map.pois[item.key].name,px+23,py,columnW-27);
  });
  g.textAlign='center';g.fillStyle='#a9c0b0';g.font='10px system-ui,sans-serif';g.fillText(hint.contact?'Gold: route · Red: hostiles · Blue: squad':'Gold: route / objective · Blue: squad · MAP / M to return',W/2,H-12);
  g.restore();
 }
 window.BadFodderWigan={road,building,buildingFamily,ground,labels,guidance,tactical};
})();
