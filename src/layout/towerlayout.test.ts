import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildGraph } from './drawn';
import { compileSource } from '@yggi/cells/engine/compile';
import { ForceLayout } from './physics';
import { TOWER_LAYOUT } from './options';
import { socketHeights, socketId, towerAt, towerLayers, towerNets, towerIns, towerOuts, towerY, withSockets } from './towerlayout';
import { socketOf, VOICE_SIZE } from './voice';

const waltz = () => {
  const program = compileSource(readFileSync('node_modules/@yggi/cells/examples/waltz.cells', 'utf8'));
  return { program, model: buildGraph(program) };
};

describe('the tower layout', () => {
  it('shows what goes into the sound card on both strips', () => {
    const { program, model } = waltz();
    const outs = towerOuts(program, model);
    expect(outs.map((o) => o.from).sort()).toEqual(['cell:flute', 'cell:strings', 'cell:tuba']);
    expect(outs.every((o) => o.left && o.right)).toBe(true);
    // a voice's wire leaves its top: its base frequency
    const ins = towerIns(outs, program, (id) => (id === 'cell:tuba' ? { x: 10, y: towerY(Math.log10(65.41)) + socketOf(VOICE_SIZE) } : undefined));
    expect(ins).toHaveLength(1);
    expect(ins[0].top).toBeCloseTo(towerY(Math.log10(65.41)), 6);
  });

  it("marks a wire on the strip level with its socket, the out-node, not its source's top", () => {
    const { program, model } = waltz();
    const outs = towerOuts(program, model);
    const tuba = outs.find((o) => o.from === 'cell:tuba')!;
    const ins = towerIns(outs, program, (id) => (id === 'cell:tuba' ? { x: 10, y: 0 } : id === socketId(tuba.id) ? { x: 12, y: -900 } : undefined));
    expect(ins).toEqual([expect.objectContaining({ from: 'cell:tuba', x: 12, top: -900 })]);
  });

  it('sends a two-channel card first left, second right', () => {
    const program = compileSource(`
&lead s=saw loop=C4
&bass s=sine loop=C2
&tune 0 2 4 step=2
&l [&tune * &lead]
&r [&tune * &bass]
&out loop=SAMPLE_RATE map=sample &l &r
`);
    const outs = towerOuts(program, buildGraph(program));
    const of = (id: string) => outs.find((o) => o.from === id)!;
    expect(of('cell:l')).toMatchObject({ left: true, right: false });
    expect(of('cell:r')).toMatchObject({ left: false, right: true });
  });

  const towered = () => {
    const { program, model } = waltz();
    const drawn = withSockets(model);
    const { targets, held } = towerLayers(program, model, drawn);
    const heights = new Map([...targets].filter(([id]) => held.has(id)));
    const layout = new ForceLayout(() => {}, { ...TOWER_LAYOUT, heights, held, live: false });
    layout.setGraph({ ...drawn, nodes: drawn.nodes.filter((n) => !n.petalOf) });
    return { layout, heights };
  };

  it('lays out with the heights held: only x moves', () => {
    const { layout, heights } = towered();
    layout.tick(200);
    layout.layNet();
    for (const [id, y] of heights) expect(layout.position(id)?.y, id).toBeCloseTo(y, 6);
    // dragged, a held node goes sideways only
    layout.dragStart('cell:tuba', 500, 0);
    layout.drag('cell:tuba', 600, -999);
    layout.tick(1);
    expect(layout.position('cell:tuba')).toMatchObject({ x: 600, y: heights.get('cell:tuba') });
    layout.destroy();
  });

  it('keeps held cells apart: the flute and the strings, one row, dropped on one place', () => {
    const { layout } = towered();
    // (both at x 0, one on top of the other, then let go)
    layout.dragStart('cell:strings', 0, 0);
    layout.dragStart('cell:flute', 0, 0);
    layout.dragEnd('cell:strings');
    layout.dragEnd('cell:flute');
    layout.tick(300);
    const [f, s] = [layout.position('cell:flute')!, layout.position('cell:strings')!];
    expect(Math.abs(f.x - s.x)).toBeGreaterThan(150);
    expect(layout.quality().overlap).toBeLessThan(1);
    layout.destroy();
  });

  it('gathers the wires into one net a base frequency, the others tapping into its trunk', () => {
    const { program, model } = waltz();
    const at: Record<string, number> = { 'cell:flute': 400, 'cell:strings': 100, 'cell:tuba': 250 };
    const ins = towerIns(towerOuts(program, model), program, (id) =>
      id.startsWith('socket:')
        ? undefined
        : {
            x: at[id],
            y: towerY(id === 'cell:tuba' ? Math.log10(65.41) : Math.log10(261.63)) + socketOf(VOICE_SIZE),
          },
    );
    const nets = towerNets(ins);
    expect(nets).toHaveLength(2);
    const c4 = nets.find((n) => n.taps.length === 2)!;
    // (the trunk from the source furthest from the strip: the strings, the flute tapping in)
    expect(c4.taps.map((t) => t.from)).toEqual(['cell:strings', 'cell:flute']);
  });

  it("puts the card everywhere: a socket each thing it hears, at that thing's sound on the tower", () => {
    const { program, model } = waltz();
    const drawn = withSockets(model);
    expect(drawn.nodes.some((n) => n.id === 'cell:mix')).toBe(false);
    const into = model.edges.filter((e) => e.to === 'cell:mix' && e.port !== 'about');
    // (each edge into the card keeps its id, ending at a socket of its own)
    for (const e of into) expect(drawn.edges.find((x) => x.id === e.id)?.to).toBe(socketId(e.id));
    expect(drawn.nodes.filter((n) => n.id.startsWith('socket:'))).toHaveLength(3);
    const h = socketHeights(program, model, drawn);
    const flute = into.find((e) => e.from === 'cell:flute')!;
    expect(towerAt(h.get(socketId(flute.id))!)).toBeCloseTo(Math.log10(261.63), 3);
  });

  it("holds a groove's socket at its lowest drum", () => {
    const program = compileSource(`&bar scan(1 1 1 1) step=120bpm
&bd s=sine loop=A1 env=&(map=adsr 0 .3 0 .05)
&hh s=white hpf=8000 env=&(map=adsr 0 .04 0 .02)
&beat step=&bar &bd &hh &bd &hh
&out map=sample [&beat]`);
    const model = buildGraph(program);
    const drawn = withSockets(model);
    const [h] = socketHeights(program, model, drawn).values();
    expect(10 ** towerAt(h)).toBeCloseTo(55, 1);
  });

  it('lays the layers: tables at the bottom, the structure at its rates, the voices in one row over it, the sockets alone in the audible', () => {
    const { program, model } = waltz();
    const drawn = withSockets(model);
    const { targets, layers } = towerLayers(program, model, drawn);
    const at = (id: string) => towerAt(targets.get(id)!);
    expect(layers.get('cell:bar')).toBe('stepped');
    expect(10 ** at('cell:bar')).toBeCloseTo(168 / 60, 3);
    // (the voices in one row, over the structure, under the lowest socket)
    for (const v of ['flute', 'strings', 'tuba']) expect(layers.get(`cell:${v}`)).toBe('voice');
    expect(at('cell:flute')).toBeCloseTo(at('cell:tuba'), 6);
    expect(at('cell:tuba')).toBeGreaterThan(at('cell:bar'));
    const sockets = [...layers].filter(([, l]) => l === 'audible').map(([id]) => at(id));
    expect(sockets).toHaveLength(3);
    expect(Math.min(...sockets)).toBeCloseTo(Math.log10(65.41), 3);
    expect(at('cell:tuba')).toBeLessThan(Math.min(...sockets));
  });

  it('draws the layers by a gentle spring: the sockets over the voices over the structure, in order on average', () => {
    const program = compileSource(readFileSync('node_modules/@yggi/cells/examples/pop.cells', 'utf8'));
    const model = buildGraph(program);
    const drawn = withSockets(model);
    const { targets, layers } = towerLayers(program, model, drawn);
    const layout = new ForceLayout(() => {}, { ...TOWER_LAYOUT, heights: targets, live: false });
    layout.setGraph({ ...drawn, nodes: drawn.nodes.filter((n) => !n.petalOf) });
    layout.tick(500);
    layout.layNet();
    const mean = (layer: string) => {
      const ys = [...layers].flatMap(([id, l]) => (l === layer && layout.position(id) ? [layout.position(id)!.y] : []));
      return ys.reduce((a, b) => a + b, 0) / ys.length;
    };
    expect(TOWER_LAYOUT.heightPull).toBeGreaterThan(0);
    expect(mean('audible')).toBeLessThan(mean('voice'));
    expect(mean('voice')).toBeLessThan(mean('stepped'));
    layout.destroy();
  });

  it('sets each socket straight above its source (socketsAbove)', () => {
    const { program, model } = waltz();
    const drawn = withSockets(model);
    const layout = new ForceLayout(() => {}, { ...TOWER_LAYOUT, heights: towerLayers(program, model, drawn).targets, live: false });
    layout.setGraph({ ...drawn, nodes: drawn.nodes.filter((n) => !n.petalOf) });
    layout.tick(300);
    const into = model.edges.filter((e) => e.to === 'cell:mix' && e.port !== 'about');
    expect(into.length).toBe(3);
    for (const e of into) {
      const [s, src] = [layout.position(socketId(e.id))!, layout.position(e.from)!];
      expect(s.x, e.from).toBeCloseTo(src.x, 1);
      expect(s.y, e.from).toBeLessThan(src.y);
    }
    layout.destroy();
  });

  it("puts every socket in the audible, over the voices: a groove's lowest drum lifted to its floor", () => {
    const program = compileSource(`&bar scan(1 1 1 1) step=120bpm
&bd oneshot s=sine loop=A1 env=&(map=adsr 0 .3 0 .05)
&hh s=white hpf=8000 env=&(map=adsr 0 .04 0 .02)
&lead s=saw loop=C5
&tune step=&bar*2 0 2 4 7
&beat step=&bar*2 &bd &hh &bd &hh
&out map=sample [&beat, &tune * &lead]`);
    const model = buildGraph(program);
    const drawn = withSockets(model);
    const own = socketHeights(program, model, drawn);
    const { targets, layers } = towerLayers(program, model, drawn);
    const voice = Math.max(...[...layers].filter(([, l]) => l === 'voice').map(([id]) => towerAt(targets.get(id)!)));
    const sockets = [...layers].filter(([, l]) => l === 'audible').map(([id]) => id);
    expect(sockets).toHaveLength(2);
    for (const id of sockets) expect(towerAt(targets.get(id)!)).toBeGreaterThanOrEqual(voice + 0.6 - 1e-9);
    // (the drums' socket, from the kit, at A1 by its lowest drum, lifted; the lead's, at C5, kept at its pitch)
    const [groove, lead] = [sockets.find((id) => id.includes('kit:voices'))!, sockets.find((id) => id.includes('lead'))!];
    expect(targets.get(groove)).toBeLessThan(own.get(groove)!);
    expect(targets.get(lead)).toBeCloseTo(own.get(lead)!, 6);
  });

  it('rests the voices on the structure below hearing: a braid at an audio rate keeps its own height', () => {
    const program = compileSource(`&bar scan(1 1 1 1) step=120bpm
&wave map=lin step=440 0 1 0 -1
&lead s=saw loop=C4
&tune step=&bar 0 2 4 7
&out map=sample [&tune * &lead * &wave]`);
    const model = buildGraph(program);
    const drawn = withSockets(model);
    const { targets } = towerLayers(program, model, drawn);
    // (the voice row between the bar and the lead's socket, not over the wave's 440 Hz)
    expect(towerAt(targets.get('cell:lead')!)).toBeLessThan(Math.log10(261.63));
  });

  it('sits a kit with the voices, held there over the grooves that play it', () => {
    const program = compileSource(readFileSync('node_modules/@yggi/cells/examples/pop.cells', 'utf8'));
    const model = buildGraph(program);
    const drawn = withSockets(model);
    const { targets, layers, held } = towerLayers(program, model, drawn);
    const kit = drawn.nodes.find((n) => n.cell?.kit && n.cell.implicit)!.id;
    expect(layers.get(kit)).toBe('voice');
    expect(held.has(kit)).toBe(true);
    const layout = new ForceLayout(() => {}, { ...TOWER_LAYOUT, heights: targets, held, live: false });
    layout.setGraph({ ...drawn, nodes: drawn.nodes.filter((n) => !n.petalOf) });
    layout.tick(300);
    expect(layout.position(kit)!.y).toBeCloseTo(targets.get(kit)!, 6);
    // (above the grooves it plays, in the structure)
    for (const g of ['beat', 'hats']) expect(layout.position(kit)!.y).toBeLessThan(layout.position(`cell:${g}`)!.y);
    layout.destroy();
  });

  it('sits what plays a kit (a groove) with it: just under the voices, over the structure, held there', () => {
    const program = compileSource(readFileSync('node_modules/@yggi/cells/examples/pop.cells', 'utf8'));
    const model = buildGraph(program);
    const drawn = withSockets(model);
    const { targets, layers, held } = towerLayers(program, model, drawn);
    const kit = drawn.nodes.find((n) => n.cell?.kit && n.cell.implicit)!.id;
    for (const g of ['cell:beat', 'cell:hats']) {
      expect(layers.get(g), g).toBe('gate');
      expect(held.has(g), g).toBe(true);
      // (below the kit on the page, above the bar)
      expect(targets.get(g)!).toBeGreaterThan(targets.get(kit)!);
      expect(targets.get(g)!).toBeLessThan(targets.get('cell:bar')!);
    }
  });

  it('keeps every node in its stratum, and what a selector steps over its loom', () => {
    for (const piece of ['hypercell', 'baustelle', 'pop']) {
      const program = compileSource(readFileSync(`node_modules/@yggi/cells/examples/${piece}.cells`, 'utf8'));
      const model = buildGraph(program);
      const drawn = withSockets(model);
      const { targets, held, strata } = towerLayers(program, model, drawn);
      // (the strata in order, top to bottom, none overlapping)
      const layout = new ForceLayout(() => {}, { ...TOWER_LAYOUT, heights: targets, held, strata, live: false });
      layout.setGraph({ ...drawn, nodes: drawn.nodes.filter((n) => !n.petalOf) });
      layout.tick(400);
      for (const [id, [top, bottom]] of strata) {
        const y = layout.position(id)?.y;
        if (y === undefined) continue;
        expect(y, `${piece}: ${id}`).toBeGreaterThanOrEqual(top - 1e-6);
        expect(y, `${piece}: ${id}`).toBeLessThanOrEqual(bottom + 1e-6);
      }
      for (const { strands } of layout.tapLooms()) {
        const lane = Math.min(...strands.filter((st) => !st.join).map((st) => st.pieces[1][1]));
        for (const st of strands.filter((x) => x.tap >= 0)) {
          const y = layout.position(st.to)?.y;
          if (y !== undefined) expect(y, `${piece}: ${st.to}`).toBeLessThan(lane);
        }
      }
      layout.destroy();
    }
  });

  it('orders the strata: audible over voice over gate over stepped over constant', () => {
    const program = compileSource(readFileSync('node_modules/@yggi/cells/examples/hypercell.cells', 'utf8'));
    const model = buildGraph(program);
    const drawn = withSockets(model);
    const { layers, strata } = towerLayers(program, model, drawn);
    const band = (l: string) => strata.get([...layers].find(([, x]) => x === l)![0])!;
    const order = ['audible', 'voice', 'gate', 'stepped'];
    for (let i = 0; i + 1 < order.length; i++) expect(band(order[i])[1], order[i]).toBeLessThanOrEqual(band(order[i + 1])[0] + 1e-6);
  });

  const laid = (piece: string) => {
    const program = compileSource(readFileSync(`node_modules/@yggi/cells/examples/${piece}.cells`, 'utf8'));
    const model = buildGraph(program);
    const drawn = withSockets(model);
    const t = towerLayers(program, model, drawn);
    const layout = new ForceLayout(() => {}, {
      ...TOWER_LAYOUT,
      heights: t.targets,
      held: t.held,
      strata: t.strata,
      between: t.between,
      lineUp: t.lineUp,
      aside: t.aside,
      columns: t.columns,
      live: false,
    });
    layout.setGraph({ ...drawn, nodes: drawn.nodes.filter((n) => !n.petalOf) });
    layout.tick(400);
    layout.layNet();
    return { layout, ...t };
  };

  it('sits a mixer over the voices, between what it mixes', () => {
    const { layout, layers, between, strata } = laid('hypercell');
    const sources = between.get('cell:hookPart')!.filter((id) => layout.position(id));
    expect(layers.get('cell:hookPart')).toBe('mixer');
    expect(sources.length).toBeGreaterThan(1);
    const mean = sources.reduce((a, id) => a + layout.position(id)!.x, 0) / sources.length;
    expect(layout.position('cell:hookPart')!.x).toBeCloseTo(mean, 0);
    // (its band over the voices')
    expect(strata.get('cell:hookPart')![1]).toBeLessThanOrEqual(strata.get(sources[0])![0] + 1e-6);
    layout.destroy();
  });

  it("keeps a loom clear, and draws a meter's ride on it as a strand, not a trace through it", () => {
    const { layout } = laid('baustelle');
    const placed = (layout as unknown as { placed(): { nodes: { id: string; x: number; y: number; r: number }[]; edges: { a: string; b: string; path?: unknown }[] } }).placed();
    const at = new Map(placed.nodes.map((n) => [n.id, n]));
    const loom = layout.tapLooms().find((l) => l.table === 'cell:teile')!;
    const table = at.get('cell:teile')!;
    const inside = loom.strands.filter((st) => !st.join);
    const xs = inside.flatMap((st) => st.pieces.flatMap((p) => [p[0], p[2]]));
    const top = Math.min(...inside.map((st) => st.pieces[1][1]));
    const steps = new Set(loom.strands.map((st) => st.to));
    for (const n of placed.nodes) {
      if (n.id === 'cell:teile' || steps.has(n.id) || n.id.startsWith('tag:')) continue;
      const inside = n.x > Math.min(...xs) && n.x < Math.max(...xs) && n.y > top && n.y < table.y - table.r * 0.7;
      expect(inside, n.id).toBe(false);
    }
    // (&accent takes &bar off the loom: a strand, its riser too; no trace from the table)
    expect(loom.strands.some((st) => st.tap < 0 && st.to === 'cell:accent')).toBe(true);
    expect(placed.edges.some((e) => e.a === 'cell:teile' && e.b === 'cell:accent' && !e.path)).toBe(false);
    layout.destroy();
  });
  it('makes a selector a stratum: what it feeds strictly over its pill, its clock and its chooser strictly under', () => {
    for (const [piece, table, under] of [
      ['hypercell', 'cell:parts', ['cell:bar', 'cell:song']],
      ['baustelle', 'cell:teile', ['cell:bar', 'cell:tag']],
    ] as const) {
      const { layout, layers } = laid(piece);
      expect(layers.get(table), piece).toBe('selector');
      for (const id of under) expect(layers.get(id), `${piece}: ${id}`).toBe('source');
      const { pill, strands } = layout.tapLooms().find((l) => l.table === table)!;
      for (const id of under) expect(layout.position(id)!.y, `${piece}: ${id}`).toBeGreaterThan(pill.y1);
      // (what reads it, its name too, over the pill's top)
      for (const id of new Set(strands.map((st) => st.to))) {
        const at = layout.position(id);
        if (at) expect(at.y, `${piece}: ${id}`).toBeLessThan(pill.y0);
      }
      layout.destroy();
    }
  });

  it('holds the voices on their row: the mixers keep their air', () => {
    const { layout, layers, targets } = laid('hypercell');
    for (const [id, l] of layers) if (l === 'voice' && layout.position(id)) expect(layout.position(id)!.y, id).toBeCloseTo(targets.get(id)!, 0);
    layout.destroy();
  });

  it("lifts a table read only over the selectors to its readers' stratum, its net led from the left", () => {
    const { layout, layers } = laid('cellscape');
    expect(layers.get('cell:lydian')).toBe('stepped');
    expect(layers.get('cell:layers')).toBe('selector');
    const { pill } = layout.tapLooms().find((l) => l.table === 'cell:layers')!;
    expect(layout.position('cell:lydian')!.y).toBeLessThan(pill.y0);
    // (at the left end of the harmony net: left of every cell reading it over=)
    const readers = ['pad', 'arp', 'melody', 'canon', 'bells', 'pulse', 'shimmer'].map((c) => layout.position(`cell:${c}`)!.x);
    expect(layout.position('cell:lydian')!.x).toBeLessThan(Math.min(...readers));
    layout.destroy();
  });

  it("puts the frame in the sources' row, left of the meter and the chooser, and beside the pill", () => {
    const { layout, layers, lineUp } = laid('cellscape');
    // (&key: stepped by &bar at the sections' rate, read only by the scale)
    expect(layers.get('cell:key')).toBe('source');
    expect(lineUp).toEqual([['cell:key', 'cell:bar', 'cell:scenes']]);
    const x = (id: string) => layout.position(id)!.x;
    expect(x('cell:key')).toBeLessThan(x('cell:bar'));
    expect(x('cell:bar')).toBeLessThan(x('cell:scenes'));
    const { pill } = layout.tapLooms().find((l) => l.table === 'cell:layers')!;
    expect(x('cell:key')).toBeLessThan(pill.x0);
    layout.destroy();
  });

  it('keeps a plain wire between the strata tall: what feeds sits well under what it feeds', () => {
    const { layout } = laid('cellscape');
    // (&breath, the drone's filter, read by two voices)
    const [breath, padv] = [layout.position('cell:breath')!, layout.position('cell:padv')!];
    expect(breath.y - padv.y).toBeGreaterThan(TOWER_LAYOUT.minRise ?? 0);
    layout.destroy();
  });

  it('stands each voice and kit over the one cell that plays it, and the selector meets its chooser at its port', () => {
    const { layout, columns } = laid('arrangement');
    expect(columns.map(({ lo, hi }) => `${lo}<${hi}`).sort()).toEqual(['cell:chords<cell:keys', 'cell:click<cell:rim', 'cell:kick<cell:kit:voices', 'cell:tune<cell:lead']);
    // (straight under what it enters: the kit, or the product's junction on the voice's rim)
    for (const { lo, hi, via } of columns) expect(layout.position(lo)!.x, lo).toBeCloseTo(layout.position(via ?? hi)!.x, 0);
    // (a player clears its kit)
    const [kick, kit] = [layout.position('cell:kick')!, layout.position('cell:kit:voices')!];
    expect(kick.y - kit.y).toBeGreaterThan(130);
    const loom = layout.tapLooms().find((l) => l.table === 'cell:parts')!;
    expect(loom.feeds).toEqual({ meter: 'cell:bar', select: 'cell:song' });
    // (the drums' tap: one strand out of the pill, &click and &kick joined on one net)
    const drums = loom.strands.filter((st) => st.bulb === 'drumBar');
    expect(drums.filter((st) => !st.join)).toHaveLength(1);
    expect(drums.filter((st) => st.join)).toHaveLength(1);
    layout.destroy();
  });
});
