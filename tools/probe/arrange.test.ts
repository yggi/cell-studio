// Probe (not part of the gate): every example arranged by a selector of mixes, rewritten at the input (decision 016)
// by src/engine/shorten/arrange.ts and checked note for note; which can be, and why the others can't.
// Run: PROBE=out.txt npx vitest run tools/probe/arrange.test.ts
import { describe, it } from 'vitest';
import { appendFileSync } from 'node:fs';
import { PRESETS } from '../../src/engine/presets';
import { arrangeAtInput } from '../../src/engine/shorten/arrange';

describe.runIf(process.env.PROBE)('arranging the examples at the input', () => {
  it('rewrites what it can', () => {
    const log = (t: string) => appendFileSync(process.env.PROBE!, t + '\n');
    for (const [key, p] of Object.entries(PRESETS)) {
      const a = arrangeAtInput(p.source);
      if (a.why[0] === 'no selector of mixes') continue;
      log(a.source ? `✓ ${key}: the same notes` : `✗ ${key}: ${a.why.join('; ')}`);
    }
  }, 600_000);
});
