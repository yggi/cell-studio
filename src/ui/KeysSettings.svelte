<script lang="ts">
  /**
   * The keys in the MIDI dialog (#207): which cell they play (the open sheet's unless one is chosen), what a key outside
   * the melody's table does, the computer keys (off by default, so they stay the page's), and thru to the MIDI output
   * on a channel. Works without MIDI too: the computer keys and the on-screen keys play through the same path.
   */
  import { getStudio } from './state/studio.svelte';

  let { output }: { output: boolean } = $props();
  const { keys } = getStudio();
  const CHANNELS = Array.from({ length: 16 }, (_, i) => i + 1);
</script>

<div class="keys">
  <h4>Keys</h4>
  <label>
    Play with
    <select value={keys.chosen} onchange={(e) => (keys.chosen = e.currentTarget.value)}>
      <option value="">The open sheet{keys.armed && !keys.chosen ? ` (now &${keys.armed})` : ''}</option>
      {#each keys.armable as a (a.cell)}<option value={a.cell}>&{a.cell}{a.cell === a.voice ? '' : ` on &${a.voice}`}{a.kit ? ' (kit)' : ''}</option>{/each}
    </select>
  </label>
  <label>
    A key outside the scale, played and recorded
    <select value={keys.mode} onchange={(e) => (keys.mode = e.currentTarget.value === 'allow' ? 'allow' : e.currentTarget.value === 'ignore' ? 'ignore' : 'snap')}>
      <option value="snap">Snap: the nearest note of the scale</option>
      <option value="allow">Allow: as played (recorded with ♯ or ♭)</option>
      <option value="ignore">Ignore: it plays nothing</option>
    </select>
  </label>
  <label class="check"
    ><input type="checkbox" checked={keys.computer} onchange={(e) => (keys.computer = e.currentTarget.checked)} /> Play with the computer keys (A to L, W E T Y U O; 1 to 7 the kit)</label
  >
  {#if output}
    <label class="check">
      <input type="checkbox" checked={keys.thru} onchange={(e) => (keys.thru = e.currentTarget.checked)} /> Thru: echo the keys to the output on
      <select aria-label="Thru channel" value={keys.thruChannel} onchange={(e) => (keys.thruChannel = Number(e.currentTarget.value))}>
        {#each CHANNELS as c (c)}<option value={c}>channel {c}</option>{/each}
      </select>
    </label>
  {/if}
</div>

<style>
  .keys {
    display: grid;
    gap: 8px;
    margin: 0 4px;
    font: 13px var(--font-ui);
    color: var(--text-muted);
  }
  h4 {
    margin: 0;
    font: 600 14px var(--font-ui);
    color: var(--text);
  }
  label {
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-weight: 600;
  }
  .check {
    flex-direction: row;
    align-items: center;
    gap: 8px;
    font-weight: normal;
  }
  select {
    min-height: 36px;
    padding: 0 6px;
    border-radius: 8px;
    border: 1px solid var(--line);
    background: var(--code-bg);
    color: var(--text);
    font: 14px var(--font-ui);
  }
</style>
