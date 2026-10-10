<script lang="ts">
  /**
   * MIDI, a page of the sidebar: the connection and the ports (a port chosen before that isn't plugged in shows as
   * "Not connected"), and, with an output, how the piece goes out (#205): the built-in sound on or off, each voice's
   * channel, the kit's channel and the notes of its members (a device's drum map, from a preset), the bend range and
   * the rotation of notes over channels, MIDI clock (#206). A piece with MIDI cards (#208) sets its channels itself:
   * the page says so, and the output slots its cards name each get a device here. The keys (#207): which cell they
   * play, the computer keys, thru; and the knobs learned. The pattern is Jambot's SoundPanel (yggi/jambot
   * apps/web/src/components/SoundPanel.svelte @ 8cdb6b8).
   */
  import KeysSettings from './KeysSettings.svelte';
  import LearnSettings from './LearnSettings.svelte';
  import type { Midi } from './state/midi.svelte';
  import { DRUM_PRESETS, deviceNote, presetNameOf } from '../midi/drum-presets';

  let { midi }: { midi: Midi } = $props();

  const absent = (ports: readonly { id: string }[], id: string) => id !== 'none' && id !== 'all' && !ports.some((p) => p.id === id);
  const CHANNELS = Array.from({ length: 16 }, (_, i) => i + 1);
  const preset = $derived(presetNameOf(midi.drums));
  const out = $derived(!!midi.access && midi.outPortId !== 'none');
  const byPiece = $derived(!!midi.table?.byPiece);
  const num = (e: Event) => Number((e.currentTarget as HTMLInputElement).value);
  // a number typed, set (the setter clamps it), and the field showing what was kept: a value clamped to the one already
  // there changes no state, so nothing would redraw the field
  const typed = (e: Event, set: (n: number) => void, kept: () => number) => {
    set(num(e));
    (e.currentTarget as HTMLInputElement).value = String(kept());
  };
</script>

