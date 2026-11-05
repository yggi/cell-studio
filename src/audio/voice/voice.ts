/**
 * One voice: its chain (notes → [grit] → [filters] → pan → gain → the master, with room and echo sends, and a
 * spectrum tap), or a resonator's bodies in its place; and a note played on it — an oscillator (its braid as
 * the waveform, or a built-in one), or noise, each note its own source so it takes its own bends.
 */
import type { CompileResult, ResolvedCell, Shifts } from '@yggi/cells/engine/program';
import { BODIES } from '@yggi/cells/engine/program';
import { DOUGH_SOURCES } from '@yggi/cells/engine/dough-params';
import type { Played } from '@yggi/cells/engine/realize';
import type { ParamTrack } from '@yggi/cells/engine/series';
import { harmonics, waveform } from '@yggi/cells/engine/wave';
import { inputOf, movable, type Disposable, type Movable, type ToneNS } from './nodes';
import { grainOffset, noiseBuffer } from './noise';
import { blendWave, type Builtin } from './blend';
import { envelope, num, schedule, schedulePitch, type Params } from './params';
import { noteStats } from '../stats';
import { buildResonator, nearest, strikeAt, type Resonator } from './resonator';

/** Where every voice goes: the master (then the limiter), and the shared reverb and echo. */
export interface Bus {
  master: import('tone').Gain;
  reverb: import('tone').Reverb;
  echo: import('tone').FeedbackDelay;
}

export type Scope = { left: import('tone').Analyser; right: import('tone').Analyser };

export interface Built {
  key: string;
  /** Its cell's seed: where each noise note starts comes from it. */
  seed: number;
  params: Params;
  head: import('tone').ToneAudioNode;
  nodes: Disposable[];
  wave: PeriodicWave | OscillatorType | null;
  /** Noise voices: a few seconds of noise, played per note like an oscillator (so it moves like one). */
  noise: AudioBuffer | null;
  scope: Scope;
  /** The voice's output, after pan and gain: what mixes listen to. */
  out: import('tone').Gain;
  /** Scheduled note starts, oldest first (kept short): what's sounding now. */
  notes: { at: number; freq: number }[];
  /** The notes in the air (started, or scheduled to), each with what a pause must reach to drop its gate. */
  live: Map<AudioScheduledSourceNode, Sounding>;
  /** What moving parameters drive: a filter's frequency and resonance, a send's level. */
  moving: Record<string, Movable>;
  /** A resonator (body=): its modes, rung by strikes, a bow, a neighbour, sound. */
  res?: Resonator;
  /** Where a note through these instruments goes in (decision 067): `head`, or its way through their filters. */
  way?: (through: Played['through']) => import('tone').ToneAudioNode;
  /** The instruments a key played on it goes through: its first output's. */
  keyWay?: Played['through'];
  /** The instruments' filter parameters, every voice's copies (shared by the bank), and this voice's own in it. */
  rack?: Rack;
  staged?: [instrument: string, key: string, param: Movable][];
  /** A blend of two built-in waves (`s=tri..square * &x`, cells decision 066): each note plays the share it starts on. */
  blend?: { readonly from: Builtin; readonly to: Builtin; readonly waves: Map<number, PeriodicWave> };
}

/**
 * An instrument's filters (decision 067), on each voice's way through it, by instrument and parameter: a note through
 * it moves every copy, as the one stage on their sum it is (a filter is linear), each voice's sound kept its own.
 */
export type Rack = Map<string, Map<string, Set<Movable>>>;

/** Has it a send of its own: room= or delay= (or an echo of its own, delaytime=), fixed or moving. */
const hasSend = (c: ResolvedCell) =>
  typeof c.params.room === 'number' || !!c.paramCells?.room || typeof c.params.delay === 'number' || !!c.paramCells?.delay || typeof c.params.delaytime === 'number';

/**
 * A cell's sends (those `keep` keeps) from `from`: room= into the shared reverb, delay= into an echo of its own at its
 * delaytime= (and delayfeedback=), else the shared echo; each at its number or the bottom of its range, its level added
 * to `moving`'s lists.
 */
