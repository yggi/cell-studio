<script lang="ts" module>
  // (each glyph's own ids for its patterns: counted, not drawn by chance)
  let glyphs = 0;
</script>

<script lang="ts">
  import { onDestroy, untrack } from 'svelte';
  import { blockColour, noteColour, partColour, UNIT } from './theme';
  import { cellView, drawnOf, hubLabel, type CellView, type Fill } from '../layout/cellview';
  import { gateOf } from '../layout/gate';
  import { coarsen } from '../layout/coarse';
  import { noteFrame } from '../layout/show';
  import { ringSegment } from '../layout/geometry';
  import { wheelGeometry } from '../layout/wheel';
  import { curvePoints, envelopeCrossing, envelopeCurve, envelopeLabels, envelopeNotes, latestNoteAt } from '../layout/envelope';
  import { lapOf, refsOf, stepsPerSecond } from '../engine/readers';
  import { angleOf, fitFont, hubMax, turnDelta } from '../layout/dial';
  import { mod } from '../theory/modes';
  import { getGraphContext } from './context';
  import { meterNow } from '../layout/meters';
  import { cursorOf, fanOf, joins, layTrack } from '../layout/track';
  import {
    SlotCache,
    accessedOf,
    barrelNow,
    barrelPins,
    beatLabels as beatLabelsOf,
    borderOf,
    brightnessOf,
    bulbLabels,
    clockTicks as clockTicksOf,
    firstOf,
    handOf,
    hubGears,
    hubRingOf,
    hubSlots as hubSlotsOf,
    lfoDotOf,
    lfoPathOf,
    litSet,
    litSteps,
    litTaps,
    markerOf,
    plainTicks,
    readAt,
    segmentPaths,
    sieveOf,
    spaceOf,
    stepLabels,
    stepUnits,
    tapCursors as tapCursorsOf,
    tapDots,
    tapRings as tapRingsOf,
    tapSuffix as tapSuffixOf,
  } from '../layout/glyph';
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
  const rOuter = $derived(geo.rOuter);
  const k = $derived(geo.k);
  const rInner = $derived(geo.rInner);
  // (a table's hub that selects: the slots coming in, a ring inside the hub)
  const hubRing = $derived(hubRingOf(geo));

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
  // a gate (#234) shows its trigger's notes round its ring, its hand where the trigger plays; a read head its tape's
  const gate = $derived(gateOf(ctx.program, name));
  const drawn = $derived(drawnOf(ctx.program, name));
  // (whose playhead the hand follows: its own, or a gate's trigger's)
  const played = $derived(gate ? drawn : name);
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
  const tapSuffix = $derived(tapsTable && cell ? tapSuffixOf(refsOf(cell)) : '');
  // a braid's track (#221): its splices bend out of the ring into bulbs, their steps along them
  const ringMid = $derived((rInner + rOuter) / 2);
  const ringW = $derived(rOuter - rInner);
  const track = $derived(view.bulbs?.length ? layTrack(c, c, ringMid, ringW, view.bulbs) : null);
  const trackKey = $derived(JSON.stringify(view.bulbs ?? []));
  // where it takes no time (back to the ring between two bulbs): a thread
  const threads = $derived(track ? joins(track, Math.max(2, ringW * 0.14)) : []);
  // each bulb: a disc behind it (its own small wheel), a dotted outline when it is a net-ref, its name at its hub
  const bulbs = $derived(bulbLabels(ctx.program, track, tapsTable, tapSuffix));
  // (their names, for a screen reader: the wheel's label says what is spliced in)
  const spliced = $derived(
    bulbs
      .map((b) => b.text)
      .filter(Boolean)
      .join(' '),
  );
  // (motion is a hint for slow cells — a step a second or slower; on faster ones it's noise: none)
  const fast = $derived((stepsPerSecond(ctx.program, name) ?? 0) > 1);

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
  const frame = $derived(noteFrame(ctx.program, name));
  const labels = $derived(stepLabels(view, track, geo, frame, tokens));
  // the sheet: each written step's span on the ring (its segments, as turned), and its token there
  const units = $derived(stepUnits(view, tokens, ctx.program.cells.get(name)?.units.length, shownShift, track, geo));
  // show=matrix: a selector's barrel — a ring per part, a pin where a step picks it
  const pins = $derived(barrelPins(view, geo).map((p) => ({ ...p, fill: partColour(p.row, p.rows) })));
  // the section under the playhead: its pins at full colour (the rest quieter while playing). Apart from the pins,
  // so that the playhead moving does not draw them all again.
  const nowStep = $derived.by(() => barrelNow(view, hand));
  // show=adsr: the envelope as a curve across the ring — rising, falling, holding, releasing
  const curve = $derived(view.mode === 'curve' && view.curve ? envelopeCurve(view.curve, c, rOuter) : null);
  const curvePts = $derived(curve ? curvePoints(curve) : '');
  // while it plays: where the latest note through it is on the curve, two lines crossing there — its time now and its
  // level now (the notes of whatever plays a voice with this envelope, or a product it shapes: layout/envelope.ts)
  const envNotes = $derived(view.mode === 'curve' ? envelopeNotes(ctx.program, name) : []);
  const envNow = $derived.by(() => {
    if (!curve || !view.curve || !ctx.lit || !envNotes.length) return null;
    const last = latestNoteAt(ctx.program, ctx.shifts, envNotes, ctx.heads.seconds);
    return last && envelopeCrossing(curve, view.curve, last);
  });
  // its values named on their stretches of the curve (#107) — from 112 px up (smaller, the curve alone)
  const envFont = $derived(Math.min(11, size * 0.06));
  const envLabels = $derived(curve && view.curve && size >= 112 ? envelopeLabels(curve, view.curve, envFont) : []);
  // The live state is a new object every tick. What this wheel takes from it is kept as primitives, so that what
  // depends on them runs again only when they change — not every tick, for every wheel on the graph (#13).
  const hasLive = $derived(!!ctx.heads.cells.get(played));
  const liveLocal = $derived(ctx.heads.cells.get(played)?.local ?? null);
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
      ? f.unit
        ? UNIT
        : f.alter
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

  // Where each band goes (`d`) is kept from one view to the next while the wheel's layout is the same, and written
  // only when it changes; the fills are what a turn changes (#41: layout/glyph.ts, SlotCache). The border tapers on
  // a wheel the cap merged (`borderOf`), so it is kept with the layout.
  const merged = $derived(view.segments !== full.segments);
  const slotCache = new SlotCache();
  const geometry = $derived(slotCache.slots(`${c} ${rInner} ${rOuter} ${merged} ${trackKey}`, view.segments, (s) => ({ d: segmentPaths(s, geo, track), w: borderOf(s, merged) })));
  // show=brightness: each degree of a table shaded by the mode that starts on it (Lydian brightest … Locrian
  // darkest), in the sun's gold
  const brightness = $derived(brightnessOf(view));
  const fills = $derived(view.segments.map((s, i) => (brightness ? s.bands.map(() => blockColour(brightness[i])) : s.bands.map(fillOf))));
  // a table of taps wears the colours of the selector reading it (decision 016): each tap its part's colour on the
  // selector's barrel; while playing, the ones the selector has off dimmed, and a hand from the hub across each it has on
  const tapRings = $derived.by(() => (tapsTable && track ? tapRingsOf(bulbs, view, cell?.units.length ?? 1, lit).map((t) => ({ ...t, colour: partColour(t.part, t.parts) })) : []));
  const tapCursors = $derived(ctx.lit ? tapCursorsOf(tapRings, geo) : []);

  // What space the wheel is drawn in: by pitch (a table: the slots it takes from the table below come in at its hub),
  // by time (a braid: its rim a clock), or its own (layout/glyph.ts, spaceOf). The hub of a table that selects: its
  // slots, the ones it takes bright, and the gear, a wire from each slot taken out to its entry; they turn with the ring.
  const space = $derived(spaceOf(view, isMeter));
  const hubSlots = $derived(hubSlotsOf(view, geo).map((sl) => ({ ...sl, fill: fillOf(sl.fill) })));
  const gears = $derived(hubGears(view, geo).map((g) => ({ d: g.d, stroke: fillOf(g.fill) })));
  // the taps: where each entry leaves the wheel, on a ring of their own outside it (drawn whether wired or not)
  const taps = $derived(tapDots(view, geo).map((t) => ({ x: t.x, y: t.y, fill: t.fill ? fillOf(t.fill) : 'var(--edge)' })));
  // the marker: fixed at 12 o'clock, over the first entry (a table's always; a braid's once it is turned)
  const marker = $derived(markerOf(view, shownShift, geo, size));
  // the first entry, under the marker: outlined
  const first = $derived(firstOf(view, geo));
  // the sieve: the steps of the grid a table's entry leaves out, to its next entry, dark
  const sieve = $derived(sieveOf(view, space, geo));
  const clockTicks = $derived(clockTicksOf(view, space, track, geo));
  const ticks = $derived(plainTicks(view, space, tapsTable, geo));

  // which segments are live: braids by time, grids by the entries being looked up; a table of taps by the taps its
  // selector has on now (decision 016)
  // (as a key first: the set is made again only when the lit segments change, not every tick)
  const litKey = $derived(tapsTable ? litTaps(view, cell, ctx.lit?.nodes) : litSteps(view, () => (hasLive && liveLocal !== null ? liveLocal / lapOf(ctx.program, played) : null)));
  const lit = $derived(litSet(litKey));
  // a table: the entries being read now (accessed) — a dot in each, like a read head …
  const accessed = $derived(hasLive && view.mode !== 'braid' ? accessedOf(view, entriesKey) : new Set<number>());

  // the playhead: braids, and a selector's barrel (where in its sections)
  const hand = $derived(handOf(view, () => liveLocal, lapOf(ctx.program, played)));
  // in a bulb, the hand bends: from the hub's edge round the inside of each bulb it is in, and across the step playing now (#221)
  const bent = $derived(hand !== null && track ? cursorOf(c, c, geo.hand.r0, track, mod(hand, 1), rInner - geo.hand.r0) : null);

  // a meter as it plays: the wheel stays put, the step it's in now goes round, outlined and glowing in its colour
  const beatAt = $derived(isMeter ? (ctx.heads.beatAt.get(name) ?? null) : null);
  const meterAt = $derived(isMeter && view.mode === 'grid' && beatAt !== null ? meterNow(view.segments, beatAt) : null);
  const meterLit = $derived(meterAt ? ringSegment(c, c, rInner, rOuter, view.segments[meterAt.at].t0, view.segments[meterAt.at].t1) : null);

  // show=lfo: one cycle round the ring — its value the radius; a dot at its phase while playing
  const lfoPath = $derived(lfoPathOf(view, geo));
  const lfoDot = $derived(lfoDotOf(view, () => liveLocal, cell?.steps ?? 1, geo));
  // a meter's beats, numbered
  const beatLabels = $derived(beatLabelsOf(view, isMeter, size, geo));

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
      {:else if b.rim && !units.length}
        <!-- (a name too long for its bulb: round its outer rim, a halo under it over the host's ring) -->
        <path id="{uid}-rim-{i}" d={b.rim.d} fill="none" />
        {#each ['halo', 'ink'] as layer (layer)}
          <text class="bulb-name rim {layer}" style:font-size="{b.rim.font}px"><textPath href="#{uid}-rim-{i}" startOffset="50%" text-anchor="middle">{b.text}</textPath></text>
        {/each}
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
    <polyline class="curve" points={curvePts} />
    {#if envNow}
      <line class="env-now" x1={envNow.x} x2={envNow.x} y1={envNow.top} y2={envNow.bottom} />
      <line class="env-now" x1={envNow.x0} x2={envNow.x1} y1={envNow.y} y2={envNow.y} />
      <circle class="env-dot" cx={envNow.x} cy={envNow.y} r={Math.max(2, size / 40)} />
    {/if}
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
  {#if tapCursors.length}
    <!-- (over the hub, which overlaps the taps; turned with the rim) -->
    <g style={interactive ? undefined : `transform: rotate(${spin}deg); transform-origin: ${c}px ${c}px`}>
      {#each tapCursors as d, i (i)}<g class="hand bent">
          <path class="edge" {d} style:stroke-width="{geo.hand.width + 2}px" />
          <path {d} style:stroke-width="{geo.hand.width}px" />
        </g>{/each}
    </g>
  {/if}
  {#if bent}
    <g class="hand bent">
      <path class="edge" d={bent} style:stroke-width="{geo.hand.width + 2}px" />
      <path d={bent} style:stroke-width="{geo.hand.width}px" />
    </g>
  {:else if hand !== null}
    <g class="hand" style="transform: rotate({hand * 360}deg); transform-origin: {c}px {c}px">
      <line class="edge" x1={c} y1={c - geo.hand.r0} x2={c} y2={c - geo.hand.r1} style:stroke-width="{geo.hand.width + 2}px" />
      <line x1={c} y1={c - geo.hand.r0} x2={c} y2={c - geo.hand.r1} style:stroke-width="{geo.hand.width}px" />
    </g>
  {/if}
  {#each meterAt ? [] : [...accessed] as i (i)}
    {@const sg = view.segments[i]}
    {@const p = readAt(sg, geo)}
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
  /* where a note is on its envelope now: its time and its level, crossing on the curve */
  .env-now {
    stroke: var(--text);
    stroke-width: 1;
    opacity: 0.7;
  }
  .env-dot {
    fill: var(--text);
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
  /* the hand bent into a bulb: one line, jointed */
  .hand.bent path {
    fill: none;
    stroke: var(--wheel-hand);
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  .hand.bent path.edge {
    stroke: var(--wheel-hand-edge);
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
  .bulb-name.rim {
    text-anchor: middle;
  }
  .bulb-name.rim.halo {
    fill: none;
    stroke: var(--bg);
    stroke-width: 3.5px;
    stroke-linejoin: round;
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
