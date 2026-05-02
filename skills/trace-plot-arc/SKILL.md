---
name: trace-plot-arc
description: Synthesize a per-work PlotArc resource documenting the narrative structure — inciting incident, rising action, climax, denouement — based on aggregated danger flags, subtext comments, and section ordering from prior skills.
disable-model-invocation: false
user-invocable: true
allowed-tools: Bash, Read, Write
---

You are helping the user produce a PlotArc resource — a narrative-structure synthesis for a literary work that orders passages by their place in the story arc and surfaces the inciting incident, climax, and denouement.

This is the capstone skill. It depends on prior skills having run:

- `ingest-corpus` (skill 1) — to have LiteraryPassage resources to walk
- `assess-dangerous-situations` (skill 4) — peak-danger flags identify climax candidates
- `comment-subtext` (skill 5) — plot-significance markers identify rising-action passages
- Optionally: `build-character-articles`, `build-place-articles`, `build-historical-context`, `extract-themes` (skills 6, 7, 9, 10) — for the bound-refs columns

## What it does

1. Loads all (or filtered) LiteraryPassage resources, ordered alphabetically by name. *(The typical Project Gutenberg section convention — Argument, Dramatis Personae, Prologos, Parodos, Episode 1, …, Exodos — alphabetizes into narrative order. For corpora that don't follow this convention, manual ordering would be a future enhancement.)*
2. For each passage, collects: count of `assessing` annotations (danger flags), count of `commenting` annotations (subtext / plot-significance), and count of bound resources (links to characters, places, historical context, themes).
3. Identifies narrative landmarks heuristically:
   - **Climax candidate** = passage with highest danger-flag count
   - **Inciting incident candidate** = first passage with non-zero danger
   - **Denouement** = final passage in narrative order
4. `yield.resource` a PlotArc resource with markdown body — passage map table, narrative-landmarks section, notes on form.

## SDK verbs

- `browse.resources`, `browse.annotations`, `yield.resource`

## Parameters

| Parameter | Type | Default | Purpose |
|---|---|---|---|
| `<workNamePattern>` | CLI arg (optional) | all LiteraryPassage resources | Filter to passages whose name contains the pattern (case-insensitive) |
| `PLOT_FRAMEWORK` | env var | `auto` | "auto", "3-act", "5-act", "episodic", "novelistic" — currently informational only; future enhancement could shape landmark identification |

## Tier-3 interactive checkpoint

Before yielding: prints passage count + framework, asks `confirm`.

## Run it

**Prerequisite: most prior skills should have been run.**

```bash
HOST_ADDR=$(container run --rm node:24-alpine sh -c "ip route | awk '/default/{print \$3}'" 2>/dev/null | tr -d '[:space:]')

container run --rm -v "$(pwd):/work" -w /work \
  -e SEMIONT_API_URL=http://${HOST_ADDR}:4000 \
  -e SEMIONT_USER_EMAIL=admin@example.com \
  -e SEMIONT_USER_PASSWORD=<your-password> \
  -e PLOT_FRAMEWORK=5-act \
  node:24-alpine \
  sh -c 'npm install --silent --no-fund @semiont/sdk tsx && npx tsx skills/trace-plot-arc/script.ts'
```

To scope to one work in a multi-work corpus, pass a name pattern:

```bash
... npx tsx skills/trace-plot-arc/script.ts "Four Plays" ...
```

## Output

A PlotArc resource. Body shape:

```markdown
# Plot Arc: <first passage name> → <last passage name>

## Passage map

| # | Passage | Danger flags | Subtext comments | Bound refs |
|---|---|---|---|---|
| 1 | Argument | 0 | 2 | 1 |
| 2 | Prologos | 1 | 5 | 3 |
| 3 | Parodos | 0 | 4 | 0 |
…

## Narrative landmarks

- **Inciting incident** (first danger flag): *Prologos* — 1 danger flag(s), 5 subtext comment(s).
- **Climax** (peak danger): *Episode 2* — 6 danger flag(s).
- **Denouement** (final passage): *Exodos*.
```

## Guidance for the AI assistant

- **Heuristics over inference for landmark identification.** Counting danger flags and subtext comments is imperfect, but transparent — the user can audit the table and override the inferred landmarks by hand-editing the PlotArc resource. A future version could ask the model to reason about landmarks given the table; v1 keeps it deterministic.
- **Quality scales with prior layers.** Without `assess-dangerous-situations` the danger column is zeros and landmarks degrade to first/middle/last. Run skills 4 and 5 first.
- **Re-running creates a new PlotArc resource.** Delete the prior one via the Semiont browser if you want to regenerate cleanly.
