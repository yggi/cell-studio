import { expect, test } from 'vitest';
import { readFileSync, writeFileSync } from 'node:fs';
import { buildExamplesDoc } from '../tools/examples-doc';

// docs/examples.md is generated from examples/*.md (tools/examples-doc.ts): a change to an example
// regenerates it in the same PR (`npm run docs:examples`).
// (it reads the examples' entries without laying them out: buildExamplesMeta)
test('docs/examples.md is up to date with examples/*.md', () => {
  const doc = buildExamplesDoc();
  if (process.env.UPDATE_EXAMPLES_DOC) writeFileSync('docs/examples.md', doc);
  expect(readFileSync('docs/examples.md', 'utf8'), 'run `npm run docs:examples`').toBe(doc);
});
