# IF I CAN SHOOT RABBITS - Cross-Mission Mechanics Consolidation

Status: APPROVED DESIGN. Not yet implemented.
Consolidated: 8 October 2026

This document compares the four completed mission designs and decides which mechanics belong in shared engine systems, which remain mission-specific, and which public-GitHub-inspired ideas are worth building.

The governing rule is: **share behaviour only when two or more missions genuinely need the same underlying rule. Keep story logic inside the mission that gives it meaning.**

Do not use this consolidation as permission for a broad engine rewrite.

---

# 1. Executive decision

Only two genuinely new shared systems should be built before the mission story passes:

1. **Mission facts / consequence state**
2. **Group coordination movement**

A third item, **small coordination hooks around existing interactions and casualty handling**, may be added after group movement is stable, but it should extend current systems rather than become another AI framework.

Everything else falls into one of three categories:

- already exists and should be reused
- belongs in a mission-specific runtime
- is not justified by the current game and should not be built now

---

# 2. Existing shared engine support that should remain authoritative

## Navigation and reachability

`navigation.js` already provides:

- shared grid pathfinding
- direct-route checks
- dynamic obstacles
- navigation-version invalidation
- connected navigation components
- route-clear tests
- automatic stale-path replanning
- cached path work

Decision: **extend this system. Do not create another reachability/pathfinding layer.**

## Mission objectives

`mission-objectives.js` already supports event-driven mission progression, mission facts/signals, activation and failure.

Decision: objective sequencing remains shared. Mission facts added by this plan should feed the existing objective runtime rather than replace it.

## Character health and casualty handling

`character-health.js` already owns:

- FIT / WOUNDED / BADLY_WOUNDED / DOWN / DEAD
- stabilising
- carrying
- carry movement penalty
- casualty contextual actions
- deterministic fixed-update support

Decision: **do not build a second casualty system for Barcelona or any other mission.** Cooperation should add partner behaviour around this system.

## Adaptive director and enemy commander

`adaptive-director.js` already owns bounded utility-style strategic decisions and enemy tactical coordination.

Decision: **do not import another Utility AI framework.** Mission support NPCs do not currently require a second generic utility brain.

## Barricades

`barricade-rules.js` is already a reusable barricade model and is used by mission-specific runtimes.

Decision: keep barricade integrity / breach rules shared. Barricade networks, pressure policies and historical meaning remain mission-specific.

## Cable Street crowd routing

The Cable Street crowd already uses the shared navigation layer with bounded route work and real helper behaviour.

Decision: do not replace it with a new crowd engine or flow-field system without performance evidence.

---

# 3. Cross-mission mechanics matrix

Legend:

- **S** = shared engine behaviour
- **M** = mission-specific rule/content
- **E** = existing shared system; extend/reuse
- **N** = not needed now

| Mechanic | Bad Belzig | Wigan | Cable Street | Barcelona | Decision |
| --- | --- | --- | --- | --- | --- |
| Dynamic/event-driven objectives | E | E | E | E | Existing shared system |
| Small persistent mission consequences | S | S | S | S | **NEW SHARED** |
| Elastic group movement / spacing | useful | important | useful for playable group | core | **NEW SHARED** |
| Clean regroup after split movement | useful | core | useful | core | **NEW SHARED** |
| Local arrive / separation steering | useful | useful | useful | core | Shared as part of group movement |
| Full obstacle-avoidance steering framework | N | N | N | N | Navigation already owns obstacle routing |
| Shared flow-field pathfinding | optional | optional | possible | N | **DEFER** pending profiling |
| Dynamic obstacle reachability | E | E | E | E | Already in navigation |
| Stabilise / carry wounded | E | E | E | E/core | Existing shared health system |
| Ally covers interaction / casualty aid | useful | useful | useful | core | Small shared coordination hook |
| Civilian states / follow / evacuation | E | E | E | E | Existing shared capability |
| Generic free-form NPC Utility AI | N | N | N | N | Do not build |
| Friendly support NPCs | M on shared actors | M on shared actors | M on crowd runtime | M on resistance actors | Mission orchestration |
| Quiet / recovery phases | M using E objectives | M using E objectives | M using E objectives | M using E objectives | Mission-specific sequencing |
| Route/position consequences | M data on S facts | M data on S facts | M data on S facts | M data on S facts | Shared state, mission rules |
| Barricade integrity / breach | not central | not central | E/core | E | Existing shared barricade rules |
| Barricade network / pressure policy | N | N | M/core | M/simple | Mission-specific |
| Rally points | recovery only | M/core | regroup only | shelter only | Mission-specific meaning |
| Resistance-group connection network | N | M/core | N | N | Wigan-specific |
| Local-defence priority crisis | M/core | N | N | N | Bad Belzig-specific |
| Crowd continues off-screen | N | N | M/core | N | Cable Street-specific policy |
| Cooperation progression state | N | N | N | M/core | Barcelona-specific state |
| Commitment point | N | N | N | M/core | Barcelona-specific |
| Local-knowledge route unlocks | M/core | some info | N | some route cues | Mission-specific content using shared nav |
| Historical uncertainty / fixed-outcome wording | N | N | M | M | Historical-mission content rule |

