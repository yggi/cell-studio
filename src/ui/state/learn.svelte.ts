import { freePosition } from '../free';
import { freeAtPlace, freePlace, knobOf, LOOSE, padValue, readLearned, sameKnob, takeover, type Knob, type Learned, type Takeover } from '../learn';
import { storageKey } from '../../storageKey';
import type { FreeSpec } from '../../engine/ast';
import type { Midi } from './midi.svelte';
import type { Piece } from './piece.svelte';

const KEY = 'cell-studio:midi-learn';
const NO_GAPS: ReadonlyMap<string, number> = new Map();

/**
 * Run once at the next frame, or after 50 ms if no frame comes first; in a hidden tab (which draws no frames, while MIDI
 * keeps arriving) after about a frame's time. A knob behind a DAW or on another tab keeps moving its control.
 */
export function soon(run: () => void, frame: (run: () => void) => void = (f) => requestAnimationFrame(f), hidden = () => typeof document !== 'undefined' && document.hidden): void {
  let done = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const once = () => {
    if (done) return;
    done = true;
    clearTimeout(timer);
    run();
  };
  if (hidden()) {
    timer = setTimeout(once, 16);
    return;
  }
  frame(once);
  if (!done) timer = setTimeout(once, 50);
}

/** Which piece is open: what a wait for a knob, a gap and a takeover belong to. */
interface Scope {
  title: string;
  opened: number;
}

/**
 * MIDI learn: a controller's knob, fader or pad moves a free() as its slider does (`piece.hold`). Learn a control and
 * the next control change or note binds to it; bindings are this browser's, kept by piece title and the free()'s place
 * (`learn.ts`), so they survive edits elsewhere in the code, and Stop or Keep (they bind, they hold nothing). A knob
 * takes over softly (it moves the value once it reaches it), and a fast knob holds at most once a frame per control,
 * since each hold compiles the piece again (`soon`: a hidden tab too). A wait for a knob, a gap and a takeover belong to
 * the piece open (its title, and `opened`, the library's count of pieces opened): another piece, a renamed one, or the
 * MIDI input gone ends them. `dispose` when it goes.
 */
export class Learn {
  // the control waiting for a knob: its place, and the piece and the MIDI it waits in
  #learning = $state.raw<{ place: string; scope: Scope; access: Midi['access']; input: string } | null>(null);
  // the gaps a slider shows, and the piece they're in
  #gaps = $state.raw<{ scope: Scope; at: ReadonlyMap<string, number> }>({ scope: { title: '', opened: -1 }, at: NO_GAPS });

  #kept = $state.raw<Learned>(readLearned(null));
  #piece: Piece;
  #midi: Pick<Midi, 'access' | 'inPortId' | 'hear' | 'send'>;
  #frame: (run: () => void) => void;
  #opened: () => number;
  #stop: () => void;
  // the piece the takeovers and the pending values are in
  #session: Scope = { title: '', opened: -1 };
  // soft takeover by place (this session's: a knob's place isn't worth keeping)
  #takeover = new Map<string, Takeover>();
  // the values a knob moved this frame, by place: held once, at the frame
  #pending = new Map<string, number>();
  #scheduled = false;

  constructor(
    piece: Piece,
    midi: Pick<Midi, 'access' | 'inPortId' | 'hear' | 'send'>,
    { frame = (run) => soon(run), opened = () => 0 }: { frame?: (run: () => void) => void; opened?: () => number } = {},
  ) {
    this.#piece = piece;
    this.#midi = midi;
    this.#frame = frame;
    this.#opened = opened;
    try {
      this.#kept = readLearned(localStorage.getItem(storageKey(KEY)));
    } catch {
      // (no storage here: nothing was kept)
    }
    this.#stop = midi.hear((data) => this.#heard(data));
  }

  dispose(): void {
    this.#stop();
    this.#listenForEscape(false);
  }

  /** Whether there is MIDI to learn from: access, and an input chosen. */
  get connected(): boolean {
    return this.#midi.access !== null && this.#midi.inPortId !== 'none';
  }

