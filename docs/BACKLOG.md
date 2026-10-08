# IF I CAN SHOOT RABBITS - Design and Implementation Backlog

Status: Active planning document
Last consolidated: 8 October 2026

This backlog separates agreed direction from actual implementation work.

Workflow:

IDEA -> CANDIDATE -> APPROVED -> IMPLEMENTING -> IMPLEMENTED -> VERIFIED

Substantial work should define story purpose, player action, consequence, affected mission/shared system, existing systems to reuse, success criteria and tests.

---

# P0 - Mission design

## DESIGN COMPLETE: Bad Belzig

Source: `docs/MISSIONS.md`

Identity: HOME / protect and adapt.

Key design: civilian route through Postdistanzsäule, St. Marien refuge, Burg command position, Act III priority crisis, Reißigerhaus regroup, consequence-aware Marktplatz/Rathaus finale.

## DESIGN COMPLETE: Wigan

Source: `docs/WIGAN-DESIGN.md`

Identity: SOLIDARITY / connect and coordinate.

Key design: Tudor first rally, Bus Station and Market Place groups, Grand Arcade network hub, network-cut setback, optional King Street support, coordinated Wallgate/North Western finale.

## DESIGN COMPLETE: Cable Street

Source: `docs/CABLE-STREET-DESIGN.md`

Identity: COMMUNITY / contribute to a crowd.

Key design: historically bounded Christian Street defence, fictional Berner Street support position, shared preparation, functional crowd roles, shifting pressure, off-screen persistence, local breach recovery and community aftermath.

## DESIGN COMPLETE: Barcelona

Source: `docs/BARCELONA-DESIGN.md`

Identity: COMMITMENT / learn to operate together.

Key design: two-pair opening, improvised cooperation, Rambla barricade, Santa Anna residents, western-shelter commitment point, deliberate return to Portal de l'Àngel, cooperation progression and local finale.

No gameplay code was changed during the four design tasks.

---

# P1 - Cross-mission mechanics architecture

## DESIGN COMPLETE: Mechanics consolidation

Source: `docs/MECHANICS-CONSOLIDATION.md`

Decision: build only two genuinely new shared systems before the mission story passes:

1. lightweight mission facts / consequence state
2. group coordination movement with elastic slots, arrive, separation and clean regroup

Then, only if needed after movement is stable, add small opt-in coordination hooks for covering interactions and casualty support.

Reuse instead of rebuilding:

- `navigation.js` for paths, dynamic obstacles and reachability
- `mission-objectives.js` for objective progression
- `character-health.js` for wounds, stabilise and carry
- `adaptive-director.js` for bounded utility/director decisions
- `barricade-rules.js` for barricade integrity/breach
- current civilian state systems
- current Cable Street crowd routing

Rejected for the current four-mission scope:

- replacement navigation
- separate reachability engine
- flow-field engine without profiling evidence
- RVO/threaded crowd engine
- second Utility AI framework
- generic faction simulator
- generic relationship system
- generic branching narrative engine
- RTS control for friendly NPCs

Public GitHub research outcome:

- gdx-ai formation concepts: USE AS DESIGN REFERENCE; implement a small local version
- Yuka arrive/separation: USE AS DESIGN REFERENCE; implement only this small subset
- Last Stand flow field: DEFER; current navigation already covers topology/reachability needs
- CrowdedJS/RVO: REJECT for current scope
- utility-ai frameworks: REJECT; extend existing bounded systems only if future evidence requires it

---

# P2 - Shared implementation foundations

Do these as separate targeted tasks. Do not combine them into a large refactor.

## APPROVED NEXT: Foundation A - mission facts

Goal: one small serialisable consequence store used by all four mission runtimes.

Minimum API:

- create(defaults/schema)
- get
- set
- increment
- guarded transition
- snapshot
- restore
- optional change notification

Integration:

- expose facts to objective evaluation
- include facts in mission checkpoint/save snapshots
- allow aftermath/outcome summaries to read them

Non-goals:

- quest graph
- rule language
- dialogue engine
- campaign branching framework

Tests:

- deterministic transitions
- invalid transition rejection
- snapshot/restore equality
- objective fact integration
- lifecycle/restart cleanup

## APPROVED AFTER A: Foundation B - group coordination movement

Goal: replace the current fixed target-line offsets with a small reusable layer above existing navigation while preserving current movement as the default profile.

