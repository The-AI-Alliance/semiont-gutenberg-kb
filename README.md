# Project Gutenberg Knowledge Base

A curated corpus of public domain literary texts from [Project Gutenberg](https://www.gutenberg.org/) — organized for analysis, annotation, and knowledge extraction.

## Running with Semiont

Explore this dataset using [Semiont](https://github.com/The-AI-Alliance/semiont), an open-source knowledge base platform for annotation and knowledge extraction.

### Prerequisites

- **Container runtime** — [Apple Container](https://github.com/apple/container), [Docker](https://www.docker.com/), or [Podman](https://podman.io/)
- **Inference provider** — an `ANTHROPIC_API_KEY` (cloud) or [Ollama](https://ollama.com/) running locally
- **Neo4j** — a free cloud instance at [Neo4j Aura](https://neo4j.com/cloud/aura/) or Neo4j running locally

Set these environment variables before running:

```bash
export NEO4J_URI=<your-neo4j-uri>
export NEO4J_USERNAME=<your-neo4j-username>
export NEO4J_PASSWORD=<your-neo4j-password>
export NEO4J_DATABASE=<your-neo4j-database>
export ANTHROPIC_API_KEY=<your-api-key>
```

### Backend

```bash
.semiont/scripts/local_backend.sh
```

Starts PostgreSQL and the Semiont backend in containers. The script stays attached and streams logs — open a separate terminal for the frontend. Press Ctrl+C to stop.

To run in the background instead: `.semiont/scripts/local_backend.sh &`

Open **http://localhost:4000** to verify.

### Frontend

In a separate terminal:

```bash
.semiont/scripts/local_frontend.sh
```

Same as the backend — stays attached and streams logs. Press Ctrl+C to stop.

Open **http://localhost:3000**.

### Logging in

Enter **http://localhost:4000** as the knowledge base URL. Log in with the username and password created during backend setup.

### Using Semiont

Semiont organizes work around seven composable flows. The ones most relevant to this dataset:

- **Mark** — Annotate documents by selecting text manually or using AI-assisted detection (the ✨ button). Annotations follow the [W3C Web Annotation](https://github.com/The-AI-Alliance/semiont/blob/main/specs/docs/W3C-WEB-ANNOTATION.md) standard and can be highlights, comments, tags, or entity references.
- **Bind** — Resolve entity references by linking annotations to other resources in the knowledge graph. The resolution wizard (🕸️🧙) searches for matching candidates and scores them.
- **Yield** — Generate new resources from annotations. AI agents can produce summaries or new content from annotated passages.
- **Match** — Search the knowledge base for candidates during entity resolution. Uses composite scoring across name similarity, entity type, graph connectivity, and optional LLM re-ranking.
- **Gather** — Assemble surrounding context (text, metadata, graph neighborhood) to improve detection, resolution, and generation quality.

A typical workflow: upload documents → detect entities with AI → resolve references to build the knowledge graph → generate summaries or new resources from what you've found.

For deeper understanding, see the [architecture overview](https://github.com/The-AI-Alliance/semiont/blob/main/docs/ARCHITECTURE.md), the [project layout](https://github.com/The-AI-Alliance/semiont/blob/main/docs/PROJECT-LAYOUT.md), and the individual [flow docs](https://github.com/The-AI-Alliance/semiont/tree/main/docs/flows). The [API reference](https://github.com/The-AI-Alliance/semiont/blob/main/specs/docs/API.md) covers all HTTP endpoints.

Other example knowledge bases: [gutenberg-kb](https://github.com/The-AI-Alliance/gutenberg-kb) (public domain literature) and [semiont-workflows](https://github.com/The-AI-Alliance/semiont-workflows) (end-to-end pipeline).

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
