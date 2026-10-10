/**
 * Sections as taps of the meter bus (a probe, docs/notes/selector-gates.md, round 4): a table whose entries are clocks
 * (`&parts step=&bar &keysBar &tuneBar &drumBar`, each entry stepping a section's cells) is drawn as a wheel with its
 * taps as sub-wheels: the meter's bus comes in once (`&bar` → `&parts`), and each tap's own net leaves from its place on
 * the table's track to what it steps — the meter's net split at the table into sub-nets the selector switches.
 *
 * The taps stay cells of their own (each a meter with its net), riding their table at their bulb's angle (`riders`), as
 * a junction rides its voice; the edges from the meter into them become one, into the table, and their splices into
 * the table (they are its sub-wheels) go.
 */
import { netsOf, type GraphEdge, type GraphModel } from '../engine/graph';

/** A tap riding its table: the table's id, and where round it (turns from 12 o'clock, clockwise) its bulb sits. */
export interface Rider {
  readonly host: string;
  readonly turn: number;
}

/** The model with each table of taps drawn as one wheel of sub-wheels; and the taps, each riding its table. */
export function tapped(model: GraphModel): { model: GraphModel; riders: Map<string, Rider> } {
  const riders = new Map<string, Rider>();
  const clocks = new Set(model.edges.filter((e) => e.port === 'step').map((e) => e.from));
  for (const n of model.nodes) {
    const c = n.cell;
    if (!c || c.mix || !c.units.length || !c.units.every((u) => u.atom.kind === 'ref')) continue;
    const entries = c.units.map((u) => (u.atom.kind === 'ref' ? `cell:${u.atom.name}` : ''));
    if (!entries.every((id) => clocks.has(id))) continue;
    entries.forEach((id, k) => riders.set(id, { host: n.id, turn: (k + 0.5) / entries.length }));
  }
  if (!riders.size) return { model, riders };
  const gone = new Set<string>();
  const added = new Map<string, GraphEdge>();
  for (const e of model.edges) {
    // a tap's splice into its table: it is the table's sub-wheel now
    if (e.port === 'braid' && riders.get(e.from)?.host === e.to) gone.add(e.id);
    // the meter into a tap: once, into the table (the meter's bus)
    const r = riders.get(e.to);
    if (r && e.port === 'step') {
      gone.add(e.id);
      const id = `${e.from}->${r.host}~bus`;
      if (!added.has(id)) added.set(id, { ...e, id, to: r.host, source: r.host, target: e.from });
    }
  }
  const edges = [...model.edges.filter((e) => !gone.has(e.id)), ...added.values()];
  // (a tap is a meter: a sub-net of its meter's bus, its steps traces of that net, not edges)
  const nodes = model.nodes.map((n) => (n.kind === 'cell' && riders.has(n.id) ? { ...n, isMeter: true } : n));
  return { model: { ...model, nodes, edges, nets: netsOf(nodes, edges) }, riders };
}
