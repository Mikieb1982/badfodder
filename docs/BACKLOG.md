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

## P0 - Preserve and complete mission design

### DESIGN COMPLETE: Bad Belzig detailed mission design

Completed 7 October 2026 in `docs/MISSIONS.md`.

Defined:

- Karl, Otto, Lotte and Greta as the existing playable cast and gave each a story function without replacing their current identity
- Frieda Lehmann as a fictional civilian first-aid anchor at St. Marien
- opening playable situation around Bahnhofstraße
- Postdistanzsäule as the civilian crossing / southern route rather than a checkpoint with no story purpose
- St. Marien as the main refuge and Reißigerhaus as a fallback regroup / first-aid point
- civilian route logic
- Burg Eisenhardt as the enemy command / staging position
- Act III simultaneous refuge and Post-route crisis
- local-knowledge approach choices
- Marktplatz / Rathaus finale purpose
- tracked route, refuge, civilian, Frieda and squad outcomes
- strong success, costly success and failure states
- quiet moments and retry checkpoints
- explicit reuse of existing systems

No gameplay code was changed as part of this design task.

### DESIGN COMPLETE: Wigan detailed mission design

Completed 7 October 2026 in `docs/WIGAN-DESIGN.md`.

Defined:

- Arthur, Elsie, Tom and George as the existing playable cast with distinct story functions
- five local groups: Tudor / New Market Street, Bus Station, Market Place, King Street and the isolated railway group
- practical contributions for each connected group rather than abstract bonuses
- Tudor House as the opening crisis and first rally point
- Bus Station and Market Place as flexible-order connection objectives
- optional split-squad play that remains fully viable in single-player
- Grand Arcade as the central rally point where the network first becomes visible
- an Act III network-cut event that disrupts connections rather than repeating Bad Belzig's protect-everything crisis
- King Street as optional but meaningful supply / volunteer support
- final coordinated operation at Wallgate / North Western
- rally-point state, resistance-group state and lightweight contribution hooks
- tracked group, Grand Arcade, civilian movement and squad outcomes
- strong success, costly success and failure states
- aftermath showing previously separated groups physically connected
- explicit reuse of the current Wigan map, landmarks, defender groups, checkpoint waves and existing systems

No gameplay code was changed as part of this design task.

### DESIGN COMPLETE: Cable Street detailed mission design

Completed 7 October 2026 in `docs/CABLE-STREET-DESIGN.md`.

Defined:

- historical boundaries and uncertainty rules using the existing authoring/evidence package
- Jack, Rose, Sam and Ada as the existing playable volunteers with story functions but no rigid RPG roles
- fictional community anchors Miriam Rosen, Alf Harris and Nora Flynn
- Christian Street defence B as the required historically-supported-vicinity main position
- Berner Street side defence S as an explicitly fictional gameplay support position
- preparation as visible shared labour rather than a checklist performed only by the player
- persistent defence states built around existing barricade integrity/breach data
- functional resident, helper, messenger and first-aid crowd roles
- first police push, playable regroup and repair phase
- shifting pressure between two positions
- bounded off-screen simulation and warning rules so the world continues when the camera moves away
- civilian assistance opportunities that remain short contextual actions rather than escort missions
- repeated pressure and breach recovery
- a decisive hold framed as keeping one section blocked while the wider historical confrontation continues
- historical-outcome transition that avoids crediting the four playable characters with winning the whole event
- preparation, main-defence, side-defence, civilian, crowd and playable-group consequences
- strong success, costly success and local failure/retry states
- aftermath with persistent damage and community reactions
- explicit reuse of the current Cable Street runtime, director, crowd, interactions and authoring systems

No gameplay code was changed as part of this design task.

### APPROVED: Barcelona detailed mission design

This is now the next mission-design item.

Define:

- four protagonists and ordinary lives
- existing relationships, if any
- different attitudes at the beginning
- initial separate or paired play
- first forced cooperation
- practical character strengths
- commitment point
- growth in squad cooperation
- final local objective
- tracked consequences

## P1 - Shared mechanics evaluation

Do this after the four detailed mission designs show which mechanics are genuinely shared.

### CANDIDATE: Elastic squad formation

Goal:
Improve group movement without making civilians look like trained soldiers.

Evaluate:

- formation anchor and slots
- street-width adaptation
- split-squad compatibility
- obstacle response
- automatic loosening/tightening
- Barcelona progression from loose to coordinated behaviour

Reference: gdx-ai formation concepts.

### CANDIDATE: Local steering layer

