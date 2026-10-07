# IF I CAN SHOOT RABBITS - Wigan Detailed Mission Design

Status: DESIGN COMPLETE. Not yet implemented.
Last consolidated: 7 October 2026

This document expands the Wigan story spine in `docs/MISSIONS.md` into a playable mission design. It preserves the current Wigan map, existing playable characters and the live three major combat anchors: Tudor House, Grand Arcade and Wallgate.

No gameplay code is authorised by this document. It is an implementation source of truth.

---

# Mission identity

Theme: Solidarity

Central question: How do people build solidarity under pressure?

Mechanical identity: Connect and coordinate.

Desired feeling: **We are becoming organised.**

Classification: Fictional mission.

Wigan must not feel like Bad Belzig with different buildings. Bad Belzig becomes progressively harder to protect. Wigan should do the opposite: the town begins fragmented and becomes more capable as the player reconnects people.

The player is not conquering Wigan alone. The four playable characters act as the moving link between separated local groups.

Story progression:

**ISOLATION -> CONTACT -> CONNECTION -> DISRUPTION -> COORDINATION**

---

# Existing playable characters

Keep the current roster and current lightweight traits.

| Character | Existing identity | Story role | Relationship / dramatic use |
| --- | --- | --- | --- |
| Arthur | First World War veteran, STEADY | Cautious source of combat judgement who distrusts heroic charges | Neighbour of Elsie. He knows what organised violence looks like and repeatedly pushes the group to make each fight achieve something practical. |
| Elsie | Railway worker, LOCAL | Knows the station approaches, service routes and many of the people working around the transport network | Neighbour of Arthur. She becomes the natural link to the Wallgate / North Western group without becoming a formal commander. |
| Tom | Young volunteer, RUNNER | Fast messenger and the least experienced member of the group | Friend of George. His ability to move quickly makes him useful for reconnecting people, but his confidence should grow rather than start fully formed. |
| George | Factory worker, STUBBORN | Reliable under pressure and comfortable with practical collective work | Friend of Tom. He represents the instinct to stay and help others rather than leave once his own immediate danger has passed. |

The four are already together when the mission begins. The story is not about forming the playable squad. It is about the squad connecting the wider town.

Do not turn their traits into rigid RPG classes or mission locks.

---

# Supporting resistance groups

The mission uses a small number of recognisable local groups rather than dozens of named NPCs.

All named supporting people below are fictional.

## 1. New Market Street / Tudor group

Anchor NPC: **May Cooper**, local volunteer helping people shelter around New Market Street.

Initial state: pinned down and unable to move because enemy troops control the Tudor frontage and immediate street.

Contribution after connection:

- Tudor becomes the first safe rally / recovery point.
- May's volunteers keep the rear route open.
- Wounded civilians can be moved back here during the early mission.

Story meaning: the first proof that clearing a route allows other people to act.

## 2. Bus Station group

Anchor NPC: **Stan Mercer**, bus mechanic organising drivers, conductors and civilians around the station approaches.

Initial state: isolated by hostile patrols and unsure which town-centre routes are still usable.

Contribution after connection:

- establishes a civilian movement network between connected safe points
- provides route information around New Market Street
- later moves civilians away from the final Wallgate approach

Story meaning: connection creates movement.

## 3. Market Place group

Anchor NPC: **Eileen Shaw**, shop worker coordinating neighbours and lookouts around Market Place.

Initial state: able to observe enemy movement but unable to pass information reliably to the rest of the town.

Contribution after connection:

- provides warning of incoming enemy groups
- reveals which approach to Grand Arcade is currently least exposed
- later relays information between the centre and the station push

Story meaning: connection creates information.

## 4. King Street group

Anchor NPC: **Frank Doyle**, factory worker who has helped gather tools, ammunition and first-aid supplies in the King Street area.

Initial state: not completely trapped, but cut off from the central network and reluctant to abandon supplies while nearby streets are contested.

Contribution after connection:

- makes the existing King Street supply cache part of the story
- provides a small volunteer support group for the final operation
- can help hold a side route once connected

Story meaning: connection creates material support.

## 5. Railway group

Anchor NPC: **Nell Foster**, railway worker trapped with colleagues around the Wallgate / North Western gateway.

Initial state: completely cut off from the groups further north / east by the enemy station position.

