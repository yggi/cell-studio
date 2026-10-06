<script lang="ts" module>
  // the library's layout, kept between openings (the same pieces: the same wheel)
  let kept: { key: string; layout: import('../layout/library').LibraryLayout } | null = null;
  const keyOf = (entries: readonly { id: string; title?: string; tags: readonly string[] }[]) => entries.map((e) => `${e.id}:${e.title ?? ''}:${e.tags.join(',')}`).join('|');
  // (and kept in the browser between visits: the next visit's opening is a replay, not the physics again)
  const STORE = 'cell-studio:library-layout:v5';
  type Stored = { key: string; layout: Record<string, unknown> };
  const freeze = (l: import('../layout/library').LibraryLayout) => ({ ...l, at: [...l.at], hue: [...l.hue], count: [...l.count], sat: [...l.sat], wheel: [...l.wheel] });
  const thaw = (o: Record<string, unknown>) =>
    ({ ...o, at: new Map(o.at as []), hue: new Map(o.hue as []), count: new Map(o.count as []), sat: new Map(o.sat as []), wheel: new Map(o.wheel as []) }) as unknown as import('../layout/library').LibraryLayout;
  try {
    for (const v of ['v2', 'v3', 'v4']) localStorage.removeItem(`cell-studio:library-layout:${v}`);
  } catch {
    // (no storage)
  }
  function storedLayout(key: string) {
    try {
      const stored = JSON.parse(localStorage.getItem(STORE) ?? 'null') as Stored | null;
      return stored && stored.key === key ? thaw(stored.layout) : null;
    } catch {
      return null; // (no storage, or not ours: grow it)
    }
  }
  async function layoutFor(entries: readonly import('../layout/library').LibraryEntry[], onFrame?: (l: import('../layout/library').LibraryLayout) => Promise<void>) {
    const layout = await libraryLayoutOf(entries, onFrame);
    kept = { key: keyOf(entries), layout };
    try {
      localStorage.setItem(STORE, JSON.stringify({ key: kept.key, layout: freeze(layout) } satisfies Stored));
    } catch {
      // (full, or not allowed: it's only a cache)
    }
    return layout;
  }
  import { libraryLayoutAsync as libraryLayoutOf, stageOf } from '../layout/library';
</script>

