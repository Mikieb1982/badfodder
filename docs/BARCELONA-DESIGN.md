# IF I CAN SHOOT RABBITS - Barcelona Detailed Mission Design

Status: DESIGN COMPLETE. Not yet implemented.
Last consolidated: 7 October 2026

This document expands the Barcelona story spine in `docs/MISSIONS.md` into a playable mission design.

It preserves the current Catalunya / upper Rambla map, the existing four playable characters, the printer contact, barricade, civilian extraction, eastern defence and final Portal junction sequence.

No gameplay code is authorised by this document. It is an implementation source of truth.

---

# Mission identity

Theme: Commitment

Central question: How do ordinary people learn to act together in a crisis?

Mechanical identity: Learn to operate as a group.

Desired feeling: **These people are learning to rely on one another.**

Classification: Based on real events.

Barcelona must not become a story in which four fictional civilians defeat the July 1936 uprising themselves. The historical event is larger than the playable area and larger than the squad.

The local story is about four neighbours who begin the morning with different priorities, are forced to cooperate by events, reach relative safety, and then deliberately return to help defend one more threatened route.

The mission should move through:

**SEPARATION -> IMPROVISATION -> COOPERATION -> RESPONSIBILITY -> SAFETY -> CHOICE -> COMMITMENT -> AFTERMATH**

The key difference from the other missions is progression inside the playable group:

- Bad Belzig changes the places the player can protect.
- Wigan changes the wider network the player can rely on.
- Cable Street changes the state of a wider crowd and its defences.
- Barcelona changes how well the four playable people work together.

---

# Historical boundary and guardrails

The existing `docs/barcelona-sources.md` remains the historical source-of-truth summary for this mission slice.

## Supported historical foundation

The mission may state that:

- on 19 July 1936 rebel army units attempted to seize positions in Barcelona
- workers, civilians, police and forces loyal to the Republic resisted the uprising
- fighting reached Plaça de Catalunya and the upper Rambla area
- Hotel Colón became a rebel stronghold around the square
- arms were obtained by resistance forces elsewhere in the city, including at Drassanes

## Gameplay adaptations that must remain clearly fictional / approximate

The following are not claims of documented exact events:

- Joan, Mercè, Antoni and Isabel
- their personal relationships and movements
- the printer contact
- the distribution of rifles at this particular printer
- the specific patrol encountered by the four characters
- the exact barricade footprint and build sequence
- the families beside Santa Anna
- the exact eastern-column timing and route used by mission spawns
- the exact Portal junction firefight
- attack timings, material piles and local resistance NPC positions
- compressed distances, building footprints and street relationships used for play

The current map is a compressed gameplay interpretation, not a cadastral or exact battle reconstruction.

Do not add later political banners or imagery associated with subsequent occupation of Hotel Colón to the morning of 19 July.

The ending must state or show that fighting continues across Barcelona. The four characters secure only their local position.

---

# Existing playable characters

Keep the current roster, occupations, relationships and lightweight traits.

| Character | Existing identity | Story attitude at the start | Practical contribution | Relationship / dramatic use |
| --- | --- | --- | --- | --- |
| Joan | Tram worker, LOCAL | Wants to understand what is happening and keep the familiar route around the Rambla usable | Reads streets and movement well; identifies exposed/open approaches and sensible local routes | Neighbour of Mercè. He acts quickly but must learn that knowing the streets does not mean deciding for everyone. |
| Mercè | Textile worker, MEDIC | Cautious about escalating the situation and focused first on injured people and families | Best at stabilising and assisting wounded people | Neighbour of Joan. Her caution is not cowardice; she repeatedly forces the group to notice people rather than positions. |
| Antoni | Mechanic, MECHANIC | Practical and sceptical. He will help with a concrete problem before he accepts a larger political or military role | Best at barricade repair, moving/using material and practical interactions | Friend of Isabel. He becomes committed through work rather than speeches. |
| Isabel | Printer, RUNNER | Knows the local contact and understands that information is moving quickly; initially focused on the printer and people connected to it | Fast courier and the natural link to the fictional printer contact | Friend of Antoni. She is the quickest to move between people but must learn not to outrun the group. |

The characters should disagree in short, practical ways without becoming caricatures.

Do not create traditional RPG classes. Existing traits remain small modifiers. The main progression is coordination, not character levelling.

