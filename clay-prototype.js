/* Bounded Bad Belzig presentation sample. No entity writes, timers, RNG or physics hooks. */
(() => {
 'use strict';
 const art=window.BadFodderArt,TAU=Math.PI*2,cache=new Map(),held=new WeakMap(),shots=new WeakMap();
 let sample=null,readActors=null,selectedBlast=null;
 const enabled=()=>sample?.enabled;
 function seedOf(value){let n=2166136261;for(const c of String(value)){n=Math.imul(n^c.charCodeAt(0),16777619)}return n>>>0;}
 function noise(seed,index){let n=Math.imul(seed^Math.imul(index+1,374761393),668265263);n=(n^(n>>>13))>>>0;return n/4294967295;}
 function tint(hex,amount){const v=parseInt(hex.slice(1),16);return '#'+[16,8,0].map(s=>Math.max(0,Math.min(255,((v>>s)&255)+amount)).toString(16).padStart(2,'0')).join('');}
 // A single soft upper-left studio light, low contrast surface marks and local-colour edges.
 function shape(g,{path,bounds,base,seed=1,textureAmount=.035}){
  const [x,y,w,h]=bounds;base=tint(base,Math.round((noise(seed,14)-.5)*8));g.save();path(g);
  const light=g.createLinearGradient(x,y,x+w,y+h*.35);light.addColorStop(0,tint(base,28));light.addColorStop(.22,tint(base,15));light.addColorStop(.55,base);light.addColorStop(1,tint(base,-43));
  g.fillStyle=light;g.fill();g.lineJoin='round';g.strokeStyle=tint(base,-37);g.lineWidth=.65;g.stroke();g.clip();
  const glow=g.createRadialGradient(x+w*.28,y+h*.24,0,x+w*.32,y+h*.3,Math.max(w,h)*.65);glow.addColorStop(0,'#fff3dc26');glow.addColorStop(1,'#fff3dc00');g.fillStyle=glow;g.fillRect(x,y,w,h);
  g.globalAlpha=textureAmount;g.strokeStyle='#3d3429';g.lineWidth=.55;
  for(let i=0;i<5;i++){const px=x+w*noise(seed,i*2),py=y+h*noise(seed,i*2+1);g.beginPath();g.ellipse(px,py,w*.08,h*.035,-.6,0,Math.PI);g.stroke();}
  g.restore();
 }
 function oval(g,x,y,rx,ry,base,seed=1,angle=0){shape(g,{path:g=>{g.beginPath();g.ellipse(x,y,rx,ry,angle,0,TAU)},bounds:[x-rx,y-ry,rx*2,ry*2],base,seed});}
 function capsule(g,x,y,w,h,base,seed=1,angle=0){g.save();g.translate(x,y);g.rotate(angle);shape(g,{path:g=>{g.beginPath();g.roundRect(-w/2,-h/2,w,h,Math.min(w,h)*.45)},bounds:[-w/2,-h/2,w,h],base,seed});g.restore();}
 function contact(g,x,y,w,h){g.save();g.translate(x,y);g.scale(1,h/w);
  const local=g.createRadialGradient(0,0,0,0,0,w);local.addColorStop(0,'#29271f40');local.addColorStop(.5,'#29271f20');local.addColorStop(1,'#29271f00');g.fillStyle=local;g.beginPath();g.arc(0,0,w,0,TAU);g.fill();g.restore();}
 function cached(key,w,h,paint){if(cache.has(key))return cache.get(key);const c=document.createElement('canvas');c.width=w*3;c.height=h*3;const g=c.getContext('2d');g.scale(3,3);paint(g);if(cache.size>=320)cache.delete(cache.keys().next().value);cache.set(key,c);return c;}
 function nearest(list,point,loc=o=>[o.x,o.y]){return list.reduce((best,o)=>{const p=loc(o),d=Math.hypot(p[0]-point[0],p[1]-point[1]);return !best||d<best.d?{o,d}:best},null)?.o;}
 function nearestRoad(roads,p){let best=null,dist=Infinity;for(const r of roads){if(r.points.length<2||/railway|path|footway|steps/.test(r.kind))continue;for(let i=1;i<r.points.length;i++){const a=r.points[i-1],b=r.points[i],dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy||1))),d=Math.hypot(p[0]-a[0]-dx*t,p[1]-a[1]-dy*t);if(d<dist){dist=d;best=r}}}return best;}
 function configure({key,anchor,trees,buildings,roads,areas,props,getActors}){
  readActors=getActors;selectedBlast=null;
  if(key!=='bad-belzig'||new URLSearchParams(window.location.search).get('clay')!=='1'){sample={enabled:false};return;}
  sample={enabled:key==='bad-belzig'&&new URLSearchParams(window.location.search).get('clay')==='1',anchor,
   tree:nearest(trees,anchor),building:nearest(buildings.filter(b=>!b.hidden&&!b.landmarkFootprint),anchor,b=>[(b.minX+b.maxX)/2,(b.minY+b.maxY)/2]),
   road:nearestRoad(roads,anchor),
   ground:nearest(areas.filter(a=>/grass|meadow/.test(a.type)),anchor,a=>[(a.minX+a.maxX)/2,(a.minY+a.maxY)/2]),
   bags:nearest(props.filter(p=>p.kind==='sandbags'),anchor)};
 }
 function actorSelected(ent,team){if(!enabled()||!readActors)return false;const groups=readActors();if(!['squad','enemy','civilian'].includes(team))return false;
  if(!sample[team]||!groups[team].includes(sample[team])){sample[team]=team==='squad'?groups[team][0]:nearest(groups[team],sample.anchor);if(team==='squad')selectedBlast=null;}
  return ent===sample[team];
 }
 // Pose snapshots use the existing simulation-driven presentation clock. Body pose only is held.
 function steppedPose(ent){const live=art.pose(ent),tick=Math.floor(((live.clock||0)+1e-8)*12);let v=held.get(ent);
  // Shots/hits/death start immediately, then hold a replacement pose until the next visual tick.
  const shot=shots.get(ent)||{started:-Infinity,timer:0},newShot=live.state==='fire'&&(v?.state!=='fire'||(ent.fireTimer||0)>shot.timer+.001);
  const event=newShot||['hurt','stumble','dead','throw'].includes(live.state)&&v?.state!==live.state;
  if(newShot)shot.started=live.clock||0;shot.timer=ent.fireTimer||0;shots.set(ent,shot);
  if(!v||v.tick!==tick||event){v={...live,tick,fireAge:(live.clock||0)-shot.started};held.set(ent,v)}return v;
 }
 function figure(g,team,dir,step,state,stage,seed,moving){
  const civilian=team==='civilian',enemy=team==='enemy',angle=dir*Math.PI/4,back=Math.sin(angle)<-.35;
  const coat=civilian?'#947058':enemy?'#65716b':'#547181',trousers=civilian?'#595553':enemy?'#505e58':'#645e52',skin='#c49b79';
  g.save();g.translate(24,49);
  if(state==='dead'){g.rotate(stage*1.42);g.scale(1,.8)}
  else if(state==='hurt'||state==='stumble')g.rotate(-.09);
  const stride=moving?Math.sin(step*Math.PI/4)*(state==='run'?3:2):0;
  const recoil=state==='fire'?(stage===0?1.7:stage===1?1:.25):0;
  g.translate(-Math.cos(angle)*recoil,-Math.sin(angle)*recoil);
  // Sculpted shoes and separate cylindrical legs, not a stretched atlas.
  for(const side of [-1,1]){const x=side*3.4,offset=side*stride;oval(g,x+Math.cos(angle)*.8,1+offset,3.5,2,'#51483d',seed+side);capsule(g,x,-6+offset*.55,4.9,11,trousers,seed+side)}
  const sway=state==='idle'?(step%2?-.2:.2):moving?Math.cos(step*Math.PI/2)*.45:0;
  g.translate(sway,0);capsule(g,0,-20,civilian?14:13,civilian?22:19,coat,seed,.025);
  if(!back){capsule(g,-2.4,-26,2.6,7,tint(coat,9),seed,-.3);capsule(g,2.1,-26,2.6,7,tint(coat,-5),seed,.27);if(civilian)for(let i=0;i<3;i++)oval(g,.2,-21+i*3.2,.55,.55,'#685846',seed+i)}
  if(!civilian){capsule(g,0,-12,13,2,'#75624d',seed);capsule(g,enemy?3:-3,-21,2,16,'#897b60',seed,.1);oval(g,4,-13,2.4,3.1,'#7b745b',seed)}
  for(const side of [-1,1]){capsule(g,side*8,-21,4.4,14,coat,seed+side,side*(civilian?.13:.27));oval(g,side*8,-14,2.2,2.6,skin,seed+side)}
  oval(g,-.3,-35.5,5.3,6.5,skin,seed,-.025);
  if(enemy){oval(g,-.4,-39,6.2,3.8,'#617066',seed);capsule(g,-.2,-37.8,13,1.6,'#526158',seed)}
  else{oval(g,-.7,-40,5.1,2.8,civilian?'#6a5044':'#79684e',seed);if(!civilian)capsule(g,1,-39,10,1.3,'#7b7056',seed)}
  if(!back){const face=Math.cos(angle)*1.8;oval(g,face+1.3,-34.6,1.2,1.65,skin,seed);g.fillStyle='#665243';g.fillRect(face-2,-36,.7,.9);g.fillRect(face+1,-36,.7,.9);g.strokeStyle='#936e57';g.lineWidth=.5;g.beginPath();g.moveTo(face-1,-32);g.lineTo(face+1,-32);g.stroke()}
  if(!civilian){g.save();g.translate(Math.cos(angle)*4,-19+Math.sin(angle)*2);g.rotate(angle);capsule(g,4,0,18,2.5,'#6a5948',seed);capsule(g,9,-.4,11,1.25,'#505b59',seed);capsule(g,-1,2,4,5,'#75624c',seed,.22);g.restore()}
  g.restore();
 }
 const previousActor=art.drawActor;
 art.drawActor=function(g,ent,team='squad'){if(!actorSelected(ent,team))return previousActor(g,ent,team);
  const v=steppedPose(ent),step=v.moving?Math.floor((v.phase||0)/(Math.PI/4))%8:Math.floor((v.clock||0)*.8)%2;
  const firing=(v.state==='idle'||v.state==='walk'||v.state==='run'||v.state==='fire')&&v.fireAge<.24,displayState=firing?'fire':v.state;
  const stage=v.state==='dead'?Math.min(3,Math.floor((v.death||0)*12))/3:firing?Math.min(2,Math.floor(v.fireAge*12)):0;
  const seed=seedOf(team+':'+(ent.variant||0)),dir=v.dir||0,key=['figure',team,dir,step,displayState,stage,seed,!!v.moving].join(':');
  contact(g,ent.x,ent.y+2,10,3.8);const c=cached(key,48,58,g=>figure(g,team,dir,step,displayState,stage,seed,v.moving));g.drawImage(c,ent.x-24,ent.y-49,48,58);
 };
 const previousTree=art.tree;
 art.tree=function(g,t){if(!enabled()||t!==sample.tree)return previousTree(g,t);const w=36+t.r*1.6,h=w*1.25,seed=seedOf(t.x+':'+t.y);
  const c=cached('tree:'+seed,80,100,g=>{contact(g,40,94,26,7);shape(g,{path:g=>{g.beginPath();g.moveTo(34,93);g.quadraticCurveTo(40,67,35,37);g.lineTo(43,38);g.quadraticCurveTo(43,68,47,93);g.closePath()},bounds:[34,37,13,56],base:'#897255',seed});
   g.strokeStyle='#66563e55';g.lineWidth=1;for(let i=0;i<3;i++){g.beginPath();g.moveTo(38+i*2,87);g.quadraticCurveTo(40+i,70,38+i*2,57);g.stroke()}
   [[48,49,20,18,'#546744'],[28,43,22,20,'#708653'],[47,28,23,22,'#839662'],[26,25,18,17,'#9ca671'],[44,12,15,11,'#97a574']].forEach((p,i)=>{const [x,y,rx,ry,base]=p;shape(g,{path:g=>{g.beginPath();for(let n=0;n<24;n++){const a=n/24*TAU,r=1+.045*Math.sin(a*5+i)+.025*Math.cos(a*3+i);const px=x+Math.cos(a)*rx*r,py=y+Math.sin(a)*ry*r;if(n)g.lineTo(px,py);else g.moveTo(px,py)}g.closePath()},bounds:[x-rx,y-ry,rx*2,ry*2],base,seed:seed+i});g.strokeStyle='#dae2b81a';g.lineWidth=1.2;g.beginPath();g.ellipse(x-rx*.12,y-ry*.16,rx*.65,ry*.62,-.2,Math.PI*1.05,Math.PI*1.65);g.stroke()});});
  g.drawImage(c,t.x-w/2,t.y-h+5,w,h);
 };
 function materialPolygon(g,points,base,seed){const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);shape(g,{path:g=>{g.beginPath();points.forEach((p,i)=>i?g.lineTo(...p):g.moveTo(...p));g.closePath()},bounds:[Math.min(...xs),Math.min(...ys),Math.max(...xs)-Math.min(...xs),Math.max(...ys)-Math.min(...ys)],base,seed});}
 function buildingMaterial(g,b,points,base){if(!enabled()||b!==sample.building)return false;materialPolygon(g,points,base,seedOf(b.i));return true;}
 function ground(g){if(!enabled())return;g.save();
  const [x,y]=sample.anchor;
  // Feathered bounded patch over the original grass; no repeating tile edges.
  const c=cached('ground',240,240,g=>{const fade=g.createRadialGradient(120,120,20,120,120,115);fade.addColorStop(0,'#8b936aff');fade.addColorStop(.8,'#8b936abb');fade.addColorStop(1,'#8b936a00');g.fillStyle=fade;g.fillRect(0,0,240,240);
   for(let i=0;i<16;i++){g.globalAlpha=.12;oval(g,40+noise(71,i)*160,40+noise(72,i)*160,18+noise(73,i)*15,9+noise(74,i)*7,i%2?'#b5b28b':'#66704e',i)}g.globalAlpha=.4;for(let i=0;i<12;i++){const x=70+noise(14,i)*100,y=70+noise(15,i)*100;capsule(g,x,y,1,4,'#747c54',i,-.25);capsule(g,x+2,y,1,3,'#b0b17a',i,.3)}});g.drawImage(c,x-120,y-120,240,240);g.restore();}
 function road(g,r,w){if(!enabled()||r!==sample.road)return false;g.save();g.lineJoin='round';g.lineCap='round';g.beginPath();r.points.forEach((p,i)=>i?g.lineTo(...p):g.moveTo(...p));
  g.strokeStyle='#696d62';g.lineWidth=w+6;g.stroke();g.strokeStyle='#b1ab93';g.lineWidth=w+3;g.stroke();g.strokeStyle='#999a8a';g.lineWidth=w;g.stroke();
  // Sparse pressed paving follows the unchanged centreline, rather than tiled noise.
  for(let i=1;i<r.points.length;i++){const a=r.points[i-1],b=r.points[i],len=Math.hypot(b[0]-a[0],b[1]-a[1]);g.save();g.translate(...a);g.rotate(Math.atan2(b[1]-a[1],b[0]-a[0]));for(let x=8;x<len;x+=12){g.strokeStyle='#575e5012';g.lineWidth=.7;g.beginPath();g.moveTo(x,-w*.42);g.quadraticCurveTo(x+.6,0,x-.3,w*.42);g.stroke();g.strokeStyle='#e2dbc51c';g.beginPath();g.moveTo(x+1,-w*.42);g.lineTo(x+1,w*.42);g.stroke()}g.restore()}g.restore();return true;}
 function coverBag(g,x,y,a,w,h,index,row){if(!enabled())return false;
  const key=['coverBag',w.toFixed(2),h.toFixed(2),index,row].join(':');
  const c=cached(key,w+8,h+8,g=>{contact(g,(w+8)/2,(h+8)/2+2,w*.6,h*.6);capsule(g,(w+8)/2,(h+8)/2,w,h,tint('#ad9971',row*4),index,(noise(index,row)-.5)*.05);g.strokeStyle='#78634350';g.lineWidth=.6;g.beginPath();g.moveTo(5,(h+8)/2);g.quadraticCurveTo((w+8)/2,(h+8)/2+1.4,w+3,(h+8)/2);g.stroke()});
  g.save();g.translate(x,y);g.rotate(a+Math.PI/2);g.drawImage(c,-(w+8)/2,-(h+8)/2,w+8,h+8);g.restore();return true;
 }
 const props=window.BadFodderWartimeScenery,previousProps=props.draw;
 props.draw=function(g,list,bounds){if(!enabled()||!sample.bags)return previousProps(g,list,bounds);previousProps(g,list.filter(p=>p!==sample.bags),bounds);const p=sample.bags;if(!list.includes(p)||bounds&&(p.x<bounds.x-50||p.x>bounds.x+bounds.w+50||p.y<bounds.y-50||p.y>bounds.y+bounds.h+50))return;
  const c=cached('bags:'+p.seed,60,38,g=>{contact(g,30,26,23,8);for(let row=0;row<2;row++)for(let n=0;n<4;n++){const seed=p.seed+row*4+n,x=13+n*10+row*3,y=23-row*6;capsule(g,x,y,11+(noise(seed,1)-.5),6.5,'#ad9971',seed,(noise(seed,2)-.5)*.06);g.strokeStyle='#75634450';g.lineWidth=.55;g.beginPath();g.moveTo(x-4,y);g.quadraticCurveTo(x,y+2,x+4,y);g.stroke()}});g.save();g.translate(p.x,p.y);g.rotate(p.angle);g.drawImage(c,-30,-26,60,38);g.restore();};
 function blast(g,f){if(!enabled()||f.type!=='blast')return false;if(!selectedBlast)selectedBlast=f;if(f!==selectedBlast)return false;const stage=Math.min(7,Math.floor((.55-f.life+1e-8)*15)),seed=seedOf(f.x+':'+f.y);
  const c=cached('blast:'+seed+':'+stage,180,150,g=>{contact(g,90,100,35,9);const radius=[5,15,26,30,27,24,21,17][stage];
   for(let i=0;i<7;i++){const angle=i*2.399,x=90+Math.cos(angle)*radius*.65,y=95+Math.sin(angle)*radius*.4-stage*4;oval(g,x,y,radius*(.55+noise(seed,i)*.3),radius*.65,stage<2?'#edcb72':stage<4?(i%2?'#c68543':'#dca357'):['#686a62','#85867a','#aba997'][i%3],seed+i)}if(stage===0)oval(g,90,95,4,5,'#fff1bc',seed)});
  g.save();g.globalAlpha=stage>5?.85:1;g.drawImage(c,f.x-90,f.y-100,180,150);g.restore();return true;
 }
 window.BadFodderClay={configure,shape,seedOf,noise,steppedPose,actorSelected,buildingMaterial,ground,road,blast,coverBag,get sample(){return sample},get cacheSize(){return cache.size}};
})();
