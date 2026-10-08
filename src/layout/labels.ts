/**
 * Label templates. A label can hold fields, filled in from its cell as it is
 * now (a key that turns renames itself), and light formatting:
 *
 *   {notes}  the notes of a table or scale (C D E F G A B), or of a melody
 *   {tonic}  its first note          {mode}   its mode, bold: **Dorian**, **Minor** (*Aeolian*)
 *   {steps}  how many steps          {tempo}  beats a minute (a meter's beats: beat=, meter(…))
 *   {shift}  how far it is turned    {name}   &name
 *   {&key:tonic}  a field of another cell (for notes, which have none of their own)
 *
 *   **bold**   *italic*   \n a new line
 */
import { LABEL_FIELDS, type CompileResult, type Shifts } from '../engine/program';
import { entries, resolvePitch, semitones } from '../engine/helix';
import { flatten } from '../engine/flatten';
import { modeName, mod } from '../theory/modes';

const NAMES = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];

/**
 * A cell's fields, as text (null where a field doesn't apply). `need` names the fields wanted: the note
 * fields (notes, tonic, mode) read the whole table or melody, so they're worked out only when asked for
 * (a label is refilled whenever a table turns, for every node that has one).
 */
export function fieldsOf(result: CompileResult, name: string, shifts: Shifts, need?: ReadonlySet<string>): Record<string, string | null> {
  const c = result.cells.get(name);
  const out: Record<string, string | null> = { ...Object.fromEntries(LABEL_FIELDS.map((f) => [f, null])), name: `&${name}` };
  if (!c) return out;
  out.steps = String(c.steps);
  out.shift = String(shifts(name));
  const clock = c.clock ? result.clocks.get(c.clock) : null;
  if (clock) out.tempo = String(Math.round((clock.perSecond * c.rate * 60) / (c.clock === name ? c.beat : 1)));
  if (need && !need.has('notes') && !need.has('tonic') && !need.has('mode')) return out;
  try {
    // a table: its entries; a melody: what it plays, in order
    const pitchOf = (value: number, alter: number) => {
      const r = resolvePitch(result, name, value, alter, shifts);
      return semitones(result, r.root, r.position);
    };
    const table = [...result.cells.values()].some((x) => x.over === name);
    const pitches =
      table || c.root
        ? entries(result, name, shifts(name)).map((e) => pitchOf(e.value, e.alter))
        : flatten(result, name, shifts, null, undefined, 0, c.context).map((e) => pitchOf(e.value, e.alter));
    if (pitches.length) {
      const names = pitches.map((p) => NAMES[mod(Math.round(p), 12)]);
      out.notes = (pitches.length > 16 ? [...names.slice(0, 16), '…'] : names).join(' ');
      out.tonic = names[0];
      // (the two with a common name say it first: **Minor** (*Aeolian*), **Major** (*Ionian*))
      const m = table ? modeName(pitches) : null;
      const common: Record<string, string> = { Aeolian: 'Minor', Ionian: 'Major' };
      out.mode = m && (common[m] ? `**${common[m]}** (*${m}*)` : `**${m}**`);
    }
  } catch {
    /* not resolvable: no note fields */
  }
  return out;
}

const escape = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * A label, filled in and formatted, as safe HTML (the text is escaped before
 * any formatting is applied). Unknown fields stay as written.
 */
export function formatLabel(result: CompileResult, name: string, template: string, shifts: Shifts): string {
  const need = new Set([...template.matchAll(/\{(?:&[A-Za-z_][A-Za-z0-9_]*:)?([a-z]+)\}/g)].map((m) => m[1]));
  const own = fieldsOf(result, name, shifts, need);
  const filled = template.replace(/\{(?:&([A-Za-z_][A-Za-z0-9_]*):)?([a-z]+)\}/g, (whole, cell: string | undefined, field: string) => {
    const f = cell ? (result.cells.get(cell) ? fieldsOf(result, cell, shifts, need) : null) : own;
    const v = f?.[field];
    return v ?? whole;
  });
  return escape(filled)
    .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
    .replace(/\*(.+?)\*/g, '<i>$1</i>')
    .replace(/\\n/g, '<br>');
}

/** A label as plain text (fields filled, formatting dropped): for titles and tooltips. */
export function labelText(result: CompileResult, name: string, template: string, shifts: Shifts): string {
  return formatLabel(result, name, template, shifts)
    .replace(/<br>/g, ' · ')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}
