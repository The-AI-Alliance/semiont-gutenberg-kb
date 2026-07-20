# Project Gutenberg Knowledge Base

[![Lint](https://github.com/The-AI-Alliance/semiont-gutenberg-kb/actions/workflows/lint.yml/badge.svg?branch=main)](https://github.com/The-AI-Alliance/semiont-gutenberg-kb/actions/workflows/lint.yml?query=branch%3Amain)
[![License](https://img.shields.io/github/license/The-AI-Alliance/semiont-gutenberg-kb)](https://github.com/The-AI-Alliance/semiont-gutenberg-kb/blob/main/LICENSE)

A curated corpus of public domain literary texts from [Project Gutenberg](https://www.gutenberg.org/) — organized for analysis, annotation, and knowledge extraction.

## About This Dataset

This repository contains **public domain literary texts** sourced from Project Gutenberg, organized by author and work. Texts are provided both as full ebooks and as individual sections to support fine-grained annotation and analysis.

- **`data/ebooks/`** — Full plain-text ebooks organized by Project Gutenberg ID
- **`authors/`** — Texts organized by author and title, with works split into named sections (chapters, acts, scenes, etc.)

All content is in the public domain and freely available via [Project Gutenberg](https://www.gutenberg.org/).

This corpus is well-suited for entity recognition across characters, authors, places, and historical references; mapping relationships between characters, themes, and narrative arcs; stylistic and linguistic analysis across authors and time periods; and building literary knowledge graphs from unstructured text.

## Skills

This repo ships twelve skills that build a layered literary KB on top of the Semiont SDK. See [AGENTS.md](AGENTS.md) for the full design discussion.

| Skill | What it does |
|---|---|
| [`ingest-corpus`](skills/ingest-corpus/SKILL.md) | Walk the repo's literary content (sections, curated articles, ebooks); create one resource per file. |
| [`register-tag-schemas`](skills/register-tag-schemas/SKILL.md) | One-time bootstrap — register the KB's tag schemas (`argument-toulmin`) with the runtime so the TaggingPanel can use them. |
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

- [Quick Start: Local](https://github.com/The-AI-Alliance/semiont-template-kb#quick-start-local) — run the Semiont stack on your machine via `semiont start`
- [Quick Start: Codespaces](https://github.com/The-AI-Alliance/semiont-template-kb#quick-start-codespaces) — launch a preconfigured stack in the cloud
- [Inference Configuration](https://github.com/The-AI-Alliance/semiont-template-kb#inference-configuration) — Ollama (local) vs. Anthropic (cloud) configs

### Open in Codespaces

**Prerequisites:** the [Semiont launcher](https://github.com/The-AI-Alliance/semiont/tree/main/apps/launcher) (`brew install the-ai-alliance/semiont/semiont`) and the [GitHub CLI (`gh`)](https://cli.github.com/), signed in with `gh auth login`.

> **Before creating:** add `ANTHROPIC_API_KEY` as a [user secret](https://github.com/settings/codespaces) with this repo selected. Otherwise the backend comes up but inference is non-functional until you add the secret and rebuild the container.

One command creates the codespace (or resumes the one you already have), waits for the stack to answer, forwards the KB to your machine, and prints the auto-generated admin credentials:

```bash
semiont start --runtime codespace --repo The-AI-Alliance/semiont-gutenberg-kb
```

The browser runs **locally** and connects to any number of knowledge bases — cloud or local:

```bash
semiont start --service frontend
```

Open **http://localhost:3000** and add the KB in the **Knowledge Bases** panel, using the port and credentials the launcher printed (`semiont status` re-prints them). `semiont stop --repo The-AI-Alliance/semiont-gutenberg-kb` halts billing and keeps your state; add `--delete` to destroy the codespace.

<details>
<summary>Without the launcher: the raw <code>gh</code> recipe</summary>

```bash
gh codespace create --repo The-AI-Alliance/semiont-gutenberg-kb --machine premiumLinux
gh codespace ports forward 3000:3000 4000:4000   # leave running
gh codespace ssh -- cat '/workspaces/*/.devcontainer/admin.json' # in another terminal
#   (ssh lands in /home/vscode, not the workspace — hence the absolute,
#    quoted path: the quotes keep your shell from expanding it locally)
```

This forwards the codespace's own browser as well, so you open **http://localhost:3000** and sign in with those credentials. If `gh` rejects the forward with `must have admin rights to Repository`, grant the scope once: `gh auth refresh -h github.com -s codespace`.

</details>

## License

Apache 2.0 — See [LICENSE](LICENSE) for details.