---

# Relationship structure

The existing relationship pairs become story-relevant:

## Joan + Mercè: neighbours

They know each other well enough to argue directly.

Joan tends to think in routes, movement and immediate action.

Mercè tends to ask who is being left behind.

Their relationship helps the player understand that tactical success and human success are not always identical.

## Antoni + Isabel: friends

Isabel has information and urgency.

Antoni wants to know what useful thing can actually be done.

Their relationship gives the second pair a practical rhythm: Isabel finds the problem; Antoni helps make a solution workable.

## Four-person group

The two pairs know one another as neighbours / local acquaintances, but they do not begin as a trained four-person squad.

The mission is about these two existing relationships becoming one functioning group.

---

# Hidden cooperation state

Barcelona should use a small mission-local cooperation state. It is not displayed as a friendship meter.

Recommended states:

1. `PAIRS`
2. `IMPROVISED`
3. `COOPERATING`
4. `COMMITTED`

The state changes only at authored story beats. It does not increase because the player farms kills.

## What cooperation changes

Cooperation should improve coordination rather than weapon damage.

Possible effects:

- followers keep more useful spacing
- paired characters regroup with less follower lag
- nearby allies automatically face / cover the exposed direction during contextual actions
- a character helping a wounded squadmate is less likely to be left unsupported
- two-person movement through dangerous crossings becomes smoother
- carrying / stabilising wounded characters receives clearer automatic partner support
- material handoff / barricade work is less cumbersome
- after commitment, the four naturally reform after split tasks rather than remaining scattered

Do NOT use cooperation to grant:

- arbitrary damage bonuses
- large accuracy buffs
- extra health
- supernatural awareness
- instant revives

The player should feel that four civilians have learned to coordinate, not that they have transformed into elite infantry.

---

# Practical cooperation actions

The mission should teach a small reusable vocabulary of cooperative actions.

Not every action requires a new button.

## 1. Cover a crossing

One pair or nearby character holds / faces the dangerous direction while another moves across an exposed section.

Early mission:

- player must position the covering character deliberately

Later mission:

- nearby allies recognise the crossing action and take sensible covering orientation automatically

## 2. Assist wounded

Mercè is quickest at medical assistance, but any character can help.

A second nearby character should naturally protect the person doing the treatment once cooperation has developed.

## 3. Carry / move a casualty

Use the existing wounded / carry philosophy where available.

A badly wounded person creates a movement problem, not simply a health-bar problem.

Two characters working together should move a casualty more safely than one person improvising alone.

## 4. Barricade teamwork

Antoni has the practical advantage, but material movement remains shared labour.

One character can carry while another covers. Later, nearby characters should make the interaction feel less sequential and awkward.

## 5. Regroup

After a split task, an explicit regroup command / destination should cause the group to reform cleanly around the selected leader.

This is particularly important after the civilian extraction and before the final route.

---

# Important locations and story purpose

| Location | Story purpose |
| --- | --- |
| Tallers / southern Rambla start | Ordinary-life opening and the initial separation into two pairs. |
| Catalunya approach / junction | First point where the two pairs encounter the wider crisis and must decide what to do next. |
| Impremta / printer contact | Isabel's personal anchor and the fictional local source of rifles / information. |
| Pelai / first patrol area | First forced cooperation under danger. The group cannot simply move independently anymore. |
| Rambla barricade | First shared job and first serious defensive action. |
| Santa Anna residents | Responsibility phase: the group uses what it has learned to help people rather than merely hold ground. |
| Western shelter / safe zone | Commitment point. The four have achieved relative safety and could plausibly remain there. |
| Portal de l'Àngel / eastern crossing | The route they deliberately return to help defend. |
| Portal junction / advance zone | Final local objective and proof that the group now acts deliberately together. |
| Plaça de Catalunya / Hotel Colón background | Historical context and visual pressure beyond the playable local story, not a final boss arena. |

---

# Opening - Two pairs, one street

## Core purpose

The opening should establish the four as people before it treats them as a squad.

The ideal implementation uses two nearby pairs within the current southern map area rather than four characters already moving as one military formation.

### Pair A

Joan + Mercè begin closer to the Rambla / Tallers approach.

Immediate concern:

- determine whether the route north is usable
- check on people moving away from the square

### Pair B

