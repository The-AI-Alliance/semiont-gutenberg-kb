---
name: build-historical-context
description: Synthesize HistoricalContext resources for the real-world phenomena a literary work touches — the author's era, prior tradition, audience and venue, real historical events, philosophical concepts. Each cited via Wikipedia.
disable-model-invocation: false
user-invocable: true
allowed-tools: Bash, Read, Write
---

You are helping the user anchor a literary work in real-world history — building a layer of HistoricalContext resources that ground the fictional events in their historical setting.

## What it does

For each target passage (typically the work's "Argument" or framing section), the skill runs a linking job, `mark.delegate({ motivation: 'linking', entityTypes: ['HistoricalContext'] })`, which marks the mentions of that entity type: the era of the author, a prior tradition the work draws on, a real event, a recurring philosophical or religious concept. A linking job takes no instructions; the entity types are what it looks for, and `ANCHOR_ENTITY_TYPES` names them. Each identified anchor becomes:

1. A linking annotation tagged with the anchor name
2. A new HistoricalContext resource synthesized via `yield.delegate`, body markdown citing the canonical Wikipedia URL via `src/wikipedia.ts`

Anchors are deduplicated across passages by canonical name.

## SDK verbs

- `browse.resources`, `browse.annotations`, `mark.delegate`, `gather.annotation`, `yield.delegate`

## Parameters

| Parameter | Type | Default | Purpose |
|---|---|---|---|
| `<resourceId>` | CLI arg (optional) | "Argument" passages, falling back to first LiteraryPassage | Scope to one |

## Tier-3 interactive checkpoint

Before run: `confirm`. Per-anchor decisions print to log.

## Run it

**Prerequisite: tier-1 skills 1–5 should have been run for context, but this skill is partially self-sufficient — it'll run on bare LiteraryPassage resources too.**

```bash
HOST_ADDR=$(container run --rm node:24-alpine sh -c "ip route | awk '/default/{print \$3}'" 2>/dev/null | tr -d '[:space:]')

container run --rm -v "$(pwd):/work" -w /work \
  -e SEMIONT_API_URL=http://${HOST_ADDR}:4000 \
  node:24-alpine \
  sh -c 'npm ci --no-audit --no-fund && npx tsx skills/build-historical-context/script.ts'
```

The script prints an address: open it in a browser and approve the sign-in. [Signing in](https://github.com/The-AI-Alliance/semiont/blob/main/docs/builder/SIGN-IN.md) has the other ways a script can sign in.

## Wikipedia citation pattern

Synthesized HistoricalContext resources include an "External references" section embedded in their body markdown, looked up via `src/wikipedia.ts`'s `wikipediaSearch()`. The URL is cached in `.cache/wikipedia/` for repeated runs.

## Guidance for the AI assistant

- **The skill chooses a small target set by default.** The "Argument" filter is a heuristic — for many works, the Argument passage carries the framing context the model needs to identify good anchors. Falls back to the first LiteraryPassage if no Argument exists. For richer multi-passage works, pass `<resourceId>` explicitly to scope to a chosen passage.
- **Anchors are stubs.** A title plus a Wikipedia link. Curate by hand later if any are load-bearing for downstream research.
- **Re-running creates duplicate HistoricalContext resources** unless dedupe via `match.search` is added (similar pattern to skill 6/7 — would be a cleanup-pass enhancement).
