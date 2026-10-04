# If I Can Shoot Rabbits

A browser-based top-down tactical game inspired by classic squad-control games and set on a stylised Bad Belzig map.

## Title and pause screens

![If I Can Shoot Rabbits title screen](docs/title-screen.jpg)

The game opens on a title screen based on the supplied If I Can Shoot Rabbits artwork. Campaign and Mission Select are available immediately; accepting a briefing loads the selected mission. The mission does not advance behind the title screen. Controls and Options are available before starting.

Enter or the pause button opens the matching pause screen, with Resume, Restart Mission, Controls, Options and Main Menu. Escape returns from a submenu or resumes a paused mission. Arrow keys move through the menu and Tab stays within it. Mouse and touch controls work throughout.

Options persist camera zoom, footstep dust, HUD text scale, music volume/mute and SFX. Title music is `bad_fodder.mp3`; Belzig and Wigan switch to `mission.mp3`; Cable Street uses `cable_street.mp3`. Pausing retains mission music; Main Menu restores title music. Playback starts after a gesture and pauses in hidden tabs. Character WebP atlases are lossless and load for the selected mission; missing art retains the painted procedural fallback.

## Current prototype

- Four-person controllable squad
- Group and individual selection
- Click/tap movement
- Shooting and reloading
- Grenades
- Enemy patrol, alert, pursuit and attack behaviour
- Civilians
- Ammunition and medical pickups
- Camera tracking, zoom and minimap
- Multi-stage mission:
  1. Reach the Postdistanzsäule
  2. Secure Burg Eisenhardt
  3. Clear Marktplatz and Rathaus
- Bad Belzig landmarks and street geometry adapted for tactical gameplay

## Graphics

![Illustrated Bad Belzig town](docs/graphics-preview.jpg)

![Character facings and continuous blast effects](docs/character-art.png)

The game uses painted arcade cartoon artwork inspired by Cannon Fodder: oversized helmets, expressive faces, stocky troops, vibrant terracotta roofs, stone streets and lush foliage. Raster brushwork and material shading replace the flat vector appearance. Ground detail is deliberately softer than characters and landmarks, preserving clear combat silhouettes.

`painted-art.js` loads four optimised WebP atlases before scenery baking and the Start button becomes available. They contain 24 character views, four trees, seven landmarks and four painted materials, totalling about 775 KiB. Images load once; terrain is still baked into the existing visible-tile cache. The existing procedural renderer is a fallback if an atlas fails or takes longer than eight seconds to load.

Troop and civilian legs move independently underneath the painted jacket, with torso sway, breathing, firing recoil and a short collapse. Animation follows distance travelled and stops when movement is blocked. Eight painted facings retain the existing direction threshold. Face portraits use the painted atlas; helmets and enemy caps differ in shape and detail as well as colour.

![Painted character walking animation](docs/painted-walk.gif)

The built-in image-generation tool created the source artwork. The final prompt set, packing details and asset paths are recorded in [Painted art direction](docs/painted-art-direction.md). Runtime atlases live in `assets/painted/`; no external image service is needed to play.

The play canvas follows screen dimensions and density, capped at a 1600-pixel longest edge on desktop and 1200 pixels on touch devices. Native-resolution scenery tiles keep surfaces clear while high-quality filtering handles zoom. Small overlapping tile gutters prevent seams. Roads, POI positions, building footprints and vegetation anchors stay unchanged.

The unified HUD shows the current objective, three-stage mission progress, combat counters and selectable squad portraits with health bars and numeric HP. Fullscreen, tactical map and pause controls stay available during play. Touch layouts reserve space for the joystick and action buttons in portrait and landscape. The pause control becomes RETRY when the mission ends.

Run `npm test` to check gait timing, blocked actors, update-rate independence, muzzle/recoil timing, direction stability, continuous gait, smooth turning across angle seams, collapse, dust lifetime and scenery cache reuse, eviction, world edges and seam gutters.

Static scenery is cached as visible 512-pixel tiles, with 12 tiles retained on touch devices and 24 on desktop. Views containing more tiles retain all visible tiles to avoid rebuilding them each frame. A separate small overview serves the tactical map. Roads, building footprints, collision geometry and POI coordinates remain in `town-map.js` unchanged. Existing landmark image files are retained but no longer loaded by the game.

## Street navigation

Navigation uses a 12-pixel grid and a consistent 6-pixel ground clearance for route planning, walking and touch movement. Every route segment is checked against building footprints, and soldiers finish corner waypoints before turning. Clicks on blocked landmark footprints lead to a nearby walkable approach. Followers retain single-file positions when a wall prevents the squad from reforming into a wedge, and stalled walkers retry their route. Map geometry and POI positions remain unchanged.

