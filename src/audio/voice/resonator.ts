/**
 * A resonator (body=): its exciters, one body each (modes as band-passes, or a spring's loop), tuned by its
 * braid and coupled through a board they share. Struck by notes and hands, damped, bowed, driven by sound.
 * Native Web Audio nodes throughout (Tone won't take a negative Q, and the loops want plain delays).
 */
import { BODIES, type ResolvedCell } from '../../engine/compile';
import { disposer, type Disposable } from './nodes';

/** One body: an exciter (or the board) — its modes (or a spring's loop), its strike input, its motion. */
export interface Part {
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

export interface Resonator {
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

/** Build a resonator for a voice cell of a body (body=, one of BODIES), its sound into `into` (a native input). */
export function buildResonator(raw: AudioContext, c: ResolvedCell, type: string, into: AudioNode): { res: Resonator; node: Disposable } {
  const params = c.params;
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
  level.connect(into);
  // (how it's ringing, mode by mode: read at each mode's frequency, for the graph)
  const meter = raw.createAnalyser();
  meter.fftSize = 4096;
  meter.smoothingTimeConstant = 0.6;
  level.connect(meter);
  const node = disposer(() => (bowSrc.stop(), bowSrc.disconnect(), bow.disconnect(), input.disconnect(), spread.disconnect(), level.disconnect(), meter.disconnect(), motion.disconnect(), disposers.forEach((f) => f())));
  return { res: { exc: input, level, motion, parts, board, burst, bow, meter, f0 }, node };
}

// a strike on one exciter: where (x, 0 … 1) decides which modes speak — |sin(π x (k + 1))|
export function strikeAt(raw: AudioContext, part: Part, time: number, x: number) {
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
export const driveScale = (_r: Resonator) => 0.1;
// the exciter a note plays: the nearest by pitch
export const nearest = (r: Resonator, freq: number) => {
  const semis = 12 * Math.log2(Math.max(1e-6, freq) / r.f0);
  return r.parts.reduce((a, p) => (Math.abs(p.shift - semis) < Math.abs(a.shift - semis) ? p : a), r.parts[0]);
};

/** How strongly each mode (the strongest of it across the exciters) and each exciter (its fundamental) rings now, 0 … 1. */
export function resonanceOf(raw: AudioContext, r: Resonator): { modes: number[]; exciters: number[] } {
  const bins = new Float32Array(r.meter.frequencyBinCount);
  r.meter.getFloatFrequencyData(bins);
  const hz = raw.sampleRate / r.meter.fftSize;
  const at = (f: number) => {
    const i = Math.round(f / hz);
    let top = -Infinity;
    for (let k = Math.max(0, i - 2); k <= Math.min(bins.length - 1, i + 2); k++) top = Math.max(top, bins[k]);
    return Math.min(1, Math.max(0, (top + 90) / 60));
  };
  const n = Math.max(0, ...r.parts.map((p) => p.modes.length));
  const modes = Array.from({ length: n }, (_, k) => Math.max(0, ...r.parts.map((p) => (p.modes[k] ? at(p.modes[k].bp.frequency.value) : 0))));
  return { modes, exciters: r.parts.map((p) => at(p.f)) };
}

/** A hand on it: every body loses its ring at once (a spring: its loop choked); lifted, they ring again. */
export function damp(now: number, r: Resonator, on: boolean): void {
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
}

/** The bow: its noise's level (null lifts it). */
export function bow(now: number, r: Resonator, amount: number | null): void {
  r.bow.gain.setTargetAtTime(amount === null ? 0 : Math.min(0.6, Math.max(0, amount)), now, 0.03);
}

/** Two resonators coupled (couple=): through a short delay, both ways, a little (k) of each into the other. */
export function couple(raw: AudioContext, a: Resonator, b: Resonator, k: number): AudioNode[] {
  const made: AudioNode[] = [];
  for (const [from, to] of [[a, b], [b, a]] as const) {
    const d = raw.createDelay(0.05);
    d.delayTime.value = 0.003;
    const g = raw.createGain();
    g.gain.value = k;
    from.motion.connect(d);
    d.connect(g);
    g.connect(to.exc);
    made.push(d, g);
  }
  return made;
}
