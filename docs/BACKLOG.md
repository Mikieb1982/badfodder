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

### APPROVED: Bad Belzig detailed mission design

Turn the current story spine into a playable act-by-act design before changing code.

Define:

- named playable characters and relationships
- opening playable situation
- exact purpose of each important checkpoint
- civilian routes and refuge locations
- local-knowledge interactions
- Act III setback
- counterattack logic
- finale conditions
- 3 to 5 tracked consequences
- success, partial success and failure states
- quiet moments and dialogue opportunities
- which existing mechanics already support each beat

Output should be detailed enough to implement in small tasks without rediscovering the story.

### APPROVED: Wigan detailed mission design

After Bad Belzig, define:

- starting group and relationships
- separated resistance groups
- why each group is isolated
- what each group contributes after connection
- rally points
- split-squad situations
- the event that cuts the network
- final coordinated action
- tracked consequences

### APPROVED: Cable Street detailed mission design

Define:

- historical boundaries and verified facts
- playable preparation phase
- barricade network
- NPC roles around each position
- non-combat actions
- how pressure shifts between sections
- how the world continues when the player moves away
- decisive hold/support moment
- aftermath and outcome tracking

Avoid representing the playable squad as the people who single-handedly won the historical event.

### APPROVED: Barcelona detailed mission design

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

Likely Cable Street rule: prefer consequences over arbitrary placement restrictions when that creates interesting play and does not softlock the mission.

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

Expected task groups:

1. Opening playable state
2. Local defence network
3. Checkpoint purpose and civilian routing
4. Act III dynamic setback
5. Counterattack
6. Consequence tracking
7. Finale and aftermath
8. Automated tests
9. Playtest and balance

### Wigan implementation package

Expected task groups:

1. Resistance-group data model
2. Connection and contribution logic
3. Rally points
4. Split-squad scenario support
5. Network-cut event
6. Coordinated finale
7. Consequence tracking
8. Tests and playtest

### Cable Street implementation package

Expected task groups:

1. Preparation interactions
2. Barricade state expansion
3. Crowd response and routing
4. Shifting pressure system
5. Non-combat action expansion
6. Persistent off-screen position state
7. Decisive finale
8. Aftermath
9. Historical verification
10. Tests and playtest

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
