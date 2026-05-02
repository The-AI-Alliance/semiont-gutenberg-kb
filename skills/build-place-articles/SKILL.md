---
name: build-place-articles
description: Promote Place mentions to canonical wiki-style Place resources with Wikipedia citations. Matches against pre-curated articles where they exist, synthesizes new ones otherwise.
disable-model-invocation: false
user-invocable: true
allowed-tools: Bash, Read, Write
---

You are helping the user build the Place canon for a literary corpus.

This skill mirrors `build-character-articles` but for places. Same cluster-and-promote pattern, scoped to place-related entity types.

## What it does

1. Walks all LiteraryPassage resources, collects Place-typed linking annotations.
2. Clusters by canonical text.
3. For each cluster: `gather → match against existing Place (including pre-curated places/) → bind, OR yield new Place + Wikipedia citation → bind`.

## SDK verbs

Same as `build-character-articles`.

## Parameters

| Parameter | Type | Default | Purpose |
|---|---|---|---|
| `MATCH_THRESHOLD` | env var | 30 | Cluster-merge threshold |

## Tier-3 interactive checkpoint

Before processing: prints cluster count, asks `confirm`.

## Run it

**Prerequisite: tier-1 skills 1 and 3 have been run.**

```bash
HOST_ADDR=$(container run --rm node:24-alpine sh -c "ip route | awk '/default/{print \$3}'" 2>/dev/null | tr -d '[:space:]')

container run --rm -v "$(pwd):/work" -w /work \
  -e SEMIONT_API_URL=http://${HOST_ADDR}:4000 \
  -e SEMIONT_USER_EMAIL=admin@example.com \
  -e SEMIONT_USER_PASSWORD=<your-password> \
  -e MATCH_THRESHOLD=30 \
  node:24-alpine \
  sh -c 'npm install --silent --no-fund @semiont/sdk tsx && npx tsx skills/build-place-articles/script.ts'
```

## Guidance for the AI assistant

- **Pre-curated articles in `authors/.../places/` are matched, not duplicated.** A user's hand-curated place article (e.g., the seeded `earth.md`) becomes the canonical Place resource for its cluster.
- **Real places and mythological realms can both surface.** The body markdown captures whichever entity type was tagged; the user can edit later if it needs disambiguation.
