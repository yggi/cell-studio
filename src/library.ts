/**
 * Your pieces: saved in this browser (localStorage), or as files: a piece file (.md: its title, tags and tier in the
 * frontmatter, the piece in a cells block; decision 047) when the piece came from one, an example among them, or a
 * bare text (.cells), as pieces were saved before.
 * Storage can be unavailable (a viewer that blocks it, a private window):
 * every call says so instead of failing, and files always work.
 */
import { storageKey } from './storageKey';
import { pieceMeta } from '@yggi/cells/engine/parser/index';
import { isPieceFile, readPiece, type PieceFile } from '@yggi/cells/engine/piecefile';

export interface SavedPiece {
  readonly id: string;
  readonly title: string;
  /** A piece file, or a bare text (one saved before files, or never opened from one). */
  readonly source: string;
  /** When it was saved, ISO 8601. */
  readonly saved: string;
}

// (a PR preview keeps its own: a PR that changes how pieces are saved can't touch yours)
const KEY = storageKey('cell-studio:pieces');

/** Can this browser keep pieces? */
export function storageAvailable(): boolean {
  try {
    const probe = `${KEY}:probe`;
    localStorage.setItem(probe, '1');
    localStorage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}

export function listSaved(): SavedPiece[] {
  try {
    const raw = localStorage.getItem(KEY);
    const all = raw ? (JSON.parse(raw) as SavedPiece[]) : [];
    return Array.isArray(all) ? all.filter((p) => p && typeof p.source === 'string') : [];
  } catch {
    return [];
  }
}

function write(all: readonly SavedPiece[]): void {
  localStorage.setItem(KEY, JSON.stringify(all));
}

/** A piece file, read; null for a bare text (a piece written the old way, a MIDI file's text) or a file that doesn't
 * read (it opens as text, and the compiler says what is wrong). */
export function pieceFile(source: string): PieceFile | null {
  if (!isPieceFile(source)) return null;
  const file = readPiece(source);
  return 'problems' in file ? null : file;
}

/** What compiles: a piece file's text, or the source as it is. */
export const textOf = (source: string): string => pieceFile(source)?.text ?? source;

/** A piece's title: its file's or its card's (a MIDI file's text: its name), or the first comment line, or "Untitled". */
export function titleOf(source: string): string {
  const midi = /^midi\b[^\n]*\bname="([^"]*)"/m.exec(source);
  if (midi) return midi[1].trim().slice(0, 60) || 'MIDI file';
  const meta = pieceMeta(source);
  if (meta) return meta.title;
  const comment = source.split('\n').find((l) => l.startsWith('#'));
  return comment ? comment.replace(/^#\s*/, '').slice(0, 60) : 'Untitled';
}

/**
 * Save in this browser, under its title: a piece saved again under the same
 * title is replaced. Returns what was saved, or an error to show.
 */
export function savePiece(source: string): { piece: SavedPiece } | { error: string } {
  if (!storageAvailable()) return { error: 'This browser can’t keep pieces here. Save to a file instead.' };
  const title = titleOf(source);
  const all = listSaved();
  const old = all.find((p) => p.title === title);
  const piece: SavedPiece = { id: old?.id ?? `p${Date.now().toString(36)}`, title, source, saved: new Date().toISOString() };
  try {
    write([piece, ...all.filter((p) => p.id !== piece.id)]);
    return { piece };
  } catch {
    return { error: 'The browser’s storage is full. Save to a file instead.' };
  }
}

export function removeSaved(id: string): void {
  try {
    write(listSaved().filter((p) => p.id !== id));
  } catch {
    /* nothing to remove from */
  }
}

/** A file name from a title: "Swing blues: 12 bars in C" → swing-blues-12-bars-in-c.cells (.md for a piece file) */
export function fileName(source: string, extension = isPieceFile(source) ? '.md' : '.cells'): string {
  const slug = titleOf(source)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `${slug || 'piece'}${extension}`;
}

/** Download a file. */
export function download(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Download the piece as a text file. */
export function saveFile(source: string): void {
  download(new Blob([source], { type: `${isPieceFile(source) ? 'text/markdown' : 'text/plain'};charset=utf-8` }), fileName(source));
}

/** Read a chosen file's text. */
export function readFile(file: File): Promise<string> {
  return file.text();
}
