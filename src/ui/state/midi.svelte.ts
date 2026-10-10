// Adapted from yggi/jambot apps/web/src/midi/settings.svelte.ts and apps/web/src/device.svelte.ts @ 8cdb6b8.

import { MidiAccess, type MidiPort, type PortOption } from '../../midi/access';
import { adoptPorts, connectMidi, portsMessage, type ChosenPorts } from '../../midi/routing';
import { MidiOut } from '../../midi/out';
import { ClockOut } from '../../midi/clock-out';
import { mainMeter, type ClockTicks } from '../../engine/midiclock';
import { DRUM_PRESETS, type DrumMap } from '../../midi/drum-presets';
import { channelTable, DEFAULT_BEND_RANGE, rotationChannels, router, type ChannelTable } from '../../engine/midi';
import type { CompileResult } from '../../engine/program';
import type { Played } from '../../engine/realize';
import { contextClock } from '../../audio/device';
import type { NoteSink } from '../../audio/player';
import { storageKey } from '../../storageKey';

type ToneNS = Parameters<NoteSink['play']>[0];
type Chosen = { readonly id: string; readonly name: string };
type Numbers = Readonly<Record<string, number>>;
type Stored = {
  readonly out: Chosen;
  readonly in: Chosen;
  /** Channels chosen by hand, per piece (by its title) and voice. */
  readonly channels: Readonly<Record<string, Numbers>>;
  /** Each device's drum map (by the output port's name): General MIDI note to the note it sends. */
  readonly drums: Readonly<Record<string, DrumMap>>;
  /** Whether the built-in sound is heard beside MIDI out. */
  readonly internal: boolean;
  /** The synth's pitch-bend range, in semitones each way. */
  readonly bendRange: number;
  /** The channels notes rotate over (MPE-style), or null: each voice on its own channel. */
  readonly rotate: { readonly from: number; readonly to: number } | null;
  /** Whether each device is sent MIDI clock (by the output port's name). */
  readonly clock: Readonly<Record<string, boolean>>;
};

const NONE: Chosen = { id: 'none', name: '' };
const DEFAULTS: Stored = { out: NONE, in: NONE, channels: {}, drums: {}, internal: true, bendRange: DEFAULT_BEND_RANGE, rotate: null, clock: {} };
const KEY = 'cell-studio:midi';
const ALL_CHANNELS = Array.from({ length: 16 }, (_, i) => i);

const chosen = (v: unknown): Chosen => {
  const c = v as Partial<Chosen> | null | undefined;
  return c && typeof c.id === 'string' && typeof c.name === 'string' ? { id: c.id, name: c.name } : NONE;
};

const isRecord = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const numbers = (v: unknown, lo: number, hi: number): Record<string, number> =>
  isRecord(v) ? Object.fromEntries(Object.entries(v).filter((e): e is [string, number] => Number.isInteger(e[1]) && (e[1] as number) >= lo && (e[1] as number) <= hi)) : {};
const nested = (v: unknown, lo: number, hi: number): Record<string, Numbers> => (isRecord(v) ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, numbers(x, lo, hi)])) : {});
const flags = (v: unknown): Record<string, boolean> => (isRecord(v) ? Object.fromEntries(Object.entries(v).filter((e): e is [string, boolean] => typeof e[1] === 'boolean')) : {});
const channel = (v: unknown, fallback: number) => (Number.isInteger(v) && (v as number) >= 1 && (v as number) <= 16 ? (v as number) : fallback);
/** A number typed into a field, rounded into lo … hi (not a number: `fallback`). */
const clamped = (v: number, lo: number, hi: number, fallback: number) => (Number.isFinite(v) ? Math.max(lo, Math.min(hi, Math.round(v))) : fallback);

/** What this browser kept, merged over the defaults (nothing kept, junk, or no storage: the defaults). */
function load(): Stored {
  try {
    const kept = JSON.parse(localStorage.getItem(storageKey(KEY)) ?? 'null') as Partial<Stored> | null;
    if (!isRecord(kept)) return DEFAULTS;
    const rotate = isRecord(kept.rotate) ? { from: channel(kept.rotate.from, 2), to: channel(kept.rotate.to, 16) } : null;
    return {
      out: chosen(kept.out),
      in: chosen(kept.in),
      channels: nested(kept.channels, 1, 16),
      drums: nested(kept.drums, 0, 127),
      internal: typeof kept.internal === 'boolean' ? kept.internal : true,
      bendRange: typeof kept.bendRange === 'number' && kept.bendRange >= 1 && kept.bendRange <= 96 ? kept.bendRange : DEFAULT_BEND_RANGE,
      rotate,
      clock: flags(kept.clock),
    };
  } catch {
    return DEFAULTS;
  }
}

