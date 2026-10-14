<script lang="ts">
  /**
   * One free(…) value as a control: a slider, a keypad (named choices) or a text field. `row` is the
   * compact one of the controls drawer (its name, the control, its value); `large` the one of a cell's
   * sheet (the value above the slider, its range under it). What it changes, `onfree` writes. With MIDI connected it
   * can learn a knob (LearnButton); a knob not yet at the value shows on the slider as the gap between them. A braid left
   * free (free(0 2 4 ~)) shows its steps, a take's while one is held, with Keep and Revert for it.
   */
  import type { FreeSpec } from '@yggi/cells/engine/ast';
  import Keypad from './Keypad.svelte';
  import LearnButton from './LearnButton.svelte';
  import { getStudio } from './state/studio.svelte';
  import { freeIndex } from '@yggi/cells/engine/held';
  import { freeAmount, freeAt, freeKey, freeLabel, freePosition, freeSteps, freeValue } from './free';

  let {
    f,
    onfree,
    variant,
    owner = '',
  }: {
    f: FreeSpec;
    onfree: (spec: FreeSpec, value: number | string) => void;
    variant: 'row' | 'large';
    /** The cell it's in (names its controls for a screen reader). */
    owner?: string;
  } = $props();

  const { learn, piece, recorder } = getStudio();
  // a braid: a take held in its place (Keep writes it, Revert lets it go)
  const held = $derived(f.key === 'braid' && piece.held.has(freeIndex(piece.program, f)));
  // the slider runs over whole steps 0…n, through the control's own scale (free.ts: a knob goes the same way)
  const steps = $derived(freeSteps(f));
  const at = $derived(Math.round(freePosition(f, f.value) * steps));
  const slide = (i: number) => {
    const v = freeAt(f, i / steps);
    onfree(f, v);
    learn.moved(f, v);
  };
  const pick = (v: number) => {
    onfree(f, v);
    learn.moved(f, v);
  };
  const place = $derived(learn.connected && f.key !== 'text' && f.key !== 'braid' ? learn.placeOf(f) : '');
  const name = $derived(owner ? `${owner}: ${freeKey(f)}` : freeKey(f));
  // a knob that hasn't reached the value yet: the stretch between the two, in % of the slider
  const gap = $derived.by(() => {
    const knob = place ? learn.gaps.get(place) : undefined;
    if (knob === undefined) return null;
    const here = freePosition(f, f.value);
    return { left: Math.min(knob, here) * 100, width: Math.abs(knob - here) * 100, knob: knob * 100 };
  });
</script>

