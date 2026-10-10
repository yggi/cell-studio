<script lang="ts">
  /**
   * The sidebar, a drawer on the right: two pages, the piece's controls (every free() in it, and the keys and pads) and
   * MIDI (the ports, how the piece goes out, the keys, learned knobs). The tab strip says which; a dot on MIDI says
   * whether anything is connected.
   */
  import { getStudio } from './state/studio.svelte';
  import FreePanel from './FreePanel.svelte';
  import MidiPanel from './MidiPanel.svelte';

  const { view, library, dock, midi } = getStudio();
  const live = $derived(!!midi.access && (midi.outPortId !== 'none' || midi.inPortId !== 'none'));
</script>

<aside class="drawer" aria-label="Sidebar">
  <header>
    <div class="tabs" role="tablist" aria-label="Sidebar page">
      <button
        role="tab"
        aria-selected={view.panel === 'controls'}
        class="unstyled"
        class:on={view.panel === 'controls'}
        disabled={!library.anyOpen}
        onclick={() => (view.panel = 'controls')}>Controls</button
      >
      <button role="tab" aria-selected={view.panel === 'midi'} class="unstyled" class:on={view.panel === 'midi'} onclick={() => (view.panel = 'midi')}>
        MIDI<span class="dot" class:live aria-label={live ? 'connected' : 'not connected'}></span>
      </button>
    </div>
    <button class="x unstyled" onclick={() => (view.panelOpen = false)} aria-label="Close">×</button>
  </header>
  {#if view.panel === 'midi'}
    <MidiPanel {midi} />
  {:else}
    <button
      class="dock-toggle"
      aria-pressed={dock.open}
      onclick={() => {
        dock.toggle();
        if (dock.open) view.panelOpen = false;
      }}>{dock.open ? 'Hide' : 'Show'} the keys and pads</button
    >
    <FreePanel />
  {/if}
</aside>

<style>
  .drawer {
    position: fixed;
    z-index: 50;
    top: 0;
    right: 0;
    bottom: 0;
    width: min(360px, 92vw);
    overflow: auto;
    padding: 0 16px 24px;
    background: var(--surface);
    border-left: 1px solid var(--line);
    box-shadow: -12px 0 30px rgba(0, 0, 0, 0.45);
  }
  header {
    position: sticky;
    top: 0;
    z-index: 2;
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin: 0 -16px 12px;
    padding: 8px 12px 0 16px;
    background: var(--surface);
    border-bottom: 1px solid var(--line);
  }
  .tabs {
    display: flex;
    gap: 4px;
  }
  .tabs button {
    position: relative;
    min-height: 44px;
    padding: 0 12px;
    color: var(--text-muted);
    font: 700 var(--text-md) var(--font-ui);
    cursor: pointer;
  }
  .tabs button.on {
    color: var(--text);
  }
  .tabs button.on::after {
    content: '';
    position: absolute;
    left: 10px;
    right: 10px;
    bottom: -1px;
    height: 3px;
    border-radius: 3px 3px 0 0;
    background: var(--rainbow);
  }
  .tabs button:disabled {
    color: var(--text-faint);
    cursor: default;
  }
  .dot {
    display: inline-block;
    width: 7px;
    height: 7px;
    margin-left: 6px;
    border-radius: 50%;
    background: var(--text-faint);
    vertical-align: middle;
  }
  .dot.live {
    background: var(--meter-1);
  }
  .x {
    font-size: 22px;
    padding: 0 6px;
    cursor: pointer;
  }
  .dock-toggle {
    width: 100%;
    min-height: 40px;
    margin-bottom: 14px;
    border-radius: var(--radius);
    border: 1px solid var(--line);
    background: var(--code-bg);
    color: var(--text);
    font: 600 14px var(--font-ui);
    cursor: pointer;
  }
  .dock-toggle[aria-pressed='true'] {
    border-color: var(--accent);
  }
  .dock-toggle:focus-visible,
  .x:focus-visible,
  .tabs button:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }
</style>
