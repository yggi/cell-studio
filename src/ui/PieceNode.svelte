<script lang="ts">
  /**
   * A piece, as a node: its wheel (its graph inside, its tags round the rim), its
   * facts as petals on the rim — how many cells, how long or how often round — as
   * unnamed cells sit on theirs in a piece's graph, and its label beneath. The same
   * in the list and in the library's graph.
   */
  import PieceWheel from './PieceWheel.svelte';
  import { durationText } from '../engine/duration';
  import type { Entry } from './entries';

  let {
    entry,
    colours,
    size,
    label,
    labels = false,
    petals = true,
    showLabel = true,
    pill = false,
    current = false,
    miniature = true,
  }: {
    entry: Entry;
    colours: ReadonlyMap<string, string>;
    /** The wheel, across, in px. */
    size: number;
    /** What it's called beneath. */
    label: string;
    /** Tag names along the rim. */
    labels?: boolean;
    petals?: boolean;
    showLabel?: boolean;
    /** The label as a pill over the wheel's lower third, straight (tight, for the library's graph). */
    pill?: boolean;
    current?: boolean;
    /** Its graph inside the wheel (the library leaves it out while it grows). */
    miniature?: boolean;
  } = $props();

  // its facts, as petals: how many cells; how long (it ends) or how often round (it loops)
  const facts = $derived.by(() => {
    const out: { big: string; small: string }[] = [];
    if (entry.size) out.push({ big: String(entry.size), small: entry.size === 1 ? 'cell' : 'cells' });
    const t = entry.time;
    if (t?.ends != null) out.push({ big: durationText(t.ends), small: 'ends' });
    else if (t?.cycle != null) out.push({ big: Number.isFinite(t.cycle) && t.cycle < 3600 ? durationText(t.cycle) : '∞', small: t.chance ? 'cycle ~' : 'cycle' });
    return out;
  });
  const petal = $derived(Math.max(26, size * 0.3));
  // on the rim's edge, left and right, a little above the middle (clear of most names)
  const at = (i: number) => {
    const a = ((i === 0 ? -62 : 62) * Math.PI) / 180;
    const r = size / 2 + petal * 0.42;
    return { x: size / 2 + r * Math.sin(a), y: size / 2 - r * Math.cos(a) };
  };
</script>

<span class="node" style:width="{size}px">
  <span class="wheelbox" style:width="{size}px" style:height="{size}px">
    <PieceWheel id={entry.id} source={entry.source ?? entry.load!} stored={entry.miniature} tags={entry.tags} {colours} {size} {labels} {current} {miniature} />
    {#if petals}
      {#each facts as f, i (i)}
        {@const p = at(i)}
        <span class="petal" style:left="{p.x}px" style:top="{p.y}px" style:width="{petal}px" style:height="{petal}px" style:font-size="{petal * 0.3}px">
          <b>{f.big}</b><small>{f.small}</small>
        </span>
      {/each}
    {/if}
  </span>
  {#if showLabel && pill}
    <span class="pill" style:top="{size * 0.8}px" style:font-size="{Math.max(9, Math.min(14, size * 0.16))}px" style:max-width="{Math.max(70, size * 1.5)}px">{label}</span>
  {:else if showLabel}
    <span class="label" style:font-size="{Math.max(7, Math.min(15, size * 0.16))}px">{label}</span>
  {/if}
</span>

<style>
  .node {
    position: relative;
    display: inline-flex;
    flex-direction: column;
    align-items: center;
    gap: 5px;
  }
  .wheelbox {
    position: relative;
    display: block;
  }
  /* a petal, as unnamed cells sit on their parent's rim */
  .petal {
    position: absolute;
    transform: translate(-50%, -50%);
    border-radius: 50%;
    background: var(--wheel-disc);
    border: 1.5px solid color-mix(in oklab, var(--text-muted) 55%, var(--line));
    box-shadow: 0 0 0 2px var(--surface);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    line-height: 1.05;
    color: var(--text);
    font-family: var(--font-ui);
    pointer-events: none;
  }
  .petal b {
    font-weight: 800;
    font-variant-numeric: tabular-nums;
  }
  .petal small {
    font-size: 0.72em;
    color: var(--text-muted);
  }
  /* its label, as in the graph: bold, shadowed against whatever is behind */
  .label {
    max-width: 170%;
    text-align: center;
    font-family: var(--font-ui);
    font-weight: 700;
    line-height: 1.25;
    color: var(--text);
    text-shadow: 0 1px 3px var(--bg);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  /* a pill over the wheel's lower third, straight, as a cell's name in the piece's graph */
  .pill {
    position: absolute;
    left: 50%;
    transform: translate(-50%, -50%);
    padding: 0.15em 0.6em;
    border-radius: var(--radius-pill);
    border: 1px solid var(--line);
    background: color-mix(in oklab, var(--surface) 88%, transparent);
    color: var(--text);
    font-family: var(--font-ui);
    font-weight: 700;
    line-height: 1.3;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    pointer-events: none;
  }
</style>
