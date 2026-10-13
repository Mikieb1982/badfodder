'use strict';
const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
const {assetPath}=require('../desktop/asset-path.cjs');
const root=path.resolve('desktop/game');
assert.equal(assetPath(root,'rabbits://game/'),path.join(root,'index.html'));
assert.equal(assetPath(root,'rabbits://game/static/release/music.mp3?v=2'),path.join(root,'static/release/music.mp3'));
for(const url of ['https://other.test/index.html','rabbits://other/index.html','rabbits://game/%2e%2e%2fsecret','rabbits://game/%5c..%5csecret','rabbits://game/%00'])assert.throws(()=>assetPath(root,url));
if(fs.existsSync(path.join(root,'index.html'))){
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 assert(!/<script\b[^>]*src=["'][^"']*\/install-app\.js/.test(html));
 assert(html.includes('multiplayer-protocol.js'),'Desktop must retain online multiplayer loading');
 const manifest=JSON.parse(fs.readFileSync(path.join(root,'offline-assets.json')));
 for(const file of manifest)assert(fs.existsSync(path.resolve(root,file)),'Missing bundled file: '+file);
 assert(fs.existsSync(path.join(root,'multiplayer-config.json')));
}
const signalling=require('../multiplayer-signalling.js');
assert.equal(signalling.inviteUrl('RABBIT-ABCDEFGHJK','rabbits://game/'),'https://bad-fodder.web.app/join.html?room=RABBIT-ABCDEFGHJK');
const config=require('../desktop/package.json');
assert.equal(config.build.nsis.deleteAppDataOnUninstall,false);
assert.equal(config.build.nsis.createDesktopShortcut,true);
assert.equal(config.build.nsis.createStartMenuShortcut,true);
assert.equal(config.build.win.target,'nsis');
console.log('PASS: desktop origin, path containment, bundled offline assets and multiplayer preservation.');
