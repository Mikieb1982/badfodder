# Presentation bible

The permanent direction is a hand-painted playable historical miniature. The
four existing missions share one renderer and interaction language. Ordinary
people, vulnerable civilians and recognisable places remain the focus.

## Visual hierarchy

1. Quiet terrain: low contrast texture, clear routes, no decorative noise behind units.
2. Navigational structures: readable building masses, streets, walls and trees.
3. Hero landmarks: recognisable silhouettes, authored materials and restrained signage.

Keep footprints, collision, POI positions and character proportions stable during
polish. Light comes from the upper left; contact shadows ground feet and buildings.
Foreground occlusion must retain tactical outline cues for selected units.

## Shared interface

`ui-tokens.css` owns fonts, palette, spacing, materials, radii, focus, motion and
layer tokens. `presentation-ui.css` owns shared presentation and experience
panels. Existing menu/HUD styles own layout. `hud-zones.css` owns fixed touch
positions. New presentation must consume tokens rather than inject style tags.
Runtime inline styling is reserved for values driven by simulation or sizing.

Headings use the restrained serif display family. Commands and body copy use
the readable UI family; counters may use the numeric monospace family. These
initial stacks use installed fonts without network requests. Locally licensed
font files are a subsequent art task, not an implicit dependency.

Panels use dark olive backing, warm paper text, a subtle edge and short shadows.
The title artwork supplies the main title; never add another title over it.
Preserve current text scaling, safe areas and fixed mobile slots. Contextual
controls replace content within slots instead of moving neighbouring controls.

## Interaction and accessibility

- Selected: explicit border and underline, alongside existing text/icon cues.
- Focus: continuous 3 px warm paper outline with 3 px clearance.
- Unavailable: dimmed with a native disabled state; never a loading cursor.
- Wounded/downed: retain text, symbols and geometry alongside colour.
- Friend/opponent: distinct silhouettes and shape markers, never hue alone.
- State changes: brief feedback; no continuous decorative animation.
- Reduced motion: remove nonessential transitions, pulses and shake.
- Controller: prompts follow physical button positions and the active device.

## Animation, camera and audio

Gameplay remains fixed-step with interpolated rendering. Walking follows travelled
distance; important actions need anticipation, action and recovery. Do not impose
stop-motion stepping on gameplay. Keep recoil, impact and muzzle cues short.

Camera polish must preserve edge clamping and touch selection. Future impulses
belong in the world transform, bounded and disabled by reduced-motion settings.
Audio feedback must identify the action and material; keep music subordinate to
critical cues. Authored local samples should retain procedural fallback.

## Mission identity

| Mission | Materials and emphasis |
| --- | --- |
| Bad Belzig | Warm plaster, civic landmarks, gardens and domestic detail |
| Wigan | Brick, railway architecture, shopfront rhythm and pub identity |
| Cable Street | Compressed streets, neighbours, barricades and improvised tools |
| Barcelona | Distinct architecture, improvised resistance and changing control |

Mission palettes belong to the world, never to different UI themes.

## Implementation sequence and acceptance

First increment: shared UI tokens, coherent menu/HUD materials and typography,
static professional-feel styles, and experience/debrief presentation extracted
from runtime HTML. This does not complete the full professionalisation audit.

Next: explicit actor render passes and semantic input actions, then one Bad Belzig
benchmark section before propagating authored art and audio across all missions.
Production asset packs and reviewed screenshot baselines follow their owners.

Review desktop and landscape touch title, briefing and live HUD. Confirm controller
focus, fixed control slots, readable active states, objective announcements, debrief
layout, reduced motion and absence of runtime faults. Run core tests and the
production build. A captured reference is a review aid, not automatically an
approved screenshot baseline.
