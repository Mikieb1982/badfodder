'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const css=fs.readFileSync(path.join(root,'game-ui.css'),'utf8');
const menu=fs.readFileSync(path.join(root,'menu-ui.js'),'utf8');
const manifest=JSON.parse(fs.readFileSync(path.join(root,'manifest.webmanifest'),'utf8'));

assert(/<meta name="viewport" content="[^"]*viewport-fit=cover/.test(html),'Mobile viewport-fit support missing');
assert(html.includes('id="touchJoystick"'),'Touch joystick missing');
assert(html.includes('id="touchFire"'),'Touch FIRE missing');
assert(html.includes('id="touchGrenade"'),'Touch GRENADE missing');
assert(html.includes('id="touchFull"'),'Mobile fullscreen control missing');

assert(html.includes('function updatePinch()'),'Pinch zoom implementation missing');
assert(html.includes('pinchPointers.size===2'),'Two-finger pinch detection missing');
assert(html.includes('Math.max(.55,Math.min(1.8'),'Pinch zoom range changed unexpectedly');

assert(html.includes("window.addEventListener('blur',releaseInterruptedInput)"),'Blur does not recover input');
assert(html.includes("window.addEventListener('pagehide',releaseInterruptedInput)"),'Page hide does not recover input');
assert(html.includes("window.addEventListener('orientationchange',releaseInterruptedInput)"),'Orientation change does not recover input');
assert(html.includes("document.addEventListener('visibilitychange'"),'Background visibility recovery missing');
assert(html.includes("window.addEventListener('pointerup'"),'Global pointer release recovery missing');
assert(html.includes("window.addEventListener('pointercancel'"),'Global pointer cancel recovery missing');

assert(html.includes('releaseAllFireInputs();')&&html.includes('releaseTouchMove();'),'Interrupted input does not clear fire and movement together');
assert(html.includes("if(!selectedUnits().length&&squad.some(s=>s.alive))setSelection('all')"),'Mobile fire cannot recover from a dead selected soldier');
assert(html.includes("window.addEventListener('keydown'"),'Window-level keyboard controls missing');
assert(html.includes("keyboardFireHeld=true"),'F-key firing state missing');

assert(html.includes('const FIXED_DT=1/60,MAX_CATCHUP_STEPS=5'),'Fixed-step simulation contract missing');
assert(html.includes('while(simulationAccumulator>=FIXED_DT&&steps<MAX_CATCHUP_STEPS)'),'Bounded simulation catch-up missing');
assert(html.includes('simulationAccumulator=0'),'Simulation accumulator reset missing');

assert(css.includes('touch-action:none'),'Touch canvas/controls must suppress browser gestures during play');
assert(css.includes('.viewport.full-window'),'Fullscreen fallback styling missing');
assert(html.includes("requestFullscreen({navigationUI:'hide'})"),'Native fullscreen path missing');
assert(html.includes("mobile-fullscreen-fallback"),'iOS/browser fullscreen fallback missing');

assert(menu.includes("viewport.classList.add('full-window')"),'Mobile load does not immediately fill the screen');
assert(menu.includes("viewport.requestFullscreen({navigationUI:'hide'})"),'Mobile presentation does not upgrade to native fullscreen');
assert(menu.includes("orientation.lock('landscape')"),'Landscape orientation lock missing');
assert(menu.includes("window.addEventListener('pointerdown',retry"),'Native fullscreen is not retried on the first trusted touch');
assert(menu.includes("link.href='manifest.webmanifest'"),'Fullscreen landscape manifest is not attached');
assert.equal(manifest.display,'fullscreen','Installed web app must launch fullscreen');
assert.equal(manifest.orientation,'landscape','Installed web app must launch landscape');

console.log('PASS: mobile/browser contract covers automatic full-window startup, landscape/fullscreen promotion, pinch zoom, input recovery and fixed-step simulation.');
