/**
 * extract-themes — discover recurring thematic concerns and synthesize one
 * Theme resource per distinct theme.
 *
 * Two-pass: discovery + aggregation.
 *
 *   Pass 1 — mark.assist with motivation 'linking' and a single generic
 *   entity type 'Theme'. The instructions ask the model to mark every
 *   thematically-significant span and include the specific hyphenated theme
 *   name as a tagging-purpose body value (e.g. 'hubris', 'fate-vs-free-will',
 *   'divine-cruelty'). This is the *vocabulary classification* shape — the
 *   theme labels are an open per-corpus enum, not a registered structural
 *   schema. After the run, the discovered theme labels get published via
 *   frame.addEntityTypes so browse.entityTypes() surfaces them as part of
 *   the KB's vocabulary.
 *
 *   Pass 2 — walk every linking annotation, extract the discovered theme
 *   labels (the tagging body values that aren't the umbrella 'Theme' tag),
 *   group by label, synthesize one Theme resource per distinct label.
 *
 * Why not motivation 'tagging'? Tagging requires a registered schemaId from
 * packages/ontology/src/tag-schemas.ts — appropriate for IRAC / IMRAD /
 * Toulmin (broadly-applicable structural-analysis frameworks). Open-
 * vocabulary themes are a per-corpus enum and don't deserve a registered
 * schema; the linking shape is the right fit.
 *
 * Usage: tsx skills/extract-themes/script.ts [--interactive]
 */

import { SemiontClient, entityType, resourceId as ridBrand, type ResourceId } from '@semiont/sdk';
import { confirm, close as closeInteractive } from '../../src/interactive.js';
import { createdCount } from '../../src/mark-result.js';

const DEFAULT_INSTRUCTIONS =
  'Mark every passage that exemplifies a recurring thematic concern of the work. ' +
  'For each marked span, attach the specific theme as a hyphenated phrase via a ' +
  'tagging-purpose body value (e.g. "hubris", "fate-vs-free-will", "fire-as-civilization", ' +
  '"divine-cruelty"). The same theme may apply to many passages; mark each. The umbrella ' +
  '"Theme" entity-type tag is added automatically — do not duplicate it as a tagging value.';

const INSTRUCTIONS = process.env.THEME_INSTRUCTIONS ?? DEFAULT_INSTRUCTIONS;
const UMBRELLA_THEME_TAG = 'Theme';

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

  if (passages.length === 0) {
    console.log('No LiteraryPassage resources found.');
    semiont.dispose();
    closeInteractive();
    return;
  }

  console.log(
    `Will run mark.assist (motivation: linking, entityTypes: ['${UMBRELLA_THEME_TAG}']) ` +
      `against ${passages.length} passage(s) for theme discovery.`,
  );
  const proceed = await confirm('Proceed?', true);
  if (!proceed) {
    console.log('Aborted.');
    semiont.dispose();
    closeInteractive();
    return;
  }

  // Pass 1: discovery — mark thematic spans as Theme-typed linking annotations,
  // with discovered theme labels as tagging-purpose body values.
  for (const r of passages) {
    const rId = ridBrand(r['@id']);
    const progress = await semiont.mark.assist(rId, 'linking', {
      entityTypes: [entityType(UMBRELLA_THEME_TAG)],
      instructions: INSTRUCTIONS,
    });
    const n = createdCount(progress);
    console.log(`  ${rId}: ${n} thematic spans`);
  }

  // Pass 2: aggregate by discovered theme label.
  console.log('\nAggregating by discovered theme label...');
  const themesByLabel = new Map<string, Array<{ rId: ResourceId; rName: string; text: string }>>();

  for (const r of passages) {
    const rId = ridBrand(r['@id']);
    const annotations = await semiont.browse.annotations(rId);
    for (const ann of annotations) {
      if (ann.motivation !== 'linking') continue;
      const bodies = Array.isArray(ann.body) ? ann.body : ann.body ? [ann.body] : [];
      const tagValues = bodies
        .filter((b: any) => b.type === 'TextualBody' && b.purpose === 'tagging')
        .flatMap((b: any) => (Array.isArray(b.value) ? b.value : [b.value]))
        // Keep only the discovered theme labels — drop the umbrella 'Theme' entity-type tag.
        .filter((v: string) => v && v !== UMBRELLA_THEME_TAG);

      // Only annotations that *also* carry the umbrella 'Theme' tag are theme spans
      // (this filters out other linking annotations the corpus may have).
      const carriesUmbrella = bodies.some(
        (b: any) =>
          b.type === 'TextualBody' &&
          b.purpose === 'tagging' &&
          (Array.isArray(b.value) ? b.value : [b.value]).includes(UMBRELLA_THEME_TAG),
      );
      if (!carriesUmbrella) continue;

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
      for (const label of tagValues) {
        if (!themesByLabel.has(label)) themesByLabel.set(label, []);
        themesByLabel.get(label)!.push({ rId, rName: r.name ?? r['@id'], text });
      }
    }
  }

  console.log(`Found ${themesByLabel.size} distinct theme label(s) across the corpus.`);

  // Publish the discovered theme vocabulary via frame so browse.entityTypes() sees it.
  if (themesByLabel.size > 0) {
    const discovered = Array.from(themesByLabel.keys());
    console.log(`Declaring ${discovered.length} discovered theme labels via frame...`);
    await semiont.frame.addEntityTypes(discovered);
  }

  let synthesized = 0;
  for (const [label, examples] of themesByLabel) {
    const lines = [
      `# ${label.replace(/-/g, ' ')}`,
      '',
      `Recurring theme exemplified across ${examples.length} passage(s) in the corpus.`,
      '',
      '## Examples',
      '',
    ];
    for (const ex of examples.slice(0, 25)) {
      lines.push(`- *In ${ex.rName}*: "${ex.text}"`);
    }
    if (examples.length > 25) lines.push(`- … and ${examples.length - 25} more.`);
    const body = lines.join('\n') + '\n';

    const { resourceId } = await semiont.yield.resource({
      name: `Theme: ${label}`,
      file: Buffer.from(body, 'utf-8'),
      format: 'text/markdown',
      entityTypes: ['Theme', label],
      storageUri: `file://generated/theme-${slugify(label)}.md`,
    });
    synthesized++;
    console.log(`  + ${label} → ${resourceId} (${examples.length} examples)`);
  }

  console.log(
    `\nDone. Synthesized ${synthesized} Theme resources from ${themesByLabel.size} distinct theme labels.`,
  );
  semiont.dispose();
  closeInteractive();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
