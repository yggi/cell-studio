<script lang="ts">
  /**
   * The edge sheet: every kind of edge the examples have (fixtures.ts), each in the states the graph draws it in
   * (off, unrouted, on, idle, live — twice, on a low note too — and bent as the layout bends it), on bare nodes. Belts
   * by their stretch, a meter's net by its beat. The real edge components, as `flowedge.ts` makes them.
   */
  import EdgeCell, { type Column } from './EdgeCell.svelte';
  import { edgeFixtures } from './fixtures';
  import { pieces } from '../pieces';
  import '../../../src/ui/edges.css';

  const q = new URLSearchParams(location.search);
  const seconds = Number(q.get('t') ?? 3);
  const only = (q.get('only') ?? '').split(',').filter(Boolean);
  const list = edgeFixtures(pieces(seconds, only));

  const STATES: Column[] = [
    { label: 'off', state: 'off' },
    { label: 'unrouted', state: 'unrouted' },
    { label: 'on (stopped)', state: 'on' },
    { label: 'idle', state: 'idle' },
    { label: 'live · C4', state: 'live' },
    { label: 'live · C3', state: 'live', note: 130.81 },
    { label: 'live · bent', state: 'live', bend: 34 },
  ];
  const BELT: Column[] = [
    { label: 'at rest', state: 'on' },
    { label: 'pulling', state: 'live', stretch: 0.04 },
    { label: 'pulling, other way', state: 'live', stretch: -0.04 },
    { label: 'slipping', state: 'live', stretch: 0.06, slipping: true },
  ];
  const METER: Column[] = [
    { label: 'stopped', state: 'on' },
    { label: 'step 1', state: 'live', beat: 0 },
    { label: '+0.3 of a step', state: 'live', beat: 0.3 },
    { label: 'step 3', state: 'live', beat: 2 },
  ];
  const columnsOf = (f: (typeof list)[number]) =>
    f.meter ? METER : f.edge.kind === 'step' && f.piece.program.cells.get(f.edge.source.slice(5))?.params.belt !== undefined ? BELT : STATES;
  const groupOf = (f: (typeof list)[number]) => (f.meter ? 'meter' : f.edge.kind);
  const groups = $derived([...new Set(list.map(groupOf))].map((g) => ({ g, items: list.filter((f) => groupOf(f) === g) })));
</script>

<main class="graph">
  <h1>Edges</h1>
  <p class="meta">
    {list.length} kinds, drawn by the graph's own edge components on bare nodes: {seconds} s into each piece, a made-up sound ·
    <code>node tools/gallery.mjs edges</code>
  </p>
  {#each groups as grp (grp.g)}
    <h2>{grp.g} · {grp.items.length}</h2>
    <div class="list">
      {#each grp.items as f (f.key)}
        <figure data-kind={f.key}>
          <figcaption>
            <b>{f.key.split(':').slice(1).join(' · ')}</b>
            <span
              >{f.piece.title} · &amp;{f.edge.source.slice(5)} → &amp;{f.edge.target.slice(5)}{f.edge.label ? ` · “${f.edge.label}”` : ''}{f.edge.pick
                ? ` · pick “${f.edge.pick}”`
                : ''}</span
            >
            <span>in {f.pieces.size} example{f.pieces.size === 1 ? '' : 's'}</span>
          </figcaption>
          <div class="row">
            {#each columnsOf(f) as c (c.label)}<EdgeCell fixture={f} column={c} />{/each}
          </div>
        </figure>
      {/each}
    </div>
  {/each}
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
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(1200px, max-content));
    gap: 10px;
  }
  figure {
    margin: 0;
    padding: 10px 12px;
    background: var(--surface);
    border: 1px solid var(--line);
    border-radius: var(--radius);
    width: max-content;
  }
  figcaption {
    font: 12px/1.4 var(--font-ui);
    color: var(--text-muted);
    margin-bottom: 4px;
  }
  figcaption b {
    font-family: var(--font-code);
    color: var(--accent);
  }
  figcaption span {
    margin-left: 8px;
  }
  .row {
    display: flex;
    gap: 4px;
  }
</style>
