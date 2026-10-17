import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { transportClock } from '../../audio/clock.svelte';
import { Keys, type Hands } from './keys.svelte';
import { Piece } from './piece.svelte';
import { Recorder } from './record.svelte';
import { DRUM_PRESETS } from '@yggi/webmidi/core';

// A take (#210): record arms it and starts play; the next whole pass of the armed cell's loop is taken from the keys
// (their moments read through where the piece was heard then); at its end it is held; a new take replaces the last.

const store = new Map<string, string>();
beforeEach(() => {
  store.clear();
  vi.stubGlobal('localStorage', { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v) });
  transportClock.state = 'stopped';
  transportClock.seconds = 0;
});
afterEach(() => {
  vi.unstubAllGlobals();
  transportClock.state = 'stopped';
});

// a riff of four steps a second over C major, on a sine at C4: a pass is a second
const RIFF = `&key scan(2 2 1 2 2 2 1)
&riff over=&key step=4 free(0 2 4 ~)
&other over=&key step=4 0 1
&lead s=sine loop=C4
&organ s=square loop=C3
&out map=sample [&riff * &lead, &other * &organ]`;

function made() {
  const piece = new Piece(RIFF);
  const hands: Hands = { press: () => 1, release: () => {}, onKeysCut: null };
  const midi = { hear: () => () => {}, thruOf: () => [], sendTo: () => {}, drumsFrom: () => DRUM_PRESETS.GM! };
  const keys = new Keys(piece, hands, midi);
  const playback = {
    playing: false,
    starting: false,
    toggle: async () => {
      playback.playing = true;
      transportClock.state = 'playing';
    },
    // (the page's clock and the piece's, one and the same here: ms → seconds)
    player: { heardAt: (ms: number) => (playback.playing ? ms / 1000 : null) },
  };
  const recorder = new Recorder(piece, playback, keys);
  // (what the recorder's effect does each frame while recording; node runs no effects)
  const at = (seconds: number) => {
    transportClock.seconds = seconds;
    recorder.tick(transportClock.state, seconds);
  };
  const stop = () => (recorder.dispose(), keys.dispose());
  return { piece, keys, playback, recorder, at, stop };
}

describe('the recorder', () => {
  it('arms the cell armed, starts play, takes one pass and holds it: keys together a chord, a key held @n, nothing ~', () => {
    const { piece, keys, recorder, playback, at, stop } = made();
    expect(recorder.any).toBe(true);
    expect(recorder.target?.cell).toBe('riff');
    recorder.record();
    expect(recorder.state).toBe('armed');
    expect(playback.playing).toBe(true);
    at(0);
    expect(recorder.state).toBe('taking');
    keys.press(60, 100, 0, 100); // C, step 0.4: the first step
    keys.release(60, 0, 300);
    keys.press(64, 100, 0, 520); // E and G together, step 2: a chord, held to the end
    keys.press(67, 100, 0, 530);
    at(0.6);
    keys.release(64, 0, 1000);
    keys.release(67, 0, 1000);
    at(0.9); // (step 3.6: the last a key may start on is past)
    expect(recorder.state).toBe('off');
    expect(recorder.last).toBe('0 ~ [2,4]@2');
    expect(piece.code).toContain('free(0 2 4 ~)');
    expect(piece.playedCode).toContain('&riff over=&key step=4 free(0 ~ [2,4]@2)');
    stop();
  });

  it('a new take replaces the last; one called off (record again, or Pause) holds nothing', () => {
    const { piece, keys, recorder, playback, at, stop } = made();
    recorder.record();
    at(0.1);
    keys.press(72, 100, 0, 200);
    keys.release(72, 0, 400);
    at(0.95);
    expect(recorder.last).toBe('~ 7 ~ ~');
    // again, mid-loop: the next whole pass (1 … 2 s)
    at(1.3);
    recorder.record();
    at(1.4);
    expect(recorder.state).toBe('armed');
    keys.press(62, 100, 0, 1450); // (before the pass: dropped)
    keys.release(62, 0, 1500);
    at(1.9);
    expect(recorder.state).toBe('taking');
    keys.press(65, 100, 0, 2010);
    keys.release(65, 0, 2700);
    at(2.95);
    expect(recorder.last).toBe('3@3 ~');
    expect(piece.playedCode).toContain('free(3@3 ~)');
    // called off: pressed again, or paused
    recorder.record();
    at(3.1);
    recorder.record();
    expect(recorder.state).toBe('off');
    recorder.record();
    at(3.1);
    playback.playing = false;
    transportClock.state = 'paused';
    recorder.tick('paused', 3.1);
    expect(recorder.state).toBe('off');
    expect(piece.playedCode).toContain('free(3@3 ~)');
    stop();
  });

  it('a key off the table, recorded as it plays: allow an accidental, snap the nearest entry, ignore nothing', () => {
    for (const [mode, want] of [
      ['allow', '0# ~ ~ ~'],
      ['snap', '0 ~ ~ ~'],
      ['ignore', '~ ~ ~ ~'],
    ] as const) {
      const { keys, recorder, at, stop } = made();
      keys.mode = mode;
      recorder.record();
      at(0);
      keys.press(61, 100, 0, 10); // C#
      keys.release(61, 0, 200);
      at(0.9);
      expect(recorder.last, mode).toBe(want);
      stop();
    }
  });

  it('the rows of the cell taken (the on-screen keys of its roll) as their numbers; a voice armed takes the braid that plays it', () => {
    const { keys, recorder, at, stop } = made();
    keys.chosen = 'lead';
    expect(recorder.target?.cell).toBe('riff');
    keys.chosen = 'other';
    expect(recorder.target).toBeNull();
    keys.chosen = '';
    recorder.record();
    at(0);
    keys.pressRow('riff', 9, 100, 260);
    keys.releaseRow('riff', 9, 700);
    keys.pressRow('other', 3, 100, 760); // (another cell's row: nothing)
    at(0.9);
    expect(recorder.last).toBe('~ 9@2 ~');
    stop();
  });
});
