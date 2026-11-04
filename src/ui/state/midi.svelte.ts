// Adapted from yggi/jambot apps/web/src/midi/settings.svelte.ts and apps/web/src/device.svelte.ts @ 8cdb6b8. What is
// kept moved onto webmidi's setups (decision 040): the book in `cell-studio:midi-setups`, read through webmidi's
// `localBookStore`; the store from before it (`cell-studio:midi`) migrated once through `fromCellStudio`.

import { MidiAccess, localBookStore } from '@yggi/webmidi/web';
import {
  activeSetup,
  addOutput,
  chooseDevice,
  ClockOut,
  DRUM_PRESETS,
  deviceNote,
  fit,
  fromCellStudio,
  loadBook,
  MidiOut,
  outputNow,
  portsMessage,
  profileOf,
  removeOutput,
  withClock,
  withCrossing,
  withPlays,
  heardOf,
  isHeard,
  listenOf,
  playsOf,
  inputRow,
  ANY_INPUT,
  withProfile,
  type BookStore,
  type DeviceProfile,
  type DrumMap,
  type MidiPort,
  type PortOption,
  type Routes as BookRoutes,
  type SetupBook,
  type SetupOutput,
} from '@yggi/webmidi/core';
import { mainMeter, type ClockTicks } from '@yggi/cells/engine/midiclock';
import { channelTable, noteOf, rotationChannels, routable, router, rowsOf, routesOf, type ChannelTable, type OutputChoice, type Routes } from '@yggi/cells/engine/midi';
import type { CompileResult } from '@yggi/cells/engine/program';
import type { Played } from '@yggi/cells/engine/realize';
import { outRuns } from '../../midi/played';
import { contextClock } from '../../audio/device';
import type { NoteSink } from '../../audio/player';
import { storageKey } from '../../storageKey';
import { Activity } from '../activity';
import {
  choicesOf,
  contextOf,
  forwards,
  keptChange,
  lockedChange,
  KIT,
  oldChoicesOf,
  own,
  readOldStore,
  routesOfTable,
  rowsOfPiece,
  slotsOf,
  withContext,
  withSetup,
  type OldRoutes,
  type OldStore,
} from './patch';

type ToneNS = Parameters<NoteSink['play']>[0];
type Range = { readonly from: number; readonly to: number };
type ToDeviceMs = (seconds: number) => number;

/** The store from before the book: read once, to migrate (`fromCellStudio`), and for the routes it chose (`legacy`). */
const OLD_KEY = 'cell-studio:midi';
/** webmidi's book: the device profiles and the setups. */
const BOOK_KEY = 'cell-studio:midi-setups';
/** What stays Cell studio's own: the built-in sound, and the routes the store before the book chose per piece. */
const OWN_KEY = 'cell-studio:midi-own';
const ALL_CHANNELS = Array.from({ length: 16 }, (_, i) => i);
/** A test note's length, in ms. */
const TEST_MS = 300;

/** What Cell studio keeps beside the book. */
interface Own {
  /** Whether the built-in sound is heard beside MIDI out. */
  readonly internal: boolean;
  /**
   * The routes the store before the book chose, per piece title, by output key: a piece the setup in use has no routes
   * for plays them (cells' defaults where they chose nothing), as it did, until its matrix is changed (decision 040).
   */
  readonly legacy: Readonly<Record<string, OldRoutes>>;
}

const isRecord = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
/** A number typed into a field, rounded into lo … hi (not a number: `fallback`). */
const clamped = (v: number, lo: number, hi: number, fallback: number) => (Number.isFinite(v) ? Math.max(lo, Math.min(hi, Math.round(v))) : fallback);

function readKey(key: string): string | null {
  try {
    return localStorage.getItem(storageKey(key));
  } catch {
    return null;
  }
}
function writeKey(key: string, value: unknown): void {
  try {
    localStorage.setItem(storageKey(key), JSON.stringify(value));
  } catch {
    // (private window, or full: it's only not kept)
  }
}

/** The store before the book as webmidi's book, its pieces' routes left out: they are read as they were (`Own.legacy`). */
function migrated(old: OldStore): SetupBook {
  const book = fromCellStudio(old);
  return { ...book, setups: book.setups.map((s) => ({ ...s, routes: {} })) };
}

