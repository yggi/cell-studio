<script lang="ts">
  import { noteColour } from './ui/theme';
  import { tick } from 'svelte';
  import { onDestroy } from 'svelte';
  import { codeShifts, compileSource, type CompileResult } from './engine/compile';
  import { addCell, declLine, setFree, setOff, setShift } from './engine/edit';
  import { buildGraph } from './engine/graph';
  import { liveAt, plan, routedNodes } from './engine/realize';
  import { EXAMPLES, FIRST, FIRST_SOURCE, loadExample, type PresetKey } from './examples';
  import { pieceMeta } from './engine/parser';
  import { canonicalTags } from './engine/tags';
  import { fileName, listSaved, readFile, removeSaved, saveFile, savePiece, storageAvailable, titleOf, type SavedPiece } from './library';
  import Picker, { type Entry } from './ui/Picker.svelte';
  import Shorten from './ui/Shorten.svelte';
  import { mainLength, mainTempo, pieceTime, sections } from './engine/duration';
  import Transport from './ui/Transport.svelte';
  import FreePanel from './ui/FreePanel.svelte';
  import { loudness, renderLength, renderPiece, wav } from './audio/render';
  import { Player } from './audio/player';
  import { transportClock } from './audio/clock.svelte';
  import Graph from './ui/Graph.svelte';
  import Editor from './ui/Editor.svelte';
  import UpdateToast from './ui/UpdateToast.svelte';

  /** What's open: an example (its fixed layout applies), a piece saved here, a file. */
  type Open = { kind: 'example'; key: PresetKey } | { kind: 'saved'; id: string } | { kind: 'file'; name: string };
  let open = $state<Open>({ kind: 'example', key: FIRST });
  // each piece opened (an example, a saved one, a file): the graph lays it out afresh
  let opened = $state(0);
  // nothing chosen yet (the front door): no transport, no piece marked open
  const anyOpen = $derived(opened > 0);
  let code = $state<string>(FIRST_SOURCE);
  // its title, from its card as it stands (it follows edits)
  const title = $derived(titleOf(code));
  let starting = $state(false);

  // values the environment provides to the code: the device's sample rate, once audio runs
  let sampleRate = $state(48000);
  const result = $derived(compileSource(code, { SAMPLE_RATE: sampleRate, A4: 440 }));

  // free() values moved by hand: what plays, not what's written — until you keep them. Held by
  // their place among the code's free()s (the first, the second …), so rewriting can't lose them.
  let held = $state<Map<number, number | string>>(new Map());
  const freeList = (r: CompileResult) =>
    [...r.cells.values()].flatMap((c) => c.frees).sort((a, b) => a.span.line - b.span.line || a.span.col - b.span.col);
  const withHeld = (src: string, r: CompileResult) => {
    const fs = freeList(r);
    let out = src;
    // (from the end backwards: each rewrite leaves the earlier places where they were)
    for (let i = fs.length - 1; i >= 0; i--) if (held.has(i)) out = setFree(out, fs[i], held.get(i)!);
    return out;
  };
  const playedCode = $derived(held.size && result.ok ? withHeld(code, result) : code);
  const playedResult = $derived(playedCode === code ? result : compileSource(playedCode, { SAMPLE_RATE: sampleRate, A4: 440 }));
  function holdFree(spec: { span: { line: number; col: number } }, v: number | string) {
    const i = freeList(program).findIndex((f) => f.span.line === spec.span.line && f.span.col === spec.span.col);
    if (i < 0) return;
    held = new Map(held).set(i, v);
  }
  // an edit that changes how many free()s there are: what was held no longer fits
  let freeCount = 0;
  $effect(() => {
    const n = freeList(result).length;
    if (result.ok && n !== freeCount) {
      freeCount = n;
      if (held.size) held = new Map();
    }
  });
  let panelOpen = $state(false);
  const keepHeld = () => {
    code = playedCode;
    held = new Map();
  };

  // While the code has errors, keep showing and playing the last version that compiled.
  let lastGood: CompileResult = compileSource(FIRST_SOURCE);
  const program = $derived.by(() => {
    if (playedResult.ok) lastGood = playedResult;
    return lastGood;
  });
  const graph = $derived(buildGraph(program));

  // The performance overlay: ?perf turns it on (and keeps it on), ?perf=off turns it off; Files ▾ toggles it too.
  // It is loaded only when on, so it costs nothing otherwise.
  const PERF_KEY = 'cell-studio-perf';
  function perfWanted(): boolean {
    try {
      const q = new URLSearchParams(location.search).get('perf');
      if (q !== null) {
        if (q === 'off' || q === '0') localStorage.removeItem(PERF_KEY);
        else localStorage.setItem(PERF_KEY, '1');
      }
      return localStorage.getItem(PERF_KEY) === '1';
    } catch {
      return new URLSearchParams(location.search).has('perf');
    }
  }
  let perf = $state(typeof location !== 'undefined' && perfWanted());
  function togglePerf() {
    perf = !perf;
    try {
      if (perf) localStorage.setItem(PERF_KEY, '1');
      else localStorage.removeItem(PERF_KEY);
    } catch {
      /* not kept */
    }
  }
  const perfSources = {
    playing: () => transportClock.playing,
    audio: () => player.audioInfo(),
  };
  const perfMeta = () => ({ version: __APP_VERSION__, piece: { title: title ?? null, graphNodes: graph.nodes.length, cells: program.cells.size } });
  const stale = $derived(!result.ok);


  // The code is the single source of truth: the graph edits it (shift=, off) and reads it back.
  const shifts = $derived(codeShifts(program));
  const muted = $derived(program.off);
  const routed = $derived(routedNodes(program, muted));
  const live = $derived(transportClock.playing ? liveAt(program, shifts, muted, transportClock.seconds) : null);

  // turning a cell whose shift is free(…) moves its free value: the wheel and its slider are one control
  const turn = (name: string, shift: number) => {
    const free = program.cells.get(name)?.frees.find((f) => f.key === 'shift');
    code = free ? setFree(code, free, shift) : setShift(code, name, shift);
  };
  const toggleNode = (id: string) => {
    const name = id.slice('cell:'.length);
    code = setOff(code, name, !program.cells.get(name)?.off);
  };

  // the node editor writes code; a new cell opens in the detail sheet
  let focus = $state<{ name: string; token: number } | null>(null);
  const add = () => {
    const r = addCell(code);
    code = r.source;
    focus = { name: r.name, token: (focus?.token ?? 0) + 1 };
  };

  const rename = (source: string, to: string) => {
    code = source;
    focus = { name: to, token: (focus?.token ?? 0) + 1 };
  };

  let editor: ReturnType<typeof Editor> | undefined = $state();
  // phone: graph and code are two full-size views, switched by tabs
  // the first view: choosing a piece (the library as a graph); then the piece's graph and its code
  let tab = $state<'select' | 'graph' | 'code'>('select');
  // tabs only on narrow screens (matches the CSS breakpoint)
  let narrow = $state(typeof matchMedia === 'function' ? !matchMedia('(min-width: 900px)').matches : false);
  $effect(() => {
    if (typeof matchMedia !== 'function') return;
    const mq = matchMedia('(min-width: 900px)');
    const on = () => (narrow = !mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  });
  const errors = $derived(result.diagnostics.filter((d) => d.severity === 'error').length);

  const showInCode = async (name: string) => {
    tab = 'code';
    await tick(); // the code view has to be visible before it can take focus
    // an unnamed cell lives inside the line it's written on: λ<line>_<column>
    const lambda = /^λ(\d+)_/.exec(name);
    const i = lambda ? +lambda[1] - 1 : declLine(code, name);
    if (i >= 0) editor?.showLine(i + 1);
  };

  const player = new Player();
  $effect(() => player.load(plan(program, shifts, muted)));
  onDestroy(() => player.dispose());

  // where play begins (the time slider), and how far it reaches: the piece, its cycle, or its longest layer
  let cursor = $state(0);
  // (a span of a few seconds at least: DTMF's whole cycle is a tone and a pause — nothing to move in)
  const span = $derived.by(() => {
    const l = program.ok ? mainLength(pieceTime(program)) : null;
    return l !== null && l >= 2 ? l : null;
  });
  const now = $derived(transportClock.playing ? (span ? transportClock.seconds % span : transportClock.seconds) : cursor);
  const clock = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;
  async function seek(to: number) {
    cursor = to;
    if (!transportClock.playing) return;
    player.stop();
    await player.start(to);
  }
  // keep the screen awake while playing (where the browser allows it: Android Chrome does)
  let wake: { release(): Promise<void> } | null = null;
  async function stayAwake(on: boolean) {
    const nav = navigator as Navigator & { wakeLock?: { request(type: 'screen'): Promise<{ release(): Promise<void> }> } };
    try {
      if (on && !wake && nav.wakeLock) wake = await nav.wakeLock.request('screen');
      if (!on && wake) {
        await wake.release();
        wake = null;
      }
    } catch {
      wake = null; // (not allowed now — e.g. the page is hidden; asked again when it's back)
    }
  }
  $effect(() => {
    void stayAwake(transportClock.playing);
  });
  $effect(() => {
    const back = () => {
      if (document.visibilityState === 'visible' && transportClock.playing) {
        wake = null; // (the system let it go while hidden)
        void stayAwake(true);
      }
    };
    document.addEventListener('visibilitychange', back);
    return () => document.removeEventListener('visibilitychange', back);
  });

  // the arrangement's sections (if a selector plays the piece) and the tempo of the meter that drives it
  const pieceSections = $derived(program.ok ? sections(program) : null);
  const mainMeter = $derived(program.ok ? mainTempo(program) : null);
  // reset: reload from the code — what hands did is gone (held free() values, tapes' recordings,
  // reels turned by hand), and it starts again from the start (playing: on from there)
  let epoch = $state(0);
  // anything changed from the initial state? — Reset pulses while so
  let touched = $state(false);
  let played = $state(false);
  const dirty = $derived(held.size > 0 || touched || played || cursor > 0.01 || transportClock.seconds > 0.01);
  async function reset() {
    held = new Map();
    epoch++;
    player.resetState();
    touched = false;
    await seek(0);
    played = transportClock.playing;
  }
  // stopped: a turntable turned by hand moves where play starts
  function nudge(seconds: number) {
    if (transportClock.playing) return;
    cursor = Math.max(0, Math.min(span ?? Infinity, cursor + seconds));
    touched = true;
  }

  async function toggle() {
    // pause: keep the place, and play goes on from there
    if (transportClock.playing) {
      cursor = now;
      return player.stop();
    }
    starting = true;
    try {
      // a piece anchored to the clock (anchor=11.55), started fresh: it plays where the day stands
      const anchor = [...program.cells.values()].find((c) => typeof c.params.anchor === 'number')?.params.anchor as number | undefined;
      if (anchor !== undefined && cursor === 0 && !played && !touched) {
        const d = new Date();
        const now = d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds();
        const at = Math.floor(anchor) * 3600 + Math.round((anchor % 1) * 100) * 60;
        cursor = (((now - at) % 86400) + 86400) % 86400;
      }
      await player.start(cursor);
      played = true;
      sampleRate = player.sampleRate ?? sampleRate;
    } catch (err) {
      console.error('Audio failed to start:', err);
    } finally {
      starting = false;
    }
  }

  // ---- choosing, saving, opening
  let saved = $state<SavedPiece[]>(listSaved());
  const storageOk = storageAvailable();
  let message = $state<string | null>(null);
  // (one function each, the same every time: a card's picture is fetched once)
  const loaders = Object.fromEntries(EXAMPLES.map((e) => [e.key, () => loadExample(e.key)])) as Record<PresetKey, () => Promise<string>>;
  const entries = $derived<Entry[]>([
    ...saved.map((p) => {
      const m = pieceMeta(p.source);
      const r = compileSource(p.source);
      return {
        id: `saved:${p.id}`,
        kind: 'saved' as const,
        title: p.title,
        description: m?.description ?? '',
        tags: canonicalTags(m?.tags ?? []),
        source: p.source,
        saved: p.saved,
        size: buildGraph(r).nodes.filter((n) => !n.petalOf && !n.cell.note).length,
        time: r.ok ? pieceTime(r) : undefined,
      };
    }),
    ...EXAMPLES.map((e) => ({
      id: `example:${e.key}`,
      kind: 'example' as const,
      title: e.title,
      description: e.description,
      tags: e.tags,
      load: loaders[e.key],
      size: e.size,
      time: e.time,
    })),
  ]);
  const currentId = $derived(open.kind === 'example' ? `example:${open.key}` : open.kind === 'saved' ? `saved:${open.id}` : null);
  // the piece last asked for (a card or a file): one still being fetched or read gives way to a later choice
  let choice = 0;
  async function pick(id: string) {
    const mine = ++choice;
    const [kind, key] = [id.slice(0, id.indexOf(':')), id.slice(id.indexOf(':') + 1)];
    if (kind === 'example') {
      let source: string;
      try {
        source = await loadExample(key as PresetKey);
      } catch {
        if (mine === choice) message = 'This piece could not be loaded (offline?).';
        return;
      }
      if (mine !== choice) return;
      open = { kind: 'example', key: key as PresetKey };
      code = source;
    } else {
      const p = saved.find((x) => x.id === key);
      if (!p) return;
      open = { kind: 'saved', id: p.id };
      code = p.source;
    }
    tab = 'graph';
    message = null;
    opened++;
    fresh();
  }
  // a piece just opened starts from rest: transport stopped at 0, nothing sounding, nothing held or
  // touched — whatever was playing (or ringing, or recorded on a tape) is gone. (stop first: it reads the old plan.)
  function fresh() {
    player.stop();
    player.resetState();
    epoch++;
    cursor = 0;
    held = new Map();
    touched = false;
    played = false;
  }
  // render the piece to a WAV (offline: faster than it plays)
  let rendering = $state(false);
  async function renderWav() {
    if (rendering || !result.ok) return;
    rendering = true;
    message = `Rendering ${Math.round(renderLength(result))} s…`;
    try {
      const buf = await renderPiece(result, codeShifts(result));
      const url = URL.createObjectURL(wav(buf));
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName(code).replace(/\.cells$/, '.wav');
      document.body.append(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      const l = loudness(buf);
      message = `Rendered: ${buf.duration.toFixed(0)} s, ${l.rms.toFixed(1)} dB average, peak ${l.peak.toFixed(1)} dB.`;
    } catch (e) {
      message = `Couldn’t render: ${(e as Error).message}`;
    } finally {
      rendering = false;
    }
  }
  // Debug hook, `window.cellStudio` (documented in the README): for measuring from outside —
  // measure(seconds?) renders the open piece and returns {rms, peak, clipped} in dB below full scale;
  // length() is the default render length in seconds; level(name) is a voice's current peak level.
  if (typeof window !== 'undefined')
    (window as unknown as { cellStudio: unknown }).cellStudio = {
      measure: async (seconds?: number) => loudness(await renderPiece(result, codeShifts(result), seconds)),
      length: () => renderLength(result),
      level: (n: string) => {
        const w = player.waveform(n);
        return w ? Math.max(...Array.from(w).map(Math.abs)) : null;
      },
    };
  function saveHere() {
    const r = savePiece(code);
    if ('error' in r) message = r.error;
    else {
      saved = listSaved();
      open = { kind: 'saved', id: r.piece.id };
      message = `Saved “${r.piece.title}” in this browser.`;
    }
  }
  async function openFile(file: File) {
    const mine = ++choice;
    try {
      const text = await readFile(file);
      if (mine !== choice) return;
      code = text;
      open = { kind: 'file', name: file.name };
      opened++;
      fresh();
      tab = 'graph';
      message = null;
    } catch {
      if (mine === choice) message = `Couldn’t read ${file.name}.`;
    }
  }
</script>

<UpdateToast />
{#if perf}
  {#await import('./ui/PerfOverlay.svelte') then m}
    <m.default sources={perfSources} meta={perfMeta} onclose={togglePerf} />
  {/await}
{/if}

<div class="app" class:selecting={tab === 'select'}>
  <header>
    <h1 aria-label="Cell studio">
      {#each [...'Cell studio'] as ch, i}<span style:color={ch === ' ' ? undefined : noteColour((i * 7 * 30) % 360)}>{ch}</span>{/each}
    </h1>
    {#if anyOpen}
    <div class="transport-in">
      <Transport
        {title}
        onchoose={() => (tab = 'select')}
        playing={transportClock.playing}
        {starting}
        {now}
        {span}
        sections={pieceSections}
        tempo={mainMeter ? mainMeter.free : null}
        onplay={toggle}
        onreset={reset}
        {dirty}
        held={held.size > 0}
        onrevert={() => (held = new Map())}
        onsave={keepHeld}
        onmenu={() => (panelOpen = !panelOpen)}
        menuOpen={panelOpen}
        onseek={seek}
        ontempo={(v) => mainMeter && holdFree(mainMeter.free, v)}
      />
    </div>
    {:else}
      <p class="tagline">Music, cell by cell<span>&nbsp;— choose a piece to begin</span></p>
    {/if}
  </header>
  <div class="tabs" role="tablist" aria-label="View">
    <button role="tab" aria-selected={tab === 'select'} class:on={tab === 'select'} onclick={() => (tab = 'select')}>Select</button>
    <button role="tab" aria-selected={tab === 'graph'} class:on={tab === 'graph'} disabled={!anyOpen} onclick={() => (tab = 'graph')}>Graph</button>
    <button role="tab" aria-selected={tab === 'code'} class:on={tab === 'code'} disabled={!anyOpen} onclick={() => (tab = 'code')}>
      Code{#if errors}<span class="badge" aria-label="{errors} errors">{errors}</span>{/if}
    </button>
  </div>

  <section class="canvas" class:away={tab !== 'graph'} inert={narrow && tab !== 'graph'} aria-label="Cell graph">
    <Graph model={graph} {program} {muted} {routed} {live} {shifts} ontoggle={toggleNode} onturn={turn} onshowcode={showInCode} source={code} spectrum={(v) => player.spectrum(v)} note={(v) => player.note(v)} onedit={(s) => (code = s)} onadd={add} onrename={rename} onfree={holdFree} {epoch} tapePos={(t) => player.tapePos(t)} {nudge} {cursor} tapeLevel={(t) => player.tapeLevel(t)} scrub={(t, u) => ((touched = true), player.scrub(t, u))} hand={{ strike: (n, x, i) => ((touched = true), player.strike(n, x, i)), damp: (n, on) => player.damp(n, on), bow: (n, a) => ((touched = true), player.bow(n, a)), resonance: (n) => player.resonance(n), waveform: (n) => player.waveform(n), freqs: (n) => player.freqs(n) }} {opened} {focus} />
    {#if stale}
      <p class="stale">Showing the last version that compiled</p>
    {/if}
  </section>

  {#if panelOpen && anyOpen}
    <aside class="drawer" aria-label="The piece's controls">
      <header><h2>Controls</h2><button class="x" onclick={() => (panelOpen = false)} aria-label="Close">×</button></header>
      <FreePanel {program} onfree={holdFree} />
    </aside>
  {/if}
  <section class="side" class:away={tab !== 'code'} inert={narrow && tab !== 'code'} aria-label="Program">
    <Editor bind:this={editor} bind:value={code} diagnostics={result.diagnostics} />
    <Shorten {code} onapply={(next) => (code = next)} />
  </section>
  <section class="select" class:away={tab !== 'select'} class:front={tab === 'select'} inert={tab !== 'select'} aria-label="Choose a piece">
    <Picker
      {entries}
      current={anyOpen ? currentId : null}
      {storageOk}
      {message}
      onpick={pick}
      onclose={() => (tab = 'graph')}
      embedded
      onsavefile={() => saveFile(code)}
      onopenfile={openFile}
      onsavebrowser={saveHere}
      onrender={renderWav}
      onperf={togglePerf}
      perfOn={perf}
      onremove={(id) => {
        removeSaved(id.slice('saved:'.length));
        saved = listSaved();
      }}
    />
  </section>
</div>

<style>
  /* Phone: header, tabs, and one full-size view — the graph or the code.
     Both stay mounted (the hidden one keeps its size), so switching is instant. */
  .app {
    height: 100%;
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: auto auto minmax(0, 1fr);
    grid-template-areas: 'head' 'tabs' 'view';
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
    background:
      radial-gradient(120% 90% at 50% 40%, color-mix(in oklab, var(--surface) 70%, transparent) 0%, var(--bg) 70%);
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
      grid-template-rows: auto minmax(0, 1fr);
      grid-template-areas: 'head head' 'side canvas';
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
      background-position: 0 0, 200% 0;
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
  .tabs button:disabled {
    color: var(--text-faint);
    cursor: default;
  }
  /* the controls: a drawer on the right */
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
  .drawer header {
    position: sticky;
    top: 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 0 10px;
    background: var(--surface);
    z-index: 1;
  }
  .drawer h2 {
    margin: 0;
    font: 800 16px var(--font-ui);
  }
  .drawer .x {
    all: unset;
    cursor: pointer;
    font-size: 22px;
    padding: 0 6px;
  }
</style>
