<script lang="ts" module>
  /**
   * A piece's graph, small: where its cells sit (its fixed layout, or the physics
   * run briefly) and how they connect — for the picker. Worked out one at a time,
   * so opening the picker never stalls on thirty layouts at once.
   */
  import { codeShifts, compileSource } from '../engine/compile';
  import { buildGraph } from '../engine/graph';
  import { ForceLayout } from '../layout/physics';
  import { cellView } from '../layout/cellview';
  import { kindOf } from '../layout/show';
  import { noteColour } from './theme';

  export interface Shape {
    readonly nodes: readonly { x: number; y: number; r: number; fill: string; ring: boolean }[];
    readonly edges: readonly { x1: number; y1: number; x2: number; y2: number }[];
    readonly box: readonly [number, number, number, number];
    /** Edge width, in the box's units. */
    readonly edge: number;
  }

  const cache = new Map<string, Shape | null>();
  const queue: (() => void)[] = [];
  let running = false;
  function pump() {
    if (running) return;
    const next = queue.shift();
    if (!next) return;
    running = true;
    setTimeout(() => {
      next();
      running = false;
      pump();
    }, 0);
  }

  function shapeOf(source: string, layout: Readonly<Record<string, readonly [number, number]>> | null, round: boolean): Shape | null {
    const result = compileSource(source);
    const model = buildGraph(result);
    const nodes = model.nodes.filter((n) => !n.petalOf && !n.cell.note);
    if (nodes.length === 0) return null;
    const at = new Map<string, [number, number]>();
    if (layout) {
      for (const n of nodes) {
        const p = layout[n.cell.name];
        if (p) at.set(n.id, [p[0] * 130, p[1] * 130]);
      }
    }
    if (at.size < nodes.length * 0.6) {
      at.clear();
      const l = new ForceLayout(undefined, { live: false });
      l.setGraph(model);
      l.tick(160);
      for (const n of nodes) {
        const p = l.position(n.id);
        if (p) at.set(n.id, [p.x, p.y]);
      }
      l.destroy();
    }
    const shifts = codeShifts(result);
    const colourOf = (name: string): { fill: string; ring: boolean } => {
      const kind = kindOf(result, name);
      if (kind === 'voice') return { fill: 'var(--text)', ring: true };
      if (kind === 'mix') return { fill: 'var(--accent)', ring: true };
      if (kind === 'meter') return { fill: 'color-mix(in oklab, var(--accent) 45%, var(--wheel-ref))', ring: false };
      try {
        const band = cellView(result, name, shifts, false).segments.find((s) => s.bands[0]?.kind === 'pitch')?.bands[0];
        if (band?.kind === 'pitch') return { fill: noteColour(band.hue), ring: false };
      } catch {
        /* no pitch: a quiet dot */
      }
      return { fill: 'var(--wheel-ref)', ring: false };
    };
    const placed = nodes.filter((n) => at.has(n.id));
    const xs = placed.map((n) => at.get(n.id)![0]);
    const ys = placed.map((n) => at.get(n.id)![1]);
    // the box: at least a minimum size (a small graph stays small); in a wheel, square, with the
    // graph inside the circle (corners are cut off); else padded out to 4:3
    const pad = 40;
    const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
    const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
    let w = Math.max(640, Math.max(...xs) - Math.min(...xs) + 2 * pad);
    let h = Math.max(480, Math.max(...ys) - Math.min(...ys) + 2 * pad);
    if (round) {
      // the graph's corners within the circle: its diagonal is the circle's diameter
      const side = Math.max(640, Math.hypot(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)) + 3 * pad);
      w = h = side;
    } else if (w / h > 4 / 3) h = (w * 3) / 4;
    else w = (h * 4) / 3;
    const box: [number, number, number, number] = [cx - w / 2, cy - h / 2, w, h];
    // nodes and edges sized to the frame, not to the graph: a small piece and a large one read alike
    const unit = w / 100;
    return {
      nodes: placed.map((n) => {
        const [x, y] = at.get(n.id)!;
        const kind = kindOf(result, n.cell.name);
        return { x, y, r: (kind === 'voice' || kind === 'mix' ? 5.2 : kind === 'meter' ? 5 : 4.2) * unit * (round ? 1 : 0.8), ...colourOf(n.cell.name) };
      }),
      edges: model.edges.flatMap((e) => {
        const a = at.get(e.source);
        const b = at.get(e.target);
        return a && b ? [{ x1: a[0], y1: a[1], x2: b[0], y2: b[1] }] : [];
      }),
      box,
      edge: (round ? 1.35 : 1.1) * unit,
    };
  }
</script>

<script lang="ts">
  let {
    id,
    source,
    layout = null,
    round = false,
  }: {
    id: string;
    source: string;
    layout?: Readonly<Record<string, readonly [number, number]>> | null;
    /** Shown in a circle (a wheel): square, and the graph kept inside it. */
    round?: boolean;
  } = $props();
  let shape = $state<Shape | null | undefined>(undefined);
  $effect(() => {
    const key = `${id}\n${round}\n${source}`;
    if (cache.has(key)) {
      shape = cache.get(key);
      return;
    }
    shape = undefined;
    let cancelled = false;
    queue.push(() => {
      if (cancelled) return;
      let s: Shape | null = null;
      try {
        s = shapeOf(source, layout, round);
      } catch {
        s = null;
      }
      cache.set(key, s);
      shape = s;
    });
    pump();
    return () => (cancelled = true);
  });
</script>

<svg viewBox={shape ? shape.box.join(' ') : '0 0 100 75'} preserveAspectRatio="xMidYMid meet" role="img" aria-label="Its graph, in miniature">
  {#if shape}
    {#each shape.edges as e}<line x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2} stroke-width={shape.edge} />{/each}
    {#each shape.nodes as n}
      <circle cx={n.x} cy={n.y} r={n.r} style:fill={n.ring ? 'var(--wheel-disc)' : n.fill} style:stroke={n.ring ? n.fill : 'none'} stroke-width={n.ring ? n.r * 0.32 : 0} />
    {/each}
  {/if}
</svg>

<style>
  svg {
    position: absolute;
    inset: 0;
    display: block;
    width: 100%;
    height: 100%;
  }
  line {
    stroke: var(--edge);
    stroke-opacity: 0.7;
  }
</style>
