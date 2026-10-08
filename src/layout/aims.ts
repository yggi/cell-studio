/**
 * A tape's heads in the forces: each tape turns to face its heads towards what they connect to (its write source, its
 * read heads' cells), and those turn round it towards their heads (layout/tape.ts draws the heads).
 */
import type { GraphModel } from '../engine/graph';
import type { Aim } from './quality';
import { fitTurn, headOffset, tapeHeads, UNTURNED } from './tape';
import { positionOf, type LayoutState } from './state';

/** What a tape's head connects to (its write source, or a read head's cell) and how far round from the write head that head sits (radians). */
export interface TapeFace {
  readonly tape: string;
  readonly to: string;
  readonly offset: number;
  readonly write: boolean;
}

/** Every tape's heads and what they connect to (layout/tape.ts). */
export function tapeFaces(model: GraphModel): TapeFace[] {
  // (hand-made graphs, in tests, may have nodes without a cell; a product's junction has none)
  const cells = model.nodes.flatMap((n) => (n.cell ? [n.cell] : [])); // (as the tape draws its heads: every cell, petals too)
  const byName = new Map(model.nodes.flatMap((n) => (!n.petalOf && n.cell ? [[n.cell.name, { id: n.id, cell: n.cell }] as const] : [])));
  const faces: TapeFace[] = [];
  for (const tape of byName.values()) {
    const write = tape.cell.params.write;
    if (typeof write !== 'string') continue;
    const src = byName.get(write);
    if (src) faces.push({ tape: tape.id, to: src.id, offset: 0, write: true });
    const { heads, length } = tapeHeads(tape.cell, cells);
    for (const h of heads) {
      const n = byName.get(h.name);
      if (n) faces.push({ tape: tape.id, to: n.id, offset: (headOffset(h.at, length) * Math.PI) / 180, write: false });
    }
  }
  return faces;
}

/** Each tape turned to face its heads towards what they connect to (busy cells count more: they move less). */
export function fitTurns(s: LayoutState, at: (id: string) => { x: number; y: number } | undefined): Map<string, number> {
  const turns = new Map<string, number>();
  const byTape = new Map<string, TapeFace[]>();
  for (const f of s.faces) (byTape.get(f.tape) ?? byTape.set(f.tape, []).get(f.tape)!).push(f);
  for (const [tape, fs] of byTape) {
    const t = at(tape);
    if (!t) continue;
    const turn = fitTurn(
      fs.flatMap((f) => {
        const c = at(f.to);
        return c ? [{ angle: Math.atan2(c.y - t.y, c.x - t.x), offset: f.offset, weight: s.degree.get(f.to) ?? 1 }] : [];
      }),
    );
    turns.set(tape, turn ?? s.turns.get(tape) ?? (UNTURNED * Math.PI) / 180);
  }
  return turns;
}

/** Where each head's cell should be, seen from its tape (radians), with the tapes as they're turned now. */
export function aims(s: LayoutState): Aim[] {
  return s.faces.map((f) => ({ from: f.tape, to: f.to, angle: (s.turns.get(f.tape) ?? 0) + f.offset }));
}

/**
 * Each tape turns to face its heads towards what they connect to; then each of those turns round the tape
 * (at the distance it is now) towards its head. The two share that turn, the one with fewer edges moving more.
 */
export function stepAims(s: LayoutState, alpha: number): void {
  if (!s.faces.length) return;
  s.turns = fitTurns(s, (id) => positionOf(s, id));
  for (const { from, to, angle } of aims(s)) {
    const a = s.byId.get(from);
    const b = s.byId.get(to);
    if (!a || !b) continue;
    const len = Math.hypot((b.x ?? 0) - (a.x ?? 0), (b.y ?? 0) - (a.y ?? 0)) || 1;
    const dx = ((a.x ?? 0) + Math.cos(angle) * len - (b.x ?? 0)) * alpha;
    const dy = ((a.y ?? 0) + Math.sin(angle) * len - (b.y ?? 0)) * alpha;
    const [da, db] = [s.degree.get(a.id) ?? 1, s.degree.get(b.id) ?? 1];
    const share = da / (da + db); // (b's part of the turn)
    b.vx = (b.vx ?? 0) + dx * share;
    b.vy = (b.vy ?? 0) + dy * share;
    a.vx = (a.vx ?? 0) - dx * (1 - share);
    a.vy = (a.vy ?? 0) - dy * (1 - share);
  }
}