Antoni + Isabel begin closer to the printer side of the same southern area.

Immediate concern:

- Isabel wants to reach the printer/contact
- Antoni is helping secure / close the practical workplace area before leaving

The pairs are close enough that this does not become two separate levels.

## Player actions

1. Move Joan and Mercè a short distance toward the junction.
2. Encounter the first signs of danger: distant shots, civilians moving south, shutters / doors closing.
3. Briefly control or select Antoni and Isabel near the printer route.
4. Bring both pairs toward the Catalunya approach.
5. Regroup all four when danger at the junction becomes clear.

## Existing systems to reuse

- individual / split selection
- current movement and pathfinding
- mission ambience
- existing opening junction zone
- current printer/contact zone

## New work likely required

- authored paired start state
- short selection / regroup tutorialisation without modal instructions
- movement dialogue triggers
- cooperation state initialised as `PAIRS`

## Story beats

Not final dialogue, but intended meaning:

- Joan assumes the tram / street knowledge will be enough to get through.
- Mercè notices frightened / injured people moving away from the square.
- Isabel knows there may be useful information or weapons at the printer.
- Antoni asks the practical question: if they get weapons, what exactly are they going to do with them?

No one gives a heroic speech.

---

# Act I - Forced cooperation

## Objective sequence

Reuse the current junction, printer and patrol areas, but change the dramatic meaning.

### Step 1: Reach the Catalunya approach

The four arrive together and see that the situation is larger and more dangerous than expected.

The junction is not captured. It is observed / crossed.

### Step 2: Reach the printer contact

Isabel leads the group toward the existing contact.

The printer contact is a fictional local resistance contact. The game must not imply that this precise arms distribution is documented history.

The first rifles feel improvised and scarce.

### Step 3: Stop / bypass the patrol

The existing patrol becomes the first situation where four-person cooperation matters.

The patrol is blocking movement back toward the Rambla approach and threatening the local contact area.

The player can use cover and positioning rather than being pushed into a frontal shootout.

## First cooperation transition

When the four regroup after dealing with the patrol:

`cooperation_state = IMPROVISED`

This should unlock only small behavioural improvements:

- better pair spacing
- clearer regrouping
- nearby partner automatically facing outward during simple interactions

The four have not become soldiers. They have simply learned that moving independently is dangerous.

## Quiet beat 1

After the patrol, reduce pressure briefly.

Allow:

- ammunition check
- treatment if someone was hurt
- brief discussion about defenders forming further south on the Rambla
- the printer contact explaining that people are improvising barricades and trying to keep routes open

The player then moves toward the existing barricade.

---

# Act II - Build something together

## Objective: Reinforce the Rambla barricade

The current material-carrying and barricade mechanics become the first practical shared task.

## Why it matters

The barricade protects the approach behind it and buys time for residents / resistance fighters moving through the area.

The group is not ordered to defend it by a commander.

They arrive, see people working, and choose to contribute because the route behind the barricade matters.

## Player actions

1. Reach the existing barricade area.
2. Collect the existing material loads.
3. Reinforce the barricade.
4. Position the four around the approach.
5. Help the local resistance withstand the first pressure wave.

## Character expression

Antoni's MECHANIC trait can make reinforcement slightly faster or more efficient.

Isabel's RUNNER trait makes carrying one load quickly useful.

Joan's LOCAL trait helps indicate sensible covered movement around the approach.

Mercè's MEDIC role matters if defenders or squad members are wounded.

No one is mandatory. If Antoni is down, the barricade can still be built more slowly.

## Cooperation during the hold

Early in the fight, the player still has to manage positions deliberately.

As the four successfully perform useful shared actions, authored events reinforce the sense of coordination:

- one character covers while another repairs
- a nearby character turns toward an incoming threat while someone treats a casualty
- the group naturally tightens around the fallback route when pressure rises

These are behaviour changes, not hidden combat buffs.

## Existing systems to reuse

- current barricade state / integrity
- material carrying
- two-load build requirement
- current assault groups
- resistance allies
- cover / suppression
- casualty / stabilisation systems
- ammunition scarcity and printer resupply

---

# Act III - Responsibility

## Transition

After the first column withdraws, keep the current recovery phase but give it more story purpose.

The group has now proved it can hold a position together.

The next question is what they use that capability for.

## Quiet beat 2 - First recovery