Contribution:

This group is the final group to be reached. Its connection is the payoff of the mission rather than an early power-up.

Once Wallgate is secured, the railway group helps reopen the station gateway and the disconnected local network finally becomes continuous.

Story meaning: the network is complete.

---

# Important locations and story purpose

| Location | Story purpose |
| --- | --- |
| Tudor House / New Market Street | Opening crisis and first rally point. Shows that freeing one location lets other people begin helping. |
| Bus Station | Movement network. Connects civilians and practical transport workers to the wider resistance. |
| Market Place / Moon Under Water area | Information network and central civilian contact point. |
| Grand Arcade / Standishgate | Central rally point where separate groups can finally connect physically. Main mid-mission defence. |
| King Street | Optional but valuable supply / volunteer connection. Existing supplies remain meaningful rather than becoming arbitrary pickups. |
| John Bull / Coopers Row area | Secondary sheltered route / local contact point if useful for authored movement. Do not force it into a major objective solely because the landmark exists. |
| Wallgate / North Western | Final enemy barrier dividing the railway workers from the connected town-centre network. |

The named real locations are used as geography inside a fictional mission. The events, groups and wartime occupation are fictional / alternate history.

---

# Resistance network model

The player should be able to understand the network without opening a management screen.

Each group has a simple state:

- ISOLATED
- CONTACTED
- CONNECTED
- DISRUPTED

The network is expressed through the world:

- runners appear between safe points
- civilians start using connected routes
- volunteers occupy cleared junctions
- warnings arrive from connected lookouts
- supplies become available
- people physically appear at rally points

The tactical map may show small connected-group markers, but the system should remain readable without a strategy-game overlay.

Connecting a group requires three things:

1. physically reach it
2. solve the immediate problem preventing it from acting
3. preserve or reopen at least one route linking it to the network

The player does not recruit dozens of individually controlled units.

---

# Opening - Tudor House

## Story situation

The mission begins at the existing squad spawn outside Tudor House.

The four have come to New Market Street because May's group was supposed to be the first link in an improvised town-centre network. They arrive to find the street position under enemy control and the local volunteers pinned down.

This gives the existing Tudor combat an immediate purpose.

## Player actions

1. Move into the Tudor / New Market Street frontage.
2. Identify the hostile position preventing May's group from moving.
3. Clear enough of the position for the volunteers to emerge.
4. Occupy the existing Tudor checkpoint / defensive position.
5. Repel the current fast frontal counterattack.
6. Speak / interact briefly with May after the route is secure.

## Existing systems to reuse

- current Tudor secure-zone objective
- current rush checkpoint wave
- cover and suppression
- garrison / prepared position behaviour
- mission objective signalling
- health / wounded states

## Consequence

When the position is secured:

`tudor_group = CONNECTED`

Tudor becomes the first rally point.

The player sees volunteers move into useful positions instead of receiving only an objective-complete banner.

## Quiet beat 1

Pressure drops briefly.

May explains that two other groups have gone silent:

- the Bus Station group
- the Market Place group

No dialogue menu is required.

Both destinations become available and the player chooses movement order naturally.

This is the first point at which Wigan stops being a purely linear mission.

---

# Act I - Find the others

## Core structure

The player needs to reconnect both the Bus Station and Market Place groups before the central network can function properly.

The player can:

- take the whole squad to one and then the other
- split into two pairs and work in parallel

Single-player must never require simultaneous control. Splitting is an efficiency / tactical option, not a mandatory mechanic.

## Bus Station connection

### Situation

Stan's group is sheltering around the Bus Station approaches. Their immediate problem is movement: civilians are present, but the group does not know which route back toward Tudor is safe.

### Player actions

1. Reach the Bus Station group.
2. Clear or bypass the patrol controlling the safest return route.
3. Establish a route marker / connection back toward Tudor.
4. Help one small civilian group begin moving along the route.

### On success

`bus_group = CONNECTED`

Practical effects:

- civilians can move between connected safe points without following the playable squad individually
- Stan's group can escort later civilian movement off-screen / at low simulation cost
- the player receives clearer route cues around New Market Street

This is the first mechanical expression of the town helping itself.

## Market Place connection

### Situation

Eileen's group has useful information about enemy movement but cannot reliably transmit it. Nearby hostile movement makes sending a runner dangerous.

