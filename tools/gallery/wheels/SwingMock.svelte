<script lang="ts">
  /**
   * A meter's swing as a ring on its wheel (#701), drawn by hand at the real wheel's geometry (`wheelGeometry(148)`: the hub
   * to 35.5 px, the beats' ring from there to 67 px, the rim to 74), so the options read at the size they will have.
   * Nothing here is the app's: the arcs are computed from the level and the share as the issue states them, the colours
   * are the app's tokens (`--meter-2` the eighths' level, `--meter-3` the sixteenths', as `ui/palette.ts` has them).
   *
   * The ring takes the beats' inner 9 px (36.5 to 45.5), so the wheel keeps its 148 px; the beats' ring is 21 px thick
   * where it was 31. A pair of the level's steps is one long arc and one short, at the share they play; a group of three
   * (7/8's) stays straight, and a meter with no `swing=` has no ring.
   */
  type Props = {
    /** The beats' groups, in steps of the level below the beat (4/4: 2,2,2,2 eighths; 7/8: 2,2,3). */
    groups: number[];
    /** The swung level's steps in a beat of 2 (8n: 1, 16n: 2): a pair spans one eighth of a quarter's beat. */
    level?: '8n' | '16n';
    /** The share of a pair the first step takes: 1/2 straight; null: no `swing=`. */
    share?: number | null;
    /** Where the share is a cell's (`swing=16n:&groove`): a bulb on the ring, the handle off. */
    bulb?: string;
    /** The handle held: its value read in the hub, the detents and the range marked. */
    drag?: boolean;
    bpm?: number;
    /** The beats' colours, one a beat (the wheel's own: its steps' hues). */
    hues?: string[];
    size?: number;
  };
  let { groups, level = '8n', share = null, bulb, drag = false, bpm = 160, hues = [], size = 148 }: Props = $props();

  const C = 74;
  const R_OUT = 67;
  const R_HUB = 32.5;
  const R_BEATS_IN = $derived(share === null ? 35.5 : 46);
  const RING = { r0: 36.5, r1: 44.5 };
  const rad = (turn: number) => (turn - 0.25) * 2 * Math.PI;
  const pt = (r: number, turn: number) => [C + r * Math.cos(rad(turn)), C + r * Math.sin(rad(turn))] as const;
  /** An annular sector between two turns (from the top, clockwise), the gap taken off each end in px at its mid radius. */
  function sector(r0: number, r1: number, t0: number, t1: number, gap = 0.6): string {
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

  const steps = $derived(groups.reduce((a, b) => a + b, 0));
  /** Each beat as a span of the turn: a beat's share is its group's steps. */
  const beats = $derived.by(() => {
    let at = 0;
    return groups.map((g, i) => {
      const t0 = at / steps;
      at += g;
      return { t0, t1: at / steps, i, g };
    });
  });
  /** The swung pairs: each group of two steps (a beat of 2) one pair, spanning the group; a group of three stays straight. Sixteenths: each eighth of a beat of two eighths. */
  const pairs = $derived.by(() => {
    const out: { t0: number; t1: number }[] = [];
    for (const b of beats) {
      if (b.g === 3) continue;
      const n = level === '16n' ? 2 : 1;
      for (let k = 0; k < n; k++) out.push({ t0: b.t0 + ((b.t1 - b.t0) * k) / n, t1: b.t0 + ((b.t1 - b.t0) * (k + 1)) / n });
    }
    return out;
  });
  const arcs = $derived.by(() => {
    if (share === null) return [];
    const colour = level === '8n' ? 'var(--meter-2)' : 'var(--meter-3)';
    return pairs.flatMap((p) => {
      const split = p.t0 + (p.t1 - p.t0) * share;
      return [
        { d: sector(RING.r0, RING.r1, p.t0, split), fill: colour, o: 1 },
        { d: sector(RING.r0, RING.r1, split, p.t1), fill: colour, o: 0.45 },
      ];
    });
  });
  /** The straight groups of three: their three steps as three equal arcs, the full ring's thickness, no long and short. */
  const plain = $derived(
    share === null
      ? []
      : beats
          .filter((b) => b.g === 3)
          .flatMap((b) =>
            [0, 1, 2].map((k) => ({
              d: sector(RING.r0, RING.r1, b.t0 + ((b.t1 - b.t0) * k) / 3, b.t0 + ((b.t1 - b.t0) * (k + 1)) / 3),
              fill: level === '8n' ? 'var(--meter-2)' : 'var(--meter-3)',
            })),
          ),
  );
  const first = $derived(pairs[0]);
  const splitAt = $derived(first && share !== null ? first.t0 + (first.t1 - first.t0) * share : null);
  const handle = $derived(splitAt === null ? null : pt((RING.r0 + RING.r1) / 2, splitAt));
  /** The detents on the first pair's span: straight, and the triplet. */
  const detents = $derived(
    first ? [1 / 2, 2 / 3].map((s) => ({ a: pt(RING.r0 - 2, first.t0 + (first.t1 - first.t0) * s), b: pt(RING.r1 + 2, first.t0 + (first.t1 - first.t0) * s) })) : [],
  );
  /** The attribute's range, as the arc the handle may take. */
  const range = $derived(first ? sector(RING.r0 - 3.2, RING.r0 - 1.8, first.t0 + (first.t1 - first.t0) * 0.5, first.t0 + (first.t1 - first.t0) * 0.75, 0) : '');
  const bulbAt = $derived(splitAt === null ? null : pt(56, splitAt));
  const readout = $derived(share === null ? 'bpm, ' + beats.length + '/bar' : level + ':' + (Math.abs(share - 2 / 3) < 1e-9 ? '2/3' : String(+share.toFixed(2)).replace(/^0/, '')));
  const label = (i: number) => String(i + 1);
</script>

<svg viewBox="0 0 148 148" width={size} height={size} role="img" aria-label="meter wheel">
  <circle cx={C} cy={C} r="73" fill="var(--wheel-disc)" />
  {#each beats as b (b.i)}
    <path d={sector(R_BEATS_IN, R_OUT, b.t0, b.t1, 0.7)} fill={hues[b.i % hues.length] ?? 'var(--meter-1)'} />
    {@const [lx, ly] = pt((R_BEATS_IN + R_OUT) / 2, (b.t0 + b.t1) / 2)}
    <text class="beat" x={lx} y={ly}>{label(b.i)}</text>
  {/each}
  {#each Array.from({ length: 4 }, (_, i) => i / 4) as t}
    {@const [x0, y0] = pt(70.5, t)}
    {@const [x1, y1] = pt(73, t)}
    <line x1={x0} y1={y0} x2={x1} y2={y1} stroke="var(--text-faint)" stroke-width="1.2" />
  {/each}
  <circle cx={C} cy={C} r={R_HUB} fill="var(--wheel-disc)" stroke="var(--text-faint)" stroke-opacity="0.35" />
  <text class="big" x={C} y={C - 6}>{bpm}</text>
  <text class="small" x={C} y={C + 12}>{drag ? readout : 'bpm, ' + beats.length + '/bar'}</text>

  {#if share !== null}
    <circle cx={C} cy={C} r={(RING.r0 + RING.r1) / 2} fill="none" stroke="var(--text-faint)" stroke-opacity="0.2" stroke-width={RING.r1 - RING.r0} />
    {#each arcs as a}<path d={a.d} fill={a.fill} opacity={a.o} />{/each}
    {#each plain as a}<path d={a.d} fill={a.fill} opacity="0.72" />{/each}
    {#if drag}
      <path d={range} fill="var(--accent)" />
      {#each detents as d}<line x1={d.a[0]} y1={d.a[1]} x2={d.b[0]} y2={d.b[1]} stroke="var(--text)" stroke-width="1.1" />{/each}
    {/if}
    {#if handle && !bulb}
      <circle cx={handle[0]} cy={handle[1]} r={drag ? 5 : 4} fill="var(--accent)" stroke="var(--wheel-disc)" stroke-width="1.6" />
    {:else if handle && bulb && bulbAt}
      <!-- (the share is the cell's: its marker has no handle; a stalk to the bulb that plays it, a bulb on &bar by decision 021) -->
      <circle cx={handle[0]} cy={handle[1]} r="2.6" fill="var(--wheel-disc)" stroke="var(--accent)" stroke-width="1" stroke-dasharray="1.6 1.4" />
      <line x1={handle[0]} y1={handle[1]} x2={bulbAt[0]} y2={bulbAt[1]} stroke="var(--accent)" stroke-width="1" />
      <circle cx={bulbAt[0]} cy={bulbAt[1]} r="8.5" fill="var(--wheel-disc)" stroke="var(--accent)" stroke-width="1.4" />
      <path d={`M${bulbAt[0] - 5.5} ${bulbAt[1] + 0.5}q1.4-6 2.75 0t2.75 0t2.75 0`} fill="none" stroke="var(--accent)" stroke-width="1.3" stroke-linecap="round" />
    {/if}
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
    font-size: 11px;
    font-weight: 700;
    fill: var(--text);
    stroke: var(--wheel-disc);
    stroke-width: 2.2px;
    paint-order: stroke;
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
