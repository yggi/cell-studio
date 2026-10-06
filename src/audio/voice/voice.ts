/**
 * One voice: its chain (notes → [grit] → [filters] → pan → gain → the master, with room and echo sends, and a
 * spectrum tap), or a resonator's bodies in its place; and a note played on it — an oscillator (its braid as
 * the waveform, or a built-in one), or noise, each note its own source so it takes its own bends.
 */
import type { CompileResult, Shifts } from '../../engine/compile';
import { BODIES } from '../../engine/compile';
import { DOUGH_SOURCES } from '../../engine/dough-params';
import type { ParamTrack, Played } from '../../engine/realize';
import { harmonics, waveform } from '../../engine/wave';
import { inputOf, movable, type Disposable, type Movable, type ToneNS } from './nodes';
import { grainOffset, noiseBuffer } from './noise';
import { envelope, num, schedule, type Params } from './params';
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
  last: number;
  live: Set<AudioScheduledSourceNode>;
  /** What moving parameters drive: a filter's frequency and resonance, a send's level. */
  moving: Record<string, Movable>;
  /** A resonator (body=): its modes, rung by strikes, a bow, a neighbour, sound. */
  res?: Resonator;
}

/** Build a voice cell's chain (`key`: its sound, to tell when it must be built again). */
export function buildVoice(Tone: ToneNS, ctx: AudioContext, bus: Bus, result: CompileResult, name: string, shifts: Shifts, key: string): Built {
  const c = result.cells.get(name)!;
  const params = c.params;
  const nodes: Disposable[] = [];
  // chain: notes → [lpf] → [hpf] → pan → gain → master (+ room / delay sends)
  const out = new Tone.Gain(0.4).connect(bus.master);
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
    const r = buildResonator(ctx, c, params.body, inputOf(head));
    nodes.push(r.node);
    res = r.res;
  }
  const moves = c.paramCells ?? {};
  // a parameter's starting value: its number, or the bottom of its range
  const start = (k: string, d: number) => (typeof params[k] === 'number' ? (params[k] as number) : (moves[k]?.range?.[0] ?? d));
  if (typeof params.hpf === 'number' || moves.hpf) {
    const f = new Tone.Filter({ type: 'highpass', frequency: start('hpf', 200), Q: start('hpq', 1) }).connect(head);
    head = f;
    nodes.push(f);
    moving.hpf = movable(f.frequency);
    moving.hpq = movable(f.Q);
  }
  if (typeof params.lpf === 'number' || moves.lpf) {
    const f = new Tone.Filter({ type: 'lowpass', frequency: start('lpf', 2000), Q: start('lpq', 1), rolloff: -24 }).connect(head);
    head = f;
    nodes.push(f);
    moving.lpf = movable(f.frequency);
    moving.lpq = movable(f.Q);
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
  let send: typeof bus.echo = bus.echo;
  if (typeof params.delaytime === 'number') {
    // (a delay line as long as its echo: a dotted half at a slow tempo runs past Tone's default second)
    const time = params.delaytime as number;
    send = new Tone.FeedbackDelay({ delayTime: time, maxDelay: Math.max(1, time + 0.25), feedback: num(params, 'delayfeedback', 0.35), wet: 1 }).connect(bus.master);
    nodes.push(send);
  }
  for (const [k, target] of [['room', bus.reverb], ['delay', send]] as const)
    if (typeof params[k] === 'number' || moves[k] || (k === 'delay' && send !== bus.echo)) {
      const g = new Tone.Gain(start(k, k === 'delay' ? 0.3 : 0)).connect(target);
      out.connect(g);
      nodes.push(g);
      moving[k] = movable(g.gain);
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
  return { res, key, seed: c.seed, params, head, nodes, wave, noise, scope, out, notes: [], last: -Infinity, live: new Set(), moving };
}

/** Let a voice go: its sounding notes stopped, its nodes disposed. */
export function freeVoice(b: Built): void {
  for (const o of b.live) o.stop();
  for (const n of b.nodes) n.dispose();
}

/** Play a note on a voice (`voiceOf`: the others, for FM modulators). */
export function playNote(Tone: ToneNS, ctx: AudioContext, b: Built, note: Played, voiceOf: (name: string) => Built | undefined): void {
  const { freq, gains, env: noteEnv } = note;
  let { at: time, dur: duration, bends, levels, params } = note;
  // a resonator: a note plucks the exciter nearest its pitch
  if (b.res) {
    if (Number.isFinite(time) && b.res.parts.length) strikeAt(ctx, nearest(b.res, freq), time, 0.5);
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
    noteStats.worstLateMs = Math.max(noteStats.worstLateMs, (now - time) * 1000);
    if (time < now - 0.05) {
      noteStats.dropped++;
      return;
    }
    noteStats.late++;
    const late = now + 0.003 - time;
    time += late;
    duration = Math.max(0.02, duration - late);
  }
  noteStats.played++;
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
  // noise: its buffer, looping from somewhere else each note (from the cell's seed, so the same every time);
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
  if (b.noise) (osc as AudioBufferSourceNode).start(time, grainOffset(b.seed, note.voice, note.at, b.noise.duration));
  else osc.start(time);
  osc.stop(time + dur + env.release * 4 + 0.05);
  b.live.add(osc);
  osc.onended = () => {
    b.live.delete(osc);
    amp.disconnect();
    lvl.disconnect();
    pan.disconnect();
  };
}