### Player actions

1. Reach Market Place.
2. Protect Eileen / a runner long enough to establish contact with Tudor or the Bus Station network.
3. Clear the immediate route rather than hunting every hostile on the map.

### On success

`market_group = CONNECTED`

Practical effects:

- incoming attacks can be signalled slightly earlier
- the tactical map / objective system may reveal the direction of the next major pressure event
- one safer approach to Grand Arcade can be identified

The reward is information, not a stat buff.

## If one group is delayed

The mission does not fail.

The player can reach Grand Arcade with only one of these groups connected, but:

- fewer civilians move safely
- warning time is reduced if Market Place remains isolated
- the Grand Arcade rally contains fewer volunteers

The design should encourage connection without forcing completion through an arbitrary lock.

---

# Act II - Build the centre

## Objective: Establish the Grand Arcade rally point

### Why Grand Arcade matters

Grand Arcade / Standishgate sits between the groups the player has been connecting. It becomes the natural central rendezvous where people from different parts of town can finally meet.

The objective is therefore not simply:

> Secure Grand Arcade.

The meaning is:

> Open the centre long enough for separate groups to connect into one working network.

## Approach

Market Place connection can reveal a less exposed approach.

Bus Station connection can reduce civilian traffic through the active combat area.

If neither is connected, the player can still attack the position, but the environment should feel more confused and isolated.

## Player actions

1. Reach the Grand Arcade / Standishgate frontage.
2. Clear the existing defender group enough to establish the rally point.
3. Occupy the existing Grand Arcade checkpoint.
4. Hold against the current two-sided pincer counterattack.
5. Keep at least one network route open during the attack.

## Existing systems to reuse

- current Grand Arcade secure-zone phase
- existing pincer checkpoint wave
- split squad selection
- garrisoning
- cover / suppression
- pathfinding and tactical map
- civilian states
- existing objective and checkpoint systems

## Network payoff

If the position holds, connected groups begin physically appearing or sending representatives / runners to Grand Arcade.

This is the first time the player should see the network becoming larger than the playable squad.

Record:

`grand_arcade_status = HELD`

---

# Act III - The network is cut

## Core idea

Success provokes a response.

The enemy recognises that the local groups are beginning to coordinate and tries to break the connections rather than merely attack the four playable characters.

This act should feel different from Bad Belzig's priority crisis.

Bad Belzig asks: **What can we save?**

Wigan asks: **Can we reconnect what has been separated?**

## Trigger

After the Grand Arcade pincer, a hostile push cuts one of the routes back through the centre.

Author the exact route around the current street geometry, but the disruption should logically threaten the line between:

- Grand Arcade / Standishgate
- Market Place / New Market Street

At roughly the same time, King Street reports that its supplies and volunteers are available if someone can establish contact.

## Player choice

The player has two useful jobs:

### Job A - Reopen the broken central link

Clear / bypass the blocking position and escort a runner or re-establish a route marker.

Completing this returns any affected connected group from DISRUPTED to CONNECTED.

### Job B - Connect King Street

Reach Frank's group and secure access to the existing supply cache.

Completing this records:

`king_group = CONNECTED`

and makes the existing King Street supplies part of the network.

The player may do both, choose the order, or skip King Street and push toward the finale with less support.

## Split-squad use

This is the strongest optional split-squad section in Wigan.

A player can:

- leave two people around Grand Arcade while two reconnect the route
- send a fast pair to King Street while another pair keeps the centre stable
- keep all four together and solve each problem sequentially

No timer should make sequential single-player play impossible.

The pressure should come from temporary network disruption and enemy movement, not from a hidden countdown designed around co-op.

## If Grand Arcade is temporarily lost

The mission does not immediately fail.

Set:

`grand_arcade_status = DISRUPTED`

The player can retake enough of the area to restore the rally point.

If the player chooses not to restore it before the final operation, the network remains partially fragmented and final support is reduced.

This produces consequence without turning every setback into restart.

---

# Quiet beat 2 - The plan forms

Once the central route is restored or the player reaches a stable state, reduce pressure.

At Grand Arcade or the nearest connected rally point:

