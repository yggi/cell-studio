import { describe, expect, it } from 'vitest';
import { METER, MIX, QUIET, VOICE, miniature, miniShape } from './miniature';
import { PRESETS } from '../engine/presets';

describe('miniature', () => {
  const m = miniature(PRESETS.royal.source)!;

  it('is raw and compact: whole px, a kind or a hue (to a tenth) per node, edges between nodes', () => {
    expect(m.nodes.length).toBeGreaterThan(3);
    for (const [x, y, c] of m.nodes) {
      expect(Number.isInteger(x) && Number.isInteger(y)).toBe(true);
      expect([VOICE, MIX, METER, QUIET].includes(c) || (Number.isInteger(c * 10) && c >= 0 && c < 360), `colour ${c}`).toBe(true);
    }
    for (const [a, b] of m.edges) expect(m.nodes[a] && m.nodes[b]).toBeTruthy();
    // (no CSS in it: the theme resolves the colours when it's drawn)
    expect(JSON.stringify(m)).not.toMatch(/var\(|hsl|#/);
  });

  it('is the same every time', () => expect(miniature(PRESETS.royal.source)).toEqual(m));

  it('is nothing for a piece with no cells to draw', () => expect(miniature('')).toBeNull());

  it('framed: a card is 4:3, a wheel square and holds the graph inside its circle', () => {
    const card = miniShape(m, false);
    expect(card.box[2] / card.box[3]).toBeCloseTo(4 / 3);
    const wheel = miniShape(m, true);
    expect(wheel.box[2]).toBe(wheel.box[3]);
    const [x0, y0, w] = wheel.box;
    for (const n of wheel.nodes) expect(Math.hypot(n.x - (x0 + w / 2), n.y - (y0 + w / 2))).toBeLessThan(w / 2);
    expect(wheel.edges).toHaveLength(m.edges.length);
  });
});
