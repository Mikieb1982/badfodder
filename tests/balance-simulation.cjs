'use strict';
const assert=require('node:assert/strict');
const Sim=require('../tools/balance/simulation-agent.cjs'),Report=require('../tools/balance/report.cjs');
const supported=Sim.supportedMissions();
assert.deepEqual(supported,['bad-belzig','wigan','cable-street','barcelona-1936']);
for(const id of supported){const info=Sim.inspectMission(id);assert.equal(info.id,id);assert(info.mapReady);assert(info.phases>0)}
const a=Sim.simulateMission({mission:'bad-belzig',seed:'balance-deterministic',maxSeconds:240}),b=Sim.simulateMission({mission:'bad-belzig',seed:'balance-deterministic',maxSeconds:240});
assert.deepEqual(a,b,'Same seed must produce identical results');
const c=Sim.simulateMission({mission:'bad-belzig',seed:'balance-variation',maxSeconds:240});assert.notEqual(c.skillFactor,a.skillFactor,'Different seeds should alter deterministic agent variation');
const safe=Sim.simulateMission({mission:'wigan',seed:'safe-stop',maxSeconds:1});assert(safe.durationSeconds<=1.02);assert.equal(safe.failureReason,'timeout');
const smoke=supported.map((mission,i)=>Sim.simulateMission({mission,seed:'smoke-'+i,maxSeconds:240}));
for(const run of smoke){for(const key of ['victory','durationSeconds','objectiveReached','squad','civilians','enemiesDefeated','ammo','grenades','director','peakActiveEnemies','timeInCombatSeconds','idleSeconds','failureReason'])assert(Object.hasOwn(run,key),run.missionId+' missing '+key)}
const report=Report.buildReport(smoke,{seed:'smoke',difficulty:'standard'});
assert.equal(Object.keys(report.missions).length,4);
for(const summary of Object.values(report.missions)){for(const key of ['completionRate','medianDurationSeconds','p10DurationSeconds','p90DurationSeconds','averageCasualties','timeoutRate','objectiveFailures','flags'])assert(Object.hasOwn(summary,key),summary.missionId+' report missing '+key)}
console.log('PASS: deterministic seeded balance simulation, safe termination, all four mission initializers and required aggregate metrics.');
