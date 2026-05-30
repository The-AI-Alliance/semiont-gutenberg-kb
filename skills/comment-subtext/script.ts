/**
 * comment-subtext — annotate inner thoughts, subtext, and plot-significance
 * markers in literary passages.
 *
 * Single mark.assist with motivation 'commenting'. Captures what characters
 * aren't saying out loud, dramatic irony, foreshadowing, and small actions
 * that move the plot forward.
 *
 * Usage: tsx skills/comment-subtext/script.ts [<resourceId>] [--interactive]
 */

import { SemiontSession, InMemorySessionStorage, resourceId as ridBrand, type KnowledgeBase, type ResourceId } from '@semiont/sdk';
import { confirm, close as closeInteractive } from '../../src/interactive.js';
import { createdCount } from '../../src/mark-result.js';

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

  const baseUrl = process.env.SEMIONT_API_URL ?? 'http://localhost:4000';
  const email = process.env.SEMIONT_USER_EMAIL!;
  const password = process.env.SEMIONT_USER_PASSWORD!;
  const u = new URL(baseUrl);
  const kb: KnowledgeBase = {
    id: 'gutenberg-comment-subtext',
    label: 'gutenberg comment-subtext',
    email,
    endpoint: { kind: 'http', host: u.hostname, port: Number(u.port) || 4000, protocol: u.protocol.replace(':', '') as 'http' | 'https' },
  };
  const session = await SemiontSession.signInHttp({ kb, storage: new InMemorySessionStorage(), baseUrl, email, password });
  const semiont = session.client;

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
    await session.dispose();
    closeInteractive();
    return;
  }

  console.log(`Will run mark.assist (motivation: commenting) against ${targets.length} passage(s).`);
  const proceed = await confirm('Proceed?', true);
  if (!proceed) {
    console.log('Aborted.');
    await session.dispose();
    closeInteractive();
    return;
  }

  let totalCreated = 0;
  for (const rId of targets) {
    const progress = await semiont.mark.assist(rId, 'commenting', { instructions: INSTRUCTIONS });
    const n = createdCount(progress);
    totalCreated += n;
    console.log(`  ${rId}: ${n} subtext comments added`);
  }

  console.log(`\nDone. Added ${totalCreated} subtext / inner-thought / plot-significance comments.`);
  await session.dispose();
  closeInteractive();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
