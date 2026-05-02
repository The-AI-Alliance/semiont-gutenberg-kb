---
name: extract-themes
description: Tag passages with recurring thematic concerns and synthesize one Theme resource per distinct theme. Open vocabulary — themes that surface depend on the corpus.
disable-model-invocation: false
user-invocable: true
allowed-tools: Bash, Read, Write
---

You are helping the user surface the recurring concerns that thread through a literary work, and produce navigable Theme resources for each.

## What it does

1. Pass 1 — tagging: `mark.assist({ motivation: 'tagging', instructions: ... })` over each LiteraryPassage. The model tags passages with short hyphenated theme labels (e.g., `hubris`, `fate-vs-free-will`, `fire-as-civilization`, `divine-cruelty`).
2. Pass 2 — aggregation: collect every tagging annotation by theme value. For each distinct theme, `yield.resource` a Theme resource with markdown body listing example passages.

The themes that surface depend entirely on the corpus — a tragedy produces different themes than a romance or a satirical novel.

## SDK verbs

- `mark.assist({ motivation: 'tagging', instructions: ... })`, `browse.resources`, `browse.annotations`, `yield.resource`

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
  -e SEMIONT_USER_EMAIL=admin@example.com \
  -e SEMIONT_USER_PASSWORD=<your-password> \
  node:24-alpine \
  sh -c 'npm install --silent --no-fund @semiont/sdk tsx && npx tsx skills/extract-themes/script.ts'
```

## Guidance for the AI assistant

- **Open vocabulary.** This skill does not constrain the model to a fixed theme list. To constrain, override `THEME_INSTRUCTIONS` with an explicit list of acceptable theme values.
- **Cross-work theme matching.** The current implementation creates a new Theme resource per distinct tag; if the corpus already has a Theme resource with that tag from a prior run, you'll get a duplicate. Future enhancement: `match.search` for an existing Theme before synthesizing.
- **Themes feed `trace-plot-arc`.** Skill 11 surfaces relevant themes when narrating the work's plot structure.
