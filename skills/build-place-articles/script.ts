/**
 * build-place-articles — promote Place mentions to canonical Place resources.
 *
 * Cluster place annotations by canonical text, match each cluster against
 * existing Place resources (including pre-curated articles ingested by skill 1),
 * synthesize new ones with yield.fromAnnotation otherwise, bind annotations.
 * The model writes the article body grounded in the gathered context; the
 * Wikipedia URL is woven into an External references section via the prompt.
 * Synthesized resources are stamped with 'Place' plus any sub-types the
 * source annotations already carried, so `browse.resources({ entityType: 'Place' })`
 * finds them.
 *
 * Usage: tsx skills/build-place-articles/script.ts [--interactive]
 */

import {
  SemiontClient,
  resourceId as ridBrand,
  type AnnotationId,
  type GatheredContext,
  type ResourceId,
} from '@semiont/sdk';
import { wikipediaSearch } from '../../src/wikipedia.js';
import { confirm, close as closeInteractive } from '../../src/interactive.js';

const MATCH_THRESHOLD = Number(process.env.MATCH_THRESHOLD ?? 30);

const PLACE_TYPES = new Set(['Place', 'Mountain', 'Sea', 'City', 'Realm', 'MythologicalPlace']);

function slugify(text: string): string {
  return text.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

async function main(): Promise<void> {
  const semiont = await SemiontClient.signInHttp({
    baseUrl: process.env.SEMIONT_API_URL ?? 'http://localhost:4000',
    email: process.env.SEMIONT_USER_EMAIL!,
    password: process.env.SEMIONT_USER_PASSWORD!,
  });

  const all = await semiont.browse.resources({ limit: 1000 });
  const passages = all.filter((r) => (r.entityTypes ?? []).some((t) => t === 'LiteraryPassage'));

  type AnnoRef = { rId: ResourceId; annId: AnnotationId; text: string; entityTypes: string[] };
  const placeAnnotations: AnnoRef[] = [];
  for (const r of passages) {
    const rId = ridBrand(r['@id']);
    const annotations = await semiont.browse.annotations(rId);
    for (const ann of annotations) {
      if (ann.motivation !== 'linking') continue;
      const bodies = Array.isArray(ann.body) ? ann.body : ann.body ? [ann.body] : [];
      const ets = bodies
        .filter((b: any) => b.type === 'TextualBody' && b.purpose === 'tagging')
        .flatMap((b: any) => Array.isArray(b.value) ? b.value : [b.value]);
      const matchedPlaces = ets.filter((t: string) => PLACE_TYPES.has(t));
      if (matchedPlaces.length === 0) continue;
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
      placeAnnotations.push({
        rId,
        annId: ann.id,
        text,
        entityTypes: matchedPlaces,
      });
    }
  }

  if (placeAnnotations.length === 0) {
    console.log('No place annotations found. Run skills/mark-places/script.ts first.');
    semiont.dispose();
    closeInteractive();
    return;
  }

  const clusters = new Map<string, AnnoRef[]>();
  for (const a of placeAnnotations) {
    const key = a.text.toLowerCase().trim();
    if (!clusters.has(key)) clusters.set(key, []);
    clusters.get(key)!.push(a);
  }

  console.log(
    `Found ${placeAnnotations.length} place annotations, ` +
      `clustered into ${clusters.size} distinct places.`,
  );

  const proceed = await confirm('Proceed?', true);
  if (!proceed) {
    console.log('Aborted.');
    semiont.dispose();
    closeInteractive();
    return;
  }

  let bound = 0;
  let synthesized = 0;

  for (const [_, anns] of clusters) {
    const sample = anns[0];
    if (!sample) continue;

    const gather = await semiont.gather.annotation(sample.rId, sample.annId, { contextWindow: 1500 });
    if (!('response' in gather)) continue;
    const context = gather.response as GatheredContext;

    const matchResult = await semiont.match.search(sample.rId, sample.annId, context, {
      limit: 5,
      useSemanticScoring: true,
    });
    const top = matchResult.response[0];

    let targetResourceId: string;
    if (top && (top.score ?? 0) >= MATCH_THRESHOLD) {
      targetResourceId = top['@id'];
      console.log(`  ↪ "${sample.text}" → ${top.name} (existing, score ${top.score})`);
    } else {
      const wikiUrl = await wikipediaSearch(sample.text);
      const externalRefsLine = wikiUrl
        ? `End with an "## External references" section as a markdown bullet list including: - [${sample.text}](${wikiUrl}) — Wikipedia`
        : 'No Wikipedia URL was found; do not include an External references section.';
      const prompt =
        `Write a wiki-style article about the place "${sample.text}" referenced in this literary corpus. ` +
        `The place is tagged with type(s): ${sample.entityTypes.join(', ')}, and is mentioned in ${anns.length} ` +
        `passage(s) across the corpus. Use the gathered context from the source passage to ground the article.` +
        `\n\nStructure:\n` +
        `  - Opening definition paragraph (what kind of place it is, in one or two sentences).\n` +
        `  - Cosmological / geographical role (where it sits in the work's setting).\n` +
        `  - Significance in the narrative (what happens there, who is associated with it).\n` +
        `\n${externalRefsLine}\n` +
        `Write in a neutral, encyclopedic tone — model on a curated wiki article.`;

      const yieldEvent = await semiont.yield.fromAnnotation(sample.rId, sample.annId, {
        title: sample.text,
        storageUri: `file://generated/place-${slugify(sample.text)}.md`,
        context,
        prompt,
        // Stamp the synthesized resource with 'Place' plus any sub-types
        // the source annotations carried. De-duplicated.
        entityTypes: Array.from(new Set(['Place', ...sample.entityTypes])),
      });
      if (yieldEvent.kind !== 'complete') {
        console.warn(`  unexpected yield event: ${yieldEvent.kind} for "${sample.text}"`);
        continue;
      }
      const newRId = (yieldEvent.data.result as { resourceId?: string } | undefined)?.resourceId;
      if (!newRId) {
        console.warn(`  yield.fromAnnotation gave no resourceId for "${sample.text}"`);
        continue;
      }
      targetResourceId = newRId;
      synthesized++;
      console.log(`  + "${sample.text}" → ${newRId} (synthesized${wikiUrl ? `, Wikipedia: ${wikiUrl}` : ''})`);
    }

    for (const a of anns) {
      await semiont.bind.body(a.rId, a.annId, [
        {
          op: 'add',
          item: { type: 'SpecificResource', source: targetResourceId, purpose: 'linking' },
        },
      ]);
      bound++;
    }
  }

  console.log(
    `\nDone. Bound ${bound} annotations across ${clusters.size} place clusters; ${synthesized} new Place resources synthesized.`,
  );
  semiont.dispose();
  closeInteractive();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
