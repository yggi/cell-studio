<script lang="ts">
  import { noteColour } from './theme';
  /**
   * The braid as a wheel, token by token: each segment is one written token,
   * as long as the steps it takes, labelled with its number or cell, coloured
   * by the pitch it sounds. Tap a segment to edit it. `dim` draws the default
   * (an empty braid: the 12 grid) faintly.
   */
  import { polar, ringSegment } from '../layout/geometry';
  import { fitFont } from '../layout/dial';

  export interface WheelToken {
    readonly label: string;
    readonly hues: readonly number[] | null;
    readonly weight: number;
    readonly kind: 'note' | 'chord' | 'ref' | 'rest' | 'other';
    /** A reference's notes across its step (widths sum to 1; hue null for a rest). */
    readonly parts?: readonly { readonly w: number; readonly hue: number | null }[];
  }

  let {
    tokens,
    rotation = 0,
    dim = false,
    size = 232,
    hub,
    editable = true,
    hand = null,
    lit = new Set<number>(),
    onpick,
    onhub,
  }: {
    tokens: readonly WheelToken[];
    /** Turns to rotate by (the cell's shift): the step that plays first sits at the top. */
    rotation?: number;
    dim?: boolean;
    size?: number;
    hub: { big: string; small: string };
    /** Steps can be tapped (written by hand); false when a function or the default generates them. */
    editable?: boolean;
    /** The playhead, in turns from the top (null when not playing): a hand, and the step under it lit. */
    hand?: number | null;
    /** Steps lit while playing for another reason (a table's entries being looked up). */
    lit?: ReadonlySet<number>;
    onpick: (index: number) => void;
    /** Tap the hub: edit the whole braid (or its function). */
    onhub: () => void;
  } = $props();

  const c = $derived(size / 2);
  const r0 = $derived(size * 0.27);
  const r1 = $derived(size * 0.48);
  const total = $derived(tokens.reduce((a, t) => a + Math.max(t.weight, 0.0001), 0) || 1);
  const segments = $derived.by(() => {
    let at = -rotation;
    return tokens.map((t, i) => {
      const t0 = at;
      at += Math.max(t.weight, 0.0001) / total;
      return { i, t, t0, t1: at };
    });
  });
  // the step under the hand (turns can start before the top: compare round the circle)
  const under = (t0: number, t1: number) => hand !== null && ((hand - t0) % 1 + 1) % 1 < t1 - t0;
  const fill = (t: WheelToken, band: number) =>
    t.hues?.length ? noteColour(t.hues[band % t.hues.length], dim) : t.kind === 'rest' ? 'var(--wheel-rest)' : 'var(--wheel-ref)';
  // a step's label (written across) fits both its arc and the ring's width — at 3 and 9 o'clock the width is
  // what it crosses; at least 7 px: the editor keeps every label
  const fontFor = (span: number, label: string) =>
    Math.max(7, fitFont(Math.min(span * Math.PI * (r0 + r1), r1 - r0) * 0.9, Math.max(2, label.length), Math.min(16, (r1 - r0) * 0.5), 0) ?? 7);
  // the hub, laid out as at 232 px and scaled with the wheel; its text fits the hub
  const u = $derived(size / 232);
  const hubWidth = $derived(2 * (r0 - 4) * 0.86);
</script>

