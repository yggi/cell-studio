<script lang="ts">
  /**
   * The on-screen piano keyboard (#255), adapted from yggi/jambot apps/web/src/components/Keyboard.svelte @ 8cdb6b8:
   * keys `low` to `high` laid out by `keyboardLayout` (`@yggi/webmidi/core`), each a button named by its note (C4). A finger holds a key
   * until it lifts (`fingers.ts`: a finger each, so chords on a phone); velocity from where the key is struck (lower
   * is louder) or fixed. A key lights in its pitch's colour (the palette, #34) while held, from here or anywhere
   * (`held`: MIDI in, the computer keys); a dot marks a key the armed melody's scale can play.
   */
  import { onDestroy } from 'svelte';
  import { keyboardLayout, keyName, velocityAt } from '@yggi/webmidi/core';
  import { Fingers } from './fingers';
  import { palette } from './palette';

  let {
    low,
    high,
    held,
    scale = null,
    velocity = 'height',
    fixed = 100,
    onpress,
    onrelease,
  }: {
    low: number;
    high: number;
    /** The notes down now, from any source: lit. */
    held: ReadonlySet<number>;
    /** The keys the armed scale can play (a dot), or null for none. */
    scale?: ReadonlySet<number> | null;
    /** From where a key is struck (lower is louder), or `fixed`. */
    velocity?: 'height' | 'fixed';
    fixed?: number;
    onpress: (note: number, velocity: number) => void;
    onrelease: (note: number) => void;
  } = $props();

  const layout = $derived(keyboardLayout(low, high));
  // (C4 is the palette's octave 0, as the piano roll's rows)
  const swatch = (note: number) => palette('pitch', note - 60, { cycle: 12 });
  const fingers = new Fingers({ press: (n, v) => onpress(n, v), release: (n) => onrelease(n) });
  onDestroy(() => fingers.releaseAll());

  function down(e: PointerEvent, note: number) {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    fingers.down(e, note, velocity === 'fixed' ? fixed : velocityAt(e.clientY - r.top, r.height));
  }
</script>

<!-- (a pointer whose key went from under it, an octave shifted or the tab changed, lifts where the window hears it) -->
<svelte:window onblur={() => fingers.releaseAll()} onpointerup={(e) => fingers.up(e)} onpointercancel={(e) => fingers.up(e)} />

<div class="keyboard" role="group" aria-label="Keyboard, {keyName(low)} to {keyName(high)}">
  {#each layout as key (key.note)}
    <button
      type="button"
      class={key.black ? 'black' : 'white'}
      class:on={held.has(key.note)}
      class:dot={scale?.has(key.note)}
      style:left="{key.left}%"
      style:width="{key.width}%"
      style:--swatch={swatch(key.note)}
      aria-label={keyName(key.note)}
      aria-pressed={held.has(key.note)}
      onpointerdown={(e) => down(e, key.note)}
      onpointerup={(e) => fingers.up(e)}
      onpointercancel={(e) => fingers.up(e)}
      onlostpointercapture={(e) => fingers.up(e)}
      onkeydown={(e) => fingers.keyDown(e, key.note, fixed)}
      onkeyup={(e) => (e.key === 'Enter' || e.key === ' ') && fingers.keyUp(key.note)}
      onblur={() => fingers.keyUp(key.note)}
      oncontextmenu={(e) => e.preventDefault()}
    >
      {#if key.note % 12 === 0}<span class="name" aria-hidden="true">{keyName(key.note)}</span>{/if}
    </button>
  {/each}
</div>

<style>
  .keyboard {
    position: relative;
    height: 100%;
    min-height: 0;
    border-radius: 8px;
    overflow: hidden;
    touch-action: none;
    user-select: none;
    -webkit-user-select: none;
  }
  button {
    all: unset;
    box-sizing: border-box;
    position: absolute;
    top: 0;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    align-items: center;
    padding-bottom: 6px;
    cursor: pointer;
    touch-action: none;
    -webkit-touch-callout: none;
    -webkit-tap-highlight-color: transparent;
  }
  .white {
    height: 100%;
    background: var(--key-white);
    border: 1px solid var(--key-black);
    border-top: 0;
    border-radius: 0 0 6px 6px;
    z-index: 1;
  }
  .black {
    height: 60%;
    background: var(--key-black);
    border: 1px solid var(--key-black);
    border-radius: 0 0 4px 4px;
    z-index: 2;
  }
  .on {
    background: var(--swatch);
  }
  .white.on {
    box-shadow: inset 0 -4px 0 color-mix(in oklab, var(--swatch) 60%, var(--key-black));
  }
  button:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: -3px;
  }
  /* a key the scale can play: a dot in its pitch's colour (dark ink once it is lit in that colour) */
  .dot::before {
    content: '';
    width: 8px;
    height: 8px;
    margin-bottom: 4px;
    border-radius: 50%;
    background: var(--swatch);
    box-shadow: 0 0 0 1.5px var(--key-black);
  }
  .black.dot::before {
    box-shadow: 0 0 0 1.5px var(--key-white);
  }
  .on.dot::before {
    background: var(--ink-on-note);
  }
  .name {
    font: 600 10px/1 var(--font-ui);
    color: var(--key-black);
    opacity: 0.7;
  }
  .on .name {
    color: var(--ink-on-note);
  }
</style>
