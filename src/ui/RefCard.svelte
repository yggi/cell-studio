<script lang="ts">
  /**
   * What hovering a reference in the code shows (#624): a fragment's card (its facet, signature, first line of prose, what
   * it takes, how many pieces take it, ▶ to hear it alone), or a given name's chain (the fragment that defines it, each
   * line that took it on, out to the piece's own).
   */
  import { facetColour } from './theme';
  import { FACETS, type ChainStep, type FragmentCard } from '../references';

  let {
    card = null,
    id,
    onplay,
    name,
    steps,
  }: {
    card?: FragmentCard | null;
    id?: string;
    onplay?: (id: string) => void;
    name?: string;
    steps?: readonly ChainStep[];
  } = $props();
</script>

<div class="card">
  {#if steps && name}
    <p class="title"><span><code>&{name}</code>, given</span></p>
    <ol class="chain">
      {#each steps as s, i (i)}
        <li>
          {#if i}<span class="faint">through</span>{/if}
          {#if s.id}<code>{s.id}</code>{:else}this piece{/if} <span class="faint">line {s.line}</span>
        </li>
      {/each}
    </ol>
  {:else if card}
    <p class="title">
      <code>{card.id}</code>
      {#each card.facets as f (f)}<span class="chip" style:--c={facetColour(f, FACETS)}>{f}</span>{/each}
    </p>
    {#if card.signature}<p><code class="sig">{card.signature}</code></p>{/if}
    {#if card.prose}<p class="prose">{card.prose}</p>{/if}
    <p class="faint">
      {[card.takes.length ? `takes ${card.takes.join(', ')}` : null, `taken by ${card.takenBy} ${card.takenBy === 1 ? 'piece or fragment' : 'pieces and fragments'}`]
        .filter(Boolean)
        .join(' · ')}
    </p>
    {#if onplay}<button class="unstyled play" onclick={() => onplay(card!.id)}>▶ hear it alone</button>{/if}
  {:else if id}
    <p class="title"><code>{id}</code></p>
    <p class="faint">The seed library holds no fragment by this id.</p>
  {/if}
</div>

<style>
  .card {
    display: grid;
    gap: 4px;
    padding: 8px 12px;
    border: 1px solid var(--line);
    border-radius: var(--radius);
    background: var(--surface);
    box-shadow: 0 6px 20px rgb(0 0 0 / 0.35);
    font: 13px/1.4 var(--font-ui);
    color: var(--text);
  }
  p,
  ol {
    margin: 0;
  }
  .title {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
    font-weight: 600;
  }
  code {
    font-family: var(--font-code);
    font-size: 12px;
  }
  .chip {
    padding: 0 6px;
    border-radius: var(--radius-pill);
    border: 1px solid var(--c);
    color: var(--c);
    font-size: 11px;
    font-weight: 600;
  }
  .sig {
    color: var(--text-muted);
  }
  .prose {
    display: -webkit-box;
    -webkit-line-clamp: 3;
    line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .faint {
    color: var(--text-muted);
  }
  .chain {
    padding-left: 1.2em;
  }
  .play {
    justify-self: start;
    font-weight: 600;
    color: var(--accent);
  }
  .play:hover,
  .play:focus-visible {
    color: var(--text);
  }
</style>
