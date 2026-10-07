<script lang="ts">
  /**
   * An oscilloscope: its braid lists its channels — anything that sounds (a voice, a resonator, a mix,
   * a tape head: its waveform) or anything that steps or glides (its value over the last two seconds).
   * scope=stack overlays them, scope=split gives each a band, scope=xy draws the first against the
   * second (a Lissajous figure). Several channels: each the chromatic colour of its place in the braid;
   * one: the colour of its value as it goes.
   */
  import { getGraphContext } from './context';
  import { NOTE_NAMES } from '../theory/modes';
  import { clocking } from '../engine/clocking';
  import { notesAt, valueAt, valuesAt } from '../engine/values';
  import { adsrOf } from '../engine/program';
  import { resolvePitch, semitones } from '../engine/helix';
  import { voiceBase } from '../layout/show';
  import { noteColour, scopeBand } from './theme';
  import { onFrames } from '../audio/ticker';
  import { timed } from '../audio/stats';
  import { onScreen } from './kit/attach';

  let { name, w = 240, h = 150, round = false }: { name: string; w?: number; h?: number; round?: boolean } = $props();
  const ctx = getGraphContext();
  const cell = $derived(ctx.program.cells.get(name));
  const mode = $derived(cell && typeof cell.params.scope === 'string' ? cell.params.scope : 'stack');
  const channels = $derived(cell ? cell.units.flatMap((u) => (u.atom.kind === 'ref' ? [u.atom.name] : [])) : []);
  const W = $derived(w);
  const H = $derived(h);
  const pc = (semis: number) => (((Math.round(semis) % 12) + 12) % 12) * 30;
  // a trace: points (null a gap) in 0 … 1, and its colour per point
  type Trace = { name: string; pts: ({ x: number; y: number } | null)[]; colour: (i: number) => string };
  let traces = $state.raw<Trace[]>([]); // (raw: replaced whole every frame — a deep proxy would make every point access a reactive read)
  let xy = $state.raw<{ x: number; y: number }[]>([]);
  let held = 0;

  // a sound's waveform: from a rising zero-crossing (so it stands still), scaled to fit
  function wave(name: string, n = 400): number[] | null {
    const w = ctx.sound.waveform(name);
    if (!w) return null;
    let start = 0;
    for (let i = 1; i < w.length - n; i++)
      if (w[i - 1] < 0 && w[i] >= 0) {
        start = i;
        break;
      }
    const seg = Array.from(w.subarray(start, start + n));
    const top = Math.max(0.02, ...seg.map(Math.abs));
    return seg.map((v) => v / top);
  }
  // a cell's value over the last two seconds (null in its rests): as it is, and scaled to its range
  function values(name: string, now: number, n = 120): { raw: (number | null)[]; norm: (number | null)[] } {
    const raw = Array.from({ length: n }, (_, k) => {
      const t = Math.max(0, now - 2 + (2 * k) / (n - 1));
      return valueAt(ctx.program, ctx.shifts, name, t, clocking(ctx.program, ctx.shifts, t));
    });
    const xs = raw.filter((v): v is number => v !== null);
    const lo = xs.length ? Math.min(...xs) : 0;
    const hi = xs.length ? Math.max(...xs) : 0;
    return { raw, norm: raw.map((v) => (v === null ? null : hi > lo ? ((v - lo) / (hi - lo)) * 2 - 1 : 0)) };
  }

  // ---- spectrum and waterfall: what's in each bin now
  const spectral = $derived(mode === 'spectrum' || mode === 'waterfall');
  const P = (k: string) => (cell && typeof cell.params[k] === 'number' ? (cell.params[k] as number) : undefined);
  const PS = (k: string) => (cell && typeof cell.params[k] === 'string' ? (cell.params[k] as string) : undefined);
  // fold=F: pitches folded by that stride (12: the tonal spectrum, by pitch class — the default);
  // bins=N without a fold: N bands, low to high (1 a level meter, 3 low-mid-high, 20 an equaliser)
  const fold = $derived(P('fold') ?? (P('bins') !== undefined ? 0 : 12));
  const nBands = $derived(fold > 0 ? fold : Math.max(1, Math.round(P('bins') ?? 20)));
  const summed = $derived(PS('channels') !== 'split');
  const NAMES12 = NOTE_NAMES;
  const LO = 30;
  const HI = 16000;
  type Bins = { levels: number[]; labels: string[]; hues: number[] };
  // The bins' layout, worked out when the cell changes — and read once per frame: a $derived read
  // from a frame callback (outside any effect) is recomputed on every read, so the hot loop below
  // works on this plain snapshot instead of on the reactive values.
  const layout = $derived.by(() => {
    const f = fold;
    const n = nBands;
    return {
      fold: f,
      n,
      labels: Array.from({ length: n }, (_, k) => (f === 12 ? NAMES12[k] : f > 0 ? String(k) : '')),
      hues: Array.from({ length: n }, (_, k) => (f > 0 ? (k / f) * 360 : (((Math.round(12 * Math.log2((LO * Math.pow(HI / LO, (k + 0.5) / n)) / 261.63)) % 12) + 12) % 12) * 30)),
    };
  });
  type Layout = typeof layout;
  const bandOfFreq = (L: Layout, f: number) => {
    if (L.fold > 0) return ((Math.round(69 + 12 * Math.log2(f / 440)) % L.fold) + L.fold) % L.fold;
    return Math.min(L.n - 1, Math.max(0, Math.floor((Math.log(f / LO) / Math.log(HI / LO)) * L.n)));
  };
  // a channel's kit, if it plays through one: its tokens are its bins
  const kitOf = (ch: string) => {
    const c = ctx.program.cells.get(ch);
    const k = c?.over ? ctx.program.cells.get(c.over) : undefined;
    return k?.kit ? [...k.children.keys()] : null;
  };
  function binsOf(ch: string, now: number, L: Layout): Bins {
    const kit = kitOf(ch);
    if (kit) {
      const lv = new Array(kit.length).fill(0);
      for (const v of valuesAt(ctx.program, ctx.shifts, ch, now)) if (kit[v]) lv[v] = 1;
      return { levels: lv, labels: kit, hues: kit.map((_, i) => (i / kit.length) * 360) };
    }
    const { n, labels, hues } = L;
    const lv = new Array(n).fill(0);
    const fq = ctx.sound.freqs(ch);
    if (fq) {
      // a sound: its power, gathered into bins — then in dB, −90 … −20 as 0 … 1
      const pw = new Array(n).fill(0);
      for (let i = 1; i < fq.db.length; i++) {
        const f = i * fq.hz;
        if (f < LO || f > HI) continue;
        pw[bandOfFreq(L, f)] += Math.pow(10, fq.db[i] / 10);
      }
      for (let k = 0; k < n; k++) lv[k] = pw[k] > 0 ? Math.max(0, Math.min(1, (10 * Math.log10(pw[k]) + 90) / 70)) : 0;
      return { levels: lv, labels, hues };
    }
    // notes or chords: exactly what sounds — a gate per bin; through a voice with an envelope, the
    // envelope's level (attack, decay to sustain)
    const base = voiceBase(ctx.program, ch);
    const voice = ctx.program.outputs.find((o) => o.cell === ch && !o.kit)?.voice;
    const envName = voice ? ctx.program.cells.get(voice)?.params.env : undefined;
    const envCell = typeof envName === 'string' ? ctx.program.cells.get(envName) : undefined;
    const env = envCell ? adsrOf(envCell) : null;
    const shape = (t: number) => {
      if (!env) return 1;
      if (t < env.attack) return env.attack > 0 ? t / env.attack : 1;
      if (t < env.attack + env.decay) return 1 - (1 - env.sustain) * ((t - env.attack) / Math.max(1e-6, env.decay));
      return env.sustain;
    };
    for (const n of notesAt(ctx.program, ctx.shifts, ch, now)) {
      const v = n.value;
      const r = resolvePitch(ctx.program, ch, Math.floor(v), 0, ctx.shifts);
      const semis = semitones(ctx.program, r.root, r.position) + (v - Math.floor(v));
      const k = bandOfFreq(L, base * Math.pow(2, semis / 12));
      lv[k] = Math.max(lv[k], shape(n.since));
    }
    return { levels: lv, labels, hues };
  }
  let lanes = $state.raw<Bins[]>([]);
  let canvas = $state<HTMLCanvasElement | null>(null);

  // only a scope that can be seen does any work (off screen, or the page in the background, it reads
  // no analysis and draws nothing) — as the spectrum wheels do
  let visible = true;
  $effect(() => {
    const tick = () => {
      if (visible) timed('scope', () => step());
    };
    const step = () => {
      const now = ctx.live?.seconds ?? 0;
      if (spectral) {
        const L = layout;
        const per = channels.map((ch) => binsOf(ch, now, L));
        if (summed && per.length > 1)
          lanes = [
            {
              ...per[0],
              levels: per[0].levels.map((_, k) =>
                Math.min(
                  1,
                  per.reduce((a, b) => a + (b.levels[k] ?? 0), 0),
                ),
              ),
            },
          ];
        else lanes = per;
        if (mode === 'waterfall' && canvas) paintRow();
        return;
      }
      if (ctx.live === null && !ctx.sound.waveform(channels[0] ?? '')) return;
      if (mode === 'xy' && channels.length >= 2) {
        const a = ctx.sound.waveform(channels[0]);
        const b = ctx.sound.waveform(channels[1]);
        if (a && b) {
          const n = Math.min(a.length, b.length);
          // (the scale holds its peak and lets go slowly: a fresh strike fills the screen, and the figure
          // shrinks as it rings away — faster than the scale follows)
          // (from its RMS, not a single spike: a strike's first click and clang don't set the scale)
          let sq = 0;
          for (let i = 0; i < n; i++) sq += a[i] * a[i] + b[i] * b[i];
          const now2 = Math.sqrt(sq / (2 * n)) * 1.8;
          held = Math.max(0.02, now2, held * 0.98);
          const top = held;
          xy = Array.from({ length: Math.floor(n / 2) }, (_, i) => ({ x: a[i * 2] / top, y: b[i * 2] / top }));
        } else {
          const va = values(channels[0], now).norm;
          const vb = values(channels[1], now).norm;
          xy = va.flatMap((x, i) => (x !== null && vb[i] !== null ? [{ x, y: vb[i]! }] : []));
        }
        return;
      }
      const single = channels.length === 1;
      traces = channels.map((name, ci) => {
        const w = wave(name);
        if (w) {
          // (one channel: the colour of the note it sounds; several: the colour of its place)
          const f = single ? ctx.sound.note(name) : null;
          const hue = f ? pc(12 * Math.log2(f / 440) + 69) : pc(ci);
          return { name, pts: w.map((y, i) => ({ x: i / (w.length - 1), y })), colour: () => noteColour(hue) };
        }
        const { raw, norm } = values(name, now);
        return {
          name,
          pts: norm.map((y, i) => (y === null ? null : { x: i / (norm.length - 1), y })),
          colour: (i: number) => noteColour(single && raw[i] !== null ? pc(raw[i]!) : pc(ci)),
        };
      });
    };
    // waveforms ~30 a second; a spectrum (an 8192-point analysis per channel) ~15: plenty for the eye
    const stop = onFrames(tick, () => (spectral ? 66 : 33));
    return stop;
  });

  // the waterfall: the picture moves up a row; the new row is now — each bin its colour, as bright as loud
  function paintRow() {
    const g = canvas?.getContext('2d');
    if (!g || !canvas) return;
    const cw = canvas.width;
    const chh = canvas.height;
    g.drawImage(canvas, 0, -2);
    const laneW = cw / Math.max(1, lanes.length);
    lanes.forEach((ln, li) => {
      const bw = laneW / ln.levels.length;
      ln.levels.forEach((lv, k) => {
        g.fillStyle = scopeBand(ln.hues[k], lv);
        g.fillRect(li * laneW + k * bw, chh - 2, Math.ceil(bw), 2);
      });
    });
  }

  // a band of the screen for channel ci (split), or the whole screen (stack)
  const band = (ci: number) => (mode === 'split' ? { y0: (ci * H) / channels.length, h: H / channels.length } : { y0: 0, h: H });
  const R = $derived(Math.min(W, H) / 2);
  // (on a round screen the spectral views keep inside the square the circle holds: every track in view)
  const box = $derived.by(() => {
    if (!round) return { x: 0, y: 0, w: W, h: H };
    const side = Math.SQRT2 * R * 0.96;
    return { x: (W - side) / 2, y: (H - side) / 2, w: side, h: side };
  });
  const px = (p: { x: number; y: number }, ci: number) => {
    const b = band(ci);
    return { x: 8 + p.x * (W - 16), y: b.y0 + b.h / 2 - p.y * (b.h / 2 - 8) };
  };
  // each trace as a few paths, not a line per segment: neighbouring segments of one colour join
  // (a waveform is one path; a stepped value's trace changes colour with its value)
  const runs = $derived(
    traces.map((tr, ci) => {
      const out: { colour: string; d: string }[] = [];
      let cur: { colour: string; d: string } | null = null;
      for (let i = 0; i < tr.pts.length - 1; i++) {
        const p = tr.pts[i];
        const q = tr.pts[i + 1];
        if (!p || !q) {
          cur = null;
          continue;
        }
        const a = px(p, ci);
        const b = px(q, ci);
        const colour = tr.colour(i);
        const pt = (v: { x: number; y: number }) => `${v.x.toFixed(1)} ${v.y.toFixed(1)}`;
        if (cur && cur.colour === colour) cur.d += `L${pt(b)}`;
        else out.push((cur = { colour, d: `M${pt(a)}L${pt(b)}` }));
      }
      return out;
    }),
  );
