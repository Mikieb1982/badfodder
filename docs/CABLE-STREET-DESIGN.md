# IF I CAN SHOOT RABBITS - Cable Street Detailed Mission Design

Status: DESIGN COMPLETE. Not yet implemented.
Last consolidated: 7 October 2026

This document expands the Cable Street story spine in `docs/MISSIONS.md` into a playable mission design.

It preserves the current historical authoring package, the existing four playable characters, the non-firearm interaction model and the working Cable Street barricade/crowd systems.

No gameplay code is authorised by this document. It is an implementation source of truth.

---

# Mission identity

Theme: Community

Central question: What can a neighbourhood achieve together?

Mechanical identity: Contribute to a crowd.

Desired feeling: **I am one part of something much bigger.**

Classification: Based on real events.

The playable characters do not win the Battle of Cable Street. They participate in one bounded street section inside a much larger historical confrontation.

The mission should move through:

**GATHERING -> PREPARATION -> PRESSURE -> REPAIR -> SHIFTING CRISIS -> COLLECTIVE DEFIANCE -> AFTERMATH**

Cable Street must remain mechanically different from the other missions:

- Bad Belzig is about deciding what can be protected.
- Wigan is about connecting separated groups.
- Cable Street is about making useful contributions while a larger crowd continues acting around the player.

The crowd is not decoration. It is part of the mission system.

---

# Historical boundary and guardrails

The current authoring package is authoritative for the playable geography and uncertainty labels.

## Supported historical foundation

The existing evidence package supports:

- Cable Street and surrounding street/railway relationships in the bounded Christian Street slice
- an attempted route through Cable Street toward Cannon Street Road
- police pressure from the western approach
- an obstruction involving a lorry in the vicinity of Christian Street
- the broader historical fact that local residents and anti-fascist demonstrators opposed the British Union of Fascists march on 4 October 1936

## Required uncertainty language

The exact 1936 barricade footprint is not established.

The main in-game Christian Street barricade is an interpretation placed inside a historically supported vicinity. It must never be presented as a surveyed exact coordinate.

The Berner Street side defence is a fictional tactical placement for gameplay and must remain labelled internally as such.

The following are also gameplay adaptations unless separately supported by evidence:

- exact barricade dimensions
- individual premises and private-area use
- exact material piles
- exact timings of local actions
- the four playable volunteers
- named supporting NPCs
- side-defence placement
- exact mounted-pressure placement/timing

No essential route should depend on an unverified alley, yard or private passage.

Do not add modern landmarks or the modern Cable Street mural to the 1936 world.

If later research changes a historical claim, update the authoring evidence/uncertainty files rather than silently changing this design.

---

# Existing playable characters

Keep the current roster and current lightweight traits.

| Character | Existing identity | Story role | Relationship / dramatic use |
| --- | --- | --- | --- |
| Jack | Dock worker, STUBBORN | Strong practical worker who instinctively braces, carries and stays with a threatened position | Neighbour of Rose. He initially treats the problem as something physical that can be blocked and held. |
| Rose | Local organiser, ORGANISER | Connects the playable group to the wider crowd and understands that no single barricade matters without people supporting it | Neighbour of Jack. She provides context and keeps the focus on collective action rather than individual heroics. |
| Sam | Tailor, RUNNER | Fast mover and messenger who is useful when pressure shifts between positions | Friend of Ada. His mobility makes him the natural character for moving information or assistance, but this must remain optional rather than a class lock. |
| Ada | Neighbourhood volunteer, MEDIC | Calm practical helper focused on injured and vulnerable people | Friend of Sam. She gives civilian assistance and recovery a recognisable human purpose. |

Do not convert these traits into mandatory RPG roles. Any character can carry, reinforce, assist or hold.

---

# Supporting community anchors

These supporting characters are fictional and exist only to give the larger crowd recognisable faces.

## Miriam Rosen

Local resident helping organise material and people around the main defence.

Purpose:

- introduces the preparation work
- remains near the Christian Street defence when safe
- provides short updates about what the crowd is doing

She is not a commander and the player does not receive orders from her like a soldier.

## Alf Harris

Local carter / labourer helping move heavy material and keep access behind the barricade usable.

Purpose:

- makes material movement feel like shared labour rather than four people carrying every object
- becomes one of the functional helper NPCs when crowd confidence is sufficient

## Nora Flynn

Neighbourhood first-aid volunteer.

Purpose:

- assists injured residents during regroup phases
- provides a human focus for rescue/assistance actions
- can remain visible in the aftermath

These people should be visually mixed into the crowd. They do not form a second controllable squad.

