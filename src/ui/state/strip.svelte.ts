/**
 * The tower strip's width (ui/TowerStrips.svelte, #440): one for the graph and the time view, dragged at the strip's
 * left edge, kept in this browser. From collapsed (`STRIP_MIN`: the scale, its strata's rails and their markers) to
 * `STRIP_MAX`; unset, `STRIP`; `?strips` opens it at `STRIP_OPEN`. Its button collapses it and opens it again to the
 * width it had.
 */
import { storageKey } from '../../storageKey';

const STRIP = 64;
const STRIP_OPEN = 180;
export const STRIP_MIN = 28;
export const STRIP_MAX = 360;

const KEY = storageKey('cell-studio-strip-width');

function kept(): number {
  try {
    return Number(localStorage.getItem(KEY)) || 0;
  } catch {
    return 0;
  }
}

class StripWidth {
  width = $state(STRIP);
  #open = STRIP_OPEN;

  constructor(opened: boolean) {
    const k = kept();
    this.width = opened ? STRIP_OPEN : k || STRIP;
    this.#open = Math.max(k, STRIP_OPEN);
  }

  resize(w: number) {
    this.width = Math.max(STRIP_MIN, Math.min(STRIP_MAX, w));
    if (this.width > STRIP_MIN) this.#open = this.width;
    try {
      localStorage.setItem(KEY, String(Math.round(this.width)));
    } catch {
      // (no storage: kept for this visit only)
    }
  }

  /** Collapsed, or open again to the width it had. */
  toggle() {
    this.resize(this.width > STRIP_MIN ? STRIP_MIN : this.#open);
  }
}

export const strip = new StripWidth(typeof location !== 'undefined' && new URLSearchParams(location.search).has('strips'));
