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
  import { mainTempo, pieceTime } from '../engine/duration';
  import { listening } from '../engine/time/span';
  import { transportClock } from '../audio/clock.svelte';
  import { SIGNALS, type Signal } from '../engine/time/signals';
  import { fold, reach, ridges, type Scalogram } from '../engine/time/wavelet';
  import { sectionsOver, swells, cones, type Boundary } from '../engine/time/boundaries';
  import { peaks } from '../engine/time/spectrogram';
  import { splices } from '../engine/time/splices';
  import { motifs, multiscale } from '../engine/time/motifs';
  import { alike, foldings, levelsOf, pulseOf } from '../engine/time/necklace';
  import { towerSpans } from '../layout/tower';
  import { CARD, follow, frameFor, freqTicks, pan, tOf, timeTicks, xOf, yOf, zones, zoom, type Frame } from '../layout/timeview';
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
  const heardNotes = $derived.by((): Played[] => (planned ? eventsBetween(planned, 0, listened) : []));
  /**
   * The notes shown, by when they start: one round; with chance (no two rounds alike), every round's, folded onto the
   * one, so what varies shows as more than one note in a place.
   */
  const notes = $derived.by((): Played[] => {
    const shown = time?.chance && rounds > 1 ? heardNotes.map((e) => ({ ...e, at: e.at % length })) : heardNotes.filter((e) => e.at < length);
    return shown.sort((a, b) => a.at - b.at);
  });
  /** The longest note shown: the drawing looks this far back for notes still sounding at the view's start. */
  const longest = $derived(notes.reduce((m, e) => Math.max(m, e.dur), 0));
  /** Each clocked cell's span on the tower, in seconds: from its step (how often it moves) to its turn. */
  const spans = $derived.by(() => {
    if (!active || !piece.program.ok) return [];
    const model = piece.graph;
    return [...towerSpans(piece.program, model)].flatMap(([id, { at, lo }]) => {
      const node = model.nodes.find((n) => n.id === id);
      return node?.cell && node.kind === 'cell' && Number.isFinite(at) && Number.isFinite(lo) ? [{ name: node.cell.name, step: Math.pow(10, -at), turn: Math.pow(10, -lo) }] : [];
    });
  });
  /** Where a braid turns to its next spliced cell, heard (engine/time/splices.ts). */
  const spliced = $derived(planned && settings.layers.splices ? splices(planned, length) : []);
  /** The patterns: motifs heard at two time scales, and foldings alike at two levels, over the first ten minutes (of
   * every round) at most; a motif's places folded onto the round shown. */
  const PATTERNS = 600;
  const patterns = $derived.by(() => {
    if (!settings.layers.patterns || !heardNotes.length) return null;
    const early = heardNotes.filter((e) => e.at < PATTERNS);
    const within = Math.min(listened, PATTERNS);
    const levels = levelsOf(spans, pulseOf(early.map((e) => e.at)), within);
    const onto = <T extends { at: number; to: number }>(o: T): T => ({ ...o, at: o.at % length, to: (o.at % length) + (o.to - o.at) });
    return {
      motifs: multiscale(motifs(early))
        .slice(0, 4)
        .map((m) => ({ ...m, heard: m.heard.map(onto).filter((o, i, all) => all.findIndex((x) => Math.abs(x.at - o.at) < 1e-3) === i) })),
      folded: alike(foldings(early, levels))
        .filter((g) => g.name.split(' ').length >= 3)
        .slice(0, 3),
    };
  });
  const written = $derived(sectionsOver(piece.sections ?? [], length).filter((s) => s.at > 0 && s.at < length));

  /** A period, short: 0.42 s, 13 s, 4 min. */
  const seconds = (p: number) => (p < 10 ? `${p.toFixed(2)} s` : p < 120 ? `${Math.round(p)} s` : `${Math.round(p / 60)} min`);
  /** The meter, as periods across the scalogram: the beat and the bar of the meter that drives the piece (its tempo
   * cell's step and turn), and the sections' usual length (the median gap between them). */
  const meter = $derived.by(() => {
    const lines: { period: number; label: string }[] = [];
    const main = piece.program.ok ? mainTempo(piece.program) : null;
    const span = main ? spans.find((x) => x.name === main.cell) : undefined;
    if (span) {
      lines.push({ period: span.step, label: 'beat' });
      if (span.turn > span.step * 1.01) lines.push({ period: span.turn, label: 'bar' });
    }
    if (written.length >= 2) {
      const gaps = written
        .slice(1)
        .map((b, i) => b.at - written[i].at)
        .sort((a, b) => a - b);
      lines.push({ period: gaps[Math.floor(gaps.length / 2)], label: 'section' });
    }
    return lines;
  });

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
  let listenedScal = $state.raw<{ window: number; periods: readonly number[]; rows: Partial<Record<Signal, Float32Array[]>>; periodic: boolean } | null>(null);
  const scal = $derived.by(() => {
    if (!listenedScal) return null;
    const { window, periods, periodic } = listenedScal;
    const rows: Partial<Record<Signal, Float32Array[]>> = {};
    for (const [k, r] of Object.entries(listenedScal.rows))
      rows[k as Signal] = fold({ window, periods, rows: r!, periodic }, length, Math.round(window / length)).rows as Float32Array[];
    return { window: Math.min(window, length), periods, rows };
  });
  /** The waterfall, and whose each band of it is (`owner`: an index in `voices` + 1, 0 no note's). */
  /**
   * The levels the scalogram hears most (`ridges`, of each signal shown, the stronger of two within a semitone's
   * ratio), each named after what makes it: the beat, the bar, the sections, or a cell whose step or turn it is.
   */
  const heardLevels = $derived.by(() => {
    if (!scal) return [];
    const chosen: Signal[] = settings.signal === 'mix' ? ['envelope', 'change', 'voices'] : [settings.signal];
    const found = chosen
      .flatMap((k) => (scal.rows[k] ? ridges({ window: scal.window, periods: scal.periods, rows: scal.rows[k], periodic: listenedScal?.periodic }, 3) : []))
      .sort((a, b) => b.strength - a.strength);
    const near = (a: number, b: number) => Math.abs(Math.log2(a / b)) < 1 / 12;
    const kept = found.filter((r, i) => !found.slice(0, i).some((q) => near(q.period, r.period)));
    const names = [
      ...meter,
      ...spans.flatMap((c) => [{ period: c.step, label: `${c.name} step` }, ...(c.turn > c.step * 1.01 ? [{ period: c.turn, label: `${c.name} turn` }] : [])]),
    ];
    return kept.slice(0, 5).map((r) => ({ period: r.period, label: names.find((n) => near(n.period, r.period))?.label ?? null }));
  });
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
        const sounded = eventsBetween(plan(program, shifts, muted), 0, seconds).map((e) => ({ at: e.at, dur: e.dur, freq: e.freq, voice: e.voice, gains: e.gains }));
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
  /** A ramp colour for t in [0, 1]. */
  const ramp = (t: number): readonly [number, number, number] => {
    // (not heard clearly: dark)
    if (!Number.isFinite(t)) return [0, 0, 0];
    const stops = TIME.ramp;
    const x = Math.max(0, Math.min(1, t)) * (stops.length - 1);
    const i = Math.min(stops.length - 2, Math.floor(x));
    const f = x - i;
    return [0, 1, 2].map((k) => Math.round(stops[i][k] + (stops[i + 1][k] - stops[i][k]) * f)) as [number, number, number];
  };
  /** Each row against its mean (dB), as the probe does: where a level is louder than usual. A moment not heard clearly
   * (NaN: folded, and no round clear of the window's edges) stays NaN, and is drawn dark. */
  const relative = (rows: readonly Float32Array[]) =>
    rows.map((r) => {
      let acc = 0;
      let n = 0;
      for (const v of r)
        if (Number.isFinite(v)) {
          acc += v;
          n++;
        }
      const mean = acc / (n || 1) || 1;
      return r.map((v) => (Number.isFinite(v) ? 10 * Math.log10(Math.max(1e-30, v / mean)) : NaN));
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
  /** The waterfall, each band in the colour of the voice whose it is (the piano roll's), as bright as it is loud; a
   * band no note explains (a drum, noise, an effect's tail) grey. */
  const fallImage = $derived.by(() => {
    if (!fall) return null;
    const bands = fall.freqs.length;
    const cols = fall.times.length;
    let top = -Infinity;
    for (const r of fall.rows) for (const v of r) top = Math.max(top, v);
    const img = new ImageData(cols, bands);
    const rgbs = [TIME.unowned, ...fall.voices.map((v) => voices.get(v)?.rgb ?? TIME.unowned)];
    // (band 0 the lowest: at the bottom)
    for (let b = 0; b < bands; b++)
      for (let c = 0; c < cols; c++) {
        const level = Math.max(0, Math.min(1, 1 + (fall.rows[b][c] - top) / 70)) ** 1.5;
        const rgb = rgbs[fall.owner[b * cols + c]] ?? TIME.unowned;
        const [r, g, bl] = [rgb[0] * level, rgb[1] * level, rgb[2] * level];
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

  /** The boundaries heard: swells of the three signals at the sections' scale (with no sections, the cones of change),
   * found over every round and folded onto the one shown, one where the rounds agree. */
  const heardMarks = $derived.by((): Boundary[] => {
    const l = listenedScal;
    if (!l) return [];
    const s = (k: Signal): Scalogram => ({ window: l.window, periods: l.periods, rows: l.rows[k] ?? [] });
    let found: Boundary[];
    if (written.length >= 2) {
      const gaps = written
        .slice(1)
        .map((b, i) => b.at - written[i].at)
        .sort((a, b) => a - b);
      found = swells([s('envelope'), s('change'), s('voices')], gaps[Math.floor(gaps.length / 2)]).slice(0, 2 * written.length * rounds);
    } else found = cones(s('change')).slice(0, 12 * rounds);
    const out: Boundary[] = [];
    for (const b of found) {
      const at = b.at % length;
      if (!out.some((x) => Math.abs(x.at - at) <= Math.max(1, length / 200))) out.push({ ...b, at });
    }
    return out;
  });

  // ── drawing ──────────────────────────────────────────────────────────────────────────────────────────────────
  /** The theme's colours, read once a draw (getComputedStyle each time is slow). */
  let style: Map<string, string> = new Map();
  const css = (name: string) => {
    let v = style.get(name);
    if (v === undefined) style.set(name, (v = canvas ? getComputedStyle(canvas).getPropertyValue(name).trim() : ''));
    return v;
  };
  /** A colour a voice (the piano roll's and the waterfall's alike): its hue, its CSS colour and its RGB. */
  const voices = $derived.by(() => {
    const names = [...new Set(heardNotes.map((e) => e.voice))];
    return new Map(
      names.map((n, i) => {
        const hue = (i * 137) % 360;
        const [h, sat, l] = noteHsl(hue);
        return [n, { hue, css: noteColour(hue), rgb: hslToRgb(h, sat / 100, l / 100) }] as const;
      }),
    );
  });
  /** Notes drawn one by one up to this many in view; more, as pixels (a day's piece zoomed out has 280 000). */
  const ONE_BY_ONE = 4000;
  let dots: OffscreenCanvas | null = null;
  /** The first note (by start) at or after `t`. */
  const firstAt = (ns: readonly Played[], t: number) => {
    let lo = 0;
    let hi = ns.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (ns[mid].at < t) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  };
  $effect(() => {
    const f = frame;
    const layers: TimeLayers = settings.layers;
    const [sb, fb, w, n, ws, hd, sp, cs, pt, vs, back, mt, rg] = [
      scalBitmap,
      fallBitmap,
      wave,
      notes,
      written,
      heardMarks,
      spliced,
      spans,
      patterns,
      voices,
      longest,
      meter,
      heardLevels,
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
      // (veiled where the window's edges reach, twice the wavelet's e-folding time from the start and the end; a loop
      // folded from its rounds has no edges: each moment was heard clear of them in some round)
      g.fillStyle = css('--time-veil');
      for (const side of loop ? [] : [0, 1]) {
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
      // (only those in view: from the first that could still sound at its start, to the last that starts in it)
      const a = firstAt(n, f.from - back);
      const b = firstAt(n, f.to);
      if (b - a <= ONE_BY_ONE) {
        for (let i = a; i < b; i++) {
          const e = n[i];
          if (e.at + e.dur < f.from || !(e.freq > 0)) continue;
          g.fillStyle = vs.get(e.voice)?.css ?? '';
          const x = xOf(f, e.at);
          g.fillRect(x, yOf(f, e.freq) - semi / 2, Math.max(1, xOf(f, e.at + e.dur) - x), semi);
        }
      } else {
        // (as pixels: each note's columns and rows written into one picture, then laid over the rest)
        const [W, H] = [Math.ceil(f.width), Math.ceil(f.height)];
        if (!dots || dots.width !== W || dots.height !== H) dots = new OffscreenCanvas(W, H);
        const px = new ImageData(W, H);
        const half = Math.max(1, Math.round(semi / 2));
        for (let i = a; i < b; i++) {
          const e = n[i];
          if (e.at + e.dur < f.from || !(e.freq > 0)) continue;
          const rgb = vs.get(e.voice)?.rgb ?? [200, 200, 200];
          const x0 = Math.max(0, Math.floor(xOf(f, e.at)));
          const x1 = Math.min(W - 1, Math.max(x0, Math.floor(xOf(f, e.at + e.dur))));
          const y = Math.round(yOf(f, e.freq));
          for (let y1 = Math.max(0, y - half); y1 <= Math.min(H - 1, y + half - 1); y1++)
            for (let x = x0; x <= x1; x++) {
              const k = (y1 * W + x) * 4;
              px.data[k] = rgb[0];
              px.data[k + 1] = rgb[1];
              px.data[k + 2] = rgb[2];
              px.data[k + 3] = 255;
            }
        }
        dots.getContext('2d')!.putImageData(px, 0, 0);
        g.drawImage(dots, 0, 0, W, H);
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
    // the meter across the scalogram: the beat, the bar and the sections' length dashed, labelled; the bars' lines
    // where they are far enough apart to see; and at the right, the levels it hears most, named
    if (layers.meter && layers.scalogram && scal) {
      const p = scal.periods;
      const top = yOf(f, 1 / p[0]);
      const bottom = yOf(f, 1 / p[p.length - 1]);
      const shown = (q: number) => q >= p[0] && q <= p[p.length - 1];
      g.strokeStyle = css('--time-meter');
      g.fillStyle = css('--time-meter');
      g.setLineDash([6, 4]);
      for (const m of mt) {
        if (!shown(m.period)) continue;
        const y = Math.round(yOf(f, 1 / m.period)) + 0.5;
        g.beginPath();
        g.moveTo(0, y);
        g.lineTo(f.width, y);
        g.stroke();
        g.fillText(`${m.label} ${seconds(m.period)}`, 130, y - 4);
      }
      g.setLineDash([]);
      const bar = mt.find((m) => m.label === 'bar') ?? mt.find((m) => m.label === 'beat');
      if (bar && xOf(f, bar.period) - xOf(f, 0) >= 12) {
        g.globalAlpha = 0.35;
        for (let t = Math.ceil(f.from / bar.period) * bar.period; t <= f.to; t += bar.period) g.fillRect(Math.round(xOf(f, t)), top, 1, bottom - top);
        g.globalAlpha = 1;
      }
      g.textAlign = 'right';
      for (const r of rg) {
        const y = yOf(f, 1 / r.period);
        g.beginPath();
        g.moveTo(f.width - 2, y - 5);
        g.lineTo(f.width - 10, y);
        g.lineTo(f.width - 2, y + 5);
        g.fill();
        g.fillText(r.label ? `${seconds(r.period)} · ${r.label}` : seconds(r.period), f.width - 14, y + 4);
      }
      g.textAlign = 'left';
    }
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
        const near = Math.max(1, (f.to - f.from) / 200);
        const on = ws.some((s) => Math.abs(s.at - b.at) <= near);
        const inBraid = !on && sp.some((s) => Math.abs(s.at - b.at) <= near);
        g.fillStyle = on ? css('--time-section') : inBraid ? css('--time-splice') : css('--time-heard');
        g.beginPath();
        g.moveTo(x, y - 9);
        g.lineTo(x - 5, y);
        g.lineTo(x + 5, y);
        g.fill();
      }
    }
    // the splices: a tick where a braid turns to its next spliced cell, just above the heard marks
    if (layers.splices) {
      const y = yOf(f, 20) - 14;
      g.fillStyle = css('--time-splice');
      for (const s of sp) if (s.at >= f.from && s.at <= f.to) g.fillRect(Math.round(xOf(f, s.at)), y - 8, 1.5, 8);
    }
    // the cells: each a bar at the left from its step down to its turn, in lanes, named where there is room
    if (layers.cells) {
      const lanes: number[] = [];
      g.font = '10px system-ui, sans-serif';
      for (const c of [...cs].sort((a, b) => a.step - b.step)) {
        const top = yOf(f, 1 / c.step);
        const bottom = yOf(f, 1 / c.turn);
        if (bottom < 0 || top > f.height) continue;
        let lane = lanes.findIndex((end) => end < top - 2);
        if (lane < 0) lane = lanes.length;
        if (lane > 10) continue;
        lanes[lane] = Math.max(bottom, top + 12);
        const x = 48 + lane * 6;
        g.fillStyle = css('--time-cell');
        g.fillRect(x, top, 3, Math.max(2, bottom - top));
        g.fillRect(x - 2, top - 1, 7, 2);
      }
    }
    // the patterns: each motif heard at two time scales boxed round its notes (a colour a motif, its ratio beside), and
    // the foldings alike listed at the bottom
    if (pt) {
      g.lineWidth = 1.5;
      g.font = '11px system-ui, sans-serif';
      pt.motifs.forEach((m, k) => {
        const colour = noteColour((k * 97 + 40) % 360);
        g.strokeStyle = colour;
        g.fillStyle = colour;
        for (const o of m.heard) {
          if (o.to < f.from || o.at > f.to) continue;
          const x0 = xOf(f, o.at) - 2;
          const x1 = xOf(f, o.to + o.scale * 0.6) + 2;
          const y0 = yOf(f, o.hi) - 5;
          const y1 = yOf(f, o.lo) + 5;
          g.strokeRect(x0, y0, x1 - x0, y1 - y0);
          if (o.scale > m.scales[0] * 1.06) g.fillText(`×${(o.scale / m.scales[0]).toFixed(1)}`, x0, y0 - 3);
        }
      });
      g.lineWidth = 1;
      g.fillStyle = css('--time-ink');
      pt.folded.forEach((fd, k) => {
        const where = fd.where.slice(0, 4).map((x) => `${x.voice} ${x.kind === 'pitch' ? 'pitch' : `rhythm round ${x.level}`}`);
        g.fillText(`folded alike · ${fd.name}${fd.even ? ' (maximally even)' : ''}: ${where.join(', ')}`, 70, f.height - 40 - 14 * k);
      });
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
    { key: 'heard', label: 'heard', title: 'Boundaries heard in the scalogram: white on a section, teal on a splice, orange on neither' },
    { key: 'splices', label: 'splices', title: 'Where a braid turns to its next spliced cell (&tune &a &b …)' },
    { key: 'cells', label: 'cells', title: 'Each cell’s span on the tower, from its step to its turn, at the left' },
    { key: 'meter', label: 'meter', title: 'The beat, the bar and the sections’ length across the scalogram; at the right, the levels it hears most, named after what makes them' },
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
