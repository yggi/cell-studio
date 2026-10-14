// Adapted from yggi/jambot apps/web/src/midi/settings.svelte.ts and apps/web/src/device.svelte.ts @ 8cdb6b8.

import { MidiAccess, type MidiPort, type PortOption } from '../../midi/access';
import { adoptPorts, connectMidi, outputNow, portsMessage, type ChosenPorts } from '../../midi/routing';
import { MidiOut } from '../../midi/out';
import { ClockOut } from '../../midi/clock-out';
import { mainMeter, type ClockTicks } from '@yggi/cells/engine/midiclock';
import { DRUM_PRESETS, deviceNote, type DrumMap } from '../../midi/drum-presets';
import { channelTable, DEFAULT_BEND_RANGE, noteOf, rotationChannels, routable, router, rowsOf, routesOf, type ChannelTable, type OutputChoice } from '@yggi/cells/engine/midi';
import type { CompileResult } from '@yggi/cells/engine/program';
import type { Played } from '@yggi/cells/engine/realize';
import { contextClock } from '../../audio/device';
import type { NoteSink } from '../../audio/player';
import { storageKey } from '../../storageKey';
import { Activity } from '../activity';

type ToneNS = Parameters<NoteSink['play']>[0];
type Chosen = { readonly id: string; readonly name: string };
/** An output of the matrix: the device it sends to (by id and name), under a key its routing is kept by. */
type Column = Chosen & { readonly key: string };
type Numbers = Readonly<Record<string, number>>;
type Range = { readonly from: number; readonly to: number };
type Stored = {
  /** The outputs, in order (at least one: the first is where every voice goes unless routed elsewhere). */
  readonly outputs: readonly Column[];
  readonly in: Chosen;
  /**
   * The matrix chosen by hand, per piece (by its title) and output (by its key): a channel for a gate or voice, or for
   * the kit (under `KIT`); 0 is not sent there.
   */
  readonly routes: Readonly<Record<string, Readonly<Record<string, Numbers>>>>;
  /** Each device's drum map (by the output port's name): General MIDI note to the note it sends. */
  readonly drums: Readonly<Record<string, DrumMap>>;
  /** Whether the built-in sound is heard beside MIDI out. */
  readonly internal: boolean;
  /** The pitch-bend range a device has none of its own takes, in semitones each way. */
  readonly bendRange: number;
  /** The channels notes rotate over (MPE-style) on a device with none of its own, or null: each voice on its own channel. */
  readonly rotate: Range | null;
  /** Each device's pitch-bend range (by the output port's name). */
  readonly bends: Numbers;
  /** Each device's rotation (by the output port's name): the channels notes rotate over, or null. */
  readonly rotates: Readonly<Record<string, Range | null>>;
  /** Whether each device is sent MIDI clock (by the output port's name). */
  readonly clock: Readonly<Record<string, boolean>>;
};

const NONE: Chosen = { id: 'none', name: '' };
/** What the kit's channel is kept under in a piece's routes: no cell can be named so. */
const KIT = '*';
const DEFAULTS: Stored = {
  outputs: [{ key: 'o1', ...NONE }],
  in: NONE,
  routes: {},
  drums: {},
  internal: true,
  bendRange: DEFAULT_BEND_RANGE,
  rotate: null,
  bends: {},
  rotates: {},
  clock: {},
};
const KEY = 'cell-studio:midi';
const ALL_CHANNELS = Array.from({ length: 16 }, (_, i) => i);

const chosen = (v: unknown): Chosen => {
  const c = v as Partial<Chosen> | null | undefined;
  return c && typeof c.id === 'string' && typeof c.name === 'string' ? { id: c.id, name: c.name } : NONE;
};

/** A value kept under a key of its own: a piece titled `constructor` or `__proto__` has none (not the object's). */
const own = <T>(o: Readonly<Record<string, T>>, key: string): T | undefined => (Object.hasOwn(o, key) ? o[key] : undefined);
const isRecord = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const numbers = (v: unknown, lo: number, hi: number): Record<string, number> =>
  isRecord(v) ? Object.fromEntries(Object.entries(v).filter((e): e is [string, number] => Number.isInteger(e[1]) && (e[1] as number) >= lo && (e[1] as number) <= hi)) : {};
