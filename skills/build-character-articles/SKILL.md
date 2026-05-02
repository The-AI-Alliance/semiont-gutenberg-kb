---
name: build-character-articles
description: Promote Character mentions to canonical wiki-style Character resources with Wikipedia citations. Matches against pre-curated articles where they exist, synthesizes new ones otherwise.
disable-model-invocation: false
user-invocable: true
allowed-tools: Bash, Read, Write
---

You are helping the user build the Character canon for a literary corpus — every distinct character mentioned in the work becomes a clickable wiki-style resource anchored to Wikipedia where applicable.

## What it does

1. Walks all LiteraryPassage resources, collects every Character-typed linking annotation.
2. Clusters by canonical text.
3. For each cluster:
   - `gather.annotation` for context.
   - `match.search` against existing Character resources (including any pre-curated articles ingested by skill 1 from `authors/.../characters/`).
   - If a candidate scores above `MATCH_THRESHOLD`: bind to it.
   - Otherwise: synthesize a new Character resource. Body markdown follows the curated-article style — opening definition, role in the work, mythological / historical context, key actions. Includes an "External references" section with Wikipedia URL.
   - Bind every annotation in the cluster to the resolved/synthesized resource.

## SDK verbs

- `browse.resources`, `browse.annotations`, `gather.annotation`, `match.search`, `yield.resource`, `bind.body`

## Parameters

| Parameter | Type | Default | Purpose |
|---|---|---|---|
| `MATCH_THRESHOLD` | env var | 30 | Cluster-merge threshold |

## Tier-3 interactive checkpoint

Before processing: prints cluster count, asks `confirm`. Per-cluster decisions print to log.

## Run it

**Prerequisite: tier-1 skills 1 and 2 have been run.**

```bash
HOST_ADDR=$(container run --rm node:24-alpine sh -c "ip route | awk '/default/{print \$3}'" 2>/dev/null | tr -d '[:space:]')

container run --rm -v "$(pwd):/work" -w /work \
  -e SEMIONT_API_URL=http://${HOST_ADDR}:4000 \
  -e SEMIONT_USER_EMAIL=admin@example.com \
  -e SEMIONT_USER_PASSWORD=<your-password> \
  -e MATCH_THRESHOLD=30 \
  node:24-alpine \
  sh -c 'npm install --silent --no-fund @semiont/sdk tsx && npx tsx skills/build-character-articles/script.ts'
```

(See [`ingest-corpus`'s "Run it"](../ingest-corpus/SKILL.md#run-it) for networking notes.)

## Guidance for the AI assistant

- **Pre-curated articles in `authors/.../characters/` survive.** Skill 1 ingested them as Character resources; this skill matches against them rather than overwriting. A user with a hand-curated character article doesn't lose it.
- **The cluster-merge heuristic is coarse.** Lowercased text matching is the first pass; the model's `gather + match` does fine-grained disambiguation. If "Prometheus" and "the Titan" stay separate after this skill, raising the cluster sensitivity (or doing a second-pass merge interactively) would help.
- **Synthesized stubs are short.** A title, the entity types, the mention count, and a Wikipedia link. Use them as scaffolding; curate by hand later if they're load-bearing.
