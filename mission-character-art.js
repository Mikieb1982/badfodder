/* Mission-specific illustrated character sets. Shared pose/gait and collision remain untouched.
   Optional atlases: sprites = 8 directions x 4 characters; portraits = 4 characters x 3 missions.
   A failed atlas uses the matching illustrated costume, never a missing-image draw call. */
(()=>{'use strict';
const art=window.BadFodderArt,identities=window.BadFodderIdentities;
if(!art||!identities)return;
const previous=art.drawActor,cache=new Map(),portraits=new Map(),assets=new Map();
let mission='belzig';
const sets=Object.fromEntries(['cable-street','wigan','belzig'].map((key,row)=>[key,{sprites:'assets/characters/'+key+'.png',portraits:'assets/characters/portraits-1936-1945.png',portraitRow:row}]));
const frames={"cable-street":[[[51,18,110,226],[229,18,119,227],[413,18,136,217],[612,18,128,226],[819,17,99,228],[1013,17,113,226],[1179,16,141,222],[1371,18,115,225]],[[50,263,96,239],[239,262,108,239],[420,259,125,238],[616,262,117,238],[816,264,102,232],[1014,264,106,236],[1185,262,125,238],[1375,264,107,236]],[[53,516,101,252],[232,516,122,252],[416,516,133,252],[614,517,121,251],[818,516,93,252],[1011,516,113,252],[1181,516,135,252],[1373,518,115,250]],[[43,768,111,235],[225,768,126,234],[407,768,151,230],[619,768,127,234],[818,768,105,229],[1002,768,128,232],[1177,768,149,230],[1369,768,127,232]]],"wigan":[[[45,26,147,222],[192,26,192,220],[384,24,192,216],[576,24,175,223],[786,24,140,221],[967,26,146,220],[1171,23,129,222],[1366,25,137,220]],[[45,264,147,237],[192,267,192,232],[384,263,192,232],[576,264,169,237],[783,271,134,228],[962,264,145,237],[1170,266,132,235],[1365,267,133,234]],[[47,522,145,246],[192,522,192,246],[384,518,192,250],[576,520,170,248],[773,522,153,246],[961,523,152,245],[1168,521,135,247],[1364,522,136,246]],[[41,768,151,232],[192,768,192,232],[384,768,192,225],[576,768,180,233],[774,768,164,231],[965,768,161,235],[1161,768,154,232],[1353,768,156,233]]],"belzig":[[[30,25,162,231],[192,28,186,228],[415,29,151,220],[612,28,129,228],[788,27,139,225],[986,28,134,226],[1182,27,130,221],[1367,26,140,230]],[[27,256,158,254],[227,270,154,239],[412,272,147,228],[615,256,122,254],[783,271,142,233],[984,273,141,231],[1170,270,144,232],[1372,270,139,240]],[[31,518,161,250],[192,519,192,249],[384,522,190,246],[609,521,124,247],[784,521,154,247],[988,522,136,246],[1190,522,116,246],[1364,521,149,247]],[[28,768,160,234],[226,768,147,233],[413,768,136,224],[604,768,134,234],[781,768,146,233],[981,768,135,231],[1173,768,141,225],[1375,768,128,234]]]};
const pending=new Map();
const canvas=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;};
function ellipse(g,x,y,rx,ry,fill){g.fillStyle=fill;g.beginPath();g.ellipse(x,y,rx,ry,0,0,Math.PI*2);g.fill();}
function path(g,points,fill,stroke='#302d28',width=.65){g.beginPath();points.forEach((p,i)=>i?g.lineTo(...p):g.moveTo(...p));g.closePath();g.fillStyle=fill;g.fill();if(stroke){g.strokeStyle=stroke;g.lineWidth=width;g.stroke();}}
function shade(g,x,y,h,color){const v=g.createLinearGradient(x-8,y,x+9,y+h);v.addColorStop(0,'#c2b494');v.addColorStop(.18,color);v.addColorStop(.65,color);v.addColorStop(1,'#302e2b');return v;}
function hat(g,s,x,y,scale=1){g.save();g.translate(x,y);g.scale(scale,scale);const col=s.hat==='brodie'?'#73704d':s.hat==='stahlhelm'?'#555f54':s.hat==='headscarf'?s.scarf||'#b1a080':'#484841';
 if(s.hat==='brodie'){ellipse(g,0,0,9,2,col);ellipse(g,0,-2,6.2,4,shade(g,0,-6,6,col));}
 else if(s.hat==='stahlhelm'){path(g,[[-7,1],[-7,-3],[-4,-7],[4,-7],[7,-3],[7,2],[4,3],[4,0]],shade(g,0,-7,9,col));}
 else if(s.hat==='headscarf'){path(g,[[-7,3],[-6,-4],[-2,-7],[4,-6],[7,0],[5,5],[2,2],[-2,1]],shade(g,0,-7,10,col));path(g,[[5,2],[9,7],[4,6]],col);}
 else if(s.hat==='beret'){ellipse(g,-1,-2,7.5,4,shade(g,0,-5,7,s.coat));ellipse(g,0,0,5.8,1,'#38332c');}
 else if(s.hat==='custodian'){path(g,[[-7,1],[-5,-5],[0,-10],[5,-5],[7,1]],shade(g,0,-8,9,'#263d4b'));ellipse(g,0,1,8,1.7,'#1e2c35');ellipse(g,0,-3,1.2,1.7,'#b8b8a3');}
 else{const tall=/railway|officer/.test(s.hat);path(g,[[-7,0],[-6,tall?-7:-3],[3,tall?-7:-5],[7,-1],[7,1]],shade(g,0,-6,7,col));ellipse(g,3,1,6,1.2,'#302f2b');if(tall){g.fillStyle='#a4976d';g.fillRect(-4,-1,8,1);}}
 g.restore();}
function weapon(g,type,x,y,angle){if(!type)return;g.save();g.translate(x,y);g.rotate(angle);const rifle=/enfield|kar98/.test(type);g.lineCap='round';g.strokeStyle='#292f2d';g.lineWidth=2;g.beginPath();g.moveTo(-5,0);g.lineTo(rifle?17:11,0);g.stroke();g.strokeStyle='#947049';g.lineWidth=3.3;g.beginPath();g.moveTo(-8,0);g.lineTo(rifle?7:0,0);g.stroke();if(!rifle){g.strokeStyle='#303837';g.lineWidth=2.4;g.beginPath();g.moveTo(type==='sten'?5:2,0);g.lineTo(type==='sten'?5:3,type==='sten'?-6:6);g.stroke();}g.restore();}
function body(g,s,dir,phase,portrait=false){
 const facing=dir*Math.PI/4,side=Math.cos(facing),back=Math.sin(facing)<-.35,step=Math.sin(phase),wide=s.build==='broad'?1.14:1;
 g.save();g.scale(wide,1);
 // Boots and separately placed knees, with a longer civilian coat where appropriate.
 if(!portrait){for(const sign of [-1,1]){const y=step*sign*2;path(g,[[sign*4-2,-12],[sign*4+2,-12],[sign*4+2,0+y],[sign*4-2,0+y]],sign<0?'#4c4e45':'#55534b');ellipse(g,sign*4+side*.8,1+y,3.1,1.8,'#302b25');}}
 const bottom=s.longCoat?-5:-13,coat=shade(g,0,-30,25,s.coat);
 path(g,[[-7,-29],[-10,-24],[-8,bottom],[7,bottom],[9,-24],[5,-29]],coat);
 if(s.longCoat){g.strokeStyle='#393a32';g.lineWidth=.6;g.beginPath();g.moveTo(0,-21);g.lineTo(1,-5);g.stroke();}
 if(s.waistcoat)path(g,[[-4,-28],[0,-22],[4,-28],[5,-15],[-5,-15]],'#494940');
 if(!back){path(g,[[-5,-29],[0,-24],[4,-29],[2,-31],[-2,-31]],'#c5baa0');g.strokeStyle='#39382f';g.lineWidth=.6;g.beginPath();g.moveTo(0,-24);g.lineTo(0,-14);g.stroke();for(let n=0;n<3;n++)ellipse(g,1,-22+n*3,.45,.45,'#c8bda0');}
 if(s.webbing){g.strokeStyle='#b3a481';g.lineWidth=1.8;g.beginPath();g.moveTo(-5,-29);g.lineTo(3,-15);g.moveTo(-7,-16);g.lineTo(7,-16);g.stroke();path(g,[[3,-20],[7,-20],[7,-15],[3,-15]],'#7a755e');}
 const armSwing=portrait?0:step*1.1;
 for(const sign of [-1,1]){path(g,[[sign*7,-27],[sign*10,-25],[sign*11,-16+sign*armSwing],[sign*7,-15+sign*armSwing]],coat);ellipse(g,sign*9,-14+sign*armSwing,2,2.4,'#bb916d');}
 if(s.scarf){path(g,[[-5,-30],[5,-30],[3,-26],[-5,-27]],s.scarf);path(g,[[3,-28],[5,-27],[6,-19],[3,-20]],s.scarf);}
 ellipse(g,side*.7,-34,5.7,6.5,shade(g,0,-40,12,s.age>50?'#c6a585':'#d1aa81'));
 ellipse(g,side*5,-33,1.7,2,'#bc926d');
 if(back){ellipse(g,0,-35,5.6,5.3,s.hair||'#62503b');}
 else{g.fillStyle='#3c332b';g.fillRect(-2+side,-35,1,1);g.fillRect(2+side,-35,1,1);g.strokeStyle='#85604c';g.lineWidth=.6;g.beginPath();g.moveTo(side,-34);g.lineTo(side+1,-31);g.moveTo(-1,-29.5);g.lineTo(2,-29.5);g.stroke();if(s.moustache)ellipse(g,1,-30.7,2.7,.7,'#a19b84');if(s.age>45){g.strokeStyle='#947961';g.beginPath();g.moveTo(-4,-32);g.lineTo(-2,-31);g.moveTo(2,-32);g.lineTo(4,-31);g.stroke();}}
 hat(g,s,0,-39);
 if(!portrait)weapon(g,s.weapon,side*4,-19,Math.sin(facing)*.55+(side<0?Math.PI:0));
 g.restore();
}
function descriptor(ent,team){return identities.skin(mission,ent.identityRole||team,ent.variant||0,ent.periodRole);}
function sprite(s,dir,step){const key=JSON.stringify(s)+'/'+dir+'/'+step;if(cache.has(key))return cache.get(key);const c=canvas(128,160),g=c.getContext('2d');g.scale(3,3);g.translate(21.3,48);body(g,s,dir,step*Math.PI/4);cache.set(key,c);return c;}
art.setMissionIdentity=key=>{mission=identities.get(key).key;};
art.missionAssetSets=sets;
art.preloadMissionArt=key=>{const id=identities.get(key).key;if(pending.has(id))return pending.get(id);
 const task=Promise.all(['sprites','portraits'].map(kind=>new Promise(resolve=>{const src=sets[id]?.[kind];if(!src)return resolve(false);const image=new Image();let done=false;const finish=ok=>{if(done)return;done=true;clearTimeout(timer);if(ok&&image.naturalWidth>0){assets.set(id+'/'+kind,image);portraits.clear();}resolve(ok);};const timer=setTimeout(()=>finish(false),4000);image.onload=()=>finish(true);image.onerror=()=>finish(false);image.src=src;})));
 pending.set(id,task);return task;
};
// Shared distance-driven gait animates the painted legs, retaining the source's proportions.
function paintedBody(g,atlas,key,index,dir,phase,moving){
 const row=frames[key][index],f=row[dir],scale=43/Math.max(...row.map(r=>r[3]));
 const [sx,sy,sw,sh]=f,w=sw*scale,h=sh*scale,split=Math.floor(sh*.75),leg=sh-split,half=Math.floor(sw/2),stride=moving?Math.sin(phase)*1.25:0;
 g.drawImage(atlas,sx,sy,sw,split,-w/2,-h,w,split*scale);
 g.drawImage(atlas,sx,sy+split,half,leg,-w/2,-leg*scale+stride,half*scale,leg*scale);
 g.drawImage(atlas,sx+half,sy+split,sw-half,leg,-w/2+half*scale,-leg*scale-stride,(sw-half)*scale,leg*scale);
}
art.drawActor=(g,ent,team='squad')=>{
 if(!identities.missions[mission]||((team==='civilian'||ent.periodRole)&&ent.identityRole!=='squad'))return previous(g,ent,team);
 const v=art.pose(ent),s=descriptor(ent,team),dir=v.dir??0,moving=v.moving||/walk|run/.test(v.state),step=moving?Math.round((v.phase||0)/(Math.PI/4))%8:0;
 const atlas=(ent.identityRole==='squad'||team==='squad')?assets.get(mission+'/sprites'):null;
 g.save();ellipse(g,ent.x,ent.y+2,9,3,'#17251f50');g.translate(ent.x,ent.y);
 if(v.state==='dead'){g.rotate(Math.min(1,(v.death||0)/.24)*1.45);g.scale(1,.8);}
 else{const recoil=v.state==='fire'?1:0;g.translate(-Math.cos(v.facing||0)*recoil,(moving?Math.cos((v.phase||0)*2)*.45:0)-Math.sin(v.facing||0)*recoil);if(v.state==='hurt'||v.state==='stumble')g.rotate(.07);}
 if(atlas)paintedBody(g,atlas,mission,Math.abs(ent.variant||0)%4,dir,v.phase||0,moving);
 else g.drawImage(sprite(s,dir,step),-21.3,-48,42.67,53.33);
 g.restore();
};
art.missionPortrait=(key,index,state='idle')=>{const id=identities.get(key),s=id.characters[Math.abs(index)%4],k=id.key+'/'+index+'/'+state;if(portraits.has(k))return portraits.get(k);const c=canvas(144,144),g=c.getContext('2d'),atlas=assets.get(id.key+'/portraits');if(atlas){const w=atlas.naturalWidth/4,h=atlas.naturalHeight/3;g.drawImage(atlas,(Math.abs(index)%4)*w,sets[id.key].portraitRow*h,w,h,0,0,144,144);}else{g.fillStyle=shade(g,60,0,144,'#666c57');g.fillRect(0,0,144,144);g.save();g.translate(72,244);g.scale(4.7,4.7);body(g,s,2,0,true);g.restore();for(let i=0;i<80;i++){g.fillStyle=i%2?'#ead4a20a':'#1a271809';g.fillRect((i*37)%144,(i*53)%144,2,1);}}
 g.strokeStyle='#c9bfa2';g.lineWidth=5;g.strokeRect(2.5,2.5,139,139);if(state==='dead'){g.fillStyle='#202d2da0';g.fillRect(0,0,144,144);}portraits.set(k,c);return c;};
})();
