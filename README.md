# Project Gutenberg Knowledge Base

A curated corpus of public domain literary texts from [Project Gutenberg](https://www.gutenberg.org/) — organized for analysis, annotation, and knowledge extraction.

## About This Dataset

This repository contains **public domain literary texts** sourced from Project Gutenberg, organized by author and work. Texts are provided both as full ebooks and as individual sections to support fine-grained annotation and analysis.

- **`data/ebooks/`** — Full plain-text ebooks organized by Project Gutenberg ID
- **`authors/`** — Texts organized by author and title, with works split into named sections (chapters, acts, scenes, etc.)

All content is in the public domain and freely available via [Project Gutenberg](https://www.gutenberg.org/).

This corpus is well-suited for entity recognition across characters, authors, places, and historical references; mapping relationships between characters, themes, and narrative arcs; stylistic and linguistic analysis across authors and time periods; and building literary knowledge graphs from unstructured text.

## Quick Start

Explore this dataset using [Semiont](https://github.com/The-AI-Alliance/semiont), an open-source knowledge base platform for annotation and knowledge extraction.

### Prerequisites

- A container runtime: [Apple Container](https://github.com/apple/container), [Docker](https://www.docker.com/), or [Podman](https://podman.io/)
- An inference provider: [Ollama](https://ollama.com/) for fully local inference, or an [Anthropic](https://www.anthropic.com/) API key for cloud inference. See [Inference Configuration](#inference-configuration) for details.
- [Git](https://git-scm.com/) — for managing your documents and committing the event streams that the backend stages

No npm or Node.js installation required — everything runs in containers.

### Start the backend

```bash
.semiont/scripts/start.sh --email admin@example.com --password password
```

This builds and starts the full backend stack: PostgreSQL, Neo4j, Qdrant, Ollama, and the Semiont API server. The script auto-detects your container runtime, creates the admin user, and stays attached streaming logs — open a separate terminal for the browser. Press Ctrl+C to stop.

### Browse the knowledge base

Start a Semiont browser by [running the container or desktop app](https://github.com/The-AI-Alliance/semiont#start-the-browser), then open it at **http://localhost:3000** and add your knowledge base in the **Knowledge Bases** panel:

| Field | Value |
|---|---|
| Host | `localhost` |
| Port | `4000` |
| Email | the email you passed to `--email` |
| Password | the password you passed to `--password` |

## Adding Documents

Documents anywhere in the project root become resources in the knowledge base when you upload them through the UI or CLI. This repo is a Git repository — use `git` to track your documents, branch, and collaborate just as you would with any other project.

## Inference Configuration

The start script selects an inference config with the `--config` flag. Configs live in `.semiont/containers/semiontconfig/`:

- **`ollama-gemma`** (default for `start.sh`) — fully local inference via [Ollama](https://ollama.com/) with Gemma 4 models. No API key needed. On first run, Ollama pulls `gemma4:26b` (17 GB), `gemma4:e2b` (7.2 GB), and `nomic-embed-text` (274 MB) — roughly 24 GB total, downloaded once.
- **`anthropic`** — cloud inference via the Anthropic API. Requires `ANTHROPIC_API_KEY`.

```bash
# Use Anthropic cloud inference
export ANTHROPIC_API_KEY=<your-api-key>
.semiont/scripts/start.sh --config anthropic --email admin@example.com --password password
```

```bash
# List available configs
.semiont/scripts/start.sh --list-configs
```

To create your own config, add a `.toml` file to `.semiont/containers/semiontconfig/`. See the [Configuration Guide](https://github.com/The-AI-Alliance/semiont/blob/main/docs/administration/CONFIGURATION.md) for the full reference.

## What's Inside

```
.semiont/
├── config                        # Project name and settings
├── compose/                      # Docker Compose file for backend
├── containers/                   # Dockerfiles and inference configs
│   └── semiontconfig/            # Inference config variants (.toml)
└── scripts/                      # Backend startup script
```

As you work in the knowledge base, the backend writes event streams (annotations, links, generated content) as JSONL files into `.semiont/events/` and stages them with `git add`. The backend container includes its own Git installation for this purpose. You are responsible for committing and pushing these staged changes — treat the knowledge base like any other Git repository.

## Documentation

See the [Semiont repository](https://github.com/The-AI-Alliance/semiont) for full documentation:

- [Configuration Guide](https://github.com/The-AI-Alliance/semiont/blob/main/docs/administration/CONFIGURATION.md) — inference providers, vector search, graph database settings
- [Project Layout](https://github.com/The-AI-Alliance/semiont/blob/main/docs/PROJECT-LAYOUT.md) — how `.semiont/` and resource files are organized
- [Local Semiont](https://github.com/The-AI-Alliance/semiont/blob/main/docs/LOCAL-SEMIONT.md) — alternative setup paths including the Semiont CLI

## License

Apache 2.0 — See [LICENSE](LICENSE) for details.
