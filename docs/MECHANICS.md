# IF I CAN SHOOT RABBITS - Mechanics Design

Status: Design working document
Last consolidated: 7 October 2026

This document separates mechanics we already have, mechanics we have approved conceptually, and public references worth studying. Public references are inspiration and algorithm sources, not a plan to replace the existing engine.

## Status labels

- IDEA: interesting, not yet judged
- CANDIDATE: fits the game and deserves design work
- APPROVED: accepted direction, ready to break into implementation tasks
- IMPLEMENTED: present in the game and verified

## Shared mechanics already present

The current codebase already contains substantial systems that should be extended rather than replaced where practical:

- shared navigation and pathfinding
- cover and suppression
- civilian states and evacuation behaviour
- building and garrison interactions
- adaptive director and utility-style decision making
- enemy roles and tactical behaviour
- mission objectives and mission runtimes
- Cable Street barricade logic
- Cable Street crowd and interaction systems
- deterministic or bounded simulation support

Relevant existing files include `navigation.js`, `adaptive-director.js`, `adaptive-opportunities.js`, `combat-tactics.js`, civilian runtime code, `barricade-rules.js`, `cable-street-runtime.js`, `cable-street-interactions.js`, `cable-street-crowd.js`, mission objective code and mission-specific runtimes.

Before adding a new dependency or parallel system, check whether one of these can support the required behaviour.

## Shared design mechanics

| Mechanic | Purpose | Status |
| --- | --- | --- |
| Squad movement and selection | Core control of playable characters | IMPLEMENTED |
| Cover and suppression | Tactical combat without bullet-sponge enemies | IMPLEMENTED |
| FIT / WOUNDED / BADLY WOUNDED / DOWN / DEAD | Make individual characters matter | IMPLEMENTED / evolving |
| Stabilise and carry | Create difficult choices during retreats | APPROVED direction |
| Civilian behaviour | Make places feel inhabited and vulnerable | IMPLEMENTED / evolving |
| Garrisoning | Turn buildings into tactical and narrative spaces | IMPLEMENTED / evolving |
| Contextual interaction | Search, help, sabotage, build, open and assist | IMPLEMENTED / evolving |
| Dynamic objectives | Let events change the player's purpose | IMPLEMENTED / evolving |
| Local consequences | Let failure or success alter later play | APPROVED |
| Quiet phases | Regroup, talk, treat wounds and prepare | APPROVED |
| Friendly resistance NPCs | Show that the squad is part of something larger | APPROVED / partial |
| Limited resources | Encourage restraint and improvisation | APPROVED direction |

## Mission-specific mechanics

### Bad Belzig - protect and adapt

Core loop:

OBSERVE THREAT -> PROTECT ROUTE -> HOLD POSITION -> REACT TO BREACH -> REPOSITION

Approved concepts:

#### Local defence network
Important positions are connected. A checkpoint matters because it protects a route, refuge or later position. Losing one should alter pressure elsewhere.

#### Checkpoint and sandbag behaviour
Entering a defended position should place the squad into useful cover without trapping them. Leaving must be deliberate and reliable. Re-entering the zone may return characters to prepared positions.

#### Civilian flow
Civilians should use protected routes when safe. The player influences movement by clearing streets, holding positions and opening safe destinations rather than micromanaging every civilian.

#### Local knowledge
Characters may reveal shortcuts, useful buildings, alternative routes or supplies because they know the town. Avoid arbitrary RPG bonuses.

Escalation principle: the town becomes harder to protect, forcing the player to choose what can still be saved.

### Wigan - connect and coordinate

Core loop:

FIND GROUP -> SOLVE IMMEDIATE PROBLEM -> CONNECT GROUP -> EXPAND NETWORK

Approved concepts:

#### Resistance groups
Separate local groups become connected through player actions and then provide practical help such as routes, information, rally points, civilian movement or volunteers.

#### Split squad
Wigan is the strongest mission for deliberate two-and-two or small-group play. Splitting and regrouping must remain easy to understand and recover from.

#### Communication network
Information quality improves as groups connect. Early reports may be vague. Later reports can identify enemy movement or threatened locations.

#### Rally points
Temporary hubs allow regrouping, treating wounded, exchanging people or receiving information.

Escalation principle: the opposition becomes more dangerous, but the resistance becomes more organised.

### Cable Street - contribute to a crowd

Core loop:

PREPARE -> REINFORCE -> RESPOND TO PRESSURE -> SUPPORT NEIGHBOURING POSITIONS

Approved concepts:

#### Barricade network
Barricades should support clear states:

UNBUILT -> BUILDING -> REINFORCED -> DAMAGED -> BREACHED

