# Handcrafted miniature presentation

The approved miniature style is now the default on https://bad-fodder.web.app/ for Bad Belzig, Wigan, Cable Street and Barcelona. `?clay=1&study=1` retains the bounded Bad Belzig reference study. `?miniatures=0` provides the original renderer for comparisons and asset-failure diagnosis. Normal gameplay has no study button or extra overlay.

The shared Canvas layer in `clay-prototype.js` supplies cached grass, paving, plaster, terracotta, brick, asphalt, slate and flat roof materials; scenic tree variants; stitched sandbags and crates; contact shadows; 12 Hz character presentation and 15 Hz sculpted explosion/smoke replacements. World material tiles render at native resolution rather than allocating nine times their pixel area. The shared cache stays bounded at 320 canvases; the character finish cache stays bounded at eight atlases. The four local WebP sheets total approximately 2.43 MB, only 0.50 MB more than the approved prototype. No new dependencies, paid services, full-screen filters or camera blur are introduced.

Each mission retains its named characters, silhouettes, faces, clothes, headwear, equipment and team markers. Existing detailed actor atlases receive a restrained cached matte finish and use the same held presentation clock. Karl keeps the approved replacement figure. Existing city facade/roof lighting passes use the shared materials, retaining Tudor House, period brickwork, slate roofs, Barcelona's flat roofs, windows, entrances and signs. Barcelona's local scenic trees and barricade sandbags use the shared scenic assets. Footprints, roads, collision, movement, objective logic, input, co-op and save data are unchanged.

Animation snapshots use `floor(presentationClock × 12)`. Only poses, their visual clocks and gait phase are held; entity coordinates, camera movement and controls continue normally. Existing shot, hit, throw and death events begin immediately. All ordinary blasts use eight replacement flash/fire/smoke stages at 15 Hz. The simulation remains at 60 Hz.

Checks:

- Shared-material test: reference-study isolation, default four-mission coverage, twelve pose snapshots over sixty ticks, immediate events, immutable entities, deterministic caching, preserved actor identities and original-renderer fallback.
- Relevant existing animation, actor-scale, painted-art, enemy-art, building, scenery, checkpoint, Wigan, Cable Street art and Barcelona character/runtime checks.
- Focused browser inspection at 1280 × 900 desktop and 915 × 412 landscape touch, tactical zoom 1.3 and maximum zoom 3.2. Actual screenshots cover all four missions. Checks cover movement or Cable Street's existing shove action, unchanged entities/geometry after drawing, 12 Hz poses, bounded caches and runtime errors.
- Production build and offline asset packaging.

Wigan currently fails its pre-existing startup connectivity check: `Civilian spawn 14 is not reachable from the squad start.` This is reproducible with `?miniatures=0` and occurs before scenery baking. The default browser check reports that failure. For visual inspection only, `BADFODDER_ALLOW_KNOWN_WIGAN_SPAWN=1` catches exactly that known error in the test-injected page; other connectivity failures still throw. This bypass is never included in production HTML or gameplay code. Wigan's normal startup is therefore not claimed to pass.

Browser command: set `BADFODDER_PLAYWRIGHT` and `BADFODDER_CHROMIUM_EXECUTABLE` as needed, then run `node tests/clay-prototype-browser.cjs`. `BADFODDER_SCREENSHOTS` selects the screenshot directory; `BADFODDER_MISSION` can limit inspection to one map. `BADFODDER_ORIGINAL=1 BADFODDER_MISSION=wigan` reproduces the original-renderer startup failure. Measurements are headless emulation, not measurements on a physical phone.
