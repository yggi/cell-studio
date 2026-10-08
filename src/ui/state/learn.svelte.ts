import { freePosition } from '../free';
import { freeAtPlace, freePlace, knobOf, LOOSE, padValue, readLearned, sameKnob, takeover, type Knob, type Learned, type Takeover } from '../learn';
import { storageKey } from '../../storageKey';
import type { FreeSpec } from '../../engine/ast';
import type { Midi } from './midi.svelte';
import type { Piece } from './piece.svelte';

const KEY = 'cell-studio:midi-learn';

/**
 * MIDI learn: a controller's knob, fader or pad moves a free() as its slider does (`piece.hold`). Learn a control and
 * the next control change or note binds to it; bindings are this browser's, kept by piece title and the free()'s place
 * (`learn.ts`), so they survive edits elsewhere in the code, and Stop or Keep (they bind, they hold nothing). A knob
 * takes over softly (it moves the value once it reaches it), and a fast knob holds at most once a frame per control,
 * since each hold compiles the piece again. `dispose` when it goes.
 */
export class Learn {
  /** The place of the control waiting for a knob, or null. */
  learning = $state<string | null>(null);
  /** Where a knob is that hasn't caught its control's value yet (0..1), by place: the gap a slider shows. */
  gaps = $state.raw<ReadonlyMap<string, number>>(new Map());

  #kept = $state.raw<Learned>(readLearned(null));
  #piece: Piece;
  #midi: Pick<Midi, 'access' | 'hear' | 'send'>;
  #frame: (run: () => void) => void;
  #stop: () => void;
  // soft takeover by place (this session's: a knob's place isn't worth keeping)
  #takeover = new Map<string, Takeover>();
  // the values a knob moved this frame, by place: held once, at the frame
  #pending = new Map<string, number>();
  #scheduled = false;

  constructor(piece: Piece, midi: Pick<Midi, 'access' | 'hear' | 'send'>, frame: (run: () => void) => void = (run) => requestAnimationFrame(run)) {
    this.#piece = piece;
    this.#midi = midi;
    this.#frame = frame;
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

  /** Whether there is MIDI to learn from. */
  get connected(): boolean {
    return this.#midi.access !== null;
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
    this.learning = this.learning === place || !place ? null : place;
    this.#listenForEscape(this.learning !== null);
  }

  cancel(): void {
    this.learning = null;
    this.#listenForEscape(false);
  }

  /** Let go of the knob learned for a place. */
  forget(place: string): void {
    const { [place]: _gone, ...rest } = this.bindings;
    this.#bind(rest);
    this.#takeover.delete(place);
    this.#gap(place, null);
  }

  /** Let go of every knob learned for the open piece. */
  forgetAll(): void {
    this.#bind({});
    this.#takeover.clear();
    this.gaps = new Map();
  }

  /** A control moved by hand (its slider or keypad): send its CC back if asked to, and the knob is where it is now. */
  moved(spec: FreeSpec, value: number): void {
    if (!this.echo) return;
    const place = this.placeOf(spec);
    const knob = this.bindings[place];
    if (knob?.kind !== 'cc') return;
    const at = freePosition(spec, value);
    this.#midi.send([0xb0 | knob.channel, knob.number, Math.round(at * 127)]);
    this.#takeover.set(place, { knob: at, set: null });
    this.#gap(place, null);
  }

  #heard(data: ArrayLike<number>): void {
    const m = knobOf(data);
    if (!m) return;
    const knob: Knob = { kind: m.kind, channel: m.channel, number: m.number };
    if (this.learning !== null) {
      const place = this.learning;
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
    this.gaps = gaps;
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
    if (e.key !== 'Escape' || this.learning === null) return;
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