---

# 4. NEW SHARED SYSTEM 1 - Mission facts / consequence state

## Why it should be shared

Every detailed mission now needs a small set of persistent local outcomes:

### Bad Belzig

- Post route HELD / LOST
- refuge state
- Frieda state
- civilian evacuation result
- squad survival result

### Wigan

- resistance-group states
- Grand Arcade state
- King Street support
- civilian movement outcome
- railway connection outcome

### Cable Street

- preparation quality
- main/side defence outcome
- civilian assistance
- crowd condition
- playable-group outcome

### Barcelona

- Rambla defence outcome
- resident outcome
- casualty outcome
- cooperation state
- final local-position outcome

These are not all objectives. Some are facts that later objectives, support, dialogue and aftermath need to query.

The objective manager already understands mission progress. The missing piece is a tiny serialisable local-facts container rather than four unrelated collections of booleans.

## Smallest useful API

Suggested module concept: `mission-facts.js`

Required capabilities only:

- `create(schemaOrDefaults)`
- `get(key)`
- `set(key, value)`
- `increment(key, amount)` for bounded counters
- `transition(key, expected, next)` for guarded state changes
- `snapshot()`
- `restore(snapshot)`
- optional `onChange(listener)`

Do not build:

- a generic rule language
- a dialogue engine
- a quest graph
- nested scripting DSLs
- global campaign branching

Mission runtimes remain responsible for deciding what a fact means.

## Integration

Mission facts may be exposed to `mission-objectives.js` as objective context facts.

Checkpoint/save systems should serialise them as plain data.

The aftermath renderer can read them to produce a short mission summary.

## Priority

**P0 shared prerequisite. Build first.**

It is small, low-risk and immediately prevents four missions from inventing incompatible consequence storage.

---

# 5. NEW SHARED SYSTEM 2 - Group coordination movement

## Why it should be shared

The current movement command already places selected characters in a simple fixed line around the target. That is enough for the existing game but not enough for the four detailed designs.

The new needs overlap:

### Bad Belzig

- leave and re-enter prepared positions cleanly
- move civilians / volunteers without stacking
- reform after urgent route changes

### Wigan

- split two-and-two
- move each group coherently
- cleanly regroup at rally points

### Cable Street

- keep the four playable volunteers readable inside a dense crowd
- avoid stacking around barricade work points

### Barcelona

- visible progression from loose pairs to a coordinated four-person group
- cleaner regrouping
- useful spacing around interactions and crossings

## Design

Create a small movement layer above the existing pathfinder.

The shared pathfinder continues to answer:

> How can this unit reach this destination?

The group layer answers:

> Where should each member of this selected group try to stand, and how should those slots adapt when space is tight?

## Smallest useful API

Suggested module concept: `group-movement.js`

Core operations:

- compute an anchor from destination / selected leader
- generate slots around that anchor
- assign slots to selected units
- collapse spacing when destinations are narrow
- loosen spacing when movement is obstructed
- preserve selected sub-groups
- issue normal `navigation.assignPath()` calls to slot positions
- explicit `regroup(units, anchor, profile)` helper

Profiles should be data, not separate movement engines. Example parameters:

- preferred spacing
- minimum spacing
- maximum spread
- line / loose / compact bias
- regroup radius

## Small local steering additions

Use only two steering ideas initially:

1. **Arrive** - reduce overshoot / jitter near final slots.
2. **Separation** - prevent friendly units and NPCs from occupying the same point.

A very small short-range avoidance correction may be added if tests prove necessary, but do not introduce a second obstacle-navigation model. Buildings and barricades remain the responsibility of `navigation.js`.

## Mission configuration

### Bad Belzig

Normal civilian/local-volunteer profiles. Prepared sandbag placement remains a checkpoint-specific mechanic.

### Wigan

