<script lang="ts">
  /**
   * MIDI learn for one free() control (FreeControl): Learn waits for the next knob, fader or pad (Esc cancels); a bound
   * control shows its knob, and Forget lets go of it. `wide` spells it out (a cell's sheet), else it's compact (the drawer).
   */
  import { knobName } from './learn';
  import type { Learn } from './state/learn.svelte';

  let { learn, place, wide = false }: { learn: Learn; place: string; wide?: boolean } = $props();

  const knob = $derived(learn.bindings[place]);
  const waiting = $derived(learn.learning === place);
</script>

<span class="learn" class:wide>
  {#if knob}
    <span class="knob" title="Moved by {knobName(knob)}">{knobName(knob)}</span>
    <button class="unstyled forget" onclick={() => learn.forget(place)} aria-label="Forget {knobName(knob)}" title="Forget {knobName(knob)}">{wide ? 'Forget' : '×'}</button>
  {:else}
    <button
      class="unstyled ask"
      class:waiting
      aria-pressed={waiting}
      onclick={() => learn.learn(place)}
      title={waiting ? 'Move a knob or press a pad on the controller (Esc cancels)' : 'Learn: the next knob, fader or pad moved moves this'}
      >{waiting ? (wide ? 'Move a knob… (Esc cancels)' : 'Move…') : wide ? 'MIDI learn' : 'Learn'}</button
    >
  {/if}
</span>

<style>
  .learn {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    white-space: nowrap;
    font: 600 11px var(--font-ui);
  }
  .wide {
    font-size: 13px;
  }
  .knob {
    font: 700 11px var(--font-code);
    color: var(--accent);
    border: 1px solid var(--accent);
    border-radius: 6px;
    padding: 1px 5px;
  }
  .wide .knob {
    font-size: 13px;
  }
  button {
    color: var(--text-muted);
    border: 1px solid var(--line);
    border-radius: 6px;
    padding: 1px 6px;
    cursor: pointer;
  }
  .wide button {
    min-height: 32px;
    padding: 2px 10px;
    border-radius: 8px;
  }
  .waiting {
    color: var(--accent-ink);
    background: var(--accent);
    border-color: var(--accent);
  }
  button:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 1px;
  }
</style>