Goal:
Improve natural movement without replacing global navigation.

Evaluate:

- arrive
- separation
- obstacle avoidance
- follower spacing
- CPU cost on mobile

Reference: Yuka steering concepts.

### CANDIDATE: Shared flow fields for crowds

Goal:
Efficiently route many NPCs sharing destinations.

Primary use:

- Cable Street crowds
- evacuation groups
- Wigan resistance movement

Evaluate:

- integration with current navigation
- recompute cost when barricades change
- deterministic behaviour
- mobile performance

Reference: Last Stand flow-field design.

### CANDIDATE: Dynamic reachability around barricades

Goal:
Make environmental changes affect routes without creating softlocks.

Questions:

- Should invalid placement be blocked?
- Should poor placement be allowed but create a story consequence?
- How do civilians report that a route is blocked?
- Can the system identify an alternative route?

Cable Street direction: use authored barricade positions and persistent reachability checks. Prefer visible consequences and recovery over arbitrary restrictions, but never allow a mission-critical route state to create an unrecoverable softlock.

### CANDIDATE: Contextual NPC decisions

Goal:
Allow civilians and resistance NPCs to choose useful actions based on the current situation.

Do not add another utility-AI framework. Extend the existing adaptive/utility architecture.

Possible actions:

- flee
- hide
- assist wounded
- build or repair barricade
- follow squad
- reinforce position
- carry material
- withdraw

## P2 - Mission implementation packages

Do not start these until the relevant detailed mission design is approved.

### Bad Belzig implementation package

Design prerequisite is complete. Implementation remains separate and is not yet authorised by the design task itself.

Recommended small task order:

1. Opening Bahnhofstraße civilian group and movement triggers
2. Postdistanzsäule civilian-crossing condition and persistent route state
3. Burg command-position interaction and Act III trigger
4. St. Marien refuge, Frieda NPC and evacuation state
5. Act III dual-crisis logic and fallback route
6. Reißigerhaus regroup / recovery state
7. Local route-choice interactions into the centre
8. Marktplatz / Rathaus consequence-aware finale
9. Outcome summary and aftermath
10. Automated tests for each state transition
11. Full playtest and balance pass

### Wigan implementation package

Design prerequisite is complete. Implementation remains separate and is not yet authorised by the design task itself.

Recommended small task order:

1. Lightweight resistance-group state and contribution hooks
2. Tudor opening and first rally-point state
3. Bus Station connection and civilian movement contribution
4. Market Place connection and warning / information contribution
5. Grand Arcade rally and consequence-aware pincer hold
6. Act III route-disruption / reconnection event
7. Optional King Street connection and existing supply integration
8. Wallgate coordinated-operation setup and group support hooks
9. Consequence-aware Wallgate finale and railway-group connection
10. Outcome summary / aftermath
11. Automated tests for state transitions and single-player viability
12. Full playtest and balance pass

### Cable Street implementation package

Design prerequisite is complete. Implementation remains separate and is not yet authorised by the design task itself.

Recommended small task order:

1. Preparation outcome state and story presentation
2. Named community-anchor presentation using existing NPC/crowd systems
3. Readable defence-state wrapper around existing barricade integrity
4. Two-defence pressure-shift policy
5. Off-screen persistence and warning rules
6. Bounded civilian assistance events
7. Consequence-aware final hold and breach recovery presentation
8. Historical outcome transition
9. Aftermath state and summary
10. Automated tests for pressure shifting, off-screen determinism and breach recovery
11. Historical wording verification
12. Human playtest and balance

### Barcelona implementation package

Expected task groups:

1. Opening character state
2. Cooperation interactions
3. Practical character strengths
4. Commitment scene/state
5. Cooperation progression
6. Finale
7. Consequence tracking
8. Tests and playtest

## P3 - Polish after structure works

Only after mission structure and mechanics are proven:

- dialogue polish
- ambient reactions
- animation improvements tied to new mechanics
- mission-specific sound cues
- additional visual state changes
- accessibility tuning for new interactions
- difficulty tuning using deterministic simulation

## Not currently in scope

- additional missions beyond the current four
- imported full game frameworks
- external AI APIs
- major engine rewrite
- turning the game into an RPG
- large branching campaigns
- mechanics that exist only because another game has them

## Token and implementation discipline

Future coding prompts should target one small backlog item at a time.

Prefer:

- targeted searches
- reuse of inspected files
- small diffs
- existing systems
- explicit non-goals
- tests for the exact change

Avoid using a broad request such as "improve the mission" once a backlog item exists.
