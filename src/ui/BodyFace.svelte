<script lang="ts">
  /**
   * A resonator's body engraved on its disc's face, over its mode rings
   * ([resonator-bodies.md](../../docs/notes/resonator-bodies.md)): a fork's prongs either side of the axle, a bell from
   * above with its nodal meridians, a bar with its nodal lines, a square plate's Chladni figure, a box and its sound
   * hole, an organ pipe, strings between two bridges, a coil (a kalimba's tines are on its rim). Each is drawn round the
   * axle. While it rings, its moving part is ghosted as far as it rings (`ringing`, its first mode's level, 0 … 1).
   * An SVG group, centred on (`cx`, `cy`), for a disc `r` px in radius.
   */
  let { body, cx, cy, r, ringing }: { body: string; cx: number; cy: number; r: number; ringing: number } = $props();
  const deg = (a: number) => (a * Math.PI) / 180;
</script>

<!-- (drawn on a disc 60 px in radius, scaled to this one) -->
<g class="face" transform="translate({cx} {cy}) scale({r / 60})">
  {#if body === 'fork'}
    <path d="M0 48 V22 M-17 -44 V4 Q-17 22 0 22 Q17 22 17 4 V-44" />
    <path d="M-21 -44 V4 M21 -44 V4" class="ghost" style:opacity={ringing * 0.5} />
  {:else if body === 'bell'}
    <circle r="40" /><circle r="27" /><circle r="12" />
    {#each [0, 45, 90, 135] as a (a)}
      <line x1={-40 * Math.cos(deg(a))} y1={-40 * Math.sin(deg(a))} x2={40 * Math.cos(deg(a))} y2={40 * Math.sin(deg(a))} class="node" />
    {/each}
  {:else if body === 'bar'}
    <rect x="-46" y="-17" width="92" height="34" rx="3" />
    <line x1={-46 + 92 * 0.224} y1="-22" x2={-46 + 92 * 0.224} y2="22" class="node" />
    <line x1={-46 + 92 * 0.776} y1="-22" x2={-46 + 92 * 0.776} y2="22" class="node" />
    <path d="M-46 0 Q-24 14 0 -14 Q24 14 46 0" class="ghost" style:opacity={ringing * 0.6} />
  {:else if body === 'plate'}
    <rect x="-32" y="-32" width="64" height="64" rx="2" />
    <path d="M-32 -12 Q0 6 32 -12 M-32 12 Q0 -6 32 12 M-12 -32 Q6 0 -12 32 M12 -32 Q-6 0 12 32" class="thin" />
  {:else if body === 'box'}
    <rect x="-40" y="-32" width="80" height="64" rx="4" />
    <circle r="19" />
    <line x1="-34" y1="-18" x2="34" y2="-18" class="thin" />
  {:else if body === 'pipe'}
    <rect x="-17" y="-46" width="34" height="78" rx="3" />
    <path d="M-17 32 L0 48 L17 32" />
    <rect x="-9" y="22" width="18" height="6" class="thin" />
    <path d="M0 -46 Q-10 -14 0 22" class="ghost" style:opacity={ringing * 0.6} />
  {:else if body === 'wire'}
    <line x1="-32" y1="-38" x2="32" y2="-38" class="bar" />
    <line x1="-32" y1="38" x2="32" y2="38" class="bar" />
    {#each [-27, -18, 18, 27] as x, i (x)}<line x1={x} y1="-38" x2={x} y2="38" style:stroke-width={2.4 - i * 0.4} />{/each}
    <path d="M-27 -38 Q-20 0 -27 38 Q-34 0 -27 -38" class="ghost" style:opacity={ringing * 0.6} />
  {:else if body === 'spring'}
    <path d={Array.from({ length: 9 }, (_, i) => `${i ? 'L' : 'M'}${-36 + i * 9} ${i % 2 ? -14 : 14}`).join(' ')} />
    {#each Array.from({ length: 8 }, (_, i) => i) as i (i)}<ellipse cx={-31.5 + i * 9} cy="0" rx="4.5" ry="14" class="thin" />{/each}
  {/if}
</g>

<style>
  .face {
    fill: none;
    stroke: var(--face-ink);
    stroke-width: 3;
    stroke-linecap: round;
    stroke-linejoin: round;
    filter: drop-shadow(1px 1px 0 var(--face-light));
    pointer-events: none;
  }
  .thin,
  .node,
  .ghost {
    stroke-width: 1.3;
  }
  .node {
    stroke-dasharray: 3 4;
  }
  .bar {
    stroke-width: 4;
  }
</style>
