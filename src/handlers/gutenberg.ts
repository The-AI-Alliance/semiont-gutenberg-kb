/**
 * Project Gutenberg helpers.
 *
 * Plain functions for downloading and extracting body text from Project
 * Gutenberg ebook files. The original migrated handler had a runner-shaped
 * interface (DatasetHandler with download/load methods) and depended on
 * runner-only modules (chunking, display, types). This refactor strips those
 * deps and exposes the two operations skills actually need, behaving
 * identically to the original `downloadText` + `extractSection` in
 * `semiont-workflows/src/chunking.ts`.
 */

/**
 * Fetch a Project Gutenberg ebook URL and return its raw text.
 * Project Gutenberg serves UTF-8 plain text at predictable URLs like:
 *   https://www.gutenberg.org/cache/epub/<id>/pg<id>.txt
 */
export async function downloadGutenbergText(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'semiont-kb-skill/1.0 (https://github.com/The-AI-Alliance/semiont)',
    },
  });
  if (!response.ok) {
    throw new Error(`Download failed: ${response.status} ${response.statusText}`);
  }
  return response.text();
}

/**
 * Extract a section of a Gutenberg ebook between a start regex and an end
 * marker. Useful for stripping the header / footer boilerplate that surrounds
 * every Project Gutenberg file.
 *
 * Returns the substring from the START of the first match of `startPattern`
 * (i.e., includes the start marker text itself) through the start of the first
 * match of `endMarker`. Throws if either anchor isn't found — surfaces config
 * errors loudly rather than silently passing through unprocessed text.
 *
 * Behaves identically to the original `extractSection` in semiont-workflows.
 */
export function extractGutenbergSection(
  rawText: string,
  startPattern: RegExp,
  endMarker: string,
): string {
  const startMatch = rawText.match(startPattern);
  if (!startMatch || startMatch.index === undefined) {
    throw new Error(`Could not find start pattern ${startPattern} in text`);
  }
  const endIndex = rawText.indexOf(endMarker);
  if (endIndex === -1) {
    throw new Error(`Could not find end marker "${endMarker}" in text`);
  }
  return rawText.slice(startMatch.index, endIndex).trim();
}
