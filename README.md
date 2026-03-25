# Project Gutenberg Knowledge Base

A curated corpus of public domain literary texts from [Project Gutenberg](https://www.gutenberg.org/) — organized for analysis, annotation, and knowledge extraction.

## Running with Semiont

Explore this dataset using [Semiont](https://github.com/The-AI-Alliance/semiont), an open-source knowledge base platform for annotation and knowledge extraction.

### Prerequisites

- **Node.js 20+** — [nodejs.org](https://nodejs.org/)
- **Docker or Podman** — for the database and proxy containers
- **Inference provider** — either an `ANTHROPIC_API_KEY` (cloud) or [Ollama](https://ollama.com/) running locally
- **Neo4j** — a free cloud instance at [Neo4j Aura](https://neo4j.com/cloud/aura/) or Neo4j running locally

### Install and run

```bash
npm install -g @semiont/cli neo4j-driver
git clone git@github.com:The-AI-Alliance/gutenberg-kb.git
cd gutenberg-kb
semiont local --yes
```

`semiont local` sets up and starts all services in one step. When it finishes, open **http://localhost:8080** and log in with:

- **Email:** `admin@example.com`
- **Password:** `password`

For full details see the [Semiont Local Setup Guide](https://github.com/The-AI-Alliance/semiont/blob/main/docs/LOCAL-SEMIONT.md).

---

## About This Dataset

This repository contains **public domain literary texts** sourced from Project Gutenberg, organized by author and work. Texts are provided both as full ebooks and as individual sections to support fine-grained annotation and analysis.

The dataset includes:

- **`data/ebooks/`** — Full plain-text ebooks organized by Project Gutenberg ID
- **`authors/`** — Texts organized by author and title, with works split into named sections (chapters, acts, scenes, etc.)

All content is in the public domain and freely available via [Project Gutenberg](https://www.gutenberg.org/).

## Purpose

This corpus is well-suited for:

- Demonstrating annotation and knowledge extraction on literary texts
- Entity recognition across characters, authors, places, and historical references
- Mapping relationships between characters, themes, and narrative arcs
- Stylistic and linguistic analysis across authors and time periods
- Training annotation models on classic literature

## Usage

These materials are ideal for:

- Testing entity recognition (characters, locations, historical figures, dates)
- Exploring relationship mapping between characters and plot events
- Demonstrating thematic clustering and topic modeling on literary text
- Studying narrative structure across genres and eras
- Building literary knowledge graphs from unstructured text
