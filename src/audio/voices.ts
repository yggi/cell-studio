/**
 * Voices for playback: the bank of everything that sounds, behind one interface (VoiceBank — the seam a
 * backend without Tone, or an AudioWorklet, implements: #14). A voice's waveform is its braid (see
 * engine/wave.ts) — or a built-in one when it names a dough source (s=saw, s=white …). Each note is its own
 * oscillator, so it can take its own pitch bends (modulation). Its parameters (dough's names: s lpf lpq hpf
 * …) are listed in engine/attributes.ts. Only built after a user gesture.
 *
 * The parts live in voice/: a voice and its notes (voice.ts), resonators (resonator.ts), sound tapes
 * (tape.ts), noise, parameter tracks, and the bridge to Tone's nodes (nodes.ts). This file wires them to
 * the piece: which voices exist, what each mix hears, what feeds each tape and resonator.
 */
import { liveGains, outputSounds, type Played } from '../engine/realize';
import { cellId } from '../engine/ids';
import type { CompileResult, Shifts } from '../engine/program';
import { audioContext, type Disposable, type ToneNS } from './voice/nodes';
import { buildVoice, freeVoice, playNote, type Built, type Bus, type Scope } from './voice/voice';
import { bow, couple, damp, driveScale, resonanceOf, strikeAt } from './voice/resonator';
import { buildTapeNet, fadeOut, scrubTape, tapeKey, tapeLevelOf, tapeSpeedOf, type TapeNet } from './voice/tape';

export interface VoiceBank {
  /** Play a note (its times on the audio clock: see engine/schedule.ts `retime`). */
  play(note: Played): void;
  /** Rebuild voices whose sound changed; drop ones that are gone. `muted`: graph ids switched off — what they would feed or ring stays unwired. */
  sync(result: CompileResult, shifts: Shifts, muted?: ReadonlySet<string>): void;
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

export function createVoices(Tone: ToneNS): VoiceBank {
  const ctx = audioContext(Tone);
  // the sound card's level (level=, dB) and then a limiter: nothing past full scale
  const limiter = new Tone.Limiter(-1).toDestination();
  const master = new Tone.Gain(1).connect(limiter);
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
  // a mix's wheel listens to its voices at their gains (analysis only: the sound goes out through the master)
  let mixes = new Map<string, { scope: Scope; nodes: Disposable[]; input?: import('tone').Gain }>();
  let sinks = new Set<string>();

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
      const off = (name: string) => muted.has(cellId(name));
      // a mix's voices, minus the ones switched off (a mix that is off feeds nothing)
      const feeds = (mix: string) => (off(mix) ? [] : (result.cells.get(mix)?.mix ?? []).filter((b) => !off(b.voice.name)));
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
        ...result.outputs.filter((o) => !o.silent && outputSounds(result, o, muted)).flatMap((o) => (o.kit ? [o.voice, ...(result.cells.get(o.voice)?.children.keys() ?? [])] : [o.voice])),
        ...result.resonances.filter((x) => !off(x.cell)).map((x) => x.cell),
      ]);
      for (const [name, b] of built) {
        const want = heardVoices.has(name);
        if (want !== heard.get(b)) {
          if (want) b.out.connect(master);
          else b.out.disconnect(master);
          heard.set(b, want);
        }
      }
      // resonators: heard at the levels of every mix they're in (struck there, or ringing alone)
      for (const t of resLinks) t.disconnect();
      resLinks = [];
      for (const [name, b] of built) {
        if (!b.res) continue;
        let l = 0;
        let r = 0;
        for (const o of off(name) ? [] : result.outputs) {
          if (o.silent || !outputSounds(result, o, muted)) continue;
          // (struck directly, or as one of a kit's members)
          const kit = o.kit ? result.cells.get(o.voice) : undefined;
          if (o.voice === name || (kit && kit.children.has(name))) {
            const g = liveGains(o, muted);
            (l += g[0]), (r += g[1]);
          }
        }
        for (const x of result.resonances) if (x.cell === name && !off(name)) (l += x.gains[0]), (r += x.gains[1]);
        b.res.level.gain.value = (l + r) / 2;
        // (its head is its panner: a resonator has no filters, no grit)
        const pan = b.head instanceof Tone.Panner ? b.head.pan : undefined;
        if (pan && l + r > 0) pan.value = (r - l) / (l + r);
      }
      for (const c of result.cells.values()) {
        const a = built.get(c.name)?.res;
        if (!a) continue;
        // coupled: through the table, both ways, a little of each into the other
        if (typeof c.params.couple === 'string' && !off(c.name) && !off(c.params.couple)) {
          const bRes = built.get(c.params.couple)?.res;
          const k = typeof c.params.coupling === 'number' ? Math.min(0.2, Math.max(0, c.params.coupling)) : 0.02;
          if (bRes) resLinks.push(...couple(ctx, a, bRes, k));
        }
        // excited by sound: a mix's voices into it
        if (typeof c.params.excite === 'string' && !off(c.name))
          for (const bnd of feeds(c.params.excite)) {
            const v = built.get(bnd.voice.name);
            if (!v || v.res === a) continue;
            const g = ctx.createGain();
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
      const oldNets = tapeNets;
      tapeNets = new Map();
      for (const tp of result.tapes) {
        // (a tape that is off isn't threaded: nothing is recorded, its heads give nothing)
        if (off(tp.name)) continue;
        const prev = oldNets.get(tp.name);
        let net: TapeNet;
        if (prev && prev.key === tapeKey(tp)) {
          oldNets.delete(tp.name);
          for (const w of prev.wires) w.dispose();
          prev.wires = [];
          net = prev;
        } else net = buildTapeNet(Tone, ctx, tp);
        tapeNets.set(tp.name, net);
        for (const b of feeds(tp.source)) {
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
        if (off(r.head) || off(r.tape)) continue;
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
        if (!a || typeof c.params.excite !== 'string' || off(c.name)) continue;
        for (const bnd of feeds(c.params.excite)) {
          const head = result.cells.get(bnd.voice.name);
          const tape = head && typeof head.params.play === 'string' ? tapeNets.get(head.params.play) : undefined;
          const out = tape?.heads.get(bnd.voice.name);
          if (!out) continue;
          const g = ctx.createGain();
          g.gain.value = bnd.gain * driveScale(a); // (sound driving it rings fully at resonance: no strike's make-up)
          Tone.connect(out, g);
          g.connect(a.exc);
          resLinks.push(g);
        }
      }
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
      const part = r ? r.parts[index ?? 0] ?? r.parts[0] : undefined;
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
      if (b) playNote(Tone, ctx, b, note, (name) => built.get(name));
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
      for (const b of built.values()) freeVoice(b);
      built.clear();
      for (const m of mixes.values()) for (const n of m.nodes) n.dispose();
      for (const n of master_.nodes) n.dispose();
      reverb.dispose();
      echo.dispose();
      master.dispose();
    },
  };
}
