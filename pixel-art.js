/* Original canvas illustration. Map geometry and gameplay stay in town-map.js/index.html. */
window.BadFodderArt = (() => {
  'use strict';
  const P={ink:'#293b35',grass:'#91a972',light:'#c0ce92',shade:'#627a52',stone:'#b6ab8d',stoneLight:'#e3d8b7',stoneDark:'#807c69',roof:'#b57558',roofLight:'#dca583',roofDark:'#795446',wall:'#dfd3ab',wallLight:'#f5e7c4',water:'#6f9fa9'};
  const make=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;};
  const tiles=new Map(),landmarks=new Map(),soldiers=new Map(),trees=new Map();
  const motion=new WeakMap();
  const TAU=Math.PI*2;
  function ellipse(g,x,y,rx,ry,color){g.fillStyle=color;g.beginPath();g.ellipse(x,y,rx,ry,0,0,TAU);g.fill();}
  function rounded(g,x,y,w,h,r,color,stroke,width=1){g.beginPath();g.roundRect(x,y,w,h,r);g.fillStyle=color;g.fill();if(stroke){g.strokeStyle=stroke;g.lineWidth=width;g.stroke();}}
  function line(g,x1,y1,x2,y2,color,width=1){g.strokeStyle=color;g.lineWidth=width;g.lineCap='round';g.beginPath();g.moveTo(x1,y1);g.lineTo(x2,y2);g.stroke();}
  function poly(g,points,color,stroke,width=1){g.beginPath();points.forEach((p,i)=>i?g.lineTo(...p):g.moveTo(...p));g.closePath();if(color){g.fillStyle=color;g.fill();}if(stroke){g.strokeStyle=stroke;g.lineWidth=width;g.lineJoin='round';g.stroke();}}
  function texture(ctx,key){
    if(!tiles.has(key)){
      const c=make(256,256),g=c.getContext('2d');
      const colors={grass:['#91a972','#a4b884','#7f9966'],forest:['#698860','#7e9b6d','#5f7d58'],wood:['#79956a','#8ba777','#6c8860'],meadow:['#a7b580','#b5c18f','#98a772'],cemetery:['#99ab86','#abb997','#889b77'],water:['#6f9fa9','#93bac0','#60909c'],road:['#c3bca5','#d8d0b7','#aaa590'],path:['#c3ae83','#d8c39a','#b3a077']};
      const col=colors[key]||colors.grass;g.fillStyle=col[0];g.fillRect(0,0,256,256);
      let seed=1937;const rnd=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
      if(!/road|path|water/.test(key)){
        // Periodic patches and tufts avoid seams without animated noise or dithering.
        g.globalAlpha=.25;
        for(let i=0;i<20;i++){
          const x=rnd()*256,y=rnd()*256,rx=14+rnd()*24,ry=5+rnd()*12;
          for(const ox of [-256,0,256])for(const oy of [-256,0,256])ellipse(g,x+ox,y+oy,rx,ry,col[1+i%2]);
        }
        g.globalAlpha=.25;
        for(let i=0;i<65;i++){const x=8+rnd()*240,y=8+rnd()*240;line(g,x-2,y,x,y-3,col[2],.8);line(g,x,y,x+2,y-2,col[2],.8);}
      }else if(key==='road'){
        // Quiet, broad paving joints replace the high-frequency checkerboard.
        g.globalAlpha=.28;
        for(let y=0;y<256;y+=16)for(let x=(y%32?-16:0);x<256;x+=32){rounded(g,x+1,y+1,30,14,3,col[1],col[2],.6);}
      }else if(key==='water'){
        g.globalAlpha=.4;
        for(let i=0;i<28;i++){const x=20+rnd()*200,y=8+rnd()*240;line(g,x,y,x+12+rnd()*12,y,col[1],1.5);}
      }else{
        g.globalAlpha=.2;
        for(let i=0;i<70;i++)ellipse(g,rnd()*256,rnd()*256,1.5,.8,col[i%2+1]);
      }
      g.globalAlpha=1;tiles.set(key,c);
    }
    return ctx.createPattern(tiles.get(key),'repeat');
  }
  function landmark(key){
    if(landmarks.has(key))return landmarks.get(key);
    // Twice the logical resolution keeps curved silhouettes clean at native zoom.
    const c=make(320,240),g=c.getContext('2d');g.scale(2,2);
    const box=(x,y,w,h,color,stroke=P.stoneDark)=>rounded(g,x,y,w,h,1.2,color,stroke,.8);
    const window=(x,y,w=6,h=10)=>{
      rounded(g,x-1,y-1,w+2,h+3,1.5,P.wallLight);
      rounded(g,x,y,w,h,[w/2,w/2,.4,.4],'#405e64',P.stoneDark,.65);
      line(g,x+1,y+2,x+w-2,y+2,'#a3c2c1',1.2);
      line(g,x+w/2,y+1,x+w/2,y+h,'#d3d6bc',.65);line(g,x,y+h*.55,x+w,y+h*.55,'#d3d6bc',.65);
      line(g,x-1,y+h+2,x+w+1,y+h+2,P.stoneDark,.8);
    };
    const windows=(x,y,n,rows=1)=>{for(let j=0;j<rows;j++)for(let i=0;i<n;i++)window(x+i*15,y+j*15,5,8);};
    const roof=points=>{
      poly(g,points,P.roof,P.roofDark,1.4);
      g.save();poly(g,points);g.clip();
      const light=g.createLinearGradient(0,25,0,85);light.addColorStop(0,P.roofLight);light.addColorStop(1,P.roof);g.fillStyle=light;g.fillRect(0,0,160,120);
      g.globalAlpha=.28;for(let y=0;y<120;y+=6)line(g,0,y,160,y,P.roofDark,.7);g.globalAlpha=1;g.restore();
      line(g,...points[0],...points[1],P.roofLight,1.3);
    };
    const masonry=(x,y,w,h)=>{
      const shade=g.createLinearGradient(x,y,x+w,y);shade.addColorStop(0,P.stoneLight);shade.addColorStop(.6,P.stone);shade.addColorStop(1,P.stoneDark);
      box(x,y,w,h,shade);
      g.save();g.globalAlpha=.28;
      for(let yy=y+6;yy<y+h-2;yy+=7){line(g,x+1,yy,x+w-1,yy,P.stoneDark,.7);for(let xx=x+4+(Math.round((yy-y)/7)%2)*6;xx<x+w-2;xx+=12)line(g,xx,yy-5,xx,yy,P.stoneDark,.7);}
      g.restore();
    };
    const door=(x,y,w=9,h=15)=>{
      rounded(g,x-2,y-2,w+4,h+2,[w/2,w/2,0,0],P.stoneLight,P.stoneDark,.7);
      rounded(g,x,y,w,h,[w/2,w/2,0,0],'#65584a');line(g,x+w/2,y+3,x+w/2,y+h,'#887660',.7);ellipse(g,x+w-2,y+h*.65,.7,.7,'#e9cd81');
    };
    const house=(x,y,w,h)=>{
      box(x,y,w,h,P.wall);box(x+w-7,y,7,h,'#b5ab8d');
      line(g,x+1,y+h-2,x+w,y+h-2,P.stoneDark,2);
      roof([[x-4,y],[x+10,y-19],[x+w-11,y-19],[x+w+4,y]]);
      box(x+w*.68,y-24,5,10,P.stone);box(x+w*.68-1,y-24,7,2,P.stoneLight);
      windows(x+7,y+8,Math.max(1,Math.floor((w-16)/15)),Math.max(1,Math.floor((h-12)/15)));
      door(x+w/2-4,y+h-14,8,14);
    };
    ellipse(g,81,110,64,5,'#4b60482b');
    if(key==='castle'){
      masonry(20,65,123,43);masonry(15,54,25,53);masonry(126,54,21,53);
      for(let x=15;x<147;x+=13)box(x,49,8,10,P.stoneLight);
      house(43,65,75,40);roof([[40,64],[60,38],[108,38],[121,64]]);windows(52,72,4);door(74,89,14,21);
      for(const x of [23,133])window(x,73,5,13);
    }else if(key==='butter'){
      masonry(59,30,42,77);box(56,29,48,5,P.stoneLight);for(let x=57;x<105;x+=10)box(x,20,7,10,P.stoneLight);
      windows(73,43,1,3);door(76,96,8,14);box(56,107,49,4,P.stone);line(g,64,35,64,101,'#f4e8cb',1.8);
    }else if(key==='post'){
      box(65,106,32,5,P.stoneDark);box(69,100,24,6,P.stoneLight);box(73,73,16,27,P.wall);
      poly(g,[[76,72],[77,30],[81,10],[85,30],[87,72]],P.wallLight,P.stoneDark,1);
      poly(g,[[81,10],[85,30],[87,72],[82,72]],P.stone);
      box(71,69,21,4,P.stoneLight);box(77,80,8,6,'#456b86');line(g,76,91,86,91,P.stoneDark,.8);
    }else if(key==='marien'||key==='briccius'){
      const y=key==='briccius'?48:34;house(47,77,84,30);masonry(28,y,32,107-y);
      roof([[24,y],[44,y-27],[64,y]]);windows(38,y+13,1,2);door(39,94,9,15);
      for(let x=72;x<125;x+=18)window(x,83,6,15);
      ellipse(g,44,y+10,3.5,3.5,'#f1e8c7');line(g,44,y+10,44,y+7,P.ink,.8);line(g,44,y+10,46,y+11,P.ink,.8);
    }else if(key==='rathaus'){
      house(22,65,118,43);poly(g,[[66,65],[81,44],[97,65]],P.wallLight,P.stoneDark,1);window(78,54,6,9);
      masonry(73,25,17,20);roof([[69,25],[82,12],[94,25]]);line(g,82,7,82,12,P.ink,1);
      ellipse(g,81.5,34,5,5,P.wallLight);line(g,81.5,34,81.5,31,P.ink,.9);line(g,81.5,34,84,34,P.ink,.9);
      line(g,24,87,133,87,P.stoneDark,1.4);window(31,93,10,13);window(114,93,10,13);
    }else{
      house(35,70,92,37);line(g,39,83,122,83,P.roofDark,1.5);
      for(const x of [52,105])line(g,x,73,x,106,P.roofDark,1.5);
      line(g,52,83,67,106,P.roofDark,1.4);line(g,105,83,90,106,P.roofDark,1.4);
    }
    landmarks.set(key,c);return c;
  }
  function figure(g,team,angle,phase,state,variant=0,clock=0,death=0){
    const civilian=team==='civilian',enemy=team==='enemy',dx=Math.cos(angle),dy=Math.sin(angle),back=dy<-.35;
    const coat=civilian?['#6389a5','#bf985c','#9385ab','#c69a76'][variant%4]:enemy?'#ba8963':'#82985a';
    const dark=enemy?'#775641':civilian?'#53676d':'#4d6445',light=enemy?'#dfb18a':'#b4c78b',ink=P.ink;
    const walking=state==='walk',stride=walking?Math.sin(phase):0;
    const bob=walking?Math.cos(phase*2)*.45:Math.sin(clock*2)*.15;
    const skin=['#e9c69a','#d7aa80','#bb8b63','#efd2a7'][variant%4];
    // Rounded ground contact and independently swinging boots, rather than a bouncing box.
    ellipse(g,16,27.8,8.3,2.1,'#263e3533');
    g.save();
    if(state==='dead'){
      const progress=Math.min(1,death/.24);g.translate(16-progress*3,25);g.rotate(progress*1.38);g.scale(1,1-progress*.23);g.translate(-16,-25);
    }
    const leg=(side)=>{
      const swing=stride*side,footX=16+side*3.3+dx*swing*1.3,footY=25+dy*swing*2.1+swing*1.1;
      line(g,16+side*2.5,20,footX,footY-1,ink,4.4);line(g,16+side*2.5,20,footX,footY-1,dark,3.1);
      rounded(g,footX-2,footY-1,4.4,2.8,1.2,'#35443a',ink,.55);line(g,footX-1,footY,footX+1,footY,'#78806a',.6);
    };
    leg(stride>0?-1:1);leg(stride>0?1:-1);
    const recoil=state==='fire'?phase*.7:0;
    g.translate(-dx*recoil,bob-dy*recoil);
    // A compact pear-shaped jacket gives each character a clean, readable outline.
    rounded(g,10.6,13,10.8,9.4,[3,3,2,2],coat,ink,.9);
    ellipse(g,13.3,16,1.8,3.1,light);rounded(g,18.7,15,2,6,1,dark);
    if(back){rounded(g,12.1,14.2,7.1,6.7,1.5,dark,ink,.6);rounded(g,13,14.8,5.2,4.1,1,coat);line(g,13.5,16,17.5,16,light,.7);}
    else if(!civilian){line(g,13,14,13,20,dark,1.2);line(g,19,14,19,20,dark,1.2);rounded(g,12.6,18,6.6,2.2,.7,dark);}
    rounded(g,11,21,10,1.7,.4,dark);rounded(g,15,21,2.2,1.2,.3,'#dac78f');
    if(civilian){
      for(const side of [-1,1]){const x=16+side*6,handY=20+side*stride*1.8;line(g,x-side,15,x,handY,ink,3.5);line(g,x-side,15,x,handY,coat,2.6);ellipse(g,x,handY,1.4,1.7,skin);}
    }else{
      line(g,11,15,10,19,coat,3.1);line(g,21,15,20,19,dark,2.6);
      const gx=16+dx*2,gy=18+dy*2;
      line(g,13,17,gx,gy,skin,2.4);line(g,gx-dx*3,gy-dy*3,gx+dx*7,gy+dy*7,ink,2.4);
      line(g,gx,gy-.35,gx+dx*5,gy+dy*5-.35,'#98a198',.7);ellipse(g,gx+dx,gy+dy,1.4,1.2,skin);
      if(state==='fire'&&phase<.5){const mx=gx+dx*8,my=gy+dy*8;poly(g,[[mx+dx*4,my+dy*4],[mx-dy*2,my+dx*2],[mx-dx,my-dy],[mx+dy*2,my-dx*2]],'#f8c36b');ellipse(g,mx,my,1.5,1.5,'#fff3c5');}
    }
    const hx=dx*1.1;
    ellipse(g,16+hx,10.5,3.6,4,back?dark:skin);ellipse(g,12.7+hx,11,1,1.5,skin);
    if(!civilian){
      ellipse(g,16+hx,7.9,5.2,4,enemy?dark:coat);ellipse(g,15+hx,6.8,3.6,2.1,enemy?coat:light);
      rounded(g,10.5+hx,9,11,1.6,.8,dark,ink,.65);
      // Squad helmets have a pale band and blue patch; enemies wear a tan cap.
      if(!enemy){line(g,13+hx,6.1,19+hx,6.1,'#e4e3bd',1);rounded(g,12+hx,7,1.7,1.6,.4,'#6da5b7');}
      else rounded(g,18+hx,6.8,2,1.5,.5,'#f1d5a4');
    }else{ellipse(g,16+hx,7.6,4,3.4,'#665246');ellipse(g,14.5+hx,6.7,2.4,1.5,'#927359');}
    if(!back){ellipse(g,16+dx*2.5,11.3,.55,.65,ink);ellipse(g,16+dx*3.3,12.3,.9,.6,skin);line(g,15+hx,14,17+hx,14,'#b18764',.6);}
    g.restore();
  }
  // Cached high-resolution portrait artwork; live actors use continuous vector poses.
  function soldier(team,dir,frame,state,variant=0){
    const key=[team,dir,frame,state,variant].join('/');if(soldiers.has(key))return soldiers.get(key);
    const c=make(96,96),g=c.getContext('2d');g.scale(3,3);
    figure(g,team,dir*Math.PI/4,state==='fire'?frame:frame/8*TAU,state,variant,0,state==='dead'?frame*.12:0);
    soldiers.set(key,c);return c;
  }
  function drawActor(ctx,ent,team='squad'){
    const m=motion.get(ent),v=pose(ent),flinch=ent.hitTimer>0?Math.sin(Math.min(1,ent.hitTimer/.16)*Math.PI)*1.5:0;
    ctx.save();ctx.translate(ent.x-16+flinch,ent.y-26);
    figure(ctx,team,m?m.facing:ent.dir||0,v.state==='fire'?v.frame:(m?m.stride/48*TAU:0),v.state,ent.variant||0,m?m.clock:0,m?m.death:0);
    ctx.restore();
  }
  function tree(ctx,t){
    const variant=(Math.round(t.x+t.y)%5+5)%5,key=variant+'/'+t.dark;
    if(!trees.has(key)){
      const c=make(96,112),g=c.getContext('2d');g.scale(2,2);
      const dark=t.dark?'#426d51':'#557750',mid=t.dark?'#688b5e':'#86a565',light=t.dark?'#94ac76':'#b3c687';
      ellipse(g,26,50,17,3.5,'#36533b30');
      line(g,24,49,24,31,'#6c5c45',4);line(g,23,46,23,32,'#b09b6d',1);line(g,24,39,18,31,'#6c5c45',2);
      const lobes=[[14,22,10,11],[27,16,12,13],[35,28,9,10],[21,32,14,13]];
      for(const [x,y,rx,ry] of lobes){ellipse(g,x,y,rx,ry,dark);ellipse(g,x-.8,y-2,rx-1,ry-1,mid);}
      ellipse(g,20,17,9,8,light);ellipse(g,30,23,5,5,light);ellipse(g,13,27,5,5,light);
      line(g,17,15,21,13,'#d0dbac',1.3);line(g,10,26,12,24,light,1.4);
      trees.set(key,c);
    }
    const w=36+t.r*1.6,h=w*56/48;ctx.drawImage(trees.get(key),t.x-w/2,t.y-h+4,w,h);
  }
  // Animation belongs to presentation: it never changes movement, aim or collisions.
  function animate(ent,dt){
    let m=motion.get(ent);
    if(!m){m={x:ent.x,y:ent.y,stride:0,death:0,dust:[],clock:0,facing:ent.dir||0,dir:Math.round((ent.dir||0)/(Math.PI/4))};motion.set(ent,m);}
    m.clock+=dt;
    const turn=Math.atan2(Math.sin((ent.dir||0)-m.facing),Math.cos((ent.dir||0)-m.facing));
    m.facing+=turn*(1-Math.exp(-dt*16));
    const distance=Math.hypot(ent.x-m.x,ent.y-m.y);m.x=ent.x;m.y=ent.y;
    m.dust=m.dust.map(p=>({...p,life:p.life-dt})).filter(p=>p.life>0);
    const previousStep=Math.floor(m.stride/6)%8;
    if(ent.alive===false){m.death+=dt;m.state='dead';m.frame=Math.min(2,Math.floor(m.death*12));return;}
    const angle=ent.dir||0,diff=Math.atan2(Math.sin(angle-m.dir*Math.PI/4),Math.cos(angle-m.dir*Math.PI/4));
    if(Math.abs(diff)>Math.PI/8+.06)m.dir=Math.round(angle/(Math.PI/4));
    if(distance>.03&&distance<100){
      m.stride+=distance;
      const step=Math.floor(m.stride/6)%8;
      if(step!==previousStep&&(step===2||step===6)){
        m.dust.push({x:ent.x+(step===2?-3:3),y:ent.y+3,life:.22});
        if(m.dust.length>4)m.dust.shift();
      }
    }
    if(ent.fireTimer>0){m.state='fire';m.frame=ent.fireTimer>.065?0:1;}
    else if(distance>.03){m.state='walk';m.frame=Math.floor(m.stride/6)%8;}
    else {m.state='idle';m.frame=0;}
  }
  function pose(ent){
    const m=motion.get(ent);return m?{dir:((m.dir%8)+8)%8,state:m.state||'idle',frame:m.frame||0,dust:m.dust,facing:m.facing,phase:m.stride/48*TAU,clock:m.clock,death:m.death}:{dir:0,state:'idle',frame:0,dust:[]};
  }
  function blast(ctx,x,y,age){
    const t=Math.max(0,Math.min(1,age));
    ctx.save();ctx.translate(x,y);
    // Continuous shockwave and rising smoke replace six abrupt square frames.
    ctx.globalAlpha=(1-t)*.6;
    ctx.strokeStyle='#ead6a1';ctx.lineWidth=3*(1-t)+.5;
    ctx.beginPath();ctx.ellipse(0,4,8+t*65,4+t*32,0,0,TAU);ctx.stroke();
    for(let i=0;i<9;i++){
      const a=i*2.399,d=5+t*(22+i%3*9),size=5+Math.sin(t*Math.PI)*11;
      ctx.globalAlpha=(1-t)*.65;
      ellipse(ctx,Math.cos(a)*d,Math.sin(a)*d*.6-t*28,size,size*.9,['#7e8473','#a5a691','#c6bea0'][i%3]);
    }
    if(t<.55){
      ctx.globalAlpha=1-t/.55;
      const radius=8+Math.sin(t/.55*Math.PI)*24;
      const glow=ctx.createRadialGradient(0,-3,0,0,-3,radius);glow.addColorStop(0,'#fff8df');glow.addColorStop(.3,'#ffdf8c');glow.addColorStop(.65,'#efa55d');glow.addColorStop(1,'#d37b4200');
      ellipse(ctx,0,-3,radius,radius,glow);
      for(let i=0;i<6;i++){const a=i*2.399,d=t*40;line(ctx,Math.cos(a)*d,Math.sin(a)*d,Math.cos(a)*(d+5),Math.sin(a)*(d+5),'#ffe6ab',1.7);}
    }
    ctx.restore();
  }
  function pickup(ctx,p){
    const x=p.x,y=p.y,isGrenade=p.type==='grenade';
    ctx.save();ellipse(ctx,x+1,y+11,15,3,'#30463333');
    rounded(ctx,x-13,y-12,26,23,3,isGrenade?'#8f956c':'#dedbc2',P.ink,1.2);
    rounded(ctx,x-12,y-11,24,5,2,isGrenade?'#b8bd8c':'#f3eedb');
    line(ctx,x-11,y+8,x+11,y+8,'#8a8c76',1.1);
    if(isGrenade){
      line(ctx,x-8,y-10,x-8,y+9,'#667052',2);line(ctx,x+8,y-10,x+8,y+9,'#667052',2);
      for(let i=-1;i<=1;i++){
        const gx=x+i*6,gy=y+1;
        ellipse(ctx,gx,gy,3.2,4.2,'#46523d',P.ink,.7);
        line(ctx,gx-1,gy-5,gx+2,gy-7,'#d9cf9d',1);
      }
    }else{
      rounded(ctx,x-3,y-7,6,14,1,'#548ca6');rounded(ctx,x-7,y-3,14,6,1,'#548ca6');
    }
    ctx.restore();
  }
  return {P,texture,landmark,soldier,drawActor,tree,pickup,animate,pose,blast};
})();
