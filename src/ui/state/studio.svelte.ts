import { createContext, tick } from 'svelte';
import { codeShifts } from '../../engine/program';
import { declLine } from '../../engine/edit';
import { FIRST_SOURCE, loadExample, type PresetKey } from '../../examples';
import { fileName, readFile, saveFile, savePiece } from '../../library';
import { loudness, renderLength, renderPiece, wav } from '../../audio/render';
import { transportClock } from '../../audio/clock.svelte';
import { installDebugHook } from '../../debugHook';
import type { RunController } from '../perfrun';
import { Piece } from './piece.svelte';
import { Playback } from './playback.svelte';
import { Library, type Open } from './library.svelte';
import { View, type Tab } from './view.svelte';

/**
 * The app's state, in four parts — the piece (its code and what it compiles to), playing it, the
 * library, what's on screen — and what takes more than one of them: opening a piece, saving,
 * rendering. App.svelte makes one and shares it (`setStudio`); components read it (`getStudio`).
 */
export class Studio {
  readonly piece = new Piece(FIRST_SOURCE);
  readonly playback = new Playback(this.piece);
  readonly library = new Library();
  readonly view = new View();
  /** The code editor (App binds it): showing a cell's line in it. */
  editor = $state<{ showLine(line: number): void } | undefined>();
  rendering = $state(false);

  // the piece last asked for (a card or a file): one still being fetched or read gives way to a later choice
  #choice = 0;

  constructor() {
    // `window.cellStudio`, for measuring from outside (docs/testing.md): the open piece as written
    installDebugHook(() => this.piece.result, this.playback.player);
  }

  /** A piece's source, now open: laid out afresh, from rest, its graph shown. */
  #opened(open: Open, source: string): void {
    this.library.open = open;
    this.piece.code = source;
    this.view.tab = 'graph';
    this.view.message = null;
    this.library.opened++;
    this.playback.stop();
  }

  /** Open a card: an example (fetched: its own chunk) or a piece saved here. */
  async pick(id: string): Promise<void> {
    const mine = ++this.#choice;
    const [kind, key] = [id.slice(0, id.indexOf(':')), id.slice(id.indexOf(':') + 1)];
    if (kind === 'example') {
      let source: string;
      try {
        source = await loadExample(key as PresetKey);
      } catch {
        if (mine === this.#choice) this.view.message = 'This piece could not be loaded (offline?).';
        return;
      }
      if (mine !== this.#choice) return;
      this.#opened({ kind: 'example', key: key as PresetKey }, source);
    } else {
      const p = this.library.saved.find((x) => x.id === key);
      if (!p) return;
      this.#opened({ kind: 'saved', id: p.id }, p.source);
    }
  }

  async openFile(file: File): Promise<void> {
    const mine = ++this.#choice;
    try {
      const text = await readFile(file);
      if (mine !== this.#choice) return;
      this.#opened({ kind: 'file', name: file.name }, text);
    } catch {
      if (mine === this.#choice) this.view.message = `Couldn’t read ${file.name}.`;
    }
  }

  /** Save the code as a .cells file. */
  saveFile(): void {
    saveFile(this.piece.code);
  }

  /** Save the code in this browser; it's then the piece open. */
  saveHere(): void {
    const r = savePiece(this.piece.code);
    if ('error' in r) this.view.message = r.error;
    else {
      this.library.refresh();
      this.library.open = { kind: 'saved', id: r.piece.id };
      this.view.message = `Saved “${r.piece.title}” in this browser.`;
    }
  }

  /** Render the piece as written to a WAV (offline: faster than it plays) and download it. */
  async render(): Promise<void> {
    const result = this.piece.result;
    if (this.rendering || !result.ok) return;
    this.rendering = true;
    this.view.message = `Rendering ${Math.round(renderLength(result))} s…`;
    try {
      const buf = await renderPiece(result, codeShifts(result));
      const url = URL.createObjectURL(wav(buf));
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName(this.piece.code).replace(/\.cells$/, '.wav');
      document.body.append(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      const l = loudness(buf);
      this.view.message = `Rendered: ${buf.duration.toFixed(0)} s, ${l.rms.toFixed(1)} dB average, peak ${l.peak.toFixed(1)} dB.`;
    } catch (e) {
      this.view.message = `Couldn’t render: ${(e as Error).message}`;
    } finally {
      this.rendering = false;
    }
  }

  /** Add a new cell: it opens in its sheet. */
  add(): void {
    this.view.focusOn(this.piece.add());
  }

  /** A rename (the new source): the sheet follows the cell to its new name. */
  rename(source: string, to: string): void {
    this.piece.code = source;
    this.view.focusOn(to);
  }

  /** Show a cell's line in the code. */
  async showInCode(name: string): Promise<void> {
    this.view.tab = 'code';
    await tick(); // the code view has to be visible before it can take focus
    // an unnamed cell lives inside the line it's written on: λ<line>_<column>
    const lambda = /^λ(\d+)_/.exec(name);
    const i = lambda ? +lambda[1] - 1 : declLine(this.piece.code, name);
    if (i >= 0) this.editor?.showLine(i + 1);
  }

  // ---- the performance overlay (ui/PerfOverlay.svelte)
  readonly perfSources = {
    playing: () => transportClock.state === 'playing',
    audio: () => this.playback.player.audioInfo(),
  };
  readonly perfMeta = () => ({
    version: __APP_VERSION__,
    piece: { title: this.piece.title ?? null, graphNodes: this.piece.graph.nodes.length, cells: this.piece.program.cells.size },
  });
  // what the overlay's full test does to the page: open a piece, play it, tune the audio anew; and puts it all back
  #beforeTest: { open: Open; code: string; tab: Tab } | null = null;
  #retuned = false;
  readonly perfTest: RunController = {
    open: async (key) => {
      this.#beforeTest ??= { open: this.library.open, code: this.piece.code, tab: this.view.tab };
      await this.pick(`example:${key}`);
      const open = this.library.open;
      return open.kind === 'example' && open.key === key;
    },
    retune: async (t) => {
      this.#retuned = true;
      await this.playback.player.retune(t);
    },
    play: () => this.playback.toggle(),
    stop: () => this.playback.pause(),
    audioState: () => this.playback.player.audioInfo().state,
    hidden: () => document.hidden,
    finish: async () => {
      if (this.#retuned) await this.playback.player.retune(null);
      this.#retuned = false;
      const before = this.#beforeTest;
      if (before) {
        this.library.open = before.open;
        this.piece.code = before.code;
        this.view.tab = before.tab;
        this.library.opened++;
        this.playback.stop();
      }
      this.#beforeTest = null;
    },
  };

  dispose(): void {
    this.playback.dispose();
  }
}

export const [getStudio, setStudio] = createContext<Studio>();
