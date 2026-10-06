/**
 * `window.cellStudio`, for measuring from outside (the browser console, `tools/golden.mjs`, the smoke
 * test); documented in docs/testing.md.
 */
import { codeShifts, compileSource, type CompileResult } from './engine/compile';
import { blockLevels, loudness, renderLength, renderPiece, sampleHash } from './audio/render';
import type { Player } from './audio/player';

export function installDebugHook(openPiece: () => CompileResult, player: Player): void {
  if (typeof window === 'undefined') return;
  (window as unknown as { cellStudio: unknown }).cellStudio = {
    // measure(seconds?) renders the open piece and returns {rms, peak, clipped} in dB below full scale
    measure: async (seconds?: number) => {
      const r = openPiece();
      return loudness(await renderPiece(r, codeShifts(r), seconds));
    },
    // the default render length in seconds
    length: () => renderLength(openPiece()),
    // how the engine's windows went: where they were worked out, how long they took (#15)
    engine: () => player.engineStats(),
    // render(source, seconds) renders any source (not just the open piece), with a hash of the samples and
    // the level of every block of them: for checking a refactor leaves every piece sounding the same (`tools/golden.mjs`)
    render: async (source: string, seconds?: number) => {
      const r = compileSource(source, { SAMPLE_RATE: 44100, A4: 440 });
      const buf = await renderPiece(r, codeShifts(r), seconds);
      return { ...loudness(buf), hash: sampleHash(buf), blocks: blockLevels(buf) };
    },
    // a voice's current peak level
    level: (n: string) => {
      const w = player.waveform(n);
      return w ? Math.max(...Array.from(w).map(Math.abs)) : null;
    },
  };
}
