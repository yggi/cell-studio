<script lang="ts">
  /**
   * Edge mock-ups (docs/notes/edge-styles.md): the open questions of how an edge is drawn, each option a row, plain SVG
   * on the app's theme (not the real components: these are what they could become). `node tools/gallery.mjs edge-mockups`.
   */
  import { splinePoint } from '../../../src/layout/geometry';
  import { rippled } from '../../../src/layout/wire';
  import { EDGE, noteColour } from '../../../src/ui/theme';
  import { palette } from '../../../src/ui/palette';
  import { offset, sampleQuad, SPEED, toPath, wavelength, wavePath, type Shape } from './proto';

  type P = { x: number; y: number };
  const pc = (semis: number) => noteColour((((semis % 12) + 12) % 12) * 30, false, Math.floor(semis / 12));

  // ---- 2. sound on a wire ------------------------------------------------------------------------------------------
  const A = { x: 24, y: 70 };
  const B = { x: 276, y: 30 };
  const M = { x: 150, y: 70 };
  type Sound = { label: string; hz: number | null; loud: number; shape: Shape; position: number | null };
  const SOUNDS: Sound[] = [
    { label: 'stopped', hz: null, loud: 0, shape: 'sine', position: null },
    { label: 'C4 sine, quiet', hz: 261.63, loud: 0.25, shape: 'sine', position: 0 },
    { label: 'C4 sine, loud', hz: 261.63, loud: 1, shape: 'sine', position: 0 },
    { label: 'C3 saw, loud', hz: 130.81, loud: 1, shape: 'saw', position: -12 },
    { label: 'G5 square', hz: 783.99, loud: 0.7, shape: 'square', position: 19 },
    { label: 'a mix (several)', hz: 200, loud: 0.8, shape: 'tri', position: null },
  ];
  const soundColour = (s: Sound) => (s.hz ? palette('audio', { position: s.position, loud: s.loud }, s.position === null ? null : { cycle: 12 }) : 'var(--edge)');
  const AMP = (loud: number) => 1 + 4.5 * loud;

  // ---- 3. a clock's ticks --------------------------------------------------------------------------------------------
  type Tick = { label: string; beat: number | null; rate: number };
  // (rate: ticks a second; beat: where the clock is, in its ticks, the bar four)
  const TICKS: Tick[] = [
    { label: 'stopped', beat: null, rate: 2 },
    { label: 'on the bar', beat: 4, rate: 2 },
    { label: '+0.4 of a beat', beat: 4.4, rate: 2 },
    { label: 'beat 2', beat: 5, rate: 2 },
    { label: '&bar*4 (×4 faster)', beat: 16.3, rate: 8 },
    { label: '&bar/4 (×4 slower)', beat: 1.3, rate: 0.5 },
  ];
  const wire = sampleQuad(A, { x: 2 * M.x - (A.x + B.x) / 2, y: 2 * M.y - (A.y + B.y) / 2 }, B, 1);
  const lengths = wire.reduce<number[]>((acc, p, i) => [...acc, i ? acc[i - 1] + Math.hypot(p.x - wire[i - 1].x, p.y - wire[i - 1].y) : 0], []);
  const LEN = lengths[lengths.length - 1];
  const at = (s: number) =>
    wire[
      Math.max(
        0,
        Math.min(
          wire.length - 1,
          lengths.findIndex((l) => l >= s),
        ),
      )
    ];
  const tickLevel = (k: number) => (((k % 4) + 4) % 4 === 0 ? 0 : 1);
  // the ticks on the wire: the one k ticks back is k spacings out; `spacing` px between them (by rate: SPEED / rate)
  const train = (t: Tick, spacing: number) => {
    if (t.beat === null) return [];
    const frac = t.beat - Math.floor(t.beat);
    const out: { p: P; level: number; age: number }[] = [];
    for (let k = 0; (frac + k) * spacing <= LEN; k++) out.push({ p: at((frac + k) * spacing), level: tickLevel(Math.floor(t.beat) - k), age: k });
    return out;
  };

  // ---- 4. a melody into its voice: pitch and gate ---------------------------------------------------------------------
  const MELODY: (number | null)[] = [0, 4, 7, 4, 5, 9, 7, null];
  const STEP = 0.5;
  const noteAt = (t: number) => (t < 0 ? null : MELODY[Math.floor(t / STEP) % MELODY.length]);
  const TIMES = [null, 0.1, 0.6, 1.3, 2.2, 3.4];
  // the wire as a delay line: at distance s, what left the source s / SPEED ago — runs of one note, and its onsets
  const runs = (t: number) => {
    const out: { from: number; to: number; note: number | null; onset: boolean }[] = [];
    for (let s = 0; s < LEN;) {
      const ago = t - s / SPEED;
      const k = Math.floor(ago / STEP);
      // (the step's start, as far out as it has travelled)
      const end = Math.min(LEN, (t - k * STEP) * SPEED);
      out.push({ from: s, to: Math.max(end, s + 0.5), note: noteAt(ago), onset: end < LEN && k >= 0 });
      s = Math.max(end, s + 0.5);
    }
    return out;
  };
  const piece = (from: number, to: number) => toPath(wire.filter((_, i) => lengths[i] >= from && lengths[i] <= to));

  // ---- 5. a level (an envelope, lpf=, a gate's duck) -------------------------------------------------------------------
  const LEVEL_TIMES = [null, 0.3, 1.6, 2.4, 3.2, 3.9];
  const levelAt = (t: number) => (t < 0 ? 0 : [1, 1, 0.25, 1, 0.6, 0.15][Math.floor(t / 0.7) % 6]);
  const ribbon = (t: number) => {
    const w = wire.map((_, i) => 1 + 6 * levelAt(t - lengths[i] / SPEED));
    const ns = offset(wire, 1).map((p, i) => ({ x: p.x - wire[i].x, y: p.y - wire[i].y }));
    const left = wire.map((p, i) => ({ x: p.x + (ns[i].x * w[i]) / 2, y: p.y + (ns[i].y * w[i]) / 2 }));
    const right = wire.map((p, i) => ({ x: p.x - (ns[i].x * w[i]) / 2, y: p.y - (ns[i].y * w[i]) / 2 })).reverse();
    return `${toPath([...left, ...right])} Z`;
  };
  const spline = `M ${A.x} ${A.y} Q ${2 * M.x - (A.x + B.x) / 2} ${2 * M.y - (A.y + B.y) / 2} ${B.x} ${B.y}`;