Use the existing recovery window.

Allow:

- reload / limited resupply
- treat wounded
- repair the barricade
- short reactions to what just happened

Mercè or another nearby person learns that families are sheltering near Santa Anna and their route is becoming exposed.

This changes the mission from defence to responsibility.

## Objective: Find the Santa Anna residents

The player leaves the first defensive position rather than simply waiting for another wave.

This movement matters because the squad is choosing to apply what it has learned somewhere else.

## Objective: Get them to the western shelter

Reuse the current civilian gather / evacuation mechanics.

### Cooperation rules

- civilians follow the group rather than becoming individually micromanaged units
- Joan can help indicate the covered route
- Mercè handles wounded / frightened civilians most efficiently
- Isabel can scout a short distance ahead, but straying too far should not be rewarded
- Antoni can help with any obstruction / practical interaction added later

### Pressure

Reuse the existing rescue-pressure patrol so the extraction is not a quiet escort walk.

The challenge should be:

- keep civilians moving
- decide when to stop and cover
- avoid spreading the four so far that the civilians lose protection

Do not require killing every enemy in the area if the residents can be moved safely.

## Second cooperation transition

When the families reach the shelter and the four regroup:

`cooperation_state = COOPERATING`

Behavioural changes can now include:

- more reliable elastic spacing
- automatic cover orientation while another character performs aid / interaction
- faster clean regroup after split movement
- better partner support during casualty carry / stabilise actions

Again: no damage or health increase.

---

# Act IV - The commitment point

This is the defining moment of the Barcelona story.

## Location

Use the existing western shelter / safe zone after the civilian evacuation.

## Situation

For the first time since the mission began:

- the four are together
- civilians are behind cover
- immediate pressure has dropped
- the group has a plausible reason to stop

They have already done something meaningful.

They could remain with the families and wounded.

Then information arrives that another column is moving toward the eastern / Portal de l'Àngel route and local defenders there are under pressure.

## How the choice is expressed

Do not immediately place a giant NEXT arrow and drag the player into the next fight.

Give the moment room.

Recommended sequence:

1. objective text temporarily becomes `REGROUP AT THE SHELTER`
2. player can heal, resupply if appropriate and move around the safe area
3. short character exchange acknowledges that they are currently safe
4. a messenger / distant call reports the eastern route problem
5. the eastern route becomes visible on the map, but the game does not auto-move anyone
6. the player must deliberately move the four out of the shelter and cross a commitment trigger back toward Santa Anna / Portal de l'Àngel

The commitment trigger is the player's action.

No dialogue-choice menu is required.

The game does not need a full alternate campaign ending for staying in the shelter. The important point is that the mission waits for the player to leave safety rather than presenting continued combat as automatic.

When the player crosses the return trigger with the surviving group:

`cooperation_state = COMMITTED`

## Character meaning

The four do not need identical motivations.

- Joan goes because the route is part of the neighbourhood he understands and people are still moving through it.
- Mercè goes because there will be wounded / trapped people if the route collapses.
- Antoni goes because the defenders need practical help and he has already seen what useful work can do.
- Isabel goes because information and people still need to move between positions.

Their reasons remain human and specific.

---

# Act V - Return to danger

## Objective: Defend the eastern route

Reuse the current second-route and hold-east sequence around Santa Anna / Portal de l'Àngel.

The difference is mechanical presentation.

This is where the player should feel that the group now works together more naturally than at the start.

## Committed cooperation behaviour

### Elastic group spacing

The four should keep practical spacing through streets and narrow approaches without rigid parade formation.

### Automatic covering behaviour

When one character:

- treats a casualty
- interacts with cover / material
- crosses an exposed point

nearby available characters should orient or take sensible nearby cover rather than bunching around the interaction.

### Regroup after separation

If the player briefly splits characters to cover two corners, a regroup command / movement should reform the group smoothly.

### Casualty response

If one character goes down, the others should not become autonomous heroes, but contextual help should be easier to execute:

- nearest suitable ally can be suggested / selected for stabilisation
- another nearby character can cover
- carrying a badly wounded friend visibly slows and reshapes the group

A casualty should reinforce the story of dependence.

## Existing systems to reuse

- eastern zone
- eastern assault groups
- garrison / corner cover
- shared enemy commander / suppression systems
- casualty states
- existing resistance repositioning

