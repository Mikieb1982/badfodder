#!/usr/bin/env node
'use strict';

const fs=require('node:fs');
const path=require('node:path');
const Compiler=require('./compile-trace.cjs');
const Verify=require('./verify-release.cjs');

function serializeRuntimeMap(map){
  if(!map||map.key!=='cable-street')throw new Error('Cable Street browser build requires the cable-street runtime map.');
  if(!map.authoring||map.authoring.productionReady!==true)throw new Error('Cable Street browser build requires production-ready authoring gates.');
  if(map.authoring.runtimeObjectsReady!==true)throw new Error('Cable Street browser build requires approved runtime objects.');
  if(!map.spawns||!Array.isArray(map.spawns.squad)||map.spawns.squad.length<4){
    throw new Error('Cable Street browser build requires four explicit squad spawns.');
  }
  return[
    '/* GENERATED FILE: tools/cable-street/build-runtime-map.cjs */',
    '(function(root){',
    '  root.CABLE_STREET_MAP='+JSON.stringify(map)+';',
    "})(typeof window!=='undefined'?window:globalThis);",
    ''
  ].join('\n');
}

function build(baseDir,output){
  const map=Compiler.compileDirectory(baseDir);
  const verification=Verify.verifyMap(map);
  if(!verification.ready){
    throw new Error('Cable Street release verification failed: '+verification.problems.join(' '));
  }
  const text=serializeRuntimeMap(map);
  fs.writeFileSync(output,text);
  return map;
}

function main(argv){
  const baseDir=path.resolve(argv[2]||path.join(__dirname,'../../authoring/cable-street'));
  const output=path.resolve(argv[3]||path.join(__dirname,'../../cable-street-map.js'));
  try{
    const map=build(baseDir,output);
    process.stdout.write('Wrote '+output+' ('+map.width+'x'+map.height+')\n');
  }catch(err){
    process.stderr.write(String(err&&err.message||err)+'\n');
    process.exitCode=1;
  }
}

if(require.main===module)main(process.argv);
module.exports={serializeRuntimeMap,build};