</script>

<div
  class="scope"
  data-wheel="scope"
  {@attach onScreen((v) => (visible = v))}
  class:round
  style:width="{W}px"
  style:height="{H}px"
  role="img"
  aria-label="Scope: {channels.join(', ')}"
>
  {#if mode === 'waterfall'}
    <canvas bind:this={canvas} width={Math.round(box.w)} height={Math.round(box.h)} style:left="{box.x}px" style:top="{box.y}px"></canvas>
    {#if lanes[0]}
      <div class="ticks" style:left="{box.x}px" style:width="{box.w}px" style:top="{box.y + box.h - 11}px">
        {#each lanes as ln, li (li)}
          {#each ln.labels as lb, k (k)}
            {#if lb}<span style:left="{((li + (k + 0.5) / ln.labels.length) / lanes.length) * 100}%">{lb}</span>{/if}
          {/each}
        {/each}
      </div>
    {/if}
  {/if}
  <svg viewBox="0 0 {W} {H}" width={W} height={H}>
    {#if mode !== 'waterfall'}
      {#each [1, 2, 3, 4, 5, 6, 7] as i (i)}<line class="grid" x1={(i * W) / 8} y1="0" x2={(i * W) / 8} y2={H} />{/each}
      {#each [1, 2, 3, 4, 5] as i (i)}<line class="grid" x1="0" y1={(i * H) / 6} x2={W} y2={(i * H) / 6} />{/each}
    {/if}
    {#if mode === 'spectrum'}
      {#each lanes as ln, li (li)}
        {@const lh = box.h / lanes.length}
        {@const y0 = box.y + li * lh}
        {@const bw = (box.w - 8) / ln.levels.length}
        {#each ln.levels as lv, k (k)}
          <rect
            x={box.x + 4 + k * bw + 1}
            y={y0 + lh - 12 - lv * (lh - 18)}
            width={Math.max(1, bw - 2)}
            height={Math.max(1, lv * (lh - 18))}
            rx="1.5"
            style:fill={noteColour(ln.hues[k])}
            style:opacity={0.3 + 0.7 * lv}
          />
          {#if ln.labels[k] && ln.levels.length <= 24}<text class="bin" x={box.x + 4 + (k + 0.5) * bw} y={y0 + lh - 2}>{ln.labels[k]}</text>{/if}
        {/each}
      {/each}
    {:else if mode === 'xy'}
      {#if xy.length > 1}
        <polyline
          class="trace"
          points={xy.map((p) => `${W / 2 + p.x * (Math.min(W, H) / 2 - 10)},${H / 2 - p.y * (Math.min(W, H) / 2 - 10)}`).join(' ')}
          style:stroke={noteColour(pc(0))}
        />
      {/if}
    {:else if mode !== 'waterfall'}
      {#each runs as rs, ci (ci)}
        {#each rs as r, i (i)}
          <path class="trace" d={r.d} style:stroke={r.colour} />
        {/each}
      {/each}
    {/if}
    {#if mode === 'xy'}
      <text class="chan" x={round ? W / 2 : 8} y={round ? 22 : 13} text-anchor={round ? 'middle' : 'start'} style:fill={noteColour(pc(0))}
        >{round ? `&${channels[0] ?? '—'} × &${channels[1] ?? '—'}` : `x: &${channels[0] ?? '—'} · y: &${channels[1] ?? '—'}`}</text
      >
    {:else if mode !== 'spectrum' && mode !== 'waterfall'}
      {#each channels as nm, ci (ci)}
        <text class="chan" x={round ? W / 2 : 8} y={band(ci).y0 + (round && ci === 0 ? 24 : 13)} text-anchor={round ? 'middle' : 'start'} style:fill={noteColour(pc(ci))}
          >&{nm}</text
        >
      {/each}
    {/if}
  </svg>
  {#if round}<div class="glass" aria-hidden="true"></div>{/if}
</div>

<style>
  .scope {
    position: relative;
    overflow: hidden;
    border-radius: 10px;
    background: radial-gradient(ellipse at 50% 40%, var(--scope-face), var(--scope-black) 80%);
    border: 3px solid var(--scope-bezel);
    box-shadow:
      inset 0 0 18px rgba(0, 0, 0, 0.8),
      0 6px 18px rgba(0, 0, 0, 0.5);
  }
  /* the cathode-ray tube: round, its face darker and curving away at the edge */
  .scope.round {
    border-radius: 50%;
    border: 6px solid var(--scope-tube);
    box-shadow:
      0 0 0 2px var(--scope-tube-edge),
      0 8px 22px rgba(0, 0, 0, 0.6);
  }
  .glass {
    position: absolute;
    inset: 0;
    border-radius: 50%;
    pointer-events: none;
    background:
      radial-gradient(circle at 50% 50%, transparent 58%, rgba(0, 0, 0, 0.35) 78%, rgba(0, 0, 0, 0.85) 100%),
      radial-gradient(circle at 35% 25%, rgba(255, 255, 255, 0.07), transparent 40%);
  }
  canvas {
    position: absolute;
  }
  svg {
    position: relative;
    display: block;
  }
  .grid {
    stroke: var(--scope-grid);
    stroke-width: 1;
  }
  .trace {
    stroke-width: 1.6;
    fill: none;
    stroke-linecap: round;
    filter: drop-shadow(0 0 2px currentColor);
  }
  .chan {
    font: 700 10px var(--font-code);
  }
  .bin {
    font: 700 8px var(--font-code);
    fill: var(--scope-ink);
    text-anchor: middle;
  }
  .ticks {
    position: absolute;
    height: 10px;
    pointer-events: none;
  }
  .ticks span {
    position: absolute;
    transform: translateX(-50%);
    font: 700 8px var(--font-code);
    color: var(--scope-tick);
  }
</style>
