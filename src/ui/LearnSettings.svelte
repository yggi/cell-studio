<script lang="ts">
  /**
   * MIDI learn in the MIDI page of the sidebar: how many knobs the open piece has learned (Forget all), and whether a slider moved by
   * hand sends its knob's CC back, for controllers with motor faders or LED rings (off unless asked for).
   */
  import { getStudio } from './state/studio.svelte';

  const { learn } = getStudio();
  const count = $derived(Object.keys(learn.bindings).length);
</script>

<div class="learned">
  <h4 id="midi-learn">Learn</h4>
  <p>
    {count
      ? `${count} control${count === 1 ? '' : 's'} of this piece learned.`
      : `To move a slider by a knob, ${learn.connected ? '' : 'choose an input, then '}press Learn beside it, then move the knob.`}
    {#if count}<button class="unstyled" onclick={() => learn.forgetAll()}>Forget all</button>{/if}
  </p>
  <label class="check"
    ><input type="checkbox" checked={learn.echo} onchange={(e) => (learn.echo = e.currentTarget.checked)} /> Send a slider's moves back to its knob (motor faders, LED rings)</label
  >
</div>

<style>
  .learned {
    display: grid;
    gap: 8px;
    font: 13px var(--font-ui);
    color: var(--text-muted);
  }
  h4 {
    margin: 0;
    font: 700 12px var(--font-ui);
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--text);
  }
  p {
    margin: 0;
  }
  button {
    color: var(--accent);
    font-weight: 600;
    cursor: pointer;
  }
  .check {
    display: flex;
    align-items: center;
    gap: 8px;
  }
</style>
