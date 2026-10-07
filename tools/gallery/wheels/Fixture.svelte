<script lang="ts">
  /**
   * One kind of wheel, as the graph mounts it (its node, in a flow of its own) at a ladder of sizes, and as its
   * sheet shows it: in the context of its piece at one moment, with a made-up sound.
   */
  import { untrack } from 'svelte';
  import { SvelteFlow, type NodeTypes } from '@xyflow/svelte';
  import '@xyflow/svelte/dist/style.css';
  import { setGraphContext } from '../../../src/ui/context';
  import CellNode from '../../../src/ui/CellNode.svelte';
  import VoiceNode from '../../../src/ui/VoiceNode.svelte';
  import MaterialNode from '../../../src/ui/MaterialNode.svelte';
  import ScopeNode from '../../../src/ui/ScopeNode.svelte';
  import SunNode from '../../../src/ui/SunNode.svelte';
  import CellGlyph from '../../../src/ui/CellGlyph.svelte';
  import SpectrumWheel from '../../../src/ui/SpectrumWheel.svelte';
  import WaveGlyph from '../../../src/ui/WaveGlyph.svelte';
  import { hubLabel } from '../../../src/layout/cellview';
  import type { FlowNode } from '../../../src/ui/types';
  import type { Fixture } from './fixtures';
  import { madeUpSound } from '../sound';

  let props: { fixture: Fixture; sizes: readonly number[]; playing?: boolean } = $props();
  // (fixed for the life of the sheet)
  const { fixture: f, sizes, playing = true } = untrack(() => props);
  const p = f.piece;
  const live = playing ? p.live : null;
  setGraphContext({
    program: p.program,
    muted: new Set(),
    routed: p.routed,
    live,
    liveEdges: live ? live.edges : null,
    turned: live ? 'live' : '',
    shifts: live ? live.shifts : p.shifts,
    turn() {},
    setFree() {},
    open() {},
    bends: new Map(),
    toggle() {},
    nudge() {},
    cursor: 0,
    epoch: 0,
    move() {},
    sound: madeUpSound(() => playing),
  });
  const nodeTypes = { cell: CellNode, voice: VoiceNode, material: MaterialNode, scope: ScopeNode, sun: SunNode } as NodeTypes;
  const name = f.node.data.name;
  const cell = p.program.cells.get(name)!;
  // the ladder: a cell's or a voice's wheel at each size (petals and the physical ones only at their own)
  const scalable = (f.node.type === 'cell' || f.node.type === 'voice') && !('petal' in f.node.data && f.node.data.petal);
  const own = f.node.data.size;
  const ladder = scalable ? [...new Set([...sizes.filter((s) => s < own), own])] : [own];
  const PAD = 18;
  const LABEL = 44; // (room for the name under a node)
  const height = Math.max(...ladder) + 2 * PAD + LABEL;
  // one flow per size: a node keeps its own id (its state is looked up by it)
  const flows = ladder.map((s) => ({
    size: s,
    width: Math.max(s + 2 * PAD, 150),
    nodes: [{ ...f.node, position: { x: Math.max(s + 2 * PAD, 150) / 2, y: PAD + s / 2 }, draggable: false, data: { ...f.node.data, size: s } } as FlowNode],
  }));
  // the sheet: what it shows above the braid (CellSheet.svelte)
  const signal = !!cell.mix || cell.sink;
  const sheet = f.node.type === 'voice' ? 'voice' : signal ? 'signal' : f.node.type === 'cell' && !('petal' in f.node.data && f.node.data.petal) ? 'cell' : null;
</script>

<figure data-kind={f.key}>
  <figcaption>
    <b>{f.key.split(':').slice(1).join(' · ')}</b>
    <span class="state">{live ? (f.live ? 'live' : 'idle') : 'stopped'}</span>
    <span>{p.title} · &amp;{name} · in {f.pieces.size} example{f.pieces.size === 1 ? '' : 's'}</span>
  </figcaption>
  <div class="row">
    {#each flows as fl (fl.size)}
      <div class="flow" data-where={f.key.split(':')[0]} data-size={fl.size} style:width="{fl.width}px" style:height="{height}px">
        <SvelteFlow
          nodes={fl.nodes}
          edges={[]}
          {nodeTypes}
          nodeOrigin={[0.5, 0.5]}
          colorMode="dark"
          panOnDrag={false}
          zoomOnScroll={false}
          zoomOnPinch={false}
          zoomOnDoubleClick={false}
          nodesConnectable={false}
          elementsSelectable={false}
          viewport={{ x: 0, y: 0, zoom: 1 }}
          proOptions={{ hideAttribution: true }}
        />
      </div>
    {/each}
    {#if sheet}
      <div class="sheet" data-where="sheet">
        {#if sheet === 'signal'}<SpectrumWheel {name} size={216} hub={hubLabel(p.program, name, p.shifts, false, null)} />
        {:else if sheet === 'voice'}<SpectrumWheel {name} size={176} /><WaveGlyph {name} size={120} />
        {:else}<CellGlyph {name} isMeter={'isMeter' in f.node.data && f.node.data.isMeter} size={200} interactive fine />{/if}
      </div>
    {/if}
  </div>
</figure>

<style>
  figure {
    margin: 0;
    padding: 10px 12px;
    background: var(--surface);
    border: 1px solid var(--line);
    border-radius: var(--radius);
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
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }
  .flow {
    position: relative;
  }
  .flow :global(.svelte-flow) {
    background: transparent;
  }
  .sheet {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 8px 16px;
    border-left: 1px dashed var(--line);
  }
</style>
