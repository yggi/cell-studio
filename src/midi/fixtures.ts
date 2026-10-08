// Fakes for the MIDI tests, lifted from yggi/jambot apps/web/src/midi/access.test.ts @ 8cdb6b8: Web MIDI without a device.

type Handler = ((event: { data: Uint8Array; timeStamp: number }) => void) | null;
export type FakeInput = { id: string; name: string; onmidimessage: Handler };
export type FakeOutput = { id: string; name: string; sent: { data: number[]; timestamp?: number }[]; send(data: readonly number[], timestamp?: number): void };

/** An input a test plays into: `play(bytes, timeStamp)` is what a key would send. */
export function fakeInput(id: string, name: string): FakeInput & { play(bytes: number[], timeStamp?: number): void } {
  const input = { id, name, onmidimessage: null as Handler, play: (bytes: number[], timeStamp = 0) => input.onmidimessage?.({ data: new Uint8Array(bytes), timeStamp }) };
  return input;
}

/** An output that records what is sent to it. */
export function fakePort(id: string, name: string): FakeOutput {
  const port: FakeOutput = { id, name, sent: [], send: (data, timestamp) => void port.sent.push({ data: [...data], timestamp }) };
  return port;
}

/** A fake `MIDIAccess`: plug ports in and out of its maps, then `change()` as Web MIDI's `statechange` would. */
export function fakeAccess(inputs: FakeInput[] = [], outputs: FakeOutput[] = []) {
  const access = {
    inputs: new Map(inputs.map((p) => [p.id, p])),
    outputs: new Map(outputs.map((p) => [p.id, p])),
    onstatechange: null as (() => void) | null,
    change: () => access.onstatechange?.(),
  };
  return access;
}

/** `navigator.requestMIDIAccess` answering with `access` (or refusing, given an error); `uninstall()` takes it away again. */
export function installMidi(access: ReturnType<typeof fakeAccess> | Error): void {
  navigator.requestMIDIAccess = () => (access instanceof Error ? Promise.reject(access) : Promise.resolve(access as unknown as MIDIAccess));
}

export function uninstallMidi(): void {
  delete (navigator as { requestMIDIAccess?: unknown }).requestMIDIAccess;
}
