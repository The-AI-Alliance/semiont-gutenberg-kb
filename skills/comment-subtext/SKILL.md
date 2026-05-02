---
name: comment-subtext
description: Add commenting annotations capturing inner thoughts, subtext, dramatic irony, and plot-significance markers across literary passages. Used by trace-plot-arc as plot-significance landmarks.
disable-model-invocation: false
user-invocable: true
allowed-tools: Bash, Read, Write
---

You are helping the user illuminate a literary work with a layer of close-reading commentary — the unspoken thoughts, the irony beneath the literal text, the small actions that move the plot.

This is one of four tier-1 marking skills. It uses `mark.assist` with motivation `commenting`.

## What it does

For each LiteraryPassage resource, runs `mark.assist({ motivation: 'commenting', instructions: ... })` to add short commentary to passages where:

- A character has unspoken motivation worth surfacing
- Subtext sits beneath the literal language (irony, evasion, threat couched as politeness)
- A small action or line moves the plot forward (foreshadowing, complication, revelation)

Comments are quoted-and-explained in the voice of an attentive reader.

## SDK verbs

- `browse.resources`, `mark.assist`

## Parameters

| Parameter | Type | Default | Purpose |
|---|---|---|---|
| `<resourceId>` | CLI arg (optional) | all LiteraryPassage resources | Scope to one |
| `COMMENT_INSTRUCTIONS` | env var | the standard subtext directive | Replace |

## Tier-3 interactive checkpoint

Before run: `confirm`.

## Run it

```bash
HOST_ADDR=$(container run --rm node:24-alpine sh -c "ip route | awk '/default/{print \$3}'" 2>/dev/null | tr -d '[:space:]')

container run --rm -v "$(pwd):/work" -w /work \
  -e SEMIONT_API_URL=http://${HOST_ADDR}:4000 \
  -e SEMIONT_USER_EMAIL=admin@example.com \
  -e SEMIONT_USER_PASSWORD=<your-password> \
  node:24-alpine \
  sh -c 'npm install --silent --no-fund @semiont/sdk tsx && npx tsx skills/comment-subtext/script.ts'
```

## Guidance for the AI assistant

- **Result is a lightly-illuminated reading copy.** The surface text plus an analytical layer pointing out what's underneath. Useful both as a pedagogical artifact and as input to skill 11.
- **`assess-dangerous-situations` flags peaks; this skill explains.** Run them in either order — they don't depend on each other. Together they give skill 11 (`trace-plot-arc`) the spine and texture it needs.
- **Re-running adds new comments.** No deduplication.
