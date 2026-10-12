<script lang="ts">
  /**
   * Choosing a piece: every example and every piece saved in this browser, as
   * cards with their graph in miniature (CardGrid), filtered by tag (TagFilters) and by words, or the library as a
   * graph, a piece's card opened from it (PieceDetail). Opening and saving files, and saving here, live at the top.
   */
  import LibraryGraph from './LibraryGraph.svelte';
  import CardGrid from './picker/CardGrid.svelte';
  import PieceDetail from './picker/PieceDetail.svelte';
  import TagFilters from './picker/TagFilters.svelte';
  import { tagColours } from './tags';
  import { TUTORIAL } from '../engine/tags';
  import { noteColour } from './theme';
  import type { LibraryLayout } from '../layout/library';
  import { FILTER_KINDS, matches, type Entry, type FilterKind } from './entries';
  import { untrack } from 'svelte';
  import { prefersReducedMotion } from 'svelte/motion';

  import { getStudio } from './state/studio.svelte';

  let {
    embedded = false,
  }: {
    /** A view of its own (the first one), not a dialog over the piece. */
    embedded?: boolean;
  } = $props();

  const studio = getStudio();
  const { library } = studio;
  const entries = $derived(library.entries);
  const current = $derived(library.currentId);
  const message = $derived(studio.view.message);
  const onpick = (id: string) => studio.pick(id);
  const onclose = () => (studio.view.tab = 'graph');
  const onremove = (id: string) => library.remove(id);

  let query = $state('');
  // the tag lit in the graph
  let tag = $state<string | null>(null);
  // the cards' filters: a tag of each kind, or any (all of them hold: genre and artist and topic; the tutorial has its own section)
  let filter = $state<Record<FilterKind, string | null>>({ genre: null, artist: null, topic: null });
  // cards, or the library as a graph (pieces and their tags)
  let view = $state<'cards' | 'graph'>('graph');
  // the floating top's height (the graph keeps it free) and a request to frame it all again
  let topHeight = $state(0);
  let refit = $state(0);
  // a tag chosen from a piece's rim: the details close, the graph frames it all
  function pickTag(t: string) {
    tag = tag === t ? null : t;
    detail = null;
    if (view === 'graph') refit++;
  }
  // a piece's card, opened from the graph: its details
  let detail = $state<Entry | null>(null);

  const words = $derived(query.trim().toLowerCase());
  const shown = $derived(entries.filter((e) => FILTER_KINDS.every((k) => !filter[k] || e.tags.includes(filter[k]!)) && matches(e, words)));
  // the library as a graph: worked out just after opening (the cards come first), kept for next time (Library.arrange)
  let lib = $state<LibraryLayout | null>(null);
  $effect(() => {
    const now = entries;
    return library.arrange(
      now,
      untrack(() => prefersReducedMotion.current),
      (l) => (lib = l),
    );
  });
  // tags in colour: each its angle round the cloud (a colour wheel by construction) — until the cloud
  // is ready, the twelve note colours dealt round the fifths
  const colours = $derived(
    lib
      ? new Map(
          [...lib.hue].map(([t, h]) => {
            // (the tutorial is no genre: a neutral of its own, not its angle's colour)
            if (t === TUTORIAL) return [t, 'var(--tutorial)'];
            // saturation by distance from the centre: grey in the middle, full at the border
            const pct = Math.round(25 + 75 * (lib!.sat.get(t) ?? 1));
            return [t, `color-mix(in oklab, ${noteColour(h)} ${pct}%, #8b909a)`];
          }),
        )
      : tagColours(entries.flatMap((e) => e.tags)),
  );
  // (the graph keeps every piece in place: the search only dims)
  const matching = $derived(new Set(entries.filter((e) => matches(e, words)).map((e) => e.id)));

  function onkeydown(e: KeyboardEvent) {
    if (e.key !== 'Escape') return;
    if (detail) detail = null;
    else if (!embedded) onclose();
  }
</script>

<svelte:window {onkeydown} />

<div
  class="picker"
  class:embedded
  class:immersive={embedded && view === 'graph'}
  role={embedded ? 'region' : 'dialog'}
  aria-modal={embedded ? undefined : true}
  aria-label="Choose a piece"
