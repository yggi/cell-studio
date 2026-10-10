<script lang="ts" module>
  /** The margin's width (px): what the graph leaves it. */
  export const MARGIN_WIDTH = 260;
</script>

<script lang="ts">
  /**
   * The margin beside the graph (layout/side.ts, docs/ui/graph.md): the notes and scopes of a piece, read beside the
   * music instead of laid among it. A note carries its number, worn by the cells it explains; a scope its channels'
   * colours, worn by the cells it watches. In the order of the graph, top down: each by the height of what it is about.
   * Pointing at one lights its cells' marks; tapping a note opens it, as tapping a cell does.
   */
  import { untrack } from 'svelte';
  import type { GraphModel } from '../engine/graph';
  import { sideEntries } from '../layout/side';
  import { formatLabel } from '../layout/labels';
  import { getGraphContext } from './context';
  import ScopeView from './ScopeView.svelte';
  import { channelColour } from './theme';

  let {
    model,
    heightOf,
    settled,
    onlight,
  }: {
    model: GraphModel;
    /** Where a cell is in the graph, up and down (its node id): what the margin is ordered by. */
    heightOf: (id: string) => number | undefined;
    /** Counts the times the graph has come to rest: the margin is ordered again then, not as it moves. */
    settled: number;
    onlight: (id: string | null) => void;
  } = $props();
  const ctx = getGraphContext();

  const entries = $derived(sideEntries(model));
  // (top down by what each is about, at rest; one about nothing stays where the piece writes it)
  const ordered = $derived.by(() => {
    void settled;
    return untrack(() => {
      const at = (e: (typeof entries)[number]) => {
        const ys = e.about.flatMap((id) => heightOf(id) ?? []);
        return ys.length ? ys.reduce((a, b) => a + b, 0) / ys.length : -Infinity;
      };
      return entries.map((e, i) => ({ e, y: at(e), i })).sort((a, b) => a.y - b.y || a.i - b.i);
    });
  });
  const labelOf = (name: string) => {
    void ctx.turned;
    const c = ctx.program.cells.get(name);
    return c?.label ? formatLabel(ctx.program, name, c.label, untrack(() => ctx.heads.shifts) ?? ctx.shifts) : '';
  };
  const channels = (name: string) => (ctx.program.cells.get(name)?.units ?? []).flatMap((u) => (u.atom.kind === 'ref' ? [u.atom.name] : []));
</script>

<aside class="margin" aria-label="Notes and scopes">
  {#each ordered as { e } (e.id)}
    {#if e.kind === 'note'}
      <button
        class="note"
        class:off={ctx.muted.has(e.id)}
        onclick={() => ctx.open(e.name)}
        onpointerenter={() => onlight(e.id)}
        onpointerleave={() => onlight(null)}
        onfocus={() => onlight(e.id)}
        onblur={() => onlight(null)}
      >
        <span class="mark">{e.mark}</span>
        <span class="text">{@html labelOf(e.name)}</span>
      </button>
    {:else}
      <div class="scope" role="group" aria-label="Scope &{e.name}" onpointerenter={() => onlight(e.id)} onpointerleave={() => onlight(null)}>
        <button class="screen" onclick={() => ctx.open(e.name)} aria-label="Open &{e.name}"><ScopeView name={e.name} w={150} h={150} round /></button>
        <span class="name">&{e.name}</span>
        <ul>
          {#each channels(e.name) as ch, i (ch + i)}
            <li><span class="dot" style:background={channelColour(i)}></span>&{ch}</li>
          {/each}
        </ul>
      </div>
    {/if}
  {/each}
</aside>

<style>
  .margin {
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: var(--margin-width);
    padding: 56px 10px 16px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 10px;
    background: var(--bg);
    border-right: 1px solid var(--line);
    z-index: 4;
  }
  /* a note: the card it was in the graph, with its number */
  .note {
    position: relative;
    display: flex;
    gap: 8px;
    align-items: flex-start;
    text-align: left;
    padding: 8px 10px 8px 12px;
    border-radius: var(--radius);
    background: var(--surface-2);
    border: 1px solid var(--line);
    color: var(--text);
    font: 500 13px/1.4 var(--font-ui);
    cursor: pointer;
    overflow: hidden;
  }
  .note::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 3px;
    background: var(--rainbow);
  }
  .note:hover,
  .note:focus-visible {
    border-color: var(--accent);
  }
  .note.off {
    opacity: 0.45;
  }
  .note :global(b) {
    color: var(--accent);
  }
  .mark {
    flex: none;
    display: grid;
    place-items: center;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: var(--accent);
    color: var(--accent-ink);
    font: 800 11px var(--font-ui);
  }
  .scope {
    display: grid;
    justify-items: center;
    gap: 4px;
  }
  .screen {
    padding: 0;
    border: 0;
    background: none;
    cursor: pointer;
    border-radius: 50%;
  }
  .name {
    font: 600 12px var(--font-code);
    color: var(--text-muted);
  }
  ul {
    margin: 0;
    padding: 0;
    list-style: none;
    display: flex;
    flex-wrap: wrap;
    gap: 4px 10px;
    justify-content: center;
    font: 500 11px var(--font-code);
    color: var(--text-muted);
  }
  .dot {
    display: inline-block;
    width: 8px;
    height: 8px;
    margin-right: 4px;
    border-radius: 50%;
  }
</style>
