'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto');
const {packageInstaller}=require('../tools/installers/package.cjs');
const root=fs.mkdtempSync(path.join(os.tmpdir(),'rabbits-installers-'));
try{
 for(const [platform,names] of Object.entries({windows:['game.exe'],mac:['game.dmg'],android:['app-debug.apk'],chromebook:['Shoot-Rabbits-Chromebook-0.1.0-amd64.deb','Shoot-Rabbits-Chromebook-0.1.0-arm64.deb']})){
  const source=path.join(root,platform),output=path.join(root,platform+'-friend');fs.mkdirSync(source);
  fs.writeFileSync(path.join(source,'build-log.txt'),'Do not ship build files');
  for(const name of names)fs.writeFileSync(path.join(source,name),'installer '+name);
  assert.equal(packageInstaller(platform,source,output),names.length);
  assert(!fs.existsSync(path.join(output,'build-log.txt')));
  assert(fs.readFileSync(path.join(output,'READ-ME-FIRST.txt'),'utf8').includes('playable offline from first launch'));
  for(const name of names)assert.deepEqual(fs.readFileSync(path.join(output,name)),fs.readFileSync(path.join(source,name)));
  for(const line of fs.readFileSync(path.join(output,'SHA256SUMS.txt'),'utf8').trim().split('\n')){
   const [hash,name]=line.split('  ');assert.equal(hash,crypto.createHash('sha256').update(fs.readFileSync(path.join(output,name))).digest('hex'));
  }
  if(platform==='chromebook'){
   assert(fs.existsSync(path.join(output,'INSTALL-CHROMEBOOK.sh')));
   fs.unlinkSync(path.join(source,names[1]));assert.throws(()=>packageInstaller(platform,source,output),/Expected two/);
  }
  assert.throws(()=>packageInstaller(platform,source,path.join(source,'nested')),/outside/);
 }
 const empty=path.join(root,'empty');fs.mkdirSync(empty);
 assert.throws(()=>packageInstaller('windows',empty,path.join(root,'missing')),/Expected one/);
 console.log('PASS: all four friend packages include exact installers, offline instructions and verified checksums; incomplete packages are rejected.');
}finally{fs.rmSync(root,{recursive:true,force:true})}
