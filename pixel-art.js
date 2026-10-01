/* Original, code-drawn pixel art. World geometry belongs to town-map.js. */
window.BadFodderArt = (() => {
  'use strict';
  const P={ink:'#242b20',grass:'#749342',light:'#a1b65c',shade:'#526d34',stone:'#a49b74',stoneLight:'#c9c096',stoneDark:'#716950',roof:'#985535',roofLight:'#bd7950',roofDark:'#633f2d',wall:'#c3b383',wallLight:'#ddd0a1',water:'#547c91'};
  const make=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;};
  const tiles=new Map(),landmarks=new Map(),soldiers=new Map();
  function texture(ctx,key){
    if(!tiles.has(key)){
      const c=make(128,128),g=c.getContext('2d');
      const colors={grass:['#7b934b','#899f55','#6d8541'],forest:['#59753b','#698543','#4f6834'],wood:['#658042','#768e4a','#587339'],meadow:['#97a05a','#a6ad64','#89954f'],cemetery:['#899266','#9aa275','#7a855c'],water:['#507b92','#739aa6','#41677f'],road:['#aaa17e','#c0b68e','#918b6f'],path:['#b7a36c','#c6b47b','#a28f5e']};
      const col=colors[key]||colors.grass;g.fillStyle=col[0];g.fillRect(0,0,128,128);
      let seed=1937;const rnd=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
      // Broad, low-contrast patches instead of evenly distributed speckle.
      if(!/road|path|water/.test(key))for(let i=0;i<26;i++){
        const x=Math.floor(rnd()*64)*2,y=Math.floor(rnd()*64)*2,w=8+Math.floor(rnd()*12)*2,h=4+Math.floor(rnd()*6)*2;
        g.fillStyle=col[i%2+1];g.fillRect(x+4,y,w-8,h);g.fillRect(x,y+2,w,h-4);
      }
      for(let i=0;i<150;i++){
        const x=Math.floor(rnd()*64)*2,y=Math.floor(rnd()*64)*2;g.fillStyle=col[i%2+1];
        g.fillRect(x,y,key==='water'?6:2,2);
        if(!/road|path|water/.test(key)&&i%6===0){g.fillRect(x+2,y-2,2,2);g.fillRect(x+4,y,2,2);}
      }
      if(key==='road'){
        g.fillStyle=col[2];for(let y=0;y<128;y+=8)for(let x=(y%16?4:0);x<128;x+=12){g.fillRect(x,y,8,2);g.fillRect(x,y,2,6);}
        g.fillStyle=col[1];for(let i=0;i<60;i++){const x=Math.floor(rnd()*10)*12,y=Math.floor(rnd()*16)*8;g.fillRect(x+2+(y%16?4:0),y+2,6,2);}
      }
      if(key==='water'){
        g.fillStyle=col[1];for(let i=0;i<20;i++){const x=Math.floor(rnd()*60)*2,y=Math.floor(rnd()*60)*2;g.fillRect(x,y,12,2);g.fillRect(x+4,y+2,12,2);}
      }
      tiles.set(key,c);
    }
    return ctx.createPattern(tiles.get(key),'repeat');
  }
  function landmark(key){
    if(landmarks.has(key))return landmarks.get(key);
    const c=make(160,120),g=c.getContext('2d');
    const rect=(x,y,w,h,col)=>{g.fillStyle=col;g.fillRect(x,y,w,h);};
    const poly=(pts,col)=>{g.fillStyle=col;g.beginPath();pts.forEach((p,i)=>i?g.lineTo(...p):g.moveTo(...p));g.closePath();g.fill();};
    const masonry=(x,y,w,h)=>{rect(x,y,w,h,P.stone);rect(x+w-5,y,5,h,P.stoneDark);rect(x+1,y,2,h,P.stoneLight);for(let yy=y+4;yy<y+h;yy+=6)for(let xx=x+(yy%12?0:5);xx<x+w-5;xx+=11){rect(xx,yy,8,1,P.stoneLight);}};
    const windows=(x,y,n,rows=1)=>{for(let j=0;j<rows;j++)for(let i=0;i<n;i++){rect(x+i*13,y+j*12,5,7,P.ink);rect(x+i*13+1,y+j*12+1,2,3,'#829c9a');rect(x+i*13,y+j*12+7,6,1,P.wallLight);}};
    const house=(x,y,w,h)=>{
      rect(x+4,y+h,w,4,P.shade);rect(x,y,w,h,P.wall);rect(x+w-6,y,6,h,P.stoneDark);rect(x+2,y+2,w-10,2,P.wallLight);
      poly([[x-4,y],[x+9,y-18],[x+w-10,y-18],[x+w+4,y]],P.roofDark);
      poly([[x-2,y-2],[x+10,y-18],[x+w-11,y-18],[x+w-2,y-2]],P.roof);
      for(let yy=y-15;yy<y-2;yy+=4)rect(x+12,yy,w-24,1,P.roofLight);
      rect(x+w*.65,y-24,5,10,P.stoneDark);rect(x+w*.65-1,y-24,7,2,P.wallLight);
      windows(x+7,y+8,Math.max(1,Math.floor((w-12)/13)),Math.max(1,Math.floor((h-12)/12)));
      rect(x+w/2-4,y+h-13,8,13,P.ink);rect(x+w/2-2,y+h-12,4,12,'#594d33');
    };
    rect(18,110,126,4,'#526d34');
    if(key==='castle'){
      masonry(22,69,119,37);masonry(16,56,25,50);masonry(125,56,21,50);
      for(let x=16;x<146;x+=13)rect(x,51,7,10,P.stoneLight);
      house(44,65,73,34);rect(74,88,15,22,P.ink);rect(78,89,8,21,P.stoneDark);
      poly([[41,64],[60,40],[108,40],[120,64]],P.roofDark);poly([[45,61],[62,40],[106,40],[113,61]],P.roof);windows(53,72,4);
    }else if(key==='butter'){
      masonry(59,30,42,77);rect(56,29,48,5,P.stoneDark);for(let x=57;x<105;x+=10)rect(x,20,7,10,P.stoneLight);
      windows(72,42,1,3);rect(75,96,9,14,P.ink);rect(56,108,49,4,P.stoneDark);rect(60,35,4,68,P.stoneLight);rect(95,35,5,72,P.stoneDark);rect(72,32,15,2,P.stoneLight);
    }else if(key==='post'){
      rect(66,105,30,5,P.stoneDark);rect(69,99,24,6,P.stoneLight);rect(73,71,16,28,P.wall);rect(77,30,8,41,P.wallLight);
      poly([[76,30],[80,9],[85,30]],P.wallLight);rect(71,69,21,4,P.stoneDark);rect(77,77,8,5,'#596479');rect(76,90,9,1,P.stoneDark);
    }else if(key==='marien'||key==='briccius'){
      const small=key==='briccius';house(46,77,85,30);masonry(28,small?47:34,32,74-(small?13:0));
      poly([[24,small?47:34],[44,small?22:7],[64,small?47:34]],P.roofDark);poly([[26,small?45:32],[44,small?22:7],[54,small?45:32]],P.roof);
      windows(38,small?58:45,1,2);rect(39,95,9,14,P.ink);for(let x=73;x<126;x+=18){rect(x,83,6,14,P.ink);rect(x+1,84,2,7,'#8ca5a2');}
    }else if(key==='rathaus'){
      house(22,64,118,44);poly([[69,65],[81,44],[94,65]],P.wallLight);windows(77,58,1);masonry(73,25,17,20);
      poly([[69,25],[82,12],[94,25]],P.roofDark);rect(79,30,5,5,P.ink);rect(80,31,3,3,P.wallLight);rect(80,7,2,8,P.ink);rect(77,29,9,9,P.stoneDark);rect(78,30,7,7,P.wallLight);rect(81,31,1,3,P.ink);rect(81,33,3,1,P.ink);
      rect(23,87,111,2,P.stoneDark);rect(31,91,10,15,'#617f88');rect(113,91,10,15,'#617f88');
    }else {house(36,70,91,37);rect(44,82,71,2,P.stoneDark);rect(53,71,3,35,P.stoneDark);rect(105,71,3,35,P.stoneDark);}
    landmarks.set(key,c);return c;
  }
  // Original 32px sprites: eight facings, four walk poses and two firing poses.
  function soldier(team,dir,frame,state,variant=0){
    dir=((dir%8)+8)%8;frame=frame%4;
    const key=[team,dir,frame,state,variant].join('/');if(soldiers.has(key))return soldiers.get(key);
    const c=make(32,32),g=c.getContext('2d');
    const civilian=team==='civilian',enemy=team==='enemy';
    const col=civilian?['#6d97b4','#b6a16e','#9783a9','#d0ad72'][variant%4]:enemy?'#b79b69':'#899e51';
    const light=enemy?'#d0b47d':'#b0c074',dark=enemy?'#76613d':'#516632',skin='#e4c58b',skinShade='#ae885d',boot='#303528';
    const r=(x,y,w,h,color)=>{g.fillStyle=color;g.fillRect(Math.round(x),Math.round(y),w,h);};
    const dx=[1,1,0,-1,-1,-1,0,1][dir],dy=[0,1,1,1,0,-1,-1,-1][dir],back=dy<0,side=dy===0;
    if(state==='dead'){
      r(6,25,19,2,'#53653d');r(6,21,5,4,boot);r(10,19,11,5,dark);r(11,18,8,4,col);r(21,19,5,4,skinShade);r(22,18,5,2,col);
      soldiers.set(key,c);return c;
    }
    const walking=state==='walk',step=walking?[0,2,0,-2][frame]:0,bob=walking&&(frame%2)?1:0;
    r(8,27,16,2,'#53653d');r(9,26,14,1,'#435538');
    // Feet alternate ahead and behind; profiles also swing horizontally.
    r(11-step*(side?.6:.3),22+step,4,5,boot);r(18+step*(side?.6:.3),22-step,4,5,boot);
    r(12,21+step,3,3,dark);r(18,21-step,3,3,dark);
    r(10,13-bob,13,10,P.ink);r(11,13-bob,11,9,col);r(12,14-bob,3,6,light);r(20,14-bob,2,7,dark);
    r(11,21-bob,11,2,dark);r(15,21-bob,3,1,'#c7b77b');
    if(back){r(12,14-bob,8,7,dark);r(13,14-bob,6,5,col);r(14,14-bob,2,1,light);}
    else if(!civilian){r(12,14-bob,2,6,dark);r(19,14-bob,2,6,dark);r(13,19-bob,7,2,dark);}
    const hx=side?dx:0;
    r(13+hx,7-bob,7,7,back?dark:skin);r(13+hx,11-bob,2,3,skinShade);
    if(!civilian){
      r(12+hx,5-bob,9,6,dark);r(13+hx,4-bob,7,6,col);r(14+hx,4-bob,4,2,light);r(11+hx,9-bob,11,2,dark);
      if(!back){r(dx<0?13:19,12-bob,1,1,P.ink);r(15+hx,14-bob,3,1,skinShade);}
    }else {r(12+hx,5-bob,8,4,'#594730');r(13+hx,4-bob,6,2,'#796043');if(!back)r(dx<0?13:19,11-bob,1,1,P.ink);}
    if(civilian){
      r(8,15-bob,3,6,col);r(22,15-bob,3,6,col);r(8,20-step-bob,3,3,skin);r(22,20+step-bob,3,3,skin);
    }else {
      const recoil=state==='fire'&&frame%2?1:0,gx=16-dx*recoil,gy=18-bob-dy*recoil;
      r(9,15-bob,3,5,col);r(22,15-bob,2,4,dark);r(gx+dx*3,gy+dy*3,3,3,skin);
      // Muzzle remains inside the atlas in every diagonal direction.
      for(let i=1;i<9;i++){r(gx+dx*i,gy+dy*i,2,2,'#293127');if(i<5)r(gx+dx*i,gy+dy*i,1,1,'#7b8064');}
      if(state==='fire'&&frame%2===0){r(gx+dx*10-1,gy+dy*10-1,4,4,'#e4ab47');r(gx+dx*10,gy+dy*10,2,2,'#fff1b3');}
    }
    soldiers.set(key,c);return c;
  }
  function tree(ctx,t){
    const x=Math.round(t.x/2)*2,y=Math.round(t.y/2)*2,r=Math.max(10,Math.round(t.r*.75)*2);
    const block=(dx,dy,w,h,color)=>{ctx.fillStyle=color;ctx.fillRect(x+dx,y+dy,w,h);};
    block(-r+6,0,r*2,4,'#526638');block(-2,-r,4,r+2,'#594b2f');block(-2,-r,2,r,'#817044');
    const dark='#354e2b',mid=t.dark?'#557535':'#68883e',lit=t.dark?'#789346':'#93a954';
    // Overlapping stepped lobes, all snapped to the same two-world-unit grid.
    block(-r+4,-r*2-2,r*2-8,r+10,dark);block(-r,-r*2+4,r*2,r+2,dark);block(-r+2,-r*2+2,r*2-4,r+3,mid);
    block(-r+4,-r*2,r,r,mid);block(-r+4,-r*2+2,r-2,4,lit);block(-r+2,-r*2+6,4,4,lit);
    block(0,-r*2+4,6,4,lit);block(2,-r-2,r-4,4,dark);block(-4,-r,4,4,dark);
    block(-r+6,-r*2+4,2,2,'#b0bd70');block(4,-r*2+6,2,2,'#a1b363');
  }
  function pickup(ctx,p){
    const x=Math.round(p.x/2)*2,y=Math.round(p.y/2)*2;
    ctx.fillStyle='#465332';ctx.fillRect(x-12,y+10,28,4);
    ctx.fillStyle='#293126';ctx.fillRect(x-14,y-14,28,26);
    ctx.fillStyle=p.type==='ammo'?'#93875b':'#c6c8a5';ctx.fillRect(x-12,y-12,24,20);
    ctx.fillStyle=p.type==='ammo'?'#c3b481':'#e6e2bf';ctx.fillRect(x-12,y-12,24,4);
    ctx.fillStyle='#68664a';ctx.fillRect(x-12,y+8,24,2);
    if(p.type==='ammo'){
      ctx.fillStyle='#535839';ctx.fillRect(x-8,y-10,2,20);ctx.fillRect(x+6,y-10,2,20);
      ctx.fillStyle='#e3d091';for(let i=0;i<3;i++)ctx.fillRect(x-4+i*4,y-4,2,8);
    }else {ctx.fillStyle='#456b88';ctx.fillRect(x-4,y-8,8,14);ctx.fillRect(x-8,y-4,16,6);}
  }
  return {P,texture,landmark,soldier,tree,pickup};
})();
