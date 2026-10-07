# IF I CAN SHOOT RABBITS - Mission Story Spines

Status: Design working document
Last consolidated: 7 October 2026

This document preserves the current story direction for the four active missions. These are not final scripts. They define what each mission is about, what the player should experience and how gameplay should express the story.

## Shared rule

Each mission stands alone.

The shared thread is ordinary people resisting fascism. The missions do not need a continuing cast or plot, but they should share the same human-scale perspective.

Each mission should develop through:

1. Before the fighting
2. Escalation and changing circumstances
3. A decisive act
4. A personal aftermath

Objectives should emerge from events rather than feel like disconnected tasks.

---

# 1. Bad Belzig

## Identity

Theme: Home

Central question: What does protecting your home demand of you?

Mechanical identity: Protect and adapt.

Desired feeling: I cannot protect everything.

Classification: Fictional mission.

## Story premise

The war is ending and the Nazi regime is collapsing, but armed loyalists still control parts of Belzig. A small local resistance group decides to act before those forces can consolidate around Burg Eisenhardt and the town centre.

The mission is not about conquering a strategic city. It is about four people trying to keep neighbours alive and stop familiar streets from becoming enemy positions.

The story should feel personal because the characters are defending somewhere they understand and care about.

## Existing playable characters

The current roster remains the foundation of the mission. Do not replace these characters when the story pass is implemented.

| Character | Existing identity | Story role | Relationship / dramatic use |
| --- | --- | --- | --- |
| Karl | Former soldier / deserter, STEADY | The person with the most combat experience, but also the strongest reason to avoid pointless fighting | Neighbour of Otto. He recognises military danger quickly and repeatedly argues that positions only matter if they protect people. |
| Otto | Railway worker, MECHANIC | Practical local problem-solver who knows the southern approach and working routes through town | Neighbour of Karl. He trusts practical action more than speeches and helps turn ordinary infrastructure into useful routes. |
| Lotte | Civilian resistance member, RUNNER | Courier and local mover who knows people, side streets and shortcuts | Friend of Greta. She often reaches information first and gives the player reasons to move rather than simply defend. |
| Greta | Resistance organiser, ORGANISER | The person holding the improvised effort together | Friend of Lotte. She keeps the group focused on civilians and coordinates volunteers without becoming a military commander. |

Their existing traits remain lightweight gameplay modifiers. Do not turn the cast into RPG classes.

## Supporting civilian anchor

**Frieda Lehmann** is a fictional local first-aid volunteer helping organise the refuge at St. Marien.

Her purpose is to give the civilian side of the mission a human face. She is not a fifth squad member and does not fight. Her survival can affect recovery opportunities and the ending.

## Important locations and their story purpose

| Location | Story purpose |
| --- | --- |
| Bahnhofstraße / southern spawn area | Opening civilian route and the characters' link to ordinary town life. |
| Postdistanzsäule | Controls the most direct southern route between civilians, the centre and the refuge network. The position matters because people need to cross it. |
| St. Marien | Main civilian refuge during the middle of the mission. |
| Reißigerhaus area | Temporary first-aid / regroup location if St. Marien becomes exposed. |
| Burg Eisenhardt | Enemy command and staging position. Securing it breaks coordination but exposes the fact that the enemy has already sent forces elsewhere. |
| Marktplatz / Rathaus | Final civic centre. Holding it shows that organised fascist control of the town centre has broken. |

These are gameplay roles inside a fictional mission, not claims that these buildings performed those functions historically.

## Civilian route logic

The civilian routes give defensive positions meaning.

### Primary opening route

Bahnhofstraße / southern area -> Postdistanzsäule crossing -> St. Marien refuge.

### Fallback refuge route

St. Marien -> Reißigerhaus area.

### Evacuation route after the Act III setback

If the Postdistanzsäule route remains secure, civilians can move back through the direct southern route.

If it is lost, civilians must use a longer authored side-street route. The mission continues, but the evacuation becomes slower and more exposed.

The player should see civilians physically moving through these routes. A route is not considered protected merely because an objective text says so.

