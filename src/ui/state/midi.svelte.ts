// Adapted from yggi/jambot apps/web/src/midi/settings.svelte.ts and apps/web/src/device.svelte.ts @ 8cdb6b8.

import { MidiAccess, type MidiPort, type PortOption } from '../../midi/access';
import { adoptPorts, connectMidi, portsMessage, type ChosenPorts } from '../../midi/routing';
import { MidiOut } from '../../midi/out';
import { DRUM_PRESETS, type DrumMap } from '../../midi/drum-presets';
import { channelTable, DEFAULT_BEND_RANGE, rotationChannels, router, type ChannelTable } from '../../engine/midi';
import type { CompileResult } from '../../engine/program';
import type { Played } from '../../engine/realize';
import { contextClock } from '../../audio/device';
import type { NoteSink } from '../../audio/player';
import { storageKey } from '../../storageKey';

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
};

const NONE: Chosen = { id: 'none', name: '' };
const DEFAULTS: Stored = { out: NONE, in: NONE, channels: {}, drums: {}, internal: true, bendRange: DEFAULT_BEND_RANGE, rotate: null };
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
const channel = (v: unknown, fallback: number) => (Number.isInteger(v) && (v as number) >= 1 && (v as number) <= 16 ? (v as number) : fallback);

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
  #piece = $state.raw<OpenPiece | null>(null);
  #player: Tapped | null = null;
  /** Said when a microtonal piece's notes with different bends overlap on one channel (rotation fixes it). */
  warning = $state<string | null>(null);

  /** What sends the notes played to the output (`midi/out.ts`), through `send`. */
  readonly out = new MidiOut({ send: (data, timestamp) => this.send(data, timestamp) });
  // the routing the out was last given, and the table it came from
  #routed: ChannelTable | null = null;

  /** The open piece's channel table: its voices on their channels (as chosen here, else in order), its kit members on 10. */
  readonly table = $derived.by(() => {
    const p = this.#piece;
    return p ? channelTable(p.program, this.#channels[p.title ?? ''] ?? {}) : null;
  });
  // the channels (0–15) sent on since the last All notes off
  #used = new Set<number>();

  constructor() {
    const kept = load();
    this.#out = kept.out;
    this.#in = kept.in;
    this.#channels = kept.channels;
    this.#drums = kept.drums;
    this.#internal = kept.internal;
    this.#bendRange = kept.bendRange;
    this.#rotate = kept.rotate;
    // a tab frozen while hidden can leave a release unscheduled and hardware sounding: silence it on coming back
    if (typeof document !== 'undefined') document.addEventListener('visibilitychange', this.#onVisible);
    if (this.remembersPorts) void this.connect();
  }

  dispose(): void {
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
    const result = await connectMidi(() => MidiAccess.connect({ onChange: () => this.#changed() }), this);
    this.access = result.access;
    this.message = result.message;
    this.#list();
    this.connecting = false;
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
    if (!(semitones >= 1 && semitones <= 96)) return;
    this.#bendRange = Math.round(semitones);
    this.#save();
  }

  /** The channels notes rotate over (one per sounding note, for microtonal pieces on an MPE synth), or null. */
  get rotate(): Stored['rotate'] {
    return this.#rotate;
  }
  set rotate(range: Stored['rotate']) {
    this.#rotate = range && { from: channel(range.from, 2), to: channel(range.to, 16) };
    this.warning = null;
    this.#save();
  }

  /** Put a voice of the open piece on a channel, kept for that piece in this browser. */
  setChannel(voice: string, ch: number): void {
    const title = this.#piece?.title ?? '';
    this.#channels = { ...this.#channels, [title]: { ...this.#channels[title], [voice]: channel(ch, 1) } };
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

  /** Send a General MIDI drum note as another, on this output. */
  setDrumNote(gm: number, note: number): void {
    if (Number.isInteger(note) && note >= 0 && note <= 127) this.drums = { ...this.drums, [gm]: note };
  }

  /** A window's notes from the player (NoteSink): sent to the output, timestamped for when they're heard. */
  play(T: Parameters<NoteSink['play']>[0], events: readonly Played[], until: number): void {
    const clock = this.outPort && this.#piece ? contextClock(T) : null;
    if (!clock) return;
    clock.update();
    const at = T.immediate();
    const table = this.table;
    if (table && table !== this.#routed) {
      this.#routed = table;
      this.warning = null;
      this.out.onClash = () =>
        (this.warning = 'Notes with different bends overlap on one channel, so some sound out of tune. Rotate the notes over channels (for an MPE synth) to give each its own.');
      this.out.setRoute(router(this.#piece!.program, table), at, clock.toDeviceMs);
    }
    const rotate = this.#rotate && rotationChannels(this.#rotate.from, this.#rotate.to, !!table?.kit.length);
    this.out.setOptions({ drums: this.drums, bendRange: this.#bendRange, rotate }, at, clock.toDeviceMs);
    for (const e of events) this.out.play(e, clock.toDeviceMs);
    this.out.advance(until, clock.toDeviceMs);
  }

  /** The player stopped (NoteSink): silence now, and again past everything already sent ahead. */
  stop(T: Parameters<NoteSink['stop']>[0], window: number): void {
    const clock = this.outPort ? contextClock(T) : null;
    if (!clock) return this.out.forget();
    const now = T.immediate();
    this.out.stop(now, now + T.getContext().lookAhead + window, clock.toDeviceMs);
  }

  /** Send to an output by id (`'none'`: none); what the old one may still hold is silenced first. */
  chooseOutput(id: string): void {
    if (id !== this.#out.id && this.#used.size) this.panic();
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

  /** All notes off (CC 123) on every channel sent on since the last time, or on all 16 if none was; then they are forgotten. */
  panic(): void {
    const port = this.outPort;
    const channels = this.#used.size ? [...this.#used] : ALL_CHANNELS;
    this.#used.clear();
    this.out.forget();
    if (!port) return;
    for (const c of channels)
      try {
        port.send([0xb0 | c, 123, 0]);
      } catch {
        return;
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
      };
      localStorage.setItem(storageKey(KEY), JSON.stringify(kept));
    } catch {
      // (private window, or full: it's only not kept)
    }
  }
}