function sends(
  Tone: ToneNS,
  bus: Bus,
  c: { readonly params: Params; readonly paramCells?: Readonly<Record<string, { readonly range: readonly [number, number] | null }>> },
  keep: (k: string) => boolean,
  from: import('tone').ToneAudioNode,
  nodes: Disposable[],
  moving: Record<string, Movable[]>,
): void {
  const moves = c.paramCells ?? {};
  const own = (k: string) => keep(k) && typeof c.params[k] === 'number';
  const start = (k: string, d: number) => (own(k) ? (c.params[k] as number) : keep(k) ? (moves[k]?.range?.[0] ?? d) : d);
  // an echo of its own, at its time (delaytime=, in seconds or as a clock), else the shared one
  let echo: typeof bus.echo = bus.echo;
  if (own('delaytime')) {
    // (a delay line as long as its echo: a dotted half at a slow tempo runs past Tone's default second)
    const time = c.params.delaytime as number;
    const feedback = own('delayfeedback') ? (c.params.delayfeedback as number) : 0.35;
    echo = new Tone.FeedbackDelay({ delayTime: time, maxDelay: Math.max(1, time + 0.25), feedback, wet: 1 }).connect(bus.master);
    nodes.push(echo);
  }
  for (const [k, target] of [
    ['room', bus.reverb],
    ['delay', echo],
  ] as const)
    if (own(k) || (keep(k) && moves[k]) || (k === 'delay' && echo !== bus.echo)) {
      const g = new Tone.Gain(start(k, k === 'delay' ? 0.3 : 0)).connect(target);
      from.connect(g);
      nodes.push(g);
      (moving[k] ??= []).push(movable(g.gain));
    }
}

/** Has it a filter of its own: a low- or high-pass, fixed or moving. */
const hasFilter = (c: ResolvedCell) => typeof c.params.lpf === 'number' || !!c.paramCells?.lpf || typeof c.params.hpf === 'number' || !!c.paramCells?.hpf;

/**
 * A cell's filters (those `keep` keeps) into `into`: a high-pass, before it a low-pass (24 dB a octave), each at its
 * number or the bottom of its range; returns where they start, their parameters added to `into`'s lists in `moving`.
 */
function filters(
  Tone: ToneNS,
  c: { readonly params: Params; readonly paramCells?: Readonly<Record<string, { readonly range: readonly [number, number] | null }>> },
  keep: (k: string) => boolean,
  into: import('tone').ToneAudioNode,
  nodes: Disposable[],
  moving: Record<string, Movable[]>,
): import('tone').ToneAudioNode {
  const moves = c.paramCells ?? {};
  const start = (k: string, d: number) => (!keep(k) ? d : typeof c.params[k] === 'number' ? (c.params[k] as number) : (moves[k]?.range?.[0] ?? d));
  const has = (k: 'lpf' | 'hpf') => keep(k) && (typeof c.params[k] === 'number' || !!moves[k]);
  const add = (k: string, p: object) => (moving[k] ??= []).push(movable(p));
  let at = into;
  if (has('hpf')) {
    const f = new Tone.Filter({ type: 'highpass', frequency: start('hpf', 200), Q: start('hpq', 1) }).connect(at);
    at = f;
    nodes.push(f);
    add('hpf', f.frequency);
    add('hpq', f.Q);
  }
  if (has('lpf')) {
    const f = new Tone.Filter({ type: 'lowpass', frequency: start('lpf', 2000), Q: start('lpq', 1), rolloff: -24 }).connect(at);
    at = f;
    nodes.push(f);
    add('lpf', f.frequency);
    add('lpq', f.Q);
  }
  return at;
}

/** Several parameters moved as one (a voice's filter on each of its ways): what is scheduled on it, on each. */
function fan(ps: readonly Movable[]): Movable {
  return {
    get value() {
      return (ps[0] as { value?: number } | undefined)?.value;
    },
    setValueAtTime: (v, t) => ps.forEach((p) => p.setValueAtTime(v, t)),
    linearRampToValueAtTime: (v, t) => ps.forEach((p) => p.linearRampToValueAtTime(v, t)),
    exponentialRampToValueAtTime: (v, t) => ps.forEach((p) => p.exponentialRampToValueAtTime(v, t)),
    cancelScheduledValues: (t) => ps.forEach((p) => p.cancelScheduledValues(t)),
  } as Movable;
}

/** A note in the air: what dropping its gate (a pause) reaches. */
export interface Sounding {
  /** When it starts (audio seconds); a note not yet started is cancelled. */
  readonly at: number;
  /** Its envelope, and its volume streams. */
  readonly amp: GainNode;
  readonly lvl: GainNode;
  /** What moves its pitch (bends, a shape): they stop where they are. */
  readonly pitch: readonly AudioParam[];
  /** Its FM modulators: they go with it. */
  readonly mods: readonly OscillatorNode[];
  /** Its release (seconds): how long it rings after the gate drops. */
  readonly release: number;
  /** A key held (`press`): a hand's, not the plan's, so a pause leaves it sounding until it is released. */
  readonly held?: boolean;
}

