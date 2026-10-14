<script lang="ts">
  /** A piece's card, opened from the library's graph: its wheel, its words, its length, its tags; open it from here. */
  import PieceNode from '../PieceNode.svelte';
  import { durationText } from '@yggi/cells/engine/duration';
  import { tagName } from '@yggi/cells/engine/tags';
  import Sheet from '../kit/Sheet.svelte';
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

<Sheet label={d.title} {onclose} layer={61} focus=".primary" class="detail">
  {#snippet header()}<h3>{d.title}</h3>{/snippet}
  <button class="unstyled big" onclick={() => (onclose(), onpick(d.id))} aria-label="Open {d.title}"
    ><PieceNode entry={d} {colours} size={220} labels current={d.id === current} /></button
  >
  {#if d.description}<p class="full">{d.description}</p>{/if}
  {#if d.time}<p class="full time">{timeSentence(d)}{d.size ? ` ${d.size} cells.` : ''}</p>{/if}
  {#if d.credit}
    <!-- a file of the MIDI library: what it is, who typeset it, its licence, where it came from (midi/<set>/README.md) -->
    <dl class="credit">
      <dt>Piece</dt>
      <dd>{d.credit.piece}</dd>
      <dt>Typeset by</dt>
      <dd>{d.credit.by}, for the Mutopia Project</dd>
      <dt>Licence</dt>
      <dd>
        {#if d.credit.licenceUrl}<a href={d.credit.licenceUrl} target="_blank" rel="noopener noreferrer">{d.credit.licence}</a>{:else}{d.credit.licence}{/if}
      </dd>
      <dt>Source</dt>
      <dd><a href={d.credit.source} target="_blank" rel="noopener noreferrer">{d.credit.id}</a></dd>
    </dl>
  {/if}
  <p class="when">
    {#if d.id === current}<b>Open now</b>{/if}
    {#if d.saved}Saved in this browser, {when(d.saved)}{:else if d.kind === 'midi'}A MIDI file{:else}An example{/if}
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
</Sheet>

<style>
  /* the card's own look over kit/Sheet's: its padding, height and rise, no shadow; on a wide screen, a card at the
     bottom right */
  :global(.bottom-sheet.sheet.detail) {
    max-height: 86svh;
    padding: 14px 16px calc(16px + env(safe-area-inset-bottom));
    box-shadow: none;
    animation: rise 200ms cubic-bezier(0.2, 0.8, 0.2, 1);
  }
  @keyframes rise {
    from {
      transform: translateY(16px);
      opacity: 0;
    }
  }
  @media (min-width: 900px) {
    :global(.bottom-sheet.sheet.detail) {
      left: auto;
      right: 24px;
      bottom: 24px;
      width: 380px;
      border-radius: 14px;
      border: 1px solid var(--line);
    }
  }
  :global(.sheet.detail > header) {
    gap: 12px;
  }
  :global(.sheet.detail > header .close) {
    font-size: 28px;
  }
  h3 {
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
  .credit {
    margin: 0;
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 2px 10px;
    font-size: 13px;
    line-height: 1.45;
  }
  .credit dt {
    color: var(--text-muted);
  }
  .credit dd {
    margin: 0;
    color: var(--text);
    overflow-wrap: anywhere;
  }
  .credit a {
    color: var(--accent);
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
