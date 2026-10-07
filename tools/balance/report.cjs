'use strict';
const THRESHOLDS=Object.freeze({lowCompletion:.30,highCompletion:.95,timeoutRate:.10,objectiveFailureRate:.30,averageCasualties:2.25,idleRatio:.35,repeatedDirectorShare:.65,ammoStarvationRate:.30,civilianLossRate:.35,civilianRescueRate:.65});
function quantile(values,p){if(!values.length)return null;const a=[...values].sort((x,y)=>x-y),i=(a.length-1)*p,lo=Math.floor(i),hi=Math.ceil(i);return lo===hi?a[lo]:a[lo]+(a[hi]-a[lo])*(i-lo)}
function median(values){return quantile(values,.5)}
function mean(values){return values.length?values.reduce((a,b)=>a+b,0)/values.length:null}
function round(value,digits=3){return value==null?null:+value.toFixed(digits)}
function frequency(values){const out={};for(const value of values)out[value]=(out[value]||0)+1;return out}
function flagsFor(summary,runs,thresholds=THRESHOLDS){
 const flags=[];
 if(summary.completionRate<thresholds.lowCompletion)flags.push({code:'LOW_COMPLETION',message:'Completion rate below '+Math.round(thresholds.lowCompletion*100)+'%.'});
 if(summary.completionRate>thresholds.highCompletion)flags.push({code:'HIGH_COMPLETION',message:'Completion rate above '+Math.round(thresholds.highCompletion*100)+'%.'});
 if(summary.timeoutRate>=thresholds.timeoutRate)flags.push({code:'TIMEOUTS',message:'Timeout rate is '+Math.round(summary.timeoutRate*100)+'%.'});
 const failures=frequency(runs.filter(r=>!r.victory).map(r=>r.objectiveReached||'unknown')),failed=runs.filter(r=>!r.victory).length;
 for(const [objective,count] of Object.entries(failures))if(failed&&count/failed>=thresholds.objectiveFailureRate)flags.push({code:'OBJECTIVE_FAILURE_SPIKE',objective,message:objective+' accounts for '+Math.round(count/failed*100)+'% of failures.'});
 if(summary.averageCasualties>=thresholds.averageCasualties)flags.push({code:'CASUALTY_SPIKE',message:'Average squad casualties are '+summary.averageCasualties+'.'});
 if(summary.averageIdleRatio>=thresholds.idleRatio)flags.push({code:'LONG_INACTIVITY',message:'Average inactive time is '+Math.round(summary.averageIdleRatio*100)+'% of mission duration.'});
 if(summary.ammoStarvationRate>=thresholds.ammoStarvationRate)flags.push({code:'AMMO_STARVATION',message:'Ammo starvation occurred in '+Math.round(summary.ammoStarvationRate*100)+'% of runs.'});
 if(summary.civilianLossRate!=null&&summary.civilianLossRate>=thresholds.civilianLossRate)flags.push({code:'CIVILIAN_LOSSES',message:'Average civilian loss rate is '+Math.round(summary.civilianLossRate*100)+'%.'});
 if(summary.civilianRescueRate!=null&&summary.civilianRescueRate<thresholds.civilianRescueRate)flags.push({code:'CIVILIAN_RESCUE_FAILURE',message:'Only '+Math.round(summary.civilianRescueRate*100)+'% of discovered civilians reach safety.'});
 const actions=runs.flatMap(r=>r.director?.actions||[]).map(a=>a.action),counts=frequency(actions),total=actions.length;
 if(total>=4){const [action,count]=Object.entries(counts).sort((a,b)=>b[1]-a[1])[0]||[];if(count/total>=thresholds.repeatedDirectorShare)flags.push({code:'REPEATED_DIRECTOR_ACTION',action,message:(action||'One Director action')+' represents '+Math.round(count/total*100)+'% of Director decisions.'})}
 if(summary.timeoutRate>=.5){const timed=runs.filter(r=>r.failureReason==='timeout'),objectives=frequency(timed.map(r=>r.objectiveReached||'unknown')),top=Object.entries(objectives).sort((a,b)=>b[1]-a[1])[0];if(top&&top[1]/timed.length>=.5)flags.push({code:'POSSIBLY_UNREACHABLE_OBJECTIVE',objective:top[0],message:'Timeouts repeatedly stop at '+top[0]+'.'})}
 return flags;
}
function summarizeMission(runs,thresholds=THRESHOLDS){
 if(!runs.length)throw new Error('Cannot summarize zero runs.');
 const victories=runs.filter(r=>r.victory).length,durations=runs.map(r=>r.durationSeconds),found=runs.reduce((n,r)=>n+(r.civilians?.found||0),0),rescued=runs.reduce((n,r)=>n+(r.civilians?.rescued||0),0),lost=runs.reduce((n,r)=>n+(r.civilians?.lost||0),0),failureCounts=frequency(runs.filter(r=>!r.victory).map(r=>r.objectiveReached||'unknown'));
 const summary={missionId:runs[0].missionId,runs:runs.length,completionRate:round(victories/runs.length,4),medianDurationSeconds:round(median(durations)),p10DurationSeconds:round(quantile(durations,.1)),p90DurationSeconds:round(quantile(durations,.9)),averageCasualties:round(mean(runs.map(r=>r.squad?.casualties||0))),averageSurvivors:round(mean(runs.map(r=>r.squad?.survivors||0))),averageCivilianLosses:round(mean(runs.map(r=>r.civilians?.lost||0))),civilianLossRate:found?round(lost/found,4):null,civilianRescueRate:found?round(rescued/found,4):null,timeoutRate:round(runs.filter(r=>r.failureReason==='timeout').length/runs.length,4),stallRate:round(runs.filter(r=>(r.stalls||0)>0).length/runs.length,4),averageIdleRatio:round(mean(runs.map(r=>r.idleRatio||0)),4),ammoStarvationRate:round(runs.filter(r=>r.ammo?.starved).length/runs.length,4),averagePeakEnemies:round(mean(runs.map(r=>r.peakActiveEnemies||0))),averageDirectorDecisions:round(mean(runs.map(r=>r.director?.decisions||0))),objectiveFailures:failureCounts,objectiveFailureRates:Object.fromEntries(Object.entries(failureCounts).map(([id,count])=>[id,round(count/runs.length,4)]))};
 summary.flags=flagsFor(summary,runs,thresholds);return summary;
}
function buildReport(runs,{thresholds=THRESHOLDS,seed=null,difficulty=null}={}){const grouped={};for(const run of runs)(grouped[run.missionId]||(grouped[run.missionId]=[])).push(run);return{schemaVersion:1,seed:seed==null?null:String(seed),difficulty,thresholds:{...thresholds},missions:Object.fromEntries(Object.entries(grouped).map(([id,rows])=>[id,summarizeMission(rows,thresholds)])),runs}}
function formatDuration(seconds){if(seconds==null)return'n/a';const s=Math.round(seconds),m=Math.floor(s/60);return m+'m '+String(s%60).padStart(2,'0')+'s'}
function terminalSummary(report){const out=[];for(const summary of Object.values(report.missions)){out.push(summary.missionId.toUpperCase(),'Runs: '+summary.runs,'Victory: '+Math.round(summary.completionRate*100)+'%','Median duration: '+formatDuration(summary.medianDurationSeconds),'Squad survivors: '+summary.averageSurvivors);if(summary.civilianLossRate!=null)out.push('Civilian survival: '+Math.round((1-summary.civilianLossRate)*100)+'%');out.push('Timeouts: '+Math.round(summary.timeoutRate*100)+'%');for(const flag of summary.flags)out.push('FLAG: '+flag.message);out.push('')}return out.join('\n').trim()}
module.exports={THRESHOLDS,buildReport,summarizeMission,terminalSummary,quantile,median};
