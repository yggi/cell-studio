"""Mock-up: the waltz laid out with y fixed by the tower, sound wires into a tower strip (no &out node)."""
import math, sys

BG, SURF, LINE, TEXT, MUTED, FAINT, ACCENT, EDGE = '#1f222b', '#272b36', '#3b404f', '#f1ece2', '#a4a8b5', '#6a6f7d', '#f4c04e', '#5f6576'
M1, M2 = '#6fd3c4', '#c49af0'

def hsl(h, s, l):
    s /= 100; l /= 100
    c = (1 - abs(2 * l - 1)) * s; x = c * (1 - abs((h / 60) % 2 - 1)); m = l - c / 2
    r, g, b = [(c, x, 0), (x, c, 0), (0, c, x), (0, x, c), (x, 0, c), (c, 0, x)][int(h // 60) % 6]
    return '#%02x%02x%02x' % tuple(round((v + m) * 255) for v in (r, g, b))

def note(f):
    midi = 69 + 12 * math.log2(f / 440)
    pc = round(midi) % 12
    octv = math.floor((round(midi) - 60) / 12)
    o = max(-3, min(3, octv)); mute = 1 if o == 0 else 0.6 - 0.1 * (abs(o) - 1)
    return hsl(pc * 30, 70 * mute, max(18, min(88, 58 + o * 11)))

D0, D1, PX, TOP = -0.6, 4.35, 250, 70
def Y(d): return TOP + (D1 - d) * PX
H = int(Y(D0) + 60)

# sources sounding at the moment drawn (bar 1, beat 1): partials (f, amp, colour)
def tri(f, a):  return [(f * k, a / k ** 2) for k in range(1, 30, 2)]
def sq(f, a, lpf):  return [(f * k, a / k / math.sqrt(1 + (f * k / lpf) ** 4)) for k in range(1, 40, 2)]
SOURCES = {
    'flute': {'f0': 261.63, 'parts': [(f, a, note(494)) for f, a in tri(494, 0.8)], 'pan': 0},
    'tuba': {'f0': 65.41, 'parts': [(98, 0.9, note(98))], 'pan': 0},
    'strings': {'f0': 261.63, 'parts': [(f, a, note(f0)) for f0 in (392, 494, 587) for f, a in sq(f0, 0.25, 1200)], 'pan': 0},
}

def db(a, floor=54): return max(0.0, (20 * math.log10(max(a, 1e-9)) + floor) / floor)

def wheel(x, y, r, name, sub='', ring=EDGE, fill=SURF):
    return (f'<circle cx="{x}" cy="{y}" r="{r}" fill="{fill}" stroke="{ring}" stroke-width="2"/>'
            f'<text x="{x}" y="{y + 4}" class="hub">{sub}</text>'
            f'<rect x="{x - 30}" y="{y + r + 6}" width="60" height="18" rx="4" fill="{BG}" stroke="{ACCENT}"/>'
            f'<text x="{x}" y="{y + r + 19}" class="nm">&amp;{name}</text>')

def table(x, y, name, colours):
    out = [f'<circle cx="{x}" cy="{y}" r="40" fill="{SURF}" stroke="{EDGE}" stroke-width="2"/>']
    n = len(colours)
    for i, c in enumerate(colours):
        a0, a1 = 2 * math.pi * i / n - math.pi / 2, 2 * math.pi * (i + 1) / n - math.pi / 2
        out.append(f'<path d="M{x + 34 * math.cos(a0):.1f},{y + 34 * math.sin(a0):.1f} A34,34 0 0 1 {x + 34 * math.cos(a1):.1f},{y + 34 * math.sin(a1):.1f}" stroke="{c}" stroke-width="10" fill="none"/>')
    out.append(f'<text x="{x}" y="{y + 4}" class="hub">24</text>')
    out.append(f'<rect x="{x - 26}" y="{y + 48}" width="52" height="18" rx="4" fill="{BG}" stroke="{ACCENT}"/><text x="{x}" y="{y + 61}" class="nm">&amp;{name}</text>')
    return ''.join(out)

def voice(x, name, wave, label):
    s = Y(math.log10(SOURCES[name]['f0']))  # its socket (top of its cap) at its base frequency
    cy = s + 34 + 58
    c = note(SOURCES[name]['f0'])
    pts = ' '.join(f'{x - 40 + i * 2},{cy + 4 - 26 * wave(i / 40 * 2 * math.pi)}' for i in range(41))
    return (f'<path d="M{x - 58},{s + 34} L{x - 58},{s + 8} Q{x - 58},{s} {x - 50},{s} L{x + 50},{s} Q{x + 58},{s} {x + 58},{s + 8} L{x + 58},{s + 34}" fill="{SURF}" stroke="{EDGE}" stroke-width="2"/>'
            f'<polyline points="{x - 50},{s + 30} {x - 40},{s + 8} {x - 20},{s + 18} {x + 30},{s + 20} {x + 50},{s + 30}" fill="none" stroke="{ACCENT}" stroke-width="2"/>'
            f'<circle cx="{x}" cy="{cy}" r="58" fill="{SURF}" stroke="{EDGE}" stroke-width="2"/>'
            f'<polyline points="{pts}" fill="none" stroke="{c}" stroke-width="2.5"/>'
            f'<text x="{x}" y="{cy + 40}" class="hub">{label}</text>'
            f'<rect x="{x - 34}" y="{cy + 64}" width="68" height="18" rx="4" fill="{BG}" stroke="{ACCENT}"/><text x="{x}" y="{cy + 77}" class="nm">&amp;{name}</text>'
            f'<circle cx="{x}" cy="{s}" r="4" fill="{c}"/>'), s, cy

def axis_marks(x0, w, labels=True):
    out = []
    zones = [('slow', D0, math.log10(0.5), M2), ('pulse', math.log10(0.5), math.log10(20), M1), ('audible', math.log10(20), math.log10(20000), ACCENT)]
    for name, a, b, c in zones:
        out.append(f'<rect x="{x0 + 2}" y="{Y(b)}" width="4" height="{Y(a) - Y(b)}" fill="{c}" opacity=".8"/>')
        if labels:
            out.append(f'<text transform="translate({x0 - 8} {(Y(a) + Y(b)) / 2}) rotate(-90)" class="zone" fill="{c}">{name}</text>')
    for d in range(-0, 5):
        hz = 10 ** d
        lab = f'{hz // 1000} kHz' if hz >= 1000 else f'{hz} Hz'
        out.append(f'<line x1="{x0 + 2}" x2="{x0 + w - 2}" y1="{Y(d)}" y2="{Y(d)}" stroke="{LINE}"/>')
        if labels: out.append(f'<text x="{x0 + w - 6}" y="{Y(d) - 3}" class="dec">{lab}</text>')
    return ''.join(out)

def spectrum(cx, half, sources, pans=None, sum_=False):
    """Each source's partials as bars mirrored about cx (mono), or L and R apart by its pan."""
    out, tot = [], {}
    for name, s in sources.items():
        p = (pans or {}).get(name, s['pan'])
        gl, gr = math.cos((p + 1) * math.pi / 4) * math.sqrt(2), math.sin((p + 1) * math.pi / 4) * math.sqrt(2)
        for f, a, c in s['parts']:
            if f > 20000: continue
            y = Y(math.log10(f))
            l, r = db(a * gl) * half, db(a * gr) * half
            out.append(f'<line x1="{cx - l:.1f}" x2="{cx + r:.1f}" y1="{y:.1f}" y2="{y:.1f}" stroke="{c}" stroke-width="2.4" stroke-linecap="round" opacity=".95"/>')
            k = round(y / 3)
            tl, tr = tot.get(k, (0, 0))
            tot[k] = (tl + (a * gl) ** 2, tr + (a * gr) ** 2)
    if sum_:
        ks = sorted(tot)
        L = ' '.join(f'{cx - db(math.sqrt(tot[k][0])) * half - 3:.1f},{k * 3}' for k in ks)
        R = ' '.join(f'{cx + db(math.sqrt(tot[k][1])) * half + 3:.1f},{k * 3}' for k in ks)
        out.insert(0, f'<polyline points="{L}" fill="none" stroke="{TEXT}" stroke-width="1" opacity=".35"/><polyline points="{R}" fill="none" stroke="{TEXT}" stroke-width="1" opacity=".35"/>')
    return ''.join(out)

def wire(x0, y0, x1, y1, c, lane=0):
    """Out of the socket straight up a little, then level at the base frequency's height into the strip."""
    y = y0 + lane
    return f'<path d="M{x0},{y0} L{x0},{y0 - 14} Q{x0},{y - 0} {x0 + 14},{y} L{x1},{y1 + lane}" fill="none" stroke="{c}" stroke-width="3" opacity=".9"/>'

def wire2(x0, y0, x1, c, lane=0):
    return f'<path d="M{x0},{y0} C{x0},{y0 - 26} {x0 + 26},{y0 + lane} {x0 + 40},{y0 + lane} L{x1},{y0 + lane}" fill="none" stroke="{c}" stroke-width="3" opacity=".9"/>'

def graph(xs, flip=False):
    """The cells: y fixed by the tower (pulse row at the bar's step, voices with their socket at their base frequency)."""
    yp = Y(0.447)
    out = []
    # the meter's net (ground): bar to what it steps, a straight trace along the row
    xb = xs['bar']
    for k in ('tune', 'oom', 'pah'):
        out.append(f'<line x1="{xb}" y1="{yp}" x2="{xs[k]}" y2="{yp}" stroke="{ACCENT}" stroke-width="7" opacity=".45"/>')
    v = {}
    for name, wave, lab in (('flute', lambda t: (2 / math.pi) * math.asin(math.sin(t)), 'C4'), ('tuba', math.sin, 'C2'), ('strings', lambda t: 1 if math.sin(t) >= 0 else -1, 'C4')):
        v[name] = voice(xs[name], name, wave, lab)
    # melodies up into their voices' gates (a small meter on the voice's lower rim)
    for src, dst in (('tune', 'flute'), ('oom', 'tuba'), ('pah', 'strings')):
        _, s, cy = v[dst]
        gx, gy = xs[dst] - 30, cy + 50
        out.append(f'<path d="M{xs[src]},{yp - 40} C{xs[src]},{yp - 140} {gx},{gy + 120} {gx},{gy + 10}" fill="none" stroke="{EDGE}" stroke-width="2.5"/>')
    tables = ''.join(table(xs[k], yp, k, cs) for k, cs in (
        ('tune', [note(392), note(494), note(587), note(587), note(523), note(494), note(440), note(440)]),
        ('oom', [note(98)] * 3 + [note(73)] * 4 + [note(98)]),
        ('pah', [note(494)] * 3 + [note(440)] * 4 + [note(494)])))
    bar = (f'<circle cx="{xb}" cy="{yp}" r="40" fill="{SURF}" stroke="{ACCENT}" stroke-width="3"/>'
           f'<path d="M{xb},{yp - 34} A34,34 0 0 1 {xb + 29.4},{yp + 17}" stroke="{ACCENT}" stroke-width="10" fill="none"/>'
           f'<text x="{xb}" y="{yp + 4}" class="hub">3/bar</text>'
           f'<rect x="{xb - 26}" y="{yp + 48}" width="52" height="18" rx="4" fill="{BG}" stroke="{ACCENT}"/><text x="{xb}" y="{yp + 61}" class="nm" fill="{ACCENT}">&amp;bar</text>')
    voices = ''
    for name in v:
        g, s, cy = v[name]
        voices += g + f'<rect x="{xs[name] - 38}" y="{cy + 44}" width="16" height="24" rx="3" fill="{BG}" stroke="{EDGE}"/><rect x="{xs[name] - 35}" y="{cy + 52}" width="10" height="13" fill="{note(SOURCES[name]["parts"][0][0])}"/>'
    return ''.join(out) + tables + bar + voices, v

def rowguide(x0, x1, d, label, c=FAINT):
    y = Y(d)
    return f'<line x1="{x0}" x2="{x1}" y1="{y}" y2="{y}" stroke="{c}" stroke-dasharray="2 6" opacity=".6"/><text x="{x0 + 4}" y="{y - 4}" class="guide">{label}</text>'

def panel_a(expanded, title, caption, pans=None):
    GW = 860
    SW = 300 if expanded else 44
    W = GW + SW + 40
    xs = {'strings': 150, 'pah': 150, 'flute': 420, 'tune': 420, 'bar': 600, 'tuba': 740, 'oom': 760}
    g, v = graph(xs)
    sx = GW
    cx = sx + SW / 2
    out = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H + 90}" viewBox="0 0 {W} {H + 90}">',
           f'<rect width="{W}" height="{H + 90}" fill="{BG}"/>',
           f'<text x="20" y="34" class="title">{title}</text>']
    for d, lab in ((0.447, '2.8 Hz · the bar\'s step'), (math.log10(65.41), 'C2 · 65 Hz'), (math.log10(261.63), 'C4 · 262 Hz')):
        out.append(rowguide(10, GW - 10, d, lab))
    # sound wires: from each voice's socket, level at its base frequency, into the strip (no &out)
    for name, lane in (('strings', -4), ('flute', 4), ('tuba', 0)):
        _, s, _ = v[name]
        c = SOURCES[name]['parts'][0][2]
        out.append(wire2(xs[name], s, sx + (8 if expanded else 4), c, lane))
    out.append(g)
    # the strip
    out.append(f'<rect x="{sx}" y="{TOP - 30}" width="{SW}" height="{H - TOP}" rx="8" fill="{SURF}" stroke="{LINE}"/>')
    out.append(axis_marks(sx, SW, labels=expanded))
    out.append(f'<line x1="{cx}" x2="{cx}" y1="{Y(math.log10(20000))}" y2="{Y(math.log10(20))}" stroke="{LINE}"/>')
    half = SW / 2 - (18 if expanded else 4)
    out.append(spectrum(cx, half, SOURCES, pans))
    # the connectors: where a wire meets the strip, a bracket over the source's range
    for name in SOURCES:
        fs = [f for f, a, c in SOURCES[name]['parts'] if db(a) > 0.05 and f < 20000]
        y0, y1 = Y(math.log10(max(fs))), Y(math.log10(SOURCES[name]['f0']))
        c = SOURCES[name]['parts'][0][2]
        out.append(f'<line x1="{sx + 3}" x2="{sx + 3}" y1="{min(y0, y1)}" y2="{max(y0, y1, Y(math.log10(min(fs))))}" stroke="{c}" stroke-width="3" opacity=".8"/>')
    # stepped cells on the strip: a tick at their height
    yp = Y(0.447)
    out.append(f'<line x1="{sx + 6}" x2="{sx + SW - 6}" y1="{yp}" y2="{yp}" stroke="{ACCENT}" stroke-width="3"/>')
    if expanded:
        out.append(f'<text x="{cx}" y="{yp - 6}" class="tick">&amp;bar &amp;tune &amp;oom &amp;pah</text>')
        out.append(f'<text x="{cx}" y="{TOP - 12}" class="cap">L · the room · R</text>')
        for name, dy in (('flute', -8), ('strings', 14), ('tuba', -6)):
            out.append(f'<text x="{sx + SW - 8}" y="{Y(math.log10(SOURCES[name]["f0"])) + dy}" class="sname">{name}</text>')
    out.append(f'<text x="20" y="{H + 40}" class="cap2">{caption}</text>')
    out.append('</svg>')
    return '\n'.join(out), W

