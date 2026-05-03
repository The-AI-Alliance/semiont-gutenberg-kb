# Project Gutenberg Knowledge Base

A curated corpus of public domain literary texts from [Project Gutenberg](https://www.gutenberg.org/) — organized for analysis, annotation, and knowledge extraction.

## About This Dataset

This repository contains **public domain literary texts** sourced from Project Gutenberg, organized by author and work. Texts are provided both as full ebooks and as individual sections to support fine-grained annotation and analysis.

- **`data/ebooks/`** — Full plain-text ebooks organized by Project Gutenberg ID
- **`authors/`** — Texts organized by author and title, with works split into named sections (chapters, acts, scenes, etc.)

All content is in the public domain and freely available via [Project Gutenberg](https://www.gutenberg.org/).

This corpus is well-suited for entity recognition across characters, authors, places, and historical references; mapping relationships between characters, themes, and narrative arcs; stylistic and linguistic analysis across authors and time periods; and building literary knowledge graphs from unstructured text.

## Skills

This repo ships eleven skills that build a layered literary KB on top of the Semiont SDK. See [AGENTS.md](AGENTS.md) for the full design discussion.

| Skill | What it does |
|---|---|
| [`ingest-corpus`](skills/ingest-corpus/SKILL.md) | Walk the repo's literary content (sections, curated articles, ebooks); create one resource per file. |
| [`mark-characters`](skills/mark-characters/SKILL.md) | Detect Character mentions including descriptive references ("the Chorus", "the messenger"). |
| [`mark-places`](skills/mark-places/SKILL.md) | Detect Place mentions — both real geographic places and mythological realms. |
| [`assess-dangerous-situations`](skills/assess-dangerous-situations/SKILL.md) | Flag spans of physical / moral / supernatural danger; used as peak-danger landmarks for plot-arc synthesis. |
| [`comment-subtext`](skills/comment-subtext/SKILL.md) | Add commenting annotations capturing inner thoughts, subtext, dramatic irony, plot-significance markers. |
| [`build-character-articles`](skills/build-character-articles/SKILL.md) | Promote Character mentions to canonical wiki-style Character resources with Wikipedia citations. |
| [`build-place-articles`](skills/build-place-articles/SKILL.md) | Promote Place mentions to canonical wiki-style Place resources with Wikipedia citations. |
| [`map-relationships`](skills/map-relationships/SKILL.md) | Extract character-character + character-place relationships as tagged linking annotations. |
| [`build-historical-context`](skills/build-historical-context/SKILL.md) | Synthesize HistoricalContext resources for the work's era, prior tradition, audience, and concepts. |
| [`extract-themes`](skills/extract-themes/SKILL.md) | Tag passages with thematic concerns; synthesize one Theme resource per distinct theme. |
| [`trace-plot-arc`](skills/trace-plot-arc/SKILL.md) | Synthesize a per-work PlotArc resource documenting the narrative structure. |

## Quick Start

Explore this dataset using [Semiont](https://github.com/The-AI-Alliance/semiont), an open-source knowledge base platform for annotation and knowledge extraction.

This repo follows the same layout and startup flow as [`semiont-template-kb`](https://github.com/The-AI-Alliance/semiont-template-kb). See its README for full setup instructions:

- [Quick Start: Local](https://github.com/The-AI-Alliance/semiont-template-kb#quick-start-local) — run the backend stack on your machine via `.semiont/scripts/start.sh`
- [Quick Start: Codespaces](https://github.com/The-AI-Alliance/semiont-template-kb#quick-start-codespaces) — launch a preconfigured backend in the cloud
- [Inference Configuration](https://github.com/The-AI-Alliance/semiont-template-kb#inference-configuration) — Ollama (local) vs. Anthropic (cloud) configs

### Open in Codespaces

Install the [GitHub CLI (`gh`)](https://cli.github.com/) if you haven't already.

> **Before creating:** add `ANTHROPIC_API_KEY` as a [user secret](https://github.com/settings/codespaces) with this repo selected. Otherwise the backend comes up but inference is non-functional until you add the secret and rebuild the container.

Create the codespace on a premium machine for faster builds and more headroom:

```bash
gh codespace create --repo The-AI-Alliance/semiont-gutenberg-kb --machine premiumLinux
```

Forward the backend port to your local machine, then fetch the auto-generated admin credentials:

```bash
gh codespace ports forward 4000:4000
gh codespace ssh -- cat .devcontainer/admin.json
```

The credentials let you log in via the Semiont browser — see [Quick Start: Codespaces](https://github.com/The-AI-Alliance/semiont-template-kb#quick-start-codespaces) on the template-kb README for the full browser-side flow.

## License

Apache 2.0 — See [LICENSE](LICENSE) for details.
