---
name: extract-themes
description: Comment on passages with the recurring thematic concern each exemplifies, and synthesize one Theme resource per distinct theme. Open vocabulary — themes that surface depend on the corpus.
disable-model-invocation: false
user-invocable: true
allowed-tools: Bash, Read, Write
---

You are helping the user surface the recurring concerns that thread through a literary work, and produce navigable Theme resources for each.

## What it does

1. Pass 1 — discovery: `mark.delegate({ motivation: 'commenting', instructions: ... })` over each LiteraryPassage. The model comments on each thematically-significant span, and the comment is the theme alone: a short hyphenated label (e.g., `hubris`, `fate-vs-free-will`, `divine-cruelty`).
2. Pass 2 — aggregation: walk the commenting annotations whose comment is such a label, group by label, publish the discovered labels to the KB vocabulary via `frame.addEntityTypes`, and `yield.resource` one Theme resource per distinct theme — markdown listing each passage that exemplifies it.

A commenting job is used because it takes instructions and records the model's own words on a span. A linking job detects mentions of entity types and takes no instructions, and a tagging job needs a registered schema of categories.

The themes that surface depend entirely on the corpus — a tragedy produces different themes than a romance or a satirical novel.

## SDK verbs

- `mark.delegate({ motivation: 'commenting', instructions: ... })`, `browse.resources`, `browse.annotations`, `frame.addEntityTypes`, `yield.resource`

## Parameters

| Parameter | Type | Default | Purpose |
|---|---|---|---|
| `THEME_INSTRUCTIONS` | env var | the standard literary-theme directive | Replace |

## Tier-3 interactive checkpoint

Before pass 1: `confirm`.

## Run it

```bash
HOST_ADDR=$(container run --rm node:24-alpine sh -c "ip route | awk '/default/{print \$3}'" 2>/dev/null | tr -d '[:space:]')

container run --rm -v "$(pwd):/work" -w /work \
  -e SEMIONT_API_URL=http://${HOST_ADDR}:4000 \
  node:24-alpine \
  sh -c 'npm ci --no-audit --no-fund && npx tsx skills/extract-themes/script.ts'
```

The script prints an address: open it in a browser and approve the sign-in. [Signing in](https://github.com/The-AI-Alliance/semiont/blob/main/docs/builder/SIGN-IN.md) has the other ways a script can sign in.

## Guidance for the AI assistant

- **Open vocabulary.** This skill does not constrain the model to a fixed theme list. To constrain, override `THEME_INSTRUCTIONS` with an explicit list of acceptable theme values.
- **Cross-work theme matching.** The current implementation creates a new Theme resource per distinct tag; if the corpus already has a Theme resource with that tag from a prior run, you'll get a duplicate. Future enhancement: `match.search` for an existing Theme before synthesizing.
- **Themes feed `trace-plot-arc`.** Skill 11 surfaces relevant themes when narrating the work's plot structure.
