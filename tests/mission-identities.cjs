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

// Playable characters carry stable, lightweight campaign identity data.
const allProfiles=['cable-street','wigan','belzig'].flatMap(key=>identities.get(key).characters);
assert.equal(new Set(allProfiles.map(c=>c.id)).size,allProfiles.length,'Playable character IDs must be unique across current chapters');
for(const c of allProfiles){
 assert.equal(typeof c.id,'string');assert(c.id.includes(':'));
 assert.equal(c.occupation,c.role);
 assert(identities.CHARACTER_TRAITS.includes(c.trait),'Unknown character trait: '+c.trait);
 assert.equal(c.healthState,'FIT');assert.equal(c.experience,0);assert.equal(c.alive,true);
 assert.match(c.voiceSet,/^squad\/voice-[1-4]$/);assert(Array.isArray(c.relationships));
}
const karl=identities.runtimeCharacter('bad-belzig',0,{x:22,y:44,hp:6,maxHp:8,experience:2,relationships:['belzig:otto']});
assert.equal(karl.id,'belzig:karl');assert.equal(karl.name,'Karl');assert.equal(karl.occupation,'Former soldier / deserter');assert.equal(karl.x,22);assert.equal(karl.hp,6);assert.equal(karl.experience,2);assert.deepEqual(karl.relationships,['belzig:otto']);
const deadKarl=identities.runtimeCharacter('bad-belzig',0,{alive:false,healthState:'DEAD'});assert.equal(deadKarl.alive,false);assert.equal(deadKarl.healthState,'DEAD');
assert.deepEqual(identities.profile('wigan',5),identities.get('wigan').characters[1],'Character profile indexing must stay deterministic');
console.log('PASS: stable IDs, occupations, traits, health state, experience, voice sets and relationship metadata.');

// Enemy presentation must vary by costume/gear/weapon, not just jacket colour.
for(const mission of ['belzig','wigan']){
 const skins=Array.from({length:4},(_,i)=>identities.skin(mission,'enemy',i));
 assert.equal(new Set(skins.map(s=>s.role)).size,4);
 assert.equal(new Set(skins.map(s=>s.weapon)).size,4);
 assert.equal(new Set(skins.map(s=>s.gear)).size,4);
 assert(skins.every(s=>s.enemyDetail&&s.trousers&&s.webbing));
 assert(skins.some(s=>s.longCoat)&&skins.some(s=>s.build==='broad'));
 assert.equal(identities.skin(mission,'enemy',8),skins[0],'Reinforcement variants wrap deterministically');
 assert.notDeepEqual(skins,identities.get(mission).characters);
}
assert.notDeepEqual(identities.enemyStyles.belzig,identities.enemyStyles.wigan);

// Exercise the actual costume renderer in every direction/state and verify cache reuse.
const vm=require('node:vm');let allocations=0,draws=0,fallback=0;
const ctx=new Proxy({createLinearGradient(){return {addColorStop(){}}},drawImage(){draws++;}}, {get(target,key){return key in target?target[key]:()=>{};}});
const art={drawActor(){fallback++;},pose:e=>({dir:e.dir,state:e.state,phase:e.phase||0,moving:e.state==='walk',facing:e.dir*Math.PI/4,death:1})};
vm.runInNewContext(read('mission-character-art.js'),{
 window:{BadFodderArt:art,BadFodderIdentities:identities},
 document:{createElement(){allocations++;return {getContext:()=>ctx}}},Map,Image:class{},setTimeout,clearTimeout
});
for(const mission of ['belzig','wigan']){
 art.setMissionIdentity(mission);
 for(let variant=0;variant<4;variant++)for(let dir=0;dir<8;dir++)for(const state of ['idle','walk','fire','hurt','dead']){
  const ent={variant,dir,state,x:10,y:20,phase:Math.PI/2};
  art.drawActor(ctx,ent,'enemy');const before=allocations;
  art.drawActor(ctx,ent,'enemy');assert.equal(allocations,before,'Cached enemy pose must not allocate per frame');
 }
}
assert.equal(fallback,0);assert(draws>=640);assert(allocations<=128);
console.log('PASS: mission-specific enemy silhouettes, equipment, weapon variation and cached directional/state rendering.');
assert.equal(identities.modifiers({trait:'RUNNER'}).movement,1.06);
assert.equal(identities.modifiers({trait:'STEADY'}).spread,.92);
assert.equal(identities.modifiers({trait:'STUBBORN'}).suppression,.9);
assert.equal(identities.modifiers({experience:100000}).movement,1.024,'Practice must stay modest and bounded');
const independent=identities.runtimeCharacter('wigan',0);independent.relationships[0].type='CHANGED';
assert.notEqual(identities.profile('wigan',0).relationships[0].type,'CHANGED','Runtime relationships must not mutate the roster template');
console.log('PASS: modest live traits, bounded practice and independent relationship data.');