/** The player MIDI out taps (audio/player.ts): its sink, and whether its own sound is heard. */
interface Tapped {
  sink: NoteSink | null;
  internal: boolean;
}

/** The piece open: what it compiles to, and its title (what its channel table is kept under). */
interface OpenPiece {
  readonly program: CompileResult;
  readonly title: string | null;
}

/**
 * MIDI on this device: the Web MIDI connection, the ports plugged in, the output and input chosen (kept in this browser
 * by id and name), and All notes off. A port chosen before is connected again on load without a click (a permission
 * already granted needs no gesture); a first visit asks for nothing until Connect. `dispose` when it goes.
 */
export class Midi implements ChosenPorts, NoteSink {
  /** The connection, once made. */
  access = $state.raw<MidiAccess | null>(null);
  /** The ports plugged in, as of the last look: at connecting, when one came or went, and when a person asked. */
  ports = $state.raw<{ inputs: PortOption[]; outputs: PortOption[] }>({ inputs: [], outputs: [] });
  /** What happened, in words: the ports found, or why there is no connection. */
  message = $state('Not connected. Without MIDI, everything plays on the built-in sound.');
  connecting = $state(false);
  /** The live port the output chosen resolves to, once connected. */
  outPort = $state.raw<MidiPort | null>(null);

  #out = $state<Chosen>(NONE);
  #in = $state<Chosen>(NONE);
  #channels = $state.raw<Stored['channels']>({});
  #drums = $state.raw<Stored['drums']>({});
  #internal = $state(true);
  #bendRange = $state(DEFAULT_BEND_RANGE);
  #rotate = $state.raw<Stored['rotate']>(null);
  #clock = $state.raw<Stored['clock']>({});
  #piece = $state.raw<OpenPiece | null>(null);
  #player: Tapped | null = null;
  /** Said when a microtonal piece's notes with different bends overlap on one channel (rotation fixes it). */
  warning = $state<string | null>(null);

  /** What sends the notes played to the output (`midi/out.ts`), through `send`. */
  readonly out = new MidiOut({ send: (data, timestamp) => this.send(data, timestamp) });
  /** What sends the main meter's ticks, with Start, Continue and Stop (`midi/clock-out.ts`), through `send`. */
  readonly ticks = new ClockOut({ send: (data, timestamp) => this.send(data, timestamp) });
  // the table the out's routing was last made from, and what it said (a recompile makes a new table, often the same)
  #routed: ChannelTable | null = null;
  #routedAs: string | null = null;
  // Tone, as the player last handed it over: All notes off while playing silences on its clock
  #tone: ToneNS | null = null;

