import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * A piece sounds the same every time (#37): nothing that makes sound may draw on chance of its own. The same
 * promise is checked end to end, in a browser, by `tools/repeatable.mjs` (two renders, bit-identical); this is
 * its cheap first line, and it names the line.
 */
const sources = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name);
    return e.isDirectory() ? sources(p) : /\.ts$/.test(e.name) && !/\.test\.ts$/.test(e.name) ? [p] : [];
  });

/** What is random behind our back: Math.random, and the Tone parts that call it (Noise, Reverb, probability, humanize, patterns). */
const CHANCE = [
  /\bMath\.random\b/,
  /\bcrypto\.getRandomValues\b/,
  /\bTone\.(Noise|Reverb|Pattern|Chorus)\b/,
  /\b(probability|humanize)\s*[:=]/,
];

describe('nothing that sounds is random', () => {
  for (const dir of ['src/engine', 'src/layout', 'src/audio']) {
    it(`${dir} draws on no chance of its own (use the cell's seed: engine/realize.ts chanceOf, audio/voice/noise.ts)`, () => {
      const found: string[] = [];
      for (const file of sources(dir))
        readFileSync(file, 'utf8')
          .split('\n')
          .forEach((line, i) => {
            // (comments, line and block, may name them: the point of a comment is to say why not)
            const code = line.replace(/^\s*(\/?\*+).*$/, '').replace(/\/\/.*$/, '').replace(/\/\*.*?\*\//g, '');
            if (CHANCE.some((re) => re.test(code))) found.push(`${file}:${i + 1}: ${line.trim()}`);
          });
      expect(found).toEqual([]);
    });
  }
});
