// Lifted from yggi/jambot apps/web/src/midi/surfaces.ts @ 8cdb6b8 (parseMidiMessage only).

/** A note read off a raw MIDI message. */
export interface ParsedNote {
  readonly on: boolean;
  readonly note: number;
  readonly velocity: number;
  /** The status byte's low nibble, 0–15: channel 1 is 0, channel 10 is 9. */
  readonly channel: number;
  /** When the port saw it (the event's `timeStamp`, ms on the page's clock), not when the page got to it. */
  readonly timeStamp?: number;
}

/**
 * A note-on or note-off, or null for anything else. A note-on with velocity 0 is a note-off, as the spec allows.
 * No running status: Web MIDI delivers whole messages.
 */
export function parseMidiMessage(data: ArrayLike<number>, timeStamp?: number): ParsedNote | null {
  const status = data[0];
  const note = data[1];
  const velocity = data[2] ?? 0;
  if (status === undefined || note === undefined) return null;
  const command = status & 0xf0;
  const channel = status & 0x0f;
  if (command === 0x90 && velocity > 0) return { on: true, note, velocity, channel, timeStamp };
  if (command === 0x80 || command === 0x90) return { on: false, note, velocity: 0, channel, timeStamp };
  return null;
}