<div class="midi">
  <section class="status" aria-label="Connection">
    <span class="dot" class:live={!!midi.access} aria-hidden="true"></span>
    <p role="status">{midi.message}</p>
    {#if !midi.access}
      <button onclick={() => midi.connect()} disabled={midi.connecting}>Connect</button>
    {/if}
  </section>

  {#if midi.access}
    <section aria-labelledby="midi-ports">
      <h4 id="midi-ports">Devices</h4>
      <label>
        Send to
        <select value={midi.outPortId} onchange={(e) => midi.chooseOutput(e.currentTarget.value)}>
          <option value="none">No MIDI output</option>
          {#each midi.ports.outputs as p (p.id)}<option value={p.id}>{p.name}</option>{/each}
          {#if absent(midi.ports.outputs, midi.outPortId)}<option value={midi.outPortId}>Not connected</option>{/if}
        </select>
      </label>
      <label>
        Listen to
        <select value={midi.inPortId} onchange={(e) => midi.chooseInput(e.currentTarget.value)}>
          <option value="none">No MIDI input</option>
          <option value="all">All inputs</option>
          {#each midi.ports.inputs as p (p.id)}<option value={p.id}>{p.name}</option>{/each}
          {#if absent(midi.ports.inputs, midi.inPortId)}<option value={midi.inPortId}>Not connected</option>{/if}
        </select>
      </label>
      <div class="buttons">
        <button onclick={() => midi.refresh()}>Refresh ports</button>
        <button onclick={() => midi.panic()} disabled={!midi.canPanic}>All notes off</button>
      </div>
    </section>

    {#if midi.slots.length}
      <section aria-labelledby="midi-slots">
        <h4 id="midi-slots">Output slots this piece uses</h4>
        {#each midi.slots as s (s.slot)}
          <div class="row">
            <span class="name">Slot {s.slot}</span>
            {#if s.slot === 1}
              <span class="plain">{midi.outPortId === 'none' ? 'Choose an output above' : absent(midi.ports.outputs, midi.outPortId) ? 'Not connected' : 'The output above'}</span>
            {:else}
              <select aria-label="Device of slot {s.slot}" value={s.id} onchange={(e) => midi.chooseSlot(s.slot, e.currentTarget.value)}>
                <option value="none">No device: not sent</option>
                {#each midi.ports.outputs as p (p.id)}<option value={p.id}>{p.name}</option>{/each}
                {#if absent(midi.ports.outputs, s.id)}<option value={s.id}>Not connected</option>{/if}
              </select>
            {/if}
          </div>
        {/each}
      </section>
    {/if}
  {/if}

  {#if out}
    <section aria-labelledby="midi-piece">
      <h4 id="midi-piece">This piece{byPiece ? ': channels set by its MIDI cards' : ''}</h4>
      {#if midi.table?.voices.length}
        <p class="hint">{byPiece ? 'Voices and their channels: set by the piece' : 'Gates and voices, and their channels'}</p>
      {/if}
      {#each midi.table?.voices ?? [] as v (`${v.voice} ${v.channel} ${v.port ?? 1}`)}
        <div class="row">
          <span class="name">&{v.voice}</span>
          {#if byPiece}
            <span class="plain">Channel {v.channel}{midi.slots.length > 1 ? `, slot ${v.port ?? 1}` : ''}</span>
          {:else}
            <select aria-label="Channel of {v.voice}" value={v.channel} onchange={(e) => midi.setChannel(v.voice, num(e))}>
              {#each CHANNELS as c (c)}<option value={c}>Channel {c}</option>{/each}
            </select>
          {/if}
        </div>
      {/each}
      {#if midi.table?.kit.length}
        <div class="row">
          <span class="name">Kit</span>
          {#if byPiece}
            <span class="plain">On the channel its card says</span>
          {:else}
            <select aria-label="Channel of the kit" value={midi.kitChannel} onchange={(e) => (midi.kitChannel = num(e))}>
              {#each CHANNELS as c (c)}<option value={c}>Channel {c}{c === 10 ? ' (GM)' : ''}</option>{/each}
            </select>
          {/if}
        </div>
        <div class="row">
          <span class="name">Drum map</span>
          <select
            aria-label="Drum map"
            value={preset}
            onchange={(e) => {
              const map = DRUM_PRESETS[e.currentTarget.value];
              if (map) midi.drums = map;
            }}
          >
            {#each Object.keys(DRUM_PRESETS) as name (name)}<option value={name}>{name}</option>{/each}
            {#if preset === 'Custom'}<option value="Custom" disabled>Custom</option>{/if}
          </select>
        </div>
        <div class="notes">
          {#each midi.table.kit as k (k.member)}
            <label class="note">
              <span class="name">&{k.member}</span>
              <input
                type="number"
                min="0"
                max="127"
                aria-label="Note of {k.member}"
                value={deviceNote(midi.drums, k.note)}
                onchange={(e) =>
                  typed(
                    e,
                    (n) => midi.setDrumNote(k.note, n),
                    () => deviceNote(midi.drums, k.note),
                  )}
              />
            </label>
          {/each}
        </div>
      {/if}
      {#if !midi.table?.voices.length && !midi.table?.kit.length}
        <p class="hint">Nothing in this piece is sent.</p>
      {/if}
      <label class="check"><input type="checkbox" checked={midi.internal} onchange={(e) => (midi.internal = e.currentTarget.checked)} /> Built-in sound too</label>
    </section>

    <section aria-labelledby="midi-clock">
      <h4 id="midi-clock">Clock and pitch</h4>
      <label class="check"><input type="checkbox" checked={midi.sendClock} onchange={(e) => (midi.sendClock = e.currentTarget.checked)} /> Send MIDI clock</label>
      {#if midi.sendClock && !midi.meter}<p class="hint" role="status">This piece has no meter, so no clock is sent.</p>{/if}
      <label class="inline">
        Bend range ±
        <input
          type="number"
          min="1"
          max="96"
          value={midi.bendRange}
          onchange={(e) =>
            typed(
              e,
              (n) => (midi.bendRange = n),
              () => midi.bendRange,
            )}
        />
        semitones
      </label>
      <label class="check">
        <input type="checkbox" checked={midi.rotate !== null} onchange={(e) => (midi.rotate = e.currentTarget.checked ? { from: 2, to: 16 } : null)} />
        A channel for each note (MPE), for microtonal pieces{byPiece ? ' (not with MIDI cards: they say the channels)' : ''}
      </label>
      {#if midi.rotate}
        <label class="inline">
          Channels
          <input
            type="number"
            min="1"
            max="16"
            aria-label="First channel"
            value={midi.rotate.from}
            onchange={(e) =>
              typed(
                e,
                (n) => (midi.rotate = { from: n, to: midi.rotate!.to }),
                () => midi.rotate!.from,
              )}
          />
          to
          <input
            type="number"
            min="1"
            max="16"
            aria-label="Last channel"
            value={midi.rotate.to}
            onchange={(e) =>
              typed(
                e,
                (n) => (midi.rotate = { from: midi.rotate!.from, to: n }),
                () => midi.rotate!.to,
              )}
          />
        </label>
      {/if}
      {#if midi.warning}<p class="hint warning" role="status">{midi.warning}</p>{/if}
    </section>
  {/if}

  <section aria-labelledby="midi-keys">
    <KeysSettings output={out} />
  </section>
  <section aria-labelledby="midi-learn">
    <LearnSettings />
  </section>
</div>

<style>
  .midi {
    display: grid;
    gap: 12px;
    font: 13px var(--font-ui);
    color: var(--text-muted);
  }
  /* a group: a card with its heading */
  section {
    display: grid;
    gap: 8px;
    padding: 10px 12px 12px;
    border: 1px solid var(--line);
    border-radius: var(--radius);
    background: var(--code-bg);
  }
  section.status {
    grid-template-columns: auto minmax(0, 1fr) auto;
    align-items: center;
    gap: 10px;
  }
  .status p {
    margin: 0;
  }
  .dot {
    width: 9px;
    height: 9px;
    border-radius: 50%;
    background: var(--text-faint);
  }
  .dot.live {
    background: var(--meter-1);
  }
  h4 {
    margin: 0;
    font: 700 12px var(--font-ui);
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--text);
  }
  label {
    display: grid;
    gap: 4px;
    font-weight: 600;
  }
  .check,
  .inline {
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: normal;
  }
  .row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1.4fr);
    align-items: center;
    gap: 8px;
  }
  .name {
    font: 13px var(--font-code);
    color: var(--text);
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .plain {
    color: var(--text-muted);
  }
  .notes {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 6px 12px;
  }
  .note {
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
  }
  .hint {
    margin: 0;
  }
  .warning {
    color: var(--danger);
  }
  select,
  button,
  input[type='number'] {
    min-height: 36px;
    padding: 0 8px;
    border-radius: 8px;
    border: 1px solid var(--line);
    background: var(--surface);
    color: var(--text);
    font: 600 13px var(--font-ui);
  }
  select {
    width: 100%;
    min-width: 0;
  }
  button {
    cursor: pointer;
  }
  button:disabled {
    color: var(--text-faint);
    cursor: default;
  }
  input[type='number'] {
    width: 64px;
  }
  .buttons {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }
  :is(select, button, input):focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }
</style>