<script lang="ts">
  /**
   * Choosing a piece: every example and every piece saved in this browser, as
   * cards with their graph in miniature; filtered by tag and by words. Opening
   * and saving files, and saving here, live at the top.
   */
  import LibraryGraph from './LibraryGraph.svelte';
  import PieceNode from './PieceNode.svelte';
  import { tagColours } from './tags';
  import { tagKind, tagName, type TagKind } from '../engine/tags';
  import { noteColour } from './theme';
  import type { LibraryLayout } from '../layout/library';
  import { durationText } from '../engine/duration';
  import type { Entry } from './entries';
  import { trap } from './kit/attach';
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
  const storageOk = library.storageOk;
  const message = $derived(studio.view.message);
  const perfOn = $derived(studio.view.perf);
  const onpick = (id: string) => studio.pick(id);
  const onclose = () => (studio.view.tab = 'graph');
  const onsavefile = () => studio.saveFile();
  const onopenfile = (file: File) => studio.openFile(file);
  const onsavebrowser = () => studio.saveHere();
  const onremove = (id: string) => library.remove(id);
  const onrender = () => studio.render();
  /** Show or hide the performance overlay. */
  const onperf = () => studio.view.togglePerf();

  let query = $state('');
  // the tag lit in the graph
  let tag = $state<string | null>(null);
  // the cards' filters: a tag of each kind, or any (all of them hold: genre and artist and topic)
  const KINDS: readonly TagKind[] = ['genre', 'artist', 'topic'];
  let filter = $state<Record<TagKind, string | null>>({ genre: null, artist: null, topic: null });
  const filtered = $derived(KINDS.some((k) => filter[k]));
  const clearFilter = () => (filter = { genre: null, artist: null, topic: null });
  // cards, or the library as a graph (pieces and their tags)
  let view = $state<'cards' | 'graph'>('graph');
  let filesOpen = $state(false);
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

  // every tag by its kind, the most used first
  const tagsByKind = $derived.by(() => {
    const count = new Map<string, number>();
    for (const e of entries) for (const t of e.tags) count.set(t, (count.get(t) ?? 0) + 1);
    const all = [...count].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([t, n]) => ({ t, n }));
    return Object.fromEntries(KINDS.map((k) => [k, all.filter(({ t }) => tagKind(t) === k)])) as Record<TagKind, { t: string; n: number }[]>;
  });
  const words = $derived(query.trim().toLowerCase());
  const shown = $derived(
    entries.filter(
      (e) =>
        KINDS.every((k) => !filter[k] || e.tags.includes(filter[k]!)) &&
        (!words || e.title.toLowerCase().includes(words) || e.description.toLowerCase().includes(words) || e.tags.some((t) => tagName(t).toLowerCase().includes(words))),
    ),
  );
  const saved = $derived(shown.filter((e) => e.kind === 'saved'));
  // the library as a graph: worked out just after opening (the cards come first), kept for next time
  let lib = $state<LibraryLayout | null>(null);
  // (kept while the same pieces carry the same tags; grown again when they change)
  $effect(() => {
    const now = entries;
    const key = keyOf(now);
    if (kept && kept.key === key) {
      lib = kept.layout;
      return;
    }
    let cancelled = false;
    const still = untrack(() => prefersReducedMotion.current);
    const frame = (l: LibraryLayout) =>
      new Promise<void>((go) => {
        if (!cancelled) lib = l;
        requestAnimationFrame(() => go());
      });
    // kept from a visit before: its opening replayed — 0.7 s, as many frames as the device draws, no physics
    const stored = storedLayout(key);
    if (stored) {
      kept = { key, layout: stored };
      if (still) lib = stored;
      else
        void (async () => {
          const t0 = performance.now();
          for (let t = 0; !cancelled; t = Math.min(1, (performance.now() - t0) / 700)) {
            await frame(stageOf(stored, t));
            if (t === 1) break;
          }
        })();
      return () => (cancelled = true);
    }
    // (else after the cards have been drawn: two frames, then it grows — each stage drawn, unless motion is reduced)
    requestAnimationFrame(() =>
      requestAnimationFrame(() =>
        setTimeout(async () => {
          const l = await layoutFor(now, still ? undefined : frame);
          if (!cancelled) lib = l;
        }, 0),
      ),
    );
    return () => (cancelled = true);
  });
  // tags in colour: each its angle round the cloud (a colour wheel by construction) — until the cloud
  // is ready, the twelve note colours dealt round the fifths
  const colours = $derived(
    lib
      ? new Map(
          [...lib.hue].map(([t, h]) => {
            // saturation by distance from the centre: grey in the middle, full at the border
            const pct = Math.round(25 + 75 * (lib!.sat.get(t) ?? 1));
            return [t, `color-mix(in oklab, ${noteColour(h)} ${pct}%, #8b909a)`];
          }),
        )
      : tagColours(entries.flatMap((e) => e.tags)),
  );
  const timeText = (e: Entry) =>
    !e.time ? '' : e.time.ends !== null ? `ends after ${durationText(e.time.ends)}` : e.time.cycle !== null ? `cycle ${durationText(e.time.cycle)}` : '';
  const timeSentence = (e: Entry) =>
    !e.time
      ? ''
      : e.time.ends !== null
        ? `Plays ${durationText(e.time.ends)}, then ends.`
        : e.time.cycle !== null
          ? `Loops: every layer is back together after ${durationText(e.time.cycle)}${e.time.chance ? ' — and with chance, no two times round are the same' : ''}.`
          : '';
  // (the graph keeps every piece in place: the search only dims)
  const matching = $derived(
    new Set(entries.filter((e) => !words || e.title.toLowerCase().includes(words) || e.description.toLowerCase().includes(words) || e.tags.some((t) => tagName(t).toLowerCase().includes(words))).map((e) => e.id)),
  );
  // the examples, smallest first: from simple to complex
  const examples = $derived(shown.filter((e) => e.kind === 'example').sort((a, b) => (a.size ?? 0) - (b.size ?? 0)));
  // a card's wheel: as large as its card leaves room for, the petals on its rim included (≈ 1.41 × across)
  let cardWidth = $state(0);
  const wheel = $derived(cardWidth ? Math.min(136, Math.floor((cardWidth - 8) / 1.41)) : 136);
  const when = (iso?: string) => (iso ? new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) : '');

  let fileInput: HTMLInputElement;
  function onkeydown(e: KeyboardEvent) {
    if (e.key !== 'Escape') return;
    if (detail) detail = null;
    else if (!embedded) onclose();
  }
