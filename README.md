# Bad Fodder

A browser-based top-down tactical game inspired by classic squad-control games and set on a stylised Bad Belzig map.

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

The town uses original code-drawn pixel art in a limited earthy palette inspired by early 1990s tactical games. A 520 × 325 render buffer is enlarged with nearest-neighbour sampling. Terrain, roof tiles, trees and seven landmark silhouettes share the same pixel treatment. Soldiers use eight directional facings with distinct front, profile and rear views, four walking poses, alternating muzzle flashes and recoil, and fallen poses; civilians are unarmed. Actors draw in ground-depth order. Terrain uses mottled grass patches, aligned roof tiles, stepped foliage and detailed supply crates. All artwork stays in the original limited pixel palette.

The static town is baked once into a scenery canvas before play. Zoom and camera tracking reuse this canvas, while units and combat effects animate separately. Roads, building footprints, collision geometry and POI coordinates remain in `town-map.js` unchanged. Existing landmark image files are retained but no longer loaded by the game.

## Controls

- **Move soldiers**: left-click terrain to direct the selected squad
- **Fire machine gun**: hold right-click and aim with the cursor; ammunition is unlimited
- **Throw grenade**: press left + right mouse buttons together
- **View map**: press **M**
- **Pause / resume**: press **Enter**
- **Restart mission**: press **Esc**
- **1-4**: select an individual squad member
- **A**: select all

Open `index.html` in a browser to play.

## Map data

Road and landmark positions are derived from OpenStreetMap data.

© OpenStreetMap contributors, ODbL 1.0.
