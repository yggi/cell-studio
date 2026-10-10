/**
 * The frequency tower (docs/notes/multiscale.md): each node's place on one logarithmic axis of time, from the constant
 * (a table nothing steps: DC, at the bottom) through the slow (the form, sections, a day) and the pulse (a bar, a beat)
 * to the audible (a voice at its pitch), with the sound card outside, above everything. As rows for the layered drawing
 * (`towerRanks`), the rows by time instead of by the signal path: a probe (`LayoutOptions.ranks`), off by default.
 */
import type { CompileResult } from '../engine/program';
import type { GraphModel } from '../engine/graph';
import { cellId } from '../engine/ids';

/**
 * Where on the tower a clocked cell sits: its step (how often it moves), its turn (how often it comes round), or between;
 * `emit`: by its step, but a cell that carries sound (a mix, a table of parts, the selector reading it, a tape) where its
 * output lives, by the sound it carries: a node sits at the rate of what it sends on, not of its own clock.
 */
export type TowerAt = 'step' | 'turn' | 'mid' | 'emit';

/**
 * Each node's height on the tower, in decades (log10 Hz): −Infinity for the constant (a table nothing steps), +Infinity
 * for the sound card (the outside). A clocked cell by its steps per second (its clock's, times its own rate when another
 * drives it) or its turn (that ÷ its steps); a voice by its pitch (one without, by its filter, else 1 kHz); a junction
 * at its voice's; a cell spliced into a clocked one, with no clock of its own, at its reader's height; a mix just above
 * the highest sound it carries.
 */
export function towerOf(program: CompileResult, model: GraphModel, at: TowerAt = 'step'): Map<string, number> {
  const v = new Map<string, number>();
  // (a note has no height: it sits by what it explains)
  const cellOf = new Map(model.nodes.flatMap((n) => (n.cell && !n.cell.note ? [[n.id, n.cell] as const] : [])));
  // (an instrument: a voice, or what a product's junction is: a resonator, a kit)
  const instruments = new Set(model.edges.flatMap((e) => (e.port === 'is' ? [e.from] : [])));
  // (what carries sound: a mix, a tape, a table of parts and the selector reading it: `emit` places them by it)
  const sounding = new Set(model.nodes.flatMap((n) => (n.cell?.mix && !n.cell.sink ? [n.id] : [])));
  for (const e of model.edges) if (e.band === 'audio' && cellOf.has(e.to) && !instruments.has(e.to)) sounding.add(e.to);
  // (a pattern of voices, a kit's groove: what it sends on is their sound)
  for (const e of model.edges) if (e.port === 'braid' && (cellOf.get(e.from)?.voice || instruments.has(e.from)) && cellOf.has(e.to) && !cellOf.get(e.to)!.sink) sounding.add(e.to);
  for (let grew = true; grew;) {
    grew = false;
    for (const e of model.edges)
      if ((e.port === 'braid' || e.port === 'over') && sounding.has(e.from) && !sounding.has(e.to) && !cellOf.get(e.to)?.sink) {
        sounding.add(e.to);
        grew = true;
      }
  }
  for (const [id, c] of cellOf) {
    if (c.sink) v.set(id, Infinity);
    else if (c.voice && c.freq > 0) v.set(id, Math.log10(c.freq));
    // (an instrument with no pitch, noise, a kit, a resonator: in the audible zone all the same, at its filter if it has one)
    else if (c.voice || instruments.has(id)) v.set(id, Math.log10(Number(c.params.hpf ?? c.params.lpf) || 1000));
    else if (at === 'emit' && sounding.has(id)) continue;
    else if (c.clock) {
      const info = program.clocks.get(c.clock);
      if (!info) continue;
      const step = info.perSecond * (c.clock === c.name ? 1 : c.rate);
      const turn = step / Math.max(1, c.steps);
      const hz = at === 'step' ? step : at === 'turn' ? turn : Math.sqrt(step * turn);
      if (hz > 0) v.set(id, Math.log10(hz));
    }
  }
  // a product's junction sounds at its voice's height
  for (const n of model.nodes) if (n.kind === 'junction' && v.has(cellId(n.voice))) v.set(n.id, v.get(cellId(n.voice))!);
  // what has no height of its own takes it from the flow: a part from the cell it is spliced into (it plays at that
  // rate), a mix from what it carries; repeated, as parts nest
  for (let i = 0; i < model.nodes.length; i++) {
    let grew = false;
    for (const [id, c] of cellOf) {
      if (v.has(id)) continue;
      const out = model.edges.filter((e) => e.from === id && e.port === 'braid' && v.has(e.to));
      const into = model.edges.filter((e) => e.to === id && (sounding.has(id) || e.port === 'mix' || e.port === 'braid') && e.band !== 'sync' && v.has(e.from));
      if ((c.mix || (at === 'emit' && sounding.has(id))) && into.length) v.set(id, Math.max(...into.map((e) => v.get(e.from)!)) + 0.01);
      else if (!c.mix && out.length) v.set(id, Math.max(...out.map((e) => v.get(e.to)!)));
      else continue;
      grew = true;
    }
    if (!grew) break;
  }
  for (const id of cellOf.keys()) if (!v.has(id)) v.set(id, -Infinity);
  return v;
}