---

# Bad Belzig detailed playable design

Status: DESIGN COMPLETE. Not yet implemented.

The design deliberately reuses the existing three major combat anchors, Postdistanzsäule, Burg Eisenhardt and Marktplatz/Rathaus, but changes why the player fights there and what happens between them.

## Opening - Before the fighting

### Story situation

All four characters begin together near the existing southern spawn around Bahnhofstraße.

The first minutes should be tense but not yet a firefight. Doors are closing, civilians are moving in small groups and distant shots can be heard. Greta has learned that people are trying to reach the temporary refuge at St. Marien, but a patrol is taking control of the Postdistanzsäule crossing.

### Player actions

1. Move with the four characters through the southern streets.
2. Reach a small civilian group.
3. Use the existing gather / follow behaviour to start them toward St. Marien.
4. Approach the Postdistanzsäule and see that the route is blocked.

### Story delivery

Short movement dialogue only. No cutscene is required.

Useful beats, not final script:

- Greta makes clear that getting people through matters more than taking ground.
- Otto identifies the crossing as the quickest safe route from the south.
- Karl recognises that the patrol is settling into a defensive position.
- Lotte reports that more people are already waiting closer to the church.

### Mechanical purpose

The player learns civilian following and sees the place before being asked to fight for it.

---

# Act I - Keep the route open

## Objective: Secure the Postdistanzsäule crossing

### Why this position matters

The checkpoint protects the direct route used by civilians moving from the southern part of town toward St. Marien.

The task is therefore not simply:

> Secure the Postdistanzsäule.

The gameplay meaning is:

> Clear the patrol, occupy the checkpoint and keep the route open while the last civilians cross.

### Player actions

1. Remove or drive off the existing Post defender group.
2. Enter the checkpoint / sandbag position.
3. Hold against the existing fast frontal counterattack.
4. Keep enough of the route clear for the civilian group to cross behind or beside the position.
5. Leave the sandbags cleanly when the route is secure. Re-entering the zone should still allow the prepared position to be used.

### Existing systems to reuse

- current Post secure-zone objective
- existing checkpoint wave with the rush profile
- current sandbag enter / leave behaviour
- civilian follow and evacuation state
- cover and suppression
- health / wounded states

### Consequence

If the crossing is held long enough for the civilian movement to finish, record:

`post_route_status = HELD`

If the squad clears the position but abandons it before the civilian route is secure, or if it is retaken later, record:

`post_route_status = LOST`

Losing it does not end the mission. It changes Act III and the final approach.

## Quiet beat 1

After the counterattack, reduce pressure briefly.

A local volunteer group takes responsibility for watching the crossing if it was successfully held. The squad can move on rather than remaining permanently tied to the sandbags.

Allow:

- quick healing / pickup use
- a short conversation
- civilians visibly finishing the crossing
- the player to see the result of the first action

The emotional point is small relief, not celebration.

---

# Act II - Break the command position

## Objective: Reach and secure Burg Eisenhardt

### Why the castle matters

The remaining loyalists are using the Burg complex as a command and staging point. From there they can send forces back toward the southern route or into the town centre.

The squad goes there because leaving the position intact would put the refuge and the centre under continuing pressure.

### Approach

The route toward the Burg should introduce local-knowledge interactions without turning them into magical shortcuts.

Examples:

- Otto can identify a service access that avoids an exposed section.
- Lotte can point out a familiar courtyard / side-street cut-through.
- Karl can warn that one obvious approach is a firing lane.
- Greta can direct rescued civilians and volunteers away from the squad's approach.

These should be authored route choices using existing geography where possible. They should not invent secret tunnels or alter the town into something unrecognisable.

### Player actions

1. Move from the Post area toward the Burg.
2. Choose between the obvious route and one or more local alternative approaches.
3. Clear the existing castle defender group.
4. Occupy the existing Burg checkpoint.
5. Survive the current two-sided flanking counterattack.
6. Interact with the command position after the fight.

### Existing systems to reuse

