/**
 * Sound tapes: a delay network each — the source mix in; a loop of its length back into it (through its loss,
 * its saturation, and what erasing leaves); each read head a tap. Their speed (a moving clock) and a hand
 * scrubbing them move the delays.
 *
 * Held (the transport not playing), a tape with a loop is frozen: nothing is written to it (the write gate and the
 * hiss are closed) and its loop runs round on its own, lossless, so what is on it is the same lap again and again.
 * A head then reads that lap by how far round it is turned (`holdTape`): a tape scrubbed forward and back, or
 * round and round, plays the same content over and over, whatever time has passed.
 */
import type { AudioTape } from '@yggi/cells/engine/program';
import { disposer, type Disposable, type ToneNS } from './nodes';

type Delay = import('tone').Delay;

export interface TapeNet {
  nodes: Disposable[];
  delays: { node: Delay; base: number }[];
  heads: Map<string, import('tone').Gain>;
  maxDelay: number;
  wanders: { node: Delay; at: number; wander: number; hz: number }[];
  dropout: number;
  name: string;
  taps: { node: Delay; at: number }[];
  scrubbing: boolean;
  meter: AnalyserNode;
  /** What is written to it: the sources come in here (a gate: closed while the tape is held, so nothing is recorded). */
  input: import('tone').Gain;
  /** What the heads, the loop and the meter hear: what is written, and the loop coming round. */
  bus: import('tone').Gain;
  /** A tape's length in tape-seconds (0: no loop). */
  length: number;
  /** The loop, and the loss it goes through (bypassed while frozen). */
  loop?: { delay: Delay; loss: BiquadFilterNode };
  /** The hiss: its gain, and its level. */
  hiss?: { gain: import('tone').Gain; level: number };
  /** Held and frozen: when (audio seconds), and the loop's period then (audio seconds: its length ÷ its speed). */
  frozen: { at: number; period: number } | null;
  /** Its settings: a tape whose settings haven't changed is kept (what's on it stays). */
  key: string;
  /** What feeds it and where its heads go: made again on every sync. */
  wires: Disposable[];
}

export const tapeKey = (tp: AudioTape) => JSON.stringify(tp);

/** A tape's network, threaded fresh (empty). */
export function buildTapeNet(Tone: ToneNS, raw: AudioContext, tp: AudioTape): TapeNet {
  const nodes: Disposable[] = [];
  const bus = new Tone.Gain(1);
  const input = new Tone.Gain(1).connect(bus);
  nodes.push(bus, input);
  // (what's being recorded, how loud: drawn round the reel)
  const meter = raw.createAnalyser();
  meter.fftSize = 512;
  Tone.connect(bus, meter);
  nodes.push(disposer(() => meter.disconnect()));
  let hiss: TapeNet['hiss'];
  if (tp.hiss > 0) {
    const n = new Tone.Noise('pink').start();
    const g = new Tone.Gain(tp.hiss).connect(bus);
    n.connect(g);
    nodes.push(n, g);
    hiss = { gain: g, level: tp.hiss };
  }
  // (room to stretch: a slow tape makes every delay longer)
  const maxDelay = Math.min(179, Math.max(tp.length, ...tp.heads.map((h) => h.at), 0.05) * 4 + 1);
  const delays: { node: Delay; base: number }[] = [];
  let loopNodes: TapeNet['loop'];
  if (tp.length > 0) {
    const loop = new Tone.Delay({ delayTime: tp.length, maxDelay });
    // (flat: a resonant corner would lift the loop's gain above what erasing leaves)
    // (a native filter: Tone won't take a negative Q — and −6 dB is what keeps the corner flat)
    const loss = raw.createBiquadFilter();
    loss.type = 'lowpass';
    loss.frequency.value = tp.tone;
    loss.Q.value = -6;
    // saturation that never adds gain: unity for a quiet signal, rounding off a loud one (tanh at
    // slope 1) — so the loop keeps at most 1 − erase a lap, and can never run away
    const k = 1 + 4 * Math.max(0, tp.drive);
    const sat = new Tone.WaveShaper((x) => Math.tanh(x * k) / k, 2048);
    const keep = new Tone.Gain(1 - tp.erase);
    bus.connect(loop);
    loop.connect(loss);
    Tone.connect(loss, sat);
    sat.chain(keep, bus);
    nodes.push(
      loop,
      disposer(() => loss.disconnect()),
      sat,
      keep,
    );
    delays.push({ node: loop, base: tp.length });
    loopNodes = { delay: loop, loss };
  }
  // each head: its tap (and its print-through, a faint tap before it) into its own output,
  // which dropouts dip
  const heads = new Map<string, import('tone').Gain>();
  const wanders: { node: Delay; at: number; wander: number; hz: number }[] = [];
  // (every tap and where it reads: for a hand scrubbing the tape)
  const taps: { node: Delay; at: number }[] = [];
  for (const h of tp.heads) {
    const out = new Tone.Gain(1);
    const d = new Tone.Delay({ delayTime: Math.max(0.001, h.at), maxDelay });
    bus.connect(d);
    d.connect(out);
    nodes.push(out, d);
    taps.push({ node: d, at: Math.max(0.001, h.at) });
    if (h.wander > 0) wanders.push({ node: d, at: Math.max(0.001, h.at), wander: h.wander, hz: h.wanderhz });
    else delays.push({ node: d, base: Math.max(0.001, h.at) });
    if (tp.print > 0 && h.at > tp.printgap) {
      const pd = new Tone.Delay({ delayTime: h.at - tp.printgap, maxDelay });
      const pg = new Tone.Gain(tp.print);
      bus.connect(pd);
      pd.chain(pg, out);
      nodes.push(pd, pg);
      delays.push({ node: pd, base: h.at - tp.printgap });
      taps.push({ node: pd, at: h.at - tp.printgap });
    }
    heads.set(h.head, out);
  }
  return {
    nodes,
    delays,
    heads,
    maxDelay,
    wanders,
    dropout: tp.dropout,
    name: tp.name,
    taps,
    scrubbing: false,
    meter,
    input,
    bus,
    length: tp.length,
    loop: loopNodes,
    hiss,
    frozen: null,
    key: tapeKey(tp),
    wires: [],
  };
}

