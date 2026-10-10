/**
 * Voices for playback: the bank of everything that sounds, behind one interface (VoiceBank — the seam a
 * backend without Tone, or an AudioWorklet, implements: #14). A voice's waveform is its braid (see
 * engine/wave.ts) — or a built-in one when it names a dough source (s=saw, s=white …). Each note is its own
 * oscillator, so it can take its own pitch bends (modulation). Its parameters (dough's names: s lpf lpq hpf
 * …) are listed in engine/attributes.ts. Only built after a user gesture.
 *
 * The parts live in voice/: a voice and its notes (voice.ts), resonators (resonator.ts), sound tapes
 * (tape.ts), noise, parameter tracks, and the bridge to Tone's nodes (nodes.ts). This file wires them to
 * the piece: which voices exist, what each mix hears (the notes going through it: ./gate.ts), what feeds each
 * tape and resonator — the connections wiring.ts lists, from where sound goes (engine/flows.ts, the flows the
 * graph draws).
 */
import type { Played } from '../engine/realize';
import type { CompileResult, Shifts } from '../engine/program';
import { audioContext, disposer, inputOf, type Disposable, type ToneNS } from './voice/nodes';
import { Gate } from './gate';
import { buildVoice, dropGates, freeVoice, letGo, playNote, type Built, type Bus, type Scope } from './voice/voice';
import { keyLevel } from '../engine/keys';
import { bow, couple, damp, driveScale, hush, resonanceOf, strikeAt } from './voice/resonator';
import { wiring } from './wiring';
import { buildTapeNet, fadeOut, freezeTape, holdTape, scrubTape, tapeKey, tapeLevelOf, tapeSpeedOf, type TapeNet } from './voice/tape';

export interface VoiceBank {
  /** Play a note (its times on the audio clock: see engine/schedule.ts `retime`). */
  play(note: Played): void;
  /** Rebuild voices whose sound changed; drop ones that are gone. `muted`: graph ids switched off — what they would feed or ring stays unwired. */
  sync(result: CompileResult, shifts: Shifts, muted?: ReadonlySet<string>): void;
  /** A sound tape's speed over time (audio seconds): its delays follow — the heads' distances ÷ speed. */
  tapeSpeed(tape: string, points: readonly { at: number; speed: number }[]): void;
  /** A tape held (the transport not playing): frozen, its write gate closed, its lap kept as it is — or running again. Only a tape with a loop. */
  tapeFreeze(tape: string, on: boolean): void;
  /** A frozen tape turned: how far behind where it was held (tape-seconds) the content under each head lies; the lap wraps. */
  tapeHold(tape: string, behindFor: (head: number) => number): void;
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
  /**
   * A key pressed (MIDI in, the computer keys, on-screen keys): a note on a voice now, at a frequency, as loud as its
   * velocity (1 … 127), with the voice's own envelope, sounding until `release`. A resonator is struck at the exciter
   * nearest. Returns its id (null: no such voice). A pause leaves it sounding; Stop cuts it.
   */
  press(voice: string, freq: number, velocity: number): number | null;
  /** The key let go: its note goes into its release. An id not pressed, or already let go, is ignored. */
  release(id: number): void;
  /** Frequency of the voice's most recent note to have started (null if none yet). */
  note(voice: string): number | null;
  /** Live FFT (dB per bin), left and right: of a voice (after pan), a mix (the notes that go through it), or the sound card (the master). */
  spectrum(name: string): { left: Float32Array; right: Float32Array; sampleRate: number } | null;
  /**
   * Pause: every note in the air lets go: its gate drops (it goes into its release), what is not yet started is never played.
   * Release tails, effects and resonators ring on.
   */
  dropGates(): void;
  /** Stop: every note cut at once, every body choked to rest, the output closed (the effects' tails are not heard) until `open`. */
  releaseAll(): void;
  /** Open the output again (a hand on the sound, or Play, after Stop). */
  open(): void;
  dispose(): void;
  /** Resolves when everything is ready to sound (the reverb's impulse is made asynchronously). */
  ready(): Promise<void>;
}

