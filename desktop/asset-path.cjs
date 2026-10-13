'use strict';
const path=require('node:path');
const ORIGIN='rabbits://game';
function assetPath(root,raw){
 const url=new URL(raw);
 if(url.protocol!=='rabbits:'||url.host!=='game')throw Error('Unknown game origin');
 const name=decodeURIComponent(url.pathname);
 if(name.includes('\0')||name.includes('\\'))throw Error('Invalid asset path');
 const file=path.resolve(root,'.'+(name==='/'?'/index.html':name));
 if(!file.startsWith(path.resolve(root)+path.sep))throw Error('Asset outside game directory');
 return file;
}
module.exports={ORIGIN,assetPath};
