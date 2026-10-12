<script lang="ts">
  /** A piece's card, opened from the library's graph: its wheel, its words, its length, its tags; open it from here. */
  import PieceNode from '../PieceNode.svelte';
  import { durationText } from '../../engine/duration';
  import { tagName } from '../../engine/tags';
  import { trap } from '../kit/attach';
  import type { Entry } from '../entries';

  let {
    entry: d,
    colours,
    current,
    tag,
    onclose,
    onpick,
    onremove,
    onpicktag,
  }: {
    entry: Entry;
    colours: ReadonlyMap<string, string>;
    /** The card of the piece open now. */
    current: string | null;
    /** The tag lit in the graph. */
    tag: string | null;
    onclose: () => void;
    onpick: (id: string) => void;
    onremove: (id: string) => void;
    /** A tag chosen from the card: lit in the graph. */
    onpicktag: (t: string) => void;
  } = $props();

  const timeSentence = (e: Entry) =>
    !e.time
      ? ''
      : e.time.ends !== null
        ? `Plays ${durationText(e.time.ends)}, then ends.`
        : e.time.cycle !== null
          ? `Loops: every layer is back together after ${durationText(e.time.cycle)}${e.time.chance ? ' — and with chance, no two times round are the same' : ''}.`
          : '';
  const when = (iso?: string) => (iso ? new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) : '');
</script>

<div class="scrim" onclick={onclose} role="presentation"></div>
<div class="bottom-sheet detail" role="dialog" aria-modal="true" aria-label={d.title} {@attach trap({ onescape: onclose, focus: '.primary' })}>
  <header>
    <h3>{d.title}</h3>
    <button class="unstyled close" onclick={onclose} aria-label="Close">×</button>
  </header>
  <button class="unstyled big" onclick={() => (onclose(), onpick(d.id))} aria-label="Open {d.title}"
    ><PieceNode entry={d} {colours} size={220} labels current={d.id === current} /></button
  >
  {#if d.description}<p class="full">{d.description}</p>{/if}
  {#if d.time}<p class="full time">{timeSentence(d)}{d.size ? ` ${d.size} cells.` : ''}</p>{/if}
  <p class="when">
    {#if d.id === current}<b>Open now</b>{/if}
    {#if d.saved}Saved in this browser, {when(d.saved)}{:else}An example{/if}
  </p>
  <div class="dtags">
    {#each d.tags as t (t)}
      <button class="tag" class:on={tag === t} style:--hue={colours.get(t)} onclick={() => onpicktag(t)}>{tagName(t)}</button>
    {/each}
  </div>
  <div class="actions">
    <button class="primary" onclick={() => (onclose(), onpick(d.id))}>Open</button>
    {#if d.kind === 'saved'}<button class="unstyled remove" onclick={() => (onclose(), onremove(d.id))}>Remove from this browser</button>{/if}
  </div>
</div>

<style>
  .scrim {
    position: fixed;
    inset: 0;
    z-index: 61;
    background: var(--scrim);
  }
  .detail {
    z-index: 62;
    max-height: 86svh;
    padding: 14px 16px calc(16px + env(safe-area-inset-bottom));
    animation: rise 200ms cubic-bezier(0.2, 0.8, 0.2, 1);
  }
  @keyframes rise {
    from {
      transform: translateY(16px);
      opacity: 0;
    }
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
  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }
  .detail h3 {
    margin: 0;
    font: 800 19px/1.25 var(--font-ui);
  }
  .close {
    font-size: 28px;
    line-height: 1;
    padding: 2px 8px;
    color: var(--text-muted);
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
  .remove {
    align-self: flex-start;
    margin: 0 10px 10px;
    font: 600 12.5px var(--font-ui);
    color: color-mix(in oklab, var(--danger) 80%, var(--text-muted));
  }
  button.big {
    align-self: center;
    border-radius: 50%;
  }
  button.big:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 4px;
  }
</style>