Build:

1. formation anchor and slots
2. deterministic slot assignment
3. slot compression/expansion for narrow/open space
4. clean selected-subgroup movement
5. explicit regroup helper
6. arrive near final slots
7. short-range separation
8. tests and mobile-oriented performance benchmark

Do not add another obstacle/pathfinding model.

Mission use:

- Bad Belzig: cleaner route changes / prepared-position recovery
- Wigan: split squads and rally regroup
- Cable Street: readable playable group inside crowds
- Barcelona: cooperation-profile progression

## APPROVED AFTER B: Foundation C - small coordination hooks

Only build the minimum demonstrated by Barcelona/Wigan play:

- ally covers a contextual interaction
- ally supports casualty aid/carry
- clean regroup after split task
- optional partner selection helper

Keep opt-in through mission/profile data.

Do not build generic autonomous squad AI.

---

# P3 - Mission implementation packages

Begin after Foundation A. Tasks that rely on group-coordination behaviour should wait for Foundation B/C.

## Bad Belzig package

1. Bahnhofstraße civilian opening
2. Postdistanzsäule civilian crossing + route fact
3. Burg command interaction
4. St. Marien refuge + Frieda
5. Act III dual crisis + fallback route
6. Reißigerhaus recovery
7. local-knowledge routes
8. consequence-aware Marktplatz/Rathaus finale
9. aftermath/outcome summary
10. automated tests
11. playtest and balance

Mission-specific: refuge meaning, Post crisis, Frieda, local routes, finale support.

## Wigan package

1. resistance-group facts + contributions
2. Tudor first rally
3. Bus Station movement contribution
4. Market Place information contribution
5. Grand Arcade rally/pincer
6. network disruption/reconnection
7. optional King Street support
8. Wallgate coordinated-operation setup
9. consequence-aware finale
10. aftermath/outcome summary
11. automated tests
12. playtest and balance

Mission-specific: group network, contribution mapping, rally identities and network-cut event.

## Cable Street package

1. preparation outcome state
2. community-anchor presentation
3. readable defence-state wrapper
4. two-defence pressure policy
5. off-screen warnings/persistence
6. bounded civilian assistance
7. consequence-aware final hold/breach recovery
8. historical outcome transition
9. aftermath
10. automated tests
11. historical wording verification
12. human playtest and balance

Mission-specific: two-defence pressure, crowd presentation, off-screen policy and historical framing.

Do not build flow fields unless profiling later demonstrates a real navigation bottleneck.

## Barcelona package

1. paired opening / four-person regroup
2. IMPROVISED transition at printer/patrol
3. cooperation-aware barricade work
4. recovery/responsibility transition
5. Santa Anna extraction + consequence state
6. western-shelter commitment beat
7. COMMITTED movement/coordination profile
8. eastern-route payoff
9. Portal junction finale
10. aftermath/outcome summary
11. automated tests
12. human playtest and balance

Mission-specific: PAIRS / IMPROVISED / COOPERATING / COMMITTED story state and commitment trigger. Shared movement/coordination systems merely respond to the selected profile.

---

# P4 - Performance-gated ideas

These are not approved implementation tasks.

## DEFERRED: Flow fields

Re-evaluate only if target-device profiling shows repeated same-destination pathfinding is a meaningful bottleneck in Cable Street, Wigan group movement or larger evacuations.

Until then, use existing navigation caches, path queues and bounded crowd routing.

## DEFERRED: More local obstacle steering

Add beyond separation/arrive only if playtests show persistent local collision/jitter that the shared navigation and slot system cannot solve.

## DEFERRED: More contextual NPC utility decisions

Use authored role/state logic first. Extend existing bounded utility systems only when at least two mission implementations demonstrate the same missing decision behaviour.

---

# P5 - Polish after structure works

Only after mission structure and mechanics are proven:

- dialogue polish
- ambient reactions
- animation tied to new mechanics
- mission-specific sound cues
- visual state changes
- accessibility tuning
- deterministic difficulty/balance tuning

---

# Not currently in scope

- additional missions beyond the current four
- imported full game frameworks
- external AI APIs
- major engine rewrite
- RPG progression
- large branching campaign
- mechanics added only because another game/repository has them

# Implementation discipline

Future coding prompts should target one backlog item at a time.

Prefer targeted searches, reuse of inspected files, small diffs, existing systems, explicit non-goals and exact tests.
