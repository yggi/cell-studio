/**
 * Which node draws a cell of the graph, and how large: the graph (`Graph.svelte`) and the wheels' contact
 * sheet (`tools/gallery/`) both place nodes by it.
 */
import { isTurntable, type GraphNode } from '../engine/graph';
import type { CompileResult } from '../engine/program';
import { pluginOf } from '../layout/show';
import { wheelOf } from '../layout/wheels';
import { VOICE_SIZE } from '../layout/voice';
import { JUNCTION_ROOM } from '../layout/options';
import { TAPE_SIZE } from '../layout/tape';
import type { FlowNode } from './types';

/** An unnamed cell, hung small on its parent. */
export const PETAL = 44;

// physical cells: a meter with a motor, a belted cell — turntables
export const physical = (g: GraphNode) => !g.petalOf && !!g.cell && isTurntable(g.cell);

/**
 * `turn`: a tape's, in degrees (where the layout faced its write head; layout/tape.ts); none: unturned.
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
  // a product's junction (graph.ts): an unnamed gate, a small meter set on its voice's rim (layout/junctions.ts); not a
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
      // (nothing to do on it, so no tab stop either)
      focusable: false,
      data: { name: g.id, voice: g.voice, mix: g.mix, size: 2 * JUNCTION_ROOM, notes: g.notes, levels: g.levels, gain: g.gain },
    };
  // (what draws it: layout/wheels.ts)
  const wheel = wheelOf(g, program);
  if (g.petalOf) {
    if (g.kind === 'voice') return { id: g.id, type: 'voice', position, draggable: false, data: { name: g.cell.name, summary: '', size: PETAL, pinned: false, petal: true } };
    return { id: g.id, type: 'cell', position, draggable: false, data: { name: g.cell.name, isMeter: false, size: PETAL, pinned: false, petal: true } };
  }
  // a turntable: raised over everything, moved only by its axle (held); size= scales it
  if (wheel === 'resonator' || wheel === 'motor' || wheel === 'tape' || wheel === 'belt')
    return {
      id: g.id,
      type: 'material',
      position,
      draggable: false,
      zIndex: 10,
      data: {
        name: g.cell.name,
        size: (wheel === 'resonator' ? 140 : wheel === 'motor' ? 168 : TAPE_SIZE) * g.cell.size,
        role: wheel,
        pinned: true,
        ...(wheel === 'tape' && turn !== undefined ? { turn } : {}),
      },
    };
  if (g.kind === 'voice') {
    const p = g.cell.params;
    const src = p.s === undefined ? `braid${g.cell.map ? ' ' + (g.cell.map.kind === 'table' ? '&' + g.cell.map.table : g.cell.map.kind) : ''}` : String(p.s);
    const summary = ['white', 'pink', 'brown'].includes(src) ? src : `${src} · ${+g.cell.freq.toFixed(2)}`;
    return { id: g.id, type: 'voice', position, data: { name: g.cell.name, summary, size: VOICE_SIZE * g.cell.size, pinned: isPinned } };
  }
  // a cell a plugin of the piece draws (show=name): its wheel, as large as the plugin says
  const plugin = wheel === 'plugin' && program ? pluginOf(program, g.cell.name) : null;
  if (plugin) return { id: g.id, type: 'plugin', position, data: { name: g.cell.name, size: plugin.size, plugin: plugin.name } };
  // (a drum kit: its pieces inside it, a little larger)
  const size = (g.cell.root ? 176 : g.isMeter ? 148 : wheel === 'kit' ? 168 : 128) * g.cell.size;
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
    },
  };
}
