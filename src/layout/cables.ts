/**
 * Patch cables dragged in the graph (#555, yggi/cells decision 067 §4, decision 069 §4): what a cable from a cell
 * carries, and what dropping it on a jack, or pulling it off one, writes. Each is one line of the text rewritten by
 * cells' `patch` and `unpatch` (`@yggi/cells/engine/patch`), so the text stays the single source of truth and undo
 * is the editor's; a drop the text can't take (cells' `PatchError`) writes nothing and says why.
 */
import { patch, unpatch, PatchError, type Jack } from '@yggi/cells/engine/patch';
import { soundRole } from '@yggi/cells/engine/outs';
import type { CompileResult } from '@yggi/cells/engine/program';
import { resolveSeed } from '@yggi/cells/repository/library';

/** What a cable carries: sound, or a level or a share (`jacksOf`'s bands). */
export type Band = Jack['band'];

/**
 * What a cable from &name carries: sound from a cell that makes, mixes or gates it (cells' `soundRole`: a voice, a
 * kit, an instrument, a module's mix), a level or a share from any other (an LFO, an envelope, a value); none from a
 * card or a note, which nothing is patched from.
 */
export function bandOf(result: CompileResult, name: string): Band | null {
  const c = result.cells.get(name);
  if (!c || c.note) return null;
  const role = soundRole(result, c);
  if (role === 'card') return null;
  return role ? 'audio' : 'cv';
}

/** Does a jack take a cable of this band: shown and lit while one is dragged (decision 069 §4). */
export const takes = (jack: Jack, band: Band): boolean => jack.band === band;

/** A drop's outcome: the text rewritten, or why the text can't take it (nothing written). */
export type Drop = { readonly ok: true; readonly text: string } | { readonly ok: false; readonly message: string };

const attempt = (rewrite: () => string): Drop => {
  try {
    return { ok: true, text: rewrite() };
  } catch (e) {
    if (e instanceof PatchError) return { ok: false, message: e.message };
    throw e;
  }
};

/** A cable from &from dropped on &cell's `port`. */
export const plug = (text: string, cell: string, port: string, from: string): Drop => attempt(() => patch(text, cell, port, from, resolveSeed));

/** The cable from &from pulled off &cell's `port`: the jack back at its knob. */
export const pull = (text: string, cell: string, port: string, from: string): Drop => attempt(() => unpatch(text, cell, port, from, resolveSeed));

/** A cable moved from one jack to another: pulled, then plugged; if the new jack refuses it, nothing is written. */
export function move(text: string, from: string, off: { readonly cell: string; readonly port: string }, on: { readonly cell: string; readonly port: string }): Drop {
  const pulled = pull(text, off.cell, off.port, from);
  return pulled.ok ? plug(pulled.text, on.cell, on.port, from) : pulled;
}