<svg data-wheel="token" width={size} height={size} viewBox="0 0 {size} {size}" class:dim role="group" aria-label="braid">
  {#each segments as s (s.i)}
    {@const bands = s.t.kind === 'chord' && s.t.hues ? s.t.hues.length : 1}
    {@const mid = (s.t0 + s.t1) / 2}
    {@const [lx, ly] = polar(c, c, (r0 + r1) / 2, mid)}
    <g
      class="seg"
      class:live={under(s.t0, s.t1) || lit.has(s.i)}
      class:locked={!editable}
      role="button"
      tabindex={editable ? 0 : -1}
      aria-disabled={!editable}
      aria-label="step {s.i + 1}: {s.t.label}"
      onclick={() => editable && onpick(s.i)}
      onkeydown={(e) => editable && (e.key === 'Enter' || e.key === ' ') && onpick(s.i)}
    >
      {#if s.t.parts?.length}
        <!-- a reference: its notes across the step -->
        {@const span = s.t1 - s.t0}
        {#each s.t.parts.map((p, k) => ({ p, from: s.t.parts!.slice(0, k).reduce((a, x) => a + x.w, 0) })) as q}
          <path
            d={ringSegment(c, c, r0, r1, s.t0 + q.from * span, s.t0 + (q.from + q.p.w) * span)}
            fill={q.p.hue === null ? 'var(--wheel-rest)' : noteColour(q.p.hue, dim)}
          />
        {/each}
      {:else}
        {#each Array.from({ length: bands }, (_, b) => b) as b}
          <path
            d={ringSegment(c, c, r0 + ((r1 - r0) * b) / bands, r0 + ((r1 - r0) * (b + 1)) / bands, s.t0, s.t1)}
            fill={fill(s.t, b)}
          />
        {/each}
      {/if}
      <path class="edge" d={ringSegment(c, c, r0, r1, s.t0, s.t1)} />
      <text x={lx} y={ly} font-size={fontFor(s.t1 - s.t0, s.t.label)} class:ref={s.t.kind === 'ref'}>{s.t.label}</text>
    </g>
  {/each}
  {#if hand !== null}
    {@const [hx0, hy0] = polar(c, c, r0 - 2, hand)}
    {@const [hx1, hy1] = polar(c, c, r1 + 6, hand)}
    <line class="hand" x1={hx0} y1={hy0} x2={hx1} y2={hy1} />
  {/if}
  <g class="hubbtn" role="button" tabindex="0" aria-label="Edit the whole braid" onclick={onhub} onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && onhub()}>
    <circle cx={c} cy={c} r={r0 - 4} class="hub" />
    <text x={c} y={c - 6 * u} class="big" style:font-size="{fitFont(hubWidth, hub.big.length, 20 * Math.max(0.6, u), 0) ?? 9}px">{hub.big}</text>
    <text x={c} y={c + 12 * u} class="small" style:font-size="{fitFont(hubWidth, hub.small.length, 11 * Math.max(0.8, u), 0) ?? 8}px">{hub.small}</text>
    {#if size >= 160}<text x={c} y={c + 28 * u} class="pen">✎</text>{/if}
  </g>
</svg>

<style>
  svg {
    display: block;
    margin: 0 auto;
    touch-action: manipulation;
  }
  .seg {
    cursor: pointer;
    outline: none;
  }
  .seg.live .edge {
    stroke: var(--accent);
    stroke-width: 4;
  }
  .seg.live path:not(.edge) {
    filter: brightness(1.35);
  }
  .seg.locked.live path:not(.edge) {
    opacity: 0.85;
  }
  .hand {
    stroke: var(--accent);
    stroke-width: 3;
    stroke-linecap: round;
    pointer-events: none;
  }
  .seg.locked {
    cursor: default;
  }
  .seg.locked path:not(.edge) {
    opacity: 0.35;
  }
  .seg.locked text {
    fill: var(--text-muted);
  }
  .hubbtn {
    cursor: pointer;
    outline: none;
  }
  .hubbtn:hover .hub,
  .hubbtn:focus-visible .hub {
    stroke: var(--accent);
    stroke-width: 2;
  }
  .pen {
    font: 500 12px var(--font-ui);
    fill: var(--text-muted);
  }
  .seg:hover .edge,
  .seg:focus-visible .edge {
    stroke: var(--accent);
    stroke-width: 3;
  }
  .edge {
    fill: none;
    stroke: var(--surface);
    stroke-width: 2;
  }
  .dim .seg path:not(.edge) {
    opacity: 0.4;
  }
  text {
    text-anchor: middle;
    dominant-baseline: central;
    font-family: var(--font-code);
    font-weight: 700;
    fill: var(--ink-on-note);
    pointer-events: none;
  }
  text.ref {
    fill: var(--ink-on-note);
    paint-order: stroke;
    stroke: var(--ink-halo);
    stroke-width: 3px;
  }
  .dim text {
    fill: var(--text-muted);
  }
  .hub {
    fill: var(--code-bg);
  }
  .big {
    fill: var(--text);
  }
  .small {
    font: 500 11px var(--font-ui);
    fill: var(--text-muted);
  }
</style>