---

# Existing defence network

The design uses the two defences already present in the runtime authoring data.

## B - Christian Street defence

Historical status:

**Interpretation inside a supported vicinity.**

Gameplay role:

- main barrier
- primary western pressure point
- central gathering location
- the route that must ultimately remain blocked

This position is the heart of the mission.

## S - Berner Street side defence

Historical status:

**Fictional gameplay placement.**

Gameplay role:

- secondary pressure point
- prevents every phase becoming one stationary hold
- gives the player a reason to leave the main barricade and trust the crowd to continue acting

Losing this position should increase pressure elsewhere rather than falsely implying a specific historical event occurred there.

---

# Defence state model

Each defence should remain persistent whether or not it is on screen.

Use the existing barricade integrity/breach state as the foundation.

Readable states:

- PREPARED
- UNDER_PRESSURE
- DAMAGED
- BREACHED
- RECOVERING
- HELD

These are presentation/state labels around existing integrity values, not a replacement physics system.

The player should be able to understand state through the world:

- crowd density
- people carrying material
- barricade appearance
- police proximity
- helper behaviour
- shouted warnings
- retreating or returning residents

A HUD marker may support this, but the mission should not become a strategy-management screen.

---

# Crowd roles

The crowd should contain several functional behaviours but remain visually organic.

## Residents

Behaviours:

- gather behind safer areas
- move away from active police pressure
- react to breaches
- return gradually when pressure drops
- assist one another visually

## Helpers

Behaviours:

- carry available materials
- occupy barricade work positions
- reinforce when conditions allow
- release work positions when pressure becomes unsafe

The current deterministic crowd/helper system already supports much of this behaviour.

## Lookouts / messengers

A very small number of crowd NPCs can deliver warnings between the two defence areas.

Do not create a complex messaging simulation. Their purpose is to make pressure changes feel like information moving through people rather than objective markers appearing from nowhere.

## First-aid volunteers

Remain behind active pressure where possible and visually assist residents after pushes.

The player may help them through contextual actions, but they continue doing limited work without direct control.

---

# Opening - The street is preparing

## Story situation

The confrontation is already developing when the mission begins. The opening should not pretend Cable Street is having an ordinary day immediately before the event.

People are arriving, materials are being moved and the threat of the march is understood. The street is becoming a defensive space.

The four playable characters enter as local participants among many others.

## Player actions

1. Move toward the Christian Street defence.
2. Pass residents and helpers already preparing the area.
3. Meet / pass Miriam and understand what is needed through brief contextual dialogue.
4. Carry at least one load of material.
5. Assist a resident if the opportunity is present.
6. Reinforce the main defence.
7. Take position as the first police pressure approaches.

## Existing systems to reuse

- `carry`
- `reinforce`
- `assist`
- `hold`
- `drop`
- material reservation/carrying
- barricade work positions
- civilian assistance/exit
- ambient/reactive crowd
- crowd confidence
- existing gathering phase/director

## Design change from the current task-list feeling

Do not frame preparation as:

> Deliver two loads before the timer expires.

The player can still have bounded preparation time, but the story presentation should be:

> People are building the line and you have a short time to help before pressure reaches the street.

The crowd should also make visible progress so the player never feels that only the four protagonists are building the barricade.

## Preparation consequence

Record a simple preparation quality from the actual world state when the first push begins:

`preparation_status`

- STRONG
- ADEQUATE
- RUSHED

This is based on barricade integrity, available material and assisted residents rather than an arbitrary score screen.

Preparation quality changes the opening pressure and crowd confidence slightly. It does not determine the whole mission.

---

# Act I - First police push

## Core idea

The first confrontation teaches that the player cannot defeat the police formation by shooting or eliminating individuals.

The playable action is collective resistance at the barrier.

## Player actions

1. Take a work/hold position at the Christian Street defence.
2. Use the existing fight-back / hold interaction while police pressure is active.
3. Move away briefly if needed to assist an exposed resident or collect nearby material.
4. Return to reinforce or hold the position.
5. Repel the first pressure cycle.

## Crowd contribution

When confidence is high enough:

- helpers occupy free work positions
- crowd resistance contributes to pushing the formation back
- residents stay closer to the defence

When confidence falls:

- helpers withdraw
- residents move back
- the player has fewer hands at the line

The player therefore influences crowd effectiveness without directly commanding the crowd.

## First payoff

When the police formation withdraws, do not display a military victory beat.

Instead:

- crowd noise changes
- people step forward again
- someone checks the barricade
- injured residents are attended
- material begins moving again

The street has survived one push, not won the day.

---

