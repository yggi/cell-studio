<script lang="ts">
  /**
   * A cell's free() values, in the graph: a pill each — its name and its value now (bpm: 90). The
   * controls live in the sidebar and the cell's details; a pill opens the details.
   */
  import type { FreeSpec } from '../engine/ast';
  import { getGraphContext } from './context';
  import { freeKey, freeValue } from './free';

  let { frees, name }: { frees: readonly FreeSpec[]; name: string } = $props();
  const ctx = getGraphContext();
</script>

<div class="pills nodrag nopan" role="group" aria-label="free values of &{name}">
  {#each frees as f, i (i)}
    <button class="pill" onclick={(e) => (e.stopPropagation(), ctx.open(name))} onpointerdown={(e) => e.stopPropagation()} title="Change it: in the sidebar, or the cell's details">
      <span class="k">{freeKey(f)}:</span> <span class="v">{freeValue(f)}</span>
    </button>
  {/each}
</div>

<style>
  .pills {
    position: absolute;
    top: calc(100% + 30px);
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 4px;
    width: max-content;
    max-width: 220px;
  }
  .pill {
    all: unset;
    cursor: pointer;
    padding: 2px 8px;
    border-radius: 999px;
    background: var(--surface);
    border: 1px solid var(--line);
    font: 600 11px var(--font-code);
    color: var(--text);
    white-space: nowrap;
  }
  .pill .k {
    color: var(--text-muted);
  }
  .pill:focus-visible {
    outline: 2px solid var(--accent);
  }
</style>
