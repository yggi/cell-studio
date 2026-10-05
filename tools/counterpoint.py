"""
Species counterpoint against the Ricercar's theme, by search: every line obeys
the rules of its species, and the smoothest one found is kept. Used once to
write the counterpoint study; the result is checked again by the tests.

Pitches are semitones from C4. Time is in quarters (the theme's steps).
"""
import random

THEME = [(0, 2, 0), (2, 2, 3), (4, 2, 7), (6, 2, 8), (8, 2, 11), (10, 1, None), (11, 1, 12),
         (12, 1, 11), (13, 1, 10), (14, 1, 9), (15, 1, 8), (16, 2, 7), (18, 2, None)]
SCALE = {0, 2, 3, 5, 7, 8, 9, 10, 11}          # C minor, both forms of 6 and 7
CONS = {0, 3, 4, 7, 8, 9}                      # consonances (mod 12) against the theme
PERFECT = {0, 7}

def ok_pitch(p, lo, hi):
    return lo <= p <= hi and p % 12 in SCALE

def interval(a, b):
    return abs(a - b) % 12

def first_species(lo, hi, above, seed):
    """One note against each note of the theme (rests: a rest)."""
    rng = random.Random(seed)
    notes = [t for t in THEME if t[2] is not None]
    best = None
    def score(line):
        s = 0
        for i in range(1, len(line)):
            leap = abs(line[i] - line[i - 1])
            s += 0 if leap <= 2 else leap
            if leap == 0: s += 3
            a, b = notes[i - 1][2], notes[i][2]
            if (line[i] - line[i - 1]) * (b - a) < 0: s -= 1    # contrary motion
        return s
    def search(i, line):
        nonlocal best
        if i == len(notes):
            sc = score(line)
            if best is None or sc < best[0]: best = (sc, list(line))
            return
        cf = notes[i][2]
        cands = [p for p in range(lo, hi + 1) if ok_pitch(p, lo, hi) and interval(p, cf) in CONS and (p > cf if above else p < cf)]
        if i == 0: cands = [p for p in cands if interval(p, cf) in PERFECT]        # begin perfect
        if i == len(notes) - 1: cands = [p for p in cands if interval(p, cf) in {0, 3, 4, 7}]  # end on the chord
        rng.shuffle(cands)
        for p in cands:
            if line:
                q, pc, cc = line[-1], notes[i - 1][2], cf
                if abs(p - q) > 7 or abs(p - q) == 6: continue                     # no wide leaps, no tritone
                if interval(p, cc) in PERFECT and interval(q, pc) == interval(p, cc) and p != q: continue  # parallel 5ths / 8ves
                if interval(p, cc) in PERFECT and (p - q) * (cc - pc) > 0 and abs(p - q) > 2: continue     # hidden: by leap
            line.append(p)
            if best is None or score(line) < best[0] + 6: search(i + 1, line)
            line.pop()
    search(0, [])
    out, k = [], 0
    for start, dur, p in THEME:
        if p is None: out.append((start, dur, None))
        else: out.append((start, dur, best[1][k])); k += 1
    return out

def divide(line, per_quarter, lo, hi, seed, against=()):
    """Second / third species: each note of a first-species line becomes several;
    the first stays (consonant), the others pass or neighbour by step toward the next."""
    rng = random.Random(seed)
    out = []
    notes = [x for x in line if x[2] is not None]
    for idx, (start, dur, p) in enumerate(line):
        if p is None:
            out.append((start, dur, None)); continue
        n = int(dur * per_quarter)
        nxt = next((x[2] for x in line[line.index((start, dur, p)) + 1:] if x[2] is not None), p)
        seq = [p]
        for k in range(1, n):
            # walk toward the next note by step, or turn round a neighbour
            cur = seq[-1]
            target = nxt if k == n - 1 else nxt
            step = 1 if target > cur else -1 if target < cur else rng.choice([1, -1])
            cand = [cur + step * d for d in (1, 2) if ok_pitch(cur + step * d, lo, hi)]
            if not cand: cand = [cur]
            seq.append(cand[0] if abs(target - cand[0]) >= 1 or k < n - 1 else cand[-1])
        for k, q in enumerate(seq):
            out.append((start + k / per_quarter, 1 / per_quarter, q))
    return out