/** How loud what a tape is recording is now (0 … 1). */
export function tapeLevelOf(net: TapeNet): number {
  const buf = new Float32Array(net.meter.fftSize);
  net.meter.getFloatTimeDomainData(buf);
  let sum = 0;
  for (const v of buf) sum += v * v;
  // (in dB: −60 nothing, −10 full — quiet material still shows)
  const db = 20 * Math.log10(Math.max(1e-6, Math.sqrt(sum / buf.length)));
  return Math.min(1, Math.max(0, (db + 60) / 50));
}

/** Tapes stopped: they go quiet now, and are unthreaded once quiet. */
export function fadeOut(now: number, nets: readonly TapeNet[]): void {
  // (a loop that keeps 84% a lap rings for minutes: stopping must stop it — fade, then unthread)
  for (const net of nets) for (const g of net.heads.values()) g.gain.setTargetAtTime(0, now, 0.02);
  setTimeout(() => {
    for (const net of nets) for (const n of [...net.nodes, ...net.wires]) n.dispose();
  }, 200);
}

/** A hand on a tape: each head's delay from where it sits (at → seconds back); null lets go. */
export function scrubTape(now: number, net: TapeNet, delayFor: ((at: number) => number) | null): void {
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
}

/**
 * Held (on) or running again (off). Held, a tape with a loop is frozen: its write gate and its hiss close, and its loop
 * goes round on its own, straight back into itself (no loss, no saturation, nothing erased), so the lap that is on it
 * stays as it is. `holdTape` then turns it.
 */
export function freezeTape(now: number, net: TapeNet, on: boolean): void {
  if (!net.loop || on === (net.frozen !== null)) return;
  const { delay, loss } = net.loop;
  if (on) {
    // (the loop's own delay, where it is now: its speed's schedule is over)
    const period = Math.max(0.05, Number(delay.delayTime.getValueAtTime(now)));
    delay.delayTime.cancelScheduledValues(now);
    delay.delayTime.setValueAtTime(period, now);
    delay.disconnect(loss);
    delay.connect(net.bus);
    net.input.gain.setTargetAtTime(0, now, 0.01);
    net.hiss?.gain.gain.setTargetAtTime(0, now, 0.01);
    net.frozen = { at: now, period };
  } else {
    delay.disconnect(net.bus);
    delay.connect(loss);
    net.input.gain.setTargetAtTime(1, now, 0.01);
    if (net.hiss) net.hiss.gain.gain.setTargetAtTime(net.hiss.level, now, 0.01);
    for (const g of net.heads.values()) {
      g.gain.cancelScheduledValues(now);
      g.gain.setTargetAtTime(1, now, 0.01);
    }
    net.frozen = null;
  }
}

/**
 * Turn a frozen tape: `behindFor(head)` is how far behind where it stood when it was held (tape-seconds) the content under
 * that head lies. The lap is the tape's length, so that wraps: the heads read the same lap over and over, whatever
 * that is, and a hand turning the tape any way hears it go by. A head goes to its place by the short way round
 * the loop (the content repeats every period) and then keeps its content still; a moment after the hand stops it
 * is silent.
 */
export function holdTape(now: number, net: TapeNet, behindFor: (head: number) => number): void {
  const f = net.frozen;
  if (!f) return;
  net.scrubbing = true;
  const L = net.length;
  const since = now - f.at;
  const max = net.maxDelay - 0.01;
  for (const t of net.taps) {
    // how far round the lap, in the loop's own seconds, and since then the loop has turned `since`
    const x = (((behindFor(t.at) % L) + L) % L) * (f.period / L);
    const want = (since + x) % f.period;
    const param = t.node.delayTime;
    // (where it is at `now`, by its own schedule: `.value` is a lookahead on, which a head that moves can't be read by)
    const cur = Number(param.getValueAtTime(now));
    let d = want + Math.round((cur - want) / f.period) * f.period;
    while (d > max && d - f.period >= 0.001) d -= f.period;
    while (d < 0.001) d += f.period;
    d = Math.min(max, d);
    param.cancelScheduledValues(now);
    param.setValueAtTime(cur, now);
    param.linearRampToValueAtTime(d, now + 0.015);
    // (then it grows with time: the head keeps reading the same moment of the lap)
    const room = Math.max(0, max - d);
    param.linearRampToValueAtTime(d + room, now + 0.015 + room);
  }
  for (const g of net.heads.values()) {
    g.gain.cancelScheduledValues(now);
    g.gain.setTargetAtTime(1, now, 0.005);
    g.gain.setTargetAtTime(0, now + 0.4, 0.05);
  }
}

/** A tape's speed over time (audio seconds): its delays follow — the heads' distances ÷ speed. */
export function tapeSpeedOf(net: TapeNet, points: readonly { at: number; speed: number }[]): void {
  if (net.scrubbing) return;
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
  function d2(w: { node: Delay; at: number; wander: number; hz: number }, at: number, speed: number) {
    w.node.delayTime.linearRampToValueAtTime(clamp((w.at + w.wander * Math.sin(2 * Math.PI * w.hz * at)) / speed), at);
  }
}
