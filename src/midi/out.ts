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
 * vanish mid-send). A timestamped message can't be taken back, so silencing (`panic`: a stop, a seek, another channel
 * table) sends All notes off now and a note-off for every note still held, at once for one sounding and at its start for
 * one struck ahead, and sends nothing later that could cut what plays next. A note-off left ahead of it (sent ahead,
 * not taken back) that a note sent since sounds across is followed by that note struck again: retriggered, not cut. A
 * bend put back after one sent ahead is said again by a note sent since that sounds across it.
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
  /** Per channel nibble, the latest moment a bend was sent for. */
  #bendAt = new Map<number, number>();
  /** Note-offs sent, by channel and key, until the clock has passed them (`advance`'s `now`). */
  #offs: { key: string; at: number }[] = [];
  /** Note-offs a silencing left ahead of it (sent ahead, and not taken back): their channel and key, and when. */
  #struck: { key: string; at: number }[] = [];
  /** Per channel nibble, a bend a silencing put back to the centre ahead of it (after a bend sent ahead): when. */
  #bentBack = new Map<number, number>();
  /** Told once when notes with different bends overlap on one channel (a microtonal piece without rotation). */
  onClash: (() => void) | null = null;

  constructor(port: MidiPort | null = null) {
    this.#port = port;
  }

  /** Adopt a port, silencing whatever the old one held first (what it left ahead is the old port's business). */
  setPort(port: MidiPort | null, atSeconds: number, toDeviceMs: ToDeviceMs): void {
    if (port === this.#port) return;
    this.panic(atSeconds, toDeviceMs);
    this.forget();
    this.#port = port;
  }

  /**
   * Where notes go (a piece's channel table, `engine/midi.ts` `router`), from the next note on; what is held stays held
   * and is released as it would have been (a recompile while playing). A channel table that changed is silenced first
   * by the caller (`panic`).
   */
  setRoute(route: (e: Played) => Route): void {
    this.#route = route;
  }

  /** How notes are sent; a change of rotation or bend range silences first, a new drum map takes the next note. */
  setOptions(options: OutOptions, atSeconds: number, toDeviceMs: ToDeviceMs): void {
    const o = this.#options;
    const rotated = (o.rotate ?? []).join() !== (options.rotate ?? []).join();
    if (o.bendRange !== options.bendRange || rotated) this.panic(atSeconds, toDeviceMs);
    this.#options = options;
    // (the same rotation from window to window keeps which channel is free longest)
    if (rotated) this.#rotation = options.rotate ? new Rotation(options.rotate) : null;
  }

  /**
   * Silence at `now` (a stop, a seek, All notes off, another channel table): All notes off on every channel in use, a
   * note-off for every note still held (at `now`, or at its start for one struck ahead), the bends put back; then
   * what's held is forgotten. Nothing goes later than the notes already sent ahead, so what plays next isn't cut.
   */
  panic(now: number, toDeviceMs: ToDeviceMs): void {
    this.#silence(now, toDeviceMs);
    this.#reset();
  }

  /** Forget what's held and what was sent, as after All notes off from elsewhere, or for another port. */
  forget(): void {
    this.#reset();
    this.#struck = [];
    this.#bentBack.clear();
  }

  #reset(): void {
    this.#open.clear();
    this.#pending = [];
    this.#sounding.clear();
    this.#rotation?.forget();
    this.#used.clear();
    this.#bend.clear();
    this.#bendAt.clear();
    this.#offs = [];
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
    this.#passed(n.at);
    const back = drum ? undefined : this.#bentBack.get(channel);
    if (back !== undefined) {
      // (a silencing put this channel's bend back at `back`, after a bend sent ahead: before then it isn't known, and after it, it's the centre)
      this.#sendBend(channel, n.bend, n.at, toDeviceMs);
      if (n.end > back && n.bend !== BEND_CENTRE) this.#sendBend(channel, n.bend, back, toDeviceMs);
      else this.#bend.set(channel, BEND_CENTRE);
    } else if (!drum && (this.#bend.get(channel) ?? BEND_CENTRE) !== n.bend) this.#sendBend(channel, n.bend, n.at, toDeviceMs);
    const key = `${channel}:${note}`;
    const holders = this.#open.get(key) ?? [];
    if (holders.some((h) => h.start <= n.at && n.at < h.end)) this.#send([NOTE_OFF | channel, note, 0], n.at, toDeviceMs);
    this.#send([NOTE_ON | channel, note, n.velocity], n.at, toDeviceMs);
    // a note-off a silencing left ahead, while this one sounds: struck again after it, so this one sounds on
    for (const s of this.#struck) if (s.key === key && s.at < n.end) this.#send([NOTE_ON | channel, note, n.velocity], s.at, toDeviceMs);
    if (this.#struck.length) this.#struck = this.#struck.filter((s) => !(s.key === key && s.at < n.end));
    for (const b of n.bends) this.#pending.push({ channel, value: b.value, at: b.at });
    this.#open.set(key, [...holders, { start: n.at, end: n.end }]);
  }

  /**
   * Send the bends due by `horizon`, and release every note whose end is at or before it, unless another holder on its
   * channel and key still covers that moment. `now`: the clock, before which nothing sent matters to a silencing.
   */
  advance(horizon: number, toDeviceMs: ToDeviceMs, now = -Infinity): void {
    if (!this.#port) return;
    if (this.#offs.length && this.#offs[0].at < now) this.#offs = this.#offs.filter((o) => o.at >= now);
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
        if (!stillHeld && !released.has(h.end)) {
          this.#send([NOTE_OFF | channel, note, 0], h.end, toDeviceMs);
          this.#offs.push({ key, at: h.end });
        }
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
    this.#bendAt.set(channel, Math.max(at, this.#bendAt.get(channel) ?? at));
  }

  // (notes come in start order: what a silencing left ahead before `at` no note from here on sounds across)
  #passed(at: number): void {
    if (this.#struck.length) this.#struck = this.#struck.filter((s) => s.at > at);
    for (const [c, back] of this.#bentBack) if (back <= at) this.#bentBack.delete(c);
  }

  // All notes off on every channel sent on now, a note-off for every note held (one struck ahead at its start, which
  // All notes off now can't reach), and a bend back to the centre where one was left off it, after any sent ahead
  #silence(now: number, toDeviceMs: ToDeviceMs): void {
    for (const c of this.#used) this.#send([CONTROL_CHANGE | c, ALL_NOTES_OFF, 0], now, toDeviceMs);
    for (const o of this.#offs) if (o.at > now) this.#struck.push(o);
    for (const [key, holders] of this.#open) {
      const [channel, note] = key.split(':').map(Number);
      for (const at of new Set(holders.map((h) => Math.max(now, h.start)))) {
        this.#send([NOTE_OFF | channel, note, 0], at, toDeviceMs);
        if (at > now) this.#struck.push({ key, at });
      }
    }
    for (const [c, v] of this.#bend) {
      if (v === BEND_CENTRE) continue;
      const at = Math.max(now, this.#bendAt.get(c) ?? now);
      this.#send(bendMessage(c + 1, BEND_CENTRE), at, toDeviceMs);
      if (at > now) this.#bentBack.set(c, at);
    }
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
