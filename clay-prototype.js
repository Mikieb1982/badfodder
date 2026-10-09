/* Bounded Bad Belzig presentation sample. No entity writes, timers, RNG or physics hooks. */
(() => {
 'use strict';
 const art=window.BadFodderArt,TAU=Math.PI*2,cache=new Map(),held=new WeakMap(),shots=new WeakMap();
 let sample=null,readActors=null,selectedBlast=null,drawModel=null,loaded=false,loading=null;
 const images={};
 const frames={"figures": [[[38, 26, 203, 273], [269, 29, 191, 269], [482, 22, 191, 269], [684, 26, 188, 275], [899, 27, 179, 270], [1115, 29, 180, 269], [1355, 27, 167, 266], [1555, 28, 184, 272]], [[30, 304, 203, 273], [258, 304, 202, 273], [483, 304, 166, 269], [687, 306, 186, 272], [902, 307, 183, 265], [1115, 307, 184, 265], [1357, 306, 168, 268], [1577, 305, 171, 273]], [[32, 583, 160, 278], [262, 583, 159, 276], [488, 583, 151, 270], [710, 583, 162, 278], [928, 583, 153, 273], [1143, 583, 154, 273], [1363, 583, 143, 270], [1581, 583, 154, 277]]], "scenery": [[[12, 15, 302, 355], [325, 12, 301, 358], [640, 24, 299, 349], [946, 22, 298, 349]], [[18, 464, 292, 145], [330, 455, 298, 133], [640, 408, 296, 201], [958, 399, 285, 211]], [[90, 770, 155, 136], [337, 704, 281, 205], [630, 627, 306, 288], [944, 638, 299, 280]], [[25, 913, 285, 318], [334, 945, 289, 285], [642, 973, 296, 259], [971, 981, 266, 252]]], "materials": [[[0, 0, 627, 627], [627, 0, 627, 627]], [[0, 627, 627, 627], [627, 627, 627, 627]]]};
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
 function contact(g,x,y,w,h){g.save();g.translate(x,y);g.scale(1,h/w);
  const local=g.createRadialGradient(0,0,0,0,0,w);local.addColorStop(0,'#29271f40');local.addColorStop(.5,'#29271f20');local.addColorStop(1,'#29271f00');g.fillStyle=local;g.beginPath();g.arc(0,0,w,0,TAU);g.fill();g.restore();}
 function cached(key,w,h,paint){if(cache.has(key))return cache.get(key);const c=document.createElement('canvas');c.width=w*3;c.height=h*3;const g=c.getContext('2d');g.scale(3,3);paint(g);if(cache.size>=320)cache.delete(cache.keys().next().value);cache.set(key,c);return c;}
 function nearest(list,point,loc=o=>[o.x,o.y]){return list.reduce((best,o)=>{const p=loc(o),d=Math.hypot(p[0]-point[0],p[1]-point[1]);return !best||d<best.d?{o,d}:best},null)?.o;}
 function nearestRoad(roads,p){let best=null,dist=Infinity;for(const r of roads){if(r.points.length<2||/railway|path|footway|steps/.test(r.kind))continue;for(let i=1;i<r.points.length;i++){const a=r.points[i-1],b=r.points[i],dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy||1))),d=Math.hypot(p[0]-a[0]-dx*t,p[1]-a[1]-dy*t);if(d<dist){dist=d;best=r}}}return best;}
 function configure({key,anchor,trees,buildings,roads,areas,props,getActors,renderBuilding}){
  readActors=getActors;drawModel=renderBuilding;selectedBlast=null;
  if(key!=='bad-belzig'||new URLSearchParams(window.location.search).get('clay')!=='1'){sample={enabled:false};return;}
  sample={enabled:key==='bad-belzig'&&new URLSearchParams(window.location.search).get('clay')==='1',anchor,
   tree:nearest(trees,anchor),building:nearest(buildings.filter(b=>!b.hidden&&!b.landmarkFootprint&&b.maxX-b.minX>40&&b.maxY-b.minY>40),anchor,b=>[(b.minX+b.maxX)/2,(b.minY+b.maxY)/2])||nearest(buildings.filter(b=>!b.hidden&&!b.landmarkFootprint),anchor,b=>[(b.minX+b.maxX)/2,(b.minY+b.maxY)/2]),
   road:nearestRoad(roads,anchor),
   ground:nearest(areas.filter(a=>/grass|meadow/.test(a.type)),anchor,a=>[(a.minX+a.maxX)/2,(a.minY+a.maxY)/2]),
   bags:nearest(props.filter(p=>p.kind==='sandbags'),anchor)};
  preload(key).then(ready=>{if(ready&&enabled())installReview()});
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
 // Three compressed atlases, loaded only for this opt-in mission. Failed loads use the original art.
 function preload(key){
  if(key!=='bad-belzig'||new URLSearchParams(window.location.search).get('clay')!=='1')return Promise.resolve(false);
  if(loading)return loading;
  const urls={figures:'assets/clay/figures.webp',scenery:'assets/clay/scenery.webp',materials:'assets/clay/materials.webp'};
  loading=Promise.all(Object.entries(urls).map(([name,url])=>new Promise(resolve=>{const im=new Image();let done=false;const timer=setTimeout(()=>finish(false),10000);function finish(ok){if(done)return;done=true;clearTimeout(timer);if(ok)images[name]=im;resolve(ok)}im.onload=()=>finish(true);im.onerror=()=>finish(false);im.src=window.BadFodderAssetUrl?.(url)||url}))).then(results=>loaded=results.every(Boolean));
  return loading;
 }
 function source(g,name,row,col,x,y,w,h){const rect=frames[name][row][col];g.drawImage(images[name],...rect,x,y,w,h)}
 // Each tile is reflected at its edges before repetition. Cached patterns have no hard seams.
 function material(kind,size=192){return cached('material:'+kind+':'+size,size*2,size*2,g=>{const row=kind==='grass'||kind==='road'?0:1,col=kind==='road'||kind==='roof'?1:0;
  for(let y=0;y<2;y++)for(let x=0;x<2;x++){g.save();g.translate(x?size*2:0,y?size*2:0);g.scale(x?-1:1,y?-1:1);source(g,'materials',row,col,0,0,size,size);g.restore()}})}
 function pattern(g,kind,size){const p=g.createPattern(material(kind,size),'repeat');p?.setTransform?.({a:1/3,b:0,c:0,d:1/3,e:0,f:0});return p}
 function figure(g,team,v){
  const row=team==='enemy'?1:team==='civilian'?2:0,dir=v.dir||0,col=dir===4?0:dir===5||dir===7?4:dir;
  const rect=frames.figures[row][col],height=43,width=rect[2]/rect[3]*height;
  const step=v.moving?Math.floor((v.phase||0)/(Math.PI/4))%8:Math.floor((v.clock||0)*.8)%2;
  const stride=v.moving?Math.sin(step*Math.PI/4)*(v.state==='run'?2.4:1.6):0;
  const firing=/^(idle|walk|run|fire)$/.test(v.state)&&v.fireAge<.24,recoil=firing?[1.6,1,.2][Math.min(2,Math.floor(v.fireAge*12))]:0;
  g.save();g.translate(24-Math.cos(dir*Math.PI/4)*recoil,49-Math.sin(dir*Math.PI/4)*recoil);
  if(v.state==='dead'){g.rotate(Math.min(1,(v.death||0)*4)*1.48);g.scale(1,.78)}
  else if(v.state==='hurt'||v.state==='stumble')g.rotate(-.12);
  else if(v.moving)g.rotate(Math.sin(step*Math.PI/4)*.025);
  else g.rotate(step?.008:-.008);
  if(dir===4||dir===7)g.scale(-1,1);
  // Same limb replacement technique as the existing illustrated actors, with held poses.
  const [sx,sy,sw,sh]=rect,split=Math.floor(sh*.73),scale=height/sh,leg=sh-split,half=Math.floor(sw/2);
  g.drawImage(images.figures,sx,sy,sw,split,-width/2,-height,width,split*scale);
  g.drawImage(images.figures,sx,sy+split,half,leg,-width/2,-leg*scale+stride,half*scale,leg*scale);
  g.drawImage(images.figures,sx+half,sy+split,sw-half,leg,-width/2+half*scale,-leg*scale-stride,(sw-half)*scale,leg*scale);
  g.restore();
 }
 function miniature(g,team,v,x,y){const step=v.moving?Math.floor((v.phase||0)/(Math.PI/4))%8:Math.floor((v.clock||0)*.8)%2;
  const recoil=Math.min(3,Math.floor((v.fireAge??Infinity)*12)),death=Math.min(4,Math.floor((v.death||0)*12));
  const key=['figure',team,v.dir,step,v.state,recoil,death,!!v.moving].join(':');
  contact(g,x,y+2,10,3.8);const dead=v.state==='dead',w=dead?112:48,h=dead?76:58;const c=cached(key,w,h,g=>{if(dead)g.translate(32,9);figure(g,team,v)});g.drawImage(c,x-w/2,y-(dead?58:49),w,h);
 }
 const previousActor=art.drawActor;
 art.drawActor=function(g,ent,team='squad'){if(!loaded||!actorSelected(ent,team))return previousActor(g,ent,team);miniature(g,team,steppedPose(ent),ent.x,ent.y)};
 const previousTree=art.tree;
 art.tree=function(g,t){if(!loaded||!enabled()||t!==sample.tree)return previousTree(g,t);
  const w=36+t.r*1.6,h=w*1.25,seed=seedOf(t.x+':'+t.y),col=seed%4;
  const c=cached('tree:'+seed,80,100,g=>{contact(g,40,94,26,7);source(g,'scenery',0,col,4,0,72,95)});g.drawImage(c,t.x-w/2,t.y-h+5,w,h);
 };
 function polygon(g,points){g.beginPath();points.forEach((p,i)=>i?g.lineTo(...p):g.moveTo(...p));g.closePath()}
 function buildingMaterial(g,b,points,base,roof=null){if(!loaded||!enabled()||b!==sample.building)return false;
  const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]),x=Math.min(...xs),y=Math.min(...ys),w=Math.max(...xs)-x,h=Math.max(...ys)-y;
  g.save();polygon(g,points);g.clip();g.fillStyle=base;g.fillRect(x,y,w,h);
  if(roof){g.transform(...roof.transform);g.fillStyle=pattern(g,'roof',36);g.fillRect(-roof.length/2-2,-roof.half-2,roof.length+4,roof.half*2+4)}
  else {g.globalAlpha=.82;g.fillStyle=pattern(g,'wall',90);g.fillRect(x,y,w,h)}
  g.restore();g.save();polygon(g,points);const light=g.createLinearGradient(x,y,x+w,y+h*.4);light.addColorStop(0,'#fff0c426');light.addColorStop(1,'#40332932');g.fillStyle=light;g.fill();g.strokeStyle=tint(base,-35);g.lineWidth=.9;g.lineJoin='round';g.stroke();g.restore();return true;
 }
 function ground(g){if(!loaded||!enabled())return;
  const c=cached('ground',640,640,g=>{source(g,'materials',0,0,0,0,640,640);g.globalAlpha=.16;g.fillStyle='#939777';g.fillRect(0,0,640,640);g.globalAlpha=1;g.globalCompositeOperation='destination-in';const fade=g.createRadialGradient(320,320,175,320,320,315);fade.addColorStop(0,'#fff');fade.addColorStop(1,'#fff0');g.fillStyle=fade;g.fillRect(0,0,640,640);g.globalCompositeOperation='source-over';
   for(let i=0;i<9;i++){const x=170+noise(71,i)*280,y=170+noise(72,i)*280;source(g,'scenery',1,3,x,y,26,24)}});
  g.drawImage(c,sample.anchor[0]-320,sample.anchor[1]-320,640,640);
 }
 function road(g,r,w){if(!loaded||!enabled()||r!==sample.road)return false;g.save();g.lineJoin='round';g.lineCap='round';g.beginPath();r.points.forEach((p,i)=>i?g.lineTo(...p):g.moveTo(...p));g.strokeStyle='#666357';g.lineWidth=w+4;g.stroke();g.strokeStyle='#c1b79f';g.lineWidth=w+2;g.stroke();g.strokeStyle=pattern(g,'road',72);g.lineWidth=w;g.stroke();g.restore();return true}
 function coverBag(g,x,y,a,w,h,index,row){if(!loaded||!enabled())return false;
  const key=['coverBag',w.toFixed(2),h.toFixed(2),index,row].join(':');const c=cached(key,w+6,h+6,g=>{contact(g,(w+6)/2,(h+6)/2+1,w*.55,h*.55);source(g,'scenery',1,0,3,3,w,h)});
  g.save();g.translate(x,y);g.rotate(a+Math.PI/2+(noise(index,row)-.5)*.04);g.drawImage(c,-(w+6)/2,-(h+6)/2,w+6,h+6);g.restore();return true;
 }
 const props=window.BadFodderWartimeScenery,previousProps=props.draw;
 props.draw=function(g,list,bounds){if(!loaded||!enabled()||!sample.bags)return previousProps(g,list,bounds);previousProps(g,list.filter(p=>p!==sample.bags),bounds);const p=sample.bags;if(!list.includes(p)||bounds&&(p.x<bounds.x-50||p.x>bounds.x+bounds.w+50||p.y<bounds.y-50||p.y>bounds.y+bounds.h+50))return;
  const c=cached('bags',60,38,g=>{contact(g,30,26,23,8);source(g,'scenery',1,1,2,2,56,29)});g.save();g.translate(p.x,p.y);g.rotate(p.angle);g.drawImage(c,-30,-26,60,38);g.restore();
 };
 function effect(g,stage,x,y){const c=cached('blast:'+stage,180,150,g=>{const row=stage<4?2:3,col=stage%4,rect=frames.scenery[row][col],w=[24,65,95,100,100,125,125,110][stage],h=Math.min(130,w*rect[3]/rect[2]);contact(g,90,135,w*.26,6);source(g,'scenery',row,col,90-w/2,135-h,w,h)});g.drawImage(c,x-90,y-135,180,150)}
 function blast(g,f){if(!loaded||!enabled()||f.type!=='blast')return false;if(!selectedBlast)selectedBlast=f;if(f!==selectedBlast)return false;const stage=Math.max(0,Math.min(7,Math.floor((.55-f.life+1e-8)*15)));effect(g,stage,f.x,f.y);return true}
 // An isolated art study puts the same live assets together without moving any map objects.
 let review=null,reviewBoard=null,reviewRAF=0;
 function installReview(){if(document.getElementById('clayStudyButton'))return;
  const button=document.createElement('button');button.id='clayStudyButton';button.textContent='VIEW CLAY MINIATURE STUDY';button.style='position:absolute;top:8px;right:8px;z-index:6000;padding:10px 16px;border:1px solid #e3cf9b;background:#232b28;color:#fff0c9;border-radius:6px;font:600 12px sans-serif;cursor:pointer';button.onclick=showReview;(document.getElementById('menuScreen')||document.body).append(button);
  if(new URLSearchParams(window.location.search).get('study')==='1')showReview();
 }
 function board(){return cached('review-board',1000,560,g=>{
  g.fillStyle='#342f27';g.fillRect(0,0,1000,560);g.fillStyle='#67583e';g.beginPath();g.roundRect(34,55,932,475,14);g.fill();g.save();g.beginPath();g.roundRect(34,40,932,475,14);g.clip();source(g,'materials',0,0,34,40,932,475);
  g.save();g.beginPath();g.moveTo(30,310);g.bezierCurveTo(260,250,710,330,980,405);g.lineWidth=108;g.strokeStyle='#5f5a47';g.stroke();g.lineWidth=96;g.strokeStyle=pattern(g,'road',256);g.stroke();g.restore();
  for(let i=0;i<12;i++)source(g,'scenery',1,3,65+noise(88,i)*835,90+noise(89,i)*360,34,31);
  if(drawModel&&sample.building){const b=sample.building,m=window.BadFodderBuildings.mesh(b.points,b.height),points=[...b.points,...m.planes.flatMap(p=>p.points),...m.walls.flatMap(p=>p.points||[])],xs=points.map(p=>p[0]),ys=points.map(p=>p[1]),left=Math.min(...xs),top=Math.min(...ys),right=Math.max(...xs),bottom=Math.max(...ys),s=Math.min(340/(right-left),220/(bottom-top));g.save();g.translate(565,170);g.scale(s,s);g.translate(-(left+right)/2,-(top+bottom)/2);drawModel(g,b);g.restore()}
  contact(g,174,215,80,20);source(g,'scenery',0,0,72,45,204,240);
  contact(g,650,373,80,16);source(g,'scenery',1,1,555,309,165,73);
  source(g,'scenery',1,2,765,205,95,63);g.restore();
 })}
 function showReview(){if(!loaded||!enabled())return false;if(review){review.focus();return true}
  review=document.createElement('div');review.id='clayStudy';review.tabIndex=-1;review.setAttribute('role','dialog');review.setAttribute('aria-modal','true');review.setAttribute('aria-label','Bad Belzig clay miniature study');review.style='position:fixed;inset:0;z-index:10000;background:#171c19;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:8px;box-sizing:border-box;color:#eee2c6';
  const title=document.createElement('div');title.textContent='BAD BELZIG · CLAY MINIATURE STUDY';title.style='font:600 clamp(11px,2vw,20px) sans-serif;letter-spacing:2px;margin:5px';review.append(title);
  reviewBoard=document.createElement('canvas');reviewBoard.width=1000;reviewBoard.height=560;reviewBoard.style='aspect-ratio:1000/560;min-height:0;background:#342f27;flex:0 0 auto;width:min(100%,1000px,calc((100dvh - 95px)*1.7857));height:auto;max-height:calc(100dvh - 95px);object-fit:contain';review.append(reviewBoard);
  const close=document.createElement('button');close.textContent='RETURN TO GAME';close.style='padding:9px 20px;margin:6px;border:1px solid #bfa976;border-radius:5px;background:#2b342e;color:#f0e2be;font:600 12px sans-serif;cursor:pointer';close.onclick=hideReview;review.append(close);review.onkeydown=e=>{if(e.key==='Escape')hideReview()};(document.getElementById('game')?.parentElement||document.body).append(review);close.focus();
  const start=performance.now(),g=reviewBoard.getContext('2d');function render(time){if(!review)return;g.clearRect(0,0,1000,560);g.drawImage(board(),0,0,1000,560);const clock=Math.floor(Math.max(0,time-start)/1000*12)/12;
   for(const [i,team]of ['squad','enemy','civilian'].entries()){const fire=team==='squad'&&clock%4>3.5&&clock%4<3.75,v={dir:i===1?3:1,state:fire?'fire':i===1?'idle':'walk',clock,phase:clock*8,moving:i!==1,fireAge:fire?clock%4-3.5:Infinity};g.save();g.translate(320+i*155,406+(i===1?-52:0));g.scale(2.5,2.5);miniature(g,team,v,0,0);g.restore()}
   const stage=Math.floor(Math.max(0,time-start)/1000*15)%40;if(stage<8)effect(g,stage,839,421);
   g.fillStyle='#f0e0b9';g.font='12px sans-serif';g.fillText('KARL',283,474);g.fillText('ENEMY',435,474);g.fillText('CIVILIAN',590,474);g.fillText('Original Bad Belzig architecture · handmade materials · held animation poses',50,548);reviewRAF=requestAnimationFrame(render)}render(start);return true;
 }
 function hideReview(){if(!review)return;cancelAnimationFrame(reviewRAF);review.remove();review=null;document.getElementById('clayStudyButton')?.focus()}
 window.BadFodderClay={configure,preload,shape,seedOf,noise,steppedPose,actorSelected,buildingMaterial,ground,road,blast,coverBag,showReview,hideReview,get ready(){return loaded},get sample(){return sample},get cacheSize(){return cache.size}};
})();