# Quiet beat 1 - Regroup and repair

The first pause should be playable.

## Player actions

- repair the main defence
- help Nora with an injured resident
- move loose material closer to useful positions
- walk along the defended section and see damage from the first push
- optionally strengthen the existing side defence

## Story purpose

This is where the player understands that the confrontation is wider than the current camera position.

A messenger / crowd reaction reports growing pressure elsewhere.

The player is introduced to the Berner Street side defence as a **gameplay support position**, not as a claimed historical barricade coordinate.

---

# Act II - Pressure shifts

## Core mechanic

For the first time, both defences matter at once.

The main Christian Street defence continues to exist when the player moves away.

The side defence comes under pressure.

The player can:

- move the whole group to the side defence
- leave one or two characters helping at the main defence
- move quickly between the two

Single-player must be able to keep the squad together and solve the situation sequentially. Split play is useful, not required.

## Off-screen simulation rule

A defence does not pause because it is off camera.

Its state continues using:

- current integrity
- active police formation
- occupied helper/work positions
- local crowd confidence
- available material
- recent player assistance

However, off-screen resolution must be bounded and readable. Do not allow a full healthy defence to collapse instantly outside the player's view.

Warnings should arrive before a major state change:

1. pressure begins
2. crowd / messenger warning
3. defence becomes DAMAGED
4. urgent warning if near BREACHED
5. breach occurs only after enough pressure to allow a reasonable response

This is not a hidden timer. The world should communicate what is happening.

## Side-defence actions

At the Berner Street gameplay defence the player can:

- reinforce
- occupy hold positions
- assist a resident exposed by the pressure
- help crowd helpers remain effective
- withdraw when the pressure has been repelled

## Consequences

If the side defence holds:

`side_defence_status = HELD`

Benefits:

- later pressure is divided between positions
- crowd confidence improves
- the final Christian Street defence has more support

If the side defence is breached and not restored:

`side_defence_status = LOST`

Consequences:

- it does not fail the historical mission
- helpers retreat toward the main defence
- later police pressure on the main route increases modestly
- the aftermath reflects that this gameplay position was abandoned

The mission never claims that losing the fictional side defence changed the documented historical event.

---

# Act III - The street works without you

## Core idea

This act proves the mission's central concept:

**The player is useful, but the player is not the whole resistance.**

After stabilising one position, the player should see NPCs continue useful work at the other.

Examples:

- helpers carry material without being ordered
- a first-aid volunteer leads an assisted resident away
- people reoccupy work positions after pressure drops
- a messenger crosses between positions
- crowd density changes in response to confidence and threat

The player moves through a functioning social space rather than a level populated by idle quest-givers.

## Optional rescue / assistance opportunities

During this act, 1 to 3 bounded civilian assistance opportunities can occur.

Examples:

- help someone knocked down near the edge of a pressure zone
- guide a frightened resident behind the safe line
- help Nora move an injured person after a push

These must remain quick contextual actions. Do not turn Cable Street into an escort mission.

Assisting people improves the quality of the final community support and aftermath, but missing one does not fail the mission.

---

# Act IV - Repeated pressure

## Core idea

The mission becomes increasingly chaotic, but not through endlessly increasing enemy health or spawning combatants around the player.

Pressure escalates through:

- shorter recovery windows
- damaged barricades
- competing material needs
- residents moving away from threatened areas
- shifts between the main and side defence
- occasional mounted-pressure event from the existing system
- fewer available helpers if confidence falls

Mounted pressure should remain a gameplay pressure mechanic unless future evidence specifically supports its local placement/timing. Do not present it as an exact reconstruction.

## Player rhythm

The desired rhythm is:

**HOLD -> CHECK PEOPLE -> REPAIR -> MOVE -> SUPPORT -> RETURN**

not:

**STAND STILL -> PRESS ACTION FOR FOUR MINUTES**

The director should vary which defence is most urgent while keeping the Christian Street route the central historical objective.

---

# Decisive moment - Keep the route closed

## Setup

Late in the mission, the pressure director creates the strongest combined crisis.

The Christian Street defence is under renewed pressure.

If the side defence survived, it also requires support or contributes helpers depending on its condition.

If the side defence was lost, more of the wider pressure is represented at the main route.

Residents and helpers react visibly.

## Player purpose

The player is not asked to defeat the march.

The player's purpose is:

> Keep this section of the route blocked while the wider confrontation continues around and beyond the playable area.

## Mechanical conditions

The decisive hold succeeds when:

- the main Christian Street route remains blocked for the required final period
- temporary breaches are recovered within the existing bounded recovery window
- the playable group remains capable of contributing

