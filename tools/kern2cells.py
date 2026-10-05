"""
Turn a Humdrum **kern movement into cell-language lines: one braid per voice,
on a sixteenth grid, in semitones from C4 (a chord where a voice holds several
notes; v@n lasts n sixteenths; ~@n rests). Used once, to write the BWV 847
example from the CCARH encoding (Bach-Gesellschaft edition).
"""
import sys
from fractions import Fraction
from music21 import converter

def lines_of(path):
    s = converter.parse(path).stripTies()
    parts = list(s.parts)
    if len(parts) == 1:
        parts = list(parts[0].voicesToParts().parts)   # one part, two hands written as voices
    end = Fraction(s.highestTime).limit_denominator(64)
    out = []
    for p in parts:
        grid = {}
        for n in p.recurse().notes:
            off = Fraction(n.getOffsetInHierarchy(p)).limit_denominator(64) * 4
            dur = Fraction(n.duration.quarterLength).limit_denominator(64) * 4
            assert off.denominator == 1 and dur.denominator == 1, (off, dur)
            pitches = sorted(x.midi - 60 for x in (n.pitches if n.isChord else [n.pitch]))
            if int(off) in grid:  # two events at once in one voice: merge into a chord
                prev, d = grid[int(off)]
                pitches = sorted(set(prev + pitches))
                dur = max(dur, d)
            grid[int(off)] = (pitches, int(dur))
        tokens, t, total = [], 0, int(end * 4)
        rest = 0
        def flush():
            nonlocal rest
            if rest:
                tokens.append('~' if rest == 1 else f'~@{rest}')
                rest = 0
        while t < total:
            if t in grid:
                flush()
                pitches, d = grid[t]
                v = str(pitches[0]) if len(pitches) == 1 else '[' + ','.join(map(str, pitches)) + ']'
                tokens.append(v if d == 1 else f'{v}@{d}')
                t += d
            else:
                rest += 1
                t += 1
        flush()
        mean = sum(sum(g[0]) / len(g[0]) for g in grid.values()) / max(1, len(grid))
        out.append((mean, tokens, total))
    out.sort(key=lambda x: -x[0])  # top voice first
    return out

if __name__ == '__main__':
    for path in sys.argv[1:]:
        for mean, tokens, total in lines_of(path):
            print(f'{path.split("/")[-1]} mean {mean:+.1f} · {len(tokens)} tokens · {total} sixteenths: {" ".join(tokens[:24])} …')