## Pressure design

The eastern fight should be tactically harder than the first barricade, but not through bullet-sponge enemies.

Use:

- approach from different directions
- suppression
- narrower cover decisions
- need to protect the fallback / civilian-safe route
- wounded-person management

The player's improved coordination offsets the increased complexity.

That is the mechanical expression of character growth.

---

# Finale - Secure the Portal junction

## Existing anchor

Reuse the current `counterattack` / `advance` zone and the existing resistance rearguard logic.

## Story purpose

The group has helped stop the immediate eastern push. Local resistance fighters begin moving forward.

The four do not launch a heroic conquest of Plaça de Catalunya.

Their final job is limited:

**move with the local defenders, secure the nearby Portal junction and keep the local route usable.**

The larger battle continues beyond the mission boundary.

## Player actions

1. Regroup after the eastern hold.
2. Move with the existing resistance NPCs toward the advance zone.
3. Clear / force back the immediate rearguard threatening the junction.
4. Reach the junction with at least one capable playable character.
5. Hold long enough for the local resistance to occupy the approaches.
6. End the mission without requiring a map-wide enemy hunt.

## Cooperation payoff

The finale should make earlier learning visible:

- four-person movement is cleaner
- allies cover interactions
- wounded friends change how the group moves
- resistance NPCs are part of the advance rather than decorative followers
- the player can focus on the local objective instead of wrestling with follower behaviour

The four are still vulnerable civilians with limited ammunition.

Their competence comes from coordination and experience accumulated during this one day.

---

# Tracked consequences

Keep the outcome model small.

## 1. First Rambla defence

`rambla_defence_status`

- HELD
- HELD_AFTER_BREACH
- LOST

A temporary breach may be recoverable. If the first position is lost but the group escapes with civilians / survivors, the story can continue with reduced support rather than always forcing a restart, provided the implementation can do so without destabilising the mission.

If the current runtime requires the local route to remain viable, preserve hard-failure rules until a safe recovery path is implemented.

## 2. Residents

`resident_outcome`

- ALL_SAFE
- SOME_SAFE
- LOST

Track proportion / count rather than branching every civilian individually.

## 3. Wounded assistance

Track a small count of successful stabilise / assist actions involving civilians, resistance NPCs or squadmates.

This is useful for aftermath presentation, not a score multiplier.

## 4. Squad outcome

Use existing character health / survival states:

- all four returned
- wounded survivors
- permanent losses

Because the story is about the four learning to rely on each other, squad loss should materially change the ending presentation.

## 5. Final local position

`portal_junction_status`

- SECURED
- FAILED

This is the local mission completion condition.

## 6. Cooperation state

Do not present a score.

Internally the final stage reached can be recorded for testing / presentation:

- PAIRS
- IMPROVISED
- COOPERATING
- COMMITTED

A normal full completion should reach COMMITTED.

---

# Success, costly success and failure

## Strong success

- residents reach safety
- first defence remains viable
- the four characters survive or suffer only recoverable wounds
- final Portal junction secured
- the group reaches COMMITTED cooperation state

## Costly success

The Portal junction is secured, but one or more costs remain:

- civilian losses
- severe squad wounds
- one or more playable deaths
- first barricade lost / heavily breached
- limited local resistance support remaining

The mission still completes.

The ending should not pretend the result was clean.

## Failure

Hard failure should be limited to local gameplay failure:

- the playable group becomes unable to continue
- a required fallback / escape route is lost beyond the existing recovery window
- the final local junction cannot be secured and the group is forced back

Failure wording must describe the four characters' local action failing.

It must never claim that the historical uprising succeeded because of the player's failure.

---

# Aftermath

Do not end on the final shot.

## Immediate transition

1. gunfire around the playable junction decreases
2. local resistance NPCs occupy the immediate route
3. surviving characters regroup
4. distant fighting remains audible / visible toward the square
5. the game reminds the player that fighting continues elsewhere in Barcelona

## Character payoff

The group should visually reflect what happened.

If all four survive:

- they stand / move together naturally, but exhausted
- there is no triumphant hero pose

If one is badly wounded:

- another character supports or remains near them

If someone died:

- the group is visibly incomplete
- surviving relationship partner's position / short reaction acknowledges the loss

If residents were saved:

- one or two familiar civilians / messages from the shelter can be present in the aftermath or summary