Side-defence survival affects support but is not required for historical mission completion.

## Breach recovery

A breach should create a dramatic recovery opportunity, not immediate failure.

Existing dynamic barricade/navigation state already supports the route becoming physically passable when breached.

When the main defence breaches:

1. police pressure visibly pushes into the gap
2. crowd confidence falls
3. helpers withdraw or reposition
4. the player has a short recovery window
5. material / hold actions can restore the obstruction

Only if the main route remains open beyond the bounded recovery time should the playable attempt fail.

Failure text should describe **this defence being broken**, not rewrite history by declaring that fascism won Cable Street.

---

# Historical outcome transition

Once the final hold condition is met, the wider event resolves outside the player's direct control.

The game may communicate that the march has been turned away / abandoned or diverted as supported by the existing historical framing.

The key presentation rule is:

Do not visually imply that Jack, Rose, Sam and Ada personally caused the entire historical outcome.

Preferred sequence:

1. pressure at the playable barricade subsides
2. police formations withdraw / stop advancing in the bounded slice
3. crowd noise changes before the UI declares success
4. people cautiously reoccupy the street
5. word spreads through the crowd that the march will not pass through as intended
6. only then show the historical success headline

The wider crowd is the reason the ending feels possible.

---

# Tracked consequences

Keep outcomes small and readable.

## 1. Preparation

`preparation_status`

- STRONG
- ADEQUATE
- RUSHED

## 2. Main defence

`main_defence_status`

- HELD
- RECOVERED_AFTER_BREACH

A permanently lost main defence is a retry/failure state rather than a completed alternative history branch.

## 3. Side defence

`side_defence_status`

- HELD
- RECOVERED
- LOST

## 4. Civilian assistance

Track:

- residents assisted
- residents safely exited / moved behind the line

Do not create a branch for every anonymous crowd member.

## 5. Crowd condition

Summarise final crowd confidence in broad presentation bands:

- STRONG
- SHAKEN
- EXHAUSTED

Do not expose the underlying numeric confidence value as a gamey morale meter unless later testing proves it necessary for accessibility.

## 6. Playable group condition

Track severe injuries / incapacitations if supported by the current character health model.

The four playable characters should remain visible in the aftermath according to their actual state.

---

# Strong success, costly success and failure

## Strong success

- main Christian Street route held without a sustained breach
- side defence held or recovered
- several residents assisted
- crowd remains functional
- playable group finishes largely intact

## Costly success

The historical route still holds, but one or more of the following occurred:

- main defence had to be recovered after a breach
- side defence was lost
- civilian assistance opportunities were missed
- crowd confidence finished low
- one or more playable characters were badly injured / incapacitated

This still completes the mission.

The ending should acknowledge exhaustion and damage instead of presenting a perfect victory.

## Failure / retry

Hard failure should be limited to the playable attempt:

- main Christian Street route remains breached beyond the existing recovery window
- the playable group is no longer capable of continuing, if the current health system supports that state

Failure wording must stay local:

- "THE ROUTE HAS BEEN BREACHED"
- "THE DEFENCE HAS BROKEN"

Avoid alternative-history wording such as "THE MARCH WINS" or "CABLE STREET FALLS".

---

# Aftermath

Do not end on the final pressure pulse.

The player should retain control briefly or receive a short in-engine aftermath.

## Environmental payoff

- police pressure recedes
- damaged barricades remain damaged
- abandoned material remains in the street
- residents return gradually
- helpers stop bracing and begin checking people / clearing space
- Nora tends to injured people if available
- Miriam speaks with residents rather than delivering a victory speech
- if the side defence was lost, helpers from that area appear back at the main position

## Character payoff

Short reactions should reflect the four playable personalities without turning them into celebrities.

Possible beats, not final dialogue:

- Jack looks at the barricade rather than claiming victory
- Rose points out that people across the district held together
- Sam asks after someone he helped earlier
- Ada immediately returns to an injured resident

## Historical payoff

The final historical text should make clear that:

- the playable section was only one part of a much larger mobilisation
- thousands of local residents and anti-fascist demonstrators were involved in the wider event
- the British Union of Fascists march did not proceed through the East End as intended

Exact final wording should be separately historical-fact checked before implementation.

---

# Pressure-shift model

This is the main new mission-specific system required by the design.

It should be built on top of existing Cable Street director/runtime state rather than replacing it.

Each active defence receives an urgency value derived from existing data such as:

- integrity ratio
- breached state
- police formation state/proximity
- number of occupied helper positions
- recent player presence
- available nearby material

