import { describe, expect, it } from 'vitest';
import { Rename } from './rename.svelte';

const SRC = `&bar scan(1 1 1 1) step=96bpm
&tune step=&bar 0 2 4
&bass step=&bar 0 0`;

describe("Rename: a cell's name, edited on its sheet", () => {
  it('follows the name, says why a draft cannot be it, and renames only a good one', () => {
    const name = 'tune';
    const done: [string, string][] = [];
    const r = new Rename(
      () => name,
      () => SRC,
      (s, to) => done.push([s, to]),
    );
    expect(r.draft).toBe('tune');
    expect(r.problem).toBeNull();
    r.draft = 'bass';
    expect(r.problem).toMatch(/already exists/);
    r.commit();
    expect(done).toEqual([]);
    r.reset();
    expect(r.draft).toBe('tune');
    r.draft = '  ';
    r.commit();
    expect(r.draft).toBe('tune');
    r.draft = 'melody ';
    r.commit();
    expect(done.map(([, to]) => to)).toEqual(['melody']);
    expect(done[0][0]).toContain('&melody step=&bar 0 2 4');
  });
});