- castle secure-zone phase
- current pincer checkpoint wave
- garrisoning
- cover and suppression
- building interaction framework
- pickups already positioned in the mission
- objective event signalling

## Discovery / turning point

Once the castle command point is searched, the squad finds enough information to understand that the enemy has already split its remaining force.

One group is moving back toward the southern crossing.

Another is moving toward St. Marien and the town centre.

The castle was important, but taking it did not solve the problem.

This triggers Act III.

## Quiet beat 2

Give the player a brief pause inside or near the secured Burg position.

This is a good point for:

- treating wounded characters
- reloading / collecting supplies
- short disagreement about what to protect first
- Greta making clear that the civilians at St. Marien take priority

Do not present a dialogue menu. The player's decision is expressed by movement when the two urgent situations appear.

---

# Act III - What can be saved

## Core idea

This is the act that delivers the mission's central feeling:

**I cannot protect everything.**

Two problems develop at once. The player is not asked to choose from a menu. Both appear in the world and the player's route determines what receives attention first.

## Crisis A - St. Marien refuge

Primary objective:

**Protect and evacuate the refuge.**

Frieda and civilians are sheltering at St. Marien. Enemy pressure makes the refuge unsafe.

### Player actions

1. Reach St. Marien.
2. Clear immediate threats without turning the church area into a kill-all arena.
3. Find Frieda and the civilians.
4. Gather the civilians.
5. Move them first toward the Reißigerhaus regroup / first-aid area.
6. Continue the evacuation using whichever route remains available.

If the refuge is reached early, civilians are organised and easier to move.

If the player delays, some civilians enter HIDING / FRIGHTENED / WOUNDED states and the evacuation takes longer.

The mission continues either way.

## Crisis B - Post route counterattack

Urgent secondary objective:

**Keep the southern route open.**

If the player returns quickly enough, the local volunteers at the Post can be reinforced and the direct route remains usable.

If the player prioritises the refuge, or simply arrives too late, the Post may be retaken.

That is not a mission failure. It creates a longer fallback evacuation route and removes the direct final approach from the available options.

## Single-player and co-op rule

The act must remain fully playable by one person controlling the whole squad.

Splitting the squad may be useful, especially in co-op, but the mission must never require simultaneous human control in two places.

A single-player squad can choose an order and accept the consequence of delay.

## Frieda consequence

Frieda can end Act III in one of three states:

- SAFE
- WOUNDED
- LOST

If safe, she helps restore wounded characters during the regroup period.

If wounded, recovery support is reduced and the ending acknowledges her condition.

If lost, the mission continues but the refuge aftermath is visibly different.

## Quiet beat 3 - Reißigerhaus regroup

Once the surviving civilians are out of immediate danger, pressure drops again.

This is the most important quiet moment before the finale.

Allow:

- Frieda to treat wounded characters if available
- volunteers to report which routes remain open
- Greta to take stock of who is missing
- Karl to argue against another static defence
- Otto / Lotte to identify routes into the centre

The group reaches the conclusion through circumstances rather than hero rhetoric:

If they simply wait, the remaining loyalists will keep attacking isolated places. They need to break the final organised position at Marktplatz / Rathaus.

---

# Act IV - Take the centre back

## Core idea

The final action is a limited local counterattack, not a military conquest.

The player uses the town itself to approach the final position.

## Route choices

Previous actions determine which approaches are practical.

### Route A - Direct southern approach

Available when:

`post_route_status = HELD`

Characteristics:

- fastest route
- more open ground
- local volunteers can follow behind after the route is secured

### Route B - Church / courtyard approach

Available when the St. Marien / Reißigerhaus area has been stabilised.

Characteristics:

- slower
- more cover
- narrower movement
- good route for cautious squad play

### Route C - Burg-side approach

Available after Act II and remains the fallback route.

Characteristics:

- longest
- more likely to meet remaining enemies
- prevents the mission from softlocking if other routes are lost

The route choice does not create three separate missions. All approaches converge on the Marktplatz finale.

## Local-knowledge interactions

Character identity should influence the route without creating RPG locks.