#### Crowd state through behaviour
Avoid relying on a large abstract morale meter. Show strength and weakness through density, chanting, movement, retreat, wounded people, barricade activity and gaps opening in the line.

#### World continues without the player
When the squad leaves one section to reinforce another, the previous area should continue operating based on its condition and available NPCs.

#### Non-combat contribution
Cable Street should make building, carrying, helping, warning, escorting, repairing and opening routes as meaningful as firing a weapon.

Escalation principle: challenge increases through competing priorities and disorder, not simply enemy lethality.

### Barcelona - learn to operate as a squad

Core loop:

IMPROVISATION -> COOPERATION -> COORDINATION

Approved concepts:

#### Cooperation actions
Certain interactions may benefit from two people:

- moving a heavy obstruction
- carrying a wounded person efficiently
- covering a dangerous crossing
- breaching or opening a blocked route
- helping someone over an obstacle

#### Practical character strengths
The four protagonists can have small practical strengths linked to who they are as people. Avoid rigid combat classes.

#### Trust shown through behaviour
Do not use a visible friendship meter. Show growing cooperation through better spacing, quicker regrouping, automatic cover, faster assistance and smoother contextual actions.

#### Commitment point
A quiet, relatively safe moment allows the characters to decide to continue. The next objective should feel like a conscious return to danger.

Escalation principle: the environment becomes more dangerous while the squad becomes mechanically more capable of working together.

## Public GitHub mechanics research

These references are useful because they contain focused mechanics that can inform our own implementation.

### 1. Last Stand

Repository: https://github.com/devinjones521/last-stand
Licence: MIT
Stack relevance: Vanilla JavaScript, Canvas 2D, no dependencies, offline PWA

Useful concepts:

- flow-field pathfinding
- recomputing a shared route after barriers change
- cheap routing for many agents with a shared destination
- reachability checks before or after environmental changes

Potential use:

- Cable Street civilian and crowd routes
- Cable Street barricade consequences
- Wigan resistance-group movement
- evacuation routing

Preferred approach: study the algorithm and reimplement only the small pieces that fit our navigation architecture.

### 2. libGDX gdx-ai

Repository: https://github.com/libgdx/gdx-ai
Licence: Apache-2.0
Language: Java

Useful concepts:

- formation motion
- formation anchors and slots
- environment-aware formation movement
- steering behaviour architecture

Potential use:

- Barcelona squad cooperation
- Wigan split squads
- more natural group movement

Preferred approach: use the design pattern, not the Java implementation.

### 3. Yuka

Repository: https://github.com/Mugen87/yuka
Licence: MIT
Language: JavaScript

Useful concepts:

- arrive steering
- separation
- obstacle avoidance
- autonomous-agent structure
- perception and triggers

Potential use:

- civilians slowing naturally near destinations
- preventing NPC stacking
- small local corrections around people and obstacles
- smoother follower movement

Preferred approach: reimplement the minimum steering behaviours needed instead of adopting the full library unless a later benchmark proves that worthwhile.

### 4. crowdedjs examples

Repository: https://github.com/crowdedjs/examples
Licence: MIT
Focus: browser-based crowd simulation

Useful concept:

Separate global routing from local crowd avoidance.

Potential use:

- Cable Street crowd movement
- dense evacuation movement

Preferred approach: use as a conceptual and performance reference. Do not replace the current game engine with a separate crowd framework.

### 5. exane/utility-ai

Repository: https://github.com/exane/utility-ai
Licence: MIT
Language: JavaScript

Useful concept:

Contextual action scoring.

Decision: do not import this framework. The game already has a local utility-style adaptive director. Use this repository only as a reference when extending our existing scoring model to new NPC decisions.

## Strongest research candidates

Priority order for future engineering evaluation:

1. Elastic formation and local steering
2. Flow-field movement for crowds sharing destinations
3. Dynamic reachability checks around barricades and blocked routes
4. Separation and local obstacle avoidance for civilians and followers
5. Additional contextual NPC actions using the existing adaptive system

## Ownership rule

The final implementation should still look and behave like IF I CAN SHOOT RABBITS.

Do not import:

- another game's art
- characters
- missions
- dialogue
- maps
- UI
- campaign structure
- complete AI framework unless clearly justified

When external source code is copied or adapted rather than independently reimplemented, preserve all licence and attribution requirements.

## Architecture principle

Global systems answer broad questions:

- Where should this group go?
- Which objective matters?
- Which route is currently viable?

Local systems answer immediate movement questions:

- How do I avoid this person?
- How do I approach this position smoothly?
- How do I keep useful spacing?

Keeping those layers separate should help us add richer behaviour without making mission runtimes brittle.
