/* Cached Mediterranean street dressing, using the existing Canvas/scenery tile renderer. */
(function(root){
'use strict';
function poly(g,points,fill,stroke){g.beginPath();points.forEach((p,i)=>i?g.lineTo(...p):g.moveTo(...p));g.closePath();g.fillStyle=fill;g.fill();if(stroke){g.strokeStyle=stroke;g.lineWidth=1;g.stroke()}}
function building(g,b,S){
 const h=S(7+b.levels*4),points=b.points,front=points.map(p=>[p[0],p[1]+h]);
 const palette=['#d7c3a2','#caa57e','#d5b795','#beba9e'],wall=palette[b.i%palette.length];
 g.save();poly(g,points.map(p=>[p[0]+S(6),p[1]+h+S(5)]),'rgba(51,42,32,.24)');poly(g,front,'#9c856d','#645849');
 for(let i=0;i<points.length;i++){const a=points[i],c=points[(i+1)%points.length];if(c[0]>=a[0])poly(g,[a,c,[c[0],c[1]+h],[a[0],a[1]+h]],wall,'#84715d')}
 poly(g,points,b.i%2?'#bb8665':'#c8b498','#625649');
 const y=b.maxY,x0=b.minX+S(12),x1=b.maxX-S(12),step=S(19);
 for(let x=x0;x<x1;x+=step)for(let row=0;row<Math.min(4,b.levels);row++){
  const yy=y+S(3)+row*S(4);g.fillStyle='#435450';g.fillRect(x,yy,S(5),S(3));g.fillStyle='#8b9e83';g.fillRect(x-S(1),yy,S(1),S(3));
  g.strokeStyle='#3b4342';g.lineWidth=.7;g.strokeRect(x-S(2),yy+S(2),S(9),S(2));for(let k=0;k<3;k++){g.beginPath();g.moveTo(x+S(k*2),yy+S(2));g.lineTo(x+S(k*2),yy+S(4));g.stroke()}
 }
 if(b.name==='Cafè'||b.name==='Impremta'||/shops/.test(b.name)){g.fillStyle=b.name==='Cafè'?'#526e81':'#916d4e';g.fillRect(b.minX+S(6),y+h-S(5),b.maxX-b.minX-S(12),S(4))}
 if(/Hotel Colón|Telefónica/.test(b.name)){
  const cx=(b.minX+b.maxX)/2;g.fillStyle='#d1c3a5';g.fillRect(cx-S(15),b.minY-S(14),S(30),S(20));g.fillStyle='#738b83';if(b.name==='Hotel Colón'){g.beginPath();g.ellipse(cx,b.minY-S(14),S(16),S(12),0,Math.PI,0);g.fill()}else g.fillRect(cx-S(17),b.minY-S(17),S(34),S(4));
 }
 g.fillStyle='#f2e4c5';g.font='bold '+S(5)+'px sans-serif';g.textAlign='center';g.strokeStyle='#4c4840';g.lineWidth=S(1.4);g.strokeText(b.name,(b.minX+b.maxX)/2,y+h+S(5));g.fillText(b.name,(b.minX+b.maxX)/2,y+h+S(5));g.restore();
}
function road(g,r,S){g.save();g.lineJoin='round';g.lineCap='round';g.beginPath();r.points.forEach((p,i)=>i?g.lineTo(...p):g.moveTo(...p));g.strokeStyle='#bcb3a0';g.lineWidth=S(r.width||40)+S(8);g.stroke();g.strokeStyle='#918e80';g.lineWidth=S(r.width||40);g.stroke();g.setLineDash([S(2),S(9)]);g.strokeStyle='#aaa391';g.lineWidth=S(2);g.stroke();g.setLineDash([]);if(/RAMBLA|PELAI|GRÀCIA/.test(r.name)){for(const delta of [-S(4),S(4)]){g.save();g.translate(delta,0);g.beginPath();r.points.forEach((p,i)=>i?g.lineTo(...p):g.moveTo(...p));g.strokeStyle='#635e54';g.lineWidth=1.4;g.stroke();g.restore()}}g.restore()}
function scenery(g,map,S,bounds){
 const inside=(x,y)=>!bounds||x>=bounds.x-S(40)&&y>=bounds.y-S(40)&&x<=bounds.x+bounds.w+S(40)&&y<=bounds.y+bounds.h+S(40);
 g.save();
 const plaza={x:S(520),y:S(310)};if(inside(plaza.x,plaza.y)){g.fillStyle='#c1b59c';g.beginPath();g.ellipse(plaza.x,plaza.y,S(34),S(25),0,0,Math.PI*2);g.fill();g.fillStyle='#648a99';g.beginPath();g.ellipse(plaza.x,plaza.y,S(25),S(17),0,0,Math.PI*2);g.fill();g.fillStyle='#d1c6ae';g.fillRect(plaza.x-S(3),plaza.y-S(11),S(6),S(12))}
 for(const [x,y]of [[278,690],[431,670],[325,536],[743,445],[373,430],[694,242]]){const X=S(x),Y=S(y);if(!inside(X,Y))continue;g.strokeStyle='#4d5652';g.lineWidth=S(1.5);g.beginPath();g.moveTo(X,Y);g.lineTo(X,Y-S(18));g.stroke();g.fillStyle='#e1cf99';g.fillRect(X-S(2.5),Y-S(23),S(5),S(6));g.strokeStyle='#394441';g.strokeRect(X-S(2.5),Y-S(23),S(5),S(6))}
 for(const [x,y,label]of [[236,494,'PREMSA'],[423,730,'CAFÈ']]){const X=S(x),Y=S(y);if(!inside(X,Y))continue;g.fillStyle='#957a59';g.fillRect(X-S(10),Y-S(10),S(20),S(13));g.fillStyle='#55716b';g.fillRect(X-S(12),Y-S(17),S(24),S(8));g.fillStyle='#e4d1a9';g.font='bold '+S(4)+'px sans-serif';g.textAlign='center';g.fillText(label,X,Y-S(11))}
 g.restore();
}
function defence(g,runtime,S){
 if(!runtime)return;const b=runtime.barrier;
 g.save();g.globalAlpha=b.integrity>0?1:.55;
 for(let i=0;i<9;i++){const x=b.x-S(52)+i*S(12),y=b.y;g.fillStyle=i%3?'#977754':'#657a75';g.fillRect(x,y-S(5),S(12),S(10));g.strokeStyle='#564b3c';g.strokeRect(x,y-S(5),S(12),S(10));g.strokeStyle='#b8a27a';g.beginPath();g.moveTo(x,y-S(5));g.lineTo(x+S(12),y+S(5));g.stroke()}
 g.fillStyle='#b3a37a';for(const x of [-39,-26,33]){g.beginPath();g.ellipse(b.x+S(x),b.y-S(6),S(8),S(5),0,0,Math.PI*2);g.fill()}g.fillStyle='#454d48';for(const x of [-18,18]){g.beginPath();g.ellipse(b.x+S(x),b.y+S(6),S(4),S(4),0,0,Math.PI*2);g.fill()}
 g.globalAlpha=1;g.fillStyle='#f2dec2';g.strokeStyle='#282e30';g.font='bold '+S(5)+'px sans-serif';g.textAlign='center';const text=b.integrity>0?'BARRICADE '+Math.round(b.integrity)+' / 90':b.constructionTier?'BREACHED · REPAIR OR HOLD BEHIND':'BARRICADE SITE';g.lineWidth=3;g.strokeText(text,b.x,b.y-S(13));g.fillText(text,b.x,b.y-S(13));
 for(const p of runtime.materialPoints){g.fillStyle='#a48b60';g.fillRect(p.x-S(8),p.y-S(5),S(16),S(9));g.fillStyle='#e6dab6';g.fillText('MATERIAL',p.x,p.y-S(10))}g.restore();
}
root.BadFodderBarcelonaArt={building,road,scenery,defence};
})(typeof window!=='undefined'?window:globalThis);