const nested = (v: unknown, lo: number, hi: number): Record<string, Numbers> => (isRecord(v) ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, numbers(x, lo, hi)])) : {});
const flags = (v: unknown): Record<string, boolean> => (isRecord(v) ? Object.fromEntries(Object.entries(v).filter((e): e is [string, boolean] => typeof e[1] === 'boolean')) : {});
const rangeOf = (v: unknown): Range | null => (isRecord(v) ? { from: channel(v.from, 2), to: channel(v.to, 16) } : null);
const rangesOf = (v: unknown): Record<string, Range | null> => (isRecord(v) ? Object.fromEntries(Object.entries(v).map(([k, r]) => [k, rangeOf(r)])) : {});
const channel = (v: unknown, fallback: number) => (Number.isInteger(v) && (v as number) >= 1 && (v as number) <= 16 ? (v as number) : fallback);
/** A number typed into a field, rounded into lo … hi (not a number: `fallback`). */
const clamped = (v: number, lo: number, hi: number, fallback: number) => (Number.isFinite(v) ? Math.max(lo, Math.min(hi, Math.round(v))) : fallback);

/** The outputs kept (at least one), each under a key of its own. */
function outputsOf(v: unknown): Column[] {
  const out: Column[] = [];
  if (Array.isArray(v)) for (const x of v) if (isRecord(x) && typeof x.key === 'string' && x.key && !out.some((c) => c.key === x.key)) out.push({ key: x.key, ...chosen(x) });
  return out.length ? out : [{ key: 'o1', ...NONE }];
}

/**
 * What a store from before the matrix kept, as the matrix: the one output as the first (`o1`), each piece's channels
 * and kit channel as its routes there, and the devices of the output slots a piece's MIDI cards named (slot n) as the
 * nth output, where that is still free.
 */
function migrated(kept: Record<string, unknown>): Pick<Stored, 'outputs' | 'routes'> {
  const outputs: Column[] = [{ key: 'o1', ...chosen(kept.out) }];
  const routes: Record<string, Record<string, Numbers>> = {};
  for (const [title, voices] of Object.entries(nested(kept.channels, 1, 16))) routes[title] = { o1: voices };
  for (const [title, kit] of Object.entries(numbers(kept.kits, 1, 16))) routes[title] = { o1: { ...routes[title]?.o1, [KIT]: kit } };
  if (isRecord(kept.slots))
    for (const slots of Object.values(kept.slots))
      if (isRecord(slots))
        for (const [n, c] of Object.entries(slots)) {
          const i = Number(n) - 1;
          if (!Number.isInteger(i) || i < 1 || i > 15 || chosen(c) === NONE) continue;
          while (outputs.length <= i) outputs.push({ key: `o${outputs.length + 1}`, ...NONE });
          if (outputs[i]!.id === 'none') outputs[i] = { key: outputs[i]!.key, ...chosen(c) };
        }
  return { outputs, routes };
}

/** What this browser kept, merged over the defaults (nothing kept, junk, or no storage: the defaults). */
function load(): Stored {
  try {
    const kept = JSON.parse(localStorage.getItem(storageKey(KEY)) ?? 'null') as Record<string, unknown> | null;
    if (!isRecord(kept)) return DEFAULTS;
    const matrix =
      'outputs' in kept
        ? {
            outputs: outputsOf(kept.outputs),
            routes: isRecord(kept.routes) ? Object.fromEntries(Object.entries(kept.routes).map(([t, r]) => [t, nested(r, 0, 16)])) : {},
          }
        : migrated(kept);
    return {
      ...matrix,
      in: chosen(kept.in),
      drums: nested(kept.drums, 0, 127),
      internal: typeof kept.internal === 'boolean' ? kept.internal : true,
      bendRange: typeof kept.bendRange === 'number' && kept.bendRange >= 1 && kept.bendRange <= 96 ? kept.bendRange : DEFAULT_BEND_RANGE,
      rotate: rangeOf(kept.rotate),
      bends: numbers(kept.bends, 1, 96),
      rotates: rangesOf(kept.rotates),
      clock: flags(kept.clock),
    };
  } catch {
    return DEFAULTS;
  }
}

/** One output's senders: its notes (`midi/out.ts`) and its clock (`midi/clock-out.ts`). */
interface Lane {
  readonly out: MidiOut;
  readonly ticks: ClockOut;
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
 * MIDI on this device: the Web MIDI connection, the ports plugged in, the outputs and the input chosen (kept in this
 * browser by id and name), the matrix of which voice goes to which output on which channel (kept per piece), and All
 * notes off. A port chosen before is connected again on load without a click (a permission already granted needs no
 * gesture); a first visit asks for nothing until Connect. `dispose` when it goes.
 */
export class Midi implements ChosenPorts, NoteSink {
  /** The connection, once made. */
  access = $state.raw<MidiAccess | null>(null);
  /** The ports plugged in, as of the last look: at connecting, when one came or went, and when a person asked. */
  ports = $state.raw<{ inputs: PortOption[]; outputs: PortOption[] }>({ inputs: [], outputs: [] });
  /** What happened, in words: the ports found, or why there is no connection. */
  message = $state('Not connected. Without MIDI, everything plays on the built-in sound.');
  connecting = $state(false);
  /** The live port the first output resolves to, once connected. */
  outPort = $state.raw<MidiPort | null>(null);

