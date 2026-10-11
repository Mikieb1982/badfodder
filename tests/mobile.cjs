'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const config=require('../mobile/capacitor.config.json'),signalling=require('../multiplayer-signalling.js');
assert.equal(config.appId,'games.shootrabbits.mobile');
assert.equal(config.webDir,'www');assert(!config.server.url,'Native game must not load from a remote server');
assert.equal(config.server.androidScheme,'https');assert.equal(config.server.iosScheme,'capacitor');
const deps=require('../mobile/package.json');
for(const key of ['@capacitor/core','@capacitor/android','@capacitor/ios'])assert.equal(deps.dependencies[key],deps.devDependencies['@capacitor/cli']);
for(const base of ['capacitor://localhost/','https://localhost/','rabbits://game/'])assert.equal(signalling.inviteUrl('RABBIT-ABCDEFGHJK',base),'https://bad-fodder.web.app/join.html?room=RABBIT-ABCDEFGHJK');
const root=path.resolve('mobile/www');
if(fs.existsSync(root)){
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 assert(!/<script\b[^>]*src=["'][^"']*\/install-app\.js/.test(html));
 const manifest=JSON.parse(fs.readFileSync(path.join(root,'offline-assets.json')));
 for(const file of manifest)assert(fs.existsSync(path.resolve(root,file)),'Missing bundled file: '+file);
 for(const name of ['multiplayer-config.json','manifest.webmanifest'])assert(fs.existsSync(path.join(root,name)));
 assert(html.includes('multiplayer-protocol.js'));
}
console.log('PASS: mobile local origin, pinned platform versions, complete offline bundle and shareable multiplayer invites.');
