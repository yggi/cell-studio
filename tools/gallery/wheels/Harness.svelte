<script lang="ts">
  /** The sheet: every kind of wheel (fixtures.ts), the library's piece wheels and the braid's token wheel. */
  import Fixture from './Fixture.svelte';
  import { fixtures } from './fixtures';
  import PieceNode from '../../../src/ui/PieceNode.svelte';
  import TokenWheel, { type WheelToken } from '../../../src/ui/TokenWheel.svelte';
  import { tagColours } from '../../../src/ui/tags';
  import type { Entry } from '../../../src/ui/entries';
  import { compileSource } from '../../../src/engine/compile';
  import { buildGraph } from '../../../src/engine/graph';
  import { pieceTime } from '../../../src/engine/duration';
  import { PRESETS } from '../../../src/engine/presets';

  const q = new URLSearchParams(location.search);
  const seconds = Number(q.get('t') ?? 3);
  const only = (q.get('only') ?? '').split(',').filter(Boolean);
  const playing = q.get('stopped') === null;
  /** The ladder of sizes a cell's or a voice's wheel is shown at (each up to its own size). */
  const sizes = (q.get('sizes') ?? '44,64,96').split(',').map(Number);
  const list = fixtures(seconds, only);
  const groups = [
    { where: 'graph', title: 'Graph' },
    { where: 'petal', title: 'Graph — petals' },
  ].map((g) => ({ ...g, items: list.filter((f) => f.key.startsWith(g.where + ':')) }));

  // the library: a piece's wheel with many tags, with one, with none; at a card's size, the details' and small
  const source = PRESETS.hypercell.source;
  const r = compileSource(source);
  const base: Entry = {
    id: 'harness:piece',
    kind: 'example',
    title: 'Hypercell',
    description: '',
    tags: [],
    source,
    size: buildGraph(r).nodes.filter((n) => !n.petalOf && !n.cell.note).length,
    time: r.ok ? pieceTime(r) : undefined,
  };
  const pieces: { label: string; entry: Entry }[] = [
    { label: 'five tags', entry: { ...base, id: 'harness:five', tags: ['genre:electronic', 'basics', 'harmony', 'rhythm', 'tonal'] } },
    { label: 'one tag', entry: { ...base, id: 'harness:one', tags: ['basics'] } },
    { label: 'no tags', entry: { ...base, id: 'harness:none', tags: [] } },
  ];
  const colours = tagColours(pieces.flatMap((p) => p.entry.tags));

  // the braid's token wheel (the sheet's editor): notes, references, a rest and a chord; and long numbers
  const tok = (label: string, hue: number | null, kind: WheelToken['kind'] = 'note', weight = 1): WheelToken => ({ label, hues: hue === null ? null : [hue], weight, kind });
  const tokenSets: { label: string; tokens: WheelToken[] }[] = [
    {
      label: 'notes, a reference, a rest, a chord',
      tokens: [tok('0', 0), tok('2', 60), tok('4', 120), tok('&riff', null, 'ref', 2), tok('~', null, 'rest'), { label: '[0,4,7]', hues: [0, 120, 210], weight: 1, kind: 'chord' }],
    },
    { label: 'values', tokens: ['2.3429', '1.1047', '1.2224', '1.3501', '1.7346', '1.9168', '2.1191', '4'].map((v, i) => tok(v, (i * 45) % 360)) },
  ];
</script>

<main>
  <h1>Wheels</h1>
  <p class="meta">
    {list.length} kinds, set up directly: {seconds} s into each piece, {playing ? 'with a made-up sound' : 'stopped'} · sizes {sizes.join(', ')} and each one's own ·
    <code>node tools/gallery.mjs wheels --fast</code>
  </p>
  {#each groups as g (g.where)}
    {#if g.items.length}
      <h2>{g.title} · {g.items.length}</h2>
      <div class="list">
        {#each g.items as f (f.key)}<Fixture fixture={f} {sizes} {playing} />{/each}
      </div>
    {/if}
  {/each}
  <h2>Library</h2>
  <div class="list">
    {#each pieces as pc (pc.label)}
      <figure data-kind="library:piece:{pc.label.replace(' ', '-')}">
        <figcaption><b>piece · {pc.label}</b></figcaption>
        <div class="row" data-where="library">
          {#each [80, 136, 220] as s (s)}<PieceNode entry={pc.entry} {colours} size={s} labels />{/each}
        </div>
      </figure>
    {/each}
  </div>
  <h2>A cell's sheet · the braid</h2>
  <div class="list">
    {#each tokenSets as ts (ts.label)}
      <figure data-kind="sheet:token:{ts.label.split(',')[0].replace(' ', '-')}">
        <figcaption><b>token · {ts.label}</b></figcaption>
        <div class="row" data-where="sheet">
          {#each [120, 176, 232] as s (s)}<TokenWheel
              tokens={ts.tokens}
              size={s}
              hub={{ big: String(ts.tokens.length), small: 'steps' }}
              onpick={() => {}}
              onhub={() => {}}
            />{/each}
        </div>
      </figure>
    {/each}
  </div>
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
  h2 {
    font-size: 15px;
    color: var(--text-muted);
    margin: 24px 0 10px;
  }
  .meta {
    color: var(--text-muted);
    font-size: 13px;
    margin: 0;
  }
  .list {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  figure {
    margin: 0;
    padding: 10px 12px;
    background: var(--surface);
    border: 1px solid var(--line);
    border-radius: var(--radius);
  }
  figcaption {
    font: 12px var(--font-ui);
    color: var(--text-muted);
    margin-bottom: 6px;
  }
  figcaption b {
    font-family: var(--font-code);
    color: var(--accent);
  }
  .row {
    display: flex;
    align-items: center;
    gap: 72px;
    padding: 8px 48px 16px;
  }
</style>
