<script lang="ts">
  /**
   * A meter's wheel as one drawing of tempo, meter and swing (#701), by hand at the real wheel's geometry (148 px: hub to
   * 32.5, rim at 67), fed by a real example's compiled meter (`meter.beats` the beats' pulses, `meter.levels` each pulse's
   * sync level, `meter.swing` the leaned level), so a wheel here is the wheel the piece would have.
   *
   * It is the clock's white (`--meter-0`, the app's own for a meter), not a hue: hues on a wheel are pitches and voices.
   * Level is **height**: a **pulse** is a cell standing on the hub's side, as tall as its sync level is strong (the bar's
   * first reaches the rim, a finer one stops short), the way a drum machine shows an accent. A **beat** is an arc outside
   * them, as long as its pulses, its number on the rim; the **swing ring** inside them is the swung level's pairs, long
   * then short at the share they play (a group that doesn't divide into pairs stays even, decision 071; none without
   * `swing=`). No handle: the share is set in the cell's details.
   *
   * Running, the hub says the bar it is in (`hubLabel`), and the white is tinted the playing section's colour when a selector is stepped by this meter. The wheel stays put and the playhead is the hand every wheel has (white, dark edge), a turn a bar, so its speed
   * is the tempo over the bar; the pulse under it is lit (full white, outlined), as is its beat.
   */
  type Props = {
    beats: readonly number[];
    levels: readonly number[];
    /** The pulse's unit (4: a quarter) and the swing: its level's `whole` (1/8 for 8n) and `share` (1/2 straight). */
    unit: number;
    swing?: { whole: number; share: number } | null;
    bpm: number;
    /** Where the playhead is, in turns of the bar (played time); null: stopped. */
    turn?: number | null;
    /** The bar it is in, from 0 (the hub says it while it runs). */
    bar?: number;
    /** A selector's clock: the section's colour the white is tinted in, while its section plays (the tower's loom does the same); none: the clock's white. */
    hue?: string | null;
    size?: number;
  };
  let { beats, levels, unit, swing = null, bpm, turn = null, bar = 0, hue = null, size = 148 }: Props = $props();
  const ink = $derived(hue ?? 'var(--meter-0)');

  const C = 74;
  const R_RIM = 73;
  const R_HUB = 32.5;
  const BEATS = { r0: 65.6, r1: 67.6 };
  /** A pulse's height by sync level, of the room it has. */
  const HEIGHT = [1, 0.7, 0.46, 0.3];
  const rad = (t: number) => (t - 0.25) * 2 * Math.PI;
  const pt = (r: number, t: number) => [C + r * Math.cos(rad(t)), C + r * Math.sin(rad(t))] as const;
  function sector(r0: number, r1: number, t0: number, t1: number, gap = 0.8): string {
    const mid = (r0 + r1) / 2;
    const g = gap / (2 * Math.PI * mid);
    const a = t0 + g;
    const b = t1 - g;
    if (b <= a) return '';
    const large = b - a > 0.5 ? 1 : 0;
    const [x0, y0] = pt(r1, a);
    const [x1, y1] = pt(r1, b);
    const [x2, y2] = pt(r0, b);
    const [x3, y3] = pt(r0, a);
    return `M${x0} ${y0}A${r1} ${r1} 0 ${large} 1 ${x1} ${y1}L${x2} ${y2}A${r0} ${r0} 0 ${large} 0 ${x3} ${y3}Z`;
  }

  const n = $derived(levels.length);
  /** Pulses per swung pair: 2 × the level's whole note × the unit (8n on quarters: 1, on eighths: 2; 16n on quarters: 1/2). */
  const span = $derived(swing ? 2 * swing.whole * unit : 0);
  /** Each beat's first pulse. */
  const starts = $derived(beats.map((_, b) => beats.slice(0, b).reduce((a, g) => a + g, 0)));
  /** Each pulse's start in pulses as played: where the swung level is the pulse's own (pairs of pulses), the second of a pair starts at the share. */
  const at = $derived.by(() => {
    const p: number[] = [];
    let pos = 0;
    for (const g of beats) {
      const pairs = !!swing && span === 2 && g % 2 === 0;
      for (let k = 0; k < g; k++) p.push(pos + k + (pairs && k % 2 === 1 ? 2 * swing!.share - 1 : 0));
      pos += g;
    }
    return p;
  });
  const turnAt = (pulse: number) => (at[pulse] ?? pulse) / n;
  const pulseEnd = (pulse: number) => (pulse + 1 < n ? turnAt(pulse + 1) : 1);
  /** The swung pairs: a group of beats whose pulses divide into pairs; the rest straight. */
  const pairs = $derived.by(() => {
    if (!swing) return [] as { t0: number; t1: number }[];
    const out: { t0: number; t1: number }[] = [];
    beats.forEach((g, b) => {
      const per = span >= 1 ? g / span : g * Math.round(1 / span);
      if (!Number.isInteger(per)) return;
      const t0 = starts[b]! / n;
      const t1 = (starts[b]! + g) / n;
      for (let k = 0; k < per; k++) out.push({ t0: t0 + ((t1 - t0) * k) / per, t1: t0 + ((t1 - t0) * (k + 1)) / per });
    });
    return out;
  });
  const straight = $derived(
    swing
      ? beats.flatMap((g, b) => {
          const per = span >= 1 ? g / span : g * Math.round(1 / span);
          return Number.isInteger(per) ? [] : [{ t0: starts[b]! / n, t1: (starts[b]! + g) / n }];
        })
      : [],
  );
  const RING = { r0: 36.5, r1: 41 };
  const BASE = $derived(swing ? 44.5 : 37);
  const MAX = $derived(BEATS.r0 - 1.6 - BASE);
  const lit = $derived(turn === null ? -1 : (Array.from({ length: n }, (_, i) => i).find((i) => turn >= turnAt(i) && turn < pulseEnd(i)) ?? -1));
  const litBeat = $derived(lit < 0 ? -1 : starts.findLastIndex((s) => s <= lit));
