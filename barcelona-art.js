/* Barcelona visual layer: cohesive illustrated 1936 streets, architecture and battlefield dressing.
   Gameplay geometry remains owned by barcelona-map.js. This module only changes presentation. */
(function(root){
'use strict';
const TAU=Math.PI*2;
const palette={
 stone:'#c9bda4',stoneHi:'#ded2b8',stoneLo:'#8d8270',asphalt:'#77776d',asphaltDark:'#60645d',
 ink:'#3d4038',shadow:'rgba(39,37,31,.27)',glass:'#35545a',glassHi:'#718f8c',iron:'#414844',
 cream:'#d7c3a2',ochre:'#c59d72',rose:'#bf8f77',sage:'#a8aa8e',brick:'#9b6d55',roof:'#806f61'
};
function poly(g,points,fill,stroke,width=1){
 if(!points||points.length<3)return;g.beginPath();points.forEach((p,i)=>i?g.lineTo(p[0],p[1]):g.moveTo(p[0],p[1]));g.closePath();
 if(fill){g.fillStyle=fill;g.fill()}if(stroke){g.strokeStyle=stroke;g.lineWidth=width;g.stroke()}
}
function line(g,points,stroke,width=1,dash){
 if(!points||points.length<2)return;g.save();if(dash)g.setLineDash(dash);g.beginPath();points.forEach((p,i)=>i?g.lineTo(p[0],p[1]):g.moveTo(p[0],p[1]));g.strokeStyle=stroke;g.lineWidth=width;g.lineJoin='round';g.lineCap='round';g.stroke();g.restore();
}
function ellipse(g,x,y,rx,ry,fill,stroke,width=1){g.beginPath();g.ellipse(x,y,rx,ry,0,0,TAU);if(fill){g.fillStyle=fill;g.fill()}if(stroke){g.strokeStyle=stroke;g.lineWidth=width;g.stroke()}}
function hash(n){n=(n|0)+0x6d2b79f5;n=Math.imul(n^(n>>>15),n|1);n^=n+Math.imul(n^(n>>>7),n|61);return((n^(n>>>14))>>>0)/4294967296}
function lerp(a,b,t){return a+(b-a)*t}
function pointOn(a,b,t){return[lerp(a[0],b[0],t),lerp(a[1],b[1],t)]}
function midpoint(points){let x=0,y=0;for(const p of points){x+=p[0];y+=p[1]}return[x/points.length,y/points.length]}
function family(b){
 const n=String(b.name||'').toLowerCase();
 if(/hotel colón/.test(n))return'hotel';if(/telefónica/.test(n))return'office';if(/cafè|impremta|shops/.test(n))return'shop';if(/corner/.test(n))return'corner';return'apartment';
}
function wallColor(b){const f=family(b),p={hotel:['#d0b28d','#c7a47e'],office:['#c4b394','#b6a486'],shop:['#c48f6d','#b98b6f'],corner:['#c9a77d','#b89070'],apartment:['#c8a27a','#d0b28f','#ba987a','#c0ad91']}[f];return p[(b.i||0)%p.length]}
function visibleEdges(points){
 return points.map((a,i)=>({a,b:points[(i+1)%points.length],i,dy:points[(i+1)%points.length][1]-a[1]}))
  .filter(e=>Math.hypot(e.b[0]-e.a[0],e.b[1]-e.a[1])>8)
  .sort((u,v)=>(v.a[1]+v.b[1])-(u.a[1]+u.b[1])).slice(0,4);
}
function facadeWindows(g,b,edge,h,S,color){
 const a=edge.a,c=edge.b,dx=c[0]-a[0],dy=c[1]-a[1],len=Math.hypot(dx,dy);if(len<S(18))return;
 const ux=dx/len,uy=dy/len,rows=Math.min(4,Math.max(2,b.levels||3)),count=Math.max(1,Math.min(9,Math.floor(len/S(18))));
 for(let row=0;row<rows;row++)for(let j=1;j<=count;j++){
  if((j+row+(b.i||0))%11===0)continue;
  const t=j/(count+1),base=pointOn(a,c,t),topY=base[1]+h*(row+.28)/rows,bottomY=base[1]+h*(row+.74)/rows;
  const ww=Math.min(S(5.5),len/(count+2)*.38),left=[base[0]-ux*ww,topY-uy*ww],right=[base[0]+ux*ww,topY+uy*ww];
  const pane=[left,right,[right[0],bottomY+(right[1]-topY)],[left[0],bottomY+(left[1]-topY)]];
  poly(g,pane,palette.glass,'#554e43',S(.55));
  line(g,[pointOn(pane[0],pane[1],.5),pointOn(pane[3],pane[2],.5)],'#9ca99d',S(.45));
  line(g,[pointOn(pane[0],pane[3],.52),pointOn(pane[1],pane[2],.52)],'#7b887f',S(.45));
  const sillA=[pane[3][0]-ux*S(1.3),pane[3][1]-uy*S(1.3)+S(.7)],sillB=[pane[2][0]+ux*S(1.3),pane[2][1]+uy*S(1.3)+S(.7)];line(g,[sillA,sillB],'#e0ccb0',S(1.2));
  if(row===0&&family(b)!=='office'&&(j+(b.i||0))%3===0){
   line(g,[[pane[3][0]-ux*S(2),pane[3][1]+S(2)],[pane[2][0]+ux*S(2),pane[2][1]+S(2)]],palette.iron,S(.8));
   for(let q=0;q<3;q++){const p=pointOn(pane[3],pane[2],q/2);line(g,[[p[0],p[1]+S(.5)],[p[0],p[1]+S(3)]],palette.iron,S(.45))}
  }
 }
 if(family(b)==='shop'||family(b)==='hotel'||family(b)==='office'){
  const segments=Math.max(1,Math.min(6,Math.floor(len/S(24))));
  for(let j=1;j<=segments;j++){
   const t=j/(segments+1),p=pointOn(a,c,t),w=S(6.5),y=p[1]+h-S(7.5),left=[p[0]-ux*w,y-uy*w],right=[p[0]+ux*w,y+uy*w];
   poly(g,[left,right,[right[0],right[1]+S(6)],[left[0],left[1]+S(6)]],j===1?'#4b5752':'#294447','#493f37',S(.7));
  }
  const fasciaA=[a[0]+ux*S(7),a[1]+h-S(10)+uy*S(7)],fasciaB=[c[0]-ux*S(7),c[1]+h-S(10)-uy*S(7)];line(g,[fasciaA,fasciaB],color,S(3.1));line(g,[fasciaA,fasciaB],'#e0c49a',S(.55));
 }
}
function roofDetails(g,b,points,h,S){
 const c=midpoint(points),f=family(b),seed=(b.i||0)+3;
 line(g,points.concat([points[0]]),'#5a5145',S(1.2));
 if(f!=='office')for(let i=0;i<Math.min(3,1+((b.i||0)%3));i++){
  const x=c[0]+S((-10+i*9)+(hash(seed+i)-.5)*5),y=c[1]+S((-4+i*3)+(hash(seed+i+9)-.5)*4);
  g.fillStyle='#8b715e';g.fillRect(x-S(2),y-S(3),S(4),S(5));g.fillStyle='#c0a88a';g.fillRect(x-S(2.4),y-S(3.5),S(4.8),S(1));
 }
 if(f==='hotel'){
  ellipse(g,c[0],c[1]-S(8),S(14),S(7),'#758b82','#4d5b55',S(1));
  poly(g,[[c[0]-S(13),c[1]-S(8)],[c[0],c[1]-S(18)],[c[0]+S(13),c[1]-S(8)]],'#9b765c','#55493e',S(1));
  line(g,[[c[0],c[1]-S(18)],[c[0],c[1]-S(25)]],palette.iron,S(1));
 }else if(f==='office'){
  g.fillStyle='#b7ab92';g.fillRect(c[0]-S(12),c[1]-S(15),S(24),S(18));g.strokeStyle='#655b4d';g.lineWidth=S(1);g.strokeRect(c[0]-S(12),c[1]-S(15),S(24),S(18));
  for(const d of [-7,0,7]){line(g,[[c[0]+S(d),c[1]-S(15)],[c[0]+S(d),c[1]-S(24)]],palette.iron,S(.8));ellipse(g,c[0]+S(d),c[1]-S(25),S(.8),S(.8),'#d8bf8a')}
 }
}
function building(g,b,S){
 const points=b.points,h=S(10+(b.levels||3)*5),shift=points.map(p=>[p[0],p[1]+h]),base=wallColor(b),f=family(b);
 g.save();g.lineJoin='round';g.lineCap='round';
 poly(g,shift.map(p=>[p[0]+S(5),p[1]+S(6)]),palette.shadow);
 const edges=visibleEdges(points);
 for(const edge of edges){
  const side=[edge.a,edge.b,[edge.b[0],edge.b[1]+h],[edge.a[0],edge.a[1]+h]],light=edge.i%2===0?'rgba(255,241,207,.08)':'rgba(41,49,43,.12)';
  poly(g,side,base,'#675b4d',S(.65));poly(g,side,light);facadeWindows(g,b,edge,h,S,base);
 }
 const roofColor=f==='office'?'#8c8d7c':f==='hotel'?'#9d806a':((b.i||0)%3===0?'#a78469':'#9a8974');
 poly(g,points,roofColor,'#5c5144',S(1.05));
 g.save();poly(g,points,null);g.clip();g.globalAlpha=.18;for(let y=b.minY-S(10);y<b.maxY+S(10);y+=S(7))line(g,[[b.minX-S(10),y],[b.maxX+S(10),y]],'#f0ddbc',S(.55));g.restore();
 roofDetails(g,b,points,h,S);
 if(f==='shop'||f==='hotel'||f==='office'){
  const label=f==='hotel'?'HOTEL COLÓN':f==='office'?'TELEFÓNICA':String(b.name||'').toUpperCase();
  g.font='700 '+S(f==='shop'?4.1:4.7)+'px system-ui,sans-serif';g.textAlign='center';g.textBaseline='middle';const c=midpoint(shift),tw=g.measureText(label).width;
  g.fillStyle='rgba(45,48,42,.88)';g.fillRect(c[0]-tw/2-S(3),c[1]-S(5),tw+S(6),S(8));g.strokeStyle='#bda982';g.lineWidth=S(.55);g.strokeRect(c[0]-tw/2-S(3),c[1]-S(5),tw+S(6),S(8));g.fillStyle='#efe0bd';g.fillText(label,c[0],c[1]-S(1));
 }
 g.restore();
}
function road(g,r,S){
 const name=String(r.name||''),w=S(r.width||40),major=/RAMBLA|PELAI|GRÀCIA|CATALUNYA/.test(name),rambla=/RAMBLA/.test(name),plaza=/CATALUNYA/.test(name);
 g.save();g.lineJoin='round';g.lineCap='round';
 line(g,r.points,'#5c5f58',w+S(10));
 line(g,r.points,palette.stone,w+S(7));
 line(g,r.points,'#716f65',w+S(2));
 line(g,r.points,palette.asphalt,w);
 line(g,r.points,'rgba(218,205,172,.14)',Math.max(S(1),w*.06),[S(3),S(13)]);
 if(major&&!plaza)line(g,r.points,'rgba(224,215,185,.34)',S(.9),[S(10),S(12)]);
 if(rambla){
  line(g,r.points,'#8a8170',w*.46);line(g,r.points,'#c7b791',w*.39);line(g,r.points,'rgba(242,223,181,.32)',w*.31,[S(2),S(5)]);
  for(const delta of [-w*.235,w*.235]){g.save();g.translate(delta,0);line(g,r.points,'#3f4744',S(1.1));line(g,r.points,'#b9aa87',S(.45));g.restore()}
 }
 g.restore();
}
function tree(g,x,y,S,variant=0){
 g.save();ellipse(g,x+S(2),y+S(3),S(9),S(4),'rgba(36,43,37,.2)');g.fillStyle='#665744';g.fillRect(x-S(1.1),y-S(12),S(2.2),S(13));
 const cols=['#536c5d','#607664','#6b7a61'];for(let i=0;i<5;i++){const a=(i/5)*TAU+variant,rr=S(5.5+(i%2)*1.7);ellipse(g,x+Math.cos(a)*S(4.5),y-S(14)+Math.sin(a)*S(3.2),rr,rr*.78,cols[(i+variant|0)%cols.length],'#43564c',S(.35))}
 ellipse(g,x-S(2),y-S(17),S(4),S(2.2),'rgba(218,210,165,.17)');g.restore();
}
function lamp(g,x,y,S){
 g.save();line(g,[[x,y],[x,y-S(19)]],palette.iron,S(1.25));line(g,[[x,y-S(19)],[x+S(4),y-S(21)]],palette.iron,S(.8));ellipse(g,x+S(4.8),y-S(21.5),S(2.4),S(3),'#e0c889','#49504a',S(.65));ellipse(g,x+S(4.4),y-S(22.5),S(1.1),S(.9),'rgba(255,239,188,.65)');g.restore();
}
function kiosk(g,x,y,S,label){
 g.save();poly(g,[[x-S(11),y],[x+S(11),y],[x+S(9),y-S(14)],[x-S(9),y-S(14)]],'#8a7259','#4e493f',S(.7));poly(g,[[x-S(13),y-S(14)],[x+S(13),y-S(14)],[x+S(9),y-S(19)],[x-S(9),y-S(19)]],'#56706b','#44514d',S(.7));
 g.fillStyle='#d5c49d';g.fillRect(x-S(8),y-S(11),S(16),S(7));g.fillStyle='#584f43';g.font='700 '+S(3.8)+'px system-ui,sans-serif';g.textAlign='center';g.fillText(label,x,y-S(6));g.restore();
}
function cafeSet(g,x,y,S){
 g.save();for(const dx of [-7,7]){ellipse(g,x+S(dx),y,S(4),S(2.2),'#806b55','#4a443b',S(.6));line(g,[[x+S(dx),y],[x+S(dx),y+S(5)]],palette.iron,S(.8));for(const sx of [-4,4]){g.strokeStyle='#5b554b';g.lineWidth=S(.8);g.strokeRect(x+S(dx+sx-2),y+S(4),S(4),S(4));}}
 poly(g,[[x-S(14),y-S(3)],[x,y-S(16)],[x+S(14),y-S(3)]],'#9a5d4f','#60463d',S(.7));line(g,[[x,y-S(16)],[x,y+S(1)]],palette.iron,S(.8));g.restore();
}
function posters(g,x,y,S,seed){
 g.save();for(let i=0;i<3;i++){const w=S(4.4+hash(seed+i)*2),h=S(6+hash(seed+i+6)*3),px=x+S(i*5),py=y+S((i%2)*1.4);g.fillStyle=['#d0bc91','#b5a982','#c9c2a8'][i];g.fillRect(px,py,w,h);g.strokeStyle='#6c6355';g.lineWidth=S(.35);g.strokeRect(px,py,w,h);line(g,[[px+S(1),py+S(2)],[px+w-S(1),py+S(2)]],'#635d51',S(.45));line(g,[[px+S(1),py+S(3.6)],[px+w-S(1),py+S(3.6)]],'#857965',S(.35));}g.restore();
}
function trolleyWires(g,S){
 const wires=[[[270,840],[325,640],[345,486]],[[345,486],[515,470],[720,410]],[[720,410],[840,410],[960,410]]];
 g.save();g.globalAlpha=.48;for(const w of wires){const pts=w.map(p=>[S(p[0]),S(p[1])]);line(g,pts,'#444a45',S(.45));for(let i=0;i<pts.length-1;i++){const a=pts[i],b=pts[i+1],m=pointOn(a,b,.5);line(g,[[m[0],m[1]],[m[0],m[1]+S(4)]],'#4f554f',S(.35));}}g.restore();
}
function scenery(g,map,S,bounds){
 const inside=(x,y,pad=45)=>!bounds||x>=bounds.x-S(pad)&&y>=bounds.y-S(pad)&&x<=bounds.x+bounds.w+S(pad)&&y<=bounds.y+bounds.h+S(pad);
 g.save();
 const px=S(520),py=S(310),pw=S(150),ph=S(88);if(inside(px,py,100)){
  g.fillStyle='#c4b89f';g.fillRect(px-pw,py-ph,pw*2,ph*2);g.save();g.beginPath();g.rect(px-pw,py-ph,pw*2,ph*2);g.clip();g.globalAlpha=.22;
  for(let x=px-pw;x<px+pw;x+=S(14))line(g,[[x,py-ph],[x,py+ph]],'#eee0bf',S(.45));for(let y=py-ph;y<py+ph;y+=S(14))line(g,[[px-pw,y],[px+pw,y]],'#776e60',S(.4));g.restore();
  ellipse(g,px,py,S(31),S(22),'#a7a994','#746f61',S(.8));ellipse(g,px,py,S(23),S(15),'#738f91','#536d70',S(.8));ellipse(g,px,py-S(1),S(17),S(10),'rgba(157,190,187,.72)');
  g.fillStyle='#cbbda3';g.fillRect(px-S(3),py-S(13),S(6),S(14));ellipse(g,px,py-S(13),S(4.5),S(2.5),'#b9a88a','#6b6255',S(.5));
  for(const [dx,dy] of [[-102,-58],[102,-58],[-102,58],[102,58]])tree(g,px+S(dx),py+S(dy),S,(dx+dy)/30);
 }
 const trees=[[298,724],[313,674],[326,624],[339,574],[352,524],[372,444],[407,432],[455,430],[612,432],[660,430],[713,430]];
 trees.forEach((p,i)=>{const x=S(p[0]),y=S(p[1]);if(inside(x,y))tree(g,x,y,S,i*.7)});
 const lamps=[[278,690],[431,670],[325,536],[743,445],[373,430],[694,242],[545,446],[616,446],[478,446]];
 lamps.forEach(p=>{const x=S(p[0]),y=S(p[1]);if(inside(x,y))lamp(g,x,y,S)});
 if(inside(S(236),S(494)))kiosk(g,S(236),S(494),S,'PREMSA');if(inside(S(423),S(730)))kiosk(g,S(423),S(730),S,'DIARIS');
 if(inside(S(133),S(523)))cafeSet(g,S(133),S(523),S);
 if(inside(S(608),S(683)))cafeSet(g,S(608),S(683),S);
 [[94,501,2],[174,623,9],[467,610,15],[925,424,21]].forEach(p=>{const x=S(p[0]),y=S(p[1]);if(inside(x,y))posters(g,x,y,S,p[2])});
 for(const [x0,y0] of [[474,373],[566,373],[604,252]]){const x=S(x0),y=S(y0);if(!inside(x,y))continue;g.fillStyle='#7a674f';g.fillRect(x-S(8),y-S(2),S(16),S(2.2));g.fillStyle=palette.iron;g.fillRect(x-S(7),y,S(1),S(4));g.fillRect(x+S(6),y,S(1),S(4));}
 for(const [x0,y0] of [[212,633],[450,806],[821,439]]){const x=S(x0),y=S(y0);if(!inside(x,y))continue;ellipse(g,x-S(5),y,S(4),S(4),null,palette.iron,S(.8));ellipse(g,x+S(5),y,S(4),S(4),null,palette.iron,S(.8));line(g,[[x-S(5),y],[x,y-S(5)],[x+S(5),y],[x-S(1),y],[x-S(5),y]],palette.iron,S(.8));line(g,[[x,y-S(5)],[x+S(3),y-S(8)]],palette.iron,S(.7));}
 trolleyWires(g,S);g.restore();
}
function sandbag(g,x,y,S,shade){
 g.save();g.translate(x,y);g.fillStyle=shade||'#9a815e';g.strokeStyle='#5d5141';g.lineWidth=S(.55);g.beginPath();g.ellipse(0,0,S(6.5),S(3.4),0,0,TAU);g.fill();g.stroke();line(g,[[-S(4),-S(.3)],[S(4),S(.3)]],'rgba(232,211,169,.32)',S(.45));g.restore();
}
function crate(g,x,y,S,rot=0){g.save();g.translate(x,y);g.rotate(rot);g.fillStyle='#8c6f4e';g.fillRect(-S(5),-S(4),S(10),S(8));g.strokeStyle='#534536';g.lineWidth=S(.7);g.strokeRect(-S(5),-S(4),S(10),S(8));line(g,[[-S(5),-S(4)],[S(5),S(4)]],'#b19166',S(.55));line(g,[[S(5),-S(4)],[-S(5),S(4)]],'#69513c',S(.55));g.restore()}
function dynamicAtmosphere(g,b,S){
 const now=(root.performance&&typeof root.performance.now==='function'?root.performance.now():Date.now())/1000,active=(b&&((b.integrity||0)>0||b.constructionTier));if(!active)return;
 g.save();for(let i=0;i<5;i++){const phase=now*.18+i*.91,x=b.x+S(38+i*5)+Math.sin(phase*1.7)*S(3),y=b.y-S(17)-((phase*8+i*9)%S(30)),a=.08+((i%3)*.025);ellipse(g,x,y,S(5+i*.7),S(3.4+i*.45),'rgba(92,91,80,'+a+')')}
 for(let i=0;i<4;i++){const phase=now*1.4+i*1.7,x=b.x+Math.sin(phase)*S(30),y=b.y-S(10)-((now*7+i*8)%S(20));g.save();g.translate(x,y);g.rotate(phase);g.fillStyle='rgba(217,202,165,.35)';g.fillRect(-S(1.4),-S(.7),S(2.8),S(1.4));g.restore()}g.restore();
}
function defence(g,runtime,S){
 if(!runtime)return;const b=runtime.barrier,integrity=Math.max(0,b.integrity||0),built=integrity>0||b.constructionTier;
 g.save();g.globalAlpha=built?1:.68;
 const angle=[-.08,.03,-.04,.07,0,-.06,.05];
 for(let i=0;i<10;i++)sandbag(g,b.x-S(52)+i*S(11.5),b.y-S(2)+(i%2)*S(4),S,i%4===0?'#7a7761':'#9a815e');
 for(let i=0;i<7;i++)crate(g,b.x-S(43)+i*S(14),b.y-S(9)-(i%3)*S(2),S,angle[i]);
 g.fillStyle='#665442';g.fillRect(b.x-S(32),b.y-S(17),S(64),S(4));line(g,[[b.x-S(31),b.y-S(17)],[b.x+S(29),b.y-S(30)]],'#7d6247',S(3));line(g,[[b.x+S(28),b.y-S(17)],[b.x-S(26),b.y-S(29)]],'#5c4a39',S(3));
 for(const x of [-38,-14,18,42]){g.fillStyle='#6a6c60';g.fillRect(b.x+S(x)-S(4),b.y+S(5),S(8),S(5));line(g,[[b.x+S(x)-S(5),b.y+S(10)],[b.x+S(x)+S(5),b.y+S(10)]],'#454943',S(1));}
 g.globalAlpha=1;
 const text=integrity>0?'BARRICADE '+Math.round(integrity)+' / 90':b.constructionTier?'BREACHED · REPAIR OR HOLD BEHIND':'BARRICADE SITE';
 g.font='700 '+S(4.6)+'px system-ui,sans-serif';g.textAlign='center';g.textBaseline='middle';const tw=g.measureText(text).width;g.fillStyle='rgba(39,45,39,.9)';g.fillRect(b.x-tw/2-S(4),b.y-S(45),tw+S(8),S(10));g.strokeStyle='#b9a57e';g.lineWidth=S(.6);g.strokeRect(b.x-tw/2-S(4),b.y-S(45),tw+S(8),S(10));g.fillStyle='#f0dfba';g.fillText(text,b.x,b.y-S(40));
 for(const p of runtime.materialPoints||[]){crate(g,p.x,p.y,S,.03);crate(g,p.x+S(8),p.y-S(4),S,-.08);g.font='700 '+S(3.8)+'px system-ui,sans-serif';g.fillStyle='#e6d6af';g.strokeStyle='#303832';g.lineWidth=S(1.4);g.strokeText('MATERIAL',p.x,p.y-S(12));g.fillText('MATERIAL',p.x,p.y-S(12));}
 dynamicAtmosphere(g,b,S);g.restore();
}
function installCharacterPolish(){
 const art=root.BadFodderArt,ids=root.BadFodderIdentities;if(!art||art.__barcelonaVisualPolish)return;
 let active='',reference=null,referencePromise=null;
 const resolveKey=key=>{try{return ids&&ids.get?ids.get(key).key:String(key||'')}catch(_){return String(key||'')}};
 const previousSet=art.setMissionIdentity;if(typeof previousSet==='function')art.setMissionIdentity=function(key){active=resolveKey(key);return previousSet.apply(this,arguments)};
 function loadReference(){
  if(reference)return Promise.resolve(true);if(referencePromise)return referencePromise;if(typeof root.Image!=='function')return Promise.resolve(false);
  referencePromise=new Promise(resolve=>{const img=new root.Image();let done=false;const finish=ok=>{if(done)return;done=true;clearTimeout(timer);if(ok&&img.naturalWidth>0)reference=img;resolve(ok)};const timer=setTimeout(()=>finish(false),4000);img.onload=()=>finish(true);img.onerror=()=>finish(false);img.src=root.BadFodderAssetUrl?root.BadFodderAssetUrl('assets/characters/barcelona.webp'):'assets/characters/barcelona.webp';});return referencePromise;
 }
 const previousPreload=art.preloadMissionArt;if(typeof previousPreload==='function')art.preloadMissionArt=function(key){const base=previousPreload.apply(this,arguments);return resolveKey(key)==='barcelona'?Promise.all([Promise.resolve(base),loadReference()]).then(()=>true):base};
 const previousPortrait=art.missionPortrait;if(typeof previousPortrait==='function')art.missionPortrait=function(key,index,state='idle'){
  if(resolveKey(key)!=='barcelona'||!reference||!root.document)return previousPortrait.apply(this,arguments);
  const c=root.document.createElement('canvas');c.width=144;c.height=144;const g=c.getContext('2d'),slot=Math.abs(index|0)%4,seg=reference.naturalWidth/4,sh=Math.min(reference.naturalHeight,seg*1.12),sy=Math.max(0,Math.min(reference.naturalHeight-sh,reference.naturalHeight*.015));
  g.fillStyle='#59675e';g.fillRect(0,0,144,144);g.imageSmoothingEnabled=true;g.drawImage(reference,slot*seg,sy,seg,sh,7,4,130,136);g.fillStyle='rgba(238,222,188,.08)';g.fillRect(0,0,144,144);g.strokeStyle='#c8b892';g.lineWidth=5;g.strokeRect(2.5,2.5,139,139);if(state==='dead'){g.fillStyle='rgba(31,40,38,.62)';g.fillRect(0,0,144,144)}return c;
 };
 const previousDraw=art.drawActor;if(typeof previousDraw==='function')art.drawActor=function(g,ent,team='squad'){
  if(active!=='barcelona')return previousDraw.apply(this,arguments);
  const v=typeof art.pose==='function'?art.pose(ent):null,moving=!!(v&&(v.moving||/walk|run/.test(v.state||'')));
  g.save();g.globalAlpha=.18;ellipse(g,ent.x,ent.y+2,8.8,3.1,'#26362f');if(moving){const phase=v&&Number.isFinite(v.phase)?v.phase:0;for(const side of [-1,1]){const a=.08+.04*(1+Math.sin(phase+side));ellipse(g,ent.x+side*4,ent.y+3+Math.sin(phase+side)*1.4,2.8,1.3,'rgba(205,190,153,'+a+')')}}g.restore();
  g.save();if('filter' in g)g.filter='saturate(.96) contrast(1.04) drop-shadow(0 1px 0 rgba(41,39,34,.38))';const result=previousDraw.apply(this,arguments);g.restore();
  if(team==='squad'||team==='resistance'){
   const accents=['#6f8790','#9b7c88','#718a91','#b39772'],col=accents[Math.abs(ent.variant||0)%4];g.save();g.translate(ent.x,ent.y);g.strokeStyle=col;g.lineWidth=.9;g.globalAlpha=.72;g.beginPath();g.arc(0,-27,7.2,.18,Math.PI-.18);g.stroke();g.restore();
  }
  return result;
 };
 art.__barcelonaVisualPolish=true;loadReference();
}
installCharacterPolish();
root.BadFodderBarcelonaArt={building,road,scenery,defence,installCharacterPolish};
})(typeof window!=='undefined'?window:globalThis);