</script>

<svelte:window {onkeydown} />

<div class="picker" class:embedded class:immersive={embedded && view === 'graph'} role={embedded ? 'region' : 'dialog'} aria-modal={embedded ? undefined : true} aria-label="Choose a piece">
  <div class="top" bind:clientHeight={topHeight}>
  <header class:quiet={embedded}>
    <h2>Choose a piece</h2>
    <div class="end">
      <div class="files" role="group" aria-label="Files">
        <button class="filesbtn" aria-expanded={filesOpen} onclick={() => (filesOpen = !filesOpen)}>Files ▾</button>
        {#if filesOpen}
          <div class="menu" role="menu">
            <button role="menuitem" onclick={() => ((filesOpen = false), fileInput.click())}>Open a file…</button>
            <button role="menuitem" disabled={!current} onclick={() => ((filesOpen = false), onsavefile())}>Save the piece to a file</button>
            <button role="menuitem" disabled={!current} onclick={() => ((filesOpen = false), onrender())}>Render the piece to WAV</button>
            {#if onperf}<button role="menuitem" onclick={() => ((filesOpen = false), onperf())}>{perfOn ? 'Hide' : 'Show'} performance report</button>{/if}
            <button role="menuitem" disabled={!current || !storageOk} title={storageOk ? undefined : 'This browser can’t keep pieces here'} onclick={() => ((filesOpen = false), onsavebrowser())}>Save it in this browser</button>
            <p class="version">Cell studio {__APP_VERSION__}</p>
          </div>
        {/if}
        <input
          bind:this={fileInput}
          type="file"
          accept=".cells,.txt,text/plain"
          hidden
          onchange={(e) => {
            const f = e.currentTarget.files?.[0];
            if (f) onopenfile(f);
            e.currentTarget.value = '';
          }}
        />
      </div>
      {#if embedded}
        {#if current}<button class="back" onclick={onclose}>Back to the piece →</button>{/if}
      {:else}
        <button class="close" onclick={onclose} aria-label="Close">×</button>
      {/if}
    </div>
  </header>

  <div class="bar">
    <input class="search" type="search" placeholder="Search titles, descriptions, tags" bind:value={query} aria-label="Search" />
    <div class="views" role="radiogroup" aria-label="View">
      <button role="radio" aria-checked={view === 'cards'} class:on={view === 'cards'} onclick={() => (view = 'cards')}>Cards</button>
      <button role="radio" aria-checked={view === 'graph'} class:on={view === 'graph'} onclick={() => (view = 'graph')}>Graph</button>
    </div>
  </div>

  {#if view === 'cards'}
  <div class="tags" role="group" aria-label="Filter by tag">
    {#each KINDS as k (k)}
      {#if tagsByKind[k].length}
        {@const on = filter[k]}
        <label class="kind" class:on={!!on} style:--hue={on ? colours.get(on) : undefined}>
          <select aria-label="Filter by {k}" value={on ?? ''} onchange={(ev) => (filter[k] = ev.currentTarget.value || null)}>
            <option value="">Any {k}</option>
            {#each tagsByKind[k] as { t, n } (t)}<option value={t}>{tagName(t)} ({n})</option>{/each}
          </select>
          <span class="chev" aria-hidden="true">▾</span>
        </label>
      {/if}
    {/each}
    {#if filtered}<button class="link clear" onclick={clearFilter}>Clear</button>{/if}
  </div>
  {/if}
  </div>
  {#if message}<p class="message" role="status">{message}</p>{/if}

  {#snippet card(e: Entry)}
    <div class="card" class:current={e.id === current} bind:clientWidth={cardWidth}>
      <!-- (one target: the wheel is a picture, its tags chosen from the chips) -->
      <button class="open" data-id={e.id} onclick={() => onpick(e.id)} aria-label="Open {e.title}">
        <span class="mini"><PieceNode entry={e} {colours} size={wheel} labels current={e.id === current} /></span>
        <span class="title">{e.title}</span>
        {#if e.description}<span class="desc">{e.description}</span>{/if}
        {#if e.id === current || e.saved}
          <span class="meta">
            {#if e.id === current}<b>Open now</b>{/if}
            {#if e.saved}<span>Saved {when(e.saved)}</span>{/if}
          </span>
        {/if}
      </button>
      {#if e.kind === 'saved'}<button class="remove" onclick={() => onremove(e.id)} aria-label="Remove {e.title} from this browser">Remove</button>{/if}
    </div>
  {/snippet}

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
            <path d="M{100 * Math.cos(a0)},{100 * Math.sin(a0)} A100,100 0 0 1 {100 * Math.cos(a1)},{100 * Math.sin(a1)}" stroke={c} stroke-width="14" fill="none" stroke-linecap="round" />
          {/each}
          {#each Array(9) as _, i (i)}
            <circle class="dot" cx={55 * Math.cos(i * 2.4)} cy={55 * Math.sin(i * 2.4)} r="9" style:animation-delay="{i * 0.18}s" />
          {/each}
        </svg>
        <p>Arranging the library…</p>
      </div>
    {/if}
  {:else}
  {#if saved.length}
    <section>
      <h3 class="section">Saved in this browser</h3>
      <div class="grid">{#each saved as e (e.id)}{@render card(e)}{/each}</div>
    </section>
  {/if}
  <section>
    {#if saved.length}<h3 class="section">Examples</h3>{/if}
    {#if examples.length}
      <div class="grid">{#each examples as e (e.id)}{@render card(e)}{/each}</div>
    {:else}
      <p class="empty">Nothing matches. <button class="link" onclick={() => ((query = ''), clearFilter())}>Show everything</button></p>
    {/if}
  </section>
  {/if}

  <!-- a piece's card, opened from the graph -->
  <!-- (a keyed each over zero or one: closing it never reads a card that's gone) -->
  {#each detail ? [detail] : [] as d (d.id)}
    <div class="scrim" onclick={() => (detail = null)} role="presentation"></div>
    <div class="detail" role="dialog" aria-modal="true" aria-label={d.title} {@attach trap({ onescape: () => (detail = null), focus: '.primary' })}>
      <header>
        <h3>{d.title}</h3>
        <button class="close" onclick={() => (detail = null)} aria-label="Close">×</button>
      </header>
      <button class="big" onclick={() => ((detail = null), onpick(d.id))} aria-label="Open {d.title}"><PieceNode entry={d} {colours} size={220} labels current={d.id === current} /></button>
      {#if d.description}<p class="full">{d.description}</p>{/if}
      {#if d.time}<p class="full time">{timeSentence(d)}{d.size ? ` ${d.size} cells.` : ''}</p>{/if}
      <p class="when">
        {#if d.id === current}<b>Open now</b>{/if}
        {#if d.saved}Saved in this browser, {when(d.saved)}{:else}An example{/if}
      </p>
      <div class="dtags">
        {#each d.tags as t (t)}
          <button class="tag" class:on={tag === t} style:--hue={colours.get(t)} onclick={() => pickTag(t)}>{tagName(t)}</button>
        {/each}
      </div>
      <div class="actions">
        <button class="primary" onclick={() => ((detail = null), onpick(d.id))}>Open</button>
        {#if d.kind === 'saved'}<button class="remove" onclick={() => ((detail = null), onremove(d.id))}>Remove from this browser</button>{/if}
      </div>
    </div>
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
    all: unset;
    cursor: pointer;
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
    all: unset;
    cursor: pointer;
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
    all: unset;
    cursor: pointer;
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
  .scrim {
    position: fixed;
    inset: 0;
    z-index: 61;
    background: var(--scrim);
  }
  .detail {
    position: fixed;
    z-index: 62;
    left: 0;
    right: 0;
    bottom: 0;
    max-height: 86svh;
    overflow: auto;
    padding: 14px 16px calc(16px + env(safe-area-inset-bottom));
    background: var(--surface);
    border-top: 1px solid var(--line);
    border-radius: var(--radius-lg) var(--radius-lg) 0 0;
    display: flex;
    flex-direction: column;
    gap: 10px;
    animation: rise 200ms cubic-bezier(0.2, 0.8, 0.2, 1);
  }
  @media (min-width: 900px) {
    .detail {
      left: auto;
      right: 24px;
      bottom: 24px;
      width: 380px;
      border-radius: 14px;
      border: 1px solid var(--line);
    }
  }
  .detail h3 {
    margin: 0;
    font: 800 19px/1.25 var(--font-ui);
  }
  .big {
    align-self: center;
  }
  .full.time {
    color: var(--text-muted);
    font-size: 13.5px;
  }
  .full {
    margin: 0;
    font-size: 14.5px;
    line-height: 1.5;
    color: var(--text);
  }
  .when {
    margin: 0;
    font-size: 12.5px;
    color: var(--text-muted);
    display: flex;
    gap: 8px;
  }
  .when b {
    color: var(--accent);
  }
  .dtags {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .actions {
    display: flex;
    align-items: center;
    gap: 14px;
  }
  .primary {
    min-height: 40px;
    padding: 0 22px;
    border-radius: 20px;
    border: 0;
    background: var(--accent);
    color: var(--accent-ink);
    font: 700 15px var(--font-ui);
    cursor: pointer;
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
  /* the filters: one dropdown per kind of tag */
  .tags {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
  }
  .kind {
    position: relative;
    display: inline-flex;
    align-items: center;
  }
  .kind select {
    appearance: none;
    min-height: 34px;
    padding: 0 28px 0 12px;
    border-radius: var(--radius-pill);
    border: 1px solid var(--line);
    background: var(--surface);
    color: var(--text-muted);
    font: 600 13px var(--font-ui);
    cursor: pointer;
  }
  .kind.on select {
    border-color: var(--hue, var(--accent));
    background: color-mix(in oklab, var(--hue, var(--accent)) 30%, var(--surface));
    color: var(--text);
  }
  .kind select:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 1px;
  }
  .kind .chev {
    position: absolute;
    right: 11px;
    font-size: 11px;
    color: var(--text-muted);
    pointer-events: none;
  }
  .clear {
    font-size: 13px;
  }
  .tag {
    display: inline-flex;
    align-items: baseline;
    gap: 5px;
    padding: 5px 10px;
    border-radius: var(--radius-pill);
    border: 1px solid color-mix(in oklab, var(--hue, var(--line)) 55%, var(--line));
    background: color-mix(in oklab, var(--hue, var(--surface)) 16%, var(--surface));
    color: var(--text);
    font: 600 13px var(--font-ui);
    cursor: pointer;
  }
  .tag.on {
    border-color: var(--hue, var(--accent));
    background: var(--hue, var(--accent));
    color: var(--ink-on-note);
  }
  .files {
    display: flex;
    flex-wrap: wrap;
    gap: 6px 14px;
  }
  .files button {
    all: unset;
    cursor: pointer;
    font: 600 13.5px var(--font-ui);
    color: var(--text-muted);
    padding: 4px 0;
  }
  .files button:hover {
    color: var(--accent);
  }
  .files button:disabled {
    opacity: 0.4;
    cursor: default;
  }
  .message {
    margin: -4px 0 0;
    font-size: 13px;
    color: var(--accent);
  }
  section {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .section {
    margin: 6px 0 0;
    font: 600 14px var(--font-ui);
    color: var(--text-muted);
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(168px, 1fr));
    gap: 10px;
  }
  .card {
    position: relative;
    display: flex;
    flex-direction: column;
    border-radius: var(--radius);
    background: var(--surface);
    border: 1px solid var(--line);
    overflow: hidden;
  }
  .card.current {
    border-color: var(--accent);
  }
  .open {
    all: unset;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 0 10px 10px;
  }
  .open:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: -2px;
  }
  .mini {
    position: relative;
    display: flex;
    justify-content: center;
    padding: 12px 0 8px;
  }
  .title {
    font: 700 14.5px/1.3 var(--font-ui);
    color: var(--text);
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .desc {
    font-size: 12.5px;
    line-height: 1.4;
    color: var(--text-muted);
    display: -webkit-box;
    -webkit-line-clamp: 4;
    line-clamp: 4;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .meta {
    margin-top: 2px;
    display: flex;
    flex-wrap: wrap;
    gap: 2px 8px;
    font-size: 11.5px;
    color: var(--text-faint);
  }
  .meta b {
    color: var(--accent);
    font-weight: 700;
  }
  .remove {
    all: unset;
    cursor: pointer;
    align-self: flex-start;
    margin: 0 10px 10px;
    font: 600 12.5px var(--font-ui);
    color: color-mix(in oklab, var(--danger) 80%, var(--text-muted));
  }
  .empty {
    color: var(--text-muted);
  }
  .link {
    all: unset;
    cursor: pointer;
    color: var(--accent);
    font-weight: 600;
  }
  @media (min-width: 900px) {
    .picker {
      padding: 24px max(24px, calc((100vw - 1040px) / 2));
    }
    /* the first view: the whole width (the cards keep a readable column) */
    .picker.embedded {
      padding: 14px 28px 20px;
    }
    .grid {
      grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
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
  .files {
    position: relative;
    align-self: flex-start;
  }
  .filesbtn {
    all: unset;
    cursor: pointer;
    font: 600 13px var(--font-ui);
    color: var(--text-muted);
    padding: 4px 2px;
  }
  .filesbtn:focus-visible {
    outline: 2px solid var(--accent);
    border-radius: 4px;
  }
  .menu {
    position: absolute;
    z-index: 5;
    top: 100%;
    right: 0;
    min-width: 230px;
    display: flex;
    flex-direction: column;
    padding: 6px;
    border-radius: 12px;
    background: var(--surface);
    border: 1px solid var(--line);
    box-shadow: 0 12px 30px rgba(0, 0, 0, 0.45);
  }
  .menu button {
    all: unset;
    cursor: pointer;
    padding: 9px 10px;
    border-radius: 8px;
    font: 600 14px var(--font-ui);
    color: var(--text);
  }
  .menu button:hover:not(:disabled),
  .menu button:focus-visible {
    background: var(--code-bg);
  }
  .menu .version {
    margin: 4px 10px 2px;
    font: 12px var(--font-ui);
    color: var(--text-faint);
    user-select: text;
  }
  .menu button:disabled {
    color: var(--text-faint);
    cursor: default;
  }
  button.big {
    all: unset;
    cursor: pointer;
    align-self: center;
    border-radius: 50%;
  }
  button.big:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 4px;
  }
</style>
