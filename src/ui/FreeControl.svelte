<script lang="ts">
  /**
   * One free(…) value as a control: a slider, a keypad (named choices) or a text field. `row` is the
   * compact one of the controls drawer (its name, the control, its value); `large` the one of a cell's
   * sheet (the value above the slider, its range under it). What it changes, `onfree` writes.
   */
  import type { FreeSpec } from '../engine/ast';
  import Keypad from './Keypad.svelte';
  import { freeAmount, freeKey, freeLabel, freeStep, freeValue } from './free';

  let {
    f,
    onfree,
    variant,
    owner = '',
  }: {
    f: FreeSpec;
    onfree: (spec: FreeSpec, value: number | string) => void;
    variant: 'row' | 'large';
    /** The cell it's in (names a row's controls for a screen reader). */
    owner?: string;
  } = $props();
</script>

{#if variant === 'row'}
  <div class="ctl">
    <span class="k">{freeKey(f)}</span>
    {#if f.key === 'text'}
      <input class="text" type="text" value={f.text ?? ''} spellcheck="false" autocomplete="off" aria-label="{owner}: text" oninput={(e) => onfree(f, e.currentTarget.value)} />
    {:else if f.labels}
      <Keypad labels={f.labels} value={f.value} lo={f.lo} hi={f.hi} onpick={(v) => onfree(f, v)} />
    {:else}
      <input type="range" min={f.lo} max={f.hi} step={freeStep(f)} value={f.value} aria-label="{owner}: {freeKey(f)}" oninput={(e) => onfree(f, +e.currentTarget.value)} />
      <output>{freeValue(f)}</output>
    {/if}
  </div>
{:else if f.key === 'text'}
  <label class="keys"><span class="what">text</span><input class="textfree" type="text" value={f.text ?? ''} spellcheck="false" autocomplete="off" oninput={(e) => onfree(f, e.currentTarget.value)} /></label>
{:else if f.labels}
  <div class="keys"><span class="what">{freeLabel(f)}</span><Keypad labels={f.labels} value={f.value} lo={f.lo} hi={f.hi} size="large" onpick={(v) => onfree(f, v)} /></div>
{:else}
  <label class="slider">
    <span class="what">{freeLabel(f)}</span>
    <output>{freeAmount(f)}</output>
    <input type="range" min={f.lo} max={f.hi} step={freeStep(f)} value={f.value} oninput={(e) => onfree(f, +e.currentTarget.value)} />
    <span class="range">{freeAmount(f, f.lo)}</span><span class="range end">{freeAmount(f, f.hi)}</span>
  </label>
{/if}

<style>
  /* ---- row: the controls drawer */
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
  .ctl input[type='range'] {
    width: 100%;
    accent-color: var(--accent);
  }
  .ctl output {
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

  /* ---- large: a cell's sheet */
  .slider {
    display: grid;
    grid-template-columns: 1fr auto;
    align-items: baseline;
    gap: 2px 8px;
  }
  .slider .what {
    font: 600 14px var(--font-ui);
  }
  .slider output {
    font: 700 15px var(--font-code);
    color: var(--accent);
    font-variant-numeric: tabular-nums;
  }
  .slider input {
    grid-column: 1 / -1;
    width: 100%;
    accent-color: var(--accent);
    min-height: 28px;
    padding: 0;
    border: 0;
    background: none;
  }
  .slider .range {
    font: 12px var(--font-code);
    color: var(--text-faint);
  }
  .slider .end {
    text-align: right;
  }
  .keys {
    display: grid;
    gap: 6px;
  }
  .keys .what {
    font: 600 13px var(--font-ui);
    color: var(--text-muted);
  }
  .textfree {
    font: 700 20px var(--font-code);
    letter-spacing: 0.08em;
    padding: 10px 12px;
    border-radius: 10px;
    border: 1px solid var(--line);
    background: var(--code-bg);
    color: var(--text);
  }
</style>
