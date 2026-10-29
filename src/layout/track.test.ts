import { describe, expect, it } from 'vitest';
import { compilePiece } from '../compile';
import { codeShifts } from '@yggi/cells/engine/program';
import { bulbHosts } from './drawn';
import { bulbsOf, cursorOf, layTrack, netEnds, stepOn, tauOf, trackAt, trackReach } from './track';

// Twinkle's shape (#221): &up here only, &down read elsewhere too, &mid (here only) holding a &down, twice round.
const SRC = ['&up 0 0 4 4 5 5 4@2', '&down 3 3 2 2 1 1 0@2', '&mid &down', '&tune step=1 0 &up &down &mid!2 &up &down', '&other step=1 &down'].join('\n');
const r = compilePiece(SRC);
const shifts = codeShifts(r);
const bulbs = bulbsOf(r, 'tune', shifts, bulbHosts(r));

describe('the track: a bulb for each splice', () => {
  it('a splice used here only is solid, one read elsewhere hollow; placed in time, a repeat its laps', () => {
    // (&mid is &down and nothing else: one bulb, &down's notes on it, hollow)
    expect(bulbs.map((b) => [b.name, b.net, b.laps, b.label])).toEqual([
      ['up', null, 1, ''],
      ['down', 'down', 1, ''],
      ['mid', 'down', 2, '&down'],
      ['up', null, 1, ''],
      ['down', 'down', 1, ''],
    ]);
    // 1 + 8 + 8 + 16 + 8 + 8 = 49 steps: &up from the second
    expect(bulbs[0].t0).toBeCloseTo(1 / 49);
    expect(bulbs[2].t1 - bulbs[2].t0).toBeCloseTo(16 / 49);
  });

  it('a splice in a splice is a bulb on its bulb', () => {
    const r2 = compilePiece(['&m1 0 1', '&m2 2 3', '&A &m1 4 &m2', '&tune step=1 &A 0'].join('\n'));
    const [A] = bulbsOf(r2, 'tune', codeShifts(r2), bulbHosts(r2));
    expect(A.bulbs.map((b) => [b.name, b.net])).toEqual([
      ['m1', null],
      ['m2', null],
    ]);
    expect(A.bulbs[1].t1).toBeCloseTo(A.t1);
  });

  it('one closed curve: the ring and its bulbs, time along it; out where a bulb is, on the ring between', () => {
    const track = layTrack(100, 100, 50, 20, bulbs);
    // τ runs on round the track, and the curve has no jumps
    for (let i = 1; i < track.p.length; i++) {
      expect(track.tau[i]).toBeGreaterThanOrEqual(track.tau[i - 1]);
      expect(Math.hypot(track.p[i][0] - track.p[i - 1][0], track.p[i][1] - track.p[i - 1][1])).toBeLessThan(8);
    }
    const from = (t: number) => Math.hypot(trackAt(track, tauOf(track, t).tau).p[0] - 100, trackAt(track, tauOf(track, t).tau).p[1] - 100);
    expect(Math.abs(from(0.5 / 49) - 50)).toBeLessThan(2); // the plain step: on the ring (eased into the next neck)
    for (const b of bulbs) expect(from(b.t0 + (b.t1 - b.t0) / (2 * b.laps)), b.name).toBeGreaterThan(60); // each splice: out in its bulb
    // the ribbon narrows into a bulb, and widens back
    expect(trackAt(track, 0.5 / 49).w).toBeCloseTo(20);
    expect(trackAt(track, tauOf(track, (bulbs[0].t0 + bulbs[0].t1) / 2).tau).w).toBeLessThan(20);
    expect(trackReach(100, 100, track)).toBeGreaterThan(80);
  });

  it('a time is on the ring, or in a bulb (and the bulbs in it), on its first lap or a later one', () => {
    const track = layTrack(100, 100, 50, 20, bulbs);
    expect(tauOf(track, 0.5 / 49).chain).toEqual([]);
    const mid = bulbs[2];
    const second = tauOf(track, mid.t0 + (mid.t1 - mid.t0) * 0.75);
    const first = tauOf(track, mid.t0 + (mid.t1 - mid.t0) * 0.25);
    expect(second.chain.map((L) => L.bulb.name)).toEqual(['mid']);
    expect([first.lap, second.lap]).toEqual([0, 1]);
    // the same place on the drawing, a lap apart
    expect(second.tau).toBeCloseTo(first.tau);
    // a step there is drawn once, on the first lap
    expect(stepOn(track, mid.t0 + (mid.t1 - mid.t0) * 0.75, mid.t1)).toBeNull();
    expect(stepOn(track, mid.t0, mid.t0 + 1 / 49)!.tau1).toBeGreaterThan(stepOn(track, mid.t0, mid.t0 + 1 / 49)!.tau0);
  });

  it('a net-ref’s edge meets each bulb that shows it, outside it, along the line through its hub', () => {
    const track = layTrack(64, 64, 45, 26, bulbs);
    const ends = netEnds(track, 128, 'down');
    // the two &down, and &mid (which is a &down)
    expect(ends).toHaveLength(3);
    for (const e of ends) expect(e.r).toBeGreaterThan(64);
    expect(netEnds(track, 128, 'up')).toEqual([]);
  });

  it('the cursor bends from the hub round the inside of the bulb the time is in, and across its step; on the ring, the plain hand', () => {
    const track = layTrack(100, 100, 50, 20, bulbs);
    expect(cursorOf(100, 100, 10, track, 0.5 / 49)).toBeNull();
    const t = bulbs[0].t0 + 0.01;
    const d = cursorOf(100, 100, 10, track, t)!;
    const nums = [...d.matchAll(/-?[\d.]+/g)].map((m) => Number(m[0]));
    // (it starts on the hub's edge, and ends past the step, on the line from the bulb's hub through it)
    expect(Math.hypot(nums[0] - 100, nums[1] - 100)).toBeCloseTo(10, 1);
    const L = tauOf(track, t).chain[0];
    const head = trackAt(track, tauOf(track, t).tau).p;
    const end = nums.slice(-2);
    expect(Math.hypot(end[0] - L.C[0], end[1] - L.C[1])).toBeCloseTo(L.rho + L.w / 2 + 2, 1);
    const [u, v] = [Math.atan2(end[1] - L.C[1], end[0] - L.C[0]), Math.atan2(head[1] - L.C[1], head[0] - L.C[0])];
    expect(Math.abs(u - v)).toBeLessThan(0.01);
  });
});
