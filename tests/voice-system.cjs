const assert=require('assert');
const voices=require('../voice-system.js');

assert.equal(typeof voices.assetRequirements,'function','Voice asset manifest is missing');
assert.equal(voices.volume,1,'Narration should default to 100% when no saved preference exists');
assert.equal(voices.actionEvent('FLANK_LEFT'),'flankLeft');
assert.equal(voices.actionEvent('RETREAT'),'retreat');
assert.equal(voices.actionEvent('PRESSURE_SIDE'),'flankRight');
assert.equal(voices.actionEvent('DO_NOTHING'),null);

const files=voices.assetRequirements();
assert.equal(files.length,68,'Unexpected required voice asset count');
assert.equal(new Set(files.map(f=>f.path)).size,files.length,'Voice asset paths must be unique');
assert(files.every(f=>f.path.startsWith('audio/voices/')&&f.path.endsWith('.mp3')),'Voice assets must use audio/voices MP3 paths');
assert(files.some(f=>f.path==='audio/voices/squad/voice-1/move.mp3'&&f.text==='Right. Moving.'));
assert(files.some(f=>f.path==='audio/voices/enemy/belzig/flank-left.mp3'&&f.text==='Links herum!'));
assert(files.some(f=>f.path==='audio/voices/enemy/cable-street/pressure.mp3'&&f.text==='Move forward!'));
assert(files.some(f=>f.path==='audio/voices/briefings/wigan.mp3'));

const text=voices.briefingText({title:'TEST',location:'HERE',year:1945,background:['Background.'],mission:'Do the thing',objectives:['ONE','TWO'],final:['GO.']});
assert(text.includes('Background.')&&text.includes('Your mission: Do the thing')&&text.includes('Objectives: ONE. TWO.')&&text.includes('GO.'),'Briefing narration text is incomplete');

console.log('PASS: voice defaults, dialogue mappings, briefing narration and required asset manifest');

let barcelonaAudio=0;const previousAudio=global.Audio;global.Audio=class{constructor(){barcelonaAudio++}};voices.narrateBriefing(require('../mission-identities').get('barcelona'));assert.equal(voices._runtime.missionKey,'barcelona');assert.equal(barcelonaAudio,0,'Unrecorded Barcelona briefing must never play Belzig narration');global.Audio=previousAudio;voices.stopNarration();
