# Bad Belzig clay presentation prototype

Open `https://bad-fodder.web.app/?clay=1`, then SELECT MISSION → BAD BELZIG → BEGIN. Remove `?clay=1` for the original art. Only Bad Belzig supports this sample.

The sample selects Karl, the nearest original enemy and civilian, one original tree, one ordinary building, the road nearest the opening spawn, a bounded grass patch and one existing decorative sandbag stack. Karl's checkpoint cover bags also use the material helper. Locations and geometry are unchanged; the selected tree is north of the opening area. Only the first explosion is converted, including its smoke stages. Restarting the squad resets that effect selection.

`clay-prototype.js` provides one deterministic Canvas clay material, soft grounding shadows, sculpted clothing/limbs, layered scenic foliage and cached replacement explosion stages. The building retains the original roof mesh, wall polygons, doors, windows and architectural detail. Scenery uses the existing tile cache. The shared pose/asset cache is capped at 320 canvases, rendered at 3× nominal resolution.

Pose snapshots use `floor(presentationClock × 12)` rather than changing the update loop. Logical coordinates interpolate normally; body poses hold for approximately 83.33 ms. Shots, hits and death begin immediately, then their poses step. Recoil, held recoil and recovery are three discrete presentations of the existing fire state. The explosion uses 15 visual steps per second. There are no gameplay timers, simulation writes or random-number calls in the prototype.

The HUD, aiming markers, camera and input remain smooth. No tilt-shift, full-screen filters or environmental wobble are used. Other missions and the default URL retain the existing rendering.

Validation:

- `node tests/clay-prototype.cjs`
- `node tests/animation.cjs`, `tests/actor-scale.cjs`, `tests/painted-art.cjs`, `tests/enemy-art.cjs`, `tests/buildings.cjs`, `tests/scenery.cjs`, `tests/checkpoint-assaults.cjs`, `tests/garrison.cjs`
- `node tests/clay-prototype-browser.cjs` with installed Playwright Chromium: desktop 1280 × 900 and landscape touch 915 × 412, tactical zoom 1.3 and maximum zoom 3.2. Captures go to `/tmp/clay-review` by default. The test fixture adds inspection helpers only to its local HTTP responses.
- Production build and packaging checks.

Browser checks assert working desktop/touch movement, exactly 12 held pose updates across 60 simulation ticks, unchanged entities and world geometry after drawing, bounded caching and zero runtime faults. Measurements are headless desktop emulation, not a physical phone performance guarantee.
