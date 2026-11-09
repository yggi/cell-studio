<script lang="ts">
  /**
   * Fragments in Cell studio, the epic's central aspects as mock-ups before anything is built: the library's new cell,
   * the fragment map (any two style axes), a document of several fragments, a fragment heard alone by its facet, the
   * code view's references, and a selection turned into a fragment. `node tools/gallery.mjs fragments`. Not the app's
   * drawing: every name, text, point and reference is read from `@yggi/cells` at the pin (`data.ts`), the layout is
   * d3-force as the library's, the rest drawn by hand in the app's theme.
   */
  import { AXIS_LIST, BY_ID, DEFAULTS, FACETS, FRAGS, PIECES, TAKEN, facetColour, mapLayout, stepsOf, type MapLayout } from './data';
  import { EXAMPLES } from '@yggi/cells/engine/examples';
  import { readFrom } from '@yggi/cells/engine/parser/use';
  import { splitComment } from '@yggi/cells/engine/edit';

  const W = 860;
  const H = 640;
  const AX = AXIS_LIST.map((a) => a.name);
  const PAIRS: readonly [string, string][] = [
    [AX[0]!, AX[1]!],
    [AX[2]!, AX[3]!],
  ];
  const maps: [string, string, MapLayout][] = PAIRS.map(([x, y]) => [x, y, mapLayout(x, y, W, H)]);
  const axis = (n: string) => AXIS_LIST.find((a) => a.name === n)!;
  const title = (key: string) => PIECES.find((p) => p.key === key)?.title.split(':')[0] ?? key;
  const LABELLED = new Set(['kinderlied', 'electroswing', 'spooky', 'patchbay', 'arrangement', 'radio', 'acid', 'sailor']);

  // ── the document: Kinderlieder written as a document of fragments (the owner's idea, point 3) ──
  const MOTIFS = ['twinkle', 'wonder', 'haenschen', 'hinein', 'heim', 'weinet'];
  const motifText = (id: string) => BY_ID.get(id)!.text.trim();
  const DOC = [
    '# Kinderlieder: the tunes, each a fragment this file gives',
    ...MOTIFS.flatMap((m) => [...motifText(m).split('\n'), '']),
    '# the piece: what the file plays when it is opened',
    '&bar from meter &tempo',
    '&tempo step=free(100bpm, 80..120)',
    '&key from diatonic(mode=ionian) C',
    '&twinkleSong from ternary(answer=&wonder) &twinkle',
    '&haenschenSong from rounded_binary(answer=&hinein, close=&heim, bridge=&weinet) &haenschen',
    '&leadline step=8n ~@16 &twinkleSong &haenschenSong',
    '…',
  ];
  const lineKind = (l: string) => (/^&\w+ from &\w+$/.test(l) ? 'sig' : l.startsWith('#') ? 'comment' : /\bfrom\b/.test(l) ? 'from' : 'code');

  /** A mini roll of a line of degrees: x by step, y by degree. */
  function roll(line: string, w: number, h: number) {
    const steps = stepsOf(line);
    const total = steps.reduce((s, x) => s + x.len, 0) || 1;
    const vs = steps.flatMap((s) => (s.v === null ? [] : [s.v]));
    const lo = Math.min(...vs, 0);
    const hi = Math.max(...vs, 4);
    let t = 0;
    return steps.flatMap((s) => {
      const x = (t / total) * w;
      t += s.len;
      return s.v === null ? [] : [{ x, y: h - 6 - ((s.v - lo) / (hi - lo || 1)) * (h - 12), w: (s.len / total) * w - 2 }];
    });
  }
  const bodyLine = (id: string) =>
    motifText(id)
      .split('\n')
      .find((l) => !/^&\w+ from /.test(l)) ?? '';

  // ── heard alone: one card a facet, a real fragment each ──
  const techno = BY_ID.get('techno_drums')!
    .text.split('\n')
    .filter((l) => /step=16n/.test(l));
  const vamp = [
    [0, 2, 4],
    [4, 6, 8],
  ];

  // ── the code view: Electroswing's text with its references ──
  const ES = EXAMPLES.electroswing.source
    .split('\n')
    .filter((l) => l.trim() && !l.trim().startsWith('#'))
    .slice(0, 16)
    .map((l) => (l.length > 104 ? l.slice(0, 102) + ' …' : l));
  const splitFrom = (l: string) => {
    if (readFrom(splitComment(l)[0].trim())?.kind !== 'use') return null;
    const m = /^(.*\bfrom\s+)([a-z_][a-z0-9_]*)(.*)$/.exec(l);
    return m ? { pre: m[1]!, id: m[2]!, post: m[3]! } : null;
  };
  const HOVER_ID = 'drums_performer';

  // ── selection to fragment: Kinderlieder's vamp and bass ──
  const BEFORE = [
    '&key from diatonic(mode=ionian) C',
    '&harm over=&key step=1m cycle=8 [0,2,4]!4 [4,6,8]!4',
    '&bassline over=&harm step=2n 0 0',
    '&bass, &bassOut from bass_performer &bassline',
  ];
  const SELECTED = new Set([1, 2]);
  const FRAGMENT = ['&bassline from &key', '&harm over=&key step=1m cycle=8 [0,2,4]!4 [4,6,8]!4', '&bassline over=&harm step=2n 0 0'];
  const AFTER = ['&key from diatonic(mode=ionian) C', '&bassline from my_vamp_bass &key', '&bass, &bassOut from bass_performer &bassline'];