def check(line, others, fourth_ok_with=()):
    """Every note where a theme note begins: consonant with every voice sounding. Elsewhere a
    dissonance only as a passing or neighbour note (by step on both sides). Returns the problems."""
    starts = {s for (s, e, q) in THEME}
    problems = []
    flat = [x for x in line if x[2] is not None]
    for i, (t, d, p) in enumerate(flat):
        for name, other in others:
            o = sounding(other, t)
            if o is None: continue
            cons = CONS | ({5} if name in fourth_ok_with else set())
            if interval(p, o) in cons: continue
            strong = any(abs(t - s0) < 1e-9 for s0 in starts)
            prev = flat[i - 1][2] if i else None
            nxt = flat[i + 1][2] if i + 1 < len(flat) else None
            stepwise = prev is not None and nxt is not None and 0 < abs(p - prev) <= 2 and 0 < abs(nxt - p) <= 2
            if strong or not stepwise:
                problems.append((t, p, name, o))
    return problems

def tokens(line, per_step):
    """As braid tokens: per_step notes per step of the line's clock."""
    out = []
    for start, dur, p in line:
        n = round(dur * per_step)
        tok = '~' if p is None else str(p)
        out.append(tok if n == 1 else f'{tok}@{n}')
    return ' '.join(out)


# ---- a general search: k notes per quarter, against one or more voices

def sounding(voice, t):
    return next((q for (s, e, q) in voice if q is not None and s <= t + 1e-9 < s + e), None)

