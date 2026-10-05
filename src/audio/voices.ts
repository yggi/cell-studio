/**
 * Voices for playback. A voice's waveform is its braid (see engine/wave.ts) —
 * or a built-in one when it names a dough source (s=saw, s=white …). Each note
 * is its own oscillator, so it can take its own pitch bends (modulation).
 * Sound parameters, in dough notation: s attack decay sustain release gain
 * lpf lpq hpf hpq pan penv pdec room delay. Only built after a user gesture.
 */
import type { ParamTrack } from '../engine/realize';
import { BODIES } from '../engine/compile';
import type { CompileResult, Shifts } from '../engine/compile';
import { DOUGH_SOURCES } from '../engine/dough-params';
import { harmonics, waveform } from '../engine/wave';

type ToneNS = typeof import('tone');
type Params = Readonly<Record<string, number | string>>;

export interface VoiceBank {
  play(
    voice: string,
    freq: number,
    time: number,
    duration: number,
    bends: readonly { at: number; cents: number; ramp?: boolean }[],
    gains: readonly [number, number],
    levels: readonly { at: number; level: number; ramp?: boolean }[],
    env?: { attack: number; decay: number; sustain: number; release: number },
    params?: Readonly<Record<string, ParamTrack>>,
  ): void;
  /** Rebuild voices whose sound changed; drop ones that are gone. */
  sync(result: CompileResult, shifts: Shifts): void;
  /** A sound tape's speed over time (audio seconds): its delays follow — the heads' distances ÷ speed. */
  tapeSpeed(tape: string, points: readonly { at: number; speed: number }[]): void;
  /** A hand on a sound tape: each head's delay from where it sits (at → seconds back); null lets go. */
  tapeScrub(tape: string, delayFor: ((at: number) => number) | null): void;
  /** Stopped: the tapes go quiet and are wound off — the next sync threads fresh, empty ones. */
  clearTapes(): void;
  /** A sound tape: how loud what it's recording is now (0 … 1), or null. */
  tapeLevel(tape: string): number | null;
  /** A hand on a resonator: strike it at x (0 edge … 1), damp it while held, bow it (null: lift the bow). */
  /** What something sounds like now, as a fine spectrum (dB per bin, and Hz per bin), or null. */
  freqs(name: string): { db: Float32Array; hz: number } | null;
  /** What something sounds like now, as a waveform (a voice, a resonator, a mix, a tape head), or null. */
  waveform(name: string): Float32Array | null;
  /** A hand on a resonator: strike one of its exciters (index; the first by default) at x. */
  strike(name: string, x: number, index?: number): void;
  /** How strongly each of a resonator's modes and each of its exciters rings now (0 … 1), or null. */
  resonance(name: string): { modes: number[]; exciters: number[] } | null;
  damp(name: string, on: boolean): void;
  bow(name: string, amount: number | null): void;
  /** Frequency of the voice's most recent note to have started (null if none yet). */
  note(voice: string): number | null;
  /** Live FFT (dB per bin), left and right: of a voice (after pan), a mix (its voices at their gains), or the sound card (the master). */
  spectrum(name: string): { left: Float32Array; right: Float32Array; sampleRate: number } | null;
  releaseAll(): void;
  dispose(): void;
  /** Resolves when everything is ready to sound (the reverb's impulse is made asynchronously). */
  ready(): Promise<void>;
}

interface Built {
  key: string;
  params: Params;
  head: import('tone').ToneAudioNode;
  nodes: { dispose(): void }[];
  wave: PeriodicWave | OscillatorType | null;
  /** Noise voices: a few seconds of noise, played per note like an oscillator (so it moves like one). */
  noise: AudioBuffer | null;
  scope: { left: import('tone').Analyser; right: import('tone').Analyser };
  /** The voice's output, after pan and gain: what mixes listen to. */
  out: import('tone').Gain;
  /** Scheduled note starts, oldest first (kept short): what's sounding now. */
  notes: { at: number; freq: number }[];
  last: number;
  live: Set<AudioScheduledSourceNode>;
  /** What moving parameters drive: a filter's frequency and resonance, a send's level. */
  moving: Record<string, Movable>;
  /** A resonator (body=): its modes, rung by strikes, a bow, a neighbour, sound. */
  res?: Resonator;
}

/** One body: an exciter (or the board) — its modes (or a spring's loop), its strike input, its motion. */
interface Part {
  exc: GainNode;
  own: GainNode;
  modes: { inG: GainNode; bp: BiquadFilterNode; q: number }[];
  hard: number;
  f: number;
  fb?: GainNode;
  fbValue?: number;
  shift?: number;
  /** Its resonator's strike: a short burst of noise. */
  burst: AudioBuffer;
}

interface Resonator {
  /** What reaches it from outside: a neighbour, a mix, a bow. */
  exc: GainNode;
  level: GainNode;
  /** Its motion: the bodies at unity, what coupling carries (not its loudness, so loops stay < 1). */
  motion: GainNode;
  parts: (Part & { shift: number })[];
  board?: Part;
  burst: AudioBuffer;
  bow: GainNode;
  /** What it sounds now, analysed: how strongly each mode rings (for the graph). */
  meter: AnalyserNode;
  f0: number;
}

/** An audio parameter that can be scheduled (Tone's Param and the Web Audio one share these). */
interface Movable {
  setValueAtTime(v: number, t: number): unknown;
  linearRampToValueAtTime(v: number, t: number): unknown;
  exponentialRampToValueAtTime(v: number, t: number): unknown;
  cancelScheduledValues(t: number): unknown;
}

/** Four seconds of noise of a colour, made once per audio context and colour. */
const noiseBuffers = new WeakMap<BaseAudioContext, Map<string, AudioBuffer>>();
function noiseBuffer(ctx: BaseAudioContext, colour: 'white' | 'pink' | 'brown'): AudioBuffer {
  let byColour = noiseBuffers.get(ctx);
  if (!byColour) noiseBuffers.set(ctx, (byColour = new Map()));
  const cached = byColour.get(colour);
  if (cached) return cached;
  const length = Math.floor(ctx.sampleRate * 4);
  const buf = ctx.createBuffer(1, length, ctx.sampleRate);
  const d = buf.getChannelData(0);
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0, last = 0;
  for (let i = 0; i < length; i++) {
    const w = Math.random() * 2 - 1;
    if (colour === 'white') d[i] = w;
    else if (colour === 'pink') {
      // Paul Kellet's filter: -3 dB an octave
      b0 = 0.99886 * b0 + w * 0.0555179;
      b1 = 0.99332 * b1 + w * 0.0750759;
      b2 = 0.969 * b2 + w * 0.153852;
      b3 = 0.8665 * b3 + w * 0.3104856;
      b4 = 0.55 * b4 + w * 0.5329522;
      b5 = -0.7616 * b5 - w * 0.016898;
      d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
      b6 = w * 0.115926;
    } else {
      // brown: the walk, leaky (-6 dB an octave)
      last = (last + 0.02 * w) / 1.02;
      d[i] = last * 3.5;
    }
  }
  byColour.set(colour, buf);
  return buf;
}

