import { compileSource } from '@yggi/cells/engine/compile';
import { codeShifts, type CompileResult } from '@yggi/cells/engine/program';
import { addCell, setFree, setOff, setShift } from '@yggi/cells/engine/edit';
import { freeIndex, freeList, withHeld } from '@yggi/cells/engine/held';
import { buildGraph } from '../../layout/drawn';
import { showProblems } from '../../layout/show';
import { routing } from '@yggi/cells/engine/routing';
import { mainTempo, sections } from '@yggi/cells/engine/duration';
import { pieceFile, titleOf } from '../../library';
import { isPieceFile, readPiece, writePiece, type PieceFrontmatter } from '@yggi/cells/engine/piecefile';
import type { Layout } from '@yggi/cells/engine/literate';
import type { PieceSource } from '../../audio/engine';
import type { FreeSpec } from '@yggi/cells/engine/ast';
import { isMidiText, parseMidiText } from '@yggi/cells/engine/miditext';
import { cellsFromMidi } from '@yggi/cells/engine/midiimport';
import { pieceStats } from '@yggi/cells/engine/stats';

/**
 * The open piece: its code — the single source of truth, and this the only place that writes it —
 * what it compiles to, and the free() values moved by hand. Every edit (a wheel turned, a cell
 * switched off, added, renamed, a value kept) is a rewrite of the code through engine/edit.ts.
 *
 * The code can be a MIDI file's text (engine/miditext.ts, decision 025): then it plays as it is, its notes written out
 * as cells behind the scenes (`cells`, engine/midiimport.ts) and compiled; what the graph would edit isn't written
 * (there are no cells in the text to rewrite) until it is converted (`studio.convert`).
 *
 * A piece opened from a piece file (an example, a piece saved as one: decision 047) keeps the file's frontmatter (its
 * title, tags and tier, any other key) and its prose beside the code: the code is the join of the file's cells blocks
 * (literate cells, cells decision 051), and `file` the file again with the code as it stands, each line back in the
 * block it came from and the prose between them as it was. The editor shows the code, the join, not the file.
 */
