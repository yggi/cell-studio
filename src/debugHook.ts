/**
 * `window.cellStudio`, for measuring from outside (the browser console, `tools/golden.mjs`, the smoke
 * test); documented in docs/testing.md.
 */
import { compileSource } from './engine/compile';
import { codeShifts, type CompileResult } from './engine/program';
import { blockLevels, loudness, renderLength, renderPiece, sampleHash } from './audio/render';
import type { Player } from './audio/player';
import type { Recorder } from './ui/state/record.svelte';
import { transportClock } from './audio/clock.svelte';

export function installDebugHook(openPiece: () => CompileResult, player: Player, recorder: Recorder): void {
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
    // the transport: its state and where it is heard (code seconds), as the views read it (the smoke test times keys by it)
    transport: () => ({ state: transportClock.state, seconds: transportClock.seconds }),
    // where the piece is heard (code seconds) at a moment on the page's clock (ms, as a MIDI message's timeStamp), or
    // null while not playing: what a take reads a key's time through (the smoke test stamps its keys by it, not by a frame)
    heardAt: (ms: number) => player.heardAt(ms),
    // a take: the recorder's state and the step its pass starts on (null until placed)
    take: () => ({ state: recorder.state, start: recorder.start }),
    // a voice's current peak level
    level: (n: string) => {
      const w = player.waveform(n);
      return w ? Math.max(...Array.from(w).map(Math.abs)) : null;
    },
  };
}
