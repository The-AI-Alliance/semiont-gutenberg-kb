/**
 * build-historical-context — synthesize HistoricalContext resources for the
 * real-world phenomena the work touches.
 *
 * Iterates over works in the corpus (one per author/work directory). For each
 * target passage, a linking job (mark.delegate) marks the mentions of the
 * anchor entity types, and yield.delegate synthesizes a HistoricalContext
 * resource per anchor — model writes the body grounded in the gathered
 * context, with the Wikipedia URL woven in via the prompt. Synthesized
 * resources are stamped with 'HistoricalContext', 'Historical', and
 * 'Wikipedia' entity types so `browse.resources({ entityType: 'HistoricalContext' })`
 * finds them.
 *
 * Usage: tsx skills/build-historical-context/script.ts [<workResourceId>] [--interactive]
 */

import {
  SemiontSession,
  InMemorySessionStorage,
  httpKb,
  entityType,
  getAnnotationExactText,
  getBodySource,
  resourceId as ridBrand,
  type ResourceId,
} from '@semiont/sdk';
import { wikipediaSearch } from '../../src/wikipedia.js';
import { confirm, close as closeInteractive } from '../../src/interactive.js';

// mark.delegate with motivation 'linking' requires a non-empty entityTypes
// array (SDK validation). The historical-anchor pass tags spans that point
// at real-world historical contexts.
const ANCHOR_ENTITY_TYPES = (
  process.env.ANCHOR_ENTITY_TYPES ?? 'HistoricalContext'
)
  .split(',')
  .map((t) => entityType(t.trim()));

function slugify(text: string): string {
  return text.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

async function main(): Promise<void> {
  const args = process.argv.slice(2).filter((a) => !a.startsWith('-'));
  const explicitResourceId = args[0];

  const gateway = new URL(process.env.SEMIONT_API_URL ?? 'http://localhost:4000');
  const opened = await SemiontSession.signInDevice({
    kb: httpKb({
      id: 'gutenberg-build-historical-context',
      label: 'gutenberg build-historical-context',
      host: gateway.hostname,
      port: Number(gateway.port) || 4000,
      protocol: gateway.protocol === 'https:' ? 'https' : 'http',
    }),
    storage: new InMemorySessionStorage(),
    onCode: ({ verificationUri, verificationUriComplete, userCode }) => {
      console.error(`Approve this script at ${verificationUriComplete ?? verificationUri}`);
      if (!verificationUriComplete) console.error(`Code: ${userCode}`);
    },
  });
  const semiont = opened.session.client;

  try {
    // Identify "work" by grouping LiteraryPassage resources whose names share
    // a common parent path. For v1, treat each LiteraryPassage as its own
    // anchor scope and let the model's gather window pull in surrounding context.
    // (When works are richer / multi-passage in a real run, a per-work aggregation
    // pass would be a useful enhancement.)
    let targets: ResourceId[];
    if (explicitResourceId) {
      targets = [ridBrand(explicitResourceId)];
    } else {
      const all = (await semiont.browse.resources({ limit: 1000 }).fresh()).resources;
      targets = all
        .filter((r) =>
          // Look for "Argument" passages — typically the work's framing — as anchors.
          // Falls back to all LiteraryPassage resources if no Arguments are found.
          (r.entityTypes ?? []).some((t) => t === 'LiteraryPassage') &&
          (r.name?.toLowerCase().includes('argument') ?? false),
        )
        .map((r) => r['@id']);
      if (targets.length === 0) {
        // Fallback: take the first LiteraryPassage per author/work (rough heuristic).
        targets = all
          .filter((r) => (r.entityTypes ?? []).some((t) => t === 'LiteraryPassage'))
          .slice(0, 1)
          .map((r) => r['@id']);
      }
    }

    if (targets.length === 0) {
      console.log('No LiteraryPassage resources found.');
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
      closeInteractive();
      return;
    }

    // For each target, a linking job marks the mentions of the anchor entity
    // types. Each becomes a linking annotation we then promote to a
    // HistoricalContext resource.
    let synthesized = 0;
    const seenAnchors = new Set<string>();

    for (const rId of targets) {
      console.log(`\nProcessing ${rId}...`);
      const done = await semiont.mark.delegate(rId, {
        motivation: 'linking',
        entityTypes: ANCHOR_ENTITY_TYPES,
      });
      console.log(`  Created ${done.result && 'persisted' in done.result ? done.result.persisted : 0} anchor annotations.`);

      const annotations = await semiont.browse.annotations(rId).fresh();
      const anchors = annotations.filter((ann) => {
        if (ann.motivation !== 'linking') return false;
        // Heuristic: anchors are short tagged spans. Skip annotations bound to
        // existing resources (those are likely from prior skills).
        return getBodySource(ann.body) === null;
      });

      for (const ann of anchors) {
        const text = getAnnotationExactText(ann);
        if (!text || seenAnchors.has(text.toLowerCase())) continue;
        seenAnchors.add(text.toLowerCase());

        const wikiUrl = await wikipediaSearch(text);
        const externalRefsLine = wikiUrl
          ? `End with an "## External references" section as a markdown bullet list including: - [${text}](${wikiUrl}) — Wikipedia`
          : 'No Wikipedia URL was found; do not include an External references section.';
        const prompt =
          `Write a short historical-context article about "${text}" — a real-world historical anchor ` +
          `(event, era, tradition, institution, or concept) referenced by literary works in this corpus. ` +
          `Use the gathered context from the source passage to ground the article.` +
          `\n\nStructure:\n` +
          `  - Opening definition paragraph (what this anchor refers to).\n` +
          `  - Historical period and significance.\n` +
          `  - How this anchor would have shaped or surfaced in the literature of its time.\n` +
          `\n${externalRefsLine}\n` +
          `Write in a neutral, encyclopedic tone — model on a curated wiki article. Keep it to ~3 paragraphs.`;

        // gather context for the anchor's annotation, then synthesize from it.
        const { response: context } = await semiont.gather.annotation(rId, ann.id, { contextWindow: 1500 });
        const generated = await semiont.yield.delegate({
          context,
          title: text,
          storageUri: `file://generated/historical-${slugify(text)}.md`,
          prompt,
          entityTypes: ['HistoricalContext', 'Historical', 'Wikipedia'],
        });
        if (!generated.result || !('resourceId' in generated.result)) {
          console.warn(`  the generation made no resource for "${text}"`);
          continue;
        }
        const newRId = generated.result.resourceId;
        synthesized++;
        console.log(`  + "${text}" → ${newRId}${wikiUrl ? ` (Wikipedia: ${wikiUrl})` : ''}`);
      }
    }

    console.log(`\nDone. Synthesized ${synthesized} HistoricalContext resources.`);
    closeInteractive();
  } finally {
    opened.dispose();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