export class Piece {
  #code = $state('');
  /** Its file's frontmatter, or null for a bare text (a piece saved the old way, a MIDI file's text). */
  frontmatter = $state.raw<PieceFrontmatter | null>(null);
  /** Its file's prose, after the last cells block. */
  #prose = '';
  /** Its file's blocks and the prose between them, as read (a file that was read; none for a bare text or a file made new). */
  #layout: Layout | undefined = undefined;
  /** Its file had no frontmatter, only cells blocks among prose (cells #212): written back without one while it has none. */
  #bare: true | undefined = undefined;
  /**
   * Read only: the code is a Jambot session host's section, shown as the host sent it (#478, `follow`): every edit is
   * refused (the editor, the graph, held values, Shorten) until the piece is let go (`open`, or the session ends).
   */
  readOnly = $state(false);
  /** The device's sample rate, once audio runs: a value the environment provides to the code. */
  sampleRate = $state(48000);
  readonly env = $derived({ SAMPLE_RATE: this.sampleRate, A4: 440 });
  /** A MIDI file's text, read (its lines that say nothing are its diagnostics); null for a piece's code. */
  readonly midi = $derived(isMidiText(this.#code) ? parseMidiText(this.#code) : null);
  /** The cells that play: the code, or a MIDI file's notes written out (a fixed tempo: nothing is kept in its text). */
  readonly cells = $derived(this.midi ? cellsFromMidi(this.midi.smf, this.midi.smf.name ?? 'MIDI file', { free: false }).source : this.#code);
  /** The code as written, compiled (its diagnostics are the editor's: a MIDI file's are its text's). */
  readonly result = $derived.by(() => {
    const r = compileSource(this.cells, this.env);
    // (and what only the layout can tell: a plugin on a cell it doesn't fit)
    const shows = r.ok ? showProblems(r) : [];
    if (!this.midi) return shows.length ? { ...r, diagnostics: [...r.diagnostics, ...shows] } : r;
    const errors = this.midi.diagnostics.some((d) => d.severity === 'error');
    return { ...r, ok: r.ok && !errors, diagnostics: this.midi.diagnostics };
  });
  /** The piece as a file (its frontmatter, the code in its cells blocks, its prose), or the bare code. */
  readonly file = $derived(
    this.frontmatter ? writePiece({ frontmatter: this.frontmatter, text: this.#code, prose: this.#prose, layout: this.#layout, bare: this.#bare }) : this.#code,
  );
  /** Its title, from its file's frontmatter, or from its card as it stands (it follows edits). */
  readonly title = $derived(titleOf(this.file));
  readonly errors = $derived(this.result.diagnostics.filter((d) => d.severity === 'error').length);
  /** The code has errors: what's shown and played is the last version that compiled. */
  readonly stale = $derived(!this.result.ok);

  /**
   * free() values moved by hand: what plays, not what's written — until kept. Held by their place
   * among the code's free()s (the first, the second …), so rewriting can't lose them.
   */
  held = $state.raw<Map<number, number | string>>(new Map());
  readonly playedCode = $derived(this.held.size && this.result.ok && !this.midi ? withHeld(this.#code, this.result, this.held) : this.cells);
  readonly playedResult = $derived(this.playedCode === this.cells ? this.result : compileSource(this.playedCode, this.env));

  // (the last version that compiled, and the text it was compiled from: an engine in a worker compiles
  // the same piece from it. A remembered value, not state: it only changes as `good` is read.)
  #lastGood: { result: CompileResult; source: PieceSource };
  readonly good = $derived.by(() => {
    if (this.playedResult.ok) this.#lastGood = { result: this.playedResult, source: { code: this.playedCode, env: this.env } };
    return this.#lastGood;
  });
  /** What's shown and played: the last version that compiled. */
  readonly program = $derived(this.good.result);
  readonly graph = $derived(buildGraph(this.program));
  /** Its numbers (engine/stats.ts), for the sidebar's Stats: a MIDI text's are the cells it plays through. */
  readonly stats = $derived(pieceStats(this.program, this.graph, this.good.source.code));
  readonly shifts = $derived(codeShifts(this.program));
  readonly muted = $derived(this.program.off);
  /** What can sound (engine/routing.ts). */
  readonly routed = $derived(routing(this.program, this.muted));
  /** The arrangement's sections (if a selector plays the piece) and the meter that drives it. */
  readonly sections = $derived(this.program.ok ? sections(this.program) : null);
  readonly mainMeter = $derived(this.program.ok ? mainTempo(this.program) : null);

  // how many free()s the code had when it last compiled: an edit that changes that leaves what was held
  // no longer fitting
  #frees: number;

  constructor(source: string) {
    const file = pieceFile(source);
    this.frontmatter = file?.frontmatter ?? null;
    this.#prose = file?.prose ?? '';
    this.#layout = file?.layout;
    this.#bare = file?.bare;
    const code = file?.text ?? source;
    this.#code = code;
    const cells = isMidiText(code) ? cellsFromMidi(parseMidiText(code).smf, 'MIDI file', { free: false }).source : code;
    const first = compileSource(cells);
    this.#lastGood = { result: first, source: { code: cells } };
    this.#frees = first.ok ? freeList(first).length : 0;
  }

  get code(): string {
    return this.#code;
  }
  /** Open a piece: a piece file (its frontmatter and prose kept, its text the code) or a bare text. */
  open(source: string): void {
    this.readOnly = false;
    const file = pieceFile(source);
    this.frontmatter = file?.frontmatter ?? null;
    this.#prose = file?.prose ?? '';
    this.#layout = file?.layout;
    this.#bare = file?.bare;
    this.code = file?.text ?? source;
  }
  /** Take a rewrite (Shorten's): a text, or a file (its card's migration, decision 047: what the card said of the
   * piece, its title, tags and tier, now the frontmatter's, over what the frontmatter held). */
  take(rewrite: string): void {
    if (this.readOnly) return;
    if (!isPieceFile(rewrite)) return void (this.code = rewrite);
    const file = readPiece(rewrite);
    if ('problems' in file) return;
    this.frontmatter = { ...this.frontmatter, ...file.frontmatter };
    this.code = file.text;
  }
  /** Write the code (the editor, the graph's edits, a conversion's frames); while read only, nothing is written. */
  set code(source: string) {
    if (!this.readOnly) this.#write(source);
  }
  /** Show a session host's text as it is, read only from now on (#478): a bare text, the one write while read only. */
  follow(text: string): void {
    this.readOnly = true;
    this.frontmatter = null;
    this.#prose = '';
    this.#layout = undefined;
    this.#bare = undefined;
    if (text !== this.#code) this.#write(text);
  }
  #write(source: string): void {
    this.#code = source;
    const r = this.result;
    const n = freeList(r).length;
    if (r.ok && n !== this.#frees) {
      this.#frees = n;
      if (this.held.size) this.held = new Map();
    }
  }

  /** Turn a cell; one whose shift is free(…) moves its free value (the wheel and its slider are one control). */
  turn(name: string, shift: number): void {
    if (this.midi) return;
    const free = this.program.cells.get(name)?.frees.find((f) => f.key === 'shift');
    this.code = free ? setFree(this.code, free, shift) : setShift(this.code, name, shift);
  }
  /** Switch a cell (a graph id, `cell:<name>`) on or off; any other node (a product's junction) is not a cell: nothing. */
  toggle(id: string): void {
    if (!id.startsWith('cell:') || this.midi) return;
    const name = id.slice('cell:'.length);
    this.code = setOff(this.code, name, !this.program.cells.get(name)?.off);
  }
  /** Add a new cell; its name. */
  add(): string {
    if (this.midi || this.readOnly) return '';
    const r = addCell(this.code);
    this.code = r.source;
    return r.name;
  }
  /** Move a free(…) value by hand: it plays, and the code keeps what's written until `keep`. */
  hold(spec: Pick<FreeSpec, 'span'>, v: number | string): void {
    const i = freeIndex(this.program, spec);
    if (i < 0 || this.midi || this.readOnly) return;
    this.held = new Map(this.held).set(i, v);
  }
  /** Write what's held into the code: everything, or one free(…) (a braid's take, from its sheet). */
  keep(spec?: Pick<FreeSpec, 'span'>): void {
    if (!spec) {
      this.code = this.playedCode;
      this.held = new Map();
      return;
    }
    const i = freeIndex(this.program, spec);
    if (i < 0 || !this.held.has(i) || !this.result.ok) return;
    const rest = new Map(this.held);
    rest.delete(i);
    this.code = withHeld(this.#code, this.result, new Map([[i, this.held.get(i)!]]));
    this.held = rest;
  }
  /** Let go of what's held: everything, or one free(…). */
  revert(spec?: Pick<FreeSpec, 'span'>): void {
    if (!spec) {
      if (this.held.size) this.held = new Map();
      return;
    }
    const i = freeIndex(this.program, spec);
    if (!this.held.has(i)) return;
    const rest = new Map(this.held);
    rest.delete(i);
    this.held = rest;
  }
}