function readOwn(old: OldStore | null): Own {
  const fallback: Own = { internal: old?.internal ?? true, legacy: old?.routes ?? {} };
  let kept: unknown;
  try {
    kept = JSON.parse(readKey(OWN_KEY) ?? 'null');
  } catch {
    return fallback;
  }
  if (!isRecord(kept)) return fallback;
  const legacy = readOldStore(JSON.stringify({ outputs: [], routes: kept.legacy }))?.routes ?? {};
  return { internal: typeof kept.internal === 'boolean' ? kept.internal : true, legacy };
}

/** One output's senders: its notes (webmidi's `MidiOut`, on the routes its notes take here) and its clock (`ClockOut`). */
interface Lane {
  readonly out: MidiOut;
  readonly ticks: ClockOut;
  /** Where its notes go (a piece's channel table, `engine/midi.ts` `router`: on a piece's MIDI cards, a note's entries for this output's slot), from the next note on. */
  route: (e: Played) => Routes;
}

/** The player MIDI out taps (audio/player.ts): its sink, and whether its own sound is heard. */
interface Tapped {
  sink: NoteSink | null;
  internal: boolean;
}

/** The piece open: what it compiles to, and its title (what its routes are kept under). */
interface OpenPiece {
  readonly program: CompileResult;
  readonly title: string | null;
}

/**
 * MIDI on this device: the Web MIDI connection, the ports plugged in, and webmidi's book (decision 040): the device
 * profiles (drum map, bend range, MPE, latency, by port name) and the setups, the one in use giving the outputs, the
 * inputs heard, the outputs sent clock and each piece's routes (`piece:<title>`), which the patch matrix shows and
 * changes. A port chosen before is connected again on load without a click (a permission already granted needs no
 * gesture); a first visit asks for nothing until Connect. `dispose` when it goes.
 */
export class Midi implements NoteSink {
  /** The connection, once made. */
  access = $state.raw<MidiAccess | null>(null);
  /** The ports plugged in, as of the last look: at connecting, when one came or went, and when a person asked. */
  ports = $state.raw<{ inputs: PortOption[]; outputs: PortOption[] }>({ inputs: [], outputs: [] });
  /** What happened, in words: the ports found, or why there is no connection. */
  message = $state('Not connected. Without MIDI, everything plays on the built-in sound.');
  connecting = $state(false);
  /** The live port the first output resolves to, once connected. */
  outPort = $state.raw<MidiPort | null>(null);
  /** The device profiles and the setups (webmidi's `SetupBook`): change it with `setBook`. */
  book = $state.raw<SetupBook>(null as unknown as SetupBook);

  #store: BookStore;
  #internal = $state(true);
  #legacy = $state.raw<Own['legacy']>({});
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
  // who hears every message from the inputs heard (MIDI learn: state/learn.svelte.ts; the keys)
  #hearers = new Set<(data: Uint8Array, source: string, timeStamp: number) => void>();
  // what the connection listens to (webmidi's `listenOf`: the inputs heard and those routed), as JSON, to listen anew only on a change
  #listening = '';

