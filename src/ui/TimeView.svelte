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
  import { eventsBetween, plan, type Played } from '../engine/realize';
  import { codeShifts } from '../engine/program';
  import { mainLength, pieceTime } from '../engine/duration';
  import { SIGNALS, type Signal } from '../engine/time/signals';
  import { reach, type Scalogram } from '../engine/time/wavelet';
  import { sectionsOver, swells, cones, type Boundary } from '../engine/time/boundaries';
  import { peaks } from '../engine/time/spectrogram';
  import { CARD, follow, frameFor, freqTicks, pan, tOf, timeTicks, xOf, yOf, zones, zoom, type Frame } from '../layout/timeview';
  import { noteColour, TIME } from './theme';
  import type { TimeAnswer, TimeJob } from './time.worker';

  let { active, ongraph }: { active: boolean; ongraph?: () => void } = $props();

  const { piece, playback } = getStudio();
  const settings = new TimeSettings();
  /** Rendered sound covers at most this much of the piece (s): a day would take hours to render; it is rendered this
   * many seconds at a time, and its waveform kept at so many peaks a second. */
  const MOST_SOUND = 300;
  const STRETCH = 10;
  const PEAKS_PER_SECOND = 200;

  let width = $state(0);
  let height = $state(0);
  let canvas = $state<HTMLCanvasElement>();

  /** The piece's length as the transport has it: the whole piece, or one cycle; at least a few seconds. */
  const length = $derived.by(() => {
    if (!piece.program.ok) return 30;
    return playback.span ?? Math.max(4, Math.min(mainLength(pieceTime(piece.program)) ?? 30, 86400));
  });
  /** Its notes over that length (worked out only while the view is shown). */
  const notes = $derived.by((): Played[] => (active && piece.program.ok ? eventsBetween(plan(piece.program, piece.shifts, piece.muted), 0, length) : []));
  const written = $derived(sectionsOver(piece.sections ?? [], length).filter((s) => s.at > 0 && s.at < length));

  let frame = $state<Frame>(frameFor(30, 1, 1));
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
    const now = playback.now;
    untrack(() => (frame = follow(frame, now, length)));
  });

  // ── the worker's answers ──────────────────────────────────────────────────────────────────────────────────────
  let scal = $state.raw<{ window: number; periods: readonly number[]; rows: Partial<Record<Signal, Float32Array[]>> } | null>(null);
  let fall = $state.raw<{ freqs: readonly number[]; times: readonly number[]; rows: Float32Array[]; seconds: number } | null>(null);
  let wave = $state.raw<{ peaks: Float32Array; seconds: number; done: number } | null>(null);
  /** What the worker or the render is doing, if anything: the scalogram's, and the sound's. */
  let listening = $state(false);
  let sounding = $state<string | null>(null);
  const busy = $derived(sounding ?? (listening ? 'listening' : null));
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
    const [events, window] = [notes, length];
    const onsets = events.map((e) => ({ at: e.at, dur: e.dur, voice: e.voice, freq: e.freq, gains: e.gains }));
    const timer = setTimeout(async () => {
      listening = true;
      try {
        const a = await job({ kind: 'scalogram', window, events: onsets, signals: SIGNALS });
        if (a.kind === 'scalogram') scal = { window: a.window, periods: a.periods, rows: a.rows };
      } catch {
        // (ended for a newer job)
      } finally {
        listening = false;
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
        const a = await job({ kind: 'waterfall', samples: mono, rate }, [mono.buffer as ArrayBuffer]);
        if (!gone && a.kind === 'waterfall') fall = { freqs: a.freqs, times: a.times, rows: a.rows, seconds };
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
  /** A ramp colour for t in [0, 1]. */
  const ramp = (t: number): readonly [number, number, number] => {
    const stops = TIME.ramp;
    const x = Math.max(0, Math.min(1, t)) * (stops.length - 1);
    const i = Math.min(stops.length - 2, Math.floor(x));
    const f = x - i;
    return [0, 1, 2].map((k) => Math.round(stops[i][k] + (stops[i + 1][k] - stops[i][k]) * f)) as [number, number, number];
  };
  /** Each row against its mean (dB), as the probe does: where a level is louder than usual. */
  const relative = (rows: readonly Float32Array[]) =>
    rows.map((r) => {
      const mean = r.reduce((a, v) => a + v, 0) / (r.length || 1) || 1;
      return r.map((v) => 10 * Math.log10(Math.max(1e-30, v / mean)));
    });
  const scalImage = $derived.by(() => {
    if (!scal) return null;
    const mode: TimeSignal = settings.signal;
    const chosen = mode === 'mix' ? (['envelope', 'change', 'voices'] as const) : [mode];
    const dbs = chosen.map((s) => relative(scal!.rows[s] ?? []));
    const rows = scal.periods.length;
    const cols = dbs[0]?.[0]?.length ?? 0;
    if (!rows || !cols) return null;
    const img = new ImageData(cols, rows);
    for (let i = 0; i < rows; i++)
      for (let c = 0; c < cols; c++) {
        const k = (i * cols + c) * 4;
        let rgb: readonly number[];
        if (mode === 'mix') {
          const acc = [0, 0, 0];
          (['envelope', 'change', 'voices'] as const).forEach((s, j) => {
            const t = Math.max(0, Math.min(1, dbs[j][i][c] / 10));
            for (let ch = 0; ch < 3; ch++) acc[ch] += TIME.mix[s][ch] * t;
          });
          rgb = acc;
        } else rgb = ramp(0.5 + dbs[0][i][c] / 20);
        img.data[k] = Math.min(255, rgb[0]);
        img.data[k + 1] = Math.min(255, rgb[1]);
        img.data[k + 2] = Math.min(255, rgb[2]);
        img.data[k + 3] = 255;
      }
    return { img, rows, cols };
  });
  const fallImage = $derived.by(() => {
    if (!fall) return null;
    const bands = fall.freqs.length;
    const cols = fall.times.length;
    let top = -Infinity;
    for (const r of fall.rows) for (const v of r) top = Math.max(top, v);
    const img = new ImageData(cols, bands);
    // (band 0 the lowest: at the bottom)
    for (let b = 0; b < bands; b++)
      for (let c = 0; c < cols; c++) {
        const [r, g, bl] = ramp(1 + (fall.rows[b][c] - top) / 70);
        const k = ((bands - 1 - b) * cols + c) * 4;
        img.data[k] = r;
        img.data[k + 1] = g;
        img.data[k + 2] = bl;
        img.data[k + 3] = 255;
      }
    return { img, bands, cols };
  });
  const toBitmap = (img: ImageData | undefined) => {
    if (!img) return null;
    const c = new OffscreenCanvas(img.width, img.height);
    c.getContext('2d')!.putImageData(img, 0, 0);
    return c;
  };
  const scalBitmap = $derived(toBitmap(scalImage?.img));
  const fallBitmap = $derived(toBitmap(fallImage?.img));

  /** The boundaries heard: swells of the three signals at the sections' scale; with no sections, the cones of change. */
  const heard = $derived.by((): Boundary[] => {
    if (!scal) return [];
    const s = (k: Signal): Scalogram => ({ window: scal!.window, periods: scal!.periods, rows: scal!.rows[k] ?? [] });
    if (written.length >= 2) {
      const gaps = written
        .slice(1)
        .map((b, i) => b.at - written[i].at)
        .sort((a, b) => a - b);
      return swells([s('envelope'), s('change'), s('voices')], gaps[Math.floor(gaps.length / 2)]).slice(0, 2 * written.length);
    }
    return cones(s('change')).slice(0, 12);
  });

  // ── drawing ──────────────────────────────────────────────────────────────────────────────────────────────────
  const css = (name: string) => (canvas ? getComputedStyle(canvas).getPropertyValue(name).trim() : '');
  const voiceHue = $derived.by(() => {
    const names = [...new Set(notes.map((e) => e.voice))];
    return new Map(names.map((n, i) => [n, (i * 137) % 360]));
  });
  $effect(() => {
    const f = frame;
    const layers: TimeLayers = settings.layers;
    const [sb, fb, w, n, ws, hd] = [scalBitmap, fallBitmap, wave, notes, written, heard];
    if (!canvas || f.width < 2 || f.height < 2) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(f.width * dpr);
    canvas.height = Math.round(f.height * dpr);
    const g = canvas.getContext('2d')!;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.fillStyle = css('--time-face');
    g.fillRect(0, 0, f.width, f.height);
    // the zones, banded
    zones(f).forEach((z, i) => {
      if (i % 2) return;
      g.fillStyle = css('--time-zone');
      g.fillRect(0, yOf(f, z.hi), f.width, yOf(f, z.lo) - yOf(f, z.hi));
    });
    g.imageSmoothingEnabled = false;
    // the scalogram: its rows evenly spaced on the log axis, so the picture crops and stretches straight
    if (layers.scalogram && sb && scal) {
      const p = scal.periods;
      const sx = (f.from / scal.window) * sb.width;
      const sw = ((f.to - f.from) / scal.window) * sb.width;
      const top = yOf(f, 1 / p[0]);
      const bottom = yOf(f, 1 / p[p.length - 1]);
      const half = (bottom - top) / Math.max(1, p.length - 1) / 2;
      g.drawImage(sb, sx, 0, sw, sb.height, 0, top - half, f.width, bottom - top + 2 * half);
      // (veiled where the window's edges reach: twice the wavelet's e-folding time from the start and the end)
      g.fillStyle = css('--time-veil');
      for (const side of [0, 1]) {
        g.beginPath();
        g.moveTo(xOf(f, side * scal.window), top - half);
        for (const q of p) g.lineTo(xOf(f, side ? scal.window * (1 - reach(q, scal.window, 2)) : scal.window * reach(q, scal.window, 2)), yOf(f, 1 / q));
        g.lineTo(xOf(f, side * scal.window), bottom + half);
        g.fill();
      }
    }
    // the waterfall: in the audible, as far as the sound was rendered
    if (layers.waterfall && fb && fall) {
      const lo = fall.freqs[0];
      const hi = fall.freqs[fall.freqs.length - 1];
      const to = Math.min(f.to, fall.seconds);
      if (to > f.from) {
        const sx = (f.from / fall.seconds) * fb.width;
        const sw = ((to - f.from) / fall.seconds) * fb.width;
        g.globalAlpha = 0.85;
        g.drawImage(fb, sx, 0, sw, fb.height, 0, yOf(f, hi), xOf(f, to), yOf(f, lo) - yOf(f, hi));
        g.globalAlpha = 1;
      }
    }
    // the waveform: in the card's octave, as far as the sound was rendered
    if (layers.waveform && w) {
      const mid = (yOf(f, CARD) + yOf(f, f.hi)) / 2;
      const amp = (yOf(f, CARD) - yOf(f, f.hi)) / 2;
      const per = PEAKS_PER_SECOND;
      g.fillStyle = css('--time-ink');
      for (let x = 0; x < f.width; x++) {
        const a = Math.floor(tOf(f, x) * per);
        const b = Math.max(a + 1, Math.floor(tOf(f, x + 1) * per));
        if (a >= w.done * per) break;
        let lo = 0;
        let hi = 0;
        for (let k = a; k < b && 2 * k + 1 < w.peaks.length; k++) {
          lo = Math.min(lo, w.peaks[2 * k]);
          hi = Math.max(hi, w.peaks[2 * k + 1]);
        }
        g.fillRect(x, mid - hi * amp, 1, Math.max(1, (hi - lo) * amp));
      }
    }
    g.imageSmoothingEnabled = true;
    // the notes: at their pitch, a semitone high, a colour a voice
    if (layers.notes) {
      const semi = Math.max(1.5, yOf(f, 440) - yOf(f, 440 * Math.pow(2, 1 / 12)));
      for (const e of n) {
        if (e.at + e.dur < f.from || e.at > f.to || !(e.freq > 0)) continue;
        g.fillStyle = noteColour(voiceHue.get(e.voice) ?? 0);
        const x = xOf(f, e.at);
        g.fillRect(x, yOf(f, e.freq) - semi / 2, Math.max(1, xOf(f, e.at + e.dur) - x), semi);
      }
    }
    // the grid: the tower's marks and its zones' names at the left, time's marks at the bottom
    g.font = '11px system-ui, sans-serif';
    g.fillStyle = css('--time-grid');
    for (const t of freqTicks(f)) g.fillRect(0, Math.round(yOf(f, t.hz)), f.width, 1);
    for (const t of timeTicks(f)) g.fillRect(Math.round(xOf(f, t.at)), 0, 1, f.height);
    g.fillStyle = css('--time-ink');
    for (const t of freqTicks(f)) g.fillText(t.label, 6, yOf(f, t.hz) - 3);
    for (const t of timeTicks(f)) g.fillText(t.label, xOf(f, t.at) + 3, f.height - 6);
    g.textAlign = 'right';
    for (const z of zones(f)) if (yOf(f, z.lo) - yOf(f, z.hi) > 16) g.fillText(z.name, f.width - 8, yOf(f, z.hi) + 14);
    g.textAlign = 'left';
    // the sections written, and the boundaries heard
    if (layers.sections) {
      g.fillStyle = css('--time-section');
      for (const s of ws) {
        if (s.at < f.from || s.at > f.to) continue;
        const x = Math.round(xOf(f, s.at));
        g.fillRect(x, 0, 1, f.height);
        g.fillText(s.label.slice(0, 16), x + 3, yOf(f, CARD) + 14);
      }
    }
    if (layers.heard) {
      const y = yOf(f, 20);
      for (const b of hd) {
        if (b.at < f.from || b.at > f.to) continue;
        const x = xOf(f, b.at);
        const on = ws.some((s) => Math.abs(s.at - b.at) <= Math.max(1, (f.to - f.from) / 200));
        g.fillStyle = on ? css('--time-section') : css('--time-heard');
        g.beginPath();
        g.moveTo(x, y - 9);
        g.lineTo(x - 5, y);
        g.lineTo(x + 5, y);
        g.fill();
      }
    }
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
    if (dragFrom && !dragFrom.moved && pointers.size === 0) void playback.seek(Math.max(0, Math.min(length, tOf(frame, local(e)))));
    if (pointers.size < 2) pinchFrom = null;
    if (pointers.size === 0) dragFrom = null;
  }
  function wheel(e: WheelEvent) {
    e.preventDefault();
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) frame = pan(frame, (e.deltaX / frame.width) * (frame.to - frame.from), length);
    else frame = zoom(frame, tOf(frame, local(e)), Math.exp(e.deltaY * 0.002), length);
  }
  const fit = () => (frame = frameFor(length, frame.width, frame.height));
  const cursorX = $derived(xOf(frame, playback.now));

  const LAYERS: { key: keyof TimeLayers; label: string; title: string }[] = [
    { key: 'scalogram', label: 'scalogram', title: 'The notes’ wavelet transform: which time scales are loud, when' },
    { key: 'notes', label: 'notes', title: 'The notes, at their pitch' },
    { key: 'waterfall', label: 'waterfall', title: 'The sound’s spectrum over time (rendered: the first five minutes at most)' },
    { key: 'waveform', label: 'waveform', title: 'The sound itself, at the top (rendered: the first five minutes at most)' },
    { key: 'sections', label: 'sections', title: 'The sections the code writes' },
    { key: 'heard', label: 'heard', title: 'Boundaries heard in the scalogram: white on a section, orange on none' },
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
  .busy {
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
  .legend .all::before {
    background: var(--time-ink);
  }
</style>
