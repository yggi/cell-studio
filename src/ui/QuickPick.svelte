<script lang="ts">
  /**
   * A quick way to another piece, in the header: the open piece's place in the library as a path —
   * a kind of tag › a tag of that kind › a piece carrying it (artist › Neubauten › Baustelle) — each
   * step a dropdown. Choose a kind or a tag and the next step lists what's there; choose a piece and
   * it opens. Native selects: the phone's own picker.
   */
  import { tagKind, tagName, TUTORIAL, type TagKind } from '@yggi/cells/engine/tags';
  import { shortTitle } from '../layout/library';

  let {
    entries,
    current,
    onpick,
    onlibrary,
  }: {
    entries: readonly { readonly id: string; readonly title: string; readonly tags: readonly string[]; readonly tier?: number | null }[];
    /** The piece open now, if any. */
    current: string | null;
    onpick: (id: string) => void;
    /** The path's root, the library itself (a wide screen has no tabs: this is the way back to it). */
    onlibrary?: () => void;
  } = $props();

  const KINDS: readonly TagKind[] = ['tutorial', 'genre', 'artist', 'topic'];
  const piece = $derived(entries.find((e) => e.id === current) ?? null);
  // what was chosen here — until another piece opens (then the path is that piece's)
  let chosen = $state<{ for: string | null; kind: TagKind | null; tag: string | null }>({ for: null, kind: null, tag: null });
  const mine = $derived(chosen.for === current ? chosen : null);

  // every tag of a kind, the most used first
  const count = $derived.by(() => {
    const c = new Map<string, number>();
    for (const e of entries) for (const t of e.tags) c.set(t, (c.get(t) ?? 0) + 1);
    return c;
  });
  const tagsOf = (k: TagKind) => [...count].filter(([t]) => tagKind(t) === k).sort((a, b) => b[1] - a[1] || tagName(a[0]).localeCompare(tagName(b[0])));
  const kinds = $derived(KINDS.filter((k) => tagsOf(k).length));
  // the path: what was chosen, else the open piece's own (the tutorial, or its artist first: the most particular), else the most used
  const kind = $derived<TagKind>(
    mine?.kind ?? (['tutorial', 'artist', 'genre', 'topic'] as const).find((k) => piece?.tags.some((t) => tagKind(t) === k)) ?? kinds.find((k) => k !== 'tutorial') ?? 'genre',
  );
  const tags = $derived(tagsOf(kind));
  const tag = $derived(mine?.tag ?? piece?.tags.find((t) => tagKind(t) === kind) ?? tags[0]?.[0] ?? null);
  // (the tutorial's pieces by tier, numbered with their tier, the library's order within one: the next one is the next piece)
  const pieces = $derived(
    tag ? entries.filter((e) => e.tags.includes(tag)).sort((a, b) => (tag === TUTORIAL ? (a.tier ?? 0) - (b.tier ?? 0) : a.title.localeCompare(b.title))) : [],
  );
  const named = (e: (typeof entries)[number]) => (tag === TUTORIAL && e.tier ? `${e.tier} · ${e.title}` : e.title);
  const here = $derived(pieces.some((e) => e.id === current) ? current! : '');
</script>

<span class="quick" role="group" aria-label="Choose a piece by its tags">
  {#if onlibrary}
    <button class="unstyled step root" onclick={onlibrary} title="Choose another piece">Library</button>
    <span class="sep root" aria-hidden="true">›</span>
  {/if}
  <span class="step kind">
    <span class="text">{kind}</span>
    <select aria-label="Kind of tag" value={kind} onchange={(e) => (chosen = { for: current, kind: e.currentTarget.value as TagKind, tag: null })}>
      {#each kinds as k (k)}<option value={k}>{k}</option>{/each}
    </select>
  </span>
  <span class="sep kind" aria-hidden="true">›</span>
  <span class="step">
    <span class="text">{tag ? tagName(tag) : '—'}</span>
    <!-- (every tag, by kind — this kind first: on a phone, where the kind step is hidden, any tag is a tap away) -->
    <select aria-label="Tag" value={tag ?? ''} onchange={(e) => (chosen = { for: current, kind: tagKind(e.currentTarget.value), tag: e.currentTarget.value })}>
      {#each [kind, ...kinds.filter((k) => k !== kind)] as k (k)}
        <optgroup label={k}>
          {#each tagsOf(k) as [t, n] (t)}<option value={t}>{tagName(t)} ({n})</option>{/each}
        </optgroup>
      {/each}
    </select>
  </span>
  <span class="sep" aria-hidden="true">›</span>
  <span class="step piece" class:none={!here}>
    <span class="text">{here ? shortTitle(piece!.title) : `${pieces.length} pieces…`}</span>
    <select aria-label="Piece" value={here} onchange={(e) => e.currentTarget.value && onpick(e.currentTarget.value)}>
      {#if !here}<option value="" disabled>{piece ? `${piece.title} (open)` : 'Choose a piece'}</option>{/if}
      {#each pieces as e (e.id)}<option value={e.id}>{named(e)}</option>{/each}
    </select>
  </span>
</span>

<style>
  .quick {
    display: flex;
    align-items: baseline;
    gap: 4px;
    min-width: 0;
    font: 600 12px var(--font-ui);
    color: var(--text-muted);
  }
  /* a step: its text as shown, the native select over it, invisible (a tap opens the picker) */
  /* (short of room, the kind and the tag give way first: the piece's name is what matters) */
  .step {
    position: relative;
    flex: 0 1 auto;
    min-width: 1.6em;
    max-width: 9em;
    white-space: nowrap;
  }
  .step .text {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .step.piece {
    flex: 0 0.15 auto;
    min-width: 4em;
    max-width: none;
    font: 700 13px var(--font-ui);
    color: var(--text);
  }
  .step.piece.none {
    color: var(--text-muted);
    font-weight: 600;
  }
  .step:hover .text {
    color: var(--accent);
  }
  .step:focus-within .text {
    outline: 2px solid var(--accent);
    outline-offset: 1px;
    border-radius: 4px;
  }
  select {
    position: absolute;
    inset: 0;
    width: 100%;
    opacity: 0;
    cursor: pointer;
    font: inherit;
  }
  .step.root {
    flex: none;
    min-width: 0;
    cursor: pointer;
  }
  .step.root:hover {
    color: var(--accent);
  }
  .step.root:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 1px;
    border-radius: 4px;
  }
  .sep {
    flex: none;
    color: var(--text-faint);
  }
  /* (narrow: the tabs are the way back) */
  @media (max-width: 899px) {
    .root {
      display: none;
    }
  }
  /* a phone: tag › piece (the tag's list holds every kind) */
  @media (max-width: 599px) {
    .kind {
      display: none;
    }
  }
</style>
