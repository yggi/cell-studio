// Lifted from yggi/jambot apps/web/src/audio/midi-out.ts @ 8cdb6b8 (MidiOut), adapted to Cell studio's played notes; its parts, drum sounds and look-ahead (@jambot/engine) are gone.

/**
 * MIDI out (#205): the notes the voices play (`Played`, retimed onto the audio clock by the player) sent to a port,
 * timestamped for the moment they are heard. Where each goes and what it is as MIDI is `engine/midi.ts`; a device's
 * drum map is applied here, at the output, and nowhere before.
 *
 * A note-off is answered by the decision its note-on got, never by what else is sounding at release: two voices on one
 * channel often share a pitch, and one striking the other's note must not cut it short. A note already held on its
 * channel and key retriggers, off then on; a note-off reaches the port only once its last holder's own end arrives with
 * nothing else still covering it. Notes come in non-decreasing start order, so `advance(horizon)` decides every release
 * whose end has passed that horizon from intervals already known.
 *
 * A timestamp is never in the past (`max(0, …)`: a late send, not a lost one), and every send sits in a try (a port can
 * vanish mid-send). A timestamped message can't be taken back, so a stop silences now and again past the horizon the
 * player schedules to.
 */
import { BEND_CENTRE, bendMessage, midiNote, Rotation, type Route } from '../engine/midi';
import type { Played } from '../engine/realize';
import type { MidiPort } from './access';
import { deviceNote, type DrumMap } from './drum-presets';

const NOTE_ON = 0x90;
const NOTE_OFF = 0x80;
const CONTROL_CHANGE = 0xb0;
const ALL_NOTES_OFF = 123;

/** Seconds on the audio clock to a `performance.now()` timestamp (`midi/clock.ts`). */
type ToDeviceMs = (seconds: number) => number;

/** A 1–16 MIDI channel to its 0–15 status nibble, wrapping rather than throwing. */
const nibble = (channel: number) => (channel - 1) & 15;

interface Holder {
  readonly start: number;
  readonly end: number;
}

/** How notes are sent: the device's drum map, the synth's bend range, and channels rotated per note (MPE) or not. */
export interface OutOptions {
  readonly drums: DrumMap;
  readonly bendRange: number;
  /** The channels every voice's notes rotate over (one per sounding note, MPE-style, for microtonal pieces), or null: each voice on its channel. */
  readonly rotate: readonly number[] | null;
}

export class MidiOut {
  #port: MidiPort | null;
  #route: (e: Played) => Route = () => null;
  #options: OutOptions = { drums: {}, bendRange: 2, rotate: null };
  #rotation: Rotation | null = null;
  /** Notes held, by channel nibble and key, not yet resolved as released. */
  #open = new Map<string, Holder[]>();
  /** The bend each channel was last sent (a channel never sent one is at the centre). */
  #bend = new Map<number, number>();
  /** Per channel nibble, until when its notes sound and on what bend, to tell when notes with different bends overlap. */
  #sounding = new Map<number, { end: number; bend: number; moving: boolean }[]>();
  /** Bends sent ahead of the horizon only (`advance`), so a stop leaves none behind it. */
  #pending: { channel: number; value: number; at: number }[] = [];
  /** The channel nibbles sent on since the last stop. */
  #used = new Set<number>();
  /** Told once when notes with different bends overlap on one channel (a microtonal piece without rotation). */
  onClash: (() => void) | null = null;

  constructor(port: MidiPort | null = null) {
    this.#port = port;
  }