- connected groups exchange information
- civilians move away from the station approach
- wounded volunteers are treated
- Elsie identifies the railway group's situation
- Arthur argues that simply holding the centre will allow the enemy to keep Wallgate as a barrier
- Tom / George can react to how many groups have actually answered

The network now has enough information to act together.

The final purpose becomes clear:

**Open the Wallgate / North Western gateway and reconnect the railway group.**

This is not presented as the four protagonists deciding to conquer the stations. It is a coordinated local operation made possible by the connections the player built.

---

# Act IV - Coordinated advance

## Final-operation roles

Connected groups automatically take supporting jobs.

The player does not manually command them like an RTS.

### Tudor group

Holds the rear New Market Street route and keeps the first rally point usable.

### Bus Station group

Moves civilians away from the Wallgate approach and keeps a fallback movement route open.

### Market Place group

Relays warnings about enemy movement and marks a safer / more dangerous approach state.

### King Street group

If connected, brings supplies and a small number of volunteers to secure a side route.

### Playable squad

Takes the moving role: break the station barrier and reach the isolated railway workers.

The player should feel that previous connections are now doing useful work without having to babysit them.

---

# Finale - Wallgate / North Western gateway

## Existing anchor

Reuse the current Wallgate final combat zone and siege-style counterattack.

## New purpose

The station gateway is the final physical break in the local network.

The sequence should be:

1. Advance toward Wallgate using whichever connected routes remain safe.
2. Break enough of the defender group to reach the railway frontage.
3. Make contact with Nell and the isolated railway workers.
4. Occupy the existing Wallgate checkpoint / defensive area.
5. Hold while the railway group opens / secures the local gateway and connected volunteers secure the approaches.
6. Survive the existing final multi-direction counterattack.
7. End the organised battle once the gateway is secure. Do not force a map-wide hunt for irrelevant stragglers.

## Consequence-driven support

### If Market Place is connected

- the player receives earlier warning of attack direction
- final pressure is more readable, not necessarily weaker

### If Bus Station is connected

- civilians are absent from the most dangerous final approach
- the fallback route remains visibly active behind the player

### If King Street is connected

- the existing optional supplies are available as intended
- a small volunteer element can help secure one side after the player clears it

### If Grand Arcade is held / restored

- the connected network can send support forward reliably

### If Grand Arcade remains disrupted

- final support arrives late or not at all
- the mission remains winnable with the four-person squad

Do not increase or reduce enemy health to represent these outcomes. Use information, routes, positioning, supplies and NPC support.

---

# Rally points

Rally points are not abstract save rooms. They are places made safe enough for people to coordinate.

## Rally 1 - Tudor House

Unlocked after the opening.

Functions:

- early regroup
- limited recovery / supplies
- first network origin

## Rally 2 - Grand Arcade

Unlocked after Act II.

Functions:

- central network hub
- connected-group presence
- mid-mission recovery
- source of final-operation planning

If disrupted, its functions reduce until the route is restored.

## Final connected point - Wallgate

Not a mid-mission hub.

Securing it completes the network and triggers the aftermath.

---

# Tracked consequences

Keep the outcome model small.

## 1. Group connections

Track:

- `tudor_group`
- `bus_group`
- `market_group`
- `king_group`
- `railway_group`

Relevant states:

- ISOLATED
- CONNECTED
- DISRUPTED

Tudor begins as the mandatory first connection. Railway becomes connected only in the finale.

## 2. Grand Arcade

`grand_arcade_status`

- HELD
- DISRUPTED
- RESTORED

## 3. Civilian movement

Track a simple movement / safety result based primarily on Bus Station connection and whether central routes remained usable.

Do not create individual branches for every civilian.

## 4. Network strength

Derive from connected groups rather than exposing a videogame-style solidarity meter.

Possible internal tiers:

- FRAGMENTED
- PARTIAL
- CONNECTED

The player sees the difference through people, routes, warnings and support.

## 5. Squad outcome

Use existing health / wounded / downed / dead states.

---

# Success, costly success and failure

## Strong success

- Wallgate / North Western gateway secured
- railway group connected
- Bus Station and Market Place groups connected
- Grand Arcade held or restored
- King Street connected or its supplies recovered
- civilian movement largely successful
- limited squad losses

Meaning:

The local groups have become a functioning network. The four playable characters were the link that allowed it to happen, not the sole force responsible.

## Costly success

