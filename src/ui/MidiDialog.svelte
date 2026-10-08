<script lang="ts">
  /**
   * MIDI on this device: connect, the output and the input chosen, and All notes off. A port chosen before that isn't
   * plugged in shows as "Not connected". The pattern is Jambot's SoundPanel (yggi/jambot apps/web/src/components/SoundPanel.svelte @ 8cdb6b8).
   */
  import Dialog from './kit/Dialog.svelte';
  import LearnSettings from './LearnSettings.svelte';
  import type { Midi } from './state/midi.svelte';

  let { midi, onclose }: { midi: Midi; onclose: () => void } = $props();

  const absent = (ports: readonly { id: string }[], id: string) => id !== 'none' && id !== 'all' && !ports.some((p) => p.id === id);
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
    <LearnSettings />
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
  .buttons {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 6px;
  }
</style>
