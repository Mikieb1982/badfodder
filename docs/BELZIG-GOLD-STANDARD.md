# Belzig gold-standard rules

Belzig is the release-quality reference for later Wigan, Cable Street and Barcelona presentation work. Reuse these rules without copying Belzig-specific content or mission logic.

## Actors

- Keep gameplay coordinates, hitboxes and simulation speed untouched. Presentation motion belongs in the actor render pipeline.
- Preserve the authored character atlas and directional pose system. Add only low-amplitude visual offsets for gait, idle breathing, recoil and hit response.
- Use one grounded contact shadow. Selection remains the strongest squad cue; secondary state cues must be smaller and shape-based.
- Wounded states use one short condition notch. Badly wounded uses two. Downed uses the existing rescue cross/ring. Death settles through the authored death pose without arcade particles.
- Muzzle flash has one visual owner. Do not stack a shared flash on a mission renderer that already draws one.
- Enemy actors use the same recoil, hit and suppression readability standard as the squad without changing AI, accuracy or damage.

## Environments

- Preserve authored map geometry, roads, collision and strong existing scenery.
- Landmarks must share the scene's directional light, contact depth and restrained texture density. Do not use raw photographic or clip-art treatment.
- Rathaus, Burg Eisenhardt and other named POIs should remain more legible than ordinary buildings at normal tactical zoom without becoming visually louder than combat.
- Keep prop and debris density low enough that actors, checkpoints and objective routes remain readable.
- Cache landmark finishing and procedural surface work. Avoid new full-screen filters or per-frame texture generation.

## UI and world-space cues

- The HUD states the current objective once. World-space feedback answers position and actor state, not duplicate prose.
- Objective changes use the existing compact mission panel pulse and a restrained cue through the existing SFX system.
- Garrison, hold/follow, wounded, downed and suppression cues use distinct shapes as well as tone, so they remain readable without relying on colour alone.
- Temporary command/state confirmation should fade quickly and never cover an actor or objective marker.
- Keep the existing controller mapping and mobile HUD slots fixed. Context availability must never cause control movement.

## Animation

- Keep the fixed 60 Hz simulation. Animation is presentation-only.
- Walking uses the existing distance-driven gait with a very small body cadence to reduce sliding.
- Idle motion is subtle breathing/stance movement and is disabled or reduced when reduced-motion is requested.
- Firing combines a short backward weapon/body impulse with a single muzzle flash owner.
- Hit reaction is brief and directional enough to read, but must never alter gameplay position.
- Garrison posture sits slightly lower and steadier behind cover while the real actor coordinate stays unchanged.

## Audio

- Keep separate music and SFX volume settings and the existing compressor/master chain.
- Friendly gunfire remains the clearest repeated combat sound; enemy fire is slightly recessed; impacts are shorter; explosions sit above both without clipping the mix.
- Objective changes use a quiet mission cue. Do not compete with gunfire or casualty information.
- Ambience remains below combat and objective communication and should not restart abruptly across phase changes.

## Performance and test rule

- Prefer cached assets, canvas primitives and bounded effects. Do not allocate particle systems or procedural textures every frame.
- Any shared presentation change must prove it does not leak into another mission.
- Belzig lifecycle, actor pipeline, browser lifecycle, mobile landscape layout and visual baselines are release gates, not optional polish checks.
