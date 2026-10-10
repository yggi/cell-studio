/**
 * Which node draws a cell of the graph, and how large: the graph (`Graph.svelte`) and the wheels' contact
 * sheet (`tools/gallery/`) both place nodes by it.
 */
import { isTurntable, type GraphNode } from '../engine/graph';
import type { CompileResult } from '../engine/program';
import { pluginOf } from '../layout/show';
import { JUNCTION_ROOM } from '../layout/options';
import type { FlowNode } from './types';

/** An unnamed cell, hung small on its parent. */
export const PETAL = 44;

// physical cells: a meter with a motor, a belted cell — turntables
export const physical = (g: GraphNode) => !g.petalOf && !!g.cell && isTurntable(g.cell);

/**
 * `turn`: a tape's, in degrees (where the layout faced its write head; layout/tape.ts), or a table of taps' (a probe,
 * layout/taps.ts); none: unturned.
 * `meters`: each meter's place among the meters, for its colour (layout/meters.ts).
 * `program`: the piece, to know the plugins that draw cells (engine/plugins.ts).
 */
export function flowNodeOf(
  g: GraphNode,
  position: { x: number; y: number },
  isPinned: boolean,
  turn?: number,
  meters?: { index: ReadonlyMap<string, number> },
  program?: CompileResult,
): FlowNode {
  // a product's junction (graph.ts): a dot where its wires meet, set on its voice's rim (layout/junctions.ts); not a
  // cell, so nothing to open, drag, select or delete
  if (g.kind === 'junction')
    return {
      id: g.id,
      type: 'junction',
      position,
      draggable: false,
      selectable: false,
      deletable: false,
      connectable: false,
      data: { name: g.id, voice: g.voice, mix: g.mix, size: JUNCTION_ROOM },
    };
  if (g.petalOf) {
    if (g.kind === 'voice') return { id: g.id, type: 'voice', position, draggable: false, data: { name: g.cell.name, summary: '', size: PETAL, pinned: false, petal: true } };
    return { id: g.id, type: 'cell', position, draggable: false, data: { name: g.cell.name, isMeter: false, size: PETAL, pinned: false, petal: true } };
  }
  if (g.kind === 'voice') {
    // (a resonator is a voice too — but a body: a turntable, struck and damped and bowed by hand)
    if (typeof g.cell.params.body === 'string')
      return { id: g.id, type: 'material', position, draggable: false, zIndex: 10, data: { name: g.cell.name, size: 140 * g.cell.size, role: 'resonator', pinned: true } };
    const p = g.cell.params;
    const src = p.s === undefined ? `braid${g.cell.map ? ' ' + (g.cell.map.kind === 'table' ? '&' + g.cell.map.table : g.cell.map.kind) : ''}` : String(p.s);
    const summary = ['white', 'pink', 'brown'].includes(src) ? src : `${src} · ${+g.cell.freq.toFixed(2)}`;
    return { id: g.id, type: 'voice', position, data: { name: g.cell.name, summary, size: 120 * g.cell.size, pinned: isPinned } };
  }
  // a cell a plugin of the piece draws (show=name): its wheel, as large as the plugin says
  const plugin = program && pluginOf(program, g.cell.name);
  if (plugin) return { id: g.id, type: 'plugin', position, data: { name: g.cell.name, size: plugin.size, plugin: plugin.name } };
  // an oscilloscope: a screen
  if (typeof g.cell.params.scope === 'string') return { id: g.id, type: 'scope', position, data: { name: g.cell.name, size: 200 } };
  // (size= scales it: &bar size=2 twice as large)
  if (physical(g)) {
    // a turntable: raised over everything, moved only by its axle (held)
    const role =
      typeof g.cell.params.body === 'string' ? 'resonator' : typeof g.cell.params.motor === 'number' ? 'motor' : typeof g.cell.params.write === 'string' ? 'tape' : 'belt';
    return {
      id: g.id,
      type: 'material',
      position,
      draggable: false,
      zIndex: 10,
      data: { name: g.cell.name, size: (role === 'motor' ? 168 : 140) * g.cell.size, role, pinned: true, ...(role === 'tape' && turn !== undefined ? { turn } : {}) },
    };
  }
  const size = (g.cell.root ? 176 : g.isMeter ? 148 : 128) * g.cell.size;
  const meterIndex = meters?.index.get(g.id);
  return {
    id: g.id,
    type: 'cell',
    position,
    data: {
      name: g.cell.name,
      isMeter: g.isMeter,
      size,
      pinned: isPinned,
      ...(meterIndex !== undefined ? { meterIndex } : {}),
      ...(g.reach?.below ? { below: g.reach.below } : {}),
      // (a table of taps turned to face what its taps step: a probe, layout/taps.ts)
      ...(turn !== undefined ? { turn } : {}),
    },
  };
}
