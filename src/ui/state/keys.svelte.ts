// The route is adapted from yggi/jambot apps/web/src/midi/routing.ts (routeNote: the held set, play-along, thru) and
// apps/web/src/instruments.svelte.ts (the computer keys and MIDI into one route) @ 8cdb6b8.

import { SvelteMap, SvelteSet } from 'svelte/reactivity';
import { armable, keyboardOf, kitPads, rowNote, scaleKeys, type Armable, type Keyboard, type KeyMode, type Pad } from '@yggi/cells/engine/keys';
import { cellId } from '@yggi/cells/engine/ids';
import { COMPUTER_KEY_MAP, DRUM_KEY_MAP, gmNotesFor, ignoreKeyEvent, parseMidiMessage, parseSustain, type DrumMap } from '@yggi/webmidi/core';
import type { CompileResult, Shifts } from '@yggi/cells/engine/program';
import { storageKey } from '../../storageKey';

const KEY = 'cell-studio:keys';

/** What this browser keeps of the keys: whether the computer keys play, thru, a key outside the scale. */
type Stored = { readonly computer: boolean; readonly thru: boolean; readonly mode: KeyMode };
const DEFAULTS: Stored = { computer: false, thru: false, mode: 'snap' };

/** A key outside the table, as kept: #207's two ways ('played', 'nearest') read as the three (#210) they became. */
function modeOf(kept: unknown): KeyMode {
  if (kept === 'allow' || kept === 'played') return 'allow';
  if (kept === 'ignore') return 'ignore';
  return 'snap';
}

function load(): Stored {
  try {
    const kept = JSON.parse(localStorage.getItem(storageKey(KEY)) ?? 'null') as Partial<Stored> | null;
    if (!kept || typeof kept !== 'object') return DEFAULTS;
    return {
      computer: kept.computer === true,
      thru: kept.thru === true,
      mode: modeOf(kept.mode),
    };
  } catch {
    return DEFAULTS;
  }
}

/** The channel of a key pressed on the computer or the screen: none, so a kit put on channel 1 isn't theirs (a controller's channel 1 is). */
const LOCAL = -1;

/** A key's id: its channel and note, with the input's name before when it came from one (two inputs may play the same key). */
const keyAt = (channel: number, note: number, source: string): string => (source ? `${source}|${channel}:${note}` : `${channel}:${note}`);

/** The page's clock now (ms, as an event's `timeStamp`). */
const now = () => (typeof performance === 'undefined' ? Date.now() : performance.now());

/**
 * Told of every key and row as it goes down and up, whether or not it sounds (a take records them, #210): where (`at`,
 * the key's channel and note or the row), what (a MIDI note on a channel other than 10, or a row's number), and when,
 * on the page's clock (ms: a MIDI message's or a key event's `timeStamp`).
 */
export interface KeyListener {
  down(at: string, what: { readonly note: number } | { readonly cell: string; readonly value: number }, ms: number): void;
  up(at: string, ms: number): void;
}

/** The hands the keys play with (the Player): a held note on a voice, let go; told when Stop cuts them all. */
export interface Hands {
  press(voice: string, freq: number, velocity: number): number;
  release(id: number): void;
  onKeysCut: (() => void) | null;
}

/** Where thru sends a key: an output (1 the first), a channel (1–16), and the note it is there. */
export interface ThruTo {
  readonly port: number;
  readonly channel: number;
  readonly note: number;
}

/** The MIDI the keys hear and echo through (the Midi state): its input, where thru sends a key, the drum maps. */
type MidiIo = {
  hear(hearer: (data: Uint8Array, source: string, timeStamp: number) => void): () => void;
  /** Where thru sends a key played on a voice (a kit's member, `kit`): its row of the routing matrix. */
  thruOf(voice: string, freq: number, kit: boolean, a4?: number): ThruTo[];
  sendTo(port: number, data: readonly number[]): void;
  /** The drum map of the device a message came from (by its name): a pad's note back to General MIDI. */
  drumsFrom(source: string): DrumMap;
  /** The channel (1 … 16) the on-screen pads and the computer's drum keys are on: the open piece's kit channel; 10 if not said. */
  readonly padChannel?: number;
  /** The channels (1 … 16) a controller plays the kit on: every one the kit goes out on; `padChannel` if not said. */
  readonly drumChannels?: readonly number[];
  /** Told when every key held from the input should let go (All notes off, the input changed or gone). */
  letGo?(listener: (alive?: ReadonlySet<string>) => void): () => void;
};