>
  <div class="top" bind:clientHeight={topHeight}>
    <header class:quiet={embedded}>
      <h2>Choose a piece</h2>
      <div class="end">
        <button class="unstyled filesbtn" aria-label="Files, MIDI and more" onclick={() => studio.view.showPanel('file')}>Files ▾</button>
        {#if embedded}
          {#if current}<button class="unstyled back" onclick={onclose}>Back to the piece →</button>{/if}
        {:else}
          <button class="unstyled close" onclick={onclose} aria-label="Close">×</button>
        {/if}
      </div>
    </header>

    <div class="bar">
      <input class="search" type="search" placeholder="Search titles, descriptions, tags" bind:value={query} aria-label="Search" />
      <div class="views" role="radiogroup" aria-label="View">
        <button role="radio" aria-checked={view === 'cards'} class="unstyled" class:on={view === 'cards'} onclick={() => (view = 'cards')}>Cards</button>
        <button role="radio" aria-checked={view === 'graph'} class="unstyled" class:on={view === 'graph'} onclick={() => (view = 'graph')}>Graph</button>
      </div>
    </div>

    {#if view === 'cards'}
      <TagFilters {entries} {colours} bind:filter />
    {/if}
  </div>
  {#if message}<p class="message" role="status">{message}</p>{/if}

  {#if view === 'graph'}
    {#if lib}
      <LibraryGraph {entries} {lib} {colours} shown={matching} {current} bind:tag bare={embedded} top={embedded ? topHeight : 0} {refit} onopen={(e) => (detail = e)} />
    {:else}
      <!-- while the library is laid out: its wheel, turning (a transform: it keeps turning while the page works) -->
      <div class="arranging" role="status">
        <svg viewBox="-110 -110 220 220" aria-hidden="true">
          {#each ['#e0524f', '#c9d64a', '#4fd07f', '#4f86e0', '#b45be0'] as c, i (i)}
            {@const a0 = (i / 5) * 2 * Math.PI - Math.PI / 2 - Math.PI / 5 + 0.05}
            {@const a1 = (i / 5) * 2 * Math.PI - Math.PI / 2 + Math.PI / 5 - 0.05}
            <path
              d="M{100 * Math.cos(a0)},{100 * Math.sin(a0)} A100,100 0 0 1 {100 * Math.cos(a1)},{100 * Math.sin(a1)}"
              stroke={c}
              stroke-width="14"
              fill="none"
              stroke-linecap="round"
            />
          {/each}
          {#each Array(9) as _, i (i)}
            <circle class="dot" cx={55 * Math.cos(i * 2.4)} cy={55 * Math.sin(i * 2.4)} r="9" style:animation-delay="{i * 0.18}s" />
          {/each}
        </svg>
        <p>Arranging the library…</p>
      </div>
    {/if}
  {:else}
    <CardGrid {shown} {current} {colours} {onpick} {onremove} onreset={() => ((query = ''), (filter = { genre: null, artist: null, topic: null }))} />
  {/if}

  <!-- a piece's card, opened from the graph -->
  <!-- (a keyed each over zero or one: closing it never reads a card that's gone) -->
  {#each detail ? [detail] : [] as d (d.id)}
    <PieceDetail entry={d} {colours} {current} {tag} onclose={() => (detail = null)} {onpick} {onremove} onpicktag={pickTag} />
  {/each}
</div>

<style>
  .picker.embedded {
    position: relative;
    inset: auto;
    z-index: auto;
    height: 100%;
    animation: none;
    padding-top: 10px;
  }
  .back {
    font: 600 14px var(--font-ui);
    color: var(--accent);
    padding: 6px 4px;
  }
  .back:focus-visible {
    outline: 2px solid var(--accent);
    border-radius: 6px;
  }
  .picker {
    position: fixed;
    inset: 0;
    z-index: 60;
    overflow: auto;
    padding: var(--space-3) 14px calc(var(--space-4) + env(safe-area-inset-bottom));
    background: var(--bg);
    display: flex;
    flex-direction: column;
    gap: 10px;
    animation: rise 200ms cubic-bezier(0.2, 0.8, 0.2, 1);
  }
  @keyframes rise {
    from {
      transform: translateY(16px);
      opacity: 0;
    }
  }
  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }
  header .end {
    display: flex;
    align-items: center;
    gap: 14px;
  }
  h2 {
    margin: 0;
    font: 800 20px var(--font-ui);
    letter-spacing: -0.01em;
  }
  .close {
    font-size: 28px;
    line-height: 1;
    padding: 2px 8px;
    color: var(--text-muted);
  }
  .bar {
    display: flex;
    gap: 8px;
    align-items: center;
  }
  .bar .search {
    flex: 1;
    min-width: 0;
  }
  .views {
    display: flex;
    border: 1px solid var(--line);
    border-radius: 20px;
    overflow: hidden;
    flex: none;
  }
  .views button {
    padding: 9px 12px;
    font: 600 13px var(--font-ui);
    color: var(--text-muted);
  }
  .views button.on {
    background: var(--surface);
    color: var(--accent);
  }
  .views button:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: -2px;
  }
  .search {
    min-height: 40px;
    padding: 0 12px;
    border-radius: 20px;
    border: 1px solid var(--line);
    background: var(--surface);
    color: var(--text);
    font: 500 15px var(--font-ui);
  }
  .message {
    margin: -4px 0 0;
    font-size: 13px;
    color: var(--accent);
  }
  @media (min-width: 900px) {
    .picker {
      padding: 24px max(24px, calc((100vw - 1040px) / 2));
    }
    /* the first view: the whole width (the cards keep a readable column) */
    .picker.embedded {
      padding: 14px 28px 20px;
    }
  }
  .arranging {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 14px;
    min-height: 50svh;
    color: var(--text-muted);
    font: 600 14px var(--font-ui);
  }
  .arranging svg {
    width: min(220px, 50vw);
    height: auto;
    animation: turn 6s linear infinite;
  }
  .arranging .dot {
    fill: var(--text-faint);
    transform-box: fill-box;
    transform-origin: center;
    animation: pulse 1.6s ease-in-out infinite;
  }
  @keyframes turn {
    to {
      transform: rotate(360deg);
    }
  }
  @keyframes pulse {
    0%,
    100% {
      opacity: 0.25;
      transform: scale(0.6);
    }
    50% {
      opacity: 0.9;
      transform: scale(1);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .arranging svg,
    .arranging .dot {
      animation: none;
    }
  }
  /* the front door: the library is the canvas — the controls float over its top */
  .picker.immersive {
    padding: 0;
    overflow: hidden;
  }
  .picker.immersive .top {
    position: absolute;
    z-index: 3;
    inset: 0 0 auto 0;
    padding: 12px 16px 26px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    background: linear-gradient(var(--bg) 0%, color-mix(in oklab, var(--bg) 88%, transparent) 70%, transparent 100%);
    pointer-events: none;
  }
  .picker.immersive .top > * {
    pointer-events: auto;
  }
  .top {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .filesbtn {
    font: 600 13px var(--font-ui);
    color: var(--text-muted);
    padding: 4px 2px;
  }
  .filesbtn:focus-visible {
    outline: 2px solid var(--accent);
    border-radius: 4px;
  }
</style>