  #outputs = $state.raw<readonly Column[]>(DEFAULTS.outputs);
  #in = $state<Chosen>(NONE);
  #routes = $state.raw<Stored['routes']>({});
  #drums = $state.raw<Stored['drums']>({});
  #internal = $state(true);
  #bendRange = $state(DEFAULT_BEND_RANGE);
  #rotate = $state.raw<Stored['rotate']>(null);
  #bends = $state.raw<Stored['bends']>({});
  #rotates = $state.raw<Stored['rotates']>({});
  #clock = $state.raw<Stored['clock']>({});
  #piece = $state.raw<OpenPiece | null>(null);
  #player: Tapped | null = null;
  /** Said when a microtonal piece's notes with different bends overlap on one channel (rotation fixes it). */
  warning = $state<string | null>(null);

  /** When a message last came in and went out, for the transport's light (#262). */
  readonly activity = new Activity();

  /** Each output's senders, by its key, made when first used. */
  readonly #lanes = new Map<string, Lane>();
  // the table the lanes' routing was last made from, the outputs it was made for, and what it said (a recompile makes
  // a new table, often the same)
  #routed: ChannelTable | null = null;
  #routedFor = '';
  #routedAs: string | null = null;
  // Tone, as the player last handed it over: All notes off while playing silences on its clock
  #tone: ToneNS | null = null;
  // per output (by key), the channels (0–15) sent on since the last All notes off
  #used = new Map<string, Set<number>>();
  // who hears every message from the input listened to (MIDI learn: state/learn.svelte.ts)
  #hearers = new Set<(data: Uint8Array, source: string, timeStamp: number) => void>();