The navigation regression suite runs individual and four-person squad movement to all eight POIs, and checks routes to a destination on every mapped road.

## Controls

### Desktop

- **Move soldiers**: left-click terrain to direct the selected squad
- **Fire machine gun**: hold right-click and aim with the cursor; ammunition is unlimited
- **Throw grenade**: press left + right mouse buttons together
- **View map**: press **M**
- **Pause / resume**: press **Enter** or **Esc**
- **Restart mission**: choose **RESTART MISSION** in the pause menu or the toolbar **Restart** button
- **1-4**: select an individual squad member
- **A**: select all

### Mobile

- **Move**: use the virtual joystick at the bottom-right
- **Fire**: hold the **FIRE** button at the bottom-left
- **Grenade**: tap **GRENADE**; it throws in the squad leader's facing direction
- **Map**: tap **MAP**
- **Pause / resume**: tap the pause button
- **Squad selection**: tap a squad portrait or **ALL** in the in-game HUD
- **Fullscreen**: tap **FULL**, then **EXIT** to return
- **Restart after mission end**: tap **RETRY**
- The touch layout supports portrait and landscape phones and coarse-pointer tablets

Open `index.html` in a browser to play.

## Cable Street

Choose **Historical Missions → Cable Street → Play Cable Street**. This nonviolent mission uses four civilian volunteers in a compact Christian Street reconstruction. Gather materials, reinforce the barricade, assist the waiting resident, hold the first police wave, move to the blue regroup marker and defend through the final four-minute hold. A breached barricade can be rebuilt; leaving it breached for 30 seconds ends the mission.

On desktop, right-click an object to approach and act, or press **E** nearby. Select individuals with **1–4** or their portraits. **HOLD** continues until the volunteer moves or cancels. **X** drops carried material or cancels work. On touch, tap an object to approach and act, tap terrain to move, or use the joystick and **ACTION** / **DROP / CANCEL** buttons. Firearms and grenade controls are hidden for this mission.

The street baseline comes from a calibrated 1916 map, checked against a 1937 aerial. Terrace details, scenario closures and object placements are simplified or fictional gameplay adaptations; the barricade vicinity is approximate. Source provenance and rebuild instructions are in [Cable Street authoring](authoring/cable-street/README.md).

Run `npm run cable:verify-release` to validate the production layout and `npm test` for all regressions, including a complete Cable Street playthrough. Rebuild geometry with `npm run cable:build-runtime-map`.

## Map data

Road and landmark positions are derived from OpenStreetMap data.

© OpenStreetMap contributors, ODbL 1.0.

## Optional two-player co-op

Belzig and Wigan support two soldiers per player through browser WebRTC. Single player stays available without networking. See [connection and free Firebase setup](docs/MULTIPLAYER.md). Until the project has a signalling database, use Multiplayer > Manual Connection.

## Runtime and deployment

`npm ci` installs locked dependencies. `npm run build` creates curated `dist/`; Firebase Hosting publishes only that directory. `npm run firebase:deploy` builds then uses the installed Firebase CLI. CI tests and deploys the same SHA. Manual deployments also run regression and browser tests.

`manifest.webmanifest` is authoritative. HTML and stable fallback paths revalidate; build-versioned `/static/` URLs cache immutably. Mission launch goes through TITLE / MISSION_SELECT / BRIEFING / LOADING / PLAYING, with PAUSED, RESULT and RECOVERY transitions. Existing flags remain compatibility adapters. Fixed simulation stays at 60 Hz with five catch-up steps maximum.

`npm test`, `npm run test:browser`, `npm run test:coop`, `npm run test:coop:rules`, `npm run test:coop:browser`, and `npm run test:visual` cover local rules, actual database rules, browser lifecycle and six representative screenshots. Build before browser/visual checks. Set `BADFODDER_TEST_DIST=1` for browser lifecycle against production output; `BADFODDER_BROWSER=firefox` or `webkit` selects additional engines. Install engines with `npx --no-install playwright install --with-deps chromium firefox webkit`. Cross-browser checks run separately weekly and on relevant PRs. Update reviewed visual baselines with `npm run test:visual:update`.

`?debug=1` enables `BadFodderDiagnostics.snapshot()` for frame/simulation/render timings, actors, paths, scenery cache, faults and co-op metrics. `?seed=example` seeds migrated gameplay spread and Director decisions. Storage reads legacy values and uses versioned envelopes on writes; unsupported versions safely fall back to defaults. No external analytics or AI service is used.