/**
 * The tower as rows for the layered drawing (higher: nearer the top), `perDecade` rows to a decade; the constant one
 * row under the lowest, the sound card one over the highest. Only the order matters to the layered drawing: empty rows
 * close up.
 */
export function towerRanks(tower: ReadonlyMap<string, number>, perDecade = 1): Map<string, number> {
  const finite = [...tower.values()].filter(Number.isFinite);
  const lo = Math.min(0, ...finite);
  const hi = Math.max(0, ...finite);
  const rank = (x: number) => Math.round((x - lo) * perDecade) + 1;
  return new Map([...tower].map(([id, x]) => [id, x === -Infinity ? 0 : x === Infinity ? rank(hi) + 1 : rank(x)]));
}

/** The tower's zones (docs/notes/multiscale.md), from the bottom: the constant, the slow, the pulse, the audible, the outside. */
const ZONES = [-Infinity, Math.log10(0.5), Math.log10(20), Infinity];

/**
 * Rows by zone, then by the signal path: the tower decides a node's zone (constant, slow below 0.5 Hz, pulse, audible
 * from 20 Hz, the outside), and its rank in the flow (`flow`, start.ts: flowRanks) orders the rows within a zone.
 */
export function zoneRanks(tower: ReadonlyMap<string, number>, flow: ReadonlyMap<string, number>): Map<string, number> {
  const span = Math.max(0, ...flow.values()) + 1;
  const zone = (x: number) => (x === -Infinity ? 0 : x === Infinity ? ZONES.length : ZONES.findIndex((z, i) => x >= z && x < (ZONES[i + 1] ?? Infinity)) + 1);
  return new Map([...tower].map(([id, x]) => [id, zone(x) * span + (flow.get(id) ?? 0)]));
}

/** The tower's zones drawn (docs/notes/multiscale.md: the picture), from the bottom, each from its decade up. */
export const TOWER_ZONES = [
  { name: 'slow', from: -Infinity },
  { name: 'pulse', from: ZONES[1] },
  { name: 'audible', from: ZONES[2] },
] as const;

/**
 * Each node's span on the tower, in decades (`towerOf`): a clocked cell from its turn (how often it comes round) up to
 * its step (how often it moves), so nesting shows (a child's turn near its parent's step); a voice at its pitch, a mix
 * just above the sound it carries, a point. −Infinity: the constant; +Infinity: the sound card.
 */
export function towerSpans(program: CompileResult, model: GraphModel): Map<string, { at: number; lo: number }> {
  const step = towerOf(program, model, 'step');
  const turn = towerOf(program, model, 'turn');
  return new Map(
    [...step].map(([id, at]) => {
      const t = turn.get(id) ?? at;
      return [id, { at, lo: Number.isFinite(at) && Number.isFinite(t) && t < at ? t : at }];
    }),
  );
}
