/**
 * mark-places — detect Place mentions across literary passages.
 *
 * Single mark.assist with motivation 'linking' scoped to place-related
 * entity types.
 *
 * Usage: tsx skills/mark-places/script.ts [<resourceId>] [--interactive]
 */

import { SemiontSession, InMemorySessionStorage, entityType, resourceId as ridBrand, type KnowledgeBase, type ResourceId } from '@semiont/sdk';
import { confirm, close as closeInteractive } from '../../src/interactive.js';
import { createdCount } from '../../src/mark-result.js';

const ENTITY_TYPES = (
  process.env.ENTITY_TYPES ?? 'Place,Mountain,Sea,City,Realm,MythologicalPlace'
)
  .split(',')
  .map((t) => entityType(t.trim()));

async function main(): Promise<void> {
  const args = process.argv.slice(2).filter((a) => !a.startsWith('-'));
  const explicitResourceId = args[0];

  const baseUrl = process.env.SEMIONT_API_URL ?? 'http://localhost:4000';
  const email = process.env.SEMIONT_USER_EMAIL!;
  const password = process.env.SEMIONT_USER_PASSWORD!;
  const u = new URL(baseUrl);
  const kb: KnowledgeBase = {
    id: 'gutenberg-mark-places',
    label: 'gutenberg mark-places',
    email,
    endpoint: { kind: 'http', host: u.hostname, port: Number(u.port) || 4000, protocol: u.protocol.replace(':', '') as 'http' | 'https' },
  };
  const session = await SemiontSession.signInHttp({ kb, storage: new InMemorySessionStorage(), baseUrl, email, password });
  const semiont = session.client;

  try {
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
      closeInteractive();
      return;
    }

    console.log(
      `Will run mark.assist (motivation: linking, ${ENTITY_TYPES.length} place types) ` +
        `against ${targets.length} passage(s).`,
    );

    const proceed = await confirm('Proceed?', true);
    if (!proceed) {
      console.log('Aborted.');
      closeInteractive();
      return;
    }

    let totalCreated = 0;
    for (const rId of targets) {
      const progress = await semiont.mark.assist(rId, 'linking', { entityTypes: ENTITY_TYPES });
      const n = createdCount(progress);
      totalCreated += n;
      console.log(`  ${rId}: ${n} new annotations`);
    }

    console.log(`\nDone. Created ${totalCreated} place-reference annotations.`);
    closeInteractive();
  } finally {
    await session.dispose();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
