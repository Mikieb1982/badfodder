# Seven player improvements

1. **Launch and installation:** `START-CHROMEBOOK.sh` locates its own folder, builds without installing npm dependencies, starts the local server and opens Chrome. Existing Windows, macOS and Android packaging remains available; installer builds now depend on gameplay, browser and offline checks.
2. **First mission guidance:** a small edge prompt responds to movement, nearby contact, suppression and casualties. It appears during the first Belzig mission until campaign progress is earned. Contextual Hints in Options disables it. Keyboard and touch instructions differ.
3. **Squad reliability:** failed follow/cover routes have bounded retries; safe casualty rescue can navigate around obstacles instead of requiring a straight line. Human ownership, manual aid priority, combat restrictions and collision remain authoritative.
4. **Combat feedback:** hit marks stay at the affected actor; casualty, stabilised, badly wounded and surrender labels remain attached to the character. The unrelated centre-screen enemy-hit ring is removed. Existing suppression arcs, squad-hit vignette and reduced-motion behavior remain.
5. **Local saves:** Continue names the campaign mission. Options shows whether local writes succeeded and exports/imports portable JSON progress. Imports validate before mutation and roll back if a write fails. Completed mission progress, squad continuity, preferences and Resistance records are supported; active battles and multiplayer sessions are excluded.
6. **Resistance:** wave approaches alternate between encirclement, flanking patrols and focused assaults. Recovery windows and survivor bonuses use simulation time, happen once, and stop on defeat. Map buttons show the local best score/wave. HUD content updates only when it changes.
7. **Performance:** Auto measures active frame intervals before lowering render resolution; Original retains full resolution; Performance selects 75% dimensions and removes decorative overlay particles. Simulation rate, health, combat and navigation are unchanged. Options can download measured timing and diagnostics. Actual Chromebook hardware still needs a device playtest.

## Changed files in this improvement pass

- `START-CHROMEBOOK.sh`
- `player-support.js`
- `game-storage.js`
- `companion-controller.js`
- `arcade-modes.js`
- `experience-polish.js`
- `simulation-runtime.js`
- `menu-ui.js`
- `index.html`
- `package.json`
- `tools/runtime/serve.cjs`
- `tests/player-support.cjs`
- `tests/companion-routing.cjs`
- `tests/arcade-modes.cjs`
- `tests/player-improvements-browser.cjs`
- `.github/workflows/native-installers.yml`
- `docs/CHROMEBOOK-TESTING.md`
- `docs/PLAYER-IMPROVEMENTS.md`

`README.md` also contains the previously prepared Chromebook instructions included with this pass. `dist/` is regenerated output and is not committed.

## Verification

Run `npm run test:player-improvements`, `npm run test:coop`, `npm run test:offline`, `npm run test:build`, then `node tests/player-improvements-browser.cjs` and `npm run test:offline:browser` with Playwright Chromium installed. The installer workflow uploads browser screenshots with its test evidence.

Installer builds are unsigned on Windows/macOS and debug-signed on Android. Apple iPhone/iPad native distribution still needs the owner's Apple signing setup; the unsigned iOS archive is not an installer. The installed web app remains the available offline iPhone/iPad route.
