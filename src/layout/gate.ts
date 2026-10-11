/**
 * A gate (#234, the gate node; docs/language/mix.md: a gate): what the glyph draws it from. Its receivers, the voices it
 * plays, are wheels of their own, their sound wired into it.
 */
import type { CompileResult } from '../engine/program';

/** A gate's trigger, its receivers (the voices in its braid, as read) and its gate= cell, or null: not a gate. */
export function gateOf(result: CompileResult, name: string): { trigger: string; receivers: readonly string[]; open: string | null } | null {
  const c = result.cells.get(name);
  const trigger = c?.params.trigger;
  if (!c || typeof trigger !== 'string') return null;
  const open = c.params.gate;
  return { trigger, receivers: (c.mix ?? []).map((b) => b.voice.name), open: typeof open === 'string' && result.cells.has(open) ? open : null };
}
