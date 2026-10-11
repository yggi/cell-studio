import { storageKey } from '../../storageKey';
import { SIGNALS, type Signal } from '../../engine/time/signals';

const KEY = 'cell-studio:time';

/** What the scalogram layer shows: three signals added as colours, or one alone. */
export type TimeSignal = 'mix' | Signal;
/** The time view's layers, each on or off. */
export interface TimeLayers {
  readonly scalogram: boolean;
  readonly notes: boolean;
  readonly waterfall: boolean;
  readonly waveform: boolean;
  readonly sections: boolean;
  readonly heard: boolean;
}
type Stored = TimeLayers & { readonly signal: TimeSignal };
const DEFAULTS: Stored = { scalogram: true, notes: true, waterfall: false, waveform: false, sections: true, heard: true, signal: 'mix' };

function load(): Stored {
  try {
    const kept = JSON.parse(localStorage.getItem(storageKey(KEY)) ?? 'null') as Partial<Stored> | null;
    if (!kept || typeof kept !== 'object') return DEFAULTS;
    const on = (k: keyof TimeLayers) => (typeof kept[k] === 'boolean' ? (kept[k] as boolean) : DEFAULTS[k]);
    return {
      scalogram: on('scalogram'),
      notes: on('notes'),
      waterfall: on('waterfall'),
      waveform: on('waveform'),
      sections: on('sections'),
      heard: on('heard'),
      signal: kept.signal === 'mix' || SIGNALS.includes(kept.signal as Signal) ? (kept.signal as TimeSignal) : 'mix',
    };
  } catch {
    return DEFAULTS;
  }
}

/** The time view's layers and the scalogram's signal (#286), kept in this browser (a private window: only not kept). */
export class TimeSettings {
  #kept = $state.raw<Stored>(load());
  get layers(): TimeLayers {
    return this.#kept;
  }
  get signal(): TimeSignal {
    return this.#kept.signal;
  }
  toggle(layer: keyof TimeLayers): void {
    this.#save({ ...this.#kept, [layer]: !this.#kept[layer] });
  }
  set signal(s: TimeSignal) {
    this.#save({ ...this.#kept, signal: s });
  }
  #save(next: Stored): void {
    this.#kept = next;
    try {
      localStorage.setItem(storageKey(KEY), JSON.stringify(next));
    } catch {
      // (a private window, or storage full: only not kept)
    }
  }
}
