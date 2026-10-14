/**
 * build-character-articles — promote Character mentions to canonical Character resources.
 *
 * Cluster character annotations by canonical text, match each cluster against
 * existing Character resources (including pre-curated articles ingested by
 * skill 1), synthesize new ones with yield.delegate otherwise, bind
 * annotations. The model writes the article body grounded in the gathered
 * context of a sample passage; the Wikipedia URL is woven into an External
 * references section via the prompt. Synthesized resources are stamped with
 * the 'Character' entity type plus any sub-types the source annotations
 * already carried, so `browse.resources({ entityType: 'Character' })` finds
 * them.
 *
 * Usage: tsx skills/build-character-articles/script.ts [--interactive]
 */

import {
  SemiontSession,
  InMemorySessionStorage,
  httpKb,
  getAnnotationExactText,
  getEntityTypes,
  type AnnotationId,
  type ResourceId,
} from '@semiont/sdk';
import { wikipediaSearch } from '../../src/wikipedia.js';
import { confirm, close as closeInteractive } from '../../src/interactive.js';

const MATCH_THRESHOLD = Number(process.env.MATCH_THRESHOLD ?? 30);

const CHARACTER_TYPES = new Set(['Character', 'God', 'Mortal', 'Titan', 'Hero']);

function slugify(text: string): string {
  return text.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

async function main(): Promise<void> {
  const gateway = new URL(process.env.SEMIONT_API_URL ?? 'http://localhost:4000');
  const session = await SemiontSession.signInDevice({
    kb: httpKb({
      id: 'gutenberg-build-character-articles',
      label: 'gutenberg build-character-articles',
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
  const semiont = session.client;

  try {
    const all = (await semiont.browse.resources({ limit: 1000 }).fresh()).resources;
    const passages = all.filter((r) => (r.entityTypes ?? []).some((t) => t === 'LiteraryPassage'));

    type AnnoRef = { rId: ResourceId; annId: AnnotationId; text: string; entityTypes: string[] };
    const characterAnnotations: AnnoRef[] = [];
    for (const r of passages) {
      const rId = r['@id'];
      const annotations = await semiont.browse.annotations(rId).fresh();
      for (const ann of annotations) {
        if (ann.motivation !== 'linking') continue;
        const ets = getEntityTypes(ann);
        const matchedChars = ets.filter((t) => CHARACTER_TYPES.has(t));
        if (matchedChars.length === 0) continue;
        const text = getAnnotationExactText(ann);
        characterAnnotations.push({
          rId,
          annId: ann.id,
          text,
          entityTypes: matchedChars,
        });
      }
    }

    if (characterAnnotations.length === 0) {
      console.log('No character annotations found. Run skills/mark-characters/script.ts first.');
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
      closeInteractive();
      return;
    }

    let bound = 0;
    let synthesized = 0;

    for (const [_, anns] of clusters) {
      const sample = anns[0];
      if (!sample) continue;

      const { response: context } = await semiont.gather.annotation(sample.rId, sample.annId, { contextWindow: 1500 });

      const matchResult = await semiont.match.search(sample.rId, sample.annId, context, {
        limit: 5,
        useSemanticScoring: true,
      });
      const top = matchResult.response[0];

      let targetResourceId: ResourceId;
      if (top && (top.score ?? 0) >= MATCH_THRESHOLD) {
        targetResourceId = top['@id'];
        console.log(`  ↪ "${sample.text}" → ${top.name} (existing, score ${top.score})`);
      } else {
        const wikiUrl = await wikipediaSearch(sample.text);
        const externalRefsLine = wikiUrl
          ? `End with an "## External references" section as a markdown bullet list including: - [${sample.text}](${wikiUrl}) — Wikipedia`
          : 'No Wikipedia URL was found; do not include an External references section.';
        const prompt =
          `Write a wiki-style article about the character "${sample.text}" referenced in this literary corpus. ` +
          `The character is tagged with type(s): ${sample.entityTypes.join(', ')}, and is mentioned in ${anns.length} ` +
          `passage(s) across the corpus. Use the gathered context from the source passage to ground the article. ` +
          `\n\nStructure:\n` +
          `  - Opening definition paragraph (who they are, in one or two sentences).\n` +
          `  - Role in the work (mythological / historical / literary context where applicable).\n` +
          `  - Key actions or attributes evident from the source passages.\n` +
          `  - Relationships hinted at in the source.\n` +
          `\n${externalRefsLine}\n` +
          `Write in a neutral, encyclopedic tone — model on a curated wiki article.`;

        const generated = await semiont.yield.delegate({
          context,
          title: sample.text,
          storageUri: `file://generated/character-${slugify(sample.text)}.md`,
          prompt,
          // Stamp the synthesized resource with 'Character' plus any
          // sub-types the source annotations carried (e.g. 'Hero', 'Villain'
          // when the upstream tagging pass identified them). De-duplicated
          // because 'Character' may already be in the cluster's source tags.
          entityTypes: Array.from(new Set(['Character', ...sample.entityTypes])),
        });
        if (!generated.result || !('resourceId' in generated.result)) {
          console.warn(`  the generation made no resource for "${sample.text}"`);
          continue;
        }
        const newRId = generated.result.resourceId;
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
      `\nDone. Bound ${bound} annotations across ${clusters.size} character clusters; ${synthesized} new Character resources synthesized.`,
    );
    closeInteractive();
  } finally {
    await session.dispose();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
