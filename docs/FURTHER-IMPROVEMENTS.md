# Further game improvements

This update implements the seven recommendations from the code review.

1. Local mission checkpoints: one saved battle, autosaved every 30 seconds,
   after objective changes (with a two-second write limit), when pausing, and
   when hiding/closing the app. Main-menu Resume Saved Game and Restart Saved
   Mission handle campaign, mission select and Resistance. Saves include
   objectives, facts, health/carrying relationships, enemies, projectiles,
   mission timers, historical jobs and formations, Barcelona barricades and
   assaults, allies, Director state, RNG state and Resistance wave/score.
   A shared-reference graph preserves Maps, Sets and entity references.
   Multiplayer cannot overwrite a local checkpoint. Incompatible or damaged
   checkpoints are rejected; normal mission launch remains available.
2. Resistance retains at most 24 retired enemy bodies/prisoners, plus active
   hostiles. Retiring an enemy also removes queued path work and Commander
   references. Campaign corpses are unchanged.
3. Five wave patterns compose existing combat roles; later waves coordinate.
   Every third cleared wave offers an optional two-second rally at a visible
   flag for 300 points, one grenade and managed ammunition. Living fighters
   must regroup inside the circle; downed casualties do not block the bonus.
   Entry points must be navigable, connected to the squad, outside a minimum
   distance and either distant or screened from squad sight. Ring offsets are
   checked too. If no safe entry exists, the next wave waits and explains why.
4. Guest rendering is measured separately from simulation ownership, allowing
   automatic quality to adapt in multiplayer. Normal performance reports now
   include simulation/render timing without requiring a debug URL.
5. Tutorial completion follows player move/fire/map actions; companion fire or
   selecting a distant fighter cannot complete it. Completed tutorial stages
   persist locally, and hints remain optional.
6. Backup imports commit all entries with a single atomic local-storage write.
   A failed import leaves the previous persistent saves intact across relaunch.
   Imported saves remain writable and deletable. Nested fighter data and player
   preferences are validated before import.
7. Companion movement has a bounded progress watchdog, alternative formation
   slots and a CANNOT_REACH roster indication. Rescue helpers are chosen by
   estimated route length, with travel time checked against casualty survival
   time. Player ownership, safety checks and collision-aware movement remain.

Single player uses local storage and bundled assets. Multiplayer remains available.
No new asset downloads or Firebase dependency were added to single player.

## Verification

Regression coverage includes 100 Resistance waves, safe spawn deferral, rally
bonuses, persistent quota failures, backup reloads, cyclic checkpoint graphs,
resume/restart, multiplayer isolation, guest quality and companion stalls.
`tests/checkpoints-browser.cjs` exercises installed offline production save/reload/resume and
continued play for all four missions and Wigan Resistance, with screenshots.
The existing offline browser suite covers the installed offline game.

Run `npm run test:player-improvements`, `npm run test:coop`,
`npm run test:offline`, `npm run test:build`, `npm run check:runtime`,
`node tests/checkpoints-browser.cjs` and `npm run test:offline:browser`.
The native installer workflow runs these focused checks before packaging.

## Changed files

The exact source/test/workflow changes for this update are listed below.
Generated `dist/`, `desktop/game/` and `mobile/www/` copies are build outputs.

- `.github/workflows/native-installers.yml`
- `adaptive-director.js`
- `adaptive-opportunities.js`
- `arcade-modes.js`
- `barcelona-runtime.js`
- `cable-street-crowd.js`
- `cable-street-interactions.js`
- `civilian-runtime.js`
- `companion-controller.js`
- `docs/FURTHER-IMPROVEMENTS.md`
- `friendly-resistance.js`
- `game-rng.js`
- `game-storage.js`
- `index.html`
- `mission-checkpoints.js`
- `mission-controller.js`
- `package.json`
- `player-support.js`
- `runtime-services.js`
- `simulation-runtime.js`
- `tests/arcade-modes.cjs`
- `tests/checkpoints-browser.cjs`
- `tests/client-quality.cjs`
- `tests/companion-routing.cjs`
- `tests/mission-checkpoints.cjs`
- `tests/player-support.cjs`