The director uses urgency to decide where the next meaningful pressure should develop.

Rules:

1. Do not attack both positions at maximum intensity continuously.
2. Allow quiet repair windows.
3. Warn the player before an off-screen position becomes critical.
4. Avoid choosing the same position repeatedly unless the other is already lost or the finale requires it.
5. The main Christian Street defence remains the ultimate required route.
6. The side defence modifies pressure/support, not historical truth.

This can use the same deterministic/seeded philosophy as the rest of the game.

---

# Off-screen persistence model

The current runtime already stores barricade, formation, crowd-helper and material state independent of camera position.

Implementation should preserve that model.

Do not despawn/rebuild a defence every time the camera leaves it.

For performance:

- full animation/rendering can remain camera-limited
- simulation frequency for distant ambient crowd members may be reduced
- barricade integrity, formation state, helper occupancy and critical civilians must remain authoritative
- deterministic results must not depend on whether the player happened to look at a position

This is important both mechanically and thematically. The neighbourhood does not stop existing when the player walks away.

---

# Non-combat action set

Cable Street should remain the mission with the highest concentration of meaningful non-firearm actions.

Approved action families:

- CARRY material
- DROP material
- REINFORCE barricade
- HOLD / FIGHT BACK at a pressured barricade
- ASSIST resident
- help an injured resident behind the safe line
- move between positions to relay/support pressure changes

Potential later extension, only if needed:

- PUSH / reposition one authored large obstruction
- PASS material between helpers

Do not add these simply for variety. Only implement them if playtesting shows the current interaction set cannot express the story.

Firearms and grenades remain disabled for this mission.

---

# Existing systems to preserve

The current Cable Street implementation already contains substantial foundations that should be extended rather than rewritten:

- mission-specific Cable Street runtime/controller
- barricade integrity, construction tiers and breaches
- dynamic navigation obstacles for barricades
- material reservation, carrying and delivery
- civilian assist / exit state
- police formation states
- crowd confidence
- deterministic ambient residents/helpers
- helper work-position occupancy
- helper material deliveries
- crowd avoidance of police pressure
- contextual carry / reinforce / assist / hold / drop actions
- repeated pressure director
- breach recovery window
- mounted-pressure mechanic
- persistent phase state

Do not replace these with a generic combat objective framework.

---

# Implementation support matrix

| Design beat | Existing support | New work likely required |
| --- | --- | --- |
| Preparation | gathering phase, materials, carry/reinforce/assist | better story triggers, visible NPC preparation, preparation outcome state |
| First push | police formation, fight-back, crowd resistance | presentation/context changes only |
| Regroup | current regroup phase, repair requirements | first-aid/civilian reactions, less checklist-like presentation |
| Two-defence play | B and S barricades, two formations | pressure-shift policy and readable warnings |
| Off-screen persistence | authoritative controller state | bounded off-screen pressure rules / reduced distant simulation |
| Crowd autonomy | deterministic crowd/helpers, confidence | messenger/lookout cues and stronger visible handoff between positions |
| Civilian assistance | assist/exit system | small authored mid-mission opportunities |
| Final hold | repeated pressure, breach recovery, final timer | consequence-aware intensity/support and story framing |
| Historical outcome | existing success headline | in-engine transition and outcome summary |
| Aftermath | existing crowd rendering | persistent damage, NPC aftermath behaviours, character reactions |

---

# Recommended act checkpoints for retry

1. mission start / preparation
2. after the first police push
3. after the first regroup and side-defence introduction
4. before the decisive repeated-pressure phase

These are recovery checkpoints, not historical branches.

A retry restores the authored state for that checkpoint rather than generating a different historical layout.

---

# Implementation order after authorisation

When this mission reaches implementation, keep the tasks small:

1. preparation outcome state and story presentation
2. named community-anchor presentation using existing NPC/crowd systems
3. readable defence-state wrapper around existing barricade integrity
4. two-defence pressure-shift policy
5. off-screen persistence / warning rules
6. bounded civilian assistance events
7. consequence-aware final hold
8. historical outcome transition
9. aftermath state and summary
10. automated tests for pressure shifting, off-screen determinism and breach recovery
11. historical wording verification
12. human playtest and balance

Do not combine all of this into one broad implementation request.

---

# Acceptance criteria for the eventual mission

The design is successful when a player can explain the mission without saying:

> I stood at a barricade for several minutes.

A successful description should be closer to:

> We helped everyone prepare, held the first push, repaired the line, ran between two threatened positions, helped people caught in the pressure and kept the main route blocked while everyone around us was doing their part too.

The final feeling should be collective relief, not individual military triumph.
