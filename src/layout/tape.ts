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
