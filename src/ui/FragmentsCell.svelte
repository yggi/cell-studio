<script lang="ts">
  /**
   * The library's fragments' cell (#625, rung S4 of #621): a disc beside the wheel (`disc`, its centre and radius in
   * pixels: `layout/library.ts` places it), its small discs the seed library's facets, each as large as the root of how
   * many fragments it holds, in its facet's colour; its inner ring the person's own fragments (#626), a dot each in its
   * facet's colour. A tap turns the library's canvas to its style lens (`LibraryGraph.svelte`): the fragments fly out of it.
   */
  import { catalogue } from '@yggi/cells';
  import { FACETS } from '../references';
  import { mine } from '../mine.svelte';
  import { facetColour } from './theme';

  let { disc, onopen }: { disc: { x: number; y: number; r: number }; onopen: () => void } = $props();

  const entries = catalogue();
  const counts = FACETS.map((f) => ({ facet: f, n: entries.filter((e) => e.facets[0] === f).length })).filter((c) => c.n > 0);
  const most = Math.max(...counts.map((c) => c.n));
  // (round the disc, each facet a small disc, the largest a sixth of the radius)
  const dots = $derived(
    counts.map((c, i) => {
      const a = -Math.PI / 2 + (2 * Math.PI * i) / counts.length;
      return { ...c, x: 0.62 * disc.r * Math.cos(a), y: 0.62 * disc.r * Math.sin(a), r: (disc.r / 6) * Math.sqrt(c.n / most) };
    }),
  );
  // (the person's own, a ring of dots inside the facets', each a twelfth of the radius, on its two side arcs, 60° either
  // side of the level: the label is above and below the middle)
  const own = $derived(mine.layer.filed.map((f) => ({ id: f.fragment.id, facet: f.fragment.association[0]?.facet ?? null })));
  const ownDots = $derived(
    own.map((o, i) => {
      const t = own.length === 1 ? 0.5 : i / (own.length - 1);
      // (half on the right arc, half on the left)
      const side = i % 2 === 0 ? 0 : Math.PI;
      const a = side + (-Math.PI / 3 + ((2 * Math.PI) / 3) * t);
      return { ...o, x: 0.44 * disc.r * Math.cos(a), y: 0.44 * disc.r * Math.sin(a), r: disc.r / 12 };
    }),
  );
  const font = $derived(Math.max(9, Math.min(22, disc.r * 0.12)));
</script>

<button
  class="unstyled disc"
  style:left="{disc.x}px"
  style:top="{disc.y}px"
  style:width="{2 * disc.r}px"
  style:height="{2 * disc.r}px"
  style:border-width="{Math.max(3, disc.r * 0.08)}px"
  onclick={onopen}
  aria-label="Fragments: {entries.length} in the seed library, by facet{own.length ? `, and ${own.length} of your own` : ''}. Open the map"
>
  <svg width={2 * disc.r} height={2 * disc.r} viewBox="{-disc.r} {-disc.r} {2 * disc.r} {2 * disc.r}" aria-hidden="true">
    {#each dots as d (d.facet)}
      <circle cx={d.x} cy={d.y} r={Math.max(2, d.r)} fill={facetColour(d.facet, FACETS)}><title>{d.facet}: {d.n}</title></circle>
    {/each}
    {#each ownDots as d (d.id)}
      <circle class="own" cx={d.x} cy={d.y} r={Math.max(2, d.r)} fill={d.facet ? facetColour(d.facet, FACETS) : 'none'}><title>{d.id}, yours</title></circle>
    {/each}
  </svg>
  <span class="title" style:font-size="{font}px">Fragments</span>
  <span class="count" style:font-size="{font * 1.4}px">{entries.length}</span>
  {#if own.length}<span class="mine" style:font-size="{font}px">{own.length} mine</span>{/if}
</button>

<style>
  .disc {
    position: absolute;
    z-index: 2;
    transform: translate(-50%, -50%);
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    border-style: solid;
    border-color: var(--accent);
    background: var(--wheel-disc);
    color: var(--text);
    font-family: var(--font-ui);
    overflow: hidden;
  }
  .disc:hover,
  .disc:focus-visible {
    background: var(--surface);
  }
  svg {
    position: absolute;
    inset: 0;
    margin: auto;
    pointer-events: none;
  }
  .title {
    position: relative;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  circle.own {
    stroke: var(--accent);
    stroke-width: 2;
  }
  .mine {
    position: relative;
    color: var(--accent);
    font-weight: 700;
  }
  .count {
    position: relative;
    font-weight: 700;
    color: var(--text-muted);
  }
</style>
