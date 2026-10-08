<script lang="ts">
  /** The sheet: every kind of wheel (fixtures.ts) and the library's piece wheels. (A cell's sheet draws its graph wheel, larger.) */
  import Fixture from './Fixture.svelte';
  import { fixtures } from './fixtures';
  import { pieces as examples } from '../pieces';
  import PieceNode from '../../../src/ui/PieceNode.svelte';
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
  const list = fixtures(examples(seconds, only));
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
    { label: 'five tags', entry: { ...base, id: 'harness:five', tags: ['genre:electronic', 'tutorial', 'harmony', 'rhythm', 'tonal'] } },
    { label: 'one tag', entry: { ...base, id: 'harness:one', tags: ['tutorial'] } },
    { label: 'no tags', entry: { ...base, id: 'harness:none', tags: [] } },
  ];
  const colours = tagColours(pieces.flatMap((p) => p.entry.tags));
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
