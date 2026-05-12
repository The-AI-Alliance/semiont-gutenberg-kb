/**
 * build-historical-context — synthesize HistoricalContext resources for the
 * real-world phenomena the work touches.
 *
 * Iterates over works in the corpus (one per author/work directory). For each
 * target passage, mark.assist identifies historical anchors (the era of the
 * author, prior tradition, audience and venue, real events, philosophical /
 * religious concepts), and yield.fromAnnotation synthesizes a HistoricalContext
 * resource per anchor — model writes the body grounded in the gathered
 * context, with the Wikipedia URL woven in via the prompt. Synthesized
 * resources are stamped with 'HistoricalContext', 'Historical', and
 * 'Wikipedia' entity types so `browse.resources({ entityType: 'HistoricalContext' })`
 * finds them.
 *
 * Usage: tsx skills/build-historical-context/script.ts [<workResourceId>] [--interactive]
 */

import {
  SemiontClient,
  entityType,
  resourceId as ridBrand,
  type GatheredContext,
  type ResourceId,
} from '@semiont/sdk';
import { wikipediaSearch } from '../../src/wikipedia.js';
import { confirm, close as closeInteractive } from '../../src/interactive.js';
import { createdCount } from '../../src/mark-result.js';

// mark.assist with motivation 'linking' requires a non-empty entityTypes
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
    const progress = await semiont.mark.assist(rId, 'linking', {
      entityTypes: ANCHOR_ENTITY_TYPES,
      instructions: ANCHOR_INSTRUCTIONS,
    });
    console.log(`  Created ${createdCount(progress)} anchor annotations.`);

    const annotations = await semiont.browse.annotations(rId);
    const anchors = annotations.filter((ann) => {
      if (ann.motivation !== 'linking') return false;
      // Heuristic: anchors are short tagged spans. Skip annotations bound to
      // existing resources (those are likely from prior skills).
      const bodies = Array.isArray(ann.body) ? ann.body : ann.body ? [ann.body] : [];
      return !bodies.some((b: any) => b.type === 'SpecificResource');
    });

    for (const ann of anchors) {
      const target = ann.target;
      const selectors =
        typeof target === 'string' || !target.selector
          ? []
          : Array.isArray(target.selector)
            ? target.selector
            : [target.selector];
      let text = '';
      for (const s of selectors) {
        if (s.type === 'TextQuoteSelector') { text = s.exact; break; }
      }
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
      const gather = await semiont.gather.annotation(rId, ann.id, { contextWindow: 1500 });
      if (!('response' in gather)) continue;
      const context = gather.response as GatheredContext;
      const yieldEvent = await semiont.yield.fromAnnotation(rId, ann.id, {
        title: text,
        storageUri: `file://generated/historical-${slugify(text)}.md`,
        context,
        prompt,
        entityTypes: ['HistoricalContext', 'Historical', 'Wikipedia'],
      });
      if (yieldEvent.kind !== 'complete') {
        console.warn(`  unexpected yield event: ${yieldEvent.kind} for "${text}"`);
        continue;
      }
      const newRId = (yieldEvent.data.result as { resourceId?: string } | undefined)?.resourceId;
      if (!newRId) {
        console.warn(`  yield.fromAnnotation gave no resourceId for "${text}"`);
        continue;
      }
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
