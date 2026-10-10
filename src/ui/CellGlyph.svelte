<script lang="ts" module>
  // (each glyph's own ids for its patterns: counted, not drawn by chance)
  let glyphs = 0;
</script>

<script lang="ts">
  import { DEFAULT_FREQ } from '../engine/program';
  import { onDestroy, untrack } from 'svelte';
  import { blockColour, noteColour, partColour } from './theme';
  import { cellView, hubLabel, type CellView, type Fill, type Segment } from '../layout/cellview';
  import { BORDER, border, coarsen } from '../layout/coarse';
  import { names, noteLabel, tonicOf, voiceBase } from '../layout/show';
  import { polar, ringSegment } from '../layout/geometry';
  import { envelopeNames, wheelGeometry } from '../layout/wheel';
  import { angleOf, fitFont, hubMax, turnDelta } from '../layout/dial';
  import { mod } from '../theory/modes';
  import { getGraphContext } from './context';
  import { meterNow } from '../layout/meters';
  import { cursorOf, fanOf, joins, layTrack, ribbon, stepOn, trackAt, type Laid as LaidBulb } from '../layout/track';

  /**
   * `interactive`: the rim turns the cell (detail sheet). In the graph the whole node just drags.
   * `fine`: draw every step of a long braid; by default one over ~160 segments is drawn coarser (`coarsen`).
   * The sheet's editing, on the same wheel: `tokens` the steps as written (a label on each), `onpick` a tap on a step
   * (its written index), `onhub` a tap on the hub.
   */
  let {
    name,
    isMeter,
    size = 128,
    interactive = false,
    fine = false,
    tokens,
    onpick,
    onhub,
  }: {
    name: string;
    isMeter: boolean;
    size?: number;
    interactive?: boolean;
    fine?: boolean;
    tokens?: readonly string[];
    onpick?: (index: number) => void;
    onhub?: () => void;
  } = $props();
  const ctx = getGraphContext();

  // (the one wheel geometry: layout/wheel.ts)
  const geo = $derived(wheelGeometry(size));
  const c = $derived(geo.c);
  const margin = $derived(geo.margin);
  const rOuter = $derived(geo.rOuter);
  const k = $derived(geo.k);
  const rInner = $derived(geo.rInner);
  const EPS = 1e-9;
  // (a table's hub that selects: the slots coming in, a ring inside the hub)
  const hubRing = $derived({ r0: geo.rHub * 0.58, r1: geo.rHub * 0.86 });

  // A node can outlive its cell for a frame when the program changes (preset switch); render empty then.
  const EMPTY: CellView = { mode: 'grid', segments: [], ticks: 0, detents: 1 };
  const cell = $derived(ctx.program.cells.get(name));
  // the rim edits the static shift; the drawing shows the shift as it stands now (stepped tables turn)
  const shift = $derived(ctx.shifts(name));
  // the shifts to draw with: as they stand now — redrawn when a table turns, not every frame
  const shown = $derived.by(() => {
    void ctx.turned;
    const still = ctx.shifts;
    return untrack(() => ctx.heads.shifts) ?? still;
  });
  const shownShift = $derived(shown(name));
  // a read head shows what's on its tape: its source's braid
  const drawn = $derived.by(() => {
    const t = cell && typeof cell.params.play === 'string' ? ctx.program.cells.get(cell.params.play) : undefined;
    return t && typeof t.params.write === 'string' && ctx.program.cells.has(t.params.write) ? t.params.write : name;
  });
  // every step, as the cell is written (the rim's turning works on these) …
  const full = $derived((cell && cellView(ctx.program, drawn, shown, isMeter)) || EMPTY);
  // … and what's drawn: a braid of hundreds of steps is merged into ~160 segments (a step is under a pixel
  // there, and each is a path to rewrite whenever a table turns: #41). Segments keep their times, so `lit` works.
  const view = $derived.by<CellView>(() => {
    if (fine || full.mode !== 'braid') return full;
    const segments = coarsen(full.segments);
    return segments === full.segments ? full : { ...full, segments };
  });
  // a bulb from the keyboard: Enter or Space opens its cell, Shift+Enter switches it off or on (as tap and hold do)
  const bulbKey = (e: KeyboardEvent, bulb: string) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    e.stopPropagation();
    if (e.key === 'Enter' && e.shiftKey) ctx.toggle(`cell:${bulb}`);
    else ctx.open(bulb);
  };
  // a table of taps (decision 016): its bulbs named by their taps, less what all of them end in (`&hatsBar` … : hats)
  const tapsTable = $derived(!!fanOf(ctx.program, name));
  const tapSuffix = $derived.by(() => {
    if (!tapsTable || !cell) return '';
    const names = cell.units.flatMap((u) => (u.atom.kind === 'ref' ? [u.atom.name] : []));
    let k = 0;
    while (names.every((n) => n.length > k + 2 && n[n.length - 1 - k] === names[0][names[0].length - 1 - k])) k++;
    return k ? names[0].slice(-k) : '';
  });
  const tapName = (n: string) => (tapSuffix ? n.slice(0, -tapSuffix.length) : n);
  // a braid's track (#221): its splices bend out of the ring into bulbs, their steps along them
  const ringMid = $derived((rInner + rOuter) / 2);
  const ringW = $derived(rOuter - rInner);
  const track = $derived(view.bulbs?.length ? layTrack(c, c, ringMid, ringW, view.bulbs) : null);
  const trackKey = $derived(JSON.stringify(view.bulbs ?? []));
  // where it takes no time (back to the ring between two bulbs): a thread
  const threads = $derived(track ? joins(track, Math.max(2, ringW * 0.14)) : []);
  // each bulb: a disc behind it (its own small wheel), a dotted outline when it is a net-ref, its name at its hub
  const bulbs = $derived.by(() => {
    const out: { L: LaidBulb; outline: string | null; text: string; sub: string; font: number | null }[] = [];
    const walk = (list: readonly LaidBulb[]) => {
      for (const L of list) {
        const b = L.bulb;
        const lambda = !!ctx.program.cells.get(b.name)?.lambda;
        const text = lambda ? '' : tapsTable ? tapName(b.name) : `&${b.name}`;
        const sub = [b.label, b.laps > 1 ? `×${b.laps}` : ''].filter(Boolean).join(' ');
        const room = 2 * Math.max(4, L.rho - L.w / 2) * 0.9;
        out.push({
          L,
          outline: b.hollow && track ? ribbon(track, L.T0, L.T1, 0, 1, 1.5) : null,
          text,
          sub,
          font: fitFont(room, Math.max(2, text.length, sub.length), 13, tapsTable ? 4.5 : 6),
        });
        walk(L.bulbs);
      }
    };
    walk(track?.bulbs ?? []);
    return out;
  });
  // (their names, for a screen reader: the wheel's label says what is spliced in)
  const spliced = $derived(
    bulbs
      .map((b) => b.text)
      .filter(Boolean)
      .join(' '),
  );
  // (motion is a hint for slow cells — a step a second or slower; on faster ones it's noise: none)
  const fast = $derived.by(() => {
    if (!cell?.clock) return false;
    const per = ctx.program.clocks.get(cell.clock)?.perSecond ?? 0;
    return per * (cell.clock === name ? 1 : cell.rate) > 1;
  });

  // motion, subtle: a turn eases into place; a hub value that changes pops, once
  let spin = $state(0);
  let easing = $state(false);
  // the inner wheel turns (a braid's steps, a table's entries): the new first was at its place in the old drawing,
  // so start turned to there and ease home under the marker
  // (one pending frame each for the turn and the pop: a newer one replaces it, and none outlives the wheel)
  let turnFrame = 0;
  let popFrame = 0;
  onDestroy(() => (cancelAnimationFrame(turnFrame), cancelAnimationFrame(popFrame)));
  let shownBefore: number | null = null;
  let viewBefore: typeof full | null = null;
  $effect(() => {
    const now = shown(name);
    const v = full;
    if (shownBefore !== null && viewBefore && now !== shownBefore && (v.mode === 'braid' || v.mode === 'grid') && v.detents > 0 && !fast) {
      const delta = now - shownBefore;
      const k = ((delta % v.detents) + v.detents) % v.detents;
      const first = viewBefore.segments.find((sg) => sg.index === k);
      if (first) {
        easing = false;
        const at = first.at ?? first.t0;
        spin = (delta > 0 ? at : at - 1) * 360;
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
  const base = $derived(cell ? voiceBase(ctx.program, name) : DEFAULT_FREQ);
  const tonic = $derived(cell ? tonicOf(ctx.program, name) : 0);
  const labels = $derived.by(() => {
    if (tokens?.length || !view.show || !names(view.show)) return [];
    const r = (rInner + rOuter) / 2;
    return view.segments.flatMap((sg) => {
      const n = sg.notes?.[sg.notes.length - 1];
      if (!n) return [];
      // a label where its step has room for it (long braids: the longer steps); on a track, along it
      const on = track ? stepOn(track, sg.t0, sg.t1) : null;
      if (track && !on) return [];
      const ends = on ? [trackAt(track!, on.tau0).p, trackAt(track!, on.tau1).p] : null;
      const span = ends ? Math.hypot(ends[1][0] - ends[0][0], ends[1][1] - ends[0][1]) : (sg.t1 - sg.t0) * 2 * Math.PI * r;
      if (span < 11) return [];
      const text = noteLabel(view.show!, n, base, tonic, view.conv);
      if (!text) return [];
      const [x, y] = on ? trackAt(track!, (on.tau0 + on.tau1) / 2).p : polar(c, c, r, (sg.t0 + sg.t1) / 2);
      return [{ x, y, text, wide: span / (2 * Math.PI * r) }];
    });
  });
  // the sheet: each written step's span on the ring (its segments, as turned), and its token there
  const units = $derived.by(() => {
    if (!tokens?.length || (view.mode !== 'braid' && view.mode !== 'grid')) return [];
    const n = tokens.length;
    // (the text can be a step ahead of the compiled program: wait for it, or two steps would share a token)
    if (n !== ctx.program.cells.get(name)?.units.length) return [];
    const spans = new Map<number, { t0: number; t1: number }>();
    for (const sg of view.segments) {
      const sp = spans.get(sg.index);
      spans.set(sg.index, sp ? { t0: Math.min(sp.t0, sg.t0), t1: Math.max(sp.t1, sg.t1) } : { t0: sg.t0, t1: sg.t1 });
    }
    const r = (rInner + rOuter) / 2;
    return [...spans].map(([index, sp]) => {
      const written = mod(index + shownShift, n);
      const text = tokens[written] ?? '';
      // (a splice: its token at its bulb's hub)
      const L = track?.bulbs.find((x) => Math.abs(x.bulb.t0 - sp.t0) < 1e-6 && Math.abs(x.bulb.t1 - sp.t1) < 1e-6);
      if (L && track) {
        const font = Math.max(7, fitFont(2 * (L.rho - L.w / 2) * 0.9, Math.max(2, text.length), 15, 0) ?? 7);
        return { written, x: L.C[0], y: L.C[1] + font * 1.2, text, font, d: ribbon(track, L.T0, L.T1) };
      }
      // (a step on a track: its stretch of it)
      const on = track ? stepOn(track, sp.t0, sp.t1) : null;
      if (on && track) {
        const [x, y] = trackAt(track, (on.tau0 + on.tau1) / 2).p;
        const font = Math.max(7, fitFont(ringW * 0.9, Math.max(2, text.length), 15, 0) ?? 7);
        return { written, x, y, text, font, d: ribbon(track, on.tau0, on.tau1) };
      }
      const [x, y] = polar(c, c, r, (sp.t0 + sp.t1) / 2);
      const font = Math.max(7, fitFont(Math.min((sp.t1 - sp.t0) * Math.PI * (rInner + rOuter), rOuter - rInner) * 0.9, Math.max(2, text.length), 15, 0) ?? 7);
      return { written, x, y, text, font, d: ringSegment(c, c, rInner, rOuter, sp.t0, sp.t1) };
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
        fill: partColour(k, rows),
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
  const hasLive = $derived(!!ctx.heads.cells.get(name));
  const liveLocal = $derived(ctx.heads.cells.get(name)?.local ?? null);
  const entriesKey = $derived.by(() => {
    const e = ctx.heads.cells.get(name)?.entries;
    return e && e.size ? [...e].join(',') : '';
  });
  // (the bar it is in: not stopped; at rest the hub says its tempo)
  const bar = $derived(ctx.lit?.bars.get(name) ?? null);
  const label = $derived(cell ? hubLabel(ctx.program, name, shown, isMeter, hasLive ? bar : null) : { big: '', small: '' });
  // the hub's text fits the hub, or is left out (a petal's hub has room for a number, not a sentence); its
  // second line from 80 px up
  const hubWidth = $derived(2 * (view.hub ? hubRing.r0 : geo.rHub) * 0.86);
  const bigFont = $derived(fitFont(hubWidth, label.big.length, hubMax(size)));
  // (a hub with its ring has room for the count alone)
  const smallFont = $derived(size >= 80 && label.small && !view.hub ? fitFont(hubWidth, label.small.length, 11, 7) : null);

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
    a.t0 === b.t0 &&
    a.t1 === b.t1 &&
    a.bands.length === b.bands.length &&
    a.bands.every((f, j) => (f.kind === 'level') === (b.bands[j].kind === 'level') && levelOf(f) === levelOf(b.bands[j]));
  const draw = (s: Segment) => {
    // (on a track: along it, the ring and its bulbs one curve; in a bulb's later lap: drawn once, on its first)
    if (track) {
      const on = stepOn(track, s.t0, s.t1);
      return on ? s.bands.map((_, j) => ribbon(track, on.tau0, on.tau1, j, s.bands.length)) : [];
    }
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
    const key = `${c} ${rInner} ${rOuter} ${merged} ${trackKey}`;
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
  // show=brightness: each degree of a table shaded by the mode that starts on it — the sum of that mode's steps up from
  // it, against the others' (Lydian brightest … Locrian darkest), in the sun's gold
  const brightness = $derived.by(() => {
    if (view.show !== 'brightness' || view.mode !== 'grid' || view.ticks < 2) return null;
    const lap = view.ticks;
    const at = view.segments.map((sg) => Math.round((sg.at ?? sg.t0) * lap));
    const sums = at.map((p) => at.reduce((sum, q) => sum + ((((q - p) % lap) + lap) % lap), 0));
    const [lo, hi] = [Math.min(...sums), Math.max(...sums)];
    return sums.map((v) => (hi > lo ? (v - lo) / (hi - lo) : 0.5));
  });
  const fills = $derived(view.segments.map((s, i) => (brightness ? s.bands.map(() => blockColour(brightness[i])) : s.bands.map(fillOf))));
  // a table of taps wears the colours of the selector reading it (decision 016): each tap its part's colour on the
  // selector's barrel; while playing, the ones the selector has off dimmed, and a cursor from the hub to each it has on
  const tapRings = $derived(tapsTable && track ? bulbs.map((b, i) => ({ L: b.L, colour: partColour(view.segments[i]?.index ?? i, cell?.units.length ?? 1), on: lit.has(i) })) : []);
  const tapCursors = $derived(
    ctx.lit
      ? tapRings.flatMap((t) => {
          if (!t.on) return [];
          const [dx, dy] = [t.L.C[0] - c, t.L.C[1] - c];
          const l = Math.hypot(dx, dy) || 1;
          // (from the hub to the tap's ring, where it meets it: its name inside stays clear)
          const [r0, r1] = [geo.hand.r0 * 0.4, l - t.L.rho];
          const head: [number, number] = [c + (dx / l) * r1, c + (dy / l) * r1];
          return [{ d: `M ${c + (dx / l) * r0} ${c + (dy / l) * r0} L ${head[0]} ${head[1]}`, head, colour: t.colour }];
        })
      : [],
  );

  // What space the wheel is drawn in: a table, scale, key or grid is laid out by pitch (the slots it takes from the
  // table below come in at its hub); a braid by time — its rim a clock, a tick a step. (A meter, a curve, an LFO, a
  // barrel: their own.)
  const pitched = $derived(view.segments.some((sg) => sg.bands[0]?.kind === 'pitch'));
  const space = $derived(isMeter || !pitched ? null : view.mode === 'grid' ? 'pitch' : view.mode === 'braid' ? 'time' : null);
  // the hub of a table that selects (a mode from its key): the slots coming in, a ring inside the hub, the ones it
  // takes bright; and the gear, a wire from each slot taken out to its entry. They turn with the ring.
  const hubSlots = $derived(
    view.hub?.slots.map((sl) => ({ d: ringSegment(c, c, hubRing.r0, hubRing.r1, sl.t0 + 0.003, sl.t1 - 0.003), fill: fillOf(sl.fill), held: sl.held })) ?? [],
  );
  const gears = $derived(
    view.hub?.gears.map((g) => {
      const [x1, y1] = polar(c, c, hubRing.r1, g.from);
      const [qx, qy] = polar(c, c, (hubRing.r1 + rInner) / 2, (g.from + g.to + (Math.abs(g.to - g.from) > 0.5 ? 1 : 0)) / 2);
      const [x2, y2] = polar(c, c, rInner, g.to);
      return { d: `M${x1.toFixed(1)},${y1.toFixed(1)} Q${qx.toFixed(1)},${qy.toFixed(1)} ${x2.toFixed(1)},${y2.toFixed(1)}`, stroke: fillOf(g.fill) };
    }) ?? [],
  );
  // the taps: where each entry leaves the wheel, on a ring of their own outside it (drawn whether wired or not)
  const tapR = $derived(geo.rTap);
  const taps = $derived(
    (view.taps ?? []).map((t, i) => {
      const [x, y] = polar(c, c, tapR, t);
      const sg = view.segments.find((s) => s.index === i);
      return { x, y, fill: sg ? fillOf(sg.bands[0]) : 'var(--edge)' };
    }),
  );
  // the marker: fixed at 12 o'clock, over the first entry (a table's always; a braid's once it is turned)
  const marker = $derived.by(() => {
    if (!(view.mode === 'grid' && view.taps) && !(view.mode === 'braid' && shownShift !== 0)) return null;
    const w = Math.max(4, size * 0.05);
    const tip = c - rOuter + 1;
    const top = c - rOuter - margin - w * 0.6;
    return `M${c - w * 0.7},${top} L${c + w * 0.7},${top} L${c},${tip} Z`;
  });
  // the first entry, under the marker: outlined
  const first = $derived.by(() => {
    if (!view.taps) return null;
    const sg = view.segments.find((s) => s.index === 0);
    return sg ? ringSegment(c, c, rInner, rOuter, sg.t0, sg.t1) : null;
  });
  // the sieve: a table's wedge is bright for its own step of the grid; the steps it leaves out, to its next entry, dark
  // (show=equal: every entry the same width, nothing to sieve)
  const sieve = $derived.by(() => {
    if (space !== 'pitch' || view.ticks < 2 || view.show === 'equal') return [];
    const step = 1 / view.ticks;
    return view.segments.filter((sg) => sg.t1 - sg.t0 > step * 1.01).map((sg) => ringSegment(c, c, rInner, rOuter, sg.t0 + step, sg.t1));
  });
  const clockTicks = $derived(
    space === 'time' && view.ticks <= 64 && !track
      ? Array.from({ length: view.ticks }, (_, i) => {
          const long = i === 0 || (view.ticks % 4 === 0 && i % 4 === 0);
          const [x1, y1] = polar(c, c, geo.tick.r0, i / view.ticks);
          const [x2, y2] = polar(c, c, geo.tick.r1 + (long ? 2.5 * k : 0), i / view.ticks);
          return { x1, y1, x2, y2, long };
        })
      : [],
  );
  const ticks = $derived(
    space === null && view.ticks <= 48 && !tapsTable
      ? Array.from({ length: view.ticks }, (_, i) => {
          const [x1, y1] = polar(c, c, geo.tick.r0, i / view.ticks);
          const [x2, y2] = polar(c, c, geo.tick.r1, i / view.ticks);
          return { x1, y1, x2, y2 };
        })
      : [],
  );

  // which segments are live: braids by time, grids by the entries being looked up; a table of taps by the taps its
  // selector has on now (decision 016)
  // (as a key first: the set is made again only when the lit segments change, not every tick)
  const litKey = $derived.by(() => {
    if (tapsTable) {
      const on: number[] = [];
      view.segments.forEach((s, i) => {
        const u = cell?.units[s.index];
        if (u?.atom.kind === 'ref' && ctx.lit?.nodes.has(`cell:${u.atom.name}`)) on.push(i);
      });
      return on.join(',');
    }
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
  const polarAt = (t: number, r: number) => {
    const [x, y] = polar(c, c, r, t);
    return { x, y };
  };

  // the playhead: braids, and a selector's barrel (where in its sections)
  const hand = $derived((view.mode === 'braid' || view.mode === 'matrix') && liveLocal != null ? liveLocal / Math.max(1, cell?.steps ?? 1) : null);
  // in a bulb, the hand bends: from the hub through each bulb's neck and hub to the step playing now (#221)
  const bent = $derived(hand !== null && track ? cursorOf(c, c, geo.hand.r0 * 0.4, track, mod(hand, 1)) : null);

  // a meter as it plays: the wheel stays put, the step it's in now goes round, outlined and glowing in its colour
  const beatAt = $derived(isMeter ? (ctx.heads.beatAt.get(name) ?? null) : null);
  const meterAt = $derived(isMeter && view.mode === 'grid' && beatAt !== null ? meterNow(view.segments, beatAt) : null);
  const meterLit = $derived(meterAt ? ringSegment(c, c, rInner, rOuter, view.segments[meterAt.at].t0, view.segments[meterAt.at].t1) : null);

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
    lastTurn = pointerTurn(e);
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
    // a tap on a step, in the sheet: edit it
    if (travelled < 0.02 && onpick && units.length) {
      const t = pointerTurn(e);
      const hit = view.segments.find((x) => mod(t - x.t0, 1) < x.t1 - x.t0);
      if (hit) onpick(mod(hit.index + shownShift, tokens!.length));
    }
    // a tap on the root or a 12-tone table jumps straight to that slot
    else if (travelled < 0.02 && view.mode === 'grid' && !isMeter && view.detents === view.ticks) {
      const tapped = Math.round(pointerTurn(e) * view.ticks);
      // (the first entry is under the marker at the top: the slot tapped is that many on)
      const delta = mod(tapped + view.ticks / 2, view.ticks) - view.ticks / 2;
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

<svg
  bind:this={svg}
  data-wheel="cell"
  data-mode={isMeter ? 'meter' : view.mode}
  data-show={view.show}
  width={size}
  height={size}
  viewBox="0 0 {size} {size}"
  role={interactive || bulbs.length ? 'group' : 'img'}
  aria-label="&{name}: {label.big} {label.small}{spliced ? `, splicing ${spliced}` : ''}"
>
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
  {#if clockTicks.length}
    <circle class="clock-rim" cx={c} cy={c} r={geo.tick.r0} style:stroke-width="{geo.tick.width}px" />
    {#each clockTicks as t, i (i)}<line class="clock-tick" class:long={t.long} style:stroke-width="{geo.tick.width}px" x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} />{/each}
  {/if}
  {#snippet inner()}
    {#if hubSlots.length}
      <circle class="hub" cx={c} cy={c} r={hubRing.r1 + 1} />
      {#each hubSlots as sl, i (i)}<path class="hub-slot" class:held={sl.held} d={sl.d} fill={sl.fill} />{/each}
      {#each gears as g, i (i)}<path class="gear" d={g.d} stroke={g.stroke} style:stroke-width="{Math.max(1, 1.8 * k)}px" />{/each}
    {/if}
  {/snippet}
  {#snippet slots()}
    {#each bulbs as b, i (i)}<circle class="bulb-disc" cx={b.L.C[0]} cy={b.L.C[1]} r={b.L.rho + b.L.w / 2 + 2} />{/each}
    {#if tapRings.length}
      <!-- a table of taps: each tap a closed ring, no track between them (its taps take no time on it) -->
      {#each tapRings as t, i (i)}<circle class="tap-ring" class:dim={!!ctx.lit && !t.on} cx={t.L.C[0]} cy={t.L.C[1]} r={t.L.rho} stroke={t.colour} stroke-width={t.L.w} />{/each}
      {#each tapCursors as k, i (i)}<g class="hand bent tap-hand" style:--hand={k.colour}>
          <path class="edge" d={k.d} style:stroke-width="{geo.hand.width + 2}px" />
          <path d={k.d} style:stroke-width="{geo.hand.width}px" />
          <circle cx={k.head[0]} cy={k.head[1]} r={Math.max(2.5, geo.hand.width * 1.3)} />
        </g>{/each}
    {:else}
      {#each threads as d, i (i)}<path class="bulb-thread" {d} />{/each}
      {#each geometry as slot, i}
        <g class="slot" class:lit={lit.has(i)} stroke-width={slot.w}>
          {#each slot.d as d, j}<path {d} fill={fills[i][j]} fill-rule="evenodd" />{/each}
        </g>
      {/each}
    {/if}
    {#each bulbs as b, i (i)}
      {#if b.outline}<path class="bulb-hollow" d={b.outline} />{/if}
      {#if b.font && !units.length}
        <text class="bulb-name" x={b.L.C[0]} y={b.L.C[1]} dy={b.sub ? '-0.15em' : '0.35em'} style:font-size="{b.font}px">{b.text}</text>
        {#if b.sub}<text class="bulb-sub" x={b.L.C[0]} y={b.L.C[1]} dy="1.05em" style:font-size="{b.font * 0.8}px">{b.sub}</text>{/if}
      {/if}
    {/each}
    <!-- in the graph, each bulb is the cell it splices: tapped, it opens; held, it switches off (Graph.svelte, CellNode.svelte);
         switched off, it is dimmed -->
    {#if !interactive}
      <!-- (and for the keyboard: Enter or Space opens it, Shift+Enter switches it off or on, as a hold does) -->
      {#each bulbs as b, i (i)}<circle
          class="bulb-hit"
          class:off={!!ctx.program.cells.get(b.L.bulb.name)?.off}
          data-bulb={b.L.bulb.name}
          role="button"
          tabindex="0"
          aria-label={`&${b.L.bulb.name}${ctx.program.cells.get(b.L.bulb.name)?.off ? ', off' : ''}: open it; Shift+Enter switches it ${ctx.program.cells.get(b.L.bulb.name)?.off ? 'on' : 'off'}`}
          aria-keyshortcuts="Enter Shift+Enter"
          onkeydown={(e) => bulbKey(e, b.L.bulb.name)}
          cx={b.L.C[0]}
          cy={b.L.C[1]}
          r={b.L.rho + b.L.w / 2 + 2}
        />{/each}
    {/if}
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
      {#each sieve as d, i (i)}<path class="sieve" {d} />{/each}
      {@render inner()}
    </g>
  {:else}
    <g class="rim" class:easing style="transform: rotate({spin}deg); transform-origin: {c}px {c}px">
      {@render slots()}
      {#each sieve as d, i (i)}<path class="sieve" {d} />{/each}
      {#if meterLit}<path class="meter-now" d={meterLit} />{/if}
      {@render inner()}
    </g>
  {/if}
  {#if first}<path class="first" d={first} />{/if}
  {#each taps as t, i (i)}<circle class="tap" cx={t.x} cy={t.y} r={Math.max(1.6, 2.6 * k)} fill={t.fill} stroke={t.fill} />{/each}
  {#if marker}<path class="marker" d={marker} />{/if}
  {#if lfoPath}
    <circle class="lfo-rim" cx={c} cy={c} r={rInner + (rOuter - rInner) * 0.12} />
    <circle class="lfo-rim" cx={c} cy={c} r={rInner + (rOuter - rInner) * 0.88} />
    <path class="lfo" d={lfoPath} />
    {#if lfoDot}<circle class="lfo-dot" cx={lfoDot.x} cy={lfoDot.y} r={Math.max(3, size / 26)} />{/if}
  {/if}
  {#each pins as pin}
    {@const now = pin.step === nowStep}
    <path class="pin" class:now d={pin.d} fill={pin.on ? pin.fill : 'var(--wheel-rest)'} opacity={pin.on ? (hand === null || now ? 1 : 0.4) : now ? 0.9 : 0.5} />
  {/each}
  {#each beatLabels as l}
    <text class="beat" x={l.x} y={l.y} font-size={Math.max(7, size / 13)}>{l.text}</text>
  {/each}
  {#each units as u (u.written)}
    <text class="steplabel token" x={u.x} y={u.y} font-size={u.font}>{u.text}</text>
    <!-- (each step a button for the keyboard and screen readers; a pointer's tap goes to the rim, which tells taps from turns) -->
    {#if onpick}
      <path
        class="step-button"
        d={u.d}
        role="button"
        tabindex="0"
        aria-label="step {u.written + 1}: {u.text}"
        onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onpick(u.written))}
      />
    {/if}
  {/each}
  {#each labels as l}
    <text class="steplabel" x={l.x} y={l.y} font-size={Math.max(6, Math.min(11, size / 12, l.wide * size * 1.2))}>{l.text}</text>
  {/each}
  {#if curve}
    <polyline class="curve" points={curvePoints} />
  {:else}
    <circle class="hub" cx={c} cy={c} r={view.hub ? hubRing.r0 - 1 : geo.rHub} />
  {/if}
  {#if curve}
    {#each envLabels as l (l.text)}<text class="envlabel" x={l.x} y={l.y} style:text-anchor={l.anchor} style:font-size="{envFont}px">{l.text}</text>{/each}
  {:else}
    {#if bigFont}<text class="big" class:pop onanimationend={() => (pop = false)} x={c} y={c} dy={smallFont ? '0.1em' : '0.35em'} style:font-size="{bigFont}px">{label.big}</text
      >{/if}
    {#if smallFont}<text class="small" x={c} y={c + (bigFont ?? 0) * 0.1} dy="1.45em" style:font-size="{smallFont}px">{label.small}</text>{/if}
  {/if}
  {#if shownShift !== 0 && size >= 80 && !view.hub}<text class="shift" x={c} y={c - rInner * 0.5}>{shownShift > 0 ? '+' : ''}{shownShift}</text>{/if}
  {#if onhub}
    <circle
      class="hub-button"
      cx={c}
      cy={c}
      r={geo.rHub}
      role="button"
      tabindex="0"
      aria-label="Edit the whole braid"
      onclick={onhub}
      onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && onhub()}
    />
    {#if size >= 160}<text class="pen" x={c} y={c + geo.rHub * 0.62}>✎</text>{/if}
  {/if}
  {#if bent}
    <g class="hand bent">
      <path class="edge" d={bent.d} style:stroke-width="{geo.hand.width + 2}px" />
      <path d={bent.d} style:stroke-width="{geo.hand.width}px" />
      <circle cx={bent.head[0]} cy={bent.head[1]} r={Math.max(2.5, geo.hand.width * 1.3)} />
    </g>
  {:else if hand !== null}
    <g class="hand" style="transform: rotate({hand * 360}deg); transform-origin: {c}px {c}px">
      <line class="edge" x1={c} y1={c - geo.hand.r0} x2={c} y2={c - geo.hand.r1} style:stroke-width="{geo.hand.width + 2}px" />
      <line x1={c} y1={c - geo.hand.r0} x2={c} y2={c - geo.hand.r1} style:stroke-width="{geo.hand.width}px" />
    </g>
  {/if}
  {#each meterAt ? [] : [...accessed] as i (i)}
    {@const sg = view.segments[i]}
    {@const p = polarAt(sg.at ?? (sg.t0 + sg.t1) / 2, rInner + (rOuter - rInner) * 0.22)}
    <circle class="read" cx={p.x} cy={p.y} r={Math.max(2.2, size * 0.022)} />
  {/each}
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
    fill-opacity: 0.8;
    /* a dark halo: the number reads on the grey rest, and on the lit beat's tan and yellow (4.0:1 at best without it) */
    stroke: var(--wheel-disc);
    stroke-opacity: 0.85;
    stroke-width: 0.18em;
    stroke-linejoin: round;
    paint-order: stroke;
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
  /* the rim says the space: time, a clock */
  .sieve {
    fill: var(--wheel-disc);
    opacity: 0.62;
    pointer-events: none;
  }
  .clock-rim {
    fill: none;
    stroke: var(--text-faint);
  }
  .clock-tick {
    stroke: var(--text-faint);
  }
  .clock-tick.long {
    stroke: var(--text-muted);
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
  /* a table of taps (decision 016): each tap a ring in its selector's colour; off while playing, dimmed */
  .tap-ring {
    fill: none;
  }
  .tap-ring.dim {
    opacity: 0.3;
  }
  /* (the selector's cursor, in the colour of the part it has on) */
  .hand.bent.tap-hand path:not(.edge) {
    stroke: var(--hand);
  }
  .hand.bent.tap-hand circle {
    fill: var(--hand);
  }
  .slot.lit path {
    filter: var(--wheel-lit);
  }
  /* a meter's step now: outlined in its colour, and glowing */
  .meter-now {
    fill: color-mix(in oklab, var(--meter, var(--accent)) 30%, transparent);
    stroke: var(--meter, var(--accent));
    stroke-width: 3;
    stroke-linejoin: round;
    filter: drop-shadow(0 0 4px var(--meter, var(--accent)));
    pointer-events: none;
  }
  .hub {
    fill: var(--wheel-hub);
  }
  /* the sheet: a step, for the keyboard (the pointer turns or taps the rim beneath) */
  .step-button {
    fill: transparent;
    pointer-events: none;
    outline: none;
  }
  .step-button:focus-visible {
    stroke: var(--accent);
    stroke-width: 2.5;
  }
  /* the sheet: the hub edits the whole braid */
  .hub-button {
    fill: transparent;
    cursor: pointer;
    outline: none;
  }
  .hub-button:focus-visible {
    stroke: var(--accent);
    stroke-width: 2;
  }
  .pen {
    fill: var(--text-muted);
    font-size: 12px;
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
  /* the hand bent into a bulb: a line, and a dot on the step playing */
  .hand.bent path {
    fill: none;
    stroke: var(--wheel-hand);
    stroke-linecap: round;
  }
  .hand.bent path.edge {
    stroke: var(--wheel-hand-edge);
  }
  .hand.bent circle {
    fill: var(--wheel-hand);
    stroke: var(--wheel-hand-edge);
    stroke-width: 1.5;
  }
  /* a bulb (#221): its own small disc behind it; a net-ref's dotted round; its name at its hub */
  .bulb-disc {
    fill: var(--wheel-disc);
  }
  .bulb-hit {
    fill: transparent;
    cursor: pointer;
  }
  .bulb-hit:focus-visible {
    outline: none;
    stroke: var(--accent);
    stroke-width: 2;
  }
  .bulb-hit.off {
    fill: var(--wheel-disc);
    fill-opacity: 0.7;
  }
  .bulb-thread {
    fill: var(--wheel-tick);
    pointer-events: none;
  }
  .bulb-hollow {
    fill: none;
    stroke: var(--text-muted);
    stroke-width: 1.6;
    stroke-dasharray: 1 3.5;
    stroke-linecap: round;
    pointer-events: none;
  }
  .bulb-name {
    fill: var(--text);
    font-weight: 700;
  }
  .bulb-sub {
    fill: var(--accent);
    font-weight: 600;
  }
  /* a table's entry read now: a dot, like a read head */
  .read {
    fill: var(--wheel-read);
    stroke: var(--wheel-read-edge);
    stroke-width: 1;
  }
  /* the marker at 12 o'clock, over the first entry; the first outlined */
  .marker {
    fill: var(--text);
    stroke: var(--wheel-disc);
    stroke-width: 1.5;
    stroke-linejoin: round;
  }
  .first {
    fill: none;
    stroke: var(--text);
    stroke-width: 2;
    stroke-linejoin: round;
    pointer-events: none;
  }
  /* the taps: where entries leave the wheel; one nothing reads, hollow */
  .tap {
    stroke-width: 1.5;
  }
  .hub-slot {
    opacity: 0.32;
  }
  .hub-slot.held {
    opacity: 1;
  }
  .gear {
    fill: none;
    stroke-linecap: round;
  }
</style>