Wallgate is secured and the railway group is reached, but one or more of the following occurred:

- Grand Arcade remains disrupted
- a local group stayed isolated
- civilian movement suffered
- King Street support was never connected
- squad members were badly wounded or killed

Meaning:

The central purpose still succeeds, but the town remains unevenly connected and the aftermath reflects those gaps.

## Failure

Use failure primarily when:

- the playable squad can no longer continue
- the final Wallgate position is irrecoverably lost under the existing mission-failure rules

Do not fail the whole mission merely because an optional group remained isolated.

---

# Aftermath

The aftermath should happen at / around the station gateway after the fighting subsides.

Avoid a military victory tableau.

Show practical consequences:

- railway workers emerge from the station frontage
- runners arrive from connected groups
- people recognise one another who had been separated at the beginning
- Bus Station volunteers direct civilians through the safe route if connected
- King Street volunteers arrive with remaining supplies if connected
- an isolated group is explicitly absent if the player never reached it
- wounded / missing squad members are acknowledged

The visual payoff is the network itself.

At the beginning, each group is alone.

At the end, people from different parts of Wigan are physically in contact and able to act together.

---

# Objective presentation

Avoid reducing the design back into a checklist such as:

1. Capture Tudor
2. Capture Grand Arcade
3. Capture Wallgate

Whenever practical, the reason should reach the player before the formal HUD objective.

Example sequence:

- May explains that the Bus Station group has gone silent.
- A route marker appears.
- HUD: `REACH THE BUS STATION GROUP`.

Later:

- A runner arrives from Market Place warning that the central link has been cut.
- The player sees volunteers stop moving between safe points.
- HUD: `REOPEN THE CENTRE`.

Story -> action -> consequence remains the rule.

---

# Existing mechanics to reuse

The design should reuse as much of the current game as possible:

- current Wigan geography and collision
- current Tudor / Grand Arcade / Wallgate defender groups
- existing rush / pincer / siege checkpoint profiles
- current squad selection and split selection
- pathfinding and tactical map routes
- garrisoning
- cover and suppression
- existing civilians and civilian states
- pickups, especially King Street supplies
- objective manager / event-driven objectives
- adaptive director and enemy behaviour
- health, wounded, downed and death states
- existing co-op ownership model without making co-op mandatory

---

# New systems actually required

Keep new engineering small and mission-driven.

## 1. Resistance-group state

A lightweight mission structure recording ISOLATED / CONNECTED / DISRUPTED state and contribution hooks.

This should be generic enough to reuse if another mission genuinely needs local groups, but do not build a full faction simulator.

## 2. Rally-point state

Simple active / disrupted rally points that determine where support and recovery can occur.

## 3. Route-connection events

Use existing navigation to determine authored links between specific rally / group locations.

Do not add flow fields solely for this mission. Shared crowd-routing work remains a separate candidate until all four mission designs are complete.

## 4. Support contribution hooks

Connected groups need small deterministic effects such as:

- early warning
- civilian routing permission
- supply availability
- limited volunteer reinforcement

These should be state-driven, not a new AI framework.

## 5. Outcome summary

Mission-end presentation of which groups connected and what that changed.

---

# Retry / checkpoint structure

Recommended recovery checkpoints:

1. mission start outside Tudor
2. after Tudor group connection
3. after Bus Station + Market Place phase
4. after Grand Arcade is established
5. before final Wallgate operation

Restoring a checkpoint must restore:

- group states
- rally states
- civilian movement state
- optional King Street connection / supplies
- squad health / casualties as appropriate to the checkpoint
- objective state
- spawned support state

These are recovery checkpoints, not branching save slots.

---

# Implementation guardrails

When this design is implemented:

- preserve the existing Wigan map geometry
- preserve all named landmarks and their actual mapped positions
- preserve the four existing playable characters
- preserve single-player viability
- do not require co-op to manage split objectives
- do not turn connected groups into controllable armies
- do not add a visible solidarity / faction XP meter
- do not make every group connection a combat-clear objective
- do not make King Street mandatory simply because supplies exist there
- do not require killing every enemy on the map to finish
- do not replace route / support consequences with enemy health scaling
- do not rewrite shared systems when an existing system plus a small state layer is enough

The mission succeeds when the player feels the town becoming more organised because of what they did.
