/**
 * A mix's wheel hears only what goes through it (#77): each voice's tap into a mix's wheel is a gain that opens
 * while that voice plays notes going through the mix, and closes when they have rung out. Notes come a window
 * ahead and not always in order, and overlap: the gate keeps the times it is open as merged spans and schedules
 * them again from where a new note changes them. The tap is watched, never heard, so it switches without ramps.
 */

/** What a gate schedules: an AudioParam (the tap's gain) or a stand-in in a test. */
interface Param {
  setValueAtTime(v: number, t: number): unknown;
  cancelScheduledValues(t: number): unknown;
}

export class Gate {
  /** The spans it is open, in order, apart (none ends before the last scheduling moment's past). */
  private spans: { a: number; b: number }[] = [];

  constructor(private readonly param: Param) {}

  /** Open from `a` to `b` (audio seconds), `now` being the audio clock. */
  open(a: number, b: number, now: number): void {
    if (!(b > a) || !Number.isFinite(a) || !Number.isFinite(b) || b <= now) return;
    // (what has rung out is done: forget it)
    while (this.spans.length && this.spans[0].b <= now) this.spans.shift();
    const last = this.spans[this.spans.length - 1];
    if (!last || a > last.b) {
      // the usual case: after everything scheduled
      this.spans.push({ a, b });
      this.param.setValueAtTime(1, Math.max(a, now));
      this.param.setValueAtTime(0, b);
      return;
    }
    // merged with the spans it touches; from there on everything is scheduled again
    const merged = { a, b };
    const kept: { a: number; b: number }[] = [];
    for (const s of this.spans) {
      if (s.b < merged.a || s.a > merged.b) kept.push(s);
      else ((merged.a = Math.min(merged.a, s.a)), (merged.b = Math.max(merged.b, s.b)));
    }
    kept.push(merged);
    kept.sort((x, y) => x.a - y.a);
    this.spans = kept;
    const from = Math.max(merged.a, now);
    this.param.cancelScheduledValues(from);
    for (const s of this.spans) {
      if (s.b <= from) continue;
      if (s.a >= from) this.param.setValueAtTime(1, s.a);
      // (open already, before now: it stays open)
      else this.param.setValueAtTime(1, from);
      this.param.setValueAtTime(0, s.b);
    }
  }

  /** The spans still to come or sounding (to carry onto a new gate when the taps are made again). */
  pending(now: number): readonly { a: number; b: number }[] {
    return this.spans.filter((s) => s.b > now);
  }
}
