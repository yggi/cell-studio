/**
 * A click at a followed session's section switch, by level (#492, #478 rung 3's bound), for `tools/session-probe.mjs`:
 * the peak of what Cell studio's page sounds in the 10 ms round the start of each bar whose text switched, set against
 * the same 10 ms round the start of the bars either side. A voice cut at the switch, or two texts' notes doubled there,
 * would lift the switch's peak above theirs; a bar's start where nothing changes is the measure of what the music does
 * there anyway.
 *
 * The page's output is tapped where it goes to the speakers (an AudioWorklet beside the destination, sampling each
 * render quantum's peak at the context's `currentTime`), and the player says where it laid each bar's start on that
 * same clock (`cellStudio.session.state().sound.bars`), so the two meet without a clock between them.
 */

/** A bar laid: its start on the audio clock (seconds), and whether its text switched there. */
export interface BarLaid {
  readonly bar: number;
  readonly at: number;
  readonly switched: boolean;
}

/** Half the window round a bar's start the peak is taken in (seconds): 10 ms in all. */
export const HALF = 0.005;
/**
 * How far over the louder of the bars either side a switch's peak may be, in dB: 3, a doubling of power, which a
 * cut voice's step or a note doubled reaches and the music's own bar to bar change seldom does (chosen; named here).
 */
export const CLICK_DB = 3;

export interface SwitchLevel {
  readonly bar: number;
  /** The peaks round its start and round the starts of the bars either side, dBFS (-Infinity for silence). */
  readonly peak: number;
  readonly before: number;
  readonly after: number;
  /** Its peak over the louder of the two, dB. */
  readonly over: number;
}

const db = (x: number) => 20 * Math.log10(x);

/**
 * Each switch whose bar and the bars either side were laid and sounded within the levels taken (`levels`: each
 * quantum's start on the audio clock and its peak, linear, a quantum lasting `quantum` seconds).
 */
export function switchLevels(bars: readonly BarLaid[], levels: readonly (readonly [number, number])[], quantum: number): SwitchLevel[] {
  const byBar = new Map(bars.map((b) => [b.bar, b]));
  const [first, last] = [levels[0]?.[0] ?? Infinity, (levels.at(-1)?.[0] ?? -Infinity) + quantum];
  const peakAt = (t: number): number | null => {
    if (t - HALF < first || t + HALF > last) return null;
    let p = 0;
    for (const [at, peak] of levels) if (at + quantum > t - HALF && at < t + HALF) p = Math.max(p, peak);
    return db(p);
  };
  return bars.flatMap((b) => {
    const [x, y] = [byBar.get(b.bar - 1), byBar.get(b.bar + 1)];
    if (!b.switched || !x || !y) return [];
    const [peak, before, after] = [peakAt(b.at), peakAt(x.at), peakAt(y.at)];
    if (peak === null || before === null || after === null) return [];
    // (nothing sounded at any of the three: no level to set against another, said apart: `heard`)
    const louder = Math.max(before, after);
    return [{ bar: b.bar, peak, before, after, over: Number.isFinite(peak) || Number.isFinite(louder) ? peak - louder : -Infinity }];
  });
}

/** Whether anything sounded round a switch or the bars either side (a text on a MIDI card alone sounds nothing here). */
export const heard = (s: SwitchLevel): boolean => Number.isFinite(Math.max(s.peak, s.before, s.after));

/** Whether a switch is under the bound: no click by level. */
export const clean = (s: SwitchLevel): boolean => !(s.over > CLICK_DB);
