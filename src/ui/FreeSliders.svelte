<script lang="ts">
  /**
   * The numbers a cell leaves free (free(…)), as sliders under its node.
   * Moving one rewrites its free(…) in the code.
   */
  import type { FreeSpec } from '../engine/ast';
  import { getGraphContext } from './context';
  import Keypad from './Keypad.svelte';

  let { frees }: { frees: readonly FreeSpec[] } = $props();
  const ctx = getGraphContext();
  const step = (f: FreeSpec) => (f.key === 'shift' || f.key === 'stride' ? 1 : f.hi - f.lo >= 20 ? 1 : (f.hi - f.lo) / 100);
  // (a scan interval is a ratio between beats: 1 straight, 2 the triplet swing)
  const label = (f: FreeSpec) =>
    f.key === 'param' ? (f.param ?? 'value') : f.key === 'choice' ? 'choose' : f.key === 'step' || f.key === 'loop' ? (f.unit === 'bpm' ? 'tempo' : f.key) : f.key === 'interval' ? 'ratio' : f.key;
  const show = (f: FreeSpec) => `${+f.value.toFixed(f.hi - f.lo >= 20 ? 0 : 2)}${f.unit}`;
</script>

<div class="frees nodrag nopan" role="group" aria-label="free values">
  {#each frees as f, i (i)}
    {#if f.key === 'text'}
      <!-- a text left free: type in it (spell(…) dials it) -->
      <input class="text" type="text" value={f.text ?? ''} spellcheck="false" autocomplete="off" aria-label="text" oninput={(e) => ctx.setFree(f, e.currentTarget.value)} onpointerdown={(e) => e.stopPropagation()} onclick={(e) => e.stopPropagation()} />
    {:else if f.labels}
      <Keypad labels={f.labels} value={f.value} lo={f.lo} hi={f.hi} onpick={(v) => ctx.setFree(f, v)} />
    {:else}
    <label title="free({show(f)}, {f.lo}..{f.hi})">
      <span>{label(f)}</span>
      <input
        type="range"
        min={f.lo}
        max={f.hi}
        step={step(f)}
        value={f.value}
        oninput={(e) => ctx.setFree(f, +e.currentTarget.value)}
        onpointerdown={(e) => e.stopPropagation()}
      />
      <output>{show(f)}</output>
    </label>
    {/if}
  {/each}
</div>

<style>
  .frees {
    position: absolute;
    top: calc(100% + 32px);
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 4px 8px;
    border-radius: 8px;
    background: var(--surface);
    border: 1px solid var(--line);
    cursor: default;
  }
  label {
    display: grid;
    grid-template-columns: 3.4em 7em 3.6em;
    align-items: center;
    gap: 6px;
    font: 600 11px var(--font-ui);
    color: var(--text-muted);
  }
  input {
    width: 100%;
    accent-color: var(--accent);
  }
  output {
    font: 600 11px var(--font-code);
    color: var(--text);
    text-align: right;
  }
  input.text {
    font: 700 14px var(--font-code);
    letter-spacing: 0.06em;
    padding: 6px 8px;
    border-radius: 6px;
    border: 1px solid var(--line);
    background: var(--code-bg);
    color: var(--text);
    min-width: 12em;
  }
</style>
