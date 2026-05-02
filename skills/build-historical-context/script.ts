/**
 * build-historical-context — synthesize HistoricalContext resources for the
 * real-world phenomena the work touches.
 *
 * Iterates over works in the corpus (one per author/work directory). For each
 * work, runs a creative pass via mark.assist + yield.fromAnnotation to
 * identify relevant historical anchors (the era of the author, prior tradition,
 * audience and venue, real events that shaped the work, philosophical/religious
 * concepts) and synthesize HistoricalContext resources with Wikipedia citations.
 *
 * Usage: tsx skills/build-historical-context/script.ts [<workResourceId>] [--interactive]
 */

import {
  SemiontClient,
  resourceId as ridBrand,
  type ResourceId,
} from '@semiont/sdk';
import { wikipediaSearch, formatExternalReferences, type ExternalRef } from '../../src/wikipedia.js';
import { confirm, close as closeInteractive } from '../../src/interactive.js';

function slugify(text: string): string {
  return text.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

async function main(): Promise<void> {
  const args = process.argv.slice(2).filter((a) => !a.startsWith('-'));
  const explicitResourceId = args[0];

  const semiont = await SemiontClient.signInHttp({
    baseUrl: process.env.SEMIONT_API_URL ?? 'http://localhost:4000',
    email: process.env.SEMIONT_USER_EMAIL!,
    password: process.env.SEMIONT_USER_PASSWORD!,
  });

  // Identify "work" by grouping LiteraryPassage resources whose names share
  // a common parent path. For v1, treat each LiteraryPassage as its own
  // anchor scope and let the model's gather window pull in surrounding context.
  // (When works are richer / multi-passage in a real run, a per-work aggregation
  // pass would be a useful enhancement.)
  let targets: ResourceId[];
  if (explicitResourceId) {
    targets = [ridBrand(explicitResourceId)];
  } else {
    const all = await semiont.browse.resources({ limit: 1000 });
    targets = all
      .filter((r) =>
        // Look for "Argument" passages — typically the work's framing — as anchors.
        // Falls back to all LiteraryPassage resources if no Arguments are found.
        (r.entityTypes ?? []).some((t) => t === 'LiteraryPassage') &&
        (r.name?.toLowerCase().includes('argument') ?? false),
      )
      .map((r) => ridBrand(r['@id']));
    if (targets.length === 0) {
      // Fallback: take the first LiteraryPassage per author/work (rough heuristic).
      targets = all
        .filter((r) => (r.entityTypes ?? []).some((t) => t === 'LiteraryPassage'))
        .slice(0, 1)
        .map((r) => ridBrand(r['@id']));
    }
  }

  if (targets.length === 0) {
    console.log('No LiteraryPassage resources found.');
    semiont.dispose();
    closeInteractive();
    return;
  }

  console.log(
    `Will identify historical-context anchors for ${targets.length} target passage(s) ` +
      `(typically the work's Argument or framing section). For each identified anchor, ` +
      `synthesize a HistoricalContext resource with Wikipedia citation.`,
  );

  const proceed = await confirm('Proceed?', true);
  if (!proceed) {
    console.log('Aborted.');
    semiont.dispose();
    closeInteractive();
    return;
  }

  // For each target, run mark.assist with a custom instruction asking the model
  // to identify 3-7 historical-context anchors. Each becomes a linking annotation
  // we then promote to a HistoricalContext resource.
  const ANCHOR_INSTRUCTIONS = `
Identify 3-7 real-world historical anchors relevant to this work — the historical
period of the author, the prior literary or mythological tradition the work draws
on, the audience and venue (e.g., Athenian tragedy festivals, Elizabethan theaters),
real historical events that shaped the author's perspective, and recurring
philosophical or religious concepts. Tag each anchor with a short canonical name
(e.g., "Greco-Persian Wars", "Athenian Democracy", "Hesiod's Theogony"). Use a
single tag value per anchor.
`.trim();

  let synthesized = 0;
  const seenAnchors = new Set<string>();

  for (const rId of targets) {
    console.log(`\nProcessing ${rId}...`);
    const progress = await semiont.mark.assist(rId, 'linking', { instructions: ANCHOR_INSTRUCTIONS });
    console.log(`  Created ${progress.progress?.createdCount ?? 0} anchor annotations.`);

    const annotations = await semiont.browse.annotations(rId);
    const anchors = annotations.filter((ann) => {
      if (ann.motivation !== 'linking') return false;
      // Heuristic: anchors are short tagged spans. Skip annotations bound to
      // existing resources (those are likely from prior skills).
      return !ann.body?.some((b: any) => b.type === 'SpecificResource');
    });

    for (const ann of anchors) {
      const text = ann.target?.selector?.exact ?? '';
      if (!text || seenAnchors.has(text.toLowerCase())) continue;
      seenAnchors.add(text.toLowerCase());

      const wikiUrl = await wikipediaSearch(text);
      const refs: ExternalRef[] = wikiUrl ? [{ term: text, url: wikiUrl }] : [];
      const externalRefs = formatExternalReferences(refs);

      const body =
        `# ${text}\n\n` +
        `Historical context relevant to literary works in this corpus.\n\n` +
        `Generated stub — replace with curated content as desired.\n\n` +
        externalRefs;

      const { resourceId: newRId } = await semiont.yield.resource({
        name: text,
        file: Buffer.from(body, 'utf-8'),
        format: 'text/markdown',
        entityTypes: ['HistoricalContext', 'Historical', 'Wikipedia'],
        storageUri: `file://generated/historical-${slugify(text)}.md`,
      });
      synthesized++;
      console.log(`  + "${text}" → ${newRId}${wikiUrl ? ` (Wikipedia: ${wikiUrl})` : ''}`);
    }
  }

  console.log(`\nDone. Synthesized ${synthesized} HistoricalContext resources.`);
  semiont.dispose();
  closeInteractive();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