/** The piece the keys play (the Piece state): what it compiles to, its tables' shifts, its A4. */
type Playing = { readonly program: CompileResult; readonly shifts: Shifts; readonly env: { readonly A4: number } };

/** A key down, or held by the pedal: what it plays. */
interface Down {
  readonly id: number;
  readonly voice: string;
  readonly cell: string;
  /** The input it came from (under All inputs), or ''. */
  readonly source?: string;
  /** Let go while the sustain pedal was down: it sounds until the pedal comes up. */
  sustained: boolean;
  /** Where thru sent its note-on, until its note-off has gone too. */
  thru: readonly ThruTo[];
}

/**
 * Keys playing the piece's voices live (#207): a MIDI keyboard, the computer keys (a setting, off by default) and the
 * on-screen keys (the piano roll's, #211) all go through `press` and `release`, onto the **armed** cell: the one chosen
 * in the MIDI page, else the one whose sheet is open, else the first cell that plays (in reading order). Arming is app state, not
 * code. A melody's key goes through its table (`engine/keys.ts`); channel 10, or a kit armed, plays the kit's members by
 * General MIDI note, a device's note mapped back through its drum map. Velocity gives the level, the sustain pedal
 * (CC 64) holds releases, thru echoes the keys to the MIDI output at once. MIDI learn's knobs are its own (`claimed`),
 * so a CC learned is never the pedal and a pad learned never a key. `dispose` when it goes.
 */
export class Keys {
  /** The cell whose sheet is open (the graph says), or null. */
  sheet = $state<string | null>(null);
  /** The cell chosen in the MIDI page to play, or '' to follow the open sheet. */
  chosen = $state('');
  /** The keys down now, by note (any channel but 10, the pads): what the on-screen keys light. */
  readonly held = new SvelteSet<number>();

  #kept = $state.raw<Stored>(DEFAULTS);
  // what sounds, by input, channel and key ("0:60"; with an input under All inputs, its name before), the ones the pedal holds included
  #down = new SvelteMap<string, Down>();
  #pedal = $state(false);
  #hands: Hands;
  #midi: MidiIo;
  #claimed: (data: Uint8Array) => boolean;
  #stop: () => void;
  // the computer keys down, by the key's name, and what each plays
  #typing = new Map<string, { note: number; channel: number }>();

  /** The cells a keyboard can play, in reading order (the MIDI page's "Play with"). */
  readonly armable = $derived.by<Armable[]>(() => armable(this.piece.program));
  /** The cell the keys play: the one chosen, else the sheet open, else the first that plays (not a kit, if any); null: nothing to play. */
  readonly armed = $derived.by(() => {
    const can = (c: string | null) => !!c && keyboardOf(this.piece.program, c, this.piece.shifts) !== null;
    if (can(this.chosen)) return this.chosen;
    if (can(this.sheet)) return this.sheet;
    return this.armable.find((a) => !a.kit)?.cell ?? this.armable[0]?.cell ?? null;
  });
  readonly #keyboard = $derived.by<Keyboard | null>(() =>
    this.armed === null ? null : keyboardOf(this.piece.program, this.armed, this.piece.shifts, { a4: this.piece.env.A4, mode: this.#kept.mode }),
  );
  // the kit that the kit channel plays: the armed one, else the first the piece plays
  readonly #kit = $derived.by<Keyboard | null>(() => {
    if (this.#keyboard?.kind === 'kit') return this.#keyboard;
    const kit = this.armable.find((a) => a.kit);
    return kit ? keyboardOf(this.piece.program, kit.cell, this.piece.shifts) : null;
  });
  /** A pad pressed: the kit's note on the kit channel as it is now, remembered so its release finds it if the channel is changed meanwhile. */
  pressPad(note: number, velocity = 100): void {
    const channel = this.drumChannel;
    this.#pads.set(note, channel);
    this.press(note, velocity, channel);
  }
  releasePad(note: number): void {
    const channel = this.#pads.get(note) ?? this.drumChannel;
    this.#pads.delete(note);
    this.release(note, channel);
  }
  #pads = new Map<number, number>();
  // where thru sent the pedal down, for its coming up
  #pedalTo: readonly { port: number; channel: number }[] = [];