  /** Adopt a port, silencing whatever the old one held first. */
  setPort(port: MidiPort | null, atSeconds: number, toDeviceMs: ToDeviceMs): void {
    if (port === this.#port) return;
    this.panic(atSeconds, toDeviceMs);
    this.#port = port;
  }

  /** Where notes go (a piece's channel table, `engine/midi.ts` `router`); a new table silences the channels in use first. */
  setRoute(route: (e: Played) => Route, atSeconds: number, toDeviceMs: ToDeviceMs): void {
    if (route === this.#route) return;
    this.panic(atSeconds, toDeviceMs);
    this.#route = route;
  }

  /** How notes are sent; a change of rotation or bend range silences first, a new drum map takes the next note. */
  setOptions(options: OutOptions, atSeconds: number, toDeviceMs: ToDeviceMs): void {
    const o = this.#options;
    if (o.bendRange !== options.bendRange || (o.rotate ?? []).join() !== (options.rotate ?? []).join()) this.panic(atSeconds, toDeviceMs);
    this.#options = options;
    this.#rotation = options.rotate ? new Rotation(options.rotate) : null;
  }

  /** All notes off on every channel in use, the bends put back, and what's held forgotten. */
  panic(atSeconds: number, toDeviceMs: ToDeviceMs): void {
    this.#silence(atSeconds, toDeviceMs);
    this.forget();
  }

  /** Stopped at `now`: silence now, and again at `horizon`, past everything already sent ahead; then forget. */
  stop(now: number, horizon: number, toDeviceMs: ToDeviceMs): void {
    const [used, bend] = [new Set(this.#used), new Map(this.#bend)];
    this.#silence(now, toDeviceMs);
    [this.#used, this.#bend] = [used, bend];
    this.#silence(horizon, toDeviceMs);
    this.forget();
  }

  /** Forget what's held and what was sent, as after All notes off from elsewhere (the dialog's button). */
  forget(): void {
    this.#open.clear();
    this.#pending = [];
    this.#sounding.clear();
    this.#rotation?.forget();
    this.#used.clear();
    this.#bend.clear();
  }

  /** Send one note: its bend if the channel needs another, its note-on, its bends while it sounds. Its release is decided by `advance`. */
  play(e: Played, toDeviceMs: ToDeviceMs): void {
    if (!this.#port) return;
    const route = this.#route(e);
    if (!route) return;
    const n = midiNote(e, route, this.#options.bendRange);
    if (!n) return;
    this.advance(n.at, toDeviceMs);
    const drum = route.drum !== null;
    const channel = nibble(!drum && this.#rotation ? this.#rotation.take(n.end) : n.channel);
    const note = drum ? deviceNote(this.#options.drums, n.note) : n.note;
    if (!drum) this.#clashes(channel, n.at, n.end, n.bend, n.bends.length > 0);
    if (!drum && (this.#bend.get(channel) ?? BEND_CENTRE) !== n.bend) this.#sendBend(channel, n.bend, n.at, toDeviceMs);
    const key = `${channel}:${note}`;
    const holders = this.#open.get(key) ?? [];
    if (holders.some((h) => h.start <= n.at && n.at < h.end)) this.#send([NOTE_OFF | channel, note, 0], n.at, toDeviceMs);
    this.#send([NOTE_ON | channel, note, n.velocity], n.at, toDeviceMs);
    for (const b of n.bends) this.#pending.push({ channel, value: b.value, at: b.at });
    this.#open.set(key, [...holders, { start: n.at, end: n.end }]);
  }

  /** Send the bends due by `horizon`, and release every note whose end is at or before it, unless another holder on its channel and key still covers that moment. */
  advance(horizon: number, toDeviceMs: ToDeviceMs): void {
    if (!this.#port) return;
    if (this.#pending.length) {
      const due = this.#pending.filter((b) => b.at <= horizon).sort((a, b) => a.at - b.at);
      this.#pending = this.#pending.filter((b) => b.at > horizon);
      for (const b of due) this.#sendBend(b.channel, b.value, b.at, toDeviceMs);
    }
    for (const [key, holders] of this.#open) {
      const due = holders.filter((h) => h.end <= horizon);
      if (due.length === 0) continue;
      const [channel, note] = key.split(':').map(Number);
      // (two holders ending together, a note struck twice at once, release it once: the strike after the first retriggered it)
      const released = new Set<number>();
      for (const h of due) {
        const stillHeld = holders.some((o) => o !== h && o.start <= h.end && h.end < o.end);
        if (!stillHeld && !released.has(h.end)) this.#send([NOTE_OFF | channel, note, 0], h.end, toDeviceMs);
        released.add(h.end);
      }
      const remaining = holders.filter((h) => h.end > horizon);
      if (remaining.length) this.#open.set(key, remaining);
      else this.#open.delete(key);
    }
  }

  // a note with a bend of its own beside another sounding on its channel with a different one: one of them is out of tune
  #clashes(channel: number, at: number, end: number, bend: number, moving: boolean): void {
    const now = (this.#sounding.get(channel) ?? []).filter((s) => s.end > at);
    if (this.onClash && now.some((s) => s.bend !== bend || s.moving || moving)) {
      this.onClash();
      this.onClash = null;
    }
    this.#sounding.set(channel, [...now, { end, bend, moving }]);
  }

  #sendBend(channel: number, value: number, at: number, toDeviceMs: ToDeviceMs): void {
    this.#send(bendMessage(channel + 1, value), at, toDeviceMs);
    this.#bend.set(channel, value);
  }

  // All notes off on every channel sent on, and a bend back to the centre where one was left off it
  #silence(atSeconds: number, toDeviceMs: ToDeviceMs): void {
    for (const c of this.#used) this.#send([CONTROL_CHANGE | c, ALL_NOTES_OFF, 0], atSeconds, toDeviceMs);
    for (const [c, v] of this.#bend) if (v !== BEND_CENTRE) this.#send(bendMessage(c + 1, BEND_CENTRE), atSeconds, toDeviceMs);
    this.#used.clear();
    this.#bend.clear();
  }

  #send(data: readonly number[], seconds: number, toDeviceMs: ToDeviceMs): void {
    if (!this.#port) return;
    this.#used.add(data[0] & 0x0f);
    try {
      this.#port.send(data, Math.max(0, toDeviceMs(seconds)));
    } catch {
      // a port can vanish mid-send (unplugged, revoked): nothing to do about it
    }
  }
}
