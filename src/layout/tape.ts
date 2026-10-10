/**
 * Where a tape's heads sit round its wheel. What is fixed is how far apart they are: a read head sits
 * further round (clockwise) from the write head by how far along the tape it reads (`at=` seconds of
 * `length=`). The wheel as a whole is free to turn: the layout turns it so its heads face what they
 * connect to (`fitTurn`, aims.ts), and the tape's node draws it turned (MaterialNode.svelte).
 */
type Params = Readonly<Record<string, unknown>>;

export interface TapeHeads {
  /** Its read heads: the cells with play= this tape, and where on the tape they read (a clock at= reads at 0). */
  readonly heads: readonly { name: string; at: number }[];
  /** The tape's length round the wheel, s: its loop, or (an open reel) a little past the furthest head. */
  readonly length: number;
}

export function tapeHeads(tape: { name: string; params: Params }, cells: Iterable<{ name: string; params: Params }>): TapeHeads {
  const heads = [...cells].filter((h) => h.params.play === tape.name).map((h) => ({ name: h.name, at: typeof h.params.at === 'number' ? h.params.at : 0 }));
  const loop = typeof tape.params.length === 'number' && tape.params.length > 0;
  return { heads, length: loop ? (tape.params.length as number) : Math.max(1, ...heads.map((h) => h.at)) * 1.25 };
}

/** A cell drawn as a tape's wheel (a turntable with heads; a resonator's body or a motor drawn as theirs), and its size there before size= (px). */
export const drawnAsTape = (c: { params: Params }) => typeof c.params.write === 'string' && typeof c.params.body !== 'string' && typeof c.params.motor !== 'number';
export const TAPE_SIZE = 140;

/** A tape's turn when nothing says otherwise, degrees (screen: 0 to the right, clockwise): the write head on top. */
export const UNTURNED = -90;

/** How far round from the write head a read head sits, degrees: by how far along the tape it reads. */
export const headOffset = (at: number, length: number) => (at / length) * 360;

/** A head's angle on a tape turned by `turn` (where its write head sits), degrees. */
export const headAngle = (at: number, length: number, turn = UNTURNED) => turn + headOffset(at, length);

/**
 * The turn that best faces each head towards what it connects to: the weighted circular mean of
 * (where each one is, seen from the tape) − (its head's offset), radians. `null` when there's nothing to face.
 */
export function fitTurn(faces: readonly { angle: number; offset: number; weight: number }[]): number | null {
  let s = 0;
  let c = 0;
  for (const f of faces) {
    s += f.weight * Math.sin(f.angle - f.offset);
    c += f.weight * Math.cos(f.angle - f.offset);
  }
  return Math.hypot(s, c) < 1e-9 ? null : Math.atan2(s, c);
}

/** A read head drawn as a bulb on its tape's wheel: where it sits (seen from the tape's centre) and how big it is. */
export interface HeadBulb {
  readonly name: string;
  readonly at: number;
  /** How far round from the write head, degrees (headOffset). */
  readonly offset: number;
  /** From the tape's centre to the bulb's hub, px. */
  readonly dist: number;
  /** The bulb's radius, px. */
  readonly r: number;
}

/**
 * A tape's read heads as bulbs round its wheel (`size` px across), each just outside the rim on its head's ray: they
 * stay where the heads are while the tape runs under them, and turn with the wheel when the layout turns it. Only heads
 * whose place on the tape is written (`at=` seconds: a clock's isn't known to the drawing), and only those with room:
 * clockwise from the write head, a head whose bulb, at the smallest (9 px, or a quarter of the radius on a small tape),
 * would touch the write head or a bulb before it stays a node of its own (two heads at one place, a head on the write
 * head). All one size, as big as the nearest two leave room for, up to a quarter of the radius.
 */
export function headBulbs(tape: { name: string; params: Params }, cells: Iterable<{ name: string; params: Params }>, size: number): HeadBulb[] {
  const all = [...cells];
  const { heads, length } = tapeHeads(tape, all);
  const at = new Map(all.map((c) => [c.name, c.params.at]));
  const placed = heads.filter((h) => at.get(h.name) === undefined || typeof at.get(h.name) === 'number');
  const R = size / 2;
  const [least, most] = [Math.min(9, R * 0.25), R * 0.25];
  // (two neighbours' hubs (R + r + 2) out, 2r and a gap of 6 apart: 2 (R + r + 2) sin(gap / 2) ≥ 2r + 6)
  const room = (r: number) => (2 * Math.asin(Math.min(1, (r + 3) / (R + r + 2))) * 180) / Math.PI;
  const apart = (a: number, b: number) => Math.min(Math.abs(a - b), 360 - Math.abs(a - b));
  const kept: { name: string; at: number; offset: number }[] = [];
  for (const h of placed.map((h) => ({ ...h, offset: ((headOffset(h.at, length) % 360) + 360) % 360 })).sort((a, b) => a.offset - b.offset))
    if ([0, ...kept.map((k) => k.offset)].every((o) => apart(o, h.offset) >= room(least))) kept.push(h);
  if (!kept.length) return [];
  const round = [0, ...kept.map((k) => k.offset)];
  const gap = Math.min(...round.map((a, i) => (i + 1 < round.length ? round[i + 1] - a : 360 - a)));
  const s = Math.sin((gap * Math.PI) / 360);
  const r = Math.max(least, Math.min(most, ((R + 2) * s - 3) / Math.max(0.2, 1 - s)));
  return kept.map((h) => ({ ...h, dist: R + r + 2, r }));
}
