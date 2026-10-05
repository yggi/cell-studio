<script lang="ts">
  /**
   * The piece's controls: every free() in it, grouped by the cell it's in (in the order of the code) —
   * a slider, a keypad, a text field. What they change plays, until kept (Save) or let go (Revert).
   */
  import type { CompileResult } from '../engine/compile';
  import type { FreeSpec } from '../engine/ast';
  import Keypad from './Keypad.svelte';

  let { program, onfree }: { program: CompileResult; onfree: (spec: FreeSpec, v: number | string) => void } = $props();
  const groups = $derived(
    [...program.cells.values()]
      .filter((c) => c.frees.length)
      .sort((a, b) => a.frees[0].span.line - b.frees[0].span.line)
      .map((c) => ({ name: c.name, frees: c.frees })),
  );
  const key = (f: FreeSpec) =>
    f.key === 'param' ? (f.param ?? 'value') : f.key === 'choice' ? 'choice' : f.key === 'text' ? 'text' : f.key === 'step' || f.key === 'loop' ? (f.unit === 'bpm' ? 'bpm' : f.key) : f.key === 'interval' ? 'ratio' : f.key === 'gain' ? 'level' : f.key;
  const step = (f: FreeSpec) => (f.key === 'shift' || f.key === 'stride' ? 1 : f.hi - f.lo >= 20 ? 1 : (f.hi - f.lo) / 100);
  const show = (f: FreeSpec) => `${+f.value.toFixed(f.hi - f.lo >= 20 ? 0 : 2)}${f.unit === 'bpm' ? '' : f.unit}`;
</script>

<div class="panel">
  {#if !groups.length}
    <p class="none">Nothing in this piece is left free. Write free(…) for a value to play with it here.</p>
  {/if}
  {#each groups as g (g.name)}
    <section>
      <h3>&{g.name}</h3>
      {#each g.frees as f, i (i)}
        <div class="ctl">
          <span class="k">{key(f)}</span>
          {#if f.key === 'text'}
            <input class="text" type="text" value={f.text ?? ''} spellcheck="false" autocomplete="off" aria-label="{g.name}: text" oninput={(e) => onfree(f, e.currentTarget.value)} />
          {:else if f.labels}
            <Keypad labels={f.labels} value={f.value} lo={f.lo} hi={f.hi} onpick={(v) => onfree(f, v)} />
          {:else}
            <input type="range" min={f.lo} max={f.hi} step={step(f)} value={f.value} aria-label="{g.name}: {key(f)}" oninput={(e) => onfree(f, +e.currentTarget.value)} />
            <output>{show(f)}</output>
          {/if}
        </div>
      {/each}
    </section>
  {/each}
</div>

<style>
  .panel {
    display: grid;
    gap: 14px;
  }
  .none {
    margin: 0;
    color: var(--text-muted);
    font: 500 14px var(--font-ui);
  }
  h3 {
    margin: 0 0 6px;
    font: 700 14px var(--font-code);
    color: var(--accent);
  }
  .ctl {
    display: grid;
    grid-template-columns: 4.5em minmax(0, 1fr) auto;
    align-items: center;
    gap: 8px;
    margin: 4px 0;
  }
  .ctl :global(.pad) {
    grid-column: 2 / 4;
  }
  .k {
    font: 600 12px var(--font-code);
    color: var(--text-muted);
  }
  input[type='range'] {
    width: 100%;
    accent-color: var(--accent);
  }
  output {
    font: 700 12px var(--font-code);
    font-variant-numeric: tabular-nums;
    min-width: 3em;
    text-align: right;
  }
  .text {
    grid-column: 2 / 4;
    font: 700 15px var(--font-code);
    padding: 6px 8px;
    border-radius: 8px;
    border: 1px solid var(--line);
    background: var(--code-bg);
    color: var(--text);
  }
</style>
