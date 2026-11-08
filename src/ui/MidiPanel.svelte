<script lang="ts">
  /**
   * MIDI, a page of the sidebar, on webmidi's shared components (`@yggi/webmidi/ui`, decision 040), laid out as webmidi's
   * patchbay mockup shows them in Cell studio: the connection (`MidiStatus`); the setups (`SetupPicker`: a change to a
   * named setup is kept as its custom variant until saved); the patch (`PatchMatrix`): the clock, the piece's gates and
   * voices, its kit and the kit's members, then the inputs (each with its Plays choice: whether the keys and MIDI
   * learn hear it, and the voice it plays; a preset's button fills in the rest), down; the setup's outputs across; the piece's rows read only for a piece routed by its MIDI cards (the inputs, the clock and
   * the kit's notes stay editable), an output's × removing it after asking; an output's device settings (`DeviceInspector`:
   * its port and its device's profile, kept in every setup) in a dialog over the page, opened from the output's head or
   * its button under the patch. A kit member's note per output is edited in the matrix.
   * Then the built-in sound, the keys (#207) and the knobs learned, which stay Cell studio's. The sidebar is the whole
   * width of the window on this page (Sidebar.svelte), so the matrix has room. Colours: `--wm-*`, mapped to the theme in
   * `app.css`.
   *
   * What went wrong with MIDI lately (`midi.problems`) is listed until dismissed, and the connection, the setups and the
   * patch sit in a boundary: whatever throws there is shown with its error and a way back (try again, or reset the MIDI
   * settings), and the rest of the page goes on, where an error in a keyed list would have stopped it redrawing.
   */
  import { activeSetup, DEFAULT_PRESET, hardwareOutputs, isBuiltIn, type PortOption } from '@yggi/webmidi/core';
  import { DeviceInspector, MidiStatus, PatchMatrix, SetupPicker } from '@yggi/webmidi/ui';
  import KeysSettings from './KeysSettings.svelte';
  import LearnSettings from './LearnSettings.svelte';
  import type { Midi } from './state/midi.svelte';

  let { midi }: { midi: Midi } = $props();

  const out = $derived(!!midi.access && midi.sending);
  const shown = $derived(activeSetup(midi.matrixBook));
  // the output whose device settings are open (by key), while the setup has it; else none
  let inspecting = $state<string | null>(null);
  const output = $derived(shown.outputs.find((o) => o.key === inspecting) ?? null);
  // an output's number, counting those that send MIDI (a piece's MIDI cards name them so); the built-in has none
  const slotOf = (key: string) => hardwareOutputs(shown).findIndex((o) => o.key === key) + 1;
  const slot = $derived(output ? slotOf(output.key) : 0);
  const real = $derived(midi.columns.filter((c) => c.key).length);
  const title = $derived(midi.context.slice('piece:'.length));
  // (a device chosen for a slot a piece's cards name past the setup's outputs adds the outputs up to it)
  const choose = (p: PortOption) => midi.chooseDevice(slot, p.id);
  const SOUND = 'Sound';
  const outLabel = (o: { id: string; name: string }) => (isBuiltIn(o) ? SOUND : o.id === 'none' ? 'No device' : o.name || o.id);

  let dialog = $state<HTMLDialogElement>();
  // the dialog follows what is inspected: shown modal (over everything; Escape closes it), or closed
  $effect(() => {
    if (!dialog) return;
    if (output && !dialog.open) dialog.showModal();
    else if (!output && dialog.open) dialog.close();
  });
  const close = () => (inspecting = null);

  let confirmingReset = $state(false);
  function reset() {
    confirmingReset = false;
    inspecting = null;
    midi.reset();
  }
</script>

