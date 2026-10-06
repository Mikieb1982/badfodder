/* Barcelona visual polish pass 2.
   Adds presentation detail without changing mission geometry, collision or objectives. */
(function(root){
'use strict';
const TAU=Math.PI*2;
const base=root.BadFodderBarcelonaArt;
if(!base||base.__cohesionPass2)return;

function line(g,points,color,width=1,dash){
 if(!points||points.length<2)return;
 g.save();if(dash)g.setLineDash(dash);g.beginPath();points.forEach((p,i)=>i?g.lineTo(p[0],p[1]):g.moveTo(p[0],p[1]));
 g.strokeStyle=color;g.lineWidth=width;g.lineCap='round';g.lineJoin='round';g.stroke();g.restore();
}
function poly(g,points,fill,stroke,width=1){
 if(!points||points.length<3)return;g.beginPath();points.forEach((p,i)=>i?g.lineTo(p[0],p[1]):g.moveTo(p[0],p[1]));g.closePath();
 if(fill){g.fillStyle=fill;g.fill()}if(stroke){g.strokeStyle=stroke;g.lineWidth=width;g.stroke()}
}
function ellipse(g,x,y,rx,ry,fill,stroke,width=1){
 g.beginPath();g.ellipse(x,y,rx,ry,0,0,TAU);if(fill){g.fillStyle=fill;g.fill()}if(stroke){g.strokeStyle=stroke;g.lineWidth=width;g.stroke()}
}
function midpoint(points){let x=0,y=0;for(const p of points){x+=p[0];y+=p[1]}return[x/points.length,y/points.length]}
function inset(points,t=.82){const c=midpoint(points);return points.map(p=>[c[0]+(p[0]-c[0])*t,c[1]+(p[1]-c[1])*t])}
function point(a,b,t){return[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t]}
function hash(n){n=(n|0)+0x9e3779b9;n=Math.imul(n^(n>>>16),0x21f0aaad);n=Math.imul(n^(n>>>15),0x735a2d97);return((n^(n>>>15))>>>0)/4294967296}
function now(){return(root.performance&&typeof root.performance.now==='function'?root.performance.now():Date.now())/1000}
function buildingType(b){const n=String(b&&b.name||'').toLowerCase();if(n.includes('hotel colón'))return'hotel';if(n.includes('telefónica'))return'office';if(/cafè|impremta|shops/.test(n))return'shop';return'apartment'}

function roofFurniture(g,b,S){
 const p=b.points||[],c=midpoint(p),inner=inset(p,.82),type=buildingType(b),seed=(b.i||0)+11;
 g.save();
 line(g,inner.concat([inner[0]]),'rgba(77,70,58,.68)',S(.75));
 if(type==='apartment'||type==='shop'){
  const count=1+((b.i||0)%3);
  for(let i=0;i<count;i++){
   const x=c[0]+S((-8+i*8)+(hash(seed+i)-.5)*4),y=c[1]+S((-3+i*2)+(hash(seed+i+8)-.5)*3);
   g.fillStyle='#7b6f60';g.fillRect(x-S(3),y-S(2),S(6),S(4));g.strokeStyle='#49463d';g.lineWidth=S(.5);g.strokeRect(x-S(3),y-S(2),S(6),S(4));
   g.fillStyle='#98a19a';g.fillRect(x-S(2.2),y-S(1.3),S(4.4),S(1.8));
  }
 }
 if(type==='apartment'&&(b.i||0)%2===0){
  const a=[c[0]-S(12),c[1]-S(7)],d=[c[0]+S(13),c[1]+S(5)];line(g,[a,d],'#4f554d',S(.45));
  const cloth=['#9b765d','#6e8584','#c0a977','#856b72'];
  for(let i=0;i<4;i++){const q=point(a,d,(i+1)/5),w=S(3.8),h=S(4.5+(i%2));g.fillStyle=cloth[(i+(b.i||0))%cloth.length];g.fillRect(q[0]-w/2,q[1],w,h)}
 }
 if(type==='hotel'){
  for(const dx of [-17,17]){line(g,[[c[0]+S(dx),c[1]-S(5)],[c[0]+S(dx),c[1]-S(19)]],'#454b45',S(.7));line(g,[[c[0]+S(dx-4),c[1]-S(14)],[c[0]+S(dx+4),c[1]-S(14)]],'#454b45',S(.55));}
  ellipse(g,c[0]+S(24),c[1]+S(3),S(5),S(3),'#a78d6d','#5f574b',S(.55));
 }
 if(type==='office'){
  const mastY=c[1]-S(28);line(g,[[c[0],c[1]-S(8)],[c[0],mastY]],'#424944',S(1));
  for(const y of [10,16,22])line(g,[[c[0]-S(7),c[1]-S(y)],[c[0]+S(7),c[1]-S(y)]],'#505751',S(.55));
  ellipse(g,c[0],mastY,S(1.2),S(1.2),'#d0bc88');
 }
 g.restore();
}

function facadeAccents(g,b,S){
 const p=b.points||[],type=buildingType(b),seed=(b.i||0)+41;
 if(p.length<4)return;
 g.save();
 const lowest=[...p].sort((a,c)=>c[1]-a[1]).slice(0,2).sort((a,c)=>a[0]-c[0]),a=lowest[0],d=lowest[1];
 if(!a||!d)return g.restore();
 const len=Math.hypot(d[0]-a[0],d[1]-a[1]);if(len<S(22))return g.restore();
 const ux=(d[0]-a[0])/len,uy=(d[1]-a[1])/len;
 if(type==='shop'){
  for(let i=1;i<=Math.min(4,Math.floor(len/S(26)));i++){
   const q=point(a,d,i/(Math.min(4,Math.floor(len/S(26)))+1)),w=S(8),y=q[1]+S(7);
   poly(g,[[q[0]-ux*w,q[1]-uy*w],[q[0]+ux*w,q[1]+uy*w],[q[0]+ux*w+S(2),y+S(2)],[q[0]-ux*w+S(2),y+S(2)]],i%2?'#755d57':'#8e755f','#50473d',S(.45));
  }
 }
 if(type==='apartment'&&(b.i||0)%3===0){
  const q=point(a,d,.55);line(g,[[q[0],q[1]+S(5)],[q[0],q[1]+S(15)]],'#504c43',S(.65));
  g.fillStyle='#5a655d';g.fillRect(q[0]-S(4),q[1]+S(11),S(8),S(5));g.fillStyle='#b7aa88';g.fillRect(q[0]-S(3),q[1]+S(12),S(6),S(2));
 }
 if(hash(seed)>.48){
  const q=point(a,d,.22+hash(seed+1)*.55);g.fillStyle='rgba(225,211,179,.82)';g.fillRect(q[0]-S(2.5),q[1]+S(3),S(5),S(7));
  g.strokeStyle='#665e52';g.lineWidth=S(.35);g.strokeRect(q[0]-S(2.5),q[1]+S(3),S(5),S(7));
 }
 g.restore();
}

function offsetPath(points,offset){
 return points.map((p,i)=>{
  const a=points[Math.max(0,i-1)],b=points[Math.min(points.length-1,i+1)],dx=b[0]-a[0],dy=b[1]-a[1],l=Math.hypot(dx,dy)||1;
  return[p[0]-dy/l*offset,p[1]+dx/l*offset];
 });
}
function roadWear(g,r,S){
 const name=String(r.name||''),points=r.points||[],width=S(r.width||40);if(points.length<2)return;
 g.save();
 if(/RAMBLA/.test(name)){
  for(const off of [-width*.12,width*.12]){const rail=offsetPath(points,off);line(g,rail,'#454c48',S(1.45));line(g,rail,'#b6ad91',S(.48));}
  for(let i=0;i<points.length-1;i++){
   const a=points[i],b=points[i+1];for(const t of [.26,.52,.78]){const q=point(a,b,t),dx=b[0]-a[0],dy=b[1]-a[1],l=Math.hypot(dx,dy)||1,nx=-dy/l,ny=dx/l;
    line(g,[[q[0]+nx*width*.19,q[1]+ny*width*.19],[q[0]+nx*width*.28,q[1]+ny*width*.28]],'rgba(87,83,72,.62)',S(.7));
   }
  }
 }
 if(/PELAI|FONTANELLA|PORTAL|GRÀCIA/.test(name)){
  const gutters=[offsetPath(points,width*.47),offsetPath(points,-width*.47)];for(const path of gutters){line(g,path,'rgba(70,73,67,.65)',S(.8));line(g,path,'rgba(211,199,169,.26)',S(.35));}
 }
 for(let i=0;i<points.length-1;i++){
  const a=points[i],b=points[i+1],seed=(name.length*31+i*17);for(let k=0;k<2;k++){
   const t=.28+k*.37+hash(seed+k)*.08,q=point(a,b,Math.min(.9,t)),ang=Math.atan2(b[1]-a[1],b[0]-a[0]);
   g.save();g.translate(q[0],q[1]);g.rotate(ang);g.globalAlpha=.12+(k*.035);g.fillStyle='#3f4743';g.fillRect(-S(5),-S(1.8),S(10),S(3.6));g.restore();
  }
 }
 g.restore();
}

function handcart(g,x,y,S,rot=0){
 g.save();g.translate(x,y);g.rotate(rot);g.fillStyle='#765f47';g.fillRect(-S(8),-S(4),S(16),S(8));g.strokeStyle='#4e4538';g.lineWidth=S(.7);g.strokeRect(-S(8),-S(4),S(16),S(8));
 for(const dx of [-7,7])ellipse(g,S(dx),S(5),S(3),S(3),null,'#3f4541',S(.9));line(g,[[S(8),0],[S(15),S(2)]],'#574a39',S(1));
 g.fillStyle='#a08a68';for(let i=0;i<3;i++)g.fillRect(-S(6)+i*S(4.2),-S(2.5),S(3.2),S(2.5));g.restore();
}
function car(g,x,y,S,rot=0,body='#4f6663'){
 g.save();g.translate(x,y);g.rotate(rot);ellipse(g,S(8),S(8),S(11),S(4),'rgba(39,43,39,.18)');
 poly(g,[[-S(13),-S(5)],[S(11),-S(5)],[S(15),0],[S(11),S(6)],[-S(13),S(6)],[-S(16),0]],body,'#343d39',S(.8));
 poly(g,[[-S(6),-S(4)],[S(7),-S(4)],[S(10),0],[S(7),S(3)],[-S(6),S(3)],[-S(9),0]],'#2f4b4d','#82918a',S(.45));
 for(const dx of [-10,9]){ellipse(g,S(dx),-S(6),S(3),S(2),'#2f3432');ellipse(g,S(dx),S(7),S(3),S(2),'#2f3432')}
 ellipse(g,-S(14),0,S(1.4),S(2.2),'#d6c391');ellipse(g,S(14),0,S(1.4),S(2.2),'#a05e4b');g.restore();
}
function stall(g,x,y,S,rot=0){
 g.save();g.translate(x,y);g.rotate(rot);g.fillStyle='#816b4f';g.fillRect(-S(8),-S(3),S(16),S(7));g.strokeStyle='#4e4639';g.lineWidth=S(.6);g.strokeRect(-S(8),-S(3),S(16),S(7));
 poly(g,[[-S(10),-S(5)],[S(10),-S(5)],[S(7),-S(12)],[-S(7),-S(12)]],'#7a5e55','#51453f',S(.6));
 for(let i=0;i<4;i++)ellipse(g,-S(5)+i*S(3.5),0,S(1.1),S(.8),i%2?'#8c7657':'#68755d');g.restore();
}
function streetSign(g,x,y,S,text){
 g.save();line(g,[[x,y],[x,y-S(15)]],'#424944',S(.8));g.font='700 '+S(3.1)+'px system-ui,sans-serif';g.textAlign='center';const w=g.measureText(text).width+S(5);
 g.fillStyle='#315a68';g.fillRect(x-w/2,y-S(18),w,S(5.5));g.strokeStyle='#d0c39e';g.lineWidth=S(.45);g.strokeRect(x-w/2,y-S(18),w,S(5.5));g.fillStyle='#ece1c2';g.fillText(text,x,y-S(14));g.restore();
}
function treeGrate(g,x,y,S){g.save();g.strokeStyle='rgba(65,70,64,.65)';g.lineWidth=S(.5);g.strokeRect(x-S(6),y-S(4),S(12),S(8));for(let i=-4;i<=4;i+=2)line(g,[[x+S(i),y-S(4)],[x+S(i),y+S(4)]],'rgba(65,70,64,.45)',S(.35));g.restore()}
function scatter(g,x,y,S,seed){
 for(let i=0;i<7;i++){const a=hash(seed+i)*TAU,r=S(3+hash(seed+i+20)*13),px=x+Math.cos(a)*r,py=y+Math.sin(a)*r;g.save();g.translate(px,py);g.rotate(hash(seed+i+40)*TAU);g.fillStyle=i%3===0?'#8d7c63':'#b7aa8a';g.globalAlpha=.35+.18*(i%2);g.fillRect(-S(1.4),-S(.6),S(2.8),S(1.2));g.restore()}
}
function extraScenery(g,map,S,bounds){
 const inside=(x,y,pad=35)=>!bounds||x>=bounds.x-S(pad)&&y>=bounds.y-S(pad)&&x<=bounds.x+bounds.w+S(pad)&&y<=bounds.y+bounds.h+S(pad);
 g.save();
 const grates=[[298,724],[326,624],[352,524],[407,432],[455,430],[612,432],[660,430],[713,430]];for(const p of grates){const x=S(p[0]),y=S(p[1]);if(inside(x,y))treeGrate(g,x,y,S)}
 const carts=[[193,650,-.16],[526,615,.08],[744,537,.2]];for(const p of carts){const x=S(p[0]),y=S(p[1]);if(inside(x,y))handcart(g,x,y,S,p[2])}
 const cars=[[575,454,.03,'#4f6565'],[867,411,.01,'#6f6254'],[265,488,-.03,'#53626d']];for(const p of cars){const x=S(p[0]),y=S(p[1]);if(inside(x,y,55))car(g,x,y,S,p[2],p[3])}
 const stalls=[[307,700,-.04],[367,582,.04],[404,538,-.05]];for(const p of stalls){const x=S(p[0]),y=S(p[1]);if(inside(x,y))stall(g,x,y,S,p[2])}
 const signs=[[331,501,'LA RAMBLA'],[731,440,'FONTANELLA'],[768,494,'PORTAL'],[286,809,'TALLERS']];for(const p of signs){const x=S(p[0]),y=S(p[1]);if(inside(x,y))streetSign(g,x,y,S,p[2])}
 for(const p of [[280,666,3],[392,642,13],[578,686,23],[740,505,33],[507,432,43]]){const x=S(p[0]),y=S(p[1]);if(inside(x,y))scatter(g,x,y,S,p[2])}
 g.restore();
}

function battleAtmosphere(g,runtime,S){
 if(!runtime)return;const t=now();g.save();
 const smoke=[[438,458,.9],[771,390,1.25],[601,633,.72]];
 for(let j=0;j<smoke.length;j++){
  const p=smoke[j],x=S(p[0]),y=S(p[1]),speed=p[2];for(let i=0;i<5;i++){
   const phase=t*speed+i*.73+j*.31,rise=(phase*8+i*11)%S(42),drift=Math.sin(phase*1.3+i)*S(4),alpha=.035+.018*(i%3);
   ellipse(g,x+drift,y-rise,S(7+i*1.8),S(4+i*1.2),'rgba(73,76,69,'+alpha+')');
  }
 }
 for(let i=0;i<6;i++){
  const phase=t*.75+i*1.15,x=S(300+((phase*27+i*103)%470)),y=S(480+((i*61)%230))+Math.sin(phase+i)*S(5);g.save();g.translate(x,y);g.rotate(phase*.7+i);g.fillStyle='rgba(220,205,170,.20)';g.fillRect(-S(1.8),-S(.7),S(3.6),S(1.4));g.restore();
 }
 const b=runtime.barrier;if(b&&((b.integrity||0)>0||b.constructionTier)){
  const pulse=.35+.25*(Math.sin(t*5.2)*.5+.5);ellipse(g,b.x+S(30),b.y-S(21),S(2.4),S(1.1),'rgba(236,196,111,'+pulse+')');
 }
 g.restore();
}

const oldBuilding=base.building;base.building=function(g,b,S){oldBuilding.apply(this,arguments);roofFurniture(g,b,S);facadeAccents(g,b,S)};
const oldRoad=base.road;base.road=function(g,r,S){oldRoad.apply(this,arguments);roadWear(g,r,S)};
const oldScenery=base.scenery;base.scenery=function(g,map,S,bounds){oldScenery.apply(this,arguments);extraScenery(g,map,S,bounds)};
const oldDefence=base.defence;base.defence=function(g,runtime,S){oldDefence.apply(this,arguments);battleAtmosphere(g,runtime,S)};

function patchCharacters(){
 const art=root.BadFodderArt,ids=root.BadFodderIdentities;if(!art||art.__barcelonaCohesionPass2)return;
 let active='';const resolve=key=>{try{return ids&&ids.get?ids.get(key).key:String(key||'')}catch(_){return String(key||'')}};
 const oldSet=art.setMissionIdentity;if(typeof oldSet==='function')art.setMissionIdentity=function(key){active=resolve(key);return oldSet.apply(this,arguments)};
 const oldDraw=art.drawActor;if(typeof oldDraw==='function')art.drawActor=function(g,ent,team='squad'){
  if(active!=='barcelona'||!ent)return oldDraw.apply(this,arguments);
  const pose=typeof art.pose==='function'?art.pose(ent):null,state=pose&&pose.state||ent.state||'',moving=!!(pose&&(pose.moving||/walk|run/.test(state))),phase=pose&&Number.isFinite(pose.phase)?pose.phase:0;
  const dir=Number.isFinite(pose&&pose.dir)?pose.dir:(Number.isFinite(ent.dir)?ent.dir:0),angle=dir*TAU/8;
  const bob=moving?Math.sin(phase*2)*.65:Math.sin(now()*2.2+(ent.variant||0))*.18;
  const lean=moving?Math.sin(phase)*.008:(state==='fire'?.012:0);
  g.save();g.translate(ent.x,ent.y);g.rotate(lean);g.translate(-ent.x,-ent.y+bob);const result=oldDraw.apply(this,arguments);g.restore();
  g.save();
  if(moving){const stride=Math.abs(Math.sin(phase));g.globalAlpha=.08+.08*stride;ellipse(g,ent.x-Math.cos(angle)*3,ent.y+3,4.6,1.7,'#b9a984')}
  if(state==='fire'){
   const sx=ent.x+Math.cos(angle+Math.PI/2)*7,sy=ent.y+Math.sin(angle+Math.PI/2)*7-17;g.translate(sx,sy);g.rotate(angle+1.2);g.fillStyle='rgba(236,207,129,.8)';g.fillRect(-1.7,-.5,3.4,1);
  }
  if(team==='squad'||team==='resistance'){
   const v=Math.abs(ent.variant||0)%4;if(v===0){line(g,[[ent.x-5,ent.y-27],[ent.x+5,ent.y-16]],'rgba(124,103,75,.72)',1.1)}
   else if(v===1){line(g,[[ent.x-6,ent.y-29],[ent.x+4,ent.y-18]],'rgba(172,145,107,.7)',1)}
   else if(v===2){g.fillStyle='rgba(82,92,83,.72)';g.fillRect(ent.x+5,ent.y-22,5,7);g.strokeStyle='rgba(49,55,50,.8)';g.lineWidth=.6;g.strokeRect(ent.x+5,ent.y-22,5,7)}
   else{g.fillStyle='rgba(129,94,73,.72)';g.fillRect(ent.x-10,ent.y-21,5,6);g.strokeStyle='rgba(64,54,47,.8)';g.lineWidth=.6;g.strokeRect(ent.x-10,ent.y-21,5,6)}
  }
  g.restore();return result;
 };
 art.__barcelonaCohesionPass2=true;
}
patchCharacters();
base.installCohesionPass2=patchCharacters;base.__cohesionPass2=true;
})(typeof window!=='undefined'?window:globalThis);
