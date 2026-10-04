/* Painted raster artwork with articulated, distance-driven motion.
   Procedural art remains available if an image cannot be loaded. */
(() => {
  'use strict';
  const art=window.BadFodderArt;
  const fallback={texture:art.texture,landmark:art.landmark,tree:art.tree,soldier:art.soldier,drawActor:art.drawActor};
  const images={},materials=new Map(),landmarks=new Map(),portraits=new Map();
  const costumes=[];
  const missionSheets={cable:[],wigan:[],belzig:[]};
  const enemySheets={wigan:[],belzig:[]};
  const civilianSheets={wigan:[],belzig:[]};

  function activeMissionKey(){
    try{
      const launch=JSON.parse((typeof BadFodderStorage!=='undefined'?BadFodderStorage.session:sessionStorage).getItem('badfodder.launch.v1')||'null');
      if(launch?.mode==='historical')return'cable';
      if(launch?.mode==='select')return launch.index===1?'wigan':'belzig';
    }catch(_){}
    try{
      const campaign=JSON.parse((typeof BadFodderStorage!=='undefined'?BadFodderStorage.local:localStorage).getItem('badfodder.campaign.v1')||'null');
      return Number(campaign?.current)===1?'wigan':'belzig';
    }catch(_){return'belzig'}
  }

  function tintedRow(rowIndex,color,alpha=.52){
    const c=document.createElement('canvas');c.width=1024;c.height=160;const g=c.getContext('2d');
    g.drawImage(images.troops,0,rowIndex*160,1024,160,0,0,1024,160);
    g.globalCompositeOperation='source-atop';g.globalAlpha=alpha;g.fillStyle=color;
    for(let d=0;d<8;d++)g.fillRect(d*128+24,48,82,79);
    g.globalAlpha=1;g.globalCompositeOperation='source-over';
    return c;
  }

  function prepareCostumes(){
    if(!images.troops)return;
    const colors=['#547d93','#ad8755','#816e9f','#9f7055','#61745d','#a59a7c','#4d596b','#996e79','#223a4e','#282b2e'];
    for(const color of colors){
      const c=document.createElement('canvas');c.width=1024;c.height=160;const g=c.getContext('2d');
      g.drawImage(images.troops,0,320,1024,160,0,0,1024,160);
      g.globalCompositeOperation='source-atop';g.globalAlpha=.55;g.fillStyle=color;
      for(let d=0;d<8;d++)g.fillRect(d*128+25,55,78,55);
      g.globalAlpha=1;g.globalCompositeOperation='source-over';costumes.push(c);
    }
    const cable=['#52627a','#72594b','#6b665d','#5f6e5d'];
    const wigan=['#727651','#7f7458','#666f52','#897e62'];
    const belzig=['#5b6258','#6b5b4d','#4e5551','#756b5d'];
    cable.forEach(color=>missionSheets.cable.push(tintedRow(2,color,.5)));
    wigan.forEach(color=>missionSheets.wigan.push(tintedRow(0,color,.46)));
    belzig.forEach((color,i)=>missionSheets.belzig.push(tintedRow(i%2===0?2:0,color,.5)));

    ['#56605a','#62665d','#4c5652','#697067'].forEach(color=>enemySheets.wigan.push(tintedRow(1,color,.5)));
    ['#474e49','#55574f','#5a5148','#444b47'].forEach(color=>enemySheets.belzig.push(tintedRow(1,color,.54)));
    ['#6f665b','#596570','#75624f','#616357'].forEach(color=>civilianSheets.wigan.push(tintedRow(2,color,.42)));
    ['#665d52','#5b6260','#746655','#595954'].forEach(color=>civilianSheets.belzig.push(tintedRow(2,color,.44)));
  }

  const keys=['materials','troops','trees','landmarks','portraits'];
  let loading=null;
  art.paintedReady=false;
  art.paintedAssets={};
  art.hasPainted=key=>!!images[key];
  art.preloadPainted=(theme)=>loading||(loading=Promise.all(((theme==='wigan'||theme==='cable-street')?[...keys,'urban']:keys).map(key=>new Promise(resolve=>{
    const image=new Image();image.decoding='async';let settled=false;
    const finish=ok=>{if(settled)return;settled=true;clearTimeout(timer);if(ok)images[key]=image;resolve(ok)};
    const timer=setTimeout(()=>finish(false),8000);
    image.onload=()=>finish(true);
    image.onerror=()=>finish(false);
    const src=key==='urban'?'assets/wigan/materials.webp':'assets/painted/'+key+'.webp';image.src=window.BadFodderAssetUrl?.(src)||src;
  }))).then(results=>{
    const requested=(theme==='wigan'||theme==='cable-street')?[...keys,'urban']:keys;
    requested.forEach((key,i)=>{art.paintedAssets[key]=!!results[i]});
    prepareCostumes();
    art.paintedReady=!!images.materials;
    const missing=requested.filter(key=>!images[key]);
    if(missing.length)console.warn('Some painted artwork is unavailable; falling back only for: '+missing.join(', ')+'.');
    return missing.length===0;
  }));
  const canvas=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c};
  art.texture=(ctx,key)=>{
    if(key.startsWith('urban-')){
      if(!images.urban)return fallback.texture(ctx,'road');
      if(!materials.has(key)){const i={'urban-brick':0,'urban-asphalt':1,'urban-paving':2,'urban-roof':3}[key]??2;
        const size=i===0?48:i===2?48:128,c=canvas(size,size),g=c.getContext('2d');g.imageSmoothingQuality='high';
        g.fillStyle=['#a0694d','#575952','#b6b09b','#53544f'][i];g.fillRect(0,0,size,size);g.globalAlpha=i===1?.24:i===2?.48:.8;
        const half=images.urban.width/2;g.drawImage(images.urban,i%2*half,Math.floor(i/2)*half,half,half,0,0,size,size);materials.set(key,c);}
      return ctx.createPattern(materials.get(key),'repeat');
    }
    if(!images.materials||!/^(grass|forest|wood|meadow|cemetery|road|path|roof|roof-slate|stucco)$/.test(key))return fallback.texture(ctx,key);
    if(!materials.has(key)){
      const size=key.startsWith('roof')?64:key==='road'?96:key==='stucco'?80:key==='path'?192:320;
      const c=canvas(size,size),g=c.getContext('2d');g.imageSmoothingQuality='high';
      const quadrant=key.startsWith('roof')?1:key==='road'?2:key==='stucco'||key==='path'?3:0;
      const half=images.materials.width/2;
      const base={grass:'#8a8955',forest:'#414c32',wood:'#586143',meadow:'#a39a62',cemetery:'#797951',path:'#a28d6c'};
      if(base[key]){g.fillStyle=base[key];g.fillRect(0,0,size,size);g.globalAlpha=key==='forest'?.48:key==='wood'?.55:key==='path'?.3:.72;}
      g.drawImage(images.materials,quadrant%2*half,Math.floor(quadrant/2)*half,half,half,0,0,size,size);
      g.globalAlpha=1;
      if(key==='roof-slate'){g.globalCompositeOperation='color';g.fillStyle='#68706b';g.fillRect(0,0,size,size);g.globalCompositeOperation='source-over';}
      materials.set(key,c);
    }
    return ctx.createPattern(materials.get(key),'repeat');
  };
  const landmarkIndex={castle:0,butter:1,post:2,rathaus:3,reissiger:4,briccius:5,marien:6};
  art.landmark=key=>{
    if(!images.landmarks)return fallback.landmark(key);
    if(!landmarks.has(key)){
      const i=landmarkIndex[key]??4,c=canvas(320,240);
      c.getContext('2d').drawImage(images.landmarks,i%4*320,Math.floor(i/4)*240,320,240,0,0,320,240);landmarks.set(key,c);
    }
    return landmarks.get(key);
  };
  art.tree=(ctx,t)=>{
    if(!images.trees)return fallback.tree(ctx,t);
    const i=((Math.round(t.x+t.y)%4)+4)%4,w=36+t.r*1.6,h=w*1.25;
    ctx.save();ctx.fillStyle='#254a353d';ctx.beginPath();ctx.ellipse(t.x+3,t.y+2,w*.32,w*.07,0,0,Math.PI*2);ctx.fill();
    ctx.drawImage(images.trees,i%2*128,Math.floor(i/2)*160,128,160,t.x-w/2,t.y-h+5,w,h);ctx.restore();
  };
  const row=team=>team==='enemy'?1:team==='civilian'?2:0;
  function drawTroop(ctx,team,dir,phase,state,clock,death,facing,sheet=images.troops,moving=false,throwProgress=0){
    const sx=((dir%8)+8)%8*128,sy=sheet===images.troops?row(team)*160:0;
    const walking=moving||state==='walk'||state==='run'||state==='stumble',running=state==='run',step=walking?Math.sin(phase)*(running?1.16:1):0,bob=walking?Math.cos(phase*2)*(running?.6:.35):Math.sin(clock*2)*.12;
    const recoil=state==='fire'?.9:0;
    const lean=state==='stumble'?.13:state==='hurt'?.07:0;
    ctx.save();
    ctx.translate(-Math.cos(facing)*recoil,-Math.sin(facing)*recoil);
    if(lean){ctx.translate(16,24);ctx.rotate(lean);ctx.translate(-16,-24)}
    if(state==='dead'){
      const t=Math.min(1,death/.24);ctx.translate(16-t*6,26);ctx.rotate(t*1.42);ctx.scale(1,1-t*.28);ctx.translate(-16,-26);
      ctx.drawImage(sheet,sx,sy,128,160,-2,-16,36,44);
    }else{
      const leg=side=>{
        ctx.save();const swing=step*side;
        ctx.translate(Math.cos(facing)*swing*.65,swing*1.6);
        ctx.drawImage(sheet,sx+(side<0?0:64),sy+110,64,50,-2+(side<0?0:18),14.25,18,13.75);
        ctx.restore();
      };
      leg(step>0?-1:1);leg(step>0?1:-1);
      ctx.save();ctx.translate(0,bob);ctx.translate(16,15);ctx.rotate(walking?step*(running?.026:.018):0);ctx.translate(-16,-15);
      ctx.drawImage(sheet,sx,sy,128,58,-2,-16,36,15.95);
      ctx.drawImage(sheet,sx+36,sy+58,56,61,8.125,-.05,15.75,16.775);
      for(const side of [-1,1]){
        ctx.save();ctx.translate(side<0?8:24,4);
        const swing=state==='throw'&&side>0?-.9*Math.sin(throwProgress*Math.PI):walking?side*step*.13:0;
        ctx.rotate(swing);ctx.translate(side<0?-8:-24,-4);
        ctx.drawImage(sheet,sx+(side<0?0:92),sy+58,36,61,side<0?-2:23.875,-.05,10.125,16.775);ctx.restore();
      }ctx.restore();
    }
    ctx.restore();
  }

  function missionSheet(team,variant){
    const mission=activeMissionKey();
    let set=null;
    if(team==='squad')set=missionSheets[mission];
    else if(team==='enemy')set=enemySheets[mission];
    else if(team==='civilian')set=civilianSheets[mission];
    return set&&set.length?set[Math.abs(variant||0)%set.length]:null;
  }

  function drawSteelHelmet(ctx,variant=0){
    ctx.save();ctx.fillStyle=variant%2?'#545b54':'#5b6259';
    ctx.beginPath();ctx.ellipse(16,-11,7.1,4.2,0,Math.PI,Math.PI*2);ctx.fill();
    ctx.fillRect(8.8,-11.2,14.4,2.2);ctx.restore();
  }

  art.drawActor=(ctx,ent,team='squad')=>{
    if(!images.troops)return fallback.drawActor(ctx,ent,team);
    const v=art.pose(ent),flinch=ent.hitTimer>0?Math.sin(Math.min(1,ent.hitTimer/.22)*Math.PI)*1.5:0;
    const mission=activeMissionKey();
    ctx.save();ctx.fillStyle='#243c343d';ctx.beginPath();ctx.ellipse(ent.x,ent.y+2,8,2.7,0,0,Math.PI*2);ctx.fill();
    ctx.translate(ent.x+flinch,ent.y);
    const variant=Math.abs(ent.variant||0)%8;
    const missionCivilian=team==='squad'&&(mission==='cable'||(mission==='belzig'&&variant%2===0));
    if(team==='civilian'||ent.periodRole||missionCivilian)ctx.scale(.92+(variant%3)*.05,.94+(variant%4)*.025);
    ctx.translate(-16,-26);
    const themed=missionSheet(team,variant);
    const sheet=themed||(costumes.length&&(team==='civilian'||ent.periodRole)?costumes[ent.periodRole==='police'?8:ent.periodRole==='march'?9:variant]:images.troops);
    drawTroop(ctx,team,v.dir,v.phase||0,v.state,v.clock||0,v.death||0,v.facing??ent.dir??0,sheet,v.moving,v.throwProgress);
    if(v.state!=='dead'){
      if(team==='civilian'||ent.periodRole||missionCivilian){
        ctx.fillStyle=ent.periodRole==='police'?'#203546':ent.periodRole==='march'?'#282b2e':mission==='cable'?'#4e5151':['#4c4c45','#735949','#514d54'][variant%3];
        if(ent.periodRole==='police'||variant%3===1){ctx.beginPath();ctx.ellipse(16,-10,5.8,2,0,0,Math.PI*2);ctx.fill();ctx.fillRect(12,-14,8,4)}
        else if(variant%3===2){ctx.fillRect(10,-10,12,2);ctx.fillRect(13,-15,6,5)}
      }
      if(team==='squad'&&mission==='wigan'){
        ctx.fillStyle='#686a50';ctx.beginPath();ctx.ellipse(16,-10.8,7.2,3.2,0,Math.PI,Math.PI*2);ctx.fill();ctx.fillRect(9.4,-11.3,13.2,2.1);
      }else if(team==='squad'&&mission==='belzig'&&!missionCivilian&&variant%3!==0){
        ctx.fillStyle='#55584d';ctx.beginPath();ctx.ellipse(16,-10.5,6.4,2.5,0,0,Math.PI*2);ctx.fill();
      }else if(team==='enemy'&&(mission==='wigan'||mission==='belzig')){
        if(mission==='wigan'||variant%3!==0)drawSteelHelmet(ctx,variant);
        else{ctx.fillStyle='#4a4c46';ctx.fillRect(10,-12,12,3);ctx.fillRect(13,-15,7,4)}
      }else if(team==='civilian'&&(mission==='wigan'||mission==='belzig')){
        if(variant%3===0){ctx.fillStyle='#4b4b45';ctx.beginPath();ctx.ellipse(16,-10,6.5,1.8,0,0,Math.PI*2);ctx.fill();ctx.fillRect(12,-14,8,4)}
      }
    }
    ctx.restore();
  };

  function decoratePortrait(g,mission,variant){
    if(mission==='wigan'){
      g.fillStyle='#6d6e50';g.beginPath();g.ellipse(48,23,27,11,0,Math.PI,Math.PI*2);g.fill();g.fillRect(22,22,52,7);
      g.fillStyle='#777659';g.fillRect(12,70,72,26);
    }else if(mission==='belzig'){
      g.fillStyle=['#5e6258','#6d5d50','#4f5652','#776c5e'][variant%4];g.fillRect(10,69,76,27);
      if(variant%2){g.fillStyle='#55584d';g.beginPath();g.ellipse(48,24,22,7,0,0,Math.PI*2);g.fill();}
    }else if(mission==='cable'){
      g.fillStyle=['#52627a','#72594b','#6b665d','#5f6e5d'][variant%4];g.fillRect(9,68,78,28);
      if(variant!==1){g.fillStyle='#41474b';g.beginPath();g.ellipse(48,23,23,6,0,0,Math.PI*2);g.fill();g.fillRect(30,17,35,7);}
    }
  }

  art.soldier=(team,dir,frame,state,variant=0)=>{
    if(!images.troops)return fallback.soldier(team,dir,frame,state,variant);
    const mission=activeMissionKey();
    const key=[mission,team,dir,state,variant].join('/');
    if(!portraits.has(key)){
      const c=canvas(96,96),g=c.getContext('2d'),sx=((dir%8)+8)%8*128,sy=row(team)*160;
      g.imageSmoothingQuality='high';
      if(team==='squad'&&images.portraits){
        g.drawImage(images.portraits,((variant%4)+4)%4*128,0,128,128,0,0,96,96);
        decoratePortrait(g,mission,Math.abs(variant)%4);
      }else g.drawImage(images.troops,sx+29,sy+25,70,92,0,0,96,96);
      if(state==='dead'){g.globalCompositeOperation='source-atop';g.fillStyle='#253a3470';g.fillRect(0,0,96,96);g.globalCompositeOperation='source-over';}
      portraits.set(key,c);
    }
    return portraits.get(key);
  };
})();
