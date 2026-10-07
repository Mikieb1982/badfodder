'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..');
const html=require('./engine-source.cjs')(fs.readFileSync(path.join(root,'index.html'),'utf8'));
const css=fs.readFileSync(path.join(root,'game-ui.css'),'utf8');
const menu=fs.readFileSync(path.join(root,'menu-ui.js'),'utf8');
const menuCss=fs.readFileSync(path.join(root,'menu-ui.css'),'utf8');
const manifest=JSON.parse(fs.readFileSync(path.join(root,'manifest.webmanifest'),'utf8'));

assert(/<meta name="viewport" content="[^"]*viewport-fit=cover/.test(html),'Mobile viewport-fit support missing');
assert(html.includes('id="touchJoystick"'),'Touch joystick missing');
assert(html.includes('id="touchFire"'),'Touch FIRE missing');
assert(html.includes('id="touchGrenade"'),'Touch GRENADE missing');
assert(html.includes('id="touchFull"'),'Mobile fullscreen control missing');


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
assert(html.includes('function toggleSelection(index)'),'Flexible squad subgroup selection missing');
assert(html.includes("chip.addEventListener('click',()=>toggleSelection(i))"),'HUD portraits do not toggle subgroup membership');
assert(html.includes("if(units.length<squad.filter(s=>s.alive).length){"),'Subgroup movement branch missing');

assert(html.includes('const FIXED_DT=1/60,MAX_CATCHUP_STEPS=5'),'Fixed-step simulation contract missing');
assert(html.includes('BadFodderRuntime.fixedFrame'),'Bounded simulation catch-up missing');
assert(html.includes('simulationAccumulator=0'),'Simulation accumulator reset missing');

assert(/\.viewport\{[^}]*touch-action:none/.test(css),'Gameplay viewport must suppress browser gestures during play');
assert(/#game\{[^}]*touch-action:none/.test(css),'Gameplay canvas must suppress browser gestures during play');
assert(/\.touch-controls\{[^}]*touch-action:none/.test(css),'Touch overlay must suppress browser gestures during play');
assert(css.includes('.viewport.full-window'),'Fullscreen fallback styling missing');
assert(html.includes("requestFullscreen({navigationUI:'hide'})"),'Native fullscreen path missing');
assert(html.includes("mobile-fullscreen-fallback"),'iOS/browser fullscreen fallback missing');

assert(menu.includes('FULL SCREEN + LANDSCAPE?'),'Mobile startup prompt is missing');
assert(menu.includes('GO FULL SCREEN'),'Startup prompt has no explicit fullscreen action');
assert(menu.includes('NOT NOW'),'Startup prompt cannot be dismissed');
assert(menu.includes("if(!actions.isFullscreen())await actions.fullscreen()"),'Fullscreen request is not tied to the explicit user choice');
assert(menu.includes("orientation.lock('landscape')"),'Landscape orientation lock missing');
assert(menu.includes('orientation.unlock()'),'Landscape orientation is not released when the user exits fullscreen');
assert(menu.includes('setTimeout(()=>this.mobilePresentation?.prompt(),0)'),'Startup prompt is not shown when the menu initializes');
assert(menu.includes("const PRESENTATION_PROMPT_KEY='badfodder.presentation.prompted.v1'"),'Startup prompt session key missing');
assert(menu.includes("BadFodderStorage.session.getItem(PRESENTATION_PROMPT_KEY)==='1'"),'Startup prompt does not remember that it was already shown this session');
assert(menu.includes("BadFodderStorage.session.setItem(PRESENTATION_PROMPT_KEY,'1')"),'Startup prompt does not mark itself as shown');
assert(menu.includes('let promptShown=wasPromptedThisSession()'),'Startup prompt state is not restored after mission reloads');
assert(!menu.includes("window.addEventListener('pointerdown',retry"),'Fullscreen must not hijack the first unrelated touch');
assert(!menu.includes('Fill the mobile viewport immediately'),'Mobile presentation must not auto-enter fullscreen before consent');
assert(menuCss.includes('.presentation-prompt'),'Fullscreen choice prompt is not styled');
assert(menuCss.includes("portrait-lock.css"),'Portrait blocker stylesheet is not attached');
assert(menu.includes("link.href='manifest.webmanifest'"),'Web app manifest is not attached');
assert.equal(manifest.display,'standalone','Installed web app display mode changed unexpectedly');
assert.equal(manifest.orientation,'landscape','Installed web app must be landscape-only');

console.log('PASS: mobile/browser contract enforces landscape-only play, preserves fullscreen controls, and covers pinch zoom, input recovery and fixed-step simulation.');
