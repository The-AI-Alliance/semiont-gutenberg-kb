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
- An inference provider: `ANTHROPIC_API_KEY` or [Ollama](https://ollama.com/) for fully local inference

No npm or Node.js installation required — everything runs in containers.

### Backend

Start the backend with one of the available inference configurations:

```bash
# Fully local with Ollama (default, no API key needed)
.semiont/scripts/start.sh --email admin@example.com --password password
```

```bash
# Anthropic cloud inference
export ANTHROPIC_API_KEY=<your-api-key>
.semiont/scripts/start.sh --config anthropic --email admin@example.com --password password
```

```bash
# See available configs
.semiont/scripts/start.sh --list-configs
```

Starts PostgreSQL and the Semiont backend in containers, and creates an admin user. The script stays attached and streams logs — open a separate terminal for the frontend. Press Ctrl+C to stop.

Open **http://localhost:4000** to verify.

### Frontend

In a separate terminal:

```bash
container run --publish 3000:3000 -it ghcr.io/the-ai-alliance/semiont-frontend:latest
```

Open **http://localhost:3000** and enter **http://localhost:4000** as the knowledge base URL. Log in with the credentials created during backend setup.

## What's Inside

The `.semiont/` directory contains the infrastructure to run a Semiont backend and frontend locally:

```
.semiont/
├── config                        # Project name and settings
├── compose/                      # Docker Compose files
├── containers/                   # Dockerfiles for backend and frontend
└── scripts/                      # Convenience scripts for local development
```

Documents anywhere in the project root become resources in the knowledge base when you upload them through the UI or CLI.

## Inference Configuration

Inference configs live in `.semiont/containers/semiontconfig/` and are selected with the `--config` flag. To create your own, add a `.toml` file to the same directory. See the [Configuration Guide](https://github.com/The-AI-Alliance/semiont/blob/main/docs/administration/CONFIGURATION.md) for the full reference.

## Documentation

See the [Semiont repository](https://github.com/The-AI-Alliance/semiont) for full documentation:

- [Configuration Guide](https://github.com/The-AI-Alliance/semiont/blob/main/docs/administration/CONFIGURATION.md) — inference providers, vector search, graph database settings
- [Project Layout](https://github.com/The-AI-Alliance/semiont/blob/main/docs/PROJECT-LAYOUT.md) — how `.semiont/` and resource files are organized
- [Local Semiont](https://github.com/The-AI-Alliance/semiont/blob/main/docs/LOCAL-SEMIONT.md) — alternative setup paths including the Semiont CLI

## License

Apache 2.0 — See [LICENSE](LICENSE) for details.
