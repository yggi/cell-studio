<script lang="ts">
  /**
   * Label mock-ups (#137, #274): how the graph could label its edges, nets, sub-wheels (bulbs), nodes and belts, each
   * question a section, each option a column, plain SVG on the app's theme (what they could become, not the real
   * components). `node tools/gallery.mjs labels`.
   */
  import { rippled } from '../../../src/layout/wire';
  import { noteColour, partColour } from '../../../src/ui/theme';

  type P = { x: number; y: number };
  type Cubic = { a: P; c1: P; c2: P; b: P };
  const W = 240;
  const H = 210;
  const bez = (c: Cubic, t: number): P => {
    const u = 1 - t;
    const [k0, k1, k2, k3] = [u * u * u, 3 * u * u * t, 3 * u * t * t, t * t * t];
    return { x: k0 * c.a.x + k1 * c.c1.x + k2 * c.c2.x + k3 * c.b.x, y: k0 * c.a.y + k1 * c.c1.y + k2 * c.c2.y + k3 * c.b.y };
  };
  const tangent = (c: Cubic, t: number) => {
    const [p, q] = [bez(c, t - 0.01), bez(c, t + 0.01)];
    return (Math.atan2(q.y - p.y, q.x - p.x) * 180) / Math.PI;
  };
  // (upright: text never upside down)
  const upright = (deg: number) => (deg > 90 ? deg - 180 : deg < -90 ? deg + 180 : deg);
  const d = (c: Cubic) => `M ${c.a.x} ${c.a.y} C ${c.c1.x} ${c.c1.y} ${c.c2.x} ${c.c2.y} ${c.b.x} ${c.b.y}`;
  // (drawn source → reader: the source below, the reader above, as the tower lays them; the default layout's diagonal)
  const WIRES: { name: string; c: Cubic; colour: string; text: string; sound?: boolean }[] = [
    { name: 'a value, diagonal', c: { a: { x: 40, y: 180 }, c1: { x: 60, y: 90 }, c2: { x: 180, y: 120 }, b: { x: 200, y: 30 } }, colour: noteColour(0), text: '×0.3' },
    { name: 'a value, upright (tower)', c: { a: { x: 120, y: 190 }, c1: { x: 120, y: 110 }, c2: { x: 120, y: 110 }, b: { x: 120, y: 24 } }, colour: noteColour(120), text: 'lpf' },
    { name: 'a melody, sigmoid', c: { a: { x: 70, y: 190 }, c1: { x: 70, y: 105 }, c2: { x: 170, y: 105 }, b: { x: 170, y: 24 } }, colour: noteColour(240), text: '[<<] ^$-12' },
    {
      name: 'sound, a ripple',
      c: { a: { x: 50, y: 185 }, c1: { x: 90, y: 60 }, c2: { x: 150, y: 150 }, b: { x: 190, y: 26 } },
      colour: noteColour(60),
      text: '×0.15',
      sound: true,
    },
  ];
  const EDGE_OPTIONS = [
    'A · a pill at the middle (today)',
    'B · on the wire: the wire gapped, level',
    'C · along the wire (follows its curve)',
    'D · along the wire, straight, upright',
    'E · at the reader’s end, level',
  ];

  // ---- nets ----------------------------------------------------------------------------------------------------------
  const owner = { x: 40, y: 170 };
  const readers = [
    { x: 110, y: 60, t: '' },
    { x: 165, y: 45, t: '×2' },
    { x: 210, y: 70, t: '/4' },
  ];
  const NET_OPTIONS = ['A · none (today)', 'B · the net named once, on its trunk', 'C · B + each tap’s own change at its reader', 'D · the name at every reader’s end'];

  // ---- bulbs ---------------------------------------------------------------------------------------------------------
  const HOST = { x: 120, y: 132, r: 52 };
  const NAMES = ['hook', 'bassA', '&message', '&mixtures', 'keys'];
  const bulbAt = (k: number) => {
    const a = -Math.PI / 2 + ((k - 2) * Math.PI) / 3.2;
    return { x: HOST.x + Math.cos(a) * (HOST.r + 2), y: HOST.y + Math.sin(a) * (HOST.r + 2), a };
  };
  const BR = 17;
  const fit = (name: string, min: number) => Math.max(min, Math.min(11, (BR * 1.7) / (0.6 * name.length)));
  const BULB_OPTIONS = ['A · shrunk to fit (today: down to 4.5 px)', 'B · 8 px at least, the rest elided', 'C · outside, along its radius', 'D · round the bulb’s outer rim'];
  const ellipsis = (name: string) => {
    const room = Math.floor((BR * 1.8) / (0.6 * 8));
    return name.length <= room ? name : name.slice(0, room - 1) + '…';
  };

  // ---- nodes ---------------------------------------------------------------------------------------------------------
  const NODE_OPTIONS = [
    'A · a pill under it; a voice’s on one line (today)',
    'B · the name in a pill, what it is under it, small',
    'C · round its rim, under it, no pill',
    'D · the name only; the rest in its sheet',
  ];

  // ---- belts ---------------------------------------------------------------------------------------------------------
  const BELT_OPTIONS = ['A · none (today)', 'B · a pill between the runs', 'C · along a run', 'D · at the driven pulley'];
  const P1 = { x: 70, y: 60, r: 34 };
  const P2 = { x: 170, y: 150, r: 22 };
  const runs = (() => {
    const [dx, dy] = [P2.x - P1.x, P2.y - P1.y];
    const l = Math.hypot(dx, dy);
    const ang = Math.atan2(dy, dx);
    const off = Math.asin((P1.r - P2.r) / l);
    return [1, -1].map((s) => {
      const n = ang + s * (Math.PI / 2 + off);
      return [
        { x: P1.x + Math.cos(n) * P1.r, y: P1.y + Math.sin(n) * P1.r },
        { x: P2.x + Math.cos(n) * P2.r, y: P2.y + Math.sin(n) * P2.r },
      ];
    });
  })();
  const runAngle = upright((Math.atan2(runs[0][1].y - runs[0][0].y, runs[0][1].x - runs[0][0].x) * 180) / Math.PI);
