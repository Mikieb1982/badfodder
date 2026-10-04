/* Native two-peer session and lazy multiplayer UI. No simulation runs on the joiner. */
(function(root,factory){const api=factory(root);if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.BadFodderCoopSession=api;})(typeof window!=='undefined'?window:globalThis,function(root){
 'use strict';
 function peer({host=false,RTC=root.RTCPeerConnection,onControl=()=>{},onState=()=>{},onOpen=()=>{},onLost=()=>{},iceServers=[{urls:'stun:stun.l.google.com:19302'}]}={}){
  if(!RTC)throw new Error('DIRECT CONNECTION IS NOT SUPPORTED BY THIS BROWSER');
  const pc=new RTC({iceServers}),channels={},timers=new Set();let closing=false,opened=false;
  function bind(channel){if(!['control','state'].includes(channel.label)){channel.close();return;}channels[channel.label]=channel;channel.onmessage=e=>(channel.label==='control'?onControl:onState)(e.data);channel.onopen=()=>{if(!opened&&channels.control?.readyState==='open'&&channels.state?.readyState==='open'){opened=true;onOpen();}};channel.onclose=()=>lost();}
  function lost(){if(!closing){closing=true;onLost();}}
  pc.ondatachannel=e=>bind(e.channel);
  pc.onconnectionstatechange=()=>{if(['failed','closed'].includes(pc.connectionState))lost();if(pc.connectionState==='disconnected'){const t=setTimeout(()=>{timers.delete(t);if(pc.connectionState==='disconnected')lost();},4000);timers.add(t);}};
  if(host){bind(pc.createDataChannel('control',{ordered:true}));bind(pc.createDataChannel('state',{ordered:false,maxRetransmits:0}));}
  async function description(type){await pc.setLocalDescription(await (type==='offer'?pc.createOffer():pc.createAnswer()));if(pc.iceGatheringState!=='complete')await new Promise(resolve=>{const t=setTimeout(done,8000);function done(){clearTimeout(t);pc.removeEventListener('icegatheringstatechange',change);resolve();}function change(){if(pc.iceGatheringState==='complete')done();}pc.addEventListener('icegatheringstatechange',change);});return {type:pc.localDescription.type,sdp:pc.localDescription.sdp};}
  function send(label,raw){const ch=channels[label];if(!ch||ch.readyState!=='open'||ch.bufferedAmount>131072)return false;try{ch.send(raw);return true;}catch{return false;}}
  return {offer:()=>description('offer'),async answer(offer){await pc.setRemoteDescription(offer);return description('answer');},accept:answer=>pc.setRemoteDescription(answer),sendControl:raw=>send('control',raw),sendState:raw=>send('state',raw),close(){closing=true;for(const t of timers)clearTimeout(t);Object.values(channels).forEach(c=>c.close());pc.close();},get connected(){return opened&&!closing}};
 }
 const manual={
  encode(value){return root.btoa(unescape(encodeURIComponent(JSON.stringify(value))));},
  decode(text){if(typeof text!=='string'||text.length>70000)throw new Error('INVALID CONNECTION CODE');const v=JSON.parse(decodeURIComponent(escape(root.atob(text.trim()))));if(v.v!==1||!['bad-belzig','wigan'].includes(v.mission)||!['offer','answer'].includes(v.sdp?.type)||typeof v.sdp.sdp!=='string'||v.sdp.sdp.length>50000||!Number.isFinite(v.expires)||v.expires<Date.now()||v.expires>Date.now()+900000)throw new Error('INVALID OR EXPIRED CONNECTION CODE');return v;}
 };
 if(!root.document)return {peer,manual};
 const P=root.BadFodderCoopProtocol,C=root.BadFodderCommands,B=root.BadFodderCoopBridge,S=root.BadFodderCoopSignalling;
 let connection=null,signalling=null,mode='local',ready=false,seq=0,lastSeq=-1,nextSnapshot=0,lastSeen=0,connectTimer=0,pollTimer=0,heartbeat=0,lastPing=0,room='',started=false,generation=0,awaitingReady=false;
 let target=null,current=null,stick={units:[],x:0,y:0,at:0},localStick=null,lastStick=0,lastFire=0,remoteLimit=P.limiter(),panel=null,statusEl=null,retry=null;
 const now=()=>performance.now();
 function status(text){if(statusEl)statusEl.textContent=text;if(panel&&by('coopRetry'))by('coopRetry').hidden=!/COULD NOT|UNAVAILABLE|NOT CONFIGURED|DISCONNECTED/.test(text);B.status(text);}
 function send(packet,reliable=true){try{return connection?.[reliable?'sendControl':'sendState'](P.encode(packet))||false;}catch{return false;}}
 function stopTransport(){generation++;clearTimeout(connectTimer);clearInterval(pollTimer);clearInterval(heartbeat);connection?.close();connection=null;void signalling?.cleanup();signalling=null;ready=false;started=false;awaitingReady=false;stick={units:[],x:0,y:0,at:0};localStick=null;target=current=null;}
 function leave(){stopTransport();mode='local';C.configure();panel?.remove();panel=null;}
 function lost(){const previous=mode;stopTransport();status(previous==='host'?'PLAYER 2 DISCONNECTED':'HOST DISCONNECTED');if(previous==='host'){ready=true;started=true;B.disconnect(1);}else{mode='local';B.disconnect(0);status('HOST DISCONNECTED');}}
 function connectingTimeout(){clearTimeout(connectTimer);const gen=generation;connectTimer=setTimeout(()=>{if(gen!==generation||connection?.connected)return;stopTransport();mode='local';C.configure();status('DIRECT CONNECTION COULD NOT BE ESTABLISHED. TRY AGAIN or RETURN TO MENU.');},25000);}
 function makePeer(host){stopTransport();const gen=generation;mode=host?'host':'client';remoteLimit=P.limiter();seq=0;lastSeq=-1;nextSnapshot=0;
  connection=peer({host,onControl:raw=>{if(gen===generation)control(raw);},onState:raw=>{if(gen===generation)receive(raw);},onOpen:()=>{if(gen!==generation)return;clearTimeout(connectTimer);clearInterval(pollTimer);lastSeen=now();status('PLAYER 2 CONNECTED');
   heartbeat=setInterval(()=>{if(started&&now()-lastSeen>12000){lost();return;}if(now()-lastPing>1000){lastPing=now();send({t:'ping',v:1});}if(mode==='host'&&ready)flush();},100);
   if(host)send({t:'hello',v:1,mission:B.map()});
  },onLost:()=>{if(gen===generation)lost();}});
  connectTimer=setTimeout(()=>{if(gen!==generation)return;stopTransport();mode='local';C.configure();status('DIRECT CONNECTION COULD NOT BE ESTABLISHED. TRY AGAIN or RETURN TO MENU.');},900000);
  return connection;
 }
 async function run(){const gen=generation;status('STARTING MISSION');C.configure(mode,command);try{await B.start(mode);if(gen!==generation)return;started=true;ready=true;lastSeen=now();panel.hidden=true;panel.style.display='none';if(mode==='client')send({t:'ready',v:1});else{send({t:'start',v:1});flush(true);}void signalling?.cleanup();}catch(e){lost();status(e.message);}}
 async function control(raw){const p=P.parse(raw);if(!p||p.v!==1)return;lastSeen=now();
  if(p.t==='ping')return;
  if(p.t==='hello'&&mode==='client'&&p.mission===B.map()&&!started&&!awaitingReady){awaitingReady=true;await run();return;}
  if(p.t==='ready'&&mode==='host'&&!started&&!awaitingReady){awaitingReady=true;await run();return;}
  if(p.t==='start'&&mode==='client'){ready=true;return;}
  if(p.t==='restart'&&mode==='client'&&started){ready=false;target=current=null;lastSeq=-1;await run();return;}
  if(p.t==='command'&&mode==='host'&&ready&&remoteLimit(now()))acceptCommand(p.c,1);
  if(p.t==='state'&&mode==='client')receive(raw);
 }
 function acceptCommand(c,player){if(!P.validCommand(c,{player,squad:B.squad(),active:B.active(),...B.size()}))return false;
  if(c.type==='stick'){if(player===1)stick={...c,at:now()};return true;}
  if(['move','garrison','release','grenade'].includes(c.type)){if(player===1)stick={units:[],x:0,y:0,at:0};else localStick=null;}
  B.execute(c);flush(['grenade','garrison','release'].includes(c.type));return true;
 }
 function command(c,local=false){if(!ready)return false;if(local)return acceptCommand(c,0);
  const t=now();if(c.type==='fire'){if(t-lastFire<80)return false;lastFire=t;}
  return send({v:1,t:'command',c});
 }
 function joystick(touch){const units=C.units(B.squad(),'all').filter(s=>s.selected).map(s=>B.squad().indexOf(s)),x=touch.moveX||0,y=touch.moveY||0;
  if(mode==='host'){localStick={units,x,y};return;}
  if(now()-lastStick<80)return;lastStick=now();command({type:'stick',units,x,y});
 }
 function releaseStick(){localStick=null;if(mode==='client'&&ready){const units=C.units(B.squad(),'all').map(s=>B.squad().indexOf(s));if(units.length)command({type:'stick',units,x:0,y:0});}}
 function remoteStep(dt){if(mode!=='host'||!ready||!B.active())return;if(localStick)B.stick(localStick.units,localStick.x,localStick.y,dt);if(now()-stick.at<300)B.stick(stick.units,stick.x,stick.y,dt);}
 function garrison(){const units=B.squad().map((s,i)=>s.alive&&s.selected&&C.owns(i)?i:-1).filter(i=>i>=0);if(units.length!==1){status('Select one soldier to garrison.');return false;}command({type:B.squad()[units[0]].manualGarrison?'release':'garrison',units},mode==='host');return true;}
 function flush(force=false){if(mode!=='host'||!ready||!connection?.connected)return;const t=now();if(!force&&t<nextSnapshot)return;nextSnapshot=t+100;const packet=P.snapshot(B.capture(),seq++);send(packet,force||packet.done);}
 function receive(raw){if(mode!=='client'||!started)return;const p=P.parse(raw);if(!p||p.seq<=lastSeq)return;const state=P.readSnapshot(p);if(!state)return;lastSeen=now();lastSeq=p.seq;target=state;
  if(!current){current=state;}else{for(const key of ['squad','enemies','civilians'])for(let i=0;i<state[key].length;i++){const old=current[key][i];if(old&&state[key][i].alive){state[key][i]._fromX=(old._fromX??old.x);state[key][i]._fromY=(old._fromY??old.y);}}current=state;}
  B.receive(current);
 }
 function clientFrame(dt){if(mode!=='client'||!started)return;
  if(target){const k=1-Math.exp(-dt*24);for(const key of ['squad','enemies','civilians'])for(const e of current[key])if(e.alive&&Number.isFinite(e._fromX)){e._fromX+=(e.x-e._fromX)*k;e._fromY+=(e.y-e._fromY)*k;}}
  // Renderer receives interpolated positions; authoritative target positions remain separate.
  if(current){const state={...current};for(const key of ['squad','enemies','civilians'])state[key]=current[key].map(e=>({...e,x:e._fromX??e.x,y:e._fromY??e.y}));B.receive(state,false);}
  B.frame(dt);
 }
 function restart(){if(mode!=='host'){status('PLAYER 1 STARTS THE NEXT ATTEMPT');return;}ready=false;send({t:'restart',v:1});started=false;awaitingReady=false;void run();}
 function by(id){return panel.querySelector('#'+id);}
 async function host(manualMode=false){
  retry=()=>host(manualMode);
  const mission=by('coopMission').value;if(!B.choose(mission,{action:'host',manual:manualMode}))return;
  let pc,gen;try{pc=makePeer(true);gen=generation;status('CREATING ROOM...');
   const offer=await pc.offer();if(gen!==generation)return;
   const value={v:1,mission,expires:Date.now()+S.TTL,sdp:offer};
   by('coopOutgoing').value=manual.encode(value);by('coopManualFields').hidden=!manualMode;
   if(manualMode){status('SEND CONNECTION CODE TO PLAYER 2. Paste their reply below.');return;}
   const signal=S.create();signalling=signal;const created=await signal.createRoom(mission,offer);if(gen!==generation){await signal.cleanup();return;}room=created;
   status('ROOM: '+room+' · WAITING FOR PLAYER 2');by('coopRoom').value=room;
   pollTimer=setInterval(async()=>{try{const data=await signal.read(created);if(gen!==generation)return;if(data.answer){clearInterval(pollTimer);await pc.accept(data.answer);connectingTimeout();status('CONNECTING...');}}catch(e){if(gen===generation){clearInterval(pollTimer);status(e.message);}}},1200);
  }catch(e){if(gen===undefined||gen===generation){by('coopManualFields').hidden=false;status(e.message);}}
 }
 async function join(code){
  retry=()=>join(code);
  status('FINDING ROOM...');const requestGen=generation,signal=S.create();try{
   await signal.initialise();const data=await signal.read(code.toUpperCase().trim());if(requestGen!==generation)return;
   if(!B.choose(data.mission,{action:'join',room:code})){void signal.cleanup();return;}
   await signal.joinRoom(code.toUpperCase().trim());if(requestGen!==generation)return;const pc=makePeer(false),gen=generation;signalling=signal;status('CONNECTING...');const answer=await pc.answer(data.offer);if(gen!==generation)return;await signal.answer(answer);connectingTimeout();
  }catch(e){if(requestGen===generation&&panel){status(e.message);by('coopManualFields').hidden=false;}}
 }
 async function applyManual(){try{const value=manual.decode(by('coopIncoming').value);
  if(value.sdp.type==='offer'){
   if(!B.choose(value.mission,{action:'manual',code:by('coopIncoming').value}))return;
   const pc=makePeer(false),gen=generation,answer=await pc.answer(value.sdp);if(gen!==generation)return;by('coopOutgoing').value=manual.encode({...value,sdp:answer});status('SEND REPLY CODE TO PLAYER 1');
  }else{if(mode!=='host'||!connection||value.mission!==B.map())throw new Error('HOST A GAME FIRST');await connection.accept(value.sdp);connectingTimeout();status('CONNECTING...');}
 }catch(e){status(e.message);}}
 function open(){
  if(started){B.menu();}
  if(panel){panel.hidden=false;panel.style.display='flex';return;}
  panel=root.document.createElement('section');panel.id='coopPanel';panel.setAttribute('role','dialog');panel.setAttribute('aria-label','Multiplayer');panel.style.cssText='position:absolute;inset:0;z-index:30;background:#19201ef5;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:16px;overflow:auto;color:#ece5cf;gap:10px;font:14px system-ui';
  panel.innerHTML=`<h2 style="margin:0">MULTIPLAYER</h2><div>2 PLAYERS · 2 SOLDIERS EACH</div><label>MISSION <select id="coopMission"><option value="bad-belzig">Bad Belzig</option><option value="wigan">Wigan</option></select></label><div><button id="coopHost" class="menu-button">HOST GAME</button><button id="coopJoin" class="menu-button">JOIN GAME</button></div><label>ROOM CODE <input id="coopRoom" autocomplete="off" maxlength="32" placeholder="RABBIT-..." style="width:220px"></label><p id="coopStatus" role="status" style="max-width:520px;text-align:center;margin:0;min-height:38px"></p><button id="coopRetry" class="menu-button" hidden>TRY AGAIN</button><button id="coopManual" class="menu-button">MANUAL CONNECTION</button><div id="coopManualFields" hidden style="max-width:520px;width:100%"><small>Host sends a connection code. Joiner pastes it and sends the reply back.</small><button id="coopManualHost" class="menu-button">CREATE CONNECTION CODE</button><label style="display:block">SEND THIS CODE<textarea id="coopOutgoing" readonly style="width:100%;height:48px"></textarea></label><label style="display:block">PASTE RECEIVED CODE<textarea id="coopIncoming" style="width:100%;height:48px"></textarea></label><button id="coopApply" class="menu-button">CONNECT WITH CODE</button></div><button id="coopReturn" class="menu-button">RETURN TO MENU</button>`;
  root.document.querySelector('.viewport').appendChild(panel);statusEl=by('coopStatus');by('coopMission').value=['bad-belzig','wigan'].includes(B.map())?B.map():'bad-belzig';
  by('coopRetry').onclick=()=>retry?.();by('coopHost').onclick=()=>host();by('coopJoin').onclick=()=>join(by('coopRoom').value);by('coopManual').onclick=()=>{by('coopManualFields').hidden=false;status('Use a manual connection when room codes are unavailable.');};by('coopManualHost').onclick=()=>host(true);by('coopApply').onclick=applyManual;by('coopReturn').onclick=()=>B.menu();
  let resume=null;try{resume=JSON.parse(root.sessionStorage.getItem('badfodder.coop.resume')||'null');}catch{}root.sessionStorage.removeItem('badfodder.coop.resume');if(resume?.action==='host')void host(!!resume.manual);if(resume?.action==='join'){by('coopRoom').value=resume.room;void join(resume.room);}if(resume?.action==='manual'){by('coopManualFields').hidden=false;by('coopIncoming').value=resume.code;void applyManual();}
 }
 root.BadFodderCoop={open,leave,command,joystick,releaseStick,remoteStep,clientFrame,garrison,flush,restart,peer,manual,get mode(){return mode}};
 root.addEventListener('pagehide',()=>{stopTransport();});
 return {peer,manual};
});
