'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const identities=require('../mission-identities.js'),scenery=require('../wartime-scenery.js');
const root=path.resolve(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const belzig=new Function(read('town-map.js')+'\n'+read('bad-belzig-data.js')+';return TOWN_MAP;')();
const wigan=new Function(read('wigan-map.js')+';return WIGAN_MAP;')();
for(const map of [belzig,wigan]){
 const snapshot=JSON.stringify(map),props=scenery.prepare(map);
 assert.equal(JSON.stringify(map),snapshot,'Period dressing must never mutate map or collision data');
 assert(props.length>0,'Expected period props for '+map.key);
 assert(props.length<=55);
 assert.deepEqual(scenery.prepare(map),props,'Scenery placement must be stable');
 assert(props.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)));
 const id=identities.get(map.key);
 assert.equal(id.characters.length,4);
 assert.equal(new Set(id.characters.map(c=>c.name)).size,4);
 assert(id.characters.every(c=>c.weapon));
 assert(id.characters.every(c=>c.hat!=='stahlhelm'),'Resistance/volunteers must have distinct silhouettes');
 console.log('PASS:',map.key,props.length,'cosmetic period props; map unchanged.');
}
assert.deepEqual(scenery.prepare({key:'cable-street'}),[]);
const cable=identities.get('cable-street-1936');
assert.deepEqual(cable.characters.map(c=>c.name),['Jack','Rose','Sam','Ada']);
assert(cable.characters.every(c=>!c.weapon&&!/helmet|brodie|stahlhelm/.test(c.hat)));
for(const key of ['cable-street','wigan','belzig'])for(let i=0;i<4;i++){
 assert.equal(identities.skin(key,'civilian',i).weapon,null);
 assert.equal(identities.skin(key,'squad',i),identities.get(key).characters[i]);
}
assert.equal(identities.skin('cable-street','enemy',0,'police').weapon,null);
assert.equal(identities.get('bad-belzig').title,'BELZIG');
console.log('PASS: all mission identities, distinct roster names, unarmed Cable Street/civilians, unchanged internal map IDs.');
