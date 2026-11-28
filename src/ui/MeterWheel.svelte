<script lang="ts">
  /**
   * A meter's wheel (#701, `docs/notes/701-meter-wheel.md`): the bar as one drawing of tempo, meter and swing, in the clock's
   * white (`--meter-0`) — on a wheel a hue is a pitch or a voice. Outside in: the **beats** (an arc each, numbered on the
   * rim), the **pulses** (a cell each, as tall as its sync level is strong, on a track the height of the room), the **swing
   * ring** (the swung level's pairs, a long arc then a short one at the share they play; a group that isn't a pair stays
   * even), and the hub (the tempo and its beats a bar; running, the bar it is in). Where the meter steps a selector that picks
   * one section, the white is that section's tint (`sectionTint`, as the tower's loom tints the clock).
   *
   * The wheel stays put while it plays and the hand is the playhead every wheel has, a turn a bar, so its speed is the tempo;
   * the pulse and the beat under it are lit. The share of a swing is the cell's detail, not a handle here. Placement is
   * `layout/meterwheel.ts`: a meter written as a scan has no such wheel (`CellNode` draws it with `CellGlyph`).
   */
  import { polar, ringSegment } from '../layout/geometry';
  import { fitFont, hubMax } from '../layout/dial';
  import { hubLabel } from '../layout/cellview';
  import { meterWheel, PULSE_HEIGHT, selectorSection } from '../layout/meterwheel';
  import { wheelGeometry } from '../layout/wheel';
  import { sectionTint } from './theme';
  import { getGraphContext } from './context';

  let { name, size }: { name: string; size: number } = $props();
  const ctx = getGraphContext();

  const wheel = $derived(meterWheel(ctx.program, name));
  const geo = $derived(wheelGeometry(size));
  const c = $derived(geo.c);
  const room = $derived(geo.rOuter - geo.rInner);
  const k = $derived(Math.min(1, size / 148));
  /** The beats' arc, on the wheel's rim; the pulses stand between the hub (and the swing ring) and it. */
  const beatBand = $derived([geo.rOuter + 0.02 * room - Math.max(1.5, 0.065 * room), geo.rOuter + 0.02 * room] as const);
  const ring = $derived([geo.rInner + 0.032 * room, geo.rInner + 0.175 * room] as const);
  const base = $derived(geo.rInner + room * (wheel?.swing ? 0.285 : 0.05));
  const top = $derived(geo.rOuter - room * 0.095);
  const labelled = $derived(size >= 100);
  const GAP = 0.9;

  /** A sector between radii, its ends drawn in by `gap` px at its middle radius. */
  const sector = (r0: number, r1: number, t0: number, t1: number, gap = GAP) => {
    const g = gap / (2 * Math.PI * ((r0 + r1) / 2));
    return t1 - t0 > 2 * g ? ringSegment(c, c, r0, r1, t0 + g, t1 - g) : '';
  };

  // live: where it is in its bar, in pulses, and the bar it is in
  const beatAt = $derived(ctx.lit?.beatAt.get(name) ?? null);
  const bar = $derived(ctx.lit?.bars.get(name) ?? null);
  const lit = $derived(beatAt === null || !wheel ? -1 : Math.min(wheel.pulses.length - 1, Math.floor(beatAt + 1e-9)));
  const litBeat = $derived(!wheel || lit < 0 ? -1 : wheel.beats.findLastIndex((b) => b.first <= lit));
  const hand = $derived.by(() => {
    if (!wheel || beatAt === null) return null;
    const p = wheel.pulses[lit]!;
    return p.t0 + (p.t1 - p.t0) * (beatAt - lit);
  });
  const handLine = $derived(hand === null ? null : { a: polar(c, c, geo.hand.r0, hand), b: polar(c, c, geo.hand.r1, hand) });

  // where a selector this meter steps picks one section: its tint, else the clock's white
  const section = $derived(wheel && ctx.lit ? selectorSection(ctx.program, name, (s) => ctx.lit!.cells.get(s)?.entries) : null);
  const ink = $derived(section ? sectionTint(section.k, section.n) : 'var(--meter-0)');

  const label = $derived(hubLabel(ctx.program, name, ctx.shifts, true, bar));
  const hubWidth = $derived(2 * geo.rHub * 0.86);
  const bigFont = $derived(fitFont(hubWidth, label.big.length, hubMax(size)));
  const smallFont = $derived(size >= 80 && label.small ? fitFont(hubWidth, label.small.length, 11, 7) : null);
  const labelFont = $derived(Math.max(5.5, 6.6 * (size / 148)));
