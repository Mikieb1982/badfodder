/* Cosmetic 1941/1945 dressing. Never enters navigation or changes map geometry.
   Props sit on quiet verges; doors, objectives and road centres are kept clear. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.BadFodderWartimeScenery=api;})(typeof window!=='undefined'?window:globalThis,function(){
'use strict';
function inside(x,y,points){let hit=false;for(let i=0,j=points.length-1;i<points.length;j=i++){const a=points[i],b=points[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])hit=!hit;}return hit;}
function distance(x,y,a,b){const dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*dx+(y-a[1])*dy)/(dx*dx+dy*dy||1)));return Math.hypot(x-a[0]-t*dx,y-a[1]-t*dy);}
function prepare(map){
 if(!['wigan','bad-belzig'].includes(map.key))return[];
 const props=[],roads=(map.roads||[]).filter(r=>r.kind!=='railway'&&r.points.length>1),buildings=map.buildings||[];
 const kinds=['sandbags','bicycle','crates','cart','fuel','checkpoint','truck','rubble','car'];
 const pois=Object.values(map.pois||{}),spawn=map.spawns||{};
 const protectedPoints=[...pois.map(p=>p.approach||[p.x,p.y]),...(spawn.squad||[]),...(spawn.pickups||[]).map(p=>[p.x,p.y]),...Object.values(map.zones||{}).map(z=>[z.x,z.y])];
 for(const r of roads){if(props.length>=55)break;const points=r.points;for(let i=1;i<points.length;i++){
   const a=points[i-1],b=points[i],dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy);if(len<35)continue;
   const seed=Math.abs(Math.round(a[0]*7+b[1]*13));const t=.35+(seed%3)*.12,side=seed%2?1:-1,offset=(r.width||8)/2+13;
   const x=a[0]+dx*t-dy/len*offset*side,y=a[1]+dy*t+dx/len*offset*side;
   const kind=kinds[seed%kinds.length],radius=['truck','car','cart'].includes(kind)?11:7;
   if(x<20||y<20||x>map.width-20||y>map.height-20)continue;
   if(protectedPoints.some(p=>Math.hypot(x-p[0],y-p[1])<32))continue;
   if(buildings.some(b=>inside(x,y,b.points)||b.points.some((p,n)=>distance(x,y,p,b.points[(n+1)%b.points.length])<radius)))continue;
   if(roads.some(road=>road.points.some((p,n)=>n&&distance(x,y,road.points[n-1],p)<(road.width||8)/2+radius)))continue;
   if(props.some(p=>Math.hypot(x*2-p.x,y*2-p.y)<100))continue;
   props.push({x:x*2,y:y*2,angle:Math.atan2(dy,dx),kind,seed,locale:map.key==='wigan'?'en':'de'});
 }}
 return props.sort((a,b)=>a.y-b.y);
}
function line(g,a,b,color,width=1){g.strokeStyle=color;g.lineWidth=width;g.beginPath();g.moveTo(...a);g.lineTo(...b);g.stroke();}
function box(g,x,y,w,h,color){const grad=g.createLinearGradient(x,y,x+w,y+h);grad.addColorStop(0,color);grad.addColorStop(1,'#363c31');g.fillStyle=grad;g.fillRect(x,y,w,h);g.strokeStyle='#38352b';g.lineWidth=.8;g.strokeRect(x,y,w,h);}
function ellipse(g,x,y,rx,ry,color){g.fillStyle=color;g.beginPath();g.ellipse(x,y,rx,ry,0,0,Math.PI*2);g.fill();}
function draw(g,props,bounds){for(const p of props){if(bounds&&(p.x<bounds.x-50||p.x>bounds.x+bounds.w+50||p.y<bounds.y-50||p.y>bounds.y+bounds.h+50))continue;g.save();g.translate(p.x,p.y);g.rotate(p.angle);ellipse(g,3,3,19,7,'#202d2540');
 if(p.kind==='sandbags'){for(let row=0;row<2;row++)for(let n=0;n<4;n++){const x=-17+n*10+(row%2)*4,y=row*5-5;ellipse(g,x,y,5.8,3.4,row?'#9b936c':'#b4a67a');line(g,[x-3,y-1],[x+3,y-1],'#cec29b',.7);}}
 if(p.kind==='crates'||p.kind==='fuel'){for(let n=0;n<3;n++){const x=n*10-14,y=n%2*6-6;box(g,x,y,9,10,p.kind==='fuel'?'#6e7550':'#a18455');line(g,[x+1,y+1],[x+8,y+9],'#c2ac7e');if(p.kind==='fuel')line(g,[x+2,y-1],[x+6,y-1],'#414632',2);}}
 if(p.kind==='truck'||p.kind==='car'||p.kind==='cart'){const truck=p.kind==='truck',cart=p.kind==='cart',len=truck?34:25;for(const x of [-len/2+3,len/2-3])for(const y of [-8,8])ellipse(g,x,y,3,2.5,'#242b28');box(g,-len/2,-7,len,14,cart?'#92764e':truck?'#747455':'#5d6660');if(cart){for(let x=-9;x<11;x+=4)line(g,[x,-6],[x,6],'#c1a77d');line(g,[12,-4],[24,-5],'#8e724a',2);line(g,[12,4],[24,5],'#8e724a',2);}else{box(g,truck?2:-5,-6,truck?10:12,12,'#4c5a54');box(g,truck?5:-2,-5,4,10,'#96a6a0');if(truck){box(g,-16,-6,17,12,'#9a9474');for(let x=-14;x<0;x+=5)line(g,[x,-6],[x,6],'#6d7258');}ellipse(g,len/2,5,1.5,1.3,'#d2c49c');ellipse(g,len/2,-5,1.5,1.3,'#d2c49c');}}
 if(p.kind==='bicycle'){for(const x of [-10,10]){g.strokeStyle='#353d36';g.lineWidth=1.5;g.beginPath();g.ellipse(x,0,6,6,0,0,Math.PI*2);g.stroke();}line(g,[-10,0],[0,-8],'#706e52',1.5);line(g,[0,-8],[4,0],'#706e52',1.5);line(g,[-10,0],[4,0],'#706e52',1.5);line(g,[4,0],[8,-7],'#706e52',1.5);line(g,[8,-7],[10,0],'#706e52',1.5);line(g,[-3,-9],[2,-9],'#382f29',2);line(g,[7,-7],[11,-9],'#333d35',1.5);}
 if(p.kind==='checkpoint'){box(g,-2,-13,3,22,'#8a7d60');box(g,-17,-16,34,12,'#696952');g.fillStyle='#e1d4ad';g.font='bold 6px serif';g.textAlign='center';g.fillText(p.locale==='en'?'CHECK POINT':'HALT',0,-8);}
 if(p.kind==='rubble'){for(let i=0;i<12;i++){g.save();g.translate((i*17+p.seed)%30-15,(i*11)%14-7);g.rotate(i);box(g,0,0,4,2.5,i%2?'#96775d':'#aaa18b');g.restore();}}
 g.restore();}}
return{prepare,draw};});
