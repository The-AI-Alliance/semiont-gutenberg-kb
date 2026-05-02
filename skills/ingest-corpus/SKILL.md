---
name: ingest-corpus
description: Walk the repo's literary content (sections, pre-curated places/characters/themes, and whole-ebook source files) and create one Semiont resource per file with appropriate entity types.
disable-model-invocation: false
user-invocable: true
allowed-tools: Bash, Read, Write
---

You are helping a user bootstrap a Project-Gutenberg-style literary corpus into a Semiont knowledge base. This is the foundation skill — every other skill in this repo operates against the resources this one creates.

## What it does

1. Calls `discoverCorpus()` (in [`src/files.ts`](../../src/files.ts)) to walk the conventional directory layout.
2. For each ingestable file, calls `yield.resource(...)` with appropriate `format` and `entityTypes`.

The directory convention:

| Path | Treated as | Default entity types |
|---|---|---|
| `authors/<author>/<work>/sections/*.{md,txt}` | section | `LiteraryPassage`, plus `ChorusPassage` or `EpisodePassage` based on filename |
| `authors/<author>/<work>/places/*.md` | curated place article | `Place`, `Curated` |
| `authors/<author>/<work>/characters/*.md` | curated character article | `Character`, `Curated` |
| `authors/<author>/<work>/themes/*.md` | curated theme article | `Theme`, `Curated` |
| `data/ebooks/<id>/*.txt` | whole-ebook source | `Ebook`, `ProjectGutenberg` |

`README.md`, `LICENSE`, `AGENTS.md`, and `.DS_Store` are explicitly skipped.

## SDK verbs

- `yield.resource` — one call per discovered file

## Tier-3 interactive checkpoint

Before bulk upload: `confirm` after showing the per-class summary.

## Run it

**Prerequisite: the Semiont backend is running** — see [AGENTS.md › Backend setup](../../AGENTS.md#backend-setup).

```bash
HOST_ADDR=$(container run --rm node:24-alpine sh -c "ip route | awk '/default/{print \$3}'" 2>/dev/null | tr -d '[:space:]')

container run --rm -v "$(pwd):/work" -w /work \
  -e SEMIONT_API_URL=http://${HOST_ADDR}:4000 \
  -e SEMIONT_USER_EMAIL=admin@example.com \
  -e SEMIONT_USER_PASSWORD=<your-password> \
  node:24-alpine \
  sh -c 'npm install --silent --no-fund @semiont/sdk tsx && npx tsx skills/ingest-corpus/script.ts'
```

Add `-e SEMIONT_INTERACTIVE=1 -it` to enable the confirm prompt.

**Why the `HOST_ADDR` discovery probe:** `localhost` from inside a freshly-spawned container is its own loopback, not the host's. The probe uses the same trick `start.sh` uses. Substitute `docker run` or `podman run` for `container run` if those are your runtimes.

For Docker Desktop / Podman on macOS, replace the probe with `SEMIONT_API_URL=http://host.docker.internal:4000`. For Linux Docker, `--network host` + `SEMIONT_API_URL=http://localhost:4000` works.

## Output

Per-file resource id and entity types. Note these — downstream skills (`mark-characters`, `mark-places`, etc.) operate against the resource set this skill creates.

## Guidance for the AI assistant

- **Re-running creates duplicates.** No deduplication. Use `semiont.browse.resources({ search: '<title>' })` to check before re-running, or restart the backend stack to start fresh.
- **Pre-curated `places/`, `characters/`, `themes/` content survives.** Skill 1 ingests them as Place / Character / Theme resources on day 1; skills 6 and 7 match against them rather than overwriting. A user wanting to seed their own KB with curated articles drops them into the appropriate subdirectory.
- **`data/ebooks/` contents are mostly informational.** They're cataloged as Ebook resources but downstream skills don't operate on them directly — `mark-*` skills work on the section files. Useful for "where did this passage come from" lookups.
