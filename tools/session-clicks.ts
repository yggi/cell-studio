/**
 * A click at a followed session's section switch, by level (#492, #478 rung 3's bound), for `tools/session-probe.mjs`:
 * the peak of what Cell studio's page sounds round the start of each bar whose text switched (`WINDOW`), set against the
 * same round the start of the bars either side. A voice cut at the switch, or two texts' notes doubled there,
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

/**
 * The window round a bar's start the peak is taken in (seconds): from 5 ms before it, where a voice cut at the switch
 * would click, to 10 ms after, so that it holds the bar's own attack, which a render quantum or so after the start
 * lands (measured: 3 to 5 ms); centred on the start, a window of 10 ms held it or not by a fraction of a millisecond.
 */
export const WINDOW = { before: 0.005, after: 0.01 } as const;
/**
 * How far over the louder of the bars either side a switch's peak may be, in dB: 6, a doubling of the amplitude, which
 * a cut voice's step or a note doubled reaches. The owner loosened it from 3 (a doubling of power) on #503: the music's
 * own bar to bar change reached 2.9 dB over 33 switches, too near 3 to tell from a click (chosen; named here).
 */
export const CLICK_DB = 6;

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
    const [from, to] = [t - WINDOW.before, t + WINDOW.after];
    if (from < first || to > last) return null;
    let p = 0;
    for (const [at, peak] of levels) if (at + quantum > from && at < to) p = Math.max(p, peak);
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

/** Whether anything sounded round a switch or the bars either side. */
export const heard = (s: SwitchLevel): boolean => Number.isFinite(Math.max(s.peak, s.before, s.after));

/** Whether a switch is under the bound: no click by level. */
export const clean = (s: SwitchLevel): boolean => !(s.over > CLICK_DB);

/** Stereo samples (-1 to 1, a channel each) as a 16-bit PCM WAV file, to listen to a switch (the probe's `CLIPS`). */
export function wav(channels: readonly (readonly number[])[], rate: number): Uint8Array {
  const frames = channels[0]?.length ?? 0;
  const n = channels.length;
  const bytes = new Uint8Array(44 + frames * n * 2);
  const v = new DataView(bytes.buffer);
  const text = (at: number, s: string) => [...s].forEach((c, i) => v.setUint8(at + i, c.charCodeAt(0)));
  text(0, 'RIFF');
  v.setUint32(4, 36 + frames * n * 2, true);
  text(8, 'WAVE');
  text(12, 'fmt ');
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, n, true);
  v.setUint32(24, rate, true);
  v.setUint32(28, rate * n * 2, true);
  v.setUint16(32, n * 2, true);
  v.setUint16(34, 16, true);
  text(36, 'data');
  v.setUint32(40, frames * n * 2, true);
  for (let f = 0; f < frames; f++) for (let c = 0; c < n; c++) v.setInt16(44 + (f * n + c) * 2, Math.round(Math.max(-1, Math.min(1, channels[c]![f]!)) * 32767), true);
  return bytes;
}
