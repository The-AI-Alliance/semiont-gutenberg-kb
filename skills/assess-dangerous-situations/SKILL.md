---
name: assess-dangerous-situations
description: Flag spans of physical / moral / supernatural danger in literary passages. Used by trace-plot-arc (skill 11) as peak-danger landmarks for narrative-structure synthesis.
disable-model-invocation: false
user-invocable: true
allowed-tools: Bash, Read, Write
---

You are helping the user identify the moments of peril in a literary work — the binding scenes, the cosmic threats, the moral crossroads.

This is one of four tier-1 marking skills. It uses `mark.assist` with motivation `assessing` (Semiont's "red-underline" annotation type). In tragic literature these moments are abundant; in lighter genres they may be sparse — both cases work.

## What it does

For each LiteraryPassage resource, runs `mark.assist({ motivation: 'assessing', instructions: ... })` to flag situations of physical danger, moral peril, threats of violence, supernatural punishment, or imminent harm to characters.

## SDK verbs

- `browse.resources`, `mark.assist`

## Parameters

| Parameter | Type | Default | Purpose |
|---|---|---|---|
| `<resourceId>` | CLI arg (optional) | all LiteraryPassage resources | Scope to one |
| `ASSESS_INSTRUCTIONS` | env var | the standard danger-focus directive | Replace |

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
  sh -c 'npm install --silent --no-fund @semiont/sdk tsx && npx tsx skills/assess-dangerous-situations/script.ts'
```

(See [`ingest-corpus`'s "Run it"](../ingest-corpus/SKILL.md#run-it) for networking notes.)

## Guidance for the AI assistant

- **Useful as a content-warning layer.** A reader scanning the corpus can identify the difficult passages by filtering for assessing annotations.
- **Feeds `trace-plot-arc`.** Skill 11 uses the peak-danger flags from this skill as plot landmarks (climax candidates, rising-action peaks).