</script>

{#snippet ends()}
  <circle cx={A.x} cy={A.y} r="9" class="node" /><circle cx={B.x} cy={B.y} r="9" class="node" />
{/snippet}

<main class="graph">
  <h1>Edge mock-ups</h1>
  <p class="meta">Options for docs/notes/edge-styles.md, plain SVG on the app's theme · <code>node tools/gallery.mjs edge-mockups</code></p>

  <section>
    <h2>2 · Sound: the wave by what it carries</h2>
    {#each [{ id: 'a', name: 'A · today: one ripple for every sound' }, { id: 'b', name: 'B · a sine: its height the level, its length the pitch' }, { id: 'c', name: "C · the sound's own shape: height the level, length the pitch" }] as row (row.id)}
      <figure data-kind={`2-audio-${row.id}`}>
        <figcaption><b>{row.name}</b></figcaption>
        <div class="row">
          {#each SOUNDS as s (s.label)}
            {@const d =
              row.id === 'a'
                ? rippled(spline, EDGE.ripple.amp, EDGE.ripple.period)
                : s.hz === null
                  ? wavePath(A, M, B, 1, 14)
                  : wavePath(A, M, B, AMP(s.loud), wavelength(s.hz), row.id === 'c' ? s.shape : 'sine')}
            <div class="cell">
              <svg width="300" height="100">
                {@render ends()}
                <path {d} class="audio" style:stroke={row.id === 'a' && s.hz ? soundColour(s) : soundColour(s)} style:opacity={s.hz ? 1 : 0.55} />
              </svg>
              <span class="col">{s.label}</span>
            </div>
          {/each}
        </div>
      </figure>
    {/each}
    <figure data-kind="2-audio-d">
      <figcaption><b>D · C, travelling: the wave moves along the flow at the wire's speed</b><span>C3 saw, four frames a quarter cycle apart</span></figcaption>
      <div class="row">
        {#each [0, 0.25, 0.5, 0.75] as ph (ph)}
          <div class="cell">
            <svg width="300" height="100">
              {@render ends()}
              <path d={wavePath(A, M, B, AMP(1), wavelength(130.81), 'saw', ph)} class="audio" style:stroke={soundColour(SOUNDS[3])} />
            </svg>
            <span class="col">phase {ph}</span>
          </div>
        {/each}
      </div>
    </figure>
  </section>

  <section>
    <h2>3 · A clock: pulse trains</h2>
    {#each [{ id: 'a', name: 'A · today: dotted, one dot at the step phase' }, { id: 'b', name: 'B · a pulse train, ticks a fixed 18 px apart: the rate shows as speed' }, { id: 'c', name: 'C · a pulse train at the wire speed: ticks SPEED / rate apart, the rate shows as density' }] as row (row.id)}
      <figure data-kind={`3-sync-${row.id}`}>
        <figcaption><b>{row.name}</b><span>the bar's first tick in --meter-0, a beat --meter-1</span></figcaption>
        <div class="row">
          {#each TICKS as t (t.label)}
            <div class="cell">
              <svg width="300" height="100">
                {@render ends()}
                {#if row.id === 'a'}
                  <path d={spline} class="sync" style:stroke={t.beat === null ? 'var(--edge)' : palette('sync', tickLevel(Math.floor(t.beat)))} />
                  {#if t.beat !== null}
                    {@const p = splinePoint(A.x, A.y, M.x, M.y, B.x, B.y, t.beat - Math.floor(t.beat))}
                    <circle cx={p.x} cy={p.y} r="4.5" style:fill={palette('sync', tickLevel(Math.floor(t.beat)))} />
                  {/if}
                {:else}
                  <path d={spline} class="rest" />
                  {#each train(t, row.id === 'b' ? 18 : SPEED / t.rate) as k, i (i)}
                    <circle cx={k.p.x} cy={k.p.y} r={k.level === 0 ? 4 : 2.6} style:fill={palette('sync', k.level)} style:opacity={Math.max(0.35, 1 - k.age * 0.06)} />
                  {/each}
                {/if}
              </svg>
              <span class="col">{t.label}</span>
            </div>
          {/each}
        </div>
      </figure>
    {/each}
  </section>

  <section>
    <h2>4 · A melody into its voice: pitch and gate (decision: a 2-wire bus)</h2>
    {#each [{ id: 'a', name: "A · today: the voice's note now, the whole wire; a dot at the step" }, { id: 'b', name: 'B · a delay line: each note travels from the source at the wire speed, a bead at each onset' }, { id: 'c', name: 'C · two wires: the pitch (as B) and a thin gate strand beside it, its pulses at the onsets' }] as row (row.id)}
      <figure data-kind={`4-voice-${row.id}`}>
        <figcaption><b>{row.name}</b><span>0 4 7 4 5 9 7 ~, a step every 0.5 s</span></figcaption>
        <div class="row">
          {#each TIMES as t, ti (ti)}
            <div class="cell">
              <svg width="300" height="100">
                {@render ends()}
                {#if t === null}
                  <path d={spline} class="cv" style:stroke="var(--edge)" />
                {:else if row.id === 'a'}
                  {@const n = noteAt(t)}
                  <path d={spline} class="cv" style:stroke={n === null ? 'var(--edge)' : pc(n)} style:opacity={n === null ? 0.45 : 0.9} />
                  {@const p = splinePoint(A.x, A.y, M.x, M.y, B.x, B.y, (t % STEP) / STEP)}
                  <circle cx={p.x} cy={p.y} r="6" style:fill={n === null ? 'var(--edge)' : pc(n)} />
                {:else}
                  {@const rs = runs(t)}
                  {#each rs as r, i (i)}
                    <path d={piece(r.from, r.to)} class="cv" style:stroke={r.note === null ? 'var(--edge)' : pc(r.note)} style:opacity={r.note === null ? 0.35 : 0.9} />
                  {/each}
                  {#if row.id === 'b'}
                    {#each rs.filter((r) => r.onset && r.to < LEN) as r, i (i)}
                      {@const p = at(r.to)}
                      <circle cx={p.x} cy={p.y} r="4.2" class="bead" />
                    {/each}
                  {:else}
                    {@const gate = offset(wire, -6)}
                    <path d={toPath(gate)} class="rest thin" />
                    {#each rs.filter((r) => r.onset && r.to < LEN) as r, i (i)}
                      {@const p = gate[lengths.findIndex((l) => l >= r.to)]}
                      <circle cx={p.x} cy={p.y} r="2.6" style:fill={palette('sync', 1)} />
                    {/each}
                  {/if}
                {/if}
              </svg>
              <span class="col">{t === null ? 'stopped' : `${t} s`}</span>
            </div>
          {/each}
        </div>
      </figure>
    {/each}
  </section>

  <section>
    <h2>5 · A level (an envelope, lpf=, a gate's duck)</h2>
    {#each [{ id: 'a', name: 'A · today: brightness by the level now, the whole wire' }, { id: 'b', name: 'B · width and brightness by the level now' }, { id: 'c', name: 'C · a ribbon: width and brightness along the wire, as the level left the source (a delay line)' }] as row (row.id)}
      <figure data-kind={`5-level-${row.id}`}>
        <figcaption><b>{row.name}</b><span>1 1 .25 1 .6 .15, a step every 0.7 s</span></figcaption>
        <div class="row">
          {#each LEVEL_TIMES as t, ti (ti)}
            <div class="cell">
              <svg width="300" height="100">
                {@render ends()}
                {#if t === null}
                  <path d={spline} class="cv" style:stroke="var(--edge)" />
                {:else if row.id === 'c'}
                  <path d={ribbon(t)} class="ribbon" style:fill={palette('level', levelAt(t))} />
                {:else}
                  <path d={spline} class="cv" style:stroke={palette('level', levelAt(t))} style:stroke-width={row.id === 'b' ? 1 + 6 * levelAt(t) : 5} />
                {/if}
              </svg>
              <span class="col">{t === null ? 'stopped' : `${t} s · ${levelAt(t ?? 0)}`}</span>
            </div>
          {/each}
        </div>
      </figure>
    {/each}
  </section>
</main>

<style>
  :global(body) {
    margin: 0;
    background: var(--bg);
    color: var(--text);
  }
  main {
    padding: 20px 24px 40px;
    font-family: var(--font-ui);
  }
  h1 {
    font-size: 20px;
    margin: 0 0 4px;
  }
  h2 {
    font-size: 15px;
    color: var(--text-muted);
    margin: 24px 0 10px;
  }
  .meta {
    color: var(--text-muted);
    font-size: 13px;
    margin: 0;
  }
  section {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }
  section h2 {
    width: 100%;
  }
  figure {
    margin: 0;
    padding: 10px 12px;
    background: var(--surface);
    border: 1px solid var(--line);
    border-radius: var(--radius);
    width: max-content;
  }
  figcaption {
    font: 12px/1.4 var(--font-ui);
    color: var(--text-muted);
    margin-bottom: 4px;
  }
  figcaption b {
    color: var(--accent);
  }
  figcaption span {
    margin-left: 8px;
  }
  .row {
    display: flex;
    gap: 4px;
  }
  .cell {
    display: flex;
    flex-direction: column;
    align-items: center;
    background: var(--bg);
    border-radius: 6px;
  }
  .col {
    font-size: 11px;
    color: var(--text-muted);
    padding-bottom: 4px;
  }
  svg {
    display: block;
  }
  .node {
    fill: var(--surface-2);
    stroke: var(--line);
  }
  .audio {
    fill: none;
    stroke-width: 3;
    stroke-linejoin: round;
    stroke-linecap: round;
  }
  .sync {
    fill: none;
    stroke-width: 3;
    stroke-dasharray: 0.5 8;
    stroke-linecap: round;
  }
  .rest {
    fill: none;
    stroke: var(--edge);
    stroke-opacity: 0.35;
    stroke-width: 2;
  }
  .rest.thin {
    stroke-width: 1.2;
  }
  .cv {
    fill: none;
    stroke-width: 5;
    stroke-linecap: round;
  }
  .bead {
    fill: var(--wheel-hand);
    stroke: var(--wheel-hand-edge);
  }
  .ribbon {
    stroke: none;
  }
</style>
