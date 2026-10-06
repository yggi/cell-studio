<script lang="ts" module>
  // (each glyph's own ids for its patterns: counted, not drawn by chance)
  let glyphs = 0;
</script>

<script lang="ts">
  import { onDestroy, untrack } from 'svelte';
  import { noteColour } from './theme';
  import { cellView, hubLabel, type CellView, type Fill, type Segment } from '../layout/cellview';
  import { BORDER, border, coarsen } from '../layout/coarse';
  import { names, noteLabel, tonicOf, voiceBase } from '../layout/show';
  import { polar, ringSegment } from '../layout/geometry';
  import { envelopeNames, wheelGeometry } from '../layout/wheel';
  import { angleOf, fitFont, hubMax, turnDelta } from '../layout/dial';
  import { mod } from '../theory/modes';
  import { getGraphContext } from './context';

  /**
   * `interactive`: the rim turns the cell (detail sheet). In the graph the whole node just drags.
   * `fine`: draw every step of a long braid; by default one over ~160 segments is drawn coarser (`coarsen`).
   */
  let { name, isMeter, size = 128, interactive = false, fine = false }: { name: string; isMeter: boolean; size?: number; interactive?: boolean; fine?: boolean } = $props();
  const ctx = getGraphContext();

  // (the one wheel geometry: layout/wheel.ts)
  const geo = $derived(wheelGeometry(size));
  const c = $derived(geo.c);
  const margin = $derived(geo.margin);
  const rOuter = $derived(geo.rOuter);
  const k = $derived(geo.k);
  const rInner = $derived(geo.rInner);
  const EPS = 1e-9;

  // A node can outlive its cell for a frame when the program changes (preset switch); render empty then.
  const EMPTY: CellView = { mode: 'grid', segments: [], ticks: 0, detents: 1 };
  const cell = $derived(ctx.program.cells.get(name));
  // the rim edits the static shift; the drawing shows the shift as it stands now (stepped tables turn)
  const shift = $derived(ctx.shifts(name));
  // the shifts to draw with: as they stand now — redrawn when a table turns, not every frame
  const shown = $derived.by(() => {
    void ctx.turned;
    const still = ctx.shifts;
    return untrack(() => ctx.live?.shifts) ?? still;
  });
  const shownShift = $derived(shown(name));
  // a read head shows what's on its tape: its source's braid
  const drawn = $derived.by(() => {
    const t = cell && typeof cell.params.play === 'string' ? ctx.program.cells.get(cell.params.play) : undefined;
    return t && typeof t.params.write === 'string' && ctx.program.cells.has(t.params.write) ? t.params.write : name;
  });
  // every step, as the cell is written (the rim's turning works on these) …
  const full = $derived(cell ? cellView(ctx.program, drawn, shown, isMeter) : EMPTY);
  // … and what's drawn: a braid of hundreds of steps is merged into ~160 segments (a step is under a pixel
  // there, and each is a path to rewrite whenever a table turns: #41). Segments keep their times, so `lit` works.
  const view = $derived.by<CellView>(() => {
    if (fine || full.mode !== 'braid') return full;
    const segments = coarsen(full.segments);
    return segments === full.segments ? full : { ...full, segments };
  });
  // (motion is a hint for slow cells — a step a second or slower; on faster ones it's noise: none)
  const fast = $derived.by(() => {
    if (!cell?.clock) return false;
    const per = ctx.program.clocks.get(cell.clock)?.perSecond ?? 0;
    return per * (cell.clock === name ? 1 : cell.rate) > 1;
  });

  // motion, subtle: a turn eases into place; a hub value that changes pops, once
  let spin = $state(0);
  let easing = $state(false);
  // a braid's steps rotate as it turns: its new first step was at that step's start in the old
  // drawing, so start turned to there and ease home. A table's entries stay put (its hub says the change).
  // (one pending frame each for the turn and the pop: a newer one replaces it, and none outlives the wheel)
  let turnFrame = 0;
  let popFrame = 0;
  onDestroy(() => (cancelAnimationFrame(turnFrame), cancelAnimationFrame(popFrame)));
  let shownBefore: number | null = null;
  let viewBefore: typeof full | null = null;
  $effect(() => {
    const now = shown(name);
    const v = full;
    if (shownBefore !== null && viewBefore && now !== shownBefore && v.mode === 'braid' && v.detents > 0 && !fast) {
      const delta = now - shownBefore;
      const k = ((delta % v.detents) + v.detents) % v.detents;
      const first = viewBefore.segments.find((sg) => sg.index === k);
      if (first) {
        easing = false;
        spin = (delta > 0 ? first.t0 : first.t0 - 1) * 360;
        cancelAnimationFrame(turnFrame);
        turnFrame = requestAnimationFrame(() => (turnFrame = requestAnimationFrame(() => ((easing = true), (spin = 0)))));
      }
    }
    shownBefore = now;
    viewBefore = v;
  });
  let pop = $state(false);
  let lastBig: string | null = null;
  $effect(() => {
    const big = label.big;
    if (lastBig !== null && big !== lastBig && !fast) {
      pop = false;
      cancelAnimationFrame(popFrame);
      popFrame = requestAnimationFrame(() => (pop = true));
    }
    lastBig = big;
  });
  // show=notes, midi, do, degrees: each step named on the ring (when there's room)
  const base = $derived(cell ? voiceBase(ctx.program, name) : 261.63);
  const tonic = $derived(cell ? tonicOf(ctx.program, name) : 0);
  const labels = $derived.by(() => {
    if (!view.show || !names(view.show)) return [];
    const r = (rInner + rOuter) / 2;
    return view.segments.flatMap((sg) => {
      const n = sg.notes?.[sg.notes.length - 1];
      if (!n) return [];
      // a label where its step has room for it (long braids: the longer steps)
      if ((sg.t1 - sg.t0) * 2 * Math.PI * r < 11) return [];
      const text = noteLabel(view.show!, n, base, tonic, view.conv);
      if (!text) return [];
      const [x, y] = polar(c, c, r, (sg.t0 + sg.t1) / 2);
      return [{ x, y, text, wide: sg.t1 - sg.t0 }];
    });
  });
  // show=matrix: a selector's barrel — a ring per part, a pin where a step picks it
  const pins = $derived.by(() => {
    if (view.mode !== 'matrix' || !view.matrix) return [];
    const { rows, steps } = view.matrix;
    const band = (rOuter - rInner) / Math.max(1, rows);
    return steps.flatMap((st, step) =>
      Array.from({ length: rows }, (_, k) => ({
        d: ringSegment(c, c, rInner + k * band + 0.8, rInner + (k + 1) * band - 0.8, st.t0 + 0.004, st.t1 - 0.004),
        on: st.rows.has(k),
        step,
        fill: noteColour((k / rows) * 360),
      })),
    );
  });
  // the section under the playhead: its pins at full colour (the rest quieter while playing). Apart from the pins,
  // so that the playhead moving does not draw them all again.
  const nowStep = $derived.by(() => {
    if (view.mode !== 'matrix' || !view.matrix || hand === null) return -1;
    return view.matrix.steps.findIndex((st) => hand >= st.t0 - EPS && hand < st.t1 - EPS);
  });
  // show=adsr: the envelope as a curve across the ring — rising, falling, holding, releasing
  const curve = $derived.by(() => {
    if (view.mode !== 'curve' || !view.curve) return null;
    const { attack, decay, sustain, release } = view.curve;
    const hold = Math.max(0.15, (attack + decay + release) * 0.4);
    const total = attack + decay + hold + release || 1;
    const w = rOuter * 1.5;
    const h = rOuter * 0.9;
    const x0 = c - w / 2;
    const y0 = c + h / 2;
    const X = (t: number) => x0 + (t / total) * w;
    const pts = [
      [X(0), y0],
      [X(attack), y0 - h],
      [X(attack + decay), y0 - h * sustain],
      [X(attack + decay + hold), y0 - h * sustain],
      [X(total), y0],
    ];
    return pts;
  });
  const curvePoints = $derived(curve ? curve.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ') : '');
  // its values named on their stretches of the curve (#107): attack by the peak, decay along its fall, sustain
  // under its hold, release by its end — from 112 px up (smaller, the curve alone)
  const envFont = $derived(Math.min(11, size * 0.06));
  const envLabels = $derived.by(() => {
    if (!curve || !view.curve || size < 112) return [];
    const n = envelopeNames(view.curve);
    const [, peak, fall, held, end] = curve;
    const f = envFont;
    return [
      { x: peak[0] + f * 0.3, y: peak[1] - f * 0.5, text: n.a, anchor: 'start' },
      { x: (peak[0] + fall[0]) / 2 + f * 0.6, y: (peak[1] + fall[1]) / 2 - f * 0.4, text: n.d, anchor: 'start' },
      { x: (fall[0] + held[0]) / 2, y: fall[1] + f * 1.2, text: n.s, anchor: 'middle' },
      { x: end[0], y: Math.min(held[1], end[1]) - f * 0.8, text: n.r, anchor: 'end' },
    ];
  });
  // The live state is a new object every tick. What this wheel takes from it is kept as primitives, so that what
  // depends on them runs again only when they change — not every tick, for every wheel on the graph (#13).
  const hasLive = $derived(!!ctx.live?.cells.get(name));
  const liveLocal = $derived(ctx.live?.cells.get(name)?.local ?? null);
  const entriesKey = $derived.by(() => {
    const e = ctx.live?.cells.get(name)?.entries;
    return e && e.size ? [...e].join(',') : '';
  });
  const bar = $derived(ctx.live?.bars.get(name) ?? null);
  const label = $derived(
    cell ? hubLabel(ctx.program, name, shown, isMeter, hasLive ? bar : null) : { big: '', small: '' },
  );
  // the hub's text fits the hub, or is left out (a petal's hub has room for a number, not a sentence); its
  // second line from 80 px up
  const hubWidth = $derived(2 * geo.rHub * 0.86);
  const bigFont = $derived(fitFont(hubWidth, label.big.length, hubMax(size)));
  const smallFont = $derived(size >= 80 && label.small ? fitFont(hubWidth, label.small.length, 11, 7) : null);

  // an accidental is striped: its own colour and the natural's (a semitone back for a sharp)
  const uid = `g${++glyphs}`;
  const stripeKey = (f: { hue: number; octave?: number; alter?: number }) => `${uid}-${Math.round(f.hue)}-${f.octave ?? 0}-${f.alter}`;
  const stripes = $derived.by(() => {
    const m = new Map<string, { a: string; b: string }>();
    for (const sg of view.segments)
      for (const f of sg.bands)
        if (f.kind === 'pitch' && f.alter)
          m.set(stripeKey(f), { a: noteColour(f.hue, false, f.octave ?? 0), b: noteColour((f.hue - 30 * Math.sign(f.alter) + 360) % 360, false, f.octave ?? 0) });
    return m;
  });
  const fillOf = (f: Fill) =>
    f.kind === 'pitch'
      ? f.alter
        ? `url(#${stripeKey(f)})`
        : noteColour(f.hue, false, f.octave ?? 0)
      : f.kind === 'beat'
        ? f.down
          ? 'color-mix(in oklab, var(--accent) 34%, var(--wheel-ref))'
          : 'color-mix(in oklab, var(--wheel-ref) 80%, var(--wheel-disc))'
        : f.kind === 'rest'
          ? 'var(--wheel-rest)'
          : f.kind === 'level'
            ? 'color-mix(in oklab, var(--accent) 70%, var(--wheel-ref))'
            : 'var(--wheel-ref)';

  // What a glyph draws is two things that change at different rates. Where each band goes (`d`) depends on the
  // segments' times, band counts and levels, and not on which note is where: a table turning leaves it as it was.
  // The fills are the notes' colours, and are what a turn changes. So the geometry is kept from one view to the next
  // while its layout is the same (the very same array, so nothing downstream even looks at it), and the paths' `d`
  // are only ever written when a wheel's layout changes (#41).
  const levelOf = (f: Fill) => (f.kind === 'level' ? f.v : -1);
  const sameLayout = (a: Segment, b: Segment) =>
    a.t0 === b.t0 && a.t1 === b.t1 && a.bands.length === b.bands.length && a.bands.every((f, j) => (f.kind === 'level') === (b.bands[j].kind === 'level') && levelOf(f) === levelOf(b.bands[j]));
  const draw = (s: Segment) => {
    const band = (rOuter - rInner) / s.bands.length;
    return s.bands.map((f, j) =>
      // a level is a bar from the inner ring, as tall as the level
      f.kind === 'level'
        ? ringSegment(c, c, rInner, rInner + Math.max(0.04, f.v) * (rOuter - rInner), s.t0, s.t1)
        : ringSegment(c, c, rInner + j * band, rInner + (j + 1) * band, s.t0, s.t1),
    );
  };
  // The border between segments (a stroke in the disc's colour): 1.5 px, as ever. On a wheel the cap merged it
  // would eat most of a segment (2.25° is ~3 px at the rim), so there it tapers with the segment's width: none
  // under 2.5°, full from 6° (`border`, long steps keep theirs). A function of the layout, so it is kept with it.
  const merged = $derived(view.segments !== full.segments);
  const borderOf = (s: Segment) => (merged ? border(s.t1 - s.t0) : BORDER);
  type Laid = { d: string[]; w: number };
  let laid: { key: string; segments: readonly Segment[]; slots: Laid[] } | null = null;
  const geometry = $derived.by(() => {
    const segments = view.segments;
    const key = `${c} ${rInner} ${rOuter} ${merged}`;
    const before = laid && laid.key === key ? laid : null;
    let changed = !before || before.segments.length !== segments.length;
    const slots = segments.map((s, i) => {
      const old = before?.segments[i];
      if (before && old && sameLayout(old, s)) return before.slots[i];
      changed = true;
      return { d: draw(s), w: borderOf(s) };
    });
    if (before && !changed) {
      laid = { ...before, segments }; // (the same drawing, for these segments)
      return before.slots;
    }
    laid = { key, segments, slots };
    return slots;
  });
  const fills = $derived(view.segments.map((s) => s.bands.map(fillOf)));

  const ticks = $derived(
    view.ticks <= 48
      ? Array.from({ length: view.ticks }, (_, i) => {
          const [x1, y1] = polar(c, c, geo.tick.r0, i / view.ticks);
          const [x2, y2] = polar(c, c, geo.tick.r1, i / view.ticks);
          return { x1, y1, x2, y2 };
        })
      : [],
  );

  // which segments are live: braids by time, grids by the entries being looked up
  // (as a key first: the set is made again only when the lit segments change, not every tick)
  const litKey = $derived.by(() => {
    if (!hasLive || view.mode !== 'braid' || liveLocal === null) return '';
    const t = liveLocal / Math.max(1, cell?.steps ?? 1);
    const on: number[] = [];
    view.segments.forEach((s, i) => {
      if (t >= s.t0 - EPS && t < s.t1 - EPS) on.push(i);
    });
    return on.join(',');
  });
  const lit = $derived(new Set(litKey ? litKey.split(',').map(Number) : []));
  // a table: the entries being read now (accessed) — a dot in each, like a read head …
  const accessed = $derived.by(() => {
    const set = new Set<number>();
    if (!hasLive || view.mode === 'braid') return set;
    const k = view.detents;
    for (const e of entriesKey ? entriesKey.split(',').map(Number) : [])
      view.segments.forEach((s, i) => {
        if (s.index === mod(e, k)) set.add(i);
      });
    return set;
  });
  // … and where its 0 has gone (shifted): a notch at the rim, at the entry now first
  const zero = $derived.by(() => {
    // (as it stands now: a stepped table turns as it plays)
    if (view.mode === 'braid' || !shownShift || !view.detents) return null;
    const sg = view.segments.find((sg) => sg.index === mod(shownShift, view.detents));
    return sg ? sg.t0 : null;
  });
  const polarAt = (t: number, r: number) => {
    const [x, y] = polar(c, c, r, t);
    return { x, y };
  };

  // the playhead: braids, and a selector's barrel (where in its sections)
  const hand = $derived((view.mode === 'braid' || view.mode === 'matrix') && liveLocal != null ? liveLocal / Math.max(1, cell?.steps ?? 1) : null);
  // show=lfo: one cycle round the ring — its value the radius; a dot at its phase while playing
  const lfoPath = $derived.by(() => {
    if (view.mode !== 'lfo' || !view.wave) return null;
    const w = view.wave;
    const r = (v: number) => rInner + (rOuter - rInner) * (0.12 + 0.76 * v);
    return (
      w
        .map((v, i) => {
          const [x, y] = polar(c, c, r(v), i / w.length);
          return `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`;
        })
        .join(' ') + 'Z'
    );
  });
  const lfoDot = $derived.by(() => {
    if (view.mode !== 'lfo' || !view.wave || liveLocal == null) return null;
    const t = liveLocal / Math.max(1e-9, cell?.steps ?? 1);
    const w = view.wave;
    const v = w[Math.floor((((t % 1) + 1) % 1) * w.length) % w.length];
    const [x, y] = polar(c, c, rInner + (rOuter - rInner) * (0.12 + 0.76 * v), t);
    return { x, y };
  });
  // a meter's beats, numbered
  const beatLabels = $derived.by(() => {
    if (!isMeter || view.mode !== 'grid' || view.segments.length > 16 || size < 64) return [];
    const r = (rInner + rOuter) / 2;
    return view.segments.map((sg, i) => {
      const [x, y] = polar(c, c, r, (sg.t0 + sg.t1) / 2);
      return { x, y, text: String(i + 1) };
    });
  });

  // ---- turning the rim changes shift: one detent per 1/k of a turn
  let svg: SVGSVGElement;
  let dragging = $state(false);
  let startTurn = 0;
  let startShift = 0;
  let travelled = 0;
  let lastTurn = 0;

  function pointerTurn(e: PointerEvent): number {
    const r = svg.getBoundingClientRect();
    return angleOf(e.clientX, e.clientY, r.left + r.width / 2, r.top + r.height / 2);
  }
  function down(e: PointerEvent) {
    if (e.button !== 0) return;
    e.stopPropagation();
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    dragging = true;
    startTurn = lastTurn = pointerTurn(e);
    startShift = shift;
    travelled = 0;
  }
  let unwrapped = 0;
  function move(e: PointerEvent) {
    if (!dragging) return;
    const t = pointerTurn(e);
    const d = turnDelta(lastTurn, t);
    travelled += Math.abs(d);
    unwrapped += d;
    lastTurn = t;
    const next = startShift + Math.round(unwrapped * view.detents);
    if (next !== shift) ctx.turn(name, next);
  }
  function up(e: PointerEvent) {
    if (!dragging) return;
    e.stopPropagation();
    dragging = false;
    // a tap on the root or a 12-tone table jumps straight to that slot
    if (travelled < 0.02 && view.mode === 'grid' && !isMeter && view.detents === view.ticks) {
      const tapped = Math.round(pointerTurn(e) * view.ticks);
      const zero = view.segments.find((s) => s.index === 0)!;
      const delta = mod(tapped - Math.round(zero.t0 * view.ticks) + view.ticks / 2, view.ticks) - view.ticks / 2;
      if (delta) ctx.turn(name, shift + delta);
    }
    unwrapped = 0;
  }
  function key(e: KeyboardEvent) {
    const step = e.key === 'ArrowRight' || e.key === 'ArrowUp' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowDown' ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    e.stopPropagation();
    ctx.turn(name, shift + step);
  }
</script>

<svg bind:this={svg} data-wheel="cell" data-mode={isMeter ? 'meter' : view.mode} data-show={view.show} width={size} height={size} viewBox="0 0 {size} {size}" role={interactive ? 'group' : 'img'} aria-label="&{name}: {label.big} {label.small}">
  {#if stripes.size}
    <defs>
      {#each [...stripes] as [id, st] (id)}
        <pattern {id} patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)">
          <rect width="6" height="6" fill={st.a} />
          <rect width="3" height="6" fill={st.b} />
        </pattern>
      {/each}
    </defs>
  {/if}
  <circle class="disc" cx={c} cy={c} r={geo.rDisc} />
  {#each ticks as t}<line class="tick" style:stroke-width="{geo.tick.width}px" x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} />{/each}
  {#snippet slots()}
    {#each geometry as slot, i}
      <g class="slot" class:lit={lit.has(i)} stroke-width={slot.w}>
        {#each slot.d as d, j}<path {d} fill={fills[i][j]} fill-rule="evenodd" />{/each}
      </g>
    {/each}
  {/snippet}
  {#if interactive}
    <g
      class="rim interactive"
      class:dragging
      onpointerdown={down}
      onpointermove={move}
      onpointerup={up}
      onpointercancel={up}
      onkeydown={key}
      role="slider"
      tabindex="0"
      aria-label="Shift &{name}"
      aria-valuenow={shift}
      aria-valuetext="shift {shift > 0 ? '+' : ''}{shift} of {view.detents}"
    >
      {@render slots()}
    </g>
  {:else}
    <g class="rim" class:easing style="transform: rotate({spin}deg); transform-origin: {c}px {c}px">{@render slots()}</g>
  {/if}
  {#if lfoPath}
    <circle class="lfo-rim" cx={c} cy={c} r={rInner + (rOuter - rInner) * 0.12} />
    <circle class="lfo-rim" cx={c} cy={c} r={rInner + (rOuter - rInner) * 0.88} />
    <path class="lfo" d={lfoPath} />
    {#if lfoDot}<circle class="lfo-dot" cx={lfoDot.x} cy={lfoDot.y} r={Math.max(3, size / 26)} />{/if}
  {/if}
  {#each pins as pin}
    {@const now = pin.step === nowStep}
    <path
      class="pin"
      class:now
      d={pin.d}
      fill={pin.on ? pin.fill : 'var(--wheel-rest)'}
      opacity={pin.on ? (hand === null || now ? 1 : 0.4) : now ? 0.9 : 0.5}
    />
  {/each}
  {#each beatLabels as l}
    <text class="beat" x={l.x} y={l.y} font-size={Math.max(7, size / 13)}>{l.text}</text>
  {/each}
  {#each labels as l}
    <text class="steplabel" x={l.x} y={l.y} font-size={Math.max(6, Math.min(11, size / 12, l.wide * size * 1.2))}>{l.text}</text>
  {/each}
  {#if curve}
    <polyline class="curve" points={curvePoints} />
  {:else}
  <circle class="hub" cx={c} cy={c} r={geo.rHub} />
  {/if}
  {#if curve}
    {#each envLabels as l (l.text)}<text class="envlabel" x={l.x} y={l.y} style:text-anchor={l.anchor} style:font-size="{envFont}px">{l.text}</text>{/each}
  {:else}
  {#if bigFont}<text class="big" class:pop onanimationend={() => (pop = false)} x={c} y={c} dy={smallFont ? '0.1em' : '0.35em'} style:font-size="{bigFont}px">{label.big}</text>{/if}
  {#if smallFont}<text class="small" x={c} y={c + (bigFont ?? 0) * 0.1} dy="1.45em" style:font-size="{smallFont}px">{label.small}</text>{/if}
  {/if}
  {#if shownShift !== 0 && size >= 80}<text class="shift" x={c} y={c - rInner * 0.5}>{shownShift > 0 ? '+' : ''}{shownShift}</text>{/if}
  {#if hand !== null}
    <g class="hand" style="transform: rotate({hand * 360}deg); transform-origin: {c}px {c}px">
      <line class="edge" x1={c} y1={c - geo.hand.r0} x2={c} y2={c - geo.hand.r1} style:stroke-width="{geo.hand.width + 2}px" />
      <line x1={c} y1={c - geo.hand.r0} x2={c} y2={c - geo.hand.r1} style:stroke-width="{geo.hand.width}px" />
    </g>
  {/if}
  {#each [...accessed] as i (i)}
    {@const sg = view.segments[i]}
    {@const p = polarAt((sg.t0 + sg.t1) / 2, rInner + (rOuter - rInner) * 0.22)}
    <circle class="read" cx={p.x} cy={p.y} r={Math.max(2.2, size * 0.022)} />
  {/each}
  {#if zero !== null}
    {@const a = polarAt(zero, rOuter + 1 * k)}
    {@const b = polarAt(zero - 0.018, rOuter + margin)}
    {@const d = polarAt(zero + 0.018, rOuter + margin)}
    <path class="zero" d="M{a.x},{a.y} L{b.x},{b.y} L{d.x},{d.y} Z" />
  {/if}
</svg>

<style>
  svg {
    display: block;
    overflow: visible;
  }
  .disc {
    fill: var(--wheel-disc);
  }
  .lfo {
    fill: color-mix(in oklab, var(--tok-mod) 18%, transparent);
    stroke: var(--tok-mod);
    stroke-width: 2.2;
    stroke-linejoin: round;
  }
  .lfo-rim {
    fill: none;
    stroke: var(--wheel-tick);
    stroke-width: 1;
    stroke-dasharray: 2 4;
    opacity: 0.7;
  }
  .lfo-dot {
    fill: var(--text);
    filter: drop-shadow(0 0 4px var(--tok-mod));
  }
  .pin {
    transition: opacity 200ms ease;
  }
  .pin.now {
    stroke: var(--text);
    stroke-width: 0.6;
    stroke-opacity: 0.5;
  }
  .beat {
    text-anchor: middle;
    dominant-baseline: central;
    font-family: var(--font-ui);
    font-weight: 700;
    fill: var(--text);
    fill-opacity: 0.55;
    pointer-events: none;
  }
  .steplabel {
    text-anchor: middle;
    dominant-baseline: central;
    font-family: var(--font-code);
    font-weight: 700;
    fill: var(--ink-on-note);
    pointer-events: none;
  }
  /* an envelope's values, on their stretches of the curve */
  .envlabel {
    font-weight: 700;
    fill: var(--text);
    paint-order: stroke;
    stroke: var(--wheel-disc);
    stroke-width: 3px;
  }
  .curve {
    fill: none;
    stroke: var(--accent);
    stroke-width: 3;
    stroke-linejoin: round;
  }
  .tick {
    stroke: var(--wheel-tick);
  }
  .rim.easing {
    transition: transform 340ms cubic-bezier(0.2, 0.8, 0.2, 1);
  }
  .big.pop {
    animation: pop 420ms ease-out;
    transform-box: fill-box;
    transform-origin: center;
  }
  @keyframes pop {
    30% {
      transform: scale(1.18);
      fill: var(--accent);
    }
  }
  .rim.interactive {
    cursor: grab;
    touch-action: none;
  }
  .rim.interactive.dragging {
    cursor: grabbing;
  }
  .rim:focus,
  .rim:focus-visible {
    outline: none;
  }
  .rim:focus-visible path {
    stroke: var(--accent);
  }
  .slot path {
    stroke: var(--wheel-disc);
    stroke-linejoin: round;
  }
  /* the step playing now: brighter, no halo */
  .slot.lit path {
    filter: var(--wheel-lit);
  }
  .hub {
    fill: var(--wheel-hub);
  }
  text {
    text-anchor: middle;
    font-family: var(--font-ui);
    font-variant-numeric: tabular-nums;
    pointer-events: none;
  }
  .big {
    fill: var(--text);
    font-size: 17px;
    font-weight: 700;
  }
  .small {
    fill: var(--text-muted);
    font-size: 11px;
  }
  .shift {
    fill: var(--accent);
    font-size: 10px;
    font-weight: 700;
  }
  .hand line {
    stroke: var(--wheel-hand);
    stroke-linecap: round;
  }
  .hand line.edge {
    stroke: var(--wheel-hand-edge);
  }
  /* a table's entry read now: a dot, like a read head */
  .read {
    fill: var(--wheel-read);
    stroke: var(--wheel-read-edge);
    stroke-width: 1;
  }
  /* where a shifted table's 0 has gone: a notch at the rim */
  .zero {
    fill: var(--text);
    opacity: 0.85;
  }
</style>
