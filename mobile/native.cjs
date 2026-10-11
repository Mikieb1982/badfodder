'use strict';
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const platform=process.argv[2];
if(!['android','ios'].includes(platform))throw Error('Choose android or ios');
if(!fs.existsSync(path.join(__dirname,'www/index.html')))throw Error('Run npm run mobile:prepare first');
const cli=require.resolve('@capacitor/cli/bin/capacitor');
function cap(...args){const result=cp.spawnSync(process.execPath,[cli,...args],{cwd:__dirname,stdio:'inherit'});if(result.status!==0)throw Error('Capacitor '+args.join(' ')+' failed')}
if(!fs.existsSync(path.join(__dirname,platform)))cap('add',platform);
cap('sync',platform);
const icon=path.resolve(__dirname,'../assets/icons/icon-512.png');
if(platform==='android'){
 const file=path.join(__dirname,'android/app/src/main/AndroidManifest.xml');
 let xml=fs.readFileSync(file,'utf8');
 xml=xml.replace(/android:screenOrientation="[^"]*"/g,'').replace('<activity','<activity android:screenOrientation="landscape"');
 xml=xml.replace(/android:(?:roundIcon|icon)="[^"]*"/g,match=>match.replace(/="[^"]*"/,'="@drawable/game_icon"'));
 fs.writeFileSync(file,xml);
 const drawable=path.join(__dirname,'android/app/src/main/res/drawable');fs.mkdirSync(drawable,{recursive:true});fs.copyFileSync(icon,path.join(drawable,'game_icon.png'));
}else{
 const file=path.join(__dirname,'ios/App/App/Info.plist');
 let xml=fs.readFileSync(file,'utf8');
 xml=xml.replace(/(<key>UISupportedInterfaceOrientations(?:~ipad)?<\/key>\s*)<array>[\s\S]*?<\/array>/g,'$1<array><string>UIInterfaceOrientationLandscapeLeft</string><string>UIInterfaceOrientationLandscapeRight</string></array>');
 fs.writeFileSync(file,xml);
 const folder=path.join(__dirname,'ios/App/App/Assets.xcassets/AppIcon.appiconset');
 fs.mkdirSync(folder,{recursive:true});
 const result=cp.spawnSync('sips',['-z','1024','1024',icon,'--out',path.join(folder,'AppIcon.png')],{stdio:'inherit'});
 if(result.status!==0)throw Error('Could not generate Apple app icon; run iOS preparation on macOS');
 fs.writeFileSync(path.join(folder,'Contents.json'),JSON.stringify({images:[{filename:'AppIcon.png',idiom:'universal',platform:'ios',size:'1024x1024'}],info:{author:'xcode',version:1}},null,2));
}
console.log('Prepared '+platform+' with bundled offline assets and landscape orientation.');