Normal group profile plus strong support for independently selected sub-groups and reliable regroup.

### Cable Street

Loose playable-group profile so the squad does not look militarily drilled inside the crowd.

### Barcelona

The mission changes the profile at authored cooperation transitions:

- PAIRS: loose pair spacing, weak automatic regroup
- IMPROVISED: basic four-person slots
- COOPERATING: better regroup and partner spacing
- COMMITTED: strongest coordination, still civilian rather than parade-ground formation

The cooperation state itself stays in Barcelona.

## Priority

**P1 shared prerequisite. Build after mission facts.**

---

# 6. SHARED EXTENSION - Coordination hooks, not a new AI framework

After group movement is stable, add a few reusable behaviours around interactions.

## Worth sharing

- nearby ally turns / positions to cover a character performing a contextual action
- nearby ally stays with a casualty while another character stabilises / carries
- regroup helper after a split task
- optional partner-selection helper

These behaviours should be deterministic, local and bounded.

Possible API shape:

- `supportInteraction(actor, allies, context, profile)`
- `supportCasualty(helper, casualty, allies, profile)`
- `releaseSupport(actorOrContext)`

The existing interaction and health systems still perform the actual action.

## Do not add

- relationship simulation
- emergent personality AI
- generic GOAP
- another utility scorer
- automatic tactical control of the player's squad

## Priority

**P2 shared extension, mainly for Barcelona.**

Build only after the movement layer proves stable.

---

# 7. Mechanics that should remain mission-specific

## Bad Belzig

Keep inside the Bad Belzig runtime/design package:

- Post route state and its narrative meaning
- St. Marien refuge logic
- Frieda Lehmann state
- Act III dual crisis
- consequence of prioritising refuge vs route
- local volunteer support at cleared positions
- authored local-knowledge route choices
- sandbag/checkpoint enter-leave behaviour
- Marktplatz/Rathaus consequence-aware finale

Shared systems provide facts, navigation, civilians, health and group movement. They should not know what St. Marien or the Post means.

## Wigan

Keep inside the Wigan runtime/design package:

- Tudor / Bus Station / Market Place / King Street / railway-group identities
- ISOLATED / CONTACTED / CONNECTED / DISRUPTED group meaning
- what each connected group contributes
- rally-point identities
- the network-cut event
- information quality from Market Place
- King Street supply support
- final coordinated Wallgate operation

Do not create a universal faction-network engine for one mission.

## Cable Street

Keep inside Cable Street systems:

- Christian Street main-defence historical role
- fictional Berner Street side-defence role
- pressure shifting between those positions
- bounded off-screen pressure policy
- crowd-confidence presentation
- helper allocation and material activity
- mounted-pressure timing
- historical outcome transition
- local failure wording

Barricade integrity remains shared. The two-defence scenario and historical framing do not.

## Barcelona

Keep inside Barcelona runtime/design:

- PAIRS / IMPROVISED / COOPERATING / COMMITTED progression
- exact story triggers that advance cooperation
- paired opening
- printer contact
- commitment pause at western shelter
- deliberate movement out of safety
- eastern defence payoff
- Portal junction local finale

Barcelona may change shared movement/coordination profiles, but the engine must not know what COMMITTED means narratively.

---

# 8. Public GitHub ideas - final decision

## gdx-ai formation concepts

**Decision: BUILD THE IDEA, NOT THE LIBRARY.**

Worth taking:

- formation anchor
- formation slots
- slot reassignment
- formation that adapts rather than forcing a rigid shape

Why:

The current game already sends selected units toward simple line offsets. A small elastic-slot layer directly solves Barcelona and Wigan needs and improves all missions.

Do not port the Java framework. Reimplement a minimal deterministic 2D version around the existing navigation system.

Priority: **HIGH**.

## Yuka steering concepts

**Decision: BUILD A TINY SUBSET.**

Worth taking:

- arrive
- separation

Maybe later:

- very small local obstacle correction only if tests show path-following still produces collisions/jitter

Do not take:

- Yuka entity framework
- Yuka navigation
- perception framework
- goal system
- full steering stack

Why:

The game's pathfinder already handles buildings and dynamic obstacles. The real gap is local spacing and arrival quality.

Priority: **HIGH, bundled with group movement**.

## Last Stand flow-field / reachability concepts

**Decision: KEEP AS A REFERENCE; DO NOT BUILD A FLOW FIELD NOW.**

Useful principle:

- topology changes should invalidate routing immediately
- a route should be testable after obstacle changes
- no environmental mechanic should create a silent softlock

