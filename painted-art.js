/* Painted raster artwork with articulated, distance-driven motion.
   Procedural art remains available if an image cannot be loaded. */
(() => {
  'use strict';
  const art=window.BadFodderArt;
  const fallback={texture:art.texture,landmark:art.landmark,tree:art.tree,soldier:art.soldier,drawActor:art.drawActor};
  const images={},materials=new Map(),landmarks=new Map(),portraits=new Map();
  const keys=['materials','troops','trees','landmarks'];
  let loading=null;
  art.paintedReady=false;
  art.preloadPainted=()=>loading||(loading=Promise.all(keys.map(key=>new Promise(resolve=>{
    const image=new Image();image.decoding='async';let settled=false;
    const finish=ok=>{if(settled)return;settled=true;clearTimeout(timer);if(ok)images[key]=image;resolve(ok)};
    const timer=setTimeout(()=>finish(false),8000);
    image.onload=()=>finish(true);
    image.onerror=()=>finish(false);
    image.src='assets/painted/'+key+'.webp';
  }))).then(results=>{
    art.paintedReady=results.every(Boolean);
    if(!art.paintedReady)console.warn('Painted artwork unavailable; using procedural fallback.');
    return art.paintedReady;
  }));
  const canvas=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c};
  art.texture=(ctx,key)=>{
    if(!art.paintedReady||!/^(grass|forest|wood|meadow|cemetery|road|path|roof|roof-slate|stucco)$/.test(key))return fallback.texture(ctx,key);
    if(!materials.has(key)){
      const size=key.startsWith('roof')?112:key==='road'?96:key==='stucco'||key==='path'?192:320;
      const c=canvas(size,size),g=c.getContext('2d');g.imageSmoothingQuality='high';
      const quadrant=key.startsWith('roof')?1:key==='road'?2:key==='stucco'||key==='path'?3:0;
      const half=images.materials.width/2;
      const base={grass:'#7c9f3f',forest:'#416b3f',wood:'#588249',meadow:'#a2b84f',cemetery:'#879b59',path:'#bb9864'};
      if(base[key]){g.fillStyle=base[key];g.fillRect(0,0,size,size);g.globalAlpha=key==='forest'?.38:key==='wood'?.44:key==='path'?.35:.42;}
      g.drawImage(images.materials,quadrant%2*half,Math.floor(quadrant/2)*half,half,half,0,0,size,size);
      g.globalAlpha=1;
      if(key==='roof-slate'){g.globalCompositeOperation='color';g.fillStyle='#606f7c';g.fillRect(0,0,size,size);g.globalCompositeOperation='source-over';}
      materials.set(key,c);
    }
    return ctx.createPattern(materials.get(key),'repeat');
  };
  const landmarkIndex={castle:0,butter:1,post:2,rathaus:3,reissiger:4,briccius:5,marien:6};
  art.landmark=key=>{
    if(!art.paintedReady)return fallback.landmark(key);
    if(!landmarks.has(key)){
      const i=landmarkIndex[key]??4,c=canvas(320,240);
      c.getContext('2d').drawImage(images.landmarks,i%4*320,Math.floor(i/4)*240,320,240,0,0,320,240);landmarks.set(key,c);
    }
    return landmarks.get(key);
  };
  art.tree=(ctx,t)=>{
    if(!art.paintedReady)return fallback.tree(ctx,t);
    const i=((Math.round(t.x+t.y)%4)+4)%4,w=36+t.r*1.6,h=w*1.25;
    ctx.save();ctx.fillStyle='#254a3538';ctx.beginPath();ctx.ellipse(t.x+3,t.y+2,w*.32,w*.07,0,0,Math.PI*2);ctx.fill();
    ctx.drawImage(images.trees,i%2*128,Math.floor(i/2)*160,128,160,t.x-w/2,t.y-h+5,w,h);ctx.restore();
  };
  const row=team=>team==='enemy'?1:team==='civilian'?2:0;
  function drawTroop(ctx,team,dir,phase,state,clock,death,facing){
    const sx=((dir%8)+8)%8*128,sy=row(team)*160;
    const walking=state==='walk',step=walking?Math.sin(phase):0,bob=walking?Math.cos(phase*2)*.35:Math.sin(clock*2)*.12;
    const recoil=state==='fire'?.9:0;
    ctx.save();
    ctx.translate(-Math.cos(facing)*recoil,-Math.sin(facing)*recoil);
    if(state==='dead'){
      const t=Math.min(1,death/.24);ctx.translate(16-t*6,26);ctx.rotate(t*1.42);ctx.scale(1,1-t*.28);ctx.translate(-16,-26);
      ctx.drawImage(images.troops,sx,sy,128,160,-2,-16,36,44);
    }else{
      // Two independently articulated painted legs overlap beneath the jacket.
      // These source rectangles are cached artwork, not newly allocated canvases.
      const leg=side=>{
        ctx.save();const swing=step*side;
        ctx.translate(Math.cos(facing)*swing*.65,swing*1.6);
        ctx.drawImage(images.troops,sx+(side<0?0:64),sy+110,64,50,-2+(side<0?0:18),14.25,18,13.75);
        ctx.restore();
      };
      leg(step>0?-1:1);leg(step>0?1:-1);
      ctx.save();ctx.translate(0,bob);ctx.translate(16,15);ctx.rotate(walking?step*.018:0);ctx.translate(-16,-15);
      ctx.drawImage(images.troops,sx,sy,128,119,-2,-16,36,32.725);ctx.restore();
    }
    ctx.restore();
  }
  art.drawActor=(ctx,ent,team='squad')=>{
    if(!art.paintedReady)return fallback.drawActor(ctx,ent,team);
    const v=art.pose(ent),flinch=ent.hitTimer>0?Math.sin(Math.min(1,ent.hitTimer/.16)*Math.PI)*1.5:0;
    ctx.save();ctx.fillStyle='#243c343d';ctx.beginPath();ctx.ellipse(ent.x,ent.y+2,8,2.7,0,0,Math.PI*2);ctx.fill();
    ctx.translate(ent.x-16+flinch,ent.y-26);
    drawTroop(ctx,team,v.dir,v.phase||0,v.state,v.clock||0,v.death||0,v.facing??ent.dir??0);
    ctx.restore();
  };
  art.soldier=(team,dir,frame,state,variant=0)=>{
    if(!art.paintedReady)return fallback.soldier(team,dir,frame,state,variant);
    const key=[team,dir,state,variant].join('/');
    if(!portraits.has(key)){
      const c=canvas(96,96),g=c.getContext('2d'),sx=((dir%8)+8)%8*128,sy=row(team)*160;
      g.imageSmoothingQuality='high';
      g.drawImage(images.troops,sx+8,sy+1,112,118,0,0,96,101);
      if(state==='dead'){g.globalCompositeOperation='source-atop';g.fillStyle='#253a3470';g.fillRect(0,0,96,96);g.globalCompositeOperation='source-over';}
      portraits.set(key,c);
    }
    return portraits.get(key);
  };
})();
