/**
 * assess-dangerous-situations — flag spans of physical / moral / supernatural
 * danger in the literary corpus.
 *
 * Single mark.assist with motivation 'assessing'. Used by trace-plot-arc
 * (skill 11) as peak-danger landmarks.
 *
 * Usage: tsx skills/assess-dangerous-situations/script.ts [<resourceId>] [--interactive]
 */

import { SemiontClient, resourceId as ridBrand, type ResourceId } from '@semiont/sdk';
import { confirm, close as closeInteractive } from '../../src/interactive.js';

const DEFAULT_INSTRUCTIONS =
  'Identify and tag situations of physical danger, moral peril, threats of violence, ' +
  'supernatural punishment, or imminent harm to characters. Quote the language ' +
  'that establishes the danger.';

const INSTRUCTIONS = process.env.ASSESS_INSTRUCTIONS ?? DEFAULT_INSTRUCTIONS;

async function main(): Promise<void> {
  const args = process.argv.slice(2).filter((a) => !a.startsWith('-'));
  const explicitResourceId = args[0];

  const semiont = await SemiontClient.signInHttp({
    baseUrl: process.env.SEMIONT_API_URL ?? 'http://localhost:4000',
    email: process.env.SEMIONT_USER_EMAIL!,
    password: process.env.SEMIONT_USER_PASSWORD!,
  });

  let targets: ResourceId[];
  if (explicitResourceId) {
    targets = [ridBrand(explicitResourceId)];
  } else {
    const all = await semiont.browse.resources({ limit: 1000 });
    targets = all
      .filter((r) => (r.entityTypes ?? []).some((t) => t === 'LiteraryPassage'))
      .map((r) => ridBrand(r['@id']));
  }

  if (targets.length === 0) {
    console.log('No LiteraryPassage resources found.');
    semiont.dispose();
    closeInteractive();
    return;
  }

  console.log(`Will run mark.assist (motivation: assessing) against ${targets.length} passage(s).`);
  const proceed = await confirm('Proceed?', true);
  if (!proceed) {
    console.log('Aborted.');
    semiont.dispose();
    closeInteractive();
    return;
  }

  let totalCreated = 0;
  for (const rId of targets) {
    const progress = await semiont.mark.assist(rId, 'assessing', { instructions: INSTRUCTIONS });
    const n = progress.progress?.createdCount ?? 0;
    totalCreated += n;
    console.log(`  ${rId}: ${n} dangerous-situation flags`);
  }

  console.log(`\nDone. Flagged ${totalCreated} dangerous situations.`);
  semiont.dispose();
  closeInteractive();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
