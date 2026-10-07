# IF I CAN SHOOT RABBITS - Decision Log

This file records deliberate design decisions so later work does not accidentally reverse them.

Add new decisions with a date and a short reason. If a decision changes, do not silently delete the old entry. Mark it superseded and record the replacement.

---

## 7 October 2026 - Current mission scope

Decision:
Current development focuses on four missions only:

1. Bad Belzig
2. Wigan
3. Cable Street
4. Barcelona

Reason:
Finish and deepen the existing game before expanding it with more locations.

Status: ACTIVE

---

## 7 October 2026 - Missions are separate stories

Decision:
Each mission tells its own self-contained story with its own people, conflict and outcome.

The shared thread is ordinary people resisting fascism, not a continuing cast or single campaign plot.

Reason:
This allows each place to have its own identity while keeping the game thematically coherent.

Status: ACTIVE

---

## 7 October 2026 - One substantial story per location

Decision:
Each mission should contain one complete story divided into acts rather than several small disconnected episodes.

Reason:
This gives enough space to establish people, develop the conflict and give the ending meaning.

Status: ACTIVE

---

## 7 October 2026 - Story must change gameplay

Decision:
Use the pattern:

STORY -> ACTION -> CONSEQUENCE

Do not rely on dialogue around unchanged objectives as the main method of storytelling.

Reason:
The player should understand why an action matters and see what changes because of it.

Status: ACTIVE

---

## 7 October 2026 - Characters remain ordinary people

Decision:
Playable characters may become more competent, but they should not become conventional action heroes.

Reason:
The game's identity depends on civilians and local volunteers acting under extraordinary pressure.

Status: ACTIVE

---

## 7 October 2026 - Combat is usually a means, not the final purpose

Decision:
Combat should often create space or time for another purpose such as protecting people, opening routes, reaching positions, supporting others or withdrawing safely.

Reason:
Avoid reducing every mission to enemy elimination.

Status: ACTIVE

---

## 7 October 2026 - Four distinct mission identities

Decision:

- Bad Belzig = HOME
- Wigan = SOLIDARITY
- Cable Street = COMMUNITY
- Barcelona = COMMITMENT

Reason:
The four missions need distinct dramatic and mechanical identities.

Status: ACTIVE

---

## 7 October 2026 - Bad Belzig mechanical identity

Decision:
Bad Belzig should focus on protecting interconnected places and adapting when not everything can be saved.

Core feeling:
I cannot protect everything.

Reason:
The mission is about the cost of defending a familiar home.

Status: ACTIVE

---

## 7 October 2026 - Wigan mechanical identity

Decision:
Wigan should focus on finding separated groups, connecting them and coordinating a larger local resistance.

Core feeling:
We are becoming organised.

Reason:
The mission should express solidarity through mechanics rather than only dialogue.

Status: ACTIVE

---

## 7 October 2026 - Cable Street mechanical identity

Decision:
Cable Street should focus on contributing to a much larger neighbourhood effort through barricades, crowd support, non-combat work and shifting pressure.

Core feeling:
I am one part of something much bigger.

Reason:
The playable squad must not be represented as single-handedly responsible for the historical outcome.

Status: ACTIVE

---

## 7 October 2026 - Barcelona mechanical identity

Decision:
Barcelona should focus on four individuals learning to cooperate and choosing to continue despite having an opportunity to leave danger.

Core feeling:
These people are learning to act together.

Reason:
The mission's defining story is commitment and growing trust.

Status: ACTIVE

---

## 7 October 2026 - Mission labels

Decision:
Use only two categories:

- Based on real events
- Fictional mission

Reason:
Keep historical framing clear and simple.

Status: ACTIVE

---

## 7 October 2026 - Limited consequence tracking

Decision:
Track a small number of meaningful mission outcomes rather than building a huge branching campaign.

Typical consequences:

- named person survived
- civilians evacuated
- position held
- route lost or preserved
- squad member wounded
- optional objective completed

Reason:
Provide meaningful player influence without uncontrolled scope growth.

Status: ACTIVE

---

## 7 October 2026 - Public GitHub projects are references, not identity

Decision:
Study permissively licensed public repositories for focused mechanics and algorithms, but keep the game's architecture, art, missions, characters, maps, UI and narrative its own.

Preferred process:

1. Study the mechanic.
2. Reimplement the smallest useful version in the existing engine where practical.
3. Import code only with a clear benefit.
4. Preserve licence and attribution requirements where code is copied or adapted.

Reason:
Gain proven engineering ideas without turning the game into a collection of third-party systems.

Status: ACTIVE

---

## 7 October 2026 - Do not add another Utility AI framework

Decision:
Extend the existing adaptive/utility systems instead of importing another Utility AI library.

Reason:
The game already has this architecture and duplication would increase complexity without adding identity.

Status: ACTIVE

---

## 7 October 2026 - Strong public-mechanics research candidates

Decision:
The strongest concepts worth evaluating are:

1. Elastic formation movement
2. Local arrive/separation/obstacle steering
3. Flow-field movement for groups sharing destinations
4. Reachability checks when barricades or routes change
5. Contextual NPC decisions implemented through existing systems

Reason:
These concepts directly support the four mission identities and can be integrated without changing the game's core architecture.

Status: CANDIDATE SET

---

## 7 October 2026 - Design before broad implementation

Decision:
Complete detailed playable designs for the four missions before implementing the full story/mechanics expansion.