</script>

<main>
  <h1>Fragments in Cell studio — mock-ups</h1>
  <p class="legend">
    Read from <code>@yggi/cells</code> at the pin: {FRAGS.length} seed files in {FACETS.length} facets, {PIECES.length} examples,
    {PIECES.reduce((s, p) => s + p.takes.length, 0)} references. Style axes as cells has them: {AX.join(' · ')}.
  </p>

  <!-- 1 · the library: one more cell beside the wheel -->
  <figure data-kind="library">
    <figcaption>
      <b>1 · The library</b> — the fragments as one more cell beside the wheel, as the tutorial and the MIDI collections are. Its discs are the facets; a person's own fragments are its
      inner ring. A tap opens the map (2).
    </figcaption>
    <svg width="1760" height="600" viewBox="0 0 1760 600">
      <!-- MIDI collections, stacked left -->
      {#each [0, 1, 2] as i (i)}
        <circle cx="130" cy={150 + i * 130} r="52" class="side" />
        <text x="130" y={150 + i * 130 + 4} class="lab mid">{['Bach', 'Chopin', 'Joplin'][i]}</text>
      {/each}
      <!-- the wheel -->
      <circle cx="560" cy="280" r="250" class="wheel" />
      {#each Array.from({ length: 70 }, (_, i) => i) as i (i)}
        {@const a = i * 2.39996}
        {@const rr = 225 * Math.sqrt((i + 0.5) / 70)}
        <circle cx={560 + rr * Math.cos(a)} cy={280 + rr * Math.sin(a)} r="9" class="pieceDot" />
      {/each}
      {#each ['classical', 'jazz', 'electronic', 'experimental', 'world'] as g, i (g)}
        {@const a = -Math.PI / 2 + (i / 5) * 2 * Math.PI}
        <text x={560 + 272 * Math.cos(a)} y={280 + 272 * Math.sin(a)} class="lab mid faint">{g}</text>
      {/each}
      <!-- tutorial -->
      <circle cx="960" cy="150" r="95" class="side" />
      {#each Array.from({ length: 20 }, (_, i) => i) as i (i)}
        <circle cx={900 + (i % 5) * 30} cy={95 + Math.floor(i / 5) * 30} r="9" class="pieceDot" />
      {/each}
      <text x="960" y="265" class="lab mid">Tutorial</text>
      <!-- the new cell: fragments -->
      <g transform="translate(1450 360)">
        <circle r="190" class="side new" />
        <circle r="46" class="mine" />
        <text y="4" class="lab mid">Mine · 3</text>
        {#each FACETS as facet, i (facet)}
          {@const n = FRAGS.filter((f) => f.facet === facet).length}
          {@const a = -Math.PI / 2 + (i / FACETS.length) * 2 * Math.PI}
          {@const rr = 8 + 4 * Math.sqrt(n)}
          <circle cx={128 * Math.cos(a)} cy={128 * Math.sin(a)} r={rr} fill={facetColour(facet)} opacity="0.85" />
          <text x={128 * Math.cos(a)} y={128 * Math.sin(a) + rr + 12} class="lab mid small">{facet} {n}</text>
        {/each}
        <text y="-205" class="lab mid">Fragments · {FRAGS.length}</text>
      </g>
      <path d="M 812 320 C 1000 380 1150 380 1255 370" class="hint" />
      <text x="900" y="400" class="lab faint">pieces ↔ the fragments they take</text>
    </svg>
  </figure>

  <!-- 2 · the map -->
  <figure data-kind="map">
    <figcaption>
      <b>2 · The fragment map</b> — fragments are nodes (their facet's colour, larger the more pieces take them), pieces are leaves (white, a line to each fragment they take).
      Placed on <i>any two style axes</i>, chosen above each map; the same forces as the library's wheel. A fragment found at several style points shows them as dots, and its reach
      as a dashed ring around their mean. The <b>defaults</b> (taken by ≥ 10 % of pieces) aren't nodes: they would pull every piece to one place, so they sit in the band above as badges.
    </figcaption>
    <div class="facets">
      {#each FACETS as facet (facet)}
        <span class="chip" style:--c={facetColour(facet)}>{facet} {FRAGS.filter((f) => f.facet === facet).length}</span>
      {/each}
    </div>
    <div class="row">
      {#each maps as [xa, ya, m] (xa + ya)}
        <div class="mapbox">
          <div class="pickers">
            <span class="pick">x <b>{axis(xa).label}</b> ▾</span>
            <span class="pick">y <b>{axis(ya).label}</b> ▾</span>
            <span class="defaults">
              defaults:
              {#each DEFAULTS as d (d)}<span class="badge" style:--c={facetColour(BY_ID.get(d)!.facet)}>{d} · {TAKEN.get(d)}</span>{/each}
              <span class="badge client">band · each client's own</span>
            </span>
          </div>
          <svg width={W} height={H} class="map">
            <text x="40" y={H - 10} class="lab faint">{axis(xa).ends[0]}</text>
            <text x={W - 40} y={H - 10} class="lab faint end">{axis(xa).ends[1]} →</text>
            <text x="12" y={H - 40} class="lab faint" transform={`rotate(-90 12 ${H - 40})`}>{axis(ya).ends[0]}</text>
            <text x="12" y="40" class="lab faint end" transform="rotate(-90 12 40)">{axis(ya).ends[1]} →</text>
            {#each m.nodes.filter((k) => k.kind === 'frag' && BY_ID.get(k.id)!.points.length > 1) as n (n.id)}
              {@const ss = m.satellites.filter((s) => s.id === n.id)}
              {@const reach = Math.sqrt(ss.reduce((a, s) => a + (s.x - n.x) ** 2 + (s.y - n.y) ** 2, 0) / ss.length)}
              <circle cx={n.x} cy={n.y} r={reach} class="reach" stroke={facetColour(BY_ID.get(n.id)!.facet)} />
            {/each}
            {#each m.satellites as s, i (i)}
              <circle cx={s.x} cy={s.y} r="2" fill={facetColour(BY_ID.get(s.id)!.facet)} opacity="0.5" />
            {/each}
            {#each m.links as l, i (i)}
              {@const p = m.nodes.find((k) => k.id === l.piece)!}
              {@const f = m.nodes.find((k) => k.id === l.frag)!}
              <line x1={p.x} y1={p.y} x2={f.x} y2={f.y} class="link" />
            {/each}
            {#each m.nodes as n (n.kind + n.id)}
              {#if n.kind === 'frag'}
                <circle cx={n.x} cy={n.y} r={n.r} fill={facetColour(BY_ID.get(n.id)!.facet)} class:unused={!TAKEN.get(n.id)} />
                {#if TAKEN.get(n.id) || n.r > 6}<text x={n.x + n.r + 3} y={n.y + 4} class="lab small">{n.id}</text>{/if}
              {:else}
                <rect x={n.x - 4} y={n.y - 4} width="8" height="8" rx="2" class="leaf" />
                {#if LABELLED.has(n.id)}<text x={n.x + 7} y={n.y - 6} class="lab small piece">{title(n.id)}</text>{/if}
              {/if}
            {/each}
          </svg>
          <div class="shelf">
            <b>{m.shelf.length} pieces take only defaults</b> — no style to place them by until each example names one (yggi/cells#543):
            {m.shelf.slice(0, 14).map(title).join(' · ')} …
          </div>
        </div>
      {/each}
    </div>
  </figure>

  <!-- 3 · a document of fragments -->
  <figure data-kind="document">
    <figcaption>
      <b>3 · A document of fragments</b> — Kinderlieder written as one file: each tune a fragment it gives (its signature line, <code>&amp;twinkle from &amp;key</code>), then the
      piece built from them. Opened, it plays the piece; another piece takes a part by its head, <code>&amp;twinkle from kinderlied &amp;key</code>. Proposed spelling, a language
      decision (cells, 082).
    </figcaption>
    <div class="appbar">
      <span class="crumbs">◂ Electroswing <span class="faint">›</span> <b>Kinderlieder</b> <span class="faint">› twinkle</span></span>
      <span class="tabs"><span>select</span><span>graph</span><span class="on">code</span><span>time</span><span class="on2">parts 6</span></span>
    </div>
    <div class="row">
      <pre class="code">{#each DOC as l, i (i)}<span class="l"></span><span class="ln">{String(i + 1).padStart(2)}</span><span class={lineKind(l)}>{l}</span>{/each}</pre>
      <div class="parts">
        <div class="ph">The parts this file gives <span class="faint">· each a fragment, heard alone or taken</span></div>
        {#each MOTIFS as m (m)}
          <div class="part">
            <div class="pt"><b>&amp;{m}</b> <span class="chip" style:--c={facetColour('motif')}>motif</span> <span class="sig">&amp;{m} from &amp;key</span></div>
            <svg width="300" height="54" class="minroll">
              {#each roll(bodyLine(m), 300, 54) as n, i (i)}<rect x={n.x} y={n.y} width={Math.max(2, n.w)} height="6" rx="2" fill={facetColour('motif')} />{/each}
            </svg>
            <div class="pf">
              <span class="play">▶</span> in C major <span class="faint">(the file's own &amp;key)</span>
              <span class="faint">· take it:</span> <code>&amp;{m} from kinderlied &amp;key</code>
            </div>
          </div>
        {/each}
        <div class="part whole"><span class="play">▶</span> <b>the piece</b> <span class="faint">· the file opened as it is: 16 bars, Twinkle then Hänschen klein</span></div>
      </div>
    </div>
  </figure>

  <!-- 4 · heard alone -->
  <figure data-kind="preview">
    <figcaption>
      <b>4 · A fragment heard alone</b> — cells' audition host (lifted out of <code>coreFragment</code>, #590) gives every fragment what it lacks; the view shows the fragment by
      its facet, and what the host stood in for as dashed chips, each changeable. What a fragment reads of the style (<code>&amp;style[…]</code>) becomes sliders.
    </figcaption>
    <div class="cards">
      <div class="card">
        <div class="ct"><b>techno_drums</b> <span class="chip" style:--c={facetColour('rhythm')}>rhythm</span></div>
        <svg width="320" height="96">
          {#each techno as l, r (r)}
            {@const s = stepsOf(l)}
            <text x="0" y={r * 22 + 15} class="lab small">{l.split(' ')[0]}</text>
            {#each s as c, i (i)}
              <rect x={70 + i * 15} y={r * 22 + 3} width="12" height="16" rx="2" class="step" style:opacity={c.v === null ? 0.12 : 0.3 + 0.7 * c.v} fill={facetColour('rhythm')} />
            {/each}
          {/each}
        </svg>
        <div class="host"><span class="stand">sounds: gm_kit</span><span class="stand">4/4 · 120 bpm</span><span class="play">▶ loop</span></div>
      </div>
      <div class="card">
        <div class="ct"><b>twinkle</b> <span class="chip" style:--c={facetColour('motif')}>motif</span></div>
        <svg width="320" height="96">
          {#each roll(bodyLine('twinkle'), 320, 90) as n, i (i)}<rect x={n.x} y={n.y} width={Math.max(2, n.w)} height="8" rx="2" fill={facetColour('motif')} />{/each}
        </svg>
        <div class="host"><span class="stand">&amp;key: C major ▾</span><span class="stand">voice: sine</span><span class="play">▶</span></div>
      </div>
      <div class="card">
        <div class="ct"><b>vamp_to_the_fifth</b> <span class="chip" style:--c={facetColour('harmony')}>harmony</span></div>
        <svg width="320" height="96">
          {#each vamp as ch, i (i)}
            {#each ch as d (d)}<rect x={8 + i * 156} y={84 - d * 9} width="148" height="7" rx="2" fill={facetColour('harmony')} />{/each}
            <text x={8 + i * 156} y="94" class="lab small">{['I ×4', 'V ×4'][i]}</text>
          {/each}
        </svg>
        <div class="host"><span class="stand">&amp;key: C major ▾</span><span class="stand">voice: pad</span><span class="play">▶</span></div>
      </div>
      <div class="card">
        <div class="ct"><b>ternary</b> <span class="chip" style:--c={facetColour('form')}>form</span> <span class="sig">{BY_ID.get('ternary')!.signature}</span></div>
        <svg width="320" height="96">
          {#each ['call', 'answer', 'bridge', 'bridge', 'call', 'answer'] as s, i (i)}
            <rect x={4 + i * 52} y="24" width="48" height="40" rx="6" fill={facetColour('form')} opacity={s === 'call' ? 1 : s === 'answer' ? 0.7 : 0.45} />
            <text x={28 + i * 52} y="49" class="lab mid ink">{s === 'call' ? 'A' : s === 'answer' ? 'A′' : 'B'}</text>
          {/each}
          <text x="4" y="86" class="lab small faint">answer = call a third down · bridge = answer a step up</text>
        </svg>
        <div class="host"><span class="stand">&amp;call: twinkle ▾</span><span class="stand">&amp;key: C major</span><span class="play">▶</span></div>
      </div>
      <div class="card">
        <div class="ct"><b>lead</b> <span class="chip" style:--c={facetColour('instrument')}>instrument</span></div>
        <svg width="320" height="96">
          {#each Array.from({ length: 14 }, (_, i) => i) as k (k)}<rect x={4 + k * 22} y="4" width="20" height="54" rx="2" class="key" />{/each}
          {#each [1, 2, 4, 5, 6, 8, 9, 11, 12] as k (k)}<rect x={18 + (k - 1) * 22} y="4" width="12" height="32" rx="2" class="bkey" />{/each}
          {#each ['artic', 'energy'] as a, i (a)}
            <text x="4" y={76 + i * 16} class="lab small">&amp;style[{a}]</text>
            <line x1="100" x2="300" y1={72 + i * 16} y2={72 + i * 16} class="slider" />
            <circle cx={150 + i * 70} cy={72 + i * 16} r="5" fill={facetColour('instrument')} />
          {/each}
        </svg>
        <div class="host"><span class="stand">played on the keys</span><span class="stand">&amp;style: the open piece's</span></div>
      </div>
      <div class="card">
        <div class="ct"><b>lowpass</b> <span class="chip" style:--c={facetColour('module')}>module</span> <span class="sig">{BY_ID.get('lowpass')!.signature}</span></div>
        <svg width="320" height="96">
          {#each [['cutoff', 0.5], ['res', 0.3], ['eg', 1]] as [k, v], i (k)}
            <circle cx={50 + i * 100} cy="40" r="26" class="knob" />
            <line
              x1={50 + i * 100}
              y1="40"
              x2={50 + i * 100 + 22 * Math.cos(Math.PI * (0.75 + 1.5 * Number(v)))}
              y2={40 + 22 * Math.sin(Math.PI * (0.75 + 1.5 * Number(v)))}
              stroke={facetColour('module')}
              stroke-width="3"
            />
            <text x={50 + i * 100} y="86" class="lab mid small">&amp;{k} · default</text>
          {/each}
        </svg>
        <div class="host"><span class="stand">&amp;in: a saw on C2–C3</span><span class="play">▶</span></div>
      </div>
      <div class="card">
        <div class="ct"><b>meter</b> <span class="chip" style:--c={facetColour('meter')}>meter</span> <span class="sig">{BY_ID.get('meter')!.signature}</span></div>
        <svg width="320" height="96">
          {#each Array.from({ length: 16 }, (_, i) => i) as i (i)}
            <line x1={10 + i * 19} x2={10 + i * 19} y1={i % 4 ? 70 : i % 8 ? 50 : 30} y2="80" stroke="var(--meter-1)" stroke-width={i % 4 ? 1.5 : 3} />
          {/each}
          <text x="10" y="18" class="lab small">13 groupings · satellites on the map</text>
        </svg>
        <div class="host"><span class="stand">&amp;tempo: 120 bpm</span><span class="stand">&amp;swing: straight ▾</span><span class="play">▶ click</span></div>
      </div>
      <div class="card">
        <div class="ct"><b>band</b> <span class="chip" style:--c={facetColour('band')}>band</span></div>
        <svg width="320" height="96">
          {#each ['drums', 'bass', 'pad', 'stab', 'lead'] as r, i (r)}
            <rect x="4" y={i * 18 + 4} width="54" height="14" rx="3" class="role" />
            <text x="31" y={i * 18 + 15} class="lab mid small">{r}</text>
            <line x1="62" x2="300" y1={i * 18 + 11} y2={i * 18 + 11} class="slider" />
          {/each}
        </svg>
        <div class="host"><span class="stand">score: a stand-in of every part</span><span class="stand">each client's own</span></div>
      </div>
    </div>
  </figure>

  <!-- 5 · the code view -->
  <figure data-kind="code">
    <figcaption>
      <b>5 · References in the code view</b> — each <code>from</code> id is a link (⌘/Ctrl-click opens the fragment as in 3, ◂ back); its gutter dot is its facet. Hovering an id
      shows the fragment; hovering a name a fragment gives says which line gave it. Completion after <code>from</code> (#587) reads the same references.
    </figcaption>
    <div class="row">
      <pre class="code wide">{#each ES as l, i (i)}{@const f = splitFrom(l)}<span class="l"></span><span class="ln">{String(i + 1).padStart(2)}</span><span
            class="dot"
            style:color={f && BY_ID.get(f.id) ? facetColour(BY_ID.get(f.id)!.facet) : 'transparent'}>●</span
          >{#if f}<span class="code">{f.pre}</span><span class="link" class:hov={f.id === HOVER_ID}>{f.id}</span><span class="code">{f.post}</span>{:else}<span class="code"
              >{l}</span
            >{/if}{/each}</pre>
      <div class="pop">
        <div class="pt"><b>{HOVER_ID}</b> <span class="chip" style:--c={facetColour('performer')}>performer</span></div>
        <div class="sig">{BY_ID.get(HOVER_ID)!.signature}</div>
        <p>{BY_ID.get(HOVER_ID)!.prose.split('\n')[0]!.slice(0, 220)}…</p>
        <div class="faint">gives here: &amp;drums, &amp;drumsOut · takes: {BY_ID.get(HOVER_ID)!.takes.join(', ') || 'nothing'} · taken by {TAKEN.get(HOVER_ID)} pieces</div>
        <div class="host"><span class="play">▶ hear it alone</span><span class="stand">⌘-click: open</span></div>
      </div>
      <div class="pop small">
        <div class="pt"><b>&amp;hh</b> <span class="faint">is given, not written here</span></div>
        <div>from <span class="link">gm_kit</span>, line 8: <code>&amp;hh s=white hpf=8000 …</code></div>
        <div class="faint">through <span class="link">drums_performer</span>, which takes it, through line 1 · editing it writes its line into the piece</div>
      </div>
    </div>
  </figure>

  <!-- 6 · selection to fragment -->
  <figure data-kind="extract">
    <figcaption>
      <b>6 · Turn a selection into a fragment</b> — cells' <code>extract</code> proposes the signature (heads: what the rest reads; main: the one hole; the rest private), checks
      that the piece plays the same (S1), and says whether the library holds it already. The fragment is filed as yours; the piece takes it by a <code>from</code> line.
    </figcaption>
    <div class="row">
      <div>
        <div class="ph">before · two lines selected</div>
        <pre class="code">{#each BEFORE as l, i (i)}<span class="l"></span><span class="ln">{i + 1}</span><span class={SELECTED.has(i) ? 'sel' : 'code'}>{l}</span>{/each}</pre>
        <div class="ph">after</div>
        <pre class="code">{#each AFTER as l, i (i)}<span class="l"></span><span class="ln">{i + 1}</span><span class={i === 1 ? 'from' : 'code'}>{l}</span>{/each}</pre>
      </div>
      <div class="dialog">
        <div class="pt"><b>New fragment</b></div>
        <div class="lbl">id <span class="field">my_vamp_bass</span></div>
        <div class="lbl">facet <span class="field">bass ▾</span> <span class="faint">(a hint: it is what you file it as)</span></div>
        <div class="ph">signature, proposed</div>
        <div class="rowx"><span class="tag">head</span> <code>&amp;bassline</code> <span class="faint">read by line 4</span></div>
        <div class="rowx"><span class="tag">main</span> <code>&amp;key</code> <span class="faint">the one name it reads and doesn't define</span></div>
        <div class="rowx"><span class="tag">private</span> <code>&amp;harm</code> <span class="faint">read only inside: the copy's own</span></div>
        <pre class="code">{FRAGMENT.join('\n')}</pre>
        <div class="checks"><span class="ok">✓ plays the same (S1, 8 bars)</span><span class="ok">✓ no fragment of the library reads the same</span></div>
        <div class="host"><span class="play">▶ hear it alone</span><span class="btn">File as mine</span></div>
      </div>
    </div>
  </figure>
</main>

<style>
  main {
    background: var(--bg);
    color: var(--text);
    font: 13px / 1.4 var(--font-ui);
    padding: 16px;
    width: 1800px;
  }
  h1 {
    font-size: 18px;
    margin: 0 0 4px;
  }
  figure {
    margin: 0 0 28px;
  }
  figcaption {
    color: var(--text-muted);
    max-width: 1500px;
    margin-bottom: 8px;
  }
  figcaption b {
    color: var(--text);
  }
  .legend,
  .faint {
    color: var(--text-faint);
  }
  .row {
    display: flex;
    gap: 16px;
    align-items: flex-start;
  }
  .lab {
    fill: var(--text-muted);
    font: 12px var(--font-ui);
  }
  .lab.small {
    font-size: 10px;
  }
  .lab.mid {
    text-anchor: middle;
  }
  .lab.end {
    text-anchor: end;
  }
  .lab.faint {
    fill: var(--text-faint);
  }
  .lab.piece {
    fill: var(--text);
  }
  .lab.ink {
    fill: var(--ink-on-note);
    font-weight: 700;
  }
  .wheel {
    fill: var(--surface);
    stroke: var(--line);
    stroke-width: 2;
  }
  .side {
    fill: var(--surface);
    stroke: var(--line);
    stroke-width: 2;
  }
  .side.new {
    stroke: var(--accent);
    stroke-dasharray: 8 6;
  }
  .mine {
    fill: var(--surface-2);
    stroke: var(--accent);
  }
  .pieceDot {
    fill: var(--surface-2);
    stroke: var(--text-faint);
  }
  .hint {
    fill: none;
    stroke: var(--text-faint);
    stroke-dasharray: 3 5;
  }
  .facets {
    margin-bottom: 8px;
  }
  .chip {
    display: inline-block;
    padding: 1px 7px;
    margin: 0 4px 4px 0;
    border-radius: 9px;
    border: 1px solid var(--c);
    color: var(--c);
    font-size: 11px;
  }
  .mapbox {
    background: var(--surface);
    border-radius: 8px;
    padding: 8px;
  }
  .pickers {
    display: flex;
    gap: 8px;
    align-items: center;
    flex-wrap: wrap;
    margin-bottom: 6px;
  }
  .pick {
    background: var(--surface-2);
    border-radius: 6px;
    padding: 3px 8px;
  }
  .defaults {
    margin-left: auto;
    color: var(--text-faint);
  }
  .badge {
    display: inline-block;
    margin-left: 4px;
    padding: 1px 7px;
    border-radius: 4px;
    background: color-mix(in oklab, var(--c) 30%, var(--surface-2));
    color: var(--text);
  }
  .badge.client {
    background: none;
    border: 1px dashed var(--text-faint);
    color: var(--text-muted);
  }
  .map {
    background: var(--code-bg);
    border-radius: 6px;
  }
  .reach {
    fill: none;
    stroke-width: 1;
    stroke-dasharray: 2 4;
    opacity: 0.35;
  }
  .link {
    stroke: var(--text-faint);
    stroke-width: 1;
    opacity: 0.55;
  }
  circle.unused {
    opacity: 0.45;
  }
  .leaf {
    fill: var(--text);
  }
  .shelf {
    color: var(--text-muted);
    max-width: 860px;
    margin-top: 6px;
  }
  .appbar {
    display: flex;
    justify-content: space-between;
    background: var(--surface);
    padding: 6px 10px;
    border-radius: 6px;
    margin-bottom: 8px;
    width: 1480px;
  }
  .tabs span {
    margin-left: 14px;
    color: var(--text-muted);
  }
  .tabs .on {
    color: var(--accent);
  }
  .tabs .on2 {
    color: var(--text);
    border-bottom: 2px solid var(--accent);
  }
  pre.code {
    background: var(--code-bg);
    color: var(--code);
    font: 13px / 1.55 var(--font-code);
    padding: 10px 12px;
    border-radius: 6px;
    margin: 0;
    min-width: 640px;
  }
  pre.wide {
    min-width: 900px;
  }
  .l {
    display: block;
  }
  .ln {
    color: var(--text-faint);
    margin-right: 12px;
  }
  .dot {
    margin-right: 8px;
    font-size: 10px;
  }
  .sig {
    color: var(--meter-1);
    font-family: var(--font-code);
  }
  pre .sig {
    font-weight: 700;
  }
  .comment {
    color: var(--text-faint);
  }
  .from {
    color: var(--meter-2);
  }
  .sel {
    background: color-mix(in oklab, var(--accent) 28%, transparent);
  }
  .link {
    color: var(--accent);
    text-decoration: underline;
    text-underline-offset: 3px;
  }
  .link.hov {
    background: color-mix(in oklab, var(--accent) 22%, transparent);
  }
  .parts {
    width: 820px;
  }
  .ph {
    color: var(--text-muted);
    margin: 6px 0;
  }
  .part {
    background: var(--surface);
    border-radius: 6px;
    padding: 6px 10px;
    margin-bottom: 6px;
  }
  .part.whole {
    border: 1px solid var(--accent);
  }
  .pt {
    margin-bottom: 4px;
  }
  .minroll {
    background: var(--code-bg);
    border-radius: 4px;
  }
  .play {
    color: var(--accent);
    margin-right: 8px;
  }
  .cards {
    display: grid;
    grid-template-columns: repeat(4, 340px);
    gap: 12px;
  }
  .card {
    background: var(--surface);
    border-radius: 8px;
    padding: 8px 10px;
  }
  .card svg {
    background: var(--code-bg);
    border-radius: 4px;
  }
  .ct {
    margin-bottom: 6px;
    font-size: 12px;
  }
  .host {
    margin-top: 6px;
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
    align-items: center;
  }
  .stand {
    border: 1px dashed var(--text-faint);
    border-radius: 4px;
    padding: 1px 6px;
    color: var(--text-muted);
  }
  .key {
    fill: var(--text);
    opacity: 0.85;
  }
  .bkey {
    fill: var(--bg);
  }
  .slider {
    stroke: var(--line);
    stroke-width: 3;
  }
  .knob {
    fill: var(--surface-2);
    stroke: var(--line);
  }
  .role {
    fill: var(--surface-2);
  }
  .pop {
    background: var(--surface-2);
    border: 1px solid var(--line);
    border-radius: 8px;
    padding: 10px 12px;
    width: 400px;
  }
  .pop.small {
    width: 330px;
  }
  .pop p {
    color: var(--text-muted);
    margin: 6px 0;
  }
  .dialog {
    background: var(--surface-2);
    border: 1px solid var(--line);
    border-radius: 8px;
    padding: 12px 14px;
    width: 640px;
  }
  .dialog .lbl {
    display: block;
    margin: 4px 0;
    color: var(--text-muted);
  }
  .field {
    background: var(--code-bg);
    color: var(--text);
    padding: 2px 8px;
    border-radius: 4px;
    font-family: var(--font-code);
  }
  .rowx {
    margin: 3px 0;
  }
  .tag {
    display: inline-block;
    width: 56px;
    color: var(--meter-1);
  }
  .checks {
    margin: 8px 0;
    display: flex;
    gap: 14px;
  }
  .ok {
    color: var(--meter-1);
  }
  .btn {
    background: var(--accent);
    color: var(--accent-ink);
    border-radius: 6px;
    padding: 3px 12px;
    font-weight: 700;
  }
</style>
