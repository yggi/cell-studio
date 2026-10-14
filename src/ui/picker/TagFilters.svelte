<script lang="ts">
  /** The picker's filters: one dropdown per kind of tag (genre, artist, topic), each its most used tags first. */
  import { tagKind, tagName } from '@yggi/cells/engine/tags';
  import { FILTER_KINDS as KINDS, type Entry, type FilterKind } from '../entries';

  let {
    entries,
    colours,
    filter = $bindable(),
  }: {
    entries: readonly Entry[];
    colours: ReadonlyMap<string, string>;
    /** A tag of each kind, or any: all of them hold. */
    filter: Record<FilterKind, string | null>;
  } = $props();

  const filtered = $derived(KINDS.some((k) => filter[k]));
  const clear = () => (filter = { genre: null, artist: null, topic: null });

  // every tag by its kind, the most used first
  const tagsByKind = $derived.by(() => {
    const count = new Map<string, number>();
    for (const e of entries) for (const t of e.tags) count.set(t, (count.get(t) ?? 0) + 1);
    const all = [...count].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([t, n]) => ({ t, n }));
    return Object.fromEntries(KINDS.map((k) => [k, all.filter(({ t }) => tagKind(t) === k)])) as Record<FilterKind, { t: string; n: number }[]>;
  });
</script>

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
  {#if filtered}<button class="unstyled link clear" onclick={clear}>Clear</button>{/if}
</div>

<style>
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
  .link {
    color: var(--accent);
    font-weight: 600;
  }
</style>
