# Bad Fodder

A browser-based top-down tactical game inspired by classic squad-control games and set on a stylised Bad Belzig map.

## Title and pause screens

![Bad Fodder title screen](docs/title-screen.jpg)

The game opens on a title screen based on the supplied Bad Fodder artwork. Start Mission becomes available when the town and sprites are ready. The mission does not advance behind the title screen. Controls and Options are available before starting.

Enter or the pause button opens the matching pause screen, with Resume, Restart Mission, Controls, Options and Main Menu. Escape returns from a submenu or resumes a paused mission. Arrow keys move through the menu and Tab stays within it. Mouse and touch controls work throughout.

Options change camera zoom, footstep dust, fullscreen mode and music. The supplied `assets/audio/bad_fodder.mp3` loops continuously across the title screen, mission and pause menu, using the same 22% volume and gentle fades as Sagenhaft. Playback starts after a click, tap or keypress. Music on/off is remembered locally; hiding the tab pauses playback and returning resumes it when enabled. A failed audio load exposes a retry button in Options. Artwork lives in `assets/menu/logo.webp` and `assets/menu/town-background.webp`; both use lossless encoding. The built-in image-generation tool prepared the artwork from the supplied image: remove the baked logo/menu and reconstruct the town background, then extract the red-and-gold Bad Fodder logo on transparency. Menu labels and buttons are live HTML rather than part of the picture.

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

The town uses original code-drawn pixel art in a limited earthy palette inspired by early 1990s tactical games. The play canvas follows the screen's dimensions and density, capped at a 1600-pixel longest edge on desktop and 1200 pixels on touch devices. Native-resolution scenery tiles replace the downscaled town bitmap, keeping roof, road and terrain detail sharp. Smooth camera positioning and light filtering on scenery scaling reduce shimmer without a full-screen blur. Tiles have a small overlapping gutter to prevent seams during scrolling. Terrain, roof tiles, trees and seven landmark silhouettes share the same pixel treatment.

Soldiers use compact eight-direction sprites inspired by the proportions in Cannon Fodder 2, drawn directly at their source resolution without sprite filtering. Eight walking poses follow actual distance travelled, so blocked and stationary units stop stepping. A small facing threshold reduces directional flicker. Restrained footstep dust, timed muzzle flashes, recoil, a three-stage collapse and six-stage explosion sprites animate independently of gameplay. Civilians remain unarmed.

Terrain combines warmer stippled ground, cobbles and densely dithered foliage. Landmark roof tiles match ordinary buildings. Roads, POI positions, building footprints and vegetation anchors stay unchanged. Trees and explosions use cached original pixel artwork.

Terrain and foliage use restrained contrast to avoid harsh isolated pixels. Hit reactions use a small, single recoil movement instead of rapid oscillation and transparency changes.

The unified HUD shows the current objective, three-stage mission progress, combat counters and selectable squad portraits with health bars and numeric HP. Fullscreen, tactical map and pause controls stay available during play. Touch layouts reserve space for the joystick and action buttons in portrait and landscape. The pause control becomes RETRY when the mission ends.

Run `npm test` to check gait timing, blocked actors, update-rate independence, muzzle/recoil timing, direction stability, collapse, dust lifetime and scenery cache reuse, eviction, world edges and seam gutters.

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

## Map data

Road and landmark positions are derived from OpenStreetMap data.

© OpenStreetMap contributors, ODbL 1.0.
