<script lang="ts">
  /**
   * The golden graph: the real Graph (src/ui/Graph.svelte) on the golden piece, its cells pinned where golden.ts says,
   * once stopped and once at a moment of play (the live state at ?t=3, a made-up sound). One frame per state, fixed in size.
   */
  import Graph from '../../../src/ui/Graph.svelte';
  import { buildGraph } from '../../../src/engine/graph';
  import { pieceOf } from '../pieces';
  import { madeUpSound } from '../sound';
  import { golden } from './golden';

  const seconds = Number(new URLSearchParams(location.search).get('t') ?? 3);
  const piece = pieceOf('golden', golden.source, seconds);
  if (!piece) throw new Error('the golden graph does not compile');
  const model = buildGraph(piece.program);
  const states = [
    { key: 'stopped', live: null },
    { key: 'live', live: piece.live },
  ];
  const nothing = () => {};
</script>

<main>
  {#each states as s (s.key)}
    <figure data-kind="golden:{s.key}">
      <figcaption><b>golden · {s.key}</b> <span>{model.nodes.length} nodes, {model.edges.length} edges</span></figcaption>
      <div class="frame">
        <Graph
          {model}
          program={piece.program}
          muted={new Set()}
          routed={piece.routed}
          live={s.live}
          shifts={s.live ? s.live.shifts : piece.shifts}
          ontoggle={nothing}
          onturn={nothing}
          onshowcode={nothing}
          source={golden.source}
          sound={madeUpSound(() => s.live !== null)}
          onedit={nothing}
          onadd={nothing}
          onrename={nothing}
          onfree={nothing}
          focus={null}
          fixed={golden.layout}
          opened={1}
        />
      </div>
    </figure>
  {/each}
</main>

<style>
  :global(body) {
    margin: 0;
    background: var(--bg);
    color: var(--text);
  }
  main {
    padding: 16px;
    display: grid;
    gap: 16px;
    font-family: var(--font-ui);
  }
  figure {
    margin: 0;
  }
  figcaption {
    font: 12px var(--font-ui);
    color: var(--text-muted);
    margin-bottom: 4px;
  }
  figcaption b {
    font-family: var(--font-code);
    color: var(--accent);
  }
  .frame {
    width: 2800px;
    height: 1500px;
    border: 1px solid var(--line);
    border-radius: var(--radius);
    overflow: hidden;
  }
</style>