  /** The setup in use. */
  get #setup() {
    return activeSetup(this.book);
  }
  /** The outputs of the setup in use, in order (at least one). */
  get #outputs(): readonly SetupOutput[] {
    return this.#setup.outputs;
  }
  /** The open piece's context in the setups: `piece:<title>`. */
  get context(): string {
    return contextOf(this.#piece?.title ?? null);
  }
  /** The routes the setup in use keeps for the open piece, or null: none yet (it plays cells' defaults, or what the store before the book chose). */
  get #routes(): BookRoutes | null {
    return own(this.#setup.routes, this.context) ?? null;
  }

  /** The open piece's choices on each output (cells' `OutputChoice`): its routes in the setup, else as before the book, else the defaults. */
  #choices(): OutputChoice[] {
    const p = this.#piece;
    const routes = this.#routes;
    if (p && routes) return choicesOf(routes, this.#outputs, routable(p.program).voices);
    return oldChoicesOf(own(this.#legacy, p?.title ?? ''), this.#outputs);
  }

  /** The open piece's channel table: each voice on its channels of each output, as routed (else on the first, in order), its kit members' notes. */
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

  /** The patch matrix's rows (webmidi's `MatrixRow`): the piece's gates and voices, its kit and the kit's members. */
  readonly matrixRows = $derived(rowsOfPiece(this.rows.voices, this.rows.kit ? (this.table?.kit ?? []) : []));

  /** Whether the open piece routes itself (its MIDI cards): the matrix shows its crossings, read only. */
  get locked(): boolean {
    return !!this.table?.byPiece;
  }

  /**
   * The book as the patch matrix shows it: a piece the setup has no routes for shows what it plays (cells' defaults, or
   * what the store before the book chose); a piece routed by its MIDI cards shows their channels, on every slot they
   * name, beside its inputs' crossings. Only shown: a change goes through `changeMatrix`.
   */
  readonly matrixBook = $derived.by((): SetupBook => {
    const table = this.table;
    if (!table) return this.book;
    if (!table.byPiece) return this.#routes ? this.book : withContext(this.book, this.context, routesOfTable(table, this.#outputs));
    const outputs = slotsOf(this.#outputs, Math.max(0, ...(table.ports ?? [])));
    const inputs = Object.fromEntries(Object.entries(this.#routes ?? {}).filter(([row]) => row.startsWith('in:')));
    const setup = this.#setup;
    return withSetup(this.book, { ...setup, outputs, routes: { ...setup.routes, [this.context]: { ...routesOfTable(table, outputs), ...inputs } } });
  });

  /** The ports plugged in that no output sends to yet: the outputs the page offers to add. */
  readonly spare = $derived(this.ports.outputs.filter((p) => !this.#outputs.some((c) => c.id === p.id)));

  /** The open piece's main meter, which the clock's beats are (`engine/midiclock.ts`); null: it sends no clock. */
  readonly meter = $derived(this.#piece ? mainMeter(this.#piece.program) : null);

  constructor() {
    const old = readOldStore(readKey(OLD_KEY));
    this.#store = localBookStore(storageKey(BOOK_KEY));
    this.book = loadBook(this.#store, () => (old ? migrated(old) : null));
    const kept = readOwn(old);
    this.#internal = kept.internal;
    this.#legacy = kept.legacy;
    if (readKey(OWN_KEY) === null) this.#saveOwn();
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
   * Told when the keys held from the inputs should all let go: All notes off (the MIDI page's, or on coming back into
   * view), and the inputs heard changed or one unplugged, whose note-offs will never come. The function returned stops it.
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

  get #first(): SetupOutput {
    return this.#outputs[0]!; // (there is always one)
  }

  get outPortId(): string {
    return this.#first.id;
  }
  get outPortName(): string {
    return this.#first.name;
  }

  /** The inputs heard, as one word: `'none'`, `'all'`, or their ids (one input's id). */
  get inPortId(): string {
    const heard = heardOf(this.#setup);
    // (an input is kept by its name, in what it plays: its id is the port's plugged in by that name, else the name)
    const idOf = (p: PortOption) => this.ports.inputs.find((q) => q.id === p.id || (!!p.name && q.name === p.name))?.id ?? p.id;
    return heard === 'all' ? 'all' : heard.length ? heard.map(idOf).join(',') : 'none';
  }
  set inPortId(id: string) {
    this.chooseInput(id);
  }
  get inPortName(): string {
    const heard = heardOf(this.#setup);
    return heard === 'all' ? '' : (heard[0]?.name ?? '');
  }

  /** Whether every input heard is absent (unplugged): nothing can be heard. */
  get hearingNowhere(): boolean {
    const heard = heardOf(this.#setup);
    return heard !== 'all' && heard.length > 0 && !heard.some((h) => this.ports.inputs.some((p) => p.id === h.id || (!!h.name && p.name === h.name)));
  }

  /** Whether any output sends to a device (chosen, plugged in or not). */
  get sending(): boolean {
    return this.#outputs.some((c) => c.id !== 'none');
  }

  /** Whether every output chosen is absent (unplugged): nothing can go out. */
  get sendingNowhere(): boolean {
    return this.#outputs.every((c) => c.id === 'none' || !this.ports.outputs.some((p) => p.id === c.id));
  }

  /** How many of the setup's devices aren't plugged in (while connected). */
  get missing(): number {
    const f = fit(this.#setup, this.ports.outputs);
    return this.access ? f.of - f.plugged : 0;
  }

  /** Whether a port was chosen before. */
  get remembersPorts(): boolean {
    return this.sending || this.inPortId !== 'none';
  }

  /** Is there anything for All notes off to reach: an output plugged in? */
  get canPanic(): boolean {
    return this.#outputs.some((_, i) => this.portOf(i + 1));
  }

  /** Connect to Web MIDI and adopt the ports chosen before. */
  async connect(): Promise<void> {
    if (this.connecting) return;
    this.connecting = true;
    const result = await MidiAccess.connect({ onChange: () => this.#changed(), onMessage: (...m) => this.#onMessage(...m) });
    if (typeof result === 'string') {
      if (!this.#disposed) this.message = result;
    } else if (this.#disposed) {
      // (disposed while asking: the connection comes too late for anyone, so it is let go, not kept listening)
      result.close();
    } else {
      this.access = result;
      this.#adopt();
      this.#list();
      // (the inputs heard are there or not from now on: one being unplugged later is a change)
      this.#heardFrom = this.#inputThere();
    }
    this.connecting = false;
  }

  /**
   * The ports chosen, adopted from the connection as it is now: a device found under a new id by its name (ids change
   * on replug on some systems) kept so, in place (a fact, not a change to the setup), the first output's live port,
   * and the inputs listened to.
   */
  #adopt(): void {
    const access = this.access;
    if (!access) return;
    const idNow = (ports: readonly PortOption[], p: PortOption) =>
      p.id === 'none' || ports.some((q) => q.id === p.id) ? p.id : (ports.find((q) => !!p.name && q.name === p.name)?.id ?? p.id);
    const setup = this.#setup;
    const outputs = setup.outputs.map((o) => ({ ...o, id: idNow(access.outputs, o) }));
    // (an input is kept by its name, in what it plays: nothing of it to refresh)
    if (outputs.some((o, i) => o.id !== setup.outputs[i]!.id)) {
      this.book = withSetup(this.book, { ...setup, outputs });
      this.#saveBook();
    }
    this.outPort = outputNow(access, this.#first);
    this.#relisten();
  }

  /**
   * Listen to what is heard and what is forwarded (webmidi's `listenOf`): the inputs heard and those routed in any context,
   * each by its name, or every input. Listened to is not heard: each message asks `isHeard` (`#onMessage`).
   */
  #relisten(): void {
    const access = this.access;
    if (!access) return;
    const listen = listenOf(this.#setup);
    const key = JSON.stringify(listen);
    if (key === this.#listening) return;
    this.#listening = key;
    access.listen(listen);
  }

  // a message from an input: heard (the keys, MIDI learn) when it comes from an input heard, and forwarded where its row
  // is routed; the light flashes (not for system messages: a device's active sensing)
  #onMessage(data: Uint8Array, source: string, timeStamp: number): void {
    const heard = isHeard(this.#setup, { id: source, name: source });
    const routes = this.#routes;
    const sent = routes ? forwards(data, source, heard, routes) : [];
    if ((heard || sent.length) && data[0]! < 0xf0) this.activity.hit('in');
    for (const s of sent) this.#sendTo(s.key, s.data);
    if (heard) for (const h of this.#hearers) h(data, source, timeStamp);
  }

  /** Hear every message from the inputs heard, raw; the function returned stops it. */
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
    this.#relisten();
  }

  /** Whether the built-in sound is heard beside MIDI out (off: MIDI alone, on the same clock). */
  get internal(): boolean {
    return this.#internal;
  }
  set internal(on: boolean) {
    this.#internal = on;
    if (this.#player) this.#player.internal = on;
    this.#saveOwn();
  }

  /**
   * The book changed (the setups, the patch matrix, an output's device or profile): what it stops is stopped first: an
   * output given another device, or gone, is silenced (its clock stopped, All notes off on what it sent); an output no
   * longer sent clock is sent Stop; the keys held from the inputs let go when the inputs heard change. Then it is kept.
   */
  setBook(next: SetupBook): void {
    if (next === this.book) return;
    const before = this.#setup;
    const after = activeSetup(next);
    for (const o of before.outputs) {
      const now = after.outputs.find((a) => a.key === o.key);
      if (!now || now.id !== o.id) this.#silence(o.key);
      else if (before.clock.includes(o.key) && !after.clock.includes(o.key)) this.#stopClock(o.key);
      if (!now) {
        this.#lanes.delete(o.key);
        this.#used.delete(o.key);
      }
    }
    // (what an input plays changed: the keys held from it let go, as they were struck on what it played)
    if (JSON.stringify(before.plays) !== JSON.stringify(after.plays)) this.#letGoAll();
    if (next.devices !== this.book.devices) this.warning = null;
    this.book = next;
    this.#saveBook();
    this.outPort = this.access ? outputNow(this.access, this.#first) : null;
    this.#relisten();
    this.#heardFrom = this.#inputThere();
  }

  /**
   * A change made in the patch matrix (on `matrixBook`), kept. A piece routed by its cards keeps what its locked matrix
   * still edits (webmidi v0.1.4): the inputs heard, the input rows' crossings in its context, the clock, and the devices'
   * profiles (a member's drum note); each to the setup's own outputs, not the slots only its cards name.
   */
  changeMatrix(next: SetupBook): void {
    if (this.locked) return this.setBook(lockedChange(this.book, this.matrixBook, next, this.context));
    this.setBook(keptChange(this.book, this.matrixBook, next));
  }

  // a change to the open piece's routes, made on what the matrix shows: a piece with none yet gets what it played, then the change
  #route(change: (shown: SetupBook) => SetupBook): void {
    const shown = this.locked ? this.book : this.matrixBook;
    this.setBook(keptChange(this.book, shown, change(shown)));
  }

  // an output's device name ('' for none, or no such output): what its profile is kept under
  #nameOf(port: number): string {
    return this.columns[port - 1]?.name ?? '';
  }

  /** The profile of an output's device (1 the first). */
  profileOf(port: number): DeviceProfile {
    return profileOf(this.book, this.#nameOf(port));
  }

  /** An output's device's profile changed (drum map, bend range, MPE, latency), each value clamped as webmidi keeps it. */
  setProfile(port: number, change: Partial<DeviceProfile>): void {
    this.setBook(withProfile(this.book, this.#nameOf(port), change));
  }

  /** An output's bend range, in semitones each way (2 for most, 48 for MPE), kept per device. */
  bendOf(port: number): number {
    return this.profileOf(port).bend;
  }
  setBend(port: number, semitones: number): void {
    this.setProfile(port, { bend: clamped(semitones, 1, 96, this.bendOf(port)) });
  }

  /** The channels an output's notes rotate over (one per sounding note, for microtonal pieces on an MPE synth), or null; kept per device. */
  rotateOf(port: number): Range | null {
    return this.profileOf(port).mpe;
  }
  setRotate(port: number, range: Range | null): void {
    this.setProfile(port, { mpe: range && { from: clamped(range.from, 1, 16, 2), to: clamped(range.to, 1, 16, 16) } });
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

  /** The channels routed to an output (1 the first): the open piece's voices and kit, and the inputs forwarded there on a channel of their own. */
  usedOn(port: number): number[] {
    const key = this.#outputs[port - 1]?.key;
    const inputs = Object.entries(this.#routes ?? {}).flatMap(([row, c]) => (row.startsWith('in:') && key && (own(c, key) ?? 0) > 0 ? [own(c, key)!] : []));
    const piece = [...(this.table?.voices ?? []).filter((v) => v.port === port).map((v) => v.channel), ...this.kitChannelsOf(port)];
    return [...new Set([...piece, ...inputs])].sort((a, b) => a - b);
  }

  // keep a crossing of the matrix (a voice, or KIT) for the open piece: a channel on an output, 0 not sent there
  #setCrossing(row: string, ch: number, port: number): void {
    const key = this.#outputs[port - 1]?.key;
    if (!key) return;
    const value = clamped(ch, 0, 16, 0);
    this.#route((shown) => withCrossing(shown, this.context, row, key, value || undefined));
  }

  /** Put a voice of the open piece on a channel of an output (1 the first; 0: not sent there), kept for that piece in the setup. */
  setChannel(voice: string, ch: number, port = 1): void {
    this.#setCrossing(voice, ch, port);
  }

  /** Put the open piece's kit on a channel of an output (1 the first; 0: not sent there), kept for that piece in the setup. */
  setKitChannel(ch: number, port = 1): void {
    this.#setCrossing(KIT, ch, port);
  }

  /**
   * The channel the open piece's kit goes on on the first output (10 unless put elsewhere; its MIDI card's, on a piece
   * with cards), and so the channel MIDI in's kit keys are on; General MIDI's 10 when it goes on none there. Set: kept
   * for that piece in the setup.
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

  /** A test note on an output (1 the first): middle C on the first channel routed there (1 if none), for a moment. */
  testNote(port: number): void {
    const c = this.#outputs[port - 1];
    if (!c) return;
    const ch = (this.usedOn(port)[0] ?? 1) - 1;
    this.#sendTo(c.key, [0x90 | ch, 60, 100]);
    this.#sendTo(c.key, [0x80 | ch, 60, 0], performance.now() + TEST_MS);
  }

  /** The channels (1–16) MIDI in plays the kit on: every channel the open piece's kit goes on, on any output; none, `kitChannel`. */
  get drumChannels(): readonly number[] {
    const kits = (this.table?.kits ?? []).map((k) => k.channel);
    return kits.length ? [...new Set(kits)] : [this.kitChannel];
  }

  /** The drum map of the device a message came from (by the port's name: kept with its output's), General MIDI if it has none. */
  drumsFrom(source: string): DrumMap {
    return own(this.book.devices, source)?.drums ?? DRUM_PRESETS.GM!;
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
    return this.profileOf(port).drums;
  }
  /** Set an output's drum map, kept for its device. */
  setDrums(port: number, map: DrumMap): void {
    if (this.columns[port - 1] === undefined) return;
    this.setProfile(port, { drums: map });
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

  /** Whether an output is sent MIDI clock (the setup's clock row; off unless switched on). Off while playing: Stop. */
  clockOf(port: number): boolean {
    const key = this.columns[port - 1]?.key;
    return !!key && this.#setup.clock.includes(key);
  }
  setClock(port: number, on: boolean): void {
    const c = this.#outputs[port - 1];
    if (c) this.setBook(withClock(this.book, c.key, on));
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
    return this.#setup.clock.length > 0;
  }

  // an output's timestamps: the clock's, made earlier by its device's latency (none: the clock's own)
  #toDevice(key: string, toDeviceMs: ToDeviceMs): ToDeviceMs {
    const latency = profileOf(this.book, this.#outputs.find((o) => o.key === key)?.name ?? '').latency;
    return latency ? (s) => toDeviceMs(s) - latency : toDeviceMs;
  }

  // Stop on an output, after the ticks already sent, if a run is going
  #stopClock(key: string): void {
    const lane = this.#lanes.get(key);
    const clock = lane && this.#tone && this.portOf(this.#portNumber(key)) ? contextClock(this.#tone) : null;
    if (clock) lane!.ticks.stop(this.#tone!.immediate(), this.#toDevice(key, clock.toDeviceMs));
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
    const name = id === 'none' ? '' : (this.ports.outputs.find((p) => p.id === id)?.name ?? '');
    let book = this.book;
    while (activeSetup(book).outputs.length < port) book = addOutput(book).book;
    this.setBook(chooseDevice(book, activeSetup(book).outputs[port - 1]!.key, { id, name }));
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
    // (what the store before the book chose for it goes too: a later output under its key starts with nothing)
    this.#legacy = Object.fromEntries(Object.entries(this.#legacy).map(([t, r]) => [t, Object.fromEntries(Object.entries(r).filter(([k]) => k !== c.key))]));
    this.#saveOwn();
    this.setBook(removeOutput(this.book, c.key));
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
      this.#lanes.set(key, (lane = { out: new MidiOut(send), ticks: new ClockOut(send), route: () => null }));
    }
    return lane;
  }

  /** A window's notes and clock ticks from the player (NoteSink): sent to every output, timestamped for when they're heard (less a device's latency). */
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
        if (this.#routedAs !== null) for (const [key, lane] of this.#lanes) lane.out.panic(at, this.#toDevice(key, clock.toDeviceMs));
        this.warning = null;
      }
      [this.#routed, this.#routedFor, this.#routedAs] = [table, layout, as];
      // (each output sends the routes on it: on a piece's MIDI cards, those of its slot)
      const route = router(this.#piece!.program, table);
      this.#outputs.forEach((c, i) => {
        const lane = this.#lane(c.key);
        lane.route = (e) => routesOf(route(e)).filter((r) => (r.port ?? 1) === i + 1);
        lane.out.onClash = () =>
          (this.warning = `Notes with different bends overlap on one channel of output ${i + 1}${c.name ? ` (${c.name})` : ''}, so some sound out of tune. Rotate its notes over channels (for an MPE synth) to give each its own.`);
      });
    }
    for (const { c, port } of live) {
      const lane = this.#lane(c.key);
      const toDevice = this.#toDevice(c.key, clock.toDeviceMs);
      // (rotation is for voices routed here: a piece's MIDI cards say the channels themselves)
      const kit = this.kitChannelsOf(port);
      const range = this.rotateOf(port);
      const rotate = !table?.byPiece && range ? rotationChannels(range.from, range.to, kit.length > 0, kit[0]) : null;
      lane.out.setOptions({ drums: this.drumsOf(port), bendRange: this.bendOf(port), rotate }, at, toDevice);
      for (const e of events) for (const run of outRuns(e, lane.route)) lane.out.play(run, toDevice);
      lane.out.advance(until, toDevice, at);
      if (this.clockOf(port)) lane.ticks.play(ticks, toDevice);
      else lane.ticks.stop(at, toDevice);
    }
  }

  /** The player stopped (NoteSink): All notes off now, and a note-off for each note still held; nothing later, so a resume or a seek isn't cut. */
  stop(T: ToneNS): void {
    this.#tone = T;
    const clock = this.canPanic ? contextClock(T) : null;
    for (const [key, lane] of this.#lanes)
      if (clock && this.portOf(this.#portNumber(key))) {
        const toDevice = this.#toDevice(key, clock.toDeviceMs);
        lane.out.panic(T.immediate(), toDevice);
        lane.ticks.stop(T.immediate(), toDevice);
      } else lane.out.forget();
  }

  /**
   * Hear one input by id, `'all'` or `'none'`, each playing the default (the cell the keys have armed), in place of what
   * every input played: the setup's `plays` (webmidi decision 003), which the matrix's Plays choices change one by one.
   */
  chooseInput(id: string): void {
    let book = this.book;
    for (const row of Object.keys(this.#setup.plays)) book = withPlays(book, row, undefined);
    if (id === 'all') book = withPlays(book, ANY_INPUT, 'default');
    else if (id !== 'none') book = withPlays(book, inputRow({ id, name: this.ports.inputs.find((p) => p.id === id)?.name ?? '' }), 'default');
    this.setBook(book);
  }

  /**
   * What an input (by its name, as a message says where it came from) plays among the open piece's rows (webmidi's
   * `playsOf`): a voice's row, the kit's (`*`) or a member's (`*name`); null for the default, the cell the keys have armed.
   */
  playsFrom(source: string): string | null {
    const played = playsOf(this.book, { id: source, name: source }, this.matrixRows);
    return played === null || played === 'default' ? null : played;
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

  /** All notes off on one output (1 the first). */
  panicOn(port: number): void {
    const c = this.#outputs[port - 1];
    if (c) this.#panicLane(c.key);
  }

  #panicLane(key: string): void {
    const port = this.portOf(this.#portNumber(key));
    const lane = this.#lanes.get(key);
    const clock = port && this.#tone ? contextClock(this.#tone) : null;
    if (clock) lane?.out.panic(this.#tone!.immediate(), this.#toDevice(key, clock.toDeviceMs));
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
    this.#adopt();
    this.#list();
    const heard = heardOf(this.#setup);
    // (an input heard gone: its keys' note-offs will never come; an unrelated device coming or going is not that)
    const there = this.#inputThere();
    if (this.#heardFrom && !there && heard !== 'all' && heard.length < 2) this.#letGoAll();
    // (under All inputs or several, one of them unplugged: the keys held from it let go, the others' stay)
    else if ((heard === 'all' || heard.length > 1) && this.access) this.#letGoAll(new Set(this.access.inputs.map((p) => p.name)));
    this.#heardFrom = there;
  }

  // whether the inputs heard are there to listen to (none, and all, always are)
  #heardFrom = false;
  #inputThere(): boolean {
    const heard = heardOf(this.#setup);
    const access = this.access;
    return !!access && (heard === 'all' || heard.every((h) => access.inputs.some((p) => p.id === h.id || (!!h.name && p.name === h.name))));
  }

  #list(): void {
    const access = this.access;
    this.ports = { inputs: access?.inputs ?? [], outputs: access?.outputs ?? [] };
    if (access) this.message = portsMessage(this.ports);
  }

  #saveBook(): void {
    this.#store.save(this.book);
  }

  #saveOwn(): void {
    writeKey(OWN_KEY, { internal: this.#internal, legacy: this.#legacy } satisfies Own);
  }
}
