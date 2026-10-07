'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..');
const index=require('./engine-source.cjs')(fs.readFileSync(path.join(root,'index.html'),'utf8'));
const css=fs.readFileSync(path.join(root,'game-ui.css'),'utf8');
const wigan=fs.readFileSync(path.join(root,'wigan-scenery.js'),'utf8');

assert(index.includes('BAD_BELZIG_FAMILIES'),'Bad Belzig building families missing');
assert(index.includes('function drawForegroundOccluders'),'Foreground depth pass missing');
assert(index.includes('function drawOccludedSquadOutlines'),'Occluded squad outline missing');
assert(index.includes('function drawIdentityMarker'),'Team shape markers missing');
assert(index.includes('id="hudNotice"'),'Temporary HUD notice missing');
assert(index.includes("hudNoticeUntil=performance.now()+2400"),'Temporary HUD messages should remain readable');
assert(index.includes("b.family==='timber'"),'Half-timber treatment is not family-specific');
assert(index.includes("b.family==='stone'||b.roof==='#548291'"),'Stone family should use slate roof texture');
assert(css.includes('.hud-counter:last-child{display:none}'),'Redundant squad counter should be hidden');
assert(css.includes('.hud-notice.show'),'HUD notice visibility state missing');
assert(!css.includes("min-height:106px"),'Old oversized roster styling leaked back into HUD');

const scope={window:{}};
vm.runInNewContext(wigan,scope);
const family=scope.window.BadFodderWigan.buildingFamily;
assert.equal(family({landmark:'tudor'}),'pub');
assert.equal(family({landmark:'wallgate'}),'station');
assert.equal(family({landmark:'grandArcade'}),'arcade');
assert.equal(family({landmark:'busStation'}),'civic');
assert.equal(family({detail:{street:'Standishgate'},levels:2}),'shop');
assert.equal(family({detail:{street:'Side Street'},levels:3}),'terrace');
assert.equal(family({detail:{street:'Side Street'},levels:2}),'residential');

console.log('PASS: compact HUD, temporary notices, building families, foreground occlusion, squad outlines and Wigan landmark families.');
