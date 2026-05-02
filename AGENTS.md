# AGENTS.md — semiont-gutenberg-kb (and any literature KB)

This is a Project-Gutenberg-flavored Semiont knowledge base. The corpus is public-domain literary texts organized by author and work. The skills detect characters, places, themes, and dangerous situations in the text and build out canonical wiki-style articles, character-relationship graphs, real-world historical context, and per-work plot arcs around them.

If you're an AI assistant working in this repo, this file is your orientation. The skills are **corpus-generic** — drop a different literary corpus into the same directory layout and they work without modification.

## What's here

- **`authors/<author>/<work>/sections/`** — section files (Argument, Dramatis Personae, episodes, etc.). Skill 1 ingests each as a LiteraryPassage resource.
- **`authors/<author>/<work>/places/`** — pre-curated, wiki-style Place articles. Skill 1 ingests them as Place resources on day 1; skills 6/7 *match* against them rather than overwriting.
- **`authors/<author>/<work>/characters/`** — same pattern for pre-curated Character articles (any future hand-curated content goes here).
- **`authors/<author>/<work>/themes/`** — same pattern for pre-curated Theme articles.
- **`data/ebooks/<id>/`** — full Project Gutenberg ebook source files.
- **`src/`** — small helper modules:
  - `src/files.ts` — corpus discovery and classification
  - `src/wikipedia.ts` — Wikipedia URL lookups + "External references" formatting (cached locally to `.cache/wikipedia/`)
  - `src/handlers/gutenberg.ts` — `downloadGutenbergText` + `extractGutenbergSection` for fetching new ebooks on demand
  - `src/interactive.ts` — `confirm` / `pick` / `preview` helpers for tier-3 interactive checkpoints
- **`skills/`** — eleven skills, each shipping a `SKILL.md` plus a `script.ts` that uses `@semiont/sdk` against the running backend.

| Skill | What it does | New SDK verbs |
|---|---|---|
| [`ingest-corpus`](skills/ingest-corpus/) | Walk the repo, declare the KB's entity-type vocabulary, create one resource per file | `frame.addEntityTypes`, `yield.resource` |
| [`mark-characters`](skills/mark-characters/) | Detect Character mentions (named + descriptive) | `mark.assist` (linking + descriptive references) |
| [`mark-places`](skills/mark-places/) | Detect Place mentions | `mark.assist` (linking) |
| [`assess-dangerous-situations`](skills/assess-dangerous-situations/) | Flag spans of physical / moral / supernatural danger | `mark.assist` (assessing) |
| [`comment-subtext`](skills/comment-subtext/) | Inline subtext / inner-thought / plot-significance commentary | `mark.assist` (commenting) |
| [`build-character-articles`](skills/build-character-articles/) | Promote Character mentions to canonical wiki-style Character resources with Wikipedia citations | `+ yield.fromAnnotation` |
| [`build-place-articles`](skills/build-place-articles/) | Promote Place mentions to canonical Place resources with Wikipedia citations; matches against curated articles | `+ yield.fromAnnotation` |
| [`map-relationships`](skills/map-relationships/) | Extract character-character + character-place relationships, encode as binding annotations | `mark.assist`, `bind.body` |
| [`build-historical-context`](skills/build-historical-context/) | Synthesize HistoricalContext resources anchoring the work in real-world history, citing Wikipedia | `+ yield.resource` |
| [`extract-themes`](skills/extract-themes/) | Tag and synthesize Theme resources for recurring thematic concerns | `mark.assist` (tagging) |
| [`trace-plot-arc`](skills/trace-plot-arc/) | Per-work narrative-structure synthesis — inciting incident, rising action, climax, denouement | full pipeline composition |

## What does literary analysis involve?

The work people call "close reading" or "literary analysis" usually involves several braided activities:

1. **Cataloging** — characters, settings, era, genre.
2. **Cross-reference** — character relationships, place anchors per scene, cross-work connections.
3. **Thematic reading** — recurring concerns and the passages that exemplify them.
4. **Subtext and inner life** — what the characters aren't saying out loud; dramatic irony.
5. **Plot arc** — inciting incident, rising action, climax, denouement.
6. **Historical context** — what shaped the work; what tradition it adapts or argues with.
7. **Reception** — contemporaries, later interpretation, adaptations.

The Semiont SDK is well-suited for the cataloging, cross-reference, thematic, plot-arc, and historical-context work — turning a raw text into a navigable network of Character, Place, Theme, HistoricalContext, and PlotArc resources, all anchored back to the source passages.

## Pre-curated articles are preserved

The seeded corpus contains a hand-curated `authors/<author>/<work>/places/earth.md` (or similar) — a wiki-style article about a concept in the work. **This is the model for what synthesized articles should look like, and it must not be overwritten.** Skill 1 ingests it as a Place resource on day 1, and skills 6 / 7 *match* against it via `match.search` before synthesizing — so any hand-curated article a user has placed under `places/` or `characters/` or `themes/` is preserved.

A user wanting to seed their own KB with a curated article should:

1. Drop a markdown file into `authors/<author>/<work>/places/` (or `characters/`, etc.).
2. Run `ingest-corpus` — the file becomes a Place / Character / Theme resource.
3. Run downstream skills as normal — the matching logic recognizes the curated resource and doesn't duplicate it.

## Entity types used in this KB