- Karl can identify exposed fire lanes and safer cover transitions.
- Otto can open or operate a practical service access where such an authored route exists.
- Lotte can reveal a resistance cut-through or faster link between known streets.
- Greta can rally surviving volunteers to hold a cleared junction behind the squad.

If a relevant character is dead or badly wounded, that convenience may be unavailable, but there must always be at least one viable route.

---

# Finale - Marktplatz and Rathaus

## Existing anchor

Reuse the current Marktplatz / Rathaus final combat zone and siege-style counterattack.

## New purpose

The goal is not to kill every enemy on the map.

The sequence should be:

1. Reach the Marktplatz using the chosen route.
2. Break enough of the organised defence to enter the Rathaus control area.
3. Secure the immediate square.
4. Hold the Rathaus / Marktplatz position while local volunteers secure the approaches and surviving civilians remain behind the safe line.
5. Survive the final organised counterattack.

Once the hold succeeds, scattered enemies outside the meaningful combat area do not need to be hunted across the map.

## Consequence-driven variation

Previous outcomes alter support and pressure without creating entirely different finales.

If the Post route was held:

- southern volunteers can appear behind the player after the route is safe
- the squad has a reliable fallback direction

If the Post route was lost:

- no southern support arrives
- the final approach is more isolated

If the refuge was evacuated well:

- Greta has more local volunteers available to secure cleared junctions
- there is no civilian movement through the active final combat space

If the refuge suffered heavy losses:

- fewer volunteers appear
- dialogue and aftermath are more subdued

If Frieda survived:

- the pre-finale regroup offers stronger recovery

Do not compensate by turning enemies into bullet sponges. Variation should come from routes, support, positioning and pressure.

---

# Tracked consequences

Keep the persistent mission outcome small and readable.

## 1. Post route

`post_route_status`

- HELD
- LOST

## 2. Refuge

`refuge_status`

- SAFE
- EVACUATED
- EVACUATED_WITH_LOSSES

## 3. Frieda

`frieda_status`

- SAFE
- WOUNDED
- LOST

## 4. Civilians

Track the number / proportion successfully evacuated rather than creating a separate branch for every civilian.

## 5. Squad outcome

Use the existing individual health / wounded / downed / dead states to summarise:

- all four returned
- wounded survivors
- deaths / permanent losses

These consequences primarily change support, dialogue and the aftermath. They do not multiply into separate campaign paths.

---

# Success, costly success and failure

## Strong success

- Marktplatz / Rathaus secured
- most civilians evacuated
- Frieda survives
- at least one major route remains usable
- squad losses are limited

## Costly success

The Rathaus is secured, but one or more of the following occurred:

- Post route lost
- refuge evacuated with significant losses
- Frieda wounded or lost
- squad member killed / permanently lost

This still completes the mission. The ending should acknowledge the cost instead of pretending the result was perfect.

## Failure

Hard failure should remain limited to clear gameplay failure states:

- the playable squad is no longer capable of continuing
- the final Rathaus hold is broken before completion

Do not abruptly fail the whole mission because one optional position was lost or because every outcome was not perfect.

---

# Aftermath

Do not end immediately on the last shot.

After the final hold:

1. combat audio drops
2. remaining volunteers move into the square
3. surviving civilians remain visible behind safe routes rather than magically disappearing
4. the four playable characters regroup according to who survived
5. the mission shows a short outcome summary using the tracked consequences

Possible visual / story payoffs:

- if the Post route held, people enter from the southern route
- if it was lost, the approach remains blocked or damaged
- if Frieda survived, she is treating wounded people
- if she was lost, her place at the aid point is empty or another volunteer has taken over
- if a squad member died, the group is visibly incomplete

The final emotional note should be relief mixed with cost.

The mission's meaning is not:

> Four heroes liberated a town.

It is:

> Local people prevented a collapsing fascist force from retaining control of their home, and they paid a price for doing it.

Bad Belzig should move through:

HOME -> DISRUPTION -> PROTECTION -> OVERSTRETCH -> CHOICE -> RESISTANCE -> AFTERMATH

---

