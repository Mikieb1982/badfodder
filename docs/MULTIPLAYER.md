# Two-player co-op

Belzig and Wigan use one host simulation. P1 owns soldiers 1–2; P2 owns soldiers 3–4. Select one or your pair, then use the normal movement, fire, grenade and H / Garrison controls. Cameras stay local. Both players see the shared mission and four-person report. Losing both soldiers leaves that player spectating. Only the host restarts a shared attempt.

Single player remains the default. Network modules load only when Multiplayer is opened. Cable Street remains single player.

## Connections

Open **Multiplayer**, choose a mission, then **Host Game**. The other player enters the room code and chooses **Join Game**. Gameplay uses native WebRTC DataChannels: reliable commands/results and unordered, unretransmitted state updates at 10 Hz. Firebase carries only the two connection descriptions, including gathered ICE candidates. No game state is stored there.

If room signalling is unavailable, **Manual Connection** works without Firebase:

1. Host selects **Create Connection Code** and sends the outgoing code to P2.
2. P2 pastes it into **Paste Received Code**, then presses **Connect With Code**.
3. P2 sends the outgoing reply to P1.
4. P1 pastes the reply and presses **Connect With Code**.

Codes expire after 15 minutes. The browsers use public STUN and direct connections only. Restrictive networks may prevent a connection; there is no paid TURN fallback or host migration. Returning to the menu closes the session. If P2 disconnects, their soldiers hold safely and P1 can continue. If P1 disconnects, P2 returns to the multiplayer menu.

## Activate Firebase room codes

The existing `bad-fodder` Hosting web-app configuration currently has an empty `databaseURL`. The repository cannot enable project services without Firebase administrator access. Manual connection remains usable while room codes are unconfigured.

In the existing project, keeping the **Spark** plan:

1. Enable **Authentication > Sign-in method > Anonymous**. This is internal connection authentication; there is no player login/account screen.
2. Create a **Realtime Database** on Spark, initially locked. Do not enable billing, Cloud Functions or Firestore TTL.
3. Publish `multiplayer-database.rules.json` as the database rules. These deny collection listing, require anonymous authentication, protect host identity and limit joining/answers to one peer. Expired rooms cannot be joined.
4. Put the project's public web API key and actual database URL in `multiplayer-config.json`. Never put administrator keys, service-account credentials or tokens there.
5. Deploy Hosting and the rules to that database. Verify host/join from two devices, then test returning to menu and room expiry.

Rooms use conditional creation, short polling while waiting, bundled ICE and a 15-minute expiry. The host deletes the record after starting, ending/leaving or timing out, including best-effort cleanup on page close. A browser forcibly killed before cleanup can leave an expired record; no paid background deletion is used. Spark quotas can stop signalling instead of switching to a paid service. Unused expired records can be removed from the Firebase console.

## Validation

- `npm run test:coop`: local-mode isolation, ownership, intent validation/rate limits, compact snapshots, deaths/garrison/checkpoints/results, report totals, room lifecycle and channel settings.
- `npm run test:coop:browser`: two native browser sessions with desktop host/mobile joiner for both missions. Firebase REST responses are mocked; gameplay travels through real DataChannels. Requires the repository's Playwright setup and Chromium.
- `npm test`: full existing regression suite plus co-op checks.

Browser tests deliberately use local ICE candidates. Public STUN/NAT traversal and production Firebase permissions require a two-device test after configuring the live project. No claim of universal direct connectivity is made.

In constrained CI environments, set `BADFODDER_COOP_MOCK_RTC=1` to test real browser gameplay with an explicit test-only transport. This exercises the full menu, room flow, protocol and host/client bridges, but does not validate native NAT traversal. In this workspace native Chromium generated no ICE candidates, so live connection verification remains blocked. Both mission integration tests passed with the test transport; the full Node suite passed.
