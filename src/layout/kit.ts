/**
 * A kit's wheel (a table of voices, `&kit &kd &sd &hh`: docs/language/sound.md), drawn as a drum kit seen from the
 * front: each member a piece of the kit by the General MIDI drum note it plays (its `note=`, else the next free one from
 * 36, as MIDI out sends it: cells' `kitNotes`, decision 075; 36 the kick, 38 the snare, 42 46 the hi-hat, 45 48 toms, 41
 * 43 the floor tom, 49 51 the cymbals; any other note a hand percussion), the kick in the middle, the snare and the
 * hi-hat on the left, the toms over the kick, the floor tom on the right, the cymbals on top. Each member that only the
 * kit plays is a bulb on it (decision 021), where its piece is. Pure geometry, shared by the graph (where a bulb's edges
 * leave) and the glyph (ui/KitGlyph.svelte).
 */
import type { CompileResult } from '@yggi/cells/engine/program';
import { kitNotes } from '@yggi/cells/engine/midi';
import { refsOf } from '@yggi/cells/engine/readers';

/** A kit's members (the voices in its braid, in order: 0 the first), or null: not a table of voices (a groove steps). */
export function kitOf(result: CompileResult, name: string): readonly string[] | null {
  const c = result.cells.get(name);
  if (!c?.kit || c.step || typeof c.params.scope === 'string') return null;
  return refsOf(c);
}

/** What a member is in a drum kit. */
export type DrumRole = 'kick' | 'snare' | 'hihat' | 'tom' | 'floor' | 'crash' | 'ride' | 'perc';

/** A drum's note as a compiled piece writes it (its `note=`: `ResolvedCell.drumNote`), or undefined: it writes none. */
export const drumNoteIn =
  (result: CompileResult) =>
  (member: string): number | undefined =>
    result.cells.get(member)?.drumNote;

/** A member's piece of the kit, by its General MIDI drum note. */
function roleOf(n: number | undefined): DrumRole {
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
 * Where a kit's members sit, `size` px across: each its piece's centre from the kit's (px), its radius and its role, by
 * the note it plays (`noteOf` its `note=`, `drumNoteIn`; one that writes none the next free from 36, `kitNotes`). A
 * second piece of a role takes its next place; past the places a role has, a member is a hand percussion's.
 */
export function drumPlaces(size: number, members: readonly string[], noteOf: (member: string) => number | null | undefined): { x: number; y: number; r: number; role: DrumRole }[] {
  const notes = kitNotes(members, noteOf);
  const used = new Map<DrumRole, number>();
  return members.map((m) => {
    let role = roleOf(notes.get(m));
    let i = used.get(role) ?? 0;
    if (i >= PLACE[role].length) [role, i] = ['perc', used.get('perc') ?? 0];
    used.set(role, i + 1);
    const p = PLACE[role][i % PLACE[role].length];
    return { x: p.x * size, y: p.y * size, r: p.r * size, role };
  });
}