/** Schedule a parameter's track for one note: points held or gliding, or an envelope released after the note. */
function schedule(param: Movable, key: string, track: ParamTrack, time: number, dur: number) {
  // filter frequencies glide as the ear hears them (exponentially); levels and resonance in a line
  const exp = key === 'lpf' || key === 'hpf';
  const ramp = (v: number, t: number) => (exp && v > 0 ? param.exponentialRampToValueAtTime(Math.max(1, v), t) : param.linearRampToValueAtTime(v, t));
  param.cancelScheduledValues(time);
  if (track.kind === 'points') {
    track.points.forEach((x, i) => {
      const t = Math.max(time, x.at);
      if (i > 0 && x.ramp) ramp(x.value, t);
      else param.setValueAtTime(exp ? Math.max(1, x.value) : x.value, t);
    });
    return;
  }
  const { from, peak, attack, decay, sustain, release } = track;
  const hold = from + (peak - from) * sustain;
  param.setValueAtTime(exp ? Math.max(1, from) : from, time);
  ramp(peak, time + Math.max(0.001, attack));
  ramp(hold, time + Math.max(0.002, attack + decay));
  param.setValueAtTime(exp ? Math.max(1, hold) : hold, time + Math.max(dur, attack + decay + 0.003));
  ramp(from, time + Math.max(dur, attack + decay + 0.003) + Math.max(0.005, release));
}

const num = (p: Params, k: string, d: number) => (typeof p[k] === 'number' ? (p[k] as number) : d);

/** Envelope defaults: short attack, full sustain — unless only decay is given (a pluck), as dough does for filter envelopes. */
/** A voice's envelope when nothing shapes its notes (no map=adsr in the product): quick and full. */
function envelope(_p: Params) {
  return { attack: 0.005, decay: 0.1, sustain: 1, release: 0.05 };
}