/** Build a voice cell's chain (`key`: its sound, to tell when it must be built again). */
export function buildVoice(Tone: ToneNS, ctx: AudioContext, bus: Bus, result: CompileResult, name: string, shifts: Shifts, key: string, rack: Rack = new Map()): Built {
  const c = result.cells.get(name)!;
  const params = c.params;
  const nodes: Disposable[] = [];
  // chain: notes → [grit] → [lpf] → [hpf] → [each instrument's lpf → hpf] → gain → master (+ room / delay sends); a
  // resonator's bodies → pan → gain
  const out = new Tone.Gain(0.4).connect(bus.master);
  // (a note comes panned already, in stereo; Tone's panner is mono, explicitly, so a voice's notes through it were
  // downmixed and set in the middle, #516: only a resonator, whose bodies sound in mono, goes through one)
  const resonates = typeof params.body === 'string' && !!BODIES[params.body];
  const pan = resonates ? new Tone.Panner(0).connect(out) : null;
  // the wheel's spectrogram: tap the voice after pan, one analyser per channel
  const split = new Tone.Split(2);
  const scope = { left: new Tone.Analyser({ type: 'fft', size: 1024, smoothing: 0.5 }), right: new Tone.Analyser({ type: 'fft', size: 1024, smoothing: 0.5 }) };
  out.connect(split);
  split.connect(scope.left, 0, 0);
  split.connect(scope.right, 1, 0);
  nodes.push(out, split, scope.left, scope.right);
  if (pan) nodes.push(pan);
  let head: import('tone').ToneAudioNode = pan ?? out;
  const moving: Record<string, Movable> = {};
  // a resonator: its exciters (one body each, tuned by its braid), all coupled to a board they share
  let res: Resonator | undefined;
  if (resonates) {
    const r = buildResonator(ctx, c, params.body as string, inputOf(head));
    nodes.push(r.node);
    res = r.res;
  }
  const moves = c.paramCells ?? {};
  // a parameter's starting value: its number, or the bottom of its range
  const start = (k: string, d: number) => (typeof params[k] === 'number' ? (params[k] as number) : (moves[k]?.range?.[0] ?? d));
  // its own filters and grit, into where its way goes on (`end`): one copy for each way its notes take through
  // instruments (the first, on no instrument), their moving parameters each one of `moving`'s, moved together
  const own: Record<string, Movable[]> = {};
  const end = head;
  const chain = (into: import('tone').ToneAudioNode) => {
    // (not what it takes from an instrument, decision 067: that instrument's stage plays it, after the voice's own)
    let at = filters(Tone, c, (k) => !c.inherited?.[k], into, nodes, own);
    // grit, first in line (before the filters, as a pedal before an amp): distortion, then fewer bits
    if (typeof params.distort === 'number' && params.distort > 0) {
      const d = new Tone.Distortion({ distortion: params.distort as number, oversample: '2x' }).connect(at);
      at = d;
      nodes.push(d);
    }
    if (typeof params.crush === 'number' && params.crush >= 1 && params.crush < 16) {
      // fewer bits: each sample rounded to 2^(bits-1) levels a side — a fixed curve, so a plain
      // wave shaper does it (no worklet module to load, which some places refuse)
      const levels = Math.pow(2, Math.round(params.crush as number) - 1);
      const k = new Tone.WaveShaper((x) => Math.round(x * levels) / levels, 4096).connect(at);
      at = k;
      nodes.push(k);
    }
    return at;
  };
  if (!resonates) head = chain(end);
  for (const k of Object.keys(own)) moving[k] = fan(own[k]!);
  // its ways through instruments with filters or sends of their own (decision 067), made when a note first takes one: its
  // own chain, then each instrument's filters and sends, the innermost first; each instrument's parameters in `rack`, for
  // every voice
  const ways = new Map<string, import('tone').ToneAudioNode>();
  const staged: Built['staged'] = [];
  const way = (through: Played['through']): import('tone').ToneAudioNode => {
    const stages = (through ?? []).filter((x) => {
      const i = result.cells.get(x.instrument);
      return !!i && (hasFilter(i) || hasSend(i));
    });
    if (!stages.length) return head;
    const key = stages.map((x) => x.instrument).join('\u0000');
    const known = ways.get(key);
    if (known) return known;
    let at = end;
    for (const x of [...stages].reverse()) {
      const mine: Record<string, Movable[]> = {};
      const i = result.cells.get(x.instrument)!;
      // its sends, after its filters: from where its filters come out, at the level a voice's output has (its gain)
      if (hasSend(i)) {
        const after = new Tone.Gain(1).connect(at);
        const level = new Tone.Gain(out.gain.value);
        after.connect(level);
        nodes.push(after, level);
        sends(Tone, bus, i, () => true, level, nodes, mine);
        at = after;
      }
      at = filters(Tone, i, () => true, at, nodes, mine);
      for (const [k, ps] of Object.entries(mine))
        for (const p of ps) {
          const into = rack.get(x.instrument) ?? new Map<string, Set<Movable>>();
          rack.set(x.instrument, into);
          const set = into.get(k) ?? new Set<Movable>();
          into.set(k, set);
          set.add(p);
          staged.push([x.instrument, k, p]);
        }
    }
    const into = chain(at);
    ways.set(key, into);
    return into;
  };
  // its sends, from its output (not what it takes from an instrument: that instrument's stage sends it, after the voice's own)
  const mySends: Record<string, Movable[]> = {};
  sends(Tone, bus, c, (k) => !c.inherited?.[k], out, nodes, mySends);
  for (const [k, ps] of Object.entries(mySends)) moving[k] = ps[0]!;

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
  // (a key played on it takes the way its first output's notes do)
  const keyWay = result.outputs.find((o) => o.voice === name)?.through.map((instrument) => ({ instrument }));
  // a blend: its second wave, where a note's share of it is read (its first is `wave`, at share 0)
  const to = moves.s?.to !== undefined ? DOUGH_SOURCES[moves.s.to] : undefined;
  const blend = src && wave && to && to !== 'white' && to !== 'pink' && to !== 'brown' ? { from: src as Builtin, to, waves: new Map<number, PeriodicWave>() } : undefined;
  return { res, key, seed: c.seed, params, head, nodes, wave, noise, scope, out, notes: [], live: new Map(), moving, way, keyWay, rack, staged, ...(blend ? { blend } : {}) };
}

