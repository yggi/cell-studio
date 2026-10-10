<script lang="ts">
  import { onDestroy } from 'svelte';
  import { noteColour } from './ui/theme';
  import { Studio, setStudio } from './ui/state/studio.svelte';
  import Picker from './ui/Picker.svelte';
  import Shorten from './ui/Shorten.svelte';
  import Transport from './ui/Transport.svelte';
  import QuickPick from './ui/QuickPick.svelte';
  import Sidebar from './ui/Sidebar.svelte';
  import Graph from './ui/Graph.svelte';
  import Editor from './ui/Editor.svelte';
  import UpdateToast from './ui/UpdateToast.svelte';
  import KeysDock from './ui/KeysDock.svelte';

  // the app's state (ui/state/): the piece, playing it, the library, what's on screen
  const studio = new Studio();
  setStudio(studio);
  onDestroy(() => studio.dispose());
  const { piece, playback, library, view, dock } = studio;
</script>

<UpdateToast />
{#if view.perf}
  {#await import('./ui/PerfOverlay.svelte') then m}
    <m.default sources={studio.perfSources} meta={studio.perfMeta} test={studio.perfTest} onclose={() => view.togglePerf()} />
  {/await}
{/if}

<div class="app" class:selecting={view.tab === 'select'}>
  <header>
    <h1 aria-label="Cell studio">
      {#each [...'Cell studio'] as ch, i}<span style:color={ch === ' ' ? undefined : noteColour((i * 7 * 30) % 360)}>{ch}</span>{/each}
    </h1>
    {#if library.anyOpen}
      <div class="transport-in">
        <Transport path={quick} />
      </div>
    {:else}
      <p class="tagline">Music, cell by cell<span>&nbsp;— choose a piece to begin</span></p>
      <div class="quick-idle">{@render quick()}</div>
    {/if}
    {#snippet quick()}<QuickPick entries={library.entries} current={library.currentId} onpick={(id) => studio.pick(id)} />{/snippet}
  </header>
  <div class="tabs" role="tablist" aria-label="View">
    <button role="tab" aria-selected={view.tab === 'select'} class:on={view.tab === 'select'} onclick={() => (view.tab = 'select')}>Select</button>
    <button role="tab" aria-selected={view.tab === 'graph'} class:on={view.tab === 'graph'} disabled={!library.anyOpen} onclick={() => (view.tab = 'graph')}>Graph</button>
    <button role="tab" aria-selected={view.tab === 'code'} class:on={view.tab === 'code'} disabled={!library.anyOpen} onclick={() => (view.tab = 'code')}>
      Code{#if piece.errors}<span class="badge" aria-label="{piece.errors} errors">{piece.errors}</span>{/if}
    </button>
  </div>

  <section class="canvas" class:away={view.tab !== 'graph'} inert={view.narrow && view.tab !== 'graph'} aria-label="Cell graph">
    <Graph
      model={piece.graph}
      program={piece.program}
      muted={piece.muted}
      routed={piece.routed}
      heads={playback.heads}
      transport={playback.state}
      shifts={piece.shifts}
      ontoggle={(id) => piece.toggle(id)}
      onturn={(name, shift) => piece.turn(name, shift)}
      onshowcode={(name) => studio.showInCode(name)}
      source={piece.code}
      sound={playback.sound}
      onedit={(s) => (piece.code = s)}
      onadd={() => studio.add()}
      onrename={(s, to) => studio.rename(s, to)}
      onfree={(spec, v) => piece.hold(spec, v)}
      epoch={playback.epoch}
      nudge={(sec) => playback.nudge(sec)}
      cursor={playback.cursor}
      opened={library.opened}
      focus={view.focus}
      onsheet={(name) => (studio.keys.sheet = name)}
      played={studio.keys.lit}
      rows={studio.rows}
    />
    {#if piece.stale}
      <p class="stale">Showing the last version that compiled</p>
    {/if}
  </section>

  {#if view.panelOpen && (library.anyOpen || view.panel === 'midi')}
    <Sidebar />
  {/if}
  {#if dock.open && library.anyOpen && view.tab !== 'select'}
    <div class="dock-slot"><KeysDock /></div>
  {/if}
  <section class="side" class:away={view.tab !== 'code'} inert={view.narrow && view.tab !== 'code'} aria-label="Program">
    <Editor bind:this={studio.editor} bind:value={piece.code} diagnostics={piece.result.diagnostics} />
    <Shorten code={piece.code} onapply={(next) => (piece.code = next)} />
  </section>
  <section class="select" class:away={view.tab !== 'select'} class:front={view.tab === 'select'} inert={view.tab !== 'select'} aria-label="Choose a piece">
    <Picker embedded />
  </section>
</div>

<style>
  /* Phone: header, tabs, and one full-size view — the graph or the code.
     Both stay mounted (the hidden one keeps its size), so switching is instant. */
  .app {
    height: 100%;
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: auto auto minmax(0, 1fr) auto;
    grid-template-areas: 'head' 'tabs' 'view' 'dock';
  }
  /* the keys and pads: under the view, so they never cover the graph; a third of the height on a phone */
  .dock-slot {
    grid-area: dock;
    z-index: 3;
    height: max(180px, 33dvh);
    min-height: 0;
  }
  .canvas,
  .side {
    grid-area: view;
    min-height: 0;
    z-index: 1;
    background: var(--bg);
  }
  .side {
    background: var(--code-bg);
  }
  /* the other view stays mounted underneath (and inert): the graph keeps its size */
  /* the transport, in the header: beside the name (and below it on a phone, the sections' track) */
  .transport-in {
    flex: 1;
    min-width: 0;
  }
  .select {
    grid-area: view;
    position: relative;
    z-index: 2;
    min-height: 0;
    overflow: hidden;
    background: radial-gradient(120% 90% at 50% 40%, color-mix(in oklab, var(--surface) 70%, transparent) 0%, var(--bg) 70%);
  }
  .away {
    z-index: 0;
    /* (truly not shown: under the other tab it still drew and analysed — and kept the page too busy
       to feed the sound; its layout stays, so switching back is instant) */
    visibility: hidden;
  }
  .tabs {
    grid-area: tabs;
    display: flex;
    background: var(--surface);
    border-bottom: 1px solid var(--line);
  }
  .tabs button {
    position: relative;
    flex: 1;
    min-height: 38px;
    border: none;
    background: none;
    color: var(--text-muted);
    font: 600 var(--text-md) var(--font-ui);
    cursor: pointer;
  }
  .tabs button.on {
    color: var(--text);
  }
  /* the active tab: underlined with the note rainbow */
  .tabs button.on::after {
    content: '';
    position: absolute;
    left: 18%;
    right: 18%;
    bottom: 0;
    height: 3px;
    border-radius: 3px 3px 0 0;
    background: var(--rainbow);
  }
  .badge {
    display: inline-block;
    margin-left: 6px;
    min-width: 18px;
    padding: 0 5px;
    border-radius: 9px;
    background: var(--danger);
    color: var(--ink-on-note);
    font: 700 12px/18px var(--font-ui);
  }
  @media (min-width: 900px) {
    /* Desktop: two panes side by side, no tabs */
    .app {
      grid-template-columns: minmax(360px, 34%) minmax(0, 1fr);
      grid-template-rows: auto minmax(0, 1fr) auto;
      grid-template-areas: 'head head' 'side canvas' 'dock dock';
    }
    .dock-slot {
      height: clamp(170px, 26vh, 250px);
    }
    .tabs {
      display: none;
    }
    .canvas {
      grid-area: canvas;
    }
    .side {
      grid-area: side;
    }
    .away {
      z-index: 1;
      visibility: visible; /* (side by side: both shown) */
    }
    /* choosing: the whole width, over both panes (and they rest underneath, truly hidden) */
    .select {
      grid-row: 2;
      grid-column: 1 / -1;
    }
    .select.away,
    .selecting .canvas,
    .selecting .side {
      visibility: hidden;
    }
  }

  header {
    grid-area: head;
    z-index: 30;
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-3);
    background: var(--surface);
    border-bottom: 1px solid var(--line);
  }
  h1 {
    margin: 0;
    align-self: flex-start;
    padding-top: 13px;
    font: 800 17px/1 var(--font-ui);
    letter-spacing: -0.02em;
    white-space: nowrap;
  }
  @media (min-width: 900px) {
    h1 {
      font-size: 21px;
    }
  }
  /* playing: the rim runs round the note rainbow */
  @keyframes rim {
    to {
      background-position:
        0 0,
        200% 0;
    }
  }
  @media (prefers-reduced-motion: reduce) {
  }

  .canvas {
    position: relative;
  }
  .stale {
    position: absolute;
    top: 10px;
    left: 50%;
    transform: translateX(-50%);
    margin: 0;
    padding: 6px 12px;
    border-radius: 999px;
    background: var(--surface);
    border: 1px solid var(--danger);
    font-size: 13px;
    white-space: nowrap;
  }

  .side {
    display: flex;
    flex-direction: column;
    background: var(--code-bg);
    border-top: 1px solid var(--line);
  }
  @media (min-width: 900px) {
    .side {
      border-top: 0;
      border-right: 1px solid var(--line);
    }
  }

  /* a phone: the name and the controls on one line, the track and the tempo the whole width below */
  @media (max-width: 899px) {
    header {
      display: grid;
      grid-template-columns: auto minmax(0, 1fr);
      align-items: center;
      row-gap: 0;
    }
    h1 {
      align-self: center;
      padding-top: 0;
    }
    .transport-in,
    .transport-in :global(.transport) {
      display: contents;
    }
    .transport-in :global(.lower) {
      grid-column: 1 / -1;
    }
  }
  .tagline {
    margin: 0;
    flex: 1;
    min-width: 0;
    font: 600 14px var(--font-ui);
    color: var(--text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .tagline span {
    color: var(--text-muted);
    font-weight: 500;
  }
  @media (max-width: 899px) {
    .tagline span {
      display: none;
    }
  }
  /* nothing open yet: the quick path beside the tagline (on a phone, in its place) */
  .quick-idle {
    flex: 0 1 auto;
    min-width: 0;
    display: flex;
  }
  @media (max-width: 599px) {
    .tagline {
      display: none;
    }
  }
  .tabs button:disabled {
    color: var(--text-faint);
    cursor: default;
  }
</style>
