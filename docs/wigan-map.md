# Mission two: Wigan town centre

The previous hand-positioned blocks have been replaced with OpenStreetMap street lines, building footprints, railway tracks, platforms, green areas and individual trees. The supplied Wigan rendition guides the miniature art, not the geography. The map is north-up, with one consistent metre scale. It covers Wallgate and North Western through the bus station, New Market Street, Market Place, Standishgate, Grand Arcade, Millgate and King Street.

## Landmarks and entrances

| Landmark | Mapped frontage | OSM building ID |
| --- | --- | --- |
| Wigan Wallgate | Wallgate | 1350051925 |
| Wigan North Western | Wallgate | 126406381 |
| Wigan Bus Station | New Market Street | 782427411 |
| Tudor House pub | New Market Street | 738652992 |
| Moon Under Water | Market Place | 941417293 |
| John Bull Chophouse | Coopers Row | 759771131 |
| Grand Arcade | Standishgate | 581252033 |

“Jumble Chop House” is interpreted as John Bull Chophouse. King Street is labelled as the nightlife street. Market Place and Standishgate also have map markers. The tactical map has a numbered legend, a north indicator, the squad position and the current objective. Pub markers identify their actual mapped building, while movement destinations and objectives use the public street frontage so soldiers are not sent into a roof.

The five mission phases are the station gateway, Tudor, Market Place, King Street and Grand Arcade. The Tudor and King Street sectors must be cleared before advancing; the final phase requires all remaining hostiles to be eliminated and the squad to reach the Arcade's Standishgate entrance. The squad starts near North Western. Hostiles, civilians and supplies use reachable streets; the first hostile groups are separated from the spawn. Defender groups follow their nearest geographic sector instead of mixing distant parts of town.

The live view includes an objective compass and metre distance. The tactical map draws a route using the same collision-safe pathfinder as the squad. During the final clearance phase it marks remaining hostiles and guides the squad to the nearest contact; once the town is clear, guidance returns to Grand Arcade. The route is cached between meaningful changes in squad or target position.

Wigan ammunition crates now add two grenades, up to a reserve of eight. A full reserve leaves the crate available for later. Medical crates restore four health and are retained when everyone nearby is healthy. This keeps the Tudor and King Street supplies useful during the mission.

## Presentation

Wigan uses weathered red brick facades, cream window frames, slate gables, flat commercial roofs, paved pedestrian streets, quieter asphalt, rail sleepers and mapped platforms. The Tudor has a red-brick ground floor and black-and-white upper facade; John Bull has painted brick and a green fascia; Moon Under Water has a stone-coloured frontage and pilasters. Stations have named fascias and glass awnings. King Street gets subdued plum-coloured nightclub frontages, while the centre gets shop windows and cafe fronts. Grand Arcade has a clipped glass roof lantern over its existing footprint. The existing articulated infantry, continuous walking gait, recoil, turning and collapse animation now load their painted assets in Wigan too; the old Wigan preload path had skipped them.

`wigan-details.js` derives frontage orientation from the existing streets. Its 37 decorative lamps, benches, planters, bins and bollards are placed at curbs, away from intersections and landmark approaches. The furniture, generic shop names and awnings are art details, not surveyed features. They do not change collision or map geometry. Buildings and props share a depth-sorted static scenery pass. No additional generated images were needed for these facade details.

Architecture is stylized. Heights, roof shapes and materials use mapped tags where available and reasonable art defaults otherwise. Street centre lines and building geometry come from the snapshot; road widths use OSM width tags or class-based defaults. This is a geographic town-centre game map, not a surveyed architectural reconstruction. No generated background image controls collision or replaces the map.

The urban atlas is `assets/wigan/materials.webp` (1024 × 1024). Quadrants are brick, asphalt, sandstone paving and bitumen. The raster materials are packed into cached tiles, with subdued contrast to avoid harsh, shifting detail. Buildings and roads remain canvas geometry. Static scenery uses the existing tile cache. Landmark captions keep a consistent screen size and avoid overlapping captions. The phone HUD uses the short objective title; full instructions remain in the status text.

## Rebuild and data licence

Run `python tools/import-wigan.py` from the repository root to regenerate `wigan-map.js` from `data/wigan-geography.json`. The result is deterministic and needs no network connection at runtime or during an ordinary rebuild. To refresh the source snapshot, download the OSM API map below and run `python tools/import-wigan.py --xml /path/to/map.xml`.

