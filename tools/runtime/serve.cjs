'use strict';
const fs=require('node:fs'),http=require('node:http'),path=require('node:path');
const root=path.resolve(__dirname,'../../dist'),port=Number(process.env.PORT||4173);
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.webp':'image/webp','.mp3':'audio/mpeg','.webm':'audio/webm','.json':'application/json','.webmanifest':'application/manifest+json','.ico':'image/x-icon'};
const injection=`function __visualBelzigScene(name){
 if(MAP_DATA.key!=='bad-belzig')return false;
 const at=p=>({x:S(p.x),y:S(p.y)}),spread=(point,state='idle')=>{squad.forEach((u,i)=>{u.x=point.x+(i%2)*24;u.y=point.y+Math.floor(i/2)*24;u.path=null;u.pendingPath=null;u.state=state;u.phase=i*.8;u.fireTimer=0;u.hitTimer=0;u.suppression=0;u.downed=false;u.alive=true;u.hp=u.maxHp||3;u.healthState='FIT';u.manualGarrison=false;u.checkpointCover=false;u.checkpointGarrison=null;u.checkpointHeld=null;u.checkpointFortified=false;u.checkpointFortificationRearLead=false;u.checkpointFortificationFrontLead=false;u.selected=i===0;})},focus=point=>{camera.x=point.x-VIEW_W/(2*zoom);camera.y=point.y-VIEW_H/(2*zoom);clampCamera()},quiet=()=>{for(const e of enemies){e.missionDormant=true;e.fireTimer=0;e.hitTimer=0;e.suppression=0}},wake=(ids,point)=>{ids.forEach((id,n)=>{const e=enemies[id];if(!e)return;e.alive=true;e.missionDormant=false;e.x=point.x+90+(n%3)*35;e.y=point.y-55+Math.floor(n/3)*42;e.dir=Math.PI;e.state=n%2?'fire':'idle';e.fireTimer=n%2?.1:0;e.hitTimer=n===0?.12:0;e.suppression=n===2?.62:0})},label=(stage,title,instruction='')=>{updateHud(true);hudStage.textContent=stage;hudMission.textContent=title;const instructionEl=document.getElementById('hudInstruction');if(instructionEl){instructionEl.hidden=!instruction;instructionEl.textContent=instruction}if(statusEl)statusEl.textContent=''};
 if(name==='opening'){updateHud(true);drawWorld();return true}
 badBelzigRuntime=null;quiet();finished=false;win=false;
 if(name==='movement'){
  const p=at({x:850,y:1210});spread(p,'walk');squad.forEach((u,i)=>{u.moving=true;u.phase=.75+i*.55;u.dir=-Math.PI*.7});focus(p);label('BELZIG','MOVE INTO TOWN','Keep the group together and use cover.');
 }else if(name==='first-firefight'){
  const p=at(MAP_DATA.pois.postcolumn);spread({x:p.x-65,y:p.y+72},'fire');squad[0].fireTimer=.11;squad[1].hitTimer=.11;squad[2].suppression=.58;wake([0,1,2],p);focus(p);label('FIRST CONTACT','CLEAR THE POST','The civilian route is blocked.');
 }else if(name==='checkpoint-garrison'){
  const p=at(MAP_DATA.pois.postcolumn),r=38;spread(p,'idle');squad.forEach((u,i)=>{const a=-Math.PI/2+i*Math.PI/2;u.x=p.x+Math.cos(a)*17;u.y=p.y+Math.sin(a)*17;u.dir=a;u.checkpointGarrison=0;u.checkpointHeld=0;u.checkpointCover=true;u.checkpointFortified=true;u.checkpointFacing=a;u.checkpointCenterX=p.x;u.checkpointCenterY=p.y;u.checkpointSandbagRadius=r;u.checkpointFortificationPhase=0;u.checkpointFortificationRearLead=i===0;u.checkpointFortificationFrontLead=i===2});wake([0,1,2],{x:p.x+25,y:p.y-85});focus(p);label('CHECKPOINT','HOLD THE POST','Keep the civilian route open.');
 }else if(name==='wounded-down'){
  const p=at({x:690,y:760});spread(p,'idle');squad[0].hp=Math.max(1,Math.ceil((squad[0].maxHp||3)*.65));squad[0].healthState='WOUNDED';squad[1].hp=1;squad[1].healthState='BADLY_WOUNDED';squad[2].hp=0;squad[2].downed=true;squad[2].healthState='DOWN';squad[2].state='hurt';squad[3].suppression=.78;focus(p);label('SQUAD UNDER PRESSURE','STABILISE THE DOWNED VOLUNTEER','Do not leave the casualty exposed.');
 }else if(name==='town-centre'){
  const p=at(MAP_DATA.pois.rathaus);spread({x:p.x-55,y:p.y+70},'fire');squad[0].fireTimer=.1;squad[1].suppression=.54;wake([8,9,10,11,12],p);focus(p);label('TOWN CENTRE','HOLD THE RATHAUS','Pressure is building from several streets.');
 }else if(name==='burg-final'){
  const p=at(MAP_DATA.pois.castle);spread({x:p.x-45,y:p.y+80},'idle');squad[0].manualGarrison=true;squad[0].garrisonAnchorX=squad[0].x;squad[0].garrisonAnchorY=squad[0].y;wake([3,4,5,6],p);focus(p);label('BURG EISENHARDT','SEARCH THE COMMAND POST','Secure the position and find the orders.');
 }else if(name==='completion'){
  const p=at(MAP_DATA.pois.rathaus);spread(p,'idle');focus(p);updateHud(true);finished=true;win=true;showMissionResult();return true;
 }else return false;
 drawWorld();return true;
}
window.__visual={freeze:()=>{resetGame();BadFodderRuntime.fixedFrame=()=>0;paused=false;menuOpen=false;menu.close();syncTouchControlState();updateHud(true);drawWorld();},scene:__visualBelzigScene,state:()=>({started,menuOpen,map:MAP_DATA.key,faults:runtimeFaultCount,actors:squad.length})};`;
http.createServer((req,res)=>{try{const name=new URL(req.url,'http://local').pathname,file=path.resolve(root,'.'+(name==='/'?'/index.html':decodeURIComponent(name)));if(!file.startsWith(root+path.sep))throw Error('path');let data=fs.readFileSync(file);if(process.env.BADFODDER_VISUAL==='1'&&file.endsWith('index.html'))data=Buffer.from(data.toString().replace('  // BOOT_MISSION:',injection+'\n  // BOOT_MISSION:'));res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.end(data)}catch{res.writeHead(404);res.end();}}).listen(port,'127.0.0.1');