</script>

<svg viewBox="0 0 148 148" width={size} height={size} role="img" aria-label="meter wheel">
  <circle cx={C} cy={C} r={R_RIM} fill="var(--wheel-disc)" />
  <!-- the pulses: a cell each, as tall as its level is strong, on a faint track the height of the room -->
  {#each levels as lv, i (i)}
    {@const l = Math.max(0, Math.min(3, lv))}
    {@const t0 = turnAt(i)}
    {@const t1 = pulseEnd(i)}
    <path d={sector(BASE, BASE + MAX, t0, t1, 1)} fill="var(--wheel-rest)" opacity="0.8" />
    <path d={sector(BASE, BASE + MAX * HEIGHT[l]!, t0, t1, 1)} fill={ink} opacity={lit === i ? 1 : l === 0 ? 0.85 : 0.6} />
    {#if lit === i}<path d={sector(BASE, BASE + MAX * HEIGHT[l]!, t0, t1, 1)} fill="none" stroke="var(--wheel-disc)" stroke-width="1" />{/if}
  {/each}
  <!-- the beats: an arc each, as long as its pulses, numbered on the rim -->
  {#each beats as g, b (b)}
    {@const t0 = turnAt(starts[b]!)}
    {@const t1 = pulseEnd(starts[b]! + g - 1)}
    <path d={sector(BEATS.r0, BEATS.r1, t0, t1, 1.6)} fill={ink} opacity={litBeat === b ? 1 : 0.4} />
    {@const [lx, ly] = pt(70.3, t0 + 4 / (2 * Math.PI * 70))}
    <text class="beat" x={lx} y={ly} opacity={litBeat === b ? 1 : 0.75}>{b + 1}</text>
  {/each}
  <!-- the swing ring: the swung level's pairs, long then short; the straight groups even -->
  {#if swing}
    {#each pairs as p, i (i)}
      {@const split = p.t0 + (p.t1 - p.t0) * swing.share}
      <path d={sector(RING.r0, RING.r1, p.t0, split, 0.9)} fill={ink} opacity="0.9" />
      <path d={sector(RING.r0, RING.r1, split, p.t1, 0.9)} fill={ink} opacity="0.32" />
    {/each}
    {#each straight as s, i (i)}
      <path d={sector(RING.r0, RING.r1, s.t0, s.t1, 0.9)} fill={ink} opacity="0.62" />
    {/each}
  {/if}
  <circle cx={C} cy={C} r={R_HUB} fill="var(--wheel-disc)" stroke="var(--text-faint)" stroke-opacity="0.35" />
  <text class="big" x={C} y={C - 6}>{turn === null ? bpm : bar + 1}</text>
  <text class="small" x={C} y={C + 12}>{`${turn === null ? 'bpm, ' : ''}${beats.length}/bar`}</text>
  {#if turn !== null}
    {@const [hx0, hy0] = pt(R_HUB - 3, turn)}
    {@const [hx1, hy1] = pt(R_RIM, turn)}
    <line x1={hx0} y1={hy0} x2={hx1} y2={hy1} stroke="var(--wheel-hand-edge)" stroke-width="4.2" stroke-linecap="butt" />
    <line x1={hx0} y1={hy0} x2={hx1} y2={hy1} stroke="var(--wheel-hand)" stroke-width="2.5" stroke-linecap="butt" />
  {/if}
</svg>

<style>
  svg {
    display: block;
    overflow: visible;
  }
  text {
    text-anchor: middle;
    dominant-baseline: central;
    font-family: var(--font-code);
    pointer-events: none;
  }
  .beat {
    font-size: 6.6px;
    font-weight: 700;
    fill: var(--text);
  }
  .big {
    font-size: 20px;
    font-weight: 700;
    fill: var(--text);
  }
  .small {
    font-size: 8.5px;
    fill: var(--text-muted);
  }
</style>
