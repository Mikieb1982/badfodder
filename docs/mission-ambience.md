# Mission ambience

48-second mono background beds, locally hosted as WebM/Opus with MP3 fallback. Existing music and action sound effects are retained. Ambience volume has its own saved slider; SFX OFF mutes it. Beds play only during PLAYING and stop in menus, pause, results and hidden tabs.

| Mission | Sound design |
| --- | --- |
| Bad Belzig | Open-air wind, faint crowd, sparse distant shots and rumbles |
| Wigan | Less wind, stronger street crowd, sparse distant shots and one rumble |
| Cable Street | Crowd and low wind, no gunfire or explosions |
| Barcelona | Stronger crowd, more distant reports and two rumbles |

## CC0 sources

- Wind: Luke.RUSTLTD, https://opengameart.org/content/wind1
- Crowd Shouting/Speaking Ambience: StarNinjas, https://opengameart.org/content/crowd-shoutingspeaking-ambience
- Random gunfire SFX: iamoneabe, https://opengameart.org/content/random-gunfire-sfx
- Muffled Distant Explosion: NenadSimic, https://opengameart.org/content/muffled-distant-explosion

License for every source: CC0 1.0, https://creativecommons.org/publicdomain/zero/1.0/

These are edited sound-design samples, not recordings of the historical events. The explosion is a reverberating log-drum sound, and the wind is synthesized. Source audio is filtered, peak-normalised, mixed at conservative gains, edge-faded and encoded by tools/audio/import-ambience.py. The importer records download hashes and credits in assets/audio/ambience/sources.json. Run it only to refresh the committed assets; players need no external service or account.