def panel_b(title, caption):
    """Two strips: L at the graph's left edge, R at its right; each voice's wire splits at its top."""
    SW, GW = 56, 900
    W = GW + 2 * SW + 20
    off = SW + 10
    xs = {k: v + off - 40 for k, v in {'strings': 210, 'pah': 210, 'flute': 470, 'tune': 470, 'bar': 640, 'tuba': 780, 'oom': 800}.items()}
    g, v = graph(xs)
    out = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H + 90}" viewBox="0 0 {W} {H + 90}">',
           f'<rect width="{W}" height="{H + 90}" fill="{BG}"/>', f'<text x="20" y="34" class="title">{title}</text>']
    xl, xr = 10, W - SW - 10
    for name, lane in (('strings', -4), ('flute', 4), ('tuba', 0)):
        _, s, _ = v[name]
        c = SOURCES[name]['parts'][0][2]
        x = xs[name]
        out.append(f'<path d="M{x},{s} C{x},{s - 30} {x - 30},{s + lane} {x - 44},{s + lane} L{xl + SW},{s + lane}" fill="none" stroke="{c}" stroke-width="3" opacity=".85"/>')
        out.append(f'<path d="M{x},{s} C{x},{s - 30} {x + 30},{s + lane} {x + 44},{s + lane} L{xr},{s + lane}" fill="none" stroke="{c}" stroke-width="3" opacity=".85"/>')
    out.append(g)
    for x0, side in ((xl, 'L'), (xr, 'R')):
        out.append(f'<rect x="{x0}" y="{TOP - 30}" width="{SW}" height="{H - TOP}" rx="8" fill="{SURF}" stroke="{LINE}"/>')
        out.append(axis_marks(x0, SW, labels=False))
        out.append(f'<text x="{x0 + SW / 2}" y="{TOP - 12}" class="cap">{side}</text>')
        # each channel's spectrum grows from the strip's inner edge toward the graph
        for name, s in SOURCES.items():
            for f, a, c in s['parts']:
                if f > 20000: continue
                y = Y(math.log10(f)); L = db(a * 1) * (SW - 12)
                if side == 'L': out.append(f'<line x1="{x0 + SW - 4}" x2="{x0 + SW - 4 - L:.1f}" y1="{y:.1f}" y2="{y:.1f}" stroke="{c}" stroke-width="2.4" stroke-linecap="round"/>')
                else: out.append(f'<line x1="{x0 + 4}" x2="{x0 + 4 + L:.1f}" y1="{y:.1f}" y2="{y:.1f}" stroke="{c}" stroke-width="2.4" stroke-linecap="round"/>')
    out.append(f'<text x="20" y="{H + 40}" class="cap2">{caption}</text>')
    out.append('</svg>')
    return '\n'.join(out), W

