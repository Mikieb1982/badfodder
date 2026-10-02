# Bad Fodder playtest checklist

Run this checklist after `npm test` passes and the latest build is deployed.

## Desktop / MacBook

### Bad Belzig
- Start a new game and complete all three objectives in order.
- Confirm the Postdistanzsäule patrol must be cleared and the area held briefly.
- Confirm Burg Eisenhardt is reachable by all four soldiers without anyone becoming stuck.
- Confirm the castle objective cannot complete while a hostile is contesting the objective area.
- Confirm Marktplatz completion only depends on its assigned defenders, not unrelated enemies elsewhere.
- Test right-click fire where available.
- On a one-button trackpad, test Shift-click/F fire and Option/Alt-click/G grenade.
- Kill the currently selected soldier, then confirm firing automatically continues with surviving squad members.
- Die/retry once and confirm F/G still work.

### Wigan
- Confirm the mission starts outside Tudor House in the intended rotated orientation.
- Complete Tudor Breakout, Grand Arcade and Station Run in order.
- Take at least two different routes toward Grand Arcade.
- Confirm King Street is optional and its defenders do not block Station Run.
- Collect the King Street grenade cache.
- Confirm Wallgate/North Western extraction completes after its assigned defenders and secure hold.

## Mobile / touch device

Run both missions on a physical phone, preferably once in portrait and once in landscape.

- Enter and exit full-screen mode.
- Move the joystick slightly and confirm slow precise movement.
- Move it fully and confirm a clear run-speed increase.
- Move and hold FIRE simultaneously for at least 10 seconds.
- Release FIRE outside the button, rotate the phone and background/return to the browser; confirm firing is never stuck on or disabled.
- Repeat the same interruption tests while moving the joystick.
- Pinch with two fingers to zoom in and out; confirm the world stays centred under the pinch.
- Open/close the tactical map during movement.
- Pause/resume during firing and movement.
- Retry after squad death and confirm FIRE/GRENADE controls still work.
- Confirm HUD, joystick and action buttons do not overlap in landscape.
- Complete both missions from start to finish.

## Cable Street

- Select Historical Missions → Cable Street and confirm PLAY is available.
- Confirm the squad uses civilian volunteers and FIRE / GRENADE are hidden.
- Right-click a material, or tap it on touch, and confirm the selected volunteer walks over and carries it.
- Use E / ACTION nearby and X / DROP / CANCEL to release work or material.
- Deliver material to the barricade, assist the waiting resident and watch the resident reach the east exit.
- Start HOLD and confirm it stays active; move away and confirm that volunteer no longer mitigates police damage.
- Complete preparation, the first wave, regroup at the blue marker and the final four-minute hold.
- Rebuild a breached barricade and confirm it blocks movement again. Leave a breach for 30 seconds and confirm failure / retry.
- Pause/resume and restart in each phase; confirm no duplicate barricades, residents or crowd.
- On a phone, test joystick plus ACTION, tap-to-act, pinch zoom, portrait/landscape and interrupted input.
- Confirm buildings do not hide the selected volunteer or important material labels.

Automated production-map simulation and DOM/canvas startup checks are available; physical device and real-browser checks should be recorded after deployment.

## Visual checks

- Soldiers should pass behind foreground buildings/trees without becoming impossible to locate.
- Selected soldiers should retain a restrained outline when occluded.
- Bad Belzig should read as warm plaster/terracotta/stone.
- Wigan should read as denser brick/shopfront/pub/station architecture.
- Temporary pickup/error notices should not replace the current objective.
- TARGETS should show current compulsory defenders rather than all enemies on the map.

Record device/browser, any reproduction steps, and a screenshot for each failure.