  /** The place of the control waiting for a knob, or null (none since another piece opened, or the input went). */
  get learning(): string | null {
    const l = this.#learning;
    return l && sameScope(l.scope, this.#scope()) && l.access === this.#midi.access && l.input === this.#midi.inPortId && this.connected ? l.place : null;
  }

  /** Where a knob is that hasn't caught its control's value yet (0..1), by place: the gap a slider shows. */
  get gaps(): ReadonlyMap<string, number> {
    return sameScope(this.#gaps.scope, this.#scope()) ? this.#gaps.at : NO_GAPS;
  }

  /** The knobs learned for the open piece, by place. */
  get bindings(): Readonly<Record<string, Knob>> {
    return this.#kept.pieces[this.#piece.title] ?? {};
  }

  /** Whether a slider moved by hand sends its knob's CC back (a motor fader, an LED ring follows). Off unless asked for. */
  get echo(): boolean {
    return this.#kept.echo;
  }
  set echo(on: boolean) {
    this.#save({ ...this.#kept, echo: on });
  }

  /** Where a free() is, as bindings name it ('' if it isn't in the piece). */
  placeOf(spec: Pick<FreeSpec, 'span'>): string {
    return freePlace(this.#piece.program.cells, spec);
  }

  /** Wait for a knob for the control at a place (Esc, or `cancel`, stops waiting); asked again, stop waiting. */
  learn(place: string): void {
    this.#fresh();
    const on = this.learning !== place && !!place && this.connected;
    this.#learning = on ? { place, scope: this.#scope(), access: this.#midi.access, input: this.#midi.inPortId } : null;
    this.#listenForEscape(on);
  }

  cancel(): void {
    this.#learning = null;
    this.#listenForEscape(false);
  }

  /** A control that goes (its sheet closed, its row gone): if it's the one waiting for a knob, stop waiting. */
  release(place: string): void {
    if (this.#learning?.place === place) this.cancel();
  }

  /** Let go of the knob learned for a place. */
  forget(place: string): void {
    this.#fresh();
    const { [place]: _gone, ...rest } = this.bindings;
    this.#bind(rest);
    this.#takeover.delete(place);
    this.#gap(place, null);
  }

  /** Let go of every knob learned for the open piece. */
  forgetAll(): void {
    this.#bind({});
    this.#takeover.clear();
    this.#gaps = { scope: this.#scope(), at: NO_GAPS };
  }

  /** A control moved by hand (its slider or keypad): send its CC back if asked to, and the knob is where it is now. */
  moved(spec: FreeSpec, value: number): void {
    if (!this.echo) return;
    this.#fresh();
    const place = this.placeOf(spec);
    const knob = this.bindings[place];
    if (knob?.kind !== 'cc') return;
    const at = freePosition(spec, value);
    this.#midi.send([0xb0 | knob.channel, knob.number, Math.round(at * 127)]);
    this.#takeover.set(place, { knob: at, set: null });
    this.#gap(place, null);
  }

  /**
   * Whether a message is MIDI learn's, so the keys leave it alone (state/keys.svelte.ts): any control change or note-on
   * while a control waits for a knob, else a knob learned in the open piece that moves its control (a CC bound, a pad
   * within its control's choices). Asked after learn has heard it, so a knob bound by this very message is learn's.
   */
  claims(data: ArrayLike<number>): boolean {
    const m = knobOf(data);
    if (!m) return false;
    if (this.learning !== null) return true;
    const cells = this.#piece.program.cells;
    return this.#bound({ kind: m.kind, channel: m.channel, number: m.number }).some(([place, bound]) => {
      const f = freeAtPlace(cells, place);
      return !!f && f.key !== 'text' && (m.kind === 'cc' || padValue(f, bound.number, m.number) !== null);
    });
  }

  #heard(data: ArrayLike<number>): void {
    const m = knobOf(data);
    if (!m) return;
    this.#fresh();
    const knob: Knob = { kind: m.kind, channel: m.channel, number: m.number };
    const place = this.learning;
    if (place !== null) {
      const others = Object.entries(this.bindings).filter(([p, k]) => p !== place && !sameKnob(k, knob));
      this.#bind({ ...Object.fromEntries(others), [place]: knob });
      // (the knob turned to learn it is where it is: it takes over from there)
      this.#takeover.set(place, { knob: m.kind === 'cc' ? m.value / 127 : null, set: null });
      this.cancel();
      return;
    }
    const cells = this.#piece.program.cells;
    for (const [place, bound] of this.#bound(knob)) {
      const f = freeAtPlace(cells, place);
      if (!f || f.key === 'text') continue;
      if (m.kind === 'note') {
        const v = padValue(f, bound.number, m.number);
        if (v !== null) this.#hold(place, v);
        continue;
      }
      const now = this.#pending.get(place) ?? f.value;
      const r = takeover(f, this.#takeover.get(place) ?? LOOSE, m.value / 127, now);
      this.#takeover.set(place, r.state);
      if (r.value === null) this.#gap(place, m.value / 127);
      else {
        this.#gap(place, null);
        this.#hold(place, r.value);
      }
    }
  }

  // the controls a knob moves: the ones it was learned for; a pad that wasn't learned, the nearest pad learned below it
  // on its channel (whose control's next choices it picks: `padValue`)
  #bound(knob: Knob): [string, Knob][] {
    const all = Object.entries(this.bindings);
    const exact = all.filter(([, k]) => sameKnob(k, knob));
    if (exact.length || knob.kind === 'cc') return exact;
    const below = all.filter(([, k]) => k.kind === 'note' && k.channel === knob.channel && k.number < knob.number).sort((a, b) => b[1].number - a[1].number);
    return below.slice(0, 1);
  }

  // hold at the next frame: the last value a knob sent before it, once
  #hold(place: string, v: number): void {
    this.#pending.set(place, v);
    if (this.#scheduled) return;
    this.#scheduled = true;
    this.#frame(() => this.#flush());
  }

  #flush(): void {
    this.#scheduled = false;
    // (a value a knob moved in a piece since closed is dropped)
    this.#fresh();
    const pending = [...this.#pending];
    this.#pending.clear();
    for (const [place, v] of pending) {
      const f = freeAtPlace(this.#piece.program.cells, place);
      if (f) this.#piece.hold(f, v);
    }
    // the value as it reads back now (written in the code it's rounded as the code writes it): a knob that set it holds it
    for (const [place] of pending) {
      const t = this.#takeover.get(place);
      const now = freeAtPlace(this.#piece.program.cells, place)?.value;
      if (t && now !== undefined) this.#takeover.set(place, { ...t, set: now });
    }
  }

  #gap(place: string, at: number | null): void {
    if (at === null ? !this.gaps.has(place) : this.gaps.get(place) === at) return;
    const gaps = new Map(this.gaps);
    if (at === null) gaps.delete(place);
    else gaps.set(place, at);
    this.#gaps = { scope: this.#scope(), at: gaps };
  }

  #scope(): Scope {
    return { title: this.#piece.title, opened: this.#opened() };
  }

  // another piece open (or this one renamed) since a knob last moved: what was this session's goes
  #fresh(): void {
    const now = this.#scope();
    if (!sameScope(this.#session, now)) {
      this.#session = now;
      this.#takeover.clear();
      this.#pending.clear();
      if (this.#gaps.at.size) this.#gaps = { scope: now, at: NO_GAPS };
    }
    if (this.#learning && this.learning === null) this.cancel();
  }

  #bind(places: Record<string, Knob>): void {
    const { [this.#piece.title]: _old, ...others } = this.#kept.pieces;
    this.#save({ ...this.#kept, pieces: Object.keys(places).length ? { ...others, [this.#piece.title]: places } : others });
  }

  #save(kept: Learned): void {
    this.#kept = kept;
    try {
      localStorage.setItem(storageKey(KEY), JSON.stringify(kept));
    } catch {
      // (private window, or full: it's only not kept)
    }
  }

  // Esc stops waiting for a knob, before anything else hears it (a cell's sheet would close)
  readonly #onKey = (e: KeyboardEvent) => {
    if (e.key !== 'Escape') return;
    // (a wait that ended unseen, another piece opened or the input gone, lets Esc through)
    this.#fresh();
    if (this.learning === null) return;
    e.stopImmediatePropagation();
    e.preventDefault();
    this.cancel();
  };
  #listenForEscape(on: boolean): void {
    if (typeof window === 'undefined') return;
    if (on) window.addEventListener('keydown', this.#onKey, true);
    else window.removeEventListener('keydown', this.#onKey, true);
  }
}

function sameScope(a: Scope, b: Scope): boolean {
  return a.title === b.title && a.opened === b.opened;
}
