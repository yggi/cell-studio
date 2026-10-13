<script lang="ts">
  /**
   * The MIDI light in the transport (#262): a dot for the input and one for the output, each present only while that
   * port is chosen, dim while the chosen port isn't plugged in, flashing on a message in and a note sent (the moment
   * it sounds). It draws on the shared ticker only while a flash remains: an idle connection costs no frames.
   */
  import { onDestroy } from 'svelte';
  import { onFrames } from '../audio/ticker';
  import { getStudio } from './state/studio.svelte';

  const { midi } = getStudio();
  const absent = (ports: readonly { id: string }[], id: string) => id !== 'all' && !ports.some((p) => p.id === id);
  const inOn = $derived(midi.inPortId !== 'none');
  const outOn = $derived(midi.sending);
  const inGone = $derived(inOn && absent(midi.ports.inputs, midi.inPortId));
  const outGone = $derived(outOn && midi.sendingNowhere);
  let inDot: HTMLElement | undefined = $state();
  let outDot: HTMLElement | undefined = $state();

  let stop: (() => void) | null = null;
  const draw = () => {
    const now = performance.now();
    inDot?.style.setProperty('--glow', String(midi.activity.level('in', now)));
    outDot?.style.setProperty('--glow', String(midi.activity.level('out', now)));
    // (faded out: the frame job ends, the next hit starts it again)
    if (!midi.activity.busy(now)) {
      stop?.();
      stop = null;
    }
  };
  midi.activity.onhit = () => {
    if (!stop) stop = onFrames(draw, () => 0);
  };
  onDestroy(() => {
    midi.activity.onhit = null;
    stop?.();
  });
</script>

{#if inOn}<span class="dot in" class:gone={inGone} bind:this={inDot} data-testid="midi-in"></span>{/if}
{#if outOn}<span class="dot out" class:gone={outGone} bind:this={outDot} data-testid="midi-out"></span>{/if}

<style>
  .dot {
    display: inline-block;
    width: 7px;
    height: 7px;
    margin-left: 5px;
    border-radius: 50%;
    vertical-align: middle;
    --glow: 0;
    background: color-mix(in oklab, var(--hue) calc(30% + 70% * var(--glow)), var(--surface-2));
    box-shadow: 0 0 calc(6px * var(--glow)) var(--hue);
  }
  .in {
    --hue: var(--meter-1);
  }
  .out {
    --hue: var(--accent);
  }
  .gone {
    opacity: 0.35;
  }
</style>
