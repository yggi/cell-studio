<script lang="ts">
  /**
   * The picker's cards: the pieces saved in this browser, the tutorial tier by tier, then the other examples, smallest
   * first (from simple to complex); each card its graph in miniature, its title and description.
   */
  import PieceNode from '../PieceNode.svelte';
  import { byTier } from '../../layout/library';
  import { TUTORIAL } from '../../engine/tags';
  import type { Entry } from '../entries';

  let {
    shown,
    current,
    colours,
    onpick,
    onremove,
    onreset,
  }: {
    /** The cards that pass the filters and the search. */
    shown: readonly Entry[];
    /** The card of the piece open now. */
    current: string | null;
    colours: ReadonlyMap<string, string>;
    onpick: (id: string) => void;
    onremove: (id: string) => void;
    /** Show everything again: no search, no filter. */
    onreset: () => void;
  } = $props();

  const saved = $derived(shown.filter((e) => e.kind === 'saved'));
  // the tutorial, tier by tier (the library's order within one); then the other examples, smallest first
  const tutorial = $derived(shown.filter((e) => e.kind === 'example' && e.tags.includes(TUTORIAL)).sort(byTier));
  const examples = $derived(shown.filter((e) => e.kind === 'example' && !e.tags.includes(TUTORIAL)).sort((a, b) => (a.size ?? 0) - (b.size ?? 0)));
  // the MIDI library, in the order of its books
  const midi = $derived(shown.filter((e) => e.kind === 'midi'));
  // a card's wheel: as large as its card leaves room for, the petals on its rim included (≈ 1.41 × across)
  let cardWidth = $state(0);
  const wheel = $derived(cardWidth ? Math.min(136, Math.floor((cardWidth - 8) / 1.41)) : 136);
  const when = (iso?: string) => (iso ? new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) : '');
</script>

{#snippet card(e: Entry)}
  <div class="card" class:current={e.id === current} bind:clientWidth={cardWidth}>
    <!-- (one target: the wheel is a picture, its tags chosen from the chips) -->
    <button class="unstyled open" data-id={e.id} onclick={() => onpick(e.id)} aria-label="Open {e.title}">
      <span class="mini"><PieceNode entry={e} {colours} size={wheel} labels current={e.id === current} /></span>
      <span class="title">{e.tier && e.tags.includes(TUTORIAL) ? `${e.tier} · ${e.title}` : e.title}</span>
      {#if e.description}<span class="desc">{e.description}</span>{/if}
      {#if e.id === current || e.saved}
        <span class="meta">
          {#if e.id === current}<b>Open now</b>{/if}
          {#if e.saved}<span>Saved {when(e.saved)}</span>{/if}
        </span>
      {/if}
    </button>
    {#if e.kind === 'saved'}<button class="unstyled remove" onclick={() => onremove(e.id)} aria-label="Remove {e.title} from this browser">Remove</button>{/if}
  </div>
{/snippet}

{#if saved.length}
  <section>
    <h3 class="section">Saved in this browser</h3>
    <div class="grid">
      {#each saved as e (e.id)}{@render card(e)}{/each}
    </div>
  </section>
{/if}
{#if tutorial.length}
  <section>
    <h3 class="section">Tutorial</h3>
    <div class="grid">
      {#each tutorial as e (e.id)}{@render card(e)}{/each}
    </div>
  </section>
{/if}
<section>
  {#if saved.length || tutorial.length}<h3 class="section">Examples</h3>{/if}
  {#if examples.length}
    <div class="grid">
      {#each examples as e (e.id)}{@render card(e)}{/each}
    </div>
  {:else if !tutorial.length && !midi.length}
    <p class="empty">Nothing matches. <button class="unstyled link" onclick={onreset}>Show everything</button></p>
  {/if}
</section>
{#if midi.length}
  <section>
    <h3 class="section">MIDI files</h3>
    <div class="grid">
      {#each midi as e (e.id)}{@render card(e)}{/each}
    </div>
  </section>
{/if}

<style>
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
    align-self: flex-start;
    margin: 0 10px 10px;
    font: 600 12.5px var(--font-ui);
    color: color-mix(in oklab, var(--danger) 80%, var(--text-muted));
  }
  .empty {
    color: var(--text-muted);
  }
  .link {
    color: var(--accent);
    font-weight: 600;
  }
  @media (min-width: 900px) {
    .grid {
      grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
    }
  }
</style>
