import { describe, expect, it } from 'vitest';
import { compilePiece } from '../compile';
import { PRESETS } from '@yggi/cells/engine/presets';
import { buildGraph } from './drawn';
import { minimap } from './minimap';
import { withSockets } from './towerlayout';

describe("the strip's minimap", () => {
  it('puts each out in a lane, in the order asked, and every node in the lanes of the outs it feeds', () => {
    const program = compilePiece(PRESETS.waltz.source);
    const drawn = withSockets(program, buildGraph(program));
    const order = ['cell:tuba', 'cell:flute', 'cell:strings'];
    const { lanes, span } = minimap(drawn, (s) => order.indexOf(s));
    expect(lanes.map((l) => l.source)).toEqual(order);
    // (a voice in its own lane; the melody it plays with it; the bar every part steps on across all three)
    expect(span.get('cell:flute')).toEqual([1, 1]);
    expect(span.get('cell:tune')).toEqual([1, 1]);
    expect(span.get('cell:bar')).toEqual([0, 2]);
  });

  it("puts a groove in its kit's lane: it reads the kit, but plays it", () => {
    const program = compilePiece(`&bar step=120bpm 1 1 1 1
&bd s=sine loop=A1
&hh s=white hpf=8000
&beat step=&bar*2 &bd &hh &bd &hh
&lead s=saw loop=C5
&tune step=&bar 0 2 4
&out map=sample [&beat, &tune * &lead]`);
    const drawn = withSockets(program, buildGraph(program));
    const { lanes, span } = minimap(drawn, () => 0);
    const kit = lanes.findIndex((l) => l.source.includes('kit'));
    expect(kit).toBeGreaterThanOrEqual(0);
    expect(span.get('cell:beat')).toEqual([kit, kit]);
  });
});