If residents suffered losses:

- the outcome text acknowledges that the route was secured at a cost

## Historical final note

The local position is secure.

Across Barcelona, workers, civilians, police and loyal forces continue resisting the uprising.

Do not state that Joan, Mercè, Antoni and Isabel defeated the uprising.

---

# Barcelona implementation support matrix

| Design beat | Existing support | New work likely required |
| --- | --- | --- |
| Paired opening | Current split / individual selection, southern spawn area, opening junction | paired start positions/state, short pair-specific triggers, clean four-person regroup |
| Printer contact | Existing contact zone, arming/resupply logic | story timing / pair integration only |
| Patrol | Existing patrol defenders and combat systems | first cooperation transition and contextual cover behaviour |
| Rambla barricade | Existing barrier, material piles, resistance NPCs, assault groups | cooperation-aware work/cover presentation, consequence state |
| Recovery | Existing timed recovery and ammo support | quieter story state and wounded-person interactions |
| Santa Anna residents | Existing spawn/gather/evacuate logic and rescue pressure | cooperation-aware escort presentation and resident consequence state |
| Commitment point | Existing western safe zone after evacuation | new shelter regroup state, messenger/event, deliberate return trigger |
| Eastern defence | Existing eastern zone/groups and resistance repositioning | COMMITTED cooperation behaviour, automatic cover/regroup helpers |
| Portal finale | Existing advance zone, rearguard and resistance advance | consequence-aware local finale and aftermath transition |
| Cooperation progression | Existing character traits, selection, follower movement | small mission cooperation-state controller plus reusable coordination hooks |
| Outcomes | Existing health, civilian and objective states | lightweight Barcelona consequence record and end summary |

---

# Recommended retry checkpoints

1. mission start / paired opening
2. after printer contact and patrol
3. after first Rambla defence
4. after residents reach the western shelter, before commitment
5. start of eastern defence
6. start of Portal junction finale

The shelter checkpoint is especially important. It lets the player replay the commitment / final act without repeating the entire first half.

---

# What should remain unchanged during implementation

Unless a specific implementation task proves otherwise:

- keep the current four named protagonists
- keep the current historical date and mission label
- keep the current upper Rambla / Catalunya map footprint
- keep Hotel Colón as historical background context rather than a boss objective
- keep the printer contact explicitly fictional
- keep the current first barricade, Santa Anna evacuation, eastern route and Portal junction as major anchors
- keep ammunition meaningful
- keep firearms vulnerable and lethal rather than bullet-sponge combat
- keep local resistance NPCs active in the final stages
- do not turn cooperation into an RPG skill tree
- do not make co-op required; the current mission remains single-player first
- do not portray the four characters as defeating the city-wide uprising by themselves

---

# Design success criteria

A future implementation is faithful to this design if a player can answer these questions after playing:

1. Who were these four people before they became an improvised fighting group?
2. Why did they first start helping one another?
3. What practical thing did each character contribute?
4. Why did the first barricade matter?
5. Who did they help after the first fight?
6. Did the shelter genuinely feel safer than the street outside?
7. Did returning to Portal de l'Àngel feel deliberate?
8. Did the four move and support one another more naturally by the final act than in the opening?
9. Did casualties visibly affect the group?
10. Was it clear that the four secured one local position while a much larger historical struggle continued?

If the answer to question 8 is no, the mission has not delivered its mechanical identity even if all objectives technically work.

---

# Final Barcelona shape

**PAIRS**

Joan + Mercè and Antoni + Isabel begin with separate immediate concerns.

↓

**IMPROVISATION**

The crisis at the junction / printer / patrol forces the four to act together.

↓

**SHARED WORK**

They build and defend the Rambla barricade with local resistance fighters.

↓

**RESPONSIBILITY**

They leave the relative simplicity of the defensive line to help families near Santa Anna.

↓

**SAFETY**

They reach the western shelter and have a plausible place to stop.

↓

**CHOICE**

News arrives of another threatened route. The player deliberately moves the four back out of safety.

↓

**COMMITMENT**

The four return to the eastern crossing and now operate as a coordinated group.

↓

**LOCAL VICTORY**

They help secure the Portal junction alongside a wider resistance.

↓

**AFTERMATH**

The local route is held. The four have changed. The larger fight continues.
