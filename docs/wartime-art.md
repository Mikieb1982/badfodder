# Mission presentation and character assets

Mission narrative and costume data live in `mission-identities.js`. Internal map IDs,
objective phases, save keys and navigation remain unchanged. `wartime-scenery.js`
adds deterministic cosmetic verge props without adding collision objects.

`mission-character-art.js` shares the existing distance-driven pose and gait.
It loads optional painted atlases with a four-second timeout, falling back to a
mission-specific canvas costume if loading fails. Source images are intact;
alpha bounds recorded in the module align each direction at the feet. Painted
lower-leg articulation follows the existing movement phase. Firing, hurt and death
poses retain the shared state system.

## Asset provenance

Original assets generated with the built-in image generation tool, October 2026.
No external image API or downloaded commercial game sprites were used.

- `assets/characters/portraits-1936-1945.png`: four columns, three mission rows:
  Cable Street, Wigan, Belzig. Prompt: original hand-painted wartime character
  portrait atlas, consistent lighting, period clothes and each mission's four
  fictional residents/volunteers/resistance fighters, no captions.
- `cable-street.png`, `wigan.png`, `belzig.png`: eight direction columns and four
  character rows; transparent PNG. Prompt: hand-painted arcade tactics miniatures,
  exaggerated heads and stocky proportions, 40-degree overhead camera, full-body
  turnaround east, southeast, south, southwest, west, northwest, north, northeast;
  consistent upper-left light and baseline, neutral stance, no text or scenery.
  Each row uses the character's mission-specific hat, coat, scarf and period weapon
  from the identity data. Cable Street figures are unarmed civilians.

The generated directions are stylised approximations rather than a full hand-drawn
walk cycle. Frames are kept at source resolution; renderer scales them once on the
canvas and animates the legs without altering collision or navigation.

## Verification

`npm test` includes identity invariants and scenery immutability alongside the
existing combat, navigation and Cable Street simulation suites.
`npm run test:browser` exercises briefing, launch, menu/resume, retry, result,
recovery and optional-asset failure. It defaults to Chromium; local Firefox can
be selected with `BADFODDER_BROWSER=firefox`. Firefox uses real mouse pointer
capture on the mobile-sized joystick; Chromium uses CDP touch input. Physical
mobile-device testing remains separate from browser viewport testing.
