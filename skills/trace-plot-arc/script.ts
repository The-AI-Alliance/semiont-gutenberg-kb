/**
 * trace-plot-arc — synthesize a per-work PlotArc resource documenting
 * narrative structure (inciting incident, rising action, climax, denouement).
 *
 * Aggregates the prior layers' work for one work:
 *   - LiteraryPassage section structure (skill 1)
 *   - assess-dangerous-situations flags (skill 4) → peak-danger landmarks
 *   - comment-subtext annotations (skill 5) → plot-significance markers
 *   - bound HistoricalContext / Place / Theme resources (skills 6, 7, 9, 10)
 *
 * Yields a PlotArc resource with markdown content structured as an
 * annotated arc, with bindings back to source passages.
 *
 * Usage: tsx skills/trace-plot-arc/script.ts [<workNamePattern>] [--interactive]
 */

import { SemiontClient, resourceId as ridBrand, type ResourceId } from '@semiont/sdk';
import { confirm, close as closeInteractive } from '../../src/interactive.js';

const PLOT_FRAMEWORK = process.env.PLOT_FRAMEWORK ?? 'auto';

interface PassageRow {
  rId: ResourceId;
  name: string;
  dangerCount: number;
  subtextCount: number;
  /** Resource IDs the passage's linking annotations are bound to. */
  boundRefs: string[];
}

function slugify(text: string): string {
  return text.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

async function main(): Promise<void> {
  const args = process.argv.slice(2).filter((a) => !a.startsWith('-'));
  const workPattern = args[0]?.toLowerCase();

  const semiont = await SemiontClient.signInHttp({
    baseUrl: process.env.SEMIONT_API_URL ?? 'http://localhost:4000',
    email: process.env.SEMIONT_USER_EMAIL!,
    password: process.env.SEMIONT_USER_PASSWORD!,
  });

  const all = await semiont.browse.resources({ limit: 1000 });
  let passages = all.filter((r) => (r.entityTypes ?? []).some((t) => t === 'LiteraryPassage'));

  if (workPattern) {
    passages = passages.filter((r) => (r.name ?? '').toLowerCase().includes(workPattern));
    console.log(`Filtered to ${passages.length} passages matching "${workPattern}".`);
  }

  if (passages.length === 0) {
    console.log('No LiteraryPassage resources found.');
    semiont.dispose();
    closeInteractive();
    return;
  }

  const rows: PassageRow[] = [];
  for (const r of passages) {
    const rId = ridBrand(r['@id']);
    const annotations = await semiont.browse.annotations(rId);
    let dangerCount = 0;
    let subtextCount = 0;
    const boundRefs: string[] = [];
    for (const ann of annotations) {
      if (ann.motivation === 'assessing') dangerCount++;
      if (ann.motivation === 'commenting') subtextCount++;
      const bodies = Array.isArray(ann.body) ? ann.body : ann.body ? [ann.body] : [];
      const refs = bodies
        .filter((b: any) => b.type === 'SpecificResource')
        .map((b: any) => b.source);
      boundRefs.push(...refs);
    }
    rows.push({ rId, name: r.name ?? r['@id'], dangerCount, subtextCount, boundRefs });
  }

  // Order by name (assumes section files are named in narrative order, e.g.
  // Argument, Dramatis Personae, Prologos, Parodos, Episode 1, ..., Exodos).
  rows.sort((a, b) => a.name.localeCompare(b.name));

  console.log(`\nWill compose a PlotArc resource for ${rows.length} passage(s).`);
  console.log(`Framework: ${PLOT_FRAMEWORK}`);

  const proceed = await confirm('Proceed?', true);
  if (!proceed) {
    console.log('Aborted.');
    semiont.dispose();
    closeInteractive();
    return;
  }

  // Identify candidate inciting incident, climax, etc., from the danger-flag
  // distribution. The peak-danger passage is the climax candidate; the first
  // passage with non-zero danger is the inciting-incident candidate.
  const dangerOrdered = [...rows].sort((a, b) => b.dangerCount - a.dangerCount);
  const climaxRow = dangerOrdered[0];
  const incitingRow = rows.find((r) => r.dangerCount > 0) ?? rows[0];
  const denouementRow = rows[rows.length - 1];
  if (!climaxRow || !incitingRow || !denouementRow) {
    console.error('Not enough passages to identify plot landmarks.');
    semiont.dispose();
    closeInteractive();
    return;
  }

  // Compose the markdown arc
  const lines: string[] = [
    `# Plot Arc: ${rows[0]?.name ?? 'Work'} → ${rows[rows.length - 1]?.name ?? ''}`,
    '',
    `Auto-generated narrative-structure synthesis across ${rows.length} passage(s). ` +
      `Framework: ${PLOT_FRAMEWORK === 'auto' ? 'automatic (passages ordered by name; landmarks chosen by danger-flag distribution)' : PLOT_FRAMEWORK}.`,
    '',
    '---',
    '',
    '## Passage map',
    '',
    '| # | Passage | Danger flags | Subtext comments | Bound refs |',
    '|---|---|---|---|---|',
  ];

  rows.forEach((r, i) => {
    lines.push(
      `| ${i + 1} | ${r.name} | ${r.dangerCount} | ${r.subtextCount} | ${r.boundRefs.length} |`,
    );
  });

  lines.push(
    '',
    '## Narrative landmarks',
    '',
    `- **Inciting incident** (first danger flag): *${incitingRow.name}* — ${incitingRow.dangerCount} danger flag(s), ${incitingRow.subtextCount} subtext comment(s).`,
    `- **Climax** (peak danger): *${climaxRow.name}* — ${climaxRow.dangerCount} danger flag(s).`,
    `- **Denouement** (final passage): *${denouementRow.name}*.`,
    '',
    '## Notes on form',
    '',
    'This auto-trace orders passages alphabetically by name (the typical Project Gutenberg ' +
      'section convention puts them in narrative order — Argument, Dramatis Personae, Prologos, ' +
      'Parodos, Episode 1, etc. — but a real corpus may need explicit ordering).',
    '',
    'Landmark identification is heuristic, based on the distribution of danger and subtext ' +
      'annotations. For a richer reading, hand-edit the resulting PlotArc resource — or refine ' +
      'the source bio passages and rerun.',
    '',
    '---',
    '',
    '*This arc was synthesized by the `trace-plot-arc` skill. The danger flags come from ' +
      '`assess-dangerous-situations` (skill 4); the subtext comments from `comment-subtext` (skill 5).*',
  );

  const body = lines.join('\n') + '\n';
  const workTitle = workPattern || rows[0]?.name?.split(' ')[0] || 'work';

  const { resourceId } = await semiont.yield.resource({
    name: `Plot Arc: ${workTitle}`,
    file: Buffer.from(body, 'utf-8'),
    format: 'text/markdown',
    entityTypes: ['PlotArc', 'Aggregate'],
    storageUri: `file://generated/plotarc-${slugify(workTitle)}.md`,
  });

  console.log(`\nPlotArc resource created: ${resourceId} (${body.length} bytes)`);
  semiont.dispose();
  closeInteractive();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
