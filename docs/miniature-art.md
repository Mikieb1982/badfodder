# Pitched miniature town

The source screenshot has substantial gabled houses. The previous result had mostly flat roof surfaces and shallow walls, even after replacing the materials.

This pass projects two sloped roof planes over each original building footprint. Slate textures follow the slope instead of being painted on a flat shape. Raised gables, deeper weathered walls, timber framing, dormers, chimneys and directional shadows provide the miniature-town depth. Dirt paths gain two wheel ruts. The default zoom is 1.3, with 1.6 Close and a maximum manual zoom of 1.8.

`building-art.js` computes roof geometry once per house and retains it with the cached scenery. Ground footprints, collisions, roads, POIs, gameplay, animated troops, ambient audio and the MacBook combat controls remain intact. Concave footprints retain their area when split across the ridge. No giant background map image replaces the town.

The HUD has four distinct face portraits in `assets/painted/portraits.webp`, with names above portraits and larger health numbers alongside. Mobile landscape DOWN cards also show the status as text.

Validation: `npm test` covers roof projection and all 906 mapped footprints, distance-based animation, terrain cache, routes to all eight POIs and 137 street destinations, music lifecycle, five-atlas loading and missing/stalled-image fallback. Headless Firefox desktop, touch portrait and touch landscape load without page errors. Phone fullscreen fallback retains the objective, tools, squad cards and touch controls. Native fullscreen on a physical phone has not been tested.

Review screenshots: `miniature-market.webp` and `miniature-phone.webp`. These are captured from the running game, with the camera positioned at Marktplatz.

Portrait generation prompt:

Create a game portrait atlas: one row of four equal square cards, face and shoulders of four distinct adult male cartoon infantry soldiers wearing weathered olive steel helmets and olive uniforms. Match the tactile miniature battlefield and rugged military HUD style of attached reference, hand painted crisp illustration with believable faces and slightly exaggerated expressions, not bobblehead toys, not photorealism. Portrait 1 clean shaven determined light skin, 2 dark moustache and warmer complexion, 3 narrow thoughtful face light skin, 4 round face stubble light skin. All face forward, helmets and faces completely visible, crop at upper chest, occupy 85 percent of each square. Dark muted grey olive plain background in each cell. Equal four columns with no gaps, no border, no writing, no UI. Light from upper left, subdued cream/olive/earth colours. Exact 4:1 wide image.
