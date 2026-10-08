# IF I CAN SHOOT RABBITS - Mechanics Design

Status: Consolidated design
Last consolidated: 8 October 2026

The detailed decision is in `docs/MECHANICS-CONSOLIDATION.md`.

This document is the short reference for what the engine should share and what the missions should own.

---

# Shared systems already present

Reuse and extend these rather than replacing them:

- `navigation.js`: pathfinding, route checks, connected components, dynamic obstacles, stale-route replanning
- `mission-objectives.js`: objective progression and event-driven objectives
- `character-health.js`: FIT / WOUNDED / BADLY_WOUNDED / DOWN / DEAD, stabilise and carry
- cover and suppression systems
- civilian states and evacuation behaviour
- building/garrison systems
- `adaptive-director.js`: bounded utility-style strategic decisions / enemy coordination
- `barricade-rules.js`: generic barricade integrity and breach
- Cable Street crowd/interactions/runtime
- deterministic fixed-update and simulation tooling

---

# New shared systems approved

## 1. Mission facts / consequence state

Purpose:

Store a small serialisable set of mission-local facts that later objectives, support and aftermath can query.

Needed by all four missions.

Examples:

- Bad Belzig: Post route / refuge / Frieda
- Wigan: resistance-group connections
- Cable Street: defence/crowd/civilian outcomes
- Barcelona: resident/defence/cooperation/final-position outcomes

Keep the API deliberately small: get, set, increment, guarded transition, snapshot, restore and optional change notification.

Do not turn it into a quest, dialogue or branching-narrative framework.

Status: **APPROVED - first shared implementation task**.

## 2. Group coordination movement

Purpose:

Place selected units into useful adaptive slots while continuing to use the existing navigation system for every actual route.

Shared capabilities:

- formation anchor
- elastic slots
- deterministic slot assignment
- slot compression/expansion
- split-group compatibility
- clean regroup
- arrive near target
- short-range separation

Mission profiles:

- Bad Belzig: normal/local-volunteer movement
- Wigan: split-group + rally regroup emphasis
- Cable Street: loose, non-military playable group
- Barcelona: progressively better coordination through mission-local cooperation states

Status: **APPROVED - second shared implementation task**.

## 3. Small coordination hooks

Possible shared behaviours after group movement is stable:

- ally covers a contextual interaction
- ally supports casualty treatment/carry
- regroup after a split task

These extend existing interaction/health systems. They are not autonomous squad AI.

Status: **APPROVED CONDITIONALLY after group movement**.

---

# Mechanics that remain mission-specific

## Bad Belzig - HOME

Mission owns:

- Post route meaning
- St. Marien refuge
- Frieda
- dual Act III priority crisis
- local-knowledge route choices
- sandbag/checkpoint behaviour
- Marktplatz/Rathaus support/outcome variation

Engine supplies navigation, civilians, facts, objectives, health and group movement.

## Wigan - SOLIDARITY

Mission owns:

- resistance-group identities and states
- contribution of each connected group
- rally-point identities
- network-cut event
- Market Place information
- King Street support
- coordinated Wallgate finale

Do not build a universal faction/network simulator.

## Cable Street - COMMUNITY

Mission owns:

- Christian Street / Berner Street pressure relationship
- crowd-confidence presentation
- helper behaviour policy
- off-screen pressure/warnings
- historical local-failure wording
- historical outcome transition

Generic barricade integrity stays shared.

## Barcelona - COMMITMENT

Mission owns:

- PAIRS / IMPROVISED / COOPERATING / COMMITTED
- triggers that advance those states
- paired opening
- western-shelter commitment point
- deliberate return to danger
- eastern-route payoff
- Portal junction local finale

Shared movement merely accepts a profile chosen by Barcelona.

---

# Public GitHub research - final disposition

## gdx-ai

Use as a design reference for formation anchors, slots and reassignment.

**Build:** a minimal deterministic local implementation around our existing navigation.

**Do not import:** the Java framework.

Status: **WORTH BUILDING AS OUR OWN SMALL SYSTEM**.

## Yuka

Use as a design reference for local steering.

**Build now:** arrive + separation only.

**Maybe later:** small local obstacle correction if testing proves necessary.

**Do not import:** entity, navigation, perception, goal or full steering frameworks.

Status: **WORTH BUILDING ONLY AS A TINY SUBSET**.

## Last Stand

Useful concepts:

- shared flow fields
- topology invalidation
- route reachability after obstacle changes
- avoiding softlocks

Our existing navigation already implements the important topology/reachability behaviours.

Status: **FLOW FIELD DEFERRED. KEEP AS REFERENCE.**

Only revisit if profiling shows same-destination crowd pathfinding is a real target-device bottleneck.

## CrowdedJS / RVO-style crowd simulation

The current game does not justify a second crowd/navigation architecture.

Status: **NOT NEEDED FOR CURRENT FOUR MISSIONS**.

## Utility-AI frameworks

The game already has an adaptive utility-style system. The mission designs call mainly for authored support roles, not another generic action scorer.

Status: **DO NOT BUILD / IMPORT**.

---

# Explicit non-projects

Do not create during the four-mission story pass:

- replacement pathfinder
- separate reachability engine
- flow-field engine without benchmark evidence
- RVO/threaded crowd engine
- second Utility AI system
- generic resistance faction simulator
- relationship/friendship simulation
- generic narrative/quest graph
- RTS control layer for friendly NPCs
- second casualty system

---

# Architecture rule

The engine owns reusable physical and simulation rules.

Mission runtimes own meaning and consequences.

The engine should know how to move a group, store a fact, carry a casualty, test a route or damage a barricade.

It should not know why St. Marien matters, what solidarity means in Wigan, what the Cable Street side defence represents, or why Barcelona's four characters choose to return to danger.
