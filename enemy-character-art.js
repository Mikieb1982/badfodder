/* Authored enemy sprites share squad height, gait, facings and actor state. */
(function(){
'use strict';
const art=window.BadFodderArt,ids=window.BadFodderIdentities;
if(!art||!ids)return;
const paths={occupation:'assets/characters/enemies/occupation.webp',barcelona:'assets/characters/enemies/barcelona.webp','cable-street':'assets/characters/enemies/cable-street.webp'};
const sheets=new Map(),pending=new Map();
let mission='belzig';
const previousDraw=art.drawActor,previousSet=art.setMissionIdentity,previousPreload=art.preloadMissionArt;
const sheetFor=key=>key==='barcelona'||key==='cable-street'?key:'occupation';
function load(key){
 if(pending.has(key))return pending.get(key);
 const task=new Promise(resolve=>{
  const image=new Image();let done=false;
  const finish=ok=>{if(done)return;done=true;clearTimeout(timer);if(ok&&image.naturalWidth===2560&&image.naturalHeight===(key==='cable-street'?512:1024)){sheets.set(key,image);resolve(true)}else{pending.delete(key);resolve(false)}};
  const timer=setTimeout(()=>finish(false),4000);
  image.onload=()=>finish(true);image.onerror=()=>finish(false);
  image.src=window.BadFodderAssetUrl?.(paths[key])||paths[key];
 });pending.set(key,task);return task;
}
art.setMissionIdentity=key=>{mission=ids.get(key).key;previousSet?.(key)};
art.preloadMissionArt=async key=>{const id=ids.get(key).key;return Promise.all([previousPreload?.(key),load(sheetFor(id))])};
art.enemyArtStatus=key=>sheets.has(sheetFor(ids.get(key).key));
art.drawActor=(g,ent,team='squad')=>{
 const street=mission==='cable-street'&&(ent.periodRole==='police'||ent.periodRole==='march');
 if(ent.identityRole==='squad'||(!street&&(team!=='enemy'||mission==='cable-street')))return previousDraw(g,ent,team);
 const atlas=sheets.get(sheetFor(mission));if(!atlas)return previousDraw(g,ent,team);
 const v=art.pose(ent),dir=((v.dir||0)%8+8)%8,row=street?(ent.periodRole==='police'?0:1):Math.abs(ent.variant||0)%4;
 const moving=v.moving||v.state==='walk'||v.state==='run',phase=v.phase||0;
 const scale=43/192,sw=320,w=sw*scale,split=144,leg=48,stride=moving?Math.sin(phase)*1.25:0;
 const sx=dir*320,sy=row*256+64;
 g.save();g.fillStyle='#17251f50';g.beginPath();g.ellipse(ent.x,ent.y+2,9,3,0,0,Math.PI*2);g.fill();g.translate(ent.x,ent.y);
 if(v.state==='dead'||ent.downed){g.globalAlpha=.68;g.rotate(ent.downed?1.45:Math.min(1,(v.death||0)/.24)*1.45);g.scale(1,.8)}
 else{
  const recoil=v.state==='fire'?1:0;
  g.translate(-Math.cos(v.facing||0)*recoil,(moving?Math.cos(phase*2)*.45:0)-Math.sin(v.facing||0)*recoil);
  if(v.state==='hurt'||v.state==='stumble')g.rotate(.07);
  if(v.state==='idle')g.translate(0,Math.sin((v.clock||0)*2+(ent.variant||0))*.16);
 }
 // Independent legs use the same distance-based phase as the existing painted squad.
 g.drawImage(atlas,sx,sy,sw,split,-w/2,-43,w,split*scale);
 g.drawImage(atlas,sx,sy+split,160,leg,-w/2,-leg*scale+stride,160*scale,leg*scale);
 g.drawImage(atlas,sx+160,sy+split,160,leg,0,-leg*scale-stride,160*scale,leg*scale);
 if(v.state!=='dead'&&(v.state==='hurt'||ent.hitTimer>0)){
  g.strokeStyle='#eee0b6';g.lineWidth=1.2;g.beginPath();g.ellipse(0,-21,12,18,0,0,Math.PI*2);g.stroke();
 }
 if(!street&&v.state==='fire'){
  const s=ids.skin(mission,'enemy',row),angle=dir*Math.PI/4,length=/mg34|hotchkiss/.test(s.weapon)?21:s.weapon==='pistol'?6:/kar98|mauser/.test(s.weapon)?17:11;
  g.save();g.translate(Math.cos(angle)*4,-19);g.rotate(angle);g.fillStyle='#f6cf7c';g.beginPath();g.moveTo(length,-1);g.lineTo(length+5,-3);g.lineTo(length+3,0);g.lineTo(length+5,3);g.lineTo(length,1);g.fill();g.restore();
 }
 g.restore();
};
})();