/** Let a voice go: its sounding notes stopped, its nodes disposed, its copies of instruments' filters out of the rack. */
export function freeVoice(b: Built): void {
  for (const o of b.live.keys()) o.stop();
  for (const [instrument, k, p] of b.staged ?? []) b.rack?.get(instrument)?.get(k)?.delete(p);
  for (const n of b.nodes) n.dispose();
}

/** A parameter held where it is now: what was scheduled for it from `now` on is dropped. */
function hold(param: Movable, now: number): void {
  const v = (param as unknown as { value?: number }).value;
  param.cancelScheduledValues(now);
  if (typeof v === 'number') param.setValueAtTime(v, now);
}

/**
 * A pause: every note in the air lets go. A note that has not started is never played; one that sounds drops its gate (its
 * envelope goes into its release from where it is) and stops moving (its bends and volume stream stay as they are; its FM modulators play on until the release has ended), so
 * nothing hangs, and what rings after — release, reverb, echo — is left to ring. Parameters that move a voice's filter
 * hold where they are.
 */
export function dropGates(b: Built, now: number): void {
  // (a note scheduled ahead is never played: it is not what sounds now either)
  b.notes = b.notes.filter((n) => n.at <= now);
  for (const [osc, n] of b.live) if (!n.held) letGo(osc, n, now);
  for (const p of Object.values(b.moving)) hold(p, now);
  for (const [, , p] of b.staged ?? []) hold(p, now);
}

/** When a note let go at `now` has rung out (audio seconds). */
export const releaseEnd = (n: Sounding, now: number): number => now + Math.max(n.release, 0.005) * 4 + 0.05;

/**
 * One note lets go now: not yet started, it is never played; sounding, its gate drops (its envelope goes into its
 * release from where it is) and it stops moving. A pause does this to every note the plan played; a key released, to its own.
 */
export function letGo(osc: AudioScheduledSourceNode, n: Sounding, now: number): void {
  if (n.at > now) {
    osc.stop(now);
    for (const m of n.mods) m.stop(now);
    return;
  }
  hold(n.amp.gain, now);
  hold(n.lvl.gain, now);
  for (const p of n.pitch) hold(p, now);
  const release = Math.max(n.release, 0.005);
  n.amp.gain.setTargetAtTime(0, now, release / 3);
  const end = releaseEnd(n, now);
  osc.stop(end);
  for (const m of n.mods) m.stop(end);
}

