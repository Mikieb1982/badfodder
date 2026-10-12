'use strict';
// Always build from this checkout; no hosted game or prebuilt download is used.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),{spawnSync}=require('node:child_process');
const {packageInstaller}=require('./package.cjs');
const root=path.resolve(__dirname,'../..'),platform=process.argv[2];
if(!['chromebook','windows','mac','android'].includes(platform))throw Error('Choose chromebook, windows, mac or android');
if(platform==='mac'&&process.platform!=='darwin')throw Error('Mac installers must be built on a Mac, or by the included GitHub workflow');
if(platform==='windows'&&process.platform!=='win32')throw Error('Use Windows to build this installer locally, or the included GitHub workflow');
if(platform==='chromebook'&&process.platform!=='linux')throw Error('Build Chromebook installers in Chromebook Linux, Linux, or the included GitHub workflow');
if(!process.env.npm_execpath)throw Error('Run this through npm run installer:'+platform);
if(Number(process.versions.node.split('.')[0])<22){
 console.log('Downloading a private Node 22 build runtime. Your system Node installation will stay unchanged.');
 const bootstrap=spawnSync(process.execPath,[process.env.npm_execpath,'exec','--yes','--package=node@22.23.3','--','node',__filename,platform],{cwd:root,stdio:'inherit'});
 if(bootstrap.error)throw bootstrap.error;
 process.exit(bootstrap.status??1);
}
function run(command,args,cwd=root,extraEnv={}){const result=spawnSync(command,args,{cwd,stdio:'inherit',env:{...process.env,...extraEnv}});if(result.error)throw result.error;if(result.status!==0)throw Error(command+' failed with exit '+result.status)}
function npm(args){run(process.execPath,[process.env.npm_execpath,...args])}
const mobile=platform==='android',folder=mobile?'mobile':'desktop';
npm(['run',folder+':prepare']);
npm(['install','--prefix',folder]);
if(mobile){
 npm(['run','android','--prefix','mobile']);
 const native=path.join(root,'mobile/android');
 if(process.platform==='win32')run('cmd.exe',['/d','/c','gradlew.bat assembleDebug'],native);
 else{fs.chmodSync(path.join(native,'gradlew'),0o755);run('./gradlew',['assembleDebug'],native)}
}else npm(['run','package:'+platform,'--prefix','desktop']);
const input=mobile?path.join(root,'mobile/android/app/build/outputs/apk/debug'):path.join(root,'release');
const stage=fs.mkdtempSync(path.join(os.tmpdir(),'shoot-rabbits-friends-'));
try{
 packageInstaller(platform,input,stage);
 const release=path.join(root,'release');fs.mkdirSync(release,{recursive:true});
 const output=path.join(release,'Shoot-Rabbits-'+platform+'-SEND-TO-FRIENDS.zip');
 // Use the platform's own archive tool, without adding a runtime dependency.
 if(process.platform==='win32'){
  run('powershell.exe',['-NoProfile','-Command','Compress-Archive -LiteralPath (Get-ChildItem -LiteralPath $env:RABBITS_INSTALL_STAGE -File).FullName -DestinationPath $env:RABBITS_INSTALL_ZIP -Force'],root,{RABBITS_INSTALL_STAGE:stage,RABBITS_INSTALL_ZIP:output});
 }else if(process.platform==='darwin')run('ditto',['-c','-k',stage,output]);
 else run('python3',['-c','import pathlib,sys,zipfile\nroot=pathlib.Path(sys.argv[1])\nwith zipfile.ZipFile(sys.argv[2], "w", zipfile.ZIP_DEFLATED) as archive:\n for file in sorted(root.iterdir()):\n  if file.is_file(): archive.write(file,file.name)',stage,output]);
 console.log('\nReady to send: '+output+'\nBuilt from: '+root+'\nFriends do not need npm or the source code.');
}finally{fs.rmSync(stage,{recursive:true,force:true})}
