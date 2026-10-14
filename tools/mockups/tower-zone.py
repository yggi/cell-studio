"""Mock-up (docs/notes/tower-sky.md, the neutral zone on the strip): how the strip could close the zone between the
structure (under 20 Hz) and the audible (from 20 Hz), where the gates, the voices and the mixers stand. Hypercell's
numbers (towerLayers: the zone 2.2 decades; the players' rates, the voices' pitches, the mixers, the outs).
  python3 tools/mockups/tower-zone.py > /tmp/zone.html   (screenshot the svg in Chromium)
"""
import math

BG, SURF, LINE, TEXT, MUTED, ACCENT, UNIT = '#1f222b', '#272b36', '#3b404f', '#f1ece2', '#a4a8b5', '#f4c04e', '#d4d7e0'
M1, M2 = '#6fd3c4', '#c49af0'


def hsl(h, s, l):
    s /= 100; l /= 100
    c = (1 - abs(2 * l - 1)) * s; x = c * (1 - abs((h / 60) % 2 - 1)); m = l - c / 2
    r, g, b = [(c, x, 0), (x, c, 0), (0, c, x), (0, x, c), (x, 0, c), (c, 0, x)][int(h // 60) % 6]
    return '#%02x%02x%02x' % tuple(round((v + m) * 255) for v in (r, g, b))


def note(f):
    midi = round(69 + 12 * math.log2(f / 440))
    o = max(-3, min(3, midi // 12 - 5))
    mute = 1 if o == 0 else 0.6 - 0.1 * (abs(o) - 1)
    return hsl((midi % 12) * 30, 70 * mute, max(18, min(88, 58 + o * 11)))


PX = 150  # px a decade, here
HEAR = math.log10(20)
ZONE = 2.2  # decades
TOP = math.log10(6000)
LOW = -1.3


def Y(d, gap=True):
    """The strip's y for a height (decades): the audible lifted over the zone."""
    u = d + (ZONE if gap and d >= HEAR else 0)
    return 40 + (TOP + ZONE - u) * PX


Z_TOP, Z_BOT = Y(HEAR), Y(HEAR - 1e-9)

# players: name, rate (Hz), what they play, their colour (a hit or a note)
PLAYERS = [('off', 5.33, 'bass', note(65.4)), ('stabs', 5.33, 'stab', note(261.6)), ('hook', 5.33, 'saws', note(523.3)),
           ('beat', 5.33, 'drums', UNIT), ('roll', 2.67, 'drums', UNIT), ('held', 0.67, 'pad', note(261.6)), ('lift', 0.083, 'riser', note(261.6))]
# voices: name, pitch (Hz), player(s), mixer (or the out itself)
VOICES = [('bass', 65.4, ['off'], 'bassPart'), ('stab', 261.6, ['stabs'], None), ('sawA', 523.3, ['hook'], 'hookPart'),
          ('sawB', 527.5, ['hook'], 'hookPart'), ('padv', 261.6, ['held'], 'padPart'), ('riser', 261.6, ['lift'], None),
          ('drums', 55.0, ['beat', 'roll'], None)]
OUTS = {'bassPart': 65.4, 'stab': 261.6, 'hookPart': 523.3, 'padPart': 261.6, 'riser': 261.6, 'drums': 55.0}


def strip(x0, title, sub, fill):
    w = 230
    o = [f'<text x="{x0}" y="16" class="h">{title}</text><text x="{x0}" y="30" class="s">{sub}</text>',
         f'<rect x="{x0}" y="40" width="{w}" height="{Y(LOW) - 40}" fill="{SURF}" stroke="{LINE}"/>']
    # rainbow above and below
    for k in range(-60, 110):
        f = 16.35 * 2 ** (k / 12)
        d = math.log10(f)
        if d < LOW or d > TOP:
            continue
        y = Y(d)
        o.append(f'<rect x="{x0}" y="{y - 1.3:.1f}" width="{w}" height="2.6" fill="{note(max(f, 1e-3)) if f >= 20 else hsl((k % 12) * 30, 30, 30)}" opacity="{.16 if f >= 20 else .2}"/>')
    # rails
    for name, a, b, c in [('audible', HEAR, TOP, ACCENT), ('pulse', math.log10(.5), HEAR - 1e-9, M1), ('slow', LOW, math.log10(.5), M2)]:
        o.append(f'<rect x="{x0 + w - 5}" y="{Y(b)}" width="4" height="{Y(a) - Y(b)}" fill="{c}" opacity=".85"/>')
    # the outs: a spire each at its fundamental
    rows = {}
    for nm, f in OUTS.items():
        rows.setdefault(round(math.log10(f), 2), []).append((nm, f))
    for key, outs in rows.items():
        for i, (nm, f) in enumerate(outs):
            c = UNIT if nm == 'drums' else note(f)
            x = x0 + 6 + i * 9
            o.append(f'<line x1="{x}" x2="{x}" y1="{Y(math.log10(f))}" y2="{Y(math.log10(f * 8))}" stroke="{c}"/>')
            o.append(f'<circle cx="{x}" cy="{Y(math.log10(f))}" r="3.5" fill="{c}"/>')
    # the structure: a row each player at its rate
    seen = {}
    for nm, r, _, c in PLAYERS:
        y = Y(math.log10(r)) + 9 * seen.get(round(r, 2), 0)
        seen[round(r, 2)] = seen.get(round(r, 2), 0) + 1
        o.append(f'<rect x="{x0 + 60}" y="{y - 2.5}" width="{w - 75}" height="5" fill="{c}" opacity=".85"/><text x="{x0 + 4}" y="{y + 3}" class="t">{nm}</text>')
    o.append(fill(x0, w))
    return ''.join(o)


def gap(x0, w):
    return f'<rect x="{x0}" y="{Z_TOP}" width="{w}" height="{Z_BOT - Z_TOP}" fill="{BG}"/><text x="{x0 + w / 2}" y="{(Z_TOP + Z_BOT) / 2}" class="s" text-anchor="middle">voices · mixers</text>'


def lanes(x0, w):
    """A: the zone as three lanes, gates, voices, mixers, each member a marker in its colour, in the graph's order."""
    o = [f'<rect x="{x0}" y="{Z_TOP}" width="{w}" height="{Z_BOT - Z_TOP}" fill="{BG}"/>']
    h = (Z_BOT - Z_TOP) / 3
    for k, (lab, items) in enumerate([('mixers', [('bassPart', note(65.4)), ('hookPart', note(523.3)), ('padPart', note(261.6))]),
                                      ('voices', [(v[0], UNIT if v[0] == 'drums' else note(v[1])) for v in VOICES]),
                                      ('gates', [('beat', UNIT), ('roll', UNIT)])]):
        y = Z_TOP + k * h
        o.append(f'<line x1="{x0}" x2="{x0 + w - 6}" y1="{y + h}" y2="{y + h}" stroke="{LINE}"/><text x="{x0 + 4}" y="{y + 12}" class="t">{lab}</text>')
        for i, (nm, c) in enumerate(items):
            yy = y + 24 + i * 11
            o.append(f'<circle cx="{x0 + 66}" cy="{yy}" r="3.5" fill="{c}"/><text x="{x0 + 74}" y="{yy + 3}" class="m" fill="{c}">{nm}</text>')
    return ''.join(o)


def bridges(x0, w):
    """B: a bridge each voice: from its player's row (its rate, under the zone) up across the zone to its out's fundamental
    (over it), the voices' row and the mixers' row where they cross; a mixer joins its voices' bridges."""
    o = [f'<rect x="{x0}" y="{Z_TOP}" width="{w}" height="{Z_BOT - Z_TOP}" fill="{BG}" opacity=".6"/>']
    vrow = Z_BOT - (Z_BOT - Z_TOP) * 0.35
    mrow = Z_BOT - (Z_BOT - Z_TOP) * 0.78
    o.append(f'<line x1="{x0}" x2="{x0 + w - 6}" y1="{vrow}" y2="{vrow}" stroke="{LINE}" stroke-dasharray="3 3"/><text x="{x0 + w - 8}" y="{vrow - 3}" class="t" text-anchor="end">voices</text>')
    o.append(f'<line x1="{x0}" x2="{x0 + w - 6}" y1="{mrow}" y2="{mrow}" stroke="{LINE}" stroke-dasharray="3 3"/><text x="{x0 + w - 8}" y="{mrow - 3}" class="t" text-anchor="end">mixers</text>')
    pr = {p[0]: p for p in PLAYERS}
    xs = {}
    for i, (nm, f, players, mixer) in enumerate(VOICES):
        x = x0 + 70 + i * 20
        xs[nm] = x
        c = UNIT if nm == 'drums' else note(f)
        for p in players:
            y0 = Y(math.log10(pr[p][1]))
            o.append(f'<path d="M{x0 + 60},{y0} C{x},{y0} {x},{y0} {x},{y0 - 20} L{x},{vrow}" fill="none" stroke="{c}" stroke-width="1.5" opacity=".8"/>')
        o.append(f'<circle cx="{x}" cy="{vrow}" r="4" fill="{c}"/>')
        # up to its mixer or straight out
        out = mixer or nm
        fy = Y(math.log10(OUTS[out]))
        if mixer:
            mx = x0 + 70 + [v[0] for v in VOICES].index(next(v[0] for v in VOICES if v[3] == mixer)) * 20
            o.append(f'<path d="M{x},{vrow} L{x},{mrow + 12} Q{x},{mrow} {mx},{mrow}" fill="none" stroke="{c}" stroke-width="1.5"/>')
        else:
            o.append(f'<line x1="{x}" x2="{x}" y1="{vrow}" y2="{Z_TOP}" stroke="{c}" stroke-width="1.5"/>')
    for m in ['bassPart', 'hookPart', 'padPart']:
        mx = x0 + 70 + [v[0] for v in VOICES].index(next(v[0] for v in VOICES if v[3] == m)) * 20
        c = note(OUTS[m])
        o.append(f'<rect x="{mx - 4}" y="{mrow - 4}" width="8" height="8" fill="{c}"/><line x1="{mx}" x2="{mx}" y1="{mrow}" y2="{Z_TOP}" stroke="{c}" stroke-width="2"/>')
    # into the audible: each to its fundamental, along the strip's inner edge
    for nm, f in OUTS.items():
        src = nm if nm in xs else nm
        x = xs.get(nm) or x0 + 70 + [v[0] for v in VOICES].index(next(v[0] for v in VOICES if v[3] == nm)) * 20
        c = UNIT if nm == 'drums' else note(f)
        o.append(f'<path d="M{x},{Z_TOP} C{x},{Y(math.log10(f)) + 20} {x0 + 30},{Y(math.log10(f))} {x0 + 10},{Y(math.log10(f))}" fill="none" stroke="{c}" stroke-width="1.2" opacity=".7"/>')
    return ''.join(o)


def minis(x0, w):
    """C: the zone as the audible in miniature: each lane (voices, mixers) the whole of 20 Hz … 20 kHz squeezed into its
    height, a column a member, its spectrum before it is mixed (voices) and after (mixers)."""
    o = [f'<rect x="{x0}" y="{Z_TOP}" width="{w}" height="{Z_BOT - Z_TOP}" fill="{BG}"/>']
    lanes_ = [('mixers', [('bassPart', 65.4), ('hookPart', 523.3), ('padPart', 261.6)], Z_TOP + 8, Z_TOP + (Z_BOT - Z_TOP) * 0.45),
              ('voices', [(v[0], v[1]) for v in VOICES], Z_TOP + (Z_BOT - Z_TOP) * 0.5, Z_BOT - 8)]
    for lab, items, a, b in lanes_:
        o.append(f'<text x="{x0 + 4}" y="{a + 10}" class="t">{lab}</text>')
        for i, (nm, f) in enumerate(items):
            x = x0 + 60 + i * 22
            for k in range(0, 10):
                ff = 20 * 2 ** k
                yy = b - (b - a) * k / 10
                if ff >= f * 0.9:
                    lv = max(0, 1 - 0.18 * (math.log2(ff / f)))
                    if lv > 0:
                        o.append(f'<rect x="{x - 8 * lv}" y="{yy - 3}" width="{16 * lv}" height="5" fill="{UNIT if nm == "drums" else note(f)}" opacity=".85"/>')
            o.append(f'<text x="{x}" y="{b + 8}" class="t" text-anchor="middle">{nm[:5]}</text>')
    return ''.join(o)


body = (strip(20, 'today', 'a gap: the zone blank', gap)
        + strip(290, 'A  lanes', 'gates, voices, mixers: a marker each', lanes)
        + strip(560, 'B  bridges', 'each voice from its player\'s rate to its pitch', bridges)
        + strip(830, 'C  the audible in miniature', 'voices and mixers, each its spectrum, squeezed', minis))
W, H = 1090, Y(LOW) + 20
print(f'''<!doctype html><meta charset=utf-8><style>body{{margin:0;background:{BG}}} text{{font-family:system-ui,sans-serif}}
.h{{fill:{TEXT};font-weight:700;font-size:14px}} .s{{fill:{MUTED};font-size:11px}} .t{{fill:{MUTED};font-size:9px}}
.m{{fill:{TEXT};font-size:10px;font-weight:700}}</style>
<svg width="{W}" height="{H:.0f}" viewBox="0 0 {W} {H:.0f}">{body}</svg>''')