The snapshot retains public geographic feature IDs, selected map tags and coordinates. It excludes contributor names, user IDs and edit metadata. Map data © OpenStreetMap contributors, licensed under [ODbL 1.0](https://opendatacommons.org/licenses/odbl/1-0/); see [OpenStreetMap attribution and copyright](https://www.openstreetmap.org/copyright). The game footer links that attribution. The snapshot and generated geographic database retain the same attribution and licence.

Sources checked:

- [OpenStreetMap API geographic extract](https://api.openstreetmap.org/api/0.6/map?bbox=-2.641,53.541,-2.623,53.549), retrieved 1 October 2026.
- [Wigan town-centre transport map](https://trythetrain.org.uk/wp-content/uploads/2025/03/Wigan-map-Digital-3.pdf), used to cross-check the two live railway stations and street relationships.
- [John Bull Chophouse](https://johnbullchophousewigan.co.uk/), [Moon Under Water](https://www.jdwetherspoon.com/pubs/the-moon-under-water-wigan/) and [Grand Arcade](https://www.grand-arcade.co.uk/), used to cross-check the named destinations.
- [Wigan Council's town-centre prospectus](https://www.wigan.gov.uk/Docs/PDF/Business/Property-and-Land/Developer-hub/Wigan-Town-Centre-Prospectus.pdf), New Market Street page, used as the Tudor facade reference. [Historic England's John Bull listing](https://historicengland.org.uk/listing/the-list/list-entry/1384460) confirms its painted-brick and slate treatment.

## Validation

`npm test` passes. Wigan checks cover north-up coordinates, actual landmark feature IDs, clipped geometry, individual and full-squad movement to all ten street frontages, and 65 named town-centre street segments. Bad Belzig's eight POIs and 137 street destinations still pass. The stopped single-file formation was tightened to prevent the last soldier being stranded too far behind at a narrow destination.

Headless Firefox checks cover desktop, phone portrait and touch landscape, including retina canvas scaling and phone fullscreen fallback. No page errors occurred. Actual game route updates completed all five Wigan objectives in sequence, persisted the win, and allowed retry. A separate deterministic automated run kept all 18 hostiles active and used production movement, enemy AI, firing, projectiles and health updates; it completed all five objectives with all four soldiers surviving. This is an integration check using an automated player with perfect enemy-position knowledge, not a human difficulty assessment. The earlier Bad Belzig completion/next-map check remains valid. MAP/BACK and the final-contact route are also checked. Physical phone native fullscreen and human combat balance have not been verified.

The active-enemy run exposed repeated whole-map searches when a defender selected an enclosed courtyard. Wigan now caches connected navigation regions, prepared during loading. A disconnected open target is rejected immediately; roof clicks still use a reachable outside approach. Tests cover closed courtyards, repeated rejected targets, roofs and a courtyard with a genuinely open alley, as well as the real map routes. The Bad Belzig navigation behaviour stays unchanged.

The existing volume test double was updated for the newer slider elements. A missing saved volume previously became zero through `Number(null)`; it now retains the intended 22% default, while an explicitly saved zero remains silent.

Review captures from the running game: [town centre](wigan-town-centre.webp), [Tudor](wigan-tudor.webp), [King Street](wigan-king-street.webp), [tactical map](wigan-tactical-map.webp), [final contacts](wigan-final-contacts.webp), [phone](wigan-mobile.webp).

## Urban material generation prompt

Use case: stylized-concept. Asset type: four tile raster material atlas for an overhead miniature Wigan town-centre tactical game. Input image is a style reference only. Exact square 2 by 2 grid, four equal square seamless material tiles touching with no gutters, no text or objects. Top left: weathered red-brown English Victorian brickwork, fine pale warm-grey mortar, horizontal running-bond courses, subtle uneven old bricks, no wall silhouette. Top right: dry dark warm-grey asphalt, very fine low-contrast natural aggregate, no lane markings, no cracks bigger than a small pebble. Bottom left: town-centre grey-beige sandstone pavement slabs, small regular staggered rectangles with subtle worn grain and narrow joints, overhead. Bottom right: dark grey weathered commercial flat roof bitumen, quiet fine grain with faint broad sheet seams, no objects. Crisp tactile hand-painted miniature realism like reference, slightly cartoony, warm late-day neutral lighting from upper left. Calm non-flickering detail, no pixel art, no vector-flat gradients, no buildings or greenery or shadows of objects. Each tile is a material surface only.