export function createVoices(Tone: ToneNS): VoiceBank {
  const ctx = audioContext(Tone);
  // the sound card's level (level=, dB) and then a limiter: nothing past full scale
  const limiter = new Tone.Limiter(-1).toDestination();
  // (and before it a switch: Stop closes it, so that the reverb and the echo, which would ring on for seconds, are not heard)
  const stopped = new Tone.Gain(1).connect(limiter);
  const master = new Tone.Gain(1).connect(stopped);
  const reverb = new Tone.Reverb({ decay: 2.8, preDelay: 0.01, wet: 1 }).connect(master);
  const echo = new Tone.FeedbackDelay({ delayTime: 0.375, feedback: 0.35, wet: 1 }).connect(master);
  const bus: Bus = { master, reverb, echo };
  const built = new Map<string, Built>();
  // (whether a voice is heard from itself — connected to the master — or only through sends)
  const heard = new WeakMap<Built, boolean>();
  let resLinks: AudioNode[] = [];
  // (an oscilloscope's probes: made when asked, gone when the voices are rebuilt)
  let probes = new Map<string, AnalyserNode>();
  let fprobes = new Map<string, AnalyserNode>();
  let tapeNets = new Map<string, TapeNet>();

  const makeScope = (): { input: import('tone').Gain; scope: Scope; nodes: Disposable[] } => {
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
  // a mix's wheel listens to what goes through it (analysis only: the sound goes out through the master): each
  // voice's tap opened by the notes it plays through the mix (wiring.ts `taps`, ./gate.ts)
  let mixes = new Map<string, { scope: Scope; nodes: Disposable[]; input?: import('tone').Gain }>();
  let gates = new Map<string, Gate>();
  let taps: ReadonlyMap<string, readonly string[]> = new Map();
  const gateKey = (voice: string, mix: string) => `${voice}\u0000${mix}`;
  let sinks = new Set<string>();
  // the keys held (press): each note's voice and source, by id
  const keys = new Map<number, { b: Built; osc: AudioScheduledSourceNode }>();
  let lastKey = 0;

  const soundKey = (result: CompileResult, name: string, shifts: Shifts) => {
    const c = result.cells.get(name)!;
    return JSON.stringify([c.params, c.paramCells, c.params.s ? null : [c.units, c.map, shifts(name), c.map?.kind === 'table' ? shifts(c.map.table) : 0]]);
  };

  // an analyser on what something sounds like: a voice (a resonator's bodies), a mix, a tape head — made once, when first asked
  const probe = (into: Map<string, AnalyserNode>, name: string, fftSize: number, smoothing?: number): AnalyserNode | null => {
    let a = into.get(name);
    if (a) return a;
    const b = built.get(name);
    let src: import('tone').ToneAudioNode | undefined = b?.res ? undefined : b?.out;
    if (!b?.res && !src) src = mixes.get(name)?.input;
    if (!b?.res && !src) for (const t of tapeNets.values()) if (t.heads.has(name)) src = t.heads.get(name);
    if (!b?.res && !src) return null;
    a = ctx.createAnalyser();
    a.fftSize = fftSize;
    if (smoothing !== undefined) a.smoothingTimeConstant = smoothing;
    // (a native node — a resonator's level — connects itself; Tone's helper doesn't, silently)
    if (b?.res) b.res.level.connect(a);
    else Tone.connect(src!, a);
    into.set(name, a);
    return a;
  };

  return {
    async ready() {
      await reverb.ready;
    },
    sync(result, shifts, muted = new Set<string>()) {
      // what to connect: worked out from where sound goes (./wiring.ts, engine/flows.ts), off applied there once
      const plan = wiring(result, muted);
      // the sound card's level: level= in dB on the (first) sound card
      const card = [...result.cells.values()].find((c) => c.sink);
      const db = typeof card?.params.level === 'number' ? card.params.level : 0;
      master.gain.value = Math.pow(10, db / 20);
      for (const [name, b] of built) {
        const c = result.cells.get(name);
        if (!c?.voice || soundKey(result, name, shifts) !== b.key) {
          freeVoice(b);
          built.delete(name);
        }
      }
      for (const c of result.cells.values())
        if (c.voice && !built.has(c.name)) built.set(c.name, buildVoice(Tone, ctx, bus, result, c.name, shifts, soundKey(result, c.name, shifts)));
      for (const a of probes.values()) a.disconnect();
      probes = new Map();
      for (const a of fprobes.values()) a.disconnect();
      fprobes = new Map();
      // rewire the mix taps from scratch: cheap, and always matches the code
      for (const m of mixes.values()) for (const n of m.nodes) n.dispose();
      mixes = new Map();
      for (const c of result.cells.values()) if (c.mix) mixes.set(c.name, makeScope());
      // (notes already scheduled keep their taps open on the new ones)
      const oldGates = gates;
      gates = new Map();
      taps = plan.taps;
      sinks = new Set([...result.cells.values()].filter((c) => c.sink).map((c) => c.name));
      // a voice played only into sends (a resonator's excitation, a tape) isn't heard from itself
      for (const [name, b] of built) {
        const want = plan.heard.has(name);
        if (want !== heard.get(b)) {
          if (want) b.out.connect(master);
          else b.out.disconnect(master);
          heard.set(b, want);
        }
      }
      // resonators: heard at the levels of every mix they're in
      for (const t of resLinks) t.disconnect();
      resLinks = [];
      for (const [name, b] of built) {
        if (!b.res) continue;
        const [l, r] = plan.levels.get(name) ?? [0, 0];
        b.res.level.gain.value = (l + r) / 2;
        // (its head is its panner: a resonator has no filters, no grit)
        const pan = b.head instanceof Tone.Panner ? b.head.pan : undefined;
        if (pan && l + r > 0) pan.value = (r - l) / (l + r);
      }
      // sound tapes: a delay network each — the source mix in; a loop of its length back into it
      // (through its loss, its saturation, and what erasing leaves); each read head a tap
      // (a tape whose settings haven't changed is kept — what's on it stays, through pause and play; only
      // its wires, what feeds it and where its heads go, are made again)
      const oldNets = tapeNets;
      tapeNets = new Map();
      const tapes = new Map(result.tapes.map((t) => [t.name, t]));
      const headOut = (head: string) => {
        const play = result.cells.get(head)?.params.play;
        return typeof play === 'string' ? tapeNets.get(play)?.heads.get(head) : undefined;
      };
      for (const w of plan.connections) {
        const v = built.get(w.from);
        if (w.kind === 'tap') {
          const tap = mixes.get(w.to);
          if (!v || !tap) continue;
          const g = ctx.createGain();
          g.gain.value = w.gate ? 0 : w.gain;
          Tone.connect(v.out, g);
          g.connect(inputOf(tap.input!));
          tap.nodes.push(
            disposer(() => {
              g.disconnect();
              // (a voice rebuilt is disconnected already)
              try {
                v.out.disconnect(g);
              } catch {
                /* gone with its voice */
              }
            }),
          );
          if (w.gate) {
            const gate = new Gate(g.gain);
            const now = ctx.currentTime;
            for (const s of oldGates.get(gateKey(w.from, w.to))?.pending(now) ?? []) gate.open(s.a, s.b, now);
            gates.set(gateKey(w.from, w.to), gate);
          }
        } else if (w.kind === 'couple') {
          // through the table, both ways, a little of each into the other
          const a = v?.res;
          const b = built.get(w.to)?.res;
          if (a && b) resLinks.push(...couple(ctx, a, b, w.gain));
        } else if (w.kind === 'excite') {
          // a voice, or a tape's read head, driving a resonator
          const a = built.get(w.to)?.res;
          const out = w.head ? headOut(w.from) : v?.out;
          if (!a || !out) continue;
          const g = ctx.createGain();
          g.gain.value = w.gain * driveScale(a); // (sound driving it rings fully at resonance: no strike's make-up)
          Tone.connect(out, g);
          g.connect(a.exc);
          resLinks.push(g);
        } else if (w.kind === 'thread') {
          const tp = tapes.get(w.from)!;
          const prev = oldNets.get(tp.name);
          let net: TapeNet;
          if (prev && prev.key === tapeKey(tp)) {
            oldNets.delete(tp.name);
            for (const x of prev.wires) x.dispose();
            prev.wires = [];
            net = prev;
          } else net = buildTapeNet(Tone, ctx, tp);
          tapeNets.set(tp.name, net);
        } else if (w.kind === 'record') {
          const net = tapeNets.get(w.to);
          if (!v || !net) continue;
          const g = new Tone.Gain(w.gain).connect(net.input);
          v.out.connect(g);
          net.wires.push(g);
        } else {
          // a read head back to the sound card, left and right at their levels
          const net = tapeNets.get(w.to);
          const d = net?.heads.get(w.from);
          if (!net || !d || !w.gains) continue;
          const l = new Tone.Gain(w.gains[0]);
          const rr = new Tone.Gain(w.gains[1]);
          const merge = new Tone.Merge();
          d.connect(l);
          d.connect(rr);
          l.connect(merge, 0, 0);
          rr.connect(merge, 0, 1);
          merge.connect(master);
          net.wires.push(l, rr, merge);
        }
      }
      for (const n of oldNets.values()) for (const x of n.nodes) x.dispose();
    },

    freqs(name) {
      const a = probe(fprobes, name, 8192, 0.5);
      if (!a) return null;
      const db = new Float32Array(a.frequencyBinCount);
      a.getFloatFrequencyData(db);
      return { db, hz: ctx.sampleRate / a.fftSize };
    },
    waveform(name) {
      const a = probe(probes, name, 2048);
      if (!a) return null;
      const buf = new Float32Array(a.fftSize);
      a.getFloatTimeDomainData(buf);
      return buf;
    },
    strike(name, x, index) {
      const r = built.get(name)?.res;
      const part = r ? (r.parts[index ?? 0] ?? r.parts[0]) : undefined;
      if (part) strikeAt(ctx, part, ctx.currentTime + 0.005, Math.min(1, Math.max(0, x)));
    },
    resonance(name) {
      const r = built.get(name)?.res;
      return r ? resonanceOf(ctx, r) : null;
    },
    damp(name, on) {
      const r = built.get(name)?.res;
      if (r) damp(ctx.currentTime, r, on);
    },
    bow(name, amount) {
      const r = built.get(name)?.res;
      if (r) bow(ctx.currentTime, r, amount);
    },

    tapeLevel(tape) {
      const net = tapeNets.get(tape);
      return net ? tapeLevelOf(net) : null;
    },
    clearTapes() {
      const old = [...tapeNets.values()];
      tapeNets = new Map();
      fadeOut(ctx.currentTime, old);
    },
    tapeFreeze(tape, on) {
      const net = tapeNets.get(tape);
      if (net) freezeTape(ctx.currentTime, net, on);
    },
    tapeHold(tape, behindFor) {
      const net = tapeNets.get(tape);
      if (net) holdTape(ctx.currentTime, net, behindFor);
    },
    tapeScrub(tape, delayFor) {
      const net = tapeNets.get(tape);
      if (net) scrubTape(ctx.currentTime, net, delayFor);
    },
    tapeSpeed(tape, points) {
      const net = tapeNets.get(tape);
      if (net) tapeSpeedOf(net, points);
    },

    play(note: Played) {
      const b = built.get(note.voice);
      if (!b) return;
      const sounds = playNote(Tone, ctx, b, note, (name) => built.get(name));
      // its taps: the wheels of the mixes it goes through hear it while it sounds
      if (sounds && note.output) for (const m of taps.get(note.output) ?? []) gates.get(gateKey(note.voice, m))?.open(sounds.at, sounds.end, ctx.currentTime);
    },

    press(voice, freq, velocity) {
      const b = built.get(voice);
      if (!b || !(freq > 0)) return null;
      const id = ++lastKey;
      const level = keyLevel(velocity);
      // (now, at Tone.immediate(), not through the look-ahead: playNote starts it a few milliseconds on, from silence; it
      // lasts until released, or an hour)
      const at = ctx.currentTime;
      const played = playNote(Tone, ctx, b, { at, dur: 3600, voice, freq, bends: [], gains: [level, level], levels: [{ at, level: 1 }] }, (name) => built.get(name));
      const n = played && b.live.get(played.osc);
      if (played && n) {
        b.live.set(played.osc, { ...n, held: true });
        keys.set(id, { b, osc: played.osc });
      }
      return id;
    },

    release(id) {
      const k = keys.get(id);
      keys.delete(id);
      const n = k?.b.live.get(k.osc);
      // (a key let go before its note has started lets it start, then go: a quick tap is heard, not lost)
      if (k && n) letGo(k.osc, n, Math.max(ctx.currentTime, n.at));
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

    dropGates() {
      const now = ctx.currentTime;
      for (const b of built.values()) dropGates(b, now);
    },

    releaseAll() {
      const now = ctx.currentTime;
      for (const b of built.values()) {
        // (the master gain falls with a 10 ms time constant: 6 of them, so the notes stop at under 0.3 % level, not a click)
        for (const o of b.live.keys()) o.stop(now + 0.06);
        if (b.res) hush(now, b.res);
        b.notes.length = 0;
      }
      keys.clear();
      stopped.gain.cancelScheduledValues(now);
      stopped.gain.setTargetAtTime(0, now, 0.01);
    },

    open() {
      const now = ctx.currentTime;
      stopped.gain.cancelScheduledValues(now);
      stopped.gain.setTargetAtTime(1, now, 0.005);
    },

    dispose() {
      for (const b of built.values()) freeVoice(b);
      built.clear();
      for (const m of mixes.values()) for (const n of m.nodes) n.dispose();
      for (const n of master_.nodes) n.dispose();
      reverb.dispose();
      echo.dispose();
      master.dispose();
      stopped.dispose();
    },
  };
}
