# Painted enemy artwork

Enemy-only visual upgrade for Bad Belzig, Wigan, Barcelona and Cable Street. Three transparent eight-direction atlases replace the simplified costume renderer when loaded. Players, civilians, collision, health, AI and combat rules remain unchanged. Existing distance-driven gait, recoil, hurt and collapse states are retained. Missing enemy art falls back to the previous renderer.

Assets:
- assets/characters/enemies/occupation.webp: four occupation-soldier roles, shared by Bad Belzig and Wigan.
- assets/characters/enemies/barcelona.webp: Spanish rifleman, patrol, officer and support gunner.
- assets/characters/enemies/cable-street.webp: unarmed Metropolitan policeman and unarmed blackshirt marcher.
- Matching JSON files record frame rectangles, foot anchors and 43-unit display height.

Created with built-in image generation using the existing squad sheets as style references. Each whole sheet was generated in one pass. The sprite-pipeline normalizer packages each directional row at one shared scale. Feet are anchored consistently; disconnected background fragments are removed during extraction. The original generated PNGs are retained in the generating conversation.

Prompt set:
1. Match the Belzig reference's richly painted compact adult proportions, fabric texture, warm highlights and deep shading. Four rows of German occupation rifleman, MP40 assault trooper, pistol officer with long coat, and MG34 support gunner. Eight consistent facings per row, no faction symbols or text, transparent background, complete boots and weapons, generous gutters.
2. Match the Barcelona reference's compact painted adult proportions. Four rows of 1936 Spanish rebel army rifleman, moustached patrol rifleman with rolled sleeves, pistol officer and Hotchkiss support gunner. Khaki uniforms, period caps and equipment, eight consistent facings, no German uniforms, no modern equipment, no symbols or text, transparent background.
3. Match the Cable Street civilian reference. Two rows of 1936 Metropolitan policeman in navy tunic and custodian helmet, and adult blackshirt marcher in black shirt and charcoal trousers. Both unarmed. Eight consistent facings, no armbands or symbols, transparent background, complete boots, clean silhouettes and dimensional shading.

Direction order for every atlas: east, southeast, south, southwest, west, northwest, north, northeast. Camera, costume, scale and lighting stay consistent within each row.