Order:

1. Bad Belzig
2. Wigan
3. Cable Street
4. Barcelona

Afterwards, identify which mechanics genuinely belong in shared engine systems.

Reason:
This reduces duplicated code, prevents premature architecture changes and protects good ideas from being lost in implementation churn.

Status: ACTIVE

---

## 7 October 2026 - Bad Belzig detailed playable structure

Decision:
Retain the existing four playable characters and the current three major combat anchors, but change their purpose through story and consequence.

The playable structure is:

1. Bahnhofstraße opening with civilians moving toward refuge.
2. Postdistanzsäule hold while the civilian route crosses.
3. Burg Eisenhardt assault to break the enemy command / staging point.
4. Act III split crisis between St. Marien refuge and the Post route.
5. Reißigerhaus regroup and recovery.
6. Local-knowledge route choice toward the centre.
7. Marktplatz / Rathaus hold as the final organised resistance position.
8. Personal aftermath based on what survived.

Reason:
This preserves the current mission geography and working combat systems while converting the mission from three disconnected capture points into one story about protecting home.

Status: ACTIVE

---

## 7 October 2026 - Bad Belzig civilian network

Decision:
Use St. Marien as the main fictional civilian refuge and the Reißigerhaus area as a fallback regroup / first-aid point.

The Postdistanzsäule controls the direct southern civilian route. Losing it does not fail the mission. It forces a slower fallback route and changes later support.

Reason:
The defensive positions need a visible human purpose and losing ground should create consequences rather than automatic failure.

Status: ACTIVE

---

## 7 October 2026 - Bad Belzig Act III is a priority crisis

Decision:
Act III presents two developing problems at once:

- protect / evacuate St. Marien
- keep the Post route open

The player is not given a menu choice. The order of movement determines what receives attention first.

Single-player must be able to complete the mission without mandatory simultaneous control. Co-op may make squad splitting useful, but it is never required.

Reason:
This expresses the mission's central idea, that the group cannot protect everything perfectly, through play rather than dialogue.

Status: ACTIVE

---

## 7 October 2026 - Bad Belzig outcome model

Decision:
Track a small set of consequences:

- Post route: HELD / LOST
- refuge: SAFE / EVACUATED / EVACUATED_WITH_LOSSES
- Frieda: SAFE / WOUNDED / LOST
- civilian evacuation result
- squad health / survival result

Securing Rathaus completes the mission even if earlier outcomes were costly. Earlier losses change support and the aftermath rather than creating a large branching campaign.

Reason:
Allow imperfect victories and meaningful cost without making the mission structure unmanageable.

Status: ACTIVE

---

## 7 October 2026 - Bad Belzig supporting civilian

Decision:
Introduce Frieda Lehmann as a fictional local first-aid volunteer at St. Marien.

She is a non-combatant story anchor. Her state can alter recovery and the final scene.

Reason:
The civilian side of the mission needs at least one recognisable person so losses and successful protection are not represented only by counters.

Status: ACTIVE

---

## 7 October 2026 - Wigan detailed playable structure

Decision:
Retain Arthur, Elsie, Tom and George and preserve the existing Tudor House, Grand Arcade and Wallgate combat anchors.

The playable structure is:

1. Break the Tudor / New Market Street position and connect the first local group.
2. Reach the Bus Station and Market Place groups in flexible order.
3. Establish Grand Arcade as the central rally point and survive the existing pincer attack.
4. Respond when the enemy cuts the newly formed network.
5. Optionally connect King Street and its existing supply cache while reopening the centre.
6. Use the connected groups in supporting roles during a coordinated advance.
7. Break the Wallgate / North Western barrier and reconnect the isolated railway group.
8. End with an aftermath showing formerly separated groups in physical contact.

Reason:
This converts the current three-point combat progression into a story about building solidarity while preserving the existing town map and successful combat work.

Status: ACTIVE

---

## 7 October 2026 - Wigan connections provide capabilities

Decision:
Connected groups do not award abstract solidarity points.

Their practical contributions are:

- Tudor / New Market Street: first rally and rear route
- Bus Station: civilian movement and route support
- Market Place: lookouts and attack-direction information
- King Street: existing supplies and limited volunteer support
- Railway group: final connection and mission payoff

Reason:
The player should experience solidarity through useful people doing useful things, not through a visible faction meter.

Status: ACTIVE

---

## 7 October 2026 - Wigan network disruption and split squad

Decision:
After the Grand Arcade connection, the enemy attempts to cut the local network. The player can reopen the route and optionally connect King Street.

Split-squad play is encouraged where useful but is never mandatory. A single-player squad must be able to solve the same problems sequentially without an unfair hidden timer.

Losing or disrupting a connection changes support rather than automatically failing the mission.

Reason:
Wigan's dramatic question is whether separated people can reconnect and remain coordinated. The setback should attack that network directly.

Status: ACTIVE

---

## 7 October 2026 - Wigan final operation

Decision:
The Wallgate / North Western finale is a coordinated local operation to reopen the final physical break in the resistance network and reach the isolated railway workers.

Connected groups automatically perform supporting jobs while the playable squad remains the mobile element. The player does not gain RTS-style control over a local army.

Earlier group connections alter information, civilian routing, supplies and limited support rather than enemy hit points.

Reason:
The ending should pay off the mission's solidarity theme and show that the four playable characters enabled collective action rather than winning the town alone.

Status: ACTIVE
