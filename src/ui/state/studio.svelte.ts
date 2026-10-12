import { createContext, tick } from 'svelte';
import { codeShifts } from '../../engine/program';
import { declLine } from '../../engine/edit';
import { FIRST_SOURCE, loadExample, type PresetKey } from '../../examples';
import { download, fileName, readFile, saveFile, savePiece, titleOf } from '../../library';
import { pieceMidi } from '../../engine/midiexport';
import { isMidi, readMidi, writeMidi } from '../../engine/midifile';
import { midiText } from '../../engine/miditext';
import { cellsFromMidi } from '../../engine/midiimport';
import { loudness, renderLength, renderPiece, wav } from '../../audio/render';
import { transportClock } from '../../audio/clock.svelte';
import { installDebugHook } from '../../debugHook';
import type { RunController } from '../perfrun';
import { Piece } from './piece.svelte';
import { Playback } from './playback.svelte';
import { Library, type Open } from './library.svelte';
import { View, type Tab } from './view.svelte';
import { Midi } from './midi.svelte';
import { Learn } from './learn.svelte';
import { Keys } from './keys.svelte';
import { Recorder } from './record.svelte';
import type { RowKeys } from '../context';
import { Dock } from './dock.svelte';

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
  readonly midi = new Midi();
  /** MIDI learn: a controller's knobs moving the piece's free() values. */
  readonly learn = new Learn(this.piece, this.midi, { opened: () => this.library.opened });
  /** Keys playing the armed voice live: MIDI in, the computer keys, the on-screen keys (`press`, `release`, `held`). */
  readonly keys = new Keys(this.piece, this.playback.player, this.midi, { claimed: (data) => this.learn.claims(data) });
  /** Recording a braid left free (free(0 2 4 ~)): a pass of the armed cell's loop from the keys, held until Keep. */
  readonly recorder = new Recorder(this.piece, this.playback, this.keys);
  /** A cell's rows played live (the piano roll's keys, #251): through the keys, as the cell plays them, whatever is armed. */
  readonly rows: RowKeys = {
    press: (cell, value) => this.keys.pressRow(cell, value),
    release: (cell, value) => this.keys.releaseRow(cell, value),
    held: (cell) => this.keys.heldRows(cell),
  };
  /** The dock of on-screen keys and drum pads along the bottom (#255): open or not, its tab; it plays through `keys`. */
  readonly dock = new Dock();
  /** The code editor (App binds it): showing a cell's line in it. */
  editor = $state<{ showLine(line: number): void } | undefined>();
  rendering = $state(false);

  // the piece last asked for (a card or a file): one still being fetched or read gives way to a later choice
  #choice = 0;

  constructor() {
    // `window.cellStudio`, for measuring from outside (docs/testing.md): the open piece as written
    installDebugHook(() => this.piece.result, this.playback.player);
    // MIDI out: the notes the player plays go to the output chosen too
    this.midi.attach(this.playback.player, this.piece);
  }

  /** A piece's source, now open: laid out afresh, from rest, its graph shown. */
  #opened(open: Open, source: string): void {
    this.library.open = open;
    this.piece.code = source;
    this.view.tab = 'graph';
    this.view.message = null;
    this.library.opened++;
    this.playback.stop();
    // (a cell chosen to play in the last piece: the keys follow this one's sheet again)
    this.keys.chosen = '';
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
      // a MIDI file opens as it is: as text (engine/miditext.ts), playing; Convert to cells writes it as a piece
      if (isMidi(new Uint8Array(await file.slice(0, 4).arrayBuffer()))) {
        const smf = readMidi(new Uint8Array(await file.arrayBuffer()));
        if (mine !== this.#choice) return;
        this.#opened({ kind: 'file', name: file.name }, midiText(smf, file.name));
        this.view.tab = 'time';
        const notes = smf.tracks.reduce((n, t) => n + t.notes.length, 0);
        this.view.message = `Opened ${file.name}: ${notes} notes in ${smf.tracks.length} track${smf.tracks.length === 1 ? '' : 's'}, as it is. Convert it to cells to fold it into a piece.`;
        return;
      }
      const text = await readFile(file);
      if (mine !== this.#choice) return;
      this.#opened({ kind: 'file', name: file.name }, text);
    } catch {
      if (mine === this.#choice) this.view.message = `Couldn’t read ${file.name}.`;
    }
  }

  /** Save the code as a .cells file; a MIDI file's text as the MIDI file. */
  saveFile(): void {
    const midi = this.piece.midi;
    if (!midi) return saveFile(this.piece.code);
    const open = this.library.open;
    const name = open.kind === 'file' && /\.(midi?|smf)$/i.test(open.name) ? open.name : fileName(this.piece.code).replace(/\.cells$/, '.mid');
    download(new Blob([writeMidi(midi.smf).buffer as ArrayBuffer], { type: 'audio/midi' }), name);
  }

  /** A MIDI file's text, converted: its notes as cells (engine/midiimport.ts), folded where that plays the same
   * (engine/fold: figures, phrases, transpositions), the piece open now. */
  convert(): void {
    const midi = this.piece.midi;
    if (!midi) return;
    const open = this.library.open;
    const name = open.kind === 'file' ? open.name.replace(/\.(midi?|smf)$/i, '') : 'MIDI file';
    const made = cellsFromMidi(midi.smf, midi.smf.name?.trim() || name, { shorten: true });
    this.piece.code = made.source;
    if (open.kind === 'file') this.library.open = { kind: 'file', name: `${name}.cells` };
    this.view.tab = 'graph';
    const { notes, lines, perQuarter, moved, dropped, folded } = made;
    this.view.message = `Converted to cells: ${notes} notes in ${lines} line${lines === 1 ? '' : 's'}, ${perQuarter} steps a quarter note${moved ? `, ${moved} moved onto that grid` : ''}${dropped ? `, ${dropped} drum notes with no drum voice left out` : ''}, ${folded ? 'folded: what comes back written as cells of its own' : 'written out in full'}.`;
  }

  /** Save the piece's notes as a MIDI file (#307): as MIDI out sends them, a track a channel, its tempo map as tempos. */
  saveMidi(): void {
    const result = this.piece.result;
    if (!result.ok) return;
    const { smf, dropped } = pieceMidi(result, codeShifts(result), result.off, titleOf(this.piece.code));
    const bytes = writeMidi(smf);
    download(new Blob([bytes.buffer as ArrayBuffer], { type: 'audio/midi' }), fileName(this.piece.code).replace(/\.cells$/, '.mid'));
    const notes = smf.tracks.reduce((n, t) => n + t.notes.length, 0);
    this.view.message = `Saved as MIDI: ${notes} notes on ${smf.tracks.length} channel${smf.tracks.length === 1 ? '' : 's'}${dropped ? `; ${dropped} out of MIDI’s range left out` : ''}.`;
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
    if (this.piece.midi) return;
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
    this.midi.dispose();
    this.learn.dispose();
    this.recorder.dispose();
    this.keys.dispose();
  }
}

export const [getStudio, setStudio] = createContext<Studio>();
