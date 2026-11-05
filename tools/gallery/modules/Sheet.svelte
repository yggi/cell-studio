<script lang="ts">
  /**
   * How a module and a voice's jacks could be drawn (#554; yggi/cells decision 067, docs/notes/modular.md rung 7): a
   * mock-up, not the app's drawing. Patchbay's patch (yggi/cells examples/patchbay.md) drawn as a schematic in the app's
   * theme, one option a column, each at a desktop's width, a phone's (the whole patch fitted) and a phone's close-up at
   * 1:1 (a jack's finger target). `node tools/gallery.mjs modules`. The graph as it is now: `golden 3 patchbay`.
   *
   * The jacks are written here as cells' `jacksOf` gives them for Patchbay (`@yggi/cells/engine/patch`, v0.17.0): the
   * app's pin (v0.16.0) has no engine/patch yet, so the sheet can't ask it.
   *
   * Options (the issue's): `cluster`, the use's cluster as today with the jacks hung on the head; `module`, a module one
   * wheel, its face the head's own glyph, its jacks on its rim (inputs below, the output on top), its private cells gone;
   * `all`, the same and a voice's jacks on its own wheel too (Patchbay's kick and hat).
   */
  import { noteColour } from '../../../src/ui/theme';

  type Band = 'cv' | 'audio';
  interface Jack {
    readonly port: string;
    readonly band: Band;
    /** The cell patched in, or none: then its knob, a share 0…1 for the pointer (null: no value written). */
    readonly from?: string;
    readonly knob?: number | null;
    /** A value written on the line (an inline envelope): the jack is set, not at its default. */
    readonly set?: boolean;
  }
  type Face = 'lowpass' | 'amp' | 'lfo' | 'sh' | 'saw' | 'square' | 'adsr' | 'line' | 'kick' | 'noise' | 'groove' | 'card' | 'drift';
  interface Cell {
    readonly name: string;
    readonly x: number;
    readonly y: number;
    readonly r: number;
    readonly face: Face;
    /** A module (a `from` line on a fragment with a signature), and which. */
    readonly module?: string;
    /** Its jacks, as `jacksOf` gives them; its output is drawn apart (on top). */
    readonly jacks?: readonly Jack[];
    /** A voice's jacks, drawn only in `all`. */
    readonly voice?: readonly Jack[];
  }

  // Patchbay's cells, laid out by hand on a 1440 × 900 page (the tower's order: structure low, voices, then the card)
  const CELLS: readonly Cell[] = [
    { name: 'out', x: 720, y: 70, r: 34, face: 'card' },
    {
      name: 'vca',
      x: 640,
      y: 250,
      r: 52,
      face: 'amp',
      module: 'amp',
      jacks: [
        { port: 'eg', band: 'cv', knob: null, set: true },
        { port: 'level', band: 'cv', knob: 1 },
        { port: 'in', band: 'audio', from: 'vcf' },
      ],
    },
    {
      name: 'vcf',
      x: 640,
      y: 470,
      r: 58,
      face: 'lowpass',
      module: 'lowpass',
      jacks: [
        { port: 'cutoff', band: 'cv', from: 'sweep' },
        { port: 'res', band: 'cv', from: 'jitter' },
        { port: 'eg', band: 'cv', from: 'contour' },
        { port: 'in', band: 'audio', from: 'saw' },
      ],
    },
    { name: 'saw', x: 470, y: 640, r: 40, face: 'saw', module: 'osc', jacks: [{ port: 'pitch', band: 'cv', knob: 0 }] },
    { name: 'sub', x: 800, y: 640, r: 40, face: 'square', module: 'osc', jacks: [{ port: 'pitch', band: 'cv', from: 'drift' }] },
    { name: 'seq', x: 250, y: 470, r: 40, face: 'line' },
    { name: 'sweep', x: 500, y: 830, r: 32, face: 'lfo', module: 'lfo', jacks: [] },
    { name: 'jitter', x: 650, y: 840, r: 32, face: 'sh', module: 'sh', jacks: [] },
    { name: 'contour', x: 790, y: 830, r: 30, face: 'adsr' },
    { name: 'drift', x: 960, y: 790, r: 28, face: 'drift' },
    {
      name: 'kick',
      x: 1100,
      y: 440,
      r: 40,
      face: 'kick',
      voice: [
        { port: 'lpf', band: 'cv', knob: null },
        { port: 'hpf', band: 'cv', knob: null },
        { port: 'room', band: 'cv', knob: null },
        { port: 'pitch', band: 'cv', knob: 0.1 },
        { port: 'env', band: 'cv', from: 'thump' },
        { port: 'fm', band: 'audio', knob: null },
      ],
    },
    {
      name: 'hat',
      x: 1280,
      y: 440,
      r: 40,
      face: 'noise',
      voice: [
        { port: 'lpf', band: 'cv', knob: null },
        { port: 'hpf', band: 'cv', knob: 0.8 },
        { port: 'room', band: 'cv', knob: null },
        { port: 'pitch', band: 'cv', knob: null },
        { port: 'env', band: 'cv', from: 'click' },
        { port: 'fm', band: 'audio', knob: null },
      ],
    },
    { name: 'thump', x: 1100, y: 700, r: 24, face: 'adsr' },
    { name: 'click', x: 1280, y: 700, r: 24, face: 'adsr' },
    { name: 'beat', x: 1190, y: 250, r: 40, face: 'groove' },
  ];
  // the sub's input is the vcf's second (a mix of two: [&saw, &sub * .5])
  const SECOND: Record<string, string> = { sub: 'vcf' };
  // the cells a module's use gives that the cluster draws today (decision 038's group): its private cells
  const PRIVATE: Record<string, readonly { name: string; dx: number; dy: number; face: Face }[]> = {
    vcf: [{ name: 'vcf_in', dx: -110, dy: 40, face: 'groove' }],
    vca: [
      { name: 'vca_eg', dx: -120, dy: 20, face: 'adsr' },
      { name: 'vca_level', dx: 115, dy: 25, face: 'line' },
    ],
    saw: [{ name: 'saw_pitch', dx: -90, dy: 40, face: 'line' }],
    sub: [{ name: 'sub_pitch', dx: 90, dy: 40, face: 'line' }],
  };

  const OPTIONS = ['cluster', 'module', 'all', 'chosen'] as const;
  type Option = (typeof OPTIONS)[number];
  const TITLE: Record<Option, string> = {
    cluster: 'cluster — today’s use group, its jacks hung on the head',
    module: 'module — one wheel, its face, its jacks on the rim',
    all: 'all — modules, and a voice’s jacks on its own wheel',
    chosen: 'chosen (decision 069) — all, the unused jacks hidden, the wheels grown a finger per jack',
  };
  const VIEWS = [
    { key: 'desktop', width: 1440, box: [0, 0, 1440, 900] },
    { key: 'phone', width: 390, box: [0, 0, 1440, 900] },
    // (the vcf at 1:1 on a phone: a jack's finger target, 44 px, drawn dashed)
    { key: 'phone-close', width: 390, box: [445, 300, 390, 420] },
  ] as const;

  const AUDIO = noteColour(30);
  const CV = 'var(--text-muted)';
  const NOTES = noteColour(210);
  const JACK = 7;
  const TARGET = 22;

  /** The jacks a cell shows in an option, and where on its rim: inputs over the lower half, left to right; the output on top. */
  /** A jack in use: holding a cable, or a value (a knob's default, a value set on the line); the rest are hidden at rest in `chosen`. */
  const inUse = (j: Jack) => !!j.from || !!j.set || j.knob != null;
  /** The radius a wheel grows to in `chosen`: its jacks a finger (44 px) apart in a straight line over its lower half (0.9 π), never smaller than it was (decision 069 §6). */
  const grown = (c: Cell, n: number) => (n > 1 ? Math.max(c.r, 22 / Math.sin((0.45 * Math.PI) / (n - 1))) : c.r);
  /** A cell's jacks shown in an option. */
  const shown = (c: Cell, option: Option): readonly Jack[] => {
    const all = (option === 'all' || option === 'chosen') && c.voice ? c.voice : c.module ? (c.jacks ?? []) : [];
    return option === 'chosen' ? all.filter(inUse) : all;
  };

  function placed(c: Cell, option: Option): { jack: Jack; x: number; y: number; ux: number; uy: number }[] {
    const jacks = shown(c, option);
    if (option === 'cluster')
      // (hung under the head, a row of tabs)
      return jacks.map((jack, i) => ({ jack, x: c.x + (i - (jacks.length - 1) / 2) * 44, y: c.y + c.r + 16, ux: 0, uy: 1 }));
    // (over the lower half, a little past it on each side for six)
    const spread = option === 'chosen' || jacks.length > 4 ? 0.05 : 0.15;
    const from = Math.PI * spread;
    const to = Math.PI * (1 - spread);
    return jacks.map((jack, i) => {
      const a = jacks.length === 1 ? Math.PI / 2 : from + ((to - from) * i) / (jacks.length - 1);
      return { jack, x: c.x - Math.cos(a) * (c.r + 2), y: c.y + Math.sin(a) * (c.r + 2), ux: -Math.cos(a), uy: Math.sin(a) };
    });
  }
  const output = (c: Cell) => ({ x: c.x, y: c.y - c.r - 2 });

  /** A cable from a cell's output to a point: a sigmoid, wavy where it carries sound. */
  function cable(x1: number, y1: number, x2: number, y2: number, band: Band): string {
    const n = 48;
    const pts: string[] = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const e = t * t * (3 - 2 * t);
      let x = x1 + (x2 - x1) * e;
      let y = y1 + (y2 - y1) * t;
      if (band === 'audio' && i > 0 && i < n) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const len = Math.hypot(dx, dy) || 1;
        const w = Math.sin(t * Math.PI * 2 * Math.max(3, len / 40)) * 3.5;
        x += (-dy / len) * w;
        y += (dx / len) * w;
      }
      pts.push(`${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`);
    }
    return pts.join('');
  }

  /** A face's glyph, in the wheel's own coordinates (radius r). */
  function face(f: Face, r: number): string {
    const s = r * 0.6;
    switch (f) {
      case 'lowpass':
        return `M${-s},${-s * 0.1} L${-s * 0.15},${-s * 0.1} Q${s * 0.12},${-s * 0.1} ${s * 0.2},${-s * 0.55} Q${s * 0.28},${-s * 0.1} ${s * 0.45},${s * 0.4} L${s},${s * 0.55}`;
      case 'amp':
        return [-0.6, -0.2, 0.2, 0.6].map((x, i) => `M${x * s},${s * 0.6} L${x * s},${s * 0.6 - [0.5, 1.1, 0.8, 0.4][i]! * s}`).join('');
      case 'lfo':
      case 'drift': {
        const pts = Array.from({ length: 25 }, (_, i) => `${i ? 'L' : 'M'}${(-1 + i / 12) * s},${-Math.sin((i / 12) * Math.PI) * s * 0.6}`);
        return pts.join('');
      }
      case 'sh':
        return `M${-s},${s * 0.2} h${s * 0.4} v${-s * 0.7} h${s * 0.4} v${s * 0.9} h${s * 0.4} v${-s * 0.4} h${s * 0.4} v${-s * 0.5} h${s * 0.4}`;
      case 'saw':
        return `M${-s},${s * 0.5} L${-s * 0.1},${-s * 0.5} L${-s * 0.1},${s * 0.5} L${s * 0.8},${-s * 0.5} L${s * 0.8},${s * 0.5}`;
      case 'square':
        return `M${-s},${s * 0.5} V${-s * 0.5} H${-s * 0.1} V${s * 0.5} H${s * 0.8} V${-s * 0.5}`;
      case 'adsr':
        return `M${-s},${s * 0.5} L${-s * 0.8},${-s * 0.6} L${-s * 0.3},${s * 0.1} L${s * 0.4},${s * 0.1} L${s},${s * 0.5}`;
      case 'kick':
        return `M${-s},${-s * 0.5} Q${-s * 0.6},${s * 0.5} ${s},${s * 0.45}`;
      case 'noise':
        return Array.from({ length: 9 }, (_, i) => `M${(-1 + i / 4) * s},${(((i * 7) % 5) / 2.5 - 1) * s * 0.5} h1`).join('');
      case 'line':
        return `M${-s},${s * 0.3} L${-s * 0.5},${-s * 0.3} L0,${s * 0.1} L${s * 0.5},${-s * 0.5} L${s},${0}`;
      case 'groove':
        return [0, 1, 2, 3, 4, 5, 6, 7].map((i) => `M${Math.cos((i / 8) * 2 * Math.PI) * s * 0.75},${Math.sin((i / 8) * 2 * Math.PI) * s * 0.75} h1`).join('');
      case 'card':
        return `M${-s * 0.6},${-s * 0.3} h${s * 0.4} l${s * 0.5},${-s * 0.4} v${s * 1.4} l${-s * 0.5},${-s * 0.4} h${-s * 0.4} z`;
    }
  }

  /** What an option draws: the cells (less a module's private ones, or with them), their jacks, and the cables. */
  function drawing(option: Option) {
    // (in `chosen`, each wheel grown to its jacks)
    const cells = option === 'chosen' ? CELLS.map((c) => ({ ...c, r: grown(c, shown(c, option).length) })) : CELLS;
    const byName = new Map(cells.map((c) => [c.name, c]));
    const jacks = new Map(cells.map((c) => [c.name, placed(c, option)]));
    const cables: { d: string; band: Band; note?: boolean }[] = [];
    const extra: { name: string; x: number; y: number; face: Face }[] = [];
    const washes: { x: number; y: number; rx: number; ry: number; label: string }[] = [];
    for (const c of cells) {
      for (const p of jacks.get(c.name) ?? []) {
        if (!p.jack.from) continue;
        const src = byName.get(p.jack.from);
        if (!src) continue;
        const o = output(src);
        cables.push({ d: cable(o.x, o.y, p.x, p.y + (option === 'cluster' ? 0 : 0), p.jack.band), band: p.jack.band });
      }
    }
    // the sub into the vcf's input too (the mix's second entry)
    for (const [from, into] of Object.entries(SECOND)) {
      const p = (jacks.get(into) ?? []).find((j) => j.jack.port === 'in');
      const src = byName.get(from)!;
      if (p) cables.push({ d: cable(output(src).x, output(src).y, p.x + 8, p.y, 'audio'), band: 'audio' });
    }
    // the sound into the card: the vca's and the beat's; the voices into the beat (a groove of them)
    const out = byName.get('out')!;
    for (const n of ['vca', 'beat']) {
      const c = byName.get(n)!;
      cables.push({ d: cable(output(c).x, output(c).y, out.x + (n === 'vca' ? -10 : 10), out.y + out.r, 'audio'), band: 'audio' });
    }
    for (const n of ['kick', 'hat']) {
      const c = byName.get(n)!;
      const b = byName.get('beat')!;
      cables.push({ d: cable(output(c).x, output(c).y, b.x + (n === 'kick' ? -14 : 14), b.y + b.r, 'audio'), band: 'audio' });
    }
    // a voice's env= where its jacks aren't drawn: a plain wire as today
    if (option !== 'all')
      for (const [env, v] of [
        ['thump', 'kick'],
        ['click', 'hat'],
      ] as const) {
        const e = byName.get(env)!;
        const c = byName.get(v)!;
        cables.push({ d: cable(output(e).x, output(e).y, c.x, c.y + c.r, 'cv'), band: 'cv' });
      }
    // the notes: the sequencer's into the vca (a product's junction, as the graph's note bus)
    const vca = byName.get('vca')!;
    const seq = byName.get('seq')!;
    cables.push({ d: cable(output(seq).x, output(seq).y, vca.x - vca.r - 4, vca.y, 'cv'), band: 'cv', note: true });
    if (option === 'cluster')
      for (const [head, list] of Object.entries(PRIVATE)) {
        const h = byName.get(head)!;
        for (const p of list) extra.push({ name: p.name, x: h.x + p.dx, y: h.y + p.dy, face: p.face });
        const xs = [h.x, ...list.map((p) => h.x + p.dx)];
        const ys = [h.y, ...list.map((p) => h.y + p.dy)];
        washes.push({
          x: (Math.min(...xs) + Math.max(...xs)) / 2,
          y: (Math.min(...ys) + Math.max(...ys)) / 2 + 10,
          rx: (Math.max(...xs) - Math.min(...xs)) / 2 + h.r + 30,
          ry: (Math.max(...ys) - Math.min(...ys)) / 2 + h.r + 30,
          label: `from ${h.module}`,
        });
      }
    return { cells, jacks, cables, extra, washes };
  }
  const drawings = Object.fromEntries(OPTIONS.map((o) => [o, drawing(o)])) as Record<Option, ReturnType<typeof drawing>>;
  const knobAngle = (k: number) => Math.PI * (0.75 + 1.5 * k);