  /** The open piece's choices on each output, from its routes (none chosen: the defaults, `engine/midi.ts`). */
  #choices(): OutputChoice[] {
    const mine = own(this.#routes, this.#piece?.title ?? '') ?? {};
    return this.#outputs.map((c) => {
      const { [KIT]: kit, ...voices } = own(mine, c.key) ?? {};
      return { voices, kit };
    });
  }

  /** The open piece's channel table: each voice on its channels of each output, as chosen here (else on the first, in order), its kit members' notes. */
  readonly table = $derived.by(() => {
    const p = this.#piece;
    return p ? channelTable(p.program, this.#choices()) : null;
  });

  /**
   * The outputs, as the matrix's columns: each with its number (1 the first; on a piece's MIDI cards, the slot `map=midi(c, n)`
   * names), the key its routing is kept under, and the device it sends to. A piece whose cards name a slot past the
   * outputs has a column for it too, with no device (null key) until one is chosen.
   */
  readonly columns = $derived.by(() => {
    const cols = this.#outputs.map((c, i) => ({ port: i + 1, key: c.key as string | null, id: c.id, name: c.name }));
    for (let n = cols.length + 1; n <= Math.max(0, ...(this.table?.ports ?? [])); n++) cols.push({ port: n, key: null, id: 'none', name: '' });
    return cols;
  });

  /** The matrix's rows: the gates and voices of the open piece (on MIDI cards, those they name), in its order; and whether it has a kit. */
  readonly rows = $derived.by(() => {
    const p = this.#piece;
    if (!p || !this.table) return { voices: [] as string[], kit: false };
    const voices = this.table.byPiece ? [...new Set(this.table.voices.map((v) => v.voice))] : routable(p.program).voices;
    return { voices, kit: this.table.kit.length > 0 };
  });

  /** The ports plugged in that no output sends to yet: the outputs the page offers to add. */
  readonly spare = $derived(this.ports.outputs.filter((p) => !this.#outputs.some((c) => c.id === p.id)));

  /** The open piece's main meter, which the clock's beats are (`engine/midiclock.ts`); null: it sends no clock. */
  readonly meter = $derived(this.#piece ? mainMeter(this.#piece.program) : null);

  constructor() {
    const kept = load();
    this.#outputs = kept.outputs;
    this.#in = kept.in;
    this.#routes = kept.routes;
    this.#drums = kept.drums;
    this.#internal = kept.internal;
    this.#bendRange = kept.bendRange;
    this.#rotate = kept.rotate;
    this.#bends = kept.bends;
    this.#rotates = kept.rotates;
    this.#clock = kept.clock;
    // a tab frozen while hidden can leave a release unscheduled and hardware sounding: silence it on coming back
    if (typeof document !== 'undefined') document.addEventListener('visibilitychange', this.#onVisible);
    if (this.remembersPorts) void this.#reconnect();
  }

  // on load: only when the browser has granted MIDI already, or the prompt would come up unasked on every visit
  async #reconnect(): Promise<void> {
    this.connecting = true;
    const granted = await MidiAccess.granted();
    this.connecting = false;
    if (granted) return this.connect();
    if (!this.#disposed && !this.access) this.message = 'MIDI is chosen here, but the browser has not allowed it (yet): press Connect.';
  }

  #disposed = false;

  dispose(): void {
    this.#disposed = true;
    this.access?.close();
    if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', this.#onVisible);
  }

  readonly #onVisible = () => {
    if (document.visibilityState !== 'visible') return;
    if ([...this.#used.values()].some((u) => u.size) || this.#lanes.size) this.panic();
    // (keys held from the input while hidden may have lost their note-offs: they let go too)
    else this.#letGoAll();
  };

  /**
   * Told when the keys held from the input should all let go: All notes off (the MIDI page's, or on coming back into
   * view), and the input changed or unplugged, whose note-offs will never come. The function returned stops it.
   */
  letGo(listener: (alive?: ReadonlySet<string>) => void): () => void {
    this.#letGoers.add(listener);
    return () => this.#letGoers.delete(listener);
  }
  #letGoers = new Set<(alive?: ReadonlySet<string>) => void>();
  // all of them let go; or, told which inputs are still there, only the keys held from an input that is not
  #letGoAll(alive?: ReadonlySet<string>): void {
    for (const l of this.#letGoers) l(alive);
  }

  get #first(): Column {
    return this.#outputs[0]!; // (there is always one)
  }

  get outPortId(): string {
    return this.#first.id;
  }
  set outPortId(id: string) {
    this.#outputs = [{ ...this.#first, id }, ...this.#outputs.slice(1)];
    this.#save();
  }
  get outPortName(): string {
    return this.#first.name;
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

  /** Whether any output sends to a device (chosen, plugged in or not). */
  get sending(): boolean {
    return this.#outputs.some((c) => c.id !== 'none');
  }

  /** Whether every output chosen is absent (unplugged): nothing can go out. */
  get sendingNowhere(): boolean {
    return this.#outputs.every((c) => c.id === 'none' || !this.ports.outputs.some((p) => p.id === c.id));
  }

  /** Whether a port was chosen before. */
  get remembersPorts(): boolean {
    return this.sending || this.#in.id !== 'none';
  }

  /** Is there anything for All notes off to reach: an output plugged in? */
  get canPanic(): boolean {
    return this.#outputs.some((_, i) => this.portOf(i + 1));
  }

  /** Connect to Web MIDI and adopt the ports chosen before. */
  async connect(): Promise<void> {
    if (this.connecting) return;
    this.connecting = true;
    const result = await connectMidi(
      () => MidiAccess.connect({ onChange: () => this.#changed(), onMessage: (...m) => this.#heard(...m) }),
      this,
      () => !this.#disposed,
    );
    // (disposed while asking: the connection comes too late for anyone, so it is let go, not kept listening)
    if (this.#disposed) result.access?.close();
    else {
      this.access = result.access;
      this.message = result.message;
      this.#list();
      // (the input chosen is there or not from now on: its being unplugged later is a change)
      this.#heardFrom = this.#inputThere();
    }
    this.connecting = false;
  }

  // a message from the input: the light flashes (not for system messages: a device's active sensing), then it is heard
  #heard(data: Uint8Array, source: string, timeStamp: number): void {
    if (data[0]! < 0xf0) this.activity.hit('in');
    for (const h of this.#hearers) h(data, source, timeStamp);
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

  /** Tap a player: the notes it plays go to the outputs too, and its own sound follows the internal-sound switch. */
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

  // an output's device name ('' for none, or no such output): what its settings are kept under
  #nameOf(port: number): string {
    return this.columns[port - 1]?.name ?? '';
  }

  /** An output's bend range, in semitones each way (2 for most, 48 for MPE), kept per device. */
  bendOf(port: number): number {
    return own(this.#bends, this.#nameOf(port)) ?? this.#bendRange;
  }
  setBend(port: number, semitones: number): void {
    this.#bends = { ...this.#bends, [this.#nameOf(port)]: clamped(semitones, 1, 96, this.bendOf(port)) };
    this.#save();
  }

  /** The channels an output's notes rotate over (one per sounding note, for microtonal pieces on an MPE synth), or null; kept per device. */
  rotateOf(port: number): Range | null {
    const name = this.#nameOf(port);
    return Object.hasOwn(this.#rotates, name) ? this.#rotates[name]! : this.#rotate;
  }
  setRotate(port: number, range: Range | null): void {
    this.#rotates = { ...this.#rotates, [this.#nameOf(port)]: range && { from: clamped(range.from, 1, 16, 2), to: clamped(range.to, 1, 16, 16) } };
    this.warning = null;
    this.#save();
  }

  /** The first output's bend range. */
  get bendRange(): number {
    return this.bendOf(1);
  }
  set bendRange(semitones: number) {
    this.setBend(1, semitones);
  }

  /** The first output's rotation. */
  get rotate(): Range | null {
    return this.rotateOf(1);
  }
  set rotate(range: Range | null) {
    this.setRotate(1, range);
  }

  /** The channels a voice of the open piece goes out on, on an output (1 the first): none, not sent there. */
  channelsOf(voice: string, port: number): number[] {
    return (this.table?.voices ?? []).filter((v) => v.voice === voice && v.port === port).map((v) => v.channel);
  }

  /** The channels the open piece's kit goes out on, on an output (1 the first): none, not sent there. */
  kitChannelsOf(port: number): number[] {
    return (this.table?.kits ?? []).filter((k) => k.port === port).map((k) => k.channel);
  }

  // keep a crossing of the matrix (a voice, or KIT) for the open piece: a channel on an output, 0 not sent there
  #route(what: string, ch: number, port: number): void {
    const key = this.#outputs[port - 1]?.key;
    if (!key) return;
    const title = this.#piece?.title ?? '';
    const mine = own(this.#routes, title) ?? {};
    this.#routes = { ...this.#routes, [title]: { ...mine, [key]: { ...own(mine, key), [what]: ch } } };
    this.#save();
  }

  /** Put a voice of the open piece on a channel of an output (1 the first; 0: not sent there), kept for that piece in this browser. */
  setChannel(voice: string, ch: number, port = 1): void {
    this.#route(voice, clamped(ch, 0, 16, 0), port);
  }

  /** Put the open piece's kit on a channel of an output (1 the first; 0: not sent there), kept for that piece in this browser. */
  setKitChannel(ch: number, port = 1): void {
    this.#route(KIT, clamped(ch, 0, 16, 0), port);
  }

  /**
   * The channel the open piece's kit goes on on the first output (10 unless put elsewhere; its MIDI card's, on a piece
   * with cards), and so the channel MIDI in's kit keys are on; General MIDI's 10 when it goes on none there. Set: kept
   * for that piece in this browser.
   */
  get kitChannel(): number {
    return (this.table?.byPiece ? this.kitChannelsOf(1)[0] : this.#choices()[0]?.kit) || 10;
  }
  set kitChannel(ch: number) {
    this.setKitChannel(clamped(ch, 1, 16, 10));
  }

  /** The channel MIDI in's kit keys are on (1 … 16): `kitChannel`. */
  get padChannel(): number {
    return this.kitChannel;
  }

  /**
   * Where thru echoes a key played live on a voice (the keys, `state/keys.svelte.ts`): every output and channel its row
   * of the matrix goes to (a gate's, for a voice played through one), and the note it is there: a kit member's drum note
   * through each output's drum map, else the key nearest the frequency it sounds. None: the voice isn't sent.
   */
  thruOf(voice: string, freq: number, kit: boolean, a4 = 440): { port: number; channel: number; note: number }[] {
    const p = this.#piece;
    const table = this.table;
    if (!p || !table) return [];
    if (kit) {
      const gm = table.kit.find((k) => k.member === voice)?.note;
      return gm === undefined ? [] : table.kits.map((k) => ({ port: k.port, channel: k.channel, note: deviceNote(this.drumsOf(k.port), gm) }));
    }
    const note = noteOf(freq, a4).note;
    if (!(note >= 0 && note <= 127)) return [];
    const rows = new Set(rowsOf(p.program, voice));
    return table.voices.filter((v) => rows.has(v.voice)).map((v) => ({ port: v.port, channel: v.channel, note }));
  }

  /** Send a message to an output (1 the first), noting its channel for All notes off. */
  sendTo(port: number, data: readonly number[]): void {
    const c = this.#outputs[port - 1];
    if (c) this.#sendTo(c.key, data);
  }

  /** The channels (1–16) MIDI in plays the kit on: every channel the open piece's kit goes on, on any output; none, `kitChannel`. */
  get drumChannels(): readonly number[] {
    const kits = (this.table?.kits ?? []).map((k) => k.channel);
    return kits.length ? [...new Set(kits)] : [this.kitChannel];
  }

  /** The drum map of the device a message came from (by the port's name: kept with its output's), General MIDI if it has none. */
  drumsFrom(source: string): DrumMap {
    return own(this.#drums, source) ?? DRUM_PRESETS.GM!;
  }

  // the live output port named as an input is (a controller's other half), or null
  #portNamed(name: string): MidiPort | null {
    const p = this.access?.outputs.find((o) => o.name === name);
    return p ? (this.access?.outputPort(p.id) ?? null) : null;
  }

  /** Whether an echo to a controller can go out: to its output port (by the input's name), or, from a knob learned before that was kept, the first output. */
  reaches(controller: string | undefined): boolean {
    return controller === undefined ? !!this.outPort : !!this.#portNamed(controller);
  }

  /** Send a learned knob's value back to its controller (motor faders, LED rings): to the output port of its name, not to a synth. */
  echo(controller: string | undefined, data: readonly number[]): void {
    if (controller === undefined) return this.send(data);
    const port = this.#portNamed(controller);
    try {
      port?.send(data);
      if (port) this.#flash(data);
    } catch {
      // (gone: its next statechange lets go of it)
    }
  }

  /** An output's drum map (kept by its device's name): General MIDI note to the note it sends. */
  drumsOf(port: number): DrumMap {
    return this.#drums[this.columns[port - 1]?.name ?? ''] ?? DRUM_PRESETS.GM!; // (GM is one of the presets)
  }
  /** Set an output's drum map, kept for its device. */
  setDrums(port: number, map: DrumMap): void {
    const name = this.columns[port - 1]?.name;
    if (name === undefined) return;
    this.#drums = { ...this.#drums, [name]: map };
    this.#save();
  }

  /** The first output's drum map (MIDI in reads a device's notes back through it). */
  get drums(): DrumMap {
    return this.drumsOf(1);
  }
  set drums(map: DrumMap) {
    this.setDrums(1, map);
  }

  /** Send a General MIDI drum note as another, on an output (1 the first). */
  setDrumNote(gm: number, note: number, port = 1): void {
    if (Number.isFinite(note)) this.setDrums(port, { ...this.drumsOf(port), [gm]: clamped(note, 0, 127, 0) });
  }

  /** Whether an output is sent MIDI clock (kept by its device's name; off unless switched on). Off while playing: Stop. */
  clockOf(port: number): boolean {
    return this.#clock[this.columns[port - 1]?.name ?? ''] ?? false;
  }
  setClock(port: number, on: boolean): void {
    const c = this.#outputs[port - 1];
    if (!c) return;
    if (!on) this.#stopClock(c.key);
    this.#clock = { ...this.#clock, [c.name]: on };
    this.#save();
  }

  /** Whether the first output is sent MIDI clock. */
  get sendClock(): boolean {
    return this.clockOf(1);
  }
  set sendClock(on: boolean) {
    this.setClock(1, on);
  }

  /** Whether any output is sent MIDI clock. */
  get clocking(): boolean {
    return this.#outputs.some((_, i) => this.clockOf(i + 1));
  }

  // Stop on an output, after the ticks already sent, if a run is going
  #stopClock(key: string): void {
    const lane = this.#lanes.get(key);
    const clock = lane && this.#tone && this.portOf(this.#portNumber(key)) ? contextClock(this.#tone) : null;
    if (clock) lane!.ticks.stop(this.#tone!.immediate(), clock.toDeviceMs);
  }

  // an output's number now (1 the first), by its key; 0: gone
  #portNumber(key: string): number {
    return this.#outputs.findIndex((c) => c.key === key) + 1;
  }

  /** The live port an output (1 the first) sends to now, or null: none chosen, not plugged in, or no such output. */
  portOf(port: number): MidiPort | null {
    if (port === 1) return this.outPort;
    const c = this.#outputs[port - 1];
    return c && this.access ? outputNow(this.access, c) : null;
  }

  /** Send to a device by id (`'none'`: none) on the first output; what the old one may still hold is silenced first. */
  chooseOutput(id: string): void {
    this.chooseDevice(1, id);
  }

  /**
   * Send an output (1 the first; on a piece's MIDI cards, its slot) to a device by id (`'none'`: none); what the old one
   * may still hold is silenced first, and its clock stopped. An output past the last is added, with the ones before it.
   */
  chooseDevice(port: number, id: string): void {
    const at = this.#outputs[port - 1];
    if (at && id === at.id) return;
    if (at) this.#silence(at.key);
    const name = id === 'none' ? '' : (this.ports.outputs.find((p) => p.id === id)?.name ?? '');
    const outputs = [...this.#outputs];
    while (outputs.length < port) outputs.push({ key: this.#newKey(outputs), ...NONE });
    outputs[port - 1] = { key: outputs[port - 1]!.key, id, name };
    this.#outputs = outputs;
    this.#save();
    if (port === 1) this.outPort = id === 'none' ? null : (this.access?.outputPort(id) ?? null);
  }

  /** Add an output sending to a device by id; nothing is routed to it until chosen in the matrix. */
  addOutput(id: string): void {
    if (this.#outputs.length >= 16) return;
    this.chooseDevice(this.#outputs.length + 1, id);
  }

  /** Remove an output (1 the first: the next becomes the first), silencing it; the routing kept for it goes too. Never the last. */
  removeOutput(port: number): void {
    const c = this.#outputs[port - 1];
    if (!c || this.#outputs.length < 2) return;
    this.#silence(c.key);
    this.#lanes.delete(c.key);
    this.#used.delete(c.key);
    this.#outputs = this.#outputs.filter((o) => o !== c);
    this.#routes = Object.fromEntries(Object.entries(this.#routes).map(([t, r]) => [t, Object.fromEntries(Object.entries(r).filter(([k]) => k !== c.key))]));
    if (port === 1) this.outPort = this.access ? outputNow(this.access, this.#first) : null;
    this.#save();
  }

  #newKey(outputs: readonly Column[]): string {
    let n = outputs.length + 1;
    while (outputs.some((c) => c.key === `o${n}`)) n++;
    return `o${n}`;
  }

  // an output about to change or go: its clock stopped, All notes off on what it sent, and what it held forgotten
  #silence(key: string): void {
    this.#stopClock(key);
    if (this.#used.get(key)?.size) this.#panicLane(key);
    // (what the old one was left ahead is its own business)
    this.#lanes.get(key)?.out.forget();
    this.#used.delete(key);
  }

  #lane(key: string): Lane {
    let lane = this.#lanes.get(key);
    if (!lane) {
      const send = { send: (data: readonly number[], timestamp?: number) => this.#sendTo(key, data, timestamp) };
      this.#lanes.set(key, (lane = { out: new MidiOut(send), ticks: new ClockOut(send) }));
    }
    return lane;
  }

  /** A window's notes and clock ticks from the player (NoteSink): sent to every output, timestamped for when they're heard. */
  play(T: ToneNS, events: readonly Played[], until: number, ticks: ClockTicks | null = null): void {
    this.#tone = T;
    const live = this.#outputs.flatMap((c, i) => (this.portOf(i + 1) ? [{ c, port: i + 1 }] : []));
    const clock = live.length && this.#piece ? contextClock(T) : null;
    if (!clock) return;
    clock.update();
    const at = T.immediate();
    const table = this.table;
    const layout = this.#outputs.map((c) => c.key).join();
    if (table && (table !== this.#routed || layout !== this.#routedFor)) {
      // a recompile (an edit, a mute, a held free() moved) routes the next notes anew and keeps what's held; a channel
      // table that says something else silences first
      const as = JSON.stringify(table);
      if (as !== this.#routedAs) {
        if (this.#routedAs !== null) for (const lane of this.#lanes.values()) lane.out.panic(at, clock.toDeviceMs);
        this.warning = null;
      }
      [this.#routed, this.#routedFor, this.#routedAs] = [table, layout, as];
      // (each output sends the routes on it: on a piece's MIDI cards, those of its slot)
      const route = router(this.#piece!.program, table);
      this.#outputs.forEach((c, i) => {
        const out = this.#lane(c.key).out;
        out.setRoute((e) => routesOf(route(e)).filter((r) => (r.port ?? 1) === i + 1));
        out.onClash = () =>
          (this.warning = `Notes with different bends overlap on one channel of output ${i + 1}${c.name ? ` (${c.name})` : ''}, so some sound out of tune. Rotate its notes over channels (for an MPE synth) to give each its own.`);
      });
    }
    for (const { c, port } of live) {
      const lane = this.#lane(c.key);
      // (rotation is for voices routed here: a piece's MIDI cards say the channels themselves)
      const kit = this.kitChannelsOf(port);
      const range = this.rotateOf(port);
      const rotate = !table?.byPiece && range ? rotationChannels(range.from, range.to, kit.length > 0, kit[0]) : null;
      lane.out.setOptions({ drums: this.drumsOf(port), bendRange: this.bendOf(port), rotate }, at, clock.toDeviceMs);
      for (const e of events) lane.out.play(e, clock.toDeviceMs);
      lane.out.advance(until, clock.toDeviceMs, at);
      if (this.clockOf(port)) lane.ticks.play(ticks, clock.toDeviceMs);
      else lane.ticks.stop(at, clock.toDeviceMs);
    }
  }

  /** The player stopped (NoteSink): All notes off now, and a note-off for each note still held; nothing later, so a resume or a seek isn't cut. */
  stop(T: ToneNS): void {
    this.#tone = T;
    const clock = this.canPanic ? contextClock(T) : null;
    for (const [key, lane] of this.#lanes)
      if (clock && this.portOf(this.#portNumber(key))) {
        lane.out.panic(T.immediate(), clock.toDeviceMs);
        lane.ticks.stop(T.immediate(), clock.toDeviceMs);
      } else lane.out.forget();
  }

  /** Listen to an input by id, `'all'` or `'none'`. */
  chooseInput(id: string): void {
    if (id !== this.#in.id) this.#letGoAll();
    this.#in = { id, name: this.ports.inputs.find((p) => p.id === id)?.name ?? '' };
    this.#heardFrom = this.#inputThere();
    this.#save();
    this.access?.listen(id);
  }

  // a note or a control sent (not the clock's ticks) flashes the light, at the moment it is heard
  #flash(data: readonly number[], timestamp?: number): void {
    if (data[0]! >= 0x80 && data[0]! < 0xf0) this.activity.hit('out', timestamp);
  }

  // send to an output (by key), noting its channel for All notes off; a port unplugged mid-send throws: nothing is sent
  #sendTo(key: string, data: readonly number[], timestamp?: number): void {
    const port = this.portOf(this.#portNumber(key));
    if (!port) return;
    if (data[0]! >= 0x80 && data[0]! < 0xf0) {
      const used = this.#used.get(key) ?? new Set<number>();
      this.#used.set(key, used.add(data[0]! & 0x0f));
    }
    try {
      port.send(data, timestamp);
      this.#flash(data, timestamp);
    } catch {
      // (gone: its next statechange lets go of it)
    }
  }

  /** Send a message to the first output (thru, a learned knob's echo), noting its channel for All notes off. */
  send(data: readonly number[], timestamp?: number): void {
    this.#sendTo(this.#first.key, data, timestamp);
  }

  /**
   * All notes off (CC 123), on every output: on every channel sent on there since the last time, or on all 16 if none
   * was; then they are forgotten. While playing, a note-off goes too for each note sent ahead, at its start, which CC
   * 123 now can't reach.
   */
  panic(): void {
    this.#letGoAll();
    for (const c of this.#outputs) this.#panicLane(c.key);
  }

  #panicLane(key: string): void {
    const port = this.portOf(this.#portNumber(key));
    const lane = this.#lanes.get(key);
    const clock = port && this.#tone ? contextClock(this.#tone) : null;
    if (clock) lane?.out.panic(this.#tone!.immediate(), clock.toDeviceMs);
    else lane?.out.forget();
    const used = this.#used.get(key);
    const channels = used?.size ? [...used] : ALL_CHANNELS;
    this.#used.delete(key);
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
    // (the input listened to gone: its keys' note-offs will never come; an unrelated device coming or going is not that)
    const there = this.#inputThere();
    if (this.#heardFrom && !there) this.#letGoAll();
    // (under All inputs, one of them unplugged: the keys held from it let go, the others' stay)
    else if (this.#in.id === 'all' && this.access) this.#letGoAll(new Set(this.access.inputs.map((p) => p.name)));
    this.#heardFrom = there;
  }

  // whether the input chosen is there to listen to ('none' and 'all' always are)
  #heardFrom = false;
  #inputThere(): boolean {
    const id = this.#in.id;
    return !!this.access && (id === 'none' || id === 'all' || this.access.inputs.some((p) => p.id === id));
  }

  #list(): void {
    const access = this.access;
    this.ports = { inputs: access?.inputs ?? [], outputs: access?.outputs ?? [] };
    if (access) this.message = portsMessage(this.ports);
  }

  #save(): void {
    try {
      const kept: Stored = {
        outputs: this.#outputs,
        in: this.#in,
        routes: this.#routes,
        drums: this.#drums,
        internal: this.#internal,
        bendRange: this.#bendRange,
        rotate: this.#rotate,
        bends: this.#bends,
        rotates: this.#rotates,
        clock: this.#clock,
      };
      localStorage.setItem(storageKey(KEY), JSON.stringify(kept));
    } catch {
      // (private window, or full: it's only not kept)
    }
  }
}
