// Lifted from yggi/jambot apps/web/src/midi/access.ts @ 8cdb6b8.

import { type ParsedNote, parseMidiMessage } from './surfaces';

/** Where messages go: a Web MIDI output, or a fake in the tests. */
export interface MidiPort {
  send(data: readonly number[], timestamp?: number): void;
}

/** A port as a select lists it. */
export interface PortOption {
  readonly id: string;
  readonly name: string;
}

/** What a connection tells: a note from a listened input, every message from one (for CCs), the ports changed. */
export interface MidiHandlers {
  /** A note-on or note-off, and the name of the port it came from. */
  onNote?: (note: ParsedNote, source: string) => void;
  /** Every message, raw, with the port's name and when the port saw it (ms on the page's clock). */
  onMessage?: (data: Uint8Array, source: string, timeStamp: number) => void;
  /** The ports may have changed: one plugged in or out, or a person asking to look again (`refresh`). */
  onChange?: () => void;
}

/** A port's entries, in the order the device gives them. */
const portOptions = (ports: ReadonlyMap<string, { readonly name: string | null }>): PortOption[] => [...ports].map(([id, port]) => ({ id, name: port.name ?? 'MIDI' }));

/** A live Web MIDI connection: the ports plugged in, and which input is listened to. */
export class MidiAccess {
  #access: MIDIAccess;
  #on: MidiHandlers;
  #listening = 'none';

  private constructor(access: MIDIAccess, on: MidiHandlers) {
    this.#access = access;
    this.#on = on;
    access.onstatechange = () => this.refresh();
  }

  /** Ask for Web MIDI. The connection, or in words why there is none: no Web MIDI here, or access blocked. Never throws. */
  static async connect(on: MidiHandlers = {}): Promise<MidiAccess | string> {
    if (typeof navigator === 'undefined' || !navigator.requestMIDIAccess) return 'This browser has no Web MIDI. Chrome and Edge on desktop or Android have it.';
    try {
      return new MidiAccess(await navigator.requestMIDIAccess({ sysex: false }), on);
    } catch (err) {
      const name = err instanceof Error ? err.name : 'error';
      return `MIDI access was blocked here (${name}). Allow MIDI for this site, or open the page in its own tab.`;
    }
  }

  get inputs(): PortOption[] {
    return portOptions(this.#access.inputs);
  }

  get outputs(): PortOption[] {
    return portOptions(this.#access.outputs);
  }

  outputPort(id: string): MidiPort | null {
    return this.#access.outputs.get(id) ?? null;
  }

  /** Look at the ports again: listen anew (a port plugged in again is a fresh object), and say they may have changed. */
  refresh(): void {
    this.listen(this.#listening);
    this.#on.onChange?.();
  }

  /** Listen to one input by id, `'all'` of them, or `'none'`. */
  listen(id: string): void {
    this.#listening = id;
    for (const [portId, input] of this.#access.inputs)
      input.onmidimessage =
        id === 'all' || id === portId
          ? (event) => {
              const data = event.data;
              if (!data) return;
              const source = input.name ?? 'MIDI';
              this.#on.onMessage?.(data, source, event.timeStamp);
              const note = parseMidiMessage(data, event.timeStamp);
              if (note) this.#on.onNote?.(note, source);
            }
          : null;
  }
}
