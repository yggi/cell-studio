import { describe, expect, it } from 'vitest';
import { tokenize } from './highlight';

const kinds = (line: string) => tokenize(line).filter((t) => t.kind !== 'space').map((t) => `${t.kind}:${t.text}`);

describe('highlighting', () => {
  it('a melody: references, attributes, functions, numbers, modifiers, rests, comments', () => {
    expect(kinds('&theme over=&scale step=&bar*2 0@2 4 ~ 7^-12 # the theme')).toEqual([
      'ref:&theme',
      'attr:over',
      'punct:=',
      'ref:&scale',
      'attr:step',
      'punct:=',
      'ref:&bar',
      'mod:*2',
      'num:0',
      'mod:@2',
      'num:4',
      'rest:~',
      'num:7',
      'mod:^-12',
      'comment:# the theme',
    ]);
  });
  it('generators, tempi, notes, fractions, chords', () => {
    expect(kinds('&bar scan(1!4 2) step=free(96bpm, 60..160) loop=C#4 map=ed(3/2) [0,4,7]')).toEqual([
      'ref:&bar',
      'func:scan',
      'punct:(',
      'num:1',
      'mod:!4',
      'num:2',
      'punct:)',
      'attr:step',
      'punct:=',
      'func:free',
      'punct:(',
      'num:96bpm',
      'punct:,',
      'num:60',
      'punct:..',
      'num:160',
      'punct:)',
      'attr:loop',
      'punct:=',
      'note:C#4',
      'attr:map',
      'punct:=',
      'func:ed',
      'punct:(',
      'num:3/2',
      'punct:)',
      'punct:[',
      'num:0',
      'punct:,',
      'num:4',
      'punct:,',
      'num:7',
      'punct:]',
    ]);
  });
  it('quoted text is one piece — a # inside it isn’t a comment', () => {
    expect(kinds('&why label="C major #1: a triad" # real')).toEqual(['ref:&why', 'attr:label', 'punct:=', 'string:"C major #1: a triad"', 'comment:# real']);
  });
  it('every character is kept: the tokens put back together are the line', () => {
    const line = '&mix loop=SAMPLE_RATE map=sample [&tune * &(map=adsr .01 .3 .4 .3) * &lead * .3, &x[::-1]^7]';
    expect(tokenize(line).map((t) => t.text).join('')).toBe(line);
  });
});
