/**
 * Which node draws a cell of the graph, and how large: the graph (`Graph.svelte`) and the wheels' contact
 * sheet (`tools/wheels/`) both place nodes by it.
 */
import type { GraphNode } from '../engine/graph';
import type { FlowNode } from './types';

/** An unnamed cell, hung small on its parent. */
export const PETAL = 44;

// physical cells: a meter with a motor, a belted cell — turntables
export const physical = (g: GraphNode) =>
  !g.petalOf &&
  (typeof g.cell.params.motor === 'number' || typeof g.cell.params.belt === 'number' || typeof g.cell.params.write === 'string' || typeof g.cell.params.body === 'string');

export function flowNodeOf(g: GraphNode, position: { x: number; y: number }, isPinned: boolean): FlowNode {
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
  // the sun of a day's law: a dial
  if (typeof g.cell.params.sun === 'string') return { id: g.id, type: 'sun', position, data: { name: g.cell.name, size: 220 } };
  // an oscilloscope: a screen
  if (typeof g.cell.params.scope === 'string') return { id: g.id, type: 'scope', position, data: { name: g.cell.name, size: 200 } };
  // (size= scales it: &bar size=2 twice as large)
  if (physical(g)) {
    // a turntable: raised over everything, moved only by its axle (held)
    const role = typeof g.cell.params.body === 'string' ? 'resonator' : typeof g.cell.params.motor === 'number' ? 'motor' : typeof g.cell.params.write === 'string' ? 'tape' : 'belt';
    return { id: g.id, type: 'material', position, draggable: false, zIndex: 10, data: { name: g.cell.name, size: (role === 'motor' ? 168 : 140) * g.cell.size, role, pinned: true } };
  }
  const size = (g.cell.root ? 176 : g.isMeter ? 148 : 128) * g.cell.size;
  return { id: g.id, type: 'cell', position, data: { name: g.cell.name, isMeter: g.isMeter, size, pinned: isPinned } };
}
