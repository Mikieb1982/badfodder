# Two-player co-op

Belzig and Wigan use one host simulation. P1 owns soldiers 1–2; P2 owns soldiers 3–4. Select one or your pair, then use the normal movement, fire, grenade and H / Garrison controls. Cameras stay local. Both players see the shared mission and four-person report. Losing both soldiers leaves that player spectating. Only the host restarts a shared attempt.

Single player remains the default. Network modules load only when Multiplayer is opened. Cable Street remains single player.

## Connections

Open **Multiplayer**, choose a mission, then **Host Game**. The other player enters the room code and chooses **Join Game**. Gameplay uses native WebRTC DataChannels: reliable commands/results and unordered, unretransmitted state updates at 10–20 Hz. Firebase carries only the two connection descriptions, including gathered ICE candidates. No game state is stored there.

If room signalling is unavailable, **Manual Connection** works without Firebase:

1. Host selects **Create Connection Code** and sends the outgoing code to P2.
2. P2 pastes it into **Paste Received Code**, then presses **Connect With Code**.
3. P2 sends the outgoing reply to P1.
4. P1 pastes the reply and presses **Connect With Code**.

Codes expire after 15 minutes. The browsers use public STUN and direct connections only. Restrictive networks may prevent a connection; there is no paid TURN fallback or host migration. Returning to the menu closes the session. If P2 disconnects, their soldiers hold safely and P1 can continue. If P1 disconnects, P2 returns to the multiplayer menu.

## Activate Firebase room codes

The repository uses `multiplayer-config.json` with the public Realtime Database URL. No Firebase Authentication or player account is required. Keep the existing Spark project and publish `multiplayer-database.rules.json` with the installed Firebase CLI. Never put administrator credentials in public configuration.

Rules reject collection reads, restrict room IDs and mission choices, validate offer/answer shapes, forbid room replacement and expiry extension, and permit deletion of expired rooms. Join and answer are single-use. Rooms expire after 15 minutes. The host deletes signalling after connection or exit; pending cleanup survives reload. The hourly `Clean expired co-op rooms` GitHub workflow removes expired records using the existing deployment service-account secret. This administrative sweep uses an indexed expiry query; public rules remain locked. No paid server, Cloud Functions, TURN or TTL service is required. Scheduled runs may be delayed by GitHub; expiry still prevents joining.

Snapshots have a 60 KiB UTF-8 budget below the protocol's 64 KiB limit. Oversized packets first omit effects and cosmetic actor fields. Gameplay actors/projectiles/objectives remain complete; if those exceed the budget, co-op reports the problem and disconnects instead of silently losing state.

## Validation

- `npm run test:coop`: local-mode isolation, ownership, intent validation/rate limits, compact snapshots, deaths/garrison/checkpoints/results, report totals, room lifecycle and channel settings.
- `npm run test:coop:browser`: two native browser sessions with desktop host/mobile joiner for both missions. Firebase REST responses are mocked; gameplay travels through real DataChannels. Requires the repository's Playwright setup and Chromium.
- `npm run test:coop:rules`: actual Firebase database emulator rules for creation, joining, answers, expiry, cleanup and invalid writes.
- `npm test`: full existing regression suite plus co-op checks.

Browser tests deliberately use local ICE candidates. Public STUN/NAT traversal and production Firebase permissions require a two-device test after configuring the live project. No claim of universal direct connectivity is made.

In constrained CI environments, set `BADFODDER_COOP_MOCK_RTC=1` to test real browser gameplay with an explicit test-only transport. This exercises the full menu, room flow, protocol and host/client bridges, but does not validate native NAT traversal. In this workspace native Chromium generated no ICE candidates, so live connection verification remains blocked. Both mission integration tests passed with the test transport; the full Node suite passed.
