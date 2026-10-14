/**
 * comment-subtext — annotate inner thoughts, subtext, and plot-significance
 * markers in literary passages.
 *
 * Single mark.delegate with motivation 'commenting'. Captures what characters
 * aren't saying out loud, dramatic irony, foreshadowing, and small actions
 * that move the plot forward.
 *
 * Usage: tsx skills/comment-subtext/script.ts [<resourceId>] [--interactive]
 */

import { SemiontSession, InMemorySessionStorage, httpKb, resourceId as ridBrand, type ResourceId } from '@semiont/sdk';
import { confirm, close as closeInteractive } from '../../src/interactive.js';

const DEFAULT_INSTRUCTIONS = `
For each substantive passage, where appropriate, add a commenting annotation that captures one of:
  - The inner thought or unspoken motivation of a speaking character
  - The subtext beneath what's literally said (irony, evasion, threat couched as politeness)
  - How a small action or line moves the plot forward (foreshadowing, complication, revelation)
Quote the relevant line and write the comment in the voice of an attentive reader.
`.trim();

const INSTRUCTIONS = process.env.COMMENT_INSTRUCTIONS ?? DEFAULT_INSTRUCTIONS;

async function main(): Promise<void> {
  const args = process.argv.slice(2).filter((a) => !a.startsWith('-'));
  const explicitResourceId = args[0];

  const gateway = new URL(process.env.SEMIONT_API_URL ?? 'http://localhost:4000');
  const session = await SemiontSession.signInDevice({
    kb: httpKb({
      id: 'gutenberg-comment-subtext',
      label: 'gutenberg comment-subtext',
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

    console.log(`Will run mark.delegate (motivation: commenting) against ${targets.length} passage(s).`);
    const proceed = await confirm('Proceed?', true);
    if (!proceed) {
      console.log('Aborted.');
      closeInteractive();
      return;
    }

    let totalCreated = 0;
    for (const rId of targets) {
      const done = await semiont.mark.delegate(rId, { motivation: 'commenting', instructions: INSTRUCTIONS });
      const n = done.result && 'persisted' in done.result ? done.result.persisted : 0;
      totalCreated += n;
      console.log(`  ${rId}: ${n} subtext comments added`);
    }

    console.log(`\nDone. Added ${totalCreated} subtext / inner-thought / plot-significance comments.`);
    closeInteractive();
  } finally {
    await session.dispose();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
