/**
 * build-character-articles — promote Character mentions to canonical Character resources.
 *
 * Cluster character annotations by canonical text, match each cluster against
 * existing Character resources (including pre-curated articles ingested by
 * skill 1), synthesize new ones with Wikipedia citations otherwise, bind
 * annotations.
 *
 * Usage: tsx skills/build-character-articles/script.ts [--interactive]
 */

import {
  SemiontClient,
  resourceId as ridBrand,
  type AnnotationId,
  type GatheredContext,
  type ResourceId,
} from '@semiont/sdk';
import { wikipediaSearch, formatExternalReferences } from '../../src/wikipedia.js';
import { confirm, close as closeInteractive } from '../../src/interactive.js';

const MATCH_THRESHOLD = Number(process.env.MATCH_THRESHOLD ?? 30);

const CHARACTER_TYPES = new Set(['Character', 'God', 'Mortal', 'Titan', 'Hero']);

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
  const characterAnnotations: AnnoRef[] = [];
  for (const r of passages) {
    const rId = ridBrand(r['@id']);
    const annotations = await semiont.browse.annotations(rId);
    for (const ann of annotations) {
      if (ann.motivation !== 'linking') continue;
      const ets = (ann.body ?? [])
        .filter((b: any) => b.type === 'TextualBody' && b.purpose === 'tagging')
        .flatMap((b: any) => Array.isArray(b.value) ? b.value : [b.value]);
      const matchedChars = ets.filter((t: string) => CHARACTER_TYPES.has(t));
      if (matchedChars.length === 0) continue;
      characterAnnotations.push({
        rId,
        annId: ann.id,
        text: ann.target?.selector?.exact ?? '',
        entityTypes: matchedChars,
      });
    }
  }

  if (characterAnnotations.length === 0) {
    console.log('No character annotations found. Run skills/mark-characters/script.ts first.');
    semiont.dispose();
    closeInteractive();
    return;
  }

  const clusters = new Map<string, AnnoRef[]>();
  for (const a of characterAnnotations) {
    const key = a.text.toLowerCase().trim();
    if (!clusters.has(key)) clusters.set(key, []);
    clusters.get(key)!.push(a);
  }

  console.log(
    `Found ${characterAnnotations.length} character annotations, ` +
      `clustered into ${clusters.size} distinct characters.`,
  );

  const proceed = await confirm(
    'Proceed to match each cluster against existing Character resources, synthesize new ones with Wikipedia citations where needed, and bind annotations?',
    true,
  );
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

    const gather = await semiont.gather.annotation(sample.annId, sample.rId, { contextWindow: 1500 });
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
      const externalRefs = wikiUrl
        ? formatExternalReferences([{ term: sample.text, url: wikiUrl }])
        : '';
      const body =
        `# ${sample.text}\n\n` +
        `Character referenced in this corpus. Generated stub — replace with curated content as desired.\n\n` +
        `**Type(s):** ${sample.entityTypes.join(', ')}\n\n` +
        `Mentioned in ${anns.length} passage(s) across the corpus.\n\n` +
        externalRefs;

      const { resourceId: newRId } = await semiont.yield.resource({
        name: sample.text,
        file: Buffer.from(body, 'utf-8'),
        format: 'text/markdown',
        entityTypes: ['Character', ...sample.entityTypes],
        storageUri: `file://generated/character-${slugify(sample.text)}.md`,
      });
      targetResourceId = newRId as unknown as string;
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
    `\nDone. Bound ${bound} annotations across ${clusters.size} character clusters; ${synthesized} new Character resources synthesized.`,
  );
  semiont.dispose();
  closeInteractive();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
