'use strict';
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),source=path.join(root,'dist');
function prepare(target){
if(!fs.existsSync(path.join(source,'offline-assets.json')))throw Error('Run npm run build before preparing the desktop game');
fs.rmSync(target,{recursive:true,force:true});fs.cpSync(source,target,{recursive:true});
// Browser installation is unnecessary inside the already installed desktop app.
// Remove only its script tag, leaving all gameplay and multiplayer code intact.
const html=path.join(target,'index.html');
fs.writeFileSync(html,fs.readFileSync(html,'utf8').replace(/<script\b[^>]*\bsrc=["'][^"']*\/install-app\.js[^"']*["'][^>]*>\s*<\/script>/g,''));
console.log('Prepared complete offline game in '+target);
}
module.exports={prepare};
if(require.main===module)prepare(path.join(__dirname,'game'));
