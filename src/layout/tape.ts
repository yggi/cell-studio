/**
 * Where a tape's heads sit round its wheel: the write head at the top, each read head further round
 * (clockwise) by how far along the tape it reads (`at=` seconds of `length=`). The tape's node draws
 * them there (MaterialNode.svelte) and the layout turns what they connect to towards them (physics.ts).
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

/** The write head's angle, in degrees (screen: 0 to the right, clockwise): the top. */
export const WRITE_ANGLE = -90;

/** A read head's angle, in degrees: the top, then clockwise by how far along the tape it reads. */
export const headAngle = (at: number, length: number) => WRITE_ANGLE + (at / length) * 360;
