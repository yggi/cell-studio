<script lang="ts">
  /**
   * MIDI, a page of the sidebar, on webmidi's shared components (`@yggi/webmidi/ui`, decision 040), laid out as webmidi's
   * patchbay mockup shows them in Cell studio: the connection (`MidiStatus`); the setups (`SetupPicker`: a change to a
   * named setup is kept as its custom variant until saved); the patch (`PatchMatrix`): the clock, the piece's gates and
   * voices and its kit, then the inputs (each with its Plays choice: whether the keys and MIDI
   * learn hear it, and the voice it plays; a preset's button fills in the rest), down; the setup's outputs across; the piece's rows read only for a piece routed by its MIDI cards (the inputs, the clock and
   * the kit's notes stay editable), an output's × removing it after asking; an output's device settings (its port, its device's profile kept in every setup,
   * each drum's note) in the matrix's own dialog, opened from the output's head, with its test note and notes off. The built-in's
   * head opens Cell studio's own dialog (its settings are the frontend's, decision 004 in webmidi).
   * Then the control panels (webmidi's decisions 005 and 007): the library's, those the setup has active as rows and columns of the patch and as
   * tabs to play, edit, make, open and save as files. A panel's row sends where it is crossed; Its Plays choice says what Cell studio's own sound plays of it (a voice, the kit, the armed cell), as an input's does.
   * Then the built-in sound, the keys (#207) and the knobs learned, which stay Cell studio's. The sidebar is the whole
   * width of the window on this page (Sidebar.svelte), so the matrix has room. Colours: `--wm-*`, mapped to the theme in
   * `app.css`.
   *
   * What went wrong with MIDI lately (`midi.problems`) is listed until dismissed, and the connection, the setups and the
   * patch sit in a boundary: whatever throws there is shown with its error and a way back (try again, or reset the MIDI
   * settings), and the rest of the page goes on, where an error in a keyed list would have stopped it redrawing.
   */
  import { activeSetup, DEFAULT_PRESET, hardwareOutputs, isBuiltIn, panelsOf } from '@yggi/webmidi/core';
  import { panelOf } from '@yggi/webmidi/panels';
  import { MidiStatus, PatchMatrix, SetupPicker } from '@yggi/webmidi/ui';
  import { PanelEditor, PanelView } from '@yggi/webmidi/ui/panels';
  import KeysSettings from './KeysSettings.svelte';
  import LearnSettings from './LearnSettings.svelte';
  import type { Midi } from './state/midi.svelte';

  let { midi }: { midi: Midi } = $props();

  const out = $derived(!!midi.access && midi.sending);
  const shown = $derived(activeSetup(midi.matrixBook));
  // the built-in's settings are open: Cell studio's own dialog, since its settings are the frontend's (decision 004 in webmidi)
  let builtin = $state(false);
  const hasBuiltIn = $derived(shown.outputs.some(isBuiltIn));
  // an output's number, counting those that send MIDI (a piece's MIDI cards name them so); the built-in has none
  const slotOf = (key: string) => hardwareOutputs(shown).findIndex((o) => o.key === key) + 1;
  // the panels: the library's, those the setup in use has active as tabs, the one shown played or edited
  const active = $derived(panelsOf(shown).flatMap((id) => panelOf(midi.library, id) ?? []));
  const runtime = $derived(midi.runtimeOf(midi.shownPanel));
  const shownPanel = $derived(midi.shownPanel === null ? undefined : panelOf(midi.library, midi.shownPanel));
  let editing = $state(false);
  let problem = $state<string | null>(null);
  let file = $state<HTMLInputElement>();
  async function chosen() {
    const picked = file?.files?.[0];
    if (!picked) return;
    problem = midi.importPanel(await picked.text());
    if (file) file.value = '';
  }
  function save() {
    const out = midi.shownPanel === null ? null : midi.exportPanel(midi.shownPanel);
    if (!out) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([out.text], { type: 'application/json' }));
    a.download = out.filename;
    a.click();
    URL.revokeObjectURL(a.href);
  }
  const title = $derived(midi.context.slice('piece:'.length));
  const SOUND = 'Sound';

  let dialog = $state<HTMLDialogElement>();
  // the dialog follows what is inspected: shown modal (over everything; Escape closes it), or closed
  $effect(() => {
    if (!dialog) return;
    if (builtin && hasBuiltIn && !dialog.open) dialog.showModal();
    else if (!(builtin && hasBuiltIn) && dialog.open) dialog.close();
  });
  const close = () => (builtin = false);

  let confirmingReset = $state(false);
  function reset() {
    confirmingReset = false;
    builtin = false;
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
          panels={midi.library.panels}
          onpanel={(id) => ((midi.shownPanel = id), (editing = false))}
          locked={midi.locked}
          onchange={(b) => midi.changeMatrix(b)}
          ontest={(key) => midi.testNote(slotOf(key))}
          onpanic={(key) => midi.panicOn(slotOf(key))}
          onbuiltin={() => (builtin = true)}
        />
        {#if midi.clocking && !midi.meter}<p class="hint" role="status">This piece has no meter, so no clock is sent.</p>{/if}
        {#if midi.warning}<p class="hint warning" role="status">{midi.warning}</p>{/if}
        {#if midi.locked}<p class="hint">A channel per note (MPE) is off for a piece with MIDI cards: they say the channels.</p>{/if}
      </section>

      <section class="card" aria-labelledby="midi-panels">
        <div class="bar">
          <h4 id="midi-panels">Panels</h4>
          <div class="tabs" role="tablist" aria-label="The panels in this setup">
            {#each active as p (p.id)}
              <button type="button" role="tab" aria-selected={midi.shownPanel === p.id} onclick={() => ((midi.shownPanel = p.id), (editing = false))}>{p.name}</button>
            {/each}
          </div>
          <span class="grow"></span>
          <button type="button" aria-pressed={editing} onclick={() => (editing = !editing)} disabled={!shownPanel}>{editing ? 'Done editing' : 'Edit'}</button>
          <button type="button" onclick={() => (midi.newPanel(), (editing = true))}>New panel</button>
          <button type="button" onclick={() => file?.click()}>Open a panel’s file…</button>
          <button type="button" onclick={save} disabled={!runtime}>Save this panel’s file</button>
          <input bind:this={file} type="file" accept=".json,application/json" hidden onchange={chosen} />
        </div>
        {#if problem}<p class="hint warning" role="alert">{problem}</p>{/if}
        {#if editing && shownPanel}
          <PanelEditor panel={shownPanel} onchange={(panel) => midi.editPanel(panel)} />
          <div class="bar">
            <span class="grow"></span><button type="button" class="danger" onclick={() => (midi.deletePanel(shownPanel.id), (editing = false))}>Delete this panel</button>
          </div>
        {:else if runtime && midi.shownPanel !== null}
          {@const id = midi.shownPanel}
          {#key runtime}
            <PanelView {runtime} onsend={(data) => midi.played(id, data)} />
          {/key}
        {:else}
          <p class="hint">No panel in this setup yet: add one from the chips over the patch, then route its row to an output.</p>
        {/if}
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

      <dialog class="inspect" aria-label="Built-in sound" bind:this={dialog} onclose={close} onclick={(e) => e.target === dialog && close()}>
        {#if builtin && hasBuiltIn}
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
  .reset,
  .actions,
  .bar,
  .tabs {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px 8px;
  }
  .reset button,
  .bar button,
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
  .grow {
    flex: 1;
  }
  .bar button[aria-pressed='true'],
  .tabs button[aria-selected='true'] {
    border-color: currentColor;
  }
  .bar button:disabled {
    opacity: 0.5;
    cursor: default;
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
  .warning {
    color: var(--danger);
  }
</style>
