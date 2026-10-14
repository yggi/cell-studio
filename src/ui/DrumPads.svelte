<script lang="ts">
  /**
   * The on-screen drum pads (#255), adapted from yggi/jambot apps/web/src/components/DrumPads.svelte @ 8cdb6b8: one
   * pad per member of the piece's kit, named by its voice (&kick), in a grid; a pad sends its member's General MIDI
   * note (`engine/keys.ts` `kitPads`). The same fingers as the keys (`fingers.ts`). A pad lights while held (from here,
   * MIDI in or the computer keys: `down`), and glows while the plan plays its member (`sounding`).
   */
  import { onDestroy } from 'svelte';
  import type { Pad } from '@yggi/cells/engine/keys';
  import { Fingers } from './fingers';

  let {
    pads,
    down,
    sounding,
    velocity = 100,
    onpress,
    onrelease,
  }: {
    pads: readonly Pad[];
    /** Members held now, from any source. */
    down: (member: string) => boolean;
    /** Members the plan plays now. */
    sounding: (member: string) => boolean;
    velocity?: number;
    onpress: (note: number, velocity: number) => void;
    onrelease: (note: number) => void;
  } = $props();

  const fingers = new Fingers({ press: (n, v) => onpress(n, v), release: (n) => onrelease(n) });
  onDestroy(() => fingers.releaseAll());
</script>

<!-- (a pointer whose key went from under it, an octave shifted or the tab changed, lifts where the window hears it) -->
<svelte:window onblur={() => fingers.releaseAll()} onpointerup={(e) => fingers.up(e)} onpointercancel={(e) => fingers.up(e)} />

<div class="pads" role="group" aria-label="Drum pads">
  {#each pads as pad (pad.member)}
    <button
      type="button"
      class="pad"
      class:on={down(pad.member)}
      class:sounding={sounding(pad.member)}
      aria-label="&{pad.member}"
      aria-pressed={down(pad.member)}
      title="&{pad.member}: General MIDI note {pad.note}"
      onpointerdown={(e) => fingers.down(e, pad.note, velocity)}
      onpointerup={(e) => fingers.up(e)}
      onpointercancel={(e) => fingers.up(e)}
      onlostpointercapture={(e) => fingers.up(e)}
      onkeydown={(e) => fingers.keyDown(e, pad.note, velocity)}
      onkeyup={(e) => (e.key === 'Enter' || e.key === ' ') && fingers.keyUp(pad.note)}
      onblur={() => fingers.keyUp(pad.note)}
      oncontextmenu={(e) => e.preventDefault()}
    >
      &amp;{pad.member}
    </button>
  {/each}
</div>

<style>
  .pads {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(84px, 1fr));
    grid-auto-rows: minmax(52px, 1fr);
    gap: 8px;
    height: 100%;
    min-height: 0;
    overflow-y: auto;
    touch-action: none;
    user-select: none;
    -webkit-user-select: none;
  }
  .pad {
    all: unset;
    box-sizing: border-box;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 4px;
    border: 1px solid var(--line);
    border-radius: var(--radius-lg);
    background: var(--surface-2);
    color: var(--text);
    font: 600 14px var(--font-code);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    cursor: pointer;
    touch-action: none;
    -webkit-touch-callout: none;
    -webkit-tap-highlight-color: transparent;
  }
  .pad.sounding {
    background: color-mix(in oklab, var(--pad-glow) 30%, var(--surface-2));
    border-color: var(--pad-1);
  }
  .pad.on {
    background: var(--pad-0);
    border-color: var(--pad-0);
    color: var(--pad-ink);
  }
  .pad:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }
</style>
