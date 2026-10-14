"""Mock-up (docs/notes/tower-sky.md, the markers): the strip's markers for the outs, each open question's options side
by side, on Hypercell's outs (four sockets on one row; the bass part lifted to the audible's floor; the drums' kit).
  python3 tools/mockups/tower-markers.py > /tmp/markers.html   (screenshot the svg in Chromium)
"""
import math

BG, SURF, LINE, TEXT, MUTED, ACCENT, UNIT = '#1f222b', '#272b36', '#3b404f', '#f1ece2', '#a4a8b5', '#f4c04e', '#d4d7e0'


def hsl(h, s, l):
    s /= 100; l /= 100
    c = (1 - abs(2 * l - 1)) * s; x = c * (1 - abs((h / 60) % 2 - 1)); m = l - c / 2
    r, g, b = [(c, x, 0), (x, c, 0), (0, c, x), (0, x, c), (x, 0, c), (c, 0, x)][int(h // 60) % 6]
    return '#%02x%02x%02x' % tuple(round((v + m) * 255) for v in (r, g, b))


def note(f):  # noteHsl by octave: full in the fourth, darker below, brighter above
    midi = round(69 + 12 * math.log2(f / 440))
    o = max(-3, min(3, midi // 12 - 5))
    mute = 1 if o == 0 else 0.6 - 0.1 * (abs(o) - 1)
    return hsl((midi % 12) * 30, 70 * mute, max(18, min(88, 58 + o * 11)))


PX = 150  # px a decade in the panels
TOP_D = math.log10(4000)


def Y(y0, f):
    return y0 + (TOP_D - math.log10(f)) * PX


FLOOR = 300  # the audible's floor in Hz (the sockets' lowest row, here)
# the outs: name, its socket's height (Hz on the scale), its fundamental, its colour, its level now
OUTS = [
    ('bassPart', FLOOR, 65.4, note(65.4), .9),
    ('stab', FLOOR, 261.6, note(261.6), .6),
    ('drums', FLOOR, None, UNIT, .8),
    ('hookPart', FLOOR, 523.3, note(523.3), .7),
    ('padPart', 1000, 261.6, note(261.6), .3),
    ('riser', 1400, 261.6, note(261.6), 0),
]


def panel(x0, y0, title, sub, opt):
    w, h = 250, 330
    o = [f'<text x="{x0}" y="{y0 - 22}" class="h">{title}</text><text x="{x0}" y="{y0 - 8}" class="s">{sub}</text>']
    # the graph's edge, sockets at their heights
    o.append(f'<rect x="{x0}" y="{y0}" width="70" height="{h}" fill="{BG}"/>')
    o.append(f'<rect x="{x0 + 70}" y="{y0}" width="{w - 70}" height="{h}" fill="{SURF}" stroke="{LINE}"/>')
    sx = x0 + 70
    for b in range(36, 96):
        f = 16.35 * 2 ** (b / 12)
        y = Y(y0, f)
        if y0 < y < y0 + h:
            o.append(f'<rect x="{sx}" y="{y - 1.7:.1f}" width="{w - 70}" height="3.4" fill="{note(f)}" opacity=".16"/>')
    for d, lab in [(2, '100 Hz'), (3, '1 kHz')]:
        y = Y(y0, 10 ** d)
        o.append(f'<line x1="{sx + w - 90}" x2="{sx + w - 70}" y1="{y}" y2="{y}" stroke="{MUTED}"/><text x="{sx + w - 72}" y="{y - 3}" class="t" text-anchor="end">{lab}</text>')
    rows = {}
    for out in OUTS:
        rows.setdefault(out[1], []).append(out)
    for k, (hz, outs) in enumerate(sorted(rows.items())):
        y = Y(y0, hz)
        # the sockets, at the graph's right edge
        for i, (nm, _, f0, c, lv) in enumerate(outs):
            cx = x0 + 14 + i * 14
            o.append(f'<circle cx="{cx}" cy="{y}" r="6" fill="{SURF}" stroke="{c}" stroke-width="2"/>')
        # the marker
        if opt.get('each'):
            for i, (nm, _, f0, c, lv) in enumerate(outs):
                ln = 6 + (10 * lv if opt.get('live') else 4)
                o.append(f'<path d="M{sx},{y - 5 + i * 0} L{sx + ln},{y} L{sx},{y + 5} Z" transform="translate({0} {(i - (len(outs) - 1) / 2) * 11})" fill="{c}" opacity="{.35 + .65 * lv if opt.get("live") else 1}"/>')
                name = 'kit:voices' if nm == 'drums' and not opt.get('drums') else nm
                o.append(f'<text x="{sx + 20}" y="{y + 3 + (i - (len(outs) - 1) / 2) * 11}" class="m" fill="{c}">{name}</text>')
        else:
            c = outs[0][3]
            o.append(f'<path d="M{sx},{y - 6} L{sx + 9},{y} L{sx},{y + 6} Z" fill="{c}"/>')
            names = ' · '.join('kit:voices' if n == 'drums' and not opt.get('drums') else n for n, *_ in outs)
            o.append(f'<text x="{sx + 14}" y="{y - 4}" class="m">{names}</text>')
        for i, (nm, _, f0, c, lv) in enumerate(outs):
            # the range: a line a source over its partials (today), at the inner edge
            if opt.get('range') and f0:
                o.append(f'<rect x="{sx + 2 + i * 4}" y="{Y(y0, f0 * 6)}" width="2.5" height="{Y(y0, f0) - Y(y0, f0 * 6)}" fill="{c}" opacity=".8"/>')
            # a lifted socket: a leader down from its marker to its fundamental
            if opt.get('leader') and f0 and f0 < hz * 0.94:
                yy = Y(y0, f0)
                dy = (i - (len(outs) - 1) / 2) * 11 if opt.get('each') else 0
                o.append(f'<path d="M{sx + 4},{y + dy} C{sx + 30},{y + dy} {sx + 6},{yy} {sx + 32},{yy}" fill="none" stroke="{c}" stroke-dasharray="2 2"/>')
                o.append(f'<circle cx="{sx + 34}" cy="{yy}" r="3" fill="{c}"/><text x="{sx + 40}" y="{yy + 3}" class="t" fill="{c}">C{round(69 + 12 * math.log2(f0 / 440)) // 12 - 1}</text>')
    return ''.join(o)


QUESTIONS = [
    ('1. outs on one row', [('one notch, the names joined (now)', {'range': True}), ('a notch each, names stacked', {'each': True, 'drums': True})]),
    ('2. the drums', [("the kit's own name (now)", {'each': True}), ('drums, white', {'each': True, 'drums': True})]),
    ('3. a lifted socket', [('at its socket only (now)', {'each': True, 'drums': True}), ('a leader to its fundamental', {'each': True, 'drums': True, 'leader': True})]),
    ('4. the range lines', [('a line over its partials (now)', {'each': True, 'drums': True, 'range': True}), ('dropped', {'each': True, 'drums': True})]),
    ('5. live', [('a notch at rest (now)', {'each': True, 'drums': True}), ('the notch as long and bright as it is loud', {'each': True, 'drums': True, 'live': True})]),
]
body = []
x = 20
for q, opts in QUESTIONS:
    body.append(f'<text x="{x}" y="22" class="q">{q}</text>')
    for k, (sub, opt) in enumerate(opts):
        body.append(panel(x, 70 + k * 400, 'ABCDEFGH'[k], sub, opt))
    x += 280
W, H = x, 70 + 2 * 400 - 30
print(f'''<!doctype html><meta charset=utf-8><style>body{{margin:0;background:{BG}}} text{{font-family:system-ui,sans-serif}}
.q{{fill:{ACCENT};font-weight:700;font-size:15px}} .h{{fill:{TEXT};font-weight:700;font-size:13px}} .s{{fill:{MUTED};font-size:11px}}
.t{{fill:{MUTED};font-size:9px}} .m{{fill:{TEXT};font-size:10px;font-weight:700}}</style>
<svg width="{W}" height="{H}" viewBox="0 0 {W} {H}">{''.join(body)}</svg>''')
