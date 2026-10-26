/**
 * A Jambot host's events set against Cell studio's, event for event (#492, #478 rung 3's bound), for
 * `tools/session-probe.mjs`: what the host's page played (`window.jambot.played()`) and what Cell studio's feed played
 * (`cellStudio.session.played()`), each `{ bar, part, step, note, velocity, length, seconds, duration }`, both on the
 * host's clock.
 *
 * Over the bars both played whole (from the later first bar, past it, to the earlier last, short of it: a page read
 * mid-bar holds it in part), an event is which it is by its bar, part, step and note, paired in order of onset. Every
 * pair is alike: velocity equal, length in steps within 1e-9, onset and duration within `within` seconds (the clock's
 * bound). An event one side lacks of the other's is explained where the side that lacks it said why: the host's
 * dropped late (`late`, by bar, part, step and note), Cell studio's lacked bars (`lackedBars`).
 */

/** An event as a page played it. */
export interface PlayedEvent {
  readonly bar: number;
  readonly part: string;
  readonly step: number;
  readonly note: number;
  readonly velocity: number;
  readonly length: number;
  readonly seconds: number;
  readonly duration: number;
}

/** What each side said of what it lacks: the host's events dropped late, the bars Cell studio's feed said it lacked. */
export interface Excuses {
  readonly late?: readonly Pick<PlayedEvent, 'bar' | 'part' | 'step' | 'note'>[];
  readonly lackedBars?: readonly number[];
}

export interface Comparison {
  /** The bars compared, first and last, and the host's events in them. */
  readonly bars: { readonly from: number; readonly to: number } | null;
  readonly events: number;
  readonly paired: number;
  /** Pairs that differ, by what. */
  readonly mismatched: { readonly velocity: number; readonly length: number; readonly onset: number; readonly duration: number };
  /** What each side lacks of the other's, and how many of those it said nothing of. */
  readonly lacked: { readonly studio: { readonly events: number; readonly unexplained: number }; readonly host: { readonly events: number; readonly unexplained: number } };
  /** The onsets' and durations' differences (Cell studio's less the host's), seconds: the middle one and the farthest. */
  readonly onset: { readonly median: number; readonly largest: number };
  readonly duration: { readonly largest: number };
  /** The first that differ, each in a line. */
  readonly differing: readonly string[];
}

const keyOf = (e: Pick<PlayedEvent, 'bar' | 'part' | 'step' | 'note'>) => `${e.bar} ${e.part} ${e.step} ${e.note}`;
const LENGTH = 1e-9;
const SHOWN = 20;

const byKey = (events: readonly PlayedEvent[]) => {
  const m = new Map<string, PlayedEvent[]>();
  for (const e of [...events].sort((a, b) => a.seconds - b.seconds)) m.set(keyOf(e), [...(m.get(keyOf(e)) ?? []), e]);
  return m;
};

export function compareSession(host: readonly PlayedEvent[], studio: readonly PlayedEvent[], within: number, excuses: Excuses = {}): Comparison {
  const bars = (es: readonly PlayedEvent[]) => es.map((e) => e.bar);
  const from = Math.max(Math.min(...bars(host)), Math.min(...bars(studio))) + 1;
  const to = Math.min(Math.max(...bars(host)), Math.max(...bars(studio))) - 1;
  const inBars = (es: readonly PlayedEvent[]) => es.filter((e) => e.bar >= from && e.bar <= to);
  const h = byKey(inBars(host));
  const s = byKey(inBars(studio));
  const late = new Set((excuses.late ?? []).map(keyOf));
  const lackedBars = new Set(excuses.lackedBars ?? []);
  const differing: string[] = [];
  const say = (line: string) => differing.length < SHOWN && differing.push(line);
  const mismatched = { velocity: 0, length: 0, onset: 0, duration: 0 };
  const lacked = { studio: { events: 0, unexplained: 0 }, host: { events: 0, unexplained: 0 } };
  const onsets: number[] = [];
  let durations = 0;
  let paired = 0;
  for (const key of new Set([...h.keys(), ...s.keys()])) {
    const hs = h.get(key) ?? [];
    const ss = s.get(key) ?? [];
    for (let i = 0; i < Math.max(hs.length, ss.length); i++) {
      const a = hs[i];
      const b = ss[i];
      if (a && !b) {
        lacked.studio.events++;
        if (!lackedBars.has(a.bar)) (lacked.studio.unexplained++, say(`Cell studio lacks ${key}`));
        continue;
      }
      if (b && !a) {
        lacked.host.events++;
        if (!late.has(key)) (lacked.host.unexplained++, say(`the host lacks ${key}`));
        continue;
      }
      paired++;
      const onset = b!.seconds - a!.seconds;
      const duration = b!.duration - a!.duration;
      onsets.push(onset);
      durations = Math.max(durations, Math.abs(duration));
      const wrong = [
        a!.velocity !== b!.velocity && (mismatched.velocity++, `velocity ${a!.velocity} → ${b!.velocity}`),
        Math.abs(a!.length - b!.length) > LENGTH && (mismatched.length++, `length ${a!.length} → ${b!.length}`),
        Math.abs(onset) > within && (mismatched.onset++, `onset ${(onset * 1000).toFixed(3)} ms`),
        Math.abs(duration) > within && (mismatched.duration++, `duration ${(duration * 1000).toFixed(3)} ms`),
      ].filter(Boolean);
      if (wrong.length) say(`${key}: ${wrong.join(', ')}`);
    }
  }
  const sorted = [...onsets].sort((x, y) => x - y);
  return {
    bars: from <= to ? { from, to } : null,
    events: inBars(host).length,
    paired,
    mismatched,
    lacked,
    onset: { median: sorted.length ? sorted[Math.floor(sorted.length / 2)]! : 0, largest: Math.max(0, ...onsets.map(Math.abs)) },
    duration: { largest: durations },
    differing,
  };
}

/** Whether a comparison meets the bound: every pair alike, and every event lacked explained. */
export const agrees = (c: Comparison): boolean =>
  c.bars !== null && Object.values(c.mismatched).every((n) => n === 0) && c.lacked.studio.unexplained === 0 && c.lacked.host.unexplained === 0;
