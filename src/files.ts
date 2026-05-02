/**
 * Corpus file discovery and ingest input preparation.
 *
 * Walks the `authors/<author>/<work>/{sections,places,characters,themes}/`
 * tree plus `data/ebooks/<id>/` for whole-ebook source files, classifies each
 * one by its location and extension, and produces CorpusFile records ready
 * for `yield.resource`.
 *
 * Used by skill 1 (`ingest-corpus`).
 *
 * Generic across any Project-Gutenberg-style literary corpus following the
 * `authors/<author>/<work>/<kind>/` convention.
 */

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, relative } from 'node:path';

export type CorpusFileSource =
  | 'literary-passage'
  | 'curated-character'
  | 'curated-place'
  | 'curated-theme'
  | 'ebook'
  | 'other';

export interface CorpusFile {
  /** Repo-relative path. */
  path: string;
  /** Display name for the resource. */
  name: string;
  /** MIME type. */
  format: string;
  /** Entity types to attach to the resource. */
  entityTypes: string[];
  /** Stable storage identifier; we use file:// URIs. */
  storageUri: string;
  /** Coarse classification, useful for downstream filtering. */
  source: CorpusFileSource;
  /** Author folder name (e.g., "Aeschylus"). */
  author?: string;
  /** Work folder name (e.g., "Four_Plays_by_Aeschylus"). */
  work?: string;
}

const FORMAT_BY_EXT: Record<string, string> = {
  '.md': 'text/markdown',
  '.txt': 'text/plain',
};

const SKIP_FILENAMES = new Set([
  'README.md',
  'readme.md',
  'README',
  '.DS_Store',
  'LICENSE',
  'AGENTS.md',
]);

function nameFromFilename(filename: string): string {
  const base = filename.replace(/\.[^.]+$/, '');
  return base.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Classify a file under `authors/<author>/<work>/<kind>/<file>` based on the
 * `<kind>` directory name and the filename. Returns the source type and
 * starting entity-type list. Returns null if the file should be skipped.
 */
function classifySection(
  kind: string,
  filename: string,
): { source: CorpusFileSource; entityTypes: string[] } | null {
  switch (kind) {
    case 'sections': {
      // Try to detect chorus / episode / prologue / etc. from the filename
      const lc = filename.toLowerCase();
      const types = ['LiteraryPassage'];
      if (lc.includes('chorus') || lc.includes('parodos') || lc.includes('stasimon') || lc.includes('exodos')) {
        types.push('ChorusPassage');
      } else if (lc.includes('episode') || lc.includes('prologos') || lc.includes('prologue')) {
        types.push('EpisodePassage');
      }
      return { source: 'literary-passage', entityTypes: types };
    }
    case 'places':
      return { source: 'curated-place', entityTypes: ['Place', 'Curated'] };
    case 'characters':
      return { source: 'curated-character', entityTypes: ['Character', 'Curated'] };
    case 'themes':
      return { source: 'curated-theme', entityTypes: ['Theme', 'Curated'] };
    default:
      return null;
  }
}

/**
 * Walk the repo and produce one CorpusFile per ingestable file.
 * @param repoRoot Absolute path to the repo root. Defaults to the current working directory.
 */
export function discoverCorpus(repoRoot: string = process.cwd()): CorpusFile[] {
  const out: CorpusFile[] = [];

  // authors/<author>/<work>/<kind>/<file>
  const authorsDir = join(repoRoot, 'authors');
  if (existsSync(authorsDir)) {
    for (const author of readdirSync(authorsDir)) {
      const authorPath = join(authorsDir, author);
      if (!statSync(authorPath).isDirectory()) continue;

      for (const work of readdirSync(authorPath)) {
        const workPath = join(authorPath, work);
        if (!statSync(workPath).isDirectory()) continue;

        for (const kind of readdirSync(workPath)) {
          const kindPath = join(workPath, kind);
          if (!statSync(kindPath).isDirectory()) continue;

          const classification = classifySection(kind, '');
          if (!classification) continue;

          for (const filename of readdirSync(kindPath)) {
            if (SKIP_FILENAMES.has(filename)) continue;
            const ext = extname(filename).toLowerCase();
            const format = FORMAT_BY_EXT[ext];
            if (!format) continue;

            const fileClass = classifySection(kind, filename);
            if (!fileClass) continue;

            const filePath = join(kindPath, filename);
            const relPath = relative(repoRoot, filePath);
            out.push({
              path: relPath,
              name: nameFromFilename(filename),
              format,
              entityTypes: fileClass.entityTypes,
              storageUri: `file://${relPath}`,
              source: fileClass.source,
              author,
              work,
            });
          }
        }
      }
    }
  }

  // data/ebooks/<id>/<file>
  const ebooksDir = join(repoRoot, 'data', 'ebooks');
  if (existsSync(ebooksDir)) {
    for (const id of readdirSync(ebooksDir)) {
      const idPath = join(ebooksDir, id);
      if (!statSync(idPath).isDirectory()) continue;

      for (const filename of readdirSync(idPath)) {
        if (SKIP_FILENAMES.has(filename)) continue;
        const ext = extname(filename).toLowerCase();
        const format = FORMAT_BY_EXT[ext];
        if (!format) continue;

        const filePath = join(idPath, filename);
        const relPath = relative(repoRoot, filePath);
        out.push({
          path: relPath,
          name: `Project Gutenberg ${id}`,
          format,
          entityTypes: ['Ebook', 'ProjectGutenberg'],
          storageUri: `file://${relPath}`,
          source: 'ebook',
        });
      }
    }
  }

  return out;
}

/** Read file contents into a Buffer for upload via yield.resource. */
export function readForUpload(file: CorpusFile, repoRoot: string = process.cwd()): Buffer {
  return readFileSync(join(repoRoot, file.path));
}
