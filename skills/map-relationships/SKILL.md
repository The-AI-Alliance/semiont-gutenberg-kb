---
name: map-relationships
description: Extract character-character + character-place relationships from literary passages. Each detected relationship becomes a tagged linking annotation with a vocabulary value naming the relationship type. Skips Character / Place promotion — that's skills 6 and 7.
disable-model-invocation: false
user-invocable: true
allowed-tools: Bash, Read, Write
---

You are helping the user build the edges of the literary-relationship graph — the kinship, patronage, antagonism, and place-association ties between characters and places.

This is the relationship-extraction layer, designed to run *after* `build-character-articles` (skill 6) and `build-place-articles` (skill 7) have produced the node set. It uses two `mark.assist` passes with different instructions to surface the two relationship classes.

## What it does

For each LiteraryPassage resource, runs up to two `mark.assist({ motivation: 'linking', instructions: ... })` calls:

1. **Character ↔ character**: kinship (mother, son, brother, spouse), patronage (god/mortal), antagonism, alliance, captor/captive. Tag value names the relationship type.
2. **Character ↔ place**: imprisoned-at, born-in, rules-over, exiled-to, dwells-in. Tag value names the association type.

Each detected relationship becomes a `linking`-motivation annotation tagged with the relationship value.

## SDK verbs

- `browse.resources`, `mark.assist`

## Parameters

| Parameter | Type | Default | Purpose |
|---|---|---|---|
| `<resourceId>` | CLI arg (optional) | all LiteraryPassage resources | Scope to one |
| `SKIP_CHAR_CHAR=1` | env var | unset | Skip the character-character pass |
| `SKIP_CHAR_PLACE=1` | env var | unset | Skip the character-place pass |

## Tier-3 interactive checkpoint

Before run: prints which passes will run, asks `confirm`.

## Run it

**Prerequisite: skills 1, 2, 3, 6, 7 have been run.**

```bash
HOST_ADDR=$(container run --rm node:24-alpine sh -c "ip route | awk '/default/{print \$3}'" 2>/dev/null | tr -d '[:space:]')

container run --rm -v "$(pwd):/work" -w /work \
  -e SEMIONT_API_URL=http://${HOST_ADDR}:4000 \
  -e SEMIONT_USER_EMAIL=admin@example.com \
  -e SEMIONT_USER_PASSWORD=<your-password> \
  node:24-alpine \
  sh -c 'npm install --silent --no-fund @semiont/sdk tsx && npx tsx skills/map-relationships/script.ts'
```

## Guidance for the AI assistant

- **Tags carry the relationship type, not body content.** This is a tagging convention applied via the `linking` motivation. Querying the graph means walking these tagged annotations and reading their `target` (anchor span) plus tag value (relationship name).
- **The skill doesn't synthesize Relationship resources.** A future enhancement could promote each relationship to a structured Relationship resource (entity type `Relationship`) summarizing the pairing across passages. For v1, the tagged annotations on source spans are the graph.
