"""Mock-up (docs/notes/tower-sky.md): one tiered tower strip for the graph's tower layout and the time view.

Cellscape's numbers: the outs at their base frequencies (the bass lifted to the audible's floor in the graph), the
meter's beat and bar, the sections, the ridges the scalogram hears. Writes an HTML page; screenshot it in Chromium.
  python3 tools/mockups/tower-scale.py > /tmp/scale.html
"""
import math

BG, SURF, LINE, TEXT, MUTED, FAINT, ACCENT = '#1f222b', '#272b36', '#3b404f', '#f1ece2', '#a4a8b5', '#6a6f7d', '#f4c04e'
M1, M2 = '#6fd3c4', '#c49af0'


def hsl(h, s, l):
    s /= 100; l /= 100
    c = (1 - abs(2 * l - 1)) * s; x = c * (1 - abs((h / 60) % 2 - 1)); m = l - c / 2
    r, g, b = [(c, x, 0), (x, c, 0), (0, c, x), (0, x, c), (x, 0, c), (c, 0, x)][int(h // 60) % 6]
    return '#%02x%02x%02x' % tuple(round((v + m) * 255) for v in (r, g, b))


def tint(k, n):  # sectionTint: a section's colour through the white clock
    c = hsl(k / n * 360, 70, 58)
    rgb = [int(c[i:i + 2], 16) for i in (1, 3, 5)]
    return '#%02x%02x%02x' % tuple(round(.65 * v + .35 * w) for v, w in zip(rgb, (246, 247, 251)))


# the tiers, decades (log10 Hz), and how many px a decade gets in each (the smart strip: a tier with little in it is narrow)
TIERS = [  # name, from, to, px a decade, colour
    ('constant', None, None, 0, FAINT),
    ('slow', -3.0, math.log10(.5), 70, M2),
    ('pulse', math.log10(.5), math.log10(20), 120, M1),
    ('audible', math.log10(20), math.log10(20000), 150, ACCENT),
    ('card', math.log10(20000), math.log10(40000), 150, MUTED),
]
TOP, H = 40, 0
ys = {}
y = TOP
for name, a, b, px, c in reversed(TIERS):
    if a is None:
        ys[name] = (y, y + 26); y += 26; continue
    ys[name] = (y, y + (b - a) * px); y += (b - a) * px
H = y + 40


def Y(d):
    for name, a, b, px, c in TIERS:
        if a is not None and a <= d <= b:
            return ys[name][1] - (d - a) * px
    return ys['constant'][0] + 13


SECTIONS = ['drone', 'sequence', 'canon', 'bells', 'pulse', 'glass']
OUTS = [  # name, base Hz, section
    ('bass', 65.4, 4), ('padv', 130.8, 0), ('arpv', 261.6, 1), ('voiceA · voiceB', 523.3, 2), ('bell', 523.3, 3), ('glass', 523.3, 5),
]
RATES = [  # the structure: name, Hz, kind
    ('pulse step', 1 / .4, 'cell'), ('arp step', 1 / .29, 'cell'), ('beat', 1 / .83, 'meter'), ('bar', 1 / 3.33, 'meter'),
    ('section', 1 / 27, 'meter'), ('scene', 1 / 133, 'meter'), ('the piece', 1 / 1600, 'meter'),
]
RIDGES = [(1 / .29, .7), (1 / .83, .9), (1 / 3.33, 1), (1 / 27, .6), (1 / 133, .8)]


def spectrum(x0, w):
    """The sum, stacked: each band's bar split into its sources' shares, in their sections' colours."""
    out = []
    cx = x0 + w / 2
    for b in range(24, 110):
        f = 16.35 * 2 ** (b / 12)
        parts = []
        for name, f0, k in OUTS:
            for h in range(1, 12):
                if abs(12 * math.log2(f / (f0 * h))) < .5:
                    parts.append((tint(k, 6), .9 / h ** .8))
        if not parts:
            continue
        y = Y(math.log10(f))
        tot = max(v for _, v in parts)
        s = sum(v for _, v in parts)
        at = 0
        for c, v in parts:
            ln = v / s * tot * (w / 2 - 8)
            out.append(f'<rect x="{cx - at - ln:.1f}" y="{y - 2:.1f}" width="{ln:.1f}" height="3.4" fill="{c}"/>')
            out.append(f'<rect x="{cx + at:.1f}" y="{y - 2:.1f}" width="{ln:.1f}" height="3.4" fill="{c}"/>')
            at += ln
    return ''.join(out)


def strip(x0, w, title, sub, audible_marks, slow_marks, opened=True):
    o = [f'<text x="{x0}" y="20" class="h">{title}</text><text x="{x0}" y="34" class="s">{sub}</text>',
         f'<rect x="{x0}" y="{TOP}" width="{w}" height="{H - 80}" fill="{SURF}" stroke="{LINE}"/>']
    # the rainbow under the audible, muted
    for b in range(24, 120):
        f = 16.35 * 2 ** (b / 12)
        if 20 <= f <= 20000:
            o.append(f'<rect x="{x0}" y="{Y(math.log10(f)) - 2.3:.1f}" width="{w}" height="4.6" fill="{hsl((b % 12) * 30, 45, 50)}" opacity=".16"/>')
    # the tiers: a rail and a name each, their own units
    for name, a, b, px, c in TIERS:
        y0, y1 = ys[name]
        o.append(f'<rect x="{x0 + w - 6}" y="{y0}" width="4" height="{y1 - y0}" fill="{c}" opacity=".85"/>')
        o.append(f'<line x1="{x0}" x2="{x0 + w}" y1="{y0}" y2="{y0}" stroke="{c}" stroke-opacity=".5"/>')
        o.append(f'<text transform="translate({x0 + w - 12} {(y0 + y1) / 2}) rotate(-90)" class="z" fill="{c}">{name}</text>')
    if audible_marks:
        # octaves named (C1 … C9), decades in Hz
        for oc in range(1, 10):
            yy = Y(math.log10(32.7 * 2 ** (oc - 1)))
            o.append(f'<line x1="{x0 + w - 22}" x2="{x0 + w - 14}" y1="{yy}" y2="{yy}" stroke="{MUTED}"/><text x="{x0 + w - 24}" y="{yy + 3}" class="t" text-anchor="end">C{oc}</text>')
        o.append(spectrum(x0, w - 30))
        groups = {}
        for name, f0, k in OUTS:
            groups.setdefault(f0, []).append((name, k))
        for f0, g in groups.items():
            yy = Y(math.log10(f0))
            if name == 'bass':
                pass
            o.append(f'<path d="M{x0},{yy - 6} L{x0 + 9},{yy} L{x0},{yy + 6} Z" fill="{tint(g[0][1], 6)}"/>')
            for i, (nm, k) in enumerate(g):
                o.append(f'<rect x="{x0 + 2 + i * 4}" y="{Y(math.log10(f0 * 8))}" width="2.5" height="{yy - Y(math.log10(f0 * 8))}" fill="{tint(k, 6)}" opacity=".8"/>')
            if opened:
                o.append(f'<text x="{x0 + 14 + 4 * len(g)}" y="{yy - 4}" class="m">{" · ".join(n for n, _ in g)}</text>')
    if slow_marks:
        # under the audible: the time a level takes, the meter's levels named, the ridges the scalogram hears
        for d, lab in [(1, '1 s'), (0, '1 s'), (-1, '10 s'), (math.log10(1 / 60), '1 min'), (math.log10(1 / 600), '10 min')][1:]:
            yy = Y(d)
            o.append(f'<line x1="{x0 + w - 22}" x2="{x0 + w - 14}" y1="{yy}" y2="{yy}" stroke="{MUTED}"/><text x="{x0 + w - 24}" y="{yy + 3}" class="t" text-anchor="end">{lab}</text>')
        cx = x0 + (w - 30) / 2
        for hz, v in RIDGES:
            yy = Y(math.log10(hz))
            ln = v * ((w - 30) / 2 - 8)
            o.append(f'<rect x="{cx - ln}" y="{yy - 3}" width="{2 * ln}" height="6" rx="3" fill="{TEXT}" opacity=".35"/>')
        for name, hz, kind in RATES:
            yy = Y(math.log10(hz))
            c = TEXT if kind == 'meter' else M1
            o.append(f'<path d="M{x0},{yy - 5} L{x0 + 8},{yy} L{x0},{yy + 5} Z" fill="{c}"/>')
            if opened:
                o.append(f'<text x="{x0 + 12}" y="{yy - 4}" class="m" fill="{c}">{name}</text>')
    return ''.join(o)


def graph_side(x0):
    """The graph beside the strip, sketched: the sockets at their heights (the bass lifted to the audible's floor)."""
    o = [f'<text x="{x0}" y="20" class="h">the graph (tower layout)</text><text x="{x0}" y="34" class="s">the audible stratum is the sky; the inaudible the structure</text>']
    floor = math.log10(65.4)
    xs = [40, 110, 180, 250, 320, 390]
    for (name, f0, k), x in zip(OUTS, xs):
        yy = Y(max(floor, math.log10(f0)))
        c = tint(k, 6)
        o.append(f'<rect x="{x0 + x - 120}" y="{yy - 3}" width="240" height="6" fill="{c}" opacity=".10"/>')
        o.append(f'<line x1="{x0 + x}" x2="{x0 + x}" y1="{Y(math.log10(f0 * 8))}" y2="{yy}" stroke="{c}" stroke-width="2"/>')
        o.append(f'<circle cx="{x0 + x}" cy="{yy}" r="9" fill="{SURF}" stroke="{c}" stroke-width="2"/>')
        o.append(f'<line x1="{x0 + x}" x2="{x0 + 500}" y1="{yy}" y2="{yy}" stroke="{c}" stroke-dasharray="2 4" stroke-opacity=".6"/>')
        o.append(f'<circle cx="{x0 + x}" cy="{Y(1.5)}" r="20" fill="{SURF}" stroke="{FAINT}"/><text x="{x0 + x}" y="{Y(1.5) + 34}" class="t" text-anchor="middle">&amp;{name.split(" ")[0]}</text>')
        o.append(f'<line x1="{x0 + x}" x2="{x0 + x}" y1="{Y(1.5) - 20}" y2="{yy + 9}" stroke="{FAINT}"/>')
    for name, hz, kind in RATES[:5]:
        yy = Y(math.log10(hz))
        o.append(f'<circle cx="{x0 + 60 + RATES.index((name, hz, kind)) * 80}" cy="{yy}" r="13" fill="{SURF}" stroke="{FAINT}"/>')
    o.append(f'<rect x="{x0}" y="{ys["audible"][0]}" width="500" height="{ys["audible"][1] - ys["audible"][0]}" fill="none" stroke="{ACCENT}" stroke-opacity=".3" stroke-dasharray="6 6"/>')
    o.append(f'<text x="{x0 + 6}" y="{ys["audible"][1] - 6}" class="s">sky: from 20 Hz</text>')
    return ''.join(o)


def time_side(x0, w=520):
    o = [f'<text x="{x0}" y="20" class="h">the time view</text><text x="{x0}" y="34" class="s">the same tiers up, time across: waterfall and notes in the audible, the scalogram under it</text>',
         f'<rect x="{x0}" y="{TOP}" width="{w}" height="{H - 80}" fill="#15171d" stroke="{LINE}"/>']
    import random
    random.seed(4)
    for name, f0, k in OUTS:
        for i in range(40):
            t = random.random() * w
            o.append(f'<rect x="{x0 + t:.0f}" y="{Y(math.log10(f0 * 2 ** (random.choice([0, 4, 7, 12]) / 12))) - 2:.1f}" width="{random.randint(8, 30)}" height="4" fill="{tint(k, 6)}" opacity=".85"/>')
    for hz, v in RIDGES:
        yy = Y(math.log10(hz))
        o.append(f'<rect x="{x0}" y="{yy - 6}" width="{w}" height="12" fill="{TEXT}" opacity="{.08 * v}"/>')
    return ''.join(o)


W = 1700
body = (graph_side(20) + strip(530, 180, 'the strip (one component)', 'opened; folded: 64 px, no names', True, True)
        + time_side(760) + strip(1290, 180, 'the same strip, at the time view', 'its own scale, the same tiers', True, True))
print(f'''<!doctype html><meta charset=utf-8><style>body{{margin:0;background:{BG}}} text{{font-family:system-ui,sans-serif}}
.h{{fill:{TEXT};font-weight:700;font-size:14px}} .s{{fill:{MUTED};font-size:11px}} .t{{fill:{MUTED};font-size:9px}}
.m{{fill:{TEXT};font-size:10px;font-weight:700}} .z{{font-size:11px;font-weight:700;text-anchor:middle}}</style>
<svg width="{W}" height="{H:.0f}" viewBox="0 0 {W} {H:.0f}">{body}</svg>''')
