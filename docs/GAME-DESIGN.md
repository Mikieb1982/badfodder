# IF I CAN SHOOT RABBITS - Game Design Source of Truth

Status: Active design direction
Last consolidated: 7 October 2026

This document records the core identity and design rules for the game. If a later idea conflicts with these principles, this document should be treated as the default position until a deliberate decision changes it.

## Current scope

Current development is limited to four missions:

1. Bad Belzig
2. Wigan
3. Cable Street
4. Barcelona

Do not expand the campaign with additional missions until these four are coherent, stable and enjoyable.

## Core premise

The shared foundation is ordinary people resisting fascism.

Each mission is a separate story with its own people, conflict, place, purpose and ending. The connection between missions is thematic rather than a single continuing cast or plot.

The player characters are civilians and local volunteers, not action heroes. They may become more capable during a mission, but the game should preserve vulnerability, uncertainty and the sense that people are learning under pressure.

## Core design rule

Story -> action -> consequence.

An objective should not exist only because the game needs another task. The player should understand why an action matters, perform it through gameplay, and then see a consequence.

Example:

- Weak: Hold this checkpoint.
- Strong: Hold this checkpoint while neighbours cross the square.
- Payoff: The player sees the final civilians reach safety, or sees the situation worsen if the position fails.

## Mission structure

Each location contains one substantial self-contained story divided into clear acts.

Every mission should answer:

- Whose story is this?
- What is threatened?
- What are these people trying to achieve?
- How does the situation develop?
- What does the player influence?
- What does the ending mean?

Every mission should include:

### Before the fighting
Establish the place and people through playable movement, interaction or preparation. Let the player see something that will later matter.

### During the mission
Develop the story through changing circumstances, discoveries, conversations, civilian behaviour, map changes and objectives that arise naturally from events.

### After the mission
Give the outcome room to register. Show who returned, who is missing, what was protected, what was lost and what this local effort achieved.

## Mission identities

| Mission | Story identity | Central question | Main player feeling |
| --- | --- | --- | --- |
| Bad Belzig | Home | What does protecting your home demand of you? | I cannot protect everything. |
| Wigan | Solidarity | How do people build solidarity under pressure? | We are becoming organised. |
| Cable Street | Community | What can a neighbourhood achieve together? | I am one part of something much bigger. |
| Barcelona | Commitment | How do ordinary people learn to act together in a crisis? | These people are learning to act as a group. |

The four missions must not become four versions of rescue -> defend -> escape. Pacing, relationships, decisive moments and signature mechanics should differ.

## Combat philosophy

The player rarely wins simply by killing everyone.

Combat should usually create the space to do something else:

- protect a route
- move civilians
- hold long enough for another action to succeed
- reach a person or place
- break through a blockade
- create time to regroup
- defend people performing non-combat work
- withdraw before being overwhelmed

Avoid bullet-sponge design. Difficulty should come from positioning, pressure, competing priorities, limited resources, consequences and tactical decisions.

## People and consequences

Named characters and civilians should matter.

Use a small number of persistent mission outcomes rather than huge branching campaigns. Typical tracked outcomes may include:

- named NPC survived or was lost
- civilians evacuated
- defensive position held or abandoned
- route preserved or cut
- squad member wounded or downed
- optional objective completed

These outcomes should alter later dialogue, available help, environmental state or the final scene without multiplying the game into many separate campaigns.

## Story delivery

Prefer storytelling that happens while the player remains in control.

Useful methods:

- brief conversations while moving
- short reactions during combat
- environmental changes
- civilian behaviour
- changing routes
- developing objectives
- quiet regroup moments
- short end-of-act or end-of-mission scenes

Avoid long interruptions unless a moment genuinely benefits from them.

## Historical grounding

Use only two mission labels:

- Based on real events
- Fictional mission

Historical missions should distinguish verified historical facts from gameplay approximation. Maps, timings, characters and local details should be researched where practical, but gameplay should not pretend an approximation is documented fact.

## Technical and product guardrails

Preserve the existing identity of IF I CAN SHOOT RABBITS:

- browser-native
- offline-capable PWA
- no mandatory account
- no paid external AI service
- no external LLM dependency
- single-player remains fully functional
- optional co-op must not dictate mission design
- reuse shared systems rather than duplicating mission-specific versions
- deterministic systems where practical
- mobile and desktop remain first-class targets

## Visual identity

All missions should belong to the same game.

Characters, civilians, enemies, streets, buildings, effects, HUD and animation should share a coherent visual standard while retaining location-specific architecture and atmosphere.

Do not import another game's art direction simply because its mechanics are useful.

## External code and public GitHub references

Public projects may be used as algorithm and architecture references, but the game should remain recognisably its own system.

Preferred approach:

1. Study the mechanic.
2. Understand the underlying algorithm.
3. Reimplement the smallest useful version inside the existing engine.
4. Import code only where there is a strong reason.
5. Preserve required licence and copyright notices for any copied code.

Do not adopt whole frameworks merely to gain one small feature.

## Design workflow

Every substantial idea should move through:

IDEA -> CANDIDATE -> APPROVED -> BACKLOG -> IMPLEMENTED

Interesting discussion does not automatically authorise implementation.

Before coding a major mission change, confirm:

1. What story purpose does it serve?
2. What does the player actually do?
3. What changes because of that action?
4. Is the mechanic shared or mission-specific?
5. Does an existing system already solve most of the problem?
6. Does the change preserve the identity of the game?
