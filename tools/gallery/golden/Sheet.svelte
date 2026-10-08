<script lang="ts">
  /**
   * The golden graph: the real Graph (src/ui/Graph.svelte) on the golden piece, laid out by the app as it lays out any piece,
   * once stopped and once at a moment of play (the live state at ?t=3, a made-up sound). One frame per state, fixed in size.
   * ?only=word,word draws those examples instead (`node tools/gallery.mjs golden 3 canon`): any piece in the real Graph.
   */
  import Graph from '../../../src/ui/Graph.svelte';
  import { buildGraph } from '../../../src/engine/graph';
  import { pieceOf, pieces } from '../pieces';
  import { madeUpSound } from '../sound';
  import { golden } from './golden';

  const params = new URLSearchParams(location.search);
  const seconds = Number(params.get('t') ?? 3);
  const only = params.get('only')?.split(',').filter(Boolean) ?? [];
  const piece = pieceOf('golden', golden.source, seconds);
  if (!piece) throw new Error('the golden graph does not compile');
  const frames = (only.length ? pieces(seconds, only) : [piece]).flatMap((p) => {
    const model = buildGraph(p.program);
    return [
      { key: `${p.key}:stopped`, label: `${p.key} · stopped`, p, model, live: null },
      { key: `${p.key}:live`, label: `${p.key} · live`, p, model, live: p.live },
    ];
  });
  const nothing = () => {};
</script>

<main>
  {#each frames as s (s.key)}
    <figure data-kind={s.key}>
      <figcaption><b>{s.label}</b> <span>{s.model.nodes.length} nodes, {s.model.edges.length} edges</span></figcaption>
      <div class="frame">
        <Graph
          model={s.model}
          program={s.p.program}
          muted={new Set()}
          routed={s.p.routed}
          live={s.live}
          shifts={s.live ? s.live.shifts : s.p.shifts}
          ontoggle={nothing}
          onturn={nothing}
          onshowcode={nothing}
          source={s.p.source}
          sound={madeUpSound(() => s.live !== null)}
          onedit={nothing}
          onadd={nothing}
          onrename={nothing}
          onfree={nothing}
          focus={null}
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
