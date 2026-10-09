/**
 * The arrangement as gates (a probe, docs/notes/selector-gates.md): a selector redrawn as the sequencer it is. Today a
 * selector reads a table of parts and its parts' sound goes through it to the sound card (`&song over=&parts`,
 * `&out … &song`). Gated, each part's sound goes straight to where the selector's went, and the selector sends a gate
 * up to each of the part's junctions instead: the junction is the voice's gate (a VCA), the selector the sequencer
 * that opens it, at the bottom of the tower. A selector is then a meter of the form: its gates are its net (a bus laid
 * as a tree through the junctions), as a meter's steps are. The table of parts goes; nothing else changes.
 *
 * This is a drawing of the model, not the model: no token on any line writes a gate, so it breaks "every name written
 * is one wire" and stays a probe until a spelling says it (#29, #234).
 */
import { netsOf, type GraphEdge, type GraphModel } from '../engine/graph';

/** The model with each selector's parts wired straight out and gated from below; the same model when it has none. */
export function gated(model: GraphModel): GraphModel {
  const cellOf = new Map(model.nodes.flatMap((n) => (n.cell ? [[n.id, n.cell] as const] : [])));
  const mixes = new Set([...cellOf].flatMap(([id, c]) => (c.mix && !c.sink ? [id] : [])));
  // a table of parts: a cell of refs only, each to a mix (its parts, in order)
  const partsOf = new Map<string, string[]>();
  for (const [id, c] of cellOf) {
    if (c.mix || !c.units.length || !c.units.every((u) => u.atom.kind === 'ref')) continue;
    const parts = model.edges.filter((e) => e.to === id && e.port === 'braid').map((e) => e.from);
    if (parts.length && parts.every((p) => mixes.has(p))) partsOf.set(id, parts);
  }
  const selections = model.edges.filter((e) => e.port === 'over' && partsOf.has(e.from));
  if (!selections.length) return model;
  const gone = new Set<string>();
  const added: GraphEdge[] = [];
  for (const sel of selections) {
    const selector = sel.to;
    const parts = partsOf.get(sel.from)!;
    gone.add(sel.id);
    for (const e of model.edges) if (e.to === sel.from && e.port === 'braid') gone.add(e.id);
    // where the selector's sound went (the sound card, a mix): now each part's, straight
    const outs = model.edges.filter((e) => e.from === selector && e.band !== 'sync' && e.port !== 'about');
    for (const out of outs) {
      gone.add(out.id);
      for (const part of parts)
        added.push({
          ...out,
          id: `${part}->${out.to}`,
          from: part,
          source: out.source === selector ? part : out.source,
          target: out.target === selector ? part : out.target,
          band: 'audio',
          pointer: false,
          width: 1,
        });
    }
    // a gate up to every junction of every part (the part's products: its voices' gates)
    for (const part of parts)
      for (const j of model.nodes)
        if (j.kind === 'junction' && `cell:${j.mix}` === part)
          added.push({
            ...sel,
            id: `gate:${selector}->${j.id}`,
            port: 'gate',
            band: 'sync',
            pointer: false,
            width: 1,
            from: selector,
            to: j.id,
            source: j.id,
            target: selector,
            transforms: [[]],
          });
  }
  const edges = [...model.edges.filter((e) => !gone.has(e.id)), ...added];
  // (a table of parts nothing reads any more is gone too)
  const used = new Set(edges.flatMap((e) => [e.from, e.to]));
  // a selector is a meter of the form: its gates are its net, as a meter's steps are (a bus through the junctions it
  // opens, laid as a tree: meterNet), not a wire to each
  const selectors = new Set(selections.map((e) => e.to));
  const nodes = model.nodes.filter((n) => !partsOf.has(n.id) || used.has(n.id)).map((n) => (n.kind === 'cell' && selectors.has(n.id) ? { ...n, isMeter: true } : n));
  return { ...model, nodes, edges, nets: netsOf(nodes, edges) };
}
