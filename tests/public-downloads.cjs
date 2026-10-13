'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict'),{spawnSync}=require('node:child_process');
const {packageInstaller}=require('../tools/installers/package.cjs');
const root=fs.mkdtempSync(path.join(os.tmpdir(),'rabbits-public-downloads-'));
try{
 const inputs=path.join(root,'inputs');fs.mkdirSync(inputs);
 for(const [platform,folder,names] of [
  ['windows','Shoot-Rabbits-windows-installer',['game.exe']],
  ['mac','Shoot-Rabbits-mac-installer',['game.dmg']],
  ['android','Shoot-Rabbits-Android-test-installer',['app.apk']],
  ['chromebook','Shoot-Rabbits-Chromebook-installer',['Shoot-Rabbits-Chromebook-0.1.0-amd64.deb','Shoot-Rabbits-Chromebook-0.1.0-arm64.deb']]
 ]){
  const source=path.join(root,platform);fs.mkdirSync(source);for(const name of names)fs.writeFileSync(path.join(source,name),'tested '+platform);
  packageInstaller(platform,source,path.join(inputs,folder));
 }
 const output=path.join(root,'output');
 const run=()=>spawnSync('python3',['tools/installers/public-downloads.py',inputs,output],{encoding:'utf8'});
 let result=run();assert.equal(result.status,0,result.stderr);
 for(const name of ['Shoot-Rabbits-Windows.exe','Shoot-Rabbits-Mac.dmg','Shoot-Rabbits-Android.apk','Shoot-Rabbits-Chromebook.zip']){
  assert(fs.existsSync(path.join(output,name)));
  for(const page of ['DOWNLOAD-GAME.html','docs/PLAYER-DOWNLOADS.md'])assert(fs.readFileSync(page,'utf8').includes('/releases/latest/download/'+name));
 }
 assert.equal(fs.readFileSync(path.join(output,'Shoot-Rabbits-Windows.exe'),'utf8'),'tested windows');
 fs.writeFileSync(path.join(inputs,'Shoot-Rabbits-windows-installer/game.exe'),'tampered');result=run();assert.notEqual(result.status,0);assert(result.stderr.includes('checksum mismatch'));
 console.log('PASS: public download links match real installer filenames; packaged bytes are retained and tampered installers are rejected.');
}finally{fs.rmSync(root,{recursive:true,force:true})}
