<script lang="ts">
  /**
   * The time view (#286; docs/notes/scalogram.md): the piece as a tracker. Time across, from its start to its end,
   * zoomable; frequency up, on the tower's axis (layout/timeview.ts). Each layer at its own height:
   * - the scalogram (engine/time: the notes' wavelet transform) in the slow and the pulse, its periods as frequencies;
   * - the notes at their pitch, and the waterfall (the rendered sound's spectrum) in the audible;
   * - the waveform above, where the sound card is.
   * The sections are lines, the boundaries heard are marks, the playhead a line. Drag to move, wheel or pinch to zoom,
   * a click to play from there, a double click for the whole piece. The scalogram and the waterfall are worked out in
   * a worker (time.worker.ts), only while the view is shown.
   */
  import { untrack } from 'svelte';
  import { getStudio } from './state/studio.svelte';
  import { TimeSettings, type TimeLayers, type TimeSignal } from './state/time.svelte';
  import { eventsBetween, plan, type Played } from '@yggi/cells/engine/realize';
  import { codeShifts } from '@yggi/cells/engine/program';
  import { mainTempo, pieceTime } from '@yggi/cells/engine/duration';
  import { listening } from '@yggi/cells/engine/time/span';
  import { transportClock } from '../audio/clock.svelte';
  import { SIGNALS } from '@yggi/cells/engine/time/signals';
  import { sectionsOver } from '@yggi/cells/engine/time/boundaries';
  import { peaks } from '@yggi/cells/engine/time/spectrogram';
  import { splices } from '@yggi/cells/engine/time/splices';
  import { structure } from '@yggi/cells/engine/time/structure';
  import { follow, frameFor, pan, tOf, xOf, yOf, zoom, type Frame } from '../layout/timeview';
  import {
    cellSpans,
    firstAt,
    foldOnto,
    heardLevelsOf,
    heardMarksOf,
    longestOf,
    meterOf,
    patternsOf,
    shownNotes,
    structureLanes,
    voiceHues,
    type Scalograms,
  } from '../layout/timelayers';
  import { explainLevels, explainMoments, folded, writtenLevels, type Folded } from '../layout/explained';
  import { notePixels, scalogramPixels, waterfallPixels, type Pixels } from '../layout/timepictures';
  import {
    drawCells,
    drawGrid,
    drawHeard,
    drawLevels,
    drawMeter,
    drawNotes,
    drawPatterns,
    drawScalogram,
    drawSections,
    drawSplices,
    drawStructure,
    drawWaterfall,
    drawWaveform,
    drawZones,
  } from './timedraw';
  import { noteColour, noteHsl, TIME } from './theme';
  import { hslToRgb } from '../layout/spectrum';
  import type { TimeAnswer, TimeJob } from './time.worker';

  let { active, ongraph }: { active: boolean; ongraph?: () => void } = $props();

  const { piece, playback } = getStudio();
  const settings = new TimeSettings();
  /** Rendered sound covers at most this much of the piece (s): a day would take hours to render; it is rendered this
   * many seconds at a time, and its waveform kept at so many peaks a second. */
  const MOST_SOUND = 300;
  const STRETCH = 5;
  const PEAKS_PER_SECOND = 200;

  let width = $state(0);
  let height = $state(0);
  let canvas = $state<HTMLCanvasElement>();

  /**
   * How long it is listened to, and how long shown: a piece that ends, the whole of it; a loop is listened to for
   * three rounds (engine/time/span.ts: so what the loop itself does is heard, Phase's drift) and shown as one, its
   * scalogram the rounds folded together (engine/time/wavelet.ts `fold`). At least a few seconds.
   */
  const time = $derived(piece.program.ok ? pieceTime(piece.program) : null);
  const heard = $derived(time ? listening(time) : null);
  const length = $derived(Math.max(4, heard?.cycle ?? heard?.seconds ?? 30));
  /** A loop goes round: its scalogram is transformed circularly, so it has no edges. Without chance every round is the
   * same, so one round, circularly, is all three; with chance the three rounds are listened to and folded together. */
  const loop = $derived((heard?.rounds ?? 1) > 1);
  const rounds = $derived(loop && time?.chance ? (heard?.rounds ?? 1) : 1);
  const listened = $derived(rounds > 1 ? Math.max(4, heard?.seconds ?? 30) : length);
  /** Where the transport is in the cycle shown: the clock's place while playing, else where play starts. */
  const now = $derived((playback.playing ? transportClock.seconds : playback.cursor) % length);
  /** The notes listened to (all the rounds; worked out only while the view is shown). */
  const planned = $derived(active && piece.program.ok ? plan(piece.program, piece.shifts, piece.muted) : null);
  const heardNotes = $derived.by((): Played[] => (planned ? eventsBetween(planned, 0, listened, false, { until: listened }) : []));
  /**
   * The notes shown, by when they start: one round; with chance (no two rounds alike), every round's, folded onto the
   * one, so what varies shows as more than one note in a place.
   */
  const notes = $derived(shownNotes(heardNotes, length, !!time?.chance && rounds > 1));
  /** The longest note shown: the drawing looks this far back for notes still sounding at the view's start. */
  const longest = $derived(longestOf(notes));
  /** Each clocked cell's span on the tower, in seconds: from its step (how often it moves) to its turn. */
  const spans = $derived(active && piece.program.ok ? cellSpans(piece.program, piece.graph) : []);
  /** Each cell where it plays, nested (engine/time/structure.ts): one round, in lanes. */
  const nodes = $derived(planned && settings.layers.structure ? structureLanes(structure(planned, length)) : []);
  /** Where a braid turns to its next spliced cell, heard (engine/time/splices.ts). */
  const spliced = $derived(planned && (settings.layers.splices || settings.layers.heard) ? splices(planned, length) : []);
  /** The patterns: motifs heard at two time scales, and foldings alike at two levels. */
  const patterns = $derived(settings.layers.patterns ? patternsOf(heardNotes, spans, listened, length) : null);
  const written = $derived(sectionsOver(piece.sections ?? [], length).filter((s) => s.at > 0 && s.at < length));
  /** The meter, as periods across the scalogram: the beat, the bar, the sections' usual length. */
  const meter = $derived(meterOf(spans, piece.program.ok ? mainTempo(piece.program)?.cell : undefined, written));

  // (raw: replaced whole, never changed in place; a deep proxy made every read in the drawing loops a tracked one)
  let frame = $state.raw<Frame>(frameFor(30, 1, 1));
  // a new piece or length: all of it in view; a new size: the same stretch, resized
  $effect(() => {
    const w = length;
    untrack(() => (frame = frameFor(w, frame.width, frame.height)));
  });
  $effect(() => {
    const [w, h] = [width, height];
    untrack(() => (frame = { ...frame, width: w, height: h }));
  });
  // playing: the view pages on with the playhead
  $effect(() => {
    if (!playback.playing || !active) return;
    const at = now;
    untrack(() => (frame = follow(frame, at, length)));
  });

  // ── the worker's answers ──────────────────────────────────────────────────────────────────────────────────────
  /** The scalograms as listened to (every round), and folded onto the round shown. */
  let listenedScal = $state.raw<Scalograms | null>(null);
  const scal = $derived(listenedScal ? foldOnto(listenedScal, length) : null);
  /**
   * What is heard against what is written (layout/explained.ts, #416), both ways: the levels the scalogram hears
   * against the cells' steps and turns and the meter, within the periods it can hear; the boundaries heard against the
   * sections and splices written.
   */
  const levels = $derived(
    scal ? explainLevels(heardLevelsOf(scal, settings.signal, listenedScal?.periodic), writtenLevels(meter, spans), [scal.periods[0] ?? 0, scal.window / 6]) : null,
  );
  /** The waterfall, and whose each band of it is (`owner`: an index in `voices` + 1, 0 no note's). */
  let fall = $state.raw<{ freqs: readonly number[]; times: readonly number[]; rows: Float32Array[]; owner: Uint8Array; voices: readonly string[]; seconds: number } | null>(null);
  let wave = $state.raw<{ peaks: Float32Array; seconds: number; done: number } | null>(null);
  /** What the worker or the render is doing, if anything: the scalogram's, and the sound's. */
  let working = $state(false);
  let sounding = $state<string | null>(null);
  const busy = $derived(sounding ?? (working ? 'listening' : null));
  let worker: Worker | null = null;
  const job = (j: TimeJob, transfer: ArrayBuffer[] = []) =>
    new Promise<TimeAnswer>((resolve, reject) => {
      worker?.terminate();
      const w = new Worker(new URL('./time.worker.ts', import.meta.url), { type: 'module' });
      worker = w;
      w.onmessage = (e: MessageEvent<TimeAnswer>) => {
        if (worker === w) worker = null;
        w.terminate();
        resolve(e.data);
      };
      w.onerror = (e) => reject(e);
      w.postMessage(j, transfer);
    });
  $effect(() => () => worker?.terminate());

  // the scalogram: once the notes have been still for a moment
  $effect(() => {
    if (!active || !settings.layers.scalogram) return;
    const [events, window] = [heardNotes, listened];
    const onsets = events.map((e) => ({ at: e.at, dur: e.dur, voice: e.voice, freq: e.freq, gains: e.gains }));
    const timer = setTimeout(async () => {
      working = true;
      try {
        const a = await job({ kind: 'scalogram', window, events: onsets, signals: SIGNALS, periodic: loop });
        if (a.kind === 'scalogram') listenedScal = { window: a.window, periods: a.periods, rows: a.rows, periodic: loop };
      } catch {
        // (ended for a newer job)
      } finally {
        working = false;
      }
    }, 400);
    return () => clearTimeout(timer);
  });

  // the sound (waveform, waterfall): rendered offline a stretch at a time (a render's cost grows faster than its
  // length), the waveform filling in as it comes, the waterfall once it's all there; only when one of them is on
  $effect(() => {
    if (!active || !(settings.layers.waveform || settings.layers.waterfall) || !piece.program.ok) return;
    const [program, muted, seconds] = [piece.program, new Set(piece.muted), Math.min(length, MOST_SOUND)];
    let gone = false;
    const timer = setTimeout(async () => {
      sounding = 'rendering';
      try {
        const { renderStretch } = await import('../audio/render');
        const shifts = codeShifts(program);
        let mono: Float32Array | null = null;
        let rate = 0;
        const columns = Math.max(1, Math.round(seconds * PEAKS_PER_SECOND));
        const all = new Float32Array(2 * columns);
        for (let from = 0; from < seconds && !gone; from += STRETCH) {
          const len = Math.min(STRETCH, seconds - from);
          const buffer = await renderStretch(program, shifts, from, len, muted);
          if (gone) return;
          rate = buffer.sampleRate;
          mono ??= new Float32Array(Math.round(seconds * rate));
          const left = buffer.getChannelData(0);
          const right = buffer.numberOfChannels > 1 ? buffer.getChannelData(1) : left;
          const at = Math.round(from * rate);
          const n = Math.min(Math.round(len * rate), mono.length - at, left.length);
          for (let i = 0; i < n; i++) mono[at + i] = 0.5 * (left[i] + right[i]);
          all.set(peaks(mono.subarray(at, at + n), Math.round(len * PEAKS_PER_SECOND)), 2 * Math.round(from * PEAKS_PER_SECOND));
          wave = { peaks: all, seconds, done: from + len };
        }
        if (gone || !mono) return;
        sounding = 'listening';
        // (the notes as rendered, at the code's tempo: whose each band of the waterfall is)
        const sounded = eventsBetween(plan(program, shifts, muted), 0, seconds, false, { until: seconds }).map((e) => ({
          at: e.at,
          dur: e.dur,
          freq: e.freq,
          voice: e.voice,
          gains: e.gains,
        }));
        const names = [...new Set(sounded.map((e) => e.voice))];
        const a = await job({ kind: 'waterfall', samples: mono, rate, notes: sounded, voices: names }, [mono.buffer as ArrayBuffer]);
        if (!gone && a.kind === 'waterfall') fall = { freqs: a.freqs, times: a.times, rows: a.rows, owner: a.owner, voices: names, seconds };
      } catch {
        // (no audio here, or ended for a newer job)
      } finally {
        if (!gone) sounding = null;
      }
    }, 600);
    return () => {
      gone = true;
      clearTimeout(timer);
    };
  });

  // ── pictures of the whole length, drawn once and cropped for the view ────────────────────────────────────────
  const toBitmap = (px: Pixels | null) => {
    if (!px) return null;
    const c = new OffscreenCanvas(px.width, px.height);
    c.getContext('2d')!.putImageData(new ImageData(px.data, px.width, px.height), 0, 0);
    return c;
  };
  const scalBitmap = $derived(toBitmap(scal ? scalogramPixels(scal, settings.signal, TIME) : null));
  /** The waterfall, each band in the colour of the voice whose it is (the piano roll's), as bright as it is loud; a
   * band no note explains (a drum, noise, an effect's tail) grey. */
  const fallBitmap = $derived(toBitmap(fall ? waterfallPixels(fall, [TIME.unowned, ...fall.voices.map((v) => voices.get(v)?.rgb ?? TIME.unowned)], TIME.unowned) : null));

  /** The boundaries heard (layout/timelayers.ts): over every round, folded onto the one shown. */
  const heardMarks = $derived(listenedScal ? heardMarksOf(listenedScal, written, rounds, length) : []);
  const moments = $derived(
    explainMoments(
      heardMarks,
      [...written.map((s) => ({ at: s.at, kind: 'section' as const, label: s.label })), ...spliced.map((s) => ({ at: s.at, kind: 'splice' as const }))],
      Math.max(1, length / 200),
    ),
  );
  /** How folded each axis is, for the toolbar: what is heard that the cells explain, what is written that is heard. */
  const foldedText = (name: string, f: Folded) => `${name} ${f.explained}/${f.heard} explained · ${f.heardOf}/${f.written} heard`;

  // ── drawing ──────────────────────────────────────────────────────────────────────────────────────────────────
  /** The theme's colours, read once a draw (getComputedStyle each time is slow). */
  let style: Map<string, string> = new Map();
  const css = (name: string) => {
    let v = style.get(name);
    if (v === undefined) style.set(name, (v = canvas ? getComputedStyle(canvas).getPropertyValue(name).trim() : ''));
    return v;
  };
  /** A colour a voice (the piano roll's and the waterfall's alike): its hue, its CSS colour and its RGB. */
  const voices = $derived(
    new Map(
      [...voiceHues(heardNotes)].map(([n, hue]) => {
        const [h, sat, l] = noteHsl(hue);
        return [n, { hue, css: noteColour(hue), rgb: hslToRgb(h, sat / 100, l / 100) }] as const;
      }),
    ),
  );
  /** Notes drawn one by one up to this many in view; more, as pixels (a day's piece zoomed out has 280 000). */
  const ONE_BY_ONE = 4000;
  let dots: OffscreenCanvas | null = null;
  $effect(() => {
    const f = frame;
    const layers: TimeLayers = settings.layers;
    const [sb, fb, w, n, ws, hd, sp, cs, pt, vs, back, mt, lv, st] = [
      scalBitmap,
      fallBitmap,
      wave,
      notes,
      written,
      moments,
      spliced,
      spans,
      patterns,
      voices,
      longest,
      meter,
      levels,
      nodes,
    ];
    if (!canvas || f.width < 2 || f.height < 2) return;
    style = new Map();
    const dpr = window.devicePixelRatio || 1;
    // (resized only when the size changes: setting it clears and reallocates the canvas)
    if (canvas.width !== Math.round(f.width * dpr) || canvas.height !== Math.round(f.height * dpr)) {
      canvas.width = Math.round(f.width * dpr);
      canvas.height = Math.round(f.height * dpr);
    }
    const g = canvas.getContext('2d')!;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawZones(g, f, css);
    g.imageSmoothingEnabled = false;
    if (layers.scalogram && sb && scal) drawScalogram(g, f, css, sb, scal, loop);
    if (layers.waterfall && fb && fall) drawWaterfall(g, f, fb, fall);
    if (layers.waveform && w) drawWaveform(g, f, css, w, PEAKS_PER_SECOND);
    g.imageSmoothingEnabled = true;
    if (layers.structure && st.length) drawStructure(g, f, st);
    // the notes: at their pitch, a semitone high, a colour a voice
    if (layers.notes) {
      const semi = Math.max(1.5, yOf(f, 440) - yOf(f, 440 * Math.pow(2, 1 / 12)));
      // (only those in view: from the first that could still sound at its start, to the last that starts in it)
      const a = firstAt(n, f.from - back);
      const b = firstAt(n, f.to);
      if (b - a <= ONE_BY_ONE) drawNotes(g, f, n, a, b, semi, (v) => vs.get(v)?.css ?? '');
      else {
        // (as pixels: each note's columns and rows written into one picture, then laid over the rest)
        const [W, H] = [Math.ceil(f.width), Math.ceil(f.height)];
        if (!dots || dots.width !== W || dots.height !== H) dots = new OffscreenCanvas(W, H);
        const px = notePixels(n, a, b, f, W, H, semi, (v) => vs.get(v)?.rgb ?? [200, 200, 200]);
        dots.getContext('2d')!.putImageData(new ImageData(px.data, W, H), 0, 0);
        g.drawImage(dots, 0, 0, W, H);
      }
    }
    drawGrid(g, f, css);
    if (layers.meter && layers.scalogram && scal) drawMeter(g, f, css, scal, mt);
    if (layers.sections) drawSections(g, f, css, ws);
    if (layers.heard) drawHeard(g, f, css, hd);
    if (layers.splices) drawSplices(g, f, css, sp);
    if (layers.cells) drawCells(g, f, css, cs);
    if (pt) drawPatterns(g, f, css, pt);
    if (layers.meter && layers.scalogram && scal && lv) drawLevels(g, f, css, scal, lv);
  });

  // ── hands: drag to move, wheel or pinch to zoom, a click to play from there ──────────────────────────────────
  const pointers = new Map<number, number>();
  let dragFrom: { x: number; frame: Frame; moved: boolean } | null = null;
  let pinchFrom: { d: number; frame: Frame; at: number } | null = null;
  const local = (e: PointerEvent | WheelEvent | MouseEvent) => e.clientX - (canvas?.getBoundingClientRect().left ?? 0);
  function down(e: PointerEvent) {
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, local(e));
    if (pointers.size === 1) dragFrom = { x: local(e), frame, moved: false };
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      pinchFrom = { d: Math.abs(a - b) || 1, frame, at: tOf(frame, (a + b) / 2) };
      dragFrom = null;
    }
  }
  function move(e: PointerEvent) {
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, local(e));
    if (pinchFrom && pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      frame = zoom(pinchFrom.frame, pinchFrom.at, pinchFrom.d / (Math.abs(a - b) || 1), length);
    } else if (dragFrom) {
      const dx = local(e) - dragFrom.x;
      if (Math.abs(dx) > 4) dragFrom.moved = true;
      if (dragFrom.moved) frame = pan(dragFrom.frame, (-dx / frame.width) * (dragFrom.frame.to - dragFrom.frame.from), length);
    }
  }
  function up(e: PointerEvent) {
    pointers.delete(e.pointerId);
    // (a loop's later rounds play from the same place in its cycle)
    if (dragFrom && !dragFrom.moved && pointers.size === 0) {
      const t = Math.max(0, Math.min(length, tOf(frame, local(e))));
      void playback.seek(heard?.cycle ? t % heard.cycle : t);
    }
    if (pointers.size < 2) pinchFrom = null;
    if (pointers.size === 0) dragFrom = null;
  }
  function wheel(e: WheelEvent) {
    e.preventDefault();
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) frame = pan(frame, (e.deltaX / frame.width) * (frame.to - frame.from), length);
    else frame = zoom(frame, tOf(frame, local(e)), Math.exp(e.deltaY * 0.002), length);
  }
  const fit = () => (frame = frameFor(length, frame.width, frame.height));
  const cursorX = $derived(xOf(frame, now));

  const LAYERS: { key: keyof TimeLayers; label: string; title: string }[] = [
    { key: 'scalogram', label: 'scalogram', title: 'The notes’ wavelet transform: which time scales are loud, when' },
    { key: 'notes', label: 'notes', title: 'The notes, at their pitch' },
    { key: 'waterfall', label: 'waterfall', title: 'The sound’s spectrum over time, each band in its voice’s colour (rendered: the first five minutes at most)' },
    { key: 'waveform', label: 'waveform', title: 'The sound itself, at the top (rendered: the first five minutes at most)' },
    { key: 'sections', label: 'sections', title: 'The sections the code writes' },
    { key: 'heard', label: 'heard', title: 'Boundaries heard in the scalogram: white on a section, teal on a splice, orange on neither; a section not heard hollow' },
    { key: 'splices', label: 'splices', title: 'Where a braid turns to its next spliced cell (&tune &a &b …)' },
    { key: 'cells', label: 'cells', title: 'Each cell’s span on the tower, from its step to its turn, at the left' },
    {
      key: 'structure',
      label: 'structure',
      title: 'Each cell where it plays, at the height of its own length: the splice tree by scale, over the scalogram (a copy, base=, dashed in its base’s colour)',
    },
    {
      key: 'meter',
      label: 'meter',
      title:
        'The beat, the bar and the sections’ length across the scalogram; at the right, the levels written against those heard, joined where they meet, alone where they don’t',
    },
    { key: 'patterns', label: 'patterns', title: 'Motifs heard at two time scales, boxed; foldings alike at two levels, listed' },
  ];
  const SIGNAL_LABEL: Record<TimeSignal, string> = {
    mix: 'breaks · entries · density',
    impulses: 'every note',
    envelope: 'breaks (sound against silence)',
    voices: 'density (each voice)',
    change: 'entries (new pitches)',
    harmony: 'keys (new pitch classes)',
  };
