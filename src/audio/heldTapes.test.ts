import { describe, expect, it } from 'vitest';
import { compileSource } from '../engine/compile';
import { codeShifts } from '../engine/program';
import { plan } from '../engine/realize';
import { clocking, tapeMotion } from '../engine/clocking';
import { PRESETS } from '../engine/presets';
import { HeldTapes } from './heldTapes';
import type { VoiceBank } from './voices';

const result = compileSource(PRESETS.soundtape.source);
const p = plan(result, codeShifts(result));
const motion = tapeMotion(result, clocking(result, p.statics), 'tape');

/** Tapes held in a transport that stands at `at`, over a voice bank that records every hold: head delay (at → seconds) per call. */
function held(at: number) {
  const holds: ((head: number) => number)[] = [];
  const voices = { tapeScrub: (_: string, f: ((head: number) => number) | null) => f && holds.push(f) } as unknown as VoiceBank;
  const h = new HeldTapes(
    () => p,
    () => voices,
    () => 100,
  );
  h.pause(at);
  holds.length = 0;
  return { h, holds };
}

describe('held tapes follow the timeline', () => {
  it('they stand where the transport paused, and go where the timeline goes, forward and back', () => {
    const { h } = held(2);
    expect(h.position('tape')).toBeCloseTo(motion.pos(2));
    for (const t of [3.5, 1, 6, 0.25]) {
      h.follow(t);
      expect(h.position('tape')).toBeCloseTo(motion.pos(t));
    }
  });
  it('the heads read what sat under them: further on, a later moment', () => {
    const { h, holds } = held(2);
    h.follow(1);
    h.follow(1.5);
    const [before, after] = holds.slice(-2).map((f) => f(0.375));
    // (audio time stands still: a head further along the tape reads a moment closer to now)
    expect(after).toBeLessThan(before);
  });
  it('at the start it is where it begins, and holds there (seamless: no jump below it)', () => {
    const { h } = held(2);
    h.follow(0);
    expect(h.position('tape')).toBeCloseTo(0);
    h.follow(0);
    expect(h.position('tape')).toBeCloseTo(0);
    h.follow(0.5);
    expect(h.position('tape')).toBeGreaterThan(0);
  });
  it('a tape a hand moved keeps its displacement as the timeline moves, until play or Stop', () => {
    const { h } = held(2);
    h.scrub('tape', motion.pos(2) + 1.5);
    expect(h.position('tape')).toBeCloseTo(motion.pos(2) + 1.5);
    h.follow(4);
    expect(h.position('tape')).toBeCloseTo(motion.pos(4) + 1.5);
    h.scrub('tape', null);
    h.follow(1);
    expect(h.position('tape')).toBeCloseTo(motion.pos(1) + 1.5);
    h.reset();
    h.follow(3);
    expect(h.position('tape')).toBeCloseTo(motion.pos(3));
  });
});
