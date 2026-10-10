<script lang="ts">
  /**
   * The dock of on-screen keys and drum pads (#255), along the bottom (a third of the height on a phone): *Keys* plays
   * the armed cell, *Pads* the piece's kit on channel 10, both through `studio.keys` (the path MIDI in and the computer
   * keys take; nothing new sounds). The armed cell's name sits on it, and choosing another there is the MIDI dialog's
   * *Play with*. The keys shift by octaves; velocity from where a key is struck or fixed; a sustain button is the
   * pedal. Open or not, and its tab, are kept in this browser (`state/dock.svelte.ts`). Mounted only while open: closed,
   * it costs nothing.
   */
  import { onDestroy } from 'svelte';
  import { getStudio } from './state/studio.svelte';
  import { FIXED_VELOCITY } from './state/dock.svelte';
  import { DRUM_CHANNEL } from '../midi/surfaces';
  import { cellId } from '../engine/ids';
  import { keyName, keyRange, octavesFor } from '../layout/keyboard';
  import PianoKeys from './PianoKeys.svelte';
  import DrumPads from './DrumPads.svelte';

  const { keys, dock, playback } = getStudio();

  let width = $state(0);
  const octaves = $derived(octavesFor(width));
  const range = $derived(keyRange(dock.octave, octaves));
  // the octave the keys shown are centred on (the one kept, unless the edge of MIDI's range held it back), and a shift from it
  const centre = $derived(range.low / 12 - 1 + Math.floor((octaves - 1) / 2));
  const can = (by: number) => keyRange(centre + by, octaves).low !== range.low;
  // the sustain button latched here lets go with the dock, so nothing rings on unseen
  let latched = false;
  function sustain() {
    latched = !keys.pedal;
    keys.sustain(!keys.pedal);
  }
  onDestroy(() => {
    if (latched && keys.pedal) keys.sustain(false);
  });
  const voices = $derived(playback.playing ? playback.heads.voices : null);
</script>

<section class="dock" aria-label="Keys and pads">
  <div class="bar">
    <label class="armed" title="The cell the keys play (as Play with in the MIDI dialog)">
      <span class="name">{keys.armed ? `&${keys.armed}` : 'Nothing to play'}</span><span aria-hidden="true">▾</span>
      <select aria-label="Play with" value={keys.chosen} onchange={(e) => (keys.chosen = e.currentTarget.value)}>
        <option value="">The open sheet{keys.armed && !keys.chosen ? ` (now &${keys.armed})` : ''}</option>
        {#each keys.armable as a (a.cell)}<option value={a.cell}>&{a.cell}{a.cell === a.voice ? '' : ` on &${a.voice}`}{a.kit ? ' (kit)' : ''}</option>{/each}
      </select>
    </label>
    <div class="tabs" role="tablist" aria-label="Keys or pads">
      <button role="tab" aria-selected={dock.tab === 'keys'} class:on={dock.tab === 'keys'} onclick={() => (dock.tab = 'keys')}>Keys</button>
      <button role="tab" aria-selected={dock.tab === 'pads'} class:on={dock.tab === 'pads'} onclick={() => (dock.tab = 'pads')}>Pads</button>
    </div>
    {#if dock.tab === 'keys'}
      <div class="octave" role="group" aria-label="Octave">
        <button onclick={() => (dock.octave = centre - 1)} disabled={!can(-1)} aria-label="Octave down">−</button>
        <span class="from" aria-live="polite">{keyName(range.low)}</span>
        <button onclick={() => (dock.octave = centre + 1)} disabled={!can(1)} aria-label="Octave up">+</button>
      </div>
    {/if}
    <button class="toggle" aria-pressed={keys.pedal} onclick={sustain} title="Sustain: as the pedal, keys let go ring on until it lifts">Sustain</button>
    {#if dock.tab === 'keys'}
      <button
        class="toggle"
        aria-pressed={dock.velocity === 'height'}
        onclick={() => (dock.velocity = dock.velocity === 'height' ? 'fixed' : 'height')}
        aria-label="Velocity by height"
        title="Velocity by height. On: a key struck lower plays louder. Off: every key at the same velocity">Velocity</button
      >
    {/if}
    <button class="x" onclick={() => (dock.open = false)} aria-label="Close the keys and pads">×</button>
  </div>
  <div class="body" bind:clientWidth={width}>
    {#if dock.tab === 'keys'}
      {#if width > 0}
        <PianoKeys
          low={range.low}
          high={range.high}
          held={keys.held}
          scale={keys.scale}
          velocity={dock.velocity}
          fixed={FIXED_VELOCITY}
          onpress={(n, v) => keys.press(n, v)}
          onrelease={(n) => keys.release(n)}
        />
      {/if}
    {:else if keys.pads.length}
      <DrumPads
        pads={keys.pads}
        down={(m) => keys.lit.has(cellId(m))}
        sounding={(m) => !!voices?.has(cellId(m))}
        velocity={FIXED_VELOCITY}
        onpress={(n, v) => keys.press(n, v, DRUM_CHANNEL)}
        onrelease={(n) => keys.release(n, DRUM_CHANNEL)}
      />
    {:else}
      <p class="none">This piece has no kit, so there are no pads.</p>
    {/if}
  </div>
</section>

<style>
  .dock {
    display: flex;
    flex-direction: column;
    min-height: 0;
    height: 100%;
    padding: 6px 10px 10px;
    gap: 6px;
    background: var(--surface);
    border-top: 1px solid var(--line);
    box-sizing: border-box;
  }
  .bar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
    font: 600 13px var(--font-ui);
    color: var(--text-muted);
  }
  .bar button {
    min-height: 32px;
    padding: 0 10px;
    border-radius: var(--radius-pill);
    border: 1px solid var(--line);
    background: var(--code-bg);
    color: var(--text-muted);
    font: 600 13px var(--font-ui);
    cursor: pointer;
  }
  .bar button:disabled {
    color: var(--text-faint);
    cursor: default;
  }
  .bar button:focus-visible,
  .armed:focus-within {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }
  .armed {
    position: relative;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    min-height: 32px;
    max-width: 40vw;
    padding: 0 10px;
    border-radius: var(--radius-pill);
    border: 1px solid var(--line);
    background: var(--code-bg);
    color: var(--accent);
    font: 700 14px var(--font-code);
    cursor: pointer;
  }
  .armed .name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  /* the native list, invisible over the name: a tap on the name opens it */
  .armed select {
    position: absolute;
    inset: 0;
    width: 100%;
    opacity: 0;
    cursor: pointer;
    font-size: 16px;
  }
  .tabs {
    display: inline-flex;
    gap: 2px;
  }
  .tabs button.on,
  .toggle[aria-pressed='true'] {
    color: var(--accent-ink);
    background: var(--accent);
    border-color: var(--accent);
  }
  .octave {
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }
  .octave button {
    min-width: 32px;
    padding: 0;
    font-size: 16px;
  }
  .from {
    min-width: 2.6em;
    text-align: center;
    color: var(--text);
  }
  .bar .x {
    margin-left: auto;
    border: 0;
    background: none;
    font-size: 22px;
    padding: 0 6px;
  }
  .body {
    flex: 1;
    min-height: 0;
  }
  .none {
    margin: 8px 2px;
    font: 500 14px var(--font-ui);
    color: var(--text-muted);
  }
  @media (max-width: 599px) {
    .toggle {
      padding: 0 8px;
    }
  }
</style>
