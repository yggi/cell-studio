<script lang="ts">
  /**
   * MIDI on this device: connect, the output and the input chosen, and All notes off. A port chosen before that isn't
   * plugged in shows as "Not connected". With an output, how the piece goes out (#205): the built-in sound on or off,
   * each voice's channel, the kit's members with the notes they send (a device's drum map, from a preset), the bend
   * range and the rotation of notes over channels. The pattern is Jambot's SoundPanel (yggi/jambot apps/web/src/components/SoundPanel.svelte @ 8cdb6b8).
   */
  import Dialog from './kit/Dialog.svelte';
  import type { Midi } from './state/midi.svelte';
  import { DRUM_PRESETS, deviceNote, presetNameOf } from '../midi/drum-presets';

  let { midi, onclose }: { midi: Midi; onclose: () => void } = $props();

  const absent = (ports: readonly { id: string }[], id: string) => id !== 'none' && id !== 'all' && !ports.some((p) => p.id === id);
  const CHANNELS = Array.from({ length: 16 }, (_, i) => i + 1);
  const preset = $derived(presetNameOf(midi.drums));
  const num = (e: Event) => Number((e.currentTarget as HTMLInputElement).value);
  // a number typed, set (the setter clamps it), and the field showing what was kept: a value clamped to the one already
  // there changes no state, so nothing would redraw the field
  const typed = (e: Event, set: (n: number) => void, kept: () => number) => {
    set(num(e));
    (e.currentTarget as HTMLInputElement).value = String(kept());
  };
</script>

<Dialog label="MIDI" {onclose} width={420}>
  <header>
    <h3>MIDI</h3>
    <button class="unstyled x" onclick={onclose} aria-label="Close">×</button>
  </header>
  <p class="message" role="status">{midi.message}</p>
  {#if midi.access}
    <label>
      Send to output
      <select value={midi.outPortId} onchange={(e) => midi.chooseOutput(e.currentTarget.value)}>
        <option value="none">No MIDI output</option>
        {#each midi.ports.outputs as p (p.id)}<option value={p.id}>{p.name}</option>{/each}
        {#if absent(midi.ports.outputs, midi.outPortId)}<option value={midi.outPortId}>Not connected</option>{/if}
      </select>
    </label>
    <label>
      Listen to input
      <select value={midi.inPortId} onchange={(e) => midi.chooseInput(e.currentTarget.value)}>
        <option value="none">No MIDI input</option>
        <option value="all">All inputs</option>
        {#each midi.ports.inputs as p (p.id)}<option value={p.id}>{p.name}</option>{/each}
        {#if absent(midi.ports.inputs, midi.inPortId)}<option value={midi.inPortId}>Not connected</option>{/if}
      </select>
    </label>
  {/if}
  {#if midi.access && midi.outPortId !== 'none'}
    <div class="out">
      <label class="check"><input type="checkbox" checked={midi.internal} onchange={(e) => (midi.internal = e.currentTarget.checked)} /> Built-in sound too</label>
      {#if midi.table?.voices.length}
        <table>
          <caption>Voices and their channels</caption>
          <tbody>
            {#each midi.table.voices as v (v.voice)}
              <tr>
                <th scope="row">&{v.voice}</th>
                <td>
                  <select aria-label="Channel of {v.voice}" value={v.channel} onchange={(e) => midi.setChannel(v.voice, num(e))}>
                    {#each CHANNELS as c (c)}<option value={c}>Channel {c}</option>{/each}
                  </select>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      {/if}
      {#if midi.table?.kit.length}
        <table>
          <caption>
            Kit on channel 10
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
          </caption>
          <tbody>
            {#each midi.table.kit as k (k.member)}
              <tr>
                <th scope="row">&{k.member}</th>
                <td>
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
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      {/if}
      <label class="inline">
        Bend range ± <input
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
        /> semitones
      </label>
      <label class="check">
        <input type="checkbox" checked={midi.rotate !== null} onchange={(e) => (midi.rotate = e.currentTarget.checked ? { from: 2, to: 16 } : null)} />
        A channel for each note (MPE), for microtonal pieces
      </label>
      {#if midi.rotate}
        <label class="inline">
          Channels <input
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
      {#if midi.warning}<p class="message warning" role="status">{midi.warning}</p>{/if}
    </div>
  {/if}
  <div class="buttons">
    {#if midi.access}
      <button onclick={() => midi.refresh()}>Refresh ports</button>
      <button onclick={() => midi.panic()} disabled={!midi.outPort}>All notes off</button>
    {:else}
      <button onclick={() => midi.connect()} disabled={midi.connecting}>Connect MIDI</button>
    {/if}
  </div>
</Dialog>

<style>
  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  h3 {
    margin: 0 4px;
    font: 600 16px var(--font-ui);
  }
  .x {
    font-size: 24px;
    color: var(--text-muted);
    padding: 0 8px;
  }
  .message {
    margin: 0 4px;
    font: 14px var(--font-ui);
    color: var(--text-muted);
  }
  label {
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin: 0 4px;
    font: 600 13px var(--font-ui);
    color: var(--text-muted);
  }
  select,
  .buttons button {
    min-height: 44px;
    padding: 0 10px;
    border-radius: 10px;
    border: 1px solid var(--line);
    background: var(--code-bg);
    color: var(--text);
    font: 600 14px var(--font-ui);
  }
  .buttons button {
    cursor: pointer;
  }
  .buttons button:disabled {
    color: var(--text-faint);
    cursor: default;
  }
  .out {
    display: flex;
    flex-direction: column;
    gap: 8px;
    max-height: 45vh;
    overflow-y: auto;
  }
  .check,
  .inline {
    flex-direction: row;
    align-items: center;
    gap: 6px;
  }
  .warning {
    color: var(--danger);
  }
  table {
    margin: 0 4px;
    border-collapse: collapse;
    font: 14px var(--font-ui);
  }
  caption {
    text-align: left;
    font: 600 13px var(--font-ui);
    color: var(--text-muted);
    padding-bottom: 4px;
  }
  th {
    text-align: left;
    font: 14px var(--font-code);
    color: var(--text);
    padding-right: 8px;
  }
  td select,
  caption select,
  input[type='number'] {
    min-height: 36px;
    padding: 0 6px;
    border-radius: 8px;
    border: 1px solid var(--line);
    background: var(--code-bg);
    color: var(--text);
    font: 14px var(--font-ui);
  }
  input[type='number'] {
    width: 64px;
  }
  .buttons {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 6px;
  }
</style>
