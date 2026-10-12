<script lang="ts">
  /**
   * Files, a page of the sidebar: open a piece from a file (a MIDI file too: its notes written out,
   * engine/midiimport.ts), save the open one to a file or in this browser, render it to WAV, save its notes as MIDI,
   * the performance report, and which build this is. What those did (saved, rendering, rendered, couldn't read) is
   * said here, in a status line: the picker shows it too, but it is hidden while a piece is open.
   */
  import { getStudio } from './state/studio.svelte';

  const studio = getStudio();
  const { library, view } = studio;
  const current = $derived(library.currentId);
  const storageOk = library.storageOk;
  let fileInput: HTMLInputElement;
</script>

<div class="file">
  {#if view.message}<p class="message" role="status">{view.message}</p>{/if}
  <section aria-labelledby="file-piece">
    <h4 id="file-piece">Piece</h4>
    <button onclick={() => fileInput.click()}>Open a file…</button>
    <button disabled={!current} onclick={() => studio.saveFile()}>Save the piece to a file</button>
    <button disabled={!current || !storageOk} title={storageOk ? undefined : 'This browser can’t keep pieces here'} onclick={() => studio.saveHere()}
      >Save it in this browser</button
    >
    <button disabled={!current} onclick={() => studio.render()}>Render the piece to WAV</button>
    <button disabled={!current} title="Its notes as MIDI out sends them: a track a channel, its tempo map as tempos" onclick={() => studio.saveMidi()}
      >Save its notes as MIDI</button
    >
    <input
      bind:this={fileInput}
      type="file"
      accept=".cells,.txt,text/plain,.mid,.midi,audio/midi"
      hidden
      onchange={(e) => {
        const f = e.currentTarget.files?.[0];
        if (f) studio.openFile(f);
        e.currentTarget.value = '';
      }}
    />
  </section>
  <section aria-labelledby="file-tools">
    <h4 id="file-tools">Tools</h4>
    <button onclick={() => view.togglePerf()}>{view.perf ? 'Hide' : 'Show'} performance report</button>
  </section>
  <p class="version">Cell studio {__APP_VERSION__}</p>
</div>

<style>
  .file {
    display: grid;
    gap: 12px;
  }
  section {
    display: grid;
    gap: 8px;
    padding: 10px 12px 12px;
    border: 1px solid var(--line);
    border-radius: var(--radius);
    background: var(--code-bg);
  }
  h4 {
    margin: 0;
    font: 700 12px var(--font-ui);
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--text);
  }
  button {
    min-height: 40px;
    padding: 0 10px;
    border-radius: 8px;
    border: 1px solid var(--line);
    background: var(--surface);
    color: var(--text);
    font: 600 14px var(--font-ui);
    text-align: left;
    cursor: pointer;
  }
  button:disabled {
    color: var(--text-faint);
    cursor: default;
  }
  button:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }
  .message {
    margin: 0 4px;
    font: 13px var(--font-ui);
    color: var(--accent);
    overflow-wrap: anywhere;
  }
  .version {
    margin: 0 4px;
    font: 12px var(--font-ui);
    color: var(--text-faint);
    user-select: text;
  }
</style>
