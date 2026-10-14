<script lang="ts">
  import type { Snippet } from 'svelte';
  /**
   * The transport, in one place: play and pause (pausing keeps the place), stop (back to
   * the initial state), where the piece is — its sections marked and named, each a jump — and the
   * tempo of the meter that drives it (its free() value, as in the graph). Record (●, for a piece with a braid left
   * free) takes a pass of the armed cell from the keys (state/record.svelte.ts).
   */
  import MidiLight from './MidiLight.svelte';
  import { clockText } from '@yggi/cells/engine/duration';
  import { getStudio } from './state/studio.svelte';

  let {
    path,
  }: {
    /** In place of the title: the piece's place in the library, to choose another from (QuickPick). */
    path?: Snippet;
  } = $props();

  const { piece, playback, view, recorder, midi } = getStudio();
  const midiName = $derived(
    midi.access && (midi.inPortId !== 'none' || midi.sending)
      ? `MIDI: ${[midi.inPortId !== 'none' ? 'in' : '', midi.sending ? 'out' : ''].filter(Boolean).join(', ')}`
      : 'MIDI: not connected',
  );
  const midiLive = $derived(!!midi.access && (midi.sending || midi.inPortId !== 'none'));
  const title = $derived(piece.title);
  const playing = $derived(playback.playing);
  const starting = $derived(playback.starting);
  /** Where it is (seconds; within one lap for a loop). */
  const now = $derived(playback.now);
  /** How far the slider reaches (null: nothing to move in). */
  const span = $derived(playback.span);
  const sections = $derived(piece.sections);
  const tempo = $derived(piece.mainMeter?.free ?? null);
  /** Anything to go back from (not stopped, or a free() value held by hand): Stop is there, and pulses. */
  const resettable = $derived(playback.resettable);
  /** free() values moved by hand: revert or save them. */
  const held = $derived(piece.held.size > 0);
  const menuOpen = $derived(view.panelOpen && view.panel === 'controls');
  const onchoose = () => (view.tab = 'select');
  const onplay = () => playback.toggle();
  const onrecord = () => recorder.record();
  const recordTitle = $derived(
    recorder.state === 'taking'
      ? `Taking a pass of &${recorder.target?.cell ?? ''}: press to call it off`
      : recorder.state === 'armed'
        ? 'Waiting for the pass to begin: press to call it off'
        : recorder.target
          ? `Record: play a pass of &${recorder.target.cell} on the keys; it is held until Save`
          : 'Record: arm a cell whose braid is free(…) (its sheet, or Play with in the MIDI page)',
  );
  const onstop = () => playback.stop();
  const onrevert = () => piece.revert();
  const onsave = () => piece.keep();
  const onmenu = () => view.togglePanel('controls');
  const onseek = (t: number) => playback.seek(t);
  const ontempo = (v: number) => piece.mainMeter && piece.hold(piece.mainMeter.free, v);

  // (an hour or more: hours too)
  const clock = (sec: number) => clockText(sec, sec >= 3600 || (span ?? 0) >= 3600);
  // the section it's in now
  const current = $derived(sections ? ([...sections].reverse().find((s) => s.at <= now + 1e-6) ?? null) : null);
  let width = $state(300);
  // a name shows where it has room (else only its mark, which still jumps)
  // (a run of sections with one name — drop · drop — shares that name across them all)
  const room = (i: number) => {
    if (!sections || !span) return false;
    if (i > 0 && sections[i - 1].label === sections[i].label) return false;
    let j = i + 1;
    while (j < sections.length && sections[j].label === sections[i].label) j++;
    const next = sections[j]?.at ?? span;
    return ((next - sections[i].at) / span) * width > sections[i].label.length * 6.6 + 10;
  };
</script>

