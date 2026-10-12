/**
 * A kit's wheel (a table of voices, `&kit &kd &sd &hh`: docs/language/sound.md), drawn as a drum kit seen from the
 * front: each member a piece of the kit by its name (the General MIDI drum names: `bd`/`kd`/`kick` the kick, `sd` the
 * snare, `hh` `oh` the hi-hat, `lt` `mt` `ht` toms, `crash`, `ride`; any other name a hand percussion), the kick in
 * the middle, the snare and the hi-hat on the left, the toms over the kick, the floor tom on the right, the cymbals on
 * top. Each member that only the kit plays is a bulb on it (decision 021), where its piece is. Pure geometry, shared by
 * the graph (where a bulb's edges leave) and the glyph (ui/KitGlyph.svelte).
 */
import type { CompileResult } from '../engine/program';
import { gmDrumNote } from '../engine/midi';
import { refsOf } from '../engine/readers';

/** A kit's members (the voices in its braid, in order: 0 the first), or null: not a table of voices (a groove steps). */
export function kitOf(result: CompileResult, name: string): readonly string[] | null {
  const c = result.cells.get(name);
  if (!c?.kit || c.step || typeof c.params.scope === 'string') return null;
  return refsOf(c);
}

/** What a member is in a drum kit. */
export type DrumRole = 'kick' | 'snare' | 'hihat' | 'tom' | 'floor' | 'crash' | 'ride' | 'perc';

/** A member's piece of the kit, by its name's General MIDI drum note. */
function roleOf(name: string): DrumRole {
  const n = gmDrumNote(name);
  if (n === 35 || n === 36) return 'kick';
  if (n === 37 || n === 38 || n === 40 || n === 39) return 'snare';
  if (n === 42 || n === 44 || n === 46) return 'hihat';
  if (n === 41 || n === 43) return 'floor';
  if (n === 45 || n === 47 || n === 48 || n === 50) return 'tom';
  if (n === 49 || n === 52 || n === 55 || n === 57) return 'crash';
  if (n === 51 || n === 53 || n === 59) return 'ride';
  return 'perc';
}

/** Where each piece sits and how large, in parts of the kit's size, from its centre (x right, y down). */
const PLACE: Readonly<Record<DrumRole, readonly { x: number; y: number; r: number }[]>> = {
  kick: [{ x: 0, y: 0.17, r: 0.25 }],
  snare: [
    { x: -0.29, y: 0.1, r: 0.13 },
    { x: -0.3, y: 0.32, r: 0.1 },
  ],
  hihat: [
    { x: -0.36, y: -0.16, r: 0.13 },
    { x: -0.42, y: 0.02, r: 0.11 },
  ],
  tom: [
    { x: -0.11, y: -0.15, r: 0.1 },
    { x: 0.11, y: -0.15, r: 0.1 },
    { x: 0, y: -0.3, r: 0.09 },
  ],
  floor: [
    { x: 0.31, y: 0.12, r: 0.14 },
    { x: 0.35, y: 0.34, r: 0.11 },
  ],
  crash: [
    { x: -0.2, y: -0.36, r: 0.14 },
    { x: 0.42, y: -0.08, r: 0.12 },
  ],
  ride: [
    { x: 0.27, y: -0.32, r: 0.15 },
    { x: 0.44, y: 0.12, r: 0.11 },
  ],
  perc: [
    { x: 0, y: 0.47, r: 0.08 },
    { x: -0.17, y: 0.44, r: 0.08 },
    { x: 0.17, y: 0.44, r: 0.08 },
    { x: -0.45, y: 0.3, r: 0.07 },
    { x: 0.45, y: 0.32, r: 0.07 },
  ],
};

/**
 * Where a kit's members sit, `size` px across: each its piece's centre from the kit's (px), its radius and its role. A
 * second piece of a role takes its next place; past the places a role has, a member is a hand percussion's.
 */
export function drumPlaces(size: number, members: readonly string[]): { x: number; y: number; r: number; role: DrumRole }[] {
  const used = new Map<DrumRole, number>();
  return members.map((m) => {
    let role = roleOf(m);
    let i = used.get(role) ?? 0;
    if (i >= PLACE[role].length) [role, i] = ['perc', used.get('perc') ?? 0];
    used.set(role, i + 1);
    const p = PLACE[role][i % PLACE[role].length];
    return { x: p.x * size, y: p.y * size, r: p.r * size, role };
  });
}
