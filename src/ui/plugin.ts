/**
 * Running a plugin's code (engine/plugins.ts reads the block; this is the one place that runs it). The code defines
 * `draw(view, h, g)`, which returns the elements to draw (pluginTree.ts), and may define `describe(view)`, which tells
 * a screen reader where a dial stands. It runs on the main thread with the page's full powers: only code that is trusted gets here
 * (pluginTrust.svelte.ts: the examples that ship with the app, and what the user chose to run).
 */
import { polar, ringSegment } from '../layout/geometry';
import { blockColour } from './theme';
import { boundedTree, h, type PNode } from './pluginTree';
import type { PluginView } from './pluginView';

interface DialText {
  readonly text: string;
  readonly now: number;
  readonly min: number;
  readonly max: number;
}
export interface PluginCode {
  readonly draw: (view: PluginView, h: unknown, g: unknown) => unknown;
  readonly describe?: (view: PluginView) => DialText;
}

/** What a drawing may call besides `h`: the wheels' own geometry (layout/geometry.ts) and colour scale (theme.ts). */
const GEOMETRY = { polar, ringSegment, blockColour };

const made = new Map<string, PluginCode | Error>();

/** A plugin's code as functions, or why it does not load (once per text). */
export function loadPlugin(code: string): PluginCode | Error {
  let hit = made.get(code);
  if (!hit) {
    try {
      // The code of a piece is run here, and only once trusted (pluginTrust.svelte.ts). It is eval: no sandbox, full trust.
      const factory = new Function(
        `"use strict";\n${code}\n;return { draw: typeof draw === 'function' ? draw : undefined, describe: typeof describe === 'function' ? describe : undefined };`,
      );
      const fns = factory() as Partial<PluginCode>;
      hit = fns.draw ? { draw: fns.draw, describe: fns.describe } : new Error('defines no function draw(view, h, g)');
    } catch (e) {
      hit = e instanceof Error ? e : new Error(String(e));
    }
    made.set(code, hit);
  }
  return hit;
}

/** Draw: the elements, or the error the code threw (a drawing that fails draws nothing, and says why). */
export function drawPlugin(code: PluginCode, view: PluginView): { roots: PNode[] } | Error {
  try {
    // (what it returned is copied into a tree of our own, bounded and plain, before anything draws it)
    return { roots: boundedTree(code.draw(view, h, GEOMETRY)) };
  } catch (e) {
    return e instanceof Error ? e : new Error(String(e));
  }
}