<div class="transport" role="group" aria-label="Transport">
  <div class="row">
    <button class="play" class:on={playing} onclick={onplay} disabled={starting} aria-label={playing ? 'Pause' : 'Play'}>
      {#if playing}
        <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>
      {:else}
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z" /></svg>
      {/if}
    </button>
    {#if recorder.any}
      <button
        class="record"
        class:armed={recorder.state === 'armed'}
        class:taking={recorder.state === 'taking'}
        onclick={onrecord}
        disabled={recorder.state === 'off' && !recorder.target}
        aria-label="Record"
        aria-pressed={recorder.state !== 'off'}
        title={recordTitle}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="6" /></svg>
      </button>
    {/if}
    <button class="stop" class:dirty={resettable} onclick={onstop} disabled={!resettable} aria-label="Stop" title="Stop: back to the initial state">
      <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="1.5" /></svg>
    </button>
    <span class="what">
      {#if path}{@render path()}{:else if title}<button class="unstyled title" onclick={onchoose} title="Choose another piece">{title}</button>{/if}
      <span class="time">
        <b>{clock(now)}</b>{#if span}<span class="of"> / {clock(span)}</span>{/if}
        {#if current}<span class="where">{current.label}</span>{/if}
      </span>
    </span>
    <button
      class="unstyled burger midi"
      class:live={midiLive}
      onclick={() => view.togglePanel('midi')}
      aria-expanded={view.panelOpen && view.panel === 'midi'}
      aria-label={midiName}
      title={midiName}>MIDI<MidiLight /></button
    >
    {#if onmenu}<button class="unstyled burger" onclick={onmenu} aria-expanded={menuOpen} aria-label="Controls" title="The piece's controls">☰</button>{/if}
  </div>
  <div class="lower">
    {#if span}
      <div class="track" bind:clientWidth={width}>
        {#if sections}
          <div class="marks">
            {#each sections as s, i (i)}
              <button
                class="unstyled mark"
                class:here={current === s}
                style:left="{(s.at / span) * 100}%"
                onclick={() => onseek(s.at)}
                aria-label="Jump to {s.label} ({clock(s.at)})"
                title="{s.label} · {clock(s.at)}"
              >
                {#if room(i)}<span>{s.label}</span>{/if}
              </button>
            {/each}
          </div>
        {/if}
        <input type="range" min="0" max={span} step="0.1" value={now} aria-label="Time: jump to any point" onchange={(e) => onseek(+(e.currentTarget as HTMLInputElement).value)} />
      </div>
    {:else}
      <!-- (nothing to move in: the row keeps its place, so the header never jumps) -->
      <div class="track empty" aria-hidden="true"></div>
    {/if}
    <!-- (always there, invisible when nothing is held: nothing moves when it appears) -->
    <div class="heldslot" class:on={held} aria-hidden={!held}>
      <button class="unstyled" onclick={onrevert} tabindex={held ? 0 : -1} title="Back to what the code says">Revert</button>
      <button class="unstyled save" onclick={onsave} tabindex={held ? 0 : -1} title="Write these values into the code">Save</button>
    </div>
    {#if tempo}
      <label class="tempo">
        <span class="tv"><small>♩</small>{Math.round(tempo.value)}</span>
        <input
          type="range"
          min={tempo.lo}
          max={tempo.hi}
          step={(tempo.hi - tempo.lo) / 100}
          value={tempo.value}
          aria-label="Tempo"
          oninput={(e) => ontempo(+(e.currentTarget as HTMLInputElement).value)}
        />
      </label>
    {/if}
  </div>
</div>

<style>
  .transport {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .row {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .play,
  .stop,
  .record {
    flex: none;
    display: grid;
    place-items: center;
    border-radius: 50%;
    border: 0;
    cursor: pointer;
  }
  .play {
    width: 44px;
    height: 44px;
    background: var(--accent);
    color: var(--accent-ink);
  }
  .play.on {
    background: color-mix(in oklab, var(--accent) 80%, white);
  }
  .play svg,
  .stop svg {
    width: 22px;
    height: 22px;
    fill: currentColor;
  }
  .stop {
    width: 36px;
    height: 36px;
    background: var(--code-bg);
    color: var(--text);
    border: 1px solid var(--line);
  }
  .stop svg {
    width: 16px;
    height: 16px;
  }
  .record {
    width: 36px;
    height: 36px;
    background: var(--code-bg);
    color: var(--danger);
    border: 1px solid var(--line);
  }
  .record svg {
    width: 16px;
    height: 16px;
    fill: currentColor;
  }
  .record.armed {
    animation: blink 1s steps(2, start) infinite;
  }
  .record.taking {
    background: var(--danger);
    color: var(--accent-ink);
  }
  .record:disabled {
    opacity: 0.4;
    cursor: default;
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
  .stop:disabled {
    opacity: 0.4;
    cursor: default;
  }
  .time {
    display: flex;
    align-items: baseline;
    gap: 6px;
    min-width: 0;
    flex: 1 1 auto;
    white-space: nowrap; /* (the time never wraps; the section's name takes what's left) */
    font: 600 13px var(--font-code);
    font-variant-numeric: tabular-nums;
    color: var(--text);
  }
  .of {
    color: var(--text-muted);
    font-weight: 500;
    flex: none;
  }
  .where {
    font: 700 12px var(--font-ui);
    color: var(--accent);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  /* the track and the tempo: one line under the controls (on a wide screen, all one line) */
  .lower {
    display: flex;
    align-items: flex-end;
    gap: 10px;
  }
  .lower .track {
    flex: 1;
    min-width: 0;
  }
  .tempo {
    display: flex;
    align-items: center;
    gap: 6px;
    flex: 0 0 auto;
    width: 120px;
    padding-bottom: 2px;
  }
  .tempo input {
    flex: 1;
    min-width: 0;
    accent-color: var(--accent);
  }
  .tv {
    font: 700 13px var(--font-code);
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }
  .tv small {
    font-size: 10px;
    color: var(--text-muted);
    margin-left: 1px;
  }
  .track {
    position: relative;
    padding-top: 16px;
  }
  .track input {
    width: 100%;
    margin: 0;
    accent-color: var(--accent);
    min-height: 26px;
  }
  .marks {
    position: absolute;
    inset: 0 0 auto 0;
    height: 30px;
    pointer-events: none;
  }
  /* a section: its mark on the track (a jump), its name where there's room */
  .mark {
    pointer-events: auto;
    position: absolute;
    top: 0;
    height: 30px;
    min-width: 12px;
    border-left: 2px solid color-mix(in oklab, var(--text-muted) 55%, transparent);
    padding-left: 4px;
    font: 600 11px var(--font-ui);
    color: var(--text-muted);
    white-space: nowrap;
    line-height: 13px;
  }
  .mark.here {
    border-left-color: var(--accent);
    color: var(--accent);
  }
  .mark:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 1px;
  }
  @media (min-width: 900px) {
    .transport {
      flex-direction: row;
      align-items: center;
      gap: 16px;
    }
    .row {
      flex: none;
    }
    .lower {
      flex: 1;
      align-items: center;
    }
    .tempo {
      width: 170px;
    }
  }
  /* sharper: one rhythm of sizes — play 42, stop 32, a two-line title and time */
  .play {
    width: 42px;
    height: 42px;
    box-shadow: 0 2px 10px color-mix(in oklab, var(--accent) 35%, transparent);
  }
  .stop {
    width: 32px;
    height: 32px;
    background: transparent;
  }
  .what {
    display: flex;
    flex-direction: column;
    min-width: 0;
    flex: 1;
    gap: 1px;
  }
  .title {
    min-width: 0;
    font: 700 13px var(--font-ui);
    color: var(--text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .title:hover {
    color: var(--accent);
  }
  .title:focus-visible {
    outline: 2px solid var(--accent);
    border-radius: 4px;
  }
  .time {
    font-size: 12px;
  }
  .tv small {
    font-size: 13px;
    color: var(--text-muted);
    margin-right: 2px;
  }
  /* something to go back from: Stop breathes, gently */
  .stop.dirty {
    animation: breathe 2.4s ease-in-out infinite;
  }
  @keyframes breathe {
    0%,
    100% {
      box-shadow: 0 0 0 0 color-mix(in oklab, var(--accent) 0%, transparent);
    }
    50% {
      box-shadow: 0 0 0 4px color-mix(in oklab, var(--accent) 45%, transparent);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .stop.dirty {
      animation: none;
      box-shadow: 0 0 0 2px color-mix(in oklab, var(--accent) 45%, transparent);
    }
  }
  /* a fixed height, with or without a track: the header never jumps */
  .track,
  .track.empty {
    height: 46px;
    box-sizing: border-box;
  }
  .heldslot {
    display: flex;
    gap: 4px;
    flex: none;
    visibility: hidden;
  }
  .heldslot.on {
    visibility: visible;
  }
  .heldslot button,
  .burger {
    padding: 4px 9px;
    border-radius: 999px;
    font: 700 12px var(--font-ui);
    color: var(--text);
    background: var(--code-bg);
    border: 1px solid var(--line);
  }
  .heldslot .save {
    background: var(--accent);
    color: var(--accent-ink);
    border-color: var(--accent);
  }
  .burger {
    flex: none;
    margin-left: auto;
    font-size: 16px;
    padding: 2px 10px;
  }
  .burger.midi {
    font-size: 12px;
    color: var(--text-muted);
  }
  .burger.midi.live {
    color: var(--text);
    border-color: var(--meter-1);
  }
  .burger.midi + .burger {
    margin-left: 6px;
  }
  .heldslot button:focus-visible,
  .burger:focus-visible {
    outline: 2px solid var(--accent);
  }
</style>
