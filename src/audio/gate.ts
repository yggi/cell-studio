/**
 * A mix's wheel hears only what goes through it (#77): each voice's tap into a mix's wheel is a gain that opens
 * while that voice plays notes going through the mix, and closes when they have rung out. Notes come a window
 * ahead and not always in order, and overlap: the gate keeps the times it is open as merged spans and schedules
 * them again from where a new note changes them. The tap is watched, never heard, so it switches without ramps.
 *
 * A key held (`hold`, #252) keeps it open from its start until `letGo` says when it has rung out; it is a span of its
 * own, apart from the plan's, so a note the plan plays meanwhile can't close the gate under a key.
 */

/** How long a key is taken to be held at most (as the voices hold one): an hour. */
const HOLD = 3600;

/** What a gate schedules: an AudioParam (the tap's gain) or a stand-in in a test. */
interface Param {
  setValueAtTime(v: number, t: number): unknown;
  cancelScheduledValues(t: number): unknown;
}

export class Gate {
  /** The spans it is open, in order, apart (none ends before the last scheduling moment's past). */
  private spans: { a: number; b: number }[] = [];

  /** The keys held, by id: from when to when (an hour on, until let go). */
  private holds = new Map<number, { a: number; b: number; down: boolean }>();

  constructor(private readonly param: Param) {}

  /** A key held from `a` (audio seconds) until `letGo`; `now` is the audio clock. */
  hold(id: number, a: number, now: number): void {
    if (!Number.isFinite(a)) return;
    this.holds.set(id, { a, b: a + HOLD, down: true });
    this.schedule(a, now);
  }

  /** The key `id` has rung out at `end`: the gate closes then, unless a note or another key keeps it open. One not held: ignored. */
  letGo(id: number, end: number, now: number): void {
    const h = this.holds.get(id);
    if (!h) return;
    h.b = Math.max(h.a, end);
    h.down = false;
    this.schedule(h.a, now);
  }

  /** The keys still held, to carry onto a new gate when the taps are made again. */
  held(): readonly { id: number; a: number }[] {
    return [...this.holds].filter(([, h]) => h.down).map(([id, h]) => ({ id, a: h.a }));
  }

  /** Open from `a` to `b` (audio seconds), `now` being the audio clock. */
  open(a: number, b: number, now: number): void {
    if (!(b > a) || !Number.isFinite(a) || !Number.isFinite(b) || b <= now) return;
    // (what has rung out is done: forget it)
    while (this.spans.length && this.spans[0].b <= now) this.spans.shift();
    const last = this.spans[this.spans.length - 1];
    if ((!last || a > last.b) && !this.holds.size) {
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
    this.schedule(merged.a, now);
  }

  // everything from `at` on scheduled again: the plan's spans and the keys' together, merged where they touch
  private schedule(at: number, now: number): void {
    const from = Math.max(at, now);
    this.param.cancelScheduledValues(from);
    // (a key that has rung out is done: forget it)
    for (const [id, h] of this.holds) if (!h.down && h.b <= now) this.holds.delete(id);
    const all: { a: number; b: number }[] = [];
    for (const s of [...this.spans, ...this.holds.values()].sort((x, y) => x.a - y.a)) {
      const last = all[all.length - 1];
      if (last && s.a <= last.b) last.b = Math.max(last.b, s.b);
      else all.push({ ...s });
    }
    for (const s of all) {
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
