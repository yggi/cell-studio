import { storageKey } from '../../storageKey';
import { OCTAVE_MAX, OCTAVE_MIN } from '../../layout/keyboard';

const KEY = 'cell-studio:dock';

export type DockTab = 'keys' | 'pads';
/** How hard an on-screen key plays: from where it is struck (lower is louder), or always the same. */
export type Velocity = 'height' | 'fixed';

/** What this browser keeps of the dock: open or not, its tab, the keyboard's octave, how velocity is given. */
type Stored = { readonly open: boolean; readonly tab: DockTab; readonly octave: number; readonly velocity: Velocity };
const DEFAULTS: Stored = { open: false, tab: 'keys', octave: 4, velocity: 'height' };

/** The velocity a key plays at when velocity is fixed (MIDI's usual default). */
export const FIXED_VELOCITY = 100;

function load(): Stored {
  try {
    const kept = JSON.parse(localStorage.getItem(storageKey(KEY)) ?? 'null') as Partial<Stored> | null;
    if (!kept || typeof kept !== 'object') return DEFAULTS;
    const o = kept.octave;
    return {
      open: kept.open === true,
      tab: kept.tab === 'pads' ? 'pads' : 'keys',
      octave: Number.isInteger(o) && (o as number) >= OCTAVE_MIN && (o as number) <= OCTAVE_MAX ? (o as number) : DEFAULTS.octave,
      velocity: kept.velocity === 'fixed' ? 'fixed' : 'height',
    };
  } catch {
    return DEFAULTS;
  }
}

/**
 * The dock of on-screen keys and drum pads (#255), along the bottom: whether it is open, which tab, the octave the
 * keyboard is centred on, and how a key's velocity is given. Kept in this browser (a private window: only not kept).
 * What it plays goes through `studio.keys`.
 */
export class Dock {
  #kept = $state.raw<Stored>(load());

  get open(): boolean {
    return this.#kept.open;
  }
  set open(on: boolean) {
    this.#save({ ...this.#kept, open: on });
  }

  get tab(): DockTab {
    return this.#kept.tab;
  }
  set tab(t: DockTab) {
    this.#save({ ...this.#kept, tab: t === 'pads' ? 'pads' : 'keys' });
  }

  /** The octave the keyboard is centred on (4: middle C's), OCTAVE_MIN … OCTAVE_MAX. */
  get octave(): number {
    return this.#kept.octave;
  }
  set octave(o: number) {
    const octave = Math.max(OCTAVE_MIN, Math.min(OCTAVE_MAX, Math.round(o)));
    if (octave !== this.#kept.octave && Number.isFinite(octave)) this.#save({ ...this.#kept, octave });
  }

  get velocity(): Velocity {
    return this.#kept.velocity;
  }
  set velocity(v: Velocity) {
    this.#save({ ...this.#kept, velocity: v === 'fixed' ? 'fixed' : 'height' });
  }

  toggle(): void {
    this.open = !this.open;
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
