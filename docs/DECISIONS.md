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
