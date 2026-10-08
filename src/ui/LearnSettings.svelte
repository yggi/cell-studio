<script lang="ts">
  /**
   * MIDI learn in the MIDI dialog: how many knobs the open piece has learned (Forget all), and whether a slider moved by
   * hand sends its knob's CC back, for controllers with motor faders or LED rings (off unless asked for).
   */
  import { getStudio } from './state/studio.svelte';

  const { learn } = getStudio();
  const count = $derived(Object.keys(learn.bindings).length);
</script>

<div class="learned">
  <p>
    {count ? `${count} control${count === 1 ? '' : 's'} of this piece learned.` : 'To move a slider by a knob, press Learn beside it, then move the knob.'}
    {#if count}<button class="unstyled" onclick={() => learn.forgetAll()}>Forget all</button>{/if}
  </p>
  <label class="check"
    ><input type="checkbox" checked={learn.echo} onchange={(e) => (learn.echo = e.currentTarget.checked)} /> Send a slider's moves back to its knob (motor faders, LED rings)</label
  >
</div>

<style>
  .learned {
    display: grid;
    gap: 6px;
    margin: 0 4px;
    font: 13px var(--font-ui);
    color: var(--text-muted);
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
