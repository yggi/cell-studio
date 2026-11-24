<script lang="ts">
  /**
   * A card of the library, opened from its wheel or its fragment map: a piece's or a fragment's, one sheet for both (#625).
   * Its face (a piece's wheel; a fragment's picture by its facet, `FragmentFace`), its words, its length, its tags (a
   * fragment's facets), what it takes and what takes it (each a card of its own), a fragment's text; open it, or play it
   * from here.
   */
  import PieceNode from '../PieceNode.svelte';
  import FragmentFace from '../FragmentFace.svelte';
  import { durationText } from '@yggi/cells/inspect';
  import { tagName } from '@yggi/cells/library';
  import Sheet from '../kit/Sheet.svelte';
  import type { Entry } from '../entries';
  import { auditionOf, compilePiece, heardOf } from '../../compile';
  import { exampleTakes, FACETS, fragmentCard, takenIn, takersOf } from '../../references';
  import { facetColour } from '../theme';

  let {
    entry: d,
    colours,
    current,
    tag,
    onclose,
    onpick,
    onplay,
    onremove,
    onpicktag,
    onentry,
    lookup = () => undefined,
  }: {
    entry: Entry;
    colours: ReadonlyMap<string, string>;
    /** The card of the piece open now. */
    current: string | null;
    /** The tag lit in the graph (a facet on the map). */
    tag: string | null;
    onclose: () => void;
    onpick: (id: string) => void;
    /** Open it and play it. */
    onplay?: (id: string) => void;
    onremove: (id: string) => void;
    /** A tag chosen from the card: lit in the graph (a facet: the map's filter). */
    onpicktag: (t: string) => void;
    /** Another card, by its id, opened from this one (what it takes, what takes it). */
    onentry?: (id: string) => void;
    /** The library's card by its id, where it has one (a link to one it hasn't is plain text). */
    lookup?: (id: string) => Entry | undefined;
  } = $props();

  const f = $derived(d.fragment ?? null);
  // (a fragment heard alone, as its face pictures it: compiled once the card opens)
  const heard = $derived(f ? heardOf(compilePiece(auditionOf(f.text).text)) : null);
  const card = $derived(f ? fragmentCard(f.id, [f]) : null);
  // what it takes (fragments), and what takes it (pieces, fragments)
  const takes = $derived(f ? f.takes : d.kind === 'example' ? exampleTakes(d.id.slice('example:'.length)) : d.source ? takenIn(d.source) : []);
  const takers = $derived(f ? takersOf(f.id) : null);
  const hue = (t: string) => (f ? facetColour(t, FACETS) : colours.get(t));
  const linked = (id: string) => !!onentry && !!lookup(id);
  const pieceTitle = (key: string) => lookup(`example:${key}`)?.title ?? key;

  const timeSentence = (e: Entry) =>
    !e.time
      ? ''
      : e.time.ends !== null
        ? `Plays ${durationText(e.time.ends)}, then ends.`
        : e.time.cycle !== null
          ? `Loops: every layer is back together after ${durationText(e.time.cycle)}${e.time.chance ? ' — and with chance, no two times round are the same' : ''}.`
          : '';
  const when = (iso?: string) => (iso ? new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) : '');
  const open = () => (onclose(), onpick(d.id));
</script>