def species(per_quarter, lo, hi, against, seed=0, above=True, beam=400, center=None, arch=5.0, peak=0.6):
    """
    A counterpoint in notes of 1/per_quarter, against the given voices (name, line, allow_fourth).
    On each theme note's first sub-note: consonant with every voice. Elsewhere: consonant, or a
    passing / neighbour note (by step, checked once the next note is known). No parallel perfect
    intervals between strong notes; no chromatic steps; no wide leaps; near `center`.
    """
    rng = random.Random(seed)
    cf = against[0][1]
    slots = []   # (time, dur, strong) for each sub-note; rests where the theme rests
    for start, dur, p in cf:
        if p is None:
            slots.append((start, dur, None)); continue
        n = 1 if per_quarter == 'note' else round(dur * per_quarter)     # 'note': one against each theme note
        for k in range(n): slots.append((start + k * dur / n, dur / n, k == 0))
    total = max(s[0] + s[1] for s in slots)
    center = center if center is not None else (lo + hi) / 2
    def cons_with(p, t, strict_only=False):
        for name, line, fourth in against:
            o = sounding(line, t)
            if o is None: continue
            if (p > o) != above and name == 'theme': return False          # keep its side of the theme
            c = CONS | ({5} if fourth else set())
            if interval(p, o) not in c: return False
        return True
    def chromatic(a, b):
        return abs(a - b) == 1 and {a % 12, b % 12} in ({11, 10}, {9, 8}, {2, 3}) and False or (abs(a - b) == 1 and {a % 12, b % 12} in ({11, 10}, {9, 8}))
    last = max(k for k, sl in enumerate(slots) if sl[2] is not None)
    beams = [(0.0, [])]
    for i, (t, d, strong) in enumerate(slots):
        nxt = []
        for sc, line in beams:
            if strong is None:
                nxt.append((sc, line + [None])); continue
            prev = next((x for x in reversed(line) if x is not None), None)
            pp_t = next((s2[0] for s2 in reversed(slots[:i]) if s2[2] is not None), None)
            cands = [p for p in range(lo, hi + 1) if ok_pitch(p, lo, hi)]
            rng.shuffle(cands)
            for p in cands:
                c = cons_with(p, t)
                if strong and not c: continue
                if prev is None and strong and interval(p, sounding(cf, t)) not in (PERFECT if above else {0}): continue   # begin perfect (a bass: on the tonic)
                if i == last and not c: continue                                                      # end consonant
                if prev is not None:
                    leap = abs(p - prev)
                    if leap > 7 or leap == 6 or (leap == 0 and per_quarter != 'note' and per_quarter > 1): continue
                    if chromatic(p, prev): continue
                # the note before: if it was a dissonance, it must pass or neighbour by step into this one
                hist = [x for x in line if x is not None]
                if len(hist) >= 2:
                    a, b = hist[-2], hist[-1]
                    tb = [s for s in slots[:i] if s[2] is not None][-1][0]
                    if not cons_with(b, tb):
                        if not (0 < abs(b - a) <= 2 and 0 < abs(p - b) <= 2): continue
                # parallel perfect intervals between strong notes, against each voice
                if strong and prev is not None:
                    bad = False
                    pt = [s for s in slots[:i] if s[2]][-1][0] if any(s[2] for s in slots[:i]) else None
                    pp = next((x for x, s in zip(reversed(line), reversed(slots[:i])) if s[2]), None)
                    for name, voice, _ in against:
                        o, po = sounding(voice, t), sounding(voice, pt) if pt is not None else None
                        if None in (o, po, pp): continue
                        if interval(p, o) in PERFECT and interval(pp, po) == interval(p, o) and (p != pp or o != po): bad = True
                    if bad: continue
                cost = sc
                if prev is not None:
                    leap = abs(p - prev)
                    cost += 0 if leap <= 2 else (2.0 if (not above and leap in (5, 7)) else leap * 1.5)
                    if not c: cost += 0.5                                   # dissonances: allowed, not sought
                # a line with a shape: rising to a high point (or, below, a low one) and back
                import math
                x = t / total
                bend = math.sin(math.pi * min(1, x / (2 * peak))) if x < peak else math.sin(math.pi * (0.5 + (x - peak) / (2 * (1 - peak))))
                target = center + (arch if above else -arch) * bend
                cost += abs(p - target) * 0.35
                hist2 = [x2 for x2 in line if x2 is not None]
                if prev is not None and p == prev: cost += 6                       # no standing still
                if len(hist2) >= 2 and p == hist2[-2] and len(hist2) >= 3 and hist2[-1] == hist2[-3]: cost += 3   # no a-b-a-b
                # moving against the theme, on its notes
                if strong and prev is not None and pp_t is not None:
                    o, po = sounding(cf, t), sounding(cf, pp_t)
                    if o is not None and po is not None and (p - prev) * (o - po) < 0: cost -= 0.8
                nxt.append((cost, line + [p]))
        nxt.sort(key=lambda x: x[0])
        beams = nxt[:beam]
        if not beams: raise RuntimeError(f'no line at slot {i}')
    best = beams[0][1]
    return [(t, d, p) for (t, d, _), p in zip(slots, best)]


def study():
    """The study's lines, in eighths: first species above and below, second, third, and a free upper line over the bass."""
    T = ('theme', THEME, False)
    first = species('note', 12, 24, [T], above=True, center=15, arch=6)
    under = species('note', -19, -3, [T], above=False, center=-10, arch=5)
    second = species(1, 12, 24, [T], above=True, center=15, arch=6)
    third = species(2, 12, 26, [T], above=True, center=16, arch=7, beam=1500)
    florid = species(2, 12, 26, [('theme', THEME, True), ('bass', under, False)], above=True, center=17, arch=6, beam=2000, seed=3)
    return {'first': first, 'under': under, 'second': second, 'third': third, 'florid': florid}