  // the keys held from an input that is gone (under All inputs) let go; the others' stay
  #letGoUnless(alive: ReadonlySet<string>): void {
    for (const [at, d] of [...this.#down]) {
      if (!d.source || alive.has(d.source)) continue;
      const note = Number(at.slice(at.lastIndexOf(':') + 1));
      this.listener?.up(at, now());
      this.#thruOff(d);
      this.#hands.release(d.id);
      this.#down.delete(at);
      this.held.delete(note);
    }
  }

  /** The pads of the kit that the kit channel plays (the on-screen pads, #255): one per member, with its General MIDI note; none without a kit. */
  readonly pads = $derived.by<Pad[]>(() => (this.#kit ? kitPads(this.piece.program, this.#kit.cell) : []));
  /** The keys the armed melody's scale can play (the dots on the on-screen keys, #255); null: no scale (a kit, a voice no melody plays). */
  readonly scale = $derived.by<ReadonlySet<number> | null>(() => (this.armed === null ? null : scaleKeys(this.piece.program, this.armed, this.piece.shifts, this.piece.env.A4)));
  /** The cells sounding from the keys now (graph ids): the voice played and the cell armed light as a strike's do. */
  readonly lit = $derived<ReadonlySet<string>>(new Set([...this.#down.values()].flatMap((d) => [cellId(d.voice), cellId(d.cell)])));

  constructor(
    private readonly piece: Playing,
    hands: Hands,
    midi: MidiIo,
    { claimed = () => false }: { claimed?: (data: Uint8Array) => boolean } = {},
  ) {
    this.#hands = hands;
    this.#midi = midi;
    this.#claimed = claimed;
    this.#kept = load();
    // (Stop cut them: thru's hardware gets their note-offs too)
    hands.onKeysCut = () => (this.#thruOffs(), this.#forget());
    const unhear = midi.hear((data, source, ms) => this.#heard(data, ms, source));
    const unletGo = midi.letGo?.((alive) => (alive ? this.#letGoUnless(alive) : this.panic()));
    this.#stop = () => (unhear(), unletGo?.());
    this.#listen(this.#kept.computer);
  }

  dispose(): void {
    this.#stop();
    this.#listen(false);
  }

  /** Whether the computer keys play (a to l, w e t y u o; 1 to 7 a kit). Off unless asked for: the keys stay the page's. */
  get computer(): boolean {
    return this.#kept.computer;
  }
  set computer(on: boolean) {
    this.#save({ ...this.#kept, computer: on });
    this.#listen(on);
  }

  /**
   * Whether the keys are echoed to MIDI out at once: each key to every output and channel the routing matrix sends the
   * voice it plays to (a kit's member as its drum note there), so thru sounds as the piece will.
   */
  get thru(): boolean {
    return this.#kept.thru;
  }
  set thru(on: boolean) {
    // (turned off with keys down: their note-offs go first, or the hardware would hold them)
    if (!on) this.#thruOffs();
    this.#save({ ...this.#kept, thru: on });
  }

  /** Told of every key and row, down and up (a take, `record.svelte.ts`), or null. */
  listener: KeyListener | null = null;

  /** A key outside the melody's table, played and recorded alike: as played (an accidental), the nearest entry, or nothing (#210). */
  get mode(): KeyMode {
    return this.#kept.mode;
  }
  set mode(m: KeyMode) {
    this.#save({ ...this.#kept, mode: m });
  }

  /**
   * A key pressed: on channel 10 (9 counted from 0), or with a kit armed, the kit member with that General MIDI drum
   * note; else the armed voice at the key's pitch through its table. Velocity 1 … 127. A key pressed again while it
   * sounds (the pedal holding it) strikes again. Echoed where the voice goes out if thru is on.
   */
  press(note: number, velocity = 100, channel = LOCAL, ms = now(), source = ''): void {
    this.#press(note, velocity, channel, channel === this.drumChannel, [note], ms, source);
  }

  /** The channel the pads and a kit's keys are on (counted from 0): the open piece's kit channel, 10 unless put elsewhere. */
  get drumChannel(): number {
    return (this.#midi.padChannel ?? 10) - 1;
  }

  /** A key let go: its note goes into its release, or, the pedal down, sounds on until the pedal comes up. A key not down: nothing. */
  release(note: number, channel = LOCAL, ms = now(), source = ''): void {
    const at = keyAt(channel, note, source);
    this.listener?.up(at, ms);
    const d = this.#down.get(at);
    if (d) this.#thruOff(d);
    if (channel !== this.drumChannel) this.held.delete(note);
    this.#up(at);
  }

  /**
   * A row of a cell pressed (the piano roll's key column, #211): `value` a number written in the cell, an entry with
   * laps, sounding as the cell plays it (`engine/keys.ts` `rowNote`), whatever is armed. As a key: velocity, the pedal,
   * a row pressed again strikes again, thru (as the MIDI note nearest, where its voice goes out). A cell that plays nothing: nothing.
   */
  pressRow(cell: string, value: number, velocity = 100, ms = now()): void {
    const n = rowNote(this.piece.program, cell, value, this.piece.shifts);
    const at = `row:${cell}:${value}`;
    this.listener?.down(at, { cell, value }, ms);
    this.#strike(at);
    if (!n) return;
    const thru = this.#thruOn(n.voice, n.freq, false, velocity);
    this.#down.set(at, { id: this.#hands.press(n.voice, n.freq, velocity), voice: n.voice, cell, sustained: false, thru });
  }

  /** A row of a cell let go (the piano roll's key column): as a key let go. */
  releaseRow(cell: string, value: number, ms = now()): void {
    const at = `row:${cell}:${value}`;
    this.listener?.up(at, ms);
    const d = this.#down.get(at);
    if (d) this.#thruOff(d);
    this.#up(at);
  }

  /** The rows of a cell down now (pressed with `pressRow`, or held by the pedal): what the piano roll's keys light. */
  heldRows(cell: string): ReadonlySet<number> {
    const out = new Set<number>();
    const prefix = `row:${cell}:`;
    for (const at of this.#down.keys()) if (at.startsWith(prefix)) out.add(Number(at.slice(prefix.length)));
    return out;
  }

  // what sounds at `at` let go: into its release, or held by the pedal
  #up(at: string): void {
    const d = this.#down.get(at);
    if (!d || d.sustained) return;
    if (this.#pedal) {
      d.sustained = true;
      return;
    }
    this.#down.delete(at);
    this.#hands.release(d.id);
  }

  /** Whether the sustain pedal is down (a MIDI pedal's, or the on-screen keys' button). */
  get pedal(): boolean {
    return this.#pedal;
  }

  /** The sustain pedal: down, releases wait; up, every key it held lets go. */
  sustain(down: boolean): void {
    this.#pedal = down;
    if (down) return;
    for (const [at, d] of [...this.#down])
      if (d.sustained) {
        this.#down.delete(at);
        this.#hands.release(d.id);
      }
  }

  #press(note: number, velocity: number, channel: number, drum: boolean, gm: readonly number[], ms: number, source = ''): void {
    if (!drum) this.held.add(note);
    const at = keyAt(channel, note, source);
    if (!drum && this.#keyboard?.kind === 'voice') this.listener?.down(at, { note }, ms);
    this.#strike(at);
    const k = drum ? this.#kit : this.#keyboard;
    let voice: string | null = null;
    let freq: number | null = null;
    if (k?.kind === 'kit') {
      const hit = k.drum(gm);
      [voice, freq] = hit ? [hit.voice, hit.freq] : [null, null];
    } else if (k) [voice, freq] = [k.voice, k.key(note)];
    if (!k || voice === null || freq === null) return;
    const thru = this.#thruOn(voice, freq, k.kind === 'kit', velocity);
    this.#down.set(at, { id: this.#hands.press(voice, freq, velocity), voice, cell: k.cell, sustained: false, source, thru });
  }

  // what sounds at `at` (a key or a row struck again) lets go first: a new press, not a second voice on one key
  #strike(at: string): void {
    const again = this.#down.get(at);
    if (!again) return;
    this.#thruOff(again);
    this.#down.delete(at);
    this.#hands.release(again.id);
  }

  // a message from the MIDI input: a note, or the pedal, unless MIDI learn has it
  #heard(data: Uint8Array, ms: number, source = ''): void {
    // (All notes off, All sound off: a controller's panic lets every key go and the pedal up, even a CC that learn has bound)
    if ((data[0]! & 0xf0) === 0xb0 && (data[1] === 123 || data[1] === 120)) return this.panic();
    if (this.#claimed(data)) return;
    const pedal = parseSustain(data);
    if (pedal) {
      this.#thruPedal(pedal.down);
      return this.sustain(pedal.down);
    }
    const n = parseMidiMessage(data);
    if (!n) return;
    // (a pad on a channel the kit goes out on, or 10, or any key with a kit armed, is the device's note: back through
    // its drum map to General MIDI)
    const drum = (this.#midi.drumChannels ?? [this.drumChannel + 1]).includes(n.channel + 1) || this.#keyboard?.kind === 'kit';
    if (!n.on) return this.release(n.note, n.channel, ms, source);
    this.#press(n.note, n.velocity, n.channel, drum, drum ? gmNotesFor(this.#midi.drumsFrom(source), n.note) : [n.note], ms, source);
  }

  // thru: a key's note-on where the voice it plays goes out; where it went, for its note-off
  #thruOn(voice: string, freq: number, kit: boolean, velocity: number): readonly ThruTo[] {
    if (!this.#kept.thru) return [];
    const to = this.#midi.thruOf(voice, freq, kit, this.piece.env.A4);
    const v = Math.max(1, Math.min(127, Math.round(velocity)));
    for (const t of to) this.#midi.sendTo(t.port, [0x90 | (t.channel - 1), t.note, v]);
    return to;
  }

  // thru: a key's note-off, where its note-on went (once)
  #thruOff(d: Down): void {
    for (const t of d.thru) this.#midi.sendTo(t.port, [0x80 | (t.channel - 1), t.note, 0]);
    d.thru = [];
  }

  // thru: the pedal, to every output and channel the armed voice goes out on (its row of the matrix); up where it went down
  #thruPedal(down: boolean): void {
    if (!down) {
      for (const t of this.#pedalTo) this.#midi.sendTo(t.port, [0xb0 | (t.channel - 1), 64, 0]);
      this.#pedalTo = [];
      return;
    }
    const k = this.#keyboard;
    if (!this.#kept.thru || k?.kind !== 'voice') return;
    const to = this.#midi.thruOf(k.voice, 440, false).filter((t, i, all) => all.findIndex((o) => o.port === t.port && o.channel === t.channel) === i);
    for (const t of to) this.#midi.sendTo(t.port, [0xb0 | (t.channel - 1), 64, 127]);
    this.#pedalTo = [...this.#pedalTo, ...to];
  }

  // thru: a note-off for every key and row down now (held by the pedal too), and the pedal up
  #thruOffs(): void {
    for (const d of this.#down.values()) this.#thruOff(d);
    this.#thruPedal(false);
  }

  // Stop cut everything: what was down and what the pedal held are gone (the keys still down play again when pressed)
  #forget(): void {
    this.#down.clear();
    this.held.clear();
    this.#typing.clear();
    this.#pedal = false;
  }

  /** Every key down lets go now, the pedal comes up: a controller's All notes off, so a lost note-off can't leave a note sounding. */
  panic(): void {
    this.#thruOffs();
    for (const [at, d] of this.#down) {
      this.listener?.up(at, now());
      this.#hands.release(d.id);
    }
    this.#forget();
  }

  readonly #onKeyDown = (e: KeyboardEvent) => {
    if (ignoreKeyEvent(e.target, e.repeat, e.metaKey || e.ctrlKey || e.altKey)) return;
    const name = e.key.toLowerCase();
    if (this.#typing.has(name)) return;
    const melodic = COMPUTER_KEY_MAP[name];
    const drum = DRUM_KEY_MAP[name];
    const k = melodic !== undefined ? { note: melodic, channel: LOCAL } : drum !== undefined ? { note: drum, channel: this.drumChannel } : null;
    if (!k) return;
    this.#typing.set(name, k);
    this.press(k.note, 100, k.channel, e.timeStamp);
  };
  // (a key let go wherever focus is now: one pressed outside a field and released in it doesn't hang)
  readonly #onKeyUp = (e: KeyboardEvent) => {
    const name = e.key.toLowerCase();
    const k = this.#typing.get(name);
    if (!k) return;
    this.#typing.delete(name);
    this.release(k.note, k.channel, e.timeStamp);
  };
  // (the window losing focus never sends the keyups: every computer key lets go)
  readonly #onBlur = () => {
    for (const [name, k] of [...this.#typing]) {
      this.#typing.delete(name);
      this.release(k.note, k.channel);
    }
  };

  #listen(on: boolean): void {
    if (typeof window === 'undefined') return;
    if (!on) this.#onBlur();
    const method = on ? 'addEventListener' : 'removeEventListener';
    window[method]('keydown', this.#onKeyDown as EventListener);
    window[method]('keyup', this.#onKeyUp as EventListener);
    window[method]('blur', this.#onBlur);
  }

  #save(kept: Stored): void {
    this.#kept = kept;
    try {
      localStorage.setItem(storageKey(KEY), JSON.stringify(kept));
    } catch {
      // (private window, or full: it's only not kept)
    }
  }
}
