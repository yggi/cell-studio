<script lang="ts">
  /**
   * Parts, a page of the sidebar while a document of fragments is open (cells decision 082, #623): each part it gives,
   * with its signature, a picture of what it plays, ▶ to hear it alone in the document's own key (`Studio.openPart`:
   * opened as a fragment, ◂ back to the document), and the line another piece takes it with.
   */
  import { getStudio } from './state/studio.svelte';
  import { notesOf } from '../compile';
  import { fromLabel } from '../layout/uses';

  const studio = getStudio();
  const { piece, library } = studio;
  // (the id a piece takes the document by: an example's key; a file of your own has none to take it by yet)
  const id = $derived(library.open.kind === 'example' ? library.open.key : null);
  const W = 280;
  const H = 44;
  /** A part's notes as a small roll: time across (its first 8 s), pitch up, each note a bar. */
  const roll = (heard: string) => {
    const notes = notesOf(heard);
    if (!notes.length) return [];
    const end = Math.max(...notes.map((n) => n.at + n.dur));
    const pitch = notes.map((n) => 12 * Math.log2(n.freq / 440));
    const [lo, hi] = [Math.min(...pitch), Math.max(...pitch)];
    const step = (H - 6) / Math.max(1, hi - lo);
    return notes.map((n, i) => ({ x: (n.at / end) * W, w: Math.max(2, (n.dur / end) * W - 1), y: H - 5 - (pitch[i]! - lo) * step }));
  };
</script>

<div class="parts">
  <p class="lead">The parts this file gives: each a fragment another piece takes by its head, heard here alone in the file's own key.</p>
  {#each piece.parts as p (p.heads[0])}
    <section aria-label="&{p.heads[0]}">
      <div class="head">
        <b>&{p.heads.join(', &')}</b>
        <code class="sig">{p.signature}</code>
      </div>
      <svg width={W} height={H} viewBox="0 0 {W} {H}" class="roll" aria-hidden="true">
        {#each roll(p.heard) as n, i (i)}<rect x={n.x} y={n.y} width={n.w} height="4" rx="2" />{/each}
      </svg>
      <div class="foot">
        <button class="unstyled play" onclick={() => studio.openPart(p.heads[0]!)} title="Hear &{p.heads[0]} alone{p.main ? `, over the file's own ${p.main}` : ''}"
          >▶ hear it</button
        >
        {#if id}<code class="take" title="The line another piece takes it with">&{p.heads[0]} {fromLabel(id)}{p.main ? ` ${p.main}` : ''}</code>{/if}
      </div>
    </section>
  {/each}
</div>

<style>
  .parts {
    display: grid;
    gap: 10px;
    font-family: var(--font-ui);
  }
  .lead {
    margin: 0;
    font-size: 13px;
    color: var(--text-muted);
  }
  section {
    display: grid;
    gap: 6px;
    padding: 10px 12px;
    border: 1px solid var(--line);
    border-radius: var(--radius);
    background: var(--code-bg);
  }
  .head,
  .foot {
    display: flex;
    align-items: baseline;
    gap: 10px;
    flex-wrap: wrap;
    font-size: 13px;
  }
  code {
    font-family: var(--font-code);
    font-size: 12px;
    color: var(--text-muted);
  }
  .roll {
    max-width: 100%;
    height: auto;
  }
  .roll rect {
    fill: var(--accent);
  }
  .play {
    font-weight: 600;
    color: var(--accent);
  }
  .play:hover,
  .play:focus-visible {
    color: var(--text);
  }
</style>
