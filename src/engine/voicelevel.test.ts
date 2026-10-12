import { describe, expect, it } from 'vitest';
import { compileSource } from './compile';
import { eventsBetween, plan } from './realize';

const events = (src: string) => {
  const r = compileSource(src);
  expect(r.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
  return eventsBetween(
    plan(r, () => 0),
    0,
    8,
  )
    .map((e) => ({ at: +e.at.toFixed(6), voice: e.voice, freq: +e.freq.toFixed(3), gains: e.gains.map((g) => +g.toFixed(6)) }))
    .sort((a, b) => a.at - b.at || a.voice.localeCompare(b.voice));
};

const VOICES = `
&bar scan(1 1 1 1) step=120bpm
&bd s=sine loop=A1 env=&(map=adsr 0 .3 0 .05)
&sd s=white env=&(map=adsr 0 .12 0 .05)
`;

describe("a voice's level=", () => {
  it('is its own gain: a kit of balanced members plays what one product a drum plays', () => {
    const products = events(`${VOICES}
&kick map=amp step=&bar 1 ~ 1 ~
&snare map=amp step=&bar ~ 1 ~ 1
&out map=sample [&kick * &bd * .8, &snare * &sd * .4]`);
    const kit = events(`${VOICES.replace('&bd s=sine', '&bd level=.8 s=sine').replace('&sd s=white', '&sd level=.4 s=white')}
&beat step=&bar &bd &sd &bd &sd
&out map=sample [&beat]`);
    expect(kit).toEqual(products);
  });

  it('is 1 by default, and multiplies every gain a voice is played at', () => {
    const plain = events(`${VOICES}\n&beat step=&bar &bd ~ &bd ~\n&out map=sample [&beat * .5]`);
    const half = events(`${VOICES.replace('&bd s=sine', '&bd level=.5 s=sine')}\n&beat step=&bar &bd ~ &bd ~\n&out map=sample [&beat * .5]`);
    expect(half.map((e) => e.gains)).toEqual(plain.map((e) => e.gains.map((g) => g * 0.5)));
  });

  it('is no warning on a voice', () => {
    const r = compileSource(`&lead level=.5 s=saw loop=C4\n&tune 0 2 4 step=2\n&out map=sample [&tune * &lead]`);
    expect(r.diagnostics.filter((d) => /level/.test(d.message))).toEqual([]);
  });
});

describe('oneshot', () => {
  const at = (src: string) => {
    const r = compileSource(src);
    expect(r.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    return eventsBetween(
      plan(r, () => 0),
      0,
      4,
    ).map((e) => ({ voice: e.voice, at: +e.at.toFixed(3), dur: +e.dur.toFixed(3) }));
  };
  const SRC = (word: string) => `&bar scan(1 1 1 1) step=240bpm
&bd ${word} s=sine loop=A1 env=&(map=adsr 0 .3 0 .05)
&hh s=white env=&(map=adsr 0 .04 0 .02)
&beat step=&bar/2 &bd &hh &bd &hh
&out map=sample [&beat]`;

  it('plays a voice its envelope through, whatever its step: a kick on eighths rings its decay', () => {
    const plain = at(SRC(''));
    const hit = at(SRC('oneshot'));
    // (eighths at 240 bpm: an eighth is 0.125 s, the kick's decay 0.3 s)
    expect(plain.find((e) => e.voice === 'bd')!.dur).toBeCloseTo(0.125, 3);
    expect(hit.find((e) => e.voice === 'bd')!.dur).toBeCloseTo(0.3, 3);
    // the same notes at the same times, and the hats as they were
    expect(hit.map((e) => [e.voice, e.at])).toEqual(plain.map((e) => [e.voice, e.at]));
    expect(hit.filter((e) => e.voice === 'hh')).toEqual(plain.filter((e) => e.voice === 'hh'));
  });

  it('is given once', () => {
    expect(compileSource(SRC('oneshot oneshot')).diagnostics.some((d) => /oneshot is given twice/.test(d.message))).toBe(true);
  });
});
