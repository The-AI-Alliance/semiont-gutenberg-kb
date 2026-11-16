---
name: mark-characters
description: Detect Character mentions across literary passages, including descriptive references like "the Chorus" or "the messenger". Tags spans for promotion to canonical Character resources by skill 6.
disable-model-invocation: false
user-invocable: true
allowed-tools: Bash, Read, Write
---

You are helping the user detect Character mentions in a literary corpus.

This is one of four tier-1 marking skills. It uses `mark.assist` with motivation `linking` and `includeDescriptiveReferences: true` to catch both formal-name spans and anaphoric mentions.

## What it does

For each LiteraryPassage resource (or one specific resource), runs `mark.assist({ motivation: 'linking', entityTypes: [...], includeDescriptiveReferences: true })`. Tags formal-name spans plus phrases like "the Chorus", "the messenger", "the visiting god", "the bound Titan".

## SDK verbs

- `browse.resources` — find LiteraryPassage targets
- `mark.assist({ motivation: 'linking', entityTypes: [...], includeDescriptiveReferences: true })`

## Parameters

| Parameter | Type | Default | Purpose |
|---|---|---|---|
| `<resourceId>` | CLI arg (optional) | all LiteraryPassage resources | Scope to one |
| `ENTITY_TYPES` | env var | `Character,God,Mortal,Titan,Hero` | Override or extend per genre |

## Tier-3 interactive checkpoint

Before run: prints target count + entity types, asks `confirm`.

## Run it

**Prerequisite: `ingest-corpus` has been run.**

```bash
HOST_ADDR=$(container run --rm node:24-alpine sh -c "ip route | awk '/default/{print \$3}'" 2>/dev/null | tr -d '[:space:]')

container run --rm -v "$(pwd):/work" -w /work \
  -e SEMIONT_API_URL=http://${HOST_ADDR}:4000 \
  -e SEMIONT_USER_EMAIL=admin@example.com \
  -e SEMIONT_USER_PASSWORD=<your-password> \
  node:24-alpine \
  sh -c 'npm install --silent --no-fund @semiont/sdk tsx && npx tsx skills/mark-characters/script.ts'
```

Override entity types per genre with `-e ENTITY_TYPES='Character,Antagonist,Narrator'` for a non-classical work. Add `-e SEMIONT_INTERACTIVE=1 -it` for the confirm prompt.

(See [`ingest-corpus`'s "Run it"](../ingest-corpus/SKILL.md#run-it) for networking notes.)

## Guidance for the AI assistant

- **Descriptive references matter for drama.** Choral passages are full of "the bound one", "our prisoner", "her tormentor" — `includeDescriptiveReferences: true` captures these.
- **Annotations stay unresolved.** Skill 6 (`build-character-articles`) clusters and promotes to Character resources, then binds these annotations.
- **Re-running adds annotations cumulatively.** No deduplication.
