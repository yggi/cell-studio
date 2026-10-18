import { describe, expect, it, vi } from 'vitest';
import { nameKeys, Rename } from './rename.svelte';

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

  // #328: Escape on an edited name cancels the rename and goes no further, so the sheet stays open
  it('Escape cancels an edited name without reaching the sheet; unedited, it lets the sheet close', () => {
    const r = new Rename(
      () => 'tune',
      () => SRC,
      () => {},
    );
    let key: ((e: KeyboardEvent) => void) | undefined;
    const blur = vi.fn();
    const node = {
      addEventListener: (_: string, f: (e: KeyboardEvent) => void) => (key = f),
      removeEventListener: () => {},
      blur,
    } as unknown as HTMLInputElement;
    nameKeys(r)(node);
    const press = () => {
      const e = { key: 'Escape', preventDefault: vi.fn(), stopPropagation: vi.fn() };
      key!(e as unknown as KeyboardEvent);
      return e;
    };

    r.draft = 'melody';
    const edited = press();
    expect(r.draft).toBe('tune');
    expect(edited.preventDefault).toHaveBeenCalled();
    expect(edited.stopPropagation).toHaveBeenCalled();
    expect(blur).toHaveBeenCalled();

    const unedited = press();
    expect(unedited.preventDefault).not.toHaveBeenCalled();
    expect(unedited.stopPropagation).not.toHaveBeenCalled();
  });
});