<Sheet label={d.title} {onclose} layer={61} focus=".primary" class="detail" portal>
  {#snippet header()}<h3 class:code={!!f}>{d.title}</h3>{/snippet}
  {#if f && heard}
    <button class="unstyled face" onclick={open} aria-label="Open {d.title}"><FragmentFace label={d.title} facets={f.facets} text={f.text} {heard} /></button>
    {#if card?.signature}<code class="signature">{card.signature}</code>{/if}
  {:else}
    <button class="unstyled big" onclick={open} aria-label="Open {d.title}"><PieceNode entry={d} {colours} size={220} labels current={d.id === current} /></button>
  {/if}
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
  {#if takes.length || takers?.pieces.length || takers?.fragments.length}
    <!-- what it takes, and what takes it: each a card of its own -->
    <dl class="related">
      {#if takes.length}
        <dt>Takes</dt>
        <dd>
          {#each takes as id (id)}
            {#if linked(`fragment:${id}`)}<button class="unstyled link" onclick={() => onentry!(`fragment:${id}`)}>{id}</button>{:else}<span>{id}</span>{/if}
          {/each}
        </dd>
      {/if}
      {#if takers?.pieces.length}
        <dt>In pieces</dt>
        <dd>
          {#each takers.pieces as key (key)}
            {#if linked(`example:${key}`)}<button class="unstyled link" onclick={() => onentry!(`example:${key}`)}>{pieceTitle(key)}</button>{:else}<span>{pieceTitle(key)}</span
              >{/if}
          {/each}
        </dd>
      {/if}
      {#if takers?.fragments.length}
        <dt>In fragments</dt>
        <dd>
          {#each takers.fragments as id (id)}
            {#if linked(`fragment:${id}`)}<button class="unstyled link" onclick={() => onentry!(`fragment:${id}`)}>{id}</button>{:else}<span>{id}</span>{/if}
          {/each}
        </dd>
      {/if}
    </dl>
  {/if}
  {#if f}
    <details class="text">
      <summary>Its text</summary>
      <pre>{f.text}</pre>
    </details>
  {/if}
  <p class="when">
    {#if d.id === current}<b>Open now</b>{/if}
    {#if d.saved}Saved in this browser, {when(d.saved)}{:else if d.kind === 'midi'}A MIDI file{:else if f?.part}A part of {pieceTitle(
        f.part.document,
      )}{:else if f && f.path === null}Yours: filed in this browser{:else if f}A fragment of the seed library{:else}An example{/if}
  </p>
  <div class="dtags">
    {#each d.tags as t (t)}
      <button class="tag" class:on={tag === t} style:--hue={hue(t)} onclick={() => onpicktag(t)}>{tagName(t)}</button>
    {/each}
  </div>
  <div class="actions">
    <button class="primary" onclick={open}>Open</button>
    {#if onplay}<button class="unstyled play" onclick={() => (onclose(), onplay(d.id))}>▶ Play</button>{/if}
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
    overflow-wrap: anywhere;
  }
  h3.code {
    font-family: var(--font-code);
    font-size: 17px;
  }
  .face {
    display: block;
    box-sizing: border-box;
    width: 100%;
    padding: 10px 12px;
    border: 1px solid var(--line);
    border-radius: var(--radius);
    background: var(--code-bg);
    text-align: left;
  }
  .face:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }
  .signature {
    font: 13px var(--font-code);
    color: var(--text-muted);
    overflow-wrap: anywhere;
  }
  .related {
    margin: 0;
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 4px 10px;
    font-size: 13px;
    line-height: 1.45;
  }
  .related dt {
    color: var(--text-muted);
  }
  .related dd {
    margin: 0;
    display: flex;
    flex-wrap: wrap;
    gap: 2px 10px;
    min-width: 0;
  }
  .related .link {
    color: var(--accent);
    font: inherit;
    text-align: left;
    overflow-wrap: anywhere;
  }
  .related .link:hover,
  .related .link:focus-visible {
    text-decoration: underline;
  }
  .text summary {
    cursor: pointer;
    color: var(--text-muted);
    font-size: 13px;
  }
  .text pre {
    margin: 6px 0 0;
    padding: 8px 10px;
    max-height: 30svh;
    overflow: auto;
    border-radius: var(--radius-sm);
    background: var(--code-bg);
    font: 12.5px/1.45 var(--font-code);
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }
  .play {
    font: 700 15px var(--font-ui);
    color: var(--accent);
    padding: 8px 4px;
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
