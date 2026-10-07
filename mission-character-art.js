/* Mission-specific illustrated character sets. Shared pose/gait and collision remain untouched.
   Optional atlases: sprites = 8 directions x 4 characters; portraits = 4 characters x 3 missions.
   A failed atlas uses the matching illustrated costume, never a missing-image draw call. */
(()=>{'use strict';
const art=window.BadFodderArt,identities=window.BadFodderIdentities;
if(!art||!identities)return;
const previous=art.drawActor,cache=new Map(),portraits=new Map(),assets=new Map(),crowdAtlases=new Map(),roleAtlases=new Map();
let mission='belzig';
const sets=Object.fromEntries(['cable-street','wigan','belzig'].map((key,row)=>[key,{sprites:'assets/characters/'+key+'.webp',portraits:'assets/characters/portraits-1936-1945.webp',portraitRow:row}]));
const frames={"cable-street":[[[51,18,110,226],[229,18,119,227],[413,18,136,217],[612,18,128,226],[819,17,99,228],[1013,17,113,226],[1179,16,141,222],[1371,18,115,225]],[[50,263,96,239],[239,262,108,239],[420,259,125,238],[616,262,117,238],[816,264,102,232],[1014,264,106,236],[1185,262,125,238],[1375,264,107,236]],[[53,516,101,252],[232,516,122,252],[416,516,133,252],[614,517,121,251],[818,516,93,252],[1011,516,113,252],[1181,516,135,252],[1373,518,115,250]],[[43,768,111,235],[225,768,126,234],[407,768,151,230],[619,768,127,234],[818,768,105,229],[1002,768,128,232],[1177,768,149,230],[1369,768,127,232]]],"wigan":[[[45,26,147,222],[192,26,192,220],[384,24,192,216],[576,24,175,223],[786,24,140,221],[967,26,146,220],[1171,23,129,222],[1366,25,137,220]],[[45,264,147,237],[192,267,192,232],[384,263,192,232],[576,264,169,237],[783,271,134,228],[962,264,145,237],[1170,266,132,235],[1365,267,133,234]],[[47,522,145,246],[192,522,192,246],[384,518,192,250],[576,520,170,248],[773,522,153,246],[961,523,152,245],[1168,521,135,247],[1364,522,136,246]],[[41,768,151,232],[192,768,192,232],[384,768,192,225],[576,768,180,233],[774,768,164,231],[965,768,161,235],[1161,768,154,232],[1353,768,156,233]]],"belzig":[[[30,25,162,231],[192,28,186,228],[415,29,151,220],[612,28,129,228],[788,27,139,225],[986,28,134,226],[1182,27,130,221],[1367,26,140,230]],[[27,256,158,254],[227,270,154,239],[412,272,147,228],[615,256,122,254],[783,271,142,233],[984,273,141,231],[1170,270,144,232],[1372,270,139,240]],[[31,518,161,250],[192,519,192,249],[384,522,190,246],[609,521,124,247],[784,521,154,247],[988,522,136,246],[1190,522,116,246],[1364,521,149,247]],[[28,768,160,234],[226,768,147,233],[413,768,136,224],[604,768,134,234],[781,768,146,233],[981,768,135,231],[1173,768,141,225],[1375,768,128,234]]]};
// Authored painted Barcelona art uses the same distance-driven gait as the other missions.
sets.barcelona={sprites:'assets/characters/barcelona-illustrated.webp'};
frames.barcelona=[[[31,20,65,128],[153,18,77,130],[279,19,82,129],[411,19,73,129],[543,20,65,128],[669,19,70,129],[791,21,82,127],[925,22,69,126]],[[31,178,66,130],[155,178,74,130],[279,179,81,129],[413,177,69,131],[546,180,59,128],[668,178,71,130],[794,180,76,128],[924,179,72,129]],[[25,332,77,136],[148,335,87,133],[271,335,97,133],[405,333,86,135],[539,335,73,133],[664,334,79,134],[785,339,94,129],[922,335,75,133]],[[31,508,65,120],[155,505,73,123],[282,507,75,121],[415,505,66,123],[545,505,62,123],[672,506,63,122],[795,505,73,123],[927,506,65,122]]];
frames.barcelonaArmed=[[[12,671,103,117],[139,669,106,119],[270,673,100,115],[404,672,88,116],[524,672,104,116],[655,669,97,119],[790,672,84,116],[916,668,88,120]],[[11,835,105,113],[140,835,103,113],[270,839,100,109],[406,832,83,116],[527,835,98,113],[653,835,101,113],[793,834,77,114],[917,835,86,113]],[[11,977,106,131],[138,976,107,132],[262,974,116,134],[406,977,84,131],[524,977,103,131],[649,979,110,129],[783,982,97,126],[919,976,82,132]],[[18,1152,92,116],[146,1155,91,113],[276,1155,87,113],[402,1153,92,115],[535,1154,82,114],[661,1155,86,113],[789,1154,85,114],[922,1155,75,113]]];
let barcelonaEnemies=null;
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
function weapon(g,type,x,y,angle){
 if(!type)return;g.save();g.translate(x,y);g.rotate(angle);
 const rifle=/enfield|kar98|mauser/.test(type),heavy=type==='mg34'||type==='hotchkiss',pistol=type==='pistol',end=heavy?21:rifle?17:pistol?6:11;
 g.lineCap='round';g.strokeStyle='#222b2c';g.lineWidth=heavy?3:2;g.beginPath();g.moveTo(-5,0);g.lineTo(end,0);g.stroke();
 g.strokeStyle='#a17a50';g.lineWidth=3.3;g.beginPath();g.moveTo(pistol?-2:-8,0);g.lineTo(rifle?7:heavy?-3:0,0);g.stroke();
 g.fillStyle='#596663';g.fillRect(pistol?0:2,-1.8,pistol?5:6,1);
 if(!rifle){g.strokeStyle='#303837';g.lineWidth=heavy?4:2.4;g.beginPath();g.moveTo(type==='sten'?5:2,0);g.lineTo(type==='sten'?5:3,type==='sten'?-6:pistol?4:6);g.stroke();}
 if(heavy){for(let n=0;n<4;n++){g.fillStyle='#9b9e88';g.fillRect(11+n*2,-.6,.7,1.2);}g.strokeStyle='#303837';g.lineWidth=.9;g.beginPath();g.moveTo(17,1);g.lineTo(20,5);g.stroke();}
 g.restore();
}
function enemyGear(g,s,back){
 // Baked into the existing directional/gait cache, never allocated per live frame.
 if(back){path(g,[[-5,-28],[4,-28],[6,-18],[-5,-17]],shade(g,0,-28,11,'#64644f'));path(g,[[5,-22],[8,-22],[8,-16],[5,-16]],'#81775c');}
 else{
  for(const side of [-1,1]){
   path(g,[[side*2,-28],[side*6,-29],[side*5,-25]],'#858775');
   const tall=s.gear==='magazines'||s.gear==='support',y=tall?-23:-20;
   path(g,[[side*3,y],[side*7,y],[side*7,-15],[side*3,-15]],shade(g,side*5,y,8,'#77705a'));
   g.fillStyle='#c2b28d';g.fillRect(side*5-.4,y+1,.8,1);
  }
  g.fillStyle='#c4b38c';g.fillRect(-1,-16,2,1.5);
  if(s.gear==='holster')path(g,[[5,-17],[9,-17],[8,-10],[5,-12]],'#574333');
  if(s.gear==='support'){g.strokeStyle='#b6a078';g.lineWidth=2.2;g.beginPath();g.moveTo(5,-29);g.lineTo(-5,-17);g.stroke();for(let n=0;n<5;n++){g.fillStyle='#ded0a6';g.fillRect(3-n*1.8,-27+n*2,.8,1.3);}}
 }
}

function body(g,s,dir,phase,portrait=false){
 const facing=dir*Math.PI/4,side=Math.cos(facing),back=Math.sin(facing)<-.35,step=Math.sin(phase),wide=s.build==='broad'?1.14:1;
 const illustrated=s.illustratedMotion,amplitude=illustrated?1.35:1;
 g.save();g.scale(wide*(illustrated?.76+.24*Math.abs(Math.sin(facing)):1),1);
 // Boots and separately placed knees, with a longer civilian coat where appropriate.
 if(!portrait){for(const sign of [-1,1]){const y=step*sign*2*amplitude,dx=illustrated?side*step*sign*2.5*amplitude:0;path(g,[[sign*4-2,-12],[sign*4+2,-12],[sign*4+2+dx,0+y],[sign*4-2+dx,0+y]],s.trousers?shade(g,sign*4,-12,14,s.trousers):sign<0?'#4c4e45':'#55534b');ellipse(g,sign*4+side*.8+dx,1+y,3.1,1.8,'#302b25');}}
 const bottom=s.longCoat?-5:-13,coat=shade(g,0,-30,25,s.coat);
 path(g,[[-7,-29],[-10,-24],[-8,bottom],[7,bottom],[9,-24],[5,-29]],coat);
 if(s.longCoat){g.strokeStyle='#393a32';g.lineWidth=.6;g.beginPath();g.moveTo(0,-21);g.lineTo(1,-5);g.stroke();}
 if(s.waistcoat)path(g,[[-4,-28],[0,-22],[4,-28],[5,-15],[-5,-15]],'#494940');
 if(!back){path(g,[[-5,-29],[0,-24],[4,-29],[2,-31],[-2,-31]],'#c5baa0');g.strokeStyle='#39382f';g.lineWidth=.6;g.beginPath();g.moveTo(0,-24);g.lineTo(0,-14);g.stroke();for(let n=0;n<3;n++)ellipse(g,1,-22+n*3,.45,.45,'#c8bda0');}
 if(s.webbing){g.strokeStyle='#b3a481';g.lineWidth=1.8;g.beginPath();g.moveTo(-5,-29);g.lineTo(3,-15);g.moveTo(-7,-16);g.lineTo(7,-16);g.stroke();path(g,[[3,-20],[7,-20],[7,-15],[3,-15]],'#7a755e');}
 if(s.enemyDetail)enemyGear(g,s,back);
 const armSwing=portrait?0:step*1.1*amplitude;
 for(const sign of [-1,1]){if(illustrated&&s.weapon&&!portrait)continue;path(g,[[sign*7,-27],[sign*10,-25],[sign*11,-16+sign*armSwing],[sign*7,-15+sign*armSwing]],coat);ellipse(g,sign*9,-14+sign*armSwing,2,2.4,'#bb916d');if(s.enemyDetail){g.strokeStyle='#b0aa8e';g.lineWidth=.7;g.beginPath();g.moveTo(sign*7,-18+sign*armSwing);g.lineTo(sign*10,-19+sign*armSwing);g.stroke();}}
 if(s.scarf){path(g,[[-5,-30],[5,-30],[3,-26],[-5,-27]],s.scarf);path(g,[[3,-28],[5,-27],[6,-19],[3,-20]],s.scarf);}
 ellipse(g,side*.7,-34,5.7,6.5,shade(g,0,-40,12,s.age>50?'#c6a585':'#d1aa81'));
 ellipse(g,side*5,-33,1.7,2,'#bc926d');
 if(back){ellipse(g,0,-35,5.6,5.3,s.hair||'#62503b');}
 else{g.fillStyle='#3c332b';g.fillRect(-2+side,-35,1,1);g.fillRect(2+side,-35,1,1);g.strokeStyle='#85604c';g.lineWidth=.6;g.beginPath();g.moveTo(side,-34);g.lineTo(side+1,-31);g.moveTo(-1,-29.5);g.lineTo(2,-29.5);g.stroke();if(s.moustache)ellipse(g,1,-30.7,2.7,.7,'#a19b84');if(s.age>45){g.strokeStyle='#947961';g.beginPath();g.moveTo(-4,-32);g.lineTo(-2,-31);g.moveTo(2,-32);g.lineTo(4,-31);g.stroke();}}
 hat(g,s,0,-39);
 if(!portrait){
  const angle=illustrated?facing:Math.sin(facing)*.55+(side<0?Math.PI:0);
  if(illustrated&&s.weapon){
   // Separate forearms meet the stock and foregrip; the gun follows all eight facings.
   const x=side*4,y=-19,rifle=s.weapon!=='pistol';
   for(const sign of [-1,1]){
    if(!rifle&&sign<0){path(g,[[-7,-27],[-10,-25],[-11,-16-armSwing],[-7,-15-armSwing]],coat);ellipse(g,-9,-14-armSwing,2,2.4,'#bb916d');continue;}
    const grip=rifle?(sign<0?8:-2):0,hx=x+Math.cos(angle)*grip,hy=y+Math.sin(angle)*grip;
    path(g,[[sign*7,-27],[sign*10,-24],[hx+2,hy],[hx-2,hy+2],[sign*6,-21]],coat);
    ellipse(g,hx,hy,1.7,1.9,'#bb916d');
   }
  }
  weapon(g,s.weapon,side*4,-19,angle);
 }
 g.restore();
}
function descriptor(ent,team){const base=identities.skin(mission,ent.identityRole||team,ent.variant||0,ent.periodRole);return mission==='barcelona'?{...base,illustratedMotion:true,...(ent.equipmentManaged?{weapon:ent.weapon}:null)}:ent.equipmentManaged?{...base,weapon:ent.weapon}:base;}
function sprite(s,dir,step){
 const key=JSON.stringify([s.coat,s.hat,s.weapon,s.build,s.trousers,s.longCoat,s.waistcoat,s.webbing,s.enemyDetail,s.gear,s.scarf,s.age,s.hair,s.moustache,s.illustratedMotion])+'/'+dir+'/'+step;
 if(cache.has(key))return cache.get(key);
 const illustrated=s.illustratedMotion,c=canvas(illustrated?96:128,illustrated?112:160),g=c.getContext('2d');
 g.scale(illustrated?2:3,illustrated?2:3);g.translate(illustrated?24:21.3,illustrated?50:48);body(g,s,dir,step*Math.PI/4);cache.set(key,c);return c;
}
art.setMissionIdentity=key=>{mission=identities.get(key).key;};
art.missionAssetSets=sets;
art.preloadMissionArt=key=>{const id=identities.get(key).key;if(pending.has(id))return pending.get(id);
 const task=Promise.all(['sprites','portraits'].map(kind=>new Promise(resolve=>{const src=sets[id]?.[kind];if(!src)return resolve(false);const image=new Image();let done=false;const finish=ok=>{if(done)return;done=true;clearTimeout(timer);if(ok&&image.naturalWidth>0){assets.set(id+'/'+kind,image);portraits.clear();}resolve(ok);};const timer=setTimeout(()=>finish(false),4000);image.onload=()=>finish(true);image.onerror=()=>finish(false);image.src=window.BadFodderAssetUrl?.(src)||src;})));
 const ready=id==='barcelona'?task.then(result=>{
 if(assets.has(id+'/sprites')){barcelonaEnemies=barcelonaEnemyAtlas(assets.get(id+'/sprites'));return result;}
 // Prime fallback poses only when the painted asset is unavailable.
 for(const team of ['squad','resistance','civilian','enemy'])for(let index=0;index<4;index++){
  const base=identities.skin(id,team,index),weapons=team==='squad'?[null,'pistol','mauser']:[base.weapon];
  for(const weapon of weapons)for(let dir=0;dir<8;dir++)for(let step=0;step<8;step++)sprite({...base,illustratedMotion:true,weapon},dir,step);
 }
 return result;
 }):task;
 pending.set(id,ready);return ready;
};
// Shared distance-driven gait animates the painted legs, retaining the source's proportions.
function paintedBody(g,atlas,key,index,dir,phase,moving,rowOverride=null,referenceHeight=0){
 const row=rowOverride||frames[key][index],f=row[dir],scale=43/(referenceHeight||Math.max(...row.map(r=>r[3])));
 const [sx,sy,sw,sh]=f,w=sw*scale,h=sh*scale,split=Math.floor(sh*.75),leg=sh-split,half=Math.floor(sw/2),stride=moving?Math.sin(phase)*1.25:0;
 g.drawImage(atlas,sx,sy,sw,split,-w/2,-h,w,split*scale);
 g.drawImage(atlas,sx,sy+split,half,leg,-w/2,-leg*scale+stride,half*scale,leg*scale);
 g.drawImage(atlas,sx+half,sy+split,sw-half,leg,-w/2+half*scale,-leg*scale-stride,(sw-half)*scale,leg*scale);
}
// Cache the rebel uniform tint once, retaining the authored facial and fabric detail.
function barcelonaEnemyAtlas(atlas){
 const c=canvas(atlas.naturalWidth,atlas.naturalHeight),g=c.getContext('2d');g.drawImage(atlas,0,0);
 g.globalCompositeOperation='source-atop';g.globalAlpha=.58;g.fillStyle='#817b52';
 for(const row of [...frames.barcelona,...frames.barcelonaArmed])for(const[x,y,w,h]of row){g.fillRect(x,y+h*.31,w,h*.6);g.fillRect(x,y,w,h*.17);}
 return c;
}
// Crowd variants reuse the volunteers' painted silhouettes and fabric detail.
// Only clothing is tinted; faces, hands, headwear and transparent edges stay intact.
function crowdAtlas(atlas,variant){
 const index=Math.abs(variant||0)%8;if(index<4)return atlas;
 if(crowdAtlases.has(index))return crowdAtlases.get(index);
 const c=canvas(atlas.naturalWidth,atlas.naturalHeight),g=c.getContext('2d');g.drawImage(atlas,0,0);
 g.globalCompositeOperation='source-atop';g.globalAlpha=.3;
 g.fillStyle=['#536d78','#956348','#68765b','#756387'][index-4];
 for(const row of frames['cable-street'])for(const [x,y,w,h] of row)g.fillRect(x,y+h*.34,w,h*.39);
 crowdAtlases.set(index,c);return c;
}
function roleAtlas(atlas,role){
 if(roleAtlases.has(role))return roleAtlases.get(role);
 const c=canvas(atlas.naturalWidth,atlas.naturalHeight),g=c.getContext('2d');g.drawImage(atlas,0,0);
 g.globalCompositeOperation='source-atop';g.globalAlpha=.76;g.fillStyle=role==='police'?'#1d344c':'#282b2c';
 for(const row of frames['cable-street'])for(const [x,y,w,h] of row)g.fillRect(x,y+h*.28,w,h*.61);
 roleAtlases.set(role,c);return c;
}
art.drawActor=(g,ent,team='squad')=>{
 const barcelonaNPC=mission==='barcelona',streetNPC=mission==='cable-street'&&(team==='civilian'||ent.periodRole);
 if(!identities.missions[mission]||(!barcelonaNPC&&!streetNPC&&(team==='civilian'||ent.periodRole)&&ent.identityRole!=='squad'))return previous(g,ent,team);
 const v=art.pose(ent),s=descriptor(ent,team),dir=v.dir??0,moving=v.moving||/walk|run/.test(v.state),step=moving?Math.round((v.phase||0)/(Math.PI/4))%8:0;
 let atlas=(barcelonaNPC||ent.identityRole==='squad'||team==='squad'||streetNPC)?assets.get(mission+'/sprites'):null;
 if(barcelonaNPC&&team==='enemy'&&atlas)atlas=barcelonaEnemies||atlas;
 if(atlas&&streetNPC&&ent.identityRole!=='squad')atlas=ent.periodRole?roleAtlas(atlas,ent.periodRole):crowdAtlas(atlas,ent.variant);
 g.save();ellipse(g,ent.x,ent.y+2,9,3,'#17251f50');g.translate(ent.x,ent.y);
 if(v.state==='dead'||mission==='barcelona'&&ent.downed){if(s.enemyDetail)g.globalAlpha=.68;g.rotate((mission==='barcelona'&&ent.downed?1:Math.min(1,(v.death||0)/.24))*1.45);g.scale(1,.8);}
 else{const recoil=v.state==='fire'?1:0;g.translate(-Math.cos(v.facing||0)*recoil,(moving?Math.cos((v.phase||0)*2)*.45:0)-Math.sin(v.facing||0)*recoil);if(v.state==='hurt'||v.state==='stumble')g.rotate(.07);else if(mission==='barcelona'&&v.state==='run')g.rotate(Math.cos(v.facing||0)*.025);
  if((streetNPC||mission==='barcelona'&&team==='squad')&&v.state==='idle')g.translate(0,Math.sin((v.clock||0)*2+(ent.variant||0))*.16);}
 if(team==='enemy'&&s.enemyDetail&&v.state!=='dead'){
  if(v.state==='hurt'||ent.hitTimer>0){g.strokeStyle='#eee0b6';g.lineWidth=1.2;g.beginPath();g.ellipse(0,-21,12,18,0,0,Math.PI*2);g.stroke();}
 }
 if(atlas){
  const index=streetNPC&&ent.periodRole?(ent.periodRole==='police'?2:0):Math.abs(ent.variant||0)%4;
  if(barcelonaNPC){const slot=team==='enemy'?[0,2,0,2][index]:index,armed=!!s.weapon&&s.weapon!=='pistol',row=(armed?frames.barcelonaArmed:frames.barcelona)[slot],height=Math.max(...frames.barcelona[slot].map(f=>f[3]));paintedBody(g,atlas,mission,slot,dir,v.phase||0,moving,row,height);if(s.weapon==='pistol')weapon(g,s.weapon,Math.cos(dir*Math.PI/4)*8,-17,dir*Math.PI/4);if(team==='enemy'&&s.webbing)enemyGear(g,s,Math.sin(dir*Math.PI/4)<-.35);}else paintedBody(g,atlas,mission,index,dir,v.phase||0,moving);
  if(streetNPC&&ent.periodRole){
   hat(g,s,0,-39,.83);
   if(ent.periodRole==='police'&&Math.sin(dir*Math.PI/4)>=-.35){
    for(let y=-26;y<-13;y+=4)ellipse(g,.5,y,.55,.55,'#bac1b5');
    g.fillStyle='#202d38';g.fillRect(-5,-13,10,1.7);g.fillStyle='#aab2a4';g.fillRect(-.7,-13,1.4,1.7);
   }
  }
 }
 else{if(streetNPC)g.scale(.9,.9);if(mission==='barcelona')g.drawImage(sprite(s,dir,step),-24,-50,48,56);else g.drawImage(sprite(s,dir,step),-21.3,-48,42.67,53.33);}
 if((mission==='barcelona'||team==='enemy'&&s.enemyDetail)&&s.weapon&&v.state==='fire'){
  const angle=mission==='barcelona'?dir*Math.PI/4:Math.sin(dir*Math.PI/4)*.55+(Math.cos(dir*Math.PI/4)<0?Math.PI:0),length=/mg34|hotchkiss/.test(s.weapon)?21:/kar98|mauser/.test(s.weapon)?17:s.weapon==='pistol'?6:11;
  g.save();g.translate(Math.cos(dir*Math.PI/4)*4,-19);g.rotate(angle);path(g,[[length,-1],[length+5,-3],[length+3,0],[length+5,3],[length,1]],'#f6cf7c',null);g.restore();
 }
 g.restore();
};
art.missionPortrait=(key,index,state='idle')=>{const id=identities.get(key),slot=Math.abs(index)%4,s=id.characters[slot],k=id.key+'/'+index+'/'+state;if(portraits.has(k))return portraits.get(k);const c=canvas(144,144),g=c.getContext('2d'),atlas=assets.get(id.key+'/portraits'),barcelona=id.key==='barcelona'?assets.get('barcelona/sprites'):null;if(atlas){const w=atlas.naturalWidth/4,h=atlas.naturalHeight/3;g.drawImage(atlas,slot*w,sets[id.key].portraitRow*h,w,h,0,0,144,144);}else if(barcelona){const [sx,sy,sw,sh]=frames.barcelona[slot][2],cropH=Math.round(sh*.65),scale=Math.min(132/sw,132/cropH),w=sw*scale,h=cropH*scale;g.fillStyle='#536254';g.fillRect(0,0,144,144);g.drawImage(barcelona,sx,sy,sw,cropH,(144-w)/2,140-h,w,h);}else{g.fillStyle=shade(g,60,0,144,'#666c57');g.fillRect(0,0,144,144);g.save();g.translate(72,244);g.scale(4.7,4.7);body(g,s,2,0,true);g.restore();for(let i=0;i<80;i++){g.fillStyle=i%2?'#ead4a20a':'#1a271809';g.fillRect((i*37)%144,(i*53)%144,2,1);}}
 g.strokeStyle='#c9bfa2';g.lineWidth=5;g.strokeRect(2.5,2.5,139,139);if(state==='dead'){g.fillStyle='#202d2da0';g.fillRect(0,0,144,144);}portraits.set(k,c);return c;};
})();
