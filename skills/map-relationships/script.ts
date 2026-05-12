/**
 * map-relationships — extract character-character + character-place relationships.
 *
 * Runs a relationship-extraction pass via mark.assist over each LiteraryPassage,
 * tagging spans where a relationship between named characters (or character ↔ place)
 * is established. Each detected relationship becomes a tagged linking annotation
 * with a vocabulary value naming the relationship type.
 *
 * (Character / Place promotion is done by skills 6 / 7 — this skill is the
 * edge-extraction layer that runs after the node set exists.)
 *
 * Usage: tsx skills/map-relationships/script.ts [<resourceId>] [--interactive]
 */

import { SemiontClient, entityType, resourceId as ridBrand, type ResourceId } from '@semiont/sdk';
import { confirm, close as closeInteractive } from '../../src/interactive.js';
import { createdCount } from '../../src/mark-result.js';

// mark.assist with motivation 'linking' requires a non-empty entityTypes
// array (SDK validation). Relationship passes scope to Character (and
// Place for char-place edges). Override via RELATIONSHIP_ENTITY_TYPES.
const CHAR_CHAR_ENTITY_TYPES = (
  process.env.RELATIONSHIP_ENTITY_TYPES ?? 'Character'
)
  .split(',')
  .map((t) => entityType(t.trim()));
const CHAR_PLACE_ENTITY_TYPES = (
  process.env.RELATIONSHIP_ENTITY_TYPES ?? 'Character,Place'
)
  .split(',')
  .map((t) => entityType(t.trim()));

const CHAR_CHAR_INSTRUCTIONS = `
For pairs of named characters in this passage, identify any explicit relationship:
  - kinship (mother, son, brother, sister, spouse)
  - patronage (god/mortal, patron/client)
  - antagonism, alliance
  - captor/captive
Tag the span where the relationship is established. Use a single tag value naming
the relationship type, e.g. 'kinship', 'patronage', 'antagonism', 'captor'.
`.trim();

const CHAR_PLACE_INSTRUCTIONS = `
For each named character associated with a named place, tag the span where the
association is established. Use a single tag value naming the association type,
e.g. 'imprisoned-at', 'born-in', 'rules-over', 'exiled-to', 'dwells-in'.
`.trim();

const RUN_CHAR_CHAR = process.env.SKIP_CHAR_CHAR !== '1';
const RUN_CHAR_PLACE = process.env.SKIP_CHAR_PLACE !== '1';

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

  console.log(
    `Will run relationship-extraction passes against ${targets.length} passage(s):` +
      `${RUN_CHAR_CHAR ? '\n  - character ↔ character' : ''}` +
      `${RUN_CHAR_PLACE ? '\n  - character ↔ place' : ''}`,
  );

  const proceed = await confirm('Proceed?', true);
  if (!proceed) {
    console.log('Aborted.');
    semiont.dispose();
    closeInteractive();
    return;
  }

  let totalCC = 0;
  let totalCP = 0;

  for (const rId of targets) {
    if (RUN_CHAR_CHAR) {
      const progress = await semiont.mark.assist(rId, 'linking', {
        entityTypes: CHAR_CHAR_ENTITY_TYPES,
        instructions: CHAR_CHAR_INSTRUCTIONS,
      });
      const n = createdCount(progress);
      totalCC += n;
      console.log(`  ${rId} (char-char): ${n} relationship annotations`);
    }
    if (RUN_CHAR_PLACE) {
      const progress = await semiont.mark.assist(rId, 'linking', {
        entityTypes: CHAR_PLACE_ENTITY_TYPES,
        instructions: CHAR_PLACE_INSTRUCTIONS,
      });
      const n = createdCount(progress);
      totalCP += n;
      console.log(`  ${rId} (char-place): ${n} association annotations`);
    }
  }

  console.log(
    `\nDone. ${totalCC} character-character + ${totalCP} character-place ` +
      `relationship annotations created.`,
  );
  semiont.dispose();
  closeInteractive();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
