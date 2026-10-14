---
name: mark-places
description: Detect Place mentions across literary passages — both real geographic places and imagined / mythological realms. Tags spans for promotion to canonical Place resources by skill 7.
disable-model-invocation: false
user-invocable: true
allowed-tools: Bash, Read, Write
---

You are helping the user detect Place mentions in a literary corpus.

This is one of four tier-1 marking skills. Mirrors `mark-characters` for places.

## What it does

For each LiteraryPassage resource, runs `mark.delegate({ motivation: 'linking', entityTypes: [...] })` with place-related entity types. Both real geographic places and imagined / mythological realms are tagged; the entity-type subset captures the difference.

## SDK verbs

- `browse.resources`, `mark.delegate`

## Parameters

| Parameter | Type | Default | Purpose |
|---|---|---|---|
| `<resourceId>` | CLI arg (optional) | all LiteraryPassage resources | Scope to one |
| `ENTITY_TYPES` | env var | `Place,Mountain,Sea,City,Realm,MythologicalPlace` | Override or extend per genre |

## Tier-3 interactive checkpoint

Before run: prints target count + entity types, asks `confirm`.

## Run it

**Prerequisite: `ingest-corpus` has been run.**

```bash
HOST_ADDR=$(container run --rm node:24-alpine sh -c "ip route | awk '/default/{print \$3}'" 2>/dev/null | tr -d '[:space:]')

container run --rm -v "$(pwd):/work" -w /work \
  -e SEMIONT_API_URL=http://${HOST_ADDR}:4000 \
  node:24-alpine \
  sh -c 'npm ci --no-audit --no-fund && npx tsx skills/mark-places/script.ts'
```

The script prints an address: open it in a browser and approve the sign-in. [Signing in](https://github.com/The-AI-Alliance/semiont/blob/main/docs/builder/SIGN-IN.md) has the other ways a script can sign in.

(See [`ingest-corpus`'s "Run it"](../ingest-corpus/SKILL.md#run-it) for networking notes.)

## Guidance for the AI assistant

- **Tag both real and mythological places.** A literary work often blends them; capture both.
- **Same caveats as mark-characters**: re-running adds annotations cumulatively; the unresolved annotations stay unresolved until skill 7 resolves them.
