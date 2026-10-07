#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path');
const Simulator=require('./simulation-agent.cjs'),Report=require('./report.cjs');
function args(argv){const out={mission:'all',runs:20,seed:'1000',difficulty:'standard',out:'tmp/balance-report.json'};for(const raw of argv){if(!raw.startsWith('--'))continue;const [key,...rest]=raw.slice(2).split('='),value=rest.join('=');if(key==='mission')out.mission=value||'all';else if(key==='runs')out.runs=Math.max(1,Number(value)||1);else if(key==='seed')out.seed=value||'1000';else if(key==='difficulty')out.difficulty=value||'standard';else if(key==='out')out.out=value||out.out;else if(key==='max-seconds')out.maxSeconds=Math.max(1,Number(value)||1)}return out}
function main(){const options=args(process.argv.slice(2)),missions=options.mission==='all'?Simulator.supportedMissions():[options.mission],runs=[];for(const mission of missions)for(let i=0;i<options.runs;i++)runs.push(Simulator.simulateMission({mission,seed:options.seed+':'+mission+':'+i,difficulty:options.difficulty,maxSeconds:options.maxSeconds}));const report=Report.buildReport(runs,{seed:options.seed,difficulty:options.difficulty}),file=path.resolve(process.cwd(),options.out);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(report,null,2)+'\n');console.log(Report.terminalSummary(report));console.log('\nJSON: '+path.relative(process.cwd(),file))}
if(require.main===module){try{main()}catch(error){console.error(error.stack||error.message||error);process.exitCode=1}}
module.exports={args,main};
