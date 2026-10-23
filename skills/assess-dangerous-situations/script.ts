/**
 * assess-dangerous-situations — flag spans of physical / moral / supernatural
 * danger in the literary corpus.
 *
 * Single mark.delegate with motivation 'assessing'. Used by trace-plot-arc
 * (skill 11) as peak-danger landmarks.
 *
 * Usage: tsx skills/assess-dangerous-situations/script.ts [<resourceId>] [--interactive]
 */

import { SemiontSession, InMemorySessionStorage, httpKb, resourceId as ridBrand, type ResourceId } from '@semiont/sdk';
import { confirm, close as closeInteractive } from '../../src/interactive.js';

const DEFAULT_INSTRUCTIONS =
  'Identify and tag situations of physical danger, moral peril, threats of violence, ' +
  'supernatural punishment, or imminent harm to characters. Quote the language ' +
  'that establishes the danger.';

const INSTRUCTIONS = process.env.ASSESS_INSTRUCTIONS ?? DEFAULT_INSTRUCTIONS;

async function main(): Promise<void> {
  const args = process.argv.slice(2).filter((a) => !a.startsWith('-'));
  const explicitResourceId = args[0];

  const gateway = new URL(process.env.SEMIONT_API_URL ?? 'http://localhost:4000');
  const opened = await SemiontSession.signInDevice({
    kb: httpKb({
      id: 'gutenberg-assess-dangerous-situations',
      label: 'gutenberg assess-dangerous-situations',
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
    let targets: ResourceId[];
    if (explicitResourceId) {
      targets = [ridBrand(explicitResourceId)];
    } else {
      const all = (await semiont.browse.resources({ limit: 1000 }).fresh()).resources;
      targets = all
        .filter((r) => (r.entityTypes ?? []).some((t) => t === 'LiteraryPassage'))
        .map((r) => r['@id']);
    }

    if (targets.length === 0) {
      console.log('No LiteraryPassage resources found.');
      closeInteractive();
      return;
    }

    console.log(`Will run mark.delegate (motivation: assessing) against ${targets.length} passage(s).`);
    const proceed = await confirm('Proceed?', true);
    if (!proceed) {
      console.log('Aborted.');
      closeInteractive();
      return;
    }

    let totalCreated = 0;
    for (const rId of targets) {
      const done = await semiont.mark.delegate(rId, { motivation: 'assessing', instructions: INSTRUCTIONS });
      const n = done.result && 'persisted' in done.result ? done.result.persisted : 0;
      totalCreated += n;
      console.log(`  ${rId}: ${n} dangerous-situation flags`);
    }

    console.log(`\nDone. Flagged ${totalCreated} dangerous situations.`);
    closeInteractive();
  } finally {
    opened.dispose();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
