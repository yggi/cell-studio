// The route is adapted from yggi/jambot apps/web/src/midi/routing.ts (routeNote: the held set, play-along, thru) and
// apps/web/src/instruments.svelte.ts (the computer keys and MIDI into one route) @ 8cdb6b8.

import { SvelteMap, SvelteSet } from 'svelte/reactivity';
import { armable, keyboardOf, kitPads, rowNote, scaleKeys, type Armable, type Keyboard, type KeyMode, type Pad } from '../../engine/keys';
import { noteOf } from '../../engine/midi';
import { cellId } from '../../engine/ids';
import { gmNotesFor, type DrumMap } from '../../midi/drum-presets';
import { COMPUTER_KEY_MAP, DRUM_CHANNEL, DRUM_KEY_MAP, ignoreKeyEvent, parseMidiMessage, parseSustain } from '../../midi/surfaces';
import type { CompileResult, Shifts } from '../../engine/program';
import { storageKey } from '../../storageKey';

const KEY = 'cell-studio:keys';

/** What this browser keeps of the keys: whether the computer keys play, thru and its channel, a key outside the scale. */
type Stored = { readonly computer: boolean; readonly thru: boolean; readonly thruChannel: number; readonly mode: KeyMode };
const DEFAULTS: Stored = { computer: false, thru: false, thruChannel: 1, mode: 'nearest' };

function load(): Stored {
  try {
    const kept = JSON.parse(localStorage.getItem(storageKey(KEY)) ?? 'null') as Partial<Stored> | null;
    if (!kept || typeof kept !== 'object') return DEFAULTS;
    const ch = kept.thruChannel;
    return {
      computer: kept.computer === true,
      thru: kept.thru === true,
      thruChannel: Number.isInteger(ch) && (ch as number) >= 1 && (ch as number) <= 16 ? (ch as number) : 1,
      mode: kept.mode === 'played' ? 'played' : 'nearest',
    };
  } catch {
    return DEFAULTS;
  }
}

/** The hands the keys play with (the Player): a held note on a voice, let go; told when Stop cuts them all. */
export interface Hands {
  press(voice: string, freq: number, velocity: number): number;
  release(id: number): void;
  onKeysCut: (() => void) | null;
}

/** The MIDI the keys hear and echo through (the Midi state): its input, its output, the output's drum map. */
type MidiIo = {
  hear(hearer: (data: Uint8Array, source: string, timeStamp: number) => void): () => void;
  send(data: readonly number[], timestamp?: number): void;
  readonly drums: DrumMap;
};

/** The piece the keys play (the Piece state): what it compiles to, its tables' shifts, its A4. */
type Playing = { readonly program: CompileResult; readonly shifts: Shifts; readonly env: { readonly A4: number } };

/** A key down, or held by the pedal: what it plays. */
interface Down {
  readonly id: number;
  readonly voice: string;
  readonly cell: string;
  /** Let go while the sustain pedal was down: it sounds until the pedal comes up. */
  sustained: boolean;
  /** A row's nearest MIDI note, for thru. */
  readonly note?: number;
}

/**
 * Keys playing the piece's voices live (#207): a MIDI keyboard, the computer keys (a setting, off by default) and the
 * on-screen keys (the piano roll's, #211) all go through `press` and `release`, onto the **armed** cell: the one chosen
 * in the MIDI dialog, else the one whose sheet is open, else the first cell that plays (in reading order). Arming is app state, not
 * code. A melody's key goes through its table (`engine/keys.ts`); channel 10, or a kit armed, plays the kit's members by
 * General MIDI note, a device's note mapped back through its drum map. Velocity gives the level, the sustain pedal
 * (CC 64) holds releases, thru echoes the keys to the MIDI output at once. MIDI learn's knobs are its own (`claimed`),
 * so a CC learned is never the pedal and a pad learned never a key. `dispose` when it goes.
 */