- **Characters**: `Character`, `God`, `Mortal`, `Titan`, `Hero` (extensible per genre — `MajorCharacter`, `MinorCharacter`, `Antagonist`, `Narrator`, `Persona`, etc.)
- **Places**: `Place`, `Mountain`, `Sea`, `City`, `Realm`, `MythologicalPlace` (extensible per genre)
- **Themes**: `Theme`
- **Historical context**: `HistoricalContext`, `Historical`, `Wikipedia`
- **Section types**: `LiteraryPassage`, `ChorusPassage`, `EpisodePassage`
- **Ebook source**: `Ebook`, `ProjectGutenberg`
- **Curated content marker**: `Curated`
- **Synthesized aggregates**: `PlotArc`, `Relationship`

## External references pattern

The SDK does not yet have a first-class verb for representing external links. For now, synthesized resources cite their external anchors (Wikipedia articles) via a **plain markdown "External references" section** in the resource body:

```markdown
## External references

- [Greco-Persian Wars](https://en.wikipedia.org/wiki/Greco-Persian_Wars) — Wikipedia
- [Aeschylus](https://en.wikipedia.org/wiki/Aeschylus) — Wikipedia
```

`src/wikipedia.ts:formatExternalReferences` builds the markdown; the URL is looked up via the MediaWiki opensearch API and cached in `.cache/wikipedia/`.

## Working in containers — do not install npm packages on the host

This template assumes a containerized workflow. The backend stack runs in containers (`.semiont/scripts/start.sh` brings it up); the skills run in containers too. There is **no need** to install Node, the SDK, or any other tooling on the host machine.

Each skill's `SKILL.md` shows a `container run` invocation that mounts the repo, installs `@semiont/sdk` and `tsx` *inside* a throwaway container, then runs the skill's `script.ts`. See [`skills/ingest-corpus/SKILL.md`](skills/ingest-corpus/SKILL.md) for the full networking discussion (the `HOST_ADDR` discovery probe).

## Backend setup

Before running any skill, the Semiont backend stack must be up. Two paths:

### Local: `start.sh`

```bash
.semiont/scripts/start.sh --email admin@example.com --password password --observe
```

Flags: `--email` / `--password` to seed an admin user, `--observe` to start a Jaeger sidecar, `--config anthropic` for cloud inference (requires `ANTHROPIC_API_KEY`), `--no-cache` to force a fresh image build. `--help` lists all options.

### Codespaces

Open the repo in a Codespace — `post-create.sh` builds the stack, `post-start.sh` brings it up, admin credentials are auto-generated into `.devcontainer/admin.json`. Print them: `cat .devcontainer/admin.json`. Forward the port: `gh codespace ports forward 4000:4000`.

## Parameterization and interactivity

Skills are parameterized in three tiers.

### Tier 1 — environment configuration

| Var | Purpose |
|---|---|
| `SEMIONT_API_URL` | Backend URL (default `http://localhost:4000`) |
| `SEMIONT_USER_EMAIL` | Authenticating user |
| `SEMIONT_USER_PASSWORD` | Authenticating user's password |

### Tier 2 — skill-invocation parameters

Per-skill env vars and CLI args. Most skills accept `MATCH_THRESHOLD` (default 30) for cluster-merge / candidate binding. Tier-1 mark skills accept `ENTITY_TYPES` to override the default type list. Instruction text for `assess-*` / `comment-*` / `extract-themes` skills is exposed as `ASSESS_INSTRUCTIONS` / `COMMENT_INSTRUCTIONS` / `THEME_INSTRUCTIONS` so users can retune focus without editing TypeScript. `trace-plot-arc` accepts `PLOT_FRAMEWORK` (3-act, 5-act, episodic, novelistic, or auto). See each skill's `SKILL.md` for specifics.

### Tier 3 — interactive checkpoints

Off by default (batch automation works as before). Enable per-run with `--interactive` (CLI flag) or `SEMIONT_INTERACTIVE=1` (env var). Skills pause at natural decision points and show what they found / what they're about to do, letting the user steer.

The same render-what-found logic runs in non-interactive mode — output goes to logs instead of pausing for input.

Tier-2 env vars can pre-answer tier-3 prompts (e.g., `MATCH_THRESHOLD=25` pre-answers cluster-merge confidence; `PLOT_FRAMEWORK=5-act` pre-answers the plot-framework selection). The "interactive once, scripted thereafter" workflow falls out naturally.

## Background reading

| Where | What |
|---|---|
| [`@semiont/sdk` README](https://github.com/The-AI-Alliance/semiont/tree/main/packages/sdk) | The TypeScript surface — eight verbs (frame, yield, mark, match, bind, gather, browse, beckon) plus admin/auth/job. |
| [SDK Usage docs](https://github.com/The-AI-Alliance/semiont/tree/main/packages/sdk/docs) | Cache semantics, reactive model, state units, error handling. |
| [Semiont protocol docs](https://github.com/The-AI-Alliance/semiont/tree/main/docs/protocol) | The eight-flow framing. |
| [Semiont protocol skills](https://github.com/The-AI-Alliance/semiont/tree/main/docs/protocol/skills) | Reference skill packs — `semiont-wiki`, `semiont-comment`, `semiont-highlight`, etc. The patterns in this repo borrow from these. |
| [.plans/LITERATURE-SKILLS.md](.plans/LITERATURE-SKILLS.md) | The full design plan for these skills. |
