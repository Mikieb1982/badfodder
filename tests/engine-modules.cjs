'use strict';
const assert=require('node:assert/strict');
const Runtime=require('../runtime-services');
const Simulation=require('../simulation-runtime');
const Mission=require('../mission-controller');
const Hud=require('../hud-controller');
const calls=[];const mark=name=>()=>calls.push(name);
global.window={BadFodderHealth:{fixedUpdate:mark('health')},BadFodderCoop:{remoteStep:mark('remote'),clientFrame:mark('client')}};
global.requestAnimationFrame=mark('schedule');global.BadFodderRuntime=Runtime;
const env={commands:{mode:'local'},started:true,finished:false,menuOpen:false,paused:false,mapOpen:false,runtimeSafeStop:false,
 FIXED_DT:1/60,MAX_CATCHUP_STEPS:5,last:0,simulationAccumulator:0,runtimeFaultCount:0,runtimeFaultTotal:0,runtimeFaultAt:0,
 diagnostics:{enabled:false,steps:()=>{},rememberFault:mark('fault')},runAdaptive:fn=>fn(),adaptiveDirector:{update:mark('director')},
 actionAllowed:()=>false,keyboardFireHeld:false,touchState:{},squad:[],enemies:[],civilians:[],art:{animate:()=>{}},
 tacticsRuntime:{fixedUpdate:mark('tactics')},enemyBehaviour:{fixedUpdate:mark('behaviour')},
 lifecycle:{transition:mark('recovery')},setStatus:()=>{},syncTouchControlState:()=>{},releaseInterruptedInput:mark('release'),
 applyTouchMovement:mark('input'),updateSquad:mark('squad'),processEnemyPathQueue:mark('paths'),updateEnemies:mark('enemies'),updateCivilians:mark('civilians'),updateProjectiles:mark('projectiles'),updateCamera:mark('camera'),checkFailure:mark('failure'),updateMissionProgress:mark('objectives'),updateHud:mark('hud'),drawWorld:mark('draw')};
const sim=Simulation.create(env);
sim.simulateStep(1/60);
assert.deepEqual(calls,['tactics','behaviour','remote','director','input','squad','health','paths','enemies','civilians','projectiles','camera','failure','objectives','hud']);
env.badBelzigRuntime={};env.squad=[{touchMoveSpeed:205}];sim.simulateStep(1/60);assert.equal(env.squad[0].touchMoveSpeed,0,'Stopped or expired sticks cannot prevent cover re-entry');env.badBelzigRuntime=null;env.squad=[];
calls.length=0;env.commands.mode='client';sim.simulateStep(1/60);assert.deepEqual(calls,[]);sim.tick(20);assert.deepEqual(calls,['schedule','input','client','draw']);assert.equal(env.simulationAccumulator,0);
calls.length=0;env.commands.mode='local';env.paused=true;sim.tick(40);assert.deepEqual(calls,['schedule','draw']);
calls.length=0;env.commands.mode='host';sim.tick(60);assert(calls.includes('objectives'),'Host simulation continues while paused');
calls.length=0;env.runtimeSafeStop=true;sim.tick(80);assert.deepEqual(calls,['schedule']);env.runtimeSafeStop=false;
const oldError=console.error;console.error=()=>{};
try{env.drawWorld=()=>{throw Error('draw failure')};env.commands.mode='client';for(let i=1;i<=3;i++)sim.tick(80+i*20);assert.equal(env.runtimeFaultCount,3);assert.equal(env.simulationAccumulator,0);assert(calls.includes('recovery'));}finally{console.error=oldError;}
let title='';const hudEnv={statusEl:{textContent:''},hudMission:{textContent:''},hudNotice:{textContent:'',classList:{add:()=>{},contains:()=>true,remove:()=>title='expired'}},hudNoticeUntil:0};const hud=Hud.create(hudEnv);hud.setStatus('Phase 1: Hold');assert.equal(hudEnv.hudMission.textContent,'Hold');hud.setStatus('Reload');assert(hudEnv.hudNoticeUntil>0);hud.updateHudNotice(hudEnv.hudNoticeUntil);assert.equal(title,'expired');
const state={started:true,finished:false,runtimeSafeStop:false,squad:[{alive:true}],missionController:null,missionLaunch:{isCampaign:()=>false}};const mission=Mission.create(state);assert(mission.canResumeMission());state.squad=[{alive:false}];assert(!mission.canResumeMission(),'Restarted/replaced state is read live');state.squad=[{alive:true}];state.runtimeSafeStop=true;assert(!mission.canResumeMission());assert(!mission.hasPlayableNextMission());
console.log('PASS: extracted update order, client/host/pause gates, frame rescheduling, fault recovery, HUD expiry and live mission state.');
const html=require('node:fs').readFileSync(require.resolve('../index.html'),'utf8');
for(const [file,name,api] of [['simulation-runtime','simulation',Simulation],['mission-controller','mission',Mission],['hud-controller','hud',Hud]]){
 assert(html.includes('<script src="'+file+'.js"></script>'),file+' is not loaded');
 for(const key of Object.keys(api.create({})))assert(html.includes('function '+key+'(...args){return '+name+'Engine.'+key+'(...args);}'),key+' compatibility adapter is missing');
}
