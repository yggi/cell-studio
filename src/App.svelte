<script lang="ts">
  import { onDestroy } from 'svelte';
  import { noteColour } from './ui/theme';
  import { Studio, setStudio } from './ui/state/studio.svelte';
  import Picker from './ui/Picker.svelte';
  import Shorten from './ui/Shorten.svelte';
  import Transport from './ui/Transport.svelte';
  import Held from './ui/Held.svelte';
  import MidiLight from './ui/MidiLight.svelte';
  import { tagKind, tagName } from '@yggi/cells/engine/tags';
  import { shortTitle } from './layout/library';
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
  const { piece, playback, library, view, dock, midi } = studio;
  const choosing = $derived(view.tab === 'select');
  // the piece's place in the library, over its name: its tutorial step, or its most particular tag (artist, genre, topic)
  const where = $derived.by(() => {
    const entry = library.entries.find((e) => e.id === library.currentId);
    for (const kind of ['tutorial', 'artist', 'genre', 'topic'] as const) {
      const tag = entry?.tags.find((t) => tagKind(t) === kind);
      if (tag) return kind === 'tutorial' ? `tutorial${entry!.tier ? ` · ${entry!.tier}` : ''}` : `${kind} › ${tagName(tag)}`;
    }
    return null;
  });
  // the sidebar's page showing, if it's open
  const panel = $derived(view.panelOpen ? view.panel : null);
  const midiLive = $derived(!!midi.access && (midi.sending || midi.inPortId !== 'none'));
  const midiName = $derived(midiLive ? `MIDI: ${[midi.inPortId !== 'none' ? 'in' : '', midi.sending ? 'out' : ''].filter(Boolean).join(', ')}` : 'MIDI: not connected');
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
    <div class="what">
      <h1>
        <Version>
          <span class="glyph" aria-hidden="true"></span>
          <span class="wordmark" aria-hidden="true"
            >{#each [...'Cell studio'] as ch, i}<span style:color={ch === ' ' ? undefined : noteColour((i * 7 * 30) % 360)}>{ch}</span>{/each}</span
          >
        </Version>
      </h1>
      <span class="rule" aria-hidden="true"></span>
      <!-- the piece: the library is behind its name (open: back to the graph) -->
      <button
        class="unstyled title"
        aria-expanded={choosing}
        onclick={() => (view.tab = choosing && library.anyOpen ? 'graph' : 'select')}
        title={choosing ? 'Back to the piece' : `${piece.title}: choose another piece`}
      >
        <span class="path">{library.anyOpen ? (where ?? 'piece') : 'library'}</span>
        <span class="name">
          <span>{library.anyOpen ? shortTitle(piece.title) || 'Untitled' : 'Choose a piece'}</span>
          <svg viewBox="0 0 24 24" aria-hidden="true" class:up={choosing}><path d="M6 9l6 6 6-6" /></svg>
        </span>
      </button>
    </div>
    {#if !view.narrow}
      {#if library.anyOpen}
        <Transport />
      {:else}
        <p class="tagline">Music, cell by cell<span>&nbsp;— choose a piece to begin</span></p>
      {/if}
    {/if}
    <div class="where">
      {#if !view.narrow}
        <Held />
        <!-- the stage: the graph or the piece in time (the library is the piece's name) -->
        <div class="switch" role="tablist" aria-label="View">
          <button role="tab" aria-selected={stage === 'graph'} class:on={stage === 'graph'} disabled={!library.anyOpen} onclick={() => (view.tab = 'graph')}>
            <svg viewBox="0 0 24 24" aria-hidden="true"
              ><circle cx="6" cy="6" r="2.5" /><circle cx="18" cy="8" r="2.5" /><circle cx="11" cy="18" r="2.5" /><path d="M8 7l7.6.8M7.2 8.2l2.7 7.6M16.6 10l-4.2 6" /></svg
            >
            <span class="label">Graph</span>
          </button>
          <button role="tab" aria-selected={stage === 'time'} class:on={stage === 'time'} disabled={!library.anyOpen} onclick={() => (view.tab = 'time')}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 18h18M5 18v-7M9 18V6M13 18V9M17 18v-5M21 18V9" /></svg>
            <span class="label">Time</span>
          </button>
        </div>
        <span class="rule" aria-hidden="true"></span>
        <!-- the panes, placed as they open: the code at the left -->
        <button
          class="unstyled pane"
          aria-pressed={view.code}
          disabled={!library.anyOpen}
          onclick={() => (view.code = !view.code)}
          aria-label="Code"
          title="The code beside the graph"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4.5" width="18" height="15" rx="2.5" /><path d="M9.5 4.5v15M5.5 8.5h1.8M5.5 11h1.8M5.5 13.5h1.8" /></svg>
          {#if piece.errors}<span class="badge" aria-label="{piece.errors} errors">{piece.errors}</span>{/if}
        </button>
      {/if}
      <button class="unstyled pane" class:live={midiLive} aria-pressed={panel === 'midi'} onclick={() => view.togglePanel('midi')} aria-label={midiName} title={midiName}>
        <svg viewBox="0 0 24 24" aria-hidden="true"
          ><circle cx="12" cy="12" r="8.5" /><path d="M10.5 18h3" /><g class="pins"
            ><circle cx="8" cy="12" r="1" /><circle cx="16" cy="12" r="1" /><circle cx="9.3" cy="8.6" r="1" /><circle cx="14.7" cy="8.6" r="1" /><circle
              cx="12"
              cy="7.5"
              r="1"
            /></g
          ></svg
        ><MidiLight />
      </button>
      <!-- … and the inspector at the right: the piece's controls, forces, files, stats (a drawer on a phone) -->
      <button
        class="unstyled pane"
        aria-pressed={panel !== null && panel !== 'midi'}
        onclick={() => view.togglePanel('controls')}
        aria-label="Controls"
        title="The piece's controls"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4.5" width="18" height="15" rx="2.5" /><path d="M14.5 4.5v15M16.7 8.5h1.8M16.7 11h1.8M16.7 13.5h1.8" /></svg>
      </button>
    </div>
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
      nudge={(sec) => !studio.following && playback.nudge(sec)}
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
      locked={piece.midi || piece.readOnly ? () => tried++ : undefined}
      lockedHint={piece.readOnly ? 'The host’s section, as it plays: read only while you follow the session.' : undefined}
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
    {#if studio.following}
      <!-- a Jambot session followed (#478): its host's section, read only, turning with the host's transport -->
      <div class="following">
        <span role="status"
          >{#if studio.heard?.before}Following “{studio.session.session}”: the host counts in{:else}Following “{studio.session.session}” · bar {(studio.heard?.bar ?? 0) +
              1}{/if}{#if studio.heard?.unstated}
            · no text states this section: {studio.heard.unstated}{/if}</span
        >
        <!-- (leaving returns to the piece you had) -->
        <button class="unstyled" onclick={() => studio.session.leave()}>Leave</button>
      </div>
      {#if trying}
        <p class="first" role="status">The host’s section is read only while you follow the session: leaving it returns to your piece.</p>
      {/if}
    {/if}
    {#if piece.stale}
      <p class="stale">Showing the last version that compiled</p>
    {/if}
    <!-- Convert to cells, watched (#390): its progress, what the frame did, its speed -->
    <ConvertStrip />
  </section>

  <!-- (a cell's page only beside its graph: the sheet is the graph's) -->
  {#if view.panelOpen && (library.anyOpen || view.panel === 'midi' || view.panel === 'file' || view.panel === 'session') && !(view.panel === 'cell' && stage !== 'graph')}
    <Sidebar />
  {/if}
  {#if dock.open && library.anyOpen && view.tab !== 'select'}
    <div class="dock-slot"><KeysDock /></div>
  {/if}
  {#if view.narrow}
    {#if library.anyOpen}<div class="bar-slot"><Transport bar /></div>{/if}
    <div class="tabs" role="tablist" aria-label="View">
      <button role="tab" aria-selected={view.tab === 'graph'} class:on={view.tab === 'graph'} disabled={!library.anyOpen} onclick={() => (view.tab = 'graph')}>
        <svg viewBox="0 0 24 24" aria-hidden="true"
          ><circle cx="6" cy="6" r="2.5" /><circle cx="18" cy="8" r="2.5" /><circle cx="11" cy="18" r="2.5" /><path d="M8 7l7.6.8M7.2 8.2l2.7 7.6M16.6 10l-4.2 6" /></svg
        >
        Graph
      </button>
      <button role="tab" aria-selected={view.tab === 'code'} class:on={view.tab === 'code'} disabled={!library.anyOpen} onclick={() => (view.tab = 'code')}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8.5 7l-5 5 5 5M15.5 7l5 5-5 5" /></svg>
        Code{#if piece.errors}<span class="badge" aria-label="{piece.errors} errors">{piece.errors}</span>{/if}
      </button>
      <button role="tab" aria-selected={view.tab === 'time'} class:on={view.tab === 'time'} disabled={!library.anyOpen} onclick={() => (view.tab = 'time')}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 18h18M5 18v-7M9 18V6M13 18V9M17 18v-5M21 18V9" /></svg>
        Time
      </button>
    </div>
  {/if}
  <section class="time" class:away={view.tab !== 'time'} inert={view.tab !== 'time'} aria-label="The piece in time">
    <TimeView active={view.tab === 'time' && library.anyOpen} />
  </section>
  <section class="side" class:away={view.tab !== 'code'} inert={view.narrow && view.tab !== 'code'} aria-label="Program">
    <Editor bind:this={studio.editor} bind:value={piece.code} diagnostics={piece.result.diagnostics} readonly={piece.readOnly} />
    {#if piece.midi}
      <div class="convert">
        <span>A MIDI file, as text: {piece.midi.smf.tracks.reduce((n, t) => n + t.notes.length, 0)} notes in {piece.midi.smf.tracks.length} tracks</span>
        <button onclick={() => studio.convert()}>Convert to cells</button>
      </div>
    {:else if !piece.readOnly}
      <Shorten code={piece.code} onapply={(next) => piece.take(next)} />
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
    grid-template-rows: auto minmax(0, 1fr) auto auto auto;
    grid-template-areas: 'head' 'view' 'dock' 'deck' 'tabs';
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

  /* the header: what's open (the piece, its library behind its name) · the transport · where you look (the stage, the panes);
     on a phone what's open and the panes, the transport and the views at the foot */
  header {
    grid-area: head;
    z-index: 30;
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    gap: var(--space-3);
    height: 52px;
    padding: 0 var(--space-2) 0 var(--space-3);
    background: var(--surface);
    border-bottom: 1px solid var(--line);
  }
  .what,
  .where {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    min-width: 0;
  }
  .what {
    gap: var(--space-3);
  }
  h1 {
    margin: 0;
    font: 800 19px/1 var(--font-ui);
    letter-spacing: -0.02em;
    white-space: nowrap;
  }
  .wordmark {
    display: none;
    font: 800 19px/1 var(--font-ui);
    letter-spacing: -0.02em;
  }
  /* the note rainbow as a ring: the app's mark where its name has no room */
  .glyph {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: conic-gradient(hsl(0 80% 62%), hsl(60 80% 55%), hsl(120 60% 50%), hsl(180 65% 50%), hsl(240 70% 66%), hsl(300 70% 62%), hsl(0 80% 62%));
    -webkit-mask: radial-gradient(circle, transparent 6px, #000 6.5px);
    mask: radial-gradient(circle, transparent 6px, #000 6.5px);
  }
  .rule {
    flex: none;
    width: 1px;
    height: 26px;
    background: var(--line);
  }
  .what .rule {
    display: none;
  }
  .title {
    display: flex;
    flex-direction: column;
    min-width: 0;
    padding: 3px 8px;
    margin: 0 -8px;
    border-radius: var(--radius-sm);
    text-align: left;
  }
  .title:hover,
  .title[aria-expanded='true'] {
    background: var(--surface-2);
  }
  .title:focus-visible {
    outline: 2px solid var(--accent);
  }
  .path {
    font: 600 var(--text-xs) / 1.3 var(--font-ui);
    color: var(--text-muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .name {
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
    font: 700 var(--text-md) / 1.25 var(--font-ui);
    color: var(--text);
  }
  .name span {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .name svg {
    flex: none;
    width: 12px;
    height: 12px;
    fill: none;
    stroke: var(--text-muted);
    stroke-width: 2.2;
    transition: transform 0.15s;
  }
  .name svg.up {
    transform: rotate(180deg);
  }
  /* the panes' switches (and MIDI's): an icon each, gold while open */
  .pane {
    position: relative;
    flex: none;
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 36px;
    height: 36px;
    padding: 0 6px;
    border-radius: var(--radius-sm);
    color: var(--text-muted);
  }
  .pane svg,
  .switch svg,
  .tabs svg {
    width: 20px;
    height: 20px;
    fill: none;
    stroke: currentColor;
    stroke-width: 1.7;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  .pane .pins {
    fill: currentColor;
    stroke: none;
  }
  .pane:hover:not(:disabled) {
    background: var(--surface-2);
    color: var(--text);
  }
  .pane.live {
    color: var(--text);
  }
  .pane[aria-pressed='true'] {
    color: var(--accent);
    background: color-mix(in oklab, var(--accent) 12%, transparent);
  }
  .pane:disabled {
    color: var(--text-faint);
    cursor: default;
  }
  .pane:focus-visible,
  .switch button:focus-visible,
  .tabs button:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: -2px;
  }
  .pane .badge {
    position: absolute;
    top: 0;
    right: -4px;
    margin: 0;
  }
  @media (min-width: 900px) {
    header {
      grid-template-columns: minmax(0, auto) minmax(0, 1fr) auto;
      gap: var(--space-4);
      height: 56px;
      padding: 0 var(--space-3) 0 var(--space-4);
    }
    .title {
      max-width: 260px;
    }
    /* the stage: a segmented switch */
    .switch {
      display: flex;
      gap: 2px;
      padding: 3px;
      border: 1px solid var(--line);
      border-radius: var(--radius);
      background: var(--code-bg);
    }
    .switch button {
      position: relative;
      display: flex;
      align-items: center;
      gap: 6px;
      height: 30px;
      padding: 0 12px;
      border: 0;
      border-radius: 7px;
      background: none;
      color: var(--text-muted);
      font: 700 var(--text-sm) var(--font-ui);
      cursor: pointer;
    }
    .switch svg {
      width: 16px;
      height: 16px;
    }
    .switch button.on {
      background: var(--surface-2);
      color: var(--text);
    }
    /* the active view: underlined with the note rainbow */
    .switch button.on::after {
      content: '';
      position: absolute;
      left: 10px;
      right: 10px;
      bottom: 2px;
      height: 2px;
      border-radius: 2px;
      background: var(--rainbow);
    }
    .switch button:disabled {
      color: var(--text-faint);
      cursor: default;
    }
  }
  /* a wide window: the name in full, the piece's place over its name */
  @media (min-width: 1200px) {
    .glyph {
      display: none;
    }
    .wordmark {
      display: inline;
    }
    .what .rule {
      display: block;
    }
  }
  @media (min-width: 900px) and (max-width: 1199px) {
    .path,
    .switch .label {
      display: none;
    }
    .switch button {
      padding: 0 9px;
    }
  }
  /* a phone: the transport and the views at the foot, under the thumb */
  .bar-slot {
    grid-area: deck;
    z-index: 3;
  }
  .tabs {
    grid-area: tabs;
    z-index: 3;
    display: flex;
    background: var(--surface);
    border-top: 1px solid var(--line);
    padding-bottom: env(safe-area-inset-bottom);
  }
  .tabs button {
    position: relative;
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
    min-height: 52px;
    border: none;
    background: none;
    color: var(--text-faint);
    font: 700 var(--text-xs) var(--font-ui);
    cursor: pointer;
  }
  .tabs button.on {
    color: var(--text);
  }
  /* the active tab: the note rainbow over it */
  .tabs button.on::before {
    content: '';
    position: absolute;
    top: 0;
    left: 30%;
    right: 30%;
    height: 3px;
    border-radius: 0 0 3px 3px;
    background: var(--rainbow);
  }
  .tabs button:disabled {
    opacity: 0.5;
    cursor: default;
  }
  .tabs .badge {
    position: absolute;
    top: 4px;
    left: 56%;
    margin: 0;
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
  /* a session followed (#478): what it follows, over the graph */
  .following {
    position: absolute;
    top: 10px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 5;
    max-width: calc(100% - 32px);
    display: flex;
    align-items: center;
    gap: 10px;
    margin: 0;
    padding: 2px 4px 2px 12px;
    border-radius: var(--radius-pill);
    background: var(--surface);
    border: 1px solid var(--accent);
    font: 600 var(--text-sm) var(--font-ui);
    white-space: nowrap;
  }
  .following > span {
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .following button {
    flex: none;
    padding: 4px 10px;
    border-radius: var(--radius-pill);
    color: var(--accent);
    font: inherit;
  }
  .following button:hover,
  .following button:focus-visible {
    background: var(--bg);
    outline: none;
  }
  .following ~ .stale {
    top: 48px;
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
</style>