/**
 * Play a note on a voice (`voiceOf`: the others, for FM modulators). Returns when it sounds (audio seconds) and its
 * source (null: not played, or a strike).
 */
export function playNote(
  Tone: ToneNS,
  ctx: AudioContext,
  b: Built,
  note: Played,
  voiceOf: (name: string) => Built | undefined,
  /** A key played now (`press`): it starts just after now by design, so it isn't counted late. */
  live = false,
): { at: number; end: number; osc: AudioScheduledSourceNode } | null {
  const { freq, gains, env: noteEnv } = note;
  let { at: time, dur: duration, bends, levels, params } = note;
  // a resonator: a note plucks the exciter nearest its pitch
  if (b.res) {
    if (Number.isFinite(time) && b.res.parts.length) strikeAt(ctx, nearest(b.res, freq), time, 0.5);
    return null;
  }
  // (a time that never comes — a clock run down under it — or nonsense: nothing to play)
  if (!Number.isFinite(time) || !Number.isFinite(duration) || !Number.isFinite(freq)) return null;
  bends = bends.filter((x) => Number.isFinite(x.at) && Number.isFinite(x.cents));
  levels = levels.filter((x) => Number.isFinite(x.at) && Number.isFinite(x.level));
  const finite = (ps: NonNullable<Played['params']>) =>
    Object.fromEntries(
      Object.entries(ps).map(([k, t]) => [k, t.kind === 'points' ? { ...t, points: t.points.filter((x) => Number.isFinite(x.at) && Number.isFinite(x.value)) } : t]),
    ) as typeof ps;
  if (params) params = finite(params);
  // late (the page was busy): a little late, start just after now — the envelope from silence, no jump;
  // much later (> 50 ms), leave it out: it would sound in the wrong place anyway
  const now = ctx.currentTime;
  if (time < now + 0.003) {
    if (!live) noteStats.worstLateMs = Math.max(noteStats.worstLateMs, (now - time) * 1000);
    if (time < now - 0.05) {
      noteStats.dropped++;
      return null;
    }
    if (!live) noteStats.late++;
    const late = now + 0.003 - time;
    time += late;
    duration = Math.max(0.02, duration - late);
  }
  noteStats.played++;
  // a note is articulated, its gate open for 90 % of its length; a drone's held note (decision 028) for all of it
  const dur = Math.max(0.02, note.held ? duration : duration * 0.9);
  // where it goes in: its way through the instruments it plays through (made first: their parameters move on it too)
  const into = b.way?.(note.through) ?? b.head;
  // its moving parameters, over this note
  for (const [k, track] of Object.entries(params ?? {})) {
    const target = b.moving[k];
    if (target) schedule(target, k, track, time, dur);
  }
  // the instruments it plays through: their filters, moved by this note on every voice's way through them
  for (const x of note.through ?? [])
    for (const [k, track] of Object.entries(finite(x.params ?? {}))) for (const p of b.rack?.get(x.instrument)?.get(k) ?? []) schedule(p, k, track, time, dur);
  b.notes.push({ at: time, freq });
  if (b.notes.length > 32) b.notes.splice(0, b.notes.length - 32);
  // a map=adsr factor shapes this note; otherwise the voice's own envelope
  const env = noteEnv ?? envelope(b.params);
  // noise: its buffer, looping from somewhere else each note (from the cell's seed, so the same every time);
  // then the same path as a tone — envelope, volume streams, placement
  // a tone: its waveform, its pitch (a shape, if pitch=lo..hi * &shape), its bends
  const tone = (o: OscillatorNode) => {
    // (a blend: the wave of the share it starts on, as cells' renderer plays it)
    const share = b.blend && params?.s?.kind === 'points' ? params.s.points[0]?.value : undefined;
    if (b.blend && share !== undefined) o.setPeriodicWave(blendWave(ctx, b.blend.waves, b.blend.from, b.blend.to, share));
    else if (typeof b.wave === 'string') o.type = b.wave as OscillatorType;
    else if (b.wave) o.setPeriodicWave(b.wave);
    if (params?.pitch) schedulePitch(o.frequency, freq, params.pitch, time, dur);
    else o.frequency.setValueAtTime(freq, time);
    o.detune.setValueAtTime(0, time);
    for (const bend of bends) {
      if (bend.ramp) o.detune.linearRampToValueAtTime(bend.cents, bend.at);
      else o.detune.setValueAtTime(bend.cents, bend.at);
    }
  };
  // FM: a modulator (a voice of its own, ratio= its frequency against this one) swinging this frequency
  // by index × its frequency — and its own modulator, if it has one; each note starts them afresh
  const mods: OscillatorNode[] = [];
  const fmOnto = (param: AudioParam, carrierFreq: number, of: Built, t0: number, t1: number, depth: number, indexTrack?: ParamTrack) => {
    const name = of.params.fm;
    const mb = typeof name === 'string' ? voiceOf(name) : undefined;
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
    if (indexTrack) schedule(index.gain, 'index', indexTrack, t0, Math.max(0.02, t1 - t0));
    m.connect(swing).connect(index).connect(param);
    mods.push(m);
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
  const pitch: AudioParam[] = [];
  if (b.noise) {
    const n = ctx.createBufferSource();
    n.buffer = b.noise;
    n.loop = true;
    osc = n;
  } else {
    const o = ctx.createOscillator();
    tone(o);
    pitch.push(o.frequency, o.detune);
    fmOnto(o.frequency, freq, b, time, time + dur + env.release * 4 + 0.05, 0, params?.index);
    osc = o;
  }

  const amp = ctx.createGain();
  // the mix: level from the louder side, placement from the balance of the two; a negative gain is the same level
  // upside down (cells #193: phase inversion), so the level carries its sign and the balance reads the sizes
  const size = Math.max(Math.abs(gains[0]), Math.abs(gains[1]));
  const level = gains[0] + gains[1] < 0 ? -size : size;
  const pan = ctx.createStereoPanner();
  // (a note is mono: taken as one channel, it is panned by the equal-power law; left to its default, Tone's context's panner
  // reads it as two, so a note in the middle sounded at full on each side, and one hard left at twice that: #516)
  pan.channelCount = 1;
  pan.channelCountMode = 'explicit';
  pan.pan.value = size > 0 ? (4 / Math.PI) * Math.atan2(Math.abs(gains[1]), Math.abs(gains[0])) - 1 : 0;
  // (noise used to play at full level through its own synth: it keeps that loudness on this path)
  const peak = 0.35 * level * (b.noise ? 2.8 : 1);
  amp.gain.setValueAtTime(0, time);
  // (no attack: the peak at once; a ramp of no length then a target, at a time between two samples, overshoots in
  // Chromium, to 2.7 times the peak: #516)
  if (env.attack <= 0) amp.gain.setValueAtTime(peak, time);
  // (a gate that shuts before the attack ends: up to where the attack has reached, then the release; scheduled as written,
  // the release came before the attack's ramp, which Web Audio then ran after the gate, the note silent through it: #516)
  if (env.attack > 0 && dur < env.attack) amp.gain.linearRampToValueAtTime((peak * dur) / env.attack, time + dur);
  else {
    if (env.attack > 0) amp.gain.linearRampToValueAtTime(peak, time + env.attack);
    amp.gain.setTargetAtTime(peak * env.sustain, time + env.attack, Math.max(env.decay, 0.001) / 3);
  }
  amp.gain.setTargetAtTime(0, time + dur, Math.max(env.release, 0.005) / 3);
  // the volume streams: a level that moves while the note sounds (smoothed, no clicks)
  const lvl = ctx.createGain();
  lvl.gain.setValueAtTime(levels[0]?.level ?? 1, time);
  for (const l of levels.slice(1)) {
    if (l.ramp) lvl.gain.linearRampToValueAtTime(l.level, l.at);
    else lvl.gain.setTargetAtTime(l.level, l.at, 0.004);
  }
  osc.connect(amp).connect(lvl).connect(pan);
  Tone.connect(pan, into);
  if (b.noise) (osc as AudioBufferSourceNode).start(time, grainOffset(b.seed, note.voice, note.code ?? note.at, b.noise.duration));
  else osc.start(time);
  const end = time + dur + env.release * 4 + 0.05;
  osc.stop(end);
  b.live.set(osc, { at: time, amp, lvl, pitch, mods, release: env.release });
  osc.onended = () => {
    b.live.delete(osc);
    amp.disconnect();
    lvl.disconnect();
    pan.disconnect();
  };
  return { at: time, end, osc };
}
