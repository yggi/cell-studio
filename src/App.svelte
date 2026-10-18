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
  import Version from './ui/Version.svelte';
  import KeysDock from './ui/KeysDock.svelte';
  import TimeView from './ui/TimeView.svelte';
  import ConvertStrip from './ui/ConvertStrip.svelte';

  // the app's state (ui/state/): the piece, playing it, the library, what's on screen
  const studio = new Studio();
  setStudio(studio);
  onDestroy(() => studio.dispose());
  const { piece, playback, library, view, dock } = studio;
  // what the stage shows (on a wide screen the code is beside it: its tab is the graph's)
  const stage = $derived(view.tab === 'code' && !view.narrow ? 'graph' : view.tab);
  // (a MIDI file's machine is read only: a try at a change, or at a cell's details, says to convert first, a moment)
  let tried = $state(0);
  let trying = $state(false);
  $effect(() => {
    if (!tried) return;
    trying = true;
    const t = setTimeout(() => (trying = false), 2600);
    return () => clearTimeout(t);
  });
</script>

<UpdateToast />
{#if view.perf}
  {#await import('./ui/PerfOverlay.svelte') then m}
    <m.default sources={studio.perfSources} meta={studio.perfMeta} test={studio.perfTest} onclose={() => view.togglePerf()} />
  {/await}
{/if}

<div class="app" class:selecting={view.tab === 'select'} class:timing={view.tab === 'time'} class:nocode={!view.code}>
  <header>
    <div class="name">
      <h1 aria-label="Cell studio">
        {#each [...'Cell studio'] as ch, i}<span style:color={ch === ' ' ? undefined : noteColour((i * 7 * 30) % 360)}>{ch}</span>{/each}
      </h1>
      <Version />
    </div>
    {#if library.anyOpen}
      <div class="transport-in">
        <Transport path={quick} />
      </div>
    {:else}
      <p class="tagline">Music, cell by cell<span>&nbsp;— choose a piece to begin</span></p>
      <div class="quick-idle">{@render quick()}</div>
    {/if}
    {#snippet quick()}<QuickPick entries={library.entries} current={library.currentId} onpick={(id) => studio.pick(id)} />{/snippet}
    <!-- the views: one switch at every size (on a wide screen the code is a pane beside the stage, shown or hidden) -->
    <div class="tabs" role="tablist" aria-label="View">
      <button role="tab" aria-selected={view.tab === 'select'} class:on={view.tab === 'select'} onclick={() => (view.tab = 'select')}>Library</button>
      <button role="tab" aria-selected={stage === 'graph'} class:on={stage === 'graph'} disabled={!library.anyOpen} onclick={() => (view.tab = 'graph')}>Graph</button>
      {#if view.narrow}
        <button role="tab" aria-selected={view.tab === 'code'} class:on={view.tab === 'code'} disabled={!library.anyOpen} onclick={() => (view.tab = 'code')}>
          Code{#if piece.errors}<span class="badge" aria-label="{piece.errors} errors">{piece.errors}</span>{/if}
        </button>
      {/if}
      <button role="tab" aria-selected={view.tab === 'time'} class:on={view.tab === 'time'} disabled={!library.anyOpen} onclick={() => (view.tab = 'time')}>Time</button>
    </div>
    {#if !view.narrow}
      <button class="codepane" aria-pressed={view.code} disabled={!library.anyOpen} onclick={() => (view.code = !view.code)} title="The code beside the graph"
        >Code{#if piece.errors}<span class="badge" aria-label="{piece.errors} errors">{piece.errors}</span>{/if}</button
      >
    {/if}
  </header>

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
      refit={studio.foldFrames}
      growing={studio.conversion.phase === 'playing'}
      focus={view.focus}
      onsheet={(name) => {
        studio.keys.sheet = name;
        view.sheet(name);
      }}
      unsheet={view.unsheet}
      sheetHidden={!view.narrow && !(view.panelOpen && view.panel === 'cell')}
      played={studio.keys.lit}
      rows={studio.rows}
      onlayout={(l) => (view.layout = l)}
      locked={piece.midi ? () => tried++ : undefined}
    />
    {#if piece.midi && !studio.conversion.phase}
      <!-- a MIDI file's machine (#390, decision 034): the cells it plays through, read only; converting it is the action -->
      <div class="hero" role="group" aria-label="A MIDI file">
        <p>A MIDI file, as it plays: fold its notes into cells.</p>
        <div class="actions">
          <button class="primary" onclick={() => studio.convert()}>Convert to cells</button>
          <button onclick={() => (view.tab = 'time')}>Show it in time</button>
        </div>
      </div>
      {#if trying}
        <p class="first" role="status">Convert to cells first: a MIDI file's machine is read only.</p>
      {/if}
    {/if}
    {#if piece.stale}
      <p class="stale">Showing the last version that compiled</p>
    {/if}
    <!-- Convert to cells, watched (#390): its progress, what the frame did, its speed -->
    <ConvertStrip />
  </section>

  <!-- (a cell's page only beside its graph: the sheet is the graph's) -->
  {#if view.panelOpen && (library.anyOpen || view.panel === 'midi' || view.panel === 'file') && !(view.panel === 'cell' && stage !== 'graph')}
    <Sidebar />
  {/if}
  {#if dock.open && library.anyOpen && view.tab !== 'select'}
    <div class="dock-slot"><KeysDock /></div>
  {/if}
  <section class="time" class:away={view.tab !== 'time'} inert={view.tab !== 'time'} aria-label="The piece in time">
    <TimeView active={view.tab === 'time' && library.anyOpen} />
  </section>
  <section class="side" class:away={view.tab !== 'code'} inert={view.narrow && view.tab !== 'code'} aria-label="Program">
    <Editor bind:this={studio.editor} bind:value={piece.code} diagnostics={piece.result.diagnostics} />
    {#if piece.midi}
      <div class="convert">
        <span>A MIDI file, as text: {piece.midi.smf.tracks.reduce((n, t) => n + t.notes.length, 0)} notes in {piece.midi.smf.tracks.length} tracks</span>
        <button onclick={() => studio.convert()}>Convert to cells</button>
      </div>
    {:else}
      <Shorten code={piece.code} onapply={(next) => (piece.code = next)} />
    {/if}
  </section>
  <section class="select" class:away={view.tab !== 'select'} class:front={view.tab === 'select'} inert={view.tab !== 'select'} aria-label="Choose a piece">
    <Picker embedded />
  </section>
</div>

<style>
  /* a MIDI file's machine (#390): the graph as it plays, read only, and over it the action, large; under its text the same */
  .hero {
    position: absolute;
    left: 50%;
    bottom: 44px;
    transform: translateX(-50%);
    z-index: 5;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-wrap: wrap;
    gap: var(--space-2) var(--space-3);
    width: max-content;
    max-width: calc(100% - 32px);
    padding: var(--space-2) var(--space-2) var(--space-2) var(--space-4);
    border: 1px solid var(--line);
    border-radius: var(--radius-lg);
    background: var(--surface);
    box-shadow: 0 12px 32px rgb(0 0 0 / 0.4);
    color: var(--text-muted);
    font: 500 var(--text-sm) var(--font-ui);
  }
  .hero p {
    margin: 0;
  }
  .hero .actions {
    display: flex;
    gap: var(--space-2);
    justify-content: center;
    flex-wrap: wrap;
  }
  .hero button,
  .convert button {
    min-height: 36px;
    padding: 0 14px;
    border-radius: var(--radius-pill);
    border: 1px solid var(--line);
    background: var(--surface);
    color: var(--text);
    font: 600 var(--text-sm) var(--font-ui);
    cursor: pointer;
  }
  .hero button.primary {
    min-height: 48px;
    padding: 0 28px;
    border-color: var(--accent);
    background: var(--accent);
    color: var(--accent-ink);
    font: 700 var(--text-md) var(--font-ui);
  }
  .hero button:focus-visible,
  .convert button:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }
  .convert button {
    border-color: var(--accent);
  }
  /* a try at a change in the machine: what to do first */
  .first {
    position: absolute;
    top: 56px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 6;
    margin: 0;
    padding: 6px 14px;
    border-radius: var(--radius-pill);
    border: 1px solid var(--accent);
    background: var(--surface);
    color: var(--text);
    font: 600 var(--text-sm) var(--font-ui);
    white-space: nowrap;
  }
  .convert {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-3);
    border-top: 1px solid var(--line);
    color: var(--text-muted);
    font: 500 var(--text-sm) var(--font-ui);
  }
  /* Phone: header, tabs, and one full-size view — the graph or the code.
     Both stay mounted (the hidden one keeps its size), so switching is instant. */
  .app {
    height: 100%;
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: auto minmax(0, 1fr) auto;
    grid-template-areas: 'head' 'view' 'dock';
  }
  /* the keys and pads: under the view, so they never cover the graph; a third of the height on a phone */
  .dock-slot {
    grid-area: dock;
    z-index: 3;
    height: max(180px, 33dvh);
    min-height: 0;
  }
  .canvas,
  .side,
  .time {
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
  /* the views: on a phone a row of tabs the whole width, under the header's controls */
  .tabs {
    grid-column: 1 / -1;
    display: flex;
    margin: var(--space-2) calc(-1 * var(--space-3)) calc(-1 * var(--space-2));
    border-top: 1px solid var(--line);
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
    /* Desktop: four slots: the code at the left (a pane shown or hidden), the stage (the library, the graph or the
       piece in time), the inspector at the right (Sidebar.svelte: a cell, the controls, MIDI …), the keys below */
    .app {
      grid-template-columns: minmax(360px, 34%) minmax(0, 1fr) auto;
      grid-template-rows: auto minmax(0, 1fr) auto;
      grid-template-areas: 'head head head' 'side canvas inspect' 'dock dock dock';
    }
    .app.nocode {
      grid-template-columns: 0 minmax(0, 1fr) auto;
    }
    .nocode .side {
      visibility: hidden;
      overflow: hidden;
    }
    .dock-slot {
      height: clamp(170px, 26vh, 250px);
    }
    /* the views: a switch at the header's end */
    .tabs {
      flex: none;
      margin: 0;
      border: 1px solid var(--line);
      border-top-color: var(--line);
      border-radius: var(--radius-pill);
      overflow: hidden;
    }
    .tabs button {
      flex: none;
      min-height: 34px;
      padding: 0 14px;
      font-size: var(--text-sm);
      font-weight: 700;
    }
    .tabs button.on {
      background: var(--line);
    }
    .tabs button.on::after {
      left: 14px;
      right: 14px;
    }
    .codepane {
      flex: none;
      min-height: 36px;
      padding: 0 14px;
      border-radius: var(--radius-pill);
      border: 1px solid var(--line);
      background: none;
      color: var(--text-muted);
      font: 700 var(--text-sm) var(--font-code);
      cursor: pointer;
    }
    .codepane[aria-pressed='true'] {
      border-color: var(--accent);
      color: var(--accent);
    }
    .codepane:disabled {
      border-color: var(--line);
      color: var(--text-faint);
      cursor: default;
    }
    .canvas {
      grid-area: canvas;
    }
    .side {
      grid-area: side;
    }
    /* the time view: in the graph's pane, instead of the graph (which stays mounted underneath, truly hidden) */
    .time {
      grid-area: canvas;
      z-index: 2;
    }
    .time.away,
    .timing .canvas {
      visibility: hidden;
    }
    .away {
      z-index: 1;
      visibility: visible; /* (side by side: both shown) */
    }
    /* choosing: over the code and the graph (they rest underneath, truly hidden), the inspector beside it */
    .select {
      grid-row: 2;
      grid-column: 1 / 3;
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
  .name {
    align-self: flex-start;
    padding-top: 13px;
  }
  h1 {
    margin: 0;
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
    .name {
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