{#snippet range(label?: string)}
  <span class="track">
    <input type="range" min="0" max={steps} step="1" value={at} aria-label={label} aria-valuetext={freeValue(f)} oninput={(e) => slide(+e.currentTarget.value)} />
    {#if gap}
      <span class="lane" aria-hidden="true">
        <span class="gap" style:left="{gap.left}%" style:width="{gap.width}%"></span>
        <span class="knobmark" style:left="{gap.knob}%" title="The knob is here: move it through the value to take over"></span>
      </span>
    {/if}
  </span>
{/snippet}

{#snippet braid()}
  <div class="braidfree" class:row={variant === 'row'}>
    <span class="what">{held ? 'braid, held (not in the code yet)' : 'braid'}</span>
    <code>{f.braid}</code>
    {#if held}
      <span class="takes">
        <button class="unstyled" onclick={() => piece.revert(f)} title="Back to the braid the code says">Revert</button>
        <button class="unstyled keep" onclick={() => piece.keep(f)} title="Write it into the code">Keep</button>
      </span>
    {:else if variant === 'large'}
      <span class="hint"
        >{recorder.target?.spec.span.line === f.span.line && recorder.target?.spec.span.col === f.span.col
          ? 'Press ● (record) and play a pass on the keys: it is held here until Keep.'
          : 'Arm this cell (its sheet open, or Play with in the MIDI page), then ● records a pass from the keys.'}</span
      >
    {/if}
  </div>
{/snippet}

{#if f.key === 'braid'}
  {@render braid()}
{:else if variant === 'row'}
  <div class="ctl" class:midi={!!place}>
    <span class="k">{freeKey(f)}</span>
    {#if f.key === 'text'}
      <input class="text" type="text" value={f.text ?? ''} spellcheck="false" autocomplete="off" aria-label="{owner}: text" oninput={(e) => onfree(f, e.currentTarget.value)} />
    {:else if f.labels}
      <Keypad labels={f.labels} value={f.value} lo={f.lo} hi={f.hi} onpick={pick} />
    {:else}
      {@render range(`${owner}: ${freeKey(f)}`)}
      <output>{freeValue(f)}</output>
    {/if}
    {#if place}<LearnButton {learn} {place} {name} />{/if}
  </div>
{:else if f.key === 'text'}
  <label class="keys"
    ><span class="what">text</span><input
      class="textfree"
      type="text"
      value={f.text ?? ''}
      spellcheck="false"
      autocomplete="off"
      oninput={(e) => onfree(f, e.currentTarget.value)}
    /></label
  >
{:else if f.labels}
  <div class="keys">
    <span class="what">{freeLabel(f)}</span><Keypad labels={f.labels} value={f.value} lo={f.lo} hi={f.hi} size="large" onpick={pick} />
    {#if place}<span class="learnrow"><LearnButton {learn} {place} {name} wide /></span>{/if}
  </div>
{:else}
  <div class="slider">
    <label>
      <span class="what">{freeLabel(f)}</span>
      <output>{freeAmount(f)}</output>
      {@render range()}
    </label>
    <span class="range">{freeAmount(f, f.lo)}</span><span class="range end">{freeAmount(f, f.hi)}</span>
    {#if place}<span class="learnrow"><LearnButton {learn} {place} {name} wide /></span>{/if}
  </div>
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
  .ctl.midi {
    grid-template-columns: 4.5em minmax(0, 1fr) auto auto;
  }
  .ctl :global(.pad) {
    grid-column: 2 / 4;
  }

  /* ---- the slider, and a knob not yet at its value: the gap between them, the knob's place marked */
  .track {
    position: relative;
    display: block;
    min-width: 0;
  }
  .lane {
    position: absolute;
    inset: 0 8px;
    pointer-events: none;
  }
  .gap {
    position: absolute;
    top: 50%;
    height: 4px;
    transform: translateY(-50%);
    border-radius: 2px;
    background: repeating-linear-gradient(90deg, var(--text) 0 4px, transparent 4px 7px);
    opacity: 0.6;
  }
  .knobmark {
    position: absolute;
    top: 50%;
    width: 4px;
    height: 18px;
    transform: translate(-50%, -50%);
    border-radius: 2px;
    background: var(--text);
  }
  .learnrow {
    grid-column: 1 / -1;
    display: flex;
    justify-content: flex-end;
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

  /* ---- a braid left free: its steps, a take held, Keep and Revert */
  .braidfree {
    display: grid;
    gap: 4px;
  }
  .braidfree.row {
    grid-template-columns: auto minmax(0, 1fr) auto;
    align-items: center;
    gap: 8px;
    margin: 4px 0;
  }
  .braidfree .what {
    font: 600 13px var(--font-ui);
    color: var(--text-muted);
  }
  .braidfree code {
    font: 700 15px var(--font-code);
    color: var(--text);
    overflow-wrap: anywhere;
  }
  .braidfree.row code {
    font-size: 12px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .takes {
    display: flex;
    gap: 12px;
  }
  .takes button {
    font: 600 13px var(--font-ui);
    color: var(--text-muted);
  }
  .takes .keep {
    color: var(--accent);
  }
  .braidfree .hint {
    font: 12px var(--font-ui);
    color: var(--text-faint);
  }

  /* ---- large: a cell's sheet */
  .slider {
    display: grid;
    grid-template-columns: 1fr auto;
    align-items: baseline;
    gap: 2px 8px;
  }
  .slider label {
    display: contents;
  }
  .slider .track {
    grid-column: 1 / -1;
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