export class Keys {
  /** The cell whose sheet is open (the graph says), or null. */
  sheet = $state<string | null>(null);
  /** The cell chosen in the MIDI dialog to play, or '' to follow the open sheet. */
  chosen = $state('');
  /** The keys down now, by note (any channel but 10, the pads): what the on-screen keys light. */
  readonly held = new SvelteSet<number>();

  #kept = $state.raw<Stored>(DEFAULTS);
  // what sounds, by channel and key ("0:60"), the ones the pedal holds included
  #down = new SvelteMap<string, Down>();
  #pedal = $state(false);
  #hands: Hands;
  #midi: MidiIo;
  #claimed: (data: Uint8Array) => boolean;
  #stop: () => void;
  // the computer keys down, by the key's name, and what each plays
  #typing = new Map<string, { note: number; channel: number }>();

  /** The cells a keyboard can play, in reading order (the dialog's "Play with"). */
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
  // the kit channel 10 plays: the armed one, else the first the piece plays
  readonly #kit = $derived.by<Keyboard | null>(() => {
    if (this.#keyboard?.kind === 'kit') return this.#keyboard;
    const kit = this.armable.find((a) => a.kit);
    return kit ? keyboardOf(this.piece.program, kit.cell, this.piece.shifts) : null;
  });
  /** The pads of the kit channel 10 plays (the on-screen pads, #255): one per member, with its General MIDI note; none without a kit. */
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
    hands.onKeysCut = () => this.#forget();
    this.#stop = midi.hear((data) => this.#heard(data));
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

  /** Whether the keys are echoed to the MIDI output, at once, on `thruChannel`. */
  get thru(): boolean {
    return this.#kept.thru;
  }
  set thru(on: boolean) {
    this.#save({ ...this.#kept, thru: on });
  }
  get thruChannel(): number {
    return this.#kept.thruChannel;
  }
  set thruChannel(ch: number) {
    if (Number.isInteger(ch) && ch >= 1 && ch <= 16) this.#save({ ...this.#kept, thruChannel: ch });
  }

  /** A key outside the melody's table: the nearest entry sounds, or the key as played. */
  get mode(): KeyMode {
    return this.#kept.mode;
  }
  set mode(m: KeyMode) {
    this.#save({ ...this.#kept, mode: m });
  }

  /**
   * A key pressed: on channel 10 (9 counted from 0), or with a kit armed, the kit member with that General MIDI drum
   * note; else the armed voice at the key's pitch through its table. Velocity 1 … 127. A key pressed again while it
   * sounds (the pedal holding it) strikes again. Echoed to the output if thru is on.
   */
  press(note: number, velocity = 100, channel = 0): void {
    this.#press(note, velocity, channel, [note]);
  }

  /** A key let go: its note goes into its release, or, the pedal down, sounds on until the pedal comes up. A key not down: nothing. */
  release(note: number, channel = 0): void {
    this.#thru([0x80 | this.#thruNibble(), note, 0]);
    if (channel !== DRUM_CHANNEL) this.held.delete(note);
    this.#up(`${channel}:${note}`);
  }

  /**
   * A row of a cell pressed (the piano roll's key column, #211): `value` a number written in the cell, an entry with
   * laps, sounding as the cell plays it (`engine/keys.ts` `rowNote`), whatever is armed. As a key: velocity, the pedal,
   * a row pressed again strikes again, thru (as the MIDI note nearest). A cell that plays nothing: nothing.
   */
  pressRow(cell: string, value: number, velocity = 100): void {
    const n = rowNote(this.piece.program, cell, value, this.piece.shifts);
    const at = `row:${cell}:${value}`;
    this.#strike(at);
    if (!n) return;
    const note = noteOf(n.freq, this.piece.env.A4).note;
    if (note >= 0 && note <= 127) this.#thru([0x90 | this.#thruNibble(), note, Math.max(1, Math.min(127, Math.round(velocity)))]);
    this.#down.set(at, { id: this.#hands.press(n.voice, n.freq, velocity), voice: n.voice, cell, sustained: false, note });
  }

  /** A row of a cell let go (the piano roll's key column): as a key let go. */
  releaseRow(cell: string, value: number): void {
    const at = `row:${cell}:${value}`;
    const note = this.#down.get(at)?.note;
    if (note !== undefined && note >= 0 && note <= 127) this.#thru([0x80 | this.#thruNibble(), note, 0]);
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

  #press(note: number, velocity: number, channel: number, gm: readonly number[]): void {
    this.#thru([0x90 | this.#thruNibble(), note, Math.max(1, Math.min(127, Math.round(velocity)))]);
    if (channel !== DRUM_CHANNEL) this.held.add(note);
    const at = `${channel}:${note}`;
    this.#strike(at);
    const k = channel === DRUM_CHANNEL ? this.#kit : this.#keyboard;
    let voice: string | null = null;
    let freq: number | null = null;
    if (k?.kind === 'kit') {
      const hit = k.drum(gm);
      [voice, freq] = hit ? [hit.voice, hit.freq] : [null, null];
    } else if (k) [voice, freq] = [k.voice, k.key(note)];
    if (!k || voice === null || freq === null) return;
    this.#down.set(at, { id: this.#hands.press(voice, freq, velocity), voice, cell: k.cell, sustained: false });
  }

  // what sounds at `at` (a key or a row struck again) lets go first: a new press, not a second voice on one key
  #strike(at: string): void {
    const again = this.#down.get(at);
    if (!again) return;
    this.#down.delete(at);
    this.#hands.release(again.id);
  }

  // a message from the MIDI input: a note, or the pedal, unless MIDI learn has it
  #heard(data: Uint8Array): void {
    if (this.#claimed(data)) return;
    const pedal = parseSustain(data);
    if (pedal) {
      this.#thru([0xb0 | this.#thruNibble(), 64, pedal.down ? 127 : 0]);
      return this.sustain(pedal.down);
    }
    const n = parseMidiMessage(data);
    if (!n) return;
    if (!n.on) return this.release(n.note, n.channel);
    // (a pad on channel 10, or any key with a kit armed, is the device's note: back through its drum map to General MIDI)
    const drum = n.channel === DRUM_CHANNEL || this.#keyboard?.kind === 'kit';
    this.#press(n.note, n.velocity, n.channel, drum ? gmNotesFor(this.#midi.drums, n.note) : [n.note]);
  }

  #thruNibble(): number {
    return this.#kept.thruChannel - 1;
  }

  #thru(data: number[]): void {
    if (this.#kept.thru) this.#midi.send(data);
  }

  // Stop cut everything: what was down and what the pedal held are gone (the keys still down play again when pressed)
  #forget(): void {
    this.#down.clear();
    this.held.clear();
    this.#typing.clear();
  }

  readonly #onKeyDown = (e: KeyboardEvent) => {
    if (ignoreKeyEvent(e.target, e.repeat, e.metaKey || e.ctrlKey || e.altKey)) return;
    const name = e.key.toLowerCase();
    if (this.#typing.has(name)) return;
    const melodic = COMPUTER_KEY_MAP[name];
    const drum = DRUM_KEY_MAP[name];
    const k = melodic !== undefined ? { note: melodic, channel: 0 } : drum !== undefined ? { note: drum, channel: DRUM_CHANNEL } : null;
    if (!k) return;
    this.#typing.set(name, k);
    this.press(k.note, 100, k.channel);
  };
  // (a key let go wherever focus is now: one pressed outside a field and released in it doesn't hang)
  readonly #onKeyUp = (e: KeyboardEvent) => {
    const name = e.key.toLowerCase();
    const k = this.#typing.get(name);
    if (!k) return;
    this.#typing.delete(name);
    this.release(k.note, k.channel);
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
