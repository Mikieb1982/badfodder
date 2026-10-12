'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const instructions={
 windows:`WINDOWS (64-bit Intel/AMD)\nExtract this ZIP. Open the .exe and follow the installer.\nLaunch If I Can Shoot Rabbits from Start or its desktop shortcut.\nThis build is unsigned, so Windows may show an unknown-publisher warning.\n`,
 mac:`MAC (Intel and Apple Silicon)\nExtract this ZIP. Open the .dmg and drag the game into Applications.\nLaunch If I Can Shoot Rabbits from Applications.\nThis build is unsigned and not notarized. If macOS blocks it, open System Settings > Privacy & Security and use Open Anyway for this app, if offered by your device policy.\n`,
 android:`ANDROID\nExtract this ZIP and transfer the .apk to your Android device.\nOpen the .apk, allow installation from that source when prompted, and install.\nLaunch If I Can Shoot Rabbits from your apps.\nThis is a debug-signed test build. A future build may use a different signing key and refuse to update this one. Export your campaign save before replacing it; uninstalling removes local saves.\n`,
 chromebook:`CHROMEBOOK (64-bit Intel/AMD and ARM)\n1. Enable Linux: Settings > About ChromeOS > Developers > Linux development environment > Set up. Work/school devices may prohibit this.\n2. Extract this ZIP and copy the entire extracted folder into Linux files. Keep INSTALL-CHROMEBOOK.sh beside both .deb files.\n3. Open Terminal. Type bash followed by a space, drag INSTALL-CHROMEBOOK.sh from Linux files into Terminal, and press Enter. The script chooses the correct processor version.\n4. Confirm installation when asked. Internet may be needed once for Linux setup and missing system libraries.\n5. Open If I Can Shoot Rabbits from the launcher, under Linux apps. You can close Terminal and play offline.\nNo npm, Node, source code or localhost server is needed. ChromeOS no longer provides the old file-menu installer for .deb files.\nIf Linux is unavailable, this ZIP cannot install on that Chromebook; use the hosted browser game's install option while online instead.\nLinux setup: https://support.google.com/chromebook/answer/9145439\nChromeOS changes: https://developers.google.com/chromeos/app-development/develop/news\n`
};
const extensions={windows:'.exe',mac:'.dmg',android:'.apk',chromebook:'.deb'};
function filesIn(root){return fs.readdirSync(root,{withFileTypes:true}).flatMap(entry=>{const file=path.join(root,entry.name);return entry.isDirectory()?filesIn(file):entry.isFile()?[file]:[]})}
function packageInstaller(platform,source,destination){
 if(!Object.hasOwn(instructions,platform))throw Error('Unknown installer platform: '+platform);
 source=path.resolve(source);destination=path.resolve(destination);
 if(destination===source||destination.startsWith(source+path.sep))throw Error('Output must be outside installer input');
 const installers=filesIn(source).filter(file=>path.extname(file)===extensions[platform]);
 if(installers.length!==(platform==='chromebook'?2:1))throw Error('Expected '+(platform==='chromebook'?'two':'one')+' '+extensions[platform]+' installer(s), found '+installers.length);
 if(platform==='chromebook')for(const arch of ['amd64','arm64'])if(!installers.some(file=>file.endsWith('-'+arch+'.deb')))throw Error('Missing Chromebook architecture '+arch);
 fs.mkdirSync(destination,{recursive:true});
 for(const file of installers)fs.copyFileSync(file,path.join(destination,path.basename(file)));
 if(platform==='chromebook')fs.copyFileSync(path.join(__dirname,'INSTALL-CHROMEBOOK.sh'),path.join(destination,'INSTALL-CHROMEBOOK.sh'));
 fs.writeFileSync(path.join(destination,'READ-ME-FIRST.txt'),'IF I CAN SHOOT RABBITS\n\n'+instructions[platform]+'\nCampaign, mission select and Resistance are bundled and playable offline from first launch. Progress is saved on this device. Multiplayer requires internet.\n\nSend this complete ZIP to friends. They do not need GitHub, a developer account or the game source. Keep a backup of the ZIP; GitHub build downloads expire.\n');
 const hashes=filesIn(destination).filter(file=>path.basename(file)!=='SHA256SUMS.txt').map(file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')+'  '+path.basename(file));
 fs.writeFileSync(path.join(destination,'SHA256SUMS.txt'),hashes.join('\n')+'\n');
 return installers.length;
}
module.exports={packageInstaller};
if(require.main===module){const [platform,source,destination]=process.argv.slice(2);if(!source||!destination)throw Error('Usage: node tools/installers/package.cjs PLATFORM INPUT OUTPUT');console.log('Packaged '+packageInstaller(platform,source,destination)+' installer(s) for '+platform)}