export function createVoices(Tone: ToneNS): VoiceBank {
  // Tone's context hands out nodes that connect to Tone's own (standardized-audio-context) nodes
  const ctx = Tone.getContext() as unknown as AudioContext;
  // the sound card's level (level=, dB) and then a limiter: nothing past full scale
  const limiter = new Tone.Limiter(-1).toDestination();
  const master = new Tone.Gain(1).connect(limiter);
  const reverb = new Tone.Reverb({ decay: 2.8, preDelay: 0.01, wet: 1 }).connect(master);
  const echo = new Tone.FeedbackDelay({ delayTime: 0.375, feedback: 0.35, wet: 1 }).connect(master);
  const built = new Map<string, Built>();
  let resLinks: AudioNode[] = [];
  // (an oscilloscope's probes: made when asked, gone when the voices are rebuilt)
  let probes = new Map<string, AnalyserNode>();
  let fprobes = new Map<string, AnalyserNode>();
  let tapeNets = new Map<
    string,
    {
      nodes: { dispose(): void }[];
      delays: { node: import('tone').Delay; base: number }[];
      heads: Map<string, import('tone').Gain>;
      maxDelay: number;
      wanders: { node: import('tone').Delay; at: number; wander: number; hz: number }[];
      dropout: number;
      name: string;
      taps: { node: import('tone').Delay; at: number }[];
      scrubbing: boolean;
      meter: AnalyserNode;
      input: import('tone').Gain;
      key: string;
      wires: { dispose(): void }[];
    }
  >();

  type Scope = { left: import('tone').Analyser; right: import('tone').Analyser };
  const makeScope = (): { input: import('tone').Gain; scope: Scope; nodes: { dispose(): void }[] } => {
    const input = new Tone.Gain(1);
    const split = new Tone.Split(2);
    const scope = { left: new Tone.Analyser({ type: 'fft', size: 1024, smoothing: 0.5 }), right: new Tone.Analyser({ type: 'fft', size: 1024, smoothing: 0.5 }) };
    input.connect(split);
    split.connect(scope.left, 0, 0);
    split.connect(scope.right, 1, 0);
    return { input, scope, nodes: [input, split, scope.left, scope.right] };
  };
  // the sound card's wheel listens to everything
  const master_ = makeScope();
  master.connect(master_.input);
  // a mix's wheel listens to its voices at their gains (analysis only: the sound goes out through the master)
  let mixes = new Map<string, { scope: Scope; nodes: { dispose(): void }[]; input?: import('tone').Gain }>();
  let sinks = new Set<string>();

  const soundKey = (result: CompileResult, name: string, shifts: Shifts) => {
    const c = result.cells.get(name)!;
    return JSON.stringify([c.params, c.paramCells, c.params.s ? null : [c.units, c.map, shifts(name), c.map?.kind === 'table' ? shifts(c.map.table) : 0]]);
  };

  const build = (result: CompileResult, name: string, shifts: Shifts, key: string): Built => {
    const c = result.cells.get(name)!;
    const params = c.params;
    const nodes: { dispose(): void }[] = [];
    // chain: notes → [lpf] → [hpf] → pan → gain → master (+ room / delay sends)
    const out = new Tone.Gain(0.4).connect(master);
    const pan = new Tone.Panner(0).connect(out);
    // the wheel's spectrogram: tap the voice after pan, one analyser per channel
    const split = new Tone.Split(2);
    const scope = { left: new Tone.Analyser({ type: 'fft', size: 1024, smoothing: 0.5 }), right: new Tone.Analyser({ type: 'fft', size: 1024, smoothing: 0.5 }) };
    out.connect(split);
    split.connect(scope.left, 0, 0);
    split.connect(scope.right, 1, 0);
    nodes.push(out, pan, split, scope.left, scope.right);
    let head: import('tone').ToneAudioNode = pan;
    const moving: Record<string, Movable> = {};
    // a resonator: its exciters (one body each, tuned by its braid), all coupled to a board they share
    let res: Resonator | undefined;
    if (typeof params.body === 'string' && BODIES[params.body]) {
      const raw = ctx as unknown as AudioContext;
      const f0 = c.freq > 0 ? c.freq : 440;
      const num = (p: Readonly<Record<string, number | string>>, k: string, d: number) => (typeof p[k] === 'number' ? (p[k] as number) : typeof params[k] === 'number' ? (params[k] as number) : d);
      const level = raw.createGain();
      level.gain.value = 0;
      const motion = raw.createGain();
      const input = raw.createGain();
      const disposers: (() => void)[] = [];
      // (keeping it alive: a constant a millionth high into every body. Its band-passes reject it — not a
      // sound — but their input is never all zeros, so the browser keeps them running: otherwise it stops a
      // filter soon after its input falls silent, and a fork struck to ring seven seconds rang a fraction)
      const alive = raw.createConstantSource();
      alive.offset.value = 1e-6;
      alive.start();
      disposers.push(() => (alive.stop(), alive.disconnect()));
      // the strike: a short, smooth click (0.3 ms, a half-sine) — its spectrum near flat for kilohertz,
      // and the same every time: noise struck a narrow mode at random, ±10 dB from strike to strike
      const burst = raw.createBuffer(1, Math.max(4, Math.round(raw.sampleRate * 0.0003)), raw.sampleRate);
      const ch = burst.getChannelData(0);
      for (let i = 0; i < ch.length; i++) ch[i] = Math.sin((Math.PI * (i + 0.5)) / ch.length);
      // one body: its modes (or a spring's loop), its own strike input, its motion
      const bodyOf = (type: string, f: number, ring: number, hard: number): Part => {
        const exc = raw.createGain();
        const own = raw.createGain();
        own.connect(motion);
        const modes: Part['modes'] = [];
        let fb: GainNode | undefined;
        if (type === 'spring') {
          const loopT = 0.045;
          const sum = raw.createGain();
          exc.connect(sum);
          let chain: AudioNode = sum;
          for (let i = 0; i < 10; i++) {
            const ap = raw.createBiquadFilter();
            ap.type = 'allpass';
            ap.frequency.value = 900 + i * 260;
            ap.Q.value = 0.7;
            chain.connect(ap);
            chain = ap;
            disposers.push(() => ap.disconnect());
          }
          const delay = raw.createDelay(0.2);
          delay.delayTime.value = loopT;
          const dark = raw.createBiquadFilter();
          dark.type = 'lowpass';
          dark.frequency.value = 3500 + hard * 3000;
          // (a low-pass's Q is its corner peak in dB — −6 dB has none, so the loop dies away)
          dark.Q.value = -6;
          fb = raw.createGain();
          fb.gain.value = Math.min(0.92, Math.pow(10, (-3 * loopT) / Math.max(0.2, ring)));
          chain.connect(delay);
          delay.connect(dark);
          dark.connect(fb);
          fb.connect(sum);
          const out = raw.createGain();
          out.gain.value = 1.2;
          chain.connect(out);
          out.connect(level);
          out.connect(own);
          disposers.push(() => (sum.disconnect(), delay.disconnect(), dark.disconnect(), fb!.disconnect(), out.disconnect()));
        } else
          for (const [r, t, a] of BODIES[type]) {
            const fm = f * r;
            if (fm > 18000) continue;
            const inG = raw.createGain();
            const bp = raw.createBiquadFilter();
            bp.type = 'bandpass';
            bp.frequency.value = fm;
            const q = Math.max(1, (Math.PI * fm * Math.max(0.05, ring * t)) / 6.908);
            bp.Q.value = q;
            // its sound: a narrow band catches little of a strike — made up for in proportion to how narrow
            const g = raw.createGain();
            g.gain.value = a * q * 12;
            // its motion (unity at the mode): what a neighbour feels — coupling twice round stays k², < 1
            const mv = raw.createGain();
            mv.gain.value = a;
            exc.connect(inG);
            inG.connect(bp);
            bp.connect(g);
            g.connect(level);
            bp.connect(mv);
            mv.connect(own);
            modes.push({ inG, bp, q });
            disposers.push(() => (inG.disconnect(), bp.disconnect(), g.disconnect(), mv.disconnect()));
          }
        alive.connect(exc);
        disposers.push(() => (exc.disconnect(), own.disconnect()));
        return { exc, own, modes, hard, f, fb, fbValue: fb?.gain.value, burst };
      };
      const type = params.body;
      const ring = typeof params.ring === 'number' ? params.ring : 4;
      const hard = typeof params.hard === 'number' ? Math.min(1, Math.max(0, params.hard)) : 0.5;
      const parts = (c.exciters ?? [{ shift: 0, params: {} }]).map((x) => {
        const t = typeof x.params.body === 'string' && BODIES[x.params.body] ? x.params.body : type;
        return { ...bodyOf(t, f0 * Math.pow(2, x.shift / 12), num(x.params, 'ring', ring), Math.min(1, Math.max(0, num(x.params, 'hard', hard)))), shift: x.shift };
      });
      // the board they share (a box an octave below, unless said otherwise — or none)
      const boardType = typeof params.board === 'string' ? params.board : 'box';
      const board = boardType !== 'none' && BODIES[boardType] ? bodyOf(boardType, f0 / 2, Math.max(0.3, ring * 0.15), hard) : undefined;
      const k = typeof params.coupling === 'number' ? Math.min(0.2, Math.max(0, params.coupling)) : 0.08;
      const link = (from: Part, to: Part) => {
        const d = raw.createDelay(0.05);
        d.delayTime.value = 0.002;
        const g = raw.createGain();
        g.gain.value = k;
        from.own.connect(d);
        d.connect(g);
        g.connect(to.exc);
        disposers.push(() => (d.disconnect(), g.disconnect()));
      };
      if (board) for (const p of parts) link(p, board), link(board, p);
      // what reaches it from outside (a neighbour, a mix, a bow): the board — or, with none, every exciter
      const spread = raw.createGain();
      spread.gain.value = board ? 1 : 1 / Math.sqrt(parts.length);
      input.connect(spread);
      for (const p of board ? [board] : parts) spread.connect(p.exc);
      // the bow: noise, always running, its level the hand's
      const bowSrc = raw.createBufferSource();
      const nb = raw.createBuffer(1, raw.sampleRate * 2, raw.sampleRate);
      const nd = nb.getChannelData(0);
      for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
      bowSrc.buffer = nb;
      bowSrc.loop = true;
      const bow = raw.createGain();
      bow.gain.value = 0;
      bowSrc.connect(bow);
      bow.connect(input);
      bowSrc.start();
      // (natively, into the Tone node's own input: Tone's helper doesn't connect a native node — silently,
      // and the resonator's sound never reached the speakers except where coupling carried it)
      level.connect((head as unknown as { input: AudioNode }).input);
      // (how it's ringing, mode by mode: read at each mode's frequency, for the graph)
      const meter = raw.createAnalyser();
      meter.fftSize = 4096;
      meter.smoothingTimeConstant = 0.6;
      level.connect(meter);
      nodes.push({ dispose: () => (bowSrc.stop(), bowSrc.disconnect(), bow.disconnect(), input.disconnect(), spread.disconnect(), level.disconnect(), meter.disconnect(), motion.disconnect(), disposers.forEach((f) => f())) });
      res = { exc: input, level, motion, parts, board, burst, bow, meter, f0 };
    }
    const moves = c.paramCells ?? {};
    // a parameter's starting value: its number, or the bottom of its range
    const start = (k: string, d: number) => (typeof params[k] === 'number' ? (params[k] as number) : (moves[k]?.range?.[0] ?? d));
    if (typeof params.hpf === 'number' || moves.hpf) {
      const f = new Tone.Filter({ type: 'highpass', frequency: start('hpf', 200), Q: start('hpq', 1) }).connect(head);
      head = f;
      nodes.push(f);
      moving.hpf = f.frequency as unknown as Movable;
      moving.hpq = f.Q as unknown as Movable;
    }
    if (typeof params.lpf === 'number' || moves.lpf) {
      const f = new Tone.Filter({ type: 'lowpass', frequency: start('lpf', 2000), Q: start('lpq', 1), rolloff: -24 }).connect(head);
      head = f;
      nodes.push(f);
      moving.lpf = f.frequency as unknown as Movable;
      moving.lpq = f.Q as unknown as Movable;
    }
    // grit, first in line (before the filters, as a pedal before an amp): distortion, then fewer bits
    if (typeof params.distort === 'number' && params.distort > 0) {
      const d = new Tone.Distortion({ distortion: params.distort as number, oversample: '2x' }).connect(head);
      head = d;
      nodes.push(d);
    }
    if (typeof params.crush === 'number' && params.crush >= 1 && params.crush < 16) {
      // fewer bits: each sample rounded to 2^(bits-1) levels a side — a fixed curve, so a plain
      // wave shaper does it (no worklet module to load, which some places refuse)
      const levels = Math.pow(2, Math.round(params.crush as number) - 1);
      const k = new Tone.WaveShaper((x) => Math.round(x * levels) / levels, 4096).connect(head);
      head = k;
      nodes.push(k);
    }
    // an echo of its own, at its time (delaytime=, in seconds or as a clock), else the shared one
    let bus: typeof echo = echo;
    if (typeof params.delaytime === 'number') {
      // (a delay line as long as its echo: a dotted half at a slow tempo runs past Tone's default second)
      const time = params.delaytime as number;
      bus = new Tone.FeedbackDelay({ delayTime: time, maxDelay: Math.max(1, time + 0.25), feedback: num(params, 'delayfeedback', 0.35), wet: 1 }).connect(master);
      nodes.push(bus);
    }
    for (const [k, target] of [['room', reverb], ['delay', bus]] as const)
      if (typeof params[k] === 'number' || moves[k] || (k === 'delay' && bus !== echo)) {
        const send = new Tone.Gain(start(k, k === 'delay' ? 0.3 : 0)).connect(target);
        out.connect(send);
        nodes.push(send);
        moving[k] = send.gain as unknown as Movable;
      }

    const src = params.s !== undefined ? DOUGH_SOURCES[String(params.s)] : null;
    let wave: Built['wave'] = null;
    let noise: Built['noise'] = null;
    if (src === 'white' || src === 'pink' || src === 'brown') {
      noise = noiseBuffer(ctx, src);
    } else if (src) {
      wave = src as OscillatorType;
    } else {
      // the braid is the waveform
      const { real, imag } = harmonics(waveform(result, name, shifts));
      wave = ctx.createPeriodicWave(real, imag);
    }
    return { res, key, params, head, nodes, wave, noise, scope, out, notes: [], last: -Infinity, live: new Set(), moving };
  };

  const free = (b: Built) => {
    for (const o of b.live) o.stop();
    for (const n of b.nodes) n.dispose();
  };

  // a strike on one exciter: where (x, 0 … 1) decides which modes speak — |sin(π x (k + 1))|
  function strikeAt(part: Part, time: number, x: number) {
    const raw = ctx as unknown as AudioContext;
    part.modes.forEach((m, k) => m.inG.gain.setValueAtTime(0.15 + 0.85 * Math.abs(Math.sin(Math.PI * x * (k + 1))), time));
    const src = raw.createBufferSource();
    src.buffer = part.burst;
    const mallet = raw.createBiquadFilter();
    mallet.type = 'lowpass';
    mallet.frequency.value = 300 + part.hard * part.hard * 12000;
    src.connect(mallet);
    mallet.connect(part.exc);
    src.start(time);
    src.onended = () => (src.disconnect(), mallet.disconnect());
  }
  // sound that drives a body rings it fully at its resonance (a click caught only a sliver, and its
  // make-up is for that): a drive enters at a tenth — a bed under what drives it, not over it
  const driveScale = (_r: Resonator) => 0.1;
  // the exciter a note plays: the nearest by pitch
  const nearest = (r: Resonator, freq: number) => {
    const semis = 12 * Math.log2(Math.max(1e-6, freq) / r.f0);
    return r.parts.reduce((a, p) => (Math.abs(p.shift - semis) < Math.abs(a.shift - semis) ? p : a), r.parts[0]);
  };

  return {
    async ready() {
      await reverb.ready;
    },
    sync(result, shifts) {
      // the sound card's level: level= in dB on the (first) sound card
      const card = [...result.cells.values()].find((c) => c.sink);
      const db = typeof card?.params.level === 'number' ? card.params.level : 0;
      master.gain.value = Math.pow(10, db / 20);
      for (const [name, b] of built) {
        const c = result.cells.get(name);
        if (!c?.voice || soundKey(result, name, shifts) !== b.key) {
          free(b);
          built.delete(name);
        }
      }
      for (const c of result.cells.values())
        if (c.voice && !built.has(c.name)) built.set(c.name, build(result, c.name, shifts, soundKey(result, c.name, shifts)));
      for (const a of probes.values()) a.disconnect();
      probes = new Map();
      for (const a of fprobes.values()) a.disconnect();
      fprobes = new Map();
      // rewire the mix taps from scratch: cheap, and always matches the code
      for (const m of mixes.values()) for (const n of m.nodes) n.dispose();
      mixes = new Map();
      for (const c of result.cells.values()) {
        if (!c.mix) continue;
        const tap = makeScope();
        for (const b of c.mix) {
          const v = built.get(b.voice.name);
          if (!v) continue;
          const g = new Tone.Gain(b.gain).connect(tap.input);
          v.out.connect(g);
          tap.nodes.push(g);
        }
        mixes.set(c.name, tap);
      }
      sinks = new Set([...result.cells.values()].filter((c) => c.sink).map((c) => c.name));
      // a voice played only into sends (a resonator's excitation, a tape) isn't heard from itself
      // (a kit's output names the kit: its members are what sound)
      const heardVoices = new Set([
        ...result.outputs.filter((o) => !o.silent).flatMap((o) => (o.kit ? [o.voice, ...(result.cells.get(o.voice)?.children.keys() ?? [])] : [o.voice])),
        ...result.resonances.map((x) => x.cell),
      ]);
      for (const [name, b] of built) {
        const want = heardVoices.has(name);
        if (want !== (b as { heard?: boolean }).heard) {
          if (want) b.out.connect(master);
          else b.out.disconnect(master);
          (b as { heard?: boolean }).heard = want;
        }
      }
      // resonators: heard at the levels of every mix they're in (struck there, or ringing alone)
      for (const t of resLinks) t.disconnect();
      resLinks = [];
      for (const [name, b] of built) {
        if (!b.res) continue;
        let l = 0;
        let r = 0;
        for (const o of result.outputs) {
          if (o.silent) continue;
          // (struck directly, or as one of a kit's members)
          const kit = o.kit ? result.cells.get(o.voice) : undefined;
          if (o.voice === name || (kit && kit.children.has(name))) (l += o.gains[0]), (r += o.gains[1]);
        }
        for (const x of result.resonances) if (x.cell === name) (l += x.gains[0]), (r += x.gains[1]);
        b.res.level.gain.value = (l + r) / 2;
        const pan = (b.head as unknown as { pan?: { value: number } }).pan;
        if (pan && l + r > 0) pan.value = (r - l) / (l + r);
      }
      const raw = ctx as unknown as AudioContext;
      for (const c of result.cells.values()) {
        const a = built.get(c.name)?.res;
        if (!a) continue;
        // coupled: through the table, both ways, a little of each into the other
        if (typeof c.params.couple === 'string') {
          const bRes = built.get(c.params.couple)?.res;
          const k = typeof c.params.coupling === 'number' ? Math.min(0.2, Math.max(0, c.params.coupling)) : 0.02;
          if (bRes)
            for (const [from, to] of [[a, bRes], [bRes, a]] as const) {
              const d = raw.createDelay(0.05);
              d.delayTime.value = 0.003;
              const g = raw.createGain();
              g.gain.value = k;
              from.motion.connect(d);
              d.connect(g);
              g.connect(to.exc);
              resLinks.push(d, g);
            }
        }
        // excited by sound: a mix's voices into it
        if (typeof c.params.excite === 'string')
          for (const bnd of result.cells.get(c.params.excite)?.mix ?? []) {
            const v = built.get(bnd.voice.name);
            if (!v || v.res === a) continue;
            const g = raw.createGain();
            g.gain.value = bnd.gain * driveScale(a); // (sound driving it rings fully at resonance: no strike's make-up)
            Tone.connect(v.out, g);
            g.connect(a.exc);
            resLinks.push(g);
          }
      }
      // sound tapes: a delay network each — the source mix in; a loop of its length back into it
      // (through its loss, its saturation, and what erasing leaves); each read head a tap
      // (a tape whose settings haven't changed is kept — what's on it stays, through pause and play; only
      // its wires, what feeds it and where its heads go, are made again)
      const buildNet = (tp: (typeof result.tapes)[number]) => {
          const nodes: { dispose(): void }[] = [];
          const input = new Tone.Gain(1);
          nodes.push(input);
          // (what's being recorded, how loud: drawn round the reel)
          const meter = (ctx as unknown as AudioContext).createAnalyser();
          meter.fftSize = 512;
          Tone.connect(input, meter);
          nodes.push({ dispose: () => meter.disconnect() });
          if (tp.hiss > 0) {
            const n = new Tone.Noise('pink').start();
            const g = new Tone.Gain(tp.hiss).connect(input);
            n.connect(g);
            nodes.push(n, g);
          }
          // (room to stretch: a slow tape makes every delay longer)
          const maxDelay = Math.min(179, Math.max(tp.length, ...tp.heads.map((h) => h.at), 0.05) * 4 + 1);
          const delays: { node: import('tone').Delay; base: number }[] = [];
          if (tp.length > 0) {
            const loop = new Tone.Delay({ delayTime: tp.length, maxDelay });
            // (flat: a resonant corner would lift the loop's gain above what erasing leaves)
            // (a native filter: Tone won't take a negative Q — and −6 dB is what keeps the corner flat)
            const loss = (ctx as unknown as AudioContext).createBiquadFilter();
            loss.type = 'lowpass';
            loss.frequency.value = tp.tone;
            loss.Q.value = -6;
            // saturation that never adds gain: unity for a quiet signal, rounding off a loud one (tanh at
            // slope 1) — so the loop keeps at most 1 − erase a lap, and can never run away
            const k = 1 + 4 * Math.max(0, tp.drive);
            const sat = new Tone.WaveShaper((x) => Math.tanh(x * k) / k, 2048);
            const keep = new Tone.Gain(1 - tp.erase);
            input.connect(loop);
            loop.connect(loss);
            Tone.connect(loss, sat);
            sat.chain(keep, input);
            nodes.push(loop, { dispose: () => loss.disconnect() }, sat, keep);
            delays.push({ node: loop, base: tp.length });
          }
          // each head: its tap (and its print-through, a faint tap before it) into its own output,
          // which dropouts dip
          const heads = new Map<string, import('tone').Gain>();
          const wanders: { node: import('tone').Delay; at: number; wander: number; hz: number }[] = [];
          // (every tap and where it reads: for a hand scrubbing the tape)
          const taps: { node: import('tone').Delay; at: number }[] = [];
          for (const h of tp.heads) {
            const out = new Tone.Gain(1);
            const d = new Tone.Delay({ delayTime: Math.max(0.001, h.at), maxDelay });
            input.connect(d);
            d.connect(out);
            nodes.push(out, d);
            taps.push({ node: d, at: Math.max(0.001, h.at) });
            if (h.wander > 0) wanders.push({ node: d, at: Math.max(0.001, h.at), wander: h.wander, hz: h.wanderhz });
            else delays.push({ node: d, base: Math.max(0.001, h.at) });
            if (tp.print > 0 && h.at > tp.printgap) {
              const pd = new Tone.Delay({ delayTime: h.at - tp.printgap, maxDelay });
              const pg = new Tone.Gain(tp.print);
              input.connect(pd);
              pd.chain(pg, out);
              nodes.push(pd, pg);
              delays.push({ node: pd, base: h.at - tp.printgap });
              taps.push({ node: pd, at: h.at - tp.printgap });
            }
            heads.set(h.head, out);
          }
          return { nodes, delays, heads, maxDelay, wanders, dropout: tp.dropout, name: tp.name, taps, scrubbing: false, meter, input, key: JSON.stringify(tp), wires: [] as { dispose(): void }[] };
      };
      const oldNets = tapeNets;
      tapeNets = new Map();
      for (const tp of result.tapes) {
        const prev = oldNets.get(tp.name);
        let net: ReturnType<typeof buildNet>;
        if (prev && prev.key === JSON.stringify(tp)) {
          oldNets.delete(tp.name);
          for (const w of prev.wires) w.dispose();
          prev.wires = [];
          net = prev;
        } else net = buildNet(tp);
        tapeNets.set(tp.name, net);
        for (const b of result.cells.get(tp.source)?.mix ?? []) {
          const v = built.get(b.voice.name);
          if (!v) continue;
          const g = new Tone.Gain(b.gain).connect(net.input);
          v.out.connect(g);
          net.wires.push(g);
        }
      }
      for (const n of oldNets.values()) for (const x of n.nodes) x.dispose();
      // read heads in mixes: back to the sound card, left and right at their levels
      for (const r of result.returns) {
        const net = tapeNets.get(r.tape);
        const d = net?.heads.get(r.head);
        if (!net || !d) continue;
        const l = new Tone.Gain(r.gains[0]);
        const rr = new Tone.Gain(r.gains[1]);
        const merge = new Tone.Merge();
        d.connect(l);
        d.connect(rr);
        l.connect(merge, 0, 0);
        rr.connect(merge, 0, 1);
        merge.connect(master);
        net.wires.push(l, rr, merge);
      }
      // resonators excited by a mix with tape heads in it: the heads drive them too
      for (const c of result.cells.values()) {
        const a = built.get(c.name)?.res;
        if (!a || typeof c.params.excite !== 'string') continue;
        for (const bnd of result.cells.get(c.params.excite)?.mix ?? []) {
          const head = result.cells.get(bnd.voice.name);
          const tape = head && typeof head.params.play === 'string' ? tapeNets.get(head.params.play) : undefined;
          const out = tape?.heads.get(bnd.voice.name);
          if (!out) continue;
          const g = (ctx as unknown as AudioContext).createGain();
          g.gain.value = bnd.gain * driveScale(a); // (sound driving it rings fully at resonance: no strike's make-up)
          Tone.connect(out, g);
          g.connect(a.exc);
          resLinks.push(g);
        }
      }
    },

    freqs(name) {
      let a = fprobes.get(name);
      if (!a) {
        const b = built.get(name);
        let src: unknown = b?.res ? b.res.level : b?.out;
        if (!src) src = mixes.get(name)?.input;
        if (!src) for (const t of tapeNets.values()) if (t.heads.has(name)) src = t.heads.get(name);
        if (!src) return null;
        a = (ctx as unknown as AudioContext).createAnalyser();
        a.fftSize = 8192;
        a.smoothingTimeConstant = 0.5;
        if (b?.res) b.res.level.connect(a);
        else Tone.connect(src as Parameters<typeof Tone.connect>[0], a);
        fprobes.set(name, a);
      }
      const db = new Float32Array(a.frequencyBinCount);
      a.getFloatFrequencyData(db);
      return { db, hz: (ctx as unknown as AudioContext).sampleRate / a.fftSize };
    },
    waveform(name) {
      let a = probes.get(name);
      if (!a) {
        const b = built.get(name);
        let src: unknown = b?.res ? b.res.level : b?.out;
        if (!src) src = mixes.get(name)?.input;
        if (!src) for (const t of tapeNets.values()) if (t.heads.has(name)) src = t.heads.get(name);
        if (!src) return null;
        a = (ctx as unknown as AudioContext).createAnalyser();
        a.fftSize = 2048;
        // (a native node — a resonator's level — connects itself; Tone's helper doesn't, silently)
        if (b?.res) b.res.level.connect(a);
        else Tone.connect(src as Parameters<typeof Tone.connect>[0], a);
        probes.set(name, a);
      }
      const buf = new Float32Array(a.fftSize);
      a.getFloatTimeDomainData(buf);
      return buf;
    },
    strike(name, x, index) {
      const r = built.get(name)?.res;
      const part = r ? r.parts[index ?? 0] ?? r.parts[0] : undefined;
      if (part) strikeAt(part, ctx.currentTime + 0.005, Math.min(1, Math.max(0, x)));
    },
    resonance(name) {
      const r = built.get(name)?.res;
      if (!r) return null;
      const bins = new Float32Array(r.meter.frequencyBinCount);
      r.meter.getFloatFrequencyData(bins);
      const hz = (ctx as unknown as AudioContext).sampleRate / r.meter.fftSize;
      const at = (f: number) => {
        const i = Math.round(f / hz);
        let top = -Infinity;
        for (let k = Math.max(0, i - 2); k <= Math.min(bins.length - 1, i + 2); k++) top = Math.max(top, bins[k]);
        return Math.min(1, Math.max(0, (top + 90) / 60));
      };
      // each mode (the strongest of it across the exciters), and each exciter (its fundamental)
      const n = Math.max(0, ...r.parts.map((p) => p.modes.length));
      const modes = Array.from({ length: n }, (_, k) => Math.max(0, ...r.parts.map((p) => (p.modes[k] ? at(p.modes[k].bp.frequency.value) : 0))));
      return { modes, exciters: r.parts.map((p) => at(p.f)) };
    },
    damp(name, on) {
      const r = built.get(name)?.res;
      if (!r) return;
      const now = ctx.currentTime;
      // a hand on it: every body loses its ring at once (a spring: its loop choked); lifted, they ring again
      for (const p of [...r.parts, ...(r.board ? [r.board] : [])]) {
        if (p.fb) {
          p.fb.gain.cancelScheduledValues(now);
          p.fb.gain.setTargetAtTime(on ? 0.1 : p.fbValue!, now, on ? 0.02 : 0.05);
        }
        for (const m of p.modes) {
          m.bp.Q.cancelScheduledValues(now);
          m.bp.Q.setTargetAtTime(on ? Math.min(m.q, 2) : m.q, now, on ? 0.02 : 0.05);
        }
      }
    },
    bow(name, amount) {
      const r = built.get(name)?.res;
      if (!r) return;
      r.bow.gain.setTargetAtTime(amount === null ? 0 : Math.min(0.6, Math.max(0, amount)), ctx.currentTime, 0.03);
    },

    tapeLevel(tape) {
      const net = tapeNets.get(tape);
      if (!net) return null;
      const buf = new Float32Array(net.meter.fftSize);
      net.meter.getFloatTimeDomainData(buf);
      let sum = 0;
      for (const v of buf) sum += v * v;
      // (in dB: −60 nothing, −10 full — quiet material still shows)
      const db = 20 * Math.log10(Math.max(1e-6, Math.sqrt(sum / buf.length)));
      return Math.min(1, Math.max(0, (db + 60) / 50));
    },

    clearTapes() {
      // (a loop that keeps 84% a lap rings for minutes: stopping must stop it — fade, then unthread)
      const now = ctx.currentTime;
      const old = [...tapeNets.values()];
      tapeNets = new Map();
      for (const net of old) for (const g of net.heads.values()) g.gain.setTargetAtTime(0, now, 0.02);
      setTimeout(() => {
        for (const net of old) for (const n of [...net.nodes, ...net.wires]) n.dispose();
      }, 200);
    },

    tapeScrub(tape, delayFor) {
      const net = tapeNets.get(tape);
      if (!net) return;
      const now = ctx.currentTime;
      const clamp = (v: number) => Math.min(net.maxDelay - 0.01, Math.max(0.001, v));
      if (delayFor) {
        net.scrubbing = true;
        // (the heads follow the hand closely: back faster than time runs, and they read backwards)
        for (const t of net.taps) {
          const d0 = clamp(delayFor(t.at));
          // to where the hand holds it, quickly — then, held still, the delay grows as time passes
          // (the head keeps reading the same moment: a held tape is silent)
          const room = Math.max(0, net.maxDelay - 0.01 - d0);
          t.node.delayTime.cancelScheduledValues(now);
          t.node.delayTime.linearRampToValueAtTime(d0, now + 0.015);
          t.node.delayTime.linearRampToValueAtTime(d0 + room, now + 0.015 + room);
        }
      } else {
        // let go: each head plays on from where the hand left it — the old stretch of tape still
        // under it — until fresh material reaches it (its distance after the write head); there the
        // new recording takes over: a splice
        let last = now;
        for (const t of net.taps) {
          const d = clamp(Number(t.node.delayTime.value));
          const join = now + (d > t.at ? t.at : 0);
          t.node.delayTime.cancelScheduledValues(now);
          t.node.delayTime.setValueAtTime(d, now);
          t.node.delayTime.linearRampToValueAtTime(d, join);
          t.node.delayTime.linearRampToValueAtTime(clamp(t.at), join + 0.02);
          last = Math.max(last, join + 0.02);
        }
        // (the speed's own schedule takes over again once every head has joined)
        setTimeout(() => (net.scrubbing = false), Math.max(0, (last - now) * 1000));
      }
    },

    tapeSpeed(tape, points) {
      const net = tapeNets.get(tape);
      if (!net || net.scrubbing) return;
      const clamp = (v: number) => Math.min(net.maxDelay - 0.01, Math.max(0.001, v));
      // (a fixed pattern: the same gaps every play, every render)
      const hash = (k: number) => {
        const x = Math.sin(k * 127.1 + net.name.length * 311.7) * 43758.5453;
        return x - Math.floor(x);
      };
      for (const p of points) {
        if (!Number.isFinite(p.at) || !Number.isFinite(p.speed)) continue;
        const speed = Math.max(0.02, p.speed);
        for (const d of net.delays) d.node.delayTime.linearRampToValueAtTime(clamp(d.base / speed), p.at);
        // a flying head: its place swings either way as the tape runs past
        for (const w of net.wanders) d2(w, p.at, speed);
        // dropouts: in each twentieth of a second, a gap with a chance of dropout / 20
        if (net.dropout > 0 && hash(Math.floor(p.at * 20)) < net.dropout / 20)
          for (const g of net.heads.values()) {
            g.gain.setTargetAtTime(0.08, p.at, 0.005);
            g.gain.setTargetAtTime(1, p.at + 0.03 + hash(Math.floor(p.at * 20) + 7) * 0.05, 0.01);
          }
      }
      function d2(w: { node: import('tone').Delay; at: number; wander: number; hz: number }, at: number, speed: number) {
        w.node.delayTime.linearRampToValueAtTime(clamp((w.at + w.wander * Math.sin(2 * Math.PI * w.hz * at)) / speed), at);
      }
    },

    play(voice, freq, time, duration, bends, gains, levels, noteEnv, params) {
      const b = built.get(voice);
      if (!b) return;
      // a resonator: a note strikes it — its value is where (0 … 7 across it)
      // a resonator: a note plucks the exciter nearest its pitch
      if (b.res) {
        if (Number.isFinite(time) && b.res.parts.length) strikeAt(nearest(b.res, freq), time, 0.5);
        return;
      }
      // (a time that never comes — a clock run down under it — or nonsense: nothing to play)
      if (!Number.isFinite(time) || !Number.isFinite(duration) || !Number.isFinite(freq)) return;
      bends = bends.filter((x) => Number.isFinite(x.at) && Number.isFinite(x.cents));
      levels = levels.filter((x) => Number.isFinite(x.at) && Number.isFinite(x.level));
      if (params)
        params = Object.fromEntries(
          Object.entries(params).map(([k, t]) => [k, t.kind === 'points' ? { ...t, points: t.points.filter((x) => Number.isFinite(x.at) && Number.isFinite(x.value)) } : t]),
        ) as typeof params;
      // late (the page was busy): a little late, start just after now — the envelope from silence, no jump;
      // much later (> 50 ms), leave it out: it would sound in the wrong place anyway
      const now = ctx.currentTime;
      if (time < now + 0.003) {
        if (time < now - 0.05) return;
        const late = now + 0.003 - time;
        time += late;
        duration = Math.max(0.02, duration - late);
      }
      // its moving parameters, over this note
      for (const [k, track] of Object.entries(params ?? {})) {
        const target = b.moving[k];
        if (target) schedule(target, k, track, time, Math.max(0.02, duration * 0.9));
      }
      b.notes.push({ at: time, freq });
      if (b.notes.length > 32) b.notes.splice(0, b.notes.length - 32);
      const dur = Math.max(0.02, duration * 0.9);
      // a map=adsr factor shapes this note; otherwise the voice's own envelope
      const env = noteEnv ?? envelope(b.params);
      // noise: its buffer, looping from somewhere new each note (the grain, not the music, is random);
      // then the same path as a tone — envelope, volume streams, placement
      // a tone: its waveform, its pitch (a drop, if penv=), its bends
      const tone = (o: OscillatorNode) => {
        if (typeof b.wave === 'string') o.type = b.wave as OscillatorType;
        else if (b.wave) o.setPeriodicWave(b.wave);
        const depth = num(b.params, 'penv', 0);
        if (depth) {
          o.frequency.setValueAtTime(freq * Math.pow(2, depth / 12), time);
          o.frequency.exponentialRampToValueAtTime(freq, time + num(b.params, 'pdec', 0.05));
        } else o.frequency.setValueAtTime(freq, time);
        o.detune.setValueAtTime(0, time);
        for (const bend of bends) {
          if (bend.ramp) o.detune.linearRampToValueAtTime(bend.cents, bend.at);
          else o.detune.setValueAtTime(bend.cents, bend.at);
        }
      };
      // FM: a modulator (a voice of its own, ratio= its frequency against this one) swinging this frequency
      // by index × its frequency — and its own modulator, if it has one; each note starts them afresh
      const fmOnto = (param: AudioParam, carrierFreq: number, of: Built, t0: number, t1: number, depth: number, indexTrack?: ParamTrack) => {
        const name = of.params.fm;
        const mb = typeof name === 'string' ? built.get(name) : undefined;
        if (!mb || depth > 5) return;
        const mf = carrierFreq * num(mb.params, 'ratio', 1);
        const m = ctx.createOscillator();
        if (typeof mb.wave === 'string') m.type = mb.wave as OscillatorType;
        else if (mb.wave) m.setPeriodicWave(mb.wave);
        m.frequency.setValueAtTime(mf, t0);
        const swing = ctx.createGain();
        swing.gain.value = mf;
        const index = ctx.createGain();
        index.gain.value = num(of.params, 'index', 1);
        if (indexTrack) schedule(index.gain as unknown as Movable, 'index', indexTrack, t0, Math.max(0.02, t1 - t0));
        m.connect(swing).connect(index).connect(param);
        fmOnto(m.frequency, mf, mb, t0, t1, depth + 1);
        m.start(t0);
        m.stop(t1);
        m.onended = () => {
          m.disconnect();
          swing.disconnect();
          index.disconnect();
        };
      };
      let osc: AudioScheduledSourceNode;
      if (b.noise) {
        const n = ctx.createBufferSource();
        n.buffer = b.noise;
        n.loop = true;
        osc = n;
      } else {
        const o = ctx.createOscillator();
        tone(o);
        fmOnto(o.frequency, freq, b, time, time + dur + env.release * 4 + 0.05, 0, params?.index);
        osc = o;
      }

      const amp = ctx.createGain();
      // the mix: level from the louder side, placement from the balance of the two
      const level = Math.max(gains[0], gains[1]);
      const pan = ctx.createStereoPanner();
      pan.pan.value = level > 0 ? (4 / Math.PI) * Math.atan2(gains[1], gains[0]) - 1 : 0;
      // (noise used to play at full level through its own synth: it keeps that loudness on this path)
      const peak = 0.35 * level * (b.noise ? 2.8 : 1);
      amp.gain.setValueAtTime(0, time);
      amp.gain.linearRampToValueAtTime(peak, time + env.attack);
      amp.gain.setTargetAtTime(peak * env.sustain, time + env.attack, Math.max(env.decay, 0.001) / 3);
      amp.gain.setTargetAtTime(0, time + dur, Math.max(env.release, 0.005) / 3);
      // the volume streams: a level that moves while the note sounds (smoothed, no clicks)
      const lvl = ctx.createGain();
      lvl.gain.setValueAtTime(levels[0]?.level ?? 1, time);
      for (const l of levels.slice(1)) {
        if (l.ramp) lvl.gain.linearRampToValueAtTime(l.level, l.at);
        else lvl.gain.setTargetAtTime(l.level, l.at, 0.004);
      }
      osc.connect(amp).connect(lvl).connect(pan);
      Tone.connect(pan, b.head);
      if (b.noise) (osc as AudioBufferSourceNode).start(time, Math.random() * b.noise.duration);
      else osc.start(time);
      osc.stop(time + dur + env.release * 4 + 0.05);
      b.live.add(osc);
      osc.onended = () => {
        b.live.delete(osc);
        amp.disconnect();
        lvl.disconnect();
        pan.disconnect();
      };
    },

    note(voice) {
      const b = built.get(voice);
      if (!b) return null;
      const now = ctx.currentTime;
      for (let i = b.notes.length - 1; i >= 0; i--) if (b.notes[i].at <= now) return b.notes[i].freq;
      return null;
    },

    spectrum(name) {
      const scope = built.get(name)?.scope ?? mixes.get(name)?.scope ?? (sinks.has(name) ? master_.scope : null);
      if (!scope) return null;
      return {
        left: scope.left.getValue() as Float32Array,
        right: scope.right.getValue() as Float32Array,
        sampleRate: ctx.sampleRate,
      };
    },

    releaseAll() {
      const now = ctx.currentTime;
      for (const b of built.values()) {
        for (const o of b.live) o.stop(now + 0.02);
        b.last = -Infinity;
      }
    },

    dispose() {
      for (const b of built.values()) free(b);
      built.clear();
      for (const m of mixes.values()) for (const n of m.nodes) n.dispose();
      for (const n of master_.nodes) n.dispose();
      reverb.dispose();
      echo.dispose();
      master.dispose();
    },
  };
}