  /** The open piece's channel table: its voices on their channels (as chosen here, else in order), its kit members on 10. */
  readonly table = $derived.by(() => {
    const p = this.#piece;
    return p ? channelTable(p.program, this.#channels[p.title ?? ''] ?? {}) : null;
  });
  /** The open piece's main meter, which the clock's beats are (`engine/midiclock.ts`); null: it sends no clock. */
  readonly meter = $derived(this.#piece ? mainMeter(this.#piece.program) : null);
  // the channels (0–15) sent on since the last All notes off
  #used = new Set<number>();
  // who hears every message from the input listened to (MIDI learn: state/learn.svelte.ts)
  #hearers = new Set<(data: Uint8Array, source: string, timeStamp: number) => void>();

  constructor() {
    const kept = load();
    this.#out = kept.out;
    this.#in = kept.in;
    this.#channels = kept.channels;
    this.#drums = kept.drums;
    this.#internal = kept.internal;
    this.#bendRange = kept.bendRange;
    this.#rotate = kept.rotate;
    this.#clock = kept.clock;
    // a tab frozen while hidden can leave a release unscheduled and hardware sounding: silence it on coming back
    if (typeof document !== 'undefined') document.addEventListener('visibilitychange', this.#onVisible);
    if (this.remembersPorts) void this.connect();
  }

  #disposed = false;

  dispose(): void {
    this.#disposed = true;
    this.access?.close();
    if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', this.#onVisible);
  }

  readonly #onVisible = () => {
    if (document.visibilityState === 'visible' && this.#used.size) this.panic();
  };

  get outPortId(): string {
    return this.#out.id;
  }
  set outPortId(id: string) {
    this.#out = { id, name: this.#out.name };
    this.#save();
  }
  get outPortName(): string {
    return this.#out.name;
  }
  get inPortId(): string {
    return this.#in.id;
  }
  set inPortId(id: string) {
    this.#in = { id, name: this.#in.name };
    this.#save();
  }
  get inPortName(): string {
    return this.#in.name;
  }

  /** Whether a port was chosen before. */
  get remembersPorts(): boolean {
    return this.#out.id !== 'none' || this.#in.id !== 'none';
  }

  /** Connect to Web MIDI and adopt the ports chosen before. */
  async connect(): Promise<void> {
    if (this.connecting) return;
    this.connecting = true;
    const result = await connectMidi(() => MidiAccess.connect({ onChange: () => this.#changed(), onMessage: (...m) => this.#hearers.forEach((h) => h(...m)) }), this);
    // (disposed while asking: the connection comes too late for anyone, so it is let go, not kept listening)
    if (this.#disposed) result.access?.close();
    else {
      this.access = result.access;
      this.message = result.message;
      this.#list();
    }
    this.connecting = false;
  }

  /** Hear every message from the input listened to, raw; the function returned stops it. */
  hear(hearer: (data: Uint8Array, source: string, timeStamp: number) => void): () => void {
    this.#hearers.add(hearer);
    return () => this.#hearers.delete(hearer);
  }

  /** Look at the ports again, on a person's asking. */
  refresh(): void {
    this.access?.refresh();
  }

  /** Tap a player: the notes it plays go to the output too, and its own sound follows the internal-sound switch. */
  attach(player: Tapped, piece: OpenPiece): void {
    this.#player = player;
    this.#piece = piece;
    player.sink = this;
    player.internal = this.#internal;
  }

  /** Whether the built-in sound is heard beside MIDI out (off: MIDI alone, on the same clock). */
  get internal(): boolean {
    return this.#internal;
  }
  set internal(on: boolean) {
    this.#internal = on;
    if (this.#player) this.#player.internal = on;
    this.#save();
  }

  /** The synth's bend range, in semitones each way (2 for most, 48 for MPE). */
  get bendRange(): number {
    return this.#bendRange;
  }
  set bendRange(semitones: number) {
    this.#bendRange = clamped(semitones, 1, 96, this.#bendRange);
    this.#save();
  }

  /** The channels notes rotate over (one per sounding note, for microtonal pieces on an MPE synth), or null. */
  get rotate(): Stored['rotate'] {
    return this.#rotate;
  }
  set rotate(range: Stored['rotate']) {
    this.#rotate = range && { from: clamped(range.from, 1, 16, 2), to: clamped(range.to, 1, 16, 16) };
    this.warning = null;
    this.#save();
  }

  /** Put a voice of the open piece on a channel, kept for that piece in this browser. */
  setChannel(voice: string, ch: number): void {
    const title = this.#piece?.title ?? '';
    this.#channels = { ...this.#channels, [title]: { ...this.#channels[title], [voice]: clamped(ch, 1, 16, 1) } };
    this.#save();
  }

  /** The output's drum map (kept by the port's name): General MIDI note to the note it sends. */
  get drums(): DrumMap {
    return this.#drums[this.#out.name] ?? DRUM_PRESETS.GM;
  }
  set drums(map: DrumMap) {
    this.#drums = { ...this.#drums, [this.#out.name]: map };
    this.#save();
  }

  /** Whether the output is sent MIDI clock (kept by the port's name; off unless switched on). Off while playing: Stop. */
  get sendClock(): boolean {
    return this.#clock[this.#out.name] ?? false;
  }
  set sendClock(on: boolean) {
    if (!on) this.#stopClock();
    this.#clock = { ...this.#clock, [this.#out.name]: on };
    this.#save();
  }

  // Stop on the output, after the ticks already sent, if a run is going
  #stopClock(): void {
    const clock = this.outPort && this.#tone ? contextClock(this.#tone) : null;
    if (clock) this.ticks.stop(this.#tone!.immediate(), clock.toDeviceMs);
  }

  /** Send a General MIDI drum note as another, on this output. */
  setDrumNote(gm: number, note: number): void {
    if (Number.isFinite(note)) this.drums = { ...this.drums, [gm]: clamped(note, 0, 127, 0) };
  }

  /** A window's notes and clock ticks from the player (NoteSink): sent to the output, timestamped for when they're heard. */
  play(T: ToneNS, events: readonly Played[], until: number, ticks: ClockTicks | null = null): void {
    this.#tone = T;
    const clock = this.outPort && this.#piece ? contextClock(T) : null;
    if (!clock) return;
    clock.update();
    const at = T.immediate();
    const table = this.table;
    if (table && table !== this.#routed) {
      // a recompile (an edit, a mute, a held free() moved) routes the next notes anew and keeps what's held; a channel
      // table that says something else silences first
      const as = JSON.stringify(table);
      if (as !== this.#routedAs) {
        if (this.#routedAs !== null) this.out.panic(at, clock.toDeviceMs);
        this.warning = null;
        this.out.onClash = () =>
          (this.warning = 'Notes with different bends overlap on one channel, so some sound out of tune. Rotate the notes over channels (for an MPE synth) to give each its own.');
      }
      [this.#routed, this.#routedAs] = [table, as];
      this.out.setRoute(router(this.#piece!.program, table));
    }
    const rotate = this.#rotate && rotationChannels(this.#rotate.from, this.#rotate.to, !!table?.kit.length);
    this.out.setOptions({ drums: this.drums, bendRange: this.#bendRange, rotate }, at, clock.toDeviceMs);
    for (const e of events) this.out.play(e, clock.toDeviceMs);
    this.out.advance(until, clock.toDeviceMs, at);
    if (this.sendClock) this.ticks.play(ticks, clock.toDeviceMs);
    else this.ticks.stop(at, clock.toDeviceMs);
  }

  /** The player stopped (NoteSink): All notes off now, and a note-off for each note still held; nothing later, so a resume or a seek isn't cut. */
  stop(T: ToneNS): void {
    this.#tone = T;
    const clock = this.outPort ? contextClock(T) : null;
    if (!clock) return this.out.forget();
    this.out.panic(T.immediate(), clock.toDeviceMs);
    this.ticks.stop(T.immediate(), clock.toDeviceMs);
  }

  /** Send to an output by id (`'none'`: none); what the old one may still hold is silenced first. */
  chooseOutput(id: string): void {
    if (id !== this.#out.id) this.#stopClock();
    if (id !== this.#out.id && this.#used.size) this.panic();
    // (what the old one was left ahead is its own business)
    if (id !== this.#out.id) this.out.forget();
    this.#out = { id, name: id === 'none' ? '' : (this.ports.outputs.find((p) => p.id === id)?.name ?? '') };
    this.#save();
    this.outPort = id === 'none' ? null : (this.access?.outputPort(id) ?? null);
  }

  /** Listen to an input by id, `'all'` or `'none'`. */
  chooseInput(id: string): void {
    this.#in = { id, name: this.ports.inputs.find((p) => p.id === id)?.name ?? '' };
    this.#save();
    this.access?.listen(id);
  }

  /** Send a message to the output, noting its channel for All notes off. A port unplugged mid-send throws: nothing is sent. */
  send(data: readonly number[], timestamp?: number): void {
    const port = this.outPort;
    if (!port) return;
    if (data[0] >= 0x80 && data[0] < 0xf0) this.#used.add(data[0] & 0x0f);
    try {
      port.send(data, timestamp);
    } catch {
      // (gone: its next statechange lets go of it)
    }
  }

  /**
   * All notes off (CC 123) on every channel sent on since the last time, or on all 16 if none was; then they are
   * forgotten. While playing, a note-off goes too for each note sent ahead, at its start, which CC 123 now can't reach.
   */
  panic(): void {
    const port = this.outPort;
    const clock = port && this.#tone ? contextClock(this.#tone) : null;
    if (clock) this.out.panic(this.#tone!.immediate(), clock.toDeviceMs);
    else this.out.forget();
    const channels = this.#used.size ? [...this.#used] : ALL_CHANNELS;
    this.#used.clear();
    if (!port) return;
    for (const c of channels)
      try {
        port.send([0xb0 | c, 123, 0]);
      } catch {
        continue; // (one channel's failed send doesn't leave the others sounding)
      }
  }

  // the ports may have changed: adopt the ones chosen again, and list them
  #changed(): void {
    if (this.access) adoptPorts(this.access, this);
    this.#list();
  }

  #list(): void {
    const access = this.access;
    this.ports = { inputs: access?.inputs ?? [], outputs: access?.outputs ?? [] };
    if (access) this.message = portsMessage(this.ports);
  }

  #save(): void {
    try {
      const kept: Stored = {
        out: this.#out,
        in: this.#in,
        channels: this.#channels,
        drums: this.#drums,
        internal: this.#internal,
        bendRange: this.#bendRange,
        rotate: this.#rotate,
        clock: this.#clock,
      };
      localStorage.setItem(storageKey(KEY), JSON.stringify(kept));
    } catch {
      // (private window, or full: it's only not kept)
    }
  }
}
