<script lang="ts">
  /**
   * Stats, a page of the sidebar (#390): the open piece's numbers (engine/stats.ts), live: its cells by kind and in
   * all, its wires and nets, the braid steps each cell writes (min, median, mean, max), and its text. A MIDI file's are
   * those of the cells it plays through.
   */
  import { getStudio } from './state/studio.svelte';
  import { CELL_KINDS, type CellKind } from '../engine/stats';

  const { piece } = getStudio();
  const s = $derived(piece.stats);
  const NAMES: Record<CellKind, string> = {
    line: 'Lines',
    table: 'Tables',
    meter: 'Meters',
    voice: 'Voices',
    envelope: 'Envelopes',
    gate: 'Gates',
    mix: 'Mixes',
    card: 'Cards',
    note: 'Notes',
  };
  const most = $derived(Math.max(1, ...CELL_KINDS.map((k) => s.kinds[k])));
  const n = (x: number) => (Number.isInteger(x) ? x.toLocaleString() : x.toFixed(1));
</script>

<div class="stats">
  {#if piece.midi}<p class="lead">A MIDI file: the numbers of the cells it plays through, before it is converted.</p>{/if}
  <dl class="tiles">
    <div>
      <dt>Cells</dt>
      <dd>{n(s.cells)}</dd>
    </div>
    <div>
      <dt>Wires</dt>
      <dd>{n(s.wires)}</dd>
    </div>
    <div>
      <dt>Nets</dt>
      <dd>{n(s.nets)}</dd>
    </div>
    <div>
      <dt>Steps</dt>
      <dd>{n(s.steps)}</dd>
    </div>
  </dl>

  <section aria-labelledby="stats-kinds">
    <h4 id="stats-kinds">Cells by kind</h4>
    <dl class="kinds">
      {#each CELL_KINDS as k (k)}
        {#if s.kinds[k]}
          <div>
            <dt>{NAMES[k]}</dt>
            <dd><span class="bar" style:width="{(s.kinds[k] / most) * 100}%"></span><span class="num">{n(s.kinds[k])}</span></dd>
          </div>
        {/if}
      {/each}
    </dl>
    {#if s.unnamed}<p class="aside">{n(s.unnamed)} of them unnamed (<code>&amp;( … )</code>)</p>{/if}
  </section>

  <section aria-labelledby="stats-steps">
    <h4 id="stats-steps">Braid steps per cell</h4>
    {#if s.perCell.max}
      <dl class="row">
        <div>
          <dt>min</dt>
          <dd>{n(s.perCell.min)}</dd>
        </div>
        <div>
          <dt>median</dt>
          <dd>{n(s.perCell.median)}</dd>
        </div>
        <div>
          <dt>mean</dt>
          <dd>{n(s.perCell.mean)}</dd>
        </div>
        <div>
          <dt>max</dt>
          <dd>{n(s.perCell.max)}</dd>
        </div>
      </dl>
    {:else}
      <p class="aside">No cell writes a braid of steps.</p>
    {/if}
    <p class="aside">{n(s.splices)} splice{s.splices === 1 ? '' : 's'} of {n(s.spliced)} cell{s.spliced === 1 ? '' : 's'} into others’ braids</p>
  </section>

  <section aria-labelledby="stats-text">
    <h4 id="stats-text">Text</h4>
    <dl class="row">
      <div>
        <dt>characters</dt>
        <dd>{n(s.chars)}</dd>
      </div>
      <div>
        <dt>lines</dt>
        <dd>{n(s.lines)}</dd>
      </div>
    </dl>
  </section>
</div>

<style>
  .stats {
    display: grid;
    gap: 12px;
    font-family: var(--font-ui);
  }
  .lead,
  .aside {
    margin: 0;
    font-size: 13px;
    color: var(--text-muted);
  }
  dl {
    margin: 0;
  }
  dd {
    margin: 0;
    font-variant-numeric: tabular-nums;
  }
  .tiles {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 8px;
  }
  .tiles > div {
    padding: 8px 10px;
    border: 1px solid var(--line);
    border-radius: var(--radius);
    background: var(--code-bg);
  }
  .tiles dt,
  .row dt {
    font-size: 11px;
    color: var(--text-muted);
  }
  .tiles dd {
    font: 700 20px var(--font-ui);
    color: var(--text);
  }
  section {
    display: grid;
    gap: 8px;
    padding: 10px 12px 12px;
    border: 1px solid var(--line);
    border-radius: var(--radius);
    background: var(--code-bg);
  }
  h4 {
    margin: 0;
    font: 700 12px var(--font-ui);
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--text);
  }
  .kinds {
    display: grid;
    gap: 4px;
  }
  .kinds > div {
    display: grid;
    grid-template-columns: 5.5em minmax(0, 1fr);
    align-items: center;
    gap: 8px;
    font-size: 13px;
    color: var(--text-muted);
  }
  .kinds dd {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .bar {
    height: 8px;
    min-width: 2px;
    border-radius: 4px;
    background: var(--accent);
    transition: width 300ms ease;
  }
  .num {
    color: var(--text);
  }
  .row {
    display: flex;
    gap: 16px;
    flex-wrap: wrap;
  }
  .row dd {
    font: 600 16px var(--font-ui);
    color: var(--text);
  }
</style>
