---
name: map-relationships
description: Record character-character and character-place relationships from literary passages. Each relationship is a Relationship resource the establishing passage is bound to. The assistant reads the passage and decides; no job extracts relationships.
disable-model-invocation: false
user-invocable: true
allowed-tools: Bash, Read, Write
---

You are helping the user build the edges of the literary-relationship graph — the kinship, patronage, antagonism, and place-association ties between characters and places.

This is the relationship layer, designed to run *after* `build-character-articles` (skill 6) and `build-place-articles` (skill 7) have produced the node set.

## What it does

The stack's worker detects mentions of entity types. It has no job that extracts relationships, and a linking job takes no instructions. Deciding that a passage relates two nodes is the judgment this skill supplies: yours, reading the passage as the assistant, or the user's.

The method, and the script that records what you decided, are the [`semiont-relate`](https://github.com/The-AI-Alliance/semiont/tree/main/docs/builder/skills/semiont-relate) skill's. A relationship is a resource of its own:

- A **Relationship resource** for each related pair, with entity types `['Relationship', '<type>']`. Its text names the two nodes, and a reference on each name is bound to that node.
- A **reference on the passage** that establishes the relationship, bound to the Relationship resource and tagged with the relationship's type.

## This corpus's relationship types

Declare these with `frame.addEntityTypes` before recording any (alongside `Relationship`):

1. **Character ↔ character**: `kinship` (mother, son, brother, spouse), `patronage` (god/mortal, patron/client), `antagonism`, `alliance`, `captor`.
2. **Character ↔ place**: `imprisoned-at`, `born-in`, `rules-over`, `exiled-to`, `dwells-in`.

## SDK verbs

- `browse.resources`, `browse.annotations`, `frame.addEntityTypes`, `yield.resource`, `mark.annotation`, `bind.body`, `gather.referencedBy`

## Guidance for the AI assistant

- **Prerequisite: skills 1, 2, 3, 6, 7 have been run**, so each character and place a passage mentions has a resource to be one end of a relationship.
- **Read before deciding.** A relationship is recorded where a passage establishes it, not where two names merely appear together.
- **One Relationship resource per related pair and type.** A second passage that establishes the same relationship gets a reference bound to the existing resource.
