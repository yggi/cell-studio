<script lang="ts" module>
  // (each one's own ids for its gradients)
  let shapes = 0;
</script>

<script lang="ts">
  /**
   * One exciter of a resonator, drawn as its body's element ([resonator-bodies.md](../../docs/notes/resonator-bodies.md)):
   * `w` × `h` px, its free end (where its strand meets it) at the top, its held end at the bottom; MaterialNode turns it
   * to its place. `scale`: its pitch's size (1 the lowest: a cup's size, a string's thickness).
   */
  let { body, w, h, scale }: { body: string; w: number; h: number; scale: number } = $props();
  const id = `ex${++shapes}`;
  const c = $derived(w / 2);
  // (the element's own material: the gradient across it, from its shadow to its highlight)
  const KIND: Record<string, string> = { bar: 'wood', box: 'wood', pipe: 'organ', bell: 'brass', wire: 'string' };
  const kind = $derived(KIND[body] ?? 'steel');
  // a head on a stem (a cup, a plate, a block): its size by its pitch
  const head = $derived(w * (0.55 + 0.45 * scale));
</script>

<svg width={w} height={h} viewBox="0 0 {w} {h}" aria-hidden="true" class="exciter {kind}">
  <defs>
    <linearGradient {id} x1="0" x2="1">
      <stop offset="0" class="lo" /><stop offset=".45" class="hi" /><stop offset="1" class="lo" />
    </linearGradient>
  </defs>
  {#if body === 'bar'}
    <rect x={w * 0.1} y="0.5" width={w * 0.8} height={h - 1} rx="2" fill="url(#{id})" class="edge" />
    <circle cx={c} cy={h * 0.224} r={Math.max(1.2, w * 0.08)} class="cord" />
    <circle cx={c} cy={h * 0.776} r={Math.max(1.2, w * 0.08)} class="cord" />
  {:else if body === 'pipe'}
    <rect x={w * 0.15} y="0.5" width={w * 0.7} height={h - 1} rx="1.5" fill="url(#{id})" class="edge" />
    <ellipse cx={c} cy={w * 0.12 + 0.5} rx={w * 0.35} ry={w * 0.12} class="bore" />
    <rect x={w * 0.3} y={h - Math.min(10, h * 0.25)} width={w * 0.4} height={Math.max(2, w * 0.14)} class="bore" />
  {:else if body === 'wire'}
    <rect x={w * 0.1} y={h * 0.12} width={w * 0.8} height="3" class="bridge" />
    <line x1={c} y1="0" x2={c} y2={h - w * 0.3} class="string" stroke-width={1 + 2.2 * scale} />
    <circle cx={c} cy={h - w * 0.3} r={w * 0.28} fill="url(#{id})" class="edge peg" />
  {:else if body === 'spring'}
    <path d={Array.from({ length: 13 }, (_, k) => `${k ? 'L' : 'M'}${k % 2 ? w * 0.15 : w * 0.85} ${(h * k) / 12}`).join(' ')} class="coil" />
  {:else if body === 'fork'}
    {@const base = h * 0.55}
    <path
      d="M{c} {h} V{base + w * 0.3} M{w * 0.25} 1 V{base} Q{w * 0.25} {base + w * 0.3} {c} {base + w * 0.3} Q{w * 0.75} {base + w * 0.3} {w * 0.75} {base} V1"
      class="prongs"
      stroke="url(#{id})"
    />
  {:else if body === 'bell'}
    <line x1={c} y1={head * 0.8} x2={c} y2={h} class="stem" />
    <path d="M{c - head / 2} {head * 0.85} Q{c - head / 2} 0.5 {c} 0.5 Q{c + head / 2} 0.5 {c + head / 2} {head * 0.85} Z" fill="url(#{id})" class="edge" />
  {:else if body === 'plate'}
    <line x1={c} y1={head} x2={c} y2={h} class="stem" />
    <rect x={c - head / 2} y="0.5" width={head} height={head} fill="url(#{id})" class="edge" />
  {:else if body === 'box'}
    <line x1={c} y1={head * 0.6} x2={c} y2={h} class="stem" />
    <rect x={c - head / 2} y="0.5" width={head} height={head * 0.6} rx="3" fill="url(#{id})" class="edge" />
    <line x1={c - head * 0.35} y1={head * 0.3} x2={c + head * 0.35} y2={head * 0.3} class="slit" />
  {:else}
    <!-- a tine: a steel tongue, its free end rounded -->
    <rect x={w * 0.2} y="0.5" width={w * 0.6} height={h - 1} rx={w * 0.3} fill="url(#{id})" class="edge" />
  {/if}
</svg>

<style>
  .exciter {
    display: block;
    overflow: visible;
  }
  .edge {
    stroke: rgba(0, 0, 0, 0.55);
    stroke-width: 1;
  }
  .steel .lo {
    stop-color: var(--tine-1);
  }
  .steel .hi {
    stop-color: var(--tine-0);
  }
  .wood .lo {
    stop-color: var(--exciter-wood-1);
  }
  .wood .hi {
    stop-color: var(--exciter-wood-0);
  }
  .organ .lo {
    stop-color: var(--exciter-organ-1);
  }
  .organ .hi {
    stop-color: var(--exciter-organ-0);
  }
  .brass .lo {
    stop-color: var(--pad-1);
  }
  .brass .hi {
    stop-color: var(--pad-0);
  }
  .string .lo {
    stop-color: var(--tine-1);
  }
  .string .hi {
    stop-color: var(--tine-0);
  }
  .cord,
  .bore,
  .slit {
    fill: var(--exciter-dark);
    stroke: var(--exciter-dark);
  }
  .string {
    stroke: var(--exciter-string);
    stroke-linecap: round;
  }
  .bridge {
    fill: var(--exciter-dark);
  }
  .coil,
  .stem {
    fill: none;
    stroke: var(--tine-0);
    stroke-width: 1.6;
    stroke-linejoin: round;
  }
  .stem {
    stroke: var(--tine-1);
    stroke-width: 1.5;
  }
  .prongs {
    fill: none;
    stroke-width: 3;
    stroke-linecap: round;
  }
</style>
