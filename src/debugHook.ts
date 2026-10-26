/**
 * `window.cellStudio`, for measuring from outside (the browser console, `tools/golden.mjs`, the smoke
 * test); documented in docs/testing.md.
 */
import { compilePiece } from './compile';
import { codeShifts, type CompileResult } from '@yggi/cells/engine/program';
import { blockLevels, loudness, renderLength, renderPiece, sampleHash } from './audio/render';
import type { Player } from './audio/player';
import type { Recorder } from './ui/state/record.svelte';
import { transportClock } from './audio/clock.svelte';
import { textOf } from './library';
import type { PlayedEvent } from './session/played';

/** A Jambot session, from outside (`cellStudio.session`): join, leave, where it stands (#478), and what it played (#492). */
export interface SessionHook {
  join(lobby: string, session: string, name: string): Promise<void>;
  leave(): void;
  state(): unknown;
  played(from?: number): { readonly events: readonly PlayedEvent[]; readonly next: number };
}

export function installDebugHook(
  openPiece: () => CompileResult,
  player: Player,
  recorder: Recorder,
  openSource: (source: string, name?: string) => void,
  session?: SessionHook,
): void {
  if (typeof window === 'undefined') return;
  (window as unknown as { cellStudio: unknown }).cellStudio = {
    // measure(seconds?) renders the open piece and returns {rms, peak, clipped} in dB below full scale
    measure: async (seconds?: number) => {
      const r = openPiece();
      return loudness(await renderPiece(r, codeShifts(r), seconds));
    },
    // open(source, name?) opens a string of code as the open piece, as opening a file does (`name` its file's name, by
    // default from its title): the editor, the graph and Play follow it; returns whether it compiled, and its errors
    open: (source: string, name?: string) => {
      openSource(source, name);
      const r = openPiece();
      return { ok: r.ok, errors: r.diagnostics.filter((d) => d.severity === 'error').map((d) => d.message) };
    },
    // the default render length in seconds
    length: () => renderLength(openPiece()),
    // how the engine's windows went: where they were worked out, how long they took (#15)
    engine: () => player.engineStats(),
    // render(source, seconds) renders any source, a text or a piece file (not just the open piece), with a hash of the samples and
    // the level of every block of them: for checking a refactor leaves every piece sounding the same (`tools/golden.mjs`)
    render: async (source: string, seconds?: number) => {
      const r = compilePiece(textOf(source), { SAMPLE_RATE: 44100, A4: 440 });
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
    // a Jambot session (#478): join(lobby, session, name), leave(), and state(): its status, the bar heard, the text
    // shown, the cursor in it, the host's clock as read, on the page's clock (performance.now(), ms), and what the
    // library's lobby cell lists; and played(from?), each event the session's feed played since the `from`th, as Jambot's
    // `played()` gives a page's (its bar, part, drum role, step, note, velocity and length in steps as the performers play
    // it, and its onset and duration on the host's clock, seconds), the latest 20,000 kept, and the number of the next
    session,
    // a voice's current peak level
    level: (n: string) => {
      const w = player.waveform(n);
      return w ? Math.max(...Array.from(w).map(Math.abs)) : null;
    },
  };
}