# Bad Belzig implementation support matrix

This section identifies what already exists so later coding work stays small.

| Design beat | Existing support | New work likely required |
| --- | --- | --- |
| Opening movement | Current squad movement, ambience, civilians | opening event triggers, dialogue triggers, civilian group setup |
| Civilian following | Existing civilian state / follow system | authored opening route and refuge destinations |
| Post checkpoint | Existing Post defenders, rush wave, sandbags | civilian crossing condition, persistent route state |
| Castle attack | Existing castle defenders and pincer wave | command-position interaction and discovery event |
| St. Marien refuge | Existing civilians, buildings, objective manager | refuge zone, Frieda NPC, evacuation state |
| Dual Act III crisis | Existing objective system can support event-driven / optional goals | linked timers / world-state consequences and route state |
| Reißigerhaus regroup | Health, pickups, quiet objective state | authored recovery / dialogue event |
| Local route choice | Existing navigation and known landmarks | small authored route toggles / interaction triggers where needed |
| Marktplatz finale | Existing market defenders, Rathaus zone and siege wave | objective purpose change, support variation, no map-wide cleanup requirement |
| Consequences | Existing health and civilian state | small mission consequence record and aftermath summary |

## Act checkpoints for retry

Recommended retry points:

1. mission start
2. after the Post route sequence
3. after Burg Eisenhardt is secured
4. after the Act III civilian regroup
5. start of Marktplatz finale

These are recovery checkpoints, not story branches.

---

# 2. Wigan

## Identity

Theme: Solidarity

Central question: How do people build solidarity under pressure?

Mechanical identity: Connect and coordinate.

Desired feeling: We are becoming organised.

## Story premise

The resistance does not begin as one coherent group. Different people around Wigan are dealing with the crisis separately. The player's job gradually becomes connecting those isolated groups and helping them act together.

The town should feel fragmented at the beginning and increasingly coordinated as the player succeeds.

## Act I - Separate groups

The player begins with only part of the eventual fighting group, likely around the existing Tudor start area.

Information suggests other people are organising elsewhere.

The first meaningful objective is not to defeat the enemy. It is to reach people.

Potential destinations use the existing Wigan landmarks:

- Wallgate
- North Western
- bus station
- King Street
- town centre
- pubs and local gathering places

## Act II - Build the network

Each group has an immediate problem before it can help:

- someone is missing
- a route is blocked
- civilians need moving
- a position is threatened
- information needs carrying

Helping the group connects it to the wider resistance.

Different groups can provide practical benefits, for example:

- open or reveal routes
- establish a safe regroup point
- move civilians
- provide local information
- send volunteer NPC support

The important rhythm is:

MOVEMENT -> CONTACT -> PROBLEM -> COOPERATION

## Act III - The town is cut in two

The enemy reacts to the growing resistance and tries to break the network.

A major route or connection is lost.

The player may need to split the squad so one group holds or protects a route while another reconnects isolated people.

The meaning is clear: the resistance has finally come together and is now being deliberately separated.

## Act IV - Coordinated action

The groups the player connected now act at the same time.

Possible simultaneous tasks:

- hold one street
- escort civilians through another
- attack or bypass a key enemy position
- reopen a route
- defend a rally point

The player should feel that the town's resistance has become larger than the playable squad.

## Ending meaning

People who were strangers at the beginning now recognise one another and operate as part of a shared effort.

Wigan should move through:

ISOLATION -> CONNECTION -> ORGANISATION -> COLLECTIVE ACTION

---

# 3. Cable Street

## Identity

Theme: Community

Central question: What can a neighbourhood achieve together?

Mechanical identity: Contribute to a crowd.

Desired feeling: I am one part of something much bigger.

## Historical framing

Cable Street is based on real events and must preserve the sense that the playable characters are participants in a much larger community action. The squad must never appear to have single-handedly won the historical event.

## Act I - Something is coming

Begin with preparation rather than immediate combat.

People gather. Messages travel. Windows open. Materials appear in the street. Residents and volunteers begin organising.

Player actions may include:

