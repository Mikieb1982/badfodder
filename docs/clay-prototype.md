# Bad Belzig clay miniature prototype

Open https://bad-fodder.web.app/?clay=1&study=1 for the animated material study. The study displays the same assets used by the live renderer together, including the actual selected Bad Belzig building mesh. Return to the menu, then SELECT MISSION → BAD BELZIG → BEGIN for gameplay. The study shortcut is available in the menu only, so it cannot cover live aiming information or touch controls. Removing `clay=1` restores the original presentation.

This revision replaces the primitive oval/capsule artwork with three compressed, locally served WebP atlases (1.93 MB total): detailed plasticine player/enemy/civilian miniatures, scenic trees and stitched sandbags, eight sculpted explosion/smoke replacements, grass, paving, plaster and roof materials. Generated source artwork is cropped using inspected per-object rectangles rather than assuming a perfectly regular atlas. Faces, clothing folds, scarves, belts, equipment and footwear remain readable at close zoom. Enemy equipment and civilian proportions provide distinctions beyond colour.

`clay-prototype.js` supplies shared material patterns, deterministic selection and imperfections, upper-left lighting, soft contact shadows and cached poses/effects. Reflected texture edges remove hard repeat seams; the grass is a single feathered patch. Roof materials use the existing roof-plane transform. Building footprints, roofs, original windows/doors and collision geometry remain unchanged. Cache capacity remains 320 canvases; there are no full-screen filters, blur, changing noise or new runtime dependencies. Loading is opt-in and bounded by a ten-second timeout; unavailable artwork falls back to the original renderer.

The live sample converts Karl, the nearest original enemy and civilian, one original tree, one representative building with both footprint dimensions over 40 world pixels, the road nearest the opening spawn, a bounded grass patch and one existing decorative sandbag stack. Karl's checkpoint cover bags also use the shared sandbag asset. The isolated study arranges these materials for review without relocating world entities. The actual selected tree/building/enemy may lie beyond the opening screen. Only the first existing explosion uses the replacement stages; a squad restart resets that selection. Wigan, Cable Street and Barcelona retain their existing art.

Pose snapshots use `floor(presentationClock × 12)`. The existing illustrated-character limb replacement technique gives the detailed sprites held walking/running poses, occasional idle poses, recoil/hold/recovery, hit and collapse. The larger death cache prevents clipping. Logical coordinates continue to move normally; shots/hits/death start immediately. Explosion/smoke artwork replaces at 15 Hz. Simulation, input, camera, HUD and weapon timing are untouched.

Validation:

- `node tests/clay-prototype.cjs`: 12 held updates in 60 ticks, immediate events, immutable entities, warmed asset reuse and opt-in/mission isolation.
- Existing directly relevant animation, actor-scale, painted-art, enemy-art, buildings, scenery, checkpoint-assaults and garrison tests.
- `node tests/clay-prototype-browser.cjs` with Playwright Chromium: desktop 1280 × 900 and landscape touch 915 × 412, tactical zoom 1.3 and maximum zoom 3.2, animated study, working desktop/touch movement, unchanged entity/map geometry after render, bounded caches and zero runtime errors. Screenshot directory can be set with `BADFODDER_SCREENSHOTS`.
- Production build and offline packaging checks.

Rendering timings are comparative headless viewport measurements, not measurements on a physical phone. No strong tilt-shift or full-game conversion is included.
