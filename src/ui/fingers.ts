// The pointer pattern is yggi/jambot apps/web/src/components/Keyboard.svelte and DrumPads.svelte @ 8cdb6b8.
/**
 * The fingers on the on-screen keys and pads (#255): each pointer holds the note it came down on until it lifts, is
 * cancelled, or loses its capture, so a phone plays chords (a finger each) and no key sticks. A pointer captured on
 * press (in a try: a synthetic or vanished pointer can't be) keeps its key when it slides off. Two fingers on one key
 * strike it again, and it lets go when the last lifts. The keyboard holds a focused key with Enter or Space. What
 * sounds goes through `studio.keys` (the path MIDI in plays), never a sound of its own.
 */

/** What a finger needs of a pointer event (a PointerEvent is one; a test makes its own). */
export interface Touch {
  readonly pointerId: number;
  readonly pointerType?: string;
  readonly button?: number;
  readonly currentTarget: EventTarget | null;
  preventDefault(): void;
}

/** Where the fingers' notes go: `studio.keys` on a channel. */
export interface Play {
  press(note: number, velocity: number): void;
  release(note: number): void;
}

export class Fingers {
  // which pointer (or key: below 0) holds which note, and how many hold each note
  #held = new Map<number, number>();
  #count = new Map<number, number>();

  constructor(private readonly play: Play) {}

  /** A pointer down on a key: it holds the note (a mouse's other buttons don't). */
  down(e: Touch, note: number, velocity: number): void {
    if (e.pointerType === 'mouse' && e.button !== undefined && e.button !== 0) return;
    e.preventDefault();
    try {
      (e.currentTarget as Element | null)?.setPointerCapture?.(e.pointerId);
    } catch {
      // (not capturable: pointerup and pointercancel still come to this key)
    }
    this.#hold(e.pointerId, note, velocity);
  }

  /** A pointer up, cancelled, or its capture lost: its note lets go when no other finger holds it. One not down: nothing. */
  up(e: Pick<Touch, 'pointerId'>): void {
    this.#let(e.pointerId);
  }

  /** Enter or Space on a focused key: held while down (a repeat is ignored). True: the key was the keyboard's. */
  keyDown(e: { readonly key: string; readonly repeat: boolean; preventDefault(): void }, note: number, velocity: number): boolean {
    if (e.key !== 'Enter' && e.key !== ' ') return false;
    e.preventDefault();
    if (!e.repeat) this.#hold(-1 - note, note, velocity);
    return true;
  }

  /** Enter or Space let go, or the key losing focus. */
  keyUp(note: number): void {
    this.#let(-1 - note);
  }

  /** Every note lets go (the dock closed, the window lost focus). */
  releaseAll(): void {
    for (const id of [...this.#held.keys()]) this.#let(id);
  }

  #hold(id: number, note: number, velocity: number): void {
    if (this.#held.has(id)) return;
    this.#held.set(id, note);
    this.#count.set(note, (this.#count.get(note) ?? 0) + 1);
    this.play.press(note, velocity);
  }

  #let(id: number): void {
    const note = this.#held.get(id);
    if (note === undefined) return;
    this.#held.delete(id);
    const left = (this.#count.get(note) ?? 1) - 1;
    if (left > 0) return void this.#count.set(note, left);
    this.#count.delete(note);
    this.play.release(note);
  }
}
