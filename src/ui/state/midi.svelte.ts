// Adapted from yggi/jambot apps/web/src/midi/settings.svelte.ts and apps/web/src/device.svelte.ts @ 8cdb6b8.

import { MidiAccess, type MidiPort, type PortOption } from '../../midi/access';
import { adoptPorts, connectMidi, portsMessage, type ChosenPorts } from '../../midi/routing';
import { storageKey } from '../../storageKey';

type Chosen = { readonly id: string; readonly name: string };
type Stored = { readonly out: Chosen; readonly in: Chosen };

const NONE: Chosen = { id: 'none', name: '' };
const DEFAULTS: Stored = { out: NONE, in: NONE };
const KEY = 'cell-studio:midi';
const ALL_CHANNELS = Array.from({ length: 16 }, (_, i) => i);

const chosen = (v: unknown): Chosen => {
  const c = v as Partial<Chosen> | null | undefined;
  return c && typeof c.id === 'string' && typeof c.name === 'string' ? { id: c.id, name: c.name } : NONE;
};

/** What this browser kept, merged over the defaults (nothing kept, junk, or no storage: the defaults). */
function load(): Stored {
  try {
    const kept = JSON.parse(localStorage.getItem(storageKey(KEY)) ?? 'null') as Partial<Stored> | null;
    return kept && typeof kept === 'object' ? { out: chosen(kept.out), in: chosen(kept.in) } : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}

/**
 * MIDI on this device: the Web MIDI connection, the ports plugged in, the output and input chosen (kept in this browser
 * by id and name), and All notes off. A port chosen before is connected again on load without a click (a permission
 * already granted needs no gesture); a first visit asks for nothing until Connect. `dispose` when it goes.
 */
export class Midi implements ChosenPorts {
  /** The connection, once made. */
  access = $state.raw<MidiAccess | null>(null);
  /** The ports plugged in, as of the last look: at connecting, when one came or went, and when a person asked. */
  ports = $state.raw<{ inputs: PortOption[]; outputs: PortOption[] }>({ inputs: [], outputs: [] });
  /** What happened, in words: the ports found, or why there is no connection. */
  message = $state('Not connected. Without MIDI, everything plays on the built-in sound.');
  connecting = $state(false);
  /** The live port the output chosen resolves to, once connected. */
  outPort = $state.raw<MidiPort | null>(null);

  #out = $state<Chosen>(NONE);
  #in = $state<Chosen>(NONE);
  // the channels (0–15) sent on since the last All notes off
  #used = new Set<number>();

  constructor() {
    const kept = load();
    this.#out = kept.out;
    this.#in = kept.in;
    // a tab frozen while hidden can leave a release unscheduled and hardware sounding: silence it on coming back
    if (typeof document !== 'undefined') document.addEventListener('visibilitychange', this.#onVisible);
    if (this.remembersPorts) void this.connect();
  }

  dispose(): void {
    if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', this.#onVisible);
  }

  readonly #onVisible = () => {
    if (document.visibilityState === 'visible' && this.#used.size) this.panic();
  };

  get outPortId(): string {
    return this.#out.id;
  }
  set outPortId(id: string) {
    this.#out = { id, name: this.#out.name };
    this.#save();
  }
  get outPortName(): string {
    return this.#out.name;
  }
  get inPortId(): string {
    return this.#in.id;
  }
  set inPortId(id: string) {
    this.#in = { id, name: this.#in.name };
    this.#save();
  }
  get inPortName(): string {
    return this.#in.name;
  }

  /** Whether a port was chosen before. */
  get remembersPorts(): boolean {
    return this.#out.id !== 'none' || this.#in.id !== 'none';
  }

  /** Connect to Web MIDI and adopt the ports chosen before. */
  async connect(): Promise<void> {
    if (this.connecting) return;
    this.connecting = true;
    const result = await connectMidi(() => MidiAccess.connect({ onChange: () => this.#changed() }), this);
    this.access = result.access;
    this.message = result.message;
    this.#list();
    this.connecting = false;
  }

  /** Look at the ports again, on a person's asking. */
  refresh(): void {
    this.access?.refresh();
  }

  /** Send to an output by id (`'none'`: none); what the old one may still hold is silenced first. */
  chooseOutput(id: string): void {
    if (id !== this.#out.id && this.#used.size) this.panic();
    this.#out = { id, name: id === 'none' ? '' : (this.ports.outputs.find((p) => p.id === id)?.name ?? '') };
    this.#save();
    this.outPort = id === 'none' ? null : (this.access?.outputPort(id) ?? null);
  }

  /** Listen to an input by id, `'all'` or `'none'`. */
  chooseInput(id: string): void {
    this.#in = { id, name: this.ports.inputs.find((p) => p.id === id)?.name ?? '' };
    this.#save();
    this.access?.listen(id);
  }

  /** Send a message to the output, noting its channel for All notes off. A port unplugged mid-send throws: nothing is sent. */
  send(data: readonly number[], timestamp?: number): void {
    const port = this.outPort;
    if (!port) return;
    if (data[0] >= 0x80 && data[0] < 0xf0) this.#used.add(data[0] & 0x0f);
    try {
      port.send(data, timestamp);
    } catch {
      // (gone: its next statechange lets go of it)
    }
  }

  /** All notes off (CC 123) on every channel sent on since the last time, or on all 16 if none was; then they are forgotten. */
  panic(): void {
    const port = this.outPort;
    const channels = this.#used.size ? [...this.#used] : ALL_CHANNELS;
    this.#used.clear();
    if (!port) return;
    for (const c of channels)
      try {
        port.send([0xb0 | c, 123, 0]);
      } catch {
        return;
      }
  }

  // the ports may have changed: adopt the ones chosen again, and list them
  #changed(): void {
    if (this.access) adoptPorts(this.access, this);
    this.#list();
  }

  #list(): void {
    const access = this.access;
    this.ports = { inputs: access?.inputs ?? [], outputs: access?.outputs ?? [] };
    if (access) this.message = portsMessage(this.ports);
  }

  #save(): void {
    try {
      localStorage.setItem(storageKey(KEY), JSON.stringify({ out: this.#out, in: this.#in } satisfies Stored));
    } catch {
      // (private window, or full: it's only not kept)
    }
  }
}
