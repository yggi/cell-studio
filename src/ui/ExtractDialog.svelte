<script lang="ts">
  /**
   * A selection turned into a fragment (#626, rung S5 of #621): cells' proposal for the lines selected (`extract`, C4),
   * shown to be checked before it is filed:
   * - an id (offered as `my_` and its first head), and a facet (prefilled: `facetFor`);
   * - the signature, each name with why it is there: the heads the rest of the piece reads, the main parameter it is
   *   passed, the cells the copy keeps to itself, the sounds it reads by name;
   * - the fragment's text, and two checks: the piece plays the same, and whether the library holds it already;
   * - ▶ to hear it alone, and "File as mine": filed into the person's own layer (`mine`), the piece then taking it by its
   *   `from` line.
   */
  import { untrack } from 'svelte';
  import { extract } from '@yggi/cells';
  import { getStudio } from './state/studio.svelte';
  import { mine } from '../mine.svelte';
  import { facetFor, idFor } from '../extraction';
  import { styleOfPiece } from '../compile';
  import { pointOf } from './complete';
  import { FACETS } from '../references';

  let { lines, onclose }: { lines: readonly number[]; onclose: () => void } = $props();

  const studio = getStudio();
  const { piece } = studio;
  const code = piece.code;
  const taken = new Set(mine.entries.map((e) => e.id));
  // (offered once: the first proposal's heads give the id)
  const first = untrack(() => extract(code, lines, { id: 'my_fragment', resolve: mine.resolve }));
  let id = $state('heads' in first ? idFor(first.heads, taken) : 'my_fragment');
  const proposal = $derived(extract(code, lines, { id: id.trim() || 'my_fragment', resolve: mine.resolve }));
  let facet = $state<string>('heads' in first ? (facetFor(first.fragment, mine.entries) ?? '') : '');
  const clash = $derived(taken.has(id.trim()));
  let filing = $state(false);
  let problem = $state<string | null>(null);

  let dialog = $state<HTMLDialogElement>();
  $effect(() => {
    if (dialog && !dialog.open) dialog.showModal();
  });

  async function file() {
    if (!('piece' in proposal) || clash || !id.trim()) return;
    filing = true;
    problem = null;
    try {
      const style = styleOfPiece(code);
      const held = await mine.file({
        text: proposal.fragment,
        point: pointOf(style ?? []),
        ...(facet ? { facet } : {}),
        source: 'me',
        created: new Date().toISOString(),
        id: id.trim(),
      });
      // (the library held its text already: the piece takes that one)
      const taking = held === id.trim() ? proposal : extract(code, lines, { id: held, resolve: mine.resolve });
      if ('piece' in taking) piece.code = taking.piece;
      onclose();
    } catch (e) {
      problem = e instanceof Error ? e.message : String(e);
    } finally {
      filing = false;
    }
  }
  const hear = () => {
    if (!('piece' in proposal)) return;
    onclose();
    studio.openFragment(id.trim() || 'my_fragment', proposal.fragment);
    void studio.playback.toggle();
  };
</script>

<dialog class="extract" aria-label="Turn into a fragment" bind:this={dialog} {onclose}>
  <header>
    <h3>Turn into a fragment</h3>
    <button class="unstyled x" onclick={onclose} aria-label="Close">×</button>
  </header>
  {#if 'why' in proposal}
    <p class="why">Lines {lines.join(', ')} are no fragment yet: {proposal.why}.</p>
  {:else}
    <label class="row">id <input bind:value={id} spellcheck="false" aria-invalid={clash} /></label>
    {#if clash}<p class="why">The library holds a fragment by this id: choose another.</p>{/if}
    <label class="row"
      >facet
      <select bind:value={facet}>
        <option value="">none</option>
        {#each FACETS as f (f)}<option value={f}>{f}</option>{/each}
      </select></label
    >
    <dl class="signature">
      {#each proposal.heads as h (h)}<div>
          <dt>head</dt>
          <dd><code>{h}</code> <span class="faint">the rest of the piece reads it</span></dd>
        </div>{/each}
      {#if proposal.main}<div>
          <dt>main</dt>
          <dd><code>{proposal.main}</code> <span class="faint">read and not defined here: the piece passes it</span></dd>
        </div>{/if}
      {#each proposal.private as p (p)}<div>
          <dt>private</dt>
          <dd><code>{p}</code> <span class="faint">read only inside: the copy's own</span></dd>
        </div>{/each}
      {#each proposal.sounds as s (s)}<div>
          <dt>sound</dt>
          <dd><code>{s}</code> <span class="faint">struck by name, left free</span></dd>
        </div>{/each}
    </dl>
    <pre class="text">{proposal.fragment}</pre>
    <p class="line">The piece takes it: <code>{proposal.line}</code></p>
    <ul class="checks">
      <li class:ok={proposal.same}>{proposal.same ? '✓ The piece plays the same.' : '✗ The piece would not play the same.'}</li>
      <li class:ok={!proposal.known}>{proposal.known ? `The library holds it already, as ${proposal.known}.` : '✓ No fragment of the library reads the same.'}</li>
    </ul>
    {#if problem}<p class="why">{problem}</p>{/if}
    <footer>
      <button onclick={hear}>▶ Hear it alone</button>
      <button class="primary" disabled={filing || clash || !id.trim() || !proposal.same} onclick={file}>File as mine</button>
    </footer>
  {/if}
</dialog>

<style>
  .extract {
    width: min(520px, calc(100vw - 32px));
    max-height: calc(100vh - 64px);
    padding: 16px 18px;
    border: 1px solid var(--line);
    border-radius: var(--radius);
    background: var(--surface);
    color: var(--text);
    font: 14px var(--font-ui);
  }
  .extract::backdrop {
    background: rgb(0 0 0 / 0.5);
  }
  header,
  footer,
  .row {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  header {
    justify-content: space-between;
  }
  h3 {
    margin: 0;
    font-size: 16px;
  }
  .x {
    font-size: 20px;
    color: var(--text-muted);
  }
  .row {
    margin: 10px 0 0;
    color: var(--text-muted);
  }
  input,
  select {
    flex: 1;
    font: 14px var(--font-code);
    color: var(--text);
    background: var(--code-bg);
    border: 1px solid var(--line);
    border-radius: var(--radius-sm);
    padding: 4px 8px;
  }
  input[aria-invalid='true'] {
    border-color: var(--danger);
  }
  .signature {
    margin: 12px 0 0;
    display: grid;
    gap: 4px;
  }
  .signature div {
    display: grid;
    grid-template-columns: 4.5em 1fr;
  }
  dt {
    color: var(--text-muted);
    font-size: 12px;
    text-transform: uppercase;
  }
  dd {
    margin: 0;
  }
  code,
  .text {
    font-family: var(--font-code);
    font-size: 13px;
  }
  .text {
    margin: 12px 0 0;
    padding: 8px 10px;
    border-radius: var(--radius-sm);
    background: var(--code-bg);
    white-space: pre-wrap;
  }
  .line {
    margin: 8px 0 0;
    color: var(--text-muted);
  }
  .checks {
    margin: 10px 0 0;
    padding: 0;
    list-style: none;
    color: var(--warning);
  }
  .checks .ok {
    color: var(--text-muted);
  }
  .faint {
    color: var(--text-muted);
    font-size: 12px;
  }
  .why {
    margin: 10px 0 0;
    color: var(--warning);
  }
  footer {
    justify-content: flex-end;
    margin-top: 14px;
  }
</style>
