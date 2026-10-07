# IF I CAN SHOOT RABBITS - Design and Implementation Backlog

Status: Active planning document
Last consolidated: 7 October 2026

This backlog separates agreed direction from actual implementation work.

Nothing in CANDIDATE is permission to code it. Move work to APPROVED only after the design is sufficiently clear.

## Workflow

IDEA -> CANDIDATE -> APPROVED -> IMPLEMENTING -> IMPLEMENTED -> VERIFIED

For substantial work, define:

- story purpose
- player action
- consequence
- affected mission or shared system
- existing systems to reuse
- success criteria
- tests or playtest checks

---

# P0 - Mission design

## DESIGN COMPLETE: Bad Belzig

Detailed in `docs/MISSIONS.md`.

Core design:

- Karl, Otto, Lotte and Greta retained
- home / protection identity
- Bahnhofstraße civilian opening
- Postdistanzsäule as a civilian route
- St. Marien refuge and Reißigerhaus regroup
- Burg Eisenhardt as command / staging point
- Act III priority crisis between refuge and route
- local-knowledge approaches
- Marktplatz / Rathaus consequence-aware finale
- limited route, refuge, civilian, Frieda and squad outcomes

No gameplay code changed during design.

## DESIGN COMPLETE: Wigan

Detailed in `docs/WIGAN-DESIGN.md`.

Core design:

- Arthur, Elsie, Tom and George retained
- solidarity / connection identity
- Tudor as first rally point
- Bus Station and Market Place connection objectives
- Grand Arcade as central rally point
- network-cut setback
- optional King Street support
- Wallgate / North Western coordinated finale
- connected groups provide practical capabilities rather than abstract bonuses
- split-squad play optional, never mandatory

No gameplay code changed during design.

## DESIGN COMPLETE: Cable Street

Detailed in `docs/CABLE-STREET-DESIGN.md`.

Core design:

- Jack, Rose, Sam and Ada retained
- community / contribution identity
- existing historical evidence package remains authoritative
- Christian Street main defence remains a supported-vicinity interpretation
- Berner Street side defence remains explicitly fictional gameplay
- preparation as shared labour
- functional crowd roles
- shifting pressure between positions
- bounded off-screen simulation
- non-combat assistance
- local breach recovery and historically responsible failure wording
- decisive local hold and community aftermath

No gameplay code changed during design.

## DESIGN COMPLETE: Barcelona

Completed 7 October 2026 in `docs/BARCELONA-DESIGN.md`.

Defined:

- Joan, Mercè, Antoni and Isabel retained with their existing occupations, traits and relationships
- two-pair opening that grows into one improvised four-person group
- distinct initial attitudes and practical character contributions
- printer contact and rifle acquisition retained as explicitly fictional local gameplay
- first patrol as the forced-cooperation beat
- Rambla barricade as the first shared practical job
- Santa Anna civilian extraction as the responsibility phase
- western shelter as the mission's defining commitment point
- deliberate player movement back out of safety toward Portal de l'Àngel
- hidden cooperation states: PAIRS -> IMPROVISED -> COOPERATING -> COMMITTED
- cooperation expressed through spacing, covering, regrouping and casualty assistance rather than combat stat inflation
- eastern-route defence as the payoff for improved group coordination
- Portal junction as a limited local finale rather than a city-wide victory
- resident, first-defence, casualty, squad and final-position outcomes
- strong success, costly success and local failure states
- aftermath that explicitly leaves the wider Barcelona fighting beyond the playable group
- explicit reuse of the current Barcelona map, runtime, barricade, civilian extraction, resistance NPC and objective systems

No gameplay code changed during design.

---

# P1 - Shared mechanics evaluation

## APPROVED NEXT TASK: Cross-mission mechanics consolidation

All four detailed mission designs now exist.

Before implementing any broad story expansion, evaluate which proposed mechanics genuinely belong in shared engine systems and which should remain mission-specific.

Required output:

1. map every requested mechanic across the four designs
2. identify existing engine support that can be reused
3. identify overlap between missions
4. classify each mechanic as SHARED, MISSION-SPECIFIC or NOT NEEDED
5. define the smallest shared APIs required
6. identify implementation dependencies and order
7. reject mechanics that add complexity without enough gameplay value
8. produce a small implementation sequence rather than one large refactor

Do not implement during the evaluation unless separately authorised.

## CANDIDATE: Elastic squad formation

Primary need:

- Barcelona cooperation progression
- Wigan split / regroup behaviour
- general squad movement polish

Evaluate:

- formation anchor and slots
- street-width adaptation
- split-squad compatibility
- obstacle response
- automatic loosening / tightening
- Barcelona progression from loose to coordinated behaviour

