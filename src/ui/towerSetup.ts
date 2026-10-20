/**
 * The tower layout's setup for a piece (docs/notes/tower-strip.md): its graph with a socket into the card for each
 * thing it hears, its strata, and the layout's options that hold them. One place for the app (graphLayout.svelte.ts),
 * the examples' index (tools/examples-index.ts: each example's start chosen ahead for this layout too) and the probes.
 */
import type { GraphModel } from '@yggi/cells/engine/graph';
import type { CompileResult } from '@yggi/cells/engine/program';
import type { LayoutOptions } from '../layout/options';
import { towerLayers, withSockets } from '../layout/towerlayout';
import { nodeSections } from './sections';

export function towerSetup(program: CompileResult, model: GraphModel): { model: GraphModel; layered: ReturnType<typeof towerLayers>; options: Partial<LayoutOptions> } {
  const m = withSockets(program, model);
  const layered = towerLayers(program, model, m, { sections: new Map([...nodeSections(program, m)].map(([id, s]) => [id, s.k])) });
  return {
    model: m,
    layered,
    options: {
      heights: layered.targets,
      held: layered.held,
      strata: layered.strata,
      between: layered.between,
      lineUp: layered.lineUp,
      rainbow: layered.rainbow,
      aside: layered.aside,
      columns: layered.columns,
    },
  };
}
