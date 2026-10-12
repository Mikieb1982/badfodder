'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto');
const {packageInstaller}=require('../tools/installers/package.cjs');
const {spawnSync}=require('node:child_process');
const root=fs.mkdtempSync(path.join(os.tmpdir(),'rabbits-installers-'));
try{
 for(const [platform,names] of Object.entries({windows:['game.exe'],mac:['game.dmg'],android:['app-debug.apk'],chromebook:['Shoot-Rabbits-Chromebook-0.1.0-amd64.deb','Shoot-Rabbits-Chromebook-0.1.0-arm64.deb']})){
  const source=path.join(root,platform),output=path.join(root,platform+'-friend');fs.mkdirSync(source);
  fs.writeFileSync(path.join(source,'build-log.txt'),'Do not ship build files');
  const unpacked=path.join(source,'unpacked');fs.mkdirSync(unpacked);fs.writeFileSync(path.join(unpacked,'helper.exe'),'not an installer');
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
 if(process.platform==='linux'&&Number(process.versions.node.split('.')[0])>=22){
  // Run the real local-build orchestration in an isolated checkout. Substitute
  // only npm/native compilation, then inspect the actual resulting ZIP.
  const checkout=path.join(root,'local code with spaces'),toolDir=path.join(checkout,'tools/installers');fs.mkdirSync(toolDir,{recursive:true});
  for(const file of ['build-local.cjs','package.cjs','INSTALL-CHROMEBOOK.sh'])fs.copyFileSync(path.join(__dirname,'../tools/installers',file),path.join(toolDir,file));
  fs.writeFileSync(path.join(checkout,'my-local-game.txt'),'unique local code');
  const mock=path.join(checkout,'mock-npm.cjs');
  fs.writeFileSync(mock,`const fs=require('node:fs');fs.appendFileSync('commands.txt',process.argv.slice(2).join(' ')+'\\n');if(process.argv[3]==='package:chromebook'){fs.mkdirSync('release',{recursive:true});for(const arch of ['amd64','arm64'])fs.writeFileSync('release/Shoot-Rabbits-Chromebook-0.1.0-'+arch+'.deb',fs.readFileSync('my-local-game.txt'))}`);
  const result=spawnSync(process.execPath,[path.join(toolDir,'build-local.cjs'),'chromebook'],{cwd:checkout,env:{...process.env,npm_execpath:mock},encoding:'utf8'});
  assert.equal(result.status,0,result.stderr);
  assert.deepEqual(fs.readFileSync(path.join(checkout,'commands.txt'),'utf8').trim().split('\n'),['run desktop:prepare','install --prefix desktop','run package:chromebook --prefix desktop']);
  const archive=path.join(checkout,'release/Shoot-Rabbits-chromebook-SEND-TO-FRIENDS.zip');
  const inspect=spawnSync('python3',['-c','import sys,zipfile\nwith zipfile.ZipFile(sys.argv[1]) as z:\n assert z.testzip() is None\n assert z.read("Shoot-Rabbits-Chromebook-0.1.0-amd64.deb")==b"unique local code"\n assert "READ-ME-FIRST.txt" in z.namelist()\n assert "INSTALL-CHROMEBOOK.sh" in z.namelist()',archive],{encoding:'utf8'});
  assert.equal(inspect.status,0,inspect.stderr);
 }
 console.log('PASS: all four friend packages include exact installers, offline instructions and verified checksums; incomplete packages are rejected.');
}finally{fs.rmSync(root,{recursive:true,force:true})}