<div class="midi">
  <svelte:boundary onerror={(error) => console.error('The MIDI settings stopped:', error)}>
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
      {#if midi.problems.length}
        <ul class="problems" role="alert" aria-label="MIDI problems">
          {#each midi.problems as problem (problem)}<li>{problem}</li>{/each}
        </ul>
        <button type="button" class="quiet" onclick={() => midi.dismissProblems()}>Dismiss</button>
      {/if}
    </section>

    {#if !midi.access && !midi.internal}
      <p class="strip warning" role="status">
        This setup plays MIDI only, and MIDI isn't connected: nothing is heard.
        <button type="button" onclick={() => midi.setBuiltIn(true)}>Hear the built-in sound</button>
      </p>
    {/if}
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
          builtIn={{ label: SOUND, rows: false }}
          {...inspecting ? { selected: inspecting } : {}}
          locked={midi.locked}
          onchange={(b) => midi.changeMatrix(b)}
          onselect={(key) => (inspecting = key)}
        />
        <div class="devices" role="group" aria-label="Device settings">
          <span>Device settings</span>
          {#each shown.outputs as o (o.key)}
            <button type="button" onclick={() => (inspecting = o.key)}><b>{isBuiltIn(o) ? 'BUILT-IN' : `OUT ${slotOf(o.key)}`}</b> {outLabel(o)}</button>
          {/each}
        </div>
        {#if midi.clocking && !midi.meter}<p class="hint" role="status">This piece has no meter, so no clock is sent.</p>{/if}
        {#if midi.warning}<p class="hint warning" role="status">{midi.warning}</p>{/if}
      </section>

      <section class="strip reset" aria-label="Reset">
        {#if confirmingReset}
          <span>Forget every MIDI setup and device setting on this device?</span>
          <button type="button" class="danger" onclick={reset}>Reset MIDI settings</button>
          <button type="button" class="quiet" onclick={() => (confirmingReset = false)}>Keep</button>
        {:else}
          <button type="button" class="quiet" onclick={() => (confirmingReset = true)}>Reset MIDI settings…</button>
        {/if}
      </section>

      <dialog
        class="inspect"
        aria-label={output ? `${isBuiltIn(output) ? 'BUILT-IN' : `OUT ${slot}`}: ${outLabel(output)}` : 'Device settings'}
        bind:this={dialog}
        onclose={close}
        onclick={(e) => e.target === dialog && close()}
      >
        {#if output && isBuiltIn(output)}
          <div class="frame">
            <button type="button" class="close" aria-label="Close" onclick={close}>×</button>
            <section class="builtin" aria-labelledby="builtin-title">
              <p class="eyebrow">Built-in · this device</p>
              <h3 id="builtin-title">{SOUND}</h3>
              <p class="hint">
                The piece's own sound, heard here, as the piece says: a voice only on a MIDI card the piece leaves silent isn't. Voice by voice from here comes later; for now this
                setup hears it whole, or not at all.
              </p>
              <button
                type="button"
                class="danger"
                onclick={() => {
                  midi.setBuiltIn(false);
                  close();
                }}>Remove from this setup</button
              >
              <p class="hint">Removed, this setup plays MIDI only. + {SOUND} beside the patch's outputs brings it back.</p>
            </section>
          </div>
        {:else if output}
          <div class="frame">
            <button type="button" class="close" aria-label="Close" onclick={close}>×</button>
            <DeviceInspector
              {output}
              {slot}
              ports={midi.ports.outputs}
              profile={midi.profileOf(slot)}
              used={midi.usedOn(slot)}
              drums={midi.rows.kit}
              canRemove={slot <= real && (real > 1 || output.id !== 'none')}
              onport={choose}
              onprofile={(change) => midi.setProfile(slot, change)}
              ontest={() => midi.testNote(slot)}
              onpanic={() => midi.panicOn(slot)}
              onremove={() => {
                midi.removeOutput(slot);
                close();
              }}
              {...midi.hasProfile(slot) ? { onforget: () => midi.forgetDevice(slot) } : {}}
            />
            {#if midi.locked}<p class="hint below">A channel per note (MPE) is off for a piece with MIDI cards: they say the channels.</p>{/if}
          </div>
        {/if}
      </dialog>
    {/if}

    {#snippet failed(error, retry)}
      <section class="failed" role="alert">
        <p>The MIDI settings hit a problem and were stopped, so the rest of Cell studio keeps working.</p>
        <p><code>{error instanceof Error ? `${error.name}: ${error.message}` : String(error)}</code></p>
        <div class="actions">
          <button type="button" onclick={retry}>Try again</button>
          <button
            type="button"
            class="danger"
            onclick={() => {
              reset();
              retry();
            }}>Reset MIDI settings</button
          >
        </div>
      </section>
    {/snippet}
  </svelte:boundary>

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
  p.strip {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
    margin: 0;
    border: 1px solid var(--line);
    border-radius: var(--radius);
    background: var(--code-bg);
  }
  p.strip button {
    min-height: 34px;
    padding: 0 12px;
    border: 1px solid var(--line);
    border-radius: var(--radius);
    background: var(--surface);
    color: var(--text);
    font: inherit;
    cursor: pointer;
  }
  /* the built-in's settings, in the dialog */
  .builtin {
    border: 0;
    padding: 16px 18px 18px;
    background: none;
  }
  .builtin h3 {
    margin: 0;
    font: 700 20px var(--font-ui);
    color: var(--text);
  }
  .eyebrow {
    margin: 0;
    font: 700 12px var(--font-ui);
    letter-spacing: 0.09em;
    text-transform: uppercase;
    color: var(--accent);
  }
  .builtin button {
    justify-self: start;
    min-height: 40px;
    padding: 0 14px;
    border: 1px solid var(--line);
    border-radius: var(--radius);
    background: none;
    font: inherit;
    cursor: pointer;
  }
  .problems {
    display: grid;
    gap: 4px;
    margin: 0;
    padding: 8px 12px 8px 28px;
    border: 1px solid var(--warning);
    border-radius: var(--radius);
    color: var(--text);
  }
  .devices,
  .reset,
  .actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px 8px;
  }
  .devices button,
  .reset button,
  .failed button {
    min-height: 34px;
    padding: 0 12px;
    border: 1px solid var(--line);
    border-radius: var(--radius);
    background: var(--surface);
    color: var(--text);
    font: inherit;
    cursor: pointer;
  }
  .devices b {
    margin-right: 4px;
    font-size: 11px;
    color: var(--text-muted);
  }
  button.quiet {
    justify-self: start;
    border: 0;
    background: none;
    color: var(--text-muted);
    padding: 0 4px;
    font: inherit;
    cursor: pointer;
  }
  button.danger {
    border-color: var(--danger);
    color: var(--danger);
  }
  .failed {
    border-color: var(--warning);
    color: var(--text);
  }
  .failed p {
    margin: 0;
  }
  .failed code {
    overflow-wrap: anywhere;
  }
  /* an output's device settings: a dialog over the page, a sheet from the bottom on a phone, centred where there is room */
  .inspect {
    width: min(440px, 100vw);
    max-width: 100vw;
    max-height: 88svh;
    margin: auto auto 0;
    padding: 0;
    border: 1px solid var(--line);
    border-radius: 16px 16px 0 0;
    background: var(--code-bg);
    color: var(--text);
    overflow: auto;
  }
  @media (min-width: 640px) and (min-height: 560px) {
    .inspect {
      margin: auto;
      border-radius: 16px;
    }
  }
  .inspect::backdrop {
    background: var(--scrim);
  }
  .frame {
    position: relative;
    padding-bottom: env(safe-area-inset-bottom, 0px);
  }
  .close {
    position: absolute;
    top: 6px;
    right: 8px;
    z-index: 1;
    width: 40px;
    height: 40px;
    border: 0;
    background: none;
    color: var(--text-muted);
    font-size: 26px;
    line-height: 1;
    cursor: pointer;
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
</style>
