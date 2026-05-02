/**
 * ingest-corpus — walk the repo, create one resource per file.
 *
 * Discovers files under `authors/<author>/<work>/{sections,places,characters,themes}/`
 * and `data/ebooks/<id>/`, classifies each, and uploads via yield.resource.
 * Pre-curated articles (places/, characters/, themes/) become canonical
 * resources on day 1; downstream skills match against them rather than overwriting.
 *
 * Usage: tsx skills/ingest-corpus/script.ts [--interactive]
 */

import { SemiontClient } from '@semiont/sdk';
import { discoverCorpus, readForUpload } from '../../src/files.js';
import { confirm, close as closeInteractive } from '../../src/interactive.js';

/**
 * The full entity-type vocabulary this KB uses across all eleven skills.
 * Declared via `frame.addEntityTypes` once on each ingest run — idempotent,
 * so re-runs are harmless. This is what makes `browse.entityTypes()` return
 * a coherent published vocabulary.
 */
const KB_ENTITY_TYPES = [
  // Section types from src/files.ts
  'LiteraryPassage',
  'ChorusPassage',
  'EpisodePassage',
  // Whole-ebook source types
  'Ebook',
  'ProjectGutenberg',
  // Curated-article markers
  'Curated',
  // mark-characters entity types
  'Character',
  'God',
  'Mortal',
  'Titan',
  'Hero',
  // mark-places entity types
  'Place',
  'Mountain',
  'Sea',
  'City',
  'Realm',
  'MythologicalPlace',
  // build-historical-context types
  'HistoricalContext',
  'Historical',
  'Wikipedia',
  // Synthesized aggregates
  'Theme',
  'PlotArc',
  'Relationship',
  'Aggregate',
];

async function main(): Promise<void> {
  const repoRoot = process.cwd();
  const files = discoverCorpus(repoRoot);

  console.log(`Discovered ${files.length} corpus files:`);
  const byKind: Record<string, number> = {};
  for (const f of files) {
    byKind[f.source] = (byKind[f.source] ?? 0) + 1;
  }
  for (const [kind, n] of Object.entries(byKind).sort()) {
    console.log(`  ${kind}: ${n}`);
  }
  console.log();

  if (files.length === 0) {
    console.log('No ingestable files found. Exiting.');
    closeInteractive();
    return;
  }

  const proceed = await confirm(
    `About to create ${files.length} resources via yield.resource. Proceed?`,
    true,
  );
  if (!proceed) {
    console.log('Aborted before upload.');
    closeInteractive();
    return;
  }

  const semiont = await SemiontClient.signInHttp({
    baseUrl: process.env.SEMIONT_API_URL ?? 'http://localhost:4000',
    email: process.env.SEMIONT_USER_EMAIL!,
    password: process.env.SEMIONT_USER_PASSWORD!,
  });

  // Declare this KB's entity-type vocabulary via frame. Idempotent.
  console.log(`Declaring ${KB_ENTITY_TYPES.length} entity types via frame...`);
  await semiont.frame.addEntityTypes(KB_ENTITY_TYPES);

  let created = 0;
  let failed = 0;
  for (const file of files) {
    try {
      const buffer = readForUpload(file, repoRoot);
      const { resourceId } = await semiont.yield.resource({
        name: file.name,
        file: buffer,
        format: file.format,
        entityTypes: file.entityTypes,
        storageUri: file.storageUri,
      });
      created++;
      console.log(`  + ${file.path} → ${resourceId} [${file.entityTypes.join(', ')}]`);
    } catch (e) {
      failed++;
      console.warn(`  ! ${file.path} failed: ${(e as Error).message}`);
    }
  }

  console.log(`\nDone. ${created} resources created, ${failed} failed.`);
  semiont.dispose();
  closeInteractive();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
