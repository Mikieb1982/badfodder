/* A shared pixel-art finish. World anchors, actor identity, pose and simulation stay intact. */
(()=>{'use strict';
 const art=window.BadFodderArt;if(!art)return;
 const previous=art.drawActor,previousTexture=art.texture,previousLandmark=art.landmark;
 const make=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c};
 const capture=make(96,96),source=capture.getContext('2d'),sprite=make(48,48),pixels=sprite.getContext('2d');
 const tiles=new Map(),landmarks=new Map(),trees=new Map();
 art.visualStyle='chibi-pixel';
 art.drawActor=(ctx,ent,team='squad')=>{
  source.clearRect(0,0,96,96);source.save();source.translate(48-ent.x,64-ent.y);
  previous(source,ent,team);source.restore();
  pixels.clearRect(0,0,48,48);pixels.imageSmoothingEnabled=false;
  const pose=art.pose(ent),fallen=ent.alive===false||ent.downed||pose.state==='dead';
  if(fallen){pixels.drawImage(capture,0,0,96,96,0,0,48,48)}
  else{
   // Enlarge only the head region; compress the torso below it. Feet retain their anchor.
   pixels.drawImage(capture,16,12,64,26,5,8,38,14);
   pixels.drawImage(capture,16,38,64,26,8,22,32,10);
  }
  ctx.save();ctx.imageSmoothingEnabled=false;
  ctx.drawImage(sprite,ent.x-48,ent.y-64,96,96);ctx.restore();
 };
 const palette={
  grass:['#91ad72','#9eb97f','#819b65'],forest:['#647f5d','#78916b','#587351'],wood:['#7b9969','#8ba778','#6e895e'],
  meadow:['#acbb80','#bdc994','#9eae72'],cemetery:['#99ab87','#a9b999','#899d78'],
  road:['#c8c3ac','#dbd5bf','#b2ad99'],path:['#cdb58a','#dbc69f','#bda47c'],
  roof:['#bb7a5e','#d49470','#9d6553'],'roof-slate':['#737e83','#8d989b','#606b73'],
  stucco:['#e5d5b1','#f0e2c4','#cfbd9a'],'urban-brick':['#b98268','#cc9a7c','#a36e59'],
  'urban-asphalt':['#828987','#929895','#767d7c'],'urban-paving':['#c0baa8','#d1cbb8','#aaa594'],
  'urban-roof':['#777d82','#8d9397','#626b73'],water:['#77a7b0','#9dc5c9','#68969f']
 };
 art.texture=(ctx,key)=>{
  if(!palette[key])return previousTexture(ctx,key);
  if(!tiles.has(key)){
   const c=make(64,64),g=c.getContext('2d'),p=palette[key];g.fillStyle=p[0];g.fillRect(0,0,64,64);
   let seed=1936;const rnd=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
   if(/roof|brick|road|paving/.test(key)){
    const h=/roof|brick/.test(key)?8:16,w=/brick/.test(key)?16:32;
    for(let y=0;y<64;y+=h)for(let x=(y/h%2?-w/2:0);x<64;x+=w){g.fillStyle=p[2];g.fillRect(x,y,w,1);g.fillRect(x,y,1,h);g.fillStyle=p[1];g.fillRect(x+2,y+2,w-4,1)}
   }else{
    // Sparse, broad clusters read as ground rather than photographic grain.
    for(let i=0;i<14;i++){const x=Math.floor(rnd()*32)*2,y=Math.floor(rnd()*32)*2;g.fillStyle=p[1+i%2];g.fillRect(x,y,4+(i%3)*2,2);if(!/stucco|asphalt/.test(key))g.fillRect(x+2,y-2,2,2)}
   }
   tiles.set(key,c);
  }
  return ctx.createPattern(tiles.get(key),'repeat');
 };
 art.tree=(ctx,t)=>{
  const key=t.dark?'dark':'light';
  if(!trees.has(key)){
   const c=make(48,56),g=c.getContext('2d'),p=t.dark?['#47684f','#68845c','#91a875']:['#58784d','#88a568','#bad08c'];
   const oval=(x,y,rx,ry,color)=>{g.fillStyle=color;g.beginPath();g.ellipse(x,y,rx,ry,0,0,Math.PI*2);g.fill()};
   g.fillStyle='#735b45';g.fillRect(21,30,6,21);g.fillStyle='#b1976c';g.fillRect(22,34,2,16);
   for(const [x,y,rx,ry] of [[14,24,11,12],[27,15,13,13],[35,28,10,11],[22,33,14,12]]){oval(x,y,rx,ry,p[0]);oval(x-1,y-3,rx-1,ry-2,p[1])}
   oval(19,15,8,7,p[2]);oval(32,24,5,4,p[2]);oval(12,29,4,3,p[2]);trees.set(key,c);
  }
  const w=36+t.r*1.6,h=w*1.25;ctx.save();ctx.imageSmoothingEnabled=false;
  ctx.fillStyle='#32483330';ctx.beginPath();ctx.ellipse(t.x+3,t.y+2,w*.32,w*.07,0,0,Math.PI*2);ctx.fill();
  ctx.drawImage(trees.get(key),t.x-w/2,t.y-h+5,w,h);ctx.restore();
 };
 art.landmark=key=>{
  const original=previousLandmark(key);if(!original)return original;
  if(!landmarks.has(key)){
   const small=make(Math.ceil(original.width/3),Math.ceil(original.height/3)),g=small.getContext('2d');
   g.imageSmoothingEnabled=false;g.drawImage(original,0,0,small.width,small.height);
   const out=make(original.width,original.height),o=out.getContext('2d');o.imageSmoothingEnabled=false;o.drawImage(small,0,0,out.width,out.height);landmarks.set(key,out);
  }
  return landmarks.get(key);
 };
})();
