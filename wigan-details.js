/* Cosmetic street furniture and facade treatments. OSM geography stays untouched. */
(() => {
 'use strict';
 const MAIN=new Set(['Wallgate','Market Street','New Market Street','Market Place','Standishgate','King Street','Coopers Row']);
 function nearest(p,a,b){const dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy||1)));return[a[0]+dx*t,a[1]+dy*t];}
 function inside(p,poly){let hit=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])hit=!hit;}return hit;}
 function prepare(map){
  const segments=[];
  for(const r of map.roads.filter(r=>MAIN.has(r.name)&&r.kind!=='railway'))for(let i=1;i<r.points.length;i++)segments.push({r,a:r.points[i-1],b:r.points[i]});
  const buildings=new Map(),props=[];
  for(const b of map.buildings){
   const p=b.points.slice(0,-1),centre=[p.reduce((n,a)=>n+a[0],0)/p.length,p.reduce((n,a)=>n+a[1],0)/p.length];
   let front=null;
   for(const {r,a,b:d} of segments){const q=nearest(centre,a,d),distance=Math.hypot(q[0]-centre[0],q[1]-centre[1]);if(!front||distance<front.distance)front={point:q,street:r.name,distance};}
   if(b.landmark){const poi=map.pois[b.landmark];front={point:poi.approach,street:poi.street,distance:0};}
   if(!front)continue;
   const reach=Math.max(...p.map(a=>Math.hypot(a[0]-centre[0],a[1]-centre[1])))+14;
   if(front.distance>reach&&!b.landmark)continue;
   buildings.set(b.osmId,{frontage:front.point.map(v=>v*2),street:front.street,shop:!b.landmark});
  }
  // Place quiet decorative objects at curbs, away from junctions, doors and building footprints.
  for(const {r,a,b} of segments){
   const dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy);if(length<35)continue;
   const ux=dx/length,uy=dy/length;
   for(let u=20;u<length-12;u+=55){
    const side=((r.osmId+Math.floor(u))%2)*2-1,offset=(r.width||7)/2+4;
    const q=[a[0]+ux*u-uy*offset*side,a[1]+uy*u+ux*offset*side];
    if(q[0]<12||q[1]<12||q[0]>map.width-12||q[1]>map.height-12)continue;
    if(map.buildings.some(b=>inside(q,b.points)))continue;
    if(Object.values(map.pois).some(p=>Math.hypot(q[0]-p.approach[0],q[1]-p.approach[1])<14))continue;
    if(props.some(p=>Math.hypot(q[0]*2-p.x,q[1]*2-p.y)<40))continue;
    if(segments.some(s=>s.r.osmId!==r.osmId&&Math.hypot(...nearest(q,s.a,s.b).map((v,i)=>v-q[i]))<(s.r.width||7)/2+3))continue;
    const seed=(r.osmId+Math.floor(u))%7,kind=['lamp','planter','bench','bin','lamp','bollard','planter'][seed];
    props.push({x:q[0]*2,y:q[1]*2,angle:Math.atan2(dy,dx),kind});
   }
  }
  return{buildings,props};
 }
 function isFront(b,wall,walls){
  if(!b.detail)return false;const p=b.detail.frontage;
  const score=w=>{const q=nearest(p,w.a,w.b);return Math.hypot(p[0]-q[0],p[1]-q[1]);};
  return walls.reduce((best,w)=>score(w)<score(best)?w:best,walls[0])===wall;
 }
 function base(g,b,w){
  if(b.landmark!=='tudor')return;
  const dx=w.b[0]-w.a[0],dy=w.b[1]-w.a[1],len=Math.hypot(dx,dy);if(len<3)return;
  g.save();g.beginPath();g.moveTo(...w.points[0]);w.points.slice(1).forEach(p=>g.lineTo(...p));g.closePath();g.clip();
  g.transform(dx/len,dy/len,0,1,...w.a);g.fillStyle='#d8d3bb';g.fillRect(-1,-b.height-30,len+2,b.height*.67+30);g.restore();
 }
 function facade(g,b,w,front){
  const dx=w.b[0]-w.a[0],dy=w.b[1]-w.a[1],len=Math.hypot(dx,dy),h=b.height;if(len<12)return;
  const tudor=b.landmark==='tudor';if(!front&&!tudor)return;
  g.save();g.beginPath();g.moveTo(...w.points[0]);w.points.slice(1).forEach(p=>g.lineTo(...p));g.closePath();g.clip();g.transform(dx/len,dy/len,0,1,...w.a);
  if(tudor){
   g.strokeStyle='#393a32';g.lineWidth=2.2;
   for(const y of [-h*.35,-h*.68,-h]){g.beginPath();g.moveTo(0,y);g.lineTo(len,y);g.stroke();}
   for(let u=0;u<=len;u+=15){g.beginPath();g.moveTo(u,-h*.35);g.lineTo(u,-h-18);g.stroke();g.beginPath();g.moveTo(u,-h*.68);g.lineTo(u+15,-h);g.stroke();}
  }
  if(front){
   const club=b.detail.street==='King Street'&&!b.landmark,station=['wallgate','northWestern'].includes(b.landmark);
   const fascia=club?'#624253':b.landmark==='moon'?'#564839':station?'#365769':'#34564a';
   const height=Math.min(13,h*.42),count=Math.max(1,Math.floor(len/16)),step=len/count;
   g.fillStyle='#293f3e';g.fillRect(2,-height,len-4,height-1);
   for(let i=0;i<count;i++){
    const x=i*step+3;g.fillStyle=i===Math.floor(count/2)?'#27332e':'#4e7170';g.fillRect(x,-height+3,step-6,height-5);g.fillStyle='#bec4b3';g.fillRect(x,-height+3,1,height-5);g.fillStyle='#819892';g.fillRect(x+2,-height+3,Math.max(1,step-9),1);
    if(b.landmark==='moon'){g.fillStyle='#c5b697';g.fillRect(i*step,-height,2,height);}
   }
   g.fillStyle='#d1bc91';g.fillRect(0,-height-6,len,6);g.fillStyle=fascia;g.fillRect(1,-height-5,len-2,4);
   const names={tudor:'TUDOR HOUSE',johnBull:'JOHN BULL',moon:'MOON UNDER WATER',wallgate:'WALLGATE',northWestern:'NORTH WESTERN',busStation:'BUS STATION',grandArcade:'GRAND ARCADE'};
   const text=names[b.landmark]||(club?['LIVE MUSIC','LATE BAR','CLUB'][b.i%3]:['SHOPS','CAFE','TOWN STORES'][b.i%3]);
   g.textAlign='center';g.textBaseline='middle';g.fillStyle='#f1e4bc';g.font='700 3.4px system-ui,sans-serif';g.fillText(text,len/2,-height-2.6,len-5);
   g.fillStyle='#cab991';g.fillRect(1,-1,len-2,1);
   if(station||b.landmark==='grandArcade'){
    g.fillStyle='#95bfc18c';g.fillRect(1,-height-10,len-2,4);g.strokeStyle='#d4ceab';g.lineWidth=.7;g.strokeRect(1,-height-10,len-2,4);
    for(let x=4;x<len;x+=8){g.beginPath();g.moveTo(x,-height-10);g.lineTo(x,-height-6);g.stroke();}
   }
  }
  g.restore();
 }
 function furniture(g,props,bounds){
  for(const p of props){
   if(bounds&&(p.x<bounds.x-20||p.y<bounds.y-35||p.x>bounds.x+bounds.w+20||p.y>bounds.y+bounds.h+35))continue;
   g.save();g.translate(p.x,p.y);g.fillStyle='#26312935';g.beginPath();g.ellipse(3,3,9,3,.2,0,Math.PI*2);g.fill();
   if(p.kind==='lamp'){
    g.fillStyle='#343c34';g.fillRect(-1,-22,2,23);g.fillStyle='#9d9f82';g.fillRect(-2,0,4,2);g.fillStyle='#323d35';g.fillRect(-4,-26,8,6);g.fillStyle='#e1d4a1';g.fillRect(-2,-25,4,3);g.beginPath();g.moveTo(-5,-26);g.lineTo(0,-29);g.lineTo(5,-26);g.fillStyle='#333e35';g.fill();
   }else if(p.kind==='planter'){
    g.fillStyle='#77766a';g.fillRect(-7,-5,14,9);g.fillStyle='#c5c0a7';g.fillRect(-8,-6,16,2);g.fillStyle='#465945';g.beginPath();g.ellipse(0,-8,7,4,0,0,Math.PI*2);g.fill();g.fillStyle='#71865a';g.beginPath();g.ellipse(-2,-10,4,2,0,0,Math.PI*2);g.fill();
   }else if(p.kind==='bench'){
    g.rotate(p.angle);g.fillStyle='#37463b';g.fillRect(-7,-1,2,4);g.fillRect(5,-1,2,4);g.fillStyle='#897a59';g.fillRect(-9,-5,18,5);g.fillStyle='#b1a082';for(let y=-5;y<0;y+=2)g.fillRect(-9,y,18,1);g.fillStyle='#4d5d48';g.fillRect(-9,-8,18,2);
   }else{
    g.fillStyle='#3c4c40';g.fillRect(p.kind==='bin'?-3:-1.5,-8,p.kind==='bin'?6:3,9);g.fillStyle='#9a9f82';g.fillRect(p.kind==='bin'?-4:-2,-9,p.kind==='bin'?8:4,2);
   }
   g.restore();
  }
 }
 window.BadFodderWiganDetails={prepare,isFront,base,facade,furniture};
})();