</script>

<div class="time">
  <div class="toolbar">
    {#if ongraph}<button class="toggle" onclick={ongraph} title="Back to the graph">graph</button>{/if}
    {#each LAYERS as l (l.key)}
      <button class="toggle" class:on={settings.layers[l.key]} aria-pressed={settings.layers[l.key]} title={l.title} onclick={() => settings.toggle(l.key)}>{l.label}</button>
    {/each}
    {#if settings.layers.scalogram}
      <select bind:value={settings.signal} title="What the scalogram listens to">
        {#each ['mix', ...SIGNALS] as s (s)}<option value={s}>{SIGNAL_LABEL[s as TimeSignal]}</option>{/each}
      </select>
    {/if}
    <button class="toggle" onclick={fit} title="The whole piece (or a double click)">fit</button>
    {#if busy}<span class="busy">{busy}…</span>{/if}
    {#if levels && settings.layers.meter}
      <span class="folded" title="Levels (time scales): those heard that the cells explain · those written that are heard. A folded piece: all of both"
        >{foldedText('levels', folded(levels))}</span
      >
    {/if}
    {#if settings.layers.heard && heardMarks.length}
      <span class="folded" title="Moments: boundaries heard that a section or splice explains · sections written that are heard">{foldedText('moments', folded(moments))}</span>
    {/if}
    {#if settings.layers.waterfall && fall}
      <p class="legend voices" title="The waterfall's colours: each band the voice whose note sounds there">
        {#each fall.voices as v (v)}<span style:--c={voices.get(v)?.css}>{v}</span>{/each}
        <span style:--c="rgb({TIME.unowned.join(' ')})">no note</span>
      </p>
    {/if}
  </div>
  <div class="plot" bind:clientWidth={width} bind:clientHeight={height}>
    <canvas
      bind:this={canvas}
      style:width="{width}px"
      style:height="{height}px"
      onpointerdown={down}
      onpointermove={move}
      onpointerup={up}
      onpointercancel={up}
      onwheel={wheel}
      ondblclick={fit}
      aria-label="The piece in time: frequency up, time across"
    ></canvas>
    <div class="cursor" style:transform="translateX({cursorX}px)" class:out={cursorX < 0 || cursorX > width}></div>
    {#if settings.layers.scalogram && settings.signal === 'mix'}
      <p class="legend">
        <span style:--c="rgb({TIME.mix.envelope.join(' ')})">breaks</span>
        <span style:--c="rgb({TIME.mix.change.join(' ')})">entries</span>
        <span style:--c="rgb({TIME.mix.voices.join(' ')})">density</span>
        <span class="all">all three</span>
      </p>
    {/if}
  </div>
</div>

<style>
  .time {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background: var(--time-face);
  }
  /* the plot under the toolbar, so the card's octave at its top shows */
  .plot {
    position: relative;
    flex: 1;
    min-height: 0;
    overflow: hidden;
    touch-action: none;
  }
  canvas {
    display: block;
    cursor: crosshair;
  }
  .cursor {
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    width: 2px;
    margin-left: -1px;
    background: var(--wheel-hand);
    box-shadow: 0 0 0 1px var(--wheel-hand-edge);
    pointer-events: none;
  }
  .cursor.out {
    display: none;
  }
  .toolbar {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
    align-items: center;
    padding: var(--space-2);
    border-bottom: 1px solid var(--line);
  }
  .toggle,
  select {
    min-height: 32px;
    padding: 0 12px;
    border-radius: var(--radius-pill);
    border: 1px solid var(--line);
    background: var(--surface);
    color: var(--text-muted);
    font: 600 var(--text-sm) var(--font-ui);
    cursor: pointer;
  }
  .toggle.on {
    color: var(--text);
    border-color: var(--accent);
  }
  .busy,
  .folded {
    color: var(--text-muted);
    font: 500 var(--text-sm) var(--font-ui);
  }
  .legend {
    position: absolute;
    right: var(--space-3);
    bottom: 22px;
    margin: 0;
    display: flex;
    gap: var(--space-3);
    color: var(--time-ink);
    font: 500 var(--text-sm) var(--font-ui);
    pointer-events: none;
  }
  .legend span::before {
    content: '';
    display: inline-block;
    width: 10px;
    height: 10px;
    margin-right: 5px;
    border-radius: 2px;
    background: var(--c);
  }
  /* the waterfall's colours, a line of the toolbar */
  .legend.voices {
    position: static;
    flex-basis: 100%;
    flex-wrap: wrap;
  }
  .legend .all::before {
    background: var(--time-ink);
  }
</style>