- move barricade material
- warn another position
- help residents
- prepare routes
- reinforce doors or street positions
- assist injured or vulnerable people

Purpose: show an ordinary street becoming an organised defensive space.

## Act II - Build the line

Barricades should have meaningful states:

UNBUILT -> BUILDING -> REINFORCED -> DAMAGED -> BREACHED

Civilians and volunteers contribute when conditions allow.

The player's role includes protecting and enabling that work rather than doing everything personally.

## Act III - Pressure

The confrontation becomes uneven and chaotic.

One part of the street may begin failing while another remains stable.

The player receives information through people and environmental cues, not only objective UI:

- another barricade is weakening
- wounded people need help
- a side route is threatened
- more material is needed

The player moves between positions while previously visited areas continue functioning without direct control.

## Act IV - Critical position

One position becomes decisive.

The squad may need to hold or support it long enough for other people elsewhere to succeed.

The key idea is that the player creates opportunities for the wider crowd.

## Non-combat contribution

Cable Street should contain the highest concentration of useful non-combat actions in the game:

- move carts or materials
- build and repair barricades
- escort vulnerable residents
- assist wounded people
- reinforce doors
- relay information
- open alternative routes
- protect volunteers while they work

## Ending meaning

The confrontation subsides. People emerge and take stock. The street is damaged, barricades remain and people understand that the march did not pass through as intended.

Avoid a conventional military victory celebration.

Cable Street should move through:

PREPARATION -> COOPERATION -> PRESSURE -> COLLECTIVE DEFIANCE

---

# 4. Barcelona

## Identity

Theme: Commitment

Central question: How do ordinary people learn to act together in a crisis?

Mechanical identity: Learn to operate as a squad.

Desired feeling: These people are learning to act together.

## Story premise

Barcelona should focus closely on the four existing playable characters. They begin as individuals rather than a polished squad.

The emotional movement is from uncertainty and improvisation to deliberate commitment.

## Act I - Four people

Establish the protagonists separately or in pairs.

They should have different immediate concerns and attitudes:

- one wants to act quickly
- one is frightened or cautious
- one expects the situation to pass
- one is focused on another person or immediate responsibility

Do not turn these into rigid RPG classes. Their personalities should be expressed through actions and reactions.

## Act II - Crisis forces cooperation

Events make the four depend on one another.

Their first shared tasks should be practical rather than heroic:

- reach someone
- open a route
- help people leave a building
- cross a dangerous area
- move an obstruction

This act teaches the player how the characters complement one another.

## Act III - The decision

The group reaches relative safety.

For a short period there is no immediate enemy pressure. The player can regroup and the characters can speak.

They learn what is happening elsewhere and could plausibly leave.

They decide to continue.

This is the defining story beat of Barcelona. Continuing into danger must feel like a choice, not simply the next waypoint.

## Act IV - Fighting together

The danger rises but the group becomes more coordinated.

The gameplay should reflect growing trust through behaviour rather than a visible friendship meter:

- better spacing
- quicker regrouping
- automatic covering of dangerous crossings
- faster help for wounded squadmates
- smoother cooperation interactions

The player's increasing competence should mirror the characters becoming a team.

## Finale

The four commit to one significant local objective, such as:

- hold a position
- secure a building
- help civilians through a dangerous route
- support another resistance group

They do not save Barcelona single-handedly.

The meaningful victory is that the four people who began uncertain have chosen to act together.

Barcelona should move through:

UNCERTAINTY -> COOPERATION -> CHOICE -> COMMITMENT

---

# Cross-mission guardrails

Do not make every mission use the same rescue, defence and escape sequence.

Distinct escalation patterns:

- Bad Belzig becomes more fragmented and difficult to protect.
- Wigan becomes increasingly connected and organised.
- Cable Street becomes more crowded, pressured and collective.
- Barcelona becomes more dangerous while the squad becomes more coordinated.

Bad Belzig now has a detailed playable design. Detailed character biographies, exact dialogue and final objective sequencing remain to be developed for Wigan, Cable Street and Barcelona before their broad story/mechanics implementation begins.