</script>

<!-- text on a wire: a halo of the background's colour under it gaps the wire, drawn as its own layer under the letters
     (in one text, each glyph's halo would cover the glyph before it) -->
{#snippet onWire(t: { text: string; fill: string; x?: number; y?: number; transform?: string; anchor?: string; small?: boolean; path?: string })}
  {#each ['halo', 'ink'] as layer (layer)}
    <text
      class="gap {layer}"
      class:small={t.small}
      x={t.x}
      y={t.y}
      transform={t.transform}
      text-anchor={t.path ? undefined : (t.anchor ?? 'middle')}
      dy="4"
      fill={layer === 'ink' ? t.fill : 'none'}
      >{#if t.path}<textPath href="#{t.path}" startOffset="50%" text-anchor="middle">{t.text}</textPath>{:else}{t.text}{/if}</text
    >
  {/each}
{/snippet}

<main>
  <h1>Labels</h1>
  <p class="meta">Options for #137 and #274, side by side on the app's theme · <code>node tools/gallery.mjs labels</code></p>

  <figure data-kind="1-edges">
    <figcaption><b>1 · an edge's label</b> — where it sits, and which way it reads (rows: four kinds of wire)</figcaption>
    <div class="grid" style:--cols={EDGE_OPTIONS.length}>
      {#each EDGE_OPTIONS as o (o)}<div class="head">{o}</div>{/each}
      {#each WIRES as w (w.name)}
        {#each EDGE_OPTIONS as _o, k (k)}
          {@const m = bez(w.c, 0.5)}
          {@const ang = upright(tangent(w.c, 0.5))}
          {@const end = bez(w.c, 0.86)}
          <svg width={W} height={H} viewBox="0 0 {W} {H}">
            <circle class="node" cx={w.c.a.x} cy={w.c.a.y + 14} r="14" />
            <circle class="node" cx={w.c.b.x} cy={w.c.b.y - 12} r="12" />
            <path id="w-{w.name}-{k}" class="wire" d={w.sound ? rippled(d(w.c), 2.5, 11) : d(w.c)} stroke={w.colour} stroke-width={w.sound ? 3 : 4} />
            <path id="c-{w.name}-{k}" d={d(w.c)} fill="none" stroke="none" />
            {#if k === 0}
              <g transform="translate({m.x} {m.y})">
                <rect class="pill" x={-(w.text.length * 4 + 9)} y="-10" width={w.text.length * 8 + 18} height="20" rx="10" />
                <text class="pilltext" text-anchor="middle" dy="4.5">{w.text}</text>
              </g>
            {:else if k === 1}
              {@render onWire({ text: w.text, fill: w.colour, x: m.x, y: m.y })}
            {:else if k === 2}
              {@render onWire({ text: w.text, fill: w.colour, path: `c-${w.name}-${k}` })}
            {:else if k === 3}
              {@render onWire({ text: w.text, fill: w.colour, transform: `translate(${m.x} ${m.y}) rotate(${ang})` })}
            {:else}
              {@render onWire({ text: w.text, fill: w.colour, x: end.x + 8, y: end.y, anchor: 'start', small: true })}
            {/if}
          </svg>
        {/each}
      {/each}
    </div>
  </figure>

  <figure data-kind="2-nets">
    <figcaption><b>2 · a net's label</b> — a bus read by three (&amp;major, two of its taps changed), as its tree draws it</figcaption>
    <div class="grid" style:--cols={NET_OPTIONS.length}>
      {#each NET_OPTIONS as o (o)}<div class="head">{o}</div>{/each}
      {#each NET_OPTIONS as _o, k (k)}
        <svg width={W} height={H} viewBox="0 0 {W} {H}">
          <path class="wire" d="M {owner.x} {owner.y} L {readers[0].x} {readers[0].y}" stroke={noteColour(30)} stroke-width="6" />
          <path class="wire" d="M {readers[0].x} {readers[0].y} L {readers[1].x} {readers[1].y}" stroke={noteColour(30)} stroke-width="6" />
          <path class="wire" d="M {readers[1].x} {readers[1].y} L {readers[2].x} {readers[2].y}" stroke={noteColour(30)} stroke-width="6" />
          <circle class="node" cx={owner.x} cy={owner.y} r="18" />
          <text class="nodetext" x={owner.x} y={owner.y + 34} text-anchor="middle">&amp;major</text>
          {#each readers as r, i (i)}<circle class="node" cx={r.x} cy={r.y} r="13" />{/each}
          {#if k === 1 || k === 2}
            {@const m = { x: (owner.x + readers[0].x) / 2, y: (owner.y + readers[0].y) / 2 }}
            {@render onWire({
              text: 'major',
              fill: noteColour(30),
              transform: `translate(${m.x} ${m.y}) rotate(${upright((Math.atan2(readers[0].y - owner.y, readers[0].x - owner.x) * 180) / Math.PI)})`,
            })}
          {/if}
          {#if k === 2}
            {#each readers as r, i (i)}{#if r.t}{@render onWire({ text: r.t, fill: noteColour(30), x: r.x, y: r.y + 24, small: true })}{/if}{/each}
          {/if}
          {#if k === 3}
            {#each readers as r, i (i)}{@render onWire({ text: `major${r.t ? ' ' + r.t : ''}`, fill: noteColour(30), x: r.x, y: r.y + 24, small: true })}{/each}
          {/if}
        </svg>
      {/each}
    </div>
  </figure>

  <figure data-kind="3-bulbs">
    <figcaption><b>3 · a name on a sub-wheel</b> (a tap, a splice, a head) that doesn't fit: short and long names on one host</figcaption>
    <div class="grid" style:--cols={BULB_OPTIONS.length}>
      {#each BULB_OPTIONS as o (o)}<div class="head">{o}</div>{/each}
      {#each BULB_OPTIONS as _o, k (k)}
        <svg width={W} height={H} viewBox="0 0 {W} {H}">
          <circle class="host" cx={HOST.x} cy={HOST.y} r={HOST.r} />
          {#each NAMES as name, i (i)}
            {@const b = bulbAt(i)}
            {@const colour = partColour(i, NAMES.length)}
            <circle cx={b.x} cy={b.y} r={BR} fill="var(--wheel-disc)" stroke={colour} stroke-width="4" />
            {#if k === 0}
              <text class="bulbtext" x={b.x} y={b.y} text-anchor="middle" dy="0.35em" style:font-size="{fit(name, 4.5)}px">{name}</text>
            {:else if k === 1}
              <text class="bulbtext" x={b.x} y={b.y} text-anchor="middle" dy="0.35em" style:font-size="{Math.max(8, fit(name, 8))}px"
                >{fit(name, 0) < 8 ? ellipsis(name) : name}</text
              >
            {:else if k === 2}
              {@const deg = (b.a * 180) / Math.PI}
              {@const flip = Math.cos(b.a) < 0}
              <text
                class="bulbtext out"
                transform="translate({b.x + Math.cos(b.a) * (BR + 5)} {b.y + Math.sin(b.a) * (BR + 5)}) rotate({flip ? deg + 180 : deg})"
                text-anchor={flip ? 'end' : 'start'}
                dy="0.35em">{name}</text
              >
            {:else}
              <path id="rim-{i}" d="M {b.x - BR - 4} {b.y} A {BR + 4} {BR + 4} 0 0 1 {b.x + BR + 4} {b.y}" fill="none" />
              <text class="bulbtext out"><textPath href="#rim-{i}" startOffset="50%" text-anchor="middle">{name}</textPath></text>
            {/if}
          {/each}
        </svg>
      {/each}
    </div>
  </figure>

  <figure data-kind="4-nodes">
    <figcaption><b>4 · a node's name</b> — a cell, and a voice (today its caption carries its wave and pitch)</figcaption>
    <div class="grid" style:--cols={NODE_OPTIONS.length}>
      {#each NODE_OPTIONS as o (o)}<div class="head">{o}</div>{/each}
      {#each NODE_OPTIONS as _o, k (k)}
        <svg width={W} height={H} viewBox="0 0 {W} {H}">
          {#each [{ x: 62, name: '&chords', sub: '4 steps', voice: false }, { x: 172, name: '&lead', sub: 'tri · 523 Hz', voice: true }] as n (n.name)}
            <circle class="host" cx={n.x} cy="80" r="44" />
            {#if k === 0}
              {@const t = n.voice ? `${n.name} ${n.sub}` : n.name}
              <rect class="namepill" x={n.x - t.length * 3.6 - 6} y="132" width={t.length * 7.2 + 12} height="20" rx="6" />
              <text class="nodetext" x={n.x} y="146" text-anchor="middle" fill={n.voice ? 'var(--accent)' : 'var(--text)'}>{t}</text>
            {:else if k === 1}
              <rect class="namepill" x={n.x - n.name.length * 4.2 - 7} y="132" width={n.name.length * 8.4 + 14} height="22" rx="6" />
              <text class="nodetext big" x={n.x} y="147" text-anchor="middle">{n.name}</text>
              <text class="sub" x={n.x} y="168" text-anchor="middle">{n.sub}</text>
            {:else if k === 2}
              <path id="under-{n.name}-{k}" d="M {n.x - 54} 80 A 54 54 0 0 0 {n.x + 54} 80" fill="none" />
              <text class="nodetext big"><textPath href="#under-{n.name}-{k}" startOffset="50%" text-anchor="middle">{n.name}</textPath></text>
            {:else}
              <rect class="namepill" x={n.x - n.name.length * 4.2 - 7} y="132" width={n.name.length * 8.4 + 14} height="22" rx="6" />
              <text class="nodetext big" x={n.x} y="147" text-anchor="middle">{n.name}</text>
            {/if}
          {/each}
        </svg>
      {/each}
    </div>
  </figure>

  <figure data-kind="5-belts">
    <figcaption><b>5 · a belt's label</b> (#137: <code>÷2 · belt</code> is never shown)</figcaption>
    <div class="grid" style:--cols={BELT_OPTIONS.length}>
      {#each BELT_OPTIONS as o (o)}<div class="head">{o}</div>{/each}
      {#each BELT_OPTIONS as _o, k (k)}
        {@const mid = { x: (P1.x + P2.x) / 2, y: (P1.y + P2.y) / 2 }}
        <svg width={W} height={H} viewBox="0 0 {W} {H}">
          <circle class="host" cx={P1.x} cy={P1.y} r={P1.r} />
          <circle class="host" cx={P2.x} cy={P2.y} r={P2.r} />
          {#each runs as r, i (i)}<path class="belt" d="M {r[0].x} {r[0].y} L {r[1].x} {r[1].y}" />{/each}
          {#if k === 1}
            <rect class="pill" x={mid.x - 18} y={mid.y - 10} width="36" height="20" rx="10" />
            <text class="pilltext" x={mid.x} y={mid.y} text-anchor="middle" dy="4.5">÷2</text>
          {:else if k === 2}
            {@const m = { x: (runs[0][0].x + runs[0][1].x) / 2, y: (runs[0][0].y + runs[0][1].y) / 2 }}
            {@render onWire({ text: '÷2 · belt', fill: 'var(--text)', transform: `translate(${m.x} ${m.y}) rotate(${runAngle})` })}
          {:else if k === 3}
            {@render onWire({ text: '÷2', fill: 'var(--text)', x: P2.x + P2.r + 6, y: P2.y, anchor: 'start', small: true })}
          {/if}
        </svg>
      {/each}
    </div>
  </figure>
</main>

<style>
  :global(body) {
    margin: 0;
    background: var(--bg);
    color: var(--text);
  }
  main {
    padding: 20px 24px 40px;
    font-family: var(--font-ui);
  }
  h1 {
    font-size: 20px;
    margin: 0 0 4px;
  }
  .meta {
    color: var(--text-muted);
    font-size: 13px;
    margin: 0 0 16px;
  }
  figure {
    margin: 0 0 18px;
    padding: 10px 12px;
    background: var(--surface);
    border: 1px solid var(--line);
    border-radius: var(--radius);
    width: max-content;
  }
  figcaption {
    font: 13px/1.4 var(--font-ui);
    color: var(--text-muted);
    margin-bottom: 8px;
  }
  figcaption b {
    color: var(--accent);
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(var(--cols), max-content);
    gap: 4px 10px;
  }
  .head {
    font: 600 12px var(--font-ui);
    color: var(--text);
    max-width: 240px;
  }
  svg {
    background: var(--bg);
    border-radius: 6px;
  }
  .node,
  .host {
    fill: var(--wheel-disc);
    stroke: var(--wheel-tick);
    stroke-width: 1.5;
  }
  .wire {
    fill: none;
    stroke-linecap: round;
  }
  .belt {
    stroke: color-mix(in oklab, var(--edge) 55%, #c08a5a);
    stroke-width: 4;
    stroke-linecap: round;
  }
  .pill {
    fill: var(--surface-2);
    stroke: var(--line);
  }
  .pilltext {
    font: 700 12.5px var(--font-ui);
    fill: var(--text);
  }
  /* (on the wire: the background's colour round the letters gaps the wire under them) */
  .gap {
    font: 700 12.5px var(--font-ui);
  }
  .gap.halo {
    stroke: var(--bg);
    stroke-width: 7px;
    stroke-linejoin: round;
  }
  .gap.small {
    font-size: 11px;
  }
  .bulbtext {
    font: 600 11px var(--font-ui);
    fill: var(--text);
  }
  .bulbtext.out {
    font-size: 9.5px;
    paint-order: stroke;
    stroke: var(--bg);
    stroke-width: 4px;
  }
  .namepill {
    fill: var(--surface);
  }
  .nodetext {
    font: 600 12px var(--font-code);
    fill: var(--text);
  }
  .nodetext.big {
    font-size: 13px;
  }
  .sub {
    font: 10.5px var(--font-code);
    fill: var(--text-muted);
  }
</style>