Reference: public formation-algorithm concepts such as gdx-ai. Reimplement only the smallest useful version in the existing engine.

## CANDIDATE: Local steering layer

Primary need:

- natural follower spacing
- civilians and resistance NPCs
- Cable Street crowd movement

Evaluate:

- arrive
- separation
- obstacle avoidance
- follower spacing
- deterministic behaviour
- CPU cost on mobile

Reference: steering-behaviour concepts such as Yuka. Do not import a full framework merely for these behaviours.

## CANDIDATE: Shared flow fields for crowds

Primary need:

- Cable Street crowd / helper routing
- Wigan connected-group movement
- larger civilian evacuation groups where many agents share destinations

Evaluate:

- integration with current pathfinding
- recompute cost when barricades / routes change
- deterministic behaviour
- mobile performance
- whether current cached navigation already solves enough of the problem

## CANDIDATE: Dynamic reachability around barricades

Primary need:

- Cable Street authored defences and breach recovery
- any future mission where obstacles change navigation

Direction:

Use persistent reachability checks to avoid softlocks. Prefer visible consequences and recovery over arbitrary restrictions, but never allow a mission-critical route to become unrecoverably blocked.

## CANDIDATE: Contextual NPC decisions

Primary need:

- Cable Street helpers / residents
- Wigan resistance groups
- Bad Belzig volunteers

Possible actions:

- flee
- hide
- assist wounded
- build / repair
- follow
- reinforce
- carry material
- withdraw

Do not add another Utility AI framework. Extend existing adaptive / utility architecture only if mission designs show a real need.

## CANDIDATE: Cooperation-state hooks

Primary need:

- Barcelona

Evaluate whether the underlying behaviours should be shared even if the progression state remains Barcelona-specific.

Potential reusable hooks:

- cover an ally performing an interaction
- regroup cleanly after split movement
- assist casualty movement
- elastic spacing around a leader

The narrative state `PAIRS / IMPROVISED / COOPERATING / COMMITTED` should remain Barcelona-specific unless another mission genuinely needs it.

---

# P2 - Mission implementation packages

Do not start broad implementation until P1 mechanics consolidation is complete.

## Bad Belzig package

1. Opening Bahnhofstraße civilian group
2. Postdistanzsäule civilian crossing and route state
3. Burg command interaction and Act III trigger
4. St. Marien refuge and Frieda
5. Dual-crisis logic and fallback route
6. Reißigerhaus recovery
7. Local route-choice interactions
8. Marktplatz / Rathaus consequence-aware finale
9. Outcome summary / aftermath
10. Automated tests
11. Playtest and balance

## Wigan package

1. Resistance-group state and contribution hooks
2. Tudor opening / first rally
3. Bus Station movement contribution
4. Market Place information contribution
5. Grand Arcade rally / pincer
6. Network disruption / reconnection
7. King Street optional connection
8. Wallgate coordinated-operation setup
9. Consequence-aware finale
10. Outcome summary / aftermath
11. Automated tests
12. Playtest and balance

## Cable Street package

1. Preparation outcome state
2. Community-anchor presentation
3. Readable defence-state wrapper
4. Two-defence pressure policy
5. Off-screen persistence and warnings
6. Civilian assistance events
7. Consequence-aware final hold / breach recovery
8. Historical outcome transition
9. Aftermath
10. Automated tests
11. Historical wording verification
12. Human playtest and balance

## Barcelona package

Design prerequisite is complete. Recommended small task order:

1. Paired opening and clean four-person regroup
2. First cooperation state at printer / patrol
3. Cooperation-aware barricade work and cover behaviour
4. Recovery / responsibility transition
5. Santa Anna resident extraction and consequence state
6. Western-shelter commitment state and deliberate return trigger
7. COMMITTED spacing / covering / regroup helpers
8. Eastern-route cooperation payoff
9. Consequence-aware Portal junction finale
10. Outcome summary / aftermath
11. Automated tests for cooperation transitions, casualty handling and single-player viability
12. Human playtest and balance

---

# P3 - Polish after structure works

Only after mission structure and mechanics are proven:

- dialogue polish
- ambient reactions
- animation improvements tied to new mechanics
- mission-specific sound cues
- additional visual state changes
- accessibility tuning
- difficulty tuning using deterministic simulation

---

# Not currently in scope

- additional missions beyond the current four
- imported full game frameworks
- external AI APIs
- major engine rewrite
- turning the game into an RPG
- large branching campaigns
- mechanics that exist only because another game has them

# Token and implementation discipline

Future coding prompts should target one small backlog item at a time.

Prefer:

- targeted searches
- reuse of inspected files
- small diffs
- existing systems
- explicit non-goals
- tests for the exact change

Avoid broad requests such as "improve the mission" once a backlog item exists.
