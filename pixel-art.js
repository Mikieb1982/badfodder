/* Original, code-drawn pixel art. World geometry belongs to town-map.js. */
window.BadFodderArt = (() => {
  'use strict';
  const P={ink:'#242b20',grass:'#749342',light:'#a1b65c',shade:'#526d34',stone:'#a49b74',stoneLight:'#c9c096',stoneDark:'#716950',roof:'#985535',roofLight:'#bd7950',roofDark:'#633f2d',wall:'#c3b383',wallLight:'#ddd0a1',water:'#547c91'};
  const make=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;};
  const tiles=new Map(),landmarks=new Map(),soldiers=new Map();
  function texture(ctx,key){
    if(!tiles.has(key)){
      const c=make(64,64),g=c.getContext('2d');
      const colors={grass:[P.grass,P.light,P.shade],forest:['#5d7b39','#789547','#425d2e'],wood:['#66813b','#89a14d','#4c6630'],meadow:['#8e9f4c','#b3bc6b','#778541'],cemetery:['#8c9365','#a7ad7d','#737952'],water:[P.water,'#81a5aa','#3f637d'],road:[P.stone,P.stoneLight,P.stoneDark],path:['#ad9b62','#caba80','#908450']};
      const col=colors[key]||colors.grass;g.fillStyle=col[0];g.fillRect(0,0,64,64);
      let seed=1937;const rnd=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
      for(let i=0;i<95;i++){const x=Math.floor(rnd()*32)*2,y=Math.floor(rnd()*32)*2;g.fillStyle=col[i%2+1];g.fillRect(x,y,key==='water'?8:2,i%4===0?2:1);if(key==='grass'&&i%5===0)g.fillRect(x+2,y-2,2,2);}
      if(key==='road'){g.fillStyle=col[2];for(let y=0;y<64;y+=8)for(let x=(y%16?4:0);x<64;x+=12){g.fillRect(x,y,8,1);g.fillRect(x,y,1,5);}}
      tiles.set(key,c);
    }
    return ctx.createPattern(tiles.get(key),'repeat');
  }
  function landmark(key){
    if(landmarks.has(key))return landmarks.get(key);
    const c=make(160,120),g=c.getContext('2d');
    const rect=(x,y,w,h,col)=>{g.fillStyle=col;g.fillRect(x,y,w,h);};
    const poly=(pts,col)=>{g.fillStyle=col;g.beginPath();pts.forEach((p,i)=>i?g.lineTo(...p):g.moveTo(...p));g.closePath();g.fill();};
    const masonry=(x,y,w,h)=>{rect(x,y,w,h,P.stone);rect(x+w-5,y,5,h,P.stoneDark);for(let yy=y+4;yy<y+h;yy+=6)for(let xx=x+(yy%12?0:5);xx<x+w-5;xx+=11){rect(xx,yy,8,1,P.stoneLight);}};
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
      windows(72,42,1,3);rect(75,96,9,14,P.ink);rect(56,108,49,4,P.stoneDark);
    }else if(key==='post'){
      rect(66,105,30,5,P.stoneDark);rect(69,99,24,6,P.stoneLight);rect(73,71,16,28,P.wall);rect(77,30,8,41,P.wallLight);
      poly([[76,30],[80,9],[85,30]],P.wallLight);rect(71,69,21,4,P.stoneDark);rect(77,77,8,5,'#596479');rect(76,90,9,1,P.stoneDark);
    }else if(key==='marien'||key==='briccius'){
      const small=key==='briccius';house(46,77,85,30);masonry(28,small?47:34,32,74-(small?13:0));
      poly([[24,small?47:34],[44,small?22:7],[64,small?47:34]],P.roofDark);poly([[26,small?45:32],[44,small?22:7],[54,small?45:32]],P.roof);
      windows(38,small?58:45,1,2);rect(39,95,9,14,P.ink);for(let x=73;x<126;x+=18){rect(x,83,6,14,P.ink);rect(x+1,84,2,7,'#8ca5a2');}
    }else if(key==='rathaus'){
      house(22,64,118,44);poly([[69,65],[81,44],[94,65]],P.wallLight);windows(77,58,1);masonry(73,25,17,20);
      poly([[69,25],[82,12],[94,25]],P.roofDark);rect(79,30,5,5,P.ink);rect(80,31,3,3,P.wallLight);rect(80,7,2,8,P.ink);
      rect(23,87,111,2,P.stoneDark);rect(31,91,10,15,'#617f88');rect(113,91,10,15,'#617f88');
    }else {house(36,70,91,37);rect(44,82,71,2,P.stoneDark);rect(53,71,3,35,P.stoneDark);rect(105,71,3,35,P.stoneDark);}
    landmarks.set(key,c);return c;
  }
  // Eight facings and four discrete walk poses, no rotation of the body bitmap.
  function soldier(team,dir,frame,state,variant=0){
    const key=[team,dir,frame,state,variant].join('/');if(soldiers.has(key))return soldiers.get(key);
    const c=make(24,24),g=c.getContext('2d');
    const civilian=team==='civilian',enemy=team==='enemy';
    const col=civilian?['#698bb0','#a38d63','#8b779e','#c5a166'][variant%4]:enemy?'#ab8860':'#81974e';
    const dark=enemy?'#695539':'#435431',skin='#dfbd83',boot='#343529';
    const r=(x,y,w,h,color)=>{g.fillStyle=color;g.fillRect(x,y,w,h);};
    if(state==='dead'){r(4,16,14,3,dark);r(6,13,8,4,col);r(17,14,4,3,skin);r(2,16,4,2,boot);soldiers.set(key,c);return c;}
    const step=state==='walk'?[0,2,0,-2][frame]:0,bob=state==='walk'&&frame%2?1:0;
    r(6,20,12,2,'#485432');r(8-step,17,3,4,boot);r(13+step,17,3,4,boot);
    r(7,10-bob,10,8,P.ink);r(8,10-bob,8,7,col);r(8,16-bob,8,2,dark);
    r(9,11-bob,2,5,dark);r(14,11-bob,1,5,dark);r(6,12-bob,2,4,col);r(16,12-bob,2,4,col);
    const dx=[1,1,0,-1,-1,-1,0,1][dir],dy=[0,1,1,1,0,-1,-1,-1][dir];
    if(dy<0){r(9,9-bob,6,4,dark);r(10,9-bob,4,3,col);}
    r(9,6-bob,6,5,skin);r(9,6-bob,6,2,civilian?'#594730':dark);
    r(8,4-bob,7,4,civilian?'#594730':col);r(9,3-bob,5,1,civilian?'#594730':'#a9bd71');
    if(!civilian){r(8,7-bob,9,1,dark);r(12+dx*3,11+dy*2-bob,3,3,skin);
      for(let i=0;i<7;i++)r(12+dx*(i+2),13+dy*(i+2)-bob,2,2,'#2b3027');
      if(state==='fire'){r(12+dx*10,13+dy*10-bob,3,3,'#ffe7a0');r(13+dx*11,14+dy*11-bob,1,1,'#ffffff');}
    }else {r(6-step/2,16-bob,2,2,skin);r(16+step/2,16-bob,2,2,skin);}
    if(state==='reload'){r(10,13,5,3,skin);r(12,16,2,3,'#2b3027');}
    if(dy>=0)r(dx<0?9:14,9-bob,1,1,P.ink);
    soldiers.set(key,c);return c;
  }
  function tree(ctx,t){
    const x=Math.round(t.x/2)*2,y=Math.round(t.y/2)*2,r=Math.round(t.r);
    ctx.fillStyle=P.shade;ctx.fillRect(x-r+6,y,r*2,6);ctx.fillStyle='#544b2d';ctx.fillRect(x-2,y-r,4,r+2);
    // Stepped canopy edges keep trees organic without smooth vector circles.
    ctx.fillStyle='#344e29';ctx.fillRect(x-r+4,y-r*2,r*2-8,r+9);ctx.fillRect(x-r,y-r*2+5,r*2,r-1);
    ctx.fillStyle=t.dark?'#526d32':'#648039';ctx.fillRect(x-r+4,y-r*2+1,r*2-10,r+3);ctx.fillRect(x-r+2,y-r*2+5,r*2-6,r-3);
    ctx.fillStyle='#89a34a';ctx.fillRect(x-r+6,y-r*2+3,r-2,4);ctx.fillRect(x-3,y-r*2-1,6,4);ctx.fillRect(x-r+3,y-r*2+7,4,4);

  }
  return {P,texture,landmark,soldier,tree};
})();
