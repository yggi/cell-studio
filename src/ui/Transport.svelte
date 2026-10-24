<script lang="ts">
  /**
   * The transport, the deck: stop (back to the initial state), play and pause (pausing keeps the place), record (●, for a
   * piece with a braid left free: a pass of the armed cell from the keys, state/record.svelte.ts), the clock, the piece's
   * sections as a timeline (Timeline.svelte) and the tempo (Tempo.svelte). On a wide screen one capsule in the header; on
   * a phone a bar at the foot, the timeline over the buttons, with Revert · Save (on a wide screen they're the header's).
   */
  import { clockText } from '@yggi/cells/engine/duration';
  import { freeIndex } from '@yggi/cells/engine/held';
  import { getStudio } from './state/studio.svelte';
  import Timeline from './Timeline.svelte';
  import Tempo from './Tempo.svelte';
  import Held from './Held.svelte';

  let {
    bar = false,
  }: {
    /** A phone's bar at the foot (else the header's capsule). */
    bar?: boolean;
  } = $props();

  const studio = getStudio();
  const { piece, playback, recorder } = studio;
  const playing = $derived(playback.playing);
  /** How far it reaches (null: nothing to move in). */
  const span = $derived(playback.span);
  const tempo = $derived(piece.mainMeter?.free ?? null);
  const tempoHeld = $derived(!!piece.mainMeter && piece.held.has(freeIndex(piece.program, piece.mainMeter.free)));
  const recordTitle = $derived(
    recorder.state === 'taking'
      ? `Taking a pass of &${recorder.target?.cell ?? ''}: press to call it off`
      : recorder.state === 'armed'
        ? 'Waiting for the pass to begin: press to call it off'
        : recorder.target
          ? `Record: play a pass of &${recorder.target.cell} on the keys; it is held until Save`
          : 'Record: arm a cell whose braid is free(…) (its sheet, or Play with in the MIDI page)',
  );
  const ontempo = (v: number) => piece.mainMeter && piece.hold(piece.mainMeter.free, v);
  // (an hour or more: hours too)
  const clock = (sec: number) => clockText(sec, sec >= 3600 || (span ?? 0) >= 3600);
</script>

<div class="transport" class:bar class:holding={piece.held.size > 0} role="group" aria-label="Transport">
  {#if bar}
    <Timeline now={playback.now} {span} sections={piece.sections} onseek={(t) => playback.seek(t)} {clock} />
  {/if}
  <div class="row">
    <button class="unstyled stop" onclick={() => playback.stop()} disabled={!playback.resettable || studio.following} aria-label="Stop" title="Stop: back to the initial state">
      <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="2" /></svg>
    </button>
    <button
      class="unstyled play"
      class:on={playing}
      onclick={() => playback.toggle()}
      disabled={playback.starting}
      title={studio.following ? (playing ? 'Silence the session (it is still followed)' : 'Hear the session: its host’s transport turns this one') : undefined}
      aria-label={playing ? 'Pause' : 'Play'}
    >
      {#if playing}
        <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>
      {:else}
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z" /></svg>
      {/if}
    </button>
    {#if recorder.any}
      <button
        class="unstyled record"
        class:armed={recorder.state === 'armed'}
        class:taking={recorder.state === 'taking'}
        onclick={() => recorder.record()}
        disabled={recorder.state === 'off' && !recorder.target}
        aria-label="Record"
        aria-pressed={recorder.state !== 'off'}
        title={recordTitle}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="6" /></svg>
      </button>
    {/if}
    <span class="clock"
      >{clock(playback.now)}{#if span}<span class="total">&nbsp;/ {clock(span)}</span>{/if}</span
    >
    {#if !bar}
      <Timeline now={playback.now} {span} sections={piece.sections} onseek={(t) => playback.seek(t)} {clock} />
    {:else}
      <span class="gap"></span>
      <Held short />
    {/if}
    {#if tempo}<Tempo {tempo} held={tempoHeld} onchange={ontempo} up={bar} />{/if}
  </div>
</div>

<style>
  /* a wide screen: one capsule, everything about time */
  .transport {
    display: flex;
    align-items: center;
    min-width: 0;
    height: 44px;
    padding: 0 8px 0 5px;
    border: 1px solid var(--line);
    border-radius: var(--radius-pill);
    background: var(--code-bg);
  }
  .row {
    display: flex;
    align-items: center;
    gap: 8px;
    flex: 1;
    min-width: 0;
  }
  button {
    flex: none;
    display: grid;
    place-items: center;
    border-radius: 50%;
  }
  button svg {
    fill: currentColor;
  }
  .stop,
  .record {
    width: 32px;
    height: 32px;
    color: var(--text);
  }
  .stop:hover:not(:disabled),
  .record:hover:not(:disabled) {
    background: var(--surface-2);
  }
  .stop svg,
  .record svg {
    width: 14px;
    height: 14px;
  }
  .stop:disabled,
  .record:disabled {
    opacity: 0.35;
    cursor: default;
  }
  /* the one gold thing */
  .play {
    width: 36px;
    height: 36px;
    background: var(--accent);
    color: var(--accent-ink);
    box-shadow: 0 2px 10px color-mix(in oklab, var(--accent) 30%, transparent);
  }
  .play.on {
    background: color-mix(in oklab, var(--accent) 80%, white);
  }
  .play svg {
    width: 16px;
    height: 16px;
  }
  button:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }
  .record {
    color: var(--danger);
  }
  .record.armed {
    animation: blink 1s steps(2, start) infinite;
  }
  .record.taking {
    background: var(--danger);
    color: var(--accent-ink);
  }
  @keyframes blink {
    to {
      opacity: 0.35;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .record.armed {
      animation: none;
      outline: 2px dashed var(--danger);
    }
  }
  .clock {
    flex: none;
    font: 600 12px var(--font-code);
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
    color: var(--text);
  }
  .total {
    color: var(--text-faint);
    font-weight: 500;
  }
  /* (between 900 px and 1200 px the length is the timeline's to tell, as its end) */
  @media (max-width: 1199px) {
    .transport:not(.bar) .total {
      display: none;
    }
  }

  /* a phone: a bar at the foot, the timeline over the buttons, all under the thumb */
  .bar {
    flex-direction: column;
    align-items: stretch;
    gap: 6px;
    height: auto;
    padding: var(--space-2) var(--space-3) var(--space-1);
    border: 0;
    border-top: 1px solid var(--line);
    border-radius: 0;
    background: var(--surface);
  }
  .bar .row {
    gap: 10px;
    min-height: 48px;
  }
  .bar .play {
    width: 44px;
    height: 44px;
  }
  .bar .play svg {
    width: 20px;
    height: 20px;
  }
  .bar .stop,
  .bar .record {
    width: 40px;
    height: 40px;
  }
  .gap {
    flex: 1;
  }
  /* (Revert · Save showing: the length gives way, then the clock) */
  .bar.holding .total {
    display: none;
  }
  .bar .clock {
    flex: 0 1 auto;
    min-width: 0;
    overflow: hidden;
  }
</style>
