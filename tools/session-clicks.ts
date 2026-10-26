/**
 * A click at a section switch, checked by level (#492, #478 rung 3's bound), for `tools/session-probe.mjs`: what Cell
 * studio's page put out while it followed a session, each block's largest sample and its level (RMS), set at each
 * switch against the bars around it.
 *
 * A click is a cut: the notes sounding stopped, or a voice unwired, mid-wave. The level then drops tens of dB within a
 * block (128 samples, 2.7 ms at 48 kHz), where a note's own release or a drum's decay takes several. So the measure is
 * the largest drop in level from a block to the next, in dB, of blocks louder than `FLOOR`. Two measures that don't
 * work here: the largest step between samples (a saw, which a voice with no sound of its own plays, and the drums' noise
 * step that far every cycle), and the largest fall in RMS (a kick's decay falls as far as a cut).
 *
 * - **Where:** a switch's window runs from `BEFORE` before its bar line (the player rewires the voices when it first
 *   lays the new text, up to its lead, 0.35 s, ahead of the bar) to `AFTER` past it (the new text's first notes).
 * - **Against what:** the same window at the bars one and two either side that aren't switches, so the end of a bar
 *   and a downbeat are set against ends of bars and downbeats.
 * - **The bound:** no switch's largest drop more than `MARGIN` (9 dB) past the largest of its references'. Over 10
 *   minutes of Jambot's band (Jambot 24a528b), each of the 236 bars that aren't switches, set against its neighbours as
 *   a switch is, stood at most 6.4 dB past them (2 past 6 dB, so a bound of 6 would fail a run in four by chance); the
 *   33 switches stood at most 1.9 dB past. With the notes sounding cut dead at each switch (a fault put in to try it),
 *   one switch stood 54 dB past: a cut of what sounds is caught, and one of next to nothing isn't.
 */

/** Each block the page put out: its start on the audio clock (seconds), its largest sample and its level (RMS), by index. */
export interface Blocks {
  readonly t: readonly number[];
  readonly peak: readonly number[];
  readonly rms: readonly number[];
}

/** A bar begun, on the audio clock (seconds), and whether its text is another than the bar's before. */
export interface Bar {
  readonly bar: number;
  readonly at: number;
  readonly switched: boolean;
}

export const BEFORE = 0.5;
export const AFTER = 0.05;
/** How far a switch's largest drop may stand past its references', in dB: past the 6.4 the bars that aren't switches reached. */
export const MARGIN = 9;
/** The level a drop is counted from: −40 dBFS. Below it, a drop is a quiet note's end, not a cut heard. */
export const FLOOR = 0.01;
/** The level a drop is counted to, at most: −100 dBFS, so silence is a finite drop. */
const SILENCE = 1e-5;

export interface SwitchLevel {
  readonly bar: number;
  /** The switch's largest drop and its references' largest, in dB, and how far the one stands past the other. */
  readonly drop: number;
  readonly reference: number;
  readonly db: number;
}

export interface Clicks {
  /** Each switch checked. */
  readonly switches: readonly SwitchLevel[];
  /** The switches not checked: their window not recorded, or no bar around them to set them against. */
  readonly unchecked: readonly number[];
  /** The loudest sample put out, dBFS: below −40 is silence. */
  readonly loudest: number;
}

const db = (x: number) => 20 * Math.log10(x);

/** The first block at or after `t` (the blocks in order of time). */
function firstAt(t: readonly number[], at: number): number {
  let [lo, hi] = [0, t.length];
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (t[mid]! < at) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

/** The largest drop in level from a block to the next in a bar's window (dB), or null where the blocks don't cover it. */
function dropAround(b: Blocks, at: number): number | null {
  const from = at - BEFORE;
  const to = at + AFTER;
  if (!b.t.length || b.t[0]! > from || b.t.at(-1)! < to) return null;
  let drop = 0;
  for (let i = Math.max(1, firstAt(b.t, from)); i < b.t.length && b.t[i]! < to; i++)
    if (b.rms[i - 1]! > FLOOR) drop = Math.max(drop, db(b.rms[i - 1]! / Math.max(b.rms[i]!, SILENCE)));
  return drop;
}

export function clicksAt(blocks: Blocks, bars: readonly Bar[]): Clicks {
  const byBar = new Map(bars.map((b) => [b.bar, b]));
  const switches: SwitchLevel[] = [];
  const unchecked: number[] = [];
  const overlapsSwitch = (b: Bar) => bars.some((s) => s.switched && Math.abs(s.at - b.at) < BEFORE + AFTER);
  for (const s of bars.filter((b) => b.switched)) {
    const drop = dropAround(blocks, s.at);
    const references = [-2, -1, 1, 2]
      .map((d) => byBar.get(s.bar + d))
      .filter((b) => b && !b.switched && !overlapsSwitch(b))
      .map((b) => dropAround(blocks, b!.at))
      .filter((x) => x !== null);
    if (drop === null || !references.length) {
      unchecked.push(s.bar);
      continue;
    }
    const reference = Math.max(...references);
    switches.push({ bar: s.bar, drop, reference, db: drop - reference });
  }
  const loudest = blocks.peak.reduce((a, b) => Math.max(a, b), 0);
  return { switches, unchecked, loudest: loudest > 0 ? db(loudest) : -Infinity };
}

/** Whether the page was heard (above −40 dBFS) and no switch clicked: every one checked within the margin. */
export const clean = (c: Clicks): boolean => c.loudest > -40 && c.switches.length > 0 && c.switches.every((s) => s.db <= MARGIN);