</script>

<main>
  <h1>#554 · a module drawn as one wheel with its jacks — a mock-up of Patchbay (yggi/cells examples/patchbay.md)</h1>
  <p class="legend">
    <span class="sw" style:background={AUDIO}></span> sound (audio band) · <span class="sw" style:background={CV}></span> CV · <span class="sw" style:background={NOTES}></span> notes
    · ● a cable in a jack · ◔ a knob (no cable): its pointer at the default · ◉ set on the line · ○ unset (no value written) · dashed: a jack's 44 px finger target
  </p>
  {#each VIEWS as view (view.key)}
    <section class="row">
      {#each OPTIONS as option (option)}
        {@const d = drawings[option]}
        <figure data-kind={`${option}-${view.key}`} style:width={`${view.width}px`}>
          <figcaption>{TITLE[option]} · {view.key} ({view.width} px)</figcaption>
          <svg viewBox={view.box.join(' ')} width={view.width} height={(view.width * view.box[3]) / view.box[2]}>
            <rect x={view.box[0]} y={view.box[1]} width={view.box[2]} height={view.box[3]} fill="var(--bg)" />
            {#each d.washes as w (w.label + w.x)}
              <ellipse cx={w.x} cy={w.y} rx={w.rx} ry={w.ry} fill={noteColour(300)} opacity="0.12" />
              <text class="wash" x={w.x} y={w.y - w.ry + 22}>{w.label}</text>
            {/each}
            {#each d.cables as c, i (i)}
              <path
                d={c.d}
                fill="none"
                stroke={c.note ? NOTES : c.band === 'audio' ? AUDIO : CV}
                stroke-width={c.band === 'audio' ? 3.5 : 5}
                stroke-dasharray={c.note ? '2 7' : undefined}
                stroke-linecap="round"
                opacity="0.9"
              />
            {/each}
            {#each d.extra as e (e.name)}
              <g transform={`translate(${e.x},${e.y})`}>
                <circle r="26" fill="var(--surface)" stroke="var(--line)" stroke-width="2" />
                <path d={face(e.face, 26)} fill="none" stroke="var(--text-muted)" stroke-width="2" />
                <text class="name" y="40">&{e.name}</text>
              </g>
            {/each}
            {#each d.cells as c (c.name)}
              <g transform={`translate(${c.x},${c.y})`}>
                <circle
                  r={c.r}
                  fill="var(--surface)"
                  stroke={c.module && option !== 'cluster' ? 'var(--accent)' : 'var(--line)'}
                  stroke-width={c.module && option !== 'cluster' ? 3 : 2}
                />
                <path
                  d={face(c.face, c.r)}
                  fill="none"
                  stroke={c.face === 'lowpass' || c.face === 'amp' ? AUDIO : 'var(--text)'}
                  stroke-width="3"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
                <text class="name" y={c.r + ((d.jacks.get(c.name)?.length ?? 0) ? (option === 'cluster' ? 62 : 52) : 18)}
                  >&{c.name}{c.module && option !== 'cluster' ? ` · ${c.module}` : ''}</text
                >
                {#if option !== 'cluster' && c.module}
                  <!-- the output, on top -->
                  <circle cy={-c.r - 2} r={JACK} fill="var(--bg)" stroke={AUDIO} stroke-width="3" />
                {/if}
              </g>
              {#each d.jacks.get(c.name) ?? [] as p, i (p.jack.port)}
                {@const colour = p.jack.band === 'audio' ? AUDIO : CV}
                <g transform={`translate(${p.x},${p.y})`}>
                  {#if view.key === 'phone-close'}
                    <circle r={TARGET} fill="none" stroke="var(--text-faint)" stroke-dasharray="3 4" />
                  {/if}
                  {#if p.jack.from}
                    <circle r={JACK} fill={colour} stroke="var(--bg)" stroke-width="2" />
                  {:else if p.jack.set}
                    <circle r={JACK} fill="var(--bg)" stroke={colour} stroke-width="3" />
                    <circle r={JACK - 4} fill={colour} />
                  {:else if p.jack.knob != null}
                    <circle r={JACK} fill="var(--surface-2)" stroke={colour} stroke-width="2" />
                    <line x1="0" y1="0" x2={Math.cos(knobAngle(p.jack.knob)) * JACK} y2={Math.sin(knobAngle(p.jack.knob)) * JACK} stroke="var(--text)" stroke-width="2" />
                  {:else}
                    <circle r={JACK} fill="none" stroke={colour} stroke-width="1.5" stroke-dasharray="2 2" />
                  {/if}
                  <!-- (the middle ones staggered, so neighbours under the wheel don't run together) -->
                  <text class="port" x={p.ux * 15} y={p.uy * 15 + 4 + (Math.abs(p.ux) < 0.5 && i % 2 ? 13 : 0)} text-anchor={p.ux < -0.3 ? 'end' : p.ux > 0.3 ? 'start' : 'middle'}
                    >{p.jack.port}</text
                  >
                </g>
              {/each}
            {/each}
          </svg>
        </figure>
      {/each}
    </section>
  {/each}
</main>

<style>
  main {
    background: var(--bg);
    color: var(--text);
    font: var(--text-sm) / 1.4 var(--font-ui);
    padding: 16px;
  }
  h1 {
    font-size: var(--text-md);
    margin: 0 0 4px;
  }
  .legend {
    color: var(--text-muted);
    margin: 0 0 12px;
  }
  .sw {
    display: inline-block;
    width: 22px;
    height: 4px;
    vertical-align: middle;
  }
  .row {
    display: flex;
    gap: 16px;
    align-items: flex-start;
    margin-bottom: 16px;
  }
  figure {
    margin: 0;
    flex: none;
  }
  figcaption {
    color: var(--text-muted);
    font-size: var(--text-xs);
    margin-bottom: 4px;
  }
  svg {
    display: block;
    border: 1px solid var(--line);
  }
  text.name {
    fill: var(--text);
    font: 600 15px var(--font-code);
    text-anchor: middle;
  }
  text.port {
    fill: var(--text-muted);
    font: 600 13px var(--font-code);
  }
  text.wash {
    fill: var(--text-muted);
    font: 700 15px var(--font-code);
    text-anchor: middle;
  }
</style>
