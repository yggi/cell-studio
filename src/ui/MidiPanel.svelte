<script lang="ts">
  /**
   * MIDI, a page of the sidebar, on webmidi's shared components (`@yggi/webmidi/ui`, decision 040), laid out as webmidi's
   * patchbay mockup shows them in Cell studio: the connection (`MidiStatus`); the setups (`SetupPicker`: a change to a
   * named setup is kept as its custom variant until saved); the patch (`PatchMatrix`): the clock, the piece's gates and
   * voices, its kit and the kit's members, then the inputs (each with its Plays choice: whether the keys and MIDI
   * learn hear it, and the voice it plays; a preset's button fills in the rest), down; the setup's outputs across; the piece's rows read only for a piece routed by its MIDI cards (the inputs, the clock and
   * the kit's notes stay editable); under it the output selected (`DeviceInspector`: its port and its device's profile,
   * kept in every setup). A kit member's note per output is edited in the matrix.
   * Then the built-in sound, the keys (#207) and the knobs learned, which stay Cell studio's. The drawer is narrow: the
   * matrix scrolls sideways under its sticky row names. Colours: `--wm-*`, mapped to the theme in `app.css`.
   */
  import { activeSetup, DEFAULT_PRESET, type PortOption } from '@yggi/webmidi/core';
  import { DeviceInspector, MidiStatus, PatchMatrix, SetupPicker } from '@yggi/webmidi/ui';
  import KeysSettings from './KeysSettings.svelte';
  import LearnSettings from './LearnSettings.svelte';
  import type { Midi } from './state/midi.svelte';

  let { midi }: { midi: Midi } = $props();

  const out = $derived(!!midi.access && midi.sending);
  const shown = $derived(activeSetup(midi.matrixBook));
  let chosen = $state<string | null>(null);
  // the output selected (by key): the one chosen while the setup has it, else the first
  const selected = $derived(shown.outputs.some((o) => o.key === chosen) ? chosen! : shown.outputs[0]!.key);
  const slot = $derived(shown.outputs.findIndex((o) => o.key === selected) + 1);
  const output = $derived(shown.outputs[slot - 1]!);
  const real = $derived(midi.columns.filter((c) => c.key).length);
  const title = $derived(midi.context.slice('piece:'.length));
  // (a device chosen for a slot a piece's cards name past the setup's outputs adds the outputs up to it)
  const choose = (p: PortOption) => midi.chooseDevice(slot, p.id);
</script>

<div class="midi">
  <section class="strip" aria-label="Connection">
    <MidiStatus
      message={midi.message}
      connected={!!midi.access}
      connecting={midi.connecting}
      missing={midi.missing}
      onconnect={() => midi.connect()}
      onrefresh={() => midi.refresh()}
      onpanic={() => midi.panic()}
      canPanic={midi.canPanic}
    />
  </section>

  {#if midi.access}
    <section class="strip" aria-label="Setups">
      <SetupPicker book={midi.book} plugged={midi.ports.outputs} onchange={(b) => midi.setBook(b)} />
    </section>

    <section class="card" aria-labelledby="midi-patch">
      <div class="head">
        <h4 id="midi-patch">Patch{title ? ` · ${title}` : ''}</h4>
        <p class="hint">
          {midi.locked
            ? 'Routed by its MIDI cards: the channels they send each voice on, by output slot. The inputs and the clock are yours to route.'
            : 'The piece’s voices and the inputs down, the setup’s outputs across. Tap a jack for its channel.'}
        </p>
      </div>
      <PatchMatrix
        book={midi.matrixBook}
        context={midi.context}
        rows={midi.matrixRows}
        inputs={midi.ports.inputs}
        outputs={midi.ports.outputs}
        heardBy="the keys and MIDI learn"
        preset={DEFAULT_PRESET}
        {selected}
        locked={midi.locked}
        onchange={(b) => midi.changeMatrix(b)}
        onselect={(key) => (chosen = key)}
      />
      {#if midi.clocking && !midi.meter}<p class="hint" role="status">This piece has no meter, so no clock is sent.</p>{/if}
      {#if midi.warning}<p class="hint warning" role="status">{midi.warning}</p>{/if}
      <label class="check"><input type="checkbox" checked={midi.internal} onchange={(e) => (midi.internal = e.currentTarget.checked)} /> Built-in sound too</label>
    </section>

    <section class="card inspector" aria-label="Output {slot}">
      <DeviceInspector
        {output}
        {slot}
        ports={midi.ports.outputs}
        profile={midi.profileOf(slot)}
        used={midi.usedOn(slot)}
        drums={midi.rows.kit}
        canRemove={slot <= real && real > 1}
        onport={choose}
        onprofile={(change) => midi.setProfile(slot, change)}
        ontest={() => midi.testNote(slot)}
        onpanic={() => midi.panicOn(slot)}
        onremove={() => midi.removeOutput(slot)}
      />
      {#if midi.locked}<p class="hint below">A channel per note (MPE) is off for a piece with MIDI cards: they say the channels.</p>{/if}
    </section>
  {/if}

  <section class="card" aria-labelledby="midi-keys">
    <KeysSettings output={out} />
  </section>
  <section class="card" aria-labelledby="midi-learn">
    <LearnSettings />
  </section>
</div>

<style>
  .midi {
    display: grid;
    gap: 12px;
    min-width: 0;
    font: 13px var(--font-ui);
    color: var(--text-muted);
  }
  /* a group: a card; the strips are its shorter kin */
  section {
    display: grid;
    gap: 8px;
    min-width: 0;
    padding: 10px 12px 12px;
    border: 1px solid var(--line);
    border-radius: var(--radius);
    background: var(--code-bg);
  }
  .strip {
    padding: 10px 12px;
  }
  /* the inspector's blocks reach the card's edges */
  .inspector {
    padding: 0;
    gap: 0;
  }
  .head {
    display: grid;
    gap: 2px;
  }
  h4 {
    margin: 0;
    overflow: hidden;
    font: 700 12px var(--font-ui);
    letter-spacing: 0.06em;
    text-transform: uppercase;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--text);
  }
  .hint {
    margin: 0;
  }
  .below {
    padding: 0 14px 12px;
  }
  .warning {
    color: var(--danger);
  }
  .check {
    display: flex;
    align-items: center;
    gap: 8px;
  }
</style>
