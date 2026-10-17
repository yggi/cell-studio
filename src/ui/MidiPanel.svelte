<script lang="ts">
  /**
   * MIDI, a page of the sidebar: the connection and the ports (a port chosen before that isn't plugged in shows as
   * "Not connected"); the outputs, each a device with its drum map and MIDI clock (#206), added and removed; and the
   * routing of the piece (#205), a matrix of its voices (rows) and the outputs (columns), each crossing the channel the
   * voice goes out on there, or none; the kit's members with the note each output sends them as. A piece with MIDI
   * cards (#208) sets its crossings itself: the matrix shows them, its slots the outputs. The built-in sound on or
   * off; each output's bend range and rotation of notes over channels (MPE). The keys (#207): which cell they play, the computer
   * keys, thru; and the knobs learned. The pattern is Jambot's SoundPanel (yggi/jambot
   * apps/web/src/components/SoundPanel.svelte @ 8cdb6b8).
   */
  import KeysSettings from './KeysSettings.svelte';
  import LearnSettings from './LearnSettings.svelte';
  import type { Midi } from './state/midi.svelte';
  import { DRUM_PRESETS, deviceNote, presetNameOf } from '@yggi/webmidi/core';

  let { midi }: { midi: Midi } = $props();

  const absent = (ports: readonly { id: string }[], id: string) => id !== 'none' && id !== 'all' && !ports.some((p) => p.id === id);
  const CHANNELS = Array.from({ length: 16 }, (_, i) => i + 1);
  const out = $derived(!!midi.access && midi.sending);
  const routing = $derived(!!midi.access && midi.sending);
  const byPiece = $derived(!!midi.table?.byPiece);
  const num = (e: Event) => Number((e.currentTarget as HTMLInputElement).value);
  // a number typed, set (the setter clamps it), and the field showing what was kept: a value clamped to the one already
  // there changes no state, so nothing would redraw the field
  const typed = (e: Event, set: (n: number) => void, kept: () => number) => {
    set(num(e));
    (e.currentTarget as HTMLInputElement).value = String(kept());
  };
  const deviceName = (c: { id: string; name: string }) => (c.id === 'none' ? 'No device' : absent(midi.ports.outputs, c.id) ? `${c.name || 'A device'} (not connected)` : c.name);
  const listed = (channels: readonly number[]) => (channels.length ? channels.join(', ') : '—');
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
    <section aria-labelledby="midi-outputs">
      <h4 id="midi-outputs">Outputs</h4>
      {#each midi.columns as c (c.key ?? `slot ${c.port}`)}
        <div class="output">
          <span class="num" aria-hidden="true">{c.port}</span>
          <select aria-label="Device of output {c.port}" value={c.id} onchange={(e) => midi.chooseDevice(c.port, e.currentTarget.value)}>
            <option value="none">{c.port === 1 ? 'No MIDI output' : 'No device: not sent'}</option>
            {#each midi.ports.outputs as p (p.id)}<option value={p.id}>{p.name}</option>{/each}
            {#if absent(midi.ports.outputs, c.id)}<option value={c.id}>Not connected</option>{/if}
          </select>
          <button
            class="remove"
            aria-label="Remove output {c.port}"
            title="Remove this output"
            disabled={!c.key || midi.columns.length < 2}
            onclick={() => midi.removeOutput(c.port)}>×</button
          >
          {#if c.id !== 'none'}
            <div class="extras">
              <label class="check"><input type="checkbox" checked={midi.clockOf(c.port)} onchange={(e) => midi.setClock(c.port, e.currentTarget.checked)} /> Clock</label>
              {#if midi.rows.kit}
                {@const preset = presetNameOf(midi.drumsOf(c.port))}
                <select
                  aria-label="Drum map of output {c.port}"
                  value={preset}
                  onchange={(e) => {
                    const map = DRUM_PRESETS[e.currentTarget.value];
                    if (map) midi.setDrums(c.port, map);
                  }}
                >
                  {#each Object.keys(DRUM_PRESETS) as name (name)}<option value={name}>Drums: {name}</option>{/each}
                  {#if preset === 'Custom'}<option value="Custom" disabled>Drums: Custom</option>{/if}
                </select>
              {/if}
            </div>
          {/if}
        </div>
      {/each}
      {#if midi.spare.length && midi.columns.length < 16}
        <div class="spare">
          {#each midi.spare as p (p.id)}
            <button onclick={() => midi.addOutput(p.id)} title="Add an output sending to {p.name}">+ {p.name}</button>
          {/each}
        </div>
      {/if}
      {#if midi.clocking && !midi.meter}<p class="hint" role="status">This piece has no meter, so no clock is sent.</p>{/if}
    </section>

    <section aria-labelledby="midi-ports">
      <h4 id="midi-ports">Input</h4>
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
  {/if}

  {#if routing}
    <section aria-labelledby="midi-piece">
      <h4 id="midi-piece">This piece{byPiece ? ': routed by its MIDI cards' : ''}</h4>
      {#if midi.rows.voices.length || midi.rows.kit}
        <p class="hint">{byPiece ? 'The channels its cards send each voice on, by output slot' : 'Each voice’s channel on each output; — is not sent there'}</p>
        <div class="matrix">
          <table>
            <thead>
              <tr>
                <th scope="col"><span class="hidden">Voice</span></th>
                {#each midi.columns as c (c.key ?? `slot ${c.port}`)}
                  <th scope="col" title={deviceName(c)}>{c.port}<span class="device">{deviceName(c)}</span></th>
                {/each}
              </tr>
            </thead>
            <tbody>
              {#each midi.rows.voices as voice (voice)}
                <tr>
                  <th scope="row">&{voice}</th>
                  {#each midi.columns as c (c.key ?? `slot ${c.port}`)}
                    {@const channels = midi.channelsOf(voice, c.port)}
                    <td>
                      {#if byPiece}
                        <span class="plain">{listed(channels)}</span>
                      {:else}
                        <select aria-label="Channel of {voice} on output {c.port}" value={channels[0] ?? 0} onchange={(e) => midi.setChannel(voice, num(e), c.port)}>
                          <option value={0}>—</option>
                          {#each CHANNELS as ch (ch)}<option value={ch}>{ch}</option>{/each}
                        </select>
                      {/if}
                    </td>
                  {/each}
                </tr>
              {/each}
              {#if midi.rows.kit}
                <tr>
                  <th scope="row">Kit</th>
                  {#each midi.columns as c (c.key ?? `slot ${c.port}`)}
                    {@const channels = midi.kitChannelsOf(c.port)}
                    <td>
                      {#if byPiece}
                        <span class="plain">{listed(channels)}</span>
                      {:else}
                        <select aria-label="Channel of the kit on output {c.port}" value={channels[0] ?? 0} onchange={(e) => midi.setKitChannel(num(e), c.port)}>
                          <option value={0}>—</option>
                          {#each CHANNELS as ch (ch)}<option value={ch}>{ch}{ch === 10 ? ' GM' : ''}</option>{/each}
                        </select>
                      {/if}
                    </td>
                  {/each}
                </tr>
                {#each midi.table?.kit ?? [] as k (k.member)}
                  <tr class="member">
                    <th scope="row">&{k.member}</th>
                    {#each midi.columns as c (c.key ?? `slot ${c.port}`)}
                      <td>
                        {#if midi.kitChannelsOf(c.port).length}
                          <input
                            type="number"
                            min="0"
                            max="127"
                            aria-label="Note of {k.member} on output {c.port}"
                            value={deviceNote(midi.drumsOf(c.port), k.note)}
                            onchange={(e) =>
                              typed(
                                e,
                                (n) => midi.setDrumNote(k.note, n, c.port),
                                () => deviceNote(midi.drumsOf(c.port), k.note),
                              )}
                          />
                        {/if}
                      </td>
                    {/each}
                  </tr>
                {/each}
              {/if}
            </tbody>
          </table>
        </div>
      {:else}
        <p class="hint">Nothing in this piece is sent.</p>
      {/if}
      <label class="check"><input type="checkbox" checked={midi.internal} onchange={(e) => (midi.internal = e.currentTarget.checked)} /> Built-in sound too</label>
    </section>

    <section aria-labelledby="midi-pitch">
      <h4 id="midi-pitch">Pitch</h4>
      <p class="hint">
        Per output: the synth's bend range, and a channel for each note (MPE), for microtonal pieces{byPiece ? ' (not with MIDI cards: they say the channels)' : ''}
      </p>
      {#each midi.columns.filter((c) => c.key && c.id !== 'none') as c (c.key)}
        {@const range = midi.rotateOf(c.port)}
        <div class="pitch">
          <span class="num" aria-hidden="true">{c.port}</span>
          <label class="inline">
            ±
            <input
              type="number"
              min="1"
              max="96"
              aria-label="Bend range of output {c.port}, in semitones"
              value={midi.bendOf(c.port)}
              onchange={(e) =>
                typed(
                  e,
                  (n) => midi.setBend(c.port, n),
                  () => midi.bendOf(c.port),
                )}
            />
          </label>
          <label class="check">
            <input
              type="checkbox"
              aria-label="A channel for each note on output {c.port} (MPE)"
              checked={range !== null}
              onchange={(e) => midi.setRotate(c.port, e.currentTarget.checked ? { from: 2, to: 16 } : null)}
            /> MPE
          </label>
          {#if range}
            <label class="inline">
              channels
              <input
                type="number"
                min="1"
                max="16"
                aria-label="First channel of output {c.port}"
                value={range.from}
                onchange={(e) =>
                  typed(
                    e,
                    (n) => midi.setRotate(c.port, { from: n, to: range.to }),
                    () => midi.rotateOf(c.port)!.from,
                  )}
              />
              to
              <input
                type="number"
                min="1"
                max="16"
                aria-label="Last channel of output {c.port}"
                value={range.to}
                onchange={(e) =>
                  typed(
                    e,
                    (n) => midi.setRotate(c.port, { from: range.from, to: n }),
                    () => midi.rotateOf(c.port)!.to,
                  )}
              />
            </label>
          {/if}
        </div>
      {/each}
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
  /* an output: its number, its device, remove; under them its clock and drum map */
  .output {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    align-items: center;
    gap: 6px 8px;
  }
  .num {
    min-width: 1.5em;
    font: 700 13px var(--font-code);
    color: var(--text);
    text-align: center;
  }
  .extras {
    grid-column: 2 / -1;
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    align-items: center;
    gap: 8px;
  }
  .remove {
    width: 36px;
    padding: 0;
  }
  /* an output's pitch: its number, its bend range, MPE and its channels */
  .pitch {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px 12px;
  }
  .spare {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  /* the routing: voices down, outputs across; wider than the drawer, it scrolls sideways, the voices' names staying */
  .matrix {
    overflow-x: auto;
  }
  table {
    border-collapse: collapse;
    width: 100%;
  }
  th,
  td {
    padding: 2px 3px;
    text-align: center;
    font-weight: normal;
  }
  thead th {
    font: 700 12px var(--font-code);
    color: var(--text);
    max-width: 88px;
  }
  .device {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font: 11px var(--font-ui);
    color: var(--text-muted);
  }
  .hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
  }
  tbody th {
    position: sticky;
    left: 0;
    max-width: 110px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    text-align: left;
    font: 13px var(--font-code);
    color: var(--text);
    background: var(--code-bg);
  }
  .member th {
    padding-left: 14px;
    color: var(--text-muted);
  }
  td select {
    min-width: 56px;
  }
  .plain {
    color: var(--text-muted);
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