But the repo already has dynamic-obstacle invalidation and connected-component reachability in `navigation.js`.

Flow fields would only be justified if profiling shows repeated same-destination pathfinding for large groups is a real performance problem.

Revisit only if a target-device benchmark shows navigation becoming a measurable bottleneck during dense crowd/evacuation movement.

Priority: **DEFERRED / CONDITIONAL**.

## CrowdedJS / RVO-style crowd simulation

**Decision: DO NOT BUILD OR IMPORT.**

Reason:

Cable Street currently has a bounded crowd budget, functional helpers and shared-pathfinder routing. A threaded crowd engine / RVO layer would add a large second movement architecture for one mission.

Use only the conceptual rule:

> global routing and local spacing are separate problems.

Our navigation + small separation layer already follows that architecture.

Priority: **REJECT FOR CURRENT SCOPE**.

## Utility-AI reference projects

**Decision: DO NOT IMPORT AND DO NOT BUILD A SECOND GENERIC UTILITY LAYER.**

The current Adaptive Director already makes utility-weighted strategic choices.

For civilian/support NPCs, the four mission designs mostly call for authored roles and simple local states, not unconstrained decision-making.

If later NPC behaviour genuinely requires more choice, add actions to existing bounded systems rather than bringing in another framework.

Priority: **REJECT FOR CURRENT SCOPE**.

---

# 9. Shared mechanics that are already sufficient

The following should not become new implementation projects during the story pass:

## Dynamic reachability

Already supplied by shared navigation components, route checks and dynamic-obstacle invalidation.

Action: add targeted tests where new mission obstacles/routes are introduced.

## Casualty carrying

Already implemented.

Action: Barcelona coordination hooks may support the carrier, but do not replace the system.

## Dynamic objectives

Already implemented.

Action: feed them mission facts and authored events.

## Barricade integrity

Already implemented.

Action: keep mission-specific scenario logic around it.

## Enemy tactical adaptation

Already implemented through enemy behaviour and Adaptive Director / Commander.

Action: no new tactical AI architecture.

## Civilian state model

Already implemented with calm/frightened/hiding/following/fleeing/evacuated/wounded/down/dead states.

Action: author routes and triggers per mission; do not create a new civilian framework.

---

# 10. Implementation order

Do not implement the four mission expansions as one branch-sized refactor.

## Shared foundation A - mission facts

1. Add minimal facts store.
2. Snapshot/restore it.
3. Make facts available to objective evaluation.
4. Add deterministic tests.
5. Do not change current mission behaviour yet.

## Shared foundation B - group movement

1. Extract current simple target-offset assignment behind a shared interface.
2. Preserve existing behaviour as the default profile.
3. Add elastic slot compression / expansion.
4. Add arrive behaviour.
5. Add separation.
6. Verify split selection and regroup.
7. Benchmark desktop + target mobile-sized crowd scenarios.

## Shared foundation C - small coordination hooks

1. Cover an ally during contextual interaction.
2. Casualty partner support.
3. Clean regroup helper.
4. Keep all hooks opt-in through profiles.

Then implement mission packages in the agreed order:

1. Bad Belzig
2. Wigan
3. Cable Street
4. Barcelona

Barcelona is implemented last because it intentionally demonstrates the most advanced use of the shared coordination layer.

---

# 11. Explicitly rejected engine projects

Do not create any of these during the four-mission story pass:

- replacement navigation engine
- separate reachability engine
- flow-field engine before profiling proves a need
- RVO / threaded crowd engine
- second Utility AI framework
- generic resistance-faction simulator
- generic relationship/friendship system
- generic branching narrative engine
- universal historical-event framework
- RTS control layer for friendly NPCs
- new casualty system
- mission-independent barricade-network strategy layer

These would increase architecture and testing cost without enough cross-mission value.

---

# 12. Final ownership model

## Engine owns

- movement/pathfinding
- dynamic obstacles/reachability
- elastic group slots and local spacing
- squad selection / regroup primitives
- health / casualties / carry
- cover / suppression
- civilian base states
- objective progression primitives
- mission fact storage
- generic barricade integrity
- bounded adaptive enemy/director behaviour

## Mission runtimes own

- who matters
- why a location matters
- which facts change
- what a connected group contributes
- which pressure event occurs
- when a quiet phase happens
- historical framing
- success/cost/failure interpretation
- aftermath

That boundary preserves the game's identity while preventing four different versions of the same low-level mechanics.
