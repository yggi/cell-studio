// A voice's sound parameters (dough notation) and how a moving one is scheduled over a note.
import type { ParamTrack } from '../../engine/realize';
import type { Movable } from './nodes';

export type Params = Readonly<Record<string, number | string>>;

/** Schedule a parameter's track for one note: points held or gliding, or an envelope released after the note. */
export function schedule(param: Movable, key: string, track: ParamTrack, time: number, dur: number) {
  // filter frequencies glide as the ear hears them (exponentially); levels and resonance in a line
  const exp = key === 'lpf' || key === 'hpf';
  const ramp = (v: number, t: number) => (exp && v > 0 ? param.exponentialRampToValueAtTime(Math.max(1, v), t) : param.linearRampToValueAtTime(v, t));
  param.cancelScheduledValues(time);
  if (track.kind === 'points') {
    track.points.forEach((x, i) => {
      const t = Math.max(time, x.at);
      if (i > 0 && x.ramp) ramp(x.value, t);
      else param.setValueAtTime(exp ? Math.max(1, x.value) : x.value, t);
    });
    return;
  }
  const { from, peak, attack, decay, sustain, release } = track;
  const hold = from + (peak - from) * sustain;
  param.setValueAtTime(exp ? Math.max(1, from) : from, time);
  ramp(peak, time + Math.max(0.001, attack));
  ramp(hold, time + Math.max(0.002, attack + decay));
  param.setValueAtTime(exp ? Math.max(1, hold) : hold, time + Math.max(dur, attack + decay + 0.003));
  ramp(from, time + Math.max(dur, attack + decay + 0.003) + Math.max(0.005, release));
}

export const num = (p: Params, k: string, d: number) => (typeof p[k] === 'number' ? (p[k] as number) : d);

/** A voice's envelope when nothing shapes its notes (no map=adsr in the product): quick and full. */
export function envelope(_p: Params) {
  return { attack: 0.005, decay: 0.1, sustain: 1, release: 0.05 };
}