</script>

{#if wheel}
  <svg data-wheel="meter" data-mode="meter" width={size} height={size} viewBox="0 0 {size} {size}" role="img" aria-label="&{name}: {label.big} {label.small}">
    <circle class="disc" cx={c} cy={c} r={geo.rDisc} />
    <!-- the pulses: a cell each, as tall as its level is strong, on a track the height of the room -->
    {#each wheel.pulses as p, i (i)}
      {@const h = (top - base) * PULSE_HEIGHT[Math.max(0, Math.min(3, p.level))]!}
      <path class="track" d={sector(base, top, p.t0, p.t1)} />
      <path class="pulse" class:lit={lit === i} class:first={p.level === 0} d={sector(base, base + h, p.t0, p.t1)} style:fill={ink} />
    {/each}
    <!-- the beats: an arc each, numbered on the rim -->
    {#each wheel.beats as b, i (i)}
      <path class="beat" class:lit={litBeat === i} d={sector(beatBand[0], beatBand[1], b.t0, b.t1, 1.6 * k + 0.2)} style:fill={ink} />
      {#if labelled}
        {@const [x, y] = polar(c, c, geo.rOuter + 3.3 * k, b.t0 + (4 * k) / (2 * Math.PI * geo.rOuter))}
        <text class="number" class:lit={litBeat === i} {x} {y} style:font-size="{labelFont}px">{i + 1}</text>
      {/if}
    {/each}
    <!-- the swing ring: the swung level's pairs, a long arc then a short; a group that isn't a pair stays even -->
    {#if wheel.swing}
      {#each wheel.swing.pairs as p, i (i)}
        <path class="long" d={sector(ring[0], ring[1], p.t0, p.split, 0.8)} style:fill={ink} />
        <path class="short" d={sector(ring[0], ring[1], p.split, p.t1, 0.8)} style:fill={ink} />
      {/each}
      {#each wheel.swing.even as s, i (i)}
        <path class="even" d={sector(ring[0], ring[1], s.t0, s.t1, 0.8)} style:fill={ink} />
      {/each}
    {/if}
    <circle class="hub" cx={c} cy={c} r={geo.rHub} />
    {#if bigFont}<text class="big" x={c} y={c} dy={smallFont ? '0.1em' : '0.35em'} style:font-size="{bigFont}px">{label.big}</text>{/if}
    {#if smallFont}<text class="small" x={c} y={c + (bigFont ?? 0) * 0.1} dy="1.45em" style:font-size="{smallFont}px">{label.small}</text>{/if}
    {#if handLine}
      <g class="hand">
        <line class="edge" x1={handLine.a[0]} y1={handLine.a[1]} x2={handLine.b[0]} y2={handLine.b[1]} style:stroke-width="{geo.hand.width + 2}px" />
        <line x1={handLine.a[0]} y1={handLine.a[1]} x2={handLine.b[0]} y2={handLine.b[1]} style:stroke-width="{geo.hand.width}px" />
      </g>
    {/if}
  </svg>
{/if}

<style>
  svg {
    display: block;
    overflow: visible;
  }
  .disc {
    fill: var(--wheel-disc);
  }
  .hub {
    fill: var(--wheel-hub);
  }
  .track {
    fill: var(--wheel-rest);
    opacity: 0.8;
  }
  /* a finer pulse is dimmer, the bar's first brightest; the one under the hand, full, outlined */
  .pulse {
    opacity: 0.6;
  }
  .pulse.first {
    opacity: 0.85;
  }
  .pulse.lit {
    opacity: 1;
    stroke: var(--wheel-disc);
    stroke-width: 1px;
  }
  .beat {
    opacity: 0.4;
  }
  .beat.lit {
    opacity: 1;
  }
  .long {
    opacity: 0.9;
  }
  .short {
    opacity: 0.32;
  }
  .even {
    opacity: 0.62;
  }
  .number {
    fill: var(--text);
    font-weight: 700;
    text-anchor: middle;
    dominant-baseline: central;
    opacity: 0.75;
    pointer-events: none;
  }
  .number.lit {
    opacity: 1;
  }
  .big {
    fill: var(--text);
    font-size: 17px;
    font-weight: 700;
    text-anchor: middle;
  }
  .small {
    fill: var(--text-muted);
    font-size: 11px;
    text-anchor: middle;
  }
  .hand line {
    stroke: var(--wheel-hand);
    stroke-linecap: round;
  }
  .hand line.edge {
    stroke: var(--wheel-hand-edge);
  }
</style>