CSS = f'''<style>body{{margin:0;background:{BG};display:flex;gap:0;font-family:Inter,system-ui,sans-serif}}
text{{font-family:Inter,system-ui,sans-serif}} .hub{{fill:{MUTED};font-size:12px;text-anchor:middle}}
.nm{{fill:{TEXT};font-size:11px;font-weight:700;text-anchor:middle;font-family:ui-monospace,monospace}}
.title{{fill:{TEXT};font-size:22px;font-weight:700}} .cap2{{fill:{MUTED};font-size:15px}}
.zone{{font-size:11px;font-weight:700;text-anchor:middle}} .dec{{fill:{MUTED};font-size:10px;text-anchor:end}}
.cap{{fill:{MUTED};font-size:11px;font-weight:700;text-anchor:middle}} .tick{{fill:{ACCENT};font-size:10px;text-anchor:middle}}
.guide{{fill:{FAINT};font-size:11px}} .sname{{fill:{TEXT};font-size:11px;text-anchor:end;font-weight:700}}</style>'''

if __name__ == '__main__':
    a1, _ = panel_a(False, 'A1 · one strip, folded (always there)', 'No &amp;mix/&amp;out node: each voice\'s sound leaves its top, level at its base pitch, into the strip.')
    a2, _ = panel_a(True, 'A2 · one strip, opened', 'The strip is the sound card: each source\'s partials at their pitch, L left of the centre, R right; mono symmetric.')
    a3, _ = panel_a(True, 'A3 · opened, stereo (if &amp;strings had pan=-.6)', 'Stereo: the strings\' partials lean left; the white outline is the whole room\'s spectrum, per channel.', pans={'strings': -0.6})
    b, _ = panel_b('B · two strips: the graph between the speakers', 'L strip at the left edge, R at the right; each wire splits at its voice\'s top, one strand to each.')
    which = sys.argv[1] if len(sys.argv) > 1 else 'all'
    panels = {'a1': [a1], 'a2': [a2], 'a3': [a3], 'b': [b], 'all': [a1, a2, b]}[which]
    print(f'<!doctype html><html><head><meta charset="utf-8">{CSS}</head><body>' + ''.join(panels) + '</body></html>')
